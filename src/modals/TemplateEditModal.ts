import { App, Modal, Setting, setIcon, Menu, Notice } from 'obsidian';
import { ChapterTree, ChapterNode } from '../types/book';
import BookSmithPlugin from '../main';
import { v4 as uuidv4 } from 'uuid';
import { i18n } from '../i18n/i18n';

export class TemplateEditModal extends Modal {
    private templateName: string = '';
    private templateDesc: string = '';
    private templateStructure: ChapterTree;
    private isEdit: boolean;
    private originalKey: string;

    constructor(
        app: App,
        private plugin: BookSmithPlugin,
        templateKey?: string,
        private onSaved?: () => void  // 添加回调函数参数
    ) {
        super(app);
        this.isEdit = !!templateKey;
        this.originalKey = templateKey || '';
        
        if (this.isEdit) {
            const template = this.plugin.settings.templates.custom[this.originalKey || ''];
            this.templateName = template.name;
            this.templateDesc = template.description;
            this.templateStructure = JSON.parse(JSON.stringify(template.structure));
        } else {
            this.templateStructure = {
                tree: []
            };
        }
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('book-smith-template-modal');

        contentEl.createEl('h2', { text: this.isEdit ? i18n.t('TEMPLATE_EDIT_TITLE') : i18n.t('TEMPLATE_CREATE_TITLE') });

        // 基本信息设置
        const formContainer = contentEl.createDiv('book-smith-template-form');
        new Setting(formContainer)
            .setName(i18n.t('TEMPLATE_NAME'))
            .addText(text => text
                .setPlaceholder(i18n.t('TEMPLATE_NAME_PLACEHOLDER'))
                .setValue(this.templateName)
                .onChange(value => this.templateName = value));

        new Setting(formContainer)
            .setName(i18n.t('TEMPLATE_DESC'))
            .addTextArea(text => text
                .setPlaceholder(i18n.t('TEMPLATE_DESC_PLACEHOLDER'))
                .setValue(this.templateDesc)
                .onChange(value => this.templateDesc = value));

        // 模板结构编辑区域
        const structureContainer = contentEl.createDiv('book-smith-template-structure');
        structureContainer.createEl('h3', { text: i18n.t('TEMPLATE_STRUCTURE') });

        // 添加新节点按钮
        new Setting(structureContainer)
            .addButton(btn => btn
                .setButtonText(i18n.t('ADD_FILE'))
                .onClick(() => {
                    const newNode = this.createNewNode('file', i18n.t('NEW_CHAPTER'));
                    this.templateStructure.tree.push(newNode);
                    this.createNodeSetting(nodeListContainer, newNode, this.templateStructure.tree.length - 1);
                }))
            .addButton(btn => btn
                .setButtonText(i18n.t('ADD_FOLDER'))
                .onClick(() => {
                    const newNode = this.createNewNode('group', i18n.t('NEW_DIRECTORY'));
                    this.templateStructure.tree.push(newNode);
                    this.createNodeSetting(nodeListContainer, newNode, this.templateStructure.tree.length - 1);
                }));

        // 创建一个固定的节点列表容器
        const nodeListContainer = structureContainer.createDiv('book-smith-node-list');
        
        // 显示现有节点
        this.templateStructure.tree.forEach((node, index) => {
            this.createNodeSetting(nodeListContainer, node, index);
        });

        // 保存和取消按钮
        const buttonContainer = contentEl.createDiv('modal-button-container');
        new Setting(buttonContainer)
            .addButton(btn => btn
                .setButtonText(this.isEdit? i18n.t('SAVE') : i18n.t('CREATE'))
                .setCta()
                .onClick(async () => {
                    const saved = await this.saveTemplate();
                    if (saved) {
                        this.close();
                    }
                }))
            .addButton(btn => btn
                .setButtonText(i18n.t('CANCEL'))
                .onClick(() => this.close()));
    }

