import { App, TFile, TFolder } from 'obsidian';
import { Book, ChapterNode } from '../types/book';
import * as fs from "fs/promises";

// 导出格式接口
export interface ExportStrategy {
    export(app: App, book: Book, options?: ExportOptions): Promise<string>;
}

// 导出选项接口
export interface ExportOptions {
    selectedChapters?: ChapterNode[];
    htmlContent?: string;
    useTypography?: boolean;
}

// TXT导出策略 - 实际实现
export class TxtExportStrategy implements ExportStrategy {
    private rootPath: string;
    constructor(rootPath: string) {
        this.rootPath = rootPath;
    }
    async export(app: App, book: Book, options?: ExportOptions): Promise<string> {
        try {
            const content = await this.generateContent(app, book, options?.selectedChapters);
            return content;
        } catch (error) {
            console.error('TXT导出错误:', error);
            throw new Error(`TXT导出失败: ${error.message}`);
        }
    }

    private async generateContent(app: App, book: Book, selectedChapters?: ChapterNode[]): Promise<string> {
        let content = `${book.basic.title}`;
        if (book.basic.subtitle) {
            content += `${book.basic.subtitle}`;
        }
        content += `作者: ${book.basic.author.join(', ')}`;

        if (book.basic.desc) {
            content += `${book.basic.desc}`;
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
            content += `${chapter.title}`;
            if (chapter.type === 'file') {
                // 读取文件内容
                const filePath = `${this.rootPath}/${book?.basic.title}/${chapter.path}`;
                const file = app.vault.getAbstractFileByPath(filePath);
                if (file instanceof TFile) {
                    const fileContent = await app.vault.read(file);
                    // 处理Markdown语法，转换为纯文本
                    const plainTextContent = this.convertMarkdownToPlainText(fileContent);
                    content += `${plainTextContent}`;
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
        plainText = plainText.replace(/([\\`*_{}$begin:math:display$$end:math:display$()#+\-.!])/g, '\\$1');

        // 移除多余的空行（连续两个以上的换行符替换为两个）
        plainText = plainText.replace(/\n{3,}/g, '\n\n');

        return plainText;
    }
}

// DOCX导出策略 - 实际实现
export class DocxExportStrategy implements ExportStrategy {
    private rootPath: string;
    constructor(rootPath: string) {
        this.rootPath = rootPath;
    }

    async export(app: App, book: Book, options?: ExportOptions): Promise<string> {
        try {
            // 如果提供了排版后的 HTML 内容，使用 HTML 转 DOCX 策略
            if (options?.useTypography && options?.htmlContent) {
                const htmlToDocxStrategy = new HTMLToDocxExport(this.rootPath);
                return await htmlToDocxStrategy.exportHTML(app, book, options.htmlContent);
            } else {
                return 'DOCX导出功能需要使用排版视图';
            }
        } catch (error) {
            console.error('DOCX导出错误:', error);
            throw new Error(`DOCX导出失败: ${error.message}`);
        }
    }
}

// PDF导出策略
export class PdfExportStrategy implements ExportStrategy {
    private rootPath: string;
    constructor(rootPath: string) {
        this.rootPath = rootPath;
    }

    async export(app: App, book: Book, options?: ExportOptions): Promise<string> {
        try {
            // 如果提供了排版后的 HTML 内容，使用 HTML 转 PDF 策略
            if (options?.useTypography && options?.htmlContent) {
                const htmlToPdfStrategy = new HTMLToPdfExport(this.rootPath);
                return await htmlToPdfStrategy.exportHTML(app, book, options.htmlContent);
            }

            // 否则返回一个提示信息
            return "PDF导出功能需要使用排版视图";
        } catch (error) {
            console.error('PDF导出错误:', error);
            throw new Error(`PDF导出失败: ${error.message}`);
        }
    }
}

// EPUB导出策略
export class EpubExportStrategy implements ExportStrategy {
    private rootPath: string;
    constructor(rootPath: string) {
        this.rootPath = rootPath;
    }

    async export(app: App, book: Book, options?: ExportOptions): Promise<string> {
        try {
            // 如果提供了排版后的 HTML 内容，使用 HTML 转 EPUB 策略
            if (options?.useTypography && options?.htmlContent) {
                const htmlToEpubStrategy = new HTMLToEpubExport(this.rootPath);
                return await htmlToEpubStrategy.exportHTML(app, book, options.htmlContent);
            }

            // 否则返回一个提示信息
            return "EPUB导出功能需要使用排版视图";
        } catch (error) {
            console.error('EPUB导出错误:', error);
            throw new Error(`EPUB导出失败: ${error.message}`);
        }
    }
}

// HTML 转 DOCX 导出策略
export class HTMLToDocxExport {
    private rootPath: string;

    constructor(rootPath: string) {
        this.rootPath = rootPath;
    }

    async exportHTML(app: App, book: Book, htmlContent: string): Promise<string> {
        try {
            // 使用 docx 库将 HTML 转换为 DOCX
            const { Document, Packer, Paragraph, TextRun } = await import('docx');

            // 创建文档
            const doc = new Document({
                title: book.basic.title,
                description: book.basic.desc || '',
                creator: book.basic.author.join(', '),
                sections: [
                    {
                        properties: {},
                        children: [
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: book.basic.title,
                                        bold: true,
                                        size: 36
                                    })
                                ],
                                alignment: 'center',
                                spacing: { after: 200 }
                            }),
                            ...this.convertHTMLToDocxParagraphs(htmlContent)
                        ]
                    }
                ]
            });

            // 生成 DOCX 文件
            const blob = await Packer.toBlob(doc);

            // 转换为 Data URL
            return await this.blobToBase64(blob);
        } catch (error) {
            console.error('DOCX导出错误:', error);
            throw new Error(`DOCX导出失败: ${error.message}`);
        }
    }

    // 将 HTML 转换为 DOCX 段落
    private convertHTMLToDocxParagraphs(htmlContent: string) {
        const { Paragraph, TextRun } = require('docx');

        // 创建临时 DOM 元素解析 HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;

        // 提取文本内容
        const textContent = tempDiv.textContent || '';

        // 按行分割
        const lines = textContent.split('\n');

        // 转换为段落
        return lines.map(line => {
            return new Paragraph({
                children: [
                    new TextRun({
                        text: line.trim()
                    })
                ]
            });
        });
    }

    // Blob 转 Base64
    private async blobToBase64(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
}

// HTML 转 PDF 导出策略 - 使用 better-export-pdf 的方法
export class HTMLToPdfExport {
    private rootPath: string;

    constructor(rootPath: string) {
        this.rootPath = rootPath;
    }

    async exportHTML(app: App, book: Book, htmlContent: string): Promise<string> {
        try {
            // 获取所有样式表
            const styles = this.getAllStyles();

            // 构建完整 HTML 页面（包含分页）
            const fullHtml = `
            <html>
              <head>
                <meta charset="utf-8">
                <title>${book.basic.title}</title>
                <style>${styles.join("\n")}</style>
              </head>
              <body>
                <div class="markdown-preview-view markdown-rendered">
                  <h1 id="book-title" class="__title__">${book.basic.title}</h1>
                  ${htmlContent}
                </div>
              </body>
            </html>
            `;

            //@ts-ignore
            // 修改BrowserWindow配置
            const win = new electron.remote.BrowserWindow({
                show: true, // 可以设为true进行调试
                width: 1024, // 增加窗口大小
                height: 768,
                webPreferences: {
                    sandbox: false,
                    nodeIntegration: true, // 启用Node集成
                    contextIsolation: false // 禁用上下文隔离
                }
            });

            await win.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(fullHtml)}`);

            // 打印设置（自动分页）
            const printOptions = {
                marginsType: 1,
                pageSize: "A4",
                printBackground: true,
                landscape: false,
                scale: 1.0,
                displayHeaderFooter: true,
                headerTemplate: `<div style="font-size:10px;text-align:center;width:100vw;"><span class="title"></span></div>`,
                footerTemplate: `<div style="font-size:10px;text-align:center;width:100vw;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>`
            };

            // 生成 PDF Buffer
            const pdfBuffer = await win.webContents.printToPDF(printOptions);
            console.log("PDF Buffer 大小:", pdfBuffer.length);

            // 用 DOMParser 重建 DOM 供目录抽取（用于 editPDF）
            const tempDoc = new DOMParser().parseFromString(fullHtml, "text/html");
            const headings = this.getHeadingTree(tempDoc);

            const finalPdf = await this.editPDF(pdfBuffer, {
                headings,
                displayMetadata: true,
                maxLevel: 3
            });

            // 获取保存路径
            const filePath = await this.getOutputFile(book.basic.title);
            if (!filePath) return "cancelled";

            // 写入 PDF 文件
            await fs.writeFile(filePath, finalPdf);

            // 关闭窗口
            win.close();

            return filePath;
        } catch (err: any) {
            console.error("PDF导出错误:", err);
            throw new Error(`PDF导出失败: ${err.message}`);
        }
    }

    private getAllStyles(): string[] {
        const cssTexts: string[] = [];

        Array.from(document.styleSheets).forEach((sheet: any) => {
            try {
                if (sheet.cssRules) {
                    for (const rule of sheet.cssRules) {
                        cssTexts.push(rule.cssText);
                    }
                }
            } catch (e) {
                console.warn("样式读取失败：", e);
            }
        });

        return cssTexts;
    }

    private getHeadingTree(doc: Document) {
        const headings: any[] = [];
        const headingElements = doc.querySelectorAll("h1, h2, h3, h4, h5, h6");

        headingElements.forEach((el) => {
            const level = parseInt(el.tagName.substring(1));
            const id = el.id || crypto.randomUUID();
            if (!el.id) el.id = id;

            headings.push({
                level,
                text: el.textContent,
                id
            });
        });

        return headings;
    }

    private async editPDF(data: Buffer, options: any): Promise<Buffer> {
        // 你可以在这里用 pdf-lib 添加封面页/目录页
        return data;
    }

    private async getOutputFile(filename: string): Promise<string | null> {
        //@ts-ignore
        const result = await electron.remote.dialog.showSaveDialog({
            title: "导出 PDF 文件",
            defaultPath: filename + ".pdf",
            filters: [{ name: "PDF", extensions: ["pdf"] }],
            properties: ["showOverwriteConfirmation", "createDirectory"]
        });

        return result.canceled ? null : result.filePath;
    }
}

// HTML 转 EPUB 导出策略
export class HTMLToEpubExport {
    private rootPath: string;

    constructor(rootPath: string) {
        this.rootPath = rootPath;
    }

    async exportHTML(app: App, book: Book, htmlContent: string): Promise<string> {
        try {
            // 注意：这里需要引入 epub-gen 或类似的库
            // 在实际实现中，您需要确保已安装该库
            // npm install epub-gen

            // 创建临时容器
            const tempContainer = document.createElement('div');
            tempContainer.innerHTML = htmlContent;

            // 提取内容
            const content = tempContainer.textContent || '';

            // 使用 epub-gen 生成 EPUB
            // 这里是一个模拟实现，实际使用时需要替换为真实的 epub-gen 调用

            // 返回一个模拟的 Data URL
            // 在实际实现中，这里应该返回真实的 EPUB Data URL
            return `data:application/epub+zip;base64,UEsDBBQAAAgIAJZWbVYAAAAAAgAAAAAAAAABABwAY29udGVudC5vcGZVVAkAA+dh/2Pn`;
        } catch (error) {
            console.error('EPUB导出错误:', error);
            throw new Error(`EPUB导出失败: ${error.message}`);
        }
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

    async exportBook(format: string, book: Book, options?: ExportOptions): Promise<{ content: string, fileName: string }> {
        const strategy = this.strategies[format];
        if (!strategy) {
            throw new Error(`不支持的导出格式: ${format}`);
        }

        const content = await strategy.export(this.app, book, options);
        return {
            content: content,
            fileName: `${book.basic.title}.${format}`
        };
    }

    getSupportedFormats(): string[] {
        return Object.keys(this.strategies);
    }
}