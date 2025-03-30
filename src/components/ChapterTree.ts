import { setIcon, App, TFile, Notice, Menu } from 'obsidian';
import { Book, ChapterNode } from '../types/book';
import { BookManager } from '../services/BookManager';
import { NamePromptModal } from '../modals/NamePromptModal';
import { ConfirmModal } from '../modals/ConfirmModal';

export class ChapterTree {
    // === 属性 ===
    private draggedNode: ChapterNode | null = null;
    private book: Book;

    constructor(
        private container: HTMLElement,
        private app: App,
        private bookPath: string,
        private bookManager: BookManager,
        private onDragComplete?: () => Promise<void>
    ) {}

    // === 核心渲染方法 ===
    render(book: Book) {
        this.book = { ...book };
        
        // 添加容器点击处理
        this.container.addEventListener('contextmenu', (e) => {
            // 确保点击的是章节树容器的空白区域
            if (e.target === this.container) {
                const menu = new Menu();
                
                menu.addItem((item) => {
                    item.setTitle("新建文件");
                    item.setIcon("file-plus");
                    item.onClick(() => this.createNode('file'));
                });

                menu.addItem((item) => {
                    item.setTitle("新建文件夹");
                    item.setIcon("folder-plus");
                    item.onClick(() => this.createNode('group'));
                });

                menu.showAtPosition({ x: e.clientX, y: e.clientY });
            }
        });

        const list = this.container.createEl('ul', { cls: 'book-smith-tree-list' });
        this.book.structure.tree.forEach(node => this.renderNode(list, node));
    }

    private renderNode(parent: HTMLElement, node: ChapterNode) {
        const item = parent.createEl('li', { cls: 'book-smith-tree-item' });
        const header = item.createDiv({ cls: 'book-smith-tree-header' });
        
        if (node.type === 'group' && node.children?.length) {
            this.setupFolderBehavior(header, item, node);
        }

        this.setupNodeIcon(header, node);
        this.setupNodeTitle(header, node);
        this.setupDragAndDrop(header, item, node);
        this.setupContextMenu(header, node);

        if (node.type === 'group' && node.children) {
            this.renderChildren(item, node.children, node);
        }
    }

    private renderChildren(item: HTMLElement, children: ChapterNode[], parentNode: ChapterNode) {
        const childContainer = item.createDiv({
            cls: 'book-smith-tree-children'
        });
        
        // 如果父节点是展开状态，添加展开类
        if (parentNode.is_expanded) {
            childContainer.addClass('is-expanded');
        }
        
        children.forEach(child => this.renderNode(childContainer, child));
    }

    // === 节点基础设置 ===
    private setupNodeIcon(header: HTMLElement, node: ChapterNode) {
        const icon = header.createSpan({ cls: 'book-smith-tree-icon' });
        setIcon(icon, node.type === 'file' ? 'document' : 'folder');
    }

    // 添加检查文件夹状态的方法
    private isFolderComplete(node: ChapterNode): boolean {
        if (node.type === 'file') {
            return node.default_status === 'done';
        }
        if (!node.children?.length) {
            return false;
        }
        return node.children.every(child => this.isFolderComplete(child));
    }

    private setupNodeTitle(header: HTMLElement, node: ChapterNode) {
        
        const titleSpan = header.createSpan({ 
            text: node.title,
            cls: 'book-smith-tree-title'
        });

        if (node.type === 'file') {
            titleSpan.addClass('book-smith-file-link');
            header.addEventListener('click', async () => {
                const filePath = `${this.bookPath}/${node.path}`;
                const file = this.app.vault.getAbstractFileByPath(filePath);
                if (file instanceof TFile) {
                    await this.app.workspace.getLeaf().openFile(file);
                }
            });
        }
        
        // 添加完成状态类名
        if ((node.type === 'file' && node.default_status === 'done') || 
            (node.type === 'group' && this.isFolderComplete(node))) {
            titleSpan.addClass('is-done');
        }
    }

