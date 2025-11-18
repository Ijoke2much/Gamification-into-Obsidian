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
        console.log('🚀 Initializing Enhanced Quest System...');

        // Start the fallback banner injection system
        this.startFallbackBannerSystem();

        // Preload banner cache
        await this.preloadBannerCache();

        console.log('✅ Enhanced Quest System initialized');
    }

    /**
     * Preload banner cache for better performance
     */
    private async preloadBannerCache(): Promise<void> {
        try {
            console.log('📸 Starting banner cache preload...');
            const questsFile = this.plugin.app.vault.getAbstractFileByPath('GamifiedTasks.md');
            if (questsFile && questsFile instanceof TFile) {
                const content = await this.plugin.app.vault.read(questsFile);
                const lines = content.split('\n');

                for (const line of lines) {
                    if (line.includes('🖼️')) {
                        console.log('🔍 Processing banner line:', line);

                        const bannerMatch = line.match(/🖼️([^\s]+)/);

                        // Try multiple patterns to extract quest title - UPDATED for actual format
                        const titlePatterns = [
                            /- \[.\] ([^#⭐✨🔁🛠️🌱🖼️]+?)(?:\s+#|\s+⭐)/, // "- [ ] tfr3gr3g3rg #gamified-task" 
                            /- \[.\] ([^#⭐✨🔁🛠️🌱🖼️\n]+)/, // Before any emoji/special chars
                            /- \[.\] (.+?) #/, // Standard format (legacy)
                            /- \[.\] ([^#]+)/, // Before hashtag
                            /^[^-]*- \[.\] ([^#⭐]+)/ // Fallback
                        ];

                        let questTitle = null;
                        for (const pattern of titlePatterns) {
                            const match = line.match(pattern);
                            if (match && match[1]) {
                                questTitle = match[1].trim();
                                break;
                            }
                        }

                        if (bannerMatch && questTitle) {
                            const bannerPath = bannerMatch[1];
                            console.log(`📸 Caching banner for quest: "${questTitle}" -> ${bannerPath}`);

                            // Load and cache banner
                            const dataUrl = await this.loadBannerAsDataUrl(bannerPath);
                            if (dataUrl) {
                                // Cache with both the exact title and a cleaned version
                                this.bannerCache.set(questTitle, dataUrl);

                                // Also cache with cleaned title for better matching
                                const cleanTitle = questTitle.replace(/\s+/g, ' ').trim();
                                this.bannerCache.set(cleanTitle, dataUrl);

                                console.log(`✅ Cached banner for: "${questTitle}"`);
                            } else {
                                console.log(`❌ Failed to load banner: ${bannerPath}`);
                            }
                        } else {
                            console.log('❌ Could not extract title or banner from line:', line);
                        }
                    }
                }

                console.log(`📸 Banner cache preload completed - ${this.bannerCache.size} banners cached`);
                console.log('📋 Cached quest titles:', Array.from(this.bannerCache.keys()));
            }
        } catch (error) {
            console.error('❌ Failed to preload banner cache:', error);
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
        console.log('🔄 Starting fallback banner injection system...');

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
            console.log('🔍 Starting comprehensive banner injection scan...');

            // Find all potential quest card elements using multiple strategies
            const questCardSelectors = [
                '.quest-card',
                '.cinematic-quest-card',
                '[class*="quest"]',
                '[class*="Quest"]',
                '[class*="task"]',
                '[class*="Task"]'
            ];

            const elements = new Set<HTMLElement>();

            // Strategy 1: Find by CSS selectors
            questCardSelectors.forEach(selector => {
                document.querySelectorAll(selector).forEach(el => {
                    elements.add(el as HTMLElement);
                    console.log('📍 Found by selector', selector, ':', el.textContent?.substring(0, 50));
                });
            });

            // Strategy 2: Find by text content - UPDATED to match actual quest format
            Array.from(document.querySelectorAll('*')).forEach(element => {
                const text = element.textContent || '';
                if (text.includes('MAIN QUEST') || text.includes('FITNESS QUEST') ||
                    text.includes('SIDE QUEST') || text.includes('DAILY QUEST') ||
                    text.includes('SKILL:') || text.includes('DIFFICULTY:') ||
                    text.includes('#gamified-task') ||  // Match actual quest format
                    text.includes('🛠️') ||              // Match skill emoji
                    text.includes('⭐') ||              // Match XP emoji
                    text.includes('✨')) {              // Match CP emoji
                    elements.add(element as HTMLElement);
                    console.log('📍 Found by text content:', text.substring(0, 100));
                }
            });

            console.log(`🔍 Found ${elements.size} potential quest card elements`);

            let bannersInjected = 0;

            for (const element of elements) {
                const text = element.textContent || '';

                // Enhanced duplication detection - check multiple conditions
                const hasExistingBanner =
                    element.querySelector('.enhanced-quest-banner') ||           // Our injected banner
                    element.querySelector('.quest-banner') ||                    // CSS banner
                    element.querySelector('[style*="background-image"]') ||      // Inline background
                    element.closest('.enhanced-quest-banner') ||                 // Parent has banner
                    element.style.backgroundImage ||                             // Element has background
                    element.getAttribute('data-has-banner') === 'true' ||        // Manual flag
                    element.parentElement?.querySelector('.enhanced-quest-banner'); // Sibling has banner

                if (hasExistingBanner) {
                    console.log('⏭️ Skipping element - already has banner:', text.substring(0, 50));
                    continue;
                }

                // Check if this looks like a quest card - UPDATED to match actual format
                if (text.includes('MAIN QUEST') || text.includes('FITNESS QUEST') ||
                    text.includes('SIDE QUEST') || text.includes('DAILY QUEST') ||
                    text.includes('#gamified-task') ||  // Match your actual quest format
                    (text.includes('🛠️') && text.includes('⭐'))) {  // Match quest with emojis

                    // Extract quest title using improved method
                    const questTitle = this.extractQuestTitle(text);
                    console.log('🎯 Processing quest:', questTitle);

                    if (questTitle) {
                        // Check if we have a banner for this quest
                        const bannerDataUrl = this.bannerCache.get(questTitle);
                        console.log('🖼️ Banner available for quest:', questTitle, !!bannerDataUrl);

                        if (bannerDataUrl) {
                            await this.injectBannerIntoElement(element, bannerDataUrl, questTitle);
                            // Mark element as having a banner to prevent future duplication
                            element.setAttribute('data-has-banner', 'true');
                            bannersInjected++;
                        }
                    }
                }
            }

            console.log(`✅ Banner injection completed - ${bannersInjected} banners injected`);
        } catch (error) {
            console.error('❌ Error in banner injection:', error);
        }
    }

    /**
     * Extract quest title from text content
     */
    private extractQuestTitle(text: string): string | null {
        console.log('🔍 Extracting title from text:', text.substring(0, 100));

        // Try different patterns to extract quest title based on ACTUAL quest structure
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

            console.log('✅ Banner injected for quest:', questTitle);
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
        console.log('🧹 Enhanced Quest System destroyed');
    }
}

// Extend Quest interface to include banner data URL
declare module '../utils/taskParser' {
    interface Quest {
        bannerDataUrl?: string;
    }
}
