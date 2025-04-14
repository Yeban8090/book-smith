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
    PLUGIN_NAME: 'BookSmith',
    SETTINGS: 'Settings',
    SAVE: 'Save',
    CANCEL: 'Cancel',
    HIDE: 'Hide',
    SHOW: 'Show',

    OPEN_BOOK_PANEL: 'Open Book Panel',
    OPEN_TOOL_PANEL: 'Open Tool Panel',
    OPEN_ALL_PANELS: 'Open All Panels',
};

// 书籍管理视图翻译
const bookSmithViewTranslation: BookSmithViewTranslation = {
    // 主界面
    BOOK_MANAGER: 'Book Manager',
    NEW_BOOK: 'New',
    SWITCH_BOOK: 'Switch',
    MANAGE_BOOK: 'Manage',

    // 书籍相关
    BOOK_TITLE: 'Title',
    BOOK_AUTHOR: 'Author',
    BOOK_DESCRIPTION: 'Description',
    BOOK_TAGS: 'Tags',
    BOOK_COVER: 'Cover',

    // 章节相关
    CHAPTER: 'Chapter',
    ADD_CHAPTER: 'Add Chapter',
    DELETE_CHAPTER: 'Delete Chapter',
    RENAME_CHAPTER: 'Rename Chapter',

    // 统计相关
    STATS: 'Statistics',
    WORD_COUNT: 'Word Count',
    CHAPTER_COUNT: 'Chapter Count',

    // 帮助提示
    HELP_TOOLTIP: `👋 Welcome to BookSmith

🚀 Getting Started
• Open the Writing Toolbox on the right to activate writing assistance
• Access Focus Mode, Statistics, Reference Management with one click

📚 Book Management
• Create: Choose templates to create book projects
• Switch: Freely switch between different works
• Manage: Import and edit your collection
• Templates: Customize your writing framework

📑 Chapter Organization
• Tree Structure: Visualize your book hierarchy
• Drag & Drop: Flexibly adjust chapter order
• Status Markers: Track writing progress
• Context Menu: Convenient chapter operations

⚡️ Writing Assistant
• Real-time Stats: Word count and progress updates
• Data Analysis: In-depth writing habit statistics
• Focus Mode: Improve writing efficiency

💡 Tips
• Support for custom writing templates
• Quickly adjust chapters via drag & drop
• Right-click for more operations

✨ May BookSmith bring joy to your creative journey.

💝 Support
If BookSmith helps you, please consider supporting
the developer via the "Donate" button in the Writing Toolbox.`,

    // 通知消息
    SWITCHED_TO_BOOK: 'Switched to "{title}"',
    IMPORTED_AND_SWITCHED: 'Imported and switched to new book',
    CURRENT_BOOK_DELETED: 'Current book has been deleted',
    NO_BOOKS_TO_SWITCH: 'No books available to switch',

    // 统计文本
    TODAY_WORDS: 'Today',
    TOTAL_WORDS: 'Total Words',
    CHAPTER_COMPLETION: 'Completion',
    WRITING_DAYS: 'Writing Days',
    AVERAGE_DAILY_WORDS: 'Daily Average',
    WORD_UNIT: ' words',
    DAY_UNIT: ' days',
    TEN_THOUSAND: 'K',

    // 空状态提示
    WELCOME_MESSAGE: '👋 Welcome to BookSmith',
    EMPTY_STATE_HINT: 'Click "New Book" above to create a work, or use the "Switch" button to select an existing book'
};

// 工具箱视图翻译
const toolViewTranslation: ToolViewTranslation = {
    WRITING_TOOLBOX: 'Writing Toolbox',

    // 写作助手
    WRITING_ASSISTANT: 'Writing Assistant',
    FOCUS_MODE: 'Focus Mode',
    CREATIVE_INSPIRATION: 'Creative Inspiration',
    CHARACTER_PROFILES: 'Character Profiles',
    WORLD_BUILDING: 'World Building',

    // 导出发布
    EXPORT_PUBLISH: 'Export & Publish',
    DESIGN_TYPOGRAPHY: 'Design & Typography',
    GENERATE_EBOOK: 'Generate E-book',
    MORE_FEATURES: 'More Features...',
    MORE_FEATURES_MESSAGE: 'More features coming with your participation',

    // 写作圈子
    WRITING_COMMUNITY: 'Writing Community',
    CREATIVE_COMMUNITY: 'Creative Community',
    CONTACT_AUTHOR: 'Contact Author',
    DONATE_SUPPORT: 'Donate & Support',

    // 面板设置
    PANEL_SETTINGS: 'Panel Settings',
    FEATURE_COMING_SOON: '{feature} feature coming soon'
};

