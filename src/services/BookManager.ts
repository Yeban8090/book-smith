import { App, TFolder, TFile } from 'obsidian';
import { Book, BookBasicInfo, ChapterTree, ChapterNode } from '../types/book';
import { v4 as uuidv4 } from 'uuid';
import { TemplateManager } from './TemplateManager';
import { BookSmithSettings } from '../settings/settings';

export class BookManager {
    private templateManager: TemplateManager;
    private rootPath: string;

    constructor(private app: App, private settings: BookSmithSettings) {
        this.templateManager = new TemplateManager(settings);
        this.rootPath = this.settings.defaultBookPath;
    }

    async createBook(
        basicInfo: Omit<BookBasicInfo, 'uuid' | 'created_at'>, 
        templateType: string = 'default',
        targetTotalWords: number = 0
    ): Promise<Book> {
        let bookFolder: TFolder | null = null;

        try {
            // 检查并创建必要的目录结构
            await this.ensureDirectoryStructure(basicInfo);

            // 创建基础书籍信息
            const book: Book = {
                basic: {
                    ...basicInfo,
                    uuid: uuidv4(),
                    created_at: new Date().toISOString()
                },
                structure: await this.getTemplateStructure(templateType),
                stats: {
                    total_words: 0,
                    target_total_words: targetTotalWords,
                    progress_by_words: 0,
                    progress_by_chapter: 0,
                    daily_words: {},
                    writing_days: 0,
                    average_daily_words: 0,
                    last_writing_date: new Date().toISOString(),
                    last_modified: new Date().toISOString()
                },
                export: {
                    default_format: 'pdf',
                    template: 'default',
                    include_cover: true
                }
            };

            // 创建书籍目录
            const bookFolderPath = `${this.settings.defaultBookPath}/${basicInfo.title}`;
            bookFolder = await this.app.vault.createFolder(bookFolderPath);

            // 保存配置
            await this.saveBookConfig(bookFolder, book);

            // 创建初始文件结构
            await this.createInitialStructure(bookFolder, book.structure);

            return book;
        } catch (error) {
            // 清理失败的创建
            if (bookFolder) {
                await this.app.vault.delete(bookFolder, true);
            }
            throw error;
        }
    }

    // 确保目录结构存在
    private async ensureDirectoryStructure(basicInfo: Omit<BookBasicInfo, 'uuid' | 'created_at'>): Promise<void> {
        // 检查书籍是否已存在
        const existingFolder = this.app.vault.getAbstractFileByPath(
            `${this.rootPath}/${basicInfo.title}`
        );
        if (existingFolder) {
            throw new Error('书籍已存在');
        }

        // 确保根目录存在
        const rootFolder = this.app.vault.getAbstractFileByPath(this.rootPath);
        if (!rootFolder) {
            await this.app.vault.createFolder(this.rootPath);
        }

        // 如果有封面，确保 covers 目录存在
        if (basicInfo.cover) {
            const coversPath = `${this.rootPath}/covers`;
            const coversFolder = this.app.vault.getAbstractFileByPath(coversPath);
            if (!coversFolder) {
                await this.app.vault.createFolder(coversPath);
            }
        }
    }

    async getAllBooks(): Promise<Book[]> {
        const books: Book[] = [];
        const rootFolder = this.app.vault.getAbstractFileByPath(this.rootPath);
        if (rootFolder instanceof TFolder) {
            for (const folder of rootFolder.children) {
                if (folder instanceof TFolder) {
                    const configPath = `${folder.path}/book-config.json`;
                    const configFile = this.app.vault.getAbstractFileByPath(configPath);
                    if (configFile) {
                        const config = await this.getBookConfig(folder);
                        if (config) {
                            books.push(config);
                        }
                    }
                }
            }
        }
        return books.sort((a, b) =>
            new Date(b.basic.created_at).getTime() - new Date(a.basic.created_at).getTime()
        );
    }

    async getBookById(uuid: string): Promise<Book | null> {
        const books = await this.getAllBooks();
        return books.find(book => book.basic.uuid === uuid) || null;
    }

    async updateBook(uuid: string, updates: Partial<Book>): Promise<Book> {
        const book = await this.getBookById(uuid);
        if (!book) {
            throw new Error('书籍不存在');
        }

        const oldBookPath = `${this.settings.defaultBookPath}/${book.basic.title}`;
        const folder = this.app.vault.getAbstractFileByPath(oldBookPath);

        if (!(folder instanceof TFolder)) {
            throw new Error('书籍文件夹不存在');
        }

        const updatedBook = {
            ...book,
            ...updates,
            basic: {
                ...book.basic,
                ...updates.basic
            },
            structure: {
               ...book.structure,
               ...updates.structure
            },
            stats: {
               ...book.stats,
               ...updates.stats
            },
            export: {
               ...book.export,
               ...updates.export
            }
        };

        // 如果书名改变了，需要重命名文件夹
        if (updates.basic?.title && updates.basic.title !== book.basic.title) {
            const newBookPath = `${this.settings.defaultBookPath}/${updates.basic.title}`;
            // 检查新路径是否已存在
            if (this.app.vault.getAbstractFileByPath(newBookPath)) {
                throw new Error('书籍已存在');
            }
            await this.app.vault.rename(folder, newBookPath);
        }

        await this.saveBookConfig(folder, updatedBook);
        return updatedBook;
    }

    async deleteBook(uuid: string): Promise<void> {
        const book = await this.getBookById(uuid);
        if (!book) {
            throw new Error('书籍不存在');
        }

        const bookPath = `${this.settings.defaultBookPath}/${book.basic.title}`;
        const folder = this.app.vault.getAbstractFileByPath(bookPath);

        if (folder) {
            await this.app.vault.trash(folder, true);
        } else {
            throw new Error('书籍文件夹不存在');
        }
    }

