import { App, setIcon, Notice, TFile, MarkdownRenderer } from 'obsidian';
import { BookManager } from "../services/BookManager";
import { Book, ChapterNode } from "../types/book";
import { ExportService } from "../services/ExportService";
import { i18n } from "../i18n/i18n";
import BookSmithPlugin from '../main';
import { ImgTemplateManager, ImgTemplate } from '../services/ImgTemplateManager';
import { ThemeManager } from '../services/ThemeManager';
import { CoverManager, CoverSettings } from '../services/CoverManager';
import { CoverSettingModal } from '../modals/CoverSettingModal';
import { ExportModal } from '../modals/ExportModal';
import { PaginatedEngine, extractBlocks, generatePaginatedTOC } from '../utils/PaginatedEngine';
interface TypographySettings {
    fontFamily: string;
    fontSize: string;
    lineHeight: string;
    margin: string;
    templateId: string;
    themeId: string;
    coverSettings?: CoverSettings; // 封面设置
    showCover: boolean; // 是否显示封面
    bookSize: string; // 新增：书籍开本大小
}

export class TypographyView {
    private container: HTMLElement;
    private bookManager: BookManager;
    private exportService: ExportService;
    private imgTemplateManager: ImgTemplateManager;
    private themeManager: ThemeManager;
    private coverManager: CoverManager;
    private books: Book[] = [];
    private selectedBook: Book | null = null;
    private previewElement: HTMLElement | null = null;
    private coverPreviewElement: HTMLElement | null = null;
    private currentTemplate: ImgTemplate | null = null;
    private coverSettings: CoverSettings | null = null;

    // 自定义选择器引用
    private customBookSelect: HTMLElement | null = null;
    private customTemplateSelect: HTMLElement | null = null;
    private customThemeSelect: HTMLElement | null = null;
    private customFontSelect: HTMLElement | null = null;
    private fontSizeInput: HTMLInputElement | null = null;

    // 添加开本大小选择器引用
    private customBookSizeSelect: HTMLElement | null = null;
    private rootPath: string = ''; // 添加根路径属性
    private tempRenderContainer: HTMLElement | null = null; // 临时渲染容器

    constructor(
        private app: App,
        private plugin: BookSmithPlugin,
        private parentEl: HTMLElement,
        private onExit: () => void
    ) {
        this.bookManager = new BookManager(app, plugin.settings);
        this.exportService = new ExportService(app, plugin.settings);
        this.themeManager = new ThemeManager(app, plugin.settings);
        this.imgTemplateManager = new ImgTemplateManager(app, this.themeManager);
        this.coverManager = new CoverManager(app);
        this.rootPath = plugin.settings.defaultBookPath || ''; // 初始化根路径
        this.createUI();

        // 创建临时渲染容器
        this.tempRenderContainer = document.createElement('div');
        this.tempRenderContainer.style.display = 'none';
        document.body.appendChild(this.tempRenderContainer);
    }

    async initialize() {
        try {
            // 加载所有书籍
            this.books = await this.bookManager.getAllBooks();

            // 初始化各个选择器
            this.initializeBookSelect();
            this.initializeTemplateSelect();
            this.initializeThemeSelect();
            this.initializeFontSelect();
            this.initializeFontSizeControls();
            this.initializeBookSizeSelect(); // 新增初始化开本大小选择器

            // 更新预览
            this.updatePreview();
        } catch (error) {
            console.error('加载书籍失败:', error);
        }
    }

    private createUI() {
        this.container = this.parentEl.createDiv({ cls: 'book-smith-typography-view' });
        this.createHeader();
        this.createContent();
    }

    private createHeader() {
        const header = this.container.createDiv({ cls: 'typography-header' });
        setIcon(header.createSpan({ cls: 'typography-header-icon' }), 'edit-3');
        header.createSpan({ text: i18n.t('DESIGN_TYPOGRAPHY'), cls: 'typography-title' });

        // 添加退出按钮
        const exitBtn = header.createDiv({ cls: 'typography-exit-btn' });
        setIcon(exitBtn, 'x');
        exitBtn.addEventListener('click', () => this.onExit());
    }

