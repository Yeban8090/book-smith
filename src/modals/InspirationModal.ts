import { BaseModal } from "./BaseModal";

export class InspirationModal extends BaseModal {
    private subjects = [
        "主角", "配角", "反派", "路人", "动物", "神秘人物"
    ];
    
    private actions = [
        "面临抉择", "遭遇危机", "获得机遇", "失去重要的东西", "发现秘密", "改变命运"
    ];
    
    private settings = [
        "在黑暗的森林", "在繁华的都市", "在遥远的未来", "在古老的王国", "在梦境中", "在异世界"
    ];
    
    private emotions = [
        "恐惧", "喜悦", "悲伤", "愤怒", "希望", "绝望"
    ];
    
    private techniques = [
        "使用第一人称视角", "使用全知视角", "使用倒叙手法", "使用象征手法", "使用对比手法", "使用悬疑元素"
    ];
    
    private basicInspirations = [
        "尝试从一个不同的角度描述你的主角",
        "为你的故事添加一个意想不到的转折",
        "描述一个场景，使用所有五种感官",
        "写一段对话，展示角色之间的冲突",
        "创造一个有趣的反派角色",
        "描述一个令人难忘的场景设定",
        "为你的故事创建一个强有力的开头",
        "尝试使用不同的叙述视角",
        "为你的故事设计一个令人满意的结局"
    ];

    constructor(container: HTMLElement) {
        super(container, '创作灵感');
    }

    protected createContent() {
        const content = this.element.createDiv({ cls: 'inspiration-content' });
        
        // 创建灵感卡片
        const cardsContainer = content.createDiv({ cls: 'inspiration-cards' });
        
        // 随机选择3个灵感提示
        const selectedInspirations = this.getRandomInspirations(3);
        
        selectedInspirations.forEach(inspiration => {
            const card = cardsContainer.createDiv({ cls: 'inspiration-card' });
            card.createDiv({ cls: 'card-icon', text: '💡' });
            card.createDiv({ cls: 'card-text', text: inspiration });
            
            card.addEventListener('click', () => {
                this.showNotice('已复制到剪贴板');
                navigator.clipboard.writeText(inspiration).catch(() => {
                    this.showNotice('复制失败，请手动复制');
                });
            });
        });
        
        // 刷新按钮
        const refreshBtn = content.createDiv({ cls: 'refresh-btn', text: '换一批灵感' });
        refreshBtn.addEventListener('click', () => {
            cardsContainer.empty();
            const newInspirations = this.getRandomInspirations(3);
            
            newInspirations.forEach(inspiration => {
                const card = cardsContainer.createDiv({ cls: 'inspiration-card' });
                card.createDiv({ cls: 'card-icon', text: '💡' });
                card.createDiv({ cls: 'card-text', text: inspiration });
                
                card.addEventListener('click', () => {
                    this.showNotice('已复制到剪贴板');
                    navigator.clipboard.writeText(inspiration).catch(() => {
                        this.showNotice('复制失败，请手动复制');
                    });
                });
            });
        });
    }
    
    private getRandomInspirations(count: number): string[] {
        // 创建一个结果数组
        const result: string[] = [];
        
        // 添加一些基础灵感
        const shuffledBasic = [...this.basicInspirations].sort(() => 0.5 - Math.random());
        result.push(shuffledBasic[0]);
        
        // 添加一些组合灵感
        for (let i = 0; i < count - 1; i++) {
            // 随机决定使用哪种组合方式
            const combinationType = Math.floor(Math.random() * 4);
            
            switch (combinationType) {
                case 0:
                    // 角色+行动
                    result.push(this.getRandomElement(this.subjects) + this.getRandomElement(this.actions));
                    break;
                case 1:
                    // 场景+情感
                    result.push(this.getRandomElement(this.settings) + "，描述" + this.getRandomElement(this.emotions) + "氛围");
                    break;
                case 2:
                    // 角色+场景+行动
                    result.push(
                        "描述" + this.getRandomElement(this.subjects) + 
                        this.getRandomElement(this.settings) + 
                        this.getRandomElement(this.actions) + "的场景"
                    );
                    break;
                case 3:
                    // 技巧提示
                    result.push("尝试" + this.getRandomElement(this.techniques) + "来讲述你的故事");
                    break;
            }
        }
        
        return result;
    }
    
    private getRandomElement<T>(array: T[]): T {
        return array[Math.floor(Math.random() * array.length)];
    }
}