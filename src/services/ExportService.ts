import { App, TFile, TFolder } from 'obsidian';
import { Book, ChapterNode } from '../types/book';
import { i18n } from '../i18n/i18n';

// 导出格式接口
export interface ExportStrategy {
    export(app: App, book: Book, selectedChapters?: ChapterNode[]): Promise<string>;
}

// TXT导出策略 - 实际实现
export class TxtExportStrategy implements ExportStrategy {
    private rootPath: string;
    constructor(rootPath: string) {
        this.rootPath = rootPath;
    }
    async export(app: App, book: Book, selectedChapters?: ChapterNode[]): Promise<string> {
        try {
            const content = await this.generateContent(app, book, selectedChapters);
            return content;
        } catch (error) {
            console.error('TXT导出错误:', error);
            throw new Error(`TXT导出失败: ${error.message}`);
        }
    }

    private async generateContent(app: App, book: Book, selectedChapters?: ChapterNode[]): Promise<string> {
        let content = `${book.basic.title}\n`;
        if (book.basic.subtitle) {
            content += `${book.basic.subtitle}\n`;
        }
        content += `作者: ${book.basic.author.join(', ')}\n\n`;

        if (book.basic.desc) {
            content += `${book.basic.desc}\n\n`;
        }

        const chapters = selectedChapters || book.structure.tree;
        content += await this.processChapters(app, book, chapters);

        return content;
    }

    private async processChapters(app: App, book: Book, chapters: ChapterNode[], level: number = 0): Promise<string> {
        let content = '';
        for (const chapter of chapters) {
            if (chapter.exclude) continue;

            // 添加章节标题
            content += `${chapter.title}\n\n`;
            if (chapter.type === 'file') {
                // 读取文件内容
                const filePath = `${this.rootPath}/${book?.basic.title}/${chapter.path}`;
                const file = app.vault.getAbstractFileByPath(filePath);
                if (file instanceof TFile) {
                    const fileContent = await app.vault.read(file);
                    // 处理Markdown语法，转换为纯文本
                    const plainTextContent = this.convertMarkdownToPlainText(fileContent);
                    content += `${plainTextContent}\n\n`;
                }
            }

            // 处理子章节
            if (chapter.children && chapter.children.length > 0) {
                content += await this.processChapters(app, book, chapter.children, level + 1);
            }
        }
        return content;
    }

