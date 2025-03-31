import { App, Modal, Setting } from 'obsidian';

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
        contentEl.createEl('h3', { text: '添加引用内容' });

        new Setting(contentEl)
            .setName('引用内容')
            .setDesc('请输入引用内容的详细信息')
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
                    .setButtonText('确定')
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