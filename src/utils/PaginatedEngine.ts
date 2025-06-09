/**
 * 基础块接口，定义分页所需的基本操作
 */
export interface IBlock {
    type: string;
    isEmpty(): boolean;
    splitTail(minLength?: number): IBlock | null;    // 分页时只允许尾部分割
    mergeTail(other: IBlock): void;                  // 块合并仅支持尾部合并
    toHTMLElement(): HTMLElement;
    clone(): IBlock;
}

/**
 * Paragraph/TextBlock：支持从后往前按标点拆分，无法拆分时等长强拆，保证极端容错
 */
export class TextBlock implements IBlock {
    type: string;
    content: string;

    constructor(type: string, content: string) {
        this.type = type;
        this.content = content;
    }

    isEmpty(): boolean {
        return this.content.trim().length === 0;
    }

    splitTail(minLength = 40): TextBlock | null {
        if (this.content.length <= minLength * 2) return null;
    
        const punctuation = /[。！？；.?!;]/;
        let splitPoint = -1;
    
        for (let i = this.content.length - minLength; i >= minLength; i--) {
            if (punctuation.test(this.content[i])) {
                splitPoint = i + 1;
                break;
            }
        }
    
        // fallback: 没找到标点就强拆中间
        if (splitPoint === -1) {
            splitPoint = Math.floor(this.content.length / 2);
        }
    
        const head = this.content.slice(0, splitPoint).trim();
        const tail = this.content.slice(splitPoint).trim();
    
        if (tail.length < minLength * 0.6) return null;
    
        this.content = head;
        return new TextBlock(this.type, tail);
    }

    mergeTail(other: IBlock): void {
        if (other instanceof TextBlock) {
            this.content += other.content;
        }
    }

    toHTMLElement(): HTMLElement {
        const el = document.createElement(this.type);
        el.innerHTML = this.content;
        return el;
    }

    clone(): TextBlock {
        return new TextBlock(this.type, this.content);
    }
}

/**
 * DOMBlock：不可分割的块，如列表/表格/引用块等
 */
export class DOMBlock implements IBlock {
    type: string;
    element: HTMLElement;

    constructor(element: HTMLElement) {
        this.type = element.tagName.toLowerCase();
        this.element = element.cloneNode(true) as HTMLElement;
    }

    isEmpty(): boolean {
        return !this.element.textContent?.trim();
    }
    splitTail(): IBlock | null { return null; }       // DOM块不可分割
    mergeTail(other: IBlock): void { }                 // DOM块不可合并
    toHTMLElement(): HTMLElement {
        return this.element.cloneNode(true) as HTMLElement;
    }
    clone(): DOMBlock {
        return new DOMBlock(this.element);
    }
}

/**
 * ImageBlock：专门处理图片元素，亦不可分割合并
 */
export class ImageBlock implements IBlock {
    type: string;
    element: HTMLElement;

    constructor(element: HTMLImageElement) {
        this.type = 'img';
        this.element = element.cloneNode(true) as HTMLElement;
    }

    isEmpty(): boolean { return false; }
    splitTail(): IBlock | null { return null; }
    mergeTail(other: IBlock): void { }
    toHTMLElement(): HTMLElement {
        return this.element.cloneNode(true) as HTMLElement;
    }
    clone(): ImageBlock {
        return new ImageBlock(this.element as HTMLImageElement);
    }
}

/**
 * 单页结构
 */
export class Page {
    blocks: IBlock[] = [];
    element: HTMLElement;
    bookSize: string;

    constructor(bookSize: string = 'a4') {
        this.bookSize = bookSize;
        this.element = this.createPageElement();
    }

    private createPageElement(): HTMLElement {
        const page = document.createElement('div');
        page.classList.add('book-page', `book-size-${this.bookSize}`);
        // 页码占位
        const pageNumber = document.createElement('div');
        pageNumber.classList.add('page-number');
        page.appendChild(pageNumber);
        return page;
    }

    addBlock(block: IBlock): void {
        this.blocks.push(block.clone());
        this.element.appendChild(block.toHTMLElement());
    }
    removeLastBlock(): IBlock | null {
        if (!this.blocks.length) return null;
        this.element.removeChild(this.element.lastChild as Node);
        return this.blocks.pop() || null;
    }
    isOverflow(maxHeight: number): boolean {
        return this.element.scrollHeight > maxHeight;
    }
    setPageNumber(number: number): void {
        const pageNumberElement = this.element.querySelector('.page-number');
        if (pageNumberElement) {
            pageNumberElement.textContent = number.toString();
            (pageNumberElement as HTMLElement).style.position = 'absolute';
            (pageNumberElement as HTMLElement).style.bottom = '10px';
            (pageNumberElement as HTMLElement).style.left = '0';
            (pageNumberElement as HTMLElement).style.right = '0';
            (pageNumberElement as HTMLElement).style.textAlign = 'center';
        }
    }
}

/**
 * 提取 DOM 容器内的所有内容块
 */
