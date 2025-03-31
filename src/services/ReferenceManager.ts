import { App, Editor, Menu, TFile, Notice } from 'obsidian';
import BookSmithPlugin from '../main';
import { Book, ChapterNode } from '../types/book';
import { Reference, ReferenceData, ChapterReferences } from '../types/reference';
import { ReferenceModal } from '../modals/ReferenceModal';

export class ReferenceManager {
    constructor(
        private app: App,
        private plugin: BookSmithPlugin,
        private getCurrentBook: () => Book | null
    ) { }

    // 1. 初始化和注册
    registerEditorMenu() {
        this.plugin.registerEvent(
            this.app.workspace.on("editor-menu", async (menu, editor, view) => {
                if (!this.isValidContext(view.file)) return;
                const bookPath = this.getBookPath();
                if (!bookPath) return;
                await this.handleEditorMenu(menu, editor, bookPath, view.file);
            })
        );
    }

    // 2. 路径和节点处理
    private getBookPath(): string | null {
        const currentBook = this.getCurrentBook();
        return currentBook
            ? `${this.plugin.settings.defaultBookPath}/${currentBook.basic.title}`
            : null;
    }

    private isValidContext(file: TFile | null): boolean {
        if (!file || !this.getCurrentBook()) return false;
        const bookPath = this.getBookPath();
        if (!bookPath) return false;
        return file.path.startsWith(bookPath);
    }

    private findCurrentNode(file: TFile | null): ChapterNode | null {
        const currentBook = this.getCurrentBook();
        if (!file || !currentBook) return null;

        const bookBasePath = `${this.plugin.settings.defaultBookPath}/${currentBook.basic.title}/`;
        if (!file?.path || !file.path.startsWith(bookBasePath)) return null;

        const relativePath = file.path.slice(bookBasePath.length);
        const findNode = (nodes: ChapterNode[]): ChapterNode | null => {
            for (const node of nodes) {
                if (node.path === relativePath) return node;
                if (node.children) {
                    const found = findNode(node.children);
                    if (found) return found;
                }
            }
            return null;
        };
        return findNode(currentBook.structure.tree);
    }

    private findNodePath(id: string): number[] {
        const currentBook = this.getCurrentBook();
        if (!currentBook) return [];
        
        const findPath = (nodes: ChapterNode[], parentOrder: number[] = []): number[] => {
            for (const node of nodes) {
                const currentPath = [...parentOrder, node.order];
                if (node.id === id) return currentPath;
                if (node.children) {
                    const found = findPath(node.children, currentPath);
                    if (found.length > 0) return found;
                }
            }
            return [];
        };
        return findPath(currentBook.structure.tree);
    }

    // 3. 引用数据处理
    private generateRandomId(): string {
        return Math.random().toString(36).substring(2, 15);
    }

