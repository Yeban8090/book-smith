import { App, Modal, Setting } from 'obsidian';
import { CoverManager, CoverSettings } from '../services/CoverManager';
import { i18n } from '../i18n/i18n';

export class CoverSettingModal extends Modal {
    private imageUrl: string = '';
    private scale: number = 1;
    private position: { x: number; y: number } = { x: 0, y: 0 };
    private titleStyle: string = '';
    private authorStyle: string = '';
    private backgroundColor: string = '#1a1a1a';
    private overlay: boolean = true;
    private overlayOpacity: number = 0.4;
    
    private initialSettings?: CoverSettings;
    private previewElement: HTMLElement | null = null;
    private dragEventCleanup: (() => void) | null = null;
    private coverManager: CoverManager;
    
    constructor(
        app: App,
        private onSubmit: (settings: CoverSettings) => void,
        private targetPreviewEl: HTMLElement,
        coverManager: CoverManager,
        initialSettings?: CoverSettings,
        private bookTitle?: string,
        private bookAuthor?: string[]
    ) {
        super(app);
        this.coverManager = coverManager;
        this.initialSettings = initialSettings;
        
        if (initialSettings) {
            this.imageUrl = initialSettings.imageUrl;
            this.scale = initialSettings.scale;
            this.position = { ...initialSettings.position };
            this.titleStyle = initialSettings.titleStyle;
            this.authorStyle = initialSettings.authorStyle;
            this.backgroundColor = initialSettings.backgroundColor;
            this.overlay = initialSettings.overlay;
            this.overlayOpacity = initialSettings.overlayOpacity;
        } else {
            const defaultSettings = coverManager.getDefaultCoverSettings();
            this.titleStyle = defaultSettings.titleStyle;
            this.authorStyle = defaultSettings.authorStyle;
            this.backgroundColor = defaultSettings.backgroundColor;
            this.overlay = defaultSettings.overlay;
            this.overlayOpacity = defaultSettings.overlayOpacity;
        }
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('book-smith-cover-modal');
        
        const container = contentEl.createEl('div', { cls: 'cover-settings-container' });
        container.createEl('h3', { text: i18n.t('COVER_DESIGN') || '封面设计' });
        
        // 预览区域
        const previewArea = container.createEl('div', { cls: 'cover-preview-area' });
        this.previewElement = previewArea.createEl('div', { cls: 'cover-preview' });
        
        // 控制区域
        const controlsArea = container.createEl('div', { cls: 'cover-controls' });
        this.createControls(controlsArea);
        
        // 应用初始设置到预览
        this.updatePreview();
        
        // 底部按钮
        const buttonContainer = contentEl.createEl('div', { cls: 'cover-button-container' });
        
        const cancelButton = buttonContainer.createEl('button', { 
            text: i18n.t('CANCEL') || '取消',
            cls: 'cover-cancel-button' 
        });
        cancelButton.addEventListener('click', () => this.close());
        
        const applyButton = buttonContainer.createEl('button', { 
            text: i18n.t('APPLY') || '应用',
            cls: 'cover-apply-button' 
        });
        applyButton.addEventListener('click', () => {
            this.onSubmit({
                imageUrl: this.imageUrl,
                scale: this.scale,
                position: this.position,
                titleStyle: this.titleStyle,
                authorStyle: this.authorStyle,
                backgroundColor: this.backgroundColor,
                overlay: this.overlay,
                overlayOpacity: this.overlayOpacity
            });
            this.close();
        });
    }

