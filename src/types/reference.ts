export interface Reference {
    id: number;
    text: string;
    content: string;
    createTime: string;
}

export interface ReferenceData {
    nextId: number;
    items: Reference[];
}