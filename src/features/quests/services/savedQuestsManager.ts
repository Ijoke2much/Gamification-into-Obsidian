// Saved Quests Manager - Handles "Save for Later" functionality
// Saves quests with energy info for when conditions are better

export interface SavedQuest {
    questId: string;
    questTitle: string;
    savedAt: string; // ISO timestamp
    savedEnergy: number; // Energy level when saved
    optimalEnergy: number; // Recommended energy level
    energyType: 'mental' | 'physical' | 'creative' | 'analytical';
    reason?: string; // Why it was saved
    difficulty?: string;
    priority?: string;
    estimatedTime?: string;
}

export interface SavedQuestsData {
    savedQuests: SavedQuest[];
    lastCleanup: string;
}

const STORAGE_KEY = 'gamification-saved-quests';
const CLEANUP_DAYS = 7; // Auto-remove saved quests after 7 days

export class SavedQuestsManager {
    /**
     * Load saved quests from localStorage
     */
    static loadSavedQuests(): SavedQuestsData {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            if (!data) {
                return { savedQuests: [], lastCleanup: new Date().toISOString() };
            }

            const parsed: SavedQuestsData = JSON.parse(data);

            // Auto-cleanup old saved quests
            this.cleanupOldQuests(parsed);

            return parsed;
        } catch (error) {
            console.error('Error loading saved quests:', error);
            return { savedQuests: [], lastCleanup: new Date().toISOString() };
        }
    }

    /**
     * Save quests data to localStorage
     */
    static saveSavedQuests(data: SavedQuestsData): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (error) {
            console.error('Error saving saved quests:', error);
        }
    }

    /**
     * Save a quest for later
     */
    static saveQuestForLater(quest: {
        id: string;
        title: string;
        difficulty?: string;
        priority?: string;
        estimatedTime?: string;
    }, currentEnergy: number, reason?: string): SavedQuest {
        const data = this.loadSavedQuests();

        // Check if already saved
        const existingIndex = data.savedQuests.findIndex(sq => sq.questId === quest.id);

        // Determine energy type and optimal level
        const energyType = this.determineEnergyType(quest);
        const optimalEnergy = this.calculateOptimalEnergy(quest, currentEnergy);

        const savedQuest: SavedQuest = {
            questId: quest.id,
            questTitle: quest.title,
            savedAt: new Date().toISOString(),
            savedEnergy: currentEnergy,
            optimalEnergy,
            energyType,
            reason: reason || this.generateReason(currentEnergy, optimalEnergy),
            difficulty: quest.difficulty,
            priority: quest.priority,
            estimatedTime: quest.estimatedTime
        };

        if (existingIndex >= 0) {
            // Update existing
            data.savedQuests[existingIndex] = savedQuest;
        } else {
            // Add new
            data.savedQuests.push(savedQuest);
        }

        this.saveSavedQuests(data);
        return savedQuest;
    }

    /**
     * Remove a quest from saved list
     */
    static unsaveQuest(questId: string): boolean {
        const data = this.loadSavedQuests();
        const initialLength = data.savedQuests.length;

        data.savedQuests = data.savedQuests.filter(sq => sq.questId !== questId);

        if (data.savedQuests.length < initialLength) {
            this.saveSavedQuests(data);
            return true;
        }

        return false;
    }

    /**
     * Check if a quest is saved
     */
    static isQuestSaved(questId: string): boolean {
        const data = this.loadSavedQuests();
        return data.savedQuests.some(sq => sq.questId === questId);
    }

    /**
     * Get saved quest info
     */
    static getSavedQuest(questId: string): SavedQuest | null {
        const data = this.loadSavedQuests();
        return data.savedQuests.find(sq => sq.questId === questId) || null;
    }

    /**
     * Get quests that are optimal to do now based on current energy
     */
    static getOptimalSavedQuests(currentEnergy: number): SavedQuest[] {
        const data = this.loadSavedQuests();

        return data.savedQuests.filter(sq => {
            // Quest is optimal if current energy is within 20% of optimal
            const energyDiff = Math.abs(currentEnergy - sq.optimalEnergy);
            return energyDiff <= 20;
        }).sort((a, b) => {
            // Sort by how close to optimal
            const aDiff = Math.abs(currentEnergy - a.optimalEnergy);
            const bDiff = Math.abs(currentEnergy - b.optimalEnergy);
            return aDiff - bDiff;
        });
    }

    /**
     * Get all saved quests sorted by saved time
     */
    static getAllSavedQuests(): SavedQuest[] {
        const data = this.loadSavedQuests();
        return data.savedQuests.sort((a, b) =>
            new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
        );
    }

    /**
     * Clean up old saved quests (older than CLEANUP_DAYS)
     */
    private static cleanupOldQuests(data: SavedQuestsData): void {
        const now = new Date();
        const cutoffDate = new Date(now.getTime() - (CLEANUP_DAYS * 24 * 60 * 60 * 1000));

        const originalLength = data.savedQuests.length;
        data.savedQuests = data.savedQuests.filter(sq =>
            new Date(sq.savedAt) >= cutoffDate
        );

        if (data.savedQuests.length < originalLength) {
            data.lastCleanup = now.toISOString();
            this.saveSavedQuests(data);
            console.log(`Cleaned up ${originalLength - data.savedQuests.length} old saved quests`);
        }
    }

    /**
     * Determine energy type from quest properties
     */
    private static determineEnergyType(quest: any): 'mental' | 'physical' | 'creative' | 'analytical' {
        const title = (quest.title || '').toLowerCase();

        if (title.includes('design') || title.includes('write') || title.includes('create') ||
            title.includes('brainstorm') || title.includes('art')) {
            return 'creative';
        }

        if (title.includes('exercise') || title.includes('walk') || title.includes('clean') ||
            title.includes('organize') || title.includes('build')) {
            return 'physical';
        }

        if (title.includes('analyze') || title.includes('calculate') || title.includes('review') ||
            title.includes('research') || title.includes('code')) {
            return 'analytical';
        }

        return 'mental';
    }

    /**
     * Calculate optimal energy level for a quest
     */
    private static calculateOptimalEnergy(quest: any, currentEnergy: number): number {
        let optimal = 70; // Default optimal energy

        // Adjust based on difficulty
        const diff = (quest.difficulty || '').toLowerCase();
        if (diff === 'hard' || diff === 'epic') {
            optimal = 80;
        } else if (diff === 'easy') {
            optimal = 50;
        }

        // Adjust based on priority
        const pri = (quest.priority || '').toLowerCase();
        if (pri === 'high' || pri === 'highest') {
            optimal = Math.max(optimal, 75);
        }

        // If current energy is very low, suggest higher optimal
        if (currentEnergy < 40) {
            optimal = Math.max(optimal, 60);
        }

        return optimal;
    }

    /**
     * Generate a reason for why the quest was saved
     */
    private static generateReason(currentEnergy: number, optimalEnergy: number): string {
        const diff = optimalEnergy - currentEnergy;

        if (diff > 30) {
            return 'Energy too low - rest and recharge first';
        } else if (diff > 15) {
            return 'Better to tackle when energy is higher';
        } else if (diff < -20) {
            return 'Save for when you need a lighter task';
        } else {
            return 'Saved for optimal timing';
        }
    }

    /**
     * Get statistics about saved quests
     */
    static getStats(): {
        total: number;
        byEnergyType: Record<string, number>;
        byDifficulty: Record<string, number>;
        optimalNow: number;
    } {
        const data = this.loadSavedQuests();
        const currentEnergy = 70; // Could be passed in

        const stats = {
            total: data.savedQuests.length,
            byEnergyType: {} as Record<string, number>,
            byDifficulty: {} as Record<string, number>,
            optimalNow: this.getOptimalSavedQuests(currentEnergy).length
        };

        data.savedQuests.forEach(sq => {
            // Count by energy type
            stats.byEnergyType[sq.energyType] = (stats.byEnergyType[sq.energyType] || 0) + 1;

            // Count by difficulty
            if (sq.difficulty) {
                stats.byDifficulty[sq.difficulty] = (stats.byDifficulty[sq.difficulty] || 0) + 1;
            }
        });

        return stats;
    }
}

