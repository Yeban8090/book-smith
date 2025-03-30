import { App, PluginSettingTab, Setting } from 'obsidian';
import BookSmithPlugin from '../main';

export class BookSmithSettingTab extends PluginSettingTab {
    plugin: BookSmithPlugin;

    constructor(app: App, plugin: BookSmithPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Book Smith设置' });

        // 基本设置
        this.renderBasicSettings(containerEl);
        
        // 写作工具箱设置
        this.renderWritingToolsSettings(containerEl);

        // 添加应用按钮
        new Setting(containerEl)
            .addButton(button => button
                .setButtonText('应用并重载插件')
                .setCta()
                .onClick(async () => {
                    await this.plugin.reloadPlugin();
                }));
    }

    private renderBasicSettings(containerEl: HTMLElement): void {
        containerEl.createEl('h3', { text: '基本设置' });

        new Setting(containerEl)
            .setName('默认作者')
            .setDesc('创建新书籍时的默认作者名')
            .addText(text => text
                .setPlaceholder('输入默认作者名')
                .setValue(this.plugin.settings.defaultAuthor)
                .onChange(async (value) => {
                    this.plugin.settings.defaultAuthor = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('书籍存储路径')
            .setDesc('新建书籍的默认存储路径')
            .addText(text => text
                .setPlaceholder('books')
                .setValue(this.plugin.settings.defaultBookPath)
                .onChange(async (value) => {
                    this.plugin.settings.defaultBookPath = value;
                    await this.plugin.saveSettings();
                }));
    }

    private renderWritingToolsSettings(containerEl: HTMLElement): void {
        containerEl.createEl('h3', { text: '写作工具箱设置' });
        
        // 专注模式设置
        const focusSection = containerEl.createDiv();
        focusSection.createEl('h4', { text: '专注模式设置' });

        new Setting(focusSection)
            .setName('专注时长')
            .setDesc('每个专注周期的工作时长（分钟）')
            .addText(text => text
                .setPlaceholder('25')
                .setValue(this.plugin.settings.focus.workDuration.toString())
                .onChange(async (value) => {
                    this.plugin.settings.focus.workDuration = Number(value) || 25;
                    await this.plugin.saveSettings();
                }));

        new Setting(focusSection)
            .setName('间隔时长')
            .setDesc('每个专注周期后的休息时长（分钟）')
            .addText(text => text
                .setPlaceholder('5')
                .setValue(this.plugin.settings.focus.breakDuration.toString())
                .onChange(async (value) => {
                    this.plugin.settings.focus.breakDuration = Number(value) || 5;
                    await this.plugin.saveSettings();
                }));

        new Setting(focusSection)
            .setName('字数目标')
            .setDesc('每个专注周期的目标字数')
            .addText(text => text
                .setPlaceholder('500')
                .setValue(this.plugin.settings.focus.wordGoal.toString())
                .onChange(async (value) => {
                    this.plugin.settings.focus.wordGoal = Number(value) || 500;
                    await this.plugin.saveSettings();
                }));
    }
}