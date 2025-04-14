import { BaseModal } from "./BaseModal";
import { i18n } from '../i18n/i18n';

export class CommunityModal extends BaseModal {
    constructor(container: HTMLElement) {
        super(container, i18n.t('COMMUNITY_TITLE'));
    }

    protected createContent() {
        const content = this.element.createDiv({ cls: 'community-content' });
        
        // 社区介绍
        const intro = content.createDiv({ cls: 'community-intro' });
        intro.createEl('p', { text: i18n.t('COMMUNITY_INTRO') });
        
        // 社区功能卡片
        const features = content.createDiv({ cls: 'community-features' });
        
        this.createFeatureCard(features, '📝', i18n.t('FEATURE_SHARE_TITLE'), i18n.t('FEATURE_SHARE_DESC'));
        this.createFeatureCard(features, '👥', i18n.t('FEATURE_DISCUSS_TITLE'), i18n.t('FEATURE_DISCUSS_DESC'));
        this.createFeatureCard(features, '🏆', i18n.t('FEATURE_CHALLENGE_TITLE'), i18n.t('FEATURE_CHALLENGE_DESC'));
        
        // 加入方式
        const joinSection = content.createDiv({ cls: 'join-section' });
        joinSection.createEl('h3', { text: i18n.t('JOIN_SECTION_TITLE') });
        
        const joinInfo = joinSection.createDiv({ cls: 'join-info' });
        joinInfo.createEl('p', { text: i18n.t('JOIN_SECTION_DESC') });
        joinInfo.createEl('p', { text: i18n.t('OFFICIAL_ACCOUNT'), cls: 'account-name' });
        
        // 加入按钮
        const joinBtn = content.createDiv({ cls: 'join-btn', text: i18n.t('COPY_ACCOUNT') });
        joinBtn.addEventListener('click', () => {
            navigator.clipboard.writeText('BilionWrites').then(() => {
                this.showNotice(i18n.t('COPY_SUCCESS', { type: i18n.t('OFFICIAL_ACCOUNT') }));
            }).catch(() => {
                this.showNotice(i18n.t('COPY_FAILED', { value: 'BilionWrites' }));
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