export function extractBlocks(container: HTMLElement): IBlock[] {
    const blocks: IBlock[] = [];
    const selectors = 'p, h1, h2, h3, h4, h5, h6, ul, ol, pre, blockquote, table, .callout, img';
    const elements = Array.from(container.querySelectorAll(selectors));
    for (const el of elements) {
        if (el.tagName.toLowerCase() === 'img') {
            blocks.push(new ImageBlock(el as HTMLImageElement));
        } else if (['p','h1','h2','h3','h4','h5','h6'].includes(el.tagName.toLowerCase())) {
            const block = new TextBlock(el.tagName.toLowerCase(), el.innerHTML);
            blocks.push(block);
        } else {
            blocks.push(new DOMBlock(el as HTMLElement));
        }
    }
    return blocks;
}

/**
 * 分页主引擎
 */
export class PaginatedEngine {
    private container: HTMLElement;
    private pages: Page[] = [];
    private bookSize: string = 'a4';
    private pageHeight: number = 800;

    constructor(container: HTMLElement) {
        this.container = container;
    }

    setOptions(options: { bookSize?: string; pageHeight?: number }) {
        if (options.bookSize) this.bookSize = options.bookSize;
        if (options.pageHeight) this.pageHeight = options.pageHeight;
    }

    /**
     * 主分页流程，极端容错防止死循环
     */
    paginate(blocks: IBlock[]): number {
        this.container.innerHTML = '';
        this.pages = [];
        const pageHeightMap = {
            'a4': 1123, 'a5': 794, 'b5': 945, '16k': 983, 'custom': 907
        };
        const actualPageHeight = pageHeightMap[this.bookSize as keyof typeof pageHeightMap] || this.pageHeight;

        let currentPage = this.createNewPage();
        let unpaginatedBlocks = blocks.map(b => b.clone());
        let safetyCounter = 0;
        const maxIterations = blocks.length * 6;

        while (unpaginatedBlocks.length > 0 && safetyCounter < maxIterations) {
            safetyCounter++;
            const nextBlock = unpaginatedBlocks[0];
            currentPage.addBlock(nextBlock);
        
            if (currentPage.isOverflow(actualPageHeight)) {
                const removed = currentPage.removeLastBlock();
                if (!removed) break;
        
                let splitBlock = removed;
                let splitSuccess = false;
        
                while (true) {
                    const tail = splitBlock.splitTail?.() ?? null;
                    if (!tail) break;
        
                    currentPage.addBlock(splitBlock);
                    if (!currentPage.isOverflow(actualPageHeight)) {
                        unpaginatedBlocks[0] = tail;
                        splitSuccess = true;
                        break;
                    }
        
                    currentPage.removeLastBlock();
                    splitBlock = tail;
                }
        
                if (!splitSuccess) {
                    unpaginatedBlocks[0] = removed;
                    currentPage = this.createNewPage();
        
                    if (unpaginatedBlocks.length === 1 && unpaginatedBlocks[0] === removed) {
                        currentPage.addBlock(removed);
                        unpaginatedBlocks.shift();
                    }
                }
            } else {
                unpaginatedBlocks.shift();
            }
        }
        this.pages.forEach((page, idx) => page.setPageNumber(idx + 1));
        return this.pages.length;
    }

    private createNewPage(): Page {
        const page = new Page(this.bookSize);
        this.pages.push(page);
        this.container.appendChild(page.element);
        return page;
    }
    getPages(): Page[] { return this.pages; }
    addPageMarkers(format = "— 第 {page} 页 —") {
        this.pages.forEach((page, idx) => {
            const marker = document.createElement('div');
            marker.classList.add('page-marker');
            marker.textContent = format.replace("{page}", (idx + 1).toString());
            page.element.appendChild(marker);
        });
    }
}
/**
 * 创建一个分页容器，模拟一页纸的样式
 */
export function createNewPage(bookSize: string = 'a4'): HTMLElement {
    const page = document.createElement('div');
    page.classList.add('book-page');
    page.classList.add(`book-size-${bookSize}`);

    // 添加页码占位元素
    const pageNumber = document.createElement('div');
    pageNumber.classList.add('page-number');
    page.appendChild(pageNumber);

    return page;
}

/**
 * 生成分页目录
 */
