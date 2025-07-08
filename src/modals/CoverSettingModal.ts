import { App, Modal, Setting, Notice } from 'obsidian';
import { CoverManager } from '../services/CoverManager';
import { i18n } from '../i18n/i18n';
import { CoverSettings, TextStyleConfig } from '../types/book';

export class CoverSettingModal extends Modal {
    private imageUrl: string = '';
    private scale: number = 1;
    private position: { x: number; y: number } = { x: 0, y: 0 };
    private titleStyle: string = '';
    private authorStyle: string = '';
    private customTitle: string = '';
    private customAuthor: string = '';
    private customSubtitle: string = ''; // 副标题
    private titlePosition: { x: number; y: number } = { x: 50, y: 30 };
    private authorPosition: { x: number; y: number } = { x: 50, y: 70 };
    private subtitlePosition: { x: number; y: number } = { x: 50, y: 50 }; // 副标题位置

    // 新增：样式配置
    private titleStyleConfig: TextStyleConfig = {
        fontSize: 24,
        color: '#ffffff',
        fontWeight: 'bold',
        fontStyle: 'normal',
        textShadow: '0 1px 2px rgba(0,0,0,0.5)'
    };
    private authorStyleConfig: TextStyleConfig = {
        fontSize: 16,
        color: '#ffffff',
        fontWeight: 'normal',
        fontStyle: 'normal',
        textShadow: '0 1px 2px rgba(0,0,0,0.5)'
    };
    private subtitleStyleConfig: TextStyleConfig = {
        fontSize: 18,
        color: '#ffffff',
        fontWeight: 'normal',
        fontStyle: 'normal',
        textShadow: '0 1px 2px rgba(0,0,0,0.5)'
    };

    private initialSettings?: CoverSettings;
    private previewElement: HTMLElement | null = null;
    private dragEventCleanup: (() => void) | null = null;
    private coverManager: CoverManager;
    private isDragging: boolean = false;
    private dragTarget: 'title' | 'author' | 'subtitle' | null = null;

