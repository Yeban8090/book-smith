import { BaseModal } from "./BaseModal";
import { setIcon } from "obsidian";

export class ContactModal extends BaseModal {
    constructor(container: HTMLElement) {
        super(container, '关于作者');
    }

    protected createContent() {
        const content = this.element.createDiv({ cls: 'contact-content' });
        
        // 作者介绍
        const intro = content.createDiv({ cls: 'author-intro' });
        
        intro.createEl('p', { 
            text: '你好，我是【夜半】，一名全职写作与独立开发者。' 
        });
        
        // 使用HTML元素添加带有强调样式的文本
        const p1 = intro.createEl('p');
        
        p1.createSpan({ text: '这款插件是' });
        p1.createSpan({ text: '我为了帮助在Obsidian中进行长篇创作的作者而开发的工具', cls: 'text-accent' });
        p1.createSpan({ text: '，希望能' });
        p1.createSpan({ text: '让你的写作过程更流畅，创作体验更愉悦', cls: 'text-accent' });
        p1.createSpan({ text: '。' });

        const p2 = intro.createEl('p');
        p2.createSpan({ text: '如果这款插件对你的写作有所帮助，或者你愿意支持我的独立开发与创作，欢迎请我喝咖啡☕。', cls: 'text-accent' });

        const p3 = intro.createEl('p');
        p3.createSpan({ text: '你的支持意义重大', cls: 'text-accent' });
        p3.createSpan({ text: '，它能让我更专注地开发更多实用工具，助力你的创作之旅。' });
        
        
        // 赞赏支持区域 - 改为卡片式设计
        const donateSection = content.createDiv({ cls: 'info-card donate-section' });
        donateSection.createSpan({ cls: 'donate-text', text: '如需支持作者：' });
        const donateBtn = donateSection.createDiv({ cls: 'donate-button', text: '赞赏支持' });
        donateBtn.addEventListener('click', () => {
            this.close();
            const event = new CustomEvent('open-donate-modal');
            document.dispatchEvent(event);
        });
        
        // 了解更多区域 - 改为卡片式设计
        const moreInfo = content.createDiv({ cls: 'info-card more-info-section' });
        moreInfo.createEl('p', { 
            text: '如果你想了解更多关于写作、创作技巧的内容，或者关注我未来的作品动态，欢迎关注我的社交媒体。' 
        });
        
        // 联系方式标题
        content.createEl('h3', { text: '联系方式：', cls: 'contact-title' });
        
        // 联系方式卡片
        const contactMethods = content.createDiv({ cls: 'contact-methods' });
        
        this.createContactCard(contactMethods, 'file-text', '公众号', '夜半');
        this.createContactCard(contactMethods, 'book-open', '小红书', '夜半Yeban');
        this.createContactCard(contactMethods, 'message-circle', '微信', 'Bruce169229（添加注明来意）');
        this.createContactCard(contactMethods, 'globe', 'GitHub', 'https://github.com/Yeban8090');
    }
    
    private createContactCard(container: HTMLElement, icon: string, title: string, value: string) {
        const card = container.createDiv({ cls: 'contact-card' });
        
        // 图标容器
        const iconContainer = card.createDiv({ cls: 'contact-icon-container' });
        setIcon(iconContainer, icon);
        
        // 内容区域
        const contentContainer = card.createDiv({ cls: 'contact-info' });
        contentContainer.createDiv({ cls: 'contact-label', text: title });
        contentContainer.createDiv({ cls: 'contact-value', text: value });
        
        card.addEventListener('click', () => {
            navigator.clipboard.writeText(value).then(() => {
                this.showNotice(`${title}已复制到剪贴板`);
            }).catch(() => {
                this.showNotice(`复制失败，请手动复制：${value}`);
            });
        });
    }
}