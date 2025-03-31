import { App, TFile, TFolder } from 'obsidian';
import BookSmithPlugin from '../main';
import { ChapterNode } from '../types/book';
import { Book } from '../types/book';

export class FileEventManager {
    constructor(
        private app: App,
        private plugin: BookSmithPlugin
    ) {}

    async handleBookModify(file: TFile | TFolder, currentBook: Book, oldPath?: string) {
        const bookPath = `${this.plugin.settings.defaultBookPath}/${currentBook.basic.title}`;
        if (file.path.startsWith(bookPath)) {
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
}