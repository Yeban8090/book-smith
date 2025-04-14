import { ChapterTree } from '../types/book';

export const defaultTemplate: ChapterTree = {
    tree: [
        {
            id: 'preface',
            title: '前言',
            type: 'file',
            path: '前言.md',
            order: 0,
            default_status: 'draft',
            created_at: new Date().toISOString(),
            last_modified: new Date().toISOString()
        },
        {
            id: 'outline',
            title: '大纲',
            type: 'file',
            path: '大纲.md',
            order: 1,
            default_status: 'draft',
            created_at: new Date().toISOString(),
            last_modified: new Date().toISOString()
        },
        {
            id: 'volume1',
            title: '第一卷',
            type: 'group',
            path: '第一卷',
            order: 2,
            default_status: 'draft',
            is_expanded: true,  // 默认展开第一卷
            created_at: new Date().toISOString(),
            last_modified: new Date().toISOString(),
            children: [
                {
                    id: 'chapter1',
                    title: '第一章',
                    type: 'file',
                    path: '第一卷/第一章.md',
                    order: 0,
                    default_status: 'draft',
                    created_at: new Date().toISOString(),
                    last_modified: new Date().toISOString()
                },
                {
                    id: 'chapter2',
                    title: '第二章',
                    type: 'file',
                    path: '第一卷/第二章.md',
                    order: 1,
                    default_status: 'draft',
                    created_at: new Date().toISOString(),
                    last_modified: new Date().toISOString()
                }
            ]
        },
        {
            id: 'afterword',
            title: '后记',
            type: 'file',
            path: '后记.md',
            order: 3,
            default_status: 'draft',
            created_at: new Date().toISOString(),
            last_modified: new Date().toISOString()
        }
    ]
};