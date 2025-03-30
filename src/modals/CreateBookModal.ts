import { App, Modal, Setting, Notice } from 'obsidian';
import { BookBasicInfo, Book } from '../types/book';
import BookSmithPlugin from '../main';

export class CreateBookModal extends Modal {
    private bookInfo: Partial<BookBasicInfo> = {
        author: this.plugin.settings.defaultAuthor ? [this.plugin.settings.defaultAuthor] : []
    };
    private selectedTemplate: string = 'default';
    private targetTotalWords: number = 10000;  // 默认1万字

    constructor(
        app: App, 
        private plugin: BookSmithPlugin,
        private onBookCreated?: (book: Book) => void
    ) {
        super(app);
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.addClass('book-smith-create-book-modal');
        contentEl.createEl('h2', { text: '创建新书籍' });

        // 添加模板选择
        new Setting(contentEl)
            .setName('模板')
            .setDesc('请选择书籍模板')
            .addDropdown(dropdown => {
                const templates = this.plugin.templateManager.getAllTemplateTypes();
                templates.forEach(template => {
                    dropdown.addOption(template, template);
                });
                dropdown.setValue(this.selectedTemplate)
                    .onChange(value => this.selectedTemplate = value);
            });
        // 添加封面上传
        new Setting(contentEl)
            .setName('封面')
            .setDesc('选择封面图片（可选）')
            .addButton(button => button
                .setButtonText('选择图片')
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
                                new Notice('封面上传成功');
                            } catch (error) {
                                new Notice('封面上传失败：' + error.message);
                            }
                        }
                    };
                    input.click();
                }));
        new Setting(contentEl)
            .setName('书名')
            .setDesc('请输入书籍标题')
            .addText(text => text
                .setPlaceholder('书名')
                .onChange(value => this.bookInfo.title = value));

        new Setting(contentEl)
            .setName('副标题')
            .setDesc('可选')
            .addText(text => text
                .setPlaceholder('副标题')
                .onChange(value => this.bookInfo.subtitle = value));
        // 添加目标字数设置
        new Setting(contentEl)
            .setName('目标字数')
            .setDesc('设置本书预计总字数：万字')
            .addText(text => text
                .setPlaceholder('例如：20或20.0万')
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
            .setName('作者')
            .setDesc('请输入作者名称，多个作者用逗号分隔')
            .addText(text => text
                .setPlaceholder('作者')
                .setValue(this.plugin.settings.defaultAuthor || '')
                .onChange(value => this.bookInfo.author = value ? value.split(',') : []));



        new Setting(contentEl)
            .setName('简介')
            .setDesc('请输入书籍简介')
            .addTextArea(text => text
                .setPlaceholder('书籍简介')
                .onChange(value => this.bookInfo.desc = value));





        // 修改创建按钮的处理
        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText('创建')
                .setCta()
                .onClick(async () => {
                    if (!this.validateBookInfo()) {
                        new Notice('请填写必要信息');
                        return;
                    }
                    try {
                        const newBook = await this.plugin.bookManager.createBook(
                            this.bookInfo as Omit<BookBasicInfo, 'uuid'>,
                            this.selectedTemplate,
                            this.targetTotalWords
                        );
                        new Notice('书籍创建成功');
                        if (this.onBookCreated) {
                            this.onBookCreated(newBook);
                        }
                        this.close();
                    } catch (error) {
                        new Notice(`创建失败: ${error.message}`);
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