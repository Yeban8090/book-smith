import { Notice } from "obsidian";
import { BaseModal } from "./BaseModal";
import { WechatQRCode } from '../assets/wechat-qrcode';
import { AlipayQRCode } from '../assets/alipay-qrcode';

export class DonateModal extends BaseModal {
    private selectedAmount: number = 6;
    private amounts = [
        { value: 6, label: '暖心咖啡', icon: '☕️', feedback: '感谢您的咖啡赞助！' },
        { value: 18, label: '章节赞助', icon: '📖', feedback: '给您一次新功能投票权' },
        { value: 66, label: '功能共建', icon: '🎨', feedback: '邀请您加入内测社群，公众号链接我' }
    ];

    constructor(container: HTMLElement) {
        super(container, '笔墨有情');
    }

    protected createContent() {
        this.createCommunityStats();
        this.createAmountPanel();
        this.createPaymentChannels();
    }

    private createCommunityStats() {
        const communityStats = this.element.createDiv({ cls: 'book-smith-community-stats' });
        
        // 社区数据卡片
        const statsCard = communityStats.createDiv({ cls: 'stats-card' });
        
        // 图标和标题
        const header = statsCard.createDiv({ cls: 'stats-header' });
        header.createSpan({ text: '📊', cls: 'stats-icon' });
        header.createSpan({ text: '社区数据', cls: 'stats-title' });
        
        // 数据列表
        const statsList = statsCard.createDiv({ cls: 'stats-list' });
        statsList.createEl('p', { 
            text: '已有 1200+ 用户，32位支持者',
            cls: 'stats-item'
        });
        statsList.createEl('p', { 
            text: '平均每天创作 5000+ 字',
            cls: 'stats-item'
        });
    }

    private createAmountPanel() {
        const panel = this.element.createDiv({ cls: 'book-smith-amount-panel' });
        
        // 预设金额
        const presets = panel.createDiv({ cls: 'amount-presets' });
        this.amounts.forEach(amount => {
            const btn = presets.createDiv({ cls: 'amount-btn' });
            const content = btn.createDiv({ cls: 'amount-content' });
            content.createSpan({ cls: 'amount-icon', text: amount.icon });
            content.createSpan({ cls: 'amount-label', text: amount.label });
            content.createSpan({ cls: 'amount-value', text: `${amount.value}元` });
            
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
        
        // 支付方式选项卡
        const tabs = channels.createDiv({ cls: 'payment-tabs' });
        const wechatTab = tabs.createDiv({ 
            cls: 'payment-tab active', 
            text: '微信赞赏' 
        });
        const alipayTab = tabs.createDiv({ 
            cls: 'payment-tab', 
            text: '支付宝赞赏' 
        });
        
        // 二维码展示区
        const qrcodeContainer = channels.createDiv({ cls: 'qrcode-container' });
        const wechatQR = qrcodeContainer.createDiv({ cls: 'qrcode-item active' });
        wechatQR.createEl('img', {
            attr: {
                src: WechatQRCode,
                alt: '微信支付'
            }
        });
        
        const alipayQR = qrcodeContainer.createDiv({ cls: 'qrcode-item' });
        alipayQR.createEl('img', {
            attr: {
                src: AlipayQRCode,
                alt: '支付宝'
            }
        });
        
        // 切换逻辑
        wechatTab.addEventListener('click', () => {
            wechatTab.addClass('active');
            alipayTab.removeClass('active');
            wechatQR.addClass('active');
            alipayQR.removeClass('active');
        });
        
        alipayTab.addEventListener('click', () => {
            alipayTab.addClass('active');
            wechatTab.removeClass('active');
            alipayQR.addClass('active');
            wechatQR.removeClass('active');
        });
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