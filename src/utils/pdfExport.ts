import { PDFArray, PDFDict, PDFDocument, PDFHexString, PDFName, PDFRef, PDFString } from 'pdf-lib';

export function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]!));
}

// 读取 Chromium 实际打印生成的大纲目标页，避免根据屏幕高度猜测分页。
export async function readOutlinePages(bytes: Uint8Array): Promise<Array<{ title: string; page: number }>> {
    const pdf = await PDFDocument.load(bytes);
    const pages = pdf.getPages();
    const entries: Array<{ title: string; page: number }> = [];
    const visited = new Set<PDFDict>();
    const walk = (raw: unknown) => {
        let node = raw;
        while (node) {
            const dict = pdf.context.lookup(node as PDFRef);
            if (!(dict instanceof PDFDict) || visited.has(dict)) break;
            visited.add(dict);
            const title = dict.lookup(PDFName.of('Title'));
            const action = dict.lookup(PDFName.of('A'));
            const destination = dict.lookup(PDFName.of('Dest')) ||
                (action instanceof PDFDict ? action.lookup(PDFName.of('D')) : undefined);
            if ((title instanceof PDFString || title instanceof PDFHexString) && destination instanceof PDFArray) {
                const target = destination.get(0);
                const index = pages.findIndex(page => page.ref.toString() === target.toString());
                if (index >= 0) entries.push({ title: title.decodeText().trim(), page: index + 1 });
            }
            walk(dict.get(PDFName.of('First')));
            node = dict.get(PDFName.of('Next'));
        }
    };
    const outlines = pdf.catalog.lookup(PDFName.of('Outlines'));
    if (outlines instanceof PDFDict) walk(outlines.get(PDFName.of('First')));
    return entries;
}

export function matchHeadingPages(
    headings: Array<{ id: string; text: string }>,
    outline: Array<{ title: string; page: number }>
): Record<string, number> {
    const result: Record<string, number> = Object.create(null);
    let position = 0;
    for (const heading of headings) {
        while (position < outline.length && outline[position].title !== heading.text.trim()) position++;
        if (position >= outline.length) throw new Error(`无法确定目录页码：${heading.text}。请关闭目录后重试，或检查客户端 PDF 大纲支持。`);
        result[heading.id] = outline[position++].page;
    }
    return result;
}
