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
        // 添加模板特定的类名
        element.classList.add('template-default');
        
        // 设置基本布局
        const contentPages = element.querySelector('.typography-content-pages');
        if (contentPages) {
            contentPages.classList.add('default-content-layout');
        }
        
        // 设置页面边距和布局
        const pages = element.querySelectorAll('.page');
        pages.forEach(page => {
            page.classList.add('default-page-layout');
        });
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
        // 添加模板特定的类名
        element.classList.add('template-notes');
        
        // 设置备忘录风格的页眉
        const pages = element.querySelectorAll('.page');
        pages.forEach((page, index) => {
            // 添加页眉
            const header = document.createElement('div');
            header.className = 'notes-header';
            header.innerHTML = `<div class="notes-title">备忘录</div><div class="notes-date">${new Date().toLocaleDateString()}</div>`;
            
            // 将页眉插入到页面内容之前
            if (page.firstChild) {
                page.insertBefore(header, page.firstChild);
            } else {
                page.appendChild(header);
            }
            
            // 添加备忘录风格的线条背景
            page.classList.add('notes-page-style');
        });
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
        // 添加模板特定的类名
        element.classList.add('template-book');
        
        // 设置书籍风格的页面
        const pages = element.querySelectorAll('.page');
        pages.forEach((page, index) => {
            // 添加书籍风格的页面样式
            page.classList.add('book-page-style');
            
            // 添加页脚（页码）
            const footer = document.createElement('div');
            footer.className = 'book-footer';
            footer.innerHTML = `<div class="book-page-number">${index + 1}</div>`;
            page.appendChild(footer);
        });
        
        // 设置封面样式
        const coverPage = element.querySelector('.page:first-child');
        if (coverPage) {
            coverPage.classList.add('book-cover');
        }
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
        // 添加模板特定的类名
        element.classList.add('template-magazine');
        
        // 设置杂志风格的页面
        const pages = element.querySelectorAll('.page');
        pages.forEach((page, index) => {
            // 添加杂志风格的页面样式
            page.classList.add('magazine-page-style');
            
            // 添加页眉
            const header = document.createElement('div');
            header.className = 'magazine-header';
            header.innerHTML = `<div class="magazine-section">专题</div>`;
            
            // 将页眉插入到页面内容之前
            if (page.firstChild) {
                page.insertBefore(header, page.firstChild);
            } else {
                page.appendChild(header);
            }
            
            // 添加页脚
            const footer = document.createElement('div');
            footer.className = 'magazine-footer';
            footer.innerHTML = `<div class="magazine-page-number">${index + 1}</div>`;
            page.appendChild(footer);
        });
        
        // 设置封面样式
        const coverPage = element.querySelector('.page:first-child');
        if (coverPage) {
            coverPage.classList.add('magazine-cover');
        }
    }
}