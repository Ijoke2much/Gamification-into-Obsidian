/**
 * Calendar-day reward cut for overdue quests.
 * 10% off per day late, stopping at 10% of the original reward.
 * A date-only due, and a timed due later the same day, stay full until the next calendar day.
 */

import type { GamificationPluginSettings } from '../../core/settings';
import { datePart, daysBetween, toLocalISODate } from '../../features/quests/utils/questDateRange';
import {
	getPluginSettingsFromApp,
	isPenaltyTypeEnabled,
	resolveGameplayConfig,
} from './gameplayConfig';

export const OVERDUE_REWARD_DAILY_CUT = 0.1;
export const OVERDUE_REWARD_MAX_CUT = 0.9;

export interface RewardTriple {
	xp: number;
	cp: number;
	coins: number;
}

export interface PayableQuestRewards extends RewardTriple {
	daysLate: number;
	reduced: boolean;
	originalXp: number;
	originalCp: number;
	originalCoins: number;
}

type RewardQuest = {
	due?: string;
	completed?: boolean;
	xp?: number;
	cp?: number;
	coins?: number;
};

/** Whole local calendar days after the due day. Same-day lateness is 0. */
export function calendarDaysPastDue(due: string | undefined, now: Date = new Date()): number {
	const dueDay = datePart(due);
	if (!dueDay) return 0;
	const late = daysBetween(dueDay, toLocalISODate(now));
	return late > 0 ? late : 0;
}

/** Fraction of the original reward still paid. */
export function overdueKeepFraction(daysLate: number): number {
	if (daysLate <= 0) return 1;
	const cut = Math.min(OVERDUE_REWARD_MAX_CUT, daysLate * OVERDUE_REWARD_DAILY_CUT);
	return 1 - cut;
}

export function overdueRewardCutEnabled(
	settings?: Partial<GamificationPluginSettings> | null
): boolean {
	return isPenaltyTypeEnabled(resolveGameplayConfig(settings), 'quest_overdue');
}

/** Keep at least 1 when a positive reward would round down to 0. */
export function scaleStoredReward(amount: number, keep: number): number {
	if (!Number.isFinite(amount) || amount <= 0) return 0;
	if (keep >= 1) return amount;
	const scaled = Math.round(amount * keep);
	return scaled > 0 ? scaled : 1;
}

export function baseQuestRewardAmounts(quest: RewardQuest): RewardTriple {
	const xp = Math.max(0, Number.isFinite(quest.xp) ? Number(quest.xp) : 0);
	const cp = Math.max(0, Number.isFinite(quest.cp) ? Number(quest.cp) : 0);
	const coins = Math.max(
		0,
		Number.isFinite(quest.coins) ? Number(quest.coins) : Math.round(xp * 0.2)
	);
	return { xp, cp, coins };
}

export function payableQuestRewards(
	quest: RewardQuest,
	settings?: Partial<GamificationPluginSettings> | null,
	now: Date = new Date(),
	options?: { ignoreCompleted?: boolean }
): PayableQuestRewards {
	const original = baseQuestRewardAmounts(quest);
	const alreadyDone = !options?.ignoreCompleted && quest.completed === true;
	const daysLate = alreadyDone ? 0 : calendarDaysPastDue(quest.due, now);
	const reduced = daysLate > 0 && overdueRewardCutEnabled(settings);
	const keep = reduced ? overdueKeepFraction(daysLate) : 1;
	return {
		xp: scaleStoredReward(original.xp, keep),
		cp: scaleStoredReward(original.cp, keep),
		coins: scaleStoredReward(original.coins, keep),
		daysLate: reduced ? daysLate : 0,
		reduced,
		originalXp: original.xp,
		originalCp: original.cp,
		originalCoins: original.coins,
	};
}

/** Card display. Uses live plugin settings when none are passed. */
export function displayedQuestRewards(
	quest: RewardQuest,
	settings?: Partial<GamificationPluginSettings> | null,
	now: Date = new Date()
): PayableQuestRewards {
	return payableQuestRewards(quest, settings ?? getPluginSettingsFromApp() ?? null, now);
}

export function overdueRewardHint(
	daysLate: number,
	original: number,
	payable: number,
	unit: string
): string | undefined {
	if (daysLate <= 0 || original === payable) return undefined;
	const dayLabel = daysLate === 1 ? '1 day late' : `${daysLate} days late`;
	return `${dayLabel}. Was ${original} ${unit}, pays ${payable}.`;
}
