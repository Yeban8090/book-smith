import { App, Component, MarkdownRenderer, TFile } from 'obsidian';
import { Book, ChapterNode, CoverSettings } from '../types/book';
import { HeaderFooterTocSettings } from '../modals/HeaderFooterTocModal';
import type * as electron from 'electron';
import { escapeHtml } from '../utils/pdfExport';

export interface RenderConfig {
    showTitle: boolean;
    scale: number;
    displayHeader: boolean;
    displayFooter: boolean;
    cssSnippet?: string;
    abortSignal?: AbortSignal;
    onProgress?: (current: number, total: number, fileName: string) => void;
    headerFooterToc?: HeaderFooterTocSettings; // 添加目录设置
    showCover?: boolean;
    coverSettings?: CoverSettings;
}

export interface DocType {
    doc: Document;
    frontMatter: any;
    file: TFile;
    title: string;
}

export interface ParamType {
    app: App;
    file: TFile;
    config: RenderConfig;
    book: Book;
    rootPath: string;
    extra?: {
        title?: string;
        id?: string;
    };
}

export class BookRenderService {
    private docs: DocType[] = [];
    private scale = 1;
    private sourceFiles = new Map<string, { mtime: number; size: number }>();

    assertSourceUnchanged() {
        for (const [path, snapshot] of this.sourceFiles) {
            const file = this.app.vault.getAbstractFileByPath(path);
            if (!(file instanceof TFile) || file.stat.mtime !== snapshot.mtime || file.stat.size !== snapshot.size) {
                throw new Error(`章节已修改：${path}。请刷新预览后导出。`);
            }
        }
    }

    constructor(private app: App) { }

    /**
     * 主要渲染方法 - 基于 obsidian-better-export-pdf 架构
     */
    async renderToWebview(
        webview: electron.WebviewTag,
        book: Book,
        rootPath: string,
        config: RenderConfig
    ): Promise<void> {
        this.docs = [];
        this.sourceFiles.clear();
        return new Promise<void>((resolve, reject) => {
            const cleanup = () => {
                clearTimeout(timeout);
                webview.removeEventListener('dom-ready', onReady);
                config.abortSignal?.removeEventListener('abort', abort);
            };
            const timeout = setTimeout(() => {
                cleanup();
                reject(new Error('Webview setup timeout'));
            }, 10000);

            const abort = () => { cleanup(); reject(new Error('Render aborted')); };
            const onReady = async () => {
                webview.removeEventListener('dom-ready', onReady);
                try {
                    clearTimeout(timeout);

                    if (config.abortSignal?.aborted) throw new Error('Render aborted');
                    // 1. 收集所有文件并渲染为文档
                    const { data, docs } = await this.getAllFiles(book, rootPath, config);
                    await this.renderFiles(data, docs, config);
                    if (config.abortSignal?.aborted) throw new Error('Render aborted');

                    // 2. 如果启用了目录，生成目录 HTML
                    let tocHtml = '';
                    if (config.headerFooterToc?.tocEnabled) {
                        tocHtml = this.generateTOC(config.headerFooterToc, book);
                    }

                    // 3. 注入所有样式
                    const styles = this.getAllStyles();
                    for (const css of styles) {
                        await webview.insertCSS(css);
                    }

                    // 4. 处理自定义CSS片段
                    if (config?.cssSnippet && config.cssSnippet !== '0') {
                        try {
                            await webview.insertCSS(config.cssSnippet);
                        } catch (error) {
                            console.warn('Failed to load CSS snippet:', error);
                        }
                    }

                    // 5. 将目录和渲染好的文档注入到webview
                    // 先处理目录，将其插入到内容最前面
                    if (tocHtml) {
                        const doc = this.docs[0].doc;
                        const contentEl = doc.querySelector('.markdown-preview-view');
                        if (contentEl) {
                            const tocContainer = doc.createElement('div');
                            tocContainer.innerHTML = tocHtml;
                            contentEl.insertBefore(tocContainer, contentEl.firstChild);
                        }
                    }

                    await this.appendWebview(webview, this.docs[0]);

                    
                    // 6. 注入补丁样式
                    const patchStyles = this.getPatchStyles();
                    for (const css of patchStyles) {
                        await webview.insertCSS(css);
                    }

                    if (config.abortSignal?.aborted) throw new Error('Render aborted');
                    resolve();
                } catch (error) {
                    clearTimeout(timeout);
                    reject(error);
                } finally {
                    cleanup();
                }
            };
            if (config.abortSignal?.aborted) { abort(); return; }
            config.abortSignal?.addEventListener('abort', abort, { once: true });
            webview.addEventListener('dom-ready', onReady);
        });
    }

