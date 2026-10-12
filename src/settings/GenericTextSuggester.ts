import { AbstractInputSuggest, App } from 'obsidian';

export class GenericTextSuggester extends AbstractInputSuggest<string> {
    constructor(
        app: App,
        private inputEl: HTMLInputElement,
        private items: string[],
        private maxSuggestions = 100
    ) {
        super(app, inputEl);
        this.limit = maxSuggestions;
    }

    getSuggestions(query: string): string[] {
        const normalized = query.toLowerCase();
        return this.items.filter(item => item.toLowerCase().includes(normalized))
            .slice(0, this.maxSuggestions);
    }

    selectSuggestion(item: string): void {
        this.inputEl.value = item;
        // 使用输入框所属窗口的事件，通知 Setting 的 onChange 保存配置。
        const ownerWindow = this.inputEl.ownerDocument.defaultView;
        if (ownerWindow) this.inputEl.dispatchEvent(new ownerWindow.Event('input', { bubbles: true }));
        this.close();
    }

    renderSuggestion(value: string, el: HTMLElement): void {
        el.setText(value);
    }
}
