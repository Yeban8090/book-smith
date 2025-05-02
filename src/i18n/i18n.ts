import { moment } from 'obsidian';
import { Translation } from './interfaces';

// 支持的语言
export type Locale = 'zh-CN' | 'en' | 'ja' | 'ko' | 'fr' | 'de' | 'es' | 'pt' | 'ru';

// 语言管理器
export class I18n {
    private locale: Locale;
    private translations: Record<Locale, Translation>;
    
    constructor() {
        // 初始化为系统语言或默认为中文
        this.locale = this.getSystemLocale();
        this.translations = {} as Record<Locale, Translation>;
        this.loadTranslations();
    }
    
    // 获取系统语言
    private getSystemLocale(): Locale {
        const systemLocale = moment.locale();
        // 映射 moment 语言代码到我们支持的语言
        if (systemLocale.startsWith('zh')) return 'zh-CN';
        if (systemLocale.startsWith('en')) return 'en';
        if (systemLocale.startsWith('ja')) return 'ja';
        if (systemLocale.startsWith('ko')) return 'ko';
        if (systemLocale.startsWith('fr')) return 'fr';
        if (systemLocale.startsWith('de')) return 'de';
        if (systemLocale.startsWith('es')) return 'es';
        if (systemLocale.startsWith('pt')) return 'pt';
        if (systemLocale.startsWith('ru')) return 'ru';
        
        // 默认英文
        return 'en';
    }    
    // 加载翻译文件
    private loadTranslations() {
        // 导入所有语言文件
        import('./locales/zh-CN').then(module => {
            this.translations['zh-CN'] = module.default;
        });
        
        import('./locales/en').then(module => {
            this.translations['en'] = module.default;
        });
        
        // 其他语言可以在这里添加
        // import('./locales/ja').then(module => {
        //     this.translations['ja'] = module.default;
        // });
        // ...
    }
    
    // 获取翻译文本
    public t(key: keyof Translation, params?: Record<string, any>): string {
        let text: string;
        
        // 如果当前语言的翻译不存在，回退到英文
        if (!this.translations[this.locale]) {
            text = this.translations['en'][key] || key as string;
        } else {
            // 如果当前语言的特定翻译不存在，回退到英文
            text = this.translations[this.locale][key] || 
                   this.translations['en'][key] || 
                   key as string;
        }
        
        // 如果有参数，替换文本中的占位符
        if (params) {
            Object.keys(params).forEach(paramKey => {
                text = text.replace(new RegExp(`{${paramKey}}`, 'g'), params[paramKey]);
            });
        }
        
        return text;
    }
}

// 导出单例实例
export const i18n = new I18n();

// 导出接口
export * from './interfaces';