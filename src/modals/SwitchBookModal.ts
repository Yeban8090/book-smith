import { App, Modal, Setting } from 'obsidian';
import { Book } from '../types/book';

export class SwitchBookModal extends Modal {
    constructor(
        app: App,
        private books: Book[],
        private onSelect: (book: Book) => void
    ) {
        super(app);
    }

    private searchInput: HTMLInputElement;
    private bookList: HTMLDivElement;

    onOpen() {
        const { contentEl } = this;
        contentEl.addClass('book-smith-switch-book-modal');
        contentEl.createEl('h2', { text: '切换书籍' });

        // 添加搜索框
        const searchContainer = contentEl.createDiv({ cls: 'book-smith-search-container' });
        this.searchInput = searchContainer.createEl('input', {
            type: 'text',
            placeholder: '搜索书籍...',
            cls: 'book-smith-search-input'
        });
        
        this.searchInput.addEventListener('input', () => {
            this.renderBooks(this.filterBooks(this.books));
        });

        // 添加分割线
        contentEl.createDiv({ cls: 'book-smith-switch-book-divider' });

        // 创建书籍列表容器
        this.bookList = contentEl.createDiv({ cls: 'book-smith-book-list' });
        this.renderBooks(this.books);
    }

    private filterBooks(books: Book[]): Book[] {
        const searchTerm = this.searchInput.value.toLowerCase();
        if (!searchTerm) return books;

        return books.filter(book => 
            book.basic.title.toLowerCase().includes(searchTerm) ||
            (book.basic.subtitle?.toLowerCase().includes(searchTerm)) ||
            book.basic.author.some(author => author.toLowerCase().includes(searchTerm)) ||
            (book.basic.desc?.toLowerCase().includes(searchTerm))
        );
    }

    private renderBooks(books: Book[]) {
        this.bookList.empty();
        
        for (const book of books) {
            new Setting(this.bookList)
                .setName(`《${book.basic.title}》${book.basic.subtitle ? ` - ${book.basic.subtitle}` : ''}`)
                .setDesc(
                    `作者：${book.basic.author.join('、')}
                    \n | 进度：${Math.round(book.stats.progress_by_chapter * 100)}% | 字数：${(book.stats.target_total_words / 10000).toFixed(1)}万
                    \n | 最后修改：${new Date(book.stats.last_modified).toLocaleString()}`
                )
                .addButton(btn => btn
                    .setButtonText('选择')
                    .setCta()
                    .onClick(() => {
                        this.onSelect(book);
                        this.close();
                    }));
        }
    }
}