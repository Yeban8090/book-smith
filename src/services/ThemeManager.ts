import { App } from 'obsidian';
import { BookSmithSettings } from '../settings/settings';

export interface Theme {
    id: string;
    name: string;
    description: string;
    isBuiltin?: boolean;
    isVisible?: boolean;
    styles: {
        // 容器基础样式
        container: string;
        // 标题样式
        title: {
            h1: string;
            h2: string;
            h3: string;
        };
        // 段落样式
        paragraph: string;
        // 引用样式
        quote: string;
        // 列表样式
        list: {
            ul: string;
            ol: string;
            li: string;
        };
        // 强调样式
        emphasis: {
            strong: string;
            em: string;
            del: string;
        };
        // 代码样式
        code: {
            block: string;
            inline: string;
        };
        // 表格样式
        table: {
            container: string;
            header: string;
            cell: string;
        };
        // 其他元素样式
        hr: string;
        image: string;
        link: string;
    };
}

export class ThemeManager {
    private themes: Map<string, Theme> = new Map();
    private currentThemeId: string = 'default';
    private currentFontSize: number = 16;
    
    constructor(
        private app: App,
        private settings: BookSmithSettings
    ) {
        // 注册默认主题
        this.registerTheme(this.createDefaultTheme());
        this.registerTheme(this.createLightTheme());
        this.registerTheme(this.createDarkTheme());
    }
    
    private createDefaultTheme(): Theme {
        return {
            id: 'default',
            name: '默认主题',
            description: '系统默认主题',
            isBuiltin: true,
            isVisible: true,
            styles: {
                container: 'background-color: white; color: #333; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;',
                title: {
                    h1: 'font-size: 2em; margin-bottom: 0.5em; color: #222;',
                    h2: 'font-size: 1.5em; margin-bottom: 0.5em; color: #333;',
                    h3: 'font-size: 1.2em; margin-bottom: 0.5em; color: #444;'
                },
                paragraph: 'margin-bottom: 1em; line-height: 1.6;',
                quote: 'border-left: 4px solid #ddd; padding-left: 1em; color: #666; font-style: italic;',
                list: {
                    ul: 'list-style-type: disc; padding-left: 2em; margin-bottom: 1em;',
                    ol: 'list-style-type: decimal; padding-left: 2em; margin-bottom: 1em;',
                    li: 'margin-bottom: 0.5em;'
                },
                emphasis: {
                    strong: 'font-weight: bold;',
                    em: 'font-style: italic;',
                    del: 'text-decoration: line-through;'
                },
                code: {
                    block: 'background-color: #f5f5f5; padding: 1em; border-radius: 4px; font-family: monospace; overflow-x: auto;',
                    inline: 'background-color: #f5f5f5; padding: 0.2em 0.4em; border-radius: 3px; font-family: monospace;'
                },
                table: {
                    container: 'width: 100%; border-collapse: collapse; margin-bottom: 1em;',
                    header: 'background-color: #f5f5f5; font-weight: bold; text-align: left; padding: 0.5em;',
                    cell: 'border: 1px solid #ddd; padding: 0.5em;'
                },
                hr: 'border: 0; border-top: 1px solid #ddd; margin: 1em 0;',
                image: 'max-width: 100%; height: auto;',
                link: 'color: #0366d6; text-decoration: none;'
            }
        };
    }
    
    private createLightTheme(): Theme {
        return {
            id: 'light',
            name: '浅色主题',
            description: '明亮清新的浅色主题',
            isBuiltin: true,
            isVisible: true,
            styles: {
                container: 'background-color: #f9f9f9; color: #333; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;',
                title: {
                    h1: 'font-size: 2em; margin-bottom: 0.5em; color: #222; border-bottom: 1px solid #eee; padding-bottom: 0.3em;',
                    h2: 'font-size: 1.5em; margin-bottom: 0.5em; color: #333; border-bottom: 1px solid #eee; padding-bottom: 0.2em;',
                    h3: 'font-size: 1.2em; margin-bottom: 0.5em; color: #444;'
                },
                paragraph: 'margin-bottom: 1em; line-height: 1.6; color: #444;',
                quote: 'border-left: 4px solid #ddd; padding-left: 1em; color: #666; font-style: italic; background-color: #f5f5f5;',
                list: {
                    ul: 'list-style-type: disc; padding-left: 2em; margin-bottom: 1em;',
                    ol: 'list-style-type: decimal; padding-left: 2em; margin-bottom: 1em;',
                    li: 'margin-bottom: 0.5em;'
                },
                emphasis: {
                    strong: 'font-weight: bold; color: #222;',
                    em: 'font-style: italic; color: #444;',
                    del: 'text-decoration: line-through; color: #999;'
                },
                code: {
                    block: 'background-color: #f0f0f0; padding: 1em; border-radius: 4px; font-family: monospace; overflow-x: auto; border: 1px solid #ddd;',
                    inline: 'background-color: #f0f0f0; padding: 0.2em 0.4em; border-radius: 3px; font-family: monospace; border: 1px solid #ddd;'
                },
                table: {
                    container: 'width: 100%; border-collapse: collapse; margin-bottom: 1em;',
                    header: 'background-color: #f0f0f0; font-weight: bold; text-align: left; padding: 0.5em; border: 1px solid #ddd;',
                    cell: 'border: 1px solid #ddd; padding: 0.5em;'
                },
                hr: 'border: 0; border-top: 1px solid #ddd; margin: 1em 0;',
                image: 'max-width: 100%; height: auto; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);',
                link: 'color: #0366d6; text-decoration: none;'
            }
        };
    }
    
