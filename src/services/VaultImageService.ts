import { App, TFile, arrayBufferToBase64 } from 'obsidian';

// 仓库图片直接读取为 data URL，避免 webview 的 app:// 地址、权限及相对路径差异。
export class VaultImageService {
    private cache = new Map<string, Promise<string>>();
    private resources: Map<string, TFile> | null = null;

    constructor(private app: App) {}

    async resolve(src: string, sourcePath = ''): Promise<string> {
        if (!src || /^(data:|https?:|blob:)/i.test(src)) return src;
        let file: TFile | null = null;
        let path = src.split(/[?#]/)[0];
        try { path = decodeURIComponent(path); } catch { /* 保留原始路径 */ }
        if (/^(app:|file:)/i.test(src)) {
            // 使用仓库自己的资源 URL 对应文件，兼容空格、中文与时间戳。
            if (!this.resources) {
                this.resources = new Map();
                for (const candidate of this.app.vault.getFiles()) {
                    let resource = this.app.vault.getResourcePath(candidate).split(/[?#]/)[0];
                    try { resource = decodeURIComponent(resource); } catch { /* 保留原始路径 */ }
                    this.resources.set(resource, candidate);
                    this.resources.set(this.resourcePath(resource), candidate);
                }
            }
            file = this.resources.get(path) || this.resources.get(this.resourcePath(path)) || null;
        } else {
            const candidate = this.app.vault.getAbstractFileByPath(path);
            file = candidate instanceof TFile ? candidate :
                this.app.metadataCache.getFirstLinkpathDest(path, sourcePath);
        }
        if (!file) throw new Error(`找不到仓库图片：${src}`);
        const resolved = file;
        if (!this.cache.has(file.path)) {
            this.cache.set(file.path, this.app.vault.readBinary(file).then(buffer => {
                const mime: Record<string, string> = {
                    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
                    webp: 'image/webp', svg: 'image/svg+xml', bmp: 'image/bmp', avif: 'image/avif'
                };
                return `data:${mime[resolved.extension.toLowerCase()] || 'application/octet-stream'};base64,${arrayBufferToBase64(buffer)}`;
            }));
        }
        return this.cache.get(file.path)!;
    }

    private resourcePath(src: string): string {
        try { return decodeURIComponent(new URL(src).pathname); }
        catch { return src; }
    }

    async embedImages(container: HTMLElement, sourcePath: string) {
        await Promise.all(Array.from(container.querySelectorAll('img')).map(async image => {
            const source = image.getAttribute('src') || image.getAttribute('data-src') || '';
            if (!source) return;
            image.dataset.exportSource = source;
            image.src = await this.resolve(source, sourcePath);
            image.removeAttribute('srcset');
            image.removeAttribute('data-src');
            image.loading = 'eager';
        }));
    }
}
