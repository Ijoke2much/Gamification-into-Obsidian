import { playerStore } from '../state/playerStore';
import { Quest } from '../../features/quests/utils/taskParser';
import { Boss, BossProgress } from '../../features/quests/types/BossTypes';
import { Debuff, PlayerData } from '../../data/models/PlayerData';
import { rewardService } from './rewardService';
import { penaltyAnalyticsService } from './penaltyAnalyticsService';
import { penaltyForgivenessService } from './penaltyForgivenessService';
import { penaltyCoachingService } from './penaltyCoachingService';
import {
    getResolvedGameplayConfig,
    isPenaltyTypeEnabled,
} from '../utils/gameplayConfig';

export interface PenaltyContext {
    type: 'boss_timeout' | 'quest_overdue' | 'quest_attachment_expired';
    questId?: string;
    bossId?: string;
    daysOverdue?: number;
    originalReward?: {
        xp: number;
        coins: number;
        cp: number;
    };
    timeExceeded?: number; // minutes over limit
}

export interface PenaltyResult {
    finalReward: {
        xp: number;
        coins: number;
        cp: number;
    };
    messages: string[];
    debtAccumulated: {
        xp: number;
        coins: number;
    };
    reputationLoss: number;
    debuffsApplied: Debuff[];
}

export class PenaltyService {
    private static instance: PenaltyService;

    static getInstance(): PenaltyService {
        if (!PenaltyService.instance) {
            PenaltyService.instance = new PenaltyService();
        }
        return PenaltyService.instance;
    }

    async applyPenalty(context: PenaltyContext): Promise<PenaltyResult> {
        const player = await playerStore.get();
        if (!player) {
            throw new Error('Player data not available');
        }

        const gameplay = getResolvedGameplayConfig();
        const originalReward = context.originalReward ?? { xp: 0, coins: 0, cp: 0 };
        if (!isPenaltyTypeEnabled(gameplay, context.type)) {
            return this.createNoOpPenaltyResult(originalReward);
        }

        let result: PenaltyResult;

        switch (context.type) {
            case 'boss_timeout':
                result = await this.applyBossTimeoutPenalty(context, player);
                break;
            case 'quest_overdue':
                result = await this.applyQuestOverduePenalty(context, player);
                break;
            case 'quest_attachment_expired':
                result = await this.applyQuestAttachmentPenalty(context, player);
                break;
            default:
                throw new Error(`Unknown penalty type: ${context.type}`);
        }

        // After applying penalty, check for forgiveness events and coaching opportunities
        await this.postPenaltyProcessing(player);

        return result;
    }

    private async applyBossTimeoutPenalty(context: PenaltyContext, player: PlayerData): Promise<PenaltyResult> {
        const messages: string[] = [];
        const timeExceeded = context.timeExceeded || 0;
        const originalReward = context.originalReward || { xp: 0, coins: 0, cp: 0 };

        // Calculate penalty (up to 50%, 1% per minute over)
        const penaltyPercent = Math.min(0.5, timeExceeded / 60);
        const rewardReduction = {
            xp: Math.round(originalReward.xp * penaltyPercent),
            coins: Math.round(originalReward.coins * penaltyPercent),
            cp: Math.round(originalReward.cp * penaltyPercent)
        };

        // Calculate reputation loss
        const reputationLoss = Math.round(5 + (timeExceeded / 10)); // 5 base + 1 per 10 minutes

        // Apply Battle Fatigue debuff
        const battleFatigueDebuff: Debuff = {
            name: 'Battle Fatigue',
            type: 'multiplier',
            value: 0.85, // 15% penalty to battle rewards
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
            description: 'Exhaustion from prolonged battles reduces your combat effectiveness.',
            icon: '😴',
            category: 'motivation'
        };

        // Update player data
        await playerStore.update(data => {
            const updatedData = { ...data };

            // Apply reputation loss
            updatedData.questReputation = Math.max(-100, (data.questReputation || 0) - reputationLoss);

            // Add debuff
            updatedData.debuffs = [...(data.debuffs || []), battleFatigueDebuff];

            // Boost boss health for next encounter if bossId is provided
            if (context.bossId) {
                // This would integrate with boss system
                // For now, we'll just track it in player data
                updatedData.bossHealthBoosts = {
                    ...(data.bossHealthBoosts || {}),
                    [context.bossId]: (data.bossHealthBoosts?.[context.bossId] || 0) + Math.ceil(timeExceeded / 10)
                };
            }

            return updatedData;
        });

        messages.push(`⏰ Boss battle exceeded time limit by ${timeExceeded} minutes.`);
        messages.push(`💰 Rewards reduced by ${Math.round(penaltyPercent * 100)}%.`);
        messages.push(`😴 Battle Fatigue debuff applied for 24 hours.`);
        messages.push(`📉 Reputation decreased by ${reputationLoss} points.`);

        if (context.bossId) {
            messages.push(`💪 Boss health permanently increased for next encounter.`);
        }

        return {
            finalReward: {
                xp: originalReward.xp - rewardReduction.xp,
                coins: originalReward.coins - rewardReduction.coins,
                cp: originalReward.cp - rewardReduction.cp
            },
            messages,
            debtAccumulated: { xp: 0, coins: 0 }, // Boss timeouts don't create debt
            reputationLoss,
            debuffsApplied: [battleFatigueDebuff]
        };
    }

