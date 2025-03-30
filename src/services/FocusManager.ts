import { MarkdownView, Notice } from 'obsidian';
import BookSmithPlugin from '../main';

export interface FocusStats {
    interruptions: number;     // 中断次数
    completedSessions: number; // 完成的专注次数
    totalWords: number;        // 总字数
}

export enum FocusState {
    IDLE = 'idle',
    WORKING = 'working',
    BREAK = 'break',
    PAUSED = 'paused'
}

export class FocusManager {
    private timer: number | null = null;
    private startTime: number = 0;
    private remainingTime: number = 0;
    private state: FocusState = FocusState.IDLE;
    private stats: FocusStats = {
        interruptions: 0,
        completedSessions: 0,
        totalWords: 0
    };
    private updateListeners: Array<() => void> = [];

    // 字数统计相关
    private currentWords: number = 0;
    private lastContent: string = '';
    private activeLeafHandler: (() => void) | null = null;
    private modifyHandler: ((file: any) => void) | null = null;

    constructor(private plugin: BookSmithPlugin) {
        this.loadTodayStats();
    }

    // =============== 状态管理方法 ===============
    getState(): FocusState {
        return this.state;
    }

    getStats(): FocusStats {
        return { ...this.stats };
    }

    getCurrentWords(): number {
        return this.currentWords;
    }

    getCurrentTime(): { minutes: number; seconds: number; progress: number } {
        const minutes = Math.floor(this.remainingTime / 60);
        const seconds = this.remainingTime % 60;
        const totalTime = this.state === FocusState.BREAK 
            ? this.plugin.settings.focus.breakDuration * 60 
            : this.plugin.settings.focus.workDuration * 60;
        
        const progress = this.state === FocusState.PAUSED
            ? 1 - (this.remainingTime / totalTime)
            : Math.max(0, Math.min(1, 1 - (this.remainingTime / totalTime)));

        return { minutes, seconds, progress };
    }

    // =============== 专注控制方法 ===============
    startFocus(): void {
        if (this.state !== FocusState.IDLE) return;

        this.setupWordCounter();
        this.state = FocusState.WORKING;
        this.startTime = Date.now();
        this.remainingTime = this.plugin.settings.focus.workDuration * 60;
        this.startTimer();
        this.notifyUpdate();
    }

    pauseFocus(): void {
        if (this.state !== FocusState.WORKING) return;
        this.state = FocusState.PAUSED;
        this.clearTimer();
        this.notifyUpdate();
    }

    resumeFocus(): void {
        if (this.state !== FocusState.PAUSED) return;
        this.state = FocusState.WORKING;
        this.startTimer();
        this.notifyUpdate();
    }

    endFocus(): void {
        if (this.state === FocusState.IDLE) return;
    
        this.clearTimer();
        if (this.state !== FocusState.BREAK) {
            this.stats.interruptions++;
            this.updateTotalWords();
        }
        
        this.removeWordCounter();
        this.state = FocusState.IDLE;
        this.saveStats();
        this.showSummary();
        this.notifyUpdate();
    }

    // =============== 统计管理方法 ===============
    private updateTotalWords(): void {
        if (this.currentWords > 0) {
            this.stats.totalWords += this.currentWords;
            this.saveStats();
        }
    }

    private loadTodayStats(): void {
        const today = new Date().toISOString().split('T')[0];
        const dailyStats = this.plugin.settings.focus.stats?.dailyStats[today];
        
        this.stats = dailyStats ? { ...dailyStats } : {
            interruptions: 0,
            completedSessions: 0,
            totalWords: 0
        };
    }

    private saveStats(): void {
        const today = new Date().toISOString().split('T')[0];
        if (!this.plugin.settings.focus.stats) {
            this.plugin.settings.focus.stats = { dailyStats: {} };
        }
        this.plugin.settings.focus.stats.dailyStats[today] = { ...this.stats };
        this.plugin.saveSettings();
    }

