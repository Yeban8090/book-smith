import {
    Translation,
    CommonTranslation,
    BookSmithViewTranslation,
    ToolViewTranslation,
    SettingsTranslation,
    ModalTranslation,
    ManagerTranslation,
    ToolbarModalTranslation,
    ComponentTranslation
} from '../interfaces';

// 通用翻译
const commonTranslation: CommonTranslation = {
    PLUGIN_NAME: 'BookSmith 书籍创作',
    SETTINGS: '设置',
    SAVE: '保存',
    CANCEL: '取消',
    HIDE: '隐藏',
    SHOW: '显示',
    OPEN_BOOK_PANEL: '打开书籍管理面板',
    OPEN_TOOL_PANEL: '打开工具面板',
    OPEN_ALL_PANELS: '打开所有面板',
};

// 书籍管理视图翻译
const bookSmithViewTranslation: BookSmithViewTranslation = {
    // 主界面
    BOOK_MANAGER: '书籍管理',
    NEW_BOOK: '新建',
    SWITCH_BOOK: '切换',
    MANAGE_BOOK: '管理',

    // 书籍相关
    BOOK_TITLE: '书名',
    BOOK_AUTHOR: '作者',
    BOOK_DESCRIPTION: '简介',
    BOOK_TAGS: '标签',
    BOOK_COVER: '封面',

    // 章节相关
    CHAPTER: '章节',
    ADD_CHAPTER: '添加章节',
    DELETE_CHAPTER: '删除章节',
    RENAME_CHAPTER: '重命名章节',

    // 统计相关
    STATS: '统计',
    WORD_COUNT: '字数',
    CHAPTER_COUNT: '章节数',

    // 帮助提示
    HELP_TOOLTIP: `👋 欢迎使用 BookSmith

🚀 开始使用
• 打开右侧【写作工具箱】，激活创作辅助功能
• 专注模式、统计分析、引用管理等工具一键可得

📚 创作管理
• 新建：选择模板创建书籍项目
• 切换：在不同作品间自由切换
• 管理：导入、编辑您的作品集
• 模板：自定义专属写作框架

📑 章节编排
• 树形结构：直观展现层次结构
• 拖拽排序：灵活调整章节顺序
• 状态标记：追踪创作进度
• 右键菜单：便捷的章节操作

⚡️ 创作助手
• 实时统计：字数、进度实时更新
• 数据分析：写作习惯深度统计
• 专注模式：提升写作效率

💡 小贴士
• 支持自定义多种写作模板
• 可通过拖拽快速调整章节
• 右键点击可进行更多操作

✨ 愿 BookSmith 能让您享受创作的美好时光。

💝 赞赏支持
如果 BookSmith 为您带来帮助，请前往
右侧写作工具箱【赞赏捐赠】，支持我继续创作优雅工具。`,

    // 通知消息
    SWITCHED_TO_BOOK: '已切换到《{title}》',
    IMPORTED_AND_SWITCHED: '已导入并切换到新书籍',
    CURRENT_BOOK_DELETED: '当前书籍已被删除',
    NO_BOOKS_TO_SWITCH: '暂无可切换的书籍',

    // 统计文本
    TODAY_WORDS: '今日字数',
    TOTAL_WORDS: '字数统计',
    CHAPTER_COMPLETION: '章节完成',
    WRITING_DAYS: '写作天数',
    AVERAGE_DAILY_WORDS: '日均字数',
    WORD_UNIT: '字',
    DAY_UNIT: '天',
    TEN_THOUSAND: '万',

    // 空状态提示
    WELCOME_MESSAGE: '👋 欢迎使用 BookSmith',
    EMPTY_STATE_HINT: '点击上方的"新建"创建作品，或使用"切换"按钮选择已有书籍'
};

// 工具箱视图翻译
const toolViewTranslation: ToolViewTranslation = {
    WRITING_TOOLBOX: '写作工具箱',

    // 写作助手
    WRITING_ASSISTANT: '写作助手',
    FOCUS_MODE: '专注模式',
    CREATIVE_INSPIRATION: '创作灵感',
    CHARACTER_PROFILES: '人物档案',
    WORLD_BUILDING: '世界构建',

    // 导出发布
    EXPORT_PUBLISH: '导出发布',
    DESIGN_TYPOGRAPHY: '设计排版',
    GENERATE_EBOOK: '生成电子书',
    MORE_FEATURES: '更多功能...',
    MORE_FEATURES_MESSAGE: '更多功能等你一起共创',

    // 写作圈子
    WRITING_COMMUNITY: '写作圈子',
    CREATIVE_COMMUNITY: '创作社区',
    CONTACT_AUTHOR: '联系作者',
    DONATE_SUPPORT: '赞助捐赠',

    // 面板设置
    PANEL_SETTINGS: '面板设置',
    FEATURE_COMING_SOON: '{feature}功能即将上线'
};

