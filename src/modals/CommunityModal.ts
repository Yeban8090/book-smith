import { BaseModal } from "./BaseModal";

export class CommunityModal extends BaseModal {
    constructor(container: HTMLElement) {
        super(container, '创作社区');
    }

    protected createContent() {
        const content = this.element.createDiv({ cls: 'community-content' });
        
        // 社区介绍
        const intro = content.createDiv({ cls: 'community-intro' });
        intro.createEl('p', { 
            text: '加入亿万写作创作社区，与其他创作者交流，获取写作灵感和反馈。' 
        });
        
        // 社区功能卡片
        const features = content.createDiv({ cls: 'community-features' });
        
        this.createFeatureCard(features, '📝', '作品分享', '分享你的创作，获取读者反馈');
        this.createFeatureCard(features, '👥', '创作交流', '与其他创作者讨论写作技巧');
        this.createFeatureCard(features, '🏆', '写作挑战', '参与社区写作挑战，提升创作能力');
        
        // 加入方式
        const joinSection = content.createDiv({ cls: 'join-section' });
        joinSection.createEl('h3', { text: '加入方式' });
        
        const joinInfo = joinSection.createDiv({ cls: 'join-info' });
        joinInfo.createEl('p', { text: '复制二维码，搜索关注公众号' });
    
        
        joinInfo.createEl('p', { text: '公众号：BilionWrites', cls: 'account-name' });
        
        // 加入按钮
        const joinBtn = content.createDiv({ cls: 'join-btn', text: '复制公众号' });
        joinBtn.addEventListener('click', () => {
            navigator.clipboard.writeText('BilionWrites').then(() => {
                this.showNotice('公众号已复制到剪贴板');
            }).catch(() => {
                this.showNotice('复制失败，请手动复制：BilionWrites');
            });
        });
    }
    
    private createFeatureCard(container: HTMLElement, icon: string, title: string, desc: string) {
        const card = container.createDiv({ cls: 'feature-card' });
        const iconEl = card.createDiv({ cls: 'feature-icon', text: icon });
        const contentEl = card.createDiv({ cls: 'feature-content' });
        contentEl.createDiv({ cls: 'feature-title', text: title });
        contentEl.createDiv({ cls: 'feature-desc', text: desc });
    }
}