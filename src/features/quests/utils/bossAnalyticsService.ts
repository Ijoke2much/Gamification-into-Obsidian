import {
    Boss,
    BossProgress,
    BossAnalytics,
    BossBattleRecord,
    BossScalingConfig,
    BossScalingResult,
    BossBestiaryEntry,
    BossArena,
    BossStats,
    BossRewards
} from '../types/BossTypes';
import { PlayerData } from '../../../data/models/PlayerData';
import { Quest } from './taskParser';

export interface BossAnalyticsState {
    bossAnalytics: Map<string, BossAnalytics>;
    bossBestiary: Map<string, BossBestiaryEntry>;
    bossArenas: Map<string, BossArena>;
    scalingConfig: BossScalingConfig;
    globalStats: {
        totalBossesDefeated: number;
        totalBattlesFought: number;
        totalTimeSpent: number;
        totalRewardsEarned: {
            xp: number;
            cp: number;
            coins: number;
        };
        averageWinRate: number;
        favoriteBossType: string;
        mostChallengingBoss: string;
    };
    // Boss victory tracking
    bossVictories: Array<{
        id: string;
        bossId: string;
        bossType: string;
        timeTaken: number;
        rewardsEarned: any;
        perfectCompletion: boolean;
        consecutiveWins: number;
        playerLevel: number;
        timestamp: Date;
    }>;
    totalBossVictories: number;
    maxConsecutiveWins: number;
    totalRewardsEarned: {
        xp: number;
        cp: number;
        coins: number;
    };
    fastestCompletions: Record<string, number>;
    bossTypeStats: Record<string, {
        victories: number;
        averageTime: number;
        perfectCompletions: number;
        totalRewards: { xp: number; cp: number; coins: number };
    }>;
}

export class BossAnalyticsService {
    private static instance: BossAnalyticsService;
    private state: BossAnalyticsState;
    private storageKey = 'gamification-boss-analytics';

    private constructor() {
        this.state = {
            bossAnalytics: new Map(),
            bossBestiary: new Map(),
            bossArenas: new Map(),
            scalingConfig: this.getDefaultScalingConfig(),
            globalStats: {
                totalBossesDefeated: 0,
                totalBattlesFought: 0,
                totalTimeSpent: 0,
                totalRewardsEarned: { xp: 0, cp: 0, coins: 0 },
                averageWinRate: 0,
                favoriteBossType: '',
                mostChallengingBoss: ''
            },
            // Initialize boss victory tracking
            bossVictories: [],
            totalBossVictories: 0,
            maxConsecutiveWins: 0,
            totalRewardsEarned: { xp: 0, cp: 0, coins: 0 },
            fastestCompletions: {},
            bossTypeStats: {}
        };
        this.loadFromStorage();
    }

    static getInstance(): BossAnalyticsService {
        if (!BossAnalyticsService.instance) {
            BossAnalyticsService.instance = new BossAnalyticsService();
        }
        return BossAnalyticsService.instance;
    }

    // ===== BOSS ANALYTICS METHODS =====