    /**
     * 收集所有文件 - 对应 modal.ts 的 getAllFiles
     */
    private async getAllFiles(book: Book, rootPath: string, config: RenderConfig): Promise<{ data: ParamType[], docs: DocType[] }> {
        const fileNodes = this.collectFileNodes(book.structure.tree);
        if (fileNodes.length === 0) throw new Error('没有可导出的章节，请检查章节排除设置。');
        const data: ParamType[] = fileNodes.map(node => {
            const file = this.getFileFromNode(node, book, rootPath);
            if (!file) throw new Error(`章节文件不存在：${node.path}。请修复章节路径后重试。`);
            return { app: this.app, file, config, book, rootPath, extra: { title: node.title, id: node.id } };
        });

        return { data, docs: [] };
    }

    /**
     * 渲染所有文件 - 对应 modal.ts 的 renderFiles
     */
    private async renderFiles(
        data: ParamType[],
        docs: DocType[] = [],
        config: RenderConfig
    ): Promise<void> {
        const totalFiles = data.length;

        // 按章节顺序渲染，避免长文同时打开大量临时视图和占用内存。
        let _docs = [...docs];
        for (let index = 0; index < data.length; index++) {
            if (config.abortSignal?.aborted) throw new Error('Render aborted');
            _docs.push(await this.renderMarkdown(data[index]));
            config.onProgress?.(index + 1, totalFiles, data[index].file.basename);
        }

        // 合并所有文档为一个完整的书籍文档
        _docs = this.mergeDoc(_docs);

        this.docs = _docs;
    }

    /**
     * 渲染单个Markdown文件 - 基于 render.ts 的 renderMarkdown
     */
    private async renderMarkdown({ app, file, config, book, extra }: ParamType): Promise<DocType> {
        if (config.abortSignal?.aborted) throw new Error('Render aborted');
        this.sourceFiles.set(file.path, { mtime: file.stat.mtime, size: file.stat.size });
        const data = await app.vault.read(file);

        const frontMatter = this.getFrontMatter(file);
        const cssclasses = this.extractCssClasses(frontMatter);

        const comp = new Component();
        comp.load();

        const printEl = document.body.createDiv('print');
        try {
            const viewEl = printEl.createDiv({
                cls: 'markdown-preview-view markdown-rendered ' + cssclasses.join(' '),
            });

            // 设置RTL和属性显示
            // @ts-ignore
            viewEl.toggleClass('rtl', app.vault.getConfig('rightToLeft'));
            // @ts-ignore
            viewEl.toggleClass('show-properties', 'hidden' !== app.vault.getConfig('propertiesInDocument'));

            // 设置标题
            const title = extra?.title || frontMatter?.title || file.basename;
            viewEl.createEl('h1', { text: title }, (e) => {
                e.addClass('__title__');
                e.style.display = config.showTitle ? 'block' : 'none';
                e.id = extra?.id || '';
            });

            // 处理块引用
            const processedData = this.processBlockReferences(data || '', file);

            // 使用公开渲染 API，不再借助抛异常截取渲染结果。
            const rendered = viewEl.createDiv();
            await MarkdownRenderer.render(app, processedData, rendered, file.path, comp);
            if (config.abortSignal?.aborted) throw new Error('Render aborted');

            // 修复内部链接
            this.fixInternalLinks(printEl, file);

            // 等待动态内容渲染
            await this.fixWaitRender(data || '', viewEl, config.abortSignal);

            // 修复canvas为图片
            this.fixCanvasToImage(viewEl);

            // 创建文档
            const doc = document.implementation.createHTMLDocument('document');
            doc.body.appendChild(printEl.cloneNode(true));
            doc.title = title;

            return { doc, frontMatter, file, title };

        } finally {
            printEl.remove();
            comp.unload();
        }
    }

