import { App } from 'obsidian';

export interface CoverSettings {
    imageUrl: string;
    scale: number;
    position: { x: number; y: number };
    titleStyle: string;
    authorStyle: string;
    backgroundColor: string;
    overlay: boolean;
    overlayOpacity: number;
}

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
        } else {
            // 如果没有背景图片，使用背景颜色
            element.style.backgroundColor = settings.backgroundColor || '#ffffff';
        }

        // 添加覆盖层以增强文字可读性
        if (settings.overlay) {
            const overlay = element.createDiv({ cls: 'cover-overlay' });
            overlay.style.backgroundColor = `rgba(0, 0, 0, ${settings.overlayOpacity || 0.3})`;
            overlay.style.position = 'absolute';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.right = '0';
            overlay.style.bottom = '0';
            overlay.style.zIndex = '1';
        }

        // 创建内容容器，确保在覆盖层之上
        const contentContainer = element.createDiv({ cls: 'cover-content' });
        contentContainer.style.position = 'relative';
        contentContainer.style.zIndex = '2';
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
        const clearedStyle = style.replace(/background-image:[^;]+;|background-size:[^;]+;|background-position:[^;]+;|background-repeat:[^;]+;|background-color:[^;]+;/g, '');
        element.setAttribute('style', clearedStyle);
        
        // 移除覆盖层和内容容器
        const overlay = element.querySelector('.cover-overlay');
        const contentContainer = element.querySelector('.cover-content');
        
        if (overlay) overlay.remove();
        if (contentContainer) contentContainer.remove();
    }

    public getDefaultCoverSettings(): CoverSettings {
        return {
            imageUrl: '',
            scale: 1,
            position: { x: 0, y: 0 },
            titleStyle: 'font-size: 32px; font-weight: bold; color: #ffffff; margin-bottom: 20px; text-shadow: 0 2px 4px rgba(0,0,0,0.5);',
            authorStyle: 'font-size: 18px; color: #ffffff; font-style: italic; text-shadow: 0 1px 2px rgba(0,0,0,0.5);',
            backgroundColor: '#1a1a1a',
            overlay: true,
            overlayOpacity: 0.4
        };
    }
}