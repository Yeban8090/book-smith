import { App, Modal, Setting } from 'obsidian';

export class NamePromptModal extends Modal {
    private result: string;
    private onSubmit: (result: string | null) => void;

    constructor(app: App, private placeholder: string, onSubmit: (result: string | null) => void) {
        super(app);
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;

        contentEl.createEl('h2', { text: this.placeholder });

        new Setting(contentEl)
            .setName('名称')
            .addText((text) =>
                text.onChange((value) => {
                    this.result = value;
                }));

        new Setting(contentEl)
            .addButton((btn) =>
                btn
                    .setButtonText('确定')
                    .setCta()
                    .onClick(() => {
                        this.close();
                        this.onSubmit(this.result);
                    }))
            .addButton((btn) =>
                btn
                    .setButtonText('取消')
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