    private createContent() {
        // 创建主容器
        const content = this.container.createDiv({ cls: 'typography-content' });

        // 创建顶部选择器面板
        const topPanel = content.createDiv({ cls: 'typography-top-panel' });

        // 创建预览面板
        const previewPanel = content.createDiv({ cls: 'typography-preview-panel' });

        // 创建底部按钮面板
        const bottomPanel = content.createDiv({ cls: 'typography-bottom-panel' });

        // 创建顶部选择器
        this.createTopSelectors(topPanel);

        // 创建预览区域
        this.createPreviewArea(previewPanel);

        // 创建底部按钮
        this.createButtons(bottomPanel);
    }

    private createPreviewArea(container: HTMLElement) {
        // 创建一个包含封面和内容的容器
        const previewContainer = container.createDiv({ cls: 'typography-preview-container' });

        // 添加封面预览（独立容器）
        const coverContainer = previewContainer.createDiv({ cls: 'typography-cover-container' });
        this.coverPreviewElement = coverContainer.createDiv({ cls: 'typography-cover-preview' });

        // 内容预览（独立容器）
        const contentContainer = previewContainer.createDiv({ cls: 'typography-content-container' });
        this.previewElement = contentContainer.createDiv({ cls: 'typography-preview' });
    }

    // 按照要求的顺序创建顶部选择器：书籍、模板、主题、字体、字号大小
    private createTopSelectors(container: HTMLElement) {
        // 创建第一行选择器容器
        const selectorsRow = container.createDiv({ cls: 'typography-selectors-row' });
        // 1. 创建书籍选择器
        this.createBookSelector(selectorsRow);
        // 2. 创建模板选择器
        this.createTemplateSelector(selectorsRow);

        // 3. 创建主题选择器
        this.createThemeSelector(selectorsRow);
        // 4. 创建字体选择器
        this.createFontSelector(selectorsRow);

        // 5. 创建字号大小控制
        this.createFontSizeControls(selectorsRow);

        // 6. 创建开本大小选择器
        this.createBookSizeSelector(selectorsRow);
    }

