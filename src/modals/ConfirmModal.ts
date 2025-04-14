import { App, Modal } from 'obsidian';
import { i18n } from '../i18n/i18n';

export class ConfirmModal extends Modal {
    private confirmed = false;

    constructor(
        app: App,
        private title: string,
        private message: string,
        private onConfirm: () => void
    ) {
        super(app);
    }

    onOpen() {
        const { contentEl, titleEl } = this;
        
        // 设置标题
        titleEl.setText(this.title);
        
        // 设置消息
        contentEl.createEl('p', { text: this.message });
        
        // 添加按钮容器
        const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });
        
        // 取消按钮
        buttonContainer.createEl('button', { text: i18n.t('CANCEL') })
            .addEventListener('click', () => this.close());
            
        // 确认按钮
        const confirmButton = buttonContainer.createEl('button', {
            cls: 'mod-cta',
            text: i18n.t('CONFIRM')
        });
        confirmButton.addEventListener('click', () => {
            this.confirmed = true;
            this.close();
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
        if (this.confirmed) {
            this.onConfirm();
        }
    }
}