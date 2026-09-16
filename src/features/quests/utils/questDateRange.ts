/** Local YYYY-MM-DD from a Date (not UTC ISO). */
export function toLocalISODate(date: Date): string {
	const y = date.getFullYear();
	const m = `${date.getMonth() + 1}`.padStart(2, '0');
	const d = `${date.getDate()}`.padStart(2, '0');
	return `${y}-${m}-${d}`;
}

export function datePart(iso?: string | null): string | undefined {
	if (!iso) return undefined;
	const p = iso.trim().split('T')[0];
	return /^\d{4}-\d{2}-\d{2}$/.test(p) ? p : undefined;
}

export function addLocalDays(iso: string, days: number): string {
	const [y, m, d] = iso.split('-').map((n) => parseInt(n, 10));
	const next = new Date(y, (m || 1) - 1, d || 1);
	next.setDate(next.getDate() + days);
	return toLocalISODate(next);
}

export function daysBetween(fromIso: string, toIso: string): number {
	const a = new Date(`${fromIso}T00:00:00`);
	const b = new Date(`${toIso}T00:00:00`);
	return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export type DatedQuest = {
	due?: string;
	start?: string;
	today?: boolean;
};

/** Inclusive start..due (swaps if start is after due). */
export function questRangeParts(quest: DatedQuest): { start?: string; due?: string } {
	const due = datePart(quest.due);
	const start = datePart(quest.start);
	if (!due && !start) return {};
	if (!due) return { start, due: start };
	if (!start) return { start: due, due };
	if (start <= due) return { start, due };
	return { start: due, due: start };
}

export function isMultiDayQuest(quest: DatedQuest): boolean {
	const { start, due } = questRangeParts(quest);
	return Boolean(start && due && start !== due);
}

export function isQuestOnDate(
	quest: DatedQuest,
	iso: string,
	todayISO?: string
): boolean {
	const { start, due } = questRangeParts(quest);
	if (start && due) return iso >= start && iso <= due;
	if (quest.today && todayISO && iso === todayISO) return true;
	return false;
}

export function eachIsoDayInclusive(start: string, due: string): string[] {
	const { start: a, due: b } = questRangeParts({ start, due });
	if (!a || !b) return [];
	const out: string[] = [];
	let cursor = a;
	while (cursor <= b && out.length < 366) {
		out.push(cursor);
		cursor = addLocalDays(cursor, 1);
	}
	return out;
}

export function shiftQuestRange(
	quest: DatedQuest,
	days: number
): { start?: string; due?: string } {
	const { start, due } = questRangeParts(quest);
	if (!due) return {};
	const time = quest.due?.includes('T') ? quest.due.split('T')[1] : undefined;
	const newDueDay = addLocalDays(due, days);
	const newStart = start ? addLocalDays(start, days) : undefined;
	return {
		start: newStart && newStart !== newDueDay ? newStart : undefined,
		due: time ? `${newDueDay}T${time}` : newDueDay,
	};
}

export const QUEST_SCHEDULE_DRAG_MIME = 'application/x-gamify-quest-id';

export function minutesToClock(minutesFromMidnight: number): string {
	const clamped = Math.max(0, Math.min(24 * 60 - 1, Math.floor(minutesFromMidnight)));
	const h = Math.floor(clamped / 60);
	const m = clamped % 60;
	return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function stripScheduleMarkers(line: string): string {
	return line
		.replace(/📅\s*\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?/g, '')
		.replace(/🛫\s*\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?/g, '')
		.replace(/due::\s*\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?/gi, '')
		.replace(/due:\s*\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?/gi, '')
		.replace(/start::\s*\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?/gi, '')
		.replace(/start:\s*\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?/gi, '');
}

/** Insert Tasks-style 🛫 start and 📅 due before `#gamified-task`. */
export function injectScheduleEmojis(line: string, dueISO: string, startDay?: string): string {
	const dueDay = dueISO.split('T')[0];
	const startPart = startDay && startDay !== dueDay ? `🛫${startDay} ` : '';
	const insert = `${startPart}📅${dueISO} `;
	const gamifiedIdx = line.indexOf('#gamified-task');
	if (gamifiedIdx !== -1) {
		return `${line.slice(0, gamifiedIdx)}${insert}${line.slice(gamifiedIdx)}`;
	}
	return `${line} ${insert}`.replace(/\s{2,}/g, ' ').trim();
}
