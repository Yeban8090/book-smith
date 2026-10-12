import assert from 'node:assert/strict';
import { App, TFile, TFolder } from 'obsidian';
import { Book, BookStats, ChapterNode } from '../src/types/book';
import { getLocalDateKey } from '../src/utils/dateUtils';
import { calculateWordCount, getIncludedChapters, updateBookStats } from '../src/utils/bookStats';
import { BookManager } from '../src/services/BookManager';
import { BookStatsManager } from '../src/services/BookStatsManager';
import { DEFAULT_SETTINGS } from '../src/settings/settings';
import type BookSmithPlugin from '../src/main';

const chapter = (id: string, status: 'draft' | 'done' = 'draft'): ChapterNode => ({
    id, title: id, type: 'file', path: `${id}.md`, order: 1,
    default_status: status, created_at: '', last_modified: ''
});
const emptyStats = (): BookStats => ({
    total_words: 0, target_total_words: 100, progress_by_words: 0, progress_by_chapter: 0,
    daily_words: {}, writing_days: 0, average_daily_words: 0,
    last_writing_date: '', last_modified: ''
});

export async function run() {
    const now = new Date('2026-10-11T16:30:00Z');
    assert.equal(getLocalDateKey(now), '2026-10-12');
    assert.equal(calculateWordCount('## 你好 world **hello**'), 4);
    const a = chapter('a', 'done');
    const b = chapter('b');
    const tree: ChapterNode[] = [a, {
        ...chapter('group'), type: 'group', exclude: true, children: [b]
    }];
    assert.deepEqual(getIncludedChapters(tree).map(node => node.id), ['a']);

    let stats = updateBookStats(emptyStats(), [a], { a: 10 }, [], now);
    assert.equal(stats.total_words, 10);
    assert.deepEqual(stats.daily_words, {}); // 导入先建立基线
    stats = updateBookStats(stats, [a], { a: 15 }, ['a'], now);
    assert.equal(stats.daily_words['2026-10-12'], 5);
    const writingDate = stats.last_writing_date;
    stats = updateBookStats(stats, [a], { a: 8 }, ['a'], now);
    assert.equal(stats.total_words, 8);
    assert.equal(stats.daily_words['2026-10-12'], 5); // 删除不扣写作量
    assert.equal(stats.last_writing_date, writingDate);
    stats = updateBookStats(stats, [a], { a: 10 }, ['a'], now);
    assert.equal(stats.daily_words['2026-10-12'], 7);
    stats = updateBookStats(stats, [], {}, [], now);
    assert.equal(stats.total_words, 0);
    assert.equal(stats.progress_by_chapter, 0);
    assert.equal(stats.average_daily_words, 7); // 排除章节不改变历史日均
    stats = updateBookStats(stats, [a, b], { a: 10, b: 50 }, [], now);
    assert.equal(stats.progress_by_chapter, 0.5);
    assert.equal(stats.daily_words['2026-10-12'], 7); // 恢复/复制不算写作
    stats = updateBookStats(stats, [a, b], { a: 12, b: 53 }, ['a'], now);
    stats = updateBookStats(stats, [a, b], { a: 12, b: 53 }, ['b'], now);
    assert.equal(stats.daily_words['2026-10-12'], 12); // 两个文件连续事件不丢增量

    // 实际保存链路：章节结构保存自动重算；旧界面 stats 不覆盖已保存的写作记录。
    const root = Object.assign(new TFolder(), { path: 'books', children: [] as TFolder[] });
    const folder = Object.assign(new TFolder(), { path: 'books/test' });
    root.children.push(folder);
    const config = Object.assign(new TFile(), { path: 'books/test/book-config.json' });
    const file = Object.assign(new TFile(), { path: 'books/test/a.md' });
    const files = new Map<string, TFile | TFolder>([
        [root.path, root], [folder.path, folder], [config.path, config], [file.path, file]
    ]);
    const book: Book = {
        basic: { uuid: 'test', title: 'test', author: [], created_at: now.toISOString() },
        structure: { tree: [a] }, stats: emptyStats(),
        export: { default_format: 'pdf', template: 'default', include_cover: true }
    };
    const content = new Map([[config.path, JSON.stringify(book)], [file.path, '一二三']]);
    const app = { vault: {
        getAbstractFileByPath: (path: string) => files.get(path),
        read: async (target: TFile) => content.get(target.path) || '',
        modify: async (target: TFile, value: string) => { content.set(target.path, value); }
    } } as unknown as App;
    const settings = { ...DEFAULT_SETTINGS };
    const manager = new BookManager(app, settings);
    new BookStatsManager(app, { settings } as BookSmithPlugin, manager);
    let saved = await manager.updateBook('test', {});
    assert.equal(saved.stats.total_words, 3);
    content.set(file.path, '一二三四五');
    saved = await manager.updateBook('test', {}, file.path);
    const today = getLocalDateKey();
    assert.equal(saved.stats.daily_words[today], 2);
    saved = await manager.updateBook('test', {
        structure: { tree: [{ ...a, exclude: true }] }, stats: book.stats
    });
    assert.equal(saved.stats.total_words, 0);
    assert.equal(saved.stats.daily_words[today], 2);
    saved = await manager.updateBook('test', { structure: { tree: [a, b] } });
    assert.equal(saved.stats.total_words, 5);
    assert.equal(saved.stats.daily_words[today], 2);
    saved = await manager.updateBook('test', { structure: { tree: [] } });
    assert.equal(saved.stats.total_words, 0);
    assert.equal(saved.stats.progress_by_chapter, 0);
    console.log('Statistics regression checks OK');
}
