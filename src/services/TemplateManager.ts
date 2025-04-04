import { ChapterTree } from '../types/book';
import { BookSmithSettings } from '../settings/settings';

export class TemplateManager {
    constructor(private settings: BookSmithSettings) {}

    getTemplate(templateType: string): ChapterTree {
        const template = this.settings.templates.custom[templateType];
        if (!template) {
            throw new Error(`模板 "${templateType}" 不存在`);
        }
        return JSON.parse(JSON.stringify(template.structure));
    }

    getAllTemplates() {
        return this.settings.templates.custom;
    }

    getAllTemplateTypes(): { key: string; name: string }[] {
        return Object.entries(this.settings.templates.custom).map(([key, template]) => ({
            key,
            name: template.name
        }));
    }
}