    /**
     * 合并所有文档 - 对应 modal.ts 的 mergeDoc
     */
    private mergeDoc(docs: DocType[]): DocType[] {
        if (docs.length <= 1) return docs;

        const { doc: doc0, frontMatter, file, title } = docs[0];
        const sections = [];

        for (const { doc } of docs) {
            const element = doc.querySelector('.markdown-preview-view');
            if (element) {
                const section = doc0.createElement('section');
                section.className = 'book-chapter';
                Array.from(element.children).forEach((child) => {
                    section.appendChild(doc0.importNode(child, true));
                });
                sections.push(section);
            }
        }

        const root = doc0.querySelector('.markdown-preview-view');
        if (root) {
            root.innerHTML = '';
            sections.forEach((section, index) => {
                root.appendChild(section);

                // 添加分页符（除了最后一章）
                // if (index < sections.length - 1) {
                //     const pageBreak = doc0.createElement('div');
                //     pageBreak.style.pageBreakAfter = 'always';
                //     pageBreak.style.breakAfter = 'page';
                //     pageBreak.className = 'page-break';
                //     root.appendChild(pageBreak);
                // }
            });
        }

        return [{ doc: doc0, frontMatter, file, title }];
    }

    /**
     * 将文档注入到webview - 对应 modal.ts 的 appendWebview
     */
    private async appendWebview(webview: electron.WebviewTag, docData: DocType): Promise<void> {
        const { doc } = docData;

        // 作为字符串传输完整 HTML，避免正文中的字符被当成脚本。
        const webviewJs = this.makeWebviewJs(doc);

        try {
            await webview.executeJavaScript(webviewJs);
        } catch (error) {
            console.error('Failed to inject content to webview:', error);
            throw new Error(`Failed to render book: ${error.message}`);
        }
    }

    /**
     * 生成webview注入脚本 - 对应 modal.ts 的 makeWebviewJs
     */
    private makeWebviewJs(doc: Document): string {
        return `
            try {
                document.body.innerHTML = ${JSON.stringify(doc.body.innerHTML)};
                document.head.innerHTML = ${JSON.stringify(doc.head.innerHTML)};
                
                // 应用主题类名
                const currentBodyClasses = ${JSON.stringify(document.body.className)};
                const currentHtmlClasses = ${JSON.stringify(document.documentElement.className)};
                
                if (currentBodyClasses) {
                    document.body.className = currentBodyClasses;
                }
                if (currentHtmlClasses) {
                    document.documentElement.className = currentHtmlClasses;
                }
                
                // 设置主题相关属性
                const themeAttr = ${JSON.stringify(document.documentElement.getAttribute('data-theme') || '')};
                const modeAttr = ${JSON.stringify(document.documentElement.getAttribute('data-mode') || '')};
                
                if (themeAttr) document.documentElement.setAttribute('data-theme', themeAttr);
                if (modeAttr) document.documentElement.setAttribute('data-mode', modeAttr);
                
                document.body.classList.add("theme-light");
                document.body.classList.remove("theme-dark");
                document.title = ${JSON.stringify(doc.title)};
                
            } catch (error) {
                console.error('Error in webview script:', error);
                throw error;
            }
        `;
    }

    /**
     * 根据章节节点获取文件对象
     */
    private getFileFromNode(node: ChapterNode, book: Book, rootPath: string): TFile | null {
        const filePath = `${rootPath}/${book.basic.title}/${node.path}`;
        const file = this.app.vault.getAbstractFileByPath(filePath);
        return file instanceof TFile ? file : null;
    }

    /**
     * 递归收集所有文件类型的章节节点
     */
    private collectFileNodes(nodes: ChapterNode[]): ChapterNode[] {
        const fileNodes: ChapterNode[] = [];

        for (const node of [...nodes].sort((a, b) => a.order - b.order)) {
            if (node.exclude) continue;

            if (node.type === 'file') {
                fileNodes.push(node);
            } else if (node.type === 'group' && node.children) {
                fileNodes.push(...this.collectFileNodes(node.children));
            }
        }

        return fileNodes;
    }

    /**
     * 获取前置元数据
     */
    private getFrontMatter(file: TFile) {
        const cache = this.app.metadataCache.getFileCache(file);
        return cache?.frontmatter || {};
    }