// 设置面板翻译
const settingsTranslation: SettingsTranslation = {
    SETTINGS_TITLE: 'Book Smith Settings',
    BASIC_SETTINGS: 'Basic Settings',
    TEMPLATE_SETTINGS: 'Template Settings',
    WRITING_TOOLS_SETTINGS: 'Writing Tools Settings',

    // Basic Settings
    LANGUAGE_SETTING: 'Language',
    LANGUAGE_DESC: 'Choose plugin language / 选择插件界面语言',
    DEFAULT_AUTHOR: 'Default Author',
    DEFAULT_AUTHOR_DESC: 'Default author name for new books',
    DEFAULT_AUTHOR_PLACEHOLDER: 'Enter default author name',
    BOOK_STORAGE_PATH: 'Book Storage Path',
    BOOK_STORAGE_DESC: 'Default storage path for new books',
    STORAGE_PATH_CHANGED: 'Storage path changed, please restart Obsidian or reload for changes to take effect',

    // Template Settings
    DEFAULT_TEMPLATE: 'Default Template',
    DEFAULT_TEMPLATE_DESC: 'Default template used when creating new books',
    BOOK_TEMPLATES: 'Book Templates',
    ADD_NEW_TEMPLATE: 'Add New Template',
    EDIT_TEMPLATE: 'Edit Template',
    DELETE_TEMPLATE: 'Delete Template',
    DELETE_TEMPLATE_TITLE: 'Delete Template',
    DELETE_TEMPLATE_DESC: 'Are you sure you want to delete this template? This action cannot be undone.',

    // Writing Tools Settings
    FOCUS_MODE_SETTINGS: 'Focus Mode Settings',
    FOCUS_DURATION: 'Focus Duration',
    FOCUS_DURATION_DESC: 'Work duration for each focus session (minutes)',
    BREAK_DURATION: 'Break Duration',
    BREAK_DURATION_DESC: 'Break duration after each focus session (minutes)',
    WORD_GOAL: 'Word Goal',
    WORD_GOAL_DESC: 'Target word count for each focus session'
};

