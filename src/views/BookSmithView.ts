// === 导入声明 ===
import { ItemView, WorkspaceLeaf, Notice, TFolder, TFile, TAbstractFile, setIcon } from 'obsidian';
import BookSmithPlugin from '../main';
import { Book } from '../types/book';
import { CreateBookModal } from '../modals/CreateBookModal';
import { ManageBooksModal } from '../modals/ManageBooksModal';
import { SwitchBookModal } from '../modals/SwitchBookModal';
import { ChapterTree } from '../components/ChapterTree';
import { FileEventManager } from '../services/FileEventManager';
import { ReferenceManager } from '../services/ReferenceManager';

// === 视图类定义 ===
export class BookSmithView extends ItemView {
    // === 属性定义 ===
    private currentBook: Book | null = null;
    private fileEventManager: FileEventManager;
    private referenceManager: ReferenceManager;
    private isRenamingFile: boolean = false;

    constructor(
        leaf: WorkspaceLeaf,
        private plugin: BookSmithPlugin
    ) {
        super(leaf);
        this.fileEventManager = new FileEventManager(this.app, this.plugin);
        this.referenceManager = new ReferenceManager(
            this.app, 
            this.plugin, 
            () => this.currentBook
        );
        
        this.registerFileEvents();
        this.referenceManager.registerEditorMenu();  // 注册右键菜单
        // 注册统计变化监听
        this.registerEvent(
            this.plugin.statsManager.onStatsChange(() => {
                this.renderStats(this.containerEl.children[1] as HTMLElement);
            })
        );
    }

    // === 视图状态管理 ===
    private async refreshView() {
        await this.loadBook();
        const container = this.containerEl.children[1];
        container.empty();
        container.addClass('book-smith-view-content');
        this.renderToolbar(container as HTMLElement);
        this.renderContent(container as HTMLElement);
        this.renderStats(container as HTMLElement);
    }

    // === 文件事件监听 ===
    private registerFileEvents() {        
        // 监听文件内容修改
        this.registerEvent(
            this.app.vault.on('modify', async (file: TAbstractFile) => {
                if (this.isRenamingFile) return; // 避免重命名时触发
                if (file instanceof TFile && this.currentBook) {
                    const bookPath = `${this.plugin.settings.defaultBookPath}/${this.currentBook.basic.title}`;
                    if (file.path.startsWith(bookPath)) {
                        const result = await this.fileEventManager.handleBookModify(file, this.currentBook);
                        if (result) {
                            await this.refreshView();
                        }
                    }
                }
            })
        );

        // 监听文件或文件夹重命名
        this.registerEvent(
            this.app.vault.on('rename', async (file: TAbstractFile, oldPath: string) => {
                this.isRenamingFile = true;
                if ((file instanceof TFile || file instanceof TFolder) && this.currentBook) {
                    const updatedBook = await this.fileEventManager.handleBookModify(file, this.currentBook, oldPath);
                    if (updatedBook) {
                        await this.refreshView();
                    }
                }
                this.isRenamingFile = false;
            })
        );
    }

    // === 数据加载 ===
    private async loadBook() {
        const bookId = this.plugin.settings.lastBookId;
        if (bookId) {
            this.currentBook = await this.plugin.bookManager.getBookById(bookId);
            this.plugin.statsManager.setCurrentBook(this.currentBook);
        } else {
            this.currentBook = null;
            this.plugin.statsManager.setCurrentBook(null);
        }
    }

    // === 视图基础方法 ===
    getViewType() {
        return 'book-smith-view';
    }

    getDisplayText() {
        return '书籍管理';
    }

