import { Boss, BossProgress, BossCreationOptions, BossBattleState } from '../types/BossTypes';
import { BossFactory } from './bossFactory';
import { BossQuestIntegration } from './bossQuestIntegration';
import { BossBattleEngine } from './bossBattleEngine';
import { Quest } from './taskParser';

export interface BossManagementState {
    activeBosses: Map<string, { boss: Boss; progress: BossProgress; quest: Quest }>;
    defeatedBosses: Map<string, { boss: Boss; quest: Quest; defeatedAt: Date }>;
    bossHistory: Array<{ boss: Boss; quest: Quest; defeatedAt: Date; rewards: Boss['rewards'] }>;
}

export class BossManagementService {
    private static instance: BossManagementService;
    private state: BossManagementState;
    private storageKey = 'gamification-boss-data';

    private constructor() {
        this.state = {
            activeBosses: new Map(),
            defeatedBosses: new Map(),
            bossHistory: []
        };
        this.loadFromStorage();
    }

    static getInstance(): BossManagementService {
        if (!BossManagementService.instance) {
            BossManagementService.instance = new BossManagementService();
        }
        return BossManagementService.instance;
    }

    // Boss Creation and Management
    createBossForQuest(quest: Quest, playerSkillLevel: number = 5): Boss | null {
        if (!BossQuestIntegration.shouldCreateBoss(quest)) {
            return null;
        }

        const boss = BossQuestIntegration.createBossForQuest(quest, playerSkillLevel);
        const progress: BossProgress = {
            bossId: boss.id,
            questId: quest.id,
            currentHP: boss.stats.currentHP,
            maxHP: boss.stats.maxHP,
            phase: 0,
            lastUpdated: new Date(),
            isActive: true,
            timeSpent: 0,
            attempts: 0,
            bestDamage: 0,
            phaseProgress: [100],
            lastPhaseChange: new Date()
        };

        // Update quest with boss information
        quest.bossId = boss.id;
        quest.bossProgress = {
            currentHP: boss.stats.currentHP,
            maxHP: boss.stats.maxHP,
            phase: 0,
            lastUpdated: new Date(),
            isActive: true
        };

        // Store boss data
        this.state.activeBosses.set(boss.id, { boss, progress, quest });
        this.saveToStorage();

        return boss;
    }

    // Boss Progress Management
    updateBossProgress(questId: string): BossProgress | null {
        const bossData = this.findBossByQuestId(questId);
        if (!bossData) return null;

        const { boss, quest } = bossData;
        const progress = BossQuestIntegration.updateBossProgress(boss, quest);
        
        // Update stored progress
        this.state.activeBosses.set(boss.id, { boss, progress, quest });
        this.saveToStorage();

        return progress;
    }

    // Boss Battle Management
    startBossBattle(bossId: string): BossBattleState | null {
        const bossData = this.state.activeBosses.get(bossId);
        if (!bossData) return null;

        const { boss, quest } = bossData;
        
        // Initialize battle state
        const battleState: BossBattleState = {
            boss: { ...boss },
            playerStats: {
                currentHP: 100,
                maxHP: 100,
                attack: 50,
                defense: 30,
                speed: 40,
                specialAttack: 45,
                specialDefense: 35,
                buffs: [],
                debuffs: []
            },
            battleLog: [],
            currentTurn: 0,
            isPlayerTurn: true,
            gameOver: false,
            victory: false,
            phaseTransition: false,
            specialEffects: [],
            comboCount: 0,
            bossMood: 'confident'
        };

        return battleState;
    }

    // Boss Defeat Handling
    handleBossDefeat(bossId: string): { boss: Boss; quest: Quest; rewards: Boss['rewards'] } | null {
        const bossData = this.state.activeBosses.get(bossId);
        if (!bossData) return null;

        const { boss, quest } = bossData;
        
        // Mark boss as defeated
        boss.isDefeated = true;
        quest.bossProgress!.isActive = false;

        // Move to defeated bosses
        this.state.defeatedBosses.set(bossId, { 
            boss, 
            quest, 
            defeatedAt: new Date() 
        });

        // Add to history
        this.state.bossHistory.push({
            boss,
            quest,
            defeatedAt: new Date(),
            rewards: boss.rewards
        });

        // Remove from active bosses
        this.state.activeBosses.delete(bossId);

        this.saveToStorage();
        return { boss, quest, rewards: boss.rewards };
    }

    // Boss Status Queries
    getBossStatus(bossId: string): { status: 'active' | 'defeated' | 'can-defeat'; progress: number; phase: string; healthPercentage: number } | null {
        const bossData = this.state.activeBosses.get(bossId);
        if (!bossData) return null;

        const { boss, quest } = bossData;
        return BossQuestIntegration.getBossStatus(boss, quest);
    }

    getActiveBosses(): Array<{ boss: Boss; progress: BossProgress; quest: Quest }> {
        return Array.from(this.state.activeBosses.values());
    }

    getDefeatedBosses(): Array<{ boss: Boss; quest: Quest; defeatedAt: Date }> {
        return Array.from(this.state.defeatedBosses.values());
    }

