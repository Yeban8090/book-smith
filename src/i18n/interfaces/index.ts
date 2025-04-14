// 导出所有翻译接口
import { CommonTranslation } from './common';
import { BookSmithViewTranslation } from './views/booksmith-view';
import { ToolViewTranslation } from './views/tool-view';
import { SettingsTranslation } from './settings/settings';
import { ModalTranslation } from './modals/modals';
import { ToolbarModalTranslation } from './modals/toolbarModals';
import { ManagerTranslation } from './manager/managers';
import { ComponentTranslation } from './components/components';
// 合并所有翻译接口
export interface Translation extends 
    CommonTranslation, 
    BookSmithViewTranslation, 
    ToolViewTranslation,
    SettingsTranslation,
    ModalTranslation,
    ToolbarModalTranslation,
    ManagerTranslation,
    ComponentTranslation{}

export * from './common';
export * from './views/booksmith-view';
export * from './views/tool-view';
export * from './settings/settings';
export * from './modals/modals';
export * from './modals/toolbarModals';
export * from './manager/managers';
export * from './components/components';