    async getBookConfig(folder: TFolder): Promise<Book | null> {
        try {
            const configPath = `${folder.path}/book-config.json`;
            const configFile = this.app.vault.getAbstractFileByPath(configPath);
            if (configFile instanceof TFile) {
                const content = await this.app.vault.read(configFile);
                return JSON.parse(content) as Book;
            }
            return null;
        } catch (error) {
            console.error('获取书籍配置时发生错误:', error);
            return null;
        }
    }

    private async saveBookConfig(folder: TFolder, book: Book): Promise<void> {
        const configPath = `${folder.path}/book-config.json`;
        try {
            const configFile = this.app.vault.getAbstractFileByPath(configPath);
            const jsonContent = JSON.stringify(book, null, 2);
            
            if (configFile) {
                // 如果文件已存在，使用 modify 方法
                await this.app.vault.modify(configFile as TFile, jsonContent);
            } else {
                // 如果文件不存在，使用 create 方法
                await this.app.vault.create(configPath, jsonContent);
            }
        } catch (error) {
            console.error('保存配置文件时发生错误:', error);
            throw new Error('保存配置文件失败');
        }
    }

    private async getTemplateStructure(templateType: string): Promise<ChapterTree> {
        return this.templateManager.getTemplate(templateType);
    }

    private async createInitialStructure(folder: TFolder, structure: ChapterTree): Promise<void> {
        const createNode = async (node: ChapterNode) => {
            if (node.type === 'file') {
                const filePath = `${folder.path}/${node.path}`;
                // 确保父目录存在
                const parentPath = filePath.substring(0, filePath.lastIndexOf('/'));
                const parentFolder = this.app.vault.getAbstractFileByPath(parentPath);
                if (!parentFolder) {
                    await this.app.vault.createFolder(parentPath);
                }
                await this.app.vault.create(filePath, '');
            } else if (node.type === 'group' && node.children) {
                const groupPath = `${folder.path}/${node.path}`;
                await this.app.vault.createFolder(groupPath);
                for (const child of node.children) {
                    await createNode(child);
                }
            }
        };

        for (const node of structure.tree) {
            await createNode(node);
        }
    }

    // 在 BookManager 类中添加这个方法
    
    async importBookFromFolder(folderName: string): Promise<Book> {
        try {
            // 获取文件夹内的文件结构
            const folderPath = `${this.settings.defaultBookPath}/${folderName}`;
            
            // 创建书籍结构
            const structure = await this.buildFolderStructure(folderPath, '');
            
            // 创建新书籍对象，确保符合 Book 接口定义
            const newBook: Book = {
                basic: {
                    uuid: uuidv4(),
                    title: folderName,
                    author: this.settings.defaultAuthor ? [this.settings.defaultAuthor] : ['未知作者'],
                    created_at: new Date().toISOString()
                },
                structure: {
                    tree: structure
                },
                stats: {
                    total_words: 0,
                    target_total_words: 100000,
                    progress_by_words: 0,
                    progress_by_chapter: 0,
                    daily_words: {},
                    writing_days: 0,
                    average_daily_words: 0,
                    last_writing_date: new Date().toISOString(),
                    last_modified: new Date().toISOString()
                },
                export: {
                    default_format: 'pdf',
                    template: 'default',
                    include_cover: true
                }
            };
            
            // 保存书籍配置
            const bookFolder = this.app.vault.getAbstractFileByPath(folderPath);
            if (!(bookFolder instanceof TFolder)) {
                throw new Error('书籍文件夹不存在');
            }
            
            await this.saveBookConfig(bookFolder, newBook);
            return newBook;
        } catch (error) {
            console.error('导入书籍失败:', error);
            throw error;
        }
    }
    
    // 构建文件夹结构的辅助方法
    private async buildFolderStructure(folderPath: string, parentPath: string = ''): Promise<ChapterNode[]> {
        const structure: ChapterNode[] = [];
        let order = 0;
        
        const folderContents = await this.app.vault.adapter.list(folderPath);
        
        // 处理文件
        for (const filePath of folderContents.files) {
            // 只处理markdown文件
            if (!filePath.endsWith('.md')) continue;
            
            const fileName = filePath.split('/').pop() || '';
            // 过滤掉隐藏文件和配置文件
            if (fileName.startsWith('.')) continue;
            
            const title = fileName.replace('.md', '');
            const relativePath = parentPath ? `${parentPath}/${fileName}` : fileName;
            
            structure.push({
                id: uuidv4(),
                title: title,
                type: 'file',
                path: relativePath,
                order: order++,
                default_status: 'draft',
                created_at: new Date().toISOString(),
                last_modified: new Date().toISOString()
            });
        }
        
        // 处理文件夹
        for (const subFolderPath of folderContents.folders) {
            const folderName = subFolderPath.split('/').pop() || '';
            
            // 过滤掉隐藏文件夹和特殊系统文件夹
            if (folderName.startsWith('.') || 
                folderName === '__MACOSX' || 
                folderName === 'node_modules') continue;
            
            const relativePath = parentPath ? `${parentPath}/${folderName}` : folderName;
            
            // 递归获取子文件夹内容
            const children = await this.buildFolderStructure(
                subFolderPath, 
                relativePath
            );
            
            structure.push({
                id: uuidv4(),
                title: folderName,
                type: 'group',
                path: relativePath,
                order: order++,
                default_status: 'draft',
                created_at: new Date().toISOString(),
                last_modified: new Date().toISOString(),
                children: children,
                is_expanded: true
            });
        }
        
        return structure;
    }
}