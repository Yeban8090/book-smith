import { ChapterTree } from '../types/book';
import { defaultTemplate } from '../templates/default';

export class TemplateManager {
    private templates: Map<string, ChapterTree>;

    constructor() {
        this.templates = new Map();
        this.initializeDefaultTemplates();
    }

    private initializeDefaultTemplates() {
        this.templates.set('default', defaultTemplate);
    }

    getTemplate(templateType: string): ChapterTree {
        const template = this.templates.get(templateType);
        if (!template) {
            throw new Error(`模板 "${templateType}" 不存在`);
        }
        return JSON.parse(JSON.stringify(template));
    }

    getAllTemplateTypes(): string[] {
        return Array.from(this.templates.keys());
    }

    addTemplate(name: string, template: ChapterTree): void {
        this.templates.set(name, template);
    }
}