import { BaseModal } from "./BaseModal";
import { setIcon } from "obsidian";
import { i18n } from '../i18n/i18n';

export class ContactModal extends BaseModal {
    constructor(container: HTMLElement) {
        super(container, i18n.t('ABOUT_AUTHOR'));
    }

    protected createContent() {
        const content = this.element.createDiv({ cls: 'contact-content' });
        
        const intro = content.createDiv({ cls: 'author-intro' });
        intro.createEl('p', { text: i18n.t('AUTHOR_INTRO_1') });
        
        const p1 = intro.createEl('p');
        p1.createSpan({ text: i18n.t('AUTHOR_INTRO_2_1') });
        p1.createSpan({ text: i18n.t('AUTHOR_INTRO_2_2'), cls: 'text-accent' });
        p1.createSpan({ text: i18n.t('AUTHOR_INTRO_2_3') });
        p1.createSpan({ text: i18n.t('AUTHOR_INTRO_2_4'), cls: 'text-accent' });
        p1.createSpan({ text: i18n.t('AUTHOR_INTRO_2_5') });

        const p2 = intro.createEl('p');
        p2.createSpan({ text: i18n.t('AUTHOR_INTRO_3'), cls: 'text-accent' });

        const p3 = intro.createEl('p');
        p3.createSpan({ text: i18n.t('AUTHOR_INTRO_4_1'), cls: 'text-accent' });
        p3.createSpan({ text: i18n.t('AUTHOR_INTRO_4_2') });
        
        const donateSection = content.createDiv({ cls: 'info-card donate-section' });
        donateSection.createSpan({ cls: 'donate-text', text: i18n.t('DONATE_TEXT') });
        const donateBtn = donateSection.createDiv({ cls: 'donate-button', text: i18n.t('DONATE_BUTTON') });
        donateBtn.addEventListener('click', () => {
            this.close();
            const event = new CustomEvent('open-donate-modal');
            document.dispatchEvent(event);
        });
        
        const moreInfo = content.createDiv({ cls: 'info-card more-info-section' });
        moreInfo.createEl('p', { text: i18n.t('MORE_INFO_TEXT') });
        
        content.createEl('h3', { text: i18n.t('CONTACT_TITLE'), cls: 'contact-title' });
        
        const contactMethods = content.createDiv({ cls: 'contact-methods' });
        
        this.createContactCard(contactMethods, 'file-text', i18n.t('CONTACT_WECHAT_OFFICIAL'), '夜半');
        this.createContactCard(contactMethods, 'book-open', i18n.t('CONTACT_XIAOHONGSHU'), '夜半Yeban');
        this.createContactCard(contactMethods, 'message-circle', i18n.t('CONTACT_WECHAT'), 'Bruce169229（添加注明来意）');
        this.createContactCard(contactMethods, 'globe', i18n.t('CONTACT_GITHUB'), 'https://github.com/Yeban8090');
    }
    
    private createContactCard(container: HTMLElement, icon: string, title: string, value: string) {
        const card = container.createDiv({ cls: 'contact-card' });
        
        const iconContainer = card.createDiv({ cls: 'contact-icon-container' });
        setIcon(iconContainer, icon);
        
        const contentContainer = card.createDiv({ cls: 'contact-info' });
        contentContainer.createDiv({ cls: 'contact-label', text: title });
        contentContainer.createDiv({ cls: 'contact-value', text: value });
        
        card.addEventListener('click', () => {
            navigator.clipboard.writeText(value).then(() => {
                this.showNotice(i18n.t('COPY_SUCCESS', { type: title }));
            }).catch(() => {
                this.showNotice(i18n.t('COPY_FAILED', { value }));
            });
        });
    }
}