    /**
     * Record a new boss battle
     */
    recordBossBattle(
        boss: Boss,
        quest: Quest,
        battleRecord: Omit<BossBattleRecord, 'battleId' | 'bossId' | 'questId' | 'battleDate'>
    ): void {
        const battleId = `battle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const fullRecord: BossBattleRecord = {
            ...battleRecord,
            battleId,
            bossId: boss.id,
            questId: quest.id,
            battleDate: new Date()
        };

        // Update boss analytics
        let analytics = this.state.bossAnalytics.get(boss.id);
        if (!analytics) {
            analytics = this.createNewBossAnalytics(boss);
            this.state.bossAnalytics.set(boss.id, analytics);
        }

        this.updateBossAnalytics(analytics, fullRecord);
        this.updateGlobalStats(fullRecord);
        this.saveToStorage();
    }

    /**
     * Get analytics for a specific boss
     */
    getBossAnalytics(bossId: string): BossAnalytics | null {
        return this.state.bossAnalytics.get(bossId) || null;
    }

    /**
     * Get all boss analytics
     */
    getAllBossAnalytics(): BossAnalytics[] {
        return Array.from(this.state.bossAnalytics.values());
    }

    /**
     * Get global boss statistics
     */
    getGlobalStats() {
        return this.state.globalStats;
    }

    // ===== BOSS BESTIARY METHODS =====

    /**
     * Add or update a boss in the bestiary
     */
    updateBossBestiary(boss: Boss, isUnlocked: boolean = true): void {
        const bestiaryEntry: BossBestiaryEntry = {
            bossId: boss.id,
            bossName: boss.name,
            bossTitle: boss.title,
            bossType: boss.type,
            theme: boss.theme,
            difficulty: boss.difficulty,
            avatar: boss.visuals?.avatar || '👹',
            background: boss.visuals?.background || '',
            phaseAvatars: boss.visuals?.phaseAvatars || [],
            lore: boss.lore || '',
            description: boss.description,
            personality: {
                confidence: 5,
                aggression: 5,
                intelligence: 5,
                humor: 5
            },
            baseStats: boss.stats,
            moves: boss.moves,
            phases: boss.phases,
            weaknesses: boss.weaknesses,
            resistances: boss.resistances,
            specialAbilities: boss.specialAbilities,
            baseRewards: boss.rewards,
            unlockConditions: {
                playerLevel: 1,
                requiredBosses: [],
                requiredAchievements: [],
                requiredStats: {}
            },
            analytics: this.state.bossAnalytics.get(boss.id),
            isUnlocked,
            isDefeated: false
        };

        this.state.bossBestiary.set(boss.id, bestiaryEntry);
        this.saveToStorage();
    }

    /**
     * Get bestiary entry for a boss
     */
    getBossBestiaryEntry(bossId: string): BossBestiaryEntry | null {
        return this.state.bossBestiary.get(bossId) || null;
    }

    /**
     * Get all bestiary entries
     */
    getAllBestiaryEntries(): BossBestiaryEntry[] {
        return Array.from(this.state.bossBestiary.values());
    }

    /**
     * Get unlocked bestiary entries
     */
    getUnlockedBestiaryEntries(): BossBestiaryEntry[] {
        return Array.from(this.state.bossBestiary.values()).filter(entry => entry.isUnlocked);
    }

    // ===== BOSS REWARDS ANALYTICS =====

    /**
     * Record boss victory for analytics
     */
    recordBossVictory(victoryData: {
        bossId: string;
        bossType: string;
        timeTaken: number;
        rewardsEarned: any;
        perfectCompletion: boolean;
        consecutiveWins: number;
        playerLevel: number;
        timestamp: Date;
    }): void {
        const victory = {
            id: `victory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            ...victoryData
        };

        // Add to state
        this.state.bossVictories.push(victory);
        this.state.totalBossVictories++;

        // Update consecutive wins tracking
        if (victoryData.consecutiveWins > this.state.maxConsecutiveWins) {
            this.state.maxConsecutiveWins = victoryData.consecutiveWins;
        }

        // Calculate total rewards earned
        const rewards = victoryData.rewardsEarned;
        this.state.totalRewardsEarned.xp += rewards.xp || 0;
        this.state.totalRewardsEarned.cp += rewards.cp || 0;
        this.state.totalRewardsEarned.coins += rewards.coins || 0;

        // Update fastest completion times
        const currentFastest = this.state.fastestCompletions[victoryData.bossType];
        if (!currentFastest || victoryData.timeTaken < currentFastest) {
            this.state.fastestCompletions[victoryData.bossType] = victoryData.timeTaken;
        }

        // Update boss type statistics
        const typeStats = this.state.bossTypeStats[victoryData.bossType] || {
            victories: 0,
            averageTime: 0,
            perfectCompletions: 0,
            totalRewards: { xp: 0, cp: 0, coins: 0 }
        };

        typeStats.victories++;
        typeStats.averageTime = (typeStats.averageTime * (typeStats.victories - 1) + victoryData.timeTaken) / typeStats.victories;
        if (victoryData.perfectCompletion) {
            typeStats.perfectCompletions++;
        }
        typeStats.totalRewards.xp += rewards.xp || 0;
        typeStats.totalRewards.cp += rewards.cp || 0;
        typeStats.totalRewards.coins += rewards.coins || 0;

        this.state.bossTypeStats[victoryData.bossType] = typeStats;