    // =============== 字数统计方法 ===============
    private setupWordCounter(): void {
        this.lastContent = '';
        this.currentWords = 0;
        
        this.activeLeafHandler = () => {
            const activeView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
            if (activeView) {
                this.lastContent = activeView.editor.getValue();
            }
        };

        this.modifyHandler = (file: any) => {
            const activeFile = this.plugin.app.workspace.getActiveFile();
            const activeView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);

            if (!activeFile || !activeView || file !== activeFile) return;
            
            const content = activeView.editor.getValue();
            const wordDiff = this.getWordDiff(this.lastContent, content);
            this.currentWords += wordDiff;
            this.lastContent = content;
            this.notifyUpdate();
        };

        this.plugin.app.workspace.on('active-leaf-change', this.activeLeafHandler);
        this.plugin.app.vault.on('modify', this.modifyHandler);
    }

    private removeWordCounter(): void {
        if (this.activeLeafHandler) {
            this.plugin.app.workspace.off('active-leaf-change', this.activeLeafHandler);
            this.activeLeafHandler = null;
        }
        if (this.modifyHandler) {
            this.plugin.app.vault.off('modify', this.modifyHandler);
            this.modifyHandler = null;
        }
        this.currentWords = 0;
        this.lastContent = '';
    }

    private getWordDiff(oldText: string, newText: string): number {
        const oldCount = this.countWords(oldText);
        const newCount = this.countWords(newText);
        return newCount - oldCount;
    }

    private countWords(text: string): number {
        const cleanText = text.replace(
            /(```[\s\S]*?```)|(`.*?`)|(\[.*?\]\(.*?\))|(\*\*.*?\*\*)|(\*.*?\*)|(\n>)|(^\s*[-+*]\s)|(^\s*\d+\.\s)|(\!\[.*?\]\(.*?\))/gm,
            ''
        );

        let chineseCount = 0;
        for (let i = 0; i < cleanText.length; i++) {
            if (cleanText.charCodeAt(i) >= 0x4e00 && cleanText.charCodeAt(i) <= 0x9fa5) {
                chineseCount++;
            }
        }

        const words = cleanText
            .replace(/[\u4e00-\u9fa5]/g, '')
            .trim()
            .split(/\s+/);
        const englishCount = words[0] === '' ? 0 : words.length;

        return chineseCount + englishCount;
    }

    // =============== 定时器管理方法 ===============
    private startTimer(): void {
        this.clearTimer();
        this.timer = window.setInterval(() => {
            this.remainingTime--;
            this.notifyUpdate();

            if (this.remainingTime <= 0) {
                if (this.state === FocusState.WORKING) {
                    this.startBreak();
                } else if (this.state === FocusState.BREAK) {
                    this.endFocus();
                }
            }
        }, 1000);
    }

    private clearTimer(): void {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    private startBreak(): void {
        this.stats.completedSessions++;
        this.updateTotalWords();
        this.saveStats();
        
        this.state = FocusState.BREAK;
        this.remainingTime = this.plugin.settings.focus.breakDuration * 60;
        this.startTimer();
        new Notice('休息时间开始');
        this.notifyUpdate();
    }

    // =============== 事件监听方法 ===============
    onUpdate(callback: () => void): void {
        this.updateListeners.push(callback);
    }

    removeUpdateListener(callback: () => void): void {
        this.updateListeners = this.updateListeners.filter(fn => fn !== callback);
    }

    private notifyUpdate(): void {
        this.updateListeners.forEach(callback => callback());
    }

    // =============== 工具方法 ===============
    private debounce<T extends (...args: any[]) => any>(
        func: T,
        wait: number
    ): (...args: Parameters<T>) => void {
        let timeout: number | null = null;
        
        return (...args: Parameters<T>) => {
            if (timeout) {
                window.clearTimeout(timeout);
            }
            timeout = window.setTimeout(() => {
                func.apply(this, args);
                timeout = null;
            }, wait);
        };
    }

    private showSummary(): void {
        const summary = `专注结束！\n完成时间：${this.plugin.settings.focus.workDuration}分钟\n中断次数：${this.stats.interruptions}次\n本次字数：${this.currentWords}`;
        new Notice(summary);
    }
}