// 设置面板翻译
const settingsTranslation: SettingsTranslation = {

    PLUGIN_NAME: 'Book Smith',
    BASIC_OPTIONS: '基本选项',
    TEMPLATE_OPTIONS: '模板选项',
    WRITING_TOOLS_OPTIONS: '写作工具箱选项',

    // 基本设置
    LANGUAGE_SETTING: '语言',
    LANGUAGE_DESC: '选择插件界面语言 / Choose plugin language',
    DEFAULT_AUTHOR: '默认作者',
    DEFAULT_AUTHOR_DESC: '创建新书籍时的默认作者名',
    DEFAULT_AUTHOR_PLACEHOLDER: '输入默认作者名',
    BOOK_STORAGE_PATH: '书籍存储路径',
    BOOK_STORAGE_DESC: '新建书籍的默认存储路径',
    STORAGE_PATH_CHANGED: '存储路径已更改，请重启 Obsidian 或重新加载以使更改生效',

    // 模板设置
    DEFAULT_TEMPLATE: '默认模板',
    DEFAULT_TEMPLATE_DESC: '创建新书籍时使用的默认模板',
    BOOK_TEMPLATES: '书籍模板',
    ADD_NEW_TEMPLATE: '添加新模板',
    EDIT_TEMPLATE: '编辑模板',
    DELETE_TEMPLATE: '删除模板',
    DELETE_TEMPLATE_TITLE: '删除模板',
    DELETE_TEMPLATE_DESC: '确定要删除此模板吗？删除后无法恢复。',

    // 写作工具箱设置
    FOCUS_MODE_OPTIONS: '专注模式选项',
    FOCUS_DURATION: '专注时长',
    FOCUS_DURATION_DESC: '每个专注周期的工作时长（分钟）',
    BREAK_DURATION: '间隔时长',
    BREAK_DURATION_DESC: '每个专注周期后的休息时长（分钟）',
    WORD_GOAL: '字数目标',
    WORD_GOAL_DESC: '每个专注周期的目标字数'
};