    private setupFolderBehavior(header: HTMLElement, item: HTMLElement, node: ChapterNode) {
        const toggleBtn = header.createSpan({ cls: 'book-smith-tree-toggle' });
        
        // 根据节点的展开状态设置初始图标
        setIcon(toggleBtn, node.is_expanded ? 'chevron-down' : 'chevron-right');
        if (node.is_expanded) {
            toggleBtn.addClass('is-expanded');
            item.querySelector('.book-smith-tree-children')?.addClass('is-expanded');
        }
        
        const toggleFolder = async () => {
            const childContainer = item.querySelector('.book-smith-tree-children');
            if (childContainer) {
                const isExpanded = toggleBtn.hasClass('is-expanded');
                toggleBtn.toggleClass('is-expanded', !isExpanded);
                childContainer.toggleClass('is-expanded', !isExpanded);
                setIcon(toggleBtn, isExpanded ? 'chevron-right' : 'chevron-down');
                
                // 更新节点的展开状态并保存
                node.is_expanded = !isExpanded;
                await this.bookManager.updateBook(this.book.basic.uuid, {
                    structure: this.book.structure
                });
            }
        };

        header.addEventListener('click', (e) => {
            if (!(e.target as HTMLElement).closest('.book-smith-file-link')) {
                toggleFolder();
            }
        });
    }

    // === 右键菜单相关 ===
    private calculateChapterProgress(nodes: ChapterNode[]): number {
        let totalChapters = 0;
        let completedChapters = 0;

        const countChapters = (nodeList: ChapterNode[]) => {
            for (const node of nodeList) {
                if (node.type === 'file') {
                    totalChapters++;
                    if (node.default_status === 'done') {
                        completedChapters++;
                    }
                }
                if (node.children) {
                    countChapters(node.children);
                }
            }
        };

        countChapters(nodes);
        return totalChapters > 0 ? completedChapters / totalChapters : 0;
    }