    private createDarkTheme(): Theme {
        return {
            id: 'dark',
            name: '深色主题',
            description: '护眼舒适的深色主题',
            isBuiltin: true,
            isVisible: true,
            styles: {
                container: 'background-color: #222; color: #eee; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;',
                title: {
                    h1: 'font-size: 2em; margin-bottom: 0.5em; color: #fff; border-bottom: 1px solid #444; padding-bottom: 0.3em;',
                    h2: 'font-size: 1.5em; margin-bottom: 0.5em; color: #ddd; border-bottom: 1px solid #444; padding-bottom: 0.2em;',
                    h3: 'font-size: 1.2em; margin-bottom: 0.5em; color: #ccc;'
                },
                paragraph: 'margin-bottom: 1em; line-height: 1.6; color: #bbb;',
                quote: 'border-left: 4px solid #444; padding-left: 1em; color: #999; font-style: italic; background-color: #333;',
                list: {
                    ul: 'list-style-type: disc; padding-left: 2em; margin-bottom: 1em;',
                    ol: 'list-style-type: decimal; padding-left: 2em; margin-bottom: 1em;',
                    li: 'margin-bottom: 0.5em;'
                },
                emphasis: {
                    strong: 'font-weight: bold; color: #fff;',
                    em: 'font-style: italic; color: #ddd;',
                    del: 'text-decoration: line-through; color: #666;'
                },
                code: {
                    block: 'background-color: #333; padding: 1em; border-radius: 4px; font-family: monospace; overflow-x: auto; border: 1px solid #444;',
                    inline: 'background-color: #333; padding: 0.2em 0.4em; border-radius: 3px; font-family: monospace; border: 1px solid #444;'
                },
                table: {
                    container: 'width: 100%; border-collapse: collapse; margin-bottom: 1em;',
                    header: 'background-color: #333; font-weight: bold; text-align: left; padding: 0.5em; border: 1px solid #444;',
                    cell: 'border: 1px solid #444; padding: 0.5em;'
                },
                hr: 'border: 0; border-top: 1px solid #444; margin: 1em 0;',
                image: 'max-width: 100%; height: auto; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.3);',
                link: 'color: #58a6ff; text-decoration: none;'
            }
        };
    }
    
    registerTheme(theme: Theme): void {
        this.themes.set(theme.id, theme);
    }
    
    getTheme(id: string): Theme | undefined {
        return this.themes.get(id);
    }
    
    getAllThemes(): Theme[] {
        return Array.from(this.themes.values());
    }
    
    getVisibleThemes(): Theme[] {
        return this.getAllThemes().filter(theme => theme.isVisible !== false);
    }
    
    getCurrentTheme(): Theme {
        return this.themes.get(this.currentThemeId) || this.themes.get('default')!;
    }
    
    setCurrentTheme(id: string): boolean {
        if (this.themes.has(id)) {
            this.currentThemeId = id;
            return true;
        }
        return false;
    }
    
    setFontSize(size: number): void {
        this.currentFontSize = size;
    }
    
    getFontSize(): number {
        return this.currentFontSize;
    }
    
    // 应用主题到元素
    applyTheme(element: HTMLElement, themeId?: string): void {
        const theme = themeId ? this.getTheme(themeId) : this.getCurrentTheme();
        if (!theme) return;
        
        // 应用容器样式
        element.setAttribute('style', theme.styles.container);
        
        // 应用标题样式
        element.querySelectorAll('h1').forEach(el => {
            el.setAttribute('style', theme.styles.title.h1);
        });
        
        element.querySelectorAll('h2').forEach(el => {
            el.setAttribute('style', theme.styles.title.h2);
        });
        
        element.querySelectorAll('h3').forEach(el => {
            el.setAttribute('style', theme.styles.title.h3);
        });
        
        // 应用段落样式
        element.querySelectorAll('p').forEach(el => {
            el.setAttribute('style', theme.styles.paragraph);
        });
        
        // 应用引用样式
        element.querySelectorAll('blockquote').forEach(el => {
            el.setAttribute('style', theme.styles.quote);
        });
        
        // 应用列表样式
        element.querySelectorAll('ul').forEach(el => {
            el.setAttribute('style', theme.styles.list.ul);
        });
        
        element.querySelectorAll('ol').forEach(el => {
            el.setAttribute('style', theme.styles.list.ol);
        });
        
        element.querySelectorAll('li').forEach(el => {
            el.setAttribute('style', theme.styles.list.li);
        });
        
        // 应用强调样式
        element.querySelectorAll('strong').forEach(el => {
            el.setAttribute('style', theme.styles.emphasis.strong);
        });
        
        element.querySelectorAll('em').forEach(el => {
            el.setAttribute('style', theme.styles.emphasis.em);
        });
        
        element.querySelectorAll('del').forEach(el => {
            el.setAttribute('style', theme.styles.emphasis.del);
        });
        
        // 应用代码样式
        element.querySelectorAll('pre code').forEach(el => {
            el.setAttribute('style', theme.styles.code.block);
        });
        
        element.querySelectorAll('code:not(pre code)').forEach(el => {
            el.setAttribute('style', theme.styles.code.inline);
        });
        
        // 应用表格样式
        element.querySelectorAll('table').forEach(el => {
            el.setAttribute('style', theme.styles.table.container);
        });
        
        element.querySelectorAll('th').forEach(el => {
            el.setAttribute('style', theme.styles.table.header);
        });
        
        element.querySelectorAll('td').forEach(el => {
            el.setAttribute('style', theme.styles.table.cell);
        });
        
        // 应用其他元素样式
        element.querySelectorAll('hr').forEach(el => {
            el.setAttribute('style', theme.styles.hr);
        });
        
        element.querySelectorAll('img').forEach(el => {
            el.setAttribute('style', theme.styles.image);
        });
        
        element.querySelectorAll('a').forEach(el => {
            el.setAttribute('style', theme.styles.link);
        });
    }
}