// 模态框翻译
const modalTranslation: ModalTranslation = {
    // 通用
    COVER: '封面',
    COVER_DESC: '选择封面图片（可选）',
    BOOK_TITLE: '书名',
    BOOK_TITLE_DESC: '请输入书籍标题',
    BOOK_TITLE_PLACEHOLDER: '书名',
    SUBTITLE: '副标题',
    SUBTITLE_DESC: '可选',
    SUBTITLE_PLACEHOLDER: '副标题',
    TARGET_WORDS: '目标字数',
    TARGET_WORDS_DESC: '设置本书预计总字数：万字',
    TARGET_WORDS_PLACEHOLDER: '例如：20或20.0万',
    AUTHOR: '作者',
    AUTHOR_DESC: '请输入作者名称，多个作者用逗号分隔',
    AUTHOR_PLACEHOLDER: '作者',
    DESCRIPTION: '简介',
    DESCRIPTION_DESC: '请输入书籍简介',
    DESCRIPTION_PLACEHOLDER: '书籍简介',
    REQUIRED_FIELDS: '请填写必要信息',

    // CreateBookModal
    CREATE_BOOK_TITLE: '创建新书籍',
    BOOK_TEMPLATE: '模板',
    TEMPLATE_CHECK_DESC: '请选择书籍模板',
    SELECT_IMAGE: '选择图片',
    COVER_UPLOAD_SUCCESS: '封面上传成功',
    COVER_UPLOAD_FAILED: '封面上传失败：',
    CREATE: '创建',
    CREATE_SUCCESS: '书籍创建成功',
    CREATE_FAILED: '创建失败：',

    // EditBookModal
    EDIT_BOOK_TITLE: '编辑书籍',
    CHANGE_COVER: '更换封面',
    SELECT_COVER: '选择封面',
    COVER_UPDATE_SUCCESS: '封面更新成功',
    COVER_UPDATE_FAILED: '封面更新失败：',
    SAVE: '保存',
    SAVE_SUCCESS: '保存成功',
    SAVE_FAILED: '保存失败：',

    // ManageBooksModal
    MANAGE_BOOKS_TITLE: '管理书籍',
    SEARCH_BOOKS_PLACEHOLDER: '搜索书籍...',
    IMPORT_BOOK: '导入书籍',
    BOOK_AUTHOR_PREFIX: '作者：',
    BOOK_DESC_PREFIX: '\n简介：',
    BOOK_PROGRESS_PREFIX: '\n创作轨迹：',
    DELETE_BOOK: '删除',
    EDIT_BOOK: '编辑',
    DELETE_BOOK_TITLE: '删除书籍',
    DELETE_BOOK_DESC: '确定要删除《{title}》吗？\n此操作不可恢复。',
    DELETE_SUCCESS: '删除成功',
    DELETE_FAILED: '删除失败：',
    BOOKS_ROOT_NOT_FOUND: '书籍根目录不存在或无法访问',
    NO_UNIMPORTED_BOOKS: '没有找到未导入的书籍目录',
    DETECT_UNIMPORTED_FAILED: '检测未导入书籍失败：',
    IMPORT_SUCCESS: '成功导入书籍《{title}》',
    IMPORT_FAILED: '创建书籍配置失败：',

    // SwitchBookModal
    SWITCH_BOOK_TITLE: '切换书籍',
    SEARCH_BOOK_PLACEHOLDER: '搜索书籍...',
    BOOK_AUTHOR_LABEL: '作者',
    BOOK_PROGRESS_LABEL: '进度',
    BOOK_WORDCOUNT_LABEL: '字数',
    BOOK_LASTMOD_LABEL: '最后修改',
    SELECT_BOOK: '选择',

    // UnimportedBooksModal
    UNIMPORTED_BOOKS_TITLE: '选择要导入的书籍目录',
    NO_UNIMPORTED_FOLDERS: '没有找到未导入的书籍目录',
    CLOSE: '关闭',
    SEARCH_FOLDERS_PLACEHOLDER: '搜索目录...',
    NO_MATCHING_FOLDERS: '没有匹配的目录',
    IMPORT: '导入',
    SELECT_FOLDER_FIRST: '请先选择一个目录',

    // ReferenceModal
    REFERENCE_MODAL_TITLE: '添加引用内容',
    REFERENCE_CONTENT: '引用内容',
    REFERENCE_CONTENT_DESC: '请输入引用内容的详细信息',

    // ConfirmModal
    // NamePromptModal
    NAME_LABEL: '名称',
    CONFIRM: '确定',
    CANCEL: '取消',

    // TemplateEditModal
    TEMPLATE_EDIT_TITLE: '编辑模板',
    TEMPLATE_CREATE_TITLE: '新建模板',
    TEMPLATE_NAME: '模板名称',
    TEMPLATE_NAME_PLACEHOLDER: '请输入模板名称',
    TEMPLATE_DESC: '模板描述',
    TEMPLATE_DESC_PLACEHOLDER: '可描述模板的简要结构',
    TEMPLATE_STRUCTURE: '章节树',
    ADD_FILE: '添加文件',
    ADD_FOLDER: '添加文件夹',
    DELETE_FOLDER_CONFIRM: '确定要删除此文件夹及其所有内容吗？',
    NEW_CHAPTER: '新章节',
    NEW_DIRECTORY: '新目录',
    ENTER_NAME_PLACEHOLDER: '输入名称',
    TEMPLATE_NAME_REQUIRED: '请输入模板名称',
    TEMPLATE_NODE_REQUIRED: '请至少添加一个节点',
    TEMPLATE_NAME_EXISTS: '已存在同名模板，请修改模板名称',
    TEMPLATE_SAVE_SUCCESS: '模板保存成功',
    TEMPLATE_SAVE_FAILED: '保存模板失败，请查看控制台了解详情'
};

