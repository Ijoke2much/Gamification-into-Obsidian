// Main Quest System - Integrates all advanced features
// Performance optimization, templates, sharing, and analytics

import { App, TFile } from 'obsidian';
import { Quest, parseQuestsFromMarkdown } from './utils/taskParser';
import { OptimizedQuestParser } from './utils/optimizedQuestParser';
import { QuestTemplateSystem, QuestContext, TemplateSuggestion } from './templates/QuestTemplateSystem';
import { QuestSharingSystem, SharedQuest } from './sharing/QuestSharingSystem';
import { AdvancedQuestAnalytics, QuestAnalytics } from './analytics/AdvancedQuestAnalytics';

export interface QuestSystemConfig {
    enablePerformanceOptimization: boolean;
    enableTemplates: boolean;
    enableSharing: boolean;
    enableAnalytics: boolean;
    autoSync: boolean;
    syncInterval: number; // minutes
    cacheSize: number;
    maxQuestsPerFile: number;
}

export interface QuestSystemState {
    quests: Quest[];
    sharedQuests: SharedQuest[];
    analytics: QuestAnalytics | null;
    lastSync: Date | null;
    isInitialized: boolean;
    errors: string[];
}

export class QuestSystem {
    private static instance: QuestSystem | null = null;
    private app: App;
    private config: QuestSystemConfig;
    private state: QuestSystemState;
    private optimizedParser?: OptimizedQuestParser;
    private templateSystem?: QuestTemplateSystem;
    private sharingSystem?: QuestSharingSystem;
    private analyticsSystem?: AdvancedQuestAnalytics;
    private autoSyncInterval?: NodeJS.Timeout;
    private eventListeners: Map<string, Function[]> = new Map();

    static getInstance(app: App): QuestSystem {
        if (!this.instance) {
            this.instance = new QuestSystem(app);
        }
        return this.instance;
    }

    private constructor(app: App) {
        this.app = app;
        this.config = this.getDefaultConfig();
        this.state = this.getDefaultState();
    }

    /**
     * Initialize the quest system
     */
    async initialize(): Promise<void> {
        try {
            this.state.isInitialized = false;

            // Initialize subsystems based on configuration
            if (this.config.enablePerformanceOptimization) {
                this.optimizedParser = new OptimizedQuestParser();
                // Note: OptimizedQuestParser doesn't have initialize method, so we skip it
            }

            if (this.config.enableTemplates) {
                this.templateSystem = new QuestTemplateSystem();
                // Note: QuestTemplateSystem doesn't have initialize method, so we skip it
            }

            if (this.config.enableSharing) {
                this.sharingSystem = new QuestSharingSystem(this.app);
                // Note: QuestSharingSystem doesn't have initialize method, so we skip it
            }

            if (this.config.enableAnalytics) {
                this.analyticsSystem = new AdvancedQuestAnalytics();
                // Note: AdvancedQuestAnalytics doesn't have initialize method, so we skip it
            }

            // Load initial quests
            await this.loadQuests();

            // Start auto-sync if enabled
            if (this.config.autoSync && this.config.enableSharing) {
                this.setupAutoSync();
            }

            this.state.isInitialized = true;
            this.emit('initialized');

            console.log('[QuestSystem] Initialized successfully');
        } catch (error) {
            console.error('[QuestSystem] Failed to initialize:', error);
            this.state.errors.push(error instanceof Error ? error.message : 'Unknown error');
            throw error;
        }
    }

