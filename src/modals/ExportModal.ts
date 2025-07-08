import { Notice, App, Modal, ButtonComponent } from "obsidian";
import { i18n } from "../i18n/i18n";
import { BookRenderService, RenderConfig } from "../services/BookRenderService";
import { Book, CoverSettings } from "../types/book";
import { HeaderFooterTocModal, HeaderFooterTocSettings } from "./HeaderFooterTocModal";
import { CoverSettingModal } from "./CoverSettingModal";
import BookSmithPlugin from "../main";
import * as fs from "fs/promises";
import * as electron from "electron";
import { CoverManager } from "src/services/CoverManager";

// 导出设置接口，定义了导出过程中需要的各种配置项
export interface ExportSettings {
    format: string;            // 导出格式（pdf、txt、docx）
    bookSize: string;          // 开本大小（A4、A5等）
    cover?: CoverSettings;     // 封面设置（可选）
    headerFooterToc?: HeaderFooterTocSettings;  // 页眉页脚和目录设置（可选）
    theme?: string;           // 主题（可选）
    showCover: boolean;        // 是否显示封面
    coverImageData?: string;   // 封面图片数据（可选）
}

export class ExportModal extends Modal {
    // UI 元素引用
    private formatButtons: HTMLButtonElement[] = [];
    private selectedFormat: string | null = null;
    private settingsContainer: HTMLElement;
    private previewContainer: HTMLElement;
    private mainContent: HTMLElement;
    private exportBtn: HTMLButtonElement;
    
    // 状态标志
    private isRendering: boolean = false;
    private abortController: AbortController | null = null;
    private webview: electron.WebviewTag | null = null;
    private webviewReady: boolean = false;

    // 导出设置，包含默认值
    private exportSettings: ExportSettings = {
        format: '',
        bookSize: 'A4',
        showCover: true,  // 修改为默认打开封面
        headerFooterToc: {
            // 默认页眉页脚设置
            headerEnabled: true,
            headerLeft: '{{title}}',
            headerCenter: '',
            headerRight: '{{author}}',
            headerFontSize: 12,
            headerColor: '#000000',
            headerHeight: 15,

            // 默认页脚设置
            footerEnabled: true,
            footerLeft: '',
            footerCenter: '',
            footerRight: '{{pageNumber}}/{{totalPages}}',
            footerFontSize: 12,
            footerColor: '#000000',
            footerHeight: 20,

            // 默认目录设置
            tocEnabled: true,
            tocTitle: '目录',
            tocMaxLevel: 3,
            tocFontSize: 14,
            tocFontFamily: 'serif',
            tocColor: '#000000',
            tocLineHeight: 1.5,
            tocIndentSize: 20,
            tocIndent: 20,
            tocPageBreak: true
        }
    };

    // 渲染设置，控制渲染过程中的一些参数
    private renderSettings = {
        showTitle: true,
        scale: 100,
        displayHeader: true,
        displayFooter: true,
        cssSnippet: ''
    };

    // 构造函数，接收必要的依赖项
    constructor(
        app: App,
        private plugin: BookSmithPlugin,
        private bookRenderService: BookRenderService,
        private selectedBook: Book
    ) {
        super(app);
        // 初始化封面设置默认值
        const coverManager = new CoverManager(this.app);
        this.exportSettings.cover = coverManager.getDefaultCoverSettings(this.selectedBook);
    }

    // 模态框打开时初始化 UI
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

    // 创建模态框的标题头部
    private createHeader() {
        const { contentEl } = this;
        const header = contentEl.createDiv({ cls: 'export-modal-header' });

        header.createEl('h2', {
            text: '导出书籍',
            cls: 'export-modal-title'
        });
    }

    // 创建主内容区域，包括左侧预览区域和右侧设置区域
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

    // 根据选择的导出格式更新布局模式
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

