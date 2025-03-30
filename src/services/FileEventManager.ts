import { App, TFile, TFolder } from 'obsidian';
import BookSmithPlugin from '../main';
import { ChapterNode } from '../types/book';
import { Book } from '../types/book';

export class FileEventManager {
    constructor(
        private app: App,
        private plugin: BookSmithPlugin
    ) {}

    async handleBookCreate(file: TFile | TFolder) {
        if (file instanceof TFolder && 
            file.path.startsWith(this.plugin.settings.defaultBookPath) && 
            file.parent?.path === this.plugin.settings.defaultBookPath) {  // 添加这个条件检查
            await new Promise(resolve => setTimeout(resolve, 500));
            const newBook = await this.plugin.bookManager.getBookConfig(file);
            if (newBook) {
                this.plugin.settings.lastBookId = newBook.basic.uuid;
                await this.plugin.saveSettings();
                return newBook;
            }
        }
        return null;
    }

    async handleBookModify(file: TFile | TFolder, currentBook: Book, oldPath?: string) {
        const bookPath = `${this.plugin.settings.defaultBookPath}/${currentBook.basic.title}`;
        if (file.path.startsWith(bookPath)) {
            if (file instanceof TFile && file.name === '.book-config.md') {
                return await this.plugin.bookManager.getBookById(currentBook.basic.uuid);
            }

            const updateNode = (nodes: ChapterNode[]): boolean => {
                for (const node of nodes) {
                    if (node.type === 'file' && file instanceof TFile) {
                        const nodePath = `${bookPath}/${node.path}`;
                        if (oldPath && nodePath === oldPath || nodePath === file.path) {
                            node.title = file.basename;
                            node.path = file.path.replace(bookPath + '/', '');
                            node.last_modified = new Date().toISOString();
                            return true;
                        }
                    }
                    if (node.type === 'group' && node.children) {
                        const oldNodePath = `${bookPath}/${node.path}`;
                        if (oldPath && oldNodePath === oldPath || oldNodePath === file.path) {
                            node.path = file.path.replace(bookPath + '/', '');
                            node.title = file instanceof TFile ? file.basename : file.name;
                            node.last_modified = new Date().toISOString();
                            return true;
                        }
                        if (updateNode(node.children)) return true;
                    }
                }
                return false;
            };
            
            if (updateNode(currentBook.structure.tree)) {
                await this.plugin.bookManager.updateBook(currentBook.basic.uuid, currentBook);
                return currentBook;
            }
        }
        return null;
    }

    async handleBookDeletion(file: TFile | TFolder, currentBook: Book) {
        const bookPath = `${this.plugin.settings.defaultBookPath}/${currentBook.basic.title}`;
        if (file.path.startsWith(bookPath)) {
            // 如果删除的是整个书籍文件夹
            if (file instanceof TFolder && file.path === bookPath) {
                this.plugin.settings.lastBookId = undefined;
                await this.plugin.saveSettings();
                return { type: 'deleted' };
            }
        }
        return null;
    }
}