// 书籍基本信息
export interface BookBasicInfo {
    title: string;                // 书名
    subtitle?: string;            // 副标题
    author: string[];            // 作者（支持多作者）
    cover?: string;              // 封面图片路径
    desc?: string;               // 书籍简介
    uuid: string;                // 唯一标识符
    created_at: string;          // 创建时间
}

// 章节节点结构
export interface ChapterNode {
    id: string;                  // 章节唯一ID
    title: string;               // 章节标题
    type: 'file' | 'group';      // 节点类型：文件或文件夹
    path: string;                // 节点的相对路径
    order: number;               // 排序序号
    children?: ChapterNode[];    // 子节点（仅文件夹类型有）
    default_status: 'draft' | 'editing' | 'done';  // 新建章节默认状态
    is_expanded?: boolean;       // 文件夹展开状态
    created_at: string;          // 创建时间
    last_modified: string;       // 最后修改时间
}

// 章节树结构
export interface ChapterTree {
    tree: ChapterNode[];         // 章节树
}

// 书籍统计信息
export interface BookStats {
    // 基础统计
    total_words: number;         // 当前总字数
    target_total_words: number;  // 目标总字数
    
    // 进度统计
    progress_by_words: number;   // 总字数进度
    progress_by_chapter: number; // 章节完成进度
    
    // 写作统计
    daily_words: Record<string, number>;  // 每日写作字数记录
    writing_days: number;        // 总写作天数
    average_daily_words: number; // 平均每日字数
    last_writing_date: string;   // 上次写作日期
    last_modified: string;       // 最后修改时间
}

// 导出配置
export interface BookExportConfig {
    default_format: string;      // 默认导出格式
    template: string;            // 导出模板
    include_cover: boolean;      // 是否包含封面
}

// 完整书籍结构
export interface Book {
    basic: BookBasicInfo;        // 基本信息
    structure: ChapterTree;      // 结构信息
    stats: BookStats;            // 统计信息
    export: BookExportConfig;    // 导出配置
}