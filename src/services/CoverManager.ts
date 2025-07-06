import { App } from 'obsidian';
import { CoverSettings, Book } from '../types/book';

export class CoverManager {
    constructor(
        private app: App
    ) {}

    public applyCoverStyles(element: HTMLElement, settings: CoverSettings) {
        // 设置背景图片
        if (settings.imageUrl) {
            const stylesArray = [
                `background-image: url(${settings.imageUrl})`,
                `background-size: ${settings.scale * 100}%`,
                `background-position: ${settings.position.x}px ${settings.position.y}px`,
                `background-repeat: no-repeat`
            ];

            stylesArray.forEach(style => {
                const match = style.match(/([^:]+):(.+)/);
                if (match) {
                    const [, key, value] = match.map(item => item.trim());
                    if (key && value) {
                        element.style[key as any] = value;
                    }
                }
            });
        }

        // 创建内容容器
        const contentContainer = element.createDiv({ cls: 'cover-content' });
        contentContainer.style.position = 'relative';
        contentContainer.style.height = '100%';
        contentContainer.style.display = 'flex';
        contentContainer.style.flexDirection = 'column';
        contentContainer.style.justifyContent = 'center';
        contentContainer.style.alignItems = 'center';
        contentContainer.style.padding = '40px';
        contentContainer.style.textAlign = 'center';

        return contentContainer;
    }

    public clearCoverStyles(element: HTMLElement) {
        const style = element.getAttribute('style') || '';
        const clearedStyle = style.replace(/background-image:[^;]+;|background-size:[^;]+;|background-position:[^;]+;|background-repeat:[^;]+;/g, '');
        element.setAttribute('style', clearedStyle);
        
        // 移除内容容器
        const contentContainer = element.querySelector('.cover-content');
        if (contentContainer) contentContainer.remove();
    }

    public getDefaultCoverSettings(book?: Book): CoverSettings {
        // 如果传入了书籍对象，优先使用书籍的封面配置
        if (book?.basic.coverSettings) {
            return book.basic.coverSettings;
        }
        
        // 如果书籍有封面图片路径但没有完整配置，创建基础配置
        if (book?.basic.cover) {
            // 使用Obsidian的getResourcePath获取正确的图片URL
            const imageUrl = this.app.vault.getResourcePath(this.app.vault.getAbstractFileByPath(book.basic.cover) as any);
            
            return {
                imageUrl: imageUrl,
                scale: 1,
                position: { x: 0, y: 0 },
                titleStyle: 'color: #333333; font-weight: bold;',
                authorStyle: 'color: #666666; font-style: italic;',
                bookSize: 'A4'
            };
        }
        
        // 返回完全默认的配置
        return {
            imageUrl: '',
            scale: 1,
            position: { x: 0, y: 0 },
            titleStyle: 'font-size: 24px; color: #333333; font-weight: bold;',
            authorStyle: 'font-size: 16px; color: #666666; font-style: italic;',
            bookSize: 'A4'
        };
    }

    public getBookCoverSettings(book: Book): CoverSettings {
        return this.getDefaultCoverSettings(book);
    }
}