    private createControls(container: HTMLElement) {
        // 图片上传和清除按钮
        new Setting(container)
            .setName(i18n.t('COVER_IMAGE') || '封面图片')
            .addButton(button => button
                .setButtonText(i18n.t('SELECT_IMAGE') || '选择图片')
                .onClick(() => this.handleImageUpload()))
            .addButton(button => button
                .setButtonText(i18n.t('CLEAR_IMAGE') || '清除图片')
                .onClick(() => this.handleClearImage()));
        
        // 背景颜色选择器
        new Setting(container)
            .setName(i18n.t('BACKGROUND_COLOR') || '背景颜色')
            .addColorPicker(color => color
                .setValue(this.backgroundColor)
                .onChange(value => {
                    this.backgroundColor = value;
                    this.updatePreview();
                }));
        
        // 覆盖层开关
        new Setting(container)
            .setName(i18n.t('OVERLAY') || '覆盖层')
            .setDesc(i18n.t('OVERLAY_DESC') || '添加半透明覆盖层以增强文字可读性')
            .addToggle(toggle => toggle
                .setValue(this.overlay)
                .onChange(value => {
                    this.overlay = value;
                    this.updatePreview();
                }));
        
        // 覆盖层透明度
        if (this.overlay) {
            new Setting(container)
                .setName(i18n.t('OVERLAY_OPACITY') || '覆盖层透明度')
                .addSlider(slider => slider
                    .setLimits(0, 1, 0.1)
                    .setValue(this.overlayOpacity)
                    .onChange(value => {
                        this.overlayOpacity = value;
                        this.updatePreview();
                    }));
        }
        
        // 缩放控制
        if (this.imageUrl) {
            new Setting(container)
                .setName(i18n.t('SCALE') || '缩放')
                .addSlider(slider => slider
                    .setLimits(0.1, 2, 0.1)
                    .setValue(this.scale)
                    .onChange(value => {
                        this.scale = value;
                        this.updatePreview();
                    }));
        }
    }

    private handleImageUpload() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        
        input.addEventListener('change', (e: Event) => {
            const target = e.target as HTMLInputElement;
            if (target.files && target.files[0]) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.imageUrl = e.target?.result as string;
                    this.updatePreview();
                    // 重新创建控制区域以显示缩放控制
                    const controlsArea = this.contentEl.querySelector('.cover-controls');
                    if (controlsArea) {
                        controlsArea.empty();
                        this.createControls(controlsArea as HTMLElement);
                    }
                };
                reader.readAsDataURL(target.files[0]);
            }
        });
        
        input.click();
    }

    private handleClearImage() {
        this.imageUrl = '';
        this.scale = 1;
        this.position = { x: 0, y: 0 };
        this.updatePreview();
        
        // 重新创建控制区域以隐藏缩放控制
        const controlsArea = this.contentEl.querySelector('.cover-controls');
        if (controlsArea) {
            controlsArea.empty();
            this.createControls(controlsArea as HTMLElement);
        }
    }

    private updatePreview() {
        if (!this.previewElement) return;
        
        // 清除现有样式
        this.coverManager.clearCoverStyles(this.previewElement);
        
        // 应用新样式
        const contentContainer = this.coverManager.applyCoverStyles(this.previewElement, {
            imageUrl: this.imageUrl,
            scale: this.scale,
            position: this.position,
            titleStyle: this.titleStyle,
            authorStyle: this.authorStyle,
            backgroundColor: this.backgroundColor,
            overlay: this.overlay,
            overlayOpacity: this.overlayOpacity
        });
        
        // 添加标题和作者
        if (contentContainer) {
            if (this.bookTitle) {
                const titleEl = contentContainer.createEl('div', { cls: 'cover-title', text: this.bookTitle });
                titleEl.setAttribute('style', this.titleStyle);
            }
            
            if (this.bookAuthor && this.bookAuthor.length > 0) {
                const authorEl = contentContainer.createEl('div', { 
                    cls: 'cover-author', 
                    text: this.bookAuthor.join(', ') 
                });
                authorEl.setAttribute('style', this.authorStyle);
            }
        }
    }

    onClose() {
        if (this.dragEventCleanup) {
            this.dragEventCleanup();
            this.dragEventCleanup = null;
        }
        this.contentEl.empty();
    }
}