    getBossHistory(): Array<{ boss: Boss; quest: Quest; defeatedAt: Date; rewards: Boss['rewards'] }> {
        return this.state.bossHistory;
    }

    // Quest-Boss Integration
    getBossForQuest(questId: string): { boss: Boss; progress: BossProgress } | null {
        const bossData = this.findBossByQuestId(questId);
        if (!bossData) return null;

        return { boss: bossData.boss, progress: bossData.progress };
    }

    shouldCreateBossForQuest(quest: Quest): boolean {
        return BossQuestIntegration.shouldCreateBoss(quest);
    }

    getBossRecommendation(quest: Quest): { shouldCreate: boolean; bossType: string; reason: string } {
        return BossQuestIntegration.getBossRecommendation(quest);
    }

    // Boss Analytics
    getBossAnalytics(): {
        totalBosses: number;
        activeBosses: number;
        defeatedBosses: number;
        averageBossHP: number;
        mostCommonTheme: string;
        totalRewards: { xp: number; cp: number; coins: number };
    } {
        const activeBosses = this.getActiveBosses();
        const defeatedBosses = this.getDefeatedBosses();
        const history = this.getBossHistory();

        const totalBosses = activeBosses.length + defeatedBosses.length;
        const allBosses = [...activeBosses, ...defeatedBosses];
        
        const averageHP = allBosses.length > 0 
            ? allBosses.reduce((sum, { boss }) => sum + boss.stats.maxHP, 0) / allBosses.length 
            : 0;

        const themeCounts = new Map<string, number>();
        allBosses.forEach(({ boss }) => {
            const count = themeCounts.get(boss.theme) || 0;
            themeCounts.set(boss.theme, count + 1);
        });

        const mostCommonTheme = Array.from(themeCounts.entries())
            .sort(([,a], [,b]) => b - a)[0]?.[0] || 'unknown';

        const totalRewards = history.reduce((sum, { rewards }) => ({
            xp: sum.xp + rewards.xp,
            cp: sum.cp + rewards.cp,
            coins: sum.coins + rewards.coins
        }), { xp: 0, cp: 0, coins: 0 });

        return {
            totalBosses,
            activeBosses: activeBosses.length,
            defeatedBosses: defeatedBosses.length,
            averageBossHP: Math.round(averageHP),
            mostCommonTheme,
            totalRewards
        };
    }

    // Utility Methods
    private findBossByQuestId(questId: string): { boss: Boss; progress: BossProgress; quest: Quest } | null {
        for (const bossData of this.state.activeBosses.values()) {
            if (bossData.quest.id === questId) {
                return bossData;
            }
        }
        return null;
    }

    private saveToStorage(): void {
        try {
            const data = {
                activeBosses: Array.from(this.state.activeBosses.entries()),
                defeatedBosses: Array.from(this.state.defeatedBosses.entries()),
                bossHistory: this.state.bossHistory
            };
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save boss data to storage:', error);
        }
    }

    private loadFromStorage(): void {
        try {
            const data = localStorage.getItem(this.storageKey);
            if (data) {
                const parsed = JSON.parse(data);
                
                // Reconstruct Maps from arrays
                this.state.activeBosses = new Map(parsed.activeBosses || []);
                this.state.defeatedBosses = new Map(parsed.defeatedBosses || []);
                this.state.bossHistory = parsed.bossHistory || [];

                // Convert date strings back to Date objects
                this.state.activeBosses.forEach((bossData) => {
                    if (bossData.progress.lastUpdated) {
                        bossData.progress.lastUpdated = new Date(bossData.progress.lastUpdated);
                    }
                    if (bossData.progress.lastPhaseChange) {
                        bossData.progress.lastPhaseChange = new Date(bossData.progress.lastPhaseChange);
                    }
                });

                this.state.defeatedBosses.forEach((bossData) => {
                    if (bossData.defeatedAt) {
                        bossData.defeatedAt = new Date(bossData.defeatedAt);
                    }
                });

                this.state.bossHistory.forEach((entry) => {
                    if (entry.defeatedAt) {
                        entry.defeatedAt = new Date(entry.defeatedAt);
                    }
                });
            }
        } catch (error) {
            console.error('Failed to load boss data from storage:', error);
        }
    }

    // Cleanup and Maintenance
    cleanupDefeatedBosses(olderThanDays: number = 30): void {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

        const oldBosses = Array.from(this.state.defeatedBosses.entries())
            .filter(([, bossData]) => bossData.defeatedAt < cutoffDate);

        oldBosses.forEach(([bossId]) => {
            this.state.defeatedBosses.delete(bossId);
        });

        // Also clean up old history entries
        this.state.bossHistory = this.state.bossHistory
            .filter(entry => entry.defeatedAt >= cutoffDate);

        this.saveToStorage();
    }

    resetBossData(): void {
        this.state.activeBosses.clear();
        this.state.defeatedBosses.clear();
        this.state.bossHistory = [];
        this.saveToStorage();
    }
}

// Export singleton instance
export const bossManagementService = BossManagementService.getInstance();