const managerTranslation: ManagerTranslation = {
    // BookManager 相关
    BOOK_EXISTS: '书籍已存在',
    BOOK_NOT_FOUND: '书籍不存在',
    BOOK_FOLDER_NOT_FOUND: '书籍文件夹不存在',
    SAVE_CONFIG_FAILED: '保存配置文件失败',
    IMPORT_BOOK_FAILED: '导入书籍失败',
    UNKNOWN_AUTHOR: '未知作者',

    // TemplateManager 相关
    TEMPLATE_TYPE_NOT_FOUND: '模板 "{type}" 不存在',
    TEMPLATE_EXISTS: '模板已存在',
    TEMPLATE_SAVE_FAILED: '保存模板失败',

    // FileManager 相关
    CREATE_FOLDER_FAILED: '创建文件夹失败',
    CREATE_FILE_FAILED: '创建文件失败',
    READ_FILE_FAILED: '读取文件失败',
    WRITE_FILE_FAILED: '写入文件失败',

    // FocusManager 相关
    BREAK_TIME_START: '休息时间开始',
    FOCUS_SUMMARY: '专注结束！\n完成时间：{duration}分钟\n中断次数：{interruptions}次\n本次字数：{words}',

    // ReferenceManager 相关
    REFERENCE_FILE_NAME: '引用书目.md',
    REFERENCE_FILE_NOT_FOUND: '请先在书籍目录下创建"引用书目.md"文件',
    REFERENCE_FILE_ERROR: '引用书目文件不存在或类型错误',
    SELECT_TEXT_TO_REFERENCE: '请选择要引用的文本',
    CHAPTER_INFO_ERROR: '无法获取当前章节信息',
    // ReferenceManager 菜单项
    EDIT_REFERENCE: '编辑当前引用',
    DELETE_REFERENCE: '删除当前引用',
    INSERT_REFERENCE: '插入新引用'
};
const toolbarModalTranslation: ToolbarModalTranslation = {
    // CommunityModal
    COMMUNITY_TITLE: '创作社区',
    COMMUNITY_INTRO: '加入亿万写作创作社区，与其他创作者交流，获取写作灵感和反馈。',
    FEATURE_SHARE_TITLE: '作品分享',
    FEATURE_SHARE_DESC: '分享你的创作，获取读者反馈',
    FEATURE_DISCUSS_TITLE: '创作交流',
    FEATURE_DISCUSS_DESC: '与其他创作者讨论写作技巧',
    FEATURE_CHALLENGE_TITLE: '写作挑战',
    FEATURE_CHALLENGE_DESC: '参与社区写作挑战，提升创作能力',
    JOIN_SECTION_TITLE: '加入方式',
    JOIN_SECTION_DESC: '复制下方公众号，搜索关注',
    OFFICIAL_ACCOUNT: '公众号：BilionWrites',
    COPY_ACCOUNT: '复制公众号',

    // ContactModal
    ABOUT_AUTHOR: '关于作者',
    AUTHOR_INTRO_1: '你好，我是【夜半】，一名全职写作与独立开发者。',
    AUTHOR_INTRO_2_1: '这款插件是',
    AUTHOR_INTRO_2_2: '我为了帮助在Obsidian中进行长篇创作的作者而开发的工具',
    AUTHOR_INTRO_2_3: '，希望能',
    AUTHOR_INTRO_2_4: '让你的写作过程更流畅，创作体验更愉悦',
    AUTHOR_INTRO_2_5: '。',
    AUTHOR_INTRO_3: '如果这款插件对你的写作有所帮助，或者你愿意支持我的独立开发与创作，欢迎请我喝咖啡☕。',
    AUTHOR_INTRO_4_1: '你的支持意义重大',
    AUTHOR_INTRO_4_2: '，它能让我更专注地开发更多实用工具，助力你的创作之旅。',
    DONATE_TEXT: '如需支持作者：',
    DONATE_BUTTON: '赞赏支持',
    MORE_INFO_TEXT: '如果你想了解更多关于写作、创作技巧的内容，或者关注我未来的作品动态，欢迎关注我的社交媒体。',
    CONTACT_TITLE: '联系方式：',
    CONTACT_WECHAT_OFFICIAL: '公众号',
    CONTACT_XIAOHONGSHU: '小红书',
    CONTACT_WECHAT: '微信',
    CONTACT_GITHUB: 'GitHub',
    COPY_SUCCESS: '{type}已复制到剪贴板',
    COPY_FAILED: '复制失败，请手动复制：{value}',

    // DonateModal
    DONATE_MODAL_TITLE: '笔墨有情',
    COMMUNITY_STATS_TITLE: '社区数据',
    COMMUNITY_STATS_USERS: '已有 1200+ 用户，32位支持者',
    COMMUNITY_STATS_WORDS: '平均每天创作 5000+ 字',

    DONATE_AMOUNT_COFFEE: '暖心咖啡',
    DONATE_AMOUNT_CHAPTER: '章节赞助',
    DONATE_AMOUNT_FEATURE: '功能共建',
    DONATE_FEEDBACK_COFFEE: '感谢您的咖啡赞助！',
    DONATE_FEEDBACK_CHAPTER: '给您一次新功能投票权',
    DONATE_FEEDBACK_FEATURE: '邀请您加入内测社群，公众号链接我',

    PAYMENT_WECHAT: '微信赞赏',
    PAYMENT_ALIPAY: '支付宝赞赏',
    PAYMENT_KOFI: 'Ko-fi 赞赏',
    CURRENCY_UNIT: '元'
};

