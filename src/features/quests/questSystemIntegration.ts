// Quest System Integration Helper
export class QuestSystemIntegration {
    private static questSystem: any = null;

    /**
     * Initialize the advanced quest system
     */
    static async initializeQuestSystem(app: any) {
        try {
            const { QuestSystem } = await import('./QuestSystem');
            this.questSystem = QuestSystem.getInstance(app);
            await this.questSystem.initialize();

            console.log('[QuestSystem] Advanced quest system initialized successfully');
            return this.questSystem;
        } catch (error) {
            console.error('[QuestSystem] Failed to initialize advanced quest system:', error);
            throw error;
        }
    }

    /**
     * Get the quest system instance
     */
    static getQuestSystem() {
        if (!this.questSystem) {
            throw new Error('Quest system not initialized. Call initializeQuestSystem() first.');
        }
        return this.questSystem;
    }

    /**
     * Check if advanced features are enabled
     */
    static isAdvancedFeaturesEnabled() {
        if (!this.questSystem) return false;

        const config = this.questSystem.getConfig();
        return config.enablePerformanceOptimization ||
            config.enableTemplates ||
            config.enableSharing ||
            config.enableAnalytics;
    }

    /**
     * Get system status
     */
    static getSystemStatus() {
        if (!this.questSystem) return null;

        const state = this.questSystem.getState();
        const config = this.questSystem.getConfig();

        return {
            isInitialized: state.isInitialized,
            totalQuests: state.quests.length,
            sharedQuests: state.sharedQuests.length,
            hasAnalytics: !!state.analytics,
            features: {
                performanceOptimization: config.enablePerformanceOptimization,
                templates: config.enableTemplates,
                sharing: config.enableSharing,
                analytics: config.enableAnalytics
            },
            lastSync: state.lastSync,
            errors: state.errors
        };
    }

    /**
     * Create advanced quest dashboard component
     */
    static async createAdvancedDashboard() {
        if (!this.questSystem) {
            throw new Error('Quest system not initialized');
        }

        const { AdvancedQuestDashboard } = await import('./components/AdvancedQuestDashboard');
        return AdvancedQuestDashboard;
    }

    /**
     * Get quest analytics insights
     */
    static getAnalyticsInsights() {
        if (!this.questSystem) return null;

        try {
            return this.questSystem.getAnalyticsInsights();
        } catch (error) {
            console.error('[QuestSystem] Failed to get analytics insights:', error);
            return null;
        }
    }

    /**
     * Get template suggestions
     */
    static async getTemplateSuggestions() {
        if (!this.questSystem) return [];

        try {
            return await this.questSystem.getTemplateSuggestions();
        } catch (error) {
            console.error('[QuestSystem] Failed to get template suggestions:', error);
            return [];
        }
    }

    /**
     * Create quest from template
     */
    static async createQuestFromTemplate(templateId: string, variables: Record<string, string>) {
        if (!this.questSystem) {
            throw new Error('Quest system not initialized');
        }

        try {
            return await this.questSystem.createQuestFromTemplate(templateId, variables);
        } catch (error) {
            console.error('[QuestSystem] Failed to create quest from template:', error);
            throw error;
        }
    }

    /**
     * Share quest with other vaults
     */
    static async shareQuest(questId: string, targetVaults: string[]) {
        if (!this.questSystem) {
            throw new Error('Quest system not initialized');
        }

        try {
            return await this.questSystem.shareQuest(questId, targetVaults);
        } catch (error) {
            console.error('[QuestSystem] Failed to share quest:', error);
            throw error;
        }
    }

    /**
     * Import shared quest
     */
    static async importSharedQuest(sharedQuestId: string) {
        if (!this.questSystem) {
            throw new Error('Quest system not initialized');
        }

        try {
            return await this.questSystem.importSharedQuest(sharedQuestId);
        } catch (error) {
            console.error('[QuestSystem] Failed to import shared quest:', error);
            throw error;
        }
    }

    /**
     * Generate analytics
     */
    static async generateAnalytics() {
        if (!this.questSystem) {
            throw new Error('Quest system not initialized');
        }

        try {
            return await this.questSystem.generateAnalytics();
        } catch (error) {
            console.error('[QuestSystem] Failed to generate analytics:', error);
            throw error;
        }
    }

    /**
     * Update quest system configuration
     */
    static async updateConfig(updates: any) {
        if (!this.questSystem) {
            throw new Error('Quest system not initialized');
        }

        try {
            await this.questSystem.updateConfig(updates);
        } catch (error) {
            console.error('[QuestSystem] Failed to update configuration:', error);
            throw error;
        }
    }

    /**
     * Get quests with filters
     */
    static getQuests(filters?: any) {
        if (!this.questSystem) return [];

        try {
            return this.questSystem.getQuests(filters);
        } catch (error) {
            console.error('[QuestSystem] Failed to get quests:', error);
            return [];
        }
    }

    /**
     * Update quest
     */
    static async updateQuest(questId: string, updates: any) {
        if (!this.questSystem) {
            throw new Error('Quest system not initialized');
        }

        try {
            return await this.questSystem.updateQuest(questId, updates);
        } catch (error) {
            console.error('[QuestSystem] Failed to update quest:', error);
            throw error;
        }
    }

    /**
     * Delete quest
     */
    static async deleteQuest(questId: string) {
        if (!this.questSystem) {
            throw new Error('Quest system not initialized');
        }

        try {
            await this.questSystem.deleteQuest(questId);
        } catch (error) {
            console.error('[QuestSystem] Failed to delete quest:', error);
            throw error;
        }
    }

    /**
     * Sync with vaults
     */
    static async syncWithVaults() {
        if (!this.questSystem) {
            throw new Error('Quest system not initialized');
        }

        try {
            await this.questSystem.syncWithVaults();
        } catch (error) {
            console.error('[QuestSystem] Failed to sync vaults:', error);
            throw error;
        }
    }
}

export default QuestSystemIntegration;
