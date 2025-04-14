import { App, Modal, Setting } from 'obsidian';
import { i18n } from '../i18n/i18n';

export class NamePromptModal extends Modal {
    private result: string;
    private onSubmit: (result: string | null) => void;

    constructor(
        app: App, 
        private placeholder: string, 
        onSubmit: (result: string | null) => void,
        private defaultValue?: string
    ) {
        super(app);
        this.onSubmit = onSubmit;
        this.result = defaultValue || '';
    }

    onOpen() {
        const { contentEl } = this;

        contentEl.createEl('h2', { text: this.placeholder });

        new Setting(contentEl)
            .setName(i18n.t('NAME_LABEL'))
            .addText((text) => {
                text.setValue(this.defaultValue || '')
                    .onChange((value) => {
                        this.result = value;
                    });
                
                // 自动选中文本
                setTimeout(() => {
                    const input = text.inputEl;
                    input.focus();
                    input.select();
                }, 50);
            });

        new Setting(contentEl)
            .addButton((btn) =>
                btn
                    .setButtonText(i18n.t('CONFIRM'))
                    .setCta()
                    .onClick(() => {
                        this.close();
                        this.onSubmit(this.result);
                    }))
            .addButton((btn) =>
                btn
                    .setButtonText(i18n.t('CANCEL'))
                    .onClick(() => {
                        this.close();
                        this.onSubmit(null);
                    }));
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}