    /**
     * 将Markdown格式转换为纯文本
     * @param markdown Markdown格式的文本
     * @returns 转换后的纯文本
     */
    private convertMarkdownToPlainText(markdown: string): string {
        let plainText = markdown;

        // 移除标题格式 (# 标题)
        plainText = plainText.replace(/^#{1,6}\s+(.+)$/gm, '$1');

        // 移除加粗和斜体 (**文本** 或 *文本*)
        plainText = plainText.replace(/\*\*(.+?)\*\*/g, '$1');
        plainText = plainText.replace(/\*(.+?)\*/g, '$1');
        plainText = plainText.replace(/__(.+?)__/g, '$1');
        plainText = plainText.replace(/_(.+?)_/g, '$1');

        // 移除双链接 [[链接]] 或 [[链接|显示文本]]
        plainText = plainText.replace(/\[\[([^\|\]]+)\|([^\]]+)\]\]/g, '$2');
        plainText = plainText.replace(/\[\[([^\]]+)\]\]/g, '$1');

        // 移除普通链接 [显示文本](链接)
        plainText = plainText.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');

        // 移除代码块
        plainText = plainText.replace(/```[\s\S]*?```/g, '');

        // 移除行内代码
        plainText = plainText.replace(/`([^`]+)`/g, '$1');

        // 移除引用块
        plainText = plainText.replace(/^>\s+(.+)$/gm, '$1');

        // 移除水平分割线
        plainText = plainText.replace(/^-{3,}|^\*{3,}|^_{3,}/gm, '');

        // 移除任务列表标记 [x] 或 [ ]
        plainText = plainText.replace(/^\s*- \[[x\s]\]\s+(.+)$/gm, '- $1');

        // 处理HTML标签
        plainText = plainText.replace(/<[^>]+>/g, '');

        // 处理转义字符
        plainText = plainText.replace(/\\([\*_\[\]\(\)\`\#\+\-\.\!\\])/g, '$1');

        // 移除多余的空行（连续两个以上的换行符替换为两个）
        plainText = plainText.replace(/\n{3,}/g, '\n\n');

        return plainText;
    }
}

// 其他导出策略 - 返回提示信息
// DOCX导出策略 - 实际实现
export class DocxExportStrategy implements ExportStrategy {
    private rootPath: string;
    constructor(rootPath: string) {
        this.rootPath = rootPath;
    }

    async export(app: App, book: Book, selectedChapters?: ChapterNode[]): Promise<string> {
        try {
            const docxBlob = await this.generateDocx(app, book, selectedChapters);
            // 将Blob转换为base64字符串
            return await this.blobToBase64(docxBlob);
        } catch (error) {
            console.error('DOCX导出错误:', error);
            throw new Error(`DOCX导出失败: ${error.message}`);
        }
    }

    private async generateDocx(app: App, book: Book, selectedChapters?: ChapterNode[]): Promise<Blob> {
        // 导入docx库
        const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } = await import('docx');

        // 文档内容
        const children = [];

        // 添加标题
        children.push(
            new Paragraph({
                text: book.basic.title,
                heading: HeadingLevel.TITLE,
                alignment: AlignmentType.CENTER,
                spacing: { after: 200 }
            })
        );

        // 添加副标题
        if (book.basic.subtitle) {
            children.push(
                new Paragraph({
                    text: book.basic.subtitle,
                    heading: HeadingLevel.HEADING_1,
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 200 }
                })
            );
        }

        // 添加作者
        children.push(
            new Paragraph({
                text: `作者: ${book.basic.author.join(', ')}`,
                alignment: AlignmentType.CENTER,
                spacing: { after: 400 }
            })
        );

        // 添加描述
        if (book.basic.desc) {
            children.push(
                new Paragraph({
                    text: book.basic.desc,
                    alignment: AlignmentType.JUSTIFIED,
                    spacing: { after: 400 }
                })
            );
        }
        // 处理章节
        const chapters = selectedChapters || book.structure.tree;
        const chapterParagraphs = await this.processChapters(app, book, chapters);
        children.push(...chapterParagraphs);

        // 创建文档并设置内容
        const doc = new Document({
            title: book.basic.title,
            description: book.basic.desc || '',
            creator: book.basic.author.join(', '),
            sections: [
                {
                    children: children
                }
            ]
        });
        
        // 生成DOCX文件
        return await Packer.toBlob(doc);
    }

    private async processChapters(app: App, book: Book, chapters: ChapterNode[], level: number = 1): Promise<any[]> {
        const { Paragraph, TextRun, HeadingLevel } = await import('docx');
        const paragraphs = [];

        for (const chapter of chapters) {
            if (chapter.exclude) continue;

            // 添加章节标题
            const headingLevel = level <= 6 ? level : 6; // 最多支持6级标题
            paragraphs.push(
                new Paragraph({
                    text: chapter.title,
                    heading: HeadingLevel[`HEADING_${headingLevel}` as keyof typeof HeadingLevel],
                    spacing: { before: 300, after: 200 }
                })
            );

            if (chapter.type === 'file') {
                // 读取文件内容
                const filePath = `${this.rootPath}/${book?.basic.title}/${chapter.path}`;
                const file = app.vault.getAbstractFileByPath(filePath);
                if (file instanceof TFile) {
                    const fileContent = await app.vault.read(file);
                    // 将Markdown转换为DOCX段落
                    const contentParagraphs = this.convertMarkdownToDocx(fileContent);
                    // 等待Promise解析后再添加段落
                    const resolvedParagraphs = await Promise.resolve(contentParagraphs);
                    paragraphs.push(...resolvedParagraphs);
                }
            }

            // 处理子章节
            if (chapter.children && chapter.children.length > 0) {
                const childParagraphs = await this.processChapters(app, book, chapter.children, level + 1);
                paragraphs.push(...childParagraphs);
            }
        }

        return paragraphs;
    }

    /**
     * 将Markdown格式转换为DOCX段落
     * @param markdown Markdown格式的文本
     * @returns DOCX段落数组
     */
    private async convertMarkdownToDocx(markdown: string): Promise<any[]> {
        const { Paragraph, TextRun, HeadingLevel, AlignmentType } = await import('docx');
        const paragraphs = [];

        // 按行分割Markdown
        const lines = markdown.split('\n');
        let inCodeBlock = false;
        let codeBlockContent = '';

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // 处理代码块
            if (line.startsWith('```')) {
                if (inCodeBlock) {
                    // 结束代码块
                    paragraphs.push(
                        new Paragraph({
                            text: codeBlockContent,
                            spacing: { before: 200, after: 200 },
                            indent: { left: 720 }, // 缩进
                        })
                    );
                    codeBlockContent = '';
                    inCodeBlock = false;
                } else {
                    // 开始代码块
                    inCodeBlock = true;
                }
                continue;
            }

            if (inCodeBlock) {
                codeBlockContent += line + '\n';
                continue;
            }

            // 处理标题
            const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
            if (headingMatch) {
                const level = headingMatch[1].length;
                const headingText = headingMatch[2];
                paragraphs.push(
                    new Paragraph({
                        text: headingText,
                        heading: HeadingLevel[`HEADING_${level}` as keyof typeof HeadingLevel],
                        spacing: { before: 200, after: 120 }
                    })
                );
                continue;
            }

            // 处理普通段落
            if (line.trim() !== '') {
                // 处理加粗、斜体等格式
                let processedLine = line;
                const textRuns = [];

                // 简单处理加粗和斜体
                // 注意：这是一个简化的处理，实际上需要更复杂的解析
                const boldItalicRegex = /\*\*\*(.+?)\*\*\*/g;
                const boldRegex = /\*\*(.+?)\*\*/g;
                const italicRegex = /\*(.+?)\*/g;

                // 替换加粗斜体
                processedLine = processedLine.replace(boldItalicRegex, (match, p1) => {
                    textRuns.push(new TextRun({ text: p1, bold: true, italics: true }));
                    return '';
                });

                // 替换加粗
                processedLine = processedLine.replace(boldRegex, (match, p1) => {
                    textRuns.push(new TextRun({ text: p1, bold: true }));
                    return '';
                });

                // 替换斜体
                processedLine = processedLine.replace(italicRegex, (match, p1) => {
                    textRuns.push(new TextRun({ text: p1, italics: true }));
                    return '';
                });

                // 如果有剩余文本，添加为普通文本
                if (processedLine.trim() !== '') {
                    textRuns.push(new TextRun({ text: processedLine }));
                }

                // 如果没有特殊格式，直接添加为普通段落
                if (textRuns.length === 0) {
                    paragraphs.push(new Paragraph({ text: line }));
                } else {
                    paragraphs.push(new Paragraph({ children: textRuns }));
                }
            } else if (i > 0 && lines[i - 1].trim() !== '') {
                // 空行，但前一行不是空行，添加段落间距
                paragraphs.push(new Paragraph({ text: '', spacing: { after: 120 } }));
            }
        }

        return paragraphs;
    }

    /**
     * 将Blob转换为base64字符串
     * @param blob Blob对象
     * @returns base64字符串
     */
    private async blobToBase64(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (typeof reader.result === 'string') {
                    resolve(reader.result);
                } else {
                    reject(new Error('转换失败'));
                }
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
}

