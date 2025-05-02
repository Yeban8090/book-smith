import { Plugin, Notice } from 'obsidian';
import { BookSmithView } from './views/BookSmithView';
import { ToolView } from './views/ToolsView';
import { BookSmithSettingTab } from './settings/SettingTab';
import { BookSmithSettings, DEFAULT_SETTINGS } from './settings/settings';
import { activateView } from './utils/viewUtils';
import { BookManager } from './services/BookManager';
import { TemplateManager } from './services/TemplateManager';
import { BookStatsManager } from './services/BookStatsManager';
import { i18n } from './i18n/i18n';

export default class BookSmithPlugin extends Plugin {
    settings: BookSmithSettings;
    bookManager: BookManager;
    templateManager: TemplateManager;
    statsManager: BookStatsManager;

    async onload() {
        await this.loadSettings();        
        // 初始化所有管理器
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
            name: i18n.t('OPEN_BOOK_PANEL'),
            callback: () => {
                activateView(this.app, 'book-smith-view', 'left');
            }
        });
        this.addCommand({
            id: 'open-tool-view',
            name: i18n.t('OPEN_TOOL_PANEL'),
            callback: () => {
                activateView(this.app, 'book-smith-tool', 'right');
            }
        });

        // 添加一个命令用于同时打开两个视图
        this.addCommand({
            id: 'open-all-views',
            name: i18n.t('OPEN_ALL_PANELS'),
            callback: () => {
                activateView(this.app, 'book-smith-view', 'left');
                activateView(this.app, 'book-smith-tool', 'right');
            }
        });

        // 添加一个功能按钮用于打开所有面板
        this.addRibbonIcon('book-open', i18n.t('OPEN_BOOK_PANEL'), () => {
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

    async saveSettings() {
        await this.saveData(this.settings);
    }
}