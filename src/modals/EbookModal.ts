import { App, Notice } from "obsidian";
import { BaseModal } from "./BaseModal";
import { BookManager } from "../services/BookManager";
import { Book } from "../types/book";
import { ExportService } from "../services/ExportService";
import { i18n } from "../i18n/i18n";

export class EbookModal extends BaseModal {
    private bookManager: BookManager;
    private exportService: ExportService;
    private books: Book[] = [];
    private selectedBook: Book | null = null;
    private selectedFormat: string = 'txt';

    constructor(container: HTMLElement, private app: App, private settings: any) {
        super(container, '生成电子书');
        this.bookManager = new BookManager(app, settings);
        this.exportService = new ExportService(app, settings);
    }

    async open() {
        // 加载所有书籍
        this.books = await this.bookManager.getAllBooks();
        super.open();
    }

    protected createContent() {
        const content = this.element.createDiv({ cls: 'ebook-content' });
        
        // 电子书信息表单
        const form = content.createDiv({ cls: 'ebook-form' });
        
        // 书籍选择
        this.createBookSelector(form);
        
        // 格式选择
        const formatField = this.createFormField(form, '格式', 'format', 'select');
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
        const generateBtn = content.createDiv({ cls: 'generate-btn', text: '生成电子书' });
        generateBtn.addEventListener('click', () => {
            this.exportBook();
        });
    }
    
    private createBookSelector(container: HTMLElement) {
        const field = this.createFormField(container, '选择书籍', 'book', 'select');
        const select = field.querySelector('select');
        
        if (select && this.books.length > 0) {
            // 添加书籍选项
            for (const book of this.books) {
                this.createSelectOption(select, book.basic.uuid, book.basic.title);
            }
            
            // 默认选择第一本书
            this.selectedBook = this.books[0];
            
            // 监听选择变化
            select.addEventListener('change', (e) => {
                const uuid = (e.target as HTMLSelectElement).value;
                this.selectedBook = this.books.find(book => book.basic.uuid === uuid) || null;
            });
        } else if (select) {
            // 没有书籍时显示提示
            this.createSelectOption(select, '', '没有可用的书籍');
            select.disabled = true;
        }
    }
    
    private async exportBook() {
        if (!this.selectedBook) {
            this.showNotice('请先选择一本书籍');
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
                this.showNotice(`${this.selectedFormat.toUpperCase()}导出功能尚在开发中，敬请期待！`);
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
            
            this.showNotice(`导出成功！`);
            this.close();
        } catch (error) {
            console.error('导出错误:', error);
            this.showNotice(`导出失败: ${error.message}`);
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
                    placeholder: placeholder || null
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
}