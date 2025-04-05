import { App, TFile } from 'obsidian';
import { Book, ChapterNode, BookStats } from '../types/book';
import BookSmithPlugin from '../main';
import { BookManager } from './BookManager';
export class BookStatsManager {
    private currentBook: Book | null = null;
    private statsChangeCallbacks: Set<() => void> = new Set();

    constructor(
        private app: App,
        private plugin: BookSmithPlugin,
        private bookManager: BookManager
    ) {}

    // 统计更新入口
    async updateStatsForFile() {
        if (!this.currentBook) return;
        
        // 1. 计算总字数
        const totalWordCount = await this.calculateTotalWordCount(this.currentBook.structure.tree);
        
        // 2. 更新统计数据
        const stats = await this.updateStats(this.currentBook.stats, totalWordCount);
        
        // 3. 更新当前book
        this.currentBook.stats = stats;
        
        // 4. 保存到配置文件
        await this.bookManager.updateBook(this.currentBook.basic.uuid, this.currentBook);
        
        // 5. 通知UI更新
        this.notifyStatsChange();
    }

    private async calculateTotalWordCount(nodes: ChapterNode[]): Promise<number> {
        let totalCount = 0;
        for (const node of nodes) {
            // 如果节点被标记为排除，则跳过该节点
            if (node.exclude) continue;
            
            if (node.type === 'file') {
                const fullPath = `${this.plugin.settings.defaultBookPath}/${this.currentBook?.basic.title}/${node.path}`;
                const file = this.app.vault.getAbstractFileByPath(fullPath) as TFile;
                if (file) {
                    const content = await this.app.vault.read(file);
                    totalCount += this.calculateWordCount(content);
                }
            } else if (node.children) {
                totalCount += await this.calculateTotalWordCount(node.children);
            }
        }
        return totalCount;
    }
    // 添加监听器
    onStatsChange(callback: () => void) {
        this.statsChangeCallbacks.add(callback);
        return () => this.statsChangeCallbacks.delete(callback);
    }

    private notifyStatsChange() {
        this.statsChangeCallbacks.forEach(callback => callback());
    }

    private calculateWordCount(content: string): number {
        // 移除 Markdown 语法标记和标点符号
        const plainText = content
            .replace(/[#*`~\[\](){}|_]/g, '') // 移除 Markdown 标记
            .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' '); // 只保留中文、英文、数字和空格
        
        // 统计中文字
        const chineseWords = (plainText.match(/[\u4e00-\u9fa5]/g) || []).length;
        
        // 统计英文单词（连续的字母或数字视为一个单词）
        const englishWords = plainText
            .split(/\s+/)
            .filter(word => /[a-zA-Z0-9]+/.test(word))
            .length;

        return chineseWords + englishWords;
    }

    private async updateStats(stats: BookStats, totalWordCount: number): Promise<BookStats> {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        
        // 计算今日新增字数
        const todayDelta = totalWordCount - stats.total_words;
        
        // 更新每日字数
        const dailyWords = { ...stats.daily_words };
        if (todayDelta !== 0) {
            dailyWords[today] = (dailyWords[today] || 0) + todayDelta;
        }

        // 计算实际有写作记录的天数和平均字数
        const effectiveDays = Object.values(dailyWords).filter(count => count > 0).length;
        const averageDailyWords = effectiveDays > 0 
            ? Math.round(totalWordCount / effectiveDays) 
            : 0;

        // 计算进度
        const progressByWords = stats.target_total_words > 0 
            ? totalWordCount / stats.target_total_words 
            : 0;

        return {
            ...stats,
            total_words: totalWordCount,
            progress_by_words: progressByWords,
            daily_words: dailyWords,
            writing_days: effectiveDays,
            average_daily_words: averageDailyWords,
            last_writing_date: now.toISOString(),
            last_modified: now.toISOString()
        };
    }

    // 设置当前书籍
    setCurrentBook(book: Book | null) {
        this.currentBook = book;
    }

    // 重置统计信息
    resetStats(targetWords: number = 0): BookStats {
        const now = new Date().toISOString();
        return {
            total_words: 0,
            target_total_words: targetWords,
            progress_by_words: 0,
            progress_by_chapter: 0,
            daily_words: {},
            writing_days: 0,
            average_daily_words: 0,
            last_writing_date: now,
            last_modified: now
        };
    }
}