    // 根据选择的导出格式更新预览区域的可见性
    private updatePreviewVisibility() {
        if (!this.previewContainer) return;

        if (this.selectedFormat === 'pdf') {
            this.previewContainer.style.display = 'flex';
            // 只创建预览区域结构，不立即开始渲染
            this.createPreviewArea();
        } else {
            this.previewContainer.style.display = 'none';
            this.previewContainer.empty();
            this.cleanupWebview();
        }
    }

    // 创建用于 PDF 预览的 Electron Webview
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

    // 创建预览区域的 UI 结构
    private createPreviewArea() {
        if (this.selectedFormat !== 'pdf') {
            return;
        }

        this.previewContainer.empty();
        this.cleanupWebview();

        const previewHeader = this.previewContainer.createDiv({ cls: 'preview-header' });
        
        // 创建标题和按钮的容器，使用 flex 布局
        const headerContent = previewHeader.createDiv({ cls: 'preview-header-content' });
        headerContent.createEl('h3', { text: 'PDF导出预览', cls: 'preview-title' });
        
        // 添加重新渲染按钮
        const renderButton = headerContent.createEl('button', {
            text: '重新渲染',
            cls: 'preview-render-btn'
        });
        renderButton.addEventListener('click', () => {
            this.startRenderPreview();
        });

        const previewContent = this.previewContainer.createDiv({ cls: 'preview-content' });

        // 初始状态：显示等待开始渲染的提示
        this.showPreviewState('waiting', previewContent);
    }

    // 统一的预览状态管理方法，处理不同状态（等待、加载中、就绪、错误）
    private showPreviewState(state: 'waiting' | 'loading' | 'ready' | 'error', container?: HTMLElement, errorMessage?: string) {
        const previewContent = container || this.previewContainer.querySelector('.preview-content') as HTMLElement;
        if (!previewContent) return;

        previewContent.empty();

        switch (state) {
            case 'waiting':
                const waiting = previewContent.createDiv({ cls: 'preview-waiting' });
                waiting.innerHTML = `
                    <div class="preview-waiting-icon">📄</div>
                    <div class="preview-waiting-text">点击开始渲染预览</div>
                `;
                break;

            case 'loading':
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
                break;

            case 'ready':
                if (this.webview) {
                    previewContent.appendChild(this.webview);
                }
                break;

            case 'error':
                const error = previewContent.createDiv({ cls: 'preview-error' });
                error.innerHTML = `
                    <div class="preview-error-icon">❌</div>
                    <div class="preview-error-text">${errorMessage || '渲染失败，请重试'}</div>
                    <button class="preview-retry-btn">重新渲染</button>
                `;

                // 添加重试按钮事件
                const retryBtn = error.querySelector('.preview-retry-btn') as HTMLButtonElement;
                retryBtn?.addEventListener('click', () => {
                    this.startRenderPreview();
                });
                break;
        }
    }

    // 清理 Webview 资源
    private cleanupWebview() {
        if (this.webview) {
            this.webview.remove();
            this.webview = null;
            this.webviewReady = false;
        }
    }

    // 更新渲染进度条和进度文本
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

