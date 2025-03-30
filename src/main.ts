import { Plugin, Notice } from 'obsidian';
import { BookSmithView } from './views/BookSmithView';
import { ToolView } from './views/ToolsView';
import { BookSmithSettingTab } from './settings/SettingTab';
import { BookSmithSettings, DEFAULT_SETTINGS } from './settings/settings';
import { activateView } from './utils/viewUtils';
import { BookManager } from './services/BookManager';
import { TemplateManager } from './services/TemplateManager';
import { BookStatsManager } from './services/BookStatsManager';

export default class BookSmithPlugin extends Plugin {
    settings: BookSmithSettings;
    bookManager: BookManager;
    templateManager: TemplateManager;
    statsManager: BookStatsManager;

    async onload() {
        await this.loadSettings();
        
        // 初始化所有管理器
        this.templateManager = new TemplateManager();
        this.bookManager = new BookManager(this.app, this.settings);
        this.statsManager = new BookStatsManager(this.app, this, this.bookManager);

        // 注册视图
        this.registerView(
            'book-smith-view',
            (leaf) => new BookSmithView(leaf, this)
        );
        this.registerView('book-smith-tool', (leaf) => new ToolView(leaf, this));

        // 添加设置选项卡
        this.addSettingTab(new BookSmithSettingTab(this.app, this));

        // 添加命令
        this.addCommand({
            id: 'open-book-view',
            name: '打开书籍管理面板',
            callback: () => {
                activateView(this.app, 'book-smith-view', 'left');
            }
        });
        this.addCommand({
            id: 'open-tool-view',
            name: '打开工具面板',
            callback: () => {
                activateView(this.app, 'book-smith-tool', 'right');
            }
        });

        // 添加一个命令用于同时打开两个视图
        this.addCommand({
            id: 'open-all-views',
            name: '打开所有面板',
            callback: () => {
                activateView(this.app, 'book-smith-view', 'left');
                activateView(this.app, 'book-smith-tool', 'right');
            }
        });

        // 添加一个功能按钮用于打开所有面板
        this.addRibbonIcon('book-open', '打开书籍管理面板', () => {
            activateView(this.app, 'book-smith-view', 'left');
            activateView(this.app, 'book-smith-tool', 'right');
        });
    }

    onunload() {
        // 卸载插件时的清理工作
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async reloadPlugin() {
        // 卸载插件
        await (this.app as any).plugins.disablePlugin(this.manifest.id);
        // 重新加载插件
        await (this.app as any).plugins.enablePlugin(this.manifest.id);
        new Notice('插件已重新加载');
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}