import { App, TFile } from 'obsidian';
import { Book, ChapterNode } from '../types/book';
import { TypographySettings } from '../components/TypographyView';
import { HeaderFooterTocSettings } from '../modals/HeaderFooterTocModal';
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
    htmlContent?: HTMLElement;
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

    async exportHTML(book: Book, htmlContent: HTMLElement, typographySettings: TypographySettings): Promise<string> {
        try {
            // 0. 处理htmlContent
            await PdfExportStrategy.processImages(htmlContent);
            
            // 0.5 生成目录（如果启用）- 使用准确页码计算
            let tocHtml = '';
            if (typographySettings.headerFooterToc?.tocEnabled) {
                tocHtml = await this.generateAccurateTOC(typographySettings, htmlContent, book);
            }

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
                .table-of-contents {
                    page-break-after: always;
                }
                .toc-item {
                    page-break-inside: avoid;
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

            // 2. 构建完整 HTML 页面（包含目录和分页）
            const fullHtml = `
            <html>
              <head>
                <meta charset="utf-8">
                <title>${book.basic.title}</title>
                <style>${style}</style>
              </head>
              <body>
                ${tocHtml}
                ${htmlContent.innerHTML}
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
                displayHeaderFooter: typographySettings.headerFooterToc?.headerEnabled || typographySettings.headerFooterToc?.footerEnabled,
                headerTemplate: this.buildHeaderTemplate(typographySettings.headerFooterToc, book),
                footerTemplate: this.buildFooterTemplate(typographySettings.headerFooterToc, book),
            };

            // 5. 生成 PDF Buffer
            const bodyPdfBuffer = await win.webContents.printToPDF(printOptions);
            win.close();

            // 替换第295-325行的代码
            const PDFLib = await import('pdf-lib');

            // 检查是否有封面图片数据
            if (typographySettings.showCover && typographySettings.coverImageData) {
                // 创建封面页
                const coverDoc = await PDFLib.PDFDocument.create();
                const page = coverDoc.addPage();
                const size = this.bookSizeMap[typographySettings.bookSize || "A4"];
                page.setSize(size.width, size.height);

                try {
                    // 处理base64图片数据
                    const base64Data = typographySettings.coverImageData.split(',')[1]; // 移除 "data:image/xxx;base64," 前缀
                    const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

                    // 根据图片类型嵌入图片
                    let coverImage;
                    if (typographySettings.coverImageData.includes('data:image/png')) {
                        coverImage = await coverDoc.embedPng(imageBytes);
                    } else if (typographySettings.coverImageData.includes('data:image/jpeg') || typographySettings.coverImageData.includes('data:image/jpg')) {
                        coverImage = await coverDoc.embedJpg(imageBytes);
                    } else {
                        // 默认尝试PNG格式
                        coverImage = await coverDoc.embedPng(imageBytes);
                    }

                    // 绘制封面图片
                    page.drawImage(coverImage, {
                        x: 0,
                        y: 0,
                        width: page.getWidth(),
                        height: page.getHeight(),
                    });
                } catch (error) {
                    console.error('封面图片处理失败，使用默认封面:', error);
                    // 如果图片处理失败，绘制默认封面
                    page.drawRectangle({
                        x: 0,
                        y: 0,
                        width: page.getWidth(),
                        height: page.getHeight(),
                        color: PDFLib.rgb(0.2, 0.2, 0.2)
                    });
                    page.drawText("Book", {
                        x: page.getWidth() / 2 - 50,
                        y: page.getHeight() / 2,
                        size: 30,
                        color: PDFLib.rgb(1, 1, 1),
                    });
                }

                const coverBuffer = await coverDoc.save();

                // 合并封面和内容PDF
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
            } else {
                // 如果没有封面设置或不显示封面，创建简单的文本封面
                const coverDoc = await PDFLib.PDFDocument.create();
                const page = coverDoc.addPage();
                const size = this.bookSizeMap[typographySettings.bookSize || "A4"];
                page.setSize(size.width, size.height);

                // 绘制默认封面
                page.drawRectangle({
                    x: 0,
                    y: 0,
                    width: page.getWidth(),
                    height: page.getHeight(),
                    color: PDFLib.rgb(0.1, 0.1, 0.1)
                });

                // 添加书名
                const titleText = "Book";
                page.drawText(titleText, {
                    x: page.getWidth() / 2 - (titleText.length * 10),
                    y: page.getHeight() / 2 + 50,
                    size: 24,
                    color: PDFLib.rgb(1, 1, 1),
                });

                // 添加作者信息
                if (book.basic.author && book.basic.author.length > 0) {
                    const authorText = book.basic.author.join(', ');
                    page.drawText(authorText, {
                        x: page.getWidth() / 2 - (authorText.length * 6),
                        y: page.getHeight() / 2 - 50,
                        size: 16,
                        color: PDFLib.rgb(0.8, 0.8, 0.8),
                    });
                }

                const coverBuffer = await coverDoc.save();

                // 合并封面和内容PDF
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
            }
        } catch (err: any) {
            console.error("PDF导出错误:", err);
            throw new Error(`PDF导出失败: ${err.message}`);
        }
    }

    private static async processImages(container: HTMLElement): Promise<void> {
        const images = container.querySelectorAll('img');
        const imageArray = Array.from(images);

        for (const img of imageArray) {
            try {
                const response = await fetch(img.src);
                const blob = await response.blob();
                const reader = new FileReader();
                await new Promise((resolve, reject) => {
                    reader.onload = () => {
                        img.src = reader.result as string;
                        resolve(null);
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
            } catch (error) {
                console.error('图片转换失败:', error);
            }
        }
    }
    
    // 添加页眉模板构建方法
    private buildHeaderTemplate(settings?: HeaderFooterTocSettings, book?: Book): string {
        if (!settings?.headerEnabled) return '';

        return `
            <div style="
                width: 100%;
                height: ${settings.headerHeight}px;
                font-size: ${settings.headerFontSize}px;
                color: ${settings.headerColor};
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0 20px;
                box-sizing: border-box;
                border-bottom: 1px solid #ddd;
            ">
                <span style="flex: 1; text-align: left;">${this.replaceVariables(settings.headerLeft, book)}</span>
                <span style="flex: 1; text-align: center;">${this.replaceVariables(settings.headerCenter, book)}</span>
                <span style="flex: 1; text-align: right;">${this.replaceVariables(settings.headerRight, book)}</span>
            </div>
        `;
    }

    // 添加页脚模板构建方法
    private buildFooterTemplate(settings?: HeaderFooterTocSettings, book?: Book): string {
        if (!settings?.footerEnabled) return '';

        return `
            <div style="
                width: 100%;
                height: ${settings.footerHeight}px;
                font-size: ${settings.footerFontSize}px;
                color: ${settings.footerColor};
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0 20px;
                box-sizing: border-box;
                border-top: 1px solid #ddd;
            ">
                <span style="flex: 1; text-align: left;">${this.replaceVariables(settings.footerLeft)}</span>
                <span style="flex: 1; text-align: center;">${this.replaceVariables(settings.footerCenter)}</span>
                <span style="flex: 1; text-align: right;">${this.replaceVariables(settings.footerRight)}</span>
            </div>
        `;
    }
    // 添加变量替换方法
    private replaceVariables(text: string, book?: Book, pageNumber?: number, totalPages?: number): string {
        return text
            .replace(/\{\{title\}\}/g, book?.basic.title || '书籍标题')
            .replace(/\{\{author\}\}/g, book?.basic.author?.join(', ') || '作者')
            .replace(/\{\{date\}\}/g, new Date().toLocaleDateString())
            .replace(/\{\{pageNumber\}\}/g, pageNumber?.toString() || '<span class="pageNumber"></span>')
            .replace(/\{\{totalPages\}\}/g, totalPages?.toString() || '<span class="totalPages"></span>');
    }

    // 新增：生成准确页码的目录
private async generateAccurateTOC(typographySettings: TypographySettings, htmlContent: HTMLElement, book: Book): Promise<string> {
    const settings = typographySettings.headerFooterToc;
    if (!settings?.tocEnabled) return '';

    // 获取标题到页码的映射
    const headingPageMapping = await this.getHeadingPageMapping(typographySettings, htmlContent, book);
    
    if (headingPageMapping.length === 0) return '';

    let tocHtml = `
        <div class="table-of-contents" style="
            page-break-after: always;
            font-family: ${settings.tocFontFamily || 'serif'};
            font-size: ${settings.tocFontSize}px;
            color: ${settings.tocColor || '#000000'};
            margin: 40px 0;
        ">
            <h1 style="text-align: center; margin-bottom: 30px;">${settings.tocTitle}</h1>
            <div class="toc-content">
    `;

    headingPageMapping.forEach(heading => {
        const indent = (heading.level - 1) * (settings.tocIndent || settings.tocIndentSize || 20);
        tocHtml += `
            <div class="toc-item" style="
                margin-left: ${indent}px;
                margin-bottom: 8px;
                display: flex;
                justify-content: space-between;
                align-items: baseline;
            ">
                <span class="toc-text">${heading.text}</span>
                <span class="toc-dots" style="
                    flex: 1;
                    border-bottom: 1px dotted #ccc;
                    margin: 0 10px;
                    height: 1px;
                    align-self: center;
                "></span>
                <span class="toc-page">${heading.pageNumber}</span>
            </div>
        `;
    });

    tocHtml += `
            </div>
        </div>
    `;

    return tocHtml;
}

// 新增：获取标题页码映射
private async getHeadingPageMapping(typographySettings: TypographySettings, htmlContent: HTMLElement, book: Book): Promise<Array<{ level: number, text: string, id: string, pageNumber: number }>> {
    const settings = typographySettings.headerFooterToc;
    
    // 1. 构建用于页码计算的完整HTML（不包含目录）
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

    const measureHtml = `
        <html>
            <head>
                <meta charset="utf-8">
                <title>${book.basic.title}</title>
                <style>${style}</style>
            </head>
            <body>
                ${htmlContent.innerHTML}
            </body>
        </html>
    `;

    // 2. 创建临时窗口进行页码计算
    //@ts-ignore
    const measureWin = new electron.remote.BrowserWindow({
        show: false, // 设置为 true 可调试
        width: 1024,
        height: 768,
        webPreferences: {
            sandbox: false,
            contextIsolation: false,
            nodeIntegration: true,
        }
    });

    try {
        // 3. 加载HTML并等待完成
        const ready = new Promise<void>((resolve) => {
            measureWin.webContents.once("did-finish-load", resolve);
        });
        await measureWin.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(measureHtml)}`);
        await ready;
        await new Promise((r) => setTimeout(r, 300)); // 等待样式生效

        // 4. 设置打印参数（与最终PDF相同）
        const printOptions = {
            marginsType: 1,
            pageSize: typographySettings.bookSize || "A4",
            printBackground: true,
            landscape: false,
            scale: 1.0,
            displayHeaderFooter: settings?.headerEnabled || settings?.footerEnabled,
            headerTemplate: this.buildHeaderTemplate(settings, book),
            footerTemplate: this.buildFooterTemplate(settings, book),
        };

        // 5. 执行JavaScript获取标题页码信息
        const headingData = await measureWin.webContents.executeJavaScript(`
            (async () => {
                const headings = [];
                const headingElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
                const maxLevel = ${settings?.tocMaxLevel || 3};
                
                // 模拟打印环境的页面高度计算
                const printOptions = ${JSON.stringify(printOptions)};
                const pageHeight = window.innerHeight;
                const margin = parseFloat('${typographySettings.margin || '2cm'}'.replace('cm', '')) * 37.8; // cm to px
                const contentHeight = pageHeight - (margin * 2);
                
                headingElements.forEach((el, index) => {
                    const level = parseInt(el.tagName.substring(1));
                    if (level <= maxLevel) {
                        const rect = el.getBoundingClientRect();
                        const elementTop = rect.top + window.pageYOffset;
                        
                        // 计算页码（考虑页边距）
                        const pageNumber = Math.max(1, Math.ceil((elementTop - margin) / contentHeight) + 1);
                        
                        const id = el.id || \`heading-\${index}\`;
                        if (!el.id) el.id = id;
                        
                        headings.push({
                            level,
                            text: el.textContent?.trim() || '',
                            id,
                            pageNumber
                        });
                    }
                });
                
                return headings;
            })()
        `);

        return headingData;
    } finally {
        measureWin.close();
    }
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
