import { BaseModal } from "./BaseModal";
import { WechatQRCode } from '../assets/wechat-qrcode';
import { AlipayQRCode } from '../assets/alipay-qrcode';
import { i18n } from '../i18n/i18n';
import { kofiImage } from '../assets/kofi3';

export class DonateModal extends BaseModal {
    constructor(container: HTMLElement) {
        super(container, i18n.t('DONATE_MODAL_TITLE'));
    }

    protected createContent() {
        this.createCommunityStats();
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
}