    /**
     * 提取CSS类
     */
    private extractCssClasses(frontMatter: any): string[] {
        const cssclasses: string[] = [];
        for (const [key, val] of Object.entries(frontMatter)) {
            if (key.toLowerCase() === 'cssclass' || key.toLowerCase() === 'cssclasses') {
                if (Array.isArray(val)) {
                    cssclasses.push(...val);
                } else {
                    cssclasses.push(val as string);
                }
            }
        }
        return cssclasses;
    }

    /**
     * 处理块引用
     */
    private processBlockReferences(data: string, file: TFile): string {
        const cache = this.app.metadataCache.getFileCache(file);
        const blocks = new Map(Object.entries(cache?.blocks || {}));

        const lines = data.split('\n').map((line, i) => {
            for (const { id, position: { start, end } } of blocks.values()) {
                const blockid = `^${id}`;
                if (line.includes(blockid) && i >= start.line && i <= end.line) {
                    blocks.delete(id);
                    return line.replace(blockid, `<span id="${blockid}" class="blockid"></span> ${blockid}`);
                }
            }
            return line;
        });

        [...blocks.values()].forEach(({ id, position: { start } }) => {
            const idx = start.line;
            lines[idx] = `<span id="^${id}" class="blockid"></span>\n\n` + lines[idx];
        });

        return lines.join('\n');
    }

    /**
     * 修复内部链接
     */
    private fixInternalLinks(printEl: HTMLElement, file: TFile): void {
        printEl.findAll('a.internal-link').forEach((el: HTMLAnchorElement) => {
            const [title, anchor] = el.dataset.href?.split('#') || [];
            if ((!title || title?.length === 0 || title === file.basename) && anchor?.startsWith('^')) {
                return;
            }
            el.removeAttribute('href');
        });
    }

    /**
     * 等待动态内容渲染
     */
    private async fixWaitRender(data: string, viewEl: HTMLElement, signal?: AbortSignal): Promise<void> {
        const dynamic = data.includes('```dataview') || data.includes('```gEvent') || data.includes('![[');
        await this.waitForDomChange(viewEl, dynamic ? 2000 : 200, signal);
    }

    /**
     * 修复Canvas为图片
     */
    private fixCanvasToImage(el: HTMLElement): void {
        for (const canvas of Array.from(el.querySelectorAll('canvas'))) {
            const data = canvas.toDataURL();
            const img = document.createElement('img');
            img.src = data;
            img.className = '__canvas__';
            Array.from(canvas.attributes).forEach(attr => {
                img.setAttribute(attr.name, attr.value);
            });
            canvas.replaceWith(img);
        }
    }

    /**
     * 获取所有样式
     */
    private getAllStyles(): string[] {
        const cssTexts: string[] = [];

        Array.from(document.styleSheets).forEach((sheet) => {
            // @ts-ignore
            const id = sheet.ownerNode?.id;
            if (id?.startsWith('svelte-')) return;

            // @ts-ignore
            const href = sheet.ownerNode?.href;
            const division = `/* ----------${id ? `id:${id}` : href ? `href:${href}` : 'inline'}---------- */`;
            cssTexts.push(division);

            try {
                Array.from(sheet?.cssRules || []).forEach((rule) => {
                    cssTexts.push(rule.cssText);
                });
            } catch (error) {
                console.error('Error reading CSS rules:', error);
            }
        });

        return cssTexts;
    }

    /**
     * 获取补丁样式
     */
    private getPatchStyles(): string[] {
        const patchCSS = `
            /* ---------- css patch ---------- */
            body {
                overflow: auto !important;
            }
            
            @media print {
                .print, .print .markdown-preview-view, .print .markdown-preview-sizer {
                    height: auto !important;
                    max-height: none !important;
                    overflow: visible !important;
                    contain: none !important;
                }
                .print h1, .print h2, .print h3, .print h4 { break-after: avoid; }
                .print img, .print table, .print pre { max-width: 100%; }
                .print pre { white-space: pre-wrap; overflow-wrap: anywhere; }
                .print table { table-layout: fixed; overflow-wrap: anywhere; }
                .print thead { display: table-header-group; }
                .print img { height: auto; object-fit: contain; }
                .toc-item { break-inside: avoid; }
                .toc-page { min-width: 6ch; text-align: right; font-variant-numeric: tabular-nums; }
                
                .md-print-anchor, .blockid {
                    white-space: pre !important;
                    border: none !important;
                    display: inline-block !important;
                    position: absolute !important;
                    width: 1px !important;
                    height: 1px !important;
                    right: 0 !important;
                }
            }
            
            img.__canvas__ {
                width: 100% !important;
                height: 100% !important;
            }
            
            .book-chapter {
                margin-bottom: 2em;
            }
            
            .page-break {
                page-break-after: always;
                break-after: page;
            }
        `;

        return [patchCSS];
    }

