import { Modal, Notice } from 'obsidian';
import type { App } from 'obsidian';
import { initializeDialog, finishDialog } from './dialogLayout';

export class BaseModal extends Modal {
    protected element: HTMLElement;

    constructor(app: App, protected title: string) {
        super(app);
        this.element = this.contentEl;
    }

    onOpen() {
        initializeDialog(this);
        this.titleEl.setText(this.title);
        this.createContent();
        finishDialog(this);
    }

    protected createContent() {}

    protected showNotice(message: string, duration = 3000) {
        new Notice(message, duration);
    }

    onClose() { this.contentEl.empty(); }
    remove() { this.close(); }
}
