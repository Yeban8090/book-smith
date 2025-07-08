import { App, Component, MarkdownRenderer, MarkdownView, TFile } from 'obsidian';
import { Book, ChapterNode, CoverSettings } from '../types/book';
import { HeaderFooterTocSettings } from '../modals/HeaderFooterTocModal';
import * as electron from 'electron';

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
        return new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Webview setup timeout'));
            }, 10000);


            webview.addEventListener('dom-ready', async () => {
                try {
                    clearTimeout(timeout);

                    // 1. 收集所有文件并渲染为文档
                    const { data, docs } = await this.getAllFiles(book, rootPath, config);
                    await this.renderFiles(data, docs, config);

                    // 处理封面
                    if (config.showCover && config.coverSettings) {

                        // 生成封面 HTML
                        const coverHtml = this.generateCover(config.coverSettings, book);

                        // 将封面插入到文档的开头
                        if (coverHtml) {
                            const doc = this.docs[0].doc;
                            const contentEl = doc.querySelector('.markdown-preview-view');
                            if (contentEl) {
                                const coverContainer = doc.createElement('div');
                                coverContainer.innerHTML = coverHtml;
                                const firstChild = coverContainer.firstChild;
                                if (firstChild) {
                                    contentEl.insertBefore(firstChild, contentEl.firstChild);
                                }
                            }
                        }
                    }
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
                    if (tocHtml) {
                        // 将目录插入到文档的开头
                        const doc = this.docs[0].doc;
                        const contentEl = doc.querySelector('.markdown-preview-view');
                        if (contentEl) {
                            const tocContainer = doc.createElement('div');
                            tocContainer.innerHTML = tocHtml;
                            const firstChild = tocContainer.firstChild;
                            if (firstChild) {
                                contentEl.insertBefore(firstChild, contentEl.firstChild);
                            }
                        }
                    }

                    await this.appendWebview(webview, this.docs[0]);

                    // 6. 注入补丁样式
                    const patchStyles = this.getPatchStyles();
                    for (const css of patchStyles) {
                        await webview.insertCSS(css);
                    }

                    resolve();
                } catch (error) {
                    clearTimeout(timeout);
                    reject(error);
                }
            });
        });
    }

    /**
 * 生成封面 HTML
 * @param settings 封面设置
 * @param book 书籍信息
 * @returns 封面 HTML 字符串
 */
    private generateCover(settings: CoverSettings, book: Book): string {
        if (!settings) return '';

        // 创建临时容器元素
        const tempContainer = document.createElement('div');
        tempContainer.className = 'book-cover';
        // 添加分页符样式
        tempContainer.style.pageBreakAfter = 'always';
        tempContainer.style.breakAfter = 'page';
        // 设置开本大小样式
        this.applyBookSizeStyles(tempContainer, settings.bookSize || 'A4');

        // 设置背景图片
        if (settings.imageUrl) {
            tempContainer.style.backgroundImage = `url(${settings.imageUrl})`;
            tempContainer.style.backgroundSize = `${settings.scale * 100}%`;
            tempContainer.style.backgroundPosition = `${settings.position.x}px ${settings.position.y}px`;
            tempContainer.style.backgroundRepeat = 'no-repeat';
        }

        // 创建内容容器
        const contentContainer = document.createElement('div');
        contentContainer.className = 'cover-content';
        contentContainer.style.position = 'relative';
        contentContainer.style.height = '100%';
        contentContainer.style.display = 'flex';
        contentContainer.style.flexDirection = 'column';
        contentContainer.style.justifyContent = 'center';
        contentContainer.style.alignItems = 'center';
        contentContainer.style.padding = '40px';
        contentContainer.style.textAlign = 'center';
        tempContainer.appendChild(contentContainer);

        // 添加书籍信息
        // 使用自定义文本和位置
        const titleText = settings.customTitle || book.basic.title;
        const subtitleText = settings.customSubtitle || book.basic.subtitle;
        const authorText = settings.customAuthor || (book.basic.author ? book.basic.author.join(', ') : '');

        // 添加书名
        if (titleText) {
            const titleEl = document.createElement('div');
            titleEl.className = 'cover-title';
            titleEl.textContent = titleText;

            let titleStyle = '';
            if (settings.titleStyleConfig) {
                titleStyle = this.buildStyleString(settings.titleStyleConfig);
            } else {
                titleStyle = settings.titleStyle || '';
            }
            titleEl.setAttribute('style', titleStyle + `position: absolute; left: ${settings.titlePosition?.x || 50}%; top: ${settings.titlePosition?.y || 30}%; transform: translate(-50%, -50%); z-index: 10;`);
            contentContainer.appendChild(titleEl);
        }

        // 添加副标题
        if (subtitleText) {
            const subtitleEl = document.createElement('div');
            subtitleEl.className = 'cover-subtitle';
            subtitleEl.textContent = subtitleText;

            let subtitleStyle = '';
            if (settings.subtitleStyleConfig) {
                subtitleStyle = this.buildStyleString(settings.subtitleStyleConfig);
            } else {
                subtitleStyle = 'font-size: 18px; color: #ffffff; text-shadow: 0 1px 2px rgba(0,0,0,0.5);';
            }
            subtitleEl.setAttribute('style', subtitleStyle + `position: absolute; left: ${settings.subtitlePosition?.x || 50}%; top: ${settings.subtitlePosition?.y || 50}%; transform: translate(-50%, -50%); z-index: 10;`);
            contentContainer.appendChild(subtitleEl);
        }

        // 添加作者信息
        if (authorText) {
            const authorEl = document.createElement('div');
            authorEl.className = 'cover-author';
            authorEl.textContent = authorText;

            let authorStyle = '';
            if (settings.authorStyleConfig) {
                authorStyle = this.buildStyleString(settings.authorStyleConfig);
            } else {
                authorStyle = settings.authorStyle || '';
            }
            authorEl.setAttribute('style', authorStyle + `position: absolute; left: ${settings.authorPosition?.x || 50}%; top: ${settings.authorPosition?.y || 70}%; transform: translate(-50%, -50%); z-index: 10;`);
            contentContainer.appendChild(authorEl);
        }

        // 返回生成的 HTML
        return tempContainer.outerHTML;
    }

    /**
     * 构建样式字符串
     * @param styleConfig 样式配置
     * @returns 样式字符串
     */
    private buildStyleString(styleConfig: any): string {
        return `font-size: ${styleConfig.fontSize}px; color: ${styleConfig.color}; font-weight: ${styleConfig.fontWeight}; font-style: ${styleConfig.fontStyle}; text-shadow: ${styleConfig.textShadow || 'none'}; `;
    }

    /**
     * 应用开本大小样式
     * @param element 目标元素
     * @param bookSize 开本大小
     */
    private applyBookSizeStyles(element: HTMLElement, bookSize: string) {
        const sizeMap: Record<string, { aspectRatio: string }> = {
            'A4': { aspectRatio: '210/297' },
            'A5': { aspectRatio: '148/210' },
            'A3': { aspectRatio: '297/420' },
            'Legal': { aspectRatio: '8.5/14' },
            'Letter': { aspectRatio: '8.5/11' },
            'Tabloid': { aspectRatio: '11/17' }
        };

        const size = sizeMap[bookSize] || sizeMap['A4'];
        element.style.aspectRatio = size.aspectRatio;
        element.style.width = '100%';
        element.style.height = 'auto';
    }

    /**
     * 收集所有文件 - 对应 modal.ts 的 getAllFiles
     */
    private async getAllFiles(book: Book, rootPath: string, config: RenderConfig): Promise<{ data: ParamType[], docs: DocType[] }> {
        const fileNodes = this.collectFileNodes(book.structure.tree);
        const data: ParamType[] = fileNodes.map(node => ({
            app: this.app,
            file: this.getFileFromNode(node, book, rootPath),
            config,
            book,
            rootPath,
            extra: {
                title: node.title,
                id: node.id
            }
        })).filter(param => param.file !== null) as ParamType[];

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

        // 并发渲染所有文件
        const inputs = data.map((param, i) =>
            this.renderMarkdown(param).then(res => {
                config.onProgress?.(i + 1, totalFiles, param.file.basename);
                return res;
            })
        );

        let _docs = [...docs, ...(await Promise.all(inputs))];

        // 合并所有文档为一个完整的书籍文档
        _docs = this.mergeDoc(_docs);

        // 修复文档
        this.docs = _docs.map(({ doc, ...rest }) => {
            return { ...rest, doc: this.fixDoc(doc, doc.title) };
        });
    }

    /**
     * 渲染单个Markdown文件 - 基于 render.ts 的 renderMarkdown
     */
    private async renderMarkdown({ app, file, config, book, extra }: ParamType): Promise<DocType> {
        const startTime = new Date().getTime();

        // 检查中断信号
        if (config.abortSignal?.aborted) {
            throw new Error('Render aborted');
        }

        const leaf = app.workspace.getLeaf(true);
        await leaf.openFile(file);
        const view = leaf.view as MarkdownView;
        const data: string = view?.data || await app.vault.cachedRead(file);

        const frontMatter = this.getFrontMatter(file);
        const cssclasses = this.extractCssClasses(frontMatter);

        const comp = new Component();
        comp.load();

        try {
            const printEl = document.body.createDiv('print');
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

            // 渲染markdown - 使用 better-export-pdf 的方式
            const fragment = this.createRenderFragment();
            const promises: Array<() => Promise<unknown>> = [];

            try {
                await MarkdownRenderer.render(app, processedData, fragment, file.path, comp);
            } catch (error) {
                // 预期的错误，用于避免postProcess
            }

            // 添加渲染内容到viewEl
            const el = createFragment();
            Array.from(fragment.children).forEach((item) => {
                el.createDiv({}, (t) => {
                    //@ts-ignore
                    return t.appendChild(item);
                });
            });
            viewEl.appendChild(el);

            // 后处理
            // @ts-ignore
            await MarkdownRenderer.postProcess(app, {
                docId: this.generateDocId(16),
                sourcePath: file.path,
                frontmatter: {},
                promises,
                addChild: function (e: Component) {
                    return comp.addChild(e);
                },
                getSectionInfo: function () {
                    return null;
                },
                containerEl: viewEl,
                el: viewEl,
                displayMode: true,
            });

            await Promise.all(promises);

            // 修复内部链接
            this.fixInternalLinks(printEl, file);

            // 等待动态内容渲染
            await this.fixWaitRender(data || '', viewEl);

            // 修复canvas为图片
            this.fixCanvasToImage(viewEl);

            // 创建文档
            const doc = document.implementation.createHTMLDocument('document');
            doc.body.appendChild(printEl.cloneNode(true));
            doc.title = title;

            // 清理
            printEl.detach();
            printEl.remove();
            leaf.detach();

            return { doc, frontMatter, file, title };

        } finally {
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

        // 使用 better-export-pdf 的安全注入方式
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
        // 使用更安全的方式传输HTML内容
        const bodyContent = doc.body.innerHTML;
        const headContent = doc.head.innerHTML;
        const docTitle = doc.title;

        return `
            try {
                // 安全地设置内容
                document.body.innerHTML = decodeURIComponent(\`${encodeURIComponent(bodyContent)}\`);
                document.head.innerHTML = decodeURIComponent(\`${encodeURIComponent(headContent)}\`);
                
                // 递归解码嵌入内容
                function decodeAndReplaceEmbed(element) {
                    if (!element || !element.innerHTML) return;
                    try {
                        element.innerHTML = decodeURIComponent(element.innerHTML);
                        const newEmbeds = element.querySelectorAll("span.markdown-embed");
                        newEmbeds.forEach(decodeAndReplaceEmbed);
                    } catch (e) {
                        console.warn('Failed to decode embed:', e);
                    }
                }
                
                document.querySelectorAll("span.markdown-embed").forEach(decodeAndReplaceEmbed);
                
                // 应用主题类名
                const currentBodyClasses = "${Array.from(document.body.classList).join(' ')}";
                const currentHtmlClasses = "${Array.from(document.documentElement.classList).join(' ')}";
                
                if (currentBodyClasses) {
                    document.body.className = currentBodyClasses;
                }
                if (currentHtmlClasses) {
                    document.documentElement.className = currentHtmlClasses;
                }
                
                // 设置主题相关属性
                const themeAttr = "${document.documentElement.getAttribute('data-theme') || ''}";
                const modeAttr = "${document.documentElement.getAttribute('data-mode') || ''}";
                
                if (themeAttr) document.documentElement.setAttribute('data-theme', themeAttr);
                if (modeAttr) document.documentElement.setAttribute('data-mode', modeAttr);
                
                document.body.addClass("theme-light");
                document.body.removeClass("theme-dark");
                document.title = \`${docTitle.replace(/[`\\]/g, '\\$&')}\`;
                
            } catch (error) {
                console.error('Error in webview script:', error);
                throw error;
            }
        `;
    }

    /**
     * 修复文档 - 对应 render.ts 的 fixDoc
     */
    private fixDoc(doc: Document, title: string): Document {
        this.encodeEmbeds(doc);
        return doc;
    }

    /**
     * 编码嵌入内容 - 对应 render.ts 的 encodeEmbeds
     */
    private encodeEmbeds(doc: Document): void {
        const spans = Array.from(doc.querySelectorAll('span.markdown-embed')).reverse();
        spans.forEach((span: HTMLElement) => {
            span.innerHTML = encodeURIComponent(span.innerHTML);
        });
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

        for (const node of nodes) {
            if (node.exclude) continue;

            if (node.type === 'file') {
                fileNodes.push(node);
            } else if (node.type === 'group' && node.children) {
                fileNodes.push(...this.collectFileNodes(node.children));
            }
        }

        return fileNodes.sort((a, b) => a.order - b.order);
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
     * 创建渲染片段
     */
    private createRenderFragment(): any {
        return {
            children: undefined,
            appendChild(e: DocumentFragment) {
                this.children = e?.children;
                throw new Error('exit');
            },
        } as unknown as HTMLElement;
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
    private async fixWaitRender(data: string, viewEl: HTMLElement): Promise<void> {
        if (data.includes('```dataview') || data.includes('```gEvent') || data.includes('![[')) {
            await this.sleep(2000);
        }
        try {
            await this.waitForDomChange(viewEl);
        } catch (error) {
            await this.sleep(1000);
        }
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
                .print .markdown-preview-view {
                    height: auto !important;
                }
                
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
    private generateDocId(n: number): string {
        return Array.from({ length: n }, () => ((16 * Math.random()) | 0).toString(16)).join('');
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private waitForDomChange(target: HTMLElement, timeout = 2000, interval = 200): Promise<boolean> {
        return new Promise((resolve, reject) => {
            let timer: NodeJS.Timeout;
            const observer = new MutationObserver(() => {
                clearTimeout(timer);
                timer = setTimeout(() => {
                    observer.disconnect();
                    resolve(true);
                }, interval);
            });

            observer.observe(target, {
                childList: true,
                subtree: true,
                attributes: true,
                characterData: true
            });

            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`timeout ${timeout}ms`));
            }, timeout);
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
                margin: 40px 0;
                line-height: ${settings.tocLineHeight};
            ">
                <h1 style="text-align: center; margin-bottom: 30px;">${settings.tocTitle}</h1>
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
                        <span class="toc-text">${heading.text}</span>
                        <span class="toc-dots" style="
                            flex: 1;
                            border-bottom: 1px dotted #ccc;
                            margin: 0 10px;
                            height: 1px;
                            align-self: center;
                        "></span>
                        <span class="toc-page" data-heading-id="${heading.id}">?</span>
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
        this.docs.forEach(docData => {
            const { doc } = docData;
            const headingElements = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');

            headingElements.forEach((el, index) => {
                const level = parseInt(el.tagName.substring(1));
                const id = el.id || `heading-${index}`;
                if (!el.id) el.id = id;

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