    // 开始渲染预览，这是渲染预览的核心方法
    private async startRenderPreview() {
        if (this.isRendering) {
            new Notice('渲染进行中，请稍候...');
            return;
        }

        // 重置状态
        this.isRendering = true;
        this.webviewReady = false;
        this.cleanupWebview();

        // 显示加载状态
        const previewContent = this.previewContainer.querySelector('.preview-content') as HTMLElement;
        if (!previewContent) {
            this.createPreviewArea(); // 确保预览区域已创建
        }

        previewContent.empty();

        // 添加加载指示器
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

        this.updateExportButtonState();
        this.updateFormatButtonsState();

        // 创建中止控制器
        this.abortController = new AbortController();

        try {
            // 创建 webview 并立即添加到 DOM（但设为隐藏）
            this.webview = this.createWebview();
            this.webview.style.opacity = '0';
            previewContent.appendChild(this.webview);

            // 渲染配置
            const renderConfig: RenderConfig = {
                showTitle: this.renderSettings.showTitle,
                scale: this.renderSettings.scale / 100,
                displayHeader: !!(this.renderSettings.displayHeader && this.exportSettings.headerFooterToc?.headerEnabled),
                displayFooter: !!(this.renderSettings.displayFooter && this.exportSettings.headerFooterToc?.footerEnabled),
                cssSnippet: this.renderSettings.cssSnippet,
                headerFooterToc: this.exportSettings.headerFooterToc,
                showCover: this.exportSettings.showCover,
                coverSettings: this.exportSettings.cover,
                abortSignal: this.abortController?.signal,
                onProgress: (current: number, total: number, fileName: string) => {
                    this.updateRenderProgress(current, total, fileName);
                }
            };

            // 执行渲染 - 现在 webview 已在 DOM 中，dom-ready 事件会正常触发
            await this.bookRenderService.renderToWebview(
                this.webview,
                this.selectedBook,
                this.plugin.settings.defaultBookPath,
                renderConfig
            );

            // 渲染成功
            if (!this.abortController.signal.aborted) {
                this.webviewReady = true;

                // 移除加载指示器并显示 webview
                loading.remove();
                this.webview.style.opacity = '1';
                this.webview.style.transition = 'opacity 0.3s ease-in-out';
                console.log('Rendering completed successfully');
            }

        } catch (error) {
            if (this.abortController?.signal.aborted || error.message === 'Render aborted') {
                console.log('Rendering was aborted');
                return;
            }

            console.error('Render failed:', error);
            this.webviewReady = false;

            if (this.isRendering) {
                // 显示错误信息
                previewContent.empty();
                const errorEl = previewContent.createDiv({ cls: 'preview-error' });
                errorEl.innerHTML = `
                    <div class="preview-error-icon">❌</div>
                    <div class="preview-error-text">${error.message || '渲染失败，请重试'}</div>
                    <button class="preview-retry-btn">重新渲染</button>
                `;

                // 添加重试按钮事件
                const retryBtn = errorEl.querySelector('.preview-retry-btn') as HTMLButtonElement;
                retryBtn?.addEventListener('click', () => {
                    this.startRenderPreview();
                });

                new Notice('渲染失败，请检查控制台错误信息');
            }
        } finally {
            if (!this.abortController?.signal.aborted) {
                this.isRendering = false;
                this.updateFormatButtonsState();

                setTimeout(() => {
                    this.updateExportButtonState();
                }, 100);
            }
        }
    }

    // 创建设置区域的内容，包括书籍信息、格式选择和设置区域
    private createSettingsContent(container: HTMLElement) {
        this.createBookInfo(container);
        this.createFormatSelection(container);
        this.createSettingsArea(container);
    }

    // 创建模态框底部的按钮区域
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

    // 根据渲染状态更新导出按钮的可用性和文本
    private updateExportButtonState() {
        if (this.exportBtn) {
            let canExport: boolean;

            if (this.selectedFormat === 'pdf') {
                canExport = !!(this.selectedFormat && !this.isRendering && this.webviewReady);
            } else {
                canExport = !!this.selectedFormat && !this.isRendering;
            }

            this.exportBtn.disabled = !canExport;
            this.exportBtn.textContent = this.isRendering ? '渲染中...' : '导出';
        }
    }

    // 根据渲染状态更新格式按钮的可用性和样式
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

    // 处理取消按钮点击
    private async handleCancel() {
        this.stopRendering();
        this.cleanupWebview();
        this.close();
    }

