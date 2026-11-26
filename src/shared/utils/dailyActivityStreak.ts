import { getLocalDateString } from '../../features/habits/utils/habitsUtils';

const STORAGE_KEY = 'gamified-daily-activity-dates';
const MAX_DATES = 120;

function loadDates(): string[] {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw) as unknown;
		if (!Array.isArray(parsed)) return [];
		return parsed.filter((d): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d));
	} catch {
		return [];
	}
}

function saveDates(dates: string[]): void {
	try {
		const trimmed = [...new Set(dates)].sort().slice(-MAX_DATES);
		localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
	} catch {
		/* ignore quota / private mode */
	}
}

/** Mark today as an active day (quest/habit/focus). Idempotent per local day. */
export function recordDailyActivity(day?: string): void {
	const today = day ?? getLocalDateString();
	const dates = loadDates();
	if (dates.includes(today)) return;
	dates.push(today);
	saveDates(dates);
}

/**
 * Consecutive active days ending on today or yesterday
 * (yesterday allows "still on streak" before today's first action).
 */
export function getDailyActivityStreak(day?: string): number {
	const today = day ?? getLocalDateString();
	const datesSet = new Set(loadDates());
	if (datesSet.size === 0) return 0;

	const cursor = new Date(`${today}T00:00:00`);
	let cursorStr = today;

	// If today isn't recorded yet, start from yesterday
	if (!datesSet.has(today)) {
		cursor.setDate(cursor.getDate() - 1);
		cursorStr = getLocalDateString(cursor);
		if (!datesSet.has(cursorStr)) return 0;
	}

	let streak = 0;
	while (datesSet.has(cursorStr)) {
		streak += 1;
		cursor.setDate(cursor.getDate() - 1);
		cursorStr = getLocalDateString(cursor);
	}
	return streak;
}
