export interface Reference {
    id: number;
    text: string;
    content: string;
    createTime: string;
    order: number;        // 在章节内的序号
}

export interface ChapterReferences {
    chapterId: string;    // 章节ID
    chapterTitle: string; // 章节标题
    references: Reference[];
}

export interface ReferenceData {
    nextId: number;
    chapters: ChapterReferences[];
}