    // 中止正在进行的渲染
    private stopRendering() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
        this.isRendering = false;
        this.updateExportButtonState();
        this.updateFormatButtonsState();
    }

    // 显示书籍基本信息（标题、作者、描述）
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

    // 创建导出格式选择区域（PDF、TXT、DOCX）
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

                // PDF 格式自动开始渲染
                if (format.key === 'pdf') {
                    // 延迟一点时间，确保 UI 更新完成
                    setTimeout(() => {
                        this.startRenderPreview();
                    }, 50);
                } else {
                    this.cleanupWebview();
                }

                this.updateExportButtonState();
            });
        });
    }

    // 创建设置区域的容器
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

    // 根据选择的格式更新设置区域
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

    // 创建通用设置（如开本大小）
    private createCommonSettings(container: HTMLElement) {
        if (['pdf', 'docx'].includes(this.selectedFormat!)) {
            // 开本大小设置
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
                if (size === (this.exportSettings.bookSize || 'A4')) option.selected = true;
            });

            sizeSelect.addEventListener('change', () => {
                this.exportSettings.bookSize = sizeSelect.value;
            });
        }
    }

    // 创建 PDF 特定设置（封面设置、页眉页脚目录设置）
    private createPdfSettings(container: HTMLElement) {
        // PDF 特定设置
        const coverCard = container.createDiv({ cls: 'export-setting-card' });

        const coverHeader = coverCard.createDiv({ cls: 'export-setting-header' });
        coverHeader.innerHTML = `
            <span class="export-setting-icon">🎨</span>
            <span class="export-setting-title">封面设置</span>
        `;

        const coverToggle = coverCard.createDiv({ cls: 'export-setting-toggle' });
        const coverCheckbox = coverToggle.createEl('input', { type: 'checkbox', attr: { id: 'cover-toggle' } });
        coverToggle.createEl('label', { text: '包含封面', attr: { for: 'cover-toggle' } });
        coverCheckbox.checked = this.exportSettings.showCover !== false; // 修改为默认选中

        coverCheckbox.addEventListener('change', () => {
            this.exportSettings.showCover = coverCheckbox.checked;
        });

        // 添加封面设置按钮
        const coverButtonContainer = coverCard.createDiv({ cls: 'export-setting-button-container' });
        const coverSettingButton = coverButtonContainer.createEl('button', {
            cls: 'export-setting-button',
            text: '自定义封面'
        });

        coverSettingButton.addEventListener('click', () => {
            // 打开封面设置模态框
            const coverModal = new CoverSettingModal(
                this.app,
                (settings) => {
                    // 保存封面设置
                    this.exportSettings.cover = settings;
                },
                document.createElement('div'), // 临时元素作为预览容器
                new CoverManager(this.app),
                this.exportSettings.cover,
                this.selectedBook.basic.title,
                this.selectedBook.basic.author,
                this.selectedBook.basic.subtitle
            );
            coverModal.open();
        });

        // 页眉页脚目录设置
        const headerFooterTocCard = container.createDiv({ cls: 'export-setting-card' });

        const headerFooterTocHeader = headerFooterTocCard.createDiv({ cls: 'export-setting-header' });
        headerFooterTocHeader.innerHTML = `
            <span class="export-setting-icon">📑</span>
            <span class="export-setting-title">页眉页脚目录设置</span>
        `;

        // 添加页眉页脚目录设置按钮
        const headerFooterTocButtonContainer = headerFooterTocCard.createDiv({ cls: 'export-setting-button-container' });
        const headerFooterTocButton = headerFooterTocButtonContainer.createEl('button', {
            cls: 'export-setting-button',
            text: '自定义页眉页脚和目录'
        });

        headerFooterTocButton.addEventListener('click', () => {
            // 打开页眉页脚目录设置模态框
            const headerFooterTocModal = new HeaderFooterTocModal(
                this.plugin,
                this.exportSettings.headerFooterToc || {},
                (settings) => {
                    // 保存页眉页脚目录设置
                    this.exportSettings.headerFooterToc = settings;

                    // 更新渲染设置
                    this.renderSettings.displayHeader = settings.headerEnabled;
                    this.renderSettings.displayFooter = settings.footerEnabled;
                }
            );
            headerFooterTocModal.open();
        });
    }

    // 创建 HTML 特定设置（占位符）
    private createHtmlSettings(container: HTMLElement) {
        // HTML 特定设置
    }

    // 创建 DOCX 特定设置（占位符）
    private createDocxSettings(container: HTMLElement) {
        // DOCX 特定设置
    }

    // 显示保存文件对话框
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

    // 导出为 PDF
    private async exportToPdf() {
        if (!this.webview || !this.webviewReady) {
            new Notice('PDF 预览未准备就绪，请稍候');
            return;
        }

        try {
            const filename = this.selectedBook.basic.title || 'exported-book';
            const outputFile = await this.getOutputFile(filename);

            if (!outputFile) {
                return; // 用户取消了保存
            }

            // 获取页眉页脚设置
            // const headerFooterToc = this.exportSettings.headerFooterToc || {};

            // 构建页眉模板
            let headerTemplate = '';
            if (this.renderSettings.displayHeader && this.exportSettings.headerFooterToc?.headerEnabled) {
                headerTemplate = `
                <div style="font-size: ${this.exportSettings.headerFooterToc?.headerFontSize || 12}px; color: ${this.exportSettings.headerFooterToc.headerColor || '#000000'}; width: 100%; display: flex; justify-content: space-between; padding: 0 10px;">
                    <div style="text-align: left;">${this.processVariables(this.exportSettings.headerFooterToc.headerLeft || '')}</div>
                    <div style="text-align: center;">${this.processVariables(this.exportSettings.headerFooterToc.headerCenter || '')}</div>
                    <div style="text-align: right;">${this.processVariables(this.exportSettings.headerFooterToc.headerRight || '')}</div>
                </div>
            `;
            }

            // 构建页脚模板
            let footerTemplate = '';
            if (this.renderSettings.displayFooter && this.exportSettings.headerFooterToc?.footerEnabled) {
                footerTemplate = `
                <div style="font-size: ${this.exportSettings.headerFooterToc.footerFontSize || 12}px; color: ${this.exportSettings.headerFooterToc.footerColor || '#000000'}; width: 100%; display: flex; justify-content: space-between; padding: 0 10px;">
                    <div style="text-align: left;">${this.processVariables(this.exportSettings.headerFooterToc.footerLeft || '')}</div>
                    <div style="text-align: center;">${this.processVariables(this.exportSettings.headerFooterToc.footerCenter || '')}</div>
                    <div style="text-align: right;">${this.processVariables(this.exportSettings.headerFooterToc.footerRight || '').replace('{{pageNumber}}', '<span class="pageNumber"></span>').replace('{{totalPages}}', '<span class="totalPages"></span>')}</div>
                </div>
            `;
            }

            // PDF 导出选项
            const printOptions: electron.PrintToPDFOptions = {
                pageSize: this.exportSettings.bookSize as any || 'A4',
                printBackground: false,
                landscape: false,
                scale: this.renderSettings.scale / 100,
                margins: {
                    marginType: 'default'
                },
                displayHeaderFooter: this.renderSettings.displayHeader || this.renderSettings.displayFooter,
                headerTemplate: headerTemplate,
                footerTemplate: footerTemplate
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

    // 处理页眉页脚模板中的变量（如 {{title}}、{{author}}、{{date}}）
    private processVariables(text: string): string {
        if (!text) return '';

        return text
            .replace('{{title}}', this.selectedBook.basic.title || '')
            .replace('{{author}}', Array.isArray(this.selectedBook.basic.author) ? this.selectedBook.basic.author.join(', ') : (this.selectedBook.basic.author || ''))
            .replace('{{date}}', new Date().toLocaleDateString());
    }

    // 导出为 TXT（开发中）
    private async exportToTxt() {
        // TXT 导出逻辑
        new Notice('TXT 导出功能开发中...');
    }

    // 导出为 DOCX（开发中）
    private async exportToDocx() {
        // DOCX 导出逻辑
        new Notice('DOCX 导出功能开发中...');
    }

    // 根据选择的格式调用相应的导出方法
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

    // 在模态框关闭时执行清理操作
    onClose() {
        this.stopRendering();
        this.cleanupWebview();
        const { contentEl } = this;
        contentEl.empty();
    }
}