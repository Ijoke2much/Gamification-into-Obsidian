import { playerStore } from '../state/playerStore';
import { showGameNotice } from './noticeUtils';
import { getLocalDateString } from '../../features/habits/utils/habitsUtils';

/** Extra coins when every habit due today is checked off (once per local day). */
export const HABIT_DAILY_CLEAR_BONUS_COINS = 40;

/** Extra coins when Now + Today quest inbox is cleared (once per local day). */
export const QUEST_DAILY_CLEAR_BONUS_COINS = 50;

const HABIT_KEY_PREFIX = 'gamified-habit-clear-bonus-';
const QUEST_KEY_PREFIX = 'gamified-quest-clear-bonus-';

function alreadyClaimed(prefix: string, day: string): boolean {
	try {
		return localStorage.getItem(`${prefix}${day}`) === '1';
	} catch {
		return false;
	}
}

function markClaimed(prefix: string, day: string): void {
	try {
		localStorage.setItem(`${prefix}${day}`, '1');
	} catch {
		/* ignore quota / private mode */
	}
}

/**
 * Call after a habit completion when today's scheduled list is fully done.
 * Returns true if the bonus was awarded.
 */
export async function tryClaimHabitDailyClearBonus(opts: {
	allDueTodayCleared: boolean;
	day?: string;
}): Promise<boolean> {
	if (!opts.allDueTodayCleared) return false;
	const day = opts.day ?? getLocalDateString();
	if (alreadyClaimed(HABIT_KEY_PREFIX, day)) return false;

	markClaimed(HABIT_KEY_PREFIX, day);
	await playerStore.addCoins(HABIT_DAILY_CLEAR_BONUS_COINS);
	showGameNotice(
		`🏆 Habits cleared! +${HABIT_DAILY_CLEAR_BONUS_COINS} bonus coins`,
		4000
	);
	return true;
}

/**
 * Call after a quest completion when Now+Today incomplete count hits zero.
 * Returns true if the bonus was awarded.
 */
export async function tryClaimQuestDailyClearBonus(opts: {
	todayInboxCleared: boolean;
	day?: string;
}): Promise<boolean> {
	if (!opts.todayInboxCleared) return false;
	const day = opts.day ?? getLocalDateString();
	if (alreadyClaimed(QUEST_KEY_PREFIX, day)) return false;

	markClaimed(QUEST_KEY_PREFIX, day);
	await playerStore.addCoins(QUEST_DAILY_CLEAR_BONUS_COINS);
	showGameNotice(
		`🏆 Today's quests cleared! +${QUEST_DAILY_CLEAR_BONUS_COINS} bonus coins`,
		4000
	);
	return true;
}
