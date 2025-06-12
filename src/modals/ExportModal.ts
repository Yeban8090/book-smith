import { Notice } from "obsidian";
import { BaseModal } from "./BaseModal";
import { i18n } from "../i18n/i18n";
import { ExportService } from "../services/ExportService";
import { Book } from "../types/book";

export class ExportModal extends BaseModal {
    private formatButtons: HTMLButtonElement[] = [];
    private selectedFormat: string | null = null;
    private contentEl: HTMLElement;

    constructor(
        container: HTMLElement,
        private exportService: ExportService,
        private executeExportCallback: (format: string) => Promise<void>
    ) {
        super(container, i18n.t('SELECT_EXPORT_FORMAT') || '选择导出格式');
    }

    protected createContent() {
        // 创建内容容器
        this.contentEl = this.element.createDiv({ cls: 'export-content' });

        // 创建格式选择容器
        const formatsContainer = this.contentEl.createDiv({ cls: 'export-formats-container' });

        // 获取支持的导出格式
        const formats = this.exportService.getSupportedFormats();

        // 创建格式按钮
        formats.forEach(format => {
            const formatBtn = formatsContainer.createEl('button', {
                text: format.toUpperCase(),
                cls: 'export-format-btn'
            });

            this.formatButtons.push(formatBtn);

            formatBtn.addEventListener('click', () => {
                // 移除其他按钮的选中状态
                this.formatButtons.forEach(btn => btn.classList.remove('selected'));
                // 添加当前按钮的选中状态
                formatBtn.classList.add('selected');
                // 设置选中的格式
                this.selectedFormat = format;
            });
        });

        // 添加分隔线
        this.contentEl.createEl('hr', { cls: 'export-divider' });


        // 创建按钮容器
        const buttonContainer = this.contentEl.createDiv({ cls: 'export-buttons-container' });

        // 创建取消按钮
        const cancelBtn = buttonContainer.createEl('button', {
            text: i18n.t('CANCEL') || '取消',
            cls: 'export-cancel-btn'
        });

        cancelBtn.addEventListener('click', () => {
            this.close();
        });

        // 创建确认按钮
        const confirmBtn = buttonContainer.createEl('button', {
            text: i18n.t('CONFIRM') || '确定',
            cls: 'export-confirm-btn'
        });

        confirmBtn.addEventListener('click', async () => {
            if (this.selectedFormat) {
                // 关闭对话框
                this.close();

                // 执行导出回调
                await this.executeExportCallback(this.selectedFormat);
            } else {
                this.showNotice(i18n.t('SELECT_EXPORT_FORMAT') || '请选择导出格式');
            }
        });
    }
}