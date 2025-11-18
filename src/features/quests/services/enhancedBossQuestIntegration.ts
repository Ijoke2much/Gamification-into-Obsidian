import { App, TFile } from 'obsidian';
import { Boss, BossProgress } from '../types/BossTypes';
import { Quest } from '../utils/taskParser';
import { bossManagementService } from '../utils/bossManagementService';

export interface BossQuestLink {
    bossId: string;
    questId: string;
    linkType: 'direct' | 'tag_based' | 'auto_detected';
    tags: string[];
    createdAt: Date;
    lastUpdated: Date;
    isActive: boolean;
}

export interface QuestBossFilter {
    bossId?: string;
    bossTag?: string;
    questTags?: string[];
    isActive?: boolean;
    linkType?: BossQuestLink['linkType'];
}

export class EnhancedBossQuestIntegration {
    private static instance: EnhancedBossQuestIntegration;
    private app: App;
    private bossQuestLinks: Map<string, BossQuestLink> = new Map();
    private questBossCache: Map<string, string[]> = new Map(); // questId -> bossIds[]
    private bossQuestCache: Map<string, string[]> = new Map(); // bossId -> questIds[]

    private constructor(app: App) {
        this.app = app;
        this.loadBossQuestLinks();
    }

    static getInstance(app: App): EnhancedBossQuestIntegration {
        if (!EnhancedBossQuestIntegration.instance) {
            EnhancedBossQuestIntegration.instance = new EnhancedBossQuestIntegration(app);
        }
        return EnhancedBossQuestIntegration.instance;
    }

    /**
     * Create a unique boss ID with quest context
     */
    generateBossId(quest: Quest, customSuffix?: string): string {
        const timestamp = Date.now();
        const questHash = this.hashString(quest.id);
        const suffix = customSuffix || 'boss';
        return `${questHash}-${suffix}-${timestamp}`;
    }

