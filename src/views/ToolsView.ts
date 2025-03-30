import { ItemView, WorkspaceLeaf, setIcon, Menu, Notice } from 'obsidian';
import { FocusToolView } from '../components/FocusToolView';
import BookSmithPlugin from '../main';
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

    constructor(leaf: WorkspaceLeaf, private plugin: BookSmithPlugin) {
        super(leaf);
    }

    // 视图基础配置
    getViewType() { return 'book-smith-tool'; }
    getDisplayText() { return '写作工具箱'; }
    getIcon() { return 'wrench'; }

    // 生命周期方法
    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        container.addClass('book-smith-tools-view');
        this.normalView = container as HTMLElement;
        this.createNormalView(container as HTMLElement);
    }

    async onClose() {
        if (this.focusView) {
            this.focusView.remove();
            this.focusView = null;
        }
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
        titleContainer.createSpan({ text: '写作工具箱' });
    }

    // 工具组创建
    private createToolGroups(container: HTMLElement) {
        // 写作助手工具组
        if (this.plugin.settings.tools.assistant) {
            this.createToolGroup(container, '写作助手', [
                {
                    icon: 'target',
                    text: '专注模式',
                    hasProgress: true,
                    onClick: () => this.enterFocusMode()
                },
                {
                    icon: 'brain',
                    text: '创作灵感',
                    onClick: () => new Notice('创作灵感功能开发中...')
                }
            ]);
        }

        // 导出发布工具组
        if (this.plugin.settings.tools.export) {
            this.createToolGroup(container, '导出发布', [
                { 
                    icon: 'download', 
                    text: '导出为 PDF',
                    onClick: () => new Notice('PDF导出功能开发中...')
                },
                { 
                    icon: 'book', 
                    text: '生成电子书',
                    onClick: () => new Notice('电子书生成功能开发中...')
                }
            ]);
        }

        // 写作圈子工具组
        if (this.plugin.settings.tools.community) {
            this.createToolGroup(container, '写作圈子', [
                { 
                    icon: 'users', 
                    text: '创作社区', 
                    extra: '',
                    onClick: () => new Notice('欢迎加入创作社区，关注公众号：BilionWrites', 3000)
                },
                { 
                    icon: 'message-circle', 
                    text: '联系作者',
                    onClick: () => new Notice('欢迎关注公众号：夜半', 3000)
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
        const settingsItem = this.createToolItem(container, 'settings', '面板设置');
        settingsItem.addClass('settings');
        
        settingsItem.addEventListener('contextmenu', (event) => {
            const menu = new Menu();
            
            // 添加工具显隐选项
            this.addToolVisibilityMenuItem(menu, 'assistant', 'target', '写作助手');
            this.addToolVisibilityMenuItem(menu, 'export', 'download', '导出发布');
            this.addToolVisibilityMenuItem(menu, 'community', 'calendar', '写作圈子');

            menu.showAtMouseEvent(event);
        });
    }

    // 添加工具显隐菜单项
    private addToolVisibilityMenuItem(menu: Menu, key: keyof typeof this.plugin.settings.tools, icon: string, text: string) {
        menu.addItem(item => item
            .setTitle(`${this.plugin.settings.tools[key] ? '隐藏' : '显示'}${text}`)
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
}