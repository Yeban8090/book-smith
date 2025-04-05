import { BaseModal } from "./BaseModal";

export class EbookModal extends BaseModal {
    constructor(container: HTMLElement) {
        super(container, '生成电子书');
    }

    protected createContent() {
        const content = this.element.createDiv({ cls: 'ebook-content' });
        
        // 电子书信息表单
        const form = content.createDiv({ cls: 'ebook-form' });
        
        // 书名
        this.createFormField(form, '书名', 'title', 'text', '请输入书名');
        
        // 作者
        this.createFormField(form, '作者', 'author', 'text', '请输入作者名');
        
        // 封面
        const coverField = this.createFormField(form, '封面', 'cover', 'file');
        const fileInput = coverField.querySelector('input');
        if (fileInput) {
            const fileButton = coverField.createDiv({ cls: 'file-select-button', text: '选择文件' });
            const fileLabel = coverField.createDiv({ cls: 'file-label', text: '未选择任何文件' });
            
            fileButton.addEventListener('click', () => {
                fileInput.click();
            });
            
            fileInput.style.display = 'none';
            fileInput.addEventListener('change', () => {
                if (fileInput.files && fileInput.files.length > 0) {
                    fileLabel.setText(fileInput.files[0].name);
                } else {
                    fileLabel.setText('未选择任何文件');
                }
            });
        }
        
        // 格式选择
        const formatField = this.createFormField(form, '格式', 'format', 'select');
        const formatSelect = formatField.querySelector('select');
        if (formatSelect) {
            this.createSelectOption(formatSelect, 'epub', 'EPUB');
            this.createSelectOption(formatSelect, 'mobi', 'MOBI (Kindle)');
            this.createSelectOption(formatSelect, 'pdf', 'PDF');
        }
        
        // 生成按钮
        const generateBtn = content.createDiv({ cls: 'generate-btn', text: '生成电子书' });
        generateBtn.addEventListener('click', () => {
            this.showNotice('电子书生成功能开发中，敬请期待！');
        });
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