    private async applyQuestOverduePenalty(context: PenaltyContext, player: PlayerData): Promise<PenaltyResult> {
        const messages: string[] = [];
        const daysOverdue = context.daysOverdue || 0;
        const originalReward = context.originalReward || { xp: 0, coins: 0, cp: 0 };

        // Progressive 10% reduction per day (max 90%)
        const penaltyPercent = Math.min(0.9, daysOverdue * 0.1);
        const rewardReduction = {
            xp: Math.round(originalReward.xp * penaltyPercent),
            coins: Math.round(originalReward.coins * penaltyPercent),
            cp: Math.round(originalReward.cp * penaltyPercent)
        };

        // Convert lost rewards to debt (50% of lost rewards)
        const debtAccumulated = {
            xp: Math.round(rewardReduction.xp * 0.5),
            coins: Math.round(rewardReduction.coins * 0.5)
        };

        // Reputation loss (max 15 points, 2 per day)
        const reputationLoss = Math.min(15, daysOverdue * 2);

        // Apply procrastination debuff if severely overdue
        const debuffsApplied: Debuff[] = [];
        if (daysOverdue >= 3) {
            const procrastinationDebuff: Debuff = {
                name: 'Procrastination',
                type: 'multiplier',
                value: 0.9, // 10% penalty to future quest rewards
                expiresAt: new Date(Date.now() + daysOverdue * 12 * 60 * 60 * 1000).toISOString(), // 12 hours per overdue day
                description: `Chronic procrastination is affecting your productivity. Quest rewards reduced by 10%.`,
                icon: '😞',
                category: 'motivation'
            };
            debuffsApplied.push(procrastinationDebuff);
            messages.push(`😞 Procrastination debuff applied for ${daysOverdue * 12} hours.`);
        }

        // Update player data
        await playerStore.update(data => {
            const updatedData = { ...data };

            // Apply reputation loss
            updatedData.questReputation = Math.max(-100, (data.questReputation || 0) - reputationLoss);

            // Accumulate debt
            updatedData.failureDebtXP = (data.failureDebtXP || 0) + debtAccumulated.xp;
            updatedData.failureDebtCoins = (data.failureDebtCoins || 0) + debtAccumulated.coins;

            // Add debuffs
            updatedData.debuffs = [...(data.debuffs || []), ...debuffsApplied];

            return updatedData;
        });

        messages.push(`📅 Quest completed ${daysOverdue} days late.`);
        messages.push(`💰 Rewards reduced by ${Math.round(penaltyPercent * 100)}%.`);
        messages.push(`💸 ${debtAccumulated.xp} XP and ${debtAccumulated.coins} coins added to debt.`);
        messages.push(`📉 Reputation decreased by ${reputationLoss} points.`);

        return {
            finalReward: {
                xp: originalReward.xp - rewardReduction.xp,
                coins: originalReward.coins - rewardReduction.coins,
                cp: originalReward.cp - rewardReduction.cp
            },
            messages,
            debtAccumulated,
            reputationLoss,
            debuffsApplied
        };
    }

    private async applyQuestAttachmentPenalty(context: PenaltyContext, player: PlayerData): Promise<PenaltyResult> {
        const messages: string[] = [];
        const originalReward = context.originalReward || { xp: 0, coins: 0, cp: 0 };

        // 25% reward reduction for attachment failures
        const penaltyPercent = 0.25;
        const rewardReduction = {
            xp: Math.round(originalReward.xp * penaltyPercent),
            coins: Math.round(originalReward.coins * penaltyPercent),
            cp: Math.round(originalReward.cp * penaltyPercent)
        };

        // Apply Scattered Focus debuff
        const scatteredFocusDebuff: Debuff = {
            name: 'Scattered Focus',
            type: 'multiplier',
            value: 0.95, // 5% penalty to focus rewards
            expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours
            description: 'Your focus was scattered during the session. Focus rewards reduced by 5%.',
            icon: '🤯',
            category: 'focus'
        };

        // Minor reputation loss
        const reputationLoss = 3;

        // Update player data
        await playerStore.update(data => {
            const updatedData = { ...data };

            // Apply reputation loss
            updatedData.questReputation = Math.max(-100, (data.questReputation || 0) - reputationLoss);

            // Add debuff
            updatedData.debuffs = [...(data.debuffs || []), scatteredFocusDebuff];

            return updatedData;
        });

        messages.push(`🎯 Quest attachment failed to complete within time limit.`);
        messages.push(`💰 Rewards reduced by 25%.`);
        messages.push(`🤯 Scattered Focus debuff applied for 4 hours.`);
        messages.push(`📉 Reputation decreased by 3 points.`);

        return {
            finalReward: {
                xp: originalReward.xp - rewardReduction.xp,
                coins: originalReward.coins - rewardReduction.coins,
                cp: originalReward.cp - rewardReduction.cp
            },
            messages,
            debtAccumulated: { xp: 0, coins: 0 }, // Attachment failures don't create debt
            reputationLoss,
            debuffsApplied: [scatteredFocusDebuff]
        };
    }

