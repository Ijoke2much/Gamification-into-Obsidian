import { penaltyService, PenaltyContext } from '../../../shared/services/penaltyService';
import { Quest } from './taskParser';
import { rewardService } from '../../../shared/services/rewardService';
;
import { currencyDisplay } from '../../../shared/services/currencyDisplayService';
import { pixelNotice } from '../../../shared/utils/noticeUtils';
import {
    getResolvedGameplayConfig,
    isPenaltyTypeEnabled,
} from '../../../shared/utils/gameplayConfig';

export class QuestPenaltyIntegration {

    /**
     * Enhanced quest completion that considers penalties
     */
    static async completeQuestWithPenaltyCheck(quest: Quest): Promise<{
        finalReward: { xp: number; coins: number; cp: number };
        penaltyApplied: boolean;
        messages: string[];
    }> {
        const originalReward = {
            xp: quest.xp || 0,
            coins: quest.coins || 0,
            cp: quest.cp || 0
        };

        let finalReward = { ...originalReward };
        let penaltyApplied = false;
        let messages: string[] = [];

        // Check if quest is overdue
        if (quest.due) {
            const now = new Date();
            const dueDate = new Date(quest.due);

            if (now > dueDate) {
                const daysOverdue = Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
                const gameplay = getResolvedGameplayConfig();
                const overdueEnabled = isPenaltyTypeEnabled(gameplay, 'quest_overdue');

                const penaltyResult = await penaltyService.applyPenalty({
                    type: 'quest_overdue',
                    questId: quest.id,
                    daysOverdue,
                    originalReward
                });

                finalReward = penaltyResult.finalReward;
                const hadMechanicalPenalty =
                    overdueEnabled &&
                    (penaltyResult.debuffsApplied.length > 0 ||
                        penaltyResult.debtAccumulated.xp > 0 ||
                        penaltyResult.debtAccumulated.coins > 0 ||
                        penaltyResult.reputationLoss > 0 ||
                        penaltyResult.finalReward.xp < originalReward.xp);

                if (hadMechanicalPenalty) {
                    penaltyApplied = true;
                    messages.push(...penaltyResult.messages);
                    pixelNotice(
                        `⚠️ Quest "${quest.title}" completed ${daysOverdue} days late! Penalties applied.`,
                        8000
                    );
                } else if (overdueEnabled) {
                    messages.push(
                        `Quest "${quest.title}" was ${daysOverdue} day(s) late (no penalty applied — check penalty settings).`
                    );
                }
            }
        }

        // Process debt repayment if player has debt
        const debtResult = await penaltyService.processDebtRepayment(finalReward);
        finalReward = debtResult.finalReward;
        messages.push(...debtResult.messages);

        // Apply final rewards through reward service
        await rewardService.applyRewards({
            xp: finalReward.xp,
            coins: finalReward.coins,
            cp: finalReward.cp,
            source: `quest:${quest.title}${penaltyApplied ? ':penalty-applied' : ''}`
        });

        return { finalReward, penaltyApplied, messages };
    }

    /**
     * Daily check for overdue quests
     */
    static async performDailyPenaltyCheck(quests: Quest[]): Promise<{
        overdueQuests: Quest[];
        totalPenalties: number;
        messages: string[];
    }> {
        const overdueQuests: Quest[] = [];
        const messages: string[] = [];

        // Check each quest for overdue status
        for (const quest of quests) {
            const penaltyCheck = this.shouldApplyPenalty(quest);
            if (penaltyCheck.shouldApply) {
                overdueQuests.push(quest);
            }
        }

        if (overdueQuests.length > 0) {
            messages.push(`⚠️ ${overdueQuests.length} overdue quest(s) found!`);
            const gameplay = getResolvedGameplayConfig();
            if (isPenaltyTypeEnabled(gameplay, 'quest_overdue')) {
                messages.push('Penalties will be applied when you complete these quests.');
                pixelNotice(
                    `⚠️ ${overdueQuests.length} overdue quests detected! Check your penalty status.`,
                    8000
                );
            } else {
                messages.push('Overdue — complete when you can (penalties are off in settings).');
            }
        }

        return {
            overdueQuests,
            totalPenalties: overdueQuests.length,
            messages
        };
    }

