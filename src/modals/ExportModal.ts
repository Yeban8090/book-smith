import { Notice, App, Modal, ButtonComponent } from "obsidian";
import { i18n } from "../i18n/i18n";
import { BookRenderService, RenderConfig, RenderedBook } from "../services/BookRenderService";
import { Book } from "../types/book";
import { HeaderFooterTocModal } from "./HeaderFooterTocModal";
import { CoverSettingModal } from "./CoverSettingModal";
import BookSmithPlugin from "../main";
import * as fs from "fs/promises";
import * as electron from "electron";

export interface ExportSettings {
    format: string;
    bookSize: string;
    cover?: any;
    headerFooterToc?: any;
    theme?: string;
    showCover: boolean;
    coverImageData?: string;
}

export class ExportModal extends Modal {
    private formatButtons: HTMLButtonElement[] = [];
    private selectedFormat: string | null = null;
    private settingsContainer: HTMLElement;
    private previewContainer: HTMLElement;
    private mainContent: HTMLElement;
    private exportBtn: HTMLButtonElement;
    private isRendering: boolean = false;
    private abortController: AbortController | null = null;
    private renderedBook: RenderedBook | null = null;
    private webview: electron.WebviewTag | null = null;
    private webviewReady: boolean = false;

    private exportSettings: ExportSettings = {
        format: '',
        bookSize: 'A4',
        showCover: false
    };

    private renderSettings = {
        showTitle: true,
        scale: 100,
        displayHeader: true,
        displayFooter: true,
        cssSnippet: ''
    };

    constructor(
        app: App,
        private plugin: BookSmithPlugin,
        private bookRenderService: BookRenderService,
        private selectedBook: Book,
        private pluginSettings?: any
    ) {
        super(app);

        if (pluginSettings) {
            this.renderSettings = {
                showTitle: pluginSettings.showTitle ?? true,
                scale: pluginSettings.scale ?? 100,
                displayHeader: pluginSettings.displayHeader ?? true,
                displayFooter: pluginSettings.displayFooter ?? true,
                cssSnippet: pluginSettings.cssSnippet ?? ''
            };
        }
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('export-modal');

        // 调整模态框尺寸
        this.containerEl.style.setProperty('--dialog-width', '50vw');
        this.containerEl.style.setProperty('--dialog-height', '70vh');

        this.createHeader();
        this.createMainContent();
        this.createFooter();
    }

    private createHeader() {
        const { contentEl } = this;
        const header = contentEl.createDiv({ cls: 'export-modal-header' });

        header.createEl('h2', {
            text: '导出书籍',
            cls: 'export-modal-title'
        });
    }

    private createMainContent() {
        const { contentEl } = this;
        const mainContent = contentEl.createDiv({ cls: 'export-modal-main centered' });
        this.mainContent = mainContent;
    
        // 左侧预览区域 - 只在选择PDF格式时显示
        this.previewContainer = mainContent.createDiv({ cls: 'export-preview-panel' });
        this.updatePreviewVisibility();
    
        // 右侧设置区域
        const settingsPanel = mainContent.createDiv({ cls: 'export-settings-panel' });
        this.createSettingsContent(settingsPanel);
    }
    
    private updateLayoutMode() {
        if (!this.mainContent) return;
        
        if (this.selectedFormat && this.selectedFormat == 'pdf') {
            this.mainContent.removeClass('centered');
            this.mainContent.addClass('split-layout');
        } else {
            this.mainContent.removeClass('split-layout');
            this.mainContent.addClass('centered');
        }
    }
    
    private updatePreviewVisibility() {
        if (!this.previewContainer) return;
        
        if (this.selectedFormat === 'pdf') {
            this.previewContainer.style.display = 'flex';
            this.createPreviewArea();
        } else {
            this.previewContainer.style.display = 'none';
            this.previewContainer.empty();
            this.cleanupWebview();
        }
    }