    // 自定义选择器通用方法
    private createCustomSelect(parent: HTMLElement, className: string, options: { value: string, text: string }[]): HTMLElement {
        const container = parent.createDiv({ cls: `book-smith-select-container ${className}` });

        const select = container.createDiv({ cls: 'book-smith-select' });
        const textSpan = select.createSpan({ cls: 'book-smith-text' });
        const arrowSpan = select.createSpan({ cls: 'book-smith-select-arrow' });
        setIcon(arrowSpan, 'chevron-down');

        // 默认选择第一个选项
        if (options.length > 0) {
            textSpan.textContent = options[0].text;
            select.dataset.value = options[0].value;
        }

        // 创建下拉菜单
        const dropdown = container.createDiv({ cls: 'book-smith-select-dropdown' });

        // 添加选项
        for (const option of options) {
            const item = dropdown.createDiv({ cls: 'book-smith-select-item' });
            item.textContent = option.text;
            item.dataset.value = option.value;

            // 默认选中第一个
            if (options.indexOf(option) === 0) {
                item.addClass('book-smith-selected');
            }

            // 点击选项
            item.addEventListener('click', () => {
                // 更新显示文本和值
                textSpan.textContent = option.text;
                select.dataset.value = option.value;

                // 更新选中状态
                dropdown.querySelectorAll('.book-select-item').forEach(el => {
                    el.removeClass('book-smith-selected');
                });
                item.addClass('book-smith-selected');

                // 关闭下拉菜单
                dropdown.removeClass('book-smith-show');
                arrowSpan.style.transform = '';

                // 触发自定义事件
                select.dispatchEvent(new CustomEvent('change', {
                    detail: { value: option.value, text: option.text }
                }));
            });
        }

        // 点击选择器显示/隐藏下拉菜单
        select.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.toggleClass('book-smith-show', !dropdown.hasClass('book-smith-show'));
            arrowSpan.style.transform = dropdown.hasClass('book-smith-show') ? 'rotate(180deg)' : '';
        });

        // 点击其他地方关闭下拉菜单
        document.addEventListener('click', () => {
            dropdown.removeClass('book-smith-show');
            arrowSpan.style.transform = '';
        });

        return container;
    }

    // 更新自定义选择器的选项
    private updateCustomSelectOptions(selectElement: HTMLElement, options: { value: string, text: string }[]) {
        const dropdown = selectElement.querySelector('.book-smith-select-dropdown');
        const select = selectElement.querySelector('.book-smith-select');
        const textSpan = selectElement.querySelector('.book-smith-text');

        if (!dropdown || !select || !textSpan) return;

        // 清空现有选项
        dropdown.innerHTML = '';

        // 添加新选项
        for (const option of options) {
            const item = dropdown.createDiv({ cls: 'book-smith-select-item' });
            item.textContent = option.text;
            item.dataset.value = option.value;

            // 默认选中第一个
            if (options.indexOf(option) === 0) {
                item.addClass('book-smith-selected');
                textSpan.textContent = option.text;
                (select as HTMLElement).setAttribute('data-value', option.value);
            }

            // 点击选项
            item.addEventListener('click', () => {
                // 更新显示文本和值
                textSpan.textContent = option.text;
                (select as HTMLElement).setAttribute('data-value', option.value);

                // 更新选中状态
                dropdown.querySelectorAll('.book-smith-select-item').forEach(el => {
                    el.removeClass('book-smith-selected');
                });
                item.addClass('book-smith-selected');

                // 关闭下拉菜单
                dropdown.removeClass('book-smith-show');

                // 触发自定义事件
                select.dispatchEvent(new CustomEvent('change', {
                    detail: { value: option.value, text: option.text }
                }));
            });
        }
    }

    // 1. 书籍选择器
    private createBookSelector(parent: HTMLElement) {
        // 获取书籍选项
        const bookOptions = this.books.map(book => ({
            value: book.basic.uuid,
            text: book.basic.title
        }));

        // 如果没有书籍，添加一个提示选项
        if (bookOptions.length === 0) {
            bookOptions.push({
                value: '',
                text: i18n.t('NO_BOOKS_AVAILABLE') || '没有可用的书籍'
            });
        }

        // 创建自定义选择器
        this.customBookSelect = this.createCustomSelect(
            parent,
            'book-smith-book-select',
            bookOptions
        );
        this.customBookSelect.id = 'book-select';
    }

    // 初始化书籍选择器
    private initializeBookSelect() {
        if (!this.customBookSelect) return;

        // 更新书籍选项
        const bookOptions = this.books.map(book => ({
            value: book.basic.uuid,
            text: book.basic.title
        }));

        // 更新选择器选项
        this.updateCustomSelectOptions(this.customBookSelect, bookOptions);

        // 添加事件监听
        this.customBookSelect.querySelector('.book-smith-select')?.addEventListener('change', async (e: any) => {
            const value = e.detail.value;
            this.selectedBook = this.books.find(book => book.basic.uuid === value) || null;
            this.updatePreview();
        });

        // 如果有书籍，选择第一本
        if (bookOptions.length > 0) {
            const select = this.customBookSelect.querySelector('.book-smith-select');
            if (select) {
                (select as HTMLElement).setAttribute('data-value', bookOptions[0].value);
                this.selectedBook = this.books[0];
                this.updatePreview();
            }
        }
    }

    // 2. 模板选择器
    private createTemplateSelector(parent: HTMLElement) {
        this.customTemplateSelect = this.createCustomSelect(
            parent,
            'book-smith-template-select',
            [{ value: '', text: i18n.t('LOADING') || '加载中...' }]
        );
        this.customTemplateSelect.id = 'template-select';
    }

    // 初始化模板选择器
    private async initializeTemplateSelect() {
        if (!this.customTemplateSelect) return;

        // 获取模板选项
        const templateOptions = await this.getTemplateOptions();

        // 更新选择器选项
        this.updateCustomSelectOptions(this.customTemplateSelect, templateOptions);

        // 添加事件监听
        this.customTemplateSelect.querySelector('.book-smith-select')?.addEventListener('change', async (e: any) => {
            const value = e.detail.value;
            this.currentTemplate = this.imgTemplateManager.getTemplate(value) || null;
            this.updatePreview();
        });

        // 默认选择第一个模板
        if (templateOptions.length > 0) {
            const select = this.customTemplateSelect.querySelector('.book-smith-select');
            if (select) {
                (select as HTMLElement).setAttribute('data-value', templateOptions[0].value);
                this.currentTemplate = this.imgTemplateManager.getTemplate(templateOptions[0].value) || null;
            }
        }
    }

    // 3. 主题选择器
    private createThemeSelector(parent: HTMLElement) {
        this.customThemeSelect = this.createCustomSelect(
            parent,
            'book-smith-theme-select',
            [{ value: '', text: i18n.t('LOADING') || '加载中...' }]
        );
        this.customThemeSelect.id = 'theme-select';
    }

    // 初始化主题选择器
    private async initializeThemeSelect() {
        if (!this.customThemeSelect) return;

        // 获取主题选项
        const themes = await this.getThemeOptions();

        // 更新选择器选项
        this.updateCustomSelectOptions(this.customThemeSelect, themes);

        // 添加事件监听
        this.customThemeSelect.querySelector('.book-smith-select')?.addEventListener('change', async (e: any) => {
            const value = e.detail.value;
            this.themeManager.setCurrentTheme(value);
            if (this.previewElement) {
                this.themeManager.applyTheme(this.previewElement);
            }
        });

        // 默认选择第一个主题
        if (themes.length > 0) {
            const select = this.customThemeSelect.querySelector('.book-smith-select');
            if (select) {
                (select as HTMLElement).setAttribute('data-value', themes[0].value);
                this.themeManager.setCurrentTheme(themes[0].value);
            }
        }
    }

    // 4. 字体选择器
    private createFontSelector(parent: HTMLElement) {
        const fontOptions = [
            { value: 'default', text: i18n.t('DEFAULT_FONT') || '默认字体' },
            { value: 'songti', text: i18n.t('SONGTI_FONT') || '宋体' },
            { value: 'heiti', text: i18n.t('HEITI_FONT') || '黑体' },
            { value: 'kaiti', text: i18n.t('KAITI_FONT') || '楷体' },
            { value: 'fangsong', text: i18n.t('FANGSONG_FONT') || '仿宋' },
            { value: 'serif', text: i18n.t('SERIF_FONT') || '衬线字体' },
            { value: 'sans-serif', text: i18n.t('SANS_SERIF_FONT') || '无衬线字体' },
            { value: 'monospace', text: i18n.t('MONOSPACE_FONT') || '等宽字体' },
        ];

        this.customFontSelect = this.createCustomSelect(
            parent,
            'book-smith-font-select',
            fontOptions
        );
        this.customFontSelect.id = 'font-select';
    }

    // 初始化字体选择器
    private initializeFontSelect() {
        if (!this.customFontSelect) return;

        // 添加事件监听
        this.customFontSelect.querySelector('.book-smith-select')?.addEventListener('change', () => {
            this.updatePreview();
        });
    }

    // 5. 字号大小控制
    private createFontSizeControls(parent: HTMLElement) {
        const fontSizeGroup = parent.createEl('div', { cls: 'book-smith-font-size-group' });

        // 添加减小按钮
        const decreaseButton = fontSizeGroup.createEl('button', {
            cls: 'book-smith-font-size-button book-smith-decrease-button',
            text: '-'
        });

        this.fontSizeInput = fontSizeGroup.createEl('input', {
            cls: 'book-smith-font-size-input',
            type: 'text',
            value: '16',
            attr: {
                style: 'border: none; outline: none; background: transparent;',
                min: '12',
                max: '30'
            }
        }) as HTMLInputElement;

        // 添加增大按钮
        const increaseButton = fontSizeGroup.createEl('button', {
            cls: 'book-smith-font-size-button book-smith-increase-button',
            text: '+'
        });

        // 添加单位标签
        fontSizeGroup.createEl('span', {
            cls: 'book-smith-font-size-unit'
        });
    }

    // 初始化字号控制
    private initializeFontSizeControls() {
        if (!this.fontSizeInput) return;

        const updateFontSize = () => {
            if (!this.fontSizeInput) return;

            // 获取当前值并确保在有效范围内
            let currentSize = parseInt(this.fontSizeInput.value) || 16;
            currentSize = Math.max(12, Math.min(30, currentSize));

            // 更新输入框值
            this.fontSizeInput.value = currentSize.toString();

            // 更新主题管理器中的字体大小
            this.themeManager.setFontSize(currentSize);

            // 更新预览
            this.updatePreview();
        };

        // 获取按钮元素
        const decreaseButton = this.fontSizeInput.parentElement?.querySelector('.book-smith-decrease-button');
        const increaseButton = this.fontSizeInput.parentElement?.querySelector('.book-smith-increase-button');

        // 添加减小字号事件
        decreaseButton?.addEventListener('click', () => {
            if (!this.fontSizeInput) return;
            const currentSize = parseInt(this.fontSizeInput.value) || 16;
            if (currentSize > 12) {
                this.fontSizeInput.value = (currentSize - 1).toString();
                updateFontSize();
            }
        });

        // 添加增大字号事件
        increaseButton?.addEventListener('click', () => {
            if (!this.fontSizeInput) return;
            const currentSize = parseInt(this.fontSizeInput.value) || 16;
            if (currentSize < 30) {
                this.fontSizeInput.value = (currentSize + 1).toString();
                updateFontSize();
            }
        });

        // 添加输入框变化事件
        this.fontSizeInput.addEventListener('change', updateFontSize);
        this.fontSizeInput.addEventListener('input', updateFontSize);
    }

    // 获取选项方法
    private async getThemeOptions() {
        const themes = this.themeManager.getVisibleThemes();
        return themes.map(theme => ({
            value: theme.id,
            text: theme.name
        }));
    }

    private async getTemplateOptions() {
        const templates = this.imgTemplateManager.getVisibleTemplates();
        return templates.map(template => ({
            value: template.id,
            text: template.name
        }));
    }

    // 开本大小选择器
    private createBookSizeSelector(parent: HTMLElement) {
        const bookSizeOptions = [
            { value: 'a4', text: 'A4' },
            { value: 'a5', text: 'A5' },
            { value: 'b5', text: 'B5' },
            { value: '16k', text: '16K' },
            { value: 'custom', text: i18n.t('CUSTOM_SIZE') || '自定义' }
        ];

        this.customBookSizeSelect = this.createCustomSelect(
            parent,
            'book-smith-book-size-select',
            bookSizeOptions
        );
        this.customBookSizeSelect.id = 'book-size-select';
    }

    // 初始化开本大小选择器
    private initializeBookSizeSelect() {
        if (!this.customBookSizeSelect) return;

        // 添加事件监听
        this.customBookSizeSelect.querySelector('.book-smith-select')?.addEventListener('change', () => {
            this.updatePreview();
        });
    }

    // 获取排版设置
    private getTypographySettings(): TypographySettings {
        // 获取封面开关状态
        const coverToggle = this.parentEl.querySelector('.cover-toggle-input') as HTMLInputElement;
        const showCover = coverToggle ? coverToggle.checked : true;

        return {
            fontFamily: (this.customFontSelect?.querySelector('.book-smith-select') as HTMLElement)?.getAttribute('data-value') || 'default',
            fontSize: this.fontSizeInput?.value || '16',
            lineHeight: 'normal', // 保留默认值
            margin: '0', // 保留默认值
            templateId: (this.customTemplateSelect?.querySelector('.book-smith-select') as HTMLElement)?.getAttribute('data-value') || 'notes',
            themeId: (this.customThemeSelect?.querySelector('.book-smith-select') as HTMLElement)?.getAttribute('data-value') || 'default',
            coverSettings: this.coverSettings || undefined,
            showCover: showCover,
            bookSize: (this.customBookSizeSelect?.querySelector('.book-smith-select') as HTMLElement)?.getAttribute('data-value') || 'a4'
        };
    }

    // 预览相关方法
    // 在 updatePreview 方法中添加分页逻辑
    private async updatePreview() {
        if (!this.selectedBook) return;

        // 获取封面开关状态
        const coverToggle = this.parentEl.querySelector('.cover-toggle-input') as HTMLInputElement;
        const showCover = coverToggle ? coverToggle.checked : true;

        // 获取排版设置
        const settings = this.getTypographySettings();

        // 更新预览样式
        this.updatePreviewStyle(settings);

        // 分离封面和内容的显示逻辑
        if (this.coverPreviewElement) {
            this.coverPreviewElement.style.display = showCover ? 'block' : 'none';
            if (showCover) {
                this.updateCoverPreview();
            }
        }

        if (this.previewElement) {
            this.previewElement.style.display = 'block';

            // 清空预览元素
            this.previewElement.empty();

            // 渲染内容（内部会应用主题和模板）
            await this.renderPaginatedContent(settings);
        }
    }

    // 修改 renderPaginatedContent 方法，确保一致的应用顺序
    private async renderPaginatedContent(settings: TypographySettings) {
        if (!this.previewElement || !this.tempRenderContainer) return;

        // 清空临时容器
        this.tempRenderContainer.empty();

        // 1. 先渲染所有内容到临时容器
        await this.renderAllContent(this.tempRenderContainer);

        // 2. 提取内容块，转换为支持文字级分页的 IBlock 对象
        const blocks = extractBlocks(this.tempRenderContainer);

        // 3. 创建分页内容容器
        const contentContainer = this.previewElement.createDiv({ cls: 'typography-content-pages' });

        // 4. 创建分页引擎并应用分页
        const engine = new PaginatedEngine(contentContainer);
        engine.setOptions({
            bookSize: settings.bookSize
        });

        // 执行分页
        engine.paginate(blocks);

        // 添加页码标记，修改格式为三位数
        engine.addPageMarkers(" {page} ");

        // 5. 生成分页目录
        const tocPages = generatePaginatedTOC(contentContainer, settings.bookSize);

        // 6. 将目录页添加到内容前面
        const tocContainer = this.previewElement.createDiv({ cls: 'typography-toc-pages' });
        tocPages.forEach(tocPage => {
            tocContainer.appendChild(tocPage);
        });

        // 7.将目录容器移到内容容器前面
        this.previewElement.insertBefore(tocContainer, contentContainer);

        // 8. 在分页完成后应用主题和模板
        if (this.currentTemplate) {
            this.currentTemplate.render(this.previewElement);
        }
        this.themeManager.applyTheme(this.previewElement);
    }

    // 渲染所有内容到指定容器
    private async renderAllContent(container: HTMLElement) {
        if (!this.selectedBook) return;

        // 渲染章节内容
        if (this.selectedBook.structure && this.selectedBook.structure.tree) {
            await this.renderChapters(this.selectedBook.structure.tree, container);
        }
    }

    // 递归渲染章节内容（不分页，只渲染到临时容器）
    private async renderChapters(chapters: ChapterNode[], container: HTMLElement, level: number = 1) {
        if (!chapters || chapters.length === 0) return;

        for (const chapter of chapters) {
            // 跳过被排除的章节
            if (chapter.exclude) continue;
            // 创建标题元素
            const heading = document.createElement(`h${Math.min(level, 6)}`);
            heading.textContent = chapter.title;
            heading.dataset.actualLevel = level.toString(); // 添加自定义属性记录实际层级
            container.appendChild(heading);

            // 如果是文件节点，渲染文件内容
            if (chapter.type === 'file' && chapter.path) {
                try {
                    // 构建文件路径
                    const filePath = `${this.rootPath}/${this.selectedBook?.basic.title}/${chapter.path}`;
                    const file = this.app.vault.getAbstractFileByPath(filePath);

                    if (file instanceof TFile) {
                        // 创建内容容器
                        const contentEl = container.createDiv({ cls: 'chapter-content' });

                        // 使用 cachedRead 获取文件内容
                        const content = await this.app.vault.cachedRead(file);

                        // 使用 MarkdownRenderer 渲染内容
                        await MarkdownRenderer.render(
                            this.app,
                            content,
                            contentEl,
                            file.path,
                            this.plugin
                        );
                    }
                } catch (error) {
                    console.error(`无法读取文件 ${chapter.path}:`, error);
                    container.createEl('p', { text: `*无法读取此章节内容*`, cls: 'error-message' });
                }
            }

            // 递归处理子章节
            if (chapter.children && chapter.children.length > 0) {
                await this.renderChapters(chapter.children, container, level + 1);
            }
        }
    }

    private updatePreviewStyle(settings: TypographySettings) {
        if (!this.previewElement) return;

        // 重置样式
        this.previewElement.className = 'typography-preview';

        // 应用字体
        this.previewElement.classList.add(`font-${settings.fontFamily}`);

        // 应用字号
        this.previewElement.style.fontSize = `${settings.fontSize}px`;

        // 应用行间距
        this.previewElement.classList.add(`line-height-${settings.lineHeight}`);

        // 应用页边距
        this.previewElement.classList.add(`margin-${settings.margin}`);

        // 应用开本大小
        // this.previewElement.classList.add(`book-size-${settings.bookSize}`);

        // 如果封面预览元素存在，也应用开本大小
        if (this.coverPreviewElement) {
            this.coverPreviewElement.className = 'typography-cover-preview';
            this.coverPreviewElement.classList.add(`book-size-${settings.bookSize}`);
        }
    }

    // 底部按钮
    private createButtons(container: HTMLElement) {
        // 创建按钮容器
        const buttonsContainer = container.createDiv({ cls: 'typography-buttons-container' });

        // 第一行按钮组 - 封面相关
        const buttonsGroup = buttonsContainer.createDiv({ cls: 'typography-buttons-group cover-buttons-group' });

        // 添加封面设计开关
        this.createCoverToggle(buttonsGroup);

        // 导出按钮
        const exportBtn = buttonsGroup.createEl('button', {
            text: i18n.t('EXPORT') || '导出',
            cls: 'typography-btn export-btn'
        });
        exportBtn.addEventListener('click', () => this.exportWithTypography());
    }

    // 导出功能
    private async exportWithTypography() {
        try {
            if (!this.selectedBook) {
                throw new Error('未选择书籍');
            }

            // 使用新的导出模态框
            const exportModal = new ExportModal(
                this.parentEl,
                this.exportService,
                (format) => this.executeExport(format)
            );

            exportModal.open();
        } catch (error) {
            console.error('导出错误:', error);
            new Notice(`导出失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    // 执行导出
    private async executeExport(format: string) {
        try {
            if (!this.selectedBook) {
                throw new Error("未选择书籍");
            }
    
            let htmlContent: string | undefined;
            let useTypography = false;
    
            if (format !== "txt") {
                useTypography = true;
                const settings = this.getTypographySettings();
                const tempContainer = document.createElement("div");
                tempContainer.className = "typography-export-container";
    
                if (this.previewElement) {
                    tempContainer.innerHTML = this.previewElement.innerHTML;
                    tempContainer.style.fontSize = `${settings.fontSize}px`;
                    tempContainer.classList.add(`font-${settings.fontFamily}`);
                    htmlContent = tempContainer.innerHTML;
                }
            }
    
            // 调用统一导出接口
            const result = await this.exportService.exportBook(format, this.selectedBook, {
                useTypography,
                htmlContent,
            });
    
            // 特殊处理 PDF 格式的返回值
            if (format === "pdf") {
                if (result.content === "cancelled") {
                    new Notice("导出已取消");
                    return;
                }
                
                // 如果返回的是文件路径（不是 data URL）
                if (!result.content.startsWith("data:")) {
                    new Notice(`PDF 已成功导出到: ${result.content}`);
                    return;
                }
            }
    
            // 处理其他格式或返回 data URL 的情况
            if (result?.content === "print-success") {
                new Notice("PDF 已成功打印");
            } else {
                new Notice("导出完成！");
            }
    
        } catch (error) {
            console.error("导出错误:", error);
            new Notice(`导出失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    // 添加封面设计开关
    private createCoverToggle(parent: HTMLElement) {
        const coverToggleContainer = parent.createDiv({ cls: 'cover-toggle-container' });

        coverToggleContainer.createEl('span', {
            text: i18n.t('SHOW_COVER') || '显示封面',
            cls: 'cover-toggle-label'
        });

        const coverToggle = coverToggleContainer.createEl('input', {
            type: 'checkbox',
            cls: 'cover-toggle-input'
        }) as HTMLInputElement;
        coverToggle.checked = false; // 默认显示封面

        coverToggle.addEventListener('change', () => {
            this.updatePreview();
        });

        // 添加封面设计按钮
        const coverDesignBtn = coverToggleContainer.createEl('button', {
            text: i18n.t('DESIGN_COVER') || '设计封面',
            cls: 'cover-design-btn'
        });

        coverDesignBtn.addEventListener('click', () => this.openCoverDesigner());
    }

    // 打开封面设计器
    private openCoverDesigner() {
        if (!this.selectedBook) {
            new Notice(i18n.t('SELECT_BOOK_FIRST') || '请先选择一本书籍');
            return;
        }

        new CoverSettingModal(
            this.app,
            (settings) => {
                this.coverSettings = settings;
                this.updatePreview();
            },
            this.parentEl,
            this.coverManager,
            this.coverSettings || undefined,
            this.selectedBook.basic.title,
            this.selectedBook.basic.author
        ).open();
    }

    // 添加封面预览更新方法
    private updateCoverPreview() {
        if (!this.coverPreviewElement || !this.selectedBook) return;

        // 清除现有内容
        this.coverPreviewElement.empty();

        // 应用封面样式
        if (this.coverSettings) {
            const contentContainer = this.coverManager.applyCoverStyles(this.coverPreviewElement, this.coverSettings);

            // 添加标题和作者
            if (contentContainer) {
                // 添加书名
                const titleEl = contentContainer.createEl('div', {
                    cls: 'cover-title',
                    text: this.selectedBook.basic.title
                });
                titleEl.setAttribute('style', this.coverSettings.titleStyle);

                // 添加副标题
                if (this.selectedBook.basic.subtitle) {
                    const subtitleEl = contentContainer.createEl('div', {
                        cls: 'cover-subtitle',
                        text: this.selectedBook.basic.subtitle
                    });
                    subtitleEl.setAttribute('style', 'font-size: 18px; color: #ffffff; margin-top: 10px; text-shadow: 0 1px 2px rgba(0,0,0,0.5);');
                }

                // 添加作者信息
                if (this.selectedBook.basic.author && this.selectedBook.basic.author.length > 0) {
                    const authorEl = contentContainer.createEl('div', {
                        cls: 'cover-author',
                        text: this.selectedBook.basic.author.join(', ')
                    });
                    authorEl.setAttribute('style', this.coverSettings.authorStyle);
                }

                // 添加描述信息
                if (this.selectedBook.basic.desc) {
                    const descriptionEl = contentContainer.createEl('div', {
                        cls: 'cover-description',
                        text: this.selectedBook.basic.desc
                    });
                    descriptionEl.setAttribute('style', 'font-size: 14px; color: #f0f0f0; margin-top: 20px; max-width: 80%; text-align: center; font-style: italic;');
                }
            }
        } else {
            // 使用默认封面样式
            const defaultSettings = this.coverManager.getDefaultCoverSettings();
            const contentContainer = this.coverManager.applyCoverStyles(this.coverPreviewElement, defaultSettings);

            // 添加标题和作者
            if (contentContainer) {
                const titleEl = contentContainer.createEl('div', {
                    cls: 'cover-title',
                    text: this.selectedBook.basic.title
                });
                titleEl.setAttribute('style', defaultSettings.titleStyle);

                // 添加副标题
                if (this.selectedBook.basic.subtitle) {
                    const subtitleEl = contentContainer.createEl('div', {
                        cls: 'cover-subtitle',
                        text: this.selectedBook.basic.subtitle
                    });
                    subtitleEl.setAttribute('style', 'font-size: 18px; color: #ffffff; margin-top: 10px; text-shadow: 0 1px 2px rgba(0,0,0,0.5);');
                }

                if (this.selectedBook.basic.author && this.selectedBook.basic.author.length > 0) {
                    const authorEl = contentContainer.createEl('div', {
                        cls: 'cover-author',
                        text: this.selectedBook.basic.author.join(', ')
                    });
                    authorEl.setAttribute('style', defaultSettings.authorStyle);
                }

                // 添加描述信息
                if (this.selectedBook.basic.desc) {
                    const descriptionEl = contentContainer.createEl('div', {
                        cls: 'cover-description',
                        text: this.selectedBook.basic.desc
                    });
                    descriptionEl.setAttribute('style', 'font-size: 14px; color: #f0f0f0; margin-top: 20px; max-width: 80%; text-align: center; font-style: italic;');
                }
            }
        }
    }

    // 移除视图
    remove() {
        this.container.remove();
    }
}
