// 书籍管理视图翻译接口
export interface BookSmithViewTranslation {
    // 主界面
    BOOK_MANAGER: string;
    NEW_BOOK: string;
    SWITCH_BOOK: string;
    MANAGE_BOOK: string;
    
    // 书籍相关
    BOOK_TITLE: string;
    BOOK_AUTHOR: string;
    BOOK_DESCRIPTION: string;
    BOOK_TAGS: string;
    BOOK_COVER: string;
    
    // 章节相关
    CHAPTER: string;
    ADD_CHAPTER: string;
    DELETE_CHAPTER: string;
    RENAME_CHAPTER: string;
    
    // 统计相关
    STATS: string;
    WORD_COUNT: string;
    CHAPTER_COUNT: string;
    
    // 帮助提示
    HELP_TOOLTIP: string;
    
    // 通知消息
    SWITCHED_TO_BOOK: string;
    IMPORTED_AND_SWITCHED: string;
    CURRENT_BOOK_DELETED: string;
    NO_BOOKS_TO_SWITCH: string;
    
    // 统计文本
    TODAY_WORDS: string;
    TOTAL_WORDS: string;
    CHAPTER_COMPLETION: string;
    WRITING_DAYS: string;
    AVERAGE_DAILY_WORDS: string;
    WORD_UNIT: string;
    DAY_UNIT: string;
    TEN_THOUSAND: string;
    
    // 空状态提示
    WELCOME_MESSAGE: string;
    EMPTY_STATE_HINT: string;
}