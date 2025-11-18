import { playerStore } from '../state/playerStore';
import { runtimeConfig } from '../state/config';
import { Buff, Debuff } from '../../data/models/PlayerData';

export interface RewardIntent {
    xp?: number;
    coins?: number;
    cp?: number;
    source: string;
    energyCost?: {
        mental?: number;
        physical?: number;
        emotional?: number;
    };
}

export interface AppliedReward {
    xp: number;
    coins: number;
    cp: number;
    energyCost: {
        mental: number;
        physical: number;
        emotional: number;
    };
    multipliers: {
        buff: number;
        energy: number;
        focus: number;
    };
    final: {
        xp: number;
        coins: number;
        cp: number;
    };
}

class RewardService {
    private static instance: RewardService;

    private constructor() { }

    static getInstance(): RewardService {
        if (!RewardService.instance) {
            RewardService.instance = new RewardService();
        }
        return RewardService.instance;
    }

    async applyRewards(intent: RewardIntent): Promise<AppliedReward> {
        const player = await playerStore.get();
        if (!player) {
            throw new Error('Player data not available');
        }

        // Calculate base multipliers from buffs and debuffs
        const currentStats = player.stats || {};
        const buffMultiplier = this.calculateBuffMultiplier(player.buffs || []);
        // Rule: do not reduce rewards via debuffs unless energy is zero
        const debuffMultiplier = this.calculateDebuffMultiplier(player.debuffs || [], currentStats.energy || 0);
        const totalBuffMultiplier = buffMultiplier * debuffMultiplier;

        // Rule: do not reduce rewards due to energy unless energy is zero
        const energyMultiplier = this.calculateEnergyMultiplier(currentStats);

        // Rule: focus should never reduce rewards; only apply bonus at high focus
        const focusMultiplier = this.calculateFocusMultiplier(currentStats);

        // Apply energy costs
        const energyCost = this.calculateEnergyCost(intent.energyCost || {}, player.stats || {});

        // Calculate final rewards
        const finalXP = Math.round((intent.xp || 0) * totalBuffMultiplier * energyMultiplier * focusMultiplier);
        const finalCoins = Math.round((intent.coins || 0) * totalBuffMultiplier * energyMultiplier * focusMultiplier);
        const finalCP = Math.round((intent.cp || 0) * totalBuffMultiplier * energyMultiplier * focusMultiplier);

        // Update player data
        await playerStore.update(data => {
            const newStats = { ...data.stats };

            // Apply energy costs
            if (newStats.energy !== undefined) {
                newStats.energy = Math.max(0, newStats.energy - energyCost.physical);
            }
            if (newStats.focus !== undefined) {
                newStats.focus = Math.max(0, newStats.focus - energyCost.mental);
            }
            if (newStats.motivation !== undefined) {
                newStats.motivation = Math.max(0, newStats.motivation - energyCost.emotional);
            }

            // Add rewards
            const newCoins = (data.coins || 0) + finalCoins;
            const newCP = (data.cp || 0) + finalCP;

            // Helper function to calculate XP required for a level
            const getXpRequired = (level: number): number => {
                return level * level * 1000 - (level - 1) * (level - 1) * 1000;
            };

            // Handle XP and level up logic properly
            let currentXP = (data.xp || 0) + finalXP;
            let currentLevel = data.level || 1;
            let currentXPRequired = data.xpRequired || getXpRequired(currentLevel);

            // Check for level ups
            while (currentXP >= currentXPRequired) {
                currentXP -= currentXPRequired;
                currentLevel++;
                currentXPRequired = getXpRequired(currentLevel);
            }

            const updatedData = {
                ...data,
                xp: currentXP,
                level: currentLevel,
                xpRequired: currentXPRequired,
                coins: newCoins,
                cp: newCP,
                stats: newStats
            };

            console.log('[RewardService] Updating player data:', {
                oldXP: data.xp,
                newXP: currentXP,
                oldLevel: data.level,
                newLevel: currentLevel,
                oldCoins: data.coins,
                newCoins: newCoins,
                oldCP: data.cp,
                newCP: newCP
            });

            return updatedData;
        });

        console.log('[RewardService] Player store update completed, dispatching events...');

        // Automatically check and update player level after applying rewards
        try {
            const { checkAndFixPlayerLevel } = await import('../utils/progressUpdater');
            // Get vault from player store
            const vault = playerStore.getVault();
            if (vault) {
                const levelResult = await checkAndFixPlayerLevel(vault);
                console.log('[RewardService] Automatic level check completed:', levelResult);
            } else {
                console.warn('[RewardService] Vault not available for level check');
            }
        } catch (levelErr) {
            console.error('[RewardService] Automatic level check failed:', levelErr);
        }

        return {
            xp: intent.xp || 0,
            coins: intent.coins || 0,
            cp: intent.cp || 0,
            energyCost,
            multipliers: {
                buff: totalBuffMultiplier,
                energy: energyMultiplier,
                focus: focusMultiplier
            },
            final: {
                xp: finalXP,
                coins: finalCoins,
                cp: finalCP
            }
        };
    }

