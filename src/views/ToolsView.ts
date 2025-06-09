import { ItemView, WorkspaceLeaf, setIcon, Menu, Notice } from 'obsidian';
import { FocusToolView } from '../components/FocusToolView';
import { DonateModal } from '../modals/DonateModal';
import { InspirationModal } from '../modals/InspirationModal';
import { CommunityModal } from '../modals/CommunityModal';
import { ContactModal } from '../modals/ContactModal';
import BookSmithPlugin from '../main';
import { i18n } from '../i18n/i18n';
import { TypographyView } from '../components/TypographyView';
import { EbookView } from '../components/EbookView';

interface ToolItem {
    icon: string;
    text: string;
    hasProgress?: boolean;
    extra?: string;
    onClick?: () => void;
}

export class ToolView extends ItemView {
    private normalView: HTMLElement | null = null;
    private focusView: FocusToolView | null = null;
    private typographyView: TypographyView | null = null;
    private ebookView: EbookView | null = null;

    constructor(leaf: WorkspaceLeaf, private plugin: BookSmithPlugin) {
        super(leaf);
    }

    onload(): void {
        // 修改为监听 document 上的事件，而不是 containerEl
        document.addEventListener('open-donate-modal', () => {
            console.log('Received open-donate-modal event');
            new DonateModal(this.containerEl).open();
        });
    }

    // 视图基础配置
    getViewType() { return 'book-smith-tool'; }
    getDisplayText() { return i18n.t('WRITING_TOOLBOX'); }
    getIcon() { return 'wrench'; }

