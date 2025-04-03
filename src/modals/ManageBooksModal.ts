import { App, Modal, Setting, Notice } from 'obsidian';
import { EditBookModal } from './EditBookModal';
import { ConfirmModal } from './ConfirmModal';
import { UnimportedBooksModal } from './UnimportedBooksModal'; // 添加导入
import BookSmithPlugin from '../main';
import { Book } from '../types/book';

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
        contentEl.createEl('h2', { text: '管理书籍' });

        // 添加搜索框和导入按钮的容器
        const topContainer = contentEl.createDiv({ cls: 'book-smith-manage-top-container' });

        // 添加搜索框
        const searchContainer = topContainer.createDiv({ cls: 'book-smith-manage-search-container' });
        this.searchInput = searchContainer.createEl('input', {
            type: 'text',
            placeholder: '搜索书籍...',
            cls: 'book-smith-manage-search-input'
        });

        this.searchInput.addEventListener('input', () => {
            this.renderBooks(this.filterBooks());
        });

        // 添加导入按钮
        const importButton = topContainer.createEl('button', {
            text: '导入书籍',
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

    private filterBooks(): Book[] {
        const searchTerm = this.searchInput.value.toLowerCase();
        if (!searchTerm) return this.books;

        return this.books.filter(book =>
            book.basic.title.toLowerCase().includes(searchTerm) ||
            (book.basic.subtitle?.toLowerCase().includes(searchTerm)) ||
            book.basic.author.some(author => author.toLowerCase().includes(searchTerm)) ||
            (book.basic.desc?.toLowerCase().includes(searchTerm))
        );
    }

    private renderBooks(books: Book[]) {
        this.bookList.empty();

        for (const book of books) {
            const bookContainer = this.bookList.createDiv({ cls: 'book-smith-book-container' });

            // 添加封面
            const coverContainer = bookContainer.createDiv({ cls: 'book-smith-book-cover' });
            if (book.basic.cover) {
                const coverImg = coverContainer.createEl('img', {
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
                    `作者：${book.basic.author.join('、')}
                    ${book.basic.desc ? `\n简介：${book.basic.desc}` : ''}
                    \n创作轨迹：${book.stats.total_words}${book.stats.target_total_words
                        ? ` / ${(book.stats.target_total_words / 10000).toFixed(1)}万`
                        : ' / 0万'
                    }`
                );

            setting.addButton(btn => btn
                .setButtonText('删除')
                .setWarning()
                .onClick(() => {
                    new ConfirmModal(
                        this.app,
                        "删除书籍",
                        `确定要删除《${book.basic.title}》吗？\n此操作不可恢复。`,
                        async () => {
                            try {
                                await this.plugin.bookManager.deleteBook(book.basic.uuid);
                                new Notice('删除成功');
                                this.onBookChange?.({ type: 'deleted', bookId: book.basic.uuid });
                                this.onOpen();
                            } catch (error) {
                                new Notice(`删除失败: ${error.message}`);
                            }
                        }
                    ).open();
                })).addButton(btn => btn
                    .setButtonText('编辑')
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
            const bookFolders = await this.app.vault.adapter.list(booksPath);

            // 筛选出没有配置文件的文件夹，并跳过 covers 文件夹
            const unimportedBooks: string[] = [];

            for (const folder of bookFolders.folders) {
                const folderName = folder.split('/').pop();
                if (!folderName || folderName === 'covers') continue; // 跳过 covers 文件夹

                // 检查是否已经有配置文件
                const configPath = `${folder}/.book-config.md`;
                const hasConfig = await this.app.vault.adapter.exists(configPath);

                if (!hasConfig) {
                    unimportedBooks.push(folderName);
                }
            }

            if (unimportedBooks.length === 0) {
                new Notice('没有找到未导入的书籍目录');
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
            new Notice(`检测未导入书籍失败: ${error.message}`);
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

            new Notice(`成功导入书籍《${newBook.basic.title}》`);

        } catch (error) {
            new Notice(`创建书籍配置失败: ${error.message}`);
        }
    }
}

