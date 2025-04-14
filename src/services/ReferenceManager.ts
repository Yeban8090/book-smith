import { App, Editor, Menu, TFile, Notice } from 'obsidian';
import BookSmithPlugin from '../main';
import { Book, ChapterNode } from '../types/book';
import { Reference, ReferenceData, ChapterReferences } from '../types/reference';
import { ReferenceModal } from '../modals/ReferenceModal';
import { i18n } from '../i18n/i18n';

export class ReferenceManager {
    // === 1. 初始化 ===
    constructor(
        private app: App,
        private plugin: BookSmithPlugin,
        private getCurrentBook: () => Book | null
    ) { }

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

    // === 2. 路径和上下文验证 ===
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

    private checkReferenceFile(bookPath: string): boolean {
        const referencePath = `${bookPath}/${i18n.t('REFERENCE_FILE_NAME')}`;
        const file = this.app.vault.getAbstractFileByPath(referencePath);
        if (!file) {
            new Notice(i18n.t('REFERENCE_FILE_NOT_FOUND'));
            return false;
        }
        return true;
    }

    // === 3. 节点查找和路径处理 ===
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

    // === 4. 引用数据管理 ===
    private generateRandomId(): string {
        return Math.random().toString(36).substring(2, 15);
    }

    // === 4. 引用数据管理 ===
    private async getReferenceData(bookPath: string): Promise<ReferenceData> {
        const referenceConfigPath = `${bookPath}/references.json`;
        try {
            const configFile = this.app.vault.getAbstractFileByPath(referenceConfigPath);
            if (configFile instanceof TFile) {
                const data = await this.app.vault.read(configFile);
                const references = JSON.parse(data);
                await this.syncChaptersInfo(references);
                return references;
            }
        } catch (error) {
            console.error('读取引用配置失败:', error);
        }
        return { chapters: [] };
    }

    private async syncChaptersInfo(references: ReferenceData) {
        const currentBook = this.getCurrentBook();
        if (!currentBook) return;

        const chaptersMap = new Map();
        const traverse = (nodes: ChapterNode[]) => {
            for (const node of nodes) {
                const orderPath = this.findNodePath(node.id);
                chaptersMap.set(node.id, {
                    title: node.title,
                    orderPath
                });
                if (node.children) {
                    traverse(node.children);
                }
            }
        };
        traverse(currentBook.structure.tree);

        references.chapters = references.chapters.filter(chapter => {
            const latestInfo = chaptersMap.get(chapter.chapterId);
            if (latestInfo) {
                chapter.chapterTitle = latestInfo.title;
                chapter.orderPath = latestInfo.orderPath;
                return true;
            }
            return false;
        });
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

    private async updateReferenceFiles(bookPath: string, references: ReferenceData) {
        const referenceConfigPath = `${bookPath}/references.json`;
        const configFile = this.app.vault.getAbstractFileByPath(referenceConfigPath);
        const jsonContent = JSON.stringify(references, null, 2);
        
        if (configFile instanceof TFile) {
            await this.app.vault.modify(configFile, jsonContent);
        } else {
            await this.app.vault.create(referenceConfigPath, jsonContent);
        }

        if (!this.checkReferenceFile(bookPath)) return;

        const referencePath = `${bookPath}/${i18n.t('REFERENCE_FILE_NAME')}`;
        const file = this.app.vault.getAbstractFileByPath(referencePath);
        if (!(file instanceof TFile)) {
            throw new Error(i18n.t('REFERENCE_FILE_ERROR'));
        }

        references.chapters.sort((a, b) => {
            const pathA = a.orderPath;
            const pathB = b.orderPath;
            for (let i = 0; i < Math.min(pathA.length, pathB.length); i++) {
                if (pathA[i] !== pathB[i]) {
                    return pathA[i] - pathB[i];
                }
            }
            return pathA.length - pathB.length;
        });

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

    // === 5. 工具方法 ===
    private toSuperscript(num: number): string {
        const superscripts = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
        return num.toString().split('').map(d => superscripts[parseInt(d)]).join('');
    }

    // === 6. 菜单处理 ===
    private async handleEditorMenu(menu: Menu, editor: Editor, bookPath: string, file: TFile | null) {
        const cursor = editor.getCursor();
        const line = editor.getLine(cursor.line);
        const selectedText = editor.getSelection().trim();
        const pattern = /(\[\[.*?#\^(.*?)\|.*?\]\])([\^⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g;     

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
                .setTitle(i18n.t('EDIT_REFERENCE'))
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

    private addDeleteReferenceMenuItem(menu: Menu, editor: Editor, bookPath: string, refId: string, linkPart: string, orderPart: string) {
        menu.addItem((item) => {
            item
                .setTitle(i18n.t('DELETE_REFERENCE'))
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
                .setTitle(i18n.t('INSERT_REFERENCE'))
                .setIcon("quote-glyph")
                .onClick(async () => {
                    await this.handleReferenceInsertion(editor, file);
                });
        });
    }

    // === 7. 引用操作处理 ===
    private async handleReferenceInsertion(editor: Editor, file: TFile | null) {
        const selectedText = editor.getSelection().trim();
        if (!selectedText || selectedText.length === 0) {
            new Notice(i18n.t('SELECT_TEXT_TO_REFERENCE'));
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
                    const referenceLink = `[[${bookPath}/${i18n.t('REFERENCE_FILE_NAME')}#^${ref.id}|${selectedText}]]${this.toSuperscript(found.order)}`;
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
                new Notice(i18n.t('CHAPTER_INFO_ERROR'));
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

            const referenceLink = `[[${bookPath}/${i18n.t('REFERENCE_FILE_NAME')}#^${newRef.id}|${selectedText}]]${this.toSuperscript(newRef.order)}`;
            editor.replaceSelection(referenceLink);
        }).open();
    }
}