const componentTranslation: ComponentTranslation = {
    // ChapterTree
    NEW_FILE: '新建文件',
    NEW_FOLDER: '新建文件夹',
    ENTER_FILE_NAME: '请输入文件名',
    ENTER_FOLDER_NAME: '请输入文件夹名',
    OPEN_IN_NEW_TAB: '在新标签页中打开',
    OPEN_IN_NEW_PANE: '在新标签组中打开',
    MARK_AS_COMPLETE: '标记完成章节',
    MARK_AS_DRAFT: '标记重新创作',
    EXCLUDE_FROM_STATS: '排除在统计与导出外',
    INCLUDE_IN_STATS: '包含在统计与导出中',
    CREATE_COPY: '创建副本',
    COPY_NAME: '{name} 副本',
    RENAME: '重命名',
    DELETE: '删除',
    DELETE_FILE_TITLE: '删除文件',
    DELETE_FILE_DESC: '确定要删除文件 "{title}" 吗？\n它将被移动到系统回收站。',
    DELETE_FOLDER_TITLE: '删除文件夹',
    DELETE_FOLDER_DESC: '确定要删除文件夹 "{title}" 及其所有内容吗？\n它们将被移动到系统回收站。',
    COPY_SUCCESS: '创建副本成功',
    COPY_FAILED: '创建副本失败: {error}',
    RENAME_SUCCESS: '重命名成功',
    RENAME_FAILED: '重命名失败: {error}',
    DELETE_SUCCESS: '删除成功',
    DELETE_FAILED: '删除失败: {error}',
    MOVE_FAILED: '移动失败',
    SOURCE_NOT_FOUND: '源文件不存在',
    TARGET_EXISTS: '目标位置已存在同名文件',
    TARGET_FOLDER_NOT_FOUND: '目标文件夹不存在',
    EXCLUDED_NOTICE: '已将"{title}"排除',
    INCLUDED_NOTICE: '已将"{title}"包含',
    ENTER_NEW_NAME: '请输入新名称',

    // FocusToolView
    FOCUS_MODE: '专注模式',
    START_FOCUS: '开始专注',
    EXIT: '退出',
    FOCUS_SESSIONS: '专注次数',
    INTERRUPTIONS: '中断次数',
    CURRENT_WORDS: '当前字数',
    WORD_GOAL: '目标字数',
    TOTAL_FOCUS_WORDS: '专注总字数',
    PAUSE: '暂停',
    RESUME: '继续',
    END: '结束',
    ENCOURAGEMENT_1: '🎉 太棒了！已达到目标字数！继续保持～',
    ENCOURAGEMENT_2: '✨ 厉害！目标达成！让我们继续前进！',
    ENCOURAGEMENT_3: '🌟 完美！达到目标了！保持这份热情！',
    ENCOURAGEMENT_4: '🎯 目标达成！你的坚持值得表扬！',
    ENCOURAGEMENT_5: '💪 出色的表现！目标完成！再接再厉！',
    EXIT_FOCUS: '退出专注',
    EXIT_FOCUS_DESC: '确定要退出专注吗？当前专注进度将会丢失。',
    END_FOCUS: '结束专注',
    END_FOCUS_DESC: '确定要结束专注吗？这将计入中断次数。',
    FOCUSING: '专注中',
    PAUSED: '已暂停',
    BREAK_TIME: '休息时间',
    READY_TO_START: '准备开始'
};

// 合并所有翻译
const translation: Translation = {
    ...commonTranslation,
    ...bookSmithViewTranslation,
    ...toolViewTranslation,
    ...settingsTranslation,
    ...modalTranslation,
    ...managerTranslation,
    ...toolbarModalTranslation,
   ...componentTranslation
};

export default translation;

