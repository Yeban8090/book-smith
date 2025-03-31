import { App, Editor, Menu, TFile, Notice } from 'obsidian';
import BookSmithPlugin from '../main';
import { Book } from '../types/book';
import { Reference, ReferenceData } from '../types/reference';
import { ReferenceModal } from '../modals/ReferenceModal';

export class ReferenceManager {
    constructor(
        private app: App,
        private plugin: BookSmithPlugin,
        private getCurrentBook: () => Book | null
    ) {}

    // 1. 菜单注册和处理
    registerEditorMenu() {
        this.plugin.registerEvent(
            this.app.workspace.on("editor-menu", async (menu, editor, view) => {
                if (!this.isValidContext(view.file)) return;
                
                const bookPath = this.getBookPath();
                if (!bookPath) return;

                await this.handleEditorMenu(menu, editor, bookPath);
            })
        );
    }

    private async handleEditorMenu(menu: Menu, editor: Editor, bookPath: string) {
        const cursor = editor.getCursor();
        const line = editor.getLine(cursor.line);
        const pattern = new RegExp(`\\[\\[${bookPath}\\/引用书目#\\^(\\d+)\\|.*?\\]\\]`);
        const match = line.match(pattern);
        
        if (match) {
            this.addEditReferenceMenuItem(menu, editor, bookPath, parseInt(match[1]));
        } else {
            this.addNewReferenceMenuItem(menu, editor);
        }
    }

    private addEditReferenceMenuItem(menu: Menu, editor: Editor, bookPath: string, refId: number) {
        menu.addItem((item) => {
            item
                .setTitle("编辑当前引用")
                .setIcon("edit")
                .onClick(async () => {
                    const references = await this.getReferenceData(bookPath);
                    const ref = references.items.find(r => r.id === refId);
                    if (ref) {
                        this.openReferenceEditModal(ref, references, bookPath);
                    }
                });
        });
    }

    private addNewReferenceMenuItem(menu: Menu, editor: Editor) {
        menu.addItem((item) => {
            item
                .setTitle("插入新引用")
                .setIcon("quote-glyph")
                .onClick(async () => {
                    await this.handleReferenceInsertion(editor);
                });
        });
    }

    // 2. 引用处理核心逻辑
    private async handleReferenceInsertion(editor: Editor) {
        const selectedText = editor.getSelection();
        if (!selectedText) return;

        const bookPath = this.getBookPath();
        if (!bookPath) return;
        
        if (!this.checkReferenceFile(bookPath)) return;

        const references = await this.getReferenceData(bookPath);
        const existingRef = references.items.find(ref => ref.text === selectedText);
        
        if (existingRef) {
            this.openReferenceEditModal(existingRef, references, bookPath, editor, selectedText);
            return;
        }
        
        this.openReferenceCreateModal(references, bookPath, editor, selectedText);
    }

    // 3. 模态框处理
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
                const referenceLink = `[[${bookPath}/引用书目#^${ref.id}|${selectedText}]]^${ref.id}`;
                editor.replaceSelection(referenceLink);
            }
        }, ref.content).open();
    }

    private openReferenceCreateModal(
        references: ReferenceData,
        bookPath: string,
        editor: Editor,
        selectedText: string
    ) {
        new ReferenceModal(this.app, async (referenceContent) => {
            if (!referenceContent) return;

            const refId = references.nextId++;
            references.items.push({
                id: refId,
                text: selectedText,
                content: referenceContent,
                createTime: new Date().toISOString()
            });

            await this.updateReferenceFiles(bookPath, references);

            const referenceLink = `[[${bookPath}/引用书目#^${refId}|${selectedText}]]^${refId}`;
            editor.replaceSelection(referenceLink);
        }).open();
    }

    // 4. 工具方法
    private isValidContext(file: TFile | null): boolean {
        if (!file || !this.getCurrentBook()) return false;
        
        const bookPath = this.getBookPath();
        if (!bookPath) return false;

        return file.path.startsWith(bookPath);
    }

    private getBookPath(): string | null {
        const currentBook = this.getCurrentBook();
        return currentBook 
            ? `${this.plugin.settings.defaultBookPath}/${currentBook.basic.title}`
            : null;
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

    // 5. 数据处理
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
        return { nextId: 1, items: [] };
    }

    private async updateReferenceFiles(bookPath: string, references: ReferenceData) {
        const referenceConfigPath = `${bookPath}/.references.json`;
        await this.app.vault.adapter.write(
            referenceConfigPath, 
            JSON.stringify(references, null, 2)
        );

        if (!this.checkReferenceFile(bookPath)) return;

        const referencePath = `${bookPath}/引用书目.md`;
        const file = this.app.vault.getAbstractFileByPath(referencePath) as TFile;
        const content = this.generateReferenceContent(references.items);
        await this.app.vault.modify(file, content);
    }

    private generateReferenceContent(references: Reference[]): string {
        let content = '';
        for (const ref of references) {
            content += `${ref.id}. ${ref.content} ^${ref.id}\n`;
        }
        return content;
    }
}