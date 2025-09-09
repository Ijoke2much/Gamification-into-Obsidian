// Currency Display Service
// Provides centralized access to currency display settings
// Ensures consistency across the application

import { GamificationPluginSettings } from '../../core/settings';

class CurrencyDisplayService {
    private static instance: CurrencyDisplayService;
    private settings: GamificationPluginSettings | null = null;

    private constructor() { }

    public static getInstance(): CurrencyDisplayService {
        if (!CurrencyDisplayService.instance) {
            CurrencyDisplayService.instance = new CurrencyDisplayService();
        }
        return CurrencyDisplayService.instance;
    }

    /**
     * Initialize the service with plugin settings
     */
    public initialize(settings: GamificationPluginSettings): void {
        this.settings = settings;
    }

    /**
     * Get the current currency name (e.g., "Coins", "Gold", "Credits")
     * Falls back to "Coins" if not set
     */
    public getCurrencyName(): string {
        return this.settings?.currencyName || "Coins";
    }

    /**
     * Get the current currency symbol (e.g., "🪙", "$", "¢")
     * Falls back to "🪙" if not set
     */
    public getCurrencySymbol(): string {
        return this.settings?.currencySymbol || "🪙";
    }

    /**
     * Get formatted currency display with symbol and amount
     * @param amount - The amount to display
     * @param includeSymbol - Whether to include the symbol (default: true)
     * @returns Formatted currency string (e.g., "🪙 150")
     */
    public formatCurrency(amount: number, includeSymbol: boolean = true): string {
        const symbol = includeSymbol ? this.getCurrencySymbol() : '';
        const separator = includeSymbol ? ' ' : '';
        return `${symbol}${separator}${amount}`;
    }

    /**
     * Get formatted currency name for UI labels
     * @param plural - Whether to use plural form (default: false)
     * @returns Currency name (e.g., "Coin" or "Coins")
     */
    public getCurrencyLabel(plural: boolean = false): string {
        const baseName = this.getCurrencyName();

        // Simple pluralization - add 's' if it doesn't already end with 's'
        // This handles most common cases, though not perfect for all languages
        if (plural && !baseName.toLowerCase().endsWith('s')) {
            return `${baseName}s`;
        }

        return baseName;
    }

    /**
     * Get currency name in lowercase for internal use
     * @returns Lowercase currency name (e.g., "coins")
     */
    public getCurrencyNameLowercase(): string {
        return this.getCurrencyName().toLowerCase();
    }

    /**
     * Update settings (called when settings are changed)
     */
    public updateSettings(settings: GamificationPluginSettings): void {
        this.settings = settings;
    }
}

// Export singleton instance
export const currencyDisplay = CurrencyDisplayService.getInstance();

// Export the class for testing purposes
export { CurrencyDisplayService };
