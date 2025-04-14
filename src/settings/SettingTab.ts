import { App, PluginSettingTab, Setting, setIcon, Notice } from 'obsidian';
import BookSmithPlugin from '../main';
import { i18n, Locale } from '../i18n/i18n';
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

        containerEl.createEl('h2', { text: i18n.t('SETTINGS_TITLE') });
    
        // 基本设置
        this.createSection(containerEl, i18n.t('BASIC_SETTINGS'), el => this.renderBasicSettings(el));
    
        // 模板设置
        this.createSection(containerEl, i18n.t('TEMPLATE_SETTINGS'), el => this.renderTemplateSettings(el));
    
        // 写作工具箱设置
        this.createSection(containerEl, i18n.t('WRITING_TOOLS_SETTINGS'), el => this.renderWritingToolsSettings(el));
    }
    
    private renderBasicSettings(containerEl: HTMLElement): void {
        // 添加语言选择
        new Setting(containerEl)
            .setName(i18n.t('LANGUAGE_SETTING'))
            .setDesc(i18n.t('LANGUAGE_DESC'))
            .addDropdown(dropdown => {
                dropdown
                    .addOption('zh-CN', '简体中文')
                    .addOption('en', 'English')
                    .setValue(this.plugin.settings.language)
                    .onChange(async (value: Locale) => {
                        this.plugin.settings.language = value;
                        i18n.setLocale(value);
                        await this.plugin.saveSettings();
                        this.display();
                    });
            });
    
        new Setting(containerEl)
            .setName(i18n.t('DEFAULT_AUTHOR'))
            .setDesc(i18n.t('DEFAULT_AUTHOR_DESC'))
            .addText(text => text
                .setPlaceholder(i18n.t('DEFAULT_AUTHOR_PLACEHOLDER'))
                .setValue(this.plugin.settings.defaultAuthor)
                .onChange(async (value) => {
                    this.plugin.settings.defaultAuthor = value;
                    await this.plugin.saveSettings();
                }));
    
        new Setting(containerEl)
            .setName(i18n.t('BOOK_STORAGE_PATH'))
            .setDesc(i18n.t('BOOK_STORAGE_DESC'))
            .addText(text => text
                .setPlaceholder('books')
                .setValue(this.plugin.settings.defaultBookPath)
                .onChange(async (value) => {
                    this.plugin.settings.defaultBookPath = value;
                    await this.plugin.saveSettings();
                    new Notice(i18n.t('STORAGE_PATH_CHANGED'));
                }));
    }
    
    private renderTemplateSettings(containerEl: HTMLElement): void {
        // 默认模板选择
        new Setting(containerEl)
            .setName(i18n.t('DEFAULT_TEMPLATE'))
            .setDesc(i18n.t('DEFAULT_TEMPLATE_DESC'))
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
        templateList.createEl('h4', { text: i18n.t('BOOK_TEMPLATES') });
        
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
                        .setTooltip(i18n.t('EDIT_TEMPLATE'))
                        .onClick(() => {
                            new TemplateEditModal(this.app, this.plugin, key, () => this.display()).open();
                        }))
                    .addButton(btn => btn
                        .setIcon('trash')
                        .setTooltip(i18n.t('DELETE_TEMPLATE'))
                        .onClick(() => {
                            new ConfirmModal(
                                this.app,
                                i18n.t('DELETE_TEMPLATE'),
                                i18n.t('DELETE_TEMPLATE_DESC'),
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
                .setButtonText(i18n.t('ADD_NEW_TEMPLATE'))
                .setCta()
                .onClick(() => {
                    new TemplateEditModal(
                        this.app,
                        this.plugin,
                        undefined,
                        () => this.display()
                    ).open();
                }));
    }
    
    private renderWritingToolsSettings(containerEl: HTMLElement): void {
        // 专注模式设置
        const focusSection = containerEl.createDiv();
        focusSection.createEl('h4', { text: i18n.t('FOCUS_MODE_SETTINGS') });
    
        new Setting(focusSection)
            .setName(i18n.t('FOCUS_DURATION'))
            .setDesc(i18n.t('FOCUS_DURATION_DESC'))
            .addText(text => text
                .setPlaceholder('25')
                .setValue(this.plugin.settings.focus.workDuration.toString())
                .onChange(async (value) => {
                    this.plugin.settings.focus.workDuration = Number(value) || 25;
                    await this.plugin.saveSettings();
                }));
    
        new Setting(focusSection)
            .setName(i18n.t('BREAK_DURATION'))
            .setDesc(i18n.t('BREAK_DURATION_DESC'))
            .addText(text => text
                .setPlaceholder('5')
                .setValue(this.plugin.settings.focus.breakDuration.toString())
                .onChange(async (value) => {
                    this.plugin.settings.focus.breakDuration = Number(value) || 5;
                    await this.plugin.saveSettings();
                }));
    
        new Setting(focusSection)
            .setName(i18n.t('WORD_GOAL'))
            .setDesc(i18n.t('WORD_GOAL_DESC'))
            .addText(text => text
                .setPlaceholder('500')
                .setValue(this.plugin.settings.focus.wordGoal.toString())
                .onChange(async (value) => {
                    this.plugin.settings.focus.wordGoal = Number(value) || 500;
                    await this.plugin.saveSettings();
                }));
    }
}