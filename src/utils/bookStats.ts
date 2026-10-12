import type { BookStats, ChapterNode } from '../types/book';
import { getLocalDateKey } from './dateUtils';

export function getIncludedChapters(nodes: ChapterNode[]): ChapterNode[] {
    const chapters: ChapterNode[] = [];
    for (const node of nodes) {
        if (node.exclude) continue;
        if (node.type === 'file') chapters.push(node);
        else if (node.children) chapters.push(...getIncludedChapters(node.children));
    }
    return chapters;
}

export function calculateWordCount(content: string): number {
    const plainText = content
        .replace(/[#*`~\[\](){}|_]/g, '')
        .replace(/[^\u4e00-\u9fa5\u3040-\u30ff\u3400-\u4dbf\uAC00-\uD7AF\u1100-\u11FF\u0600-\u06FF\u0590-\u05FF\u0900-\u097F\u0980-\u09FF\u0E00-\u0E7F\u0400-\u04FF\u0500-\u052FЁёa-zA-Z0-9\u00C0-\u00FF\u0100-\u017F\u0180-\u024F\s]/g, ' ');
    const cjkWords = (plainText.match(/[\u4e00-\u9fa5\u3400-\u4dbf\uAC00-\uD7AF]/g) || []).length;
    const jpKoWords = (plainText.match(/[\u3040-\u30ff\u1100-\u11FF]/g) || []).length;
    const otherWords = plainText.split(/\s+/).filter(word =>
        /[a-zA-Z0-9\u00C0-\u00FF\u0100-\u017F\u0180-\u024F\u0400-\u04FF\u0500-\u052FЁё\u0600-\u06FF\u0590-\u05FF\u0900-\u097F\u0980-\u09FF\u0E00-\u0E7F]+/.test(word)
    ).length;
    return cjkWords + jpKoWords + otherWords;
}

export function updateBookStats(
    stats: BookStats,
    chapters: ChapterNode[],
    chapterWords: Record<string, number>,
    editedChapterIds: string[] = [],
    now = new Date()
): BookStats {
    const totalWords = Object.values(chapterWords).reduce((sum, count) => sum + count, 0);
    // 没有基线的旧书籍先建立基线，导入、复制、排除和恢复章节不算写作。
    const addedWords = editedChapterIds.reduce((sum, id) => {
        const previous = stats.chapter_words?.[id];
        const current = chapterWords[id];
        return sum + (previous === undefined || current === undefined ? 0 : Math.max(0, current - previous));
    }, 0);
    const dailyWords = { ...stats.daily_words };
    const today = getLocalDateKey(now);
    if (addedWords > 0) dailyWords[today] = Math.max(0, dailyWords[today] || 0) + addedWords;
    // 保留历史记录；旧版的负净增量不用于写作天数和日均计算。
    const writingCounts = Object.values(dailyWords).filter(count => count > 0);
    const writingWords = writingCounts.reduce((sum, count) => sum + count, 0);
    return {
        ...stats,
        total_words: totalWords,
        chapter_words: Object.keys(chapterWords).reduce<Record<string, number>>((baseline, id) => {
            baseline[id] = editedChapterIds.length > 0 && !editedChapterIds.includes(id)
                ? (stats.chapter_words?.[id] ?? chapterWords[id]) : chapterWords[id];
            return baseline;
        }, {}),
        progress_by_words: stats.target_total_words > 0 ? totalWords / stats.target_total_words : 0,
        progress_by_chapter: chapters.length > 0
            ? chapters.filter(node => node.default_status === 'done').length / chapters.length : 0,
        daily_words: dailyWords,
        writing_days: writingCounts.length,
        average_daily_words: writingCounts.length > 0 ? Math.round(writingWords / writingCounts.length) : 0,
        last_writing_date: addedWords > 0 ? now.toISOString() : stats.last_writing_date,
        last_modified: now.toISOString()
    };
}
