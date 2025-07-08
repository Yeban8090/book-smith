import { Notice, App, Modal } from "obsidian";
import { BookRenderService, RenderConfig } from "../services/BookRenderService";
import { Book, CoverSettings } from "../types/book";
import { HeaderFooterTocModal, HeaderFooterTocSettings } from "./HeaderFooterTocModal";
import { CoverSettingModal } from "./CoverSettingModal";
import BookSmithPlugin from "../main";
import * as fs from "fs/promises";
import * as electron from "electron";
import { CoverManager } from "src/services/CoverManager";
import { PDFDocument } from 'pdf-lib';

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
    private coverPreviewElement: HTMLElement;

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
        // 创建一个包含封面和内容的滚动容器
        const scrollContainer = this.previewContainer.createDiv({ cls: 'preview-scroll-container' });

        // 添加封面预览区域（初始隐藏）
        if (this.exportSettings.showCover && this.exportSettings.cover) {
            const coverPreviewContainer = scrollContainer.createDiv({ cls: 'cover-preview-container' });
            coverPreviewContainer.style.display = 'none'; // 初始隐藏，等待渲染完成后显示
            coverPreviewContainer.style.marginBottom = '20px';
            coverPreviewContainer.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';

            // 创建封面预览标题
            const coverPreviewHeader = coverPreviewContainer.createDiv({ cls: 'cover-preview-header' });
            coverPreviewHeader.style.padding = '8px 12px';
            coverPreviewHeader.style.borderBottom = '1px solid #e0e0e0';
            coverPreviewHeader.style.display = 'flex';
            coverPreviewHeader.style.justifyContent = 'space-between';
            coverPreviewHeader.style.alignItems = 'center';

            coverPreviewHeader.createEl('span', { text: '封面预览', cls: 'cover-preview-title' });

            // 添加封面预览内容区域
            this.coverPreviewElement = coverPreviewContainer.createDiv({ cls: 'cover-preview-content' });
            this.coverPreviewElement.style.padding = '15px';
            this.coverPreviewElement.style.display = 'flex';
            this.coverPreviewElement.style.justifyContent = 'center';
            // 移除背景色设置
            // this.coverPreviewElement.style.backgroundColor = '#f5f5f5';

            // 更新封面预览
            this.updateCoverPreview();
        }

        // 添加内容预览区域
        const previewContent = scrollContainer.createDiv({ cls: 'preview-content' });

        // 初始状态：显示等待开始渲染的提示
        this.showPreviewState('waiting', previewContent);
    }
    /**
     * 更新封面预览
     */
    private updateCoverPreview() {
        if (!this.coverPreviewElement || !this.exportSettings.cover) return;

        this.coverPreviewElement.empty();

        // 创建封面预览内部容器
        const coverContainer = this.coverPreviewElement.createDiv({ cls: 'cover-container' });
        coverContainer.style.maxWidth = '250px';
        coverContainer.style.maxHeight = '350px';
        coverContainer.style.overflow = 'hidden';
        coverContainer.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';

        // 应用开本大小样式
        this.applyBookSizeStyles(coverContainer, this.exportSettings.cover.bookSize || this.exportSettings.bookSize || 'A4');

        // 设置背景图片
        if (this.exportSettings.cover.imageUrl) {
            coverContainer.style.backgroundImage = `url(${this.exportSettings.cover.imageUrl})`;
            coverContainer.style.backgroundSize = `${this.exportSettings.cover.scale * 100}%`;
            coverContainer.style.backgroundPosition = `${this.exportSettings.cover.position.x}px ${this.exportSettings.cover.position.y}px`;
            coverContainer.style.backgroundRepeat = 'no-repeat';
        }

        // 创建内容容器
        const contentContainer = coverContainer.createDiv({ cls: 'cover-content' });
        contentContainer.style.position = 'relative';
        contentContainer.style.height = '100%';
        contentContainer.style.display = 'flex';
        contentContainer.style.flexDirection = 'column';
        contentContainer.style.justifyContent = 'center';
        contentContainer.style.alignItems = 'center';
        contentContainer.style.padding = '20px';
        contentContainer.style.textAlign = 'center';

        // 添加书籍信息
        const settings = this.exportSettings.cover;
        const book = this.selectedBook;

        // 使用自定义文本和位置
        const titleText = settings.customTitle || book.basic.title;
        const subtitleText = settings.customSubtitle || book.basic.subtitle;
        const authorText = settings.customAuthor || (book.basic.author ? book.basic.author.join(', ') : '');

        // 添加书名
        if (titleText) {
            const titleEl = contentContainer.createDiv({ cls: 'cover-title', text: titleText });

            let titleStyle = '';
            if (settings.titleStyleConfig) {
                titleStyle = this.buildStyleString(settings.titleStyleConfig);
            } else {
                titleStyle = settings.titleStyle || '';
            }
            titleEl.setAttribute('style', titleStyle + `position: absolute; left: ${settings.titlePosition?.x || 50}%; top: ${settings.titlePosition?.y || 30}%; transform: translate(-50%, -50%); z-index: 10;`);
        }

        // 添加副标题
        if (subtitleText) {
            const subtitleEl = contentContainer.createDiv({ cls: 'cover-subtitle', text: subtitleText });

            let subtitleStyle = '';
            if (settings.subtitleStyleConfig) {
                subtitleStyle = this.buildStyleString(settings.subtitleStyleConfig);
            } else {
                subtitleStyle = 'font-size: 18px; color: #ffffff; text-shadow: 0 1px 2px rgba(0,0,0,0.5);';
            }
            subtitleEl.setAttribute('style', subtitleStyle + `position: absolute; left: ${settings.subtitlePosition?.x || 50}%; top: ${settings.subtitlePosition?.y || 50}%; transform: translate(-50%, -50%); z-index: 10;`);
        }

        // 添加作者信息
        if (authorText) {
            const authorEl = contentContainer.createDiv({ cls: 'cover-author', text: authorText });

            let authorStyle = '';
            if (settings.authorStyleConfig) {
                authorStyle = this.buildStyleString(settings.authorStyleConfig);
            } else {
                authorStyle = settings.authorStyle || '';
            }
            authorEl.setAttribute('style', authorStyle + `position: absolute; left: ${settings.authorPosition?.x || 50}%; top: ${settings.authorPosition?.y || 70}%; transform: translate(-50%, -50%); z-index: 10;`);
        }
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

                // 渲染成功后，如果启用了封面，更新并显示封面预览
                if (this.exportSettings.showCover && this.exportSettings.cover) {
                    // 更新封面预览内容
                    this.updateCoverPreview();

                    // 显示封面预览容器
                    const coverPreviewContainer = this.previewContainer.querySelector('.cover-preview-container');
                    if (coverPreviewContainer) {
                        (coverPreviewContainer as HTMLElement).style.display = 'block';
                    }
                }
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

            // 更新封面预览区域的可见性，只有在已渲染完成时才显示
            const coverPreviewContainer = this.previewContainer.querySelector('.cover-preview-container');
            if (coverPreviewContainer) {
                (coverPreviewContainer as HTMLElement).style.display = (this.exportSettings.showCover && this.webviewReady) ? 'block' : 'none';
            }
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

                    // 更新封面预览
                    this.updateCoverPreview();
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

            // 构建页眉模板
            let headerTemplate = '';
            if (this.renderSettings.displayHeader && this.exportSettings.headerFooterToc?.headerEnabled) {
                headerTemplate = `
                <div style="font-size: ${this.exportSettings.headerFooterToc?.headerFontSize || 12}px; color: ${this.exportSettings.headerFooterToc.headerColor || '#000000'}; width: 100%; display: flex; justify-content: space-between; padding: 0 10px; box-sizing: border-box; border-bottom: 1px solid #ddd;">
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
                <div style="font-size: ${this.exportSettings.headerFooterToc.footerFontSize || 12}px; color: ${this.exportSettings.headerFooterToc.footerColor || '#000000'}; width: 100%; display: flex; justify-content: space-between; padding: 0 10px;padding: 0 10px; box-sizing: border-box; border-top: 1px solid #ddd;">
                <span style="flex: 1; text-align: left;">${this.processVariables(this.exportSettings.headerFooterToc.footerLeft || '')}</span>
                <span style="flex: 1; text-align: center;">${this.processVariables(this.exportSettings.headerFooterToc.footerCenter || '')}</span>
                <span style="flex: 1; text-align: right;">${this.processVariables(this.exportSettings.headerFooterToc.footerRight || '').replace('{{pageNumber}}', '<span class="pageNumber"></span>').replace('{{totalPages}}', '<span class="totalPages"></span>')}</span>
                </div>
            `;
            }

            // 更新目录页码
            if (this.exportSettings.headerFooterToc?.tocEnabled) {
                await this.updateTocPageNumbers();
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

            // 如果启用了封面，生成并合并封面
            let finalPdfBuffer: Buffer | Uint8Array = pdfBuffer;
            if (this.exportSettings.showCover && this.exportSettings.cover && this.coverPreviewElement) {
                // 直接使用预览区域的封面元素
                const coverContainer = this.coverPreviewElement.querySelector('.cover-container');
                if (!coverContainer) {
                    console.warn('未找到封面容器元素');
                    return null;
                }
                const coverImageData = await this.convertCoverToImage(coverContainer as HTMLElement);
                if (coverImageData) {
                    // 将封面图片数据保存到导出设置中
                    this.exportSettings.coverImageData = coverImageData;
                    // 合并封面
                    finalPdfBuffer = Buffer.from(await this.generateAndMergeCover(Buffer.from(pdfBuffer)));
                } else {
                    // 如果无法从预览区域获取封面图片，使用原有方法
                    finalPdfBuffer = await this.generateAndMergeCover(Buffer.from(pdfBuffer));
                }
            } else if (this.exportSettings.showCover && this.exportSettings.cover) {
                finalPdfBuffer = await this.generateAndMergeCover(Buffer.from(pdfBuffer));
            }

            // 保存文件
            await fs.writeFile(outputFile, finalPdfBuffer);

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

    /**
     * 更新目录页码
     */
    private async updateTocPageNumbers(): Promise<void> {
        try {
            // 注入脚本计算每个标题的页码
            const script = `
                (function() {
                     // 创建一个映射，存储每个标题ID对应的页码
                    const headingPageMap = {};
                    
                    // 获取所有标题元素
                    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
                    
                    // 计算每个标题所在的页码
                    headings.forEach(heading => {
                        if (!heading.id) return;
                        
                        // 获取元素的位置信息
                        const rect = heading.getBoundingClientRect();
                        
                        // 计算页码（基于A4纸张和默认边距）
                        // 这里的计算是近似的，实际页码可能会有差异
                        const pageHeight = 1122; // A4纸张高度（点）
                        const pageNumber = Math.floor(rect.top / pageHeight) + 1;
                        
                        headingPageMap[heading.id] = pageNumber;
                    });
                    
                    // 更新目录中的页码
                    const tocPageElements = document.querySelectorAll('.toc-page');
                    tocPageElements.forEach(pageEl => {
                        const headingId = pageEl.getAttribute('data-heading-id');
                        if (headingId && headingPageMap[headingId]) {
                            pageEl.textContent = headingPageMap[headingId];
                        }
                    });
                    
                    return true;
                })();
            `;

            if (this.webview) {
                await this.webview.executeJavaScript(script);
            }
        } catch (error) {
            console.error('Failed to update TOC page numbers:', error);
        }
    }

    /**
     * 生成封面并与内容PDF合并
     */
    private async generateAndMergeCover(contentPdfBuffer: Buffer): Promise<Buffer> {
        try {
            // 如果已经有封面图片数据，直接使用
            if (this.exportSettings.coverImageData) {
                // 创建一个新的PDF文档作为封面
                const coverPdfDoc = await PDFDocument.create();

                // 根据选择的开本大小设置页面尺寸
                const pageSizes = {
                    'A4': [595.28, 841.89],
                    'A5': [419.53, 595.28],
                    'A3': [841.89, 1190.55],
                    'Letter': [612, 792],
                    'Legal': [612, 1008],
                    'Tabloid': [792, 1224]
                };

                const pageSize = pageSizes[this.exportSettings.bookSize as keyof typeof pageSizes] || pageSizes['A4'];
                const coverPage = coverPdfDoc.addPage([pageSize[0], pageSize[1]]);

                // 将封面图片添加到PDF
                const coverImage = await coverPdfDoc.embedPng(this.exportSettings.coverImageData);
                const { width, height } = coverImage.size();

                // 计算图片在页面上的位置和大小
                const scale = Math.min(
                    coverPage.getWidth() / width,
                    coverPage.getHeight() / height
                );

                coverPage.drawImage(coverImage, {
                    x: (coverPage.getWidth() - width * scale) / 2,
                    y: (coverPage.getHeight() - height * scale) / 2,
                    width: width * scale,
                    height: height * scale
                });

                // 加载内容PDF
                const contentPdfDoc = await PDFDocument.load(contentPdfBuffer);

                // 创建最终的PDF文档
                const finalPdfDoc = await PDFDocument.create();

                // 复制封面页到最终文档
                const [coverPageCopy] = await finalPdfDoc.copyPages(coverPdfDoc, [0]);
                finalPdfDoc.addPage(coverPageCopy);

                // 复制内容页到最终文档
                const contentPages = await finalPdfDoc.copyPages(
                    contentPdfDoc,
                    contentPdfDoc.getPageIndices()
                );
                contentPages.forEach(page => finalPdfDoc.addPage(page));

                // 保存最终文档
                return Buffer.from(await finalPdfDoc.save());
            } else {
                // 如果没有封面图片数据，使用原有方法生成封面
                // 创建一个临时的HTML元素来生成封面
                const coverContainer = document.createElement('div');
                coverContainer.style.position = 'fixed';
                coverContainer.style.top = '-9999px';
                coverContainer.style.left = '-9999px';
                document.body.appendChild(coverContainer);

                // 使用generateCoverHTML方法生成封面HTML
                if (this.exportSettings.cover) {
                    const coverHTML = this.generateCoverHTML(this.exportSettings.cover, this.selectedBook);
                    coverContainer.innerHTML = coverHTML;
                }

                // 等待图片加载完成
                await new Promise(resolve => setTimeout(resolve, 300));

                // 将封面转换为图片
                let coverImageData = await this.convertCoverToImage(coverContainer);

                // 清理临时元素
                document.body.removeChild(coverContainer);

                // 如果无法生成封面图片，使用简单的文本封面
                if (!coverImageData) {
                    return this.createSimpleCoverAndMerge(contentPdfBuffer);
                }

                // 保存封面图片数据
                this.exportSettings.coverImageData = coverImageData;

                // 递归调用自身，这次会走上面的分支
                return this.generateAndMergeCover(contentPdfBuffer);
            }
        } catch (error) {
            console.error('Failed to generate and merge cover:', error);
            // 如果封面生成失败，返回原始内容PDF
            return contentPdfBuffer;
        }
    }

    /**
     * 生成封面HTML
     */
    private generateCoverHTML(settings: CoverSettings, book: Book): string {
        if (!settings) return '';

        // 创建临时容器元素
        const tempContainer = document.createElement('div');
        tempContainer.className = 'book-cover';
        // 添加分页符样式
        tempContainer.style.pageBreakAfter = 'always';
        tempContainer.style.breakAfter = 'page';
        // 设置开本大小样式
        this.applyBookSizeStyles(tempContainer, settings.bookSize || this.exportSettings.bookSize || 'A4');

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
     */
    private buildStyleString(styleConfig: any): string {
        return `font-size: ${styleConfig.fontSize}px; color: ${styleConfig.color}; font-weight: ${styleConfig.fontWeight}; font-style: ${styleConfig.fontStyle}; text-shadow: ${styleConfig.textShadow || 'none'}; `;
    }

    /**
     * 应用开本大小样式
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
     * 将封面HTML转换为图片
     */
    private async convertCoverToImage(coverElement: HTMLElement): Promise<string | null> {
        try {
            // 确保浏览器完成重绘并等待资源加载
            await new Promise(resolve => setTimeout(resolve, 300));

            // 导入 html-to-image 库
            const htmlToImage = require('html-to-image');

            // 配置导出选项
            const exportConfig = {
                quality: 1,
                pixelRatio: 2, // 提高分辨率
                backgroundColor: '#333333', // 默认背景色
                style: {
                    transform: 'scale(1)',
                    transformOrigin: 'top left'
                }
            };

            try {
                // 首选方法：直接转换为 DataURL
                const dataUrl = await htmlToImage.toPng(coverElement, exportConfig);
                return dataUrl;
            } catch (err) {
                console.warn('toPng 失败，尝试备用方法', err);

                // 备用方法：使用 toCanvas 然后转换为 DataURL
                const canvas = await htmlToImage.toCanvas(coverElement, exportConfig);
                return canvas.toDataURL('image/png', 0.9);
            }
        } catch (error) {
            console.error('封面转图片失败:', error);
            return null;
        }
    }

    /**
     * 创建简单的文本封面并合并
     */
    private async createSimpleCoverAndMerge(contentPdfBuffer: Buffer): Promise<Buffer> {
        // 创建一个新的PDF文档作为封面
        const coverPdfDoc = await PDFDocument.create();

        // 根据选择的开本大小设置页面尺寸
        const pageSizes = {
            'A4': [595.28, 841.89],
            'A5': [419.53, 595.28],
            'A3': [841.89, 1190.55],
            'Letter': [612, 792],
            'Legal': [612, 1008],
            'Tabloid': [792, 1224]
        };

        const pageSize = pageSizes[this.exportSettings.bookSize as keyof typeof pageSizes] || pageSizes['A4'];
        const coverPage = coverPdfDoc.addPage([pageSize[0], pageSize[1]]);

        // 如果没有封面图片，创建一个简单的文本封面
        const { rgb } = require('pdf-lib');

        // 添加标题
        coverPage.drawText(this.selectedBook.basic.title || 'Book Title', {
            x: 50,
            y: coverPage.getHeight() - 150,
            size: 24,
            color: rgb(0, 0, 0)
        });

        // 添加副标题（如果有）
        if (this.selectedBook.basic.subtitle) {
            coverPage.drawText(this.selectedBook.basic.subtitle, {
                x: 50,
                y: coverPage.getHeight() - 200,
                size: 18,
                color: rgb(0.3, 0.3, 0.3)
            });
        }

        // 添加作者（如果有）
        if (this.selectedBook.basic.author && this.selectedBook.basic.author.length > 0) {
            coverPage.drawText(this.selectedBook.basic.author.join(', '), {
                x: 50,
                y: coverPage.getHeight() - 250,
                size: 16,
                color: rgb(0.5, 0.5, 0.5)
            });
        }

        // 将封面保存为Buffer
        const coverPdfBytes = await coverPdfDoc.save();

        // 加载内容PDF
        const contentPdfDoc = await PDFDocument.load(contentPdfBuffer);

        // 创建最终的PDF文档
        const finalPdfDoc = await PDFDocument.create();

        // 复制封面页到最终文档
        const [coverPageCopy] = await finalPdfDoc.copyPages(coverPdfDoc, [0]);
        finalPdfDoc.addPage(coverPageCopy);

        // 复制内容页到最终文档
        const contentPages = await finalPdfDoc.copyPages(
            contentPdfDoc,
            contentPdfDoc.getPageIndices()
        );
        contentPages.forEach(page => finalPdfDoc.addPage(page));

        // 保存最终文档
        return Buffer.from(await finalPdfDoc.save());
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