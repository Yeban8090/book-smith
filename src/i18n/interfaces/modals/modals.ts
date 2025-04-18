// 模态框翻译接口
export interface ModalTranslation {
    // 通用
    COVER: string;
    COVER_DESC: string;
    BOOK_TITLE: string;
    BOOK_TITLE_DESC: string;
    BOOK_TITLE_PLACEHOLDER: string;
    SUBTITLE: string;
    SUBTITLE_DESC: string;
    SUBTITLE_PLACEHOLDER: string;
    TARGET_WORDS: string;
    TARGET_WORDS_DESC: string;
    TARGET_WORDS_PLACEHOLDER: string;
    AUTHOR: string;
    AUTHOR_DESC: string;
    AUTHOR_PLACEHOLDER: string;
    DESCRIPTION: string;
    DESCRIPTION_DESC: string;
    DESCRIPTION_PLACEHOLDER: string;
    REQUIRED_FIELDS: string;

    // CreateBookModal
    CREATE_BOOK_TITLE: string;
    BOOK_TEMPLATE: string;
    TEMPLATE_CHECK_DESC: string;
    SELECT_IMAGE: string;
    COVER_UPLOAD_SUCCESS: string;
    COVER_UPLOAD_FAILED: string;
    CREATE: string;
    CREATE_SUCCESS: string;
    CREATE_FAILED: string;
    
    // EditBookModal
    EDIT_BOOK_TITLE: string;
    CHANGE_COVER: string;
    SELECT_COVER: string;
    COVER_UPDATE_SUCCESS: string;
    COVER_UPDATE_FAILED: string;
    SAVE: string;
    SAVE_SUCCESS: string;
    SAVE_FAILED: string;
    
    // ManageBooksModal
    MANAGE_BOOKS_TITLE: string;
    SEARCH_BOOKS_PLACEHOLDER: string;
    IMPORT_BOOK: string;
    BOOK_AUTHOR_PREFIX: string;
    BOOK_DESC_PREFIX: string;
    BOOK_PROGRESS_PREFIX: string;
    DELETE_BOOK: string;
    EDIT_BOOK: string;
    DELETE_BOOK_TITLE: string;
    DELETE_BOOK_DESC: string;
    DELETE_SUCCESS: string;
    DELETE_FAILED: string;
    BOOKS_ROOT_NOT_FOUND: string;
    NO_UNIMPORTED_BOOKS: string;
    DETECT_UNIMPORTED_FAILED: string;
    IMPORT_SUCCESS: string;
    IMPORT_FAILED: string;
    
    // SwitchBookModal
    SWITCH_BOOK_TITLE: string;
    SEARCH_BOOK_PLACEHOLDER: string;
    BOOK_AUTHOR_LABEL: string;
    BOOK_PROGRESS_LABEL: string;
    BOOK_WORDCOUNT_LABEL: string;
    BOOK_LASTMOD_LABEL: string;
    SELECT_BOOK: string;
    
    // UnimportedBooksModal
    UNIMPORTED_BOOKS_TITLE: string;
    NO_UNIMPORTED_FOLDERS: string;
    CLOSE: string;
    SEARCH_FOLDERS_PLACEHOLDER: string;
    NO_MATCHING_FOLDERS: string;

    IMPORT: string;
    SELECT_FOLDER_FIRST: string;
    
    // ReferenceModal
    REFERENCE_MODAL_TITLE: string;
    REFERENCE_CONTENT: string;
    REFERENCE_CONTENT_DESC: string;
    // ConfirmModal
    // NamePromptModal
    NAME_LABEL: string;
    CONFIRM: string;
    CANCEL: string;
    
    // TemplateEditModal
    TEMPLATE_EDIT_TITLE: string;
    TEMPLATE_CREATE_TITLE: string;
    TEMPLATE_NAME: string;
    TEMPLATE_NAME_PLACEHOLDER: string;
    TEMPLATE_DESC: string;
    TEMPLATE_DESC_PLACEHOLDER: string;
    TEMPLATE_STRUCTURE: string;
    ADD_FILE: string;
    ADD_FOLDER: string;
    DELETE_FOLDER_CONFIRM: string;
    NEW_CHAPTER: string;
    NEW_DIRECTORY: string;
    ENTER_NAME_PLACEHOLDER: string;
    TEMPLATE_NAME_REQUIRED: string;
    TEMPLATE_NODE_REQUIRED: string;
    TEMPLATE_NAME_EXISTS: string;
    TEMPLATE_SAVE_SUCCESS: string;
    TEMPLATE_SAVE_FAILED: string;
}