    private createWebview(scale = 1.0): electron.WebviewTag {
        const webview = document.createElement('webview') as electron.WebviewTag;
        webview.src = 'app://obsidian.md/help.html';
        webview.setAttribute('style', `
            height: 100%;
            width: 100%;
            border: 1px solid #f2f2f2;
            background: white;
        `);
        webview.nodeintegration = true;
        return webview;
    }

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
                Array.from(sheet?.cssRules ?? []).forEach((rule) => {
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

    private getPatchStyles(): string[] {
        const CSS_PATCH = `
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
        
        return [CSS_PATCH, ...this.getPrintStyles()];
    }

    private getPrintStyles(): string[] {
        const cssTexts: string[] = [];
        
        Array.from(document.styleSheets).forEach((sheet) => {
            try {
                const cssRules = sheet?.cssRules ?? [];
                Array.from(cssRules).forEach((rule) => {
                    if (rule.constructor.name === "CSSMediaRule") {
                        if ((rule as CSSMediaRule).conditionText === "print") {
                            const res = rule.cssText.replace(/@media print\s*\{(.+)\}/g, "$1");
                            cssTexts.push(res);
                        }
                    }
                });
            } catch (error) {
                console.error('Error reading print styles:', error);
            }
        });
        
        return cssTexts;
    }

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

    private async setupWebview(doc: Document) {
        if (!this.webview) return;
    
        return new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Webview setup timeout'));
            }, 10000);
    
            this.webview!.addEventListener('dom-ready', async () => {
                try {
                    clearTimeout(timeout);
                    
                    // 1. 先注入所有基础样式
                    const styles = this.getAllStyles();
                    for (const css of styles) {
                        await this.webview!.insertCSS(css);
                    }
                    
                    // 2. 处理自定义CSS片段（如果有的话）
                    if (this.renderSettings.cssSnippet && this.renderSettings.cssSnippet !== '0') {
                        try {
                            // 这里需要实现CSS片段读取逻辑
                            await this.webview!.insertCSS(this.renderSettings.cssSnippet);
                        } catch (error) {
                            console.warn('Failed to load CSS snippet:', error);
                        }
                    }
                    
                    // 3. 注入内容
                    await this.webview!.executeJavaScript(this.makeWebviewJs(doc));
                    
                    // 4. 最后再次注入补丁样式，确保优先级
                    const patchStyles = this.getPatchStyles();
                    for (const css of patchStyles) {
                        await this.webview!.insertCSS(css);
                    }
                    
                    this.webviewReady = true;
                    this.updateExportButtonState();
                    resolve();
                } catch (error) {
                    clearTimeout(timeout);
                    reject(error);
                }
            });
        });
    }

    private createPreviewArea() {
        if (this.selectedFormat !== 'pdf') {
            return;
        }
        
        this.previewContainer.empty();
        this.cleanupWebview();
    
        const previewHeader = this.previewContainer.createDiv({ cls: 'preview-header' });
        previewHeader.createEl('h3', { text: 'PDF导出预览', cls: 'preview-title' });
    
        const previewContent = this.previewContainer.createDiv({ cls: 'preview-content' });
    
        if (this.isRendering) {
            const loading = previewContent.createDiv({ cls: 'preview-loading' });
            loading.innerHTML = `
                <div class="preview-loading-spinner"></div>
                <div class="preview-loading-text">正在渲染预览...</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: 0%"></div>
                </div>
                <div class="progress-text">准备中...</div>
                <div class="progress-file"></div>
            `;
        } else if (this.renderedBook) {
            this.displayRenderedContent(previewContent);
        } else {
            const error = previewContent.createDiv({ cls: 'preview-error' });
            error.innerHTML = `
                <div class="preview-error-icon">❌</div>
                <div class="preview-error-text">渲染失败，请重试</div>
            `;
        }
    }

    private cleanupWebview() {
        if (this.webview) {
            this.webview.remove();
            this.webview = null;
            this.webviewReady = false;
        }
    }

    private updateRenderProgress(current: number, total: number, fileName: string) {
        const progressFill = this.previewContainer.querySelector('.progress-fill') as HTMLElement;
        const progressText = this.previewContainer.querySelector('.progress-text') as HTMLElement;
        const progressFile = this.previewContainer.querySelector('.progress-file') as HTMLElement;

        if (progressFill && progressText && progressFile) {
            const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
            progressFill.style.width = `${percentage}%`;
            progressText.textContent = `${current}/${total} (${percentage}%)`;
            progressFile.textContent = fileName;
        }
    }

    // 移除重复的方法：getAllStyles, getPatchStyles, getPrintStyles, makeWebviewJs
    
    private async startRenderPreview() {
        if (!this.selectedFormat || this.isRendering) return;
        
        this.stopRendering();
    
        this.isRendering = true;
        this.renderedBook = null;
        this.abortController = new AbortController();
        this.updateExportButtonState();
        this.updateFormatButtonsState();
        this.createPreviewArea();
    
        try {
            const renderService = new BookRenderService(this.app);
            const config: RenderConfig = {
                showTitle: this.renderSettings.showTitle,
                scale: this.renderSettings.scale,
                displayHeader: this.renderSettings.displayHeader,
                displayFooter: this.renderSettings.displayFooter,
                cssSnippet: this.renderSettings.cssSnippet,
                abortSignal: this.abortController.signal,
                onProgress: (current: number, total: number, fileName: string) => {
                    this.updateRenderProgress(current, total, fileName);
                }
            };
    
            this.renderedBook = await renderService.renderBook(
                this.selectedBook,
                this.plugin.settings.defaultBookPath,
                config
            );
    
            if (this.abortController.signal.aborted) {
                console.log('Rendering was aborted after completion');
                return;
            }
    
            console.log('Render completed, updating preview...', this.renderedBook);
    
        } catch (error) {
            if (this.abortController?.signal.aborted || error.message === 'Render aborted') {
                console.log('Rendering was aborted');
                return;
            }
    
            console.error('Render failed:', error);
            if (this.isRendering) {
                new Notice('渲染失败，请检查控制台错误信息');
            }
        } finally {
            if (!this.abortController?.signal.aborted) {
                this.isRendering = false;
                this.updateFormatButtonsState();
                this.createPreviewArea(); // 这会触发 displayRenderedContent
                // 延迟更新按钮状态，确保webview已经设置完成
                setTimeout(() => {
                    this.updateExportButtonState();
                }, 100);
            }
        }
    }

    private async displayRenderedContent(container: HTMLElement) {
        if (!this.renderedBook?.doc) return;
        
        container.empty();
        
        try {
            this.webview = this.createWebview();
            container.appendChild(this.webview);
            
            // 使用BookRenderService的setupWebview方法
            await this.bookRenderService.setupWebview(this.webview, this.renderedBook.doc);
            
            this.webviewReady = true;
            this.updateExportButtonState();
        } catch (error) {
            console.error('Error setting up webview:', error);
            const errorDiv = container.createDiv({ cls: 'preview-error' });
            errorDiv.innerHTML = `
                <div class="preview-error-icon">❌</div>
                <div class="preview-error-text">设置预览时出错: ${error.message}</div>
            `;
        }
    }

    private createSettingsContent(container: HTMLElement) {
        this.createBookInfo(container);
        this.createFormatSelection(container);
        this.createSettingsArea(container);
    }

    private createFooter() {
        const { contentEl } = this;
        const footer = contentEl.createDiv({ cls: 'export-modal-footer' });

        const buttonGroup = footer.createDiv({ cls: 'export-button-group' });

        const cancelBtn = buttonGroup.createEl('button', {
            text: '取消',
            cls: 'export-btn export-btn-secondary'
        });
        cancelBtn.addEventListener('click', () => this.handleCancel());

        this.exportBtn = buttonGroup.createEl('button', {
            text: '导出',
            cls: 'export-btn export-btn-primary'
        }) as HTMLButtonElement;
        this.exportBtn.addEventListener('click', () => this.handleExport());

        this.updateExportButtonState();
    }

    private updateExportButtonState() {
        if (this.exportBtn) {
            let canExport: boolean;
            
            if (this.selectedFormat === 'pdf') {
                canExport = !!(this.selectedFormat && !this.isRendering && this.renderedBook && this.webviewReady);
            } else {
                canExport = !!this.selectedFormat && !this.isRendering;
            }
            
            this.exportBtn.disabled = !canExport;
            this.exportBtn.textContent = this.isRendering ? '渲染中...' : '导出';
        }
    }

    private updateFormatButtonsState() {
        this.formatButtons.forEach(btn => {
            if (this.isRendering) {
                btn.classList.add('disabled');
                btn.style.pointerEvents = 'none';
                btn.style.opacity = '0.6';
            } else {
                btn.classList.remove('disabled');
                btn.style.pointerEvents = 'auto';
                btn.style.opacity = '1';
            }
        });
    }

    private async handleCancel() {
        this.stopRendering();
        this.cleanupWebview();
        this.close();
    }

    private stopRendering() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
        this.isRendering = false;
        this.updateExportButtonState();
        this.updateFormatButtonsState();
    }

    private createBookInfo(container: HTMLElement) {
        const bookCard = container.createDiv({ cls: 'export-book-card' });

        const bookIcon = bookCard.createDiv({ cls: 'export-book-icon' });
        bookIcon.innerHTML = '📖';

        const bookDetails = bookCard.createDiv({ cls: 'export-book-details' });

        bookDetails.createEl('h3', {
            text: this.selectedBook.basic.title,
            cls: 'export-book-title'
        });

        if (this.selectedBook.basic.author && this.selectedBook.basic.author.length > 0) {
            bookDetails.createEl('p', {
                text: `作者: ${this.selectedBook.basic.author.join(', ')}`,
                cls: 'export-book-author'
            });
        }

        if (this.selectedBook.basic.desc) {
            bookDetails.createEl('p', {
                text: this.selectedBook.basic.desc,
                cls: 'export-book-desc'
            });
        }
    }

    private createFormatSelection(container: HTMLElement) {
        const formatSection = container.createDiv({ cls: 'export-format-section' });

        formatSection.createEl('h4', {
            text: '选择导出格式',
            cls: 'export-section-title'
        });

        const formatGrid = formatSection.createDiv({ cls: 'export-format-grid' });

        const formats = [
            { key: 'pdf', label: 'PDF', icon: '📄', desc: '便携文档格式' },
            { key: 'txt', label: 'TXT', icon: '📝', desc: '纯文本格式' },
            { key: 'docx', label: 'DOCX', icon: '📋', desc: 'Word文档格式' }
        ];

        formats.forEach(format => {
            const formatCard = formatGrid.createDiv({ cls: 'export-format-card' });

            const formatIcon = formatCard.createDiv({ cls: 'export-format-icon' });
            formatIcon.innerHTML = format.icon;

            const formatInfo = formatCard.createDiv({ cls: 'export-format-info' });
            formatInfo.createEl('div', {
                text: format.label,
                cls: 'export-format-label'
            });
            formatInfo.createEl('div', {
                text: format.desc,
                cls: 'export-format-desc'
            });

            this.formatButtons.push(formatCard as unknown as HTMLButtonElement);

            formatCard.addEventListener('click', () => {
                if (this.isRendering) {
                    new Notice('渲染进行中，请稍候...');
                    return;
                }

                this.formatButtons.forEach(btn => btn.classList.remove('selected'));
                formatCard.classList.add('selected');
                this.selectedFormat = format.key;
                this.exportSettings.format = format.key;
                
                this.updateLayoutMode();
                this.updateSettingsArea();
                this.updatePreviewVisibility();
                
                if (format.key === 'pdf') {
                    this.startRenderPreview();
                } else {
                    this.renderedBook = null;
                    this.cleanupWebview();
                }
                
                this.updateExportButtonState();
            });
        });
    }

    private createSettingsArea(container: HTMLElement) {
        const settingsSection = container.createDiv({ cls: 'export-settings-section' });

        settingsSection.createEl('h4', {
            text: '导出设置',
            cls: 'export-section-title'
        });

        this.settingsContainer = settingsSection.createDiv({ cls: 'export-settings-content' });

        const placeholder = this.settingsContainer.createDiv({ cls: 'export-settings-placeholder' });
        placeholder.innerHTML = `
            <div class="export-placeholder-icon">⚙️</div>
            <div class="export-placeholder-text">请先选择导出格式</div>
        `;
    }

    private updateSettingsArea() {
        this.settingsContainer.empty();

        if (!this.selectedFormat) {
            const placeholder = this.settingsContainer.createDiv({ cls: 'export-settings-placeholder' });
            placeholder.innerHTML = `
                <div class="export-placeholder-icon">⚙️</div>
                <div class="export-placeholder-text">请先选择导出格式</div>
            `;
            return;
        }

        const settingsGrid = this.settingsContainer.createDiv({ cls: 'export-settings-grid' });

        this.createCommonSettings(settingsGrid);

        if (this.selectedFormat === 'pdf') {
            this.createPdfSettings(settingsGrid);
        } else if (this.selectedFormat === 'html') {
            this.createHtmlSettings(settingsGrid);
        } else if (this.selectedFormat === 'docx') {
            this.createDocxSettings(settingsGrid);
        }
    }

    private createCommonSettings(container: HTMLElement) {
        if (['pdf', 'docx'].includes(this.selectedFormat!)) {
            const sizeCard = container.createDiv({ cls: 'export-setting-card' });

            const sizeHeader = sizeCard.createDiv({ cls: 'export-setting-header' });
            sizeHeader.innerHTML = `
                <span class="export-setting-icon">📏</span>
                <span class="export-setting-title">开本大小</span>
            `;

            const sizeSelect = sizeCard.createEl('select', { cls: 'export-setting-select' });
            const sizes = ['A4', 'A5', 'A3', 'Letter', 'Legal', 'Tabloid'];
            sizes.forEach(size => {
                const option = sizeSelect.createEl('option', { value: size, text: size });
                if (size === 'A4') option.selected = true;
            });

            sizeSelect.addEventListener('change', () => {
                this.exportSettings.bookSize = sizeSelect.value;
            });
        }
    }

    private createPdfSettings(container: HTMLElement) {
        // PDF 特定设置
        const coverCard = container.createDiv({ cls: 'export-setting-card' });

        const coverHeader = coverCard.createDiv({ cls: 'export-setting-header' });
        coverHeader.innerHTML = `
            <span class="export-setting-icon">🎨</span>
            <span class="export-setting-title">封面设置</span>
        `;

        const coverToggle = coverCard.createDiv({ cls: 'export-setting-toggle' });
        const coverCheckbox = coverToggle.createEl('input', { type: 'checkbox' });
        coverToggle.createEl('label', { text: '包含封面' });

        coverCheckbox.addEventListener('change', () => {
            this.exportSettings.showCover = coverCheckbox.checked;
        });
    }

    private createHtmlSettings(container: HTMLElement) {
        // HTML 特定设置
    }

    private createDocxSettings(container: HTMLElement) {
        // DOCX 特定设置
    }

    private async getOutputFile(filename: string): Promise<string | undefined> {
        try {
            // @ts-ignore
            const result = await electron.remote.dialog.showSaveDialog({
                title: '导出 PDF',
                defaultPath: `${filename}.pdf`,
                filters: [
                    { name: 'PDF Files', extensions: ['pdf'] },
                    { name: 'All Files', extensions: ['*'] }
                ],
                properties: ['showOverwriteConfirmation', 'createDirectory']
            });

            if (result.canceled) {
                return undefined;
            }
            return result.filePath;
        } catch (error) {
            console.error('Error showing save dialog:', error);
            new Notice('无法打开保存对话框');
            return undefined;
        }
    }

    private async exportToPdf() {
        if (!this.webview || !this.webviewReady || !this.renderedBook) {
            new Notice('PDF 预览未准备就绪，请稍候');
            return;
        }

        try {
            const filename = this.selectedBook.basic.title || 'exported-book';
            const outputFile = await this.getOutputFile(filename);
            
            if (!outputFile) {
                return; // 用户取消了保存
            }
            
            // PDF 导出选项
            const printOptions: electron.PrintToPDFOptions = {
                pageSize: this.exportSettings.bookSize as any || 'A4',
                printBackground: true,
                landscape: false,
                scale: this.renderSettings.scale / 100,
                margins: {
                    marginType: 'default'
                },
                displayHeaderFooter: this.renderSettings.displayHeader || this.renderSettings.displayFooter,
                headerTemplate: this.renderSettings.displayHeader ? '<span></span>' : '',
                footerTemplate: this.renderSettings.displayFooter ? '<span class="pageNumber"></span>' : ''
            };
            

            // 使用 webview 生成 PDF
            const pdfBuffer = await this.webview.printToPDF(printOptions);
            
            // 保存文件
            await fs.writeFile(outputFile, pdfBuffer);
            
            new Notice('PDF 导出成功！');
            
            // 询问是否打开文件
            const shouldOpen = confirm('PDF 导出成功！是否打开文件？');
            if (shouldOpen) {
                // @ts-ignore
                electron.remote.shell.openPath(outputFile);
            }
            
            this.close();
        } catch (error) {
            console.error('PDF export failed:', error);
            new Notice('PDF 导出失败: ' + error.message);
        }
    }

    private async exportToTxt() {
        // TXT 导出逻辑
        new Notice('TXT 导出功能开发中...');
    }

    private async exportToDocx() {
        // DOCX 导出逻辑
        new Notice('DOCX 导出功能开发中...');
    }

    private async handleExport() {
        if (!this.selectedFormat) {
            new Notice('请先选择导出格式');
            return;
        }

        switch (this.selectedFormat) {
            case 'pdf':
                await this.exportToPdf();
                break;
            case 'txt':
                await this.exportToTxt();
                break;
            case 'docx':
                await this.exportToDocx();
                break;
            default:
                new Notice('不支持的导出格式');
        }
    }

    onClose() {
        this.stopRendering();
        this.cleanupWebview();
        const { contentEl } = this;
        contentEl.empty();
    }
}