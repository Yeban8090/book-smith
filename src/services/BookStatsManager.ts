import { App, TFile } from 'obsidian';
import type { Book, BookStats } from '../types/book';
import type BookSmithPlugin from '../main';
import { BookManager } from './BookManager';
import { calculateWordCount, getIncludedChapters, updateBookStats } from '../utils/bookStats';

export class BookStatsManager {
    private currentBook: Book | null = null;
    private statsChangeCallbacks: Set<() => void> = new Set();

    constructor(
        private app: App,
        private plugin: BookSmithPlugin,
        private bookManager: BookManager
    ) {
        // 所有书籍保存共用此入口，正文编辑才传入 editedFilePath。
        this.bookManager.setStatsCalculator((book, editedFilePath) => this.calculateStats(book, editedFilePath));
    }

    async calculateStats(book: Book, editedFilePath?: string): Promise<BookStats> {
        const chapters = getIncludedChapters(book.structure.tree);
        const chapterWords: Record<string, number> = {};
        const editedIds: string[] = [];
        const bookPath = `${this.plugin.settings.defaultBookPath}/${book.basic.title}`;
        for (const chapter of chapters) {
            const path = `${bookPath}/${chapter.path}`;
            const file = this.app.vault.getAbstractFileByPath(path);
            if (file instanceof TFile) {
                chapterWords[chapter.id] = calculateWordCount(await this.app.vault.read(file));
                if (path === editedFilePath) editedIds.push(chapter.id);
            }
        }
        return updateBookStats(book.stats, chapters, chapterWords, editedIds);
    }

    async updateStatsForFile(filePath: string) {
        if (!this.currentBook) return;
        await this.bookManager.updateBook(this.currentBook.basic.uuid, {}, filePath);
    }

    onStatsChange(callback: () => void) {
        this.statsChangeCallbacks.add(callback);
        return () => this.statsChangeCallbacks.delete(callback);
    }

    notifyBookSaved(book: Book) {
        if (this.currentBook?.basic.uuid !== book.basic.uuid) return;
        Object.assign(this.currentBook, book);
        this.statsChangeCallbacks.forEach(callback => callback());
    }

    setCurrentBook(book: Book | null) {
        this.currentBook = book;
    }

    resetStats(targetWords: number = 0): BookStats {
        const now = new Date().toISOString();
        return {
            total_words: 0,
            target_total_words: targetWords,
            progress_by_words: 0,
            progress_by_chapter: 0,
            daily_words: {},
            chapter_words: {},
            writing_days: 0,
            average_daily_words: 0,
            last_writing_date: now,
            last_modified: now
        };
    }
}