    /**
     * Check quest attachment penalties (for Pomodoro integration)
     */
    static async checkAttachmentPenalties(attachedQuestId: string, timeLimit: number, actualTime: number): Promise<void> {
        if (actualTime <= timeLimit) {
            return;
        }

        const gameplay = getResolvedGameplayConfig();
        if (!isPenaltyTypeEnabled(gameplay, 'quest_attachment_expired')) {
            return;
        }

        const originalReward = { xp: 50, coins: 5, cp: 10 };

        await penaltyService.applyPenalty({
            type: 'quest_attachment_expired',
            questId: attachedQuestId,
            originalReward
        });

        pixelNotice('🎯 Failed to complete attached quest within time limit! Focus penalty applied.', 5000);
    }

    /**
     * Check if a quest should have penalties applied based on its current status
     */
    static shouldApplyPenalty(quest: Quest): {
        shouldApply: boolean;
        penaltyType: 'overdue' | 'none';
        daysOverdue?: number;
    } {
        const gameplay = getResolvedGameplayConfig();
        if (!isPenaltyTypeEnabled(gameplay, 'quest_overdue')) {
            return { shouldApply: false, penaltyType: 'none' };
        }

        if (!quest.due || quest.completed) {
            return { shouldApply: false, penaltyType: 'none' };
        }

        const now = new Date();
        const dueDate = new Date(quest.due);

        if (now > dueDate) {
            const daysOverdue = Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
            return {
                shouldApply: true,
                penaltyType: 'overdue',
                daysOverdue
            };
        }

        return { shouldApply: false, penaltyType: 'none' };
    }

    /**
     * Calculate what the penalty would be for a quest without applying it
     */
    static calculatePenaltyPreview(quest: Quest): {
        wouldHavePenalty: boolean;
        penaltyPercent: number;
        rewardReduction: { xp: number; coins: number; cp: number };
        daysOverdue: number;
    } {
        const penaltyCheck = this.shouldApplyPenalty(quest);

        if (!penaltyCheck.shouldApply) {
            return {
                wouldHavePenalty: false,
                penaltyPercent: 0,
                rewardReduction: { xp: 0, coins: 0, cp: 0 },
                daysOverdue: 0
            };
        }

        const daysOverdue = penaltyCheck.daysOverdue || 0;
        const penaltyPercent = Math.min(0.9, daysOverdue * 0.1); // Max 90% reduction, 10% per day
        const originalReward = {
            xp: quest.xp || 0,
            coins: quest.coins || 0,
            cp: quest.cp || 0
        };

        const rewardReduction = {
            xp: Math.round(originalReward.xp * penaltyPercent),
            coins: Math.round(originalReward.coins * penaltyPercent),
            cp: Math.round(originalReward.cp * penaltyPercent)
        };

        return {
            wouldHavePenalty: true,
            penaltyPercent: penaltyPercent * 100,
            rewardReduction,
            daysOverdue
        };
    }

    /**
     * Get overdue quest warning message
     */
    static getOverdueWarningMessage(quest: Quest): string | null {
        const penaltyPreview = this.calculatePenaltyPreview(quest);

        if (!penaltyPreview.wouldHavePenalty) {
            return null;
        }

        return `⚠️ This quest is ${penaltyPreview.daysOverdue} day(s) overdue! ` +
            `Completion will result in ${Math.round(penaltyPreview.penaltyPercent)}% reward reduction ` +
            `(-${penaltyPreview.rewardReduction.xp} XP, -${penaltyPreview.rewardReduction.coins} ${currencyDisplay.getCurrencyNameLowercase()}).`;
    }
}
