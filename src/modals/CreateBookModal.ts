import { App, Modal, Setting, Notice } from 'obsidian';
import { BookBasicInfo, Book } from '../types/book';
import BookSmithPlugin from '../main';
import { TemplateManager } from '../services/TemplateManager';
import { i18n } from '../i18n/i18n';

export class CreateBookModal extends Modal {
    private bookInfo: Partial<BookBasicInfo> = {
        author: this.plugin.settings.defaultAuthor ? [this.plugin.settings.defaultAuthor] : []
    };
    private selectedTemplate: string = 'default';
    private targetTotalWords: number = 10000;  // 默认1万字
    private templateManager: TemplateManager;

    constructor(
        app: App, 
        private plugin: BookSmithPlugin,
        private onBookCreated?: (book: Book) => void
    ) {
        super(app);
        this.templateManager = new TemplateManager(this.plugin.settings);
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.addClass('book-smith-create-book-modal');
        contentEl.createEl('h2', { text: i18n.t('CREATE_BOOK_TITLE') });

        // 添加模板选择
        new Setting(contentEl)
            .setName(i18n.t('BOOK_TEMPLATE'))
            .setDesc(i18n.t('TEMPLATE_CHECK_DESC'))
            .addDropdown(dropdown => {
                const templates = this.templateManager.getAllTemplateTypes();
                templates.forEach(template => {
                    dropdown.addOption(template.key, template.name);
                    // 设置默认选中的模板
                    if (template.key === this.plugin.settings.templates.default) {
                        this.selectedTemplate = template.key;
                    }
                });
                dropdown.setValue(this.selectedTemplate)
                    .onChange(value => this.selectedTemplate = value);
            });
        // 添加封面上传
        new Setting(contentEl)
            .setName(i18n.t('COVER'))
            .setDesc(i18n.t('COVER_DESC'))
            .addButton(button => button
                .setButtonText(i18n.t('SELECT_IMAGE'))
                .onClick(async () => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = async () => {
                        const file = input.files?.[0];
                        if (file) {
                            try {
                                // 确保 covers 目录存在
                                const coversPath = `${this.plugin.settings.defaultBookPath}/covers`;
                                if (!await this.plugin.app.vault.adapter.exists(coversPath)) {
                                    await this.plugin.app.vault.adapter.mkdir(coversPath);
                                }

                                // 复制图片到插件目录
                                const fileName = `cover-${Date.now()}.${file.name.split('.').pop()}`;
                                const coverPath = `${coversPath}/${fileName}`;
                                await this.plugin.app.vault.adapter.writeBinary(coverPath, await file.arrayBuffer());
                                this.bookInfo.cover = coverPath;
                                new Notice(i18n.t('COVER_UPLOAD_SUCCESS'));
                            } catch (error) {
                                new Notice(i18n.t('COVER_UPLOAD_FAILED') + error.message);
                            }
                        }
                    };
                    input.click();
                }));

        new Setting(contentEl)
            .setName(i18n.t('BOOK_TITLE'))
            .setDesc(i18n.t('BOOK_TITLE_DESC'))
            .addText(text => text
                .setPlaceholder(i18n.t('BOOK_TITLE_PLACEHOLDER'))
                .onChange(value => this.bookInfo.title = value));

        new Setting(contentEl)
            .setName(i18n.t('SUBTITLE'))
            .setDesc(i18n.t('SUBTITLE_DESC'))
            .addText(text => text
                .setPlaceholder(i18n.t('SUBTITLE_PLACEHOLDER'))
                .onChange(value => this.bookInfo.subtitle = value));

        new Setting(contentEl)
            .setName(i18n.t('TARGET_WORDS'))
            .setDesc(i18n.t('TARGET_WORDS_DESC'))
            .addText(text => text
                .setPlaceholder(i18n.t('TARGET_WORDS_PLACEHOLDER'))
                .onChange(value => {
                    // 处理输入的字数
                    const match = value.match(/^(\d+(?:\.\d+)?)万?$/);
                    if (match) {
                        const num = parseFloat(match[1]) * 10000;
                        this.targetTotalWords = Math.round(num);
                    } else {
                        this.targetTotalWords = 10000;
                    }
                }));

        new Setting(contentEl)
            .setName(i18n.t('AUTHOR'))
            .setDesc(i18n.t('AUTHOR_DESC'))
            .addText(text => text
                .setPlaceholder(i18n.t('AUTHOR_PLACEHOLDER'))
                .setValue(this.plugin.settings.defaultAuthor || '')
                .onChange(value => this.bookInfo.author = value ? value.split(',') : []));

        new Setting(contentEl)
            .setName(i18n.t('DESCRIPTION'))
            .setDesc(i18n.t('DESCRIPTION_DESC'))
            .addTextArea(text => text
                .setPlaceholder(i18n.t('DESCRIPTION_PLACEHOLDER'))
                .onChange(value => this.bookInfo.desc = value));

        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText(i18n.t('CREATE'))
                .setCta()
                .onClick(async () => {
                    if (!this.validateBookInfo()) {
                        new Notice(i18n.t('REQUIRED_FIELDS'));
                        return;
                    }
                    try {
                        const newBook = await this.plugin.bookManager.createBook(
                            this.bookInfo as Omit<BookBasicInfo, 'uuid'>,
                            this.selectedTemplate,
                            this.targetTotalWords
                        );
                        new Notice(i18n.t('CREATE_SUCCESS'));
                        if (this.onBookCreated) {
                            this.onBookCreated(newBook);
                        }
                        this.close();
                    } catch (error) {
                        new Notice(i18n.t('CREATE_FAILED') + error.message);
                    }
                }));
    }

    private validateBookInfo(): boolean {
        return !!(this.bookInfo.title && this.bookInfo.author?.length);
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}