import { App, Component, MarkdownRenderer, MarkdownView, TFile, Notice } from 'obsidian';
import { Book, ChapterNode } from 'src/types/book';
import * as electron from 'electron';

export interface RenderConfig {
    showTitle: boolean;
    scale: number;
    displayHeader: boolean;
    displayFooter: boolean;
    cssSnippet?: string;
    abortSignal?: AbortSignal;
    onProgress?: (current: number, total: number, fileName: string) => void;
}

export interface RenderedChapter {
    file: TFile;
    title: string;
    content: HTMLElement;
    frontMatter: any;
}

export interface RenderedBook {
    doc: Document;
    title: string;
    frontMatter: any;
    chapters: RenderedChapter[];
}

export interface WebviewContent {
    doc: Document;
    styles: string[];
    webviewJs: string;
}

export class BookRenderService {
    constructor(private app: App) { }

    /**
     * 渲染整本书籍
     */
    async renderBook(book: Book, rootPath: String, config: RenderConfig): Promise<RenderedBook> {
        const startTime = new Date().getTime();

        // 检查是否已被中断
        if (config.abortSignal?.aborted) {
            throw new Error('Render aborted');
        }

        // 创建主文档
        const doc = document.implementation.createHTMLDocument(book.basic.title || 'Book');
        doc.title = book.basic.title || 'Book';

        // 添加样式
        this.injectStyles(doc, config);

        // 渲染章节
        const chapters: RenderedChapter[] = [];

        // 递归收集所有文件类型的章节节点
        const fileNodes = this.collectFileNodes(book.structure.tree);
        const totalFiles = fileNodes.length;
        
        // 报告开始进度
        config.onProgress?.(0, totalFiles, '开始渲染...');
        
        for (let i = 0; i < fileNodes.length; i++) {
            const chapterNode = fileNodes[i];
            
            // 在每个章节渲染前检查中断信号
            if (config.abortSignal?.aborted) {
                throw new Error('Render aborted');
            }
        
            // 报告当前进度
            config.onProgress?.(i + 1, totalFiles, chapterNode.title || chapterNode.path);
        
            try {
                // 根据路径获取TFile对象
                const filePath = `${rootPath}/${book?.basic.title}/${chapterNode.path}`;
                const file = this.app.vault.getAbstractFileByPath(filePath);
                if (file instanceof TFile) {
                    const renderedChapter = await this.renderChapter(file, config);
                    chapters.push(renderedChapter);
                } else {
                    console.warn(`File not found: ${chapterNode.path}`);
                }
            } catch (error) {
                if (config.abortSignal?.aborted) {
                    throw new Error('Render aborted');
                }
                console.error(`Failed to render chapter: ${chapterNode.path}`, error);
                new Notice(`渲染章节失败: ${chapterNode.title}`);
            }
        }

        // 最后检查一次中断信号
        if (config.abortSignal?.aborted) {
            throw new Error('Render aborted');
        }

        // 报告完成进度
        config.onProgress?.(totalFiles, totalFiles, '合并章节中...');

        // 合并章节到主文档
        this.mergeChaptersToDocument(doc, chapters, config);

        console.log(`Book render time: ${new Date().getTime() - startTime}ms`);

        return {
            doc,
            title: book.basic.title || 'Book',
            frontMatter: book.basic || {},
            chapters
        };
    }

    /**
     * 为webview准备渲染内容（新增方法）
     */
    async prepareWebviewContent(book: Book, rootPath: string, config: RenderConfig): Promise<WebviewContent> {
        // 渲染书籍
        const renderedBook = await this.renderBook(book, rootPath, config);
        
        // 准备webview所需的样式和脚本
        const styles = this.getAllStyles();
        const webviewJs = this.makeWebviewJs(renderedBook.doc);
        
        return {
            doc: renderedBook.doc,
            styles,
            webviewJs
        };
    }

