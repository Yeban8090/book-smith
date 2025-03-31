export interface Reference {
    id: string;          // 改为 string 类型，用于存储随机生成的唯一标识符
    text: string;        // 引用的原文
    content: string;     // 引用的内容（可能包含注释等）
    createTime: string;  // 创建时间
    order: number;       // 在章节内的序号
}

export interface ChapterReferences {
    chapterId: string;    // 章节ID
    chapterTitle: string; // 章节标题
    references: Reference[];
}

export interface ReferenceData {
    chapters: ChapterReferences[];
}