    private async getReferenceData(bookPath: string): Promise<ReferenceData> {
        const referenceConfigPath = `${bookPath}/.references.json`;
        try {
            if (await this.app.vault.adapter.exists(referenceConfigPath)) {
                const data = await this.app.vault.adapter.read(referenceConfigPath);
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('读取引用配置失败:', error);
        }
        return { chapters: [] };
    }

    private findReferenceById(references: ReferenceData, refId: string): { ref: Reference, chapter: ChapterReferences, order: number } | null {
        for (const chapter of references.chapters) {
            const index = chapter.references.findIndex(r => r.id === refId);
            if (index !== -1) {
                return {
                    ref: chapter.references[index],
                    chapter,
                    order: index + 1
                };
            }
        }
        return null;
    }

    private findReferenceByText(references: ReferenceData, text: string): { ref: Reference, chapter: ChapterReferences } | null {
        for (const chapter of references.chapters) {
            const ref = chapter.references.find(r => r.text === text);
            if (ref) {
                return { ref, chapter };
            }
        }
        return null;
    }

    private findChapterByNode(references: ReferenceData, node: ChapterNode): ChapterReferences {
        let chapter = references.chapters.find(c => c.chapterId === node.id);
        if (!chapter) {
            chapter = {
                chapterId: node.id,
                chapterTitle: node.title,
                orderPath: this.findNodePath(node.id),
                references: []
            };
            references.chapters.push(chapter);
        }
        return chapter;
    }

    private checkReferenceFile(bookPath: string): boolean {
        const referencePath = `${bookPath}/引用书目.md`;
        const file = this.app.vault.getAbstractFileByPath(referencePath);
        if (!file) {
            new Notice('请先在书籍目录下创建"引用书目.md"文件');
            return false;
        }
        return true;
    }

    private async updateReferenceFiles(bookPath: string, references: ReferenceData) {
        // 更新配置文件
        const referenceConfigPath = `${bookPath}/.references.json`;
        await this.app.vault.adapter.write(
            referenceConfigPath,
            JSON.stringify(references, null, 2)
        );

        if (!this.checkReferenceFile(bookPath)) return;

        // 更新引用文件
        const referencePath = `${bookPath}/引用书目.md`;
        const file = this.app.vault.getAbstractFileByPath(referencePath) as TFile;

        // 按章节顺序排序
        references.chapters.sort((a, b) => {
            const pathA = a.orderPath;
            const pathB = b.orderPath;

            // 逐层比较顺序
            for (let i = 0; i < Math.min(pathA.length, pathB.length); i++) {
                if (pathA[i] !== pathB[i]) {
                    return pathA[i] - pathB[i];
                }
            }
            // 如果前面的层级都相同，更短的路径排在前面
            return pathA.length - pathB.length;
        });

        // 生成新的内容
        let content = '';
        for (const chapter of references.chapters) {
            content += `#### ${chapter.chapterTitle}\n`;
            chapter.references.forEach((ref, index) => {
                ref.order = index + 1;
                content += `${ref.order}. ${ref.content} ^${ref.id}\n`;
            });
            content += '\n';
        }

        await this.app.vault.modify(file, content);
    }

    // 4. 工具方法
    private toSuperscript(num: number): string {
        const superscripts = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
        return num.toString().split('').map(d => superscripts[parseInt(d)]).join('');
    }

    // 5. 菜单处理
    private async handleEditorMenu(menu: Menu, editor: Editor, bookPath: string, file: TFile | null) {
        const cursor = editor.getCursor();
        const line = editor.getLine(cursor.line);
        const selectedText = editor.getSelection().trim();
        const pattern = /(\[\[.*?#\^(.*?)\|.*?\]\])([\^⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g;     

        // 找到当前行所有的引用
        let match;
        let currentRef = null;
        while ((match = pattern.exec(line)) !== null) {
            if (cursor.ch >= match.index && cursor.ch <= match.index + match[0].length) {
                currentRef = match;
            }
        }

        if (currentRef) {
            this.addEditReferenceMenuItem(menu, editor, bookPath, currentRef[2]);
            this.addDeleteReferenceMenuItem(menu, editor, bookPath, currentRef[2], currentRef[1], currentRef[3]);
        } else if (selectedText) {
            this.addNewReferenceMenuItem(menu, editor, file);
        }
    }

    private addEditReferenceMenuItem(menu: Menu, editor: Editor, bookPath: string, refId: string) {
        menu.addItem((item) => {
            item
                .setTitle("编辑当前引用")
                .setIcon("edit")
                .onClick(async () => {
                    const references = await this.getReferenceData(bookPath);
                    const found = this.findReferenceById(references, refId);
                    if (found) {
                        this.openReferenceEditModal(found.ref, references, bookPath, editor);
                    }
                });
        });
    }

    private addDeleteReferenceMenuItem(
        menu: Menu,
        editor: Editor,
        bookPath: string,
        refId: string,
        linkPart: string,
        orderPart: string
    ) {
        menu.addItem((item) => {
            item
                .setTitle("删除当前引用")
                .setIcon("trash")
                .onClick(async () => {
                    const references = await this.getReferenceData(bookPath);
                    const found = this.findReferenceById(references, refId);
                    if (found) {
                        found.chapter.references = found.chapter.references.filter(r => r.id !== refId);
                        await this.updateReferenceFiles(bookPath, references);

                        const cursor = editor.getCursor();
                        const line = editor.getLine(cursor.line);
                        const fullMatch = linkPart + orderPart;
                        const start = line.indexOf(fullMatch);
                        const end = start + fullMatch.length;

                        const textMatch = linkPart.match(/\[\[.*?\|(.*?)\]\]/);
                        const originalText = textMatch ? textMatch[1] : "";

                        editor.replaceRange(
                            originalText,
                            { line: cursor.line, ch: start },
                            { line: cursor.line, ch: end }
                        );
                    }
                });
        });
    }

    private addNewReferenceMenuItem(menu: Menu, editor: Editor, file: TFile | null) {
        menu.addItem((item) => {
            item
                .setTitle("插入新引用")
                .setIcon("quote-glyph")
                .onClick(async () => {
                    await this.handleReferenceInsertion(editor, file);
                });
        });
    }

    // 6. 引用操作处理
    private async handleReferenceInsertion(editor: Editor, file: TFile | null) {
        const selectedText = editor.getSelection().trim();
        if (!selectedText || selectedText.length === 0) {
            new Notice("请选择要引用的文本");
            return;
        }

        const bookPath = this.getBookPath();
        if (!bookPath) return;

        if (!this.checkReferenceFile(bookPath)) return;

        const references = await this.getReferenceData(bookPath);
        const existingRef = this.findReferenceByText(references, selectedText);

        if (existingRef) {
            this.openReferenceEditModal(existingRef.ref, references, bookPath, editor, selectedText);
            return;
        }

        this.openReferenceCreateModal(references, bookPath, editor, selectedText, file);
    }

    private openReferenceEditModal(
        ref: Reference,
        references: ReferenceData,
        bookPath: string,
        editor?: Editor,
        selectedText?: string
    ) {
        new ReferenceModal(this.app, async (referenceContent) => {
            if (!referenceContent) return;
            ref.content = referenceContent;
            ref.createTime = new Date().toISOString();
            await this.updateReferenceFiles(bookPath, references);

            if (editor && selectedText) {
                const found = this.findReferenceById(references, ref.id);
                if (found) {
                    const referenceLink = `[[${bookPath}/引用书目#^${ref.id}|${selectedText}]]${this.toSuperscript(found.order)}`;
                    editor.replaceSelection(referenceLink);
                }
            }
        }, ref.content).open();
    }

    private openReferenceCreateModal(
        references: ReferenceData,
        bookPath: string,
        editor: Editor,
        selectedText: string,
        file: TFile | null
    ) {
        new ReferenceModal(this.app, async (referenceContent) => {
            if (!referenceContent) return;

            const currentNode = this.findCurrentNode(file);
            if (!currentNode) {
                new Notice("无法获取当前章节信息");
                return;
            }

            const chapter = this.findChapterByNode(references, currentNode);
            const newRef: Reference = {
                id: this.generateRandomId(),
                text: selectedText,
                content: referenceContent,
                createTime: new Date().toISOString(),
                order: chapter.references.length + 1
            };

            chapter.references.push(newRef);
            await this.updateReferenceFiles(bookPath, references);

            const referenceLink = `[[${bookPath}/引用书目#^${newRef.id}|${selectedText}]]${this.toSuperscript(newRef.order)}`;
            editor.replaceSelection(referenceLink);
        }).open();
    }
}