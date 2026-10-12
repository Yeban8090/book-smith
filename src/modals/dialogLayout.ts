import type { Modal } from 'obsidian';

export type DialogSize = 'small' | 'standard' | 'large' | 'wide';

export function initializeDialog(modal: Modal, size: DialogSize = 'standard') {
    modal.modalEl.addClasses(['book-smith-dialog', `book-smith-dialog-${size}`]);
    modal.contentEl.empty();
}

// 将各弹框已有内容归入统一的标题、滚动正文和操作区，保留原控件与事件。
export function finishDialog(modal: Modal) {
    const { contentEl, titleEl } = modal;
    const heading = Array.from(contentEl.children).find(el => /^H[23]$/.test(el.tagName));
    if (heading) {
        titleEl.setText(heading.textContent || '');
        heading.remove();
    }
    const footer = Array.from(contentEl.children).find(el =>
        el.matches('.modal-button-container, .book-smith-unimported-buttons, .book-selection-buttons')
    ) || Array.from(contentEl.children).reverse().find(el =>
        el.matches('.setting-item') && el.querySelector('button') &&
        !el.querySelector('input, textarea, select') &&
        !el.querySelector('.setting-item-name')?.textContent?.trim()
    );
    const body = contentEl.ownerDocument.createElement('div');
    body.className = 'book-smith-dialog-body';
    for (const child of Array.from(contentEl.children)) {
        if (child !== footer) body.appendChild(child);
    }
    contentEl.appendChild(body);
    if (footer) {
        footer.addClass('book-smith-dialog-actions');
        // 确认按钮统一放在最后，取消按钮使用普通样式。
        for (const control of [footer, footer.querySelector('.setting-item-control')].filter(Boolean)) {
            const primary = control!.querySelector(':scope > button.mod-cta');
            if (primary) control!.appendChild(primary);
        }
        contentEl.appendChild(footer);
    }
}
