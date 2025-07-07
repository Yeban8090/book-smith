import { App, Modal, Notice, ButtonComponent } from 'obsidian';
import { BookManager } from '../services/BookManager';
import { ExportModal } from './ExportModal';
import { BookRenderService } from '../services/BookRenderService';
import { i18n } from '../i18n/i18n';
import { Book } from '../types/book';
import BookSmithPlugin from '../main';

export class BookSelectionModal extends Modal {
    private selectedBook: Book | null = null;
    private books: Book[] = [];
    private bookListContainer: HTMLElement;
    constructor(
        app: App,
        private plugin: BookSmithPlugin
    ) {
        super(app);
    }

    async onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        // 设置模态框标题
        contentEl.createEl('h2', { text: i18n.t('SELECT_BOOK') || '选择要导出的书籍' });

        // 加载书籍列表
        await this.loadBooks();

        // 创建书籍列表容器
        this.bookListContainer = contentEl.createDiv({ cls: 'book-selection-list' });
        this.renderBookList();

        // 创建按钮容器
        const buttonContainer = contentEl.createDiv({ cls: 'book-selection-buttons' });

        // 取消按钮
        new ButtonComponent(buttonContainer)
            .setButtonText(i18n.t('CANCEL') || '取消')
            .onClick(() => {
                this.close();
            });

        // 导出按钮
        new ButtonComponent(buttonContainer)
            .setButtonText(i18n.t('EXPORT') || '导出')
            .setCta()
            .onClick(() => {
                this.handleExport();
            });
    }

    private async loadBooks() {
        try {
            this.books = await this.plugin.bookManager.getAllBooks();
        } catch (error) {
            console.error('加载书籍列表失败:', error);
            new Notice('加载书籍列表失败');
            this.books = [];
        }
    }

    private renderBookList() {
        this.bookListContainer.empty();

        if (this.books.length === 0) {
            const emptyMessage = this.bookListContainer.createDiv({ cls: 'book-selection-empty' });
            emptyMessage.createEl('p', { text: '未找到任何书籍' });
            emptyMessage.createEl('p', {
                text: '请先创建一本书籍再进行导出',
                cls: 'book-selection-hint'
            });
            return;
        }

        this.books.forEach((book, index) => {
            const bookItem = this.bookListContainer.createDiv({ cls: 'book-selection-item' });

            // 单选框
            const radioContainer = bookItem.createDiv({ cls: 'book-selection-radio' });
            const radio = radioContainer.createEl('input', {
                type: 'radio',
                attr: {
                    name: 'selected-book',
                    value: book.basic.uuid
                }
            });

            // 书籍信息
            const bookInfo = bookItem.createDiv({ cls: 'book-selection-info' });
            const title = bookInfo.createEl('h3', {
                text: book.basic.title,
                cls: 'book-selection-title'
            });

            const details = bookInfo.createDiv({ cls: 'book-selection-details' });
            details.createEl('span', {
                text: `${i18n.t('AUTHOR') || '作者'}: ${book.basic.author.join(', ')}`,
                cls: 'book-selection-author'
            });

            if (book.stats) {
                details.createEl('span', {
                    text: `${i18n.t('WORD_COUNT') || '字数'}: ${book.stats.total_words || 0}`,
                    cls: 'book-selection-words'
                });
            }

            const createdDate = new Date(book.basic.created_at).toLocaleDateString();
            details.createEl('span', {
                text: `${'创建日期'}: ${createdDate}`,
                cls: 'book-selection-date'
            });

            // 点击整个项目选中
            bookItem.addEventListener('click', () => {
                // 清除其他选中状态
                this.bookListContainer.querySelectorAll('.book-selection-item').forEach(item => {
                    item.removeClass('selected');
                });
                this.bookListContainer.querySelectorAll('input[type="radio"]').forEach((input: HTMLInputElement) => {
                    input.checked = false;
                });

                // 设置当前选中
                bookItem.addClass('selected');
                radio.checked = true;
                this.selectedBook = book;
            });

            // 默认选中第一本书
            if (index === 0) {
                bookItem.addClass('selected');
                radio.checked = true;
                this.selectedBook = book;
            }
        });
    }

    private async handleExport() {
        if (!this.selectedBook) {
            new Notice('请先选择一本书籍');
            return;
        }

        try {
            this.close();
            const bookRenderService = new BookRenderService(this.plugin);
            // 创建并打开导出模态框 - 修正参数顺序
            const exportModal = new ExportModal(
                this.app,
                this.plugin,
                bookRenderService,
                this.selectedBook
            );
            exportModal.open();
        } catch (error) {
            console.error('打开导出模态框失败:', error);
            new Notice('打开导出模态框失败');
        }
    }

    // 移除 addStyles 方法，因为样式已经移到独立的CSS文件中

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}