    private createNodeSetting(container: HTMLElement, node: ChapterNode, index: number) {
        const nodeDiv = container.createDiv('book-smith-template-node');
        
        // 创建内容容器
        const nodeContent = nodeDiv.createDiv('book-smith-node-content');
        
        // 添加右键菜单处理
        if (node.type === 'group') {
            nodeContent.addEventListener('contextmenu', (e) => {
                const menu = new Menu();
                menu.addItem((item) => {
                    item.setTitle(i18n.t('ADD_FILE'))
                        .setIcon('file-plus')
                        .onClick(() => {
                            const newNode = this.createNewNode('file', i18n.t('NEW_CHAPTER'), node);
                            node.children = node.children || [];
                            node.children.push(newNode);
                            this.refreshStructure(container);
                        });
                });
                menu.addItem((item) => {
                    item.setTitle(i18n.t('ADD_FOLDER'))
                        .setIcon('folder-plus')
                        .onClick(() => {
                            const newNode = this.createNewNode('group', i18n.t('NEW_DIRECTORY'), node);
                            node.children = node.children || [];
                            node.children.push(newNode);
                            this.refreshStructure(container);
                        });
                });
                menu.showAtPosition({ x: e.clientX, y: e.clientY });
                e.preventDefault();
            });
        }

        // 如果是文件夹，添加展开/折叠按钮
        if (node.type === 'group') {
            const toggleBtn = nodeContent.createSpan('book-smith-node-toggle');
            setIcon(toggleBtn, node.is_expanded ? 'chevron-down' : 'chevron-right');
            toggleBtn.addEventListener('click', () => {
                node.is_expanded = !node.is_expanded;
                this.refreshStructure(container);
            });
        }
        
        // 创建图标
        const icon = nodeContent.createSpan('book-smith-node-icon');
        setIcon(icon, node.type === 'file' ? 'document' : 'folder');
        
        // 创建输入框
        const input = nodeContent.createEl('input', {
            type: 'text',
            value: node.title,
            placeholder: '输入名称',
            cls: 'book-smith-node-input'
        });
        
        input.addEventListener('change', (e) => {
            const value = (e.target as HTMLInputElement).value;
            node.title = value;
            
            // 构建完整路径
            let fullPath = value;
            const parentContainer = container.closest('.book-smith-node-children');
            if (parentContainer) {
                const parentNode = this.findParentNode(this.templateStructure.tree, node.id);
                if (parentNode) {
                    fullPath = `${parentNode.path}/${value}`;
                }
            }
            node.path = node.type === 'file' ? `${fullPath}.md` : fullPath;
        });

        // 创建删除按钮（放在主容器中）
        const deleteBtn = nodeDiv.createSpan('book-smith-node-delete');
        setIcon(deleteBtn, 'trash');
        deleteBtn.addEventListener('click', () => {
            if (node.type === 'group' && node.children?.length) {
                if (!confirm('确定要删除此文件夹及其所有内容吗？')) {
                    return;
                }
            }
            
            // 查找父节点
            const parentContainer = container.closest('.book-smith-node-children');
            if (parentContainer) {
                // 如果是子节点，从父节点的children中删除
                const parentNode = this.findParentNode(this.templateStructure.tree, node.id);
                if (parentNode && parentNode.children) {
                    parentNode.children = parentNode.children.filter(child => child.id !== node.id);
                }
            } else {
                // 如果是顶层节点，从tree中删除
                this.templateStructure.tree = this.templateStructure.tree.filter(n => n.id !== node.id);
            }
            
            this.updateNodeOrders();
            this.refreshStructure(container);
        });

        // 如果是文件夹，添加子节点容器到父容器而不是节点容器
        if (node.type === 'group') {
            const childrenContainer = container.createDiv({
                cls: `book-smith-node-children ${node.is_expanded ? 'is-expanded' : ''}`
            });

            // 渲染子节点
            if (node.children?.length && node.is_expanded) {
                node.children.forEach((child, childIndex) => {
                    this.createNodeSetting(childrenContainer, child, childIndex);
                });
            }
        }
    }

    private updateNodeOrders() {
        this.templateStructure.tree.forEach((node, index) => {
            node.order = index;
        });
    }

    // 添加创建节点的辅助方法
    private getNextNodeNumber(nodes: ChapterNode[], baseTitle: string): number {
        let maxNum = 0;
        const pattern = new RegExp(`${baseTitle}(\\d+)?$`);
        
        const checkNode = (node: ChapterNode) => {
            if (pattern.test(node.title)) {
                const match = node.title.match(/\d+$/);
                const num = match ? parseInt(match[0]) : 0;
                maxNum = Math.max(maxNum, num);
            }
        };
        
        nodes.forEach(checkNode);
        return maxNum + 1;
    }

    private createNewNode(type: 'file' | 'group', baseTitle: string, parentNode?: ChapterNode): ChapterNode {
        const nodes = parentNode ? (parentNode.children || []) : this.templateStructure.tree;
        const num = this.getNextNodeNumber(nodes, baseTitle);
        const title = `${baseTitle}${num || ''}`;

        // 构建完整路径
        let fullPath = title;
        if (parentNode) {
            fullPath = `${parentNode.path}/${title}`;
        }

        return {
            id: Math.random().toString(36).substring(2, 9),
            title,
            type,
            path: type === 'file' ? `${fullPath}.md` : fullPath,
            order: nodes.length,
            default_status: 'draft',
            created_at: new Date().toISOString(),
            last_modified: new Date().toISOString(),
            ...(type === 'group' ? { children: [] } : {})
        };
    }

    private refreshStructure(container: HTMLElement) {
        // 找到节点列表容器
        const nodeListContainer = container.closest('.book-smith-template-structure')?.querySelector('.book-smith-node-list');
        if (nodeListContainer) {
            nodeListContainer.empty();
            // 只重新渲染节点列表
            this.templateStructure.tree.forEach((node, index) => {
                this.createNodeSetting(nodeListContainer as HTMLElement, node, index);
            });
        }
    }

    // 保存验证和提示
    async saveTemplate(): Promise<boolean> {
        if (!this.templateName.trim()) {
            new Notice(i18n.t('TEMPLATE_NAME_REQUIRED'));
            return false;
        }
    
        if (this.templateStructure.tree.length === 0) {
            new Notice(i18n.t('TEMPLATE_NODE_REQUIRED'));
            return false;
        }
    
        try {
            const key = this.isEdit ? 
                this.originalKey : 
                `${uuidv4().slice(0, 8)}`;
            
            if (!this.isEdit && Object.values(this.plugin.settings.templates.custom).some(t => t.name === this.templateName)) {
                new Notice(i18n.t('TEMPLATE_NAME_EXISTS'));
                return false;
            }
            
            this.plugin.settings.templates.custom[key] = {
                name: this.templateName,
                description: this.templateDesc,
                structure: this.templateStructure,
                isBuiltin: false
            };
    
            await this.plugin.saveSettings();
            new Notice(i18n.t('TEMPLATE_SAVE_SUCCESS'));
            
            this.onSaved?.();
            return true;
        } catch (error) {
            console.error('保存模板失败:', error);
            new Notice(i18n.t('TEMPLATE_SAVE_FAILED'));
            return false;
        }
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }

    // 添加查找父节点的辅助方法
    private findParentNode(nodes: ChapterNode[], targetId: string): ChapterNode | null {
        for (const node of nodes) {
            if (node.children?.some(child => child.id === targetId)) {
                return node;
            }
            if (node.children?.length) {
                const found = this.findParentNode(node.children, targetId);
                if (found) return found;
            }
        }
        return null;
    }
}