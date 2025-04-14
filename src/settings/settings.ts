import { defaultTemplate } from '../templates/default';
import { ChapterTree } from '../types/book';
import { Locale } from '../i18n/i18n';
export interface BookSmithSettings {
    // 基础配置
    language: Locale;
    defaultAuthor: string;
    defaultBookPath: string;
    lastBookId?: string;

    // 模板配置
    templates: {
        default: string;
        custom: {
            [name: string]: {
                name: string;
                description: string;
                structure: ChapterTree;
                isBuiltin?: boolean;
            }
        }
    };

    // 工具显示配置
    tools: {
        assistant: boolean;      // 写作助手
        export: boolean;         // 导出发布
        community: boolean;      // 写作圈子
    };

    // 专注模式配置
    focus: {
        workDuration: number;      
        breakDuration: number;     
        wordGoal: number;            
        stats: {
            dailyStats: {
                [date: string]: {
                    interruptions: number;     
                    completedSessions: number; 
                    totalWords: number;        
                }
            }
        }
    }
}

export const DEFAULT_SETTINGS: BookSmithSettings = {
    language: 'zh-CN', // 默认中文
    defaultAuthor: 'Yeban',
    defaultBookPath: 'books',
    lastBookId: '',
    templates: {
        default: 'default',  // 修改为使用 standard 作为默认模板
        custom: {
            'default': {
                name: '默认模板',
                description: '包含前言、大纲、正文卷章和后记的标准结构',
                structure: defaultTemplate,
                isBuiltin: true
            }
        }
    },
    tools: {
        assistant: true,
        export: true,
        community: true
    },
    focus: {
        workDuration: 25,
        breakDuration: 5,
        wordGoal: 500,
        stats: { dailyStats: {} }
    }
};