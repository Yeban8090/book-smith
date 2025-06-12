import { App, TFile } from 'obsidian';
import { Book, ChapterNode } from '../types/book';
import { TypographySettings } from '../components/TypographyView';
import * as fs from "fs/promises";

// 导出服务类
export class ExportService {
    private rootPath: string;
    private strategies: Record<string, ExportStrategy>;

    constructor(private app: App, settings: any) {
        this.rootPath = settings.defaultBookPath;
        this.strategies = {
            'txt': new TxtExportStrategy(this.rootPath),
            'pdf': new PdfExportStrategy(this.rootPath),
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

// 导出格式接口
export interface ExportStrategy {
    export(app: App, book: Book, options?: ExportOptions): Promise<string>;
}

// 导出选项接口
export interface ExportOptions {
    selectedChapters?: ChapterNode[];
    htmlContent?: string;
    useTypography?: boolean;
    typographySettings?: TypographySettings;
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

            // 获取保存路径
            const filePath = await this.getOutputFile(book.basic.title);
            if (!filePath) return "cancelled";

            // 写入文件
            await fs.writeFile(filePath, content);

            return filePath;
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

    private async getOutputFile(filename: string): Promise<string | null> {
        //@ts-ignore
        const result = await electron.remote.dialog.showSaveDialog({
            title: "导出 TXT 文件",
            defaultPath: filename + ".txt",
            filters: [{ name: "TXT", extensions: ["txt"] }],
            properties: ["showOverwriteConfirmation", "createDirectory"]
        });

        return result.canceled ? null : result.filePath;
    }
}

// PDF导出策略
export class PdfExportStrategy implements ExportStrategy {
    private rootPath: string;
    private bookSizeMap: Record<string, { width: number; height: number }> = {
        A3: { width: 841.89, height: 1190.55 },     // 297mm x 420mm
        A4: { width: 595.28, height: 841.89 },      // 210mm x 297mm
        A5: { width: 419.53, height: 595.28 },      // 148mm x 210mm
        Legal: { width: 612, height: 1008 },        // 8.5in x 14in
        Letter: { width: 612, height: 792 },        // 8.5in x 11in
        Tabloid: { width: 792, height: 1224 }       // 11in x 17in
    };
    constructor(rootPath: string) {
        this.rootPath = rootPath;
    }

    async export(app: App, book: Book, options?: ExportOptions): Promise<string> {
        try {
            // 如果提供了排版后的 HTML 内容，使用 HTML 转 PDF 策略
            if (options?.useTypography && options?.htmlContent && options?.typographySettings) {
                return await this.exportHTML(book, options.htmlContent, options.typographySettings);
            }

            // 否则返回一个提示信息
            return "PDF导出功能需要使用排版视图";
        } catch (error) {
            console.error('PDF导出错误:', error);
            throw new Error(`PDF导出失败: ${error.message}`);
        }
    }

    async exportHTML(book: Book, htmlContent: string, typographySettings: TypographySettings): Promise<string> {
        try {
            // 1. 构建样式 CSS 字符串
            const style = `
                body {
                    font-family: ${typographySettings.fontFamily || 'serif'};
                    font-size: ${typographySettings.fontSize || '16px'};
                    line-height: ${typographySettings.lineHeight || '1.75'};
                    margin: ${typographySettings.margin || '2cm'};
                    padding: 0;
                    box-sizing: border-box;
                }
                h1, h2, h3, h4, h5, h6 {
                    page-break-after: avoid;
                }
                .markdown-preview-view {
                    max-width: 720px;
                    margin: auto;
                }
                @media print {
                    body {
                        -webkit-print-color-adjust: exact;
                    }
                    .page-break {
                        page-break-before: always;
                    }
                }
            `;

            // 2. 构建完整 HTML 页面（包含分页）
            const fullHtml = `
            <html>
              <head>
                <meta charset="utf-8">
                <title>${book.basic.title}</title>
                <style>${style}</style>
              </head>
              <body>
                ${htmlContent}
              </body>
            </html>
            `;

            // 3. 创建窗口加载 HTML 页面
            //@ts-ignore
            const win = new electron.remote.BrowserWindow({
                show: false, // 设置为 true 可调试
                width: 1024,
                height: 768,
                webPreferences: {
                    sandbox: false,
                    contextIsolation: false,
                    nodeIntegration: true,
                }
            });

            // 等待页面加载完成
            console.log('等待页面加载完成');
            const ready = new Promise<void>((resolve) => {
                win.webContents.once("did-finish-load", resolve);
            });
            await win.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(fullHtml)}`);
            await ready;

            // 稍等以确保样式生效
            await new Promise((r) => setTimeout(r, 300));

            // 4. 打印设置（自动分页）
            const printOptions = {
                marginsType: 1,
                pageSize: typographySettings.bookSize || "A4",
                printBackground: true,
                landscape: false,
                scale: 1.0,
                displayHeaderFooter: true,
                headerTemplate: `<div style="font-size:14px;text-align:center;width:100vw;"></div>`,
                footerTemplate: `<div style="font-size:14px;text-align:center;width:100vw;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>`
            };

            // 5. 生成 PDF Buffer
            const bodyPdfBuffer = await win.webContents.printToPDF(printOptions);
            win.close();

            const PDFLib = await import('pdf-lib');

            const coverDoc = await PDFLib.PDFDocument.create();
            const page = coverDoc.addPage();
            const size = this.bookSizeMap[typographySettings.bookSize || "A4"];
            page.setSize(size.width, size.height);
            
            page.drawRectangle({ x: 0, y: 0, width: page.getWidth(), height: page.getHeight(), color: PDFLib.rgb(0, 0, 0) });
            page.drawText("Book", {
                x: (page.getWidth() - 10) / 2,
                y: page.getHeight() - 300, // 距离顶部100
                size: 30,
                color: PDFLib.rgb(1, 1, 1),
              });
            const coverBuffer = await coverDoc.save();

            const finalPdf = await PDFLib.PDFDocument.create();
            const [coverPage] = await finalPdf.copyPages(await PDFLib.PDFDocument.load(coverBuffer), [0]);
            finalPdf.addPage(coverPage);

            const bodyDoc = await PDFLib.PDFDocument.load(bodyPdfBuffer);
            const bodyPages = await finalPdf.copyPages(bodyDoc, bodyDoc.getPageIndices());
            bodyPages.forEach(p => finalPdf.addPage(p));

            const finalBuffer = await finalPdf.save();

            const filePath = await this.getOutputFile(book.basic.title);
            if (!filePath) return "cancelled";
            await fs.writeFile(filePath, finalBuffer);

            return filePath;

        } catch (err: any) {
            console.error("PDF导出错误:", err);
            throw new Error(`PDF导出失败: ${err.message}`);
        }
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