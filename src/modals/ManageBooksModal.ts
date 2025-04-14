import { App, Modal, Setting, Notice, TFolder } from 'obsidian';
import { EditBookModal } from './EditBookModal';
import { ConfirmModal } from './ConfirmModal';
import { UnimportedBooksModal } from './UnimportedBooksModal'; // 添加导入
import BookSmithPlugin from '../main';
import { Book } from '../types/book';
import { i18n } from '../i18n/i18n';

export class ManageBooksModal extends Modal {
    constructor(
        app: App,
        private plugin: BookSmithPlugin,
        private onBookChange?: (result: { type: 'deleted' | 'edited' | 'imported', bookId: string }) => void
    ) {
        super(app);
    }

    private searchInput: HTMLInputElement;
    private bookList: HTMLDivElement;
    private books: Book[] = [];

    async onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('book-smith-manage-books-modal');
        contentEl.createEl('h2', { text: i18n.t('MANAGE_BOOKS_TITLE') });

        // 添加搜索框和导入按钮的容器
        const topContainer = contentEl.createDiv({ cls: 'book-smith-manage-top-container' });

        // 添加搜索框
        const searchContainer = topContainer.createDiv({ cls: 'book-smith-manage-search-container' });
        this.searchInput = searchContainer.createEl('input', {
            type: 'text',
            placeholder: i18n.t('SEARCH_BOOKS_PLACEHOLDER'),
            cls: 'book-smith-manage-search-input'
        });

        // 添加导入按钮
        const importButton = topContainer.createEl('button', {
            text: i18n.t('IMPORT_BOOK'),
            cls: 'book-smith-import-button'
        });

        importButton.addEventListener('click', () => {
            this.importBook();
        });

        // 添加分割线
        contentEl.createDiv({ cls: 'book-smith-manage-divider' });

        // 创建书籍列表容器
        this.bookList = contentEl.createDiv({ cls: 'book-smith-manage-book-list' });

        // 加载并渲染书籍
        this.books = await this.plugin.bookManager.getAllBooks();
        this.renderBooks(this.books);
    }

    private renderBooks(books: Book[]) {
        this.bookList.empty();

        for (const book of books) {
            const bookContainer = this.bookList.createDiv({ cls: 'book-smith-book-container' });

            // 添加封面
            const coverContainer = bookContainer.createDiv({ cls: 'book-smith-book-cover' });
            if (book.basic.cover) {
                coverContainer.createEl('img', {
                    attr: {
                        src: this.app.vault.adapter.getResourcePath(book.basic.cover),
                        alt: book.basic.title
                    }
                });
            }

            const setting = new Setting(bookContainer)
                .setName(createFragment(el => {
                    el.createEl('span', { text: `《${book.basic.title}》` });
                    if (book.basic.subtitle) {
                        el.createEl('span', {
                            text: book.basic.subtitle,
                            cls: 'subtitle'
                        });
                    }
                }))
                .setDesc(
                    `${i18n.t('BOOK_AUTHOR_PREFIX')}${book.basic.author.join('、')}
                    ${book.basic.desc ? `${i18n.t('BOOK_DESC_PREFIX')}${book.basic.desc}` : ''}
                    ${i18n.t('BOOK_PROGRESS_PREFIX')}${book.stats.total_words}${book.stats.target_total_words
                        ? ` / ${(book.stats.target_total_words / 10000).toFixed(1)}万`
                        : ' / 0万'
                    }`
                );

            setting.addButton(btn => btn
                .setButtonText(i18n.t('DELETE_BOOK'))
                .setWarning()
                .onClick(() => {
                    new ConfirmModal(
                        this.app,
                        i18n.t('DELETE_BOOK_TITLE'),
                        i18n.t('DELETE_BOOK_DESC', { title: book.basic.title }),
                        async () => {
                            try {
                                await this.plugin.bookManager.deleteBook(book.basic.uuid);
                                new Notice(i18n.t('DELETE_SUCCESS'));
                                this.onBookChange?.({ type: 'deleted', bookId: book.basic.uuid });
                                this.onOpen();
                            } catch (error) {
                                new Notice(i18n.t('DELETE_FAILED') + error.message);
                            }
                        }
                    ).open();
                })).addButton(btn => btn
                    .setButtonText(i18n.t('EDIT_BOOK'))
                    .onClick(() => {
                        new EditBookModal(
                            this.app,
                            book,
                            this.plugin.bookManager,
                            this.plugin,
                            () => {
                                this.onOpen();
                                this.onBookChange?.({ type: 'edited', bookId: book.basic.uuid });
                            }
                        ).open();
                    }));
        }
    }

    // 导入书籍方法
    private async importBook() {
        try {
            // 获取书籍根目录下的所有文件夹
            const booksPath = this.plugin.settings.defaultBookPath;
            const rootFolder = this.app.vault.getAbstractFileByPath(booksPath);

            if (!(rootFolder instanceof TFolder)) {
                new Notice(i18n.t('BOOKS_ROOT_NOT_FOUND'));
                return;
            }
            
            // 筛选出没有配置文件的文件夹，并跳过 covers 文件夹
            const unimportedBooks: string[] = [];

            for (const child of rootFolder.children) {
                if (child instanceof TFolder && child.name !== 'covers') {
                    // 检查是否已经有配置文件
                    const configPath = `${child.path}/book-config.json`;
                    const configFile = this.app.vault.getAbstractFileByPath(configPath);
                    
                    if (!configFile) {
                        unimportedBooks.push(child.name);
                    }
                }
            }
            if (unimportedBooks.length === 0) {
                new Notice(i18n.t('NO_UNIMPORTED_BOOKS'));
                return;
            }

            // 打开选择对话框
            new UnimportedBooksModal(
                this.app,
                unimportedBooks,
                this.plugin.settings.defaultBookPath,
                async (selectedFolder) => {
                    if (selectedFolder) {
                        await this.createBookConfig(selectedFolder);
                    }
                }
            ).open();

        } catch (error) {
            new Notice(i18n.t('DETECT_UNIMPORTED_FAILED') + error.message);
        }
    }

    // 创建书籍配置文件
    // 重构后的 createBookConfig 方法
    private async createBookConfig(folderName: string) {
        try {
            // 使用 BookManager 的导入方法
            const newBook = await this.plugin.bookManager.importBookFromFolder(folderName);

            // 刷新书籍列表
            this.books = await this.plugin.bookManager.getAllBooks();
            this.renderBooks(this.books);

            // 通知回调
            this.onBookChange?.({
                type: 'imported',
                bookId: newBook.basic.uuid
            });

            new Notice(i18n.t('IMPORT_SUCCESS', { title: newBook.basic.title }));

        } catch (error) {
            new Notice(i18n.t('IMPORT_FAILED') + error.message);
        }
    }
}