    /**
     * 工具方法
     */
    private waitForDomChange(target: HTMLElement, minimumWait: number, signal?: AbortSignal): Promise<void> {
        return new Promise((resolve, reject) => {
            const started = Date.now();
            let timer: ReturnType<typeof setTimeout>;
            const cleanup = () => {
                clearTimeout(timer);
                clearTimeout(deadline);
                observer.disconnect();
                signal?.removeEventListener('abort', abort);
            };
            const finish = () => { cleanup(); resolve(); };
            const abort = () => { cleanup(); reject(new Error('Render aborted')); };
            const observer = new MutationObserver(() => {
                clearTimeout(timer);
                timer = setTimeout(finish, Math.max(200, minimumWait - (Date.now() - started)));
            });
            const deadline = setTimeout(() => {
                cleanup();
                reject(new Error('章节动态内容持续更新，无法完成渲染，请暂停更新后重试。'));
            }, 10000);
            if (signal?.aborted) { abort(); return; }
            signal?.addEventListener('abort', abort, { once: true });
            observer.observe(target, { childList: true, subtree: true, attributes: true, characterData: true });
            timer = setTimeout(finish, minimumWait);
        });
    }

    /**
     * 生成目录 HTML
     * @param settings 目录设置
     * @param book 书籍信息
     * @returns 目录 HTML 字符串
     */
    public generateTOC(settings: any, book: Book): string {
        if (!settings?.tocEnabled) return '';

        // 收集所有标题
        const headings = this.collectHeadings();

        if (headings.length === 0) return '';

        let tocHtml = `
            <div class="table-of-contents" style="
                page-break-after: ${settings.tocPageBreak ? 'always' : 'auto'};
                font-family: ${settings.tocFontFamily || 'serif'};
                font-size: ${settings.tocFontSize}px;
                color: ${settings.tocColor || '#000000'};
                margin: 20px 0;
                line-height: ${settings.tocLineHeight};
            ">
                <div style="text-align: center; margin-bottom: 30px; font-size: 2em; font-weight: bold;">${escapeHtml(settings.tocTitle || '目录')}</div>
                <div class="toc-content">
        `;

        headings.forEach(heading => {
            if (heading.level <= settings.tocMaxLevel) {
                const indent = (heading.level - 1) * (settings.tocIndent || settings.tocIndentSize || 20);
                tocHtml += `
                    <div class="toc-item" style="
                        margin-left: ${indent}px;
                        margin-bottom: 8px;
                        display: flex;
                        justify-content: space-between;
                        align-items: baseline;
                    ">
                        <a class="toc-text" href="#${escapeHtml(heading.id)}">${escapeHtml(heading.text)}</a>
                        <span class="toc-dots" style="
                            flex: 1;
                            border-bottom: 1px dotted #ccc;
                            margin: 0 10px;
                            height: 1px;
                            align-self: center;
                        "></span>
                        <span class="toc-page" data-heading-id="${escapeHtml(heading.id)}">000000</span>
                    </div>
                `;
            }
        });

        tocHtml += `
                </div>
            </div>
        `;

        return tocHtml;
    }

    /**
     * 收集文档中的所有标题
     * @returns 标题数组
     */
    private collectHeadings(): Array<{ level: number, text: string, id: string }> {
        interface Heading {
            level: number;
            text: string;
            id: string;
        }
        const headings: Heading[] = [];

        // 遍历所有文档
        const usedIds = new Set<string>();
        this.docs.forEach(docData => {
            const { doc } = docData;
            const headingElements = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');

            headingElements.forEach((el, index) => {
                if ((el as HTMLElement).style.display === 'none') return;
                const level = parseInt(el.tagName.substring(1));
                let id = el.id || `book-smith-heading-${index}`;
                while (usedIds.has(id)) id += '-next';
                usedIds.add(id);
                el.id = id;

                headings.push({
                    level,
                    text: el.textContent?.trim() || '',
                    id
                });
            });
        });

        return headings;
    }
}