    /**
     * 设置webview内容（新增方法）
     */
    async setupWebview(webview: electron.WebviewTag, doc: Document, config?: RenderConfig): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Webview setup timeout'));
            }, 10000);

            webview.addEventListener('dom-ready', async () => {
                try {
                    clearTimeout(timeout);
                    
                    // 1. 先注入所有基础样式
                    const styles = this.getAllStyles();
                    for (const css of styles) {
                        await webview.insertCSS(css);
                    }
                    
                    // 2. 处理自定义CSS片段（如果有的话）
                    if (config?.cssSnippet && config.cssSnippet !== '0') {
                        try {
                            await webview.insertCSS(config.cssSnippet);
                        } catch (error) {
                            console.warn('Failed to load CSS snippet:', error);
                        }
                    }
                    
                    // 3. 注入内容
                    await webview.executeJavaScript(this.makeWebviewJs(doc));
                    
                    // 4. 最后再次注入补丁样式，确保优先级
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
     * 生成webview注入脚本（从ExportModal移动过来）
     */
    private makeWebviewJs(doc: Document): string {
        // 获取当前主题相关的类名
        const currentBodyClasses = Array.from(document.body.classList);
        const currentHtmlClasses = Array.from(document.documentElement.classList);
        
        // 获取重要的data属性
        const themeAttr = document.documentElement.getAttribute('data-theme') || '';
        const modeAttr = document.documentElement.getAttribute('data-mode') || '';
        
        return `
            // 设置基本内容
            document.body.innerHTML = decodeURIComponent(\`${encodeURIComponent(doc.body.innerHTML)}\`);
            document.head.innerHTML = decodeURIComponent(\`${encodeURIComponent(doc.head.innerHTML)}\`);
            
            // 复制原始属性
            document.body.setAttribute("class", \`${doc.body.getAttribute("class") || ''}\`);
            document.body.setAttribute("style", \`${doc.body.getAttribute("style") || ''}\`);
            
            // 动态应用当前主题的类名到body
            ${currentBodyClasses.map(cls => 
                cls.includes('theme-') || cls.includes('dark') || cls.includes('light') || cls.includes('obsidian-app')
                    ? `document.body.classList.add('${cls}');`
                    : ''
            ).filter(Boolean).join('\n        ')}
            
            // 动态应用当前主题的类名到html
            ${currentHtmlClasses.map(cls => 
                `document.documentElement.classList.add('${cls}');`
            ).join('\n        ')}
            
            // 设置重要的data属性
            ${themeAttr ? `document.documentElement.setAttribute('data-theme', '${themeAttr}');` : ''}
            ${modeAttr ? `document.documentElement.setAttribute('data-mode', '${modeAttr}');` : ''}
            
            document.title = \`${doc.title}\`;
        `;
    }

    /**
     * 递归收集所有文件类型的章节节点
     */
    private collectFileNodes(nodes: ChapterNode[]): ChapterNode[] {
        const fileNodes: ChapterNode[] = [];

        for (const node of nodes) {
            // 跳过被排除的节点
            if (node.exclude) {
                continue;
            }

            if (node.type === 'file') {
                fileNodes.push(node);
            } else if (node.type === 'group' && node.children) {
                // 递归处理子节点
                fileNodes.push(...this.collectFileNodes(node.children));
            }
        }

        // 按order排序
        return fileNodes.sort((a, b) => a.order - b.order);
    }

    /**
     * 渲染单个章节
     */
    async renderChapter(file: TFile, config: RenderConfig): Promise<RenderedChapter> {
        // 检查中断信号
        if (config.abortSignal?.aborted) {
            throw new Error('Render aborted');
        }
    
        const ws = this.app.workspace;
    
        // 创建临时叶子来渲染文件
        const leaf = ws.getLeaf(true);
        await leaf.openFile(file);
        const view = leaf.view as MarkdownView;
    
        // 获取文件内容
        const data: string = view?.data || await this.app.vault.cachedRead(file);
    
        // 获取前置元数据
        const frontMatter = this.getFrontMatter(file);
    
        // 获取CSS类
        const cssclasses = this.extractCssClasses(frontMatter);
    
        // 创建组件
        const comp = new Component();
        comp.load();
    
        try {
            // 再次检查中断信号
            if (config.abortSignal?.aborted) {
                throw new Error('Render aborted');
            }
    
            // 在当前文档环境中完成渲染
            const printEl = document.body.createDiv('print');
            const viewEl = printEl.createDiv({
                cls: 'markdown-preview-view markdown-rendered ' + cssclasses.join(' ')
            });
            
            // 设置RTL和属性显示
            // @ts-ignore
            viewEl.toggleClass('rtl', this.app.vault.getConfig('rightToLeft'));
            // @ts-ignore
            viewEl.toggleClass('show-properties', 'hidden' !== this.app.vault.getConfig('propertiesInDocument'));
    
            // 添加标题
            const title = frontMatter?.title || file.basename;
            viewEl.createEl('h1', { text: title }, (e) => {
                e.addClass('__title__');
                e.style.display = config.showTitle ? 'block' : 'none';
            });
    
            // 处理块引用 - 如果数据为空，使用空字符串
            const processedData = this.processBlockReferences(data || '', file);
    
            // 渲染Markdown
            await this.renderMarkdownContent(processedData, viewEl, file, comp);
    
            // 检查中断信号
            if (config.abortSignal?.aborted) {
                throw new Error('Render aborted');
            }
    
            // 后处理
            await this.postProcessContent(viewEl, file, comp);
            await this.fixRenderedContent(data || '', viewEl);
    
            // 在当前环境中完成所有渲染后，克隆内容
            const clonedContent = viewEl.cloneNode(true) as HTMLElement;
    
            // 清理当前 document 中的临时元素
            printEl.detach();
            printEl.remove();
            leaf.detach();
    
            return {
                file,
                title,
                content: clonedContent,
                frontMatter
            };
    
        } finally {
            comp.unload();
        }
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

        // 添加剩余的块引用
        [...blocks.values()].forEach(({ id, position: { start } }) => {
            const idx = start.line;
            lines[idx] = `<span id="^${id}" class="blockid"></span>\n\n` + lines[idx];
        });

        return lines.join('\n');
    }

    /**
     * 渲染Markdown内容
     */
    private async renderMarkdownContent(data: string, viewEl: HTMLElement, file: TFile, comp: Component) {
        const fragment = {
            children: undefined,
            appendChild(e: DocumentFragment) {
                this.children = e?.children;
                throw new Error('exit');
            }
        } as unknown as HTMLElement;

        try {
            await MarkdownRenderer.render(this.app, data, fragment, file.path, comp);
        } catch (error) {
            // 预期的错误，用于跳过postProcess
        }

        const el = createFragment();
        Array.from(fragment.children).forEach((item) => {
            el.createDiv({}, (t) => {
                return t.appendChild(item);
            });
        });

        viewEl.appendChild(el);
    }

    /**
     * 后处理内容
     */
    private async postProcessContent(viewEl: HTMLElement, file: TFile, comp: Component) {
        const promises: Array<() => Promise<unknown>> = [];
        //@ts-ignore
        await MarkdownRenderer.postProcess(this.app, {
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
            displayMode: true
        });

        await Promise.all(promises);
    }

    /**
     * 修复渲染内容
     */
    private async fixRenderedContent(data: string, viewEl: HTMLElement) {
        // 修复内部链接
        viewEl.findAll('a.internal-link').forEach((el: HTMLAnchorElement) => {
            const [title, anchor] = el.dataset.href?.split('#') || [];
            if ((!title || title?.length === 0) && anchor?.startsWith('^')) {
                return;
            }
            el.removeAttribute('href');
        });

        // 等待动态内容渲染
        try {
            await this.waitForDynamicContent(data, viewEl);
        } catch (error) {
            console.warn('Wait timeout for dynamic content');
        }

        // 修复Canvas为图片
        this.fixCanvasToImage(viewEl);
    }

    /**
     * 等待动态内容渲染
     */
    private async waitForDynamicContent(data: string, viewEl: HTMLElement) {
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
    private fixCanvasToImage(el: HTMLElement) {
        for (const canvas of Array.from(el.querySelectorAll('canvas'))) {
            const data = canvas.toDataURL();
            const img = document.createElement('img');
            img.src = data;
            img.className = '__canvas__';

            // 复制属性
            Array.from(canvas.attributes).forEach(attr => {
                img.setAttribute(attr.name, attr.value);
            });

            canvas.replaceWith(img);
        }
    }

    /**
     * 合并章节到文档
     */
    private mergeChaptersToDocument(doc: Document, chapters: RenderedChapter[], config: RenderConfig) {
        const body = doc.body;
        body.innerHTML = '';
    
        // 添加打印容器，保持与当前文档相同的类名结构
        const printEl = body.appendChild(doc.createElement('div'));
        printEl.className = 'print';
    
        // 添加主容器，确保包含所有必要的类名
        const mainEl = printEl.appendChild(doc.createElement('div'));
        mainEl.className = 'markdown-preview-view markdown-rendered';
        
        // 复制当前文档中markdown-preview-view的相关类名
        const currentPreviewEl = document.querySelector('.markdown-preview-view');
        if (currentPreviewEl) {
            Array.from(currentPreviewEl.classList).forEach(className => {
                if (!mainEl.classList.contains(className)) {
                    mainEl.classList.add(className);
                }
            });
        }
    
        // 添加每个章节
        chapters.forEach((chapter, index) => {
            const section = doc.createElement('section');
            section.className = 'book-chapter';
            section.setAttribute('data-chapter', index.toString());
    
            // 导入章节内容
            Array.from(chapter.content.children).forEach(child => {
                const importedNode = doc.importNode(child, true);
                section.appendChild(importedNode);
            });
    
            mainEl.appendChild(section);
    
            // 添加分页符（除了最后一章）
            // if (index < chapters.length - 1) {
            //     const pageBreak = doc.createElement('div');
            //     pageBreak.style.pageBreakAfter = 'always';
            //     pageBreak.style.breakAfter = 'page';
            //     pageBreak.className = 'page-break';
            //     mainEl.appendChild(pageBreak);
            // }
        });
    }

    /**
     * 注入样式
     */
    private injectStyles(doc: Document, config?: RenderConfig) {
        const head = doc.head;
        const body = doc.body;
        
        // 复制当前文档的主题相关类名到目标文档
        const bodyClasses = Array.from(document.body.classList);
        bodyClasses.forEach(className => {
            // 复制所有主题相关的类名
            if (className.includes('theme-') || 
                className.includes('dark') || 
                className.includes('light') ||
                className.includes('obsidian-app')) {
                body.classList.add(className);
            }
        });
        
        // 复制html元素的类名和属性
        const htmlClasses = Array.from(document.documentElement.classList);
        htmlClasses.forEach(className => {
            doc.documentElement.classList.add(className);
        });
        
        // 复制重要的data属性
        const htmlElement = document.documentElement;
        ['data-theme', 'data-mode'].forEach(attr => {
            const value = htmlElement.getAttribute(attr);
            if (value) {
                doc.documentElement.setAttribute(attr, value);
            }
        });
        
        // 获取所有样式
        const styles = this.getAllStyles();
        
        // 创建样式元素
        const styleEl = doc.createElement('style');
        styleEl.textContent = styles.join('\n');
        head.appendChild(styleEl);
        
        // 处理自定义CSS片段
        if (config?.cssSnippet && config.cssSnippet !== '0') {
            const customStyleEl = doc.createElement('style');
            customStyleEl.textContent = config.cssSnippet;
            head.appendChild(customStyleEl);
        }
    }

    /**
     * 获取所有样式
     */
    private getAllStyles(): string[] {
        const cssTexts: string[] = [];
    
        // 添加主题相关的样式注释
        cssTexts.push('/* ---------- Obsidian Theme Styles ---------- */');
    
        Array.from(document.styleSheets).forEach((sheet) => {
            // @ts-ignore
            const id = sheet.ownerNode?.id;
            // @ts-ignore
            const href = sheet.ownerNode?.href;
    
            // 跳过Svelte样式，但保留所有主题相关样式
            if (id?.startsWith('svelte-')) {
                return;
            }
    
            const division = `/* ----------${id ? `id:${id}` : href ? `href:${href}` : 'inline'}---------- */`;
            cssTexts.push(division);
    
            try {
                Array.from(sheet?.cssRules || []).forEach((rule) => {
                    cssTexts.push(rule.cssText);
                });
            } catch (error) {
                console.error('Error reading CSS rules:', error);
                // 对于跨域样式表，尝试获取基本信息
                if (href) {
                    cssTexts.push(`/* External stylesheet: ${href} */`);
                }
            }
        });
    
        // 获取当前主题的body类名并添加相关样式
        const bodyClasses = Array.from(document.body.classList);
        const themeClasses = bodyClasses.filter(cls => 
            cls.includes('theme-') || 
            cls.includes('dark') || 
            cls.includes('light')
        );
        
        if (themeClasses.length > 0) {
            cssTexts.push(`/* ---------- Current Theme Classes: ${themeClasses.join(', ')} ---------- */`);
        }
    
        // 添加补丁样式
        cssTexts.push(...this.getPatchStyles());
    
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
          outline: 0 !important;
          background: 0 0 !important;
          text-decoration: initial !important;
          text-shadow: initial !important;
        }
        
        table {
          break-inside: auto;
        }
        
        tr {
          break-inside: avoid;
          break-after: auto;
        }
      }
      
      img.__canvas__ {
        width: 100% !important;
        height: 100% !important;
      }
      
      .book-chapter {
        margin-bottom: 2em;
      }
    `;

        return [patchCSS, ...this.getPrintStyles()];
    }

    private getPrintStyles(): string[] {
        const printStyles: string[] = [];
        
        Array.from(document.styleSheets).forEach((sheet) => {
            try {
                Array.from(sheet?.cssRules || []).forEach((rule) => {
                    if (rule instanceof CSSMediaRule && rule.media.mediaText.includes('print')) {
                        Array.from(rule.cssRules).forEach((printRule) => {
                            printStyles.push(printRule.cssText);
                        });
                    }
                });
            } catch (error) {
                console.error('Error reading print CSS rules:', error);
            }
        });
        
        return printStyles;
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
}