        this.saveToStorage();
    }

    /**
     * Get boss rewards statistics
     */
    getBossRewardsStats(): {
        totalRewards: { xp: number; cp: number; coins: number };
        averageRewardsPerVictory: { xp: number; cp: number; coins: number };
        topRewardingSources: Array<{ bossType: string; totalXP: number; victories: number }>;
        rewardTrends: Array<{ date: string; xp: number; cp: number; coins: number }>;
    } {
        const totalVictories = this.state.totalBossVictories || 1;

        const averageRewardsPerVictory = {
            xp: Math.round(this.state.totalRewardsEarned.xp / totalVictories),
            cp: Math.round(this.state.totalRewardsEarned.cp / totalVictories),
            coins: Math.round(this.state.totalRewardsEarned.coins / totalVictories)
        };

        const topRewardingSources = Object.entries(this.state.bossTypeStats)
            .map(([bossType, stats]: [string, any]) => ({
                bossType,
                totalXP: stats.totalRewards.xp,
                victories: stats.victories
            }))
            .sort((a, b) => b.totalXP - a.totalXP)
            .slice(0, 5);

        // Calculate reward trends (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentVictories = this.state.bossVictories.filter((v: any) =>
            new Date(v.timestamp) >= thirtyDaysAgo
        );

        const rewardTrends = this.calculateDailyRewardTrends(recentVictories);

        return {
            totalRewards: this.state.totalRewardsEarned,
            averageRewardsPerVictory,
            topRewardingSources,
            rewardTrends
        };
    }

    private calculateDailyRewardTrends(victories: any[]): Array<{ date: string; xp: number; cp: number; coins: number }> {
        const dailyRewards = new Map<string, { xp: number; cp: number; coins: number }>();

        victories.forEach(victory => {
            const date = new Date(victory.timestamp).toISOString().split('T')[0];
            const existing = dailyRewards.get(date) || { xp: 0, cp: 0, coins: 0 };

            existing.xp += victory.rewardsEarned.xp || 0;
            existing.cp += victory.rewardsEarned.cp || 0;
            existing.coins += victory.rewardsEarned.coins || 0;

            dailyRewards.set(date, existing);
        });

        return Array.from(dailyRewards.entries())
            .map(([date, rewards]) => ({ date, ...rewards }))
            .sort((a, b) => a.date.localeCompare(b.date));
    }

    // ===== BOSS SCALING METHODS =====

    /**
     * Calculate scaled boss stats based on player data
     */
    calculateBossScaling(
        boss: Boss,
        playerData: PlayerData,
        arenaMode: boolean = false,
        arenaBossCount: number = 1
    ): BossScalingResult {
        const config = this.state.scalingConfig;
        const scalingFactors = {
            playerLevel: 0,
            playerStats: 0,
            timeBased: 0,
            difficulty: 0,
            arena: 0,
            total: 0
        };

        // Player Level Scaling
        if (config.playerLevelScaling.enabled) {
            const levelDifference = Math.max(0, playerData.level - 1);
            scalingFactors.playerLevel = Math.min(
                levelDifference * config.playerLevelScaling.hpMultiplier,
                config.playerLevelScaling.maxLevelBonus
            );
        }

        // Player Stats Scaling
        if (config.playerStatsScaling.enabled && playerData.stats) {
            const stats = playerData.stats;
            const focus = stats.focus ?? 0;
            const intelligence = stats.intelligence ?? 0;
            const creativity = stats.creativity ?? 0;
            const strength = stats.strength ?? 0;

            const avgStats = (focus + intelligence + creativity + strength) / 4;

            if (config.playerStatsScaling.focusScaling.enabled) {
                const focusBonus = Math.max(0, focus - avgStats) *
                    config.playerStatsScaling.focusScaling.hpMultiplier;
                scalingFactors.playerStats += focusBonus;
            }

            if (config.playerStatsScaling.intelligenceScaling.enabled) {
                const intBonus = Math.max(0, intelligence - avgStats) *
                    config.playerStatsScaling.intelligenceScaling.hpMultiplier;
                scalingFactors.playerStats += intBonus;
            }

            if (config.playerStatsScaling.creativityScaling.enabled) {
                const creativityBonus = Math.max(0, creativity - avgStats) *
                    config.playerStatsScaling.creativityScaling.hpMultiplier;
                scalingFactors.playerStats += creativityBonus;
            }

            if (config.playerStatsScaling.strengthScaling.enabled) {
                const strengthBonus = Math.max(0, strength - avgStats) *
                    config.playerStatsScaling.strengthScaling.hpMultiplier;
                scalingFactors.playerStats += strengthBonus;
            }
        }

        // Time-Based Scaling
        if (config.timeScaling.enabled) {
            const analytics = this.state.bossAnalytics.get(boss.id);
            if (analytics) {
                const daysSinceFirst = Math.floor(
                    (Date.now() - analytics.firstEncountered.getTime()) / (1000 * 60 * 60 * 24)
                );

                if (config.timeScaling.dailyScaling.enabled) {
                    scalingFactors.timeBased = Math.min(
                        daysSinceFirst * config.timeScaling.dailyScaling.hpIncrease,
                        config.timeScaling.dailyScaling.maxDays * config.timeScaling.dailyScaling.hpIncrease
                    );
                }
            }
        }

        // Difficulty Progression Scaling
        if (config.difficultyScaling.enabled) {
            const analytics = this.state.bossAnalytics.get(boss.id);
            if (analytics) {
                if (config.difficultyScaling.consecutiveVictories.enabled) {
                    const consecutiveWins = this.calculateConsecutiveVictories(boss.id);
                    scalingFactors.difficulty = Math.min(
                        consecutiveWins * config.difficultyScaling.consecutiveVictories.hpIncrease,
                        config.difficultyScaling.consecutiveVictories.maxConsecutive *
                        config.difficultyScaling.consecutiveVictories.hpIncrease
                    );
                }
            }
        }

        // Arena Mode Scaling
        if (config.arenaScaling.enabled && arenaMode) {
            if (config.arenaScaling.bossCountScaling.enabled) {
                scalingFactors.arena = (arenaBossCount - 1) * config.arenaScaling.bossCountScaling.hpMultiplier;
            }
        }

        // Calculate total scaling
        scalingFactors.total = scalingFactors.playerLevel + scalingFactors.playerStats +
            scalingFactors.timeBased + scalingFactors.difficulty + scalingFactors.arena;

        // Apply scaling to stats and rewards
        const hpMultiplier = 1 + (scalingFactors.total / 100);
        const rewardMultiplier = 1 + (scalingFactors.total / 200); // Rewards scale slower than HP

        const scaledStats: BossStats = {
            ...boss.stats,
            maxHP: Math.round(boss.stats.maxHP * hpMultiplier),
            currentHP: Math.round(boss.stats.currentHP * hpMultiplier),
            attack: Math.round(boss.stats.attack * (1 + scalingFactors.total / 200)),
            defense: Math.round(boss.stats.defense * (1 + scalingFactors.total / 200)),
            speed: boss.stats.speed,
            specialAttack: Math.round(boss.stats.specialAttack * (1 + scalingFactors.total / 200)),
            specialDefense: Math.round(boss.stats.specialDefense * (1 + scalingFactors.total / 200))
        };

        const scaledRewards: BossRewards = {
            ...boss.rewards,
            xp: Math.round(boss.rewards.xp * rewardMultiplier),
            cp: Math.round(boss.rewards.cp * rewardMultiplier),
            coins: Math.round(boss.rewards.coins * rewardMultiplier)
        };

        return {
            originalStats: boss.stats,
            scaledStats,
            originalRewards: boss.rewards,
            scaledRewards,
            scalingFactors,
            scalingApplied: {
                hpMultiplier,
                rewardMultiplier,
                difficultyIncrease: scalingFactors.total
            }
        };
    }

    /**
     * Update scaling configuration
     */
    updateScalingConfig(config: Partial<BossScalingConfig>): void {
        this.state.scalingConfig = { ...this.state.scalingConfig, ...config };
        this.saveToStorage();
    }

    /**
     * Get current scaling configuration
     */
    getScalingConfig(): BossScalingConfig {
        return this.state.scalingConfig;
    }

    // ===== ARENA MODE METHODS =====

    /**
     * Create a new boss arena
     */
    createBossArena(
        name: string,
        description: string,
        difficulty: 'easy' | 'medium' | 'hard' | 'epic' | 'legendary',
        bossIds: string[],
        timeLimit: number
    ): BossArena {
        const arenaId = `arena_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const arena: BossArena = {
            id: arenaId,
            name,
            description,
            difficulty,
            bossCount: bossIds.length,
            timeLimit,
            bossSelection: 'sequential',
            bosses: bossIds.map((bossId, index) => ({
                bossId,
                bossName: this.state.bossBestiary.get(bossId)?.bossName || 'Unknown Boss',
                order: index,
                isOptional: false
            })),
            arenaRewards: {
                xp: bossIds.length * 100,
                cp: bossIds.length * 50,
                coins: bossIds.length * 25,
                materials: [],
                achievements: [`${name} Champion`],
                titles: [`${name} Master`],
                arenaPoints: bossIds.length * 10
            },
            progress: {
                currentBossIndex: 0,
                defeatedBosses: [],
                timeRemaining: timeLimit * 60, // Convert to seconds
                isActive: false,
                isCompleted: false
            },
            scaling: this.state.scalingConfig,
            createdAt: new Date()
        };

        this.state.bossArenas.set(arenaId, arena);
        this.saveToStorage();
        return arena;
    }

    /**
     * Start an arena battle
     */
    startArenaBattle(arenaId: string): BossArena | null {
        const arena = this.state.bossArenas.get(arenaId);
        if (!arena) return null;

        arena.progress.isActive = true;
        arena.progress.currentBossIndex = 0;
        arena.progress.defeatedBosses = [];
        arena.progress.timeRemaining = arena.timeLimit * 60;
        arena.startedAt = new Date();

        this.state.bossArenas.set(arenaId, arena);
        this.saveToStorage();
        return arena;
    }

    /**
     * Get all arenas
     */
    getAllArenas(): BossArena[] {
        return Array.from(this.state.bossArenas.values());
    }

    /**
     * Get active arena
     */
    getActiveArena(): BossArena | null {
        return Array.from(this.state.bossArenas.values()).find(arena => arena.progress.isActive) || null;
    }

    // ===== PRIVATE HELPER METHODS =====

    private createNewBossAnalytics(boss: Boss): BossAnalytics {
        return {
            bossId: boss.id,
            bossName: boss.name,
            bossType: boss.type,
            theme: boss.theme,
            difficulty: boss.difficulty,
            totalBattles: 0,
            victories: 0,
            defeats: 0,
            winRate: 0,
            averageBattleTime: 0,
            totalTimeSpent: 0,
            fastestVictory: 0,
            longestBattle: 0,
            totalDamageDealt: 0,
            averageDamagePerBattle: 0,
            highestDamageDealt: 0,
            totalDamageTaken: 0,
            averagePhasesCompleted: 0,
            phaseCompletionRates: {},
            totalRewardsEarned: {
                xp: 0,
                cp: 0,
                coins: 0,
                materials: {},
                achievements: [],
                titles: []
            },
            playerLevelWhenDefeated: 0,
            playerStatsWhenDefeated: {
                focus: 0,
                intelligence: 0,
                creativity: 0,
                strength: 0
            },
            battleHistory: [],
            firstEncountered: new Date(),
            lastEncountered: new Date(),
            isUnlocked: true,
            isDefeated: false
        };
    }

    private updateBossAnalytics(analytics: BossAnalytics, record: BossBattleRecord): void {
        analytics.totalBattles++;
        analytics.lastEncountered = record.battleDate;

        if (record.result === 'victory') {
            analytics.victories++;
            if (!analytics.isDefeated) {
                analytics.isDefeated = true;
                analytics.playerLevelWhenDefeated = record.playerLevel;
                analytics.playerStatsWhenDefeated = record.playerStats;
            }
        } else if (record.result === 'defeat') {
            analytics.defeats++;
        }

        analytics.winRate = (analytics.victories / analytics.totalBattles) * 100;
        analytics.totalTimeSpent += record.duration;
        analytics.averageBattleTime = analytics.totalTimeSpent / analytics.totalBattles;

        if (record.result === 'victory' && (analytics.fastestVictory === 0 || record.duration < analytics.fastestVictory)) {
            analytics.fastestVictory = record.duration;
        }

        if (record.duration > analytics.longestBattle) {
            analytics.longestBattle = record.duration;
        }

        analytics.totalDamageDealt += record.damageDealt;
        analytics.averageDamagePerBattle = analytics.totalDamageDealt / analytics.totalBattles;

        if (record.damageDealt > analytics.highestDamageDealt) {
            analytics.highestDamageDealt = record.damageDealt;
        }

        analytics.totalDamageTaken += record.damageTaken;

        // Update phase completion rates
        if (record.phasesCompleted > 0) {
            for (let i = 1; i <= record.phasesCompleted; i++) {
                analytics.phaseCompletionRates[i] = (analytics.phaseCompletionRates[i] || 0) + 1;
            }
        }

        // Update rewards
        analytics.totalRewardsEarned.xp += record.rewards.xp;
        analytics.totalRewardsEarned.cp += record.rewards.cp;
        analytics.totalRewardsEarned.coins += record.rewards.coins;
        analytics.totalRewardsEarned.achievements.push(...record.rewards.achievements);

        // Add to battle history (keep last 10)
        analytics.battleHistory.push(record);
        if (analytics.battleHistory.length > 10) {
            analytics.battleHistory = analytics.battleHistory.slice(-10);
        }
    }

    private updateGlobalStats(record: BossBattleRecord): void {
        this.state.globalStats.totalBattlesFought++;
        this.state.globalStats.totalTimeSpent += record.duration;

        if (record.result === 'victory') {
            this.state.globalStats.totalBossesDefeated++;
        }

        this.state.globalStats.totalRewardsEarned.xp += record.rewards.xp;
        this.state.globalStats.totalRewardsEarned.cp += record.rewards.cp;
        this.state.globalStats.totalRewardsEarned.coins += record.rewards.coins;

        this.state.globalStats.averageWinRate =
            (this.state.globalStats.totalBossesDefeated / this.state.globalStats.totalBattlesFought) * 100;
    }

    private calculateConsecutiveVictories(bossId: string): number {
        const analytics = this.state.bossAnalytics.get(bossId);
        if (!analytics || analytics.battleHistory.length === 0) return 0;

        let consecutive = 0;
        for (let i = analytics.battleHistory.length - 1; i >= 0; i--) {
            if (analytics.battleHistory[i].result === 'victory') {
                consecutive++;
            } else {
                break;
            }
        }
        return consecutive;
    }

    private getDefaultScalingConfig(): BossScalingConfig {
        return {
            playerLevelScaling: {
                enabled: true,
                hpMultiplier: 5, // 5% HP increase per level
                rewardMultiplier: 3, // 3% reward increase per level
                difficultyIncrease: 2, // 2% difficulty increase per level
                maxLevelBonus: 50 // Maximum 50% bonus from level
            },
            playerStatsScaling: {
                enabled: true,
                focusScaling: {
                    enabled: true,
                    hpMultiplier: 2,
                    rewardMultiplier: 1.5
                },
                intelligenceScaling: {
                    enabled: true,
                    hpMultiplier: 2,
                    rewardMultiplier: 1.5
                },
                creativityScaling: {
                    enabled: true,
                    hpMultiplier: 2,
                    rewardMultiplier: 1.5
                },
                strengthScaling: {
                    enabled: true,
                    hpMultiplier: 2,
                    rewardMultiplier: 1.5
                }
            },
            timeScaling: {
                enabled: true,
                dailyScaling: {
                    enabled: true,
                    hpIncrease: 1, // 1% HP increase per day
                    rewardIncrease: 0.5,
                    maxDays: 30
                },
                weeklyScaling: {
                    enabled: false,
                    hpIncrease: 5,
                    rewardIncrease: 2,
                    maxWeeks: 12
                }
            },
            difficultyScaling: {
                enabled: true,
                consecutiveVictories: {
                    enabled: true,
                    hpIncrease: 10, // 10% HP increase per consecutive victory
                    rewardIncrease: 5,
                    maxConsecutive: 5
                },
                totalVictories: {
                    enabled: false,
                    hpIncrease: 5,
                    rewardIncrease: 2,
                    maxTotal: 10
                }
            },
            arenaScaling: {
                enabled: true,
                bossCountScaling: {
                    enabled: true,
                    hpMultiplier: 20, // 20% HP increase per additional boss
                    rewardMultiplier: 15
                },
                timeLimitScaling: {
                    enabled: true,
                    timeReduction: 15, // 15 minutes reduction per additional boss
                    minTimeLimit: 30
                }
            }
        };
    }

    private loadFromStorage(): void {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                this.state = {
                    ...this.state,
                    ...parsed,
                    bossAnalytics: new Map(parsed.bossAnalytics || []),
                    bossBestiary: new Map(parsed.bossBestiary || []),
                    bossArenas: new Map(parsed.bossArenas || [])
                };
            }
        } catch (error) {
            console.error('Failed to load boss analytics from storage:', error);
        }
    }

    // Record task completion for analytics
    recordTaskCompletion(taskUpdate: any): void {
        // This method will be called by TaskIntegrationService
        // For now, we'll just log it - can be enhanced later
        console.log('Task completion recorded:', taskUpdate);

        // You could add logic here to:
        // - Update boss damage based on task completion
        // - Track task completion patterns
        // - Record productivity metrics
    }

    private saveToStorage(): void {
        try {
            const serialized = {
                ...this.state,
                bossAnalytics: Array.from(this.state.bossAnalytics.entries()),
                bossBestiary: Array.from(this.state.bossBestiary.entries()),
                bossArenas: Array.from(this.state.bossArenas.entries())
            };
            localStorage.setItem(this.storageKey, JSON.stringify(serialized));
        } catch (error) {
            console.error('Failed to save boss analytics to storage:', error);
        }
    }
}

// Export singleton instance
export const bossAnalyticsService = BossAnalyticsService.getInstance();
