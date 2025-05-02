import { BaseModal } from "./BaseModal";
import { WechatQRCode } from '../assets/wechat-qrcode';
import { AlipayQRCode } from '../assets/alipay-qrcode';
import { i18n } from '../i18n/i18n';
import { kofiImage } from '../assets/kofi3';

export class DonateModal extends BaseModal {
    private selectedAmount: number = 6;
    private amounts = [
        { value: 6, label: i18n.t('DONATE_AMOUNT_COFFEE'), icon: '☕️', feedback: i18n.t('DONATE_FEEDBACK_COFFEE') },
        { value: 18, label: i18n.t('DONATE_AMOUNT_CHAPTER'), icon: '📖', feedback: i18n.t('DONATE_FEEDBACK_CHAPTER') },
        { value: 66, label: i18n.t('DONATE_AMOUNT_FEATURE'), icon: '🎨', feedback: i18n.t('DONATE_FEEDBACK_FEATURE') }
    ];

    constructor(container: HTMLElement) {
        super(container, i18n.t('DONATE_MODAL_TITLE'));
    }

    protected createContent() {
        this.createCommunityStats();
        this.createAmountPanel();
        this.createPaymentChannels();
    }

    private createCommunityStats() {
        const communityStats = this.element.createDiv({ cls: 'book-smith-community-stats' });
        const statsCard = communityStats.createDiv({ cls: 'stats-card' });
        
        const header = statsCard.createDiv({ cls: 'stats-header' });
        header.createSpan({ text: '📊', cls: 'stats-icon' });
        header.createSpan({ text: i18n.t('COMMUNITY_STATS_TITLE'), cls: 'stats-title' });
        
        const statsList = statsCard.createDiv({ cls: 'stats-list' });
        statsList.createEl('p', { 
            text: i18n.t('COMMUNITY_STATS_USERS'),
            cls: 'stats-item'
        });
        statsList.createEl('p', { 
            text: i18n.t('COMMUNITY_STATS_WORDS'),
            cls: 'stats-item'
        });
    }

    private createAmountPanel() {
        const panel = this.element.createDiv({ cls: 'book-smith-amount-panel' });
        const presets = panel.createDiv({ cls: 'amount-presets' });
        
        this.amounts.forEach(amount => {
            const btn = presets.createDiv({ cls: 'amount-btn' });
            const content = btn.createDiv({ cls: 'amount-content' });
            content.createSpan({ cls: 'amount-icon', text: amount.icon });
            content.createSpan({ cls: 'amount-label', text: amount.label });
            content.createSpan({ cls: 'amount-value', text: `${amount.value}${i18n.t('CURRENCY_UNIT')}` });
            
            if (amount.value === this.selectedAmount) {
                btn.addClass('selected');
            }
            
            btn.addEventListener('click', () => {
                this.selectAmount(amount.value);
                this.animateSelection(btn);
                this.showNotice(amount.feedback);
            });
        });
    }

    private createPaymentChannels() {
        const channels = this.element.createDiv({ cls: 'payment-channels' });
        
        const tabs = channels.createDiv({ cls: 'payment-tabs' });
        const wechatTab = tabs.createDiv({ 
            cls: 'payment-tab active', 
            text: i18n.t('PAYMENT_WECHAT')
        });
        const alipayTab = tabs.createDiv({ 
            cls: 'payment-tab', 
            text: i18n.t('PAYMENT_ALIPAY')
        });
        const kofiTab = tabs.createDiv({ 
            cls: 'payment-tab', 
            text: i18n.t('PAYMENT_KOFI')
        });
        
        // 二维码展示区
        const qrcodeContainer = channels.createDiv({ cls: 'qrcode-container' });
        const wechatQR = qrcodeContainer.createDiv({ cls: 'qrcode-item active' });
        wechatQR.createEl('img', {
            attr: {
                src: WechatQRCode,
                alt: i18n.t('PAYMENT_WECHAT')
            }
        });
        
        const alipayQR = qrcodeContainer.createDiv({ cls: 'qrcode-item' });
        alipayQR.createEl('img', {
            attr: {
                src: AlipayQRCode,
                alt: i18n.t('PAYMENT_ALIPAY')
            }
        });

        const kofiQR = qrcodeContainer.createDiv({ cls: 'qrcode-item' });
        const kofiLink = kofiQR.createEl('a', {
            cls: 'kofi-link',
            href: 'https://ko-fi.com/bruceyeban',
            attr: { target: '_blank' }
        });
        kofiLink.createEl('img', {
            attr: {
                src: kofiImage,
                alt: i18n.t('PAYMENT_KOFI'),
                style: 'height: 50px;'
            }
        });
        
        // 切换逻辑
        wechatTab.addEventListener('click', () => {
            this.activateTab(wechatTab, wechatQR, [alipayTab, kofiTab], [alipayQR, kofiQR]);
        });
        
        alipayTab.addEventListener('click', () => {
            this.activateTab(alipayTab, alipayQR, [wechatTab, kofiTab], [wechatQR, kofiQR]);
        });

        kofiTab.addEventListener('click', () => {
            this.activateTab(kofiTab, kofiQR, [wechatTab, alipayTab], [wechatQR, alipayQR]);
        });
    }

    private activateTab(activeTab: HTMLElement, activeContent: HTMLElement, inactiveTabs: HTMLElement[], inactiveContents: HTMLElement[]) {
        activeTab.addClass('active');
        activeContent.addClass('active');
        inactiveTabs.forEach(tab => tab.removeClass('active'));
        inactiveContents.forEach(content => content.removeClass('active'));
    }

    private selectAmount(amount: number) {
        this.selectedAmount = amount;
        const buttons = this.element.querySelectorAll('.amount-btn');
        buttons.forEach(btn => {
            const valueText = btn.querySelector('.amount-value')?.textContent;
            const value = valueText ? parseInt(valueText) : 0;
            btn.toggleClass('selected', value === amount);
        });
    }

    private animateSelection(btn: HTMLElement) {
        btn.addClass('pulse');
        setTimeout(() => btn.removeClass('pulse'), 1000);
    }
}