import { TextInputSuggest } from "./suggest";
import type { App } from "obsidian";

export class GenericTextSuggester extends TextInputSuggest<string> {
	constructor(
		public app: App,
		public inputEl: HTMLInputElement | HTMLTextAreaElement,
		private items: string[],
		private maxSuggestions = Infinity
	) {
		super(app, inputEl);
	}

	getSuggestions(inputStr: string): string[] {
		if (!inputStr) return this.items.slice(0, this.maxSuggestions);
		
		const inputLowerCase = inputStr.toLowerCase();
		return this.items
			.filter(item => item.toLowerCase().contains(inputLowerCase))
			.slice(0, this.maxSuggestions);
	}

	selectSuggestion(item: string, event: MouseEvent | KeyboardEvent): void {
		this.inputEl.value = item;
		this.inputEl.trigger("input");
		this.close();
	}

	renderSuggestion(value: string, el: HTMLElement): void {
		el.setText(value || "");
	}
}