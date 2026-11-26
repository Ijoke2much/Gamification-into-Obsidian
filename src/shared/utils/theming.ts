/**
 * Theming utilities for the Gamification Plugin
 * Safe implementation that won't interfere with Obsidian's core functionality
 */

export interface ThemeConfig {
    mode: 'light' | 'dark' | 'auto';
    accentColor: string;
    palette: 'default' | 'ocean' | 'forest' | 'sunset' | 'custom';
    accessibility: {
        colorBlindFriendly: boolean;
        highContrast: boolean;
        reducedMotion: boolean;
    };
    customColors?: {
        primary: string;
        secondary: string;
        success: string;
        warning: string;
        error: string;
        background: string;
        surface: string;
        text: string;
        textSecondary: string;
    };
}

export interface ColorPalette {
    name: string;
    description: string;
    colors: {
        primary: string;
        secondary: string;
        success: string;
        warning: string;
        error: string;
        background: string;
        surface: string;
        text: string;
        textSecondary: string;
    };
}

// Predefined color palettes
const COLOR_PALETTES: Record<string, ColorPalette> = {
    default: {
        name: 'Default',
        description: 'Clean and professional default colors',
        colors: {
            primary: '#667eea',
            secondary: '#764ba2',
            success: '#10b981',
            warning: '#f59e0b',
            error: '#ef4444',
            background: '#ffffff',
            surface: '#f8fafc',
            text: '#1f2937',
            textSecondary: '#6b7280'
        }
    },
    ocean: {
        name: 'Ocean',
        description: 'Calming blues and teals inspired by the ocean',
        colors: {
            primary: '#0ea5e9',
            secondary: '#06b6d4',
            success: '#10b981',
            warning: '#f59e0b',
            error: '#ef4444',
            background: '#f0f9ff',
            surface: '#e0f2fe',
            text: '#0c4a6e',
            textSecondary: '#0369a1'
        }
    },
    forest: {
        name: 'Forest',
        description: 'Natural greens and earth tones',
        colors: {
            primary: '#059669',
            secondary: '#0d9488',
            success: '#10b981',
            warning: '#f59e0b',
            error: '#ef4444',
            background: '#f0fdf4',
            surface: '#dcfce7',
            text: '#14532d',
            textSecondary: '#166534'
        }
    },
    sunset: {
        name: 'Sunset',
        description: 'Warm oranges and purples like a sunset',
        colors: {
            primary: '#f97316',
            secondary: '#8b5cf6',
            success: '#10b981',
            warning: '#f59e0b',
            error: '#ef4444',
            background: '#fff7ed',
            surface: '#fed7aa',
            text: '#9a3412',
            textSecondary: '#c2410c'
        }
    }
};

// Color-blind friendly palettes
const ACCESSIBILITY_PALETTES: Record<string, ColorPalette> = {
    protanopia: {
        name: 'Protanopia Friendly',
        description: 'Optimized for red-blind users',
        colors: {
            primary: '#2563eb',
            secondary: '#7c3aed',
            success: '#059669',
            warning: '#d97706',
            error: '#dc2626',
            background: '#ffffff',
            surface: '#f8fafc',
            text: '#1f2937',
            textSecondary: '#6b7280'
        }
    },
    deuteranopia: {
        name: 'Deuteranopia Friendly',
        description: 'Optimized for green-blind users',
        colors: {
            primary: '#2563eb',
            secondary: '#7c3aed',
            success: '#059669',
            warning: '#d97706',
            error: '#dc2626',
            background: '#ffffff',
            surface: '#f8fafc',
            text: '#1f2937',
            textSecondary: '#6b7280'
        }
    },
    tritanopia: {
        name: 'Tritanopia Friendly',
        description: 'Optimized for blue-blind users',
        colors: {
            primary: '#dc2626',
            secondary: '#ea580c',
            success: '#059669',
            warning: '#d97706',
            error: '#dc2626',
            background: '#ffffff',
            surface: '#f8fafc',
            text: '#1f2937',
            textSecondary: '#6b7280'
        }
    },
    highContrast: {
        name: 'High Contrast',
        description: 'Maximum contrast for better visibility',
        colors: {
            primary: '#000000',
            secondary: '#374151',
            success: '#059669',
            warning: '#d97706',
            error: '#dc2626',
            background: '#ffffff',
            surface: '#f3f4f6',
            text: '#000000',
            textSecondary: '#374151'
        }
    }
};

