/**
 * Internationalization utilities for the Gamification Plugin
 * Safe implementation that won't interfere with Obsidian's core functionality
 */

export interface LocaleConfig {
    locale: string;
    dateFormat: Intl.DateTimeFormatOptions;
    timeFormat: Intl.DateTimeFormatOptions;
    numberFormat: Intl.NumberFormatOptions;
    currencyFormat: Intl.NumberFormatOptions;
}

export interface TranslationKeys {
    // Quest System
    questBoard: string;
    questTitle: string;
    questDescription: string;
    questDueDate: string;
    questPriority: string;
    questDifficulty: string;
    questEnergy: string;
    questReward: string;
    questComplete: string;
    questIncomplete: string;

    // Player Stats
    playerLevel: string;
    playerXP: string;
    playerCoins: string;
    playerEnergy: string;
    playerFocus: string;
    playerMotivation: string;
    playerCalm: string;

    // Timeline
    timelineToday: string;
    timelineTomorrow: string;
    timelineYesterday: string;
    timelineThisWeek: string;
    timelineNextWeek: string;
    timelineOverdue: string;

    // Common
    save: string;
    cancel: string;
    edit: string;
    delete: string;
    add: string;
    close: string;
    loading: string;
    error: string;
    success: string;
    warning: string;
}

// Default English translations
const DEFAULT_TRANSLATIONS: TranslationKeys = {
    questBoard: "Quest Board",
    questTitle: "Title",
    questDescription: "Description",
    questDueDate: "Due Date",
    questPriority: "Priority",
    questDifficulty: "Difficulty",
    questEnergy: "Energy",
    questReward: "Reward",
    questComplete: "Complete",
    questIncomplete: "Incomplete",

    playerLevel: "Level",
    playerXP: "XP",
    playerCoins: "Coins",
    playerEnergy: "Energy",
    playerFocus: "Focus",
    playerMotivation: "Motivation",
    playerCalm: "Calm",

    timelineToday: "Today",
    timelineTomorrow: "Tomorrow",
    timelineYesterday: "Yesterday",
    timelineThisWeek: "This Week",
    timelineNextWeek: "Next Week",
    timelineOverdue: "Overdue",

    save: "Save",
    cancel: "Cancel",
    edit: "Edit",
    delete: "Delete",
    add: "Add",
    close: "Close",
    loading: "Loading...",
    error: "Error",
    success: "Success",
    warning: "Warning"
};

// Locale configurations
const LOCALE_CONFIGS: Record<string, LocaleConfig> = {
    'en-US': {
        locale: 'en-US',
        dateFormat: { dateStyle: 'short' },
        timeFormat: { timeStyle: 'short', hour12: true },
        numberFormat: { minimumFractionDigits: 0, maximumFractionDigits: 2 },
        currencyFormat: { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0 }
    },
    'en-GB': {
        locale: 'en-GB',
        dateFormat: { dateStyle: 'short' },
        timeFormat: { timeStyle: 'short', hour12: false },
        numberFormat: { minimumFractionDigits: 0, maximumFractionDigits: 2 },
        currencyFormat: { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0 }
    },
    'de-DE': {
        locale: 'de-DE',
        dateFormat: { dateStyle: 'short' },
        timeFormat: { timeStyle: 'short', hour12: false },
        numberFormat: { minimumFractionDigits: 0, maximumFractionDigits: 2 },
        currencyFormat: { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0 }
    },
    'fr-FR': {
        locale: 'fr-FR',
        dateFormat: { dateStyle: 'short' },
        timeFormat: { timeStyle: 'short', hour12: false },
        numberFormat: { minimumFractionDigits: 0, maximumFractionDigits: 2 },
        currencyFormat: { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0 }
    },
    'es-ES': {
        locale: 'es-ES',
        dateFormat: { dateStyle: 'short' },
        timeFormat: { timeStyle: 'short', hour12: false },
        numberFormat: { minimumFractionDigits: 0, maximumFractionDigits: 2 },
        currencyFormat: { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0 }
    },
    'ja-JP': {
        locale: 'ja-JP',
        dateFormat: { dateStyle: 'short' },
        timeFormat: { timeStyle: 'short', hour12: false },
        numberFormat: { minimumFractionDigits: 0, maximumFractionDigits: 2 },
        currencyFormat: { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0 }
    }
};

class I18nService {
    private currentLocale: string = 'en-US';
    private translations: TranslationKeys = DEFAULT_TRANSLATIONS;
    private localeConfig: LocaleConfig = LOCALE_CONFIGS['en-US'];

    constructor() {
        this.detectLocale();
    }

    /**
     * Safely detect user's locale without interfering with Obsidian
     */
    private detectLocale(): void {
        try {
            // Try to get locale from browser
            const browserLocale = navigator.language || 'en-US';
            const baseLocale = browserLocale.split('-')[0];

            // Check if we support the full locale, otherwise use base locale
            if (LOCALE_CONFIGS[browserLocale]) {
                this.currentLocale = browserLocale;
            } else if (LOCALE_CONFIGS[`${baseLocale}-${baseLocale.toUpperCase()}`]) {
                this.currentLocale = `${baseLocale}-${baseLocale.toUpperCase()}`;
            } else {
                this.currentLocale = 'en-US';
            }

            this.localeConfig = LOCALE_CONFIGS[this.currentLocale];
        } catch (error) {
            console.warn('[I18n] Failed to detect locale, using en-US:', error);
            this.currentLocale = 'en-US';
            this.localeConfig = LOCALE_CONFIGS['en-US'];
        }
    }

