export type FocusFoeId =
	| 'procrastinator'
	| 'deadline-wraith'
	| 'inbox-hydra'
	| 'sloth-ghost'
	| 'wandering-shade';

export interface FocusFoeDef {
	id: FocusFoeId;
	name: string;
	tag: string;
	flavor: string;
}

export type FocusSessionMode =
	| 'classic'
	| 'extended'
	| 'short'
	| 'custom'
	| 'deepWork'
	| 'quickFocus';

export interface FocusEncounterQuest {
	title: string;
	isTimedQuest?: boolean;
	subtasks?: Array<{ completed: boolean; text: string }>;
	filePath?: string;
	lineNumber?: number;
	rewards?: { xp?: number; coins?: number };
}

export interface FocusHpState {
	hp: number;
	maxHp: number;
	percent: number;
	downed: boolean;
	timeDamage: number;
	subtaskDamage: number;
}

export interface PendingFocusKill {
	title: string;
	filePath?: string;
	lineNumber?: number;
	isTimedQuest: boolean;
	foeId: FocusFoeId;
	sessionEndedAt: number;
}

const PENDING_KEY = 'gamify-focus-pending-kill';

export const FOCUS_FOES: Record<FocusFoeId, FocusFoeDef> = {
	procrastinator: {
		id: 'procrastinator',
		name: 'The Procrastinator',
		tag: 'MENTAL',
		flavor: 'A beast that feeds on delay. Time chips it. Confirm the kill.',
	},
	'deadline-wraith': {
		id: 'deadline-wraith',
		name: 'Deadline Wraith',
		tag: 'TIMED',
		flavor: 'The clock is a blade — but only Complete claims the spoils.',
	},
	'inbox-hydra': {
		id: 'inbox-hydra',
		name: 'Inbox Hydra',
		tag: 'DEEP',
		flavor: 'Heads fall when you commit. Subtasks are the cuts.',
	},
	'sloth-ghost': {
		id: 'sloth-ghost',
		name: 'Sloth Ghost',
		tag: 'BURST',
		flavor: 'Momentum hurts it. Short sessions still count.',
	},
	'wandering-shade': {
		id: 'wandering-shade',
		name: 'Wandering Shade',
		tag: 'FOCUS',
		flavor: 'Finished work starves it. Stay in the session.',
	},
};

export function pickFocusFoe(
	mode: FocusSessionMode,
	isTimedQuest?: boolean
): FocusFoeDef {
	if (isTimedQuest) return FOCUS_FOES['deadline-wraith'];
	if (mode === 'deepWork') return FOCUS_FOES['inbox-hydra'];
	if (mode === 'quickFocus' || mode === 'short') return FOCUS_FOES['sloth-ghost'];
	if (mode === 'extended') return FOCUS_FOES['wandering-shade'];
	return FOCUS_FOES.procrastinator;
}

/**
 * Time always wears the foe down (can reach 0).
 * Each completed subtask deals extra damage so the foe can drop early.
 */
export function computeFocusHp(
	elapsedRatio: number,
	subtasks?: Array<{ completed: boolean }>
): FocusHpState {
	const maxHp = 100;
	const ratio = Math.max(0, Math.min(1, elapsedRatio));
	const timeDamage = maxHp * ratio;

	const list = subtasks ?? [];
	const n = list.length;
	const done = list.filter((s) => s.completed).length;
	const subtaskDamage = n > 0 ? (maxHp * 0.35 * done) / n : 0;

	const hp = Math.max(0, Math.round((maxHp - timeDamage - subtaskDamage) * 10) / 10);
	const allSubtasksDone = n > 0 && done === n;
	const downed = hp <= 0 || allSubtasksDone;

	return {
		hp: downed ? 0 : hp,
		maxHp,
		percent: downed ? 0 : Math.round((hp / maxHp) * 100),
		downed,
		timeDamage: Math.round(timeDamage),
		subtaskDamage: Math.round(subtaskDamage),
	};
}

export function pendingKillMatches(
	pending: PendingFocusKill | null,
	quest: FocusEncounterQuest | null
): boolean {
	if (!pending || !quest) return false;
	if (pending.filePath && quest.filePath) {
		return (
			pending.filePath === quest.filePath &&
			(pending.lineNumber ?? 0) === (quest.lineNumber ?? 0)
		);
	}
	return pending.title.trim().toLowerCase() === quest.title.trim().toLowerCase();
}

export function loadPendingFocusKill(): PendingFocusKill | null {
	try {
		const raw = localStorage.getItem(PENDING_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as PendingFocusKill;
		if (!parsed?.title || !parsed.sessionEndedAt) return null;
		return parsed;
	} catch {
		return null;
	}
}

export function savePendingFocusKill(pending: PendingFocusKill): void {
	try {
		localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
	} catch {
		// ignore quota / private mode
	}
}

export function clearPendingFocusKill(): void {
	try {
		localStorage.removeItem(PENDING_KEY);
	} catch {
		// ignore
	}
}
