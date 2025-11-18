import { penaltyService } from '../../../shared/services/penaltyService';
import { Boss, BossProgress } from '../types/BossTypes';
import { Notice } from 'obsidian';

export class BossPenaltyIntegration {

    /**
     * Enhanced boss battle completion with timeout penalties
     */
    static async completeBossWithTimeCheck(
        boss: Boss,
        battleStartTime: number,
        timeLimit: number, // in minutes
        originalRewards: { xp: number; coins: number; cp: number }
    ): Promise<{
        success: boolean;
        finalRewards: { xp: number; coins: number; cp: number };
        penaltyApplied: boolean;
        messages: string[];
    }> {
        const battleDuration = (Date.now() - battleStartTime) / (1000 * 60); // Convert to minutes
        let finalRewards = { ...originalRewards };
        let penaltyApplied = false;
        let messages: string[] = [];

        // Check if battle exceeded time limit
        if (battleDuration > timeLimit) {
            const timeExceeded = battleDuration - timeLimit;

            const penaltyResult = await penaltyService.applyPenalty({
                type: 'boss_timeout',
                bossId: boss.id,
                timeExceeded,
                originalReward: originalRewards
            });

            finalRewards = penaltyResult.finalReward;
            penaltyApplied = true;
            messages.push(...penaltyResult.messages);

            // Apply boss health boost for next encounter
            await this.applyBossHealthBoost(boss.id, Math.round(timeExceeded / 10)); // 1% health boost per 10 minutes over

            new Notice(`⏰ Boss battle timeout! Penalties applied and boss strengthened for next encounter.`, 8000);
        } else {
            // Bonus for completing within time limit
            const speedBonus = Math.max(0, (timeLimit - battleDuration) / timeLimit * 0.2); // Up to 20% bonus
            finalRewards.xp = Math.round(finalRewards.xp * (1 + speedBonus));
            finalRewards.coins = Math.round(finalRewards.coins * (1 + speedBonus));

            if (speedBonus > 0) {
                messages.push(`⚡ Speed bonus! Completed ${Math.round((timeLimit - battleDuration) * 10) / 10} minutes early (+${Math.round(speedBonus * 100)}% rewards).`);
            }
        }

        return {
            success: !penaltyApplied,
            finalRewards,
            penaltyApplied,
            messages
        };
    }

    /**
     * Apply permanent health boost to boss for failed encounters
     */
    private static async applyBossHealthBoost(bossId: string, percentageIncrease: number): Promise<void> {
        // This would integrate with your boss management service
        // to permanently increase boss health for next encounter
        console.log(`[BossPenalty] Applying ${percentageIncrease}% health boost to boss ${bossId}`);

        // Store the health boost in local storage or player data for persistence
        try {
            const existingBoosts = JSON.parse(localStorage.getItem('bossHealthBoosts') || '{}');
            existingBoosts[bossId] = (existingBoosts[bossId] || 0) + percentageIncrease;
            localStorage.setItem('bossHealthBoosts', JSON.stringify(existingBoosts));

            console.log(`[BossPenalty] Boss ${bossId} now has ${existingBoosts[bossId]}% cumulative health boost`);
        } catch (error) {
            console.error('[BossPenalty] Error applying boss health boost:', error);
        }
    }

    /**
     * Get boss health boost for a specific boss
     */
    static getBossHealthBoost(bossId: string): number {
        try {
            const existingBoosts = JSON.parse(localStorage.getItem('bossHealthBoosts') || '{}');
            return existingBoosts[bossId] || 0;
        } catch (error) {
            console.error('[BossPenalty] Error getting boss health boost:', error);
            return 0;
        }
    }