    async processDebtRepayment(rewards: { xp: number; coins: number; cp: number }): Promise<{
        finalReward: { xp: number; coins: number; cp: number };
        messages: string[];
    }> {
        const player = await playerStore.get();
        if (!player) {
            return { finalReward: rewards, messages: [] };
        }

        const debtXP = player.failureDebtXP || 0;
        const debtCoins = player.failureDebtCoins || 0;
        const messages: string[] = [];

        if (debtXP === 0 && debtCoins === 0) {
            return { finalReward: rewards, messages: [] };
        }

        // Calculate debt repayment (30% of rewards)
        const repaymentRate = 0.3;
        const xpRepayment = Math.min(debtXP, Math.round(rewards.xp * repaymentRate));
        const coinRepayment = Math.min(debtCoins, Math.round(rewards.coins * repaymentRate));

        const finalReward = {
            xp: rewards.xp - xpRepayment,
            coins: rewards.coins - coinRepayment,
            cp: rewards.cp
        };

        // Update player data
        await playerStore.update(data => {
            const updatedData = { ...data };

            if (xpRepayment > 0) {
                updatedData.failureDebtXP = Math.max(0, (data.failureDebtXP || 0) - xpRepayment);
                messages.push(`💸 ${xpRepayment} XP used to pay off debt.`);
            }

            if (coinRepayment > 0) {
                updatedData.failureDebtCoins = Math.max(0, (data.failureDebtCoins || 0) - coinRepayment);
                messages.push(`💸 ${coinRepayment} coins used to pay off debt.`);
            }

            return updatedData;
        });

        return { finalReward, messages };
    }

    private async postPenaltyProcessing(player: PlayerData): Promise<void> {
        try {
            // Check for forgiveness events
            const forgivenessResults = await penaltyForgivenessService.checkForgivenessEvents();

            // Check if coaching session should be generated
            const shouldGenerateCoaching = await penaltyCoachingService.shouldGenerateNewSession();

            if (shouldGenerateCoaching) {
                // Generate new coaching session in background
                setTimeout(async () => {
                    try {
                        await penaltyCoachingService.generateCoachingSession();
                    } catch (error) {
                        console.error('Error generating coaching session:', error);
                    }
                }, 1000);
            }

            // Update analytics cache
            await penaltyAnalyticsService.getAnalytics();

        } catch (error) {
            console.error('Error in post-penalty processing:', error);
        }
    }

    async clearExpiredDebuffs(): Promise<void> {
        await playerStore.update(data => {
            const now = new Date();
            const activeDebuffs = (data.debuffs || []).filter(debuff =>
                !debuff.expiresAt || new Date(debuff.expiresAt) > now
            );

            if (activeDebuffs.length !== (data.debuffs || []).length) {
                return {
                    ...data,
                    debuffs: activeDebuffs
                };
            }

            return data;
        });
    }

    async getPenaltySummary(): Promise<{
        totalDebt: { xp: number; coins: number };
        reputation: number;
        activeDebuffs: number;
        insights: any[];
        forgivenessOpportunities: any[];
        coachingAvailable: boolean;
    }> {
        const player = await playerStore.get();
        if (!player) {
            return {
                totalDebt: { xp: 0, coins: 0 },
                reputation: 0,
                activeDebuffs: 0,
                insights: [],
                forgivenessOpportunities: [],
                coachingAvailable: false
            };
        }

        const activeDebuffs = (player.debuffs || []).filter(debuff =>
            !debuff.expiresAt || new Date(debuff.expiresAt) > new Date()
        );

        const [insights, forgivenessEvents, shouldGenerateCoaching] = await Promise.all([
            penaltyAnalyticsService.getInsights(),
            penaltyForgivenessService.getAvailableForgivenessEvents(),
            penaltyCoachingService.shouldGenerateNewSession()
        ]);

        return {
            totalDebt: {
                xp: player.failureDebtXP || 0,
                coins: player.failureDebtCoins || 0
            },
            reputation: player.questReputation || 0,
            activeDebuffs: activeDebuffs.length,
            insights,
            forgivenessOpportunities: forgivenessEvents,
            coachingAvailable: shouldGenerateCoaching
        };
    }

    private createNoOpPenaltyResult(originalReward: {
        xp: number;
        coins: number;
        cp: number;
    }): PenaltyResult {
        return {
            finalReward: { ...originalReward },
            messages: [],
            debtAccumulated: { xp: 0, coins: 0 },
            reputationLoss: 0,
            debuffsApplied: [],
        };
    }
}

export const penaltyService = PenaltyService.getInstance();
