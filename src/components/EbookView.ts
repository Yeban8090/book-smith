import { App, setIcon, Notice } from 'obsidian';
import { BookManager } from "../services/BookManager";
import { Book } from "../types/book";
import { ExportService } from "../services/ExportService";
import { i18n } from "../i18n/i18n";
import BookSmithPlugin from '../main';

export class EbookView {
    private container: HTMLElement;
    private bookManager: BookManager;
    private exportService: ExportService;
    private books: Book[] = [];
    private selectedBook: Book | null = null;
    private selectedFormat: string = 'txt';

    constructor(
        private app: App,
        private plugin: BookSmithPlugin,
        private parentEl: HTMLElement,
        private onExit: () => void
    ) {
        this.bookManager = new BookManager(app, plugin.settings);
        this.exportService = new ExportService(app, plugin.settings);
        this.createUI();
    }

    async initialize() {
        try {
            // 加载所有书籍
            this.books = await this.bookManager.getAllBooks();
            this.updateBookSelector();
        } catch (error) {
            console.error('加载书籍失败:', error);
        }
    }

    private createUI() {
        this.container = this.parentEl.createDiv({ cls: 'book-smith-ebook-view' });
        this.createHeader();
        this.createContent();
    }

    private createHeader() {
        const header = this.container.createDiv({ cls: 'ebook-header' });
        setIcon(header.createSpan({ cls: 'ebook-header-icon' }), 'book');
        header.createSpan({ text: i18n.t('GENERATE_EBOOK'), cls: 'ebook-title' });
        
        // 添加退出按钮
        const exitBtn = header.createDiv({ cls: 'ebook-exit-btn' });
        setIcon(exitBtn, 'x');
        exitBtn.addEventListener('click', () => this.onExit());
    }

    private createContent() {
        const content = this.container.createDiv({ cls: 'ebook-content' });
        
        // 电子书信息表单
        const form = content.createDiv({ cls: 'ebook-form' });
        
        // 书籍选择
        this.createBookSelector(form);
        
        // 格式选择
        const formatField = this.createFormField(form, i18n.t('FORMAT') || '格式', 'format', 'select');
        const formatSelect = formatField.querySelector('select');
        if (formatSelect) {
            // 添加支持的格式
            this.createSelectOption(formatSelect, 'txt', 'TXT');
            this.createSelectOption(formatSelect, 'docx', 'DOCX');
            this.createSelectOption(formatSelect, 'pdf', 'PDF');
            this.createSelectOption(formatSelect, 'epub', 'EPUB');
            
            formatSelect.addEventListener('change', (e) => {
                this.selectedFormat = (e.target as HTMLSelectElement).value;
            });
        }
        
        // 生成按钮
        const generateBtn = content.createDiv({ cls: 'generate-btn', text: i18n.t('GENERATE_EBOOK') || '生成电子书' });
        generateBtn.addEventListener('click', () => {
            this.exportBook();
        });
    }

    private updateBookSelector() {
        const select = this.container.querySelector('select');
        if (!select) return;
        
        // 清空现有选项
        select.innerHTML = '';
        
        if (this.books.length > 0) {
            // 添加书籍选项
            for (const book of this.books) {
                this.createSelectOption(select as HTMLSelectElement, book.basic.uuid, book.basic.title);
            }
            
            // 默认选择第一本书
            this.selectedBook = this.books[0];
            select.value = this.books[0].basic.uuid;
        } else {
            // 没有书籍时显示提示
            this.createSelectOption(select as HTMLSelectElement, '', i18n.t('NO_BOOKS_AVAILABLE') || '没有可用的书籍');
            select.disabled = true;
        }
    }
    
    private createBookSelector(container: HTMLElement) {
        const field = this.createFormField(container, i18n.t('SELECT_BOOK') || '选择书籍', 'book', 'select');
        const select = field.querySelector('select');
        
        if (select) {
            // 监听选择变化
            select.addEventListener('change', (e) => {
                const uuid = (e.target as HTMLSelectElement).value;
                this.selectedBook = this.books.find(book => book.basic.uuid === uuid) || null;
                
                // 添加高亮效果
                select.classList.add('selected-option');
                setTimeout(() => select.classList.remove('selected-option'), 500);
            });
        }
    }
    
    // 其余方法从 EbookModal 迁移过来，保持相同的功能
    // ... 省略其他方法，与 EbookModal 中的相同 ...

    // 以下是必要的方法实现
    private async exportBook() {
        if (!this.selectedBook) {
            new Notice(i18n.t('SELECT_BOOK_FIRST') || '请先选择一本书籍');
            return;
        }
        
        try {
            // 调用导出服务生成内容
            const content = await this.exportService.exportBook(
                this.selectedFormat,
                this.selectedBook
            );
            
            // 如果导出功能尚未实现，显示提示
            if (content.content.startsWith(`${this.selectedFormat.toUpperCase()}导出功能开发中`)) {
                new Notice(`${this.selectedFormat.toUpperCase()}导出功能尚在开发中，敬请期待！`);
                return;
            }
            
            // 根据格式处理下载
            if (this.selectedFormat === 'docx') {
                // 对于DOCX，内容是base64字符串
                const dataUrl = content.content;
                const a = document.createElement('a');
                a.href = dataUrl;
                a.download = content.fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            } else {
                // 对于其他格式（如TXT），使用Blob
                const blob = new Blob([content.content], { type: 'text/plain' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = content.fileName;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }
            
            new Notice(`导出成功！`);
        } catch (error) {
            console.error('导出错误:', error);
            new Notice(`导出失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private createFormField(container: HTMLElement, label: string, id: string, type: string, placeholder?: string) {
        const field = container.createDiv({ cls: 'form-field' });
        field.createDiv({ cls: 'field-label', text: label });
        
        if (type === 'select') {
            field.createEl('select', { attr: { id } });
        } else {
            field.createEl('input', {
                attr: {
                    type,
                    id,
                    placeholder: placeholder || ''
                }
            });
        }
        
        return field;
    }
    
    private createSelectOption(select: HTMLSelectElement, value: string, text: string) {
        const option = document.createElement('option');
        option.value = value;
        option.text = text;
        select.appendChild(option);
    }

    remove() {
        this.container.remove();
    }
}