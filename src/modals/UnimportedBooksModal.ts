import { App, Modal, setIcon } from 'obsidian';
import { i18n } from '../i18n/i18n';

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
        
        contentEl.createEl('h2', { text: i18n.t('UNIMPORTED_BOOKS_TITLE') });
        
        if (this.folders.length === 0) {
            contentEl.createEl('p', { 
                cls: 'book-smith-unimported-empty-message',
                text: i18n.t('NO_UNIMPORTED_FOLDERS')
            });
            
            const buttonContainer = contentEl.createEl('div', { cls: 'book-smith-unimported-buttons' });
            const closeButton = buttonContainer.createEl('button', {
                text: i18n.t('CLOSE'),
                cls: 'book-smith-unimported-button-cancel'
            });
            
            closeButton.addEventListener('click', () => {
                this.close();
                this.onChoose(null);
            });
            
            return;
        }
        
        const searchContainer = contentEl.createEl('div', { cls: 'book-smith-unimported-search-container' });
        const searchInput = searchContainer.createEl('input', {
            type: 'text',
            placeholder: i18n.t('SEARCH_FOLDERS_PLACEHOLDER'),
            cls: 'book-smith-unimported-search-input'
        });
        
        const listEl = contentEl.createEl('div', { cls: 'book-smith-unimported-list' });
        
        const renderFolders = (folders: string[]) => {
            listEl.empty();
            
            if (folders.length === 0) {
                listEl.createEl('div', { 
                    cls: 'book-smith-unimported-empty-result',
                    text: i18n.t('NO_MATCHING_FOLDERS')
                });
                return;
            }
            
            for (const folder of folders) {
                const item = listEl.createEl('div', { 
                    cls: 'book-smith-unimported-item',
                });
                
                // 创建文件夹图标
                const icon = item.createEl('span', { cls: 'book-smith-unimported-folder-icon' });
                setIcon(icon, 'folder');
                
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
        
        renderFolders(this.folders);
        
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
            text: i18n.t('CANCEL'),
            cls: 'book-smith-unimported-button-cancel'
        });
        
        const importButton = buttonContainer.createEl('button', {
            text: i18n.t('IMPORT'),
            cls: 'book-smith-unimported-button-import'
        });
        
        cancelButton.addEventListener('click', () => {
            this.close();
            this.onChoose(null);
        });
        
        importButton.addEventListener('click', () => {
            if (!this.result) {
                const notice = contentEl.createEl('div', {
                    cls: 'book-smith-unimported-notice',
                    text: i18n.t('SELECT_FOLDER_FIRST')
                });
                
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