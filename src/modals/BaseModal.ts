import { Notice } from "obsidian";

export class BaseModal {
    protected element: HTMLElement;

    constructor(protected container: HTMLElement, protected title: string) {
        this.element = container.createDiv({ cls: 'book-smith-modal vertical' });
        const closeBtn = this.element.createDiv({ cls: 'modal-close' });
        closeBtn.addEventListener('click', () => this.close());
    }

    open() {
        // 创建遮罩层
        const overlay = this.container.createDiv({ cls: 'book-smith-modal-overlay' });
        overlay.addEventListener('click', () => this.close());
        
        // 创建标题
        this.createHeader();
        
        // 创建内容 (由子类实现)
        this.createContent();
    }

    protected createHeader() {
        const header = this.element.createDiv({ cls: 'book-smith-modal-header' });
        header.createEl('h2', { text: this.title });
    }

    protected createContent() {
        // 由子类实现
    }

    protected showNotice(message: string, duration: number = 3000) {
        const notice = new Notice(message, duration);
        notice.noticeEl.addClass('book-smith-notice');
    }

    close() {
        const overlay = this.container.querySelector('.book-smith-modal-overlay');
        overlay?.remove();
        this.element.remove();
    }

    remove() {
        this.close();
    }
}