    constructor(
        app: App,
        private onSubmit: (settings: CoverSettings) => void,
        private targetPreviewEl: HTMLElement,
        coverManager: CoverManager,
        initialSettings?: CoverSettings,
        private bookTitle?: string,
        private bookAuthor?: string[],
        private bookSubtitle?: string
    ) {
        super(app);
        this.coverManager = coverManager;
        this.initialSettings = initialSettings;

        // 初始化文本内容
        this.customTitle = initialSettings?.customTitle || bookTitle || '';
        this.customAuthor = initialSettings?.customAuthor || bookAuthor?.join(', ') || '';
        this.customSubtitle = initialSettings?.customSubtitle || bookSubtitle || '';

        // 初始化文本位置
        this.titlePosition = initialSettings?.titlePosition || { x: 50, y: 30 };
        this.authorPosition = initialSettings?.authorPosition || { x: 50, y: 70 };
        this.subtitlePosition = initialSettings?.subtitlePosition || { x: 50, y: 50 };

        // 初始化样式配置
        if (initialSettings?.titleStyleConfig) {
            this.titleStyleConfig = { ...this.titleStyleConfig, ...initialSettings.titleStyleConfig };
        }
        if (initialSettings?.authorStyleConfig) {
            this.authorStyleConfig = { ...this.authorStyleConfig, ...initialSettings.authorStyleConfig };
        }
        if (initialSettings?.subtitleStyleConfig) {
            this.subtitleStyleConfig = { ...this.subtitleStyleConfig, ...initialSettings.subtitleStyleConfig };
        }

        if (initialSettings) {
            this.imageUrl = initialSettings.imageUrl;
            this.scale = initialSettings.scale;
            this.position = { ...initialSettings.position };
            this.titleStyle = initialSettings.titleStyle;
            this.authorStyle = initialSettings.authorStyle;
        } else {
            const defaultSettings = coverManager.getDefaultCoverSettings();
            this.titleStyle = defaultSettings.titleStyle;
            this.authorStyle = defaultSettings.authorStyle;
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
        // 更新 onOpen 方法中的 applyButton 点击事件
        applyButton.addEventListener('click', () => {
            this.onSubmit({
                imageUrl: this.imageUrl,
                scale: this.scale,
                position: this.position,
                titleStyle: this.titleStyle,
                authorStyle: this.authorStyle,
                bookSize: this.initialSettings?.bookSize || 'A4',
                customTitle: this.customTitle,
                customAuthor: this.customAuthor,
                customSubtitle: this.customSubtitle,
                titlePosition: this.titlePosition,
                authorPosition: this.authorPosition,
                subtitlePosition: this.subtitlePosition,
                // 新增：保存样式配置
                titleStyleConfig: this.titleStyleConfig,
                authorStyleConfig: this.authorStyleConfig,
                subtitleStyleConfig: this.subtitleStyleConfig
            });
            
            // 添加提示
            new Notice('封面设置已更新，请点击"重新渲染"按钮查看效果');
            
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
        if (this.imageUrl) {
            // 缩放控制和重置按钮（同一行）
            new Setting(container)
                .setName(i18n.t('SCALE') || '缩放')
                .addButton(button => button
                    .setIcon('rotate-ccw') // 使用重置图标
                    .setTooltip('重置位置')
                    .onClick(() => {
                        this.position = { x: 0, y: 0 };
                        this.updatePreview();
                    }))
                .addSlider(slider => slider
                    .setLimits(0.1, 2, 0.1)
                    .setValue(this.scale)
                    .onChange(value => {
                        this.scale = value;
                        this.updatePreview();
                    }));

            // 图片位置说明
            const positionDesc = container.createEl('div', {
                cls: 'setting-item-description',
                text: '拖拽图片调整位置，或点击重置到中心'
            });
            positionDesc.style.marginTop = '-10px';
            positionDesc.style.marginBottom = '15px';
            positionDesc.style.fontSize = '0.9em';
            positionDesc.style.color = 'var(--text-muted)';
        }
        // 书名输入框和样式控制（同一行）
        new Setting(container)
            .setName('书名')
            .addText(text => text
                .setPlaceholder('输入书名')
                .setValue(this.customTitle)
                .onChange(value => {
                    this.customTitle = value;
                    this.updatePreview();
                }))
            .addSlider(slider => slider
                .setLimits(8, 72, 1)
                .setValue(this.titleStyleConfig.fontSize)
                .setDynamicTooltip()
                .onChange(value => {
                    this.titleStyleConfig.fontSize = value;
                    this.updatePreview();
                }))
            .addColorPicker(color => color
                .setValue(this.titleStyleConfig.color)
                .onChange(value => {
                    this.titleStyleConfig.color = value;
                    this.updatePreview();
                }))
            .addDropdown(dropdown => dropdown
                .addOption('normal', '正常')
                .addOption('bold', '加粗')
                .setValue(this.titleStyleConfig.fontWeight)
                .onChange(value => {
                    this.titleStyleConfig.fontWeight = value as 'normal' | 'bold';
                    this.updatePreview();
                }))
            .addDropdown(dropdown => dropdown
                .addOption('normal', '正常')
                .addOption('italic', '倾斜')
                .setValue(this.titleStyleConfig.fontStyle)
                .onChange(value => {
                    this.titleStyleConfig.fontStyle = value as 'normal' | 'italic';
                    this.updatePreview();
                }));

        // 副标题输入框和样式控制（同一行）
        new Setting(container)
            .setName('副标题')
            .addText(text => text
                .setPlaceholder('输入副标题')
                .setValue(this.customSubtitle)
                .onChange(value => {
                    this.customSubtitle = value;
                    this.updatePreview();
                }))
            .addSlider(slider => slider
                .setLimits(8, 72, 1)
                .setValue(this.subtitleStyleConfig.fontSize)
                .setDynamicTooltip()
                .onChange(value => {
                    this.subtitleStyleConfig.fontSize = value;
                    this.updatePreview();
                }))
            .addColorPicker(color => color
                .setValue(this.subtitleStyleConfig.color)
                .onChange(value => {
                    this.subtitleStyleConfig.color = value;
                    this.updatePreview();
                }))
            .addDropdown(dropdown => dropdown
                .addOption('normal', '正常')
                .addOption('bold', '加粗')
                .setValue(this.subtitleStyleConfig.fontWeight)
                .onChange(value => {
                    this.subtitleStyleConfig.fontWeight = value as 'normal' | 'bold';
                    this.updatePreview();
                }))
            .addDropdown(dropdown => dropdown
                .addOption('normal', '正常')
                .addOption('italic', '倾斜')
                .setValue(this.subtitleStyleConfig.fontStyle)
                .onChange(value => {
                    this.subtitleStyleConfig.fontStyle = value as 'normal' | 'italic';
                    this.updatePreview();
                }));

        // 作者输入框和样式控制（同一行）
        new Setting(container)
            .setName('作者')
            .addText(text => text
                .setPlaceholder('输入作者')
                .setValue(this.customAuthor)
                .onChange(value => {
                    this.customAuthor = value;
                    this.updatePreview();
                }))
            .addSlider(slider => slider
                .setLimits(8, 72, 1)
                .setValue(this.authorStyleConfig.fontSize)
                .setDynamicTooltip()
                .onChange(value => {
                    this.authorStyleConfig.fontSize = value;
                    this.updatePreview();
                }))
            .addColorPicker(color => color
                .setValue(this.authorStyleConfig.color)
                .onChange(value => {
                    this.authorStyleConfig.color = value;
                    this.updatePreview();
                }))
            .addDropdown(dropdown => dropdown
                .addOption('normal', '正常')
                .addOption('bold', '加粗')
                .setValue(this.authorStyleConfig.fontWeight)
                .onChange(value => {
                    this.authorStyleConfig.fontWeight = value as 'normal' | 'bold';
                    this.updatePreview();
                }))
            .addDropdown(dropdown => dropdown
                .addOption('normal', '正常')
                .addOption('italic', '倾斜')
                .setValue(this.authorStyleConfig.fontStyle)
                .onChange(value => {
                    this.authorStyleConfig.fontStyle = value as 'normal' | 'italic';
                    this.updatePreview();
                }));

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

    private createTextStyleControls(container: HTMLElement, title: string, styleConfig: TextStyleConfig, onUpdate: () => void) {
        // 创建样式控制组
        const styleGroup = container.createEl('div', { cls: 'text-style-group' });
        styleGroup.createEl('h4', { text: title, cls: 'style-group-title' });

        // 字体大小
        new Setting(styleGroup)
            .setName('字体大小')
            .addSlider(slider => slider
                .setLimits(8, 72, 1)
                .setValue(styleConfig.fontSize)
                .setDynamicTooltip()
                .onChange(value => {
                    styleConfig.fontSize = value;
                    onUpdate();
                }));

        // 字体颜色
        new Setting(styleGroup)
            .setName('字体颜色')
            .addColorPicker(color => color
                .setValue(styleConfig.color)
                .onChange(value => {
                    styleConfig.color = value;
                    onUpdate();
                }));

        // 字体粗细
        new Setting(styleGroup)
            .setName('字体粗细')
            .addDropdown(dropdown => dropdown
                .addOption('normal', '正常')
                .addOption('bold', '加粗')
                .setValue(styleConfig.fontWeight)
                .onChange(value => {
                    styleConfig.fontWeight = value as 'normal' | 'bold';
                    onUpdate();
                }));

        // 字体样式
        new Setting(styleGroup)
            .setName('字体样式')
            .addDropdown(dropdown => dropdown
                .addOption('normal', '正常')
                .addOption('italic', '倾斜')
                .setValue(styleConfig.fontStyle)
                .onChange(value => {
                    styleConfig.fontStyle = value as 'normal' | 'italic';
                    onUpdate();
                }));
    }

    private updatePreview() {
        if (!this.previewElement) return;

        // 清除现有样式
        this.coverManager.clearCoverStyles(this.previewElement);

        // 获取当前封面配置
        const currentSettings = {
            imageUrl: this.imageUrl,
            scale: this.scale,
            position: this.position,
            titleStyle: this.titleStyle,
            authorStyle: this.authorStyle,
            bookSize: this.initialSettings?.bookSize || 'A4'
        };

        // 应用开本大小样式
        this.applyBookSizeStyles(this.previewElement, currentSettings.bookSize);

        // 应用新样式
        const contentContainer = this.coverManager.applyCoverStyles(this.previewElement, currentSettings);

        // 为背景图片添加拖拽功能
        if (this.imageUrl && this.previewElement) {
            this.setupImageDragEvents(this.previewElement);
        }

        // 添加可拖拽的标题、副标题和作者
        if (contentContainer) {
            if (this.customTitle) {
                const titleEl = contentContainer.createEl('div', {
                    cls: 'cover-title draggable-text',
                    text: this.customTitle
                });
                const titleStyle = this.buildStyleString(this.titleStyleConfig);
                titleEl.setAttribute('style', titleStyle + `position: absolute; left: ${this.titlePosition.x}%; top: ${this.titlePosition.y}%; transform: translate(-50%, -50%); cursor: move; user-select: none; z-index: 10;`);
                this.setupDragEvents(titleEl, 'title');
            }

            if (this.customSubtitle) {
                const subtitleEl = contentContainer.createEl('div', {
                    cls: 'cover-subtitle draggable-text',
                    text: this.customSubtitle
                });
                const subtitleStyle = this.buildStyleString(this.subtitleStyleConfig);
                subtitleEl.setAttribute('style', subtitleStyle + `position: absolute; left: ${this.subtitlePosition.x}%; top: ${this.subtitlePosition.y}%; transform: translate(-50%, -50%); cursor: move; user-select: none; z-index: 10;`);
                this.setupDragEvents(subtitleEl, 'subtitle');
            }

            if (this.customAuthor) {
                const authorEl = contentContainer.createEl('div', {
                    cls: 'cover-author draggable-text',
                    text: this.customAuthor
                });
                const authorStyle = this.buildStyleString(this.authorStyleConfig);
                authorEl.setAttribute('style', authorStyle + `position: absolute; left: ${this.authorPosition.x}%; top: ${this.authorPosition.y}%; transform: translate(-50%, -50%); cursor: move; user-select: none; z-index: 10;`);
                this.setupDragEvents(authorEl, 'author');
            }
        }
    }

    private buildStyleString(styleConfig: TextStyleConfig): string {
        return `font-size: ${styleConfig.fontSize}px; color: ${styleConfig.color}; font-weight: ${styleConfig.fontWeight}; font-style: ${styleConfig.fontStyle}; text-shadow: ${styleConfig.textShadow || 'none'}; `;
    }

    // 新增：图片拖拽事件处理
    private setupImageDragEvents(element: HTMLElement) {
        let startX = 0;
        let startY = 0;
        let startPosX = 0;
        let startPosY = 0;
        let isImageDragging = false;

        const onMouseDown = (e: MouseEvent) => {
            // 检查是否点击在文本元素上，如果是则不处理图片拖拽
            const target = e.target as HTMLElement;
            if (target.classList.contains('draggable-text') || target.closest('.draggable-text')) {
                return;
            }

            e.preventDefault();
            isImageDragging = true;

            startX = e.clientX;
            startY = e.clientY;
            startPosX = this.position.x;
            startPosY = this.position.y;

            // 改变鼠标样式
            element.style.cursor = 'grabbing';

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };

        const onMouseMove = (e: MouseEvent) => {
            if (!isImageDragging) return;

            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;

            this.position.x = startPosX + deltaX;
            this.position.y = startPosY + deltaY;

            // 实时更新背景位置
            element.style.backgroundPosition = `${this.position.x}px ${this.position.y}px`;
        };

        const onMouseUp = () => {
            isImageDragging = false;
            element.style.cursor = 'grab';

            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        // 设置初始鼠标样式
        element.style.cursor = 'grab';
        element.addEventListener('mousedown', onMouseDown);

        // 保存清理函数
        const cleanup = () => {
            element.removeEventListener('mousedown', onMouseDown);
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            element.style.cursor = '';
        };

        // 如果之前有清理函数，先执行
        if (this.dragEventCleanup) {
            this.dragEventCleanup();
        }

        this.dragEventCleanup = cleanup;
    }

    // 修改现有的 setupDragEvents 方法，更新 dragTarget 类型
    private setupDragEvents(element: HTMLElement, type: 'title' | 'author' | 'subtitle') {
        let startX = 0;
        let startY = 0;
        let startLeft = 0;
        let startTop = 0;

        const onMouseDown = (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation(); // 阻止事件冒泡到图片拖拽
            this.isDragging = true;
            this.dragTarget = type;

            const rect = this.previewElement!.getBoundingClientRect();
            startX = e.clientX;
            startY = e.clientY;

            let currentPos;
            if (type === 'title') {
                currentPos = this.titlePosition;
            } else if (type === 'subtitle') {
                currentPos = this.subtitlePosition;
            } else {
                currentPos = this.authorPosition;
            }

            startLeft = currentPos.x;
            startTop = currentPos.y;

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };

        const onMouseMove = (e: MouseEvent) => {
            if (!this.isDragging || this.dragTarget !== type) return;

            const rect = this.previewElement!.getBoundingClientRect();
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;

            const newX = startLeft + (deltaX / rect.width) * 100;
            const newY = startTop + (deltaY / rect.height) * 100;

            // 限制在预览区域内
            const clampedX = Math.max(0, Math.min(100, newX));
            const clampedY = Math.max(0, Math.min(100, newY));

            if (type === 'title') {
                this.titlePosition = { x: clampedX, y: clampedY };
            } else if (type === 'subtitle') {
                this.subtitlePosition = { x: clampedX, y: clampedY };
            } else {
                this.authorPosition = { x: clampedX, y: clampedY };
            }

            element.style.left = `${clampedX}%`;
            element.style.top = `${clampedY}%`;
        };

        const onMouseUp = () => {
            this.isDragging = false;
            this.dragTarget = null;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        element.addEventListener('mousedown', onMouseDown);
    }

    // 应用开本大小样式
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
        element.style.maxWidth = '300px';
        element.style.width = '100%';
        element.style.height = 'auto';
        element.style.position = 'relative';
        element.style.overflow = 'hidden';
    }

    onClose() {
        if (this.dragEventCleanup) {
            this.dragEventCleanup();
            this.dragEventCleanup = null;
        }
        this.contentEl.empty();
    }
}