    getIcon() {
        return 'book';
    }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        container.addClass('book-smith-view-content');
        await this.loadBook();
        this.renderToolbar(container as HTMLElement);
        this.renderContent(container as HTMLElement);
        this.renderStats(container as HTMLElement);
    }

    // === 界面渲染方法 ===
    private renderToolbar(container: HTMLElement) {
        const toolbar = container.createDiv({ cls: 'book-smith-toolbar' });

        const newBookBtn = toolbar.createEl('button', { cls: 'book-smith-toolbar-btn' });
        setIcon(newBookBtn, 'create-new');
        newBookBtn.appendChild(createSpan({ text: ' 新建书籍' }));
        newBookBtn.addEventListener('click', () => {
            new CreateBookModal(this.app, this.plugin, async (newBook) => {
                if (newBook) {
                    this.plugin.settings.lastBookId = newBook.basic.uuid;
                    await this.plugin.saveSettings();
                    await this.refreshView();
                    new Notice(`已切换到《${newBook.basic.title}》`);
                }
            }).open();
        });

        const switchBookBtn = toolbar.createEl('button', { cls: 'book-smith-toolbar-btn' });
        setIcon(switchBookBtn, 'switch');
        switchBookBtn.appendChild(createSpan({ text: ' 切换' }));
        switchBookBtn.addEventListener('click', () => {
            this.switchBook();
        });

        const manageBookBtn = toolbar.createEl('button', { cls: 'book-smith-toolbar-btn' });
        setIcon(manageBookBtn, 'library');
        manageBookBtn.appendChild(createSpan({ text: ' 管理' }));
        manageBookBtn.addEventListener('click', async () => {
            new ManageBooksModal(this.app, this.plugin, async (result) => {
                if (result.type === 'imported' && result.bookId) {
                    // 处理导入书籍的情况
                    this.plugin.settings.lastBookId = result.bookId;
                    await this.plugin.saveSettings();
                    await this.refreshView();
                    new Notice(`已导入并切换到新书籍`);
                } else if (result.bookId === this.currentBook?.basic.uuid) {
                    if (result.type === 'deleted') {
                        this.plugin.settings.lastBookId = undefined;
                        await this.plugin.saveSettings();
                        this.currentBook = null;
                        await this.refreshView();
                        new Notice('当前书籍已被删除');
                    } else if (result.type === 'edited') {
                        await this.refreshView();
                    }
                }
            }).open();
        });
    }

    private async renderContent(container: HTMLElement) {
        container.createDiv({ cls: 'book-smith-divider' });
        const bookContent = container.createDiv({ cls: 'book-smith-content' });

        // 获取当前选中的书籍
        const currentBookId = this.plugin.settings.lastBookId;
        if (!currentBookId || !this.currentBook) {
            this.renderEmptyState(bookContent);
            container.createDiv({ cls: 'book-smith-bottom-divider' });
            return;
        }

        // 渲染书籍标题
        const titleSection = bookContent.createDiv({ cls: 'book-smith-book-header' });

        // 添加封面
        const coverContainer = titleSection.createDiv({ cls: 'book-smith-header-cover' });
        if (this.currentBook.basic.cover) {
            const coverImg = coverContainer.createEl('img', {
                attr: {
                    src: this.app.vault.adapter.getResourcePath(this.currentBook.basic.cover)
                }
            });
        }

        const titleContent = titleSection.createDiv({ cls: 'book-smith-header-content' });
        titleContent.createEl('h2', {
            text: `《${this.currentBook.basic.title}》`,
            cls: 'book-smith-title'
        });
        if (this.currentBook.basic.subtitle) {
            titleContent.createEl('p', {
                text: this.currentBook.basic.subtitle,
                cls: 'book-smith-subtitle'
            });
        }

        // 渲染书籍信息
        const infoSection = bookContent.createDiv({ cls: 'book-smith-book-info' });
        const authorRow = infoSection.createDiv({ cls: 'book-smith-info-row' });
        authorRow.createSpan({ text: '作者', cls: 'book-smith-info-label' });
        authorRow.createSpan({
            text: this.currentBook.basic.author.join(', '),
            cls: 'book-smith-info-value'
        });

        const descRow = infoSection.createDiv({ cls: 'book-smith-info-row' });
        descRow.createSpan({ text: '简介', cls: 'book-smith-info-label' });
        descRow.createSpan({
            text: this.currentBook.basic.desc || '',
            cls: 'book-smith-info-value description'
        });

        // 渲染章节树
        const treeSection = bookContent.createDiv({ cls: 'book-smith-chapter-tree' });
        this.renderChapterTree(treeSection);

        container.createDiv({ cls: 'book-smith-bottom-divider' });
    }

    private renderChapterTree(container: HTMLElement) {
        if (!this.currentBook) return;

        const bookPath = `${this.plugin.settings.defaultBookPath}/${this.currentBook.basic.title}`;
        new ChapterTree(
            container,
            this.app,
            bookPath,
            this.plugin.bookManager,
            async () => {
                await this.loadBook();
                await this.onOpen();
            }
        ).render(this.currentBook);
    }

    private renderEmptyState(container: HTMLElement) {
        const emptyState = container.createDiv({ cls: 'book-smith-empty-state' });
        emptyState.createEl('p', {
            text: '👋 欢迎使用 BookSmith',
            cls: 'book-smith-empty-title'
        });
        emptyState.createEl('p', {
            text: '点击上方的"新建书籍"创建作品，或使用"切换"按钮选择已有书籍',
            cls: 'book-smith-empty-desc'
        });
    }

    private renderStats(container: HTMLElement) {
        const statsContainer = container.createDiv({ cls: 'book-smith-stats' });
        if (!this.currentBook) return;

        // 当日字数
        const today = new Date().toISOString().split('T')[0];  // 获取今天的日期 (YYYY-MM-DD)
        const todayWords = statsContainer.createDiv({ cls: 'book-smith-stat-item' });
        const todayWordsLabel = todayWords.createSpan();
        setIcon(todayWordsLabel, 'pencil');
        todayWordsLabel.appendChild(createSpan({ text: ' 今日字数' }));
        todayWords.createEl('span', {
            cls: 'book-smith-stat-value',
            text: `${this.currentBook.stats.daily_words[today] || 0}字`
        });

        // 总字数统计
        const wordCount = statsContainer.createDiv({ cls: 'book-smith-stat-item' });
        const wordCountLabel = wordCount.createSpan();
        setIcon(wordCountLabel, 'document');
        wordCountLabel.appendChild(createSpan({ text: ' 字数统计' }));
        wordCount.createEl('span', {
            cls: 'book-smith-stat-value',
            text: `${this.currentBook.stats.total_words}${this.currentBook.stats.target_total_words
                ? ` / ${(this.currentBook.stats.target_total_words / 10000).toFixed(1)}万`
                : ''
                }`
        });

        // 写作进度
        const progress = statsContainer.createDiv({ cls: 'book-smith-stat-item' });
        const progressLabel = progress.createSpan();
        setIcon(progressLabel, 'target');
        progressLabel.appendChild(createSpan({ text: ' 章节完成' }));
        progress.createEl('span', {
            cls: 'book-smith-stat-value',
            text: `${Math.round(this.currentBook.stats.progress_by_chapter * 100)}%`
        });

        // 写作天数
        const duration = statsContainer.createDiv({ cls: 'book-smith-stat-item' });
        const durationLabel = duration.createSpan();
        setIcon(durationLabel, 'clock');
        durationLabel.appendChild(createSpan({ text: ' 写作天数' }));
        duration.createEl('span', {
            cls: 'book-smith-stat-value',
            text: `${this.currentBook.stats.writing_days}天`
        });

        // 日均字数
        const average = statsContainer.createDiv({ cls: 'book-smith-stat-item' });
        const averageLabel = average.createSpan();
        setIcon(averageLabel, 'calendar-clock');
        averageLabel.appendChild(createSpan({ text: ' 日均字数' }));
        average.createEl('span', {
            cls: 'book-smith-stat-value',
            text: `${Math.round(this.currentBook.stats.average_daily_words)}字`
        });
    }

    // === 交互处理方法 ===
    private async switchBook() {
        const books = await this.plugin.bookManager.getAllBooks();
        if (books.length === 0) {
            new Notice('暂无可切换的书籍');
            return;
        }

        new SwitchBookModal(this.app, books, async (selectedBook) => {
            this.plugin.settings.lastBookId = selectedBook.basic.uuid;
            await this.plugin.saveSettings();
            await this.refreshView();
            new Notice(`已切换到《${selectedBook.basic.title}》`);
        }).open();
    }
}