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
    orderPath: number[];  // 章节的排序路径，例如 [1,2] 表示第一章第二节
    references: Reference[];
}

export interface ReferenceData {
    chapters: ChapterReferences[];
}