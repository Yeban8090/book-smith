import { App, Modal } from "obsidian";
import { RenderedBook } from "../services/BookRenderService";

export class PreviewModal extends Modal {
    constructor(
        app: App,
        private renderedBook: RenderedBook
    ) {
        super(app);
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('preview-modal');

        // 创建预览容器
        const previewContainer = contentEl.createDiv({ cls: 'preview-container' });
        
        // 添加渲染的文档内容
        const docClone = this.renderedBook.doc.cloneNode(true) as Document;
        const bodyContent = docClone.body;
        
        if (bodyContent) {
            previewContainer.appendChild(bodyContent);
        }

        // 添加关闭按钮
        const closeBtn = contentEl.createEl('button', {
            text: '关闭预览',
            cls: 'preview-close-btn'
        });
        closeBtn.addEventListener('click', () => this.close());
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}