class ThemingService {
    private currentTheme: ThemeConfig;
    private isDarkMode: boolean = false;
    private observer: MutationObserver | null = null;

    constructor() {
        this.currentTheme = this.getDefaultTheme();
        this.detectDarkMode();
        this.setupThemeObserver();
    }

    /**
     * Get default theme configuration
     */
    private getDefaultTheme(): ThemeConfig {
        return {
            mode: 'auto',
            accentColor: '#667eea',
            palette: 'default',
            accessibility: {
                colorBlindFriendly: false,
                highContrast: false,
                reducedMotion: false
            }
        };
    }

    /**
     * Safely detect if Obsidian is in dark mode
     */
    private detectDarkMode(): void {
        try {
            // Check if we're in an Obsidian context
            if (typeof window !== 'undefined' && window.document) {
                const body = window.document.body;
                this.isDarkMode = body.classList.contains('theme-dark') ||
                    body.classList.contains('dark') ||
                    window.matchMedia('(prefers-color-scheme: dark)').matches;
            }
        } catch (error) {
            console.warn('[Theming] Failed to detect dark mode:', error);
            this.isDarkMode = false;
        }
    }

    /**
     * Setup observer to watch for theme changes
     */
    private setupThemeObserver(): void {
        try {
            if (typeof window !== 'undefined' && window.document) {
                this.observer = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                            const target = mutation.target as HTMLElement;
                            if (target === window.document.body) {
                                this.detectDarkMode();
                                this.applyTheme();
                            }
                        }
                    });
                });

                this.observer.observe(window.document.body, {
                    attributes: true,
                    attributeFilter: ['class']
                });
            }
        } catch (error) {
            console.warn('[Theming] Failed to setup theme observer:', error);
        }
    }

    /**
     * Set theme configuration
     */
    setTheme(theme: Partial<ThemeConfig>): void {
        this.currentTheme = { ...this.currentTheme, ...theme };
        this.applyTheme();
    }

    /**
     * Get current theme
     */
    getTheme(): ThemeConfig {
        return { ...this.currentTheme };
    }

    /**
     * Apply theme to the plugin
     */
    private applyTheme(): void {
        try {
            const effectiveMode = this.currentTheme.mode === 'auto' ?
                (this.isDarkMode ? 'dark' : 'light') :
                this.currentTheme.mode;

            const palette = this.getEffectivePalette();
            const colors = this.getEffectiveColors(palette, effectiveMode);

            // Apply CSS custom properties to the plugin container
            this.applyCSSVariables(colors);
        } catch (error) {
            console.warn('[Theming] Failed to apply theme:', error);
        }
    }

    /**
     * Get effective palette based on accessibility settings
     */
    private getEffectivePalette(): ColorPalette {
        if (this.currentTheme.accessibility.highContrast) {
            return ACCESSIBILITY_PALETTES.highContrast;
        }

        if (this.currentTheme.accessibility.colorBlindFriendly) {
            // For now, use protanopia-friendly palette
            // In a full implementation, you'd detect the specific type
            return ACCESSIBILITY_PALETTES.protanopia;
        }

        return COLOR_PALETTES[this.currentTheme.palette] || COLOR_PALETTES.default;
    }

    /**
     * Get effective colors based on mode and palette
     */
    private getEffectiveColors(palette: ColorPalette, mode: 'light' | 'dark'): Record<string, string> {
        const baseColors = { ...palette.colors };

        if (mode === 'dark') {
            return {
                ...baseColors,
                background: '#1f2937',
                surface: '#374151',
                text: '#f9fafb',
                textSecondary: '#d1d5db',
                primary: this.currentTheme.accentColor || baseColors.primary
            };
        }

        return {
            ...baseColors,
            primary: this.currentTheme.accentColor || baseColors.primary
        };
    }

    /**
     * Apply CSS variables to plugin elements
     */
    private applyCSSVariables(colors: Record<string, string>): void {
        try {
            // Find or create a style element for our plugin
            let styleElement = window.document.getElementById('gamification-theme-vars');

            if (!styleElement) {
                styleElement = window.document.createElement('style');
                styleElement.id = 'gamification-theme-vars';
                window.document.head.appendChild(styleElement);
            }

            const css = `
        :root {
          --gamification-primary: ${colors.primary};
          --gamification-secondary: ${colors.secondary};
          --gamification-success: ${colors.success};
          --gamification-warning: ${colors.warning};
          --gamification-error: ${colors.error};
          --gamification-background: ${colors.background};
          --gamification-surface: ${colors.surface};
          --gamification-text: ${colors.text};
          --gamification-text-secondary: ${colors.textSecondary};
        }
        
        .gamification-plugin {
          --primary: var(--gamification-primary);
          --secondary: var(--gamification-secondary);
          --success: var(--gamification-success);
          --warning: var(--gamification-warning);
          --error: var(--gamification-error);
          --background: var(--gamification-background);
          --surface: var(--gamification-surface);
          --text: var(--gamification-text);
          --text-secondary: var(--gamification-text-secondary);
        }
      `;

            styleElement.textContent = css;
        } catch (error) {
            console.warn('[Theming] Failed to apply CSS variables:', error);
        }
    }

    /**
     * Get available palettes
     */
    getAvailablePalettes(): ColorPalette[] {
        return Object.values(COLOR_PALETTES);
    }

    /**
     * Get accessibility palettes
     */
    getAccessibilityPalettes(): ColorPalette[] {
        return Object.values(ACCESSIBILITY_PALETTES);
    }

    /**
     * Generate a custom palette from accent color
     */
    generateCustomPalette(accentColor: string): ColorPalette {
        // Simple color generation - in a full implementation, you'd use a color library
        return {
            name: 'Custom',
            description: 'Custom palette based on your accent color',
            colors: {
                primary: accentColor,
                secondary: this.adjustColorBrightness(accentColor, -20),
                success: '#10b981',
                warning: '#f59e0b',
                error: '#ef4444',
                background: '#ffffff',
                surface: '#f8fafc',
                text: '#1f2937',
                textSecondary: '#6b7280'
            }
        };
    }

    /**
     * Simple color brightness adjustment
     */
    private adjustColorBrightness(color: string, percent: number): string {
        try {
            const num = parseInt(color.replace('#', ''), 16);
            const amt = Math.round(2.55 * percent);
            const R = (num >> 16) + amt;
            const G = (num >> 8 & 0x00FF) + amt;
            const B = (num & 0x0000FF) + amt;
            return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
                (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
                (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
        } catch (error) {
            return color;
        }
    }

    /**
     * Check if reduced motion is preferred
     */
    prefersReducedMotion(): boolean {
        try {
            return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        } catch (error) {
            return false;
        }
    }

    /**
     * Cleanup observer
     */
    destroy(): void {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    }
}

// Export singleton instance
export const theming = new ThemingService();

// Export convenience functions
export const setTheme = (theme: Partial<ThemeConfig>) => theming.setTheme(theme);
export const getTheme = () => theming.getTheme();
export const getAvailablePalettes = () => theming.getAvailablePalettes();
export const getAccessibilityPalettes = () => theming.getAccessibilityPalettes();
