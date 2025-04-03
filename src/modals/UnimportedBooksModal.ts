import { App, Modal, Setting } from 'obsidian';

export class UnimportedBooksModal extends Modal {
    private result: string | null = null;
    
    constructor(
        app: App,
        private folders: string[],
        private booksPath: string,
        private onChoose: (result: string | null) => void
    ) {
        super(app);
    }
    
    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('book-smith-unimported-books-modal');
        
        contentEl.createEl('h2', { text: '选择要导入的书籍目录' });
        
        if (this.folders.length === 0) {
            contentEl.createEl('p', { 
                cls: 'book-smith-unimported-empty-message',
                text: '没有找到未导入的书籍目录' 
            });
            
            // 添加关闭按钮
            const buttonContainer = contentEl.createEl('div', { cls: 'book-smith-unimported-buttons' });
            const closeButton = buttonContainer.createEl('button', {
                text: '关闭',
                cls: 'book-smith-unimported-button-cancel'
            });
            
            closeButton.addEventListener('click', () => {
                this.close();
                this.onChoose(null);
            });
            
            return;
        }
        
        // 添加搜索框
        const searchContainer = contentEl.createEl('div', { cls: 'book-smith-unimported-search-container' });
        const searchInput = searchContainer.createEl('input', {
            type: 'text',
            placeholder: '搜索目录...',
            cls: 'book-smith-unimported-search-input'
        });
        
        const listEl = contentEl.createEl('div', { cls: 'book-smith-unimported-list' });
        
        // 渲染文件夹列表
        const renderFolders = (folders: string[]) => {
            listEl.empty();
            
            if (folders.length === 0) {
                listEl.createEl('div', { 
                    cls: 'book-smith-unimported-empty-result',
                    text: '没有匹配的目录' 
                });
                return;
            }
            
            for (const folder of folders) {
                const item = listEl.createEl('div', { 
                    cls: 'book-smith-unimported-item',
                });
                
                // 创建文件夹图标
                const icon = item.createEl('span', { cls: 'book-smith-unimported-folder-icon' });
                icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"></path></svg>`;
                
                // 创建文件夹名称
                item.createEl('span', { text: folder, cls: 'book-smith-unimported-folder-name' });
                
                item.addEventListener('click', () => {
                    // 移除其他选中项的选中状态
                    listEl.querySelectorAll('.selected').forEach(el => 
                        el.removeClass('selected')
                    );
                    
                    // 添加选中状态
                    item.addClass('selected');
                    this.result = folder;
                });
            }
        };
        
        // 初始渲染
        renderFolders(this.folders);
        
        // 搜索功能
        searchInput.addEventListener('input', () => {
            const searchTerm = searchInput.value.toLowerCase();
            if (!searchTerm) {
                renderFolders(this.folders);
                return;
            }
            
            const filteredFolders = this.folders.filter(folder => 
                folder.toLowerCase().includes(searchTerm)
            );
            
            renderFolders(filteredFolders);
        });
        
        const buttonContainer = contentEl.createEl('div', { cls: 'book-smith-unimported-buttons' });
        
        const cancelButton = buttonContainer.createEl('button', {
            text: '取消',
            cls: 'book-smith-unimported-button-cancel'
        });
        
        const importButton = buttonContainer.createEl('button', {
            text: '导入',
            cls: 'book-smith-unimported-button-import'
        });
        
        cancelButton.addEventListener('click', () => {
            this.close();
            this.onChoose(null);
        });
        
        importButton.addEventListener('click', () => {
            if (!this.result) {
                // 如果没有选择，显示提示
                const notice = contentEl.createEl('div', {
                    cls: 'book-smith-unimported-notice',
                    text: '请先选择一个目录'
                });
                
                // 2秒后自动消失
                setTimeout(() => {
                    notice.remove();
                }, 2000);
                
                return;
            }
            
            this.close();
            this.onChoose(this.result);
        });
    }
    
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}