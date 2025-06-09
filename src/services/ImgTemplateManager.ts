import { App } from 'obsidian';

import { ThemeManager } from './ThemeManager';

export interface ImgTemplate {
    id: string;
    name: string;
    sections: {
        cover?: boolean;
        header?: boolean;
        content: true;
        footer?: boolean;
    };
    render: (element: HTMLElement, settings?: any) => void;
}

export class ImgTemplateManager {
    private templates: ImgTemplate[] = [];
    private currentTemplate: ImgTemplate | null = null;

    constructor(
        private app: App,
        private themeManager?: ThemeManager
    ) {
        this.initializeTemplates();
    }

    private initializeTemplates() {
        // 注册默认模板
        this.registerTemplate(new DefaultTemplate());
        
        // 注册备忘录模板
        this.registerTemplate(new NotesTemplate());
        
        // 注册书籍模板
        this.registerTemplate(new BookTemplate());
        
        // 注册杂志模板
        this.registerTemplate(new MagazineTemplate());
    }

    registerTemplate(template: ImgTemplate) {
        this.templates.push(template);
    }

    getVisibleTemplates() {
        return this.templates;
    }

    getTemplate(id: string): ImgTemplate | null {
        return this.templates.find(t => t.id === id) || null;
    }

    setCurrentTemplate(id: string) {
        const template = this.templates.find(t => t.id === id);
        if (template) {
            this.currentTemplate = template;
        }
    }

    applyTemplate(element: HTMLElement, settings?: any) {
        if (!this.currentTemplate) {
            this.currentTemplate = this.templates[0];
        }

        if (this.currentTemplate) {
            this.currentTemplate.render(element, settings);
            if (this.themeManager) {
                this.themeManager.applyTheme(element);
            }
        }
    }
}

// 默认模板实现
class DefaultTemplate implements ImgTemplate {
    id = 'default';
    name = '默认模板';
    sections = {
        cover: true,
        header: true,
        content: true as const,
        footer: true
    };

    constructor() {}

    render(element: HTMLElement, settings?: any) {
        // 实现默认模板的渲染逻辑
    }
}

// 备忘录模板实现
class NotesTemplate implements ImgTemplate {
    id = 'notes';
    name = '备忘录';
    sections = {
        cover: false,
        header: true,
        content: true as const,
        footer: false
    };

    constructor() {}

    render(element: HTMLElement, settings?: any) {
        // 实现备忘录模板的渲染逻辑
    }
}

// 书籍模板实现
class BookTemplate implements ImgTemplate {
    id = 'book';
    name = '书籍';
    sections = {
        cover: true,
        header: false,
        content: true as const,
        footer: true
    };

    constructor() {}

    render(element: HTMLElement, settings?: any) {
        // 实现书籍模板的渲染逻辑
    }
}

// 杂志模板实现
class MagazineTemplate implements ImgTemplate {
    id = 'magazine';
    name = '杂志';
    sections = {
        cover: true,
        header: true,
        content: true as const,
        footer: true
    };

    constructor() {}

    render(element: HTMLElement, settings?: any) {
        // 实现杂志模板的渲染逻辑
    }
}