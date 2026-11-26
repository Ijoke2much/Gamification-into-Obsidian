export type NoticePriority = 'critical' | 'high' | 'normal' | 'low';
export type NoticeLogKind = 'field' | 'system' | 'game';

export interface NoticeLogEntry {
	id: string;
	at: string;
	text: string;
	kind: NoticeLogKind;
	priority: NoticePriority;
}

const STORAGE_KEY = 'gamification-notice-log';
const MAX_ENTRIES = 200;
const RETAIN_DAYS = 2;

let entries: NoticeLogEntry[] = [];
const listeners = new Set<() => void>();
let loaded = false;

function localDayKey(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

function prune(list: NoticeLogEntry[]): NoticeLogEntry[] {
	const cutoff = new Date();
	cutoff.setDate(cutoff.getDate() - RETAIN_DAYS);
	cutoff.setHours(0, 0, 0, 0);
	const cutoffMs = cutoff.getTime();
	return list.filter((entry) => Date.parse(entry.at) >= cutoffMs).slice(-MAX_ENTRIES);
}

function persist(): void {
	try {
		if (typeof localStorage === 'undefined') return;
		localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
	} catch {
		/* ignore quota / private mode */
	}
}

function ensureLoaded(): void {
	if (loaded) return;
	loaded = true;
	try {
		if (typeof localStorage === 'undefined') return;
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return;
		const parsed = JSON.parse(raw) as NoticeLogEntry[];
		if (!Array.isArray(parsed)) return;
		entries = prune(
			parsed.filter(
				(item) =>
					item &&
					typeof item.id === 'string' &&
					typeof item.at === 'string' &&
					typeof item.text === 'string'
			)
		);
	} catch {
		entries = [];
	}
}

function notify(): void {
	listeners.forEach((listener) => listener());
}

export function recordNotice(text: string, kind: NoticeLogKind, priority: NoticePriority): void {
	const trimmed = text.trim();
	if (!trimmed) return;
	ensureLoaded();
	entries = prune([
		...entries,
		{
			id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
			at: new Date().toISOString(),
			text: trimmed,
			kind,
			priority,
		},
	]);
	persist();
	notify();
}

export function getTodaysNotices(): NoticeLogEntry[] {
	ensureLoaded();
	const today = localDayKey(new Date());
	return entries
		.filter((entry) => localDayKey(new Date(entry.at)) === today)
		.slice()
		.reverse();
}

export function clearTodaysNotices(): void {
	ensureLoaded();
	const today = localDayKey(new Date());
	entries = entries.filter((entry) => localDayKey(new Date(entry.at)) !== today);
	persist();
	notify();
}

export function subscribeNoticeLog(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}