export class PdfExportStrategy implements ExportStrategy {
    private rootPath: string;
    constructor(rootPath: string) {
        this.rootPath = rootPath;
    }

    async export(app: App, book: Book, selectedChapters?: ChapterNode[]): Promise<string> {
        return `PDF导出功能开发中 - ${book.basic.title}`;
    }
}

export class EpubExportStrategy implements ExportStrategy {
    private rootPath: string;
    constructor(rootPath: string) {
        this.rootPath = rootPath;
    }

    async export(app: App, book: Book, selectedChapters?: ChapterNode[]): Promise<string> {
        return `EPUB导出功能开发中 - ${book.basic.title}`;
    }
}

// 导出服务类
export class ExportService {

    private rootPath: string;

    private strategies: Record<string, ExportStrategy>;

    constructor(private app: App, settings: any) {
        this.rootPath = settings.defaultBookPath;
        this.strategies = {
            'txt': new TxtExportStrategy(this.rootPath),
            'docx': new DocxExportStrategy(this.rootPath),
            'pdf': new PdfExportStrategy(this.rootPath),
            'epub': new EpubExportStrategy(this.rootPath)
        };
    }

    async exportBook(format: string, book: Book, selectedChapters?: ChapterNode[]): Promise<{ content: string, fileName: string }> {
        const strategy = this.strategies[format];
        if (!strategy) {
            throw new Error(`不支持的导出格式: ${format}`);
        }

        const content = await strategy.export(this.app, book, selectedChapters);
        return {
            content: content,
            fileName: `${book.basic.title}.${format}`
        };
    }

    getSupportedFormats(): string[] {
        return Object.keys(this.strategies);
    }
}