export function generatePaginatedTOC(container: HTMLElement, contentContainer: HTMLElement, bookSize: string = 'a4'): HTMLElement[] {
    // 创建目录容器
    const tocContainer = document.createElement('div');

    const tocTitle = document.createElement('h2');
    tocTitle.textContent = '目录';
    tocContainer.appendChild(tocTitle);

    const tocList = document.createElement('ul');
    tocList.classList.add('toc-list');
    tocContainer.appendChild(tocList);

    // 查找所有标题元素和它们所在的页面
    const headingsWithPages: Array<{
        level: number;
        text: string;
        id: string;
        pageNumber: number;
    }> = [];
    const pages = Array.from(contentContainer.querySelectorAll('.book-page'));

    pages.forEach((page, pageIndex) => {
        const headings = Array.from(page.querySelectorAll('h1, h2, h3, h4, h5, h6'));
        headings.forEach((heading, index) => {
            // 优先使用自定义属性中的实际层级，如果没有则使用标签名中的数字
            const level = (heading as HTMLElement).dataset.actualLevel
                ? parseInt((heading as HTMLElement).dataset.actualLevel || '1')
                : parseInt(heading.tagName.substring(1));
            const text = heading.textContent || '';
            const id = `heading-${pageIndex}-${index}`;

            // 设置标题ID，用于锚点链接
            heading.id = id;

            headingsWithPages.push({
                level,
                text,
                id,
                pageNumber: pageIndex + 1
            });
        });
    });

    // 为每个标题创建目录项
    headingsWithPages.forEach(({ level, text, id, pageNumber }) => {
        const listItem = document.createElement('li');
        listItem.classList.add(`toc-level-${level}`);

        // 创建链接和页码容器
        const itemContent = document.createElement('div');
        itemContent.classList.add('toc-item-content');

        // 添加链接
        const link = document.createElement('a');
        link.href = `#${id}`;
        link.textContent = text;
        itemContent.appendChild(link);

        // 添加页码
        const pageRef = document.createElement('span');
        pageRef.classList.add('toc-page-ref');
        pageRef.textContent = pageNumber.toString();
        itemContent.appendChild(pageRef);

        listItem.appendChild(itemContent);
        tocList.appendChild(listItem);
    });

    // 对目录进行分页处理
    const tocPages = [];
    const pageHeight = getPageHeightByBookSize(bookSize);

    // 创建第一个目录页
    let currentTocPage = document.createElement('div');
    currentTocPage.classList.add('book-page', 'toc-page', `book-size-${bookSize}`);
    currentTocPage.appendChild(tocContainer.cloneNode(true));
    tocPages.push(currentTocPage);

    // 检查目录是否需要分页
    if (currentTocPage.scrollHeight > pageHeight) {
        // 重新创建目录，按项目分页
        tocPages.length = 0;
        currentTocPage = document.createElement('div');
        currentTocPage.classList.add('book-page', 'toc-page', `book-size-${bookSize}`);

        const newTocContainer = document.createElement('div');
        newTocContainer.classList.add('typography-toc');
        newTocContainer.classList.add(`book-size-${bookSize}`);

        const newTocTitle = document.createElement('h2');
        newTocTitle.textContent = '目录';
        newTocContainer.appendChild(newTocTitle);

        const newTocList = document.createElement('ul');
        newTocList.classList.add('toc-list');
        newTocContainer.appendChild(newTocList);

        currentTocPage.appendChild(newTocContainer);
        tocPages.push(currentTocPage);

        // 逐项添加目录项，检查是否需要创建新页
        headingsWithPages.forEach(({ level, text, id, pageNumber }) => {
            const listItem = document.createElement('li');
            listItem.classList.add(`toc-level-${level}`);

            // 创建链接和页码容器
            const itemContent = document.createElement('div');
            itemContent.classList.add('toc-item-content');

            // 添加链接
            const link = document.createElement('a');
            link.href = `#${id}`;
            link.textContent = text;
            itemContent.appendChild(link);

            // 添加页码
            const pageRef = document.createElement('span');
            pageRef.classList.add('toc-page-ref');
            pageRef.textContent = pageNumber.toString();
            itemContent.appendChild(pageRef);

            listItem.appendChild(itemContent);

            // 添加到当前目录页
            const currentTocList = currentTocPage.querySelector('.toc-list');
            if (currentTocList) {
                currentTocList.appendChild(listItem);

                // 检查是否溢出
                if (currentTocPage.scrollHeight > pageHeight) {
                    // 移除刚添加的项
                    currentTocList.removeChild(listItem);

                    // 创建新的目录页
                    const nextTocPage = document.createElement('div');
                    nextTocPage.classList.add('book-page', 'toc-page', `book-size-${bookSize}`);

                    const nextTocContainer = document.createElement('div');
                    nextTocContainer.classList.add('typography-toc');
                    nextTocContainer.classList.add(`book-size-${bookSize}`);

                    const nextTocTitle = document.createElement('h2');
                    nextTocTitle.textContent = '目录';
                    nextTocContainer.appendChild(nextTocTitle);

                    const nextTocList = document.createElement('ul');
                    nextTocList.classList.add('toc-list');
                    nextTocContainer.appendChild(nextTocList);

                    nextTocPage.appendChild(nextTocContainer);
                    nextTocList.appendChild(listItem);

                    tocPages.push(nextTocPage);
                    currentTocPage = nextTocPage;
                }
            }
        });
    }

    return tocPages;
}

// 辅助函数：根据开本大小获取页面高度
function getPageHeightByBookSize(bookSize: string): number {
    switch (bookSize) {
        case 'a4': return 1000;
        case 'a5': return 800;
        case 'b5': return 900;
        case '16k': return 850;
        case 'custom': return 800;
        default: return 800;
    }
}