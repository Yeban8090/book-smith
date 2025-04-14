import { ChapterTree } from '../types/book';
import { BookSmithSettings } from '../settings/settings';
import { i18n } from '../i18n/i18n';

export class TemplateManager {
    constructor(private settings: BookSmithSettings) {}

    getTemplate(templateType: string): ChapterTree {
        const template = this.settings.templates.custom[templateType];
        if (!template) {
            throw new Error(i18n.t('TEMPLATE_TYPE_NOT_FOUND', { type: templateType }));
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