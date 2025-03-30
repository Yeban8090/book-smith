import { App, Modal, Setting, Notice } from 'obsidian';
import { Book, BookBasicInfo } from '../types/book';
import { BookManager } from '../services/BookManager';
import BookSmithPlugin from '../main';
export class EditBookModal extends Modal {
    private bookInfo: Partial<BookBasicInfo>;
    private targetTotalWords: number;

    constructor(
        app: App,
        private book: Book,
        private bookManager: BookManager,
        private plugin: BookSmithPlugin,
        private onSaved?: (bookId: string) => void
    ) {
        super(app);
        this.bookInfo = { ...book.basic };
        this.targetTotalWords = book.stats.target_total_words || 10000;  // 默认1万字
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.addClass('book-smith-edit-book-modal');
        contentEl.createEl('h2', { text: '编辑书籍' });

        new Setting(contentEl)
            .setName('封面')
            .setDesc('选择封面图片（可选）')
            .addButton(button => button
                .setButtonText(this.bookInfo.cover ? '更换封面' : '选择封面')
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
                                if (!await this.app.vault.adapter.exists(coversPath)) {
                                    await this.app.vault.adapter.mkdir(coversPath);
                                }

                                // 复制图片到插件目录
                                const fileName = `cover-${Date.now()}.${file.name.split('.').pop()}`;
                                const coverPath = `${coversPath}/${fileName}`;
                                await this.app.vault.adapter.writeBinary(coverPath, await file.arrayBuffer());
                                this.bookInfo.cover = coverPath;
                                new Notice('封面更新成功');
                            } catch (error) {
                                new Notice('封面更新失败：' + error.message);
                            }
                        }
                    };
                    input.click();
                }));



        new Setting(contentEl)
            .setName('书名')
            .setDesc('请输入书籍标题')
            .addText(text => text
                .setValue(this.bookInfo.title || '')
                .onChange(value => this.bookInfo.title = value));

        new Setting(contentEl)
            .setName('副标题')
            .setDesc('可选')
            .addText(text => text
                .setValue(this.bookInfo.subtitle || '')
                .onChange(value => this.bookInfo.subtitle = value));
        new Setting(contentEl)
            .setName('目标字数')
            .setDesc('设置本书预计总字数：万字')
            .addText(text => text
                .setPlaceholder('例如：20或20.0万')
                .setValue(`${Math.floor(this.targetTotalWords / 10000)}万`)
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
                .setValue(this.bookInfo.author?.join(',') || '')
                .onChange(value => this.bookInfo.author = value ? value.split(',') : []));

        new Setting(contentEl)
            .setName('简介')
            .setDesc('请输入书籍简介')
            .addTextArea(text => text
                .setValue(this.bookInfo.desc || '')
                .onChange(value => this.bookInfo.desc = value));

        // 修改保存按钮的处理
        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText('保存')
                .setCta()
                .onClick(async () => {
                    if (!this.validateBookInfo()) {
                        new Notice('请填写必要信息');
                        return;
                    }
                    try {
                        await this.bookManager.updateBook(this.book.basic.uuid, {
                            basic: this.bookInfo as BookBasicInfo,
                            stats: {
                                ...this.book.stats,
                                target_total_words: this.targetTotalWords
                            }
                        });
                        new Notice('保存成功');
                        this.close();
                        this.onSaved?.(this.book.basic.uuid);
                    } catch (error) {
                        new Notice(`保存失败: ${error.message}`);
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