    /**
     * Load quests from files
     */
    async loadQuests(): Promise<void> {
        try {
            const questFiles = this.app.vault.getMarkdownFiles().filter(file =>
                file.name.toLowerCase().includes('quest') ||
                file.name.toLowerCase().includes('task') ||
                file.name.toLowerCase().includes('gamified')
            );

            this.state.quests = [];

            for (const file of questFiles) {
                try {
                    let quests: Quest[];

                    if (this.config.enablePerformanceOptimization && this.optimizedParser) {
                        // Use optimized parser if available
                        const content = await this.app.vault.read(file);
                        quests = await this.optimizedParser.parseQuestsOptimized(file.path, content);
                    } else {
                        // Use standard parser
                        const content = await this.app.vault.read(file);
                        quests = parseQuestsFromMarkdown(content);
                    }

                    this.state.quests.push(...quests);
                } catch (error) {
                    console.error(`[QuestSystem] Failed to parse ${file.path}:`, error);
                    this.state.errors.push(`Failed to parse ${file.path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }

            this.emit('questsLoaded', this.state.quests);
        } catch (error) {
            console.error('[QuestSystem] Failed to load quests:', error);
            this.state.errors.push(error instanceof Error ? error.message : 'Unknown error');
            throw error;
        }
    }

    /**
     * Get template suggestions based on current context
     */
    async getTemplateSuggestions(): Promise<TemplateSuggestion[]> {
        if (!this.config.enableTemplates) {
            return [];
        }

        try {
            const context = await this.buildQuestContext();
            return await this.templateSystem!.getTemplateSuggestions(context);
        } catch (error) {
            console.error('[QuestSystem] Failed to get template suggestions:', error);
            return [];
        }
    }

    /**
     * Create quest from template
     */
    async createQuestFromTemplate(templateId: string, variables: Record<string, string>): Promise<Quest> {
        if (!this.config.enableTemplates) {
            throw new Error('Template system is disabled');
        }

        try {
            const template = this.templateSystem!.getTemplate(templateId);
            if (!template) {
                throw new Error(`Template ${templateId} not found`);
            }

            const quest = await this.templateSystem!.generateQuestFromTemplate(template, variables);

            // Add quest to system
            this.state.quests.push(quest);
            await this.saveQuestToFile(quest);

            // Update analytics
            if (this.config.enableAnalytics) {
                await this.generateAnalytics();
            }

            this.emit('questCreated', quest);
            return quest;
        } catch (error) {
            console.error('[QuestSystem] Failed to create quest from template:', error);
            throw error;
        }
    }

    /**
     * Share quest with other vaults
     */
    async shareQuest(questId: string, targetVaults: string[], permissions?: any): Promise<SharedQuest> {
        if (!this.config.enableSharing) {
            throw new Error('Sharing system is disabled');
        }

        try {
            const quest = this.state.quests.find(q => q.id === questId);
            if (!quest) {
                throw new Error(`Quest ${questId} not found`);
            }

            const sharedQuest = await this.sharingSystem!.shareQuest(quest, targetVaults, permissions);
            this.state.sharedQuests.push(sharedQuest);

            this.emit('questShared', sharedQuest);
            return sharedQuest;
        } catch (error) {
            console.error('[QuestSystem] Failed to share quest:', error);
            throw error;
        }
    }

    /**
     * Import shared quest
     */
    async importSharedQuest(sharedQuestId: string): Promise<Quest> {
        if (!this.config.enableSharing) {
            throw new Error('Sharing system is disabled');
        }

        try {
            const importedQuest = await this.sharingSystem!.importSharedQuest(sharedQuestId);
            this.state.quests.push(importedQuest);

            // Update analytics
            if (this.config.enableAnalytics) {
                await this.generateAnalytics();
            }

            this.emit('questImported', importedQuest);
            return importedQuest;
        } catch (error) {
            console.error('[QuestSystem] Failed to import shared quest:', error);
            throw error;
        }
    }

    /**
     * Generate analytics
     */
    async generateAnalytics(): Promise<QuestAnalytics> {
        if (!this.config.enableAnalytics) {
            throw new Error('Analytics system is disabled');
        }

        try {
            const analytics = await this.analyticsSystem!.generateAnalytics(this.state.quests);
            this.state.analytics = analytics;

            this.emit('analyticsGenerated', analytics);
            return analytics;
        } catch (error) {
            console.error('[QuestSystem] Failed to generate analytics:', error);
            throw error;
        }
    }

    /**
     * Get analytics insights
     */
    getAnalyticsInsights(): any {
        if (!this.state.analytics) {
            return null;
        }

        return {
            overview: this.state.analytics.overview,
            insights: this.state.analytics.insights,
            recommendations: this.state.analytics.recommendations,
            trends: this.state.analytics.trends
        };
    }

    /**
     * Sync with connected vaults
     */
    async syncWithVaults(): Promise<void> {
        if (!this.config.enableSharing) {
            return;
        }

        try {
            await this.sharingSystem!.syncWithVaults();
            this.state.lastSync = new Date();

            this.emit('synced', this.state.lastSync);
        } catch (error) {
            console.error('[QuestSystem] Sync failed:', error);
            this.emit('error', error);
        }
    }

    /**
     * Update quest
     */
    async updateQuest(questId: string, updates: Partial<Quest>): Promise<Quest> {
        try {
            const questIndex = this.state.quests.findIndex(q => q.id === questId);
            if (questIndex === -1) {
                throw new Error(`Quest ${questId} not found`);
            }

            const updatedQuest = { ...this.state.quests[questIndex], ...updates };
            this.state.quests[questIndex] = updatedQuest;

            // Update in file
            await this.updateQuestInFile(updatedQuest);

            // Update analytics
            if (this.config.enableAnalytics) {
                await this.generateAnalytics();
            }

            this.emit('questUpdated', updatedQuest);
            return updatedQuest;
        } catch (error) {
            console.error('[QuestSystem] Failed to update quest:', error);
            throw error;
        }
    }

    /**
     * Delete quest
     */
    async deleteQuest(questId: string): Promise<void> {
        try {
            const questIndex = this.state.quests.findIndex(q => q.id === questId);
            if (questIndex === -1) {
                throw new Error(`Quest ${questId} not found`);
            }

            const deletedQuest = this.state.quests[questIndex];
            this.state.quests.splice(questIndex, 1);

            // Remove from file
            await this.removeQuestFromFile(deletedQuest);

            // Update analytics
            if (this.config.enableAnalytics) {
                await this.generateAnalytics();
            }

            this.emit('questDeleted', deletedQuest);
        } catch (error) {
            console.error('[QuestSystem] Failed to delete quest:', error);
            throw error;
        }
    }

    /**
     * Get quests with filters
     */
    getQuests(filters?: {
        completed?: boolean;
        difficulty?: string;
        skills?: string[];
        tags?: string[];
        priority?: string;
    }): Quest[] {
        let quests = [...this.state.quests];

        if (filters) {
            if (filters.completed !== undefined) {
                quests = quests.filter(q => q.completed === filters.completed);
            }
            if (filters.difficulty) {
                quests = quests.filter(q => q.difficulty === filters.difficulty);
            }
            if (filters.skills && filters.skills.length > 0) {
                quests = quests.filter(q => q.skills?.some(skill => filters.skills!.includes(skill)));
            }
            if (filters.tags && filters.tags.length > 0) {
                quests = quests.filter(q => q.tags?.some(tag => filters.tags!.includes(tag)));
            }
            if (filters.priority) {
                quests = quests.filter(q => q.priority === filters.priority);
            }
        }

        return quests;
    }

    /**
     * Get system state
     */
    getState(): QuestSystemState {
        return { ...this.state };
    }

    /**
     * Get configuration
     */
    getConfig(): QuestSystemConfig {
        return { ...this.config };
    }

    /**
     * Update configuration
     */
    async updateConfig(updates: Partial<QuestSystemConfig>): Promise<void> {
        this.config = { ...this.config, ...updates };
        await this.saveConfiguration();
        this.emit('configUpdated', this.config);
    }

    /**
     * Event system
     */
    on(event: string, callback: Function): void {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event)!.push(callback);
    }

    off(event: string, callback: Function): void {
        const callbacks = this.eventListeners.get(event);
        if (callbacks) {
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    private emit(event: string, data?: any): void {
        const callbacks = this.eventListeners.get(event);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`[QuestSystem] Error in event callback for ${event}:`, error);
                }
            });
        }
    }

    /**
     * Private helper methods
     */
    private getDefaultConfig(): QuestSystemConfig {
        return {
            enablePerformanceOptimization: true,
            enableTemplates: true,
            enableSharing: true,
            enableAnalytics: true,
            autoSync: true,
            syncInterval: 5, // 5 minutes
            cacheSize: 1000,
            maxQuestsPerFile: 500
        };
    }

    private getDefaultState(): QuestSystemState {
        return {
            quests: [],
            sharedQuests: [],
            analytics: null,
            lastSync: null,
            isInitialized: false,
            errors: []
        };
    }

    private async loadConfiguration(): Promise<void> {
        try {
            const configFile = this.app.vault.getAbstractFileByPath('.obsidian/plugins/gamification/quest-system-config.json');
            if (configFile instanceof TFile) {
                const content = await this.app.vault.read(configFile);
                this.config = { ...this.config, ...JSON.parse(content) };
            }
        } catch (error) {
            console.warn('[QuestSystem] Could not load configuration, using defaults');
        }
    }

    private async saveConfiguration(): Promise<void> {
        try {
            const content = JSON.stringify(this.config, null, 2);
            await this.app.vault.adapter.write('.obsidian/plugins/gamification/quest-system-config.json', content);
        } catch (error) {
            console.error('[QuestSystem] Failed to save configuration:', error);
        }
    }

    private getQuestFiles(): TFile[] {
        return this.app.vault.getMarkdownFiles().filter(file =>
            file.name.toLowerCase().includes('quest') ||
            file.name.toLowerCase().includes('task') ||
            file.name.toLowerCase().includes('gamified')
        );
    }

    private parseQuestsFromContent(content: string): Quest[] {
        // This would use your existing quest parsing logic
        // For now, return empty array
        return [];
    }

    private async buildQuestContext(): Promise<QuestContext> {
        const now = new Date();
        const hour = now.getHours();
        const dayOfWeek = now.getDay();

        // Build player skills from completed quests
        const playerSkills: Record<string, number> = {};
        this.state.quests
            .filter(q => q.completed && q.skills)
            .forEach(quest => {
                quest.skills!.forEach(skill => {
                    playerSkills[skill] = (playerSkills[skill] || 0) + (quest.xp || 0);
                });
            });

        // Get recent quests (last 7 days)
        const recentQuests = this.state.quests
            .filter(q => q.completed)
            .slice(-10); // Last 10 completed quests

        // Extract active projects from quest tags
        const activeProjects = Array.from(new Set(
            this.state.quests
                .filter(q => !q.completed && q.tags)
                .flatMap(q => q.tags!.filter(tag => tag.includes('project')))
        ));

        return {
            timeOfDay: hour,
            dayOfWeek,
            playerSkills,
            recentQuests,
            activeProjects,
            energyLevel: 7, // Default - could be enhanced with user input
            mood: 'neutral' // Default - could be enhanced with user input
        };
    }

    private async saveQuestToFile(quest: Quest): Promise<void> {
        // Add quest to the appropriate file
        const questFile = this.app.vault.getAbstractFileByPath('GamifiedTasks.md');
        if (questFile instanceof TFile) {
            const content = await this.app.vault.read(questFile);
            const questLine = this.formatQuestForFile(quest);
            const newContent = content + '\n' + questLine;
            await this.app.vault.modify(questFile, newContent);
        }
    }

    private async updateQuestInFile(quest: Quest): Promise<void> {
        // Update quest in file
        // This would implement the logic to update the specific quest line
    }

    private async removeQuestFromFile(quest: Quest): Promise<void> {
        // Remove quest from file
        // This would implement the logic to remove the specific quest line
    }

    private formatQuestForFile(quest: Quest): string {
        const status = quest.completed ? 'x' : ' ';
        const xp = quest.xp ? ` ✨${quest.xp}` : '';
        const cp = quest.cp ? ` ⭐${quest.cp}` : '';
        const skills = quest.skills?.length ? ` 🛠️${quest.skills.join(',')}` : '';
        const tags = quest.tags?.map(tag => `#${tag}`).join(' ') || '';

        return `- [${status}] ${quest.title}${xp}${cp}${skills} #gamified-task ${tags}`;
    }

    private setupAutoSync(): void {
        if (this.autoSyncInterval) {
            clearInterval(this.autoSyncInterval);
        }

        this.autoSyncInterval = setInterval(async () => {
            try {
                await this.syncWithVaults();
            } catch (error) {
                console.error('[QuestSystem] Auto-sync failed:', error);
            }
        }, this.config.syncInterval * 60 * 1000); // Convert minutes to milliseconds
    }
}