// 模态框翻译
const modalTranslation: ModalTranslation = {
    // Common
    COVER: 'Cover',
    COVER_DESC: 'Select cover image (optional)',
    BOOK_TITLE: 'Title',
    BOOK_TITLE_DESC: 'Please enter book title',
    BOOK_TITLE_PLACEHOLDER: 'Book title',
    SUBTITLE: 'Subtitle',
    SUBTITLE_DESC: 'Optional',
    SUBTITLE_PLACEHOLDER: 'Subtitle',
    TARGET_WORDS: 'Target Word Count',
    TARGET_WORDS_DESC: 'Set estimated total word count (in 10k)',
    TARGET_WORDS_PLACEHOLDER: 'e.g., 20 or 20.0',
    AUTHOR: 'Author',
    AUTHOR_DESC: 'Enter author names, separate multiple authors with commas',
    AUTHOR_PLACEHOLDER: 'Author',
    DESCRIPTION: 'Description',
    DESCRIPTION_DESC: 'Please enter book description',
    DESCRIPTION_PLACEHOLDER: 'Book description',
    REQUIRED_FIELDS: 'Please fill in required fields',

    // CreateBookModal
    CREATE_BOOK_TITLE: 'Create New Book',
    BOOK_TEMPLATE: 'Template',
    TEMPLATE_CHECK_DESC: 'Please select a book template',
    SELECT_IMAGE: 'Select Image',
    COVER_UPLOAD_SUCCESS: 'Cover uploaded successfully',
    COVER_UPLOAD_FAILED: 'Cover upload failed: ',
    CREATE: 'Create',
    CREATE_SUCCESS: 'Book created successfully',
    CREATE_FAILED: 'Creation failed: ',

    // EditBookModal
    EDIT_BOOK_TITLE: 'Edit Book',
    CHANGE_COVER: 'Change Cover',
    SELECT_COVER: 'Select Cover',
    COVER_UPDATE_SUCCESS: 'Cover updated successfully',
    COVER_UPDATE_FAILED: 'Failed to update cover: ',
    SAVE: 'Save',
    SAVE_SUCCESS: 'Saved successfully',
    SAVE_FAILED: 'Save failed: ',

    // ManageBooksModal
    MANAGE_BOOKS_TITLE: 'Manage Books',
    SEARCH_BOOKS_PLACEHOLDER: 'Search books...',
    IMPORT_BOOK: 'Import Book',
    BOOK_AUTHOR_PREFIX: 'Author: ',
    BOOK_DESC_PREFIX: '\nDescription: ',
    BOOK_PROGRESS_PREFIX: '\nProgress: ',
    DELETE_BOOK: 'Delete',
    EDIT_BOOK: 'Edit',
    DELETE_BOOK_TITLE: 'Delete Book',
    DELETE_BOOK_DESC: 'Are you sure you want to delete "{title}"?\nThis action cannot be undone.',
    DELETE_SUCCESS: 'Deleted successfully',
    DELETE_FAILED: 'Delete failed: ',
    BOOKS_ROOT_NOT_FOUND: 'Books root directory does not exist or is inaccessible',
    NO_UNIMPORTED_BOOKS: 'No unimported book directories found',
    DETECT_UNIMPORTED_FAILED: 'Failed to detect unimported books: ',
    IMPORT_SUCCESS: 'Successfully imported book "{title}"',
    IMPORT_FAILED: 'Failed to create book configuration: ',

    // SwitchBookModal
    SWITCH_BOOK_TITLE: 'Switch Book',
    SEARCH_BOOK_PLACEHOLDER: 'Search books...',
    BOOK_AUTHOR_LABEL: 'Author',
    BOOK_PROGRESS_LABEL: 'Progress',
    BOOK_WORDCOUNT_LABEL: 'Words',
    BOOK_LASTMOD_LABEL: 'Last Modified',
    SELECT_BOOK: 'Select',

    // UnimportedBooksModal
    UNIMPORTED_BOOKS_TITLE: 'Select Book Directory to Import',
    NO_UNIMPORTED_FOLDERS: 'No unimported book directories found',
    CLOSE: 'Close',
    SEARCH_FOLDERS_PLACEHOLDER: 'Search directories...',
    NO_MATCHING_FOLDERS: 'No matching directories',
    IMPORT: 'Import',
    SELECT_FOLDER_FIRST: 'Please select a directory first',

    // ReferenceModal
    REFERENCE_MODAL_TITLE: 'Add Reference',
    REFERENCE_CONTENT: 'Reference Content',
    REFERENCE_CONTENT_DESC: 'Please enter the details of the reference',

    // NamePromptModal
    NAME_LABEL: 'Name',
    CONFIRM: 'Confirm',
    CANCEL: 'Cancel',

    // TemplateEditModal
    TEMPLATE_EDIT_TITLE: 'Edit Template',
    TEMPLATE_CREATE_TITLE: 'Create Template',
    TEMPLATE_NAME: 'Template Name',
    TEMPLATE_NAME_PLACEHOLDER: 'Enter template name',
    TEMPLATE_DESC: 'Template Description',
    TEMPLATE_DESC_PLACEHOLDER: 'Describe the template structure',
    TEMPLATE_STRUCTURE: 'Chapter Tree',
    ADD_FILE: 'Add File',
    ADD_FOLDER: 'Add Folder',
    DELETE_FOLDER_CONFIRM: 'Are you sure you want to delete this folder and all its contents?',
    NEW_CHAPTER: 'New Chapter',
    NEW_DIRECTORY: 'New Directory',
    ENTER_NAME_PLACEHOLDER: 'Enter name',
    TEMPLATE_NAME_REQUIRED: 'Please enter template name',
    TEMPLATE_NODE_REQUIRED: 'Please add at least one node',
    TEMPLATE_NAME_EXISTS: 'Template with this name already exists',
    TEMPLATE_SAVE_SUCCESS: 'Template saved successfully',
    TEMPLATE_SAVE_FAILED: 'Failed to save template, check console for details'
};
const managerTranslation: ManagerTranslation = {
    // BookManager related
    BOOK_EXISTS: 'Book already exists',
    BOOK_NOT_FOUND: 'Book not found',
    BOOK_FOLDER_NOT_FOUND: 'Book folder not found',
    SAVE_CONFIG_FAILED: 'Failed to save configuration file',
    IMPORT_BOOK_FAILED: 'Failed to import book',
    UNKNOWN_AUTHOR: 'Unknown Author',

    // TemplateManager related
    TEMPLATE_TYPE_NOT_FOUND: 'Template "{type}" does not exist',
    TEMPLATE_EXISTS: 'Template already exists',
    TEMPLATE_SAVE_FAILED: 'Failed to save template',

    // FileManager related
    CREATE_FOLDER_FAILED: 'Failed to create folder',
    CREATE_FILE_FAILED: 'Failed to create file',
    READ_FILE_FAILED: 'Failed to read file',
    WRITE_FILE_FAILED: 'Failed to write file',

    // FocusManager related
    BREAK_TIME_START: 'Break time started',
    FOCUS_SUMMARY: 'Focus completed!\nDuration: {duration} minutes\nInterruptions: {interruptions}\nWords written: {words}',

    // ReferenceManager 相关
    REFERENCE_FILE_NAME: 'references.md',
    REFERENCE_FILE_NOT_FOUND: 'Please create "references.md" file in the book directory first',
    REFERENCE_FILE_ERROR: 'Reference file does not exist or type error',
    SELECT_TEXT_TO_REFERENCE: 'Please select text to reference',
    CHAPTER_INFO_ERROR: 'Unable to get current chapter information',

    // ReferenceManager 菜单项
    EDIT_REFERENCE: 'Edit Reference',
    DELETE_REFERENCE: 'Delete Reference',
    INSERT_REFERENCE: 'Insert Reference'
};
const toolbarModalTranslation: ToolbarModalTranslation = {
    // CommunityModal
    COMMUNITY_TITLE: 'Writing Community',
    COMMUNITY_INTRO: 'Join the Billion Writes community to connect with other writers, get inspiration and feedback.',
    FEATURE_SHARE_TITLE: 'Share Works',
    FEATURE_SHARE_DESC: 'Share your creations and get reader feedback',
    FEATURE_DISCUSS_TITLE: 'Writing Exchange',
    FEATURE_DISCUSS_DESC: 'Discuss writing techniques with other creators',
    FEATURE_CHALLENGE_TITLE: 'Writing Challenges',
    FEATURE_CHALLENGE_DESC: 'Participate in community writing challenges to improve your skills',
    JOIN_SECTION_TITLE: 'How to Join',
    JOIN_SECTION_DESC: 'Copy and search the official account below',
    OFFICIAL_ACCOUNT: 'Official Account: BilionWrites',
    COPY_ACCOUNT: 'Copy Account',

    // ContactModal
    ABOUT_AUTHOR: 'About Author',
    AUTHOR_INTRO_1: 'Hello, I\'m Yeban, a full-time writer and independent developer.',
    AUTHOR_INTRO_2_1: 'This plugin is ',
    AUTHOR_INTRO_2_2: 'a tool I developed to help authors write long-form content in Obsidian',
    AUTHOR_INTRO_2_3: ', hoping to ',
    AUTHOR_INTRO_2_4: 'make your writing process smoother and more enjoyable',
    AUTHOR_INTRO_2_5: '.',
    AUTHOR_INTRO_3: 'If this plugin helps with your writing, or if you\'d like to support my independent development and creation, feel free to buy me a coffee ☕.',
    AUTHOR_INTRO_4_1: 'Your support means a lot',
    AUTHOR_INTRO_4_2: ', it allows me to focus on developing more useful tools to aid your creative journey.',
    DONATE_TEXT: 'Support the author:',
    DONATE_BUTTON: 'Support',
    MORE_INFO_TEXT: 'If you want to learn more about writing, creative techniques, or follow my future work updates, welcome to follow my social media.',
    CONTACT_TITLE: 'Contact:',
    CONTACT_WECHAT_OFFICIAL: 'WeChat Official',
    CONTACT_XIAOHONGSHU: 'Xiaohongshu',
    CONTACT_WECHAT: 'WeChat',
    CONTACT_GITHUB: 'GitHub',
    COPY_SUCCESS: '{type} copied to clipboard',
    COPY_FAILED: 'Copy failed, please copy manually: {value}',

    // DonateModal
    DONATE_MODAL_TITLE: 'Support Me',
    COMMUNITY_STATS_TITLE: 'Community Stats',
    COMMUNITY_STATS_USERS: '1200+ users, 32 supporters',
    COMMUNITY_STATS_WORDS: '5000+ words written daily',

    DONATE_AMOUNT_COFFEE: 'Buy me a coffee',
    DONATE_AMOUNT_CHAPTER: 'Chapter sponsor',
    DONATE_AMOUNT_FEATURE: 'Feature builder',
    DONATE_FEEDBACK_COFFEE: 'Thanks for your coffee support!',
    DONATE_FEEDBACK_CHAPTER: 'You get one vote for new features',
    DONATE_FEEDBACK_FEATURE: 'Join our beta testing group, contact via WeChat Official Account',

    PAYMENT_WECHAT: 'WeChat Pay',
    PAYMENT_ALIPAY: 'Alipay',
    PAYMENT_KOFI: 'Ko-fi',
    CURRENCY_UNIT: 'CNY'
};
const componentTranslation: ComponentTranslation = {
    // ChapterTree
    NEW_FILE: 'New File',
    NEW_FOLDER: 'New Folder',
    ENTER_FILE_NAME: 'Enter file name',
    ENTER_FOLDER_NAME: 'Enter folder name',
    OPEN_IN_NEW_TAB: 'Open in New Tab',
    OPEN_IN_NEW_PANE: 'Open in New Pane',
    MARK_AS_COMPLETE: 'Mark as Complete',
    MARK_AS_DRAFT: 'Mark as Draft',
    EXCLUDE_FROM_STATS: 'Exclude from Stats',
    INCLUDE_IN_STATS: 'Include in Stats',
    CREATE_COPY: 'Create Copy',
    COPY_NAME: '{name} Copy',
    RENAME: 'Rename',
    DELETE: 'Delete',
    DELETE_FILE_TITLE: 'Delete File',
    DELETE_FILE_DESC: 'Are you sure you want to delete "{title}"?\nIt will be moved to system trash.',
    DELETE_FOLDER_TITLE: 'Delete Folder',
    DELETE_FOLDER_DESC: 'Are you sure you want to delete folder "{title}" and all its contents?\nThey will be moved to system trash.',
    COPY_SUCCESS: 'Copy created successfully',
    COPY_FAILED: 'Failed to create copy: {error}',
    RENAME_SUCCESS: 'Renamed successfully',
    RENAME_FAILED: 'Failed to rename: {error}',
    DELETE_SUCCESS: 'Deleted successfully',
    DELETE_FAILED: 'Failed to delete: {error}',
    MOVE_FAILED: 'Failed to move',
    SOURCE_NOT_FOUND: 'Source file not found',
    TARGET_EXISTS: 'File with same name exists at target location',
    TARGET_FOLDER_NOT_FOUND: 'Target folder not found',
    EXCLUDED_NOTICE: '"{title}" has been excluded',
    INCLUDED_NOTICE: '"{title}" has been included',
    ENTER_NEW_NAME: 'Enter new name',

    // FocusToolView
    FOCUS_MODE: 'Focus Mode',
    START_FOCUS: 'Start Focus',
    EXIT: 'Exit',
    FOCUS_SESSIONS: 'Focus Sessions',
    INTERRUPTIONS: 'Interruptions',
    CURRENT_WORDS: 'Current Words',
    WORD_GOAL: 'Word Goal',
    TOTAL_FOCUS_WORDS: 'Total Focus Words',
    PAUSE: 'Pause',
    RESUME: 'Resume',
    END: 'End',
    ENCOURAGEMENT_1: '🎉 Amazing! You\'ve reached your word goal! Keep it up~',
    ENCOURAGEMENT_2: '✨ Excellent! Goal achieved! Let\'s keep moving forward!',
    ENCOURAGEMENT_3: '🌟 Perfect! Goal reached! Maintain this enthusiasm!',
    ENCOURAGEMENT_4: '🎯 Goal achieved! Your persistence is admirable!',
    ENCOURAGEMENT_5: '💪 Outstanding performance! Goal completed! Keep going!',
    EXIT_FOCUS: 'Exit Focus',
    EXIT_FOCUS_DESC: 'Are you sure you want to exit? Current focus progress will be lost.',
    END_FOCUS: 'End Focus',
    END_FOCUS_DESC: 'Are you sure you want to end focus? This will count as an interruption.',
    FOCUSING: 'Focusing',
    PAUSED: 'Paused',
    BREAK_TIME: 'Break Time',
    READY_TO_START: 'Ready to Start'
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
