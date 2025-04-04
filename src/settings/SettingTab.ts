import { App, PluginSettingTab, Setting, setIcon } from 'obsidian';
import BookSmithPlugin from '../main';
import { TemplateEditModal } from '../modals/TemplateEditModal';
import { ConfirmModal } from '../modals/ConfirmModal';

export class BookSmithSettingTab extends PluginSettingTab {
    plugin: BookSmithPlugin;
    private expandedSections: Set<string> = new Set();

    constructor(app: App, plugin: BookSmithPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    private createSection(containerEl: HTMLElement, title: string, renderContent: (contentEl: HTMLElement) => void) {
        const section = containerEl.createDiv('settings-section');
        const header = section.createDiv('settings-section-header');
        
        const toggle = header.createSpan('settings-section-toggle');
        setIcon(toggle, 'chevron-right');
        
        header.createEl('h4', { text: title });
        
        const content = section.createDiv('settings-section-content');
        renderContent(content);
        
        header.addEventListener('click', () => {
            const isExpanded = !section.hasClass('is-expanded');
            section.toggleClass('is-expanded', isExpanded);
            setIcon(toggle, isExpanded ? 'chevron-down' : 'chevron-right');
            if (isExpanded) {
                this.expandedSections.add(title);
            } else {
                this.expandedSections.delete(title);
            }
        });
        
        // 根据保存的状态或默认第一个展开
        if (this.expandedSections.has(title) || (!containerEl.querySelector('.settings-section'))) {
            section.addClass('is-expanded');
            setIcon(toggle, 'chevron-down');
            this.expandedSections.add(title);
        }
        
        return section;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.addClass('book-smith-settings');

        containerEl.createEl('h2', { text: 'Book Smith设置' });

        // 基本设置
        this.createSection(containerEl, '基本设置', el => this.renderBasicSettings(el));
        
        // 模板设置
        this.createSection(containerEl, '模板设置', el => this.renderTemplateSettings(el));
        
        // 写作工具箱设置
        this.createSection(containerEl, '写作工具箱设置', el => this.renderWritingToolsSettings(el));

        // 添加应用按钮
        new Setting(containerEl)
            .addButton(button => button
                .setButtonText('应用并重载插件')
                .setCta()
                .onClick(async () => {
                    await this.plugin.reloadPlugin();
                }));
    }

    // 添加新的模板设置渲染方法
    private renderTemplateSettings(containerEl: HTMLElement): void {

        // 默认模板选择
        new Setting(containerEl)
            .setName('默认模板')
            .setDesc('创建新书籍时使用的默认模板')
            .addDropdown(dropdown => {
                const templates = this.plugin.settings.templates.custom;
                Object.keys(templates).forEach(key => {
                    dropdown.addOption(key, templates[key].name);
                });
                dropdown.setValue(this.plugin.settings.templates.default)
                    .onChange(async (value) => {
                        this.plugin.settings.templates.default = value;
                        await this.plugin.saveSettings();
                    });
            });

        // 模板列表
        const templateList = containerEl.createDiv('template-list');
        templateList.createEl('h4', { text: '书籍模板' });

        // 先渲染默认模板（内置模板）
        const defaultTemplate = this.plugin.settings.templates.custom['default'];
        if (defaultTemplate) {
            const templateDiv = templateList.createDiv('template-item');
            new Setting(templateDiv)
                .setName(defaultTemplate.name)
                .setDesc(defaultTemplate.description);
        }

        // 渲染其他自定义模板
        Object.entries(this.plugin.settings.templates.custom)
            .filter(([key]) => key !== 'default')
            .forEach(([key, template]) => {
                const templateDiv = templateList.createDiv('template-item');
                new Setting(templateDiv)
                    .setName(template.name)
                    .setDesc(template.description)
                    .addButton(btn => btn
                        .setIcon('pencil')
                        .setTooltip('编辑模板')
                        .onClick(() => {
                            new TemplateEditModal(this.app, this.plugin, key, () => this.display()).open();
                        }))
                    .addButton(btn => btn
                        .setIcon('trash')
                        .setTooltip('删除模板')
                        .onClick(() => {
                            new ConfirmModal(
                                this.app,
                                '删除模板',
                                '确定要删除此模板吗？删除后无法恢复。',
                                async () => {
                                    // 如果删除的是当前默认模板，则将默认模板设置为 'default'
                                    if (key === this.plugin.settings.templates.default) {
                                        this.plugin.settings.templates.default = 'default';
                                    }
                                    delete this.plugin.settings.templates.custom[key];
                                    await this.plugin.saveSettings();
                                    this.display();
                                }
                            ).open();
                        }));
            });

        // 添加新模板按钮
        new Setting(containerEl)
            .addButton(btn => btn
                .setButtonText('添加新模板')
                .setCta()
                .onClick(() => {
                    new TemplateEditModal(
                        this.app, 
                        this.plugin,
                        undefined,
                        () => this.display()  // 添加回调函数
                    ).open();
                }));
    }

    private renderBasicSettings(containerEl: HTMLElement): void {

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