    private setupContextMenu(header: HTMLElement, node: ChapterNode) {
        header.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const filePath = `${this.bookPath}/${node.path}`;
            const file = this.app.vault.getAbstractFileByPath(filePath);
            
            if (file) {
                const menu = new Menu();
                
                // 为文件夹类型添加创建选项
                if (node.type === 'group') {
                    menu.addItem((item) => {
                        item.setTitle("新建文件");
                        item.setIcon("file-plus");
                        item.onClick(() => {
                            this.createNode('file', node.path, node);
                        });
                    });

                    menu.addItem((item) => {
                        item.setTitle("新建文件夹");
                        item.setIcon("folder-plus");
                        item.onClick(() => {
                            this.createNode('group', node.path, node);
                        });
                    });

                    menu.addSeparator();
                }

                if (node.type === 'file') {
                    menu.addItem((item) => {
                        item.setTitle("在新标签页中打开");
                        item.setIcon("file-plus");
                        item.onClick(() => {
                            if (file instanceof TFile) {
                                this.app.workspace.getLeaf('tab').openFile(file);
                            }
                        });
                    });

                    menu.addItem((item) => {
                        item.setTitle("在新标签组中打开");
                        item.setIcon("files");
                        item.onClick(() => {
                            if (file instanceof TFile) {
                                this.app.workspace.getLeaf('split').openFile(file);
                            }
                        });
                    });

                    menu.addSeparator();

                    menu.addItem((item) => {
                        item.setTitle(node.default_status === 'done' ? "标记重新创作" : "标记完成章节");
                        item.setIcon(node.default_status === 'done' ? "x-circle" : "check-circle");
                        item.onClick(async () => {
                            node.default_status = node.default_status === 'done' ? 'draft' : 'done';
                            
                            // 计算新的章节进度
                            const progress = this.calculateChapterProgress(this.book.structure.tree);
                            
                            await this.bookManager.updateBook(this.book.basic.uuid, {
                                structure: this.book.structure,
                                stats: {
                                    ...this.book.stats,
                                    progress_by_chapter: progress
                                }
                            });
                            await this.onDragComplete?.();
                        });
                    });

                    menu.addSeparator();
                }

                menu.addItem((item) => {
                    item.setTitle("创建副本");
                    item.setIcon("copy");
                    item.onClick(async () => {
                        try {
                            const parentPath = node.path.substring(0, node.path.lastIndexOf('/'));
                            const baseName = node.title;
                            const newName = `${baseName} 副本`;
                            const newPath = parentPath
                                ? `${this.bookPath}/${parentPath}/${newName}${node.type === 'file' ? '.md' : ''}`
                                : `${this.bookPath}/${newName}${node.type === 'file' ? '.md' : ''}`;
                            
                            if (node.type === 'file' && file instanceof TFile) {
                                const content = await this.app.vault.read(file);
                                await this.app.vault.create(newPath, content);
                            } else {
                                // 创建文件夹及其内容的副本
                                await this.app.vault.createFolder(newPath);
                                if (node.children?.length) {
                                    await this.copyFolderContents(node.children, newPath, `${this.bookPath}/${node.path}`);
                                }
                            }
                            
                            // 在 setupContextMenu 方法中
                            const newNode: ChapterNode = {
                                id: crypto.randomUUID(),
                                title: newName,
                                type: node.type,
                                path: parentPath
                                    ? `${parentPath}/${newName}${node.type === 'file' ? '.md' : ''}`
                                    : `${newName}${node.type === 'file' ? '.md' : ''}`,
                                order: this.book.structure.tree.length + 1,
                                default_status: node.default_status,
                                created_at: new Date().toISOString(),
                                last_modified: new Date().toISOString(),
                                ...(node.type === 'group' ? { 
                                    children: node.children ? this.cloneNodes(node.children, newName, parentPath) : [] 
                                } : {})
                            };
        
                            this.insertNodeAfter(node, newNode);
                            await this.bookManager.updateBook(this.book.basic.uuid, {
                                structure: this.book.structure
                            });
                            await this.onDragComplete?.();
                            new Notice('创建副本成功');
                        } catch (error) {
                            new Notice(`创建副本失败: ${error.message}`);
                        }
                    });
                });

                menu.addItem((item) => {
                    item.setTitle("重命名");
                    item.setIcon("pencil");
                    item.onClick(async () => {
                        const newName = await this.promptForName("请输入新名称");
                        if (!newName) return;

                        try {
                            const parentPath = node.path.substring(0, node.path.lastIndexOf('/'));
                            const newPath = parentPath
                                ? `${this.bookPath}/${parentPath}/${newName}${node.type === 'file' ? '.md' : ''}`
                                : `${this.bookPath}/${newName}${node.type === 'file' ? '.md' : ''}`;

                            await this.app.vault.rename(file, newPath);
                            
                            node.title = newName;
                            node.path = parentPath
                                ? `${parentPath}/${newName}${node.type === 'file' ? '.md' : ''}`
                                : `${newName}${node.type === 'file' ? '.md' : ''}`;

                            if (node.type === 'group' && node.children) {
                                this.updateChildrenPaths(node.children, parentPath ? `${parentPath}/${newName}` : newName);
                            }

                            await this.bookManager.updateBook(this.book.basic.uuid, {
                                structure: this.book.structure
                            });

                            await this.onDragComplete?.();
                            new Notice('重命名成功');
                        } catch (error) {
                            new Notice(`重命名失败: ${error.message}`);
                        }
                    });
                });

                menu.addItem((item) => {
                    item.setTitle("删除");
                    item.setIcon("trash");
                    item.onClick(() => {
                        const title = node.type === 'file' ? "删除文件" : "删除文件夹";
                        const message = node.type === 'file' 
                            ? `确定要删除文件 "${node.title}" 吗？\n它将被移动到系统回收站。`
                            : `确定要删除文件夹 "${node.title}" 及其所有内容吗？\n它们将被移动到系统回收站。`;

                        new ConfirmModal(this.app, title, message, async () => {
                            try {
                                await this.app.vault.trash(file, true);
                                this.removeNodeFromTree(node);
                                await this.bookManager.updateBook(this.book.basic.uuid, {
                                    structure: this.book.structure
                                });
                                await this.onDragComplete?.();
                                new Notice('删除成功');
                            } catch (error) {
                                new Notice(`删除失败: ${error.message}`);
                            }
                        }).open();
                    });
                });

                menu.addSeparator();
                // this.app.workspace.trigger('file-menu', menu, file);
                menu.showAtPosition({ x: e.clientX, y: e.clientY });
            }
        });
    }

    // === 拖拽相关 ===
    private setupDragAndDrop(header: HTMLElement, item: HTMLElement, node: ChapterNode) {
        header.setAttribute('draggable', 'true');
        let dropPosition: 'before' | 'after' | 'inside' = 'inside';
        
        header.addEventListener('dragstart', (e) => {
            this.draggedNode = node;
            item.addClass('book-smith-dragging');
            e.dataTransfer?.setData('text/plain', node.id);
        });

        header.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (!this.draggedNode || this.draggedNode === node) return;
            
            if (this.isDescendant(node, this.draggedNode)) return;

            const rect = header.getBoundingClientRect();
            const mouseY = e.clientY;
            const threshold = rect.height / 4;

            header.classList.remove(
                'book-smith-dragover-before',
                'book-smith-dragover-after',
                'book-smith-dragover-inside'
            );

            if (mouseY < rect.top + threshold) {
                dropPosition = 'before';
                header.addClass('book-smith-dragover-before');
            } else if (mouseY > rect.bottom - threshold) {
                dropPosition = 'after';
                header.addClass('book-smith-dragover-after');
            } else if (node.type === 'group') {
                dropPosition = 'inside';
                header.addClass('book-smith-dragover-inside');
            } else {
                dropPosition = 'after';
                header.addClass('book-smith-dragover-after');
            }
        });

        header.addEventListener('dragleave', () => {
            header.classList.remove(
                'book-smith-dragover-before',
                'book-smith-dragover-after',
                'book-smith-dragover-inside'
            );
        });

        header.addEventListener('drop', async (e) => {
            e.preventDefault();
            header.classList.remove(
                'book-smith-dragover-before',
                'book-smith-dragover-after',
                'book-smith-dragover-inside'
            );

            if (this.draggedNode && this.draggedNode !== node && !this.isDescendant(node, this.draggedNode)) {
                await this.handleNodeMove(node, dropPosition);
            }
        });

        header.addEventListener('dragend', () => {
            item.removeClass('book-smith-dragging');
            document.querySelectorAll('.book-smith-dragover-before, .book-smith-dragover-after, .book-smith-dragover-inside')
                .forEach(el => {
                    el.classList.remove(
                        'book-smith-dragover-before',
                        'book-smith-dragover-after',
                        'book-smith-dragover-inside'
                    );
                });
        });
    }

    private isDescendant(parent: ChapterNode, child: ChapterNode): boolean {
        if (parent.type !== 'group' || !parent.children) return false;
        return parent.children.some(node => 
            node === child || this.isDescendant(node, child)
        );
    }

    private async handleNodeMove(targetNode: ChapterNode, position: 'before' | 'after' | 'inside') {
        if (!this.draggedNode) return;
        const movingNode = this.draggedNode;
        
        try {
            const sourcePath = `${this.bookPath}/${this.draggedNode.path}`;
            let targetPath: string;
            
            const fileName = this.draggedNode.type === 'file' 
                ? this.draggedNode.path.endsWith('.md') 
                    ? `${this.draggedNode.title}.md` 
                    : this.draggedNode.title
                : this.draggedNode.title;
            
            if (position === 'inside' && targetNode.type === 'group') {
                targetPath = `${this.bookPath}/${targetNode.path}/${fileName}`;
            } else {
                const targetParentPath = targetNode.path.substring(0, targetNode.path.lastIndexOf('/'));
                targetPath = targetParentPath 
                    ? `${this.bookPath}/${targetParentPath}/${fileName}`
                    : `${this.bookPath}/${fileName}`;
            }

            const sourceFile = this.app.vault.getAbstractFileByPath(sourcePath);
            if (!sourceFile) {
                throw new Error('源文件不存在');
            }

            const existingFile = this.app.vault.getAbstractFileByPath(targetPath);
            if (existingFile && existingFile !== sourceFile) {
                throw new Error('目标位置已存在同名文件');
            }

            if (position === 'inside') {
                const targetFolder = this.app.vault.getAbstractFileByPath(`${this.bookPath}/${targetNode.path}`);
                if (!targetFolder) {
                    throw new Error('目标文件夹不存在');
                }
            }

            await this.app.vault.rename(sourceFile, targetPath);
            this.updateTreeStructure(targetNode, targetPath, position, movingNode);
            await this.bookManager.updateBook(this.book.basic.uuid, {
                structure: this.book.structure
            });
            await this.onDragComplete?.();
        } catch (error) {
            console.error('移动失败:', error);
            new Notice(`移动失败`);
        } finally {
            this.draggedNode = null;
        }
    }

    private updateTreeStructure(
        targetNode: ChapterNode, 
        targetPath: string, 
        position: string,
        draggedNode: ChapterNode
    ) {
        const removeNode = (nodes: ChapterNode[]): ChapterNode | null => {
            for (let i = 0; i < nodes.length; i++) {
                if (nodes[i] === draggedNode) {
                    return nodes.splice(i, 1)[0];
                }
                if (nodes[i].type === 'group' && nodes[i].children) {
                    const children = nodes[i].children as ChapterNode[];
                    const found = removeNode(children);
                    if (found) return found;
                }
            }
            return null;
        };

        const insertNode = (nodes: ChapterNode[], position: string) => {
            for (let i = 0; i < nodes.length; i++) {
                if (nodes[i] === targetNode) {
                    if (position === 'inside' && nodes[i].type === 'group') {
                        if (!nodes[i].children) {
                            nodes[i].children = [];
                        }
                        const children = nodes[i].children as ChapterNode[];
                        children.push(draggedNode);
                    } else {
                        const insertIndex = position === 'before' ? i : i + 1;
                        nodes.splice(insertIndex, 0, draggedNode);
                    }
                    return true;
                }
                if (nodes[i].type === 'group' && nodes[i].children) {
                    const children = nodes[i].children as ChapterNode[];
                    if (insertNode(children, position)) {
                        return true;
                    }
                }
            }
            return false;
        };

        removeNode(this.book.structure.tree);
        const relativePath = targetPath.substring(this.bookPath.length + 1);
        draggedNode.path = relativePath;
        draggedNode.last_modified = new Date().toISOString();
        insertNode(this.book.structure.tree, position);
    }

    // === 节点操作相关 ===
    private async createNode(
        type: 'file' | 'group',
        parentPath: string = '',
        parentNode?: ChapterNode
    ) {
        const isFile = type === 'file';
        const name = await this.promptForName(`请输入${isFile ? '文件' : '文件夹'}名`);
        if (!name) return;
        
        const newPath = parentPath 
            ? `${this.bookPath}/${parentPath}/${name}${isFile ? '.md' : ''}`
            : `${this.bookPath}/${name}${isFile ? '.md' : ''}`;
            
        try {
            if (isFile) {
                await this.app.vault.create(newPath, '');
            } else {
                await this.app.vault.createFolder(newPath);
            }

            const newNode: ChapterNode = {
                order: this.book.structure.tree.length + 1,
                id: crypto.randomUUID(),
                title: name,
                type: type,
                path: parentPath 
                    ? `${parentPath}/${name}${isFile ? '.md' : ''}`
                    : `${name}${isFile ? '.md' : ''}`,
                default_status: 'draft',
                created_at: new Date().toISOString(),
                last_modified: new Date().toISOString(),
                ...(type === 'group' ? { children: [] } : {})
            };

            if (parentNode) {
                parentNode.children = parentNode.children || [];
                parentNode.children.push(newNode);
            } else {
                this.book.structure.tree.push(newNode);
            }

            await this.bookManager.updateBook(this.book.basic.uuid, {
                structure: this.book.structure
            });
            await this.onDragComplete?.();
        } catch (error) {
            new Notice(`创建${isFile ? '文件' : '文件夹'}失败: ${error.message}`);
        }
    }

    // === 辅助方法 ===
    private insertNodeAfter(referenceNode: ChapterNode, newNode: ChapterNode) {
        const insertInArray = (nodes: ChapterNode[]): boolean => {
            const index = nodes.findIndex(node => node === referenceNode);
            if (index !== -1) {
                nodes.splice(index + 1, 0, newNode);
                return true;
            }
            
            for (const node of nodes) {
                if (node.type === 'group' && node.children) {
                    if (insertInArray(node.children)) {
                        return true;
                    }
                }
            }
            return false;
        };

        insertInArray(this.book.structure.tree);
    }
    private async copyFolderContents(
        nodes: ChapterNode[], 
        newFolderPath: string, 
        sourceFolderPath: string
    ) {
        for (const node of nodes) {
            const sourceFilePath = `${sourceFolderPath}/${node.title}${node.type === 'file' ? '.md' : ''}`;
            const targetFilePath = `${newFolderPath}/${node.title}${node.type === 'file' ? '.md' : ''}`;

            if (node.type === 'file') {
                const sourceFile = this.app.vault.getAbstractFileByPath(sourceFilePath);
                if (sourceFile instanceof TFile) {
                    const content = await this.app.vault.read(sourceFile);
                    await this.app.vault.create(targetFilePath, content);
                }
            } else {
                await this.app.vault.createFolder(targetFilePath);
                if (node.children?.length) {
                    await this.copyFolderContents(node.children, targetFilePath, sourceFilePath);
                }
            }
        }
    }

    private cloneNodes(nodes: ChapterNode[], newParentName: string, parentPath: string): ChapterNode[] {
        return nodes.map(node => {
            const newPath = parentPath
                ? `${parentPath}/${newParentName}/${node.title}${node.type === 'file' ? '.md' : ''}`
                : `${newParentName}/${node.title}${node.type === 'file' ? '.md' : ''}`;

            return {
                id: crypto.randomUUID(),
                title: node.title,
                type: node.type,
                path: newPath,
                order: node.order,
                default_status: node.default_status,
                created_at: new Date().toISOString(),
                last_modified: new Date().toISOString(),
                ...(node.type === 'group' ? { 
                    children: node.children ? this.cloneNodes(node.children, node.title, newPath.replace(/\/[^/]+$/, '')) : [] 
                } : {})
            };
        });
    }
    private updateChildrenPaths(children: ChapterNode[], newParentPath: string) {
        children.forEach(child => {
            const childName = child.path.split('/').pop() as string;
            child.path = `${newParentPath}/${childName}`;
            if (child.type === 'group' && child.children) {
                this.updateChildrenPaths(child.children, child.path);
            }
        });
    }

    private removeNodeFromTree(nodeToRemove: ChapterNode) {
        const removeFromArray = (nodes: ChapterNode[]): boolean => {
            const index = nodes.findIndex(node => node === nodeToRemove);
            if (index !== -1) {
                nodes.splice(index, 1);
                return true;
            }
            
            for (const node of nodes) {
                if (node.type === 'group' && node.children) {
                    if (removeFromArray(node.children)) {
                        return true;
                    }
                }
            }
            return false;
        };

        removeFromArray(this.book.structure.tree);
    }

    private async promptForName(placeholder: string): Promise<string | null> {
        return new Promise((resolve) => {
            const modal = new NamePromptModal(this.app, placeholder, (result) => {
                resolve(result);
            });
            modal.open();
        });
    }
}