import { PDFArray, PDFDict, PDFDocument, PDFHexString, PDFName, PDFNumber, PDFObject, PDFRef, PDFString } from 'pdf-lib';

export function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]!));
}

// 读取 Chromium 实际打印生成的大纲目标页，避免根据屏幕高度猜测分页。
export async function readHeadingPages(bytes: Uint8Array): Promise<{
    named: Record<string, number>;
    outline: Array<{ title: string; page: number }>;
    links: number[];
}> {
    const pdf = await PDFDocument.load(bytes);
    const pages = pdf.getPages();
    const entries: Array<{ title: string; page: number }> = [];
    const namedDestinations = new Map<string, PDFObject>();
    const nameText = (value: PDFObject | undefined): string | undefined =>
        value instanceof PDFString || value instanceof PDFHexString || value instanceof PDFName ? value.decodeText() : undefined;
    const readNames = (raw: PDFObject | undefined, seen = new Set<PDFDict>()) => {
        const tree = pdf.context.lookup(raw);
        if (!(tree instanceof PDFDict) || seen.has(tree)) return;
        seen.add(tree);
        const names = tree.lookup(PDFName.of('Names'));
        if (names instanceof PDFArray) {
            for (let i = 0; i + 1 < names.size(); i += 2) {
                const key = nameText(names.lookup(i));
                if (key !== undefined) namedDestinations.set(key, names.get(i + 1));
            }
        }
        const kids = tree.lookup(PDFName.of('Kids'));
        if (kids instanceof PDFArray) for (let i = 0; i < kids.size(); i++) readNames(kids.get(i), seen);
    };
    const names = pdf.catalog.lookup(PDFName.of('Names'));
    if (names instanceof PDFDict) readNames(names.get(PDFName.of('Dests')));
    const legacyDests = pdf.catalog.lookup(PDFName.of('Dests'));
    if (legacyDests instanceof PDFDict) {
        for (const [key, value] of legacyDests.entries()) namedDestinations.set(key.decodeText(), value);
    }
    const destinationPage = (raw: PDFObject | undefined, seen = new Set<string>()): number | undefined => {
        const destination = pdf.context.lookup(raw);
        const name = nameText(destination);
        if (name !== undefined) {
            if (seen.has(name)) return;
            seen.add(name);
            return destinationPage(namedDestinations.get(name), seen);
        }
        if (destination instanceof PDFDict) return destinationPage(destination.get(PDFName.of('D')), seen);
        if (!(destination instanceof PDFArray) || destination.size() === 0) return;
        const target = destination.get(0);
        // 显式本地目标通常使用页面引用；部分生成器使用从零开始的页面索引。
        const index = target instanceof PDFNumber ? target.asNumber() :
            pages.findIndex(page => page.ref.toString() === target.toString());
        if (index >= 0 && index < pages.length) return index + 1;
    };
    const named: Record<string, number> = Object.create(null);
    for (const [name, destination] of namedDestinations) {
        const page = destinationPage(destination);
        if (page) named[name] = page;
    }
    // Chromium 通常不生成大纲，但目录链接仍带有真实页面目标。
    // 目录位于正文最前面，按页面及链接从上到下的顺序读取。
    const links: number[] = [];
    for (const page of pages) {
        const annotations = page.node.lookup(PDFName.of('Annots'));
        if (!(annotations instanceof PDFArray)) continue;
        const targets: Array<{ page: number; x: number; y: number }> = [];
        for (let i = 0; i < annotations.size(); i++) {
            const annotation = annotations.lookup(i);
            if (!(annotation instanceof PDFDict) || annotation.lookup(PDFName.of('Subtype')) !== PDFName.of('Link')) continue;
            const action = annotation.lookup(PDFName.of('A'));
            const destination = annotation.get(PDFName.of('Dest')) ||
                (action instanceof PDFDict && action.lookup(PDFName.of('S')) === PDFName.of('GoTo') ? action.get(PDFName.of('D')) : undefined);
            const target = destinationPage(destination);
            const rect = annotation.lookup(PDFName.of('Rect'));
            const x = rect instanceof PDFArray ? rect.lookup(0) : undefined;
            const y = rect instanceof PDFArray ? rect.lookup(3) : undefined;
            // 未解析的链接保留占位，避免后面的正文链接被错当成目录项。
            targets.push({ page: target || 0, x: x instanceof PDFNumber ? x.asNumber() : 0, y: y instanceof PDFNumber ? y.asNumber() : 0 });
        }
        targets.sort((a, b) => b.y - a.y || a.x - b.x);
        links.push(...targets.map(target => target.page));
    }
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
            const page = destinationPage(destination);
            if ((title instanceof PDFString || title instanceof PDFHexString) && page) entries.push({ title: title.decodeText().trim(), page });
            walk(dict.get(PDFName.of('First')));
            node = dict.get(PDFName.of('Next'));
        }
    };
    const outlines = pdf.catalog.lookup(PDFName.of('Outlines'));
    if (outlines instanceof PDFDict) walk(outlines.get(PDFName.of('First')));
    return { named, outline: entries, links };
}

export function matchHeadingPages(
    headings: Array<{ id: string; text: string }>,
    outline: Array<{ title: string; page: number }>
): Record<string, number> {
    const result: Record<string, number> = Object.create(null);
    let position = 0;
    for (const heading of headings) {
        const next = outline.findIndex((entry, index) => index >= position && entry.title === heading.text.trim());
        if (next >= 0) {
            result[heading.id] = outline[next].page;
            position = next + 1;
        }
    }
    return result;
}
