import { App, Modal, Setting, Notice } from 'obsidian';
import { EditBookModal } from './EditBookModal';
import { ConfirmModal } from './ConfirmModal';  // 添加导入
import BookSmithPlugin from '../main';
import { Book } from '../types/book';
export class ManageBooksModal extends Modal {
    constructor(
        app: App,
        private plugin: BookSmithPlugin,
        private onBookChange?: (result: { type: 'deleted' | 'edited', bookId: string }) => void
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

        // 添加搜索框
        const searchContainer = contentEl.createDiv({ cls: 'book-smith-manage-search-container' });
        this.searchInput = searchContainer.createEl('input', {
            type: 'text',
            placeholder: '搜索书籍...',
            cls: 'book-smith-manage-search-input'
        });

        this.searchInput.addEventListener('input', () => {
            this.renderBooks(this.filterBooks());
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
}