    /**
     * Set locale manually
     */
    setLocale(locale: string): void {
        if (LOCALE_CONFIGS[locale]) {
            this.currentLocale = locale;
            this.localeConfig = LOCALE_CONFIGS[locale];
        } else {
            console.warn(`[I18n] Unsupported locale: ${locale}, keeping current: ${this.currentLocale}`);
        }
    }

    /**
     * Get current locale
     */
    getLocale(): string {
        return this.currentLocale;
    }

    /**
     * Get translation for a key
     */
    t(key: keyof TranslationKeys): string {
        return this.translations[key] || key;
    }

    /**
     * Format date according to current locale
     */
    formatDate(date: Date, options?: Intl.DateTimeFormatOptions): string {
        try {
            const formatOptions = { ...this.localeConfig.dateFormat, ...options };
            return new Intl.DateTimeFormat(this.currentLocale, formatOptions).format(date);
        } catch (error) {
            console.warn('[I18n] Date formatting failed:', error);
            return date.toLocaleDateString();
        }
    }

    /**
     * Format time according to current locale
     */
    formatTime(date: Date, options?: Intl.DateTimeFormatOptions): string {
        try {
            const formatOptions = { ...this.localeConfig.timeFormat, ...options };
            return new Intl.DateTimeFormat(this.currentLocale, formatOptions).format(date);
        } catch (error) {
            console.warn('[I18n] Time formatting failed:', error);
            return date.toLocaleTimeString();
        }
    }

    /**
     * Format date and time together
     */
    formatDateTime(date: Date, options?: Intl.DateTimeFormatOptions): string {
        try {
            const formatOptions = {
                ...this.localeConfig.dateFormat,
                ...this.localeConfig.timeFormat,
                ...options
            };
            return new Intl.DateTimeFormat(this.currentLocale, formatOptions).format(date);
        } catch (error) {
            console.warn('[I18n] DateTime formatting failed:', error);
            return date.toLocaleString();
        }
    }

    /**
     * Format number according to current locale
     */
    formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
        try {
            const formatOptions = { ...this.localeConfig.numberFormat, ...options };
            return new Intl.NumberFormat(this.currentLocale, formatOptions).format(value);
        } catch (error) {
            console.warn('[I18n] Number formatting failed:', error);
            return value.toString();
        }
    }

    /**
     * Format currency according to current locale
     */
    formatCurrency(value: number, currency: string = 'USD', options?: Intl.NumberFormatOptions): string {
        try {
            const formatOptions: Intl.NumberFormatOptions = {
                ...this.localeConfig.currencyFormat,
                style: 'currency',
                currency: currency,
                ...options
            };
            return new Intl.NumberFormat(this.currentLocale, formatOptions).format(value);
        } catch (error) {
            console.warn('[I18n] Currency formatting failed:', error);
            return `${currency} ${value}`;
        }
    }

    /**
     * Get relative time (e.g., "2 hours ago", "in 3 days")
     */
    formatRelativeTime(date: Date, options?: Intl.RelativeTimeFormatOptions): string {
        try {
            const rtf = new Intl.RelativeTimeFormat(this.currentLocale, { numeric: 'auto' });
            const now = new Date();
            const diffInSeconds = Math.floor((date.getTime() - now.getTime()) / 1000);

            const intervals = [
                { unit: 'year', seconds: 31536000 },
                { unit: 'month', seconds: 2592000 },
                { unit: 'day', seconds: 86400 },
                { unit: 'hour', seconds: 3600 },
                { unit: 'minute', seconds: 60 },
                { unit: 'second', seconds: 1 }
            ] as const;

            for (const { unit, seconds } of intervals) {
                const interval = Math.floor(Math.abs(diffInSeconds) / seconds);
                if (interval >= 1) {
                    return rtf.format(diffInSeconds < 0 ? -interval : interval, unit);
                }
            }

            return rtf.format(0, 'second');
        } catch (error) {
            console.warn('[I18n] Relative time formatting failed:', error);
            return this.formatDate(date);
        }
    }

    /**
     * Get available locales
     */
    getAvailableLocales(): string[] {
        return Object.keys(LOCALE_CONFIGS);
    }

    /**
     * Get locale display name
     */
    getLocaleDisplayName(locale: string): string {
        try {
            return new Intl.DisplayNames([this.currentLocale], { type: 'language' }).of(locale) || locale;
        } catch (error) {
            return locale;
        }
    }
}

// Export singleton instance
export const i18n = new I18nService();

// Export convenience functions
export const t = (key: keyof TranslationKeys) => i18n.t(key);
export const formatDate = (date: Date, options?: Intl.DateTimeFormatOptions) => i18n.formatDate(date, options);
export const formatTime = (date: Date, options?: Intl.DateTimeFormatOptions) => i18n.formatTime(date, options);
export const formatDateTime = (date: Date, options?: Intl.DateTimeFormatOptions) => i18n.formatDateTime(date, options);
export const formatNumber = (value: number, options?: Intl.NumberFormatOptions) => i18n.formatNumber(value, options);
export const formatCurrency = (value: number, currency?: string, options?: Intl.NumberFormatOptions) => i18n.formatCurrency(value, currency, options);
export const formatRelativeTime = (date: Date, options?: Intl.RelativeTimeFormatOptions) => i18n.formatRelativeTime(date, options);
export const getAvailableLocales = () => i18n.getAvailableLocales();