    /**
     * Create a boss tag for quest filtering
     */
    generateBossTag(bossId: string, quest: Quest): string {
        const questPrefix = quest.title.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 8);
        return `#boss-${questPrefix}-${bossId.split('-').pop()}`;
    }

    /**
     * Link a boss to a quest with enhanced metadata
     */
    async linkBossToQuest(
        bossId: string,
        questId: string,
        linkType: BossQuestLink['linkType'] = 'direct',
        tags: string[] = []
    ): Promise<void> {
        const link: BossQuestLink = {
            bossId,
            questId,
            linkType,
            tags: [...tags, this.generateBossTag(bossId, { id: questId } as Quest)],
            createdAt: new Date(),
            lastUpdated: new Date(),
            isActive: true
        };

        this.bossQuestLinks.set(`${bossId}-${questId}`, link);
        this.updateCache(bossId, questId);
        await this.saveBossQuestLinks();
    }

    /**
     * Auto-detect and link bosses to quests based on content analysis
     */
    async autoLinkBossesToQuests(quests: Quest[]): Promise<Map<string, string[]>> {
        const autoLinks = new Map<string, string[]>();

        for (const quest of quests) {
            const linkedBossIds: string[] = [];

            // Check for existing boss tags in quest content
            const bossTags = this.extractBossTagsFromQuest(quest);
            for (const tag of bossTags) {
                const bossId = this.extractBossIdFromTag(tag);
                if (bossId) {
                    await this.linkBossToQuest(bossId, quest.id, 'tag_based', [tag]);
                    linkedBossIds.push(bossId);
                }
            }

            // Check for boss-related keywords in quest content
            const bossKeywords = this.detectBossKeywords(quest);
            if (bossKeywords.length > 0) {
                // Find or create appropriate boss
                const existingBosses = this.findBossesByKeywords(bossKeywords);
                for (const boss of existingBosses) {
                    await this.linkBossToQuest(boss.id, quest.id, 'auto_detected', bossKeywords);
                    linkedBossIds.push(boss.id);
                }
            }

            if (linkedBossIds.length > 0) {
                autoLinks.set(quest.id, linkedBossIds);
            }
        }

        return autoLinks;
    }

    /**
     * Get all quests linked to a specific boss
     */
    getQuestsForBoss(bossId: string, filter?: QuestBossFilter): string[] {
        const questIds = this.bossQuestCache.get(bossId) || [];

        if (!filter) return questIds;

        return questIds.filter(questId => {
            const link = this.bossQuestLinks.get(`${bossId}-${questId}`);
            if (!link) return false;

            if (filter.isActive !== undefined && link.isActive !== filter.isActive) return false;
            if (filter.linkType && link.linkType !== filter.linkType) return false;
            if (filter.questTags && !filter.questTags.some(tag => link.tags.includes(tag))) return false;

            return true;
        });
    }

    /**
     * Get all bosses linked to a specific quest
     */
    getBossesForQuest(questId: string, filter?: QuestBossFilter): string[] {
        const bossIds = this.questBossCache.get(questId) || [];

        if (!filter) return bossIds;

        return bossIds.filter(bossId => {
            const link = this.bossQuestLinks.get(`${bossId}-${questId}`);
            if (!link) return false;

            if (filter.isActive !== undefined && link.isActive !== filter.isActive) return false;
            if (filter.linkType && link.linkType !== filter.linkType) return false;
            if (filter.bossTag && !link.tags.includes(filter.bossTag)) return false;

            return true;
        });
    }

    /**
     * Refresh quest-boss links and update cache
     */
    async refreshQuestBossLinks(quests: Quest[]): Promise<void> {
        // Clear existing auto-detected links
        for (const [key, link] of this.bossQuestLinks.entries()) {
            if (link.linkType === 'auto_detected') {
                this.bossQuestLinks.delete(key);
            }
        }

        // Rebuild cache
        this.questBossCache.clear();
        this.bossQuestCache.clear();

        // Re-auto-link
        await this.autoLinkBossesToQuests(quests);

        // Rebuild cache from remaining links
        for (const link of this.bossQuestLinks.values()) {
            this.updateCache(link.bossId, link.questId);
        }

        await this.saveBossQuestLinks();
    }

    /**
     * Get boss-specific quest filter for the Quest tab
     */
    getBossQuestFilter(bossId: string): { tags: string[]; description: string } {
        const questIds = this.getQuestsForBoss(bossId);

        // Find boss from active bosses
        const activeBosses = bossManagementService.getActiveBosses();
        const bossData = activeBosses.find(b => b.boss.id === bossId);

        if (!bossData) {
            return { tags: [], description: 'No boss found' };
        }

        const tags = [`#boss-${bossId}`, `#${bossData.boss.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`];

        return {
            tags,
            description: `Quests for ${bossData.boss.name} (${questIds.length} linked)`
        };
    }

    /**
     * Update boss progress when quest is completed
     */
    async updateBossProgressFromQuest(questId: string, damage: number): Promise<void> {
        const bossIds = this.getBossesForQuest(questId, { isActive: true });

        for (const bossId of bossIds) {
            // Find boss from active bosses
            const activeBosses = bossManagementService.getActiveBosses();
            const bossData = activeBosses.find(b => b.boss.id === bossId);

            if (bossData) {
                // Apply damage to boss
                bossData.progress.currentHP = Math.max(0, bossData.progress.currentHP - damage);
                bossData.progress.lastUpdated = new Date();

                // Update link timestamp
                const link = this.bossQuestLinks.get(`${bossId}-${questId}`);
                if (link) {
                    link.lastUpdated = new Date();
                }

                // Save changes through the boss management service
                bossManagementService.updateBossProgress(questId);
            }
        }

        await this.saveBossQuestLinks();
    }

    /**
     * Get real-time quest updates for a specific boss
     */
    getRealTimeQuestUpdates(bossId: string): {
        linkedQuests: string[];
        recentCompletions: Array<{ questId: string; timestamp: Date; damage: number }>;
        activeQuests: string[];
    } {
        const linkedQuests = this.getQuestsForBoss(bossId, { isActive: true });
        const recentCompletions: Array<{ questId: string; timestamp: Date; damage: number }> = [];
        const activeQuests: string[] = [];

        // This would be populated by the real-time tracker
        // For now, return the structure
        return {
            linkedQuests,
            recentCompletions,
            activeQuests
        };
    }

    // Private helper methods
    private extractBossTagsFromQuest(quest: Quest): string[] {
        const bossTags: string[] = [];

        // Check quest title and description for boss tags
        const textToCheck = `${quest.title} ${quest.description || ''} ${quest.tags?.join(' ') || ''}`;
        const tagMatches = textToCheck.match(/#boss-[a-zA-Z0-9-]+/g);

        if (tagMatches) {
            bossTags.push(...tagMatches);
        }

        return bossTags;
    }

    private extractBossIdFromTag(tag: string): string | null {
        const match = tag.match(/#boss-[a-zA-Z0-9-]+-([a-zA-Z0-9]+)/);
        return match ? match[1] : null;
    }

    private detectBossKeywords(quest: Quest): string[] {
        const bossKeywords = [
            'boss', 'battle', 'fight', 'challenge', 'defeat', 'conquer',
            'dragon', 'monster', 'enemy', 'adversary', 'opponent'
        ];

        const textToCheck = `${quest.title} ${quest.description || ''}`.toLowerCase();
        return bossKeywords.filter(keyword => textToCheck.includes(keyword));
    }

    private findBossesByKeywords(keywords: string[]): Boss[] {
        const activeBosses = bossManagementService.getActiveBosses();
        return activeBosses
            .map(bossData => bossData.boss)
            .filter(boss => {
                const bossText = `${boss.name} ${boss.description} ${boss.theme}`.toLowerCase();
                return keywords.some(keyword => bossText.includes(keyword));
            });
    }

    private updateCache(bossId: string, questId: string): void {
        // Update quest -> bosses cache
        const questBosses = this.questBossCache.get(questId) || [];
        if (!questBosses.includes(bossId)) {
            questBosses.push(bossId);
            this.questBossCache.set(questId, questBosses);
        }

        // Update boss -> quests cache
        const bossQuests = this.bossQuestCache.get(bossId) || [];
        if (!bossQuests.includes(questId)) {
            bossQuests.push(questId);
            this.bossQuestCache.set(bossId, bossQuests);
        }
    }

    private hashString(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }

    private async loadBossQuestLinks(): Promise<void> {
        try {
            const data = await this.app.vault.adapter.read('data/boss-quest-links.json');
            const links = JSON.parse(data);

            this.bossQuestLinks.clear();
            for (const link of links) {
                this.bossQuestLinks.set(`${link.bossId}-${link.questId}`, {
                    ...link,
                    createdAt: new Date(link.createdAt),
                    lastUpdated: new Date(link.lastUpdated)
                });
                this.updateCache(link.bossId, link.questId);
            }
        } catch (error) {
            console.log('No existing boss-quest links found, starting fresh');
        }
    }

    private async saveBossQuestLinks(): Promise<void> {
        try {
            const links = Array.from(this.bossQuestLinks.values());
            await this.app.vault.adapter.write('data/boss-quest-links.json', JSON.stringify(links, null, 2));
        } catch (error) {
            console.error('Failed to save boss-quest links:', error);
        }
    }
}