    // 生命周期方法
    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        container.addClass('book-smith-tools-view');
        this.normalView = container as HTMLElement;
        this.createNormalView(container as HTMLElement);
    }

    // 视图刷新方法
    refresh() {
        if (this.normalView) {
            this.normalView.empty();
            this.createNormalView(this.normalView);
        }
    }

    // 主视图创建
    private createNormalView(container: HTMLElement) {
        this.createHeader(container);
        this.createToolGroups(container);
        this.createSettings(container);
    }

    // 头部创建
    private createHeader(container: HTMLElement) {
        const header = container.createDiv({ cls: 'book-smith-panel-header' });
        const titleContainer = header.createDiv({ cls: 'book-smith-panel-title' });
        
        // 保持原有的图标和标题
        const mainIconSpan = titleContainer.createSpan({ cls: 'book-smith-panel-icon' });
        setIcon(mainIconSpan, 'archive');
        titleContainer.createSpan({ text: i18n.t('WRITING_TOOLBOX') });
    }

    // 工具组创建
    private createToolGroups(container: HTMLElement) {
        // 写作助手工具组
        if (this.plugin.settings.tools.assistant) {
            this.createToolGroup(container, i18n.t('WRITING_ASSISTANT'), [
                {
                    icon: 'target',
                    text: i18n.t('FOCUS_MODE'),
                    hasProgress: true,
                    onClick: () => this.enterFocusMode()
                },
                {
                    icon: 'brain',
                    text: i18n.t('CREATIVE_INSPIRATION'),
                    onClick: () => new InspirationModal(this.containerEl).open()
                },
                {
                    icon: 'file-text',
                    text: i18n.t('CHARACTER_PROFILES'),
                    onClick: () => {
                        new Notice(i18n.t('FEATURE_COMING_SOON', { feature: i18n.t('CHARACTER_PROFILES') }));
                    }
                },
                {
                    icon: 'map',
                    text: i18n.t('WORLD_BUILDING'),
                    onClick: () => {
                        new Notice(i18n.t('FEATURE_COMING_SOON', { feature: i18n.t('WORLD_BUILDING') }));
                    }
                }
            ]);
        }

        // 导出发布工具组
        if (this.plugin.settings.tools.export) {
            this.createToolGroup(container, i18n.t('EXPORT_PUBLISH'), [
                { 
                    icon: 'edit-3', 
                    text: i18n.t('DESIGN_TYPOGRAPHY'),
                    onClick: () => this.enterTypographyMode()
                },
                { 
                    icon: 'book', 
                    text: i18n.t('GENERATE_EBOOK'),
                    onClick: () => this.enterEbookMode()
                },
                { 
                    icon: 'clock', 
                    text: i18n.t('MORE_FEATURES'),
                    onClick: () => {
                        new Notice(i18n.t('MORE_FEATURES_MESSAGE'));
                    }
                }
            ]);
        }

        // 写作圈子工具组
        if (this.plugin.settings.tools.community) {
            this.createToolGroup(container, i18n.t('WRITING_COMMUNITY'), [
                { 
                    icon: 'users', 
                    text: i18n.t('CREATIVE_COMMUNITY'), 
                    extra: '',
                    onClick: () => new CommunityModal(this.containerEl).open()
                },
                { 
                    icon: 'message-square', 
                    text: i18n.t('CONTACT_AUTHOR'),
                    onClick: () => new ContactModal(this.containerEl).open()
                },
                { 
                    icon: 'heart', 
                    text: i18n.t('DONATE_SUPPORT'),
                    onClick: () => new DonateModal(this.containerEl).open()
                }
            ]);
        }
    }

    // 工具组创建辅助方法
    private createToolGroup(container: HTMLElement, title: string, items: ToolItem[]) {
        const group = container.createDiv({ cls: 'book-smith-tool-group' });
        group.createDiv({ text: title, cls: 'book-smith-group-title' });

        items.forEach(item => {
            const toolItem = this.createToolItem(group, item.icon, item.text);

            if (item.hasProgress) {
                const progressBar = toolItem.createDiv({ cls: 'book-smith-progress-bar' });
                progressBar.createDiv({ cls: 'book-smith-progress' });
            }

            if (item.extra) {
                toolItem.createSpan({ text: item.extra, cls: 'book-smith-tool-item-extra' });
            }

            if (item.onClick) {
                toolItem.addEventListener('click', item.onClick);
            }
        });
    }

    // 单个工具项创建
    private createToolItem(container: HTMLElement, icon: string, text: string) {
        const item = container.createDiv({ cls: 'book-smith-tool-item' });
        const iconSpan = item.createSpan({ cls: 'book-smith-tool-icon' });
        setIcon(iconSpan, icon);
        item.createSpan({ text });
        return item;
    }

    // 设置面板创建
    private createSettings(container: HTMLElement) {
        const settingsItem = this.createToolItem(container, 'settings', i18n.t('PANEL_SETTINGS'));
        settingsItem.addClass('settings');
        
        settingsItem.addEventListener('contextmenu', (event) => {
            const menu = new Menu();
            
            // 添加工具显隐选项
            this.addToolVisibilityMenuItem(menu, 'assistant', 'target', i18n.t('WRITING_ASSISTANT'));
            this.addToolVisibilityMenuItem(menu, 'export', 'download', i18n.t('EXPORT_PUBLISH'));

            menu.showAtMouseEvent(event);
        });
    }

    // 添加工具显隐菜单项
    private addToolVisibilityMenuItem(menu: Menu, key: keyof typeof this.plugin.settings.tools, icon: string, text: string) {
        menu.addItem(item => item
            .setTitle(`${this.plugin.settings.tools[key] ? i18n.t('HIDE') : i18n.t('SHOW')}${text}`)
            .setIcon(icon)
            .setChecked(this.plugin.settings.tools[key])
            .onClick(async () => {
                this.plugin.settings.tools[key] = !this.plugin.settings.tools[key];
                await this.plugin.saveSettings();
                this.refresh();
            })
        );
    }

    // 专注模式相关
    private enterFocusMode() {
        if (!this.normalView) return;
        this.normalView.empty();
        
        this.focusView = new FocusToolView(
            this.app,
            this.plugin,
            this.normalView,
            () => {
                this.focusView?.remove();
                this.focusView = null;
                if (this.normalView) {
                    this.normalView.empty();
                    this.createNormalView(this.normalView);
                }
            }
        );
    }

    // 添加进入排版模式的方法
    private enterTypographyMode() {
        if (!this.normalView) return;
        this.normalView.empty();
        
        this.typographyView = new TypographyView(
            this.app,
            this.plugin,
            this.normalView,
            () => {
                this.typographyView?.remove();
                this.typographyView = null;
                if (this.normalView) {
                    this.normalView.empty();
                    this.createNormalView(this.normalView);
                }
            }
        );
        
        // 初始化视图（加载书籍等）
        this.typographyView.initialize();
    }

    // 添加进入电子书模式的方法
    private enterEbookMode() {
        if (!this.normalView) return;
        this.normalView.empty();
        
        this.ebookView = new EbookView(
            this.app,
            this.plugin,
            this.normalView,
            () => {
                this.ebookView?.remove();
                this.ebookView = null;
                if (this.normalView) {
                    this.normalView.empty();
                    this.createNormalView(this.normalView);
                }
            }
        );
        
        // 初始化视图（加载书籍等）
        this.ebookView.initialize();
    }

    // 修改 onClose 方法，确保所有视图都被正确关闭
    async onClose() {
        if (this.focusView) {
            this.focusView.remove();
            this.focusView = null;
        }
        
        if (this.typographyView) {
            this.typographyView.remove();
            this.typographyView = null;
        }
        
        if (this.ebookView) {
            this.ebookView.remove();
            this.ebookView = null;
        }
    }
}