    /**
     * Apply health boost to boss stats
     */
    static applyHealthBoostToBoss(boss: Boss): Boss {
        const healthBoost = this.getBossHealthBoost(boss.id);

        if (healthBoost > 0) {
            const boostedBoss = { ...boss };
            const boostMultiplier = 1 + (healthBoost / 100);

            boostedBoss.stats = {
                ...boostedBoss.stats,
                maxHP: Math.round(boostedBoss.stats.maxHP * boostMultiplier),
                currentHP: Math.round(boostedBoss.stats.currentHP * boostMultiplier)
            };

            console.log(`[BossPenalty] Applied ${healthBoost}% health boost to boss ${boss.id}. New HP: ${boostedBoss.stats.maxHP}`);
            return boostedBoss;
        }

        return boss;
    }

    /**
     * Check for boss battle timeouts during active battles
     */
    static checkBattleTimeout(battleStartTime: number, timeLimit: number): {
        isNearTimeout: boolean;
        timeRemaining: number;
        warningLevel: 'none' | 'warning' | 'critical';
        percentComplete: number;
    } {
        const elapsed = (Date.now() - battleStartTime) / (1000 * 60);
        const timeRemaining = Math.max(0, timeLimit - elapsed);
        const percentComplete = Math.min(100, (elapsed / timeLimit) * 100);

        let warningLevel: 'none' | 'warning' | 'critical' = 'none';
        if (timeRemaining <= 5) warningLevel = 'critical';
        else if (timeRemaining <= 15) warningLevel = 'warning';

        return {
            isNearTimeout: timeRemaining <= 15,
            timeRemaining,
            warningLevel,
            percentComplete
        };
    }

    /**
     * Get timeout warning message
     */
    static getTimeoutWarningMessage(timeStatus: ReturnType<typeof BossPenaltyIntegration.checkBattleTimeout>): string | null {
        switch (timeStatus.warningLevel) {
            case 'critical':
                return `🚨 CRITICAL: Only ${Math.ceil(timeStatus.timeRemaining)} minutes remaining! Battle will timeout soon!`;
            case 'warning':
                return `⚠️ WARNING: ${Math.ceil(timeStatus.timeRemaining)} minutes remaining. Hurry to avoid timeout penalties!`;
            default:
                return null;
        }
    }

    /**
     * Calculate what penalties would be applied for a timeout
     */
    static calculateTimeoutPenalty(timeExceeded: number, originalRewards: { xp: number; coins: number; cp: number }): {
        penaltyPercent: number;
        rewardReduction: { xp: number; coins: number; cp: number };
        reputationLoss: number;
        debuffDuration: number; // in hours
    } {
        const penaltyPercent = Math.min(0.5, timeExceeded / 60); // Max 50% penalty, 1% per minute over
        const rewardReduction = {
            xp: Math.round(originalRewards.xp * penaltyPercent),
            coins: Math.round(originalRewards.coins * penaltyPercent),
            cp: Math.round(originalRewards.cp * penaltyPercent)
        };
        const reputationLoss = Math.round(5 + (timeExceeded / 10)); // 5 base + 1 per 10 minutes
        const debuffDuration = 24; // 24 hours

        return {
            penaltyPercent: penaltyPercent * 100,
            rewardReduction,
            reputationLoss,
            debuffDuration
        };
    }

    /**
     * Clear boss health boosts (for testing or reset purposes)
     */
    static clearBossHealthBoosts(bossId?: string): void {
        try {
            if (bossId) {
                const existingBoosts = JSON.parse(localStorage.getItem('bossHealthBoosts') || '{}');
                delete existingBoosts[bossId];
                localStorage.setItem('bossHealthBoosts', JSON.stringify(existingBoosts));
                console.log(`[BossPenalty] Cleared health boost for boss ${bossId}`);
            } else {
                localStorage.removeItem('bossHealthBoosts');
                console.log('[BossPenalty] Cleared all boss health boosts');
            }
        } catch (error) {
            console.error('[BossPenalty] Error clearing boss health boosts:', error);
        }
    }

    /**
     * Get all boss health boosts
     */
    static getAllBossHealthBoosts(): Record<string, number> {
        try {
            return JSON.parse(localStorage.getItem('bossHealthBoosts') || '{}');
        } catch (error) {
            console.error('[BossPenalty] Error getting all boss health boosts:', error);
            return {};
        }
    }
}
