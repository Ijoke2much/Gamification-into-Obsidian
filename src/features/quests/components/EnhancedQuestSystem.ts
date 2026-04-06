import { TFile } from 'obsidian';
import type GamifiedObsidianPlugin from '../../../core/main';
import { Quest, parseQuestsFromMarkdown } from '../utils/taskParser';

/**
 * Enhanced Quest System - Hybrid approach that combines React components with reliable banner support
 * Features:
 * - Enhanced React components with better banner loading
 * - Fallback DOM banner injection system
 * - Robust quest parsing with banner support
 * - Backwards compatible with existing system
 */
export class EnhancedQuestSystem {
    private plugin: GamifiedObsidianPlugin;
    private bannerCache: Map<string, string> = new Map();
    private observer: MutationObserver | null = null;

    constructor(plugin: GamifiedObsidianPlugin) {
        this.plugin = plugin;
    }

    /**
     * Initialize the enhanced quest system
     */
    async initialize(): Promise<void> {
        this.startFallbackBannerSystem();
        await this.preloadBannerCache();
    }

    /**
     * Preload banner cache for better performance.
     * Reads from all configured quest files (defaultQuestFilePath + questSaveLocations).
     */
    private async preloadBannerCache(): Promise<void> {
        try {
            const configuredPaths = new Set<string>();
            const defaultPath = this.plugin.settings?.defaultQuestFilePath || 'GamifiedTasks.md';
            if (defaultPath) configuredPaths.add(defaultPath);
            (this.plugin.settings?.questSaveLocations ?? []).forEach((loc: { filePath?: string }) => {
                if (loc.filePath) configuredPaths.add(loc.filePath);
            });

            for (const filePath of configuredPaths) {
                const questsFile = this.plugin.app.vault.getAbstractFileByPath(filePath);
                if (!questsFile || !(questsFile instanceof TFile)) continue;

                const content = await this.plugin.app.vault.read(questsFile);
                const lines = content.split('\n');

                for (const line of lines) {
                    if (!line.includes('🖼️')) continue;

                    const bannerMatch = line.match(/🖼️([^\s]+)/);
                    const titlePatterns = [
                        /- \[.\] ([^#⭐✨🔁🛠️🌱🖼️]+?)(?:\s+#|\s+⭐)/,
                        /- \[.\] ([^#⭐✨🔁🛠️🌱🖼️\n]+)/,
                        /- \[.\] (.+?) #/,
                        /- \[.\] ([^#]+)/,
                        /^[^-]*- \[.\] ([^#⭐]+)/
                    ];

                    let questTitle: string | null = null;
                    for (const pattern of titlePatterns) {
                        const match = line.match(pattern);
                        if (match && match[1]) {
                            questTitle = match[1].trim();
                            break;
                        }
                    }

                    if (bannerMatch && questTitle) {
                        const bannerPath = bannerMatch[1];
                        const dataUrl = await this.loadBannerAsDataUrl(bannerPath);
                        if (dataUrl) {
                            this.bannerCache.set(questTitle, dataUrl);
                            const cleanTitle = questTitle.replace(/\s+/g, ' ').trim();
                            this.bannerCache.set(cleanTitle, dataUrl);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Failed to preload banner cache:', error);
        }
    }

    /**
     * Load banner image as data URL
     */
    async loadBannerAsDataUrl(bannerPath: string): Promise<string | null> {
        try {
            // Check cache first
            const cached = this.bannerCache.get(bannerPath);
            if (cached) return cached;

            // If it's already a data URL or HTTP URL, use it directly
            if (bannerPath.startsWith('data:') || bannerPath.startsWith('http')) {
                return bannerPath;
            }

            // Load from vault
            const file = this.plugin.app.vault.getAbstractFileByPath(bannerPath);
            if (file && file instanceof TFile) {
                const data = await this.plugin.app.vault.readBinary(file);
                const ext = bannerPath.split('.').pop()?.toLowerCase() || 'jpg';
                const mime = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
                const base64 = this.arrayBufferToBase64(data);
                const dataUrl = `data:${mime};base64,${base64}`;

                // Cache it
                this.bannerCache.set(bannerPath, dataUrl);
                return dataUrl;
            }
        } catch (error) {
            console.error('Failed to load banner:', bannerPath, error);
        }

        return null;
    }

    /**
     * Start the fallback banner injection system
     * This runs continuously and injects banners into quest cards that don't have them
     */
    private startFallbackBannerSystem(): void {
        // Initial injection
        this.injectBannersIntoQuestCards();

        // Set up mutation observer to catch new quest cards
        this.observer = new MutationObserver((mutations) => {
            let shouldInject = false;

            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node instanceof HTMLElement) {
                            // Check if this might be a quest card or contain quest cards
                            const text = node.textContent || '';
                            if (text.includes('MAIN QUEST') || text.includes('FITNESS QUEST') ||
                                text.includes('SKILL:') || text.includes('DIFFICULTY:')) {
                                shouldInject = true;
                            }
                        }
                    });
                }
            });

            if (shouldInject) {
                // Debounce the injection to avoid excessive calls
                setTimeout(() => this.injectBannersIntoQuestCards(), 500);
            }
        });

        // Start observing
        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Also run periodically as a backup
        setInterval(() => this.injectBannersIntoQuestCards(), 5000);
    }

    /**
     * Inject banners into quest cards that don't have them
     */
    private async injectBannersIntoQuestCards(): Promise<void> {
        try {
            const questCardSelectors = [
                '.quest-card',
                '.cinematic-quest-card',
                '[class*="quest"]',
                '[class*="Quest"]',
                '[class*="task"]',
                '[class*="Task"]'
            ];

            const elements = new Set<HTMLElement>();

            questCardSelectors.forEach(selector => {
                document.querySelectorAll(selector).forEach(el => elements.add(el as HTMLElement));
            });

            Array.from(document.querySelectorAll('*')).forEach(element => {
                const text = element.textContent || '';
                if (text.includes('MAIN QUEST') || text.includes('FITNESS QUEST') ||
                    text.includes('SIDE QUEST') || text.includes('DAILY QUEST') ||
                    text.includes('SKILL:') || text.includes('DIFFICULTY:') ||
                    text.includes('#gamified-task') || text.includes('🛠️') ||
                    text.includes('⭐') || text.includes('✨')) {
                    elements.add(element as HTMLElement);
                }
            });

            for (const element of elements) {
                const text = element.textContent || '';

                const hasExistingBanner =
                    element.querySelector('.enhanced-quest-banner') ||
                    element.querySelector('.quest-banner') ||
                    element.querySelector('[style*="background-image"]') ||
                    element.closest('.enhanced-quest-banner') ||
                    element.style.backgroundImage ||
                    element.getAttribute('data-has-banner') === 'true' ||
                    element.parentElement?.querySelector('.enhanced-quest-banner');

                if (hasExistingBanner) continue;

                if (text.includes('MAIN QUEST') || text.includes('FITNESS QUEST') ||
                    text.includes('SIDE QUEST') || text.includes('DAILY QUEST') ||
                    text.includes('#gamified-task') || (text.includes('🛠️') && text.includes('⭐'))) {

                    const questTitle = this.extractQuestTitle(text);
                    if (questTitle) {
                        const bannerDataUrl = this.bannerCache.get(questTitle);
                        if (bannerDataUrl) {
                            await this.injectBannerIntoElement(element, bannerDataUrl, questTitle);
                            element.setAttribute('data-has-banner', 'true');
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error in banner injection:', error);
        }
    }

    /**
     * Extract quest title from text content
     */
    private extractQuestTitle(text: string): string | null {
        const patterns = [
            // Pattern: "- [ ] tfr3gr3g3rg #gamified-task ⭐84..." - extract between checkbox and #
            /- \[.\] ([^#⭐✨🔁🛠️🌱🖼️]+?)(?:\s+#|\s+⭐)/,
            // Pattern: Checkbox format with title before any emoji or hashtag
            /- \[.\] ([^#⭐✨🔁🛠️🌱🖼️\n]+)/,
            // Pattern: "Read the Bible MAIN QUEST" or "Test FITNESS QUEST" (legacy)
            /^([^⭐#\n]+?)\s+(?:MAIN QUEST|FITNESS QUEST|SIDE QUEST|DAILY QUEST)/m,
            // Pattern: Lines that start with quest text and contain quest type
            /^([^⭐#\n]+?)(?:\s+⭐|\s+#|\s+MAIN|\s+FITNESS)/m,
            // Pattern: Text before emoji or special characters
            /^([^⭐✨🔁🛠️🌱🖼️#\n]+)/m,
            // Pattern: First meaningful line
            /^([A-Za-z][^⭐#\n]{3,})/m
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
                let title = match[1].trim()
                    .replace(/^\s*-\s*\[.\]\s*/, '') // Remove checkbox
                    .replace(/\s+/g, ' ') // Normalize spaces
                    .trim();

                // Clean up common artifacts
                title = title.replace(/^(MAIN|FITNESS|SIDE|DAILY)\s+(QUEST\s+)?/i, '');

                if (title.length >= 3) {
                    console.log('✅ Extracted title:', title);
                    return title;
                }
            }
        }

        console.log('❌ Could not extract title from text');
        return null;
    }

    /**
     * Inject banner into a quest card element
     */
    private async injectBannerIntoElement(element: HTMLElement, bannerDataUrl: string, questTitle: string): Promise<void> {
        try {
            // Create banner container
            const bannerContainer = document.createElement('div');
            bannerContainer.className = 'enhanced-quest-banner';
            bannerContainer.style.cssText = `
                width: 100%;
                height: 170px;
                background-image: url(${bannerDataUrl});
                background-size: cover;
                background-position: center;
                border-radius: 8px 8px 0 0;
                margin: 0 0 12px 0;
                position: relative;
                overflow: hidden;
                opacity: 0.75;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            `;

            // Create overlay
            const overlay = document.createElement('div');
            overlay.className = 'enhanced-quest-banner-overlay';
            overlay.style.cssText = `
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                background: linear-gradient(transparent, rgba(0,0,0,0.8));
                padding: 8px 12px;
                color: white;
                font-weight: bold;
                font-size: 14px;
                text-shadow: 0 1px 2px rgba(0,0,0,0.8);
            `;
            overlay.textContent = questTitle;
            bannerContainer.appendChild(overlay);

            // Insert banner at the top of the element
            if (element.firstChild) {
                element.insertBefore(bannerContainer, element.firstChild);
            } else {
                element.appendChild(bannerContainer);
            }

        } catch (error) {
            console.error('Failed to inject banner:', error);
        }
    }

    /**
     * Get cached banner for a quest
     */
    getCachedBanner(questTitle: string): string | null {
        return this.bannerCache.get(questTitle) || null;
    }

    /**
     * Enhanced quest parsing with better banner support
     */
    async parseQuestsWithEnhancedBanners(): Promise<Quest[]> {
        try {
            const questsFile = this.plugin.app.vault.getAbstractFileByPath('GamifiedTasks.md');
            if (questsFile && questsFile instanceof TFile) {
                const content = await this.plugin.app.vault.read(questsFile);
                const quests = parseQuestsFromMarkdown(content);

                // Enhance quests with cached banner data
                for (const quest of quests) {
                    if (quest.banner) {
                        const cachedBanner = await this.loadBannerAsDataUrl(quest.banner);
                        if (cachedBanner) {
                            quest.bannerDataUrl = cachedBanner;
                        }
                    }
                }

                return quests;
            }
        } catch (error) {
            console.error('Failed to parse quests with enhanced banners:', error);
        }

        return [];
    }

    /**
     * Convert ArrayBuffer to base64
     */
    private arrayBufferToBase64(buffer: ArrayBuffer): string {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }

    /**
     * Clean up resources
     */
    destroy(): void {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        this.bannerCache.clear();
    }
}

// Extend Quest interface to include banner data URL
declare module '../utils/taskParser' {
    interface Quest {
        bannerDataUrl?: string;
    }
}