    private calculateBuffMultiplier(buffs: Buff[]): number {
        let multiplier = 1.0;

        buffs.forEach(buff => {
            if (buff.type === 'multiplier' && buff.value) {
                multiplier *= (1 + buff.value);
            }
        });

        return multiplier;
    }

    private calculateDebuffMultiplier(debuffs: Debuff[], energy: number): number {
        let multiplier = 1.0;
        // If energy is above zero, ignore debuff reductions
        if (energy > 0) return 1.0;

        debuffs.forEach(debuff => {
            if (debuff.type === 'multiplier' && debuff.value) {
                multiplier *= (1 - debuff.value);
            }
        });

        return Math.max(0.1, multiplier); // Don't go below 10%
    }

    private calculateEnergyMultiplier(stats: any): number {
        const energy = stats.energy ?? 0;
        // Full rewards unless energy is exactly zero
        if (energy > 0) return 1.0;
        // If completely depleted, apply a significant penalty
        return 0.5; // 50% rewards when energy is zero
    }

    private calculateFocusMultiplier(stats: any): number {
        const focus = stats.focus ?? 0;
        // Only apply bonus at high focus; never reduce rewards
        if (focus > 80) {
            return 1.0 + ((focus - 80) / 20) * 0.2; // Up to 120%
        }
        return 1.0;
    }

    private calculateEnergyCost(cost: any, stats: any): { mental: number; physical: number; emotional: number } {
        const baseMental = cost.mental ?? 0;
        const basePhysical = cost.physical ?? 0;
        const baseEmotional = cost.emotional ?? 0;

        // Apply focus efficiency (higher focus = less mental cost)
        const focus = stats.focus || 50;
        const focusEfficiency = Math.max(0.5, focus / 100);

        // Apply energy efficiency (higher energy = less physical cost)
        const energy = stats.energy || 50;
        const energyEfficiency = Math.max(0.5, energy / 100);

        return {
            mental: Math.round(baseMental * focusEfficiency),
            physical: Math.round(basePhysical * energyEfficiency),
            emotional: Math.round(baseEmotional),
        };
    }

    // Helper methods for common reward patterns
    async completeQuest(questName: string, difficulty: 'easy' | 'medium' | 'hard'): Promise<AppliedReward> {
        const baseRewards = {
            easy: { xp: 10, coins: 5, cp: 1 },
            medium: { xp: 25, coins: 15, cp: 3 },
            hard: { xp: 50, coins: 30, cp: 6 }
        };

        const rewards = baseRewards[difficulty];
        const costCfg = runtimeConfig.questEnergyCostByDifficulty[difficulty];
        const energyCost = { ...costCfg };

        return this.applyRewards({
            ...rewards,
            source: `quest:${questName}`,
            energyCost
        });
    }

    async completePomodoroSession(duration: number): Promise<AppliedReward> {
        const minutes = duration / 60;
        const baseXP = Math.round(minutes * 2);
        const baseCoins = Math.round(minutes * 1.5);

        const per = runtimeConfig.pomodoroCostPerMinute;
        const energyCost = {
            mental: Math.round(minutes * (per.mental || 0)),
            physical: Math.round(minutes * (per.physical || 0)),
            emotional: Math.round(minutes * (per.emotional || 0)),
        };

        return this.applyRewards({
            xp: baseXP,
            coins: baseCoins,
            source: 'pomodoro:work',
            energyCost
        });
    }

    async takeBreak(activity: 'rest' | 'walk' | 'meditation' | 'yoga'): Promise<AppliedReward> {
        const recovery = runtimeConfig.breakRecovery[activity];

        // Recovery activities give small rewards and restore stats
        await playerStore.updateStats({
            energy: recovery.energy,
            focus: recovery.focus,
            motivation: recovery.motivation,
            calm: recovery.calm,
            stress: recovery.stressReduce ? -recovery.stressReduce + (playerStore as any)._getStressOffset?.() : undefined,
        } as any);

        return this.applyRewards({
            xp: 5,
            coins: 2,
            source: `break:${activity}`
        });
    }
}

export const rewardService = RewardService.getInstance();
