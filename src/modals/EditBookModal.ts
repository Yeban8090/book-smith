import { App, Modal, Setting, Notice } from 'obsidian';
import { Book, BookBasicInfo } from '../types/book';
import { BookManager } from '../services/BookManager';
import BookSmithPlugin from '../main';
import { i18n } from '../i18n/i18n';

export class EditBookModal extends Modal {
    private bookInfo: Partial<BookBasicInfo>;
    private targetTotalWords: number;

    constructor(
        app: App,
        private book: Book,
        private bookManager: BookManager,
        private plugin: BookSmithPlugin,
        private onSaved?: (result: { type: 'edited', bookId: string }) => void
    ) {
        super(app);
        this.bookInfo = { ...book.basic };
        this.targetTotalWords = book.stats.target_total_words || 10000;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.addClass('book-smith-edit-book-modal');
        contentEl.createEl('h2', { text: i18n.t('EDIT_BOOK_TITLE') });

        new Setting(contentEl)
            .setName(i18n.t('COVER'))
            .setDesc(i18n.t('COVER_DESC'))
            .addButton(button => button
                .setButtonText(this.bookInfo.cover ? i18n.t('CHANGE_COVER') : i18n.t('SELECT_COVER'))
                .onClick(async () => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = async () => {
                        const file = input.files?.[0];
                        if (file) {
                            try {
                                const coversPath = `${this.plugin.settings.defaultBookPath}/covers`;
                                if (!await this.app.vault.adapter.exists(coversPath)) {
                                    await this.app.vault.adapter.mkdir(coversPath);
                                }

                                const fileName = `cover-${Date.now()}.${file.name.split('.').pop()}`;
                                const coverPath = `${coversPath}/${fileName}`;
                                await this.app.vault.adapter.writeBinary(coverPath, await file.arrayBuffer());
                                this.bookInfo.cover = coverPath;
                                new Notice(i18n.t('COVER_UPDATE_SUCCESS'));
                            } catch (error) {
                                new Notice(i18n.t('COVER_UPDATE_FAILED') + error.message);
                            }
                        }
                    };
                    input.click();
                }));

        new Setting(contentEl)
            .setName(i18n.t('BOOK_TITLE'))
            .setDesc(i18n.t('BOOK_TITLE_DESC'))
            .addText(text => text
                .setValue(this.bookInfo.title || '')
                .onChange(value => this.bookInfo.title = value));

        new Setting(contentEl)
            .setName(i18n.t('SUBTITLE'))
            .setDesc(i18n.t('SUBTITLE_DESC'))
            .addText(text => text
                .setValue(this.bookInfo.subtitle || '')
                .onChange(value => this.bookInfo.subtitle = value));

        new Setting(contentEl)
            .setName(i18n.t('TARGET_WORDS'))
            .setDesc(i18n.t('TARGET_WORDS_DESC'))
            .addText(text => text
                .setPlaceholder(i18n.t('TARGET_WORDS_PLACEHOLDER'))
                .setValue(`${Math.floor(this.targetTotalWords / 10000)}万`)
                .onChange(value => {
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
                .setValue(this.bookInfo.author?.join(',') || '')
                .onChange(value => this.bookInfo.author = value ? value.split(',') : []));

        new Setting(contentEl)
            .setName(i18n.t('DESCRIPTION'))
            .setDesc(i18n.t('DESCRIPTION_DESC'))
            .addTextArea(text => text
                .setValue(this.bookInfo.desc || '')
                .onChange(value => this.bookInfo.desc = value));

        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText(i18n.t('SAVE'))
                .setCta()
                .onClick(async () => {
                    if (!this.validateBookInfo()) {
                        new Notice(i18n.t('REQUIRED_FIELDS'));
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
                        new Notice(i18n.t('SAVE_SUCCESS'));
                        this.close();
                        this.onSaved?.({ type: 'edited', bookId: this.book.basic.uuid });
                    } catch (error) {
                        new Notice(i18n.t('SAVE_FAILED') + error.message);
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