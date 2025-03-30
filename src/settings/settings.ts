export interface BookSmithSettings {
    // 基础配置
    defaultAuthor: string;
    defaultBookPath: string;
    lastBookId?: string;

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
    defaultAuthor: '夜半',
    defaultBookPath: 'books',
    lastBookId: '',
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