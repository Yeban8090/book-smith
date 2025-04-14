import { App, Modal, Setting } from 'obsidian';
import { i18n } from '../i18n/i18n';

export class ReferenceModal extends Modal {
    private result: string;
    private onSubmit: (result: string) => void;

    constructor(
        app: App, 
        onSubmit: (result: string) => void,
        private defaultContent?: string
    ) {
        super(app);
        this.onSubmit = onSubmit;
        this.result = defaultContent || '';
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h3', { text: i18n.t('REFERENCE_MODAL_TITLE') });

        new Setting(contentEl)
            .setName(i18n.t('REFERENCE_CONTENT'))
            .setDesc(i18n.t('REFERENCE_CONTENT_DESC'))
            .addTextArea((text) => {
                text
                    .setValue(this.result)
                    .onChange((value) => {
                        this.result = value;
                    });
            });

        new Setting(contentEl)
            .addButton((btn) =>
                btn
                    .setButtonText(i18n.t('CONFIRM'))
                    .setCta()
                    .onClick(() => {
                        this.onSubmit(this.result);
                        this.close();
                    }));
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}