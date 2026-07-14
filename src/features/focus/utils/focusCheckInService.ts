import { App, TFile } from 'obsidian';
import type { GamificationPluginSettings } from '../../../core/settings';

const STATE_PATH = '.obsidian/plugins/Gamification-into-Obsidian/focus-checkin-state.json';
export const FOCUS_CHECKIN_CHANGED_EVENT = 'gamification:focus-checkin-changed';

export interface FocusCheckInState {
	/** ISO timestamp of last completed check-in (starts the interval clock). */
	lastCheckInAt: string | null;
	/** When set, suppress the due button until this time. */
	snoozedUntil: string | null;
	/** Debug: force the check-in button to appear. */
	debugForceDue: boolean;
}

let cachedState: FocusCheckInState | null = null;

function defaultState(): FocusCheckInState {
	return {
		lastCheckInAt: new Date().toISOString(),
		snoozedUntil: null,
		debugForceDue: false,
	};
}

export function emitFocusCheckInChanged(): void {
	document.dispatchEvent(new CustomEvent(FOCUS_CHECKIN_CHANGED_EVENT));
}

export async function loadFocusCheckInState(app: App): Promise<FocusCheckInState> {
	if (cachedState) return cachedState;
	try {
		const exists = await app.vault.adapter.exists(STATE_PATH);
		if (!exists) {
			cachedState = defaultState();
			await saveFocusCheckInState(app, cachedState);
			return cachedState;
		}
		const raw = await app.vault.adapter.read(STATE_PATH);
		cachedState = { ...defaultState(), ...(JSON.parse(raw) as Partial<FocusCheckInState>) };
		return cachedState;
	} catch {
		cachedState = defaultState();
		return cachedState;
	}
}

export async function saveFocusCheckInState(app: App, state: FocusCheckInState): Promise<void> {
	cachedState = state;
	try {
		await app.vault.adapter.write(STATE_PATH, JSON.stringify(state, null, 2));
	} catch (error) {
		console.error('[FocusCheckIn] Failed to save state:', error);
	}
	emitFocusCheckInChanged();
}

export function getCheckInIntervalMs(settings: Pick<GamificationPluginSettings, 'focusCheckInIntervalMinutes'>): number {
	const minutes = settings.focusCheckInIntervalMinutes ?? 120;
	return Math.max(15, minutes) * 60 * 1000;
}

export function formatCheckInWindowLabel(
	settings: Pick<GamificationPluginSettings, 'focusCheckInIntervalMinutes'>
): string {
	const minutes = settings.focusCheckInIntervalMinutes ?? 120;
	if (minutes % 60 === 0) {
		const hours = minutes / 60;
		return hours === 1 ? '1 hour' : `${hours} hours`;
	}
	return `${minutes} minutes`;
}

export async function isFocusCheckInDue(
	app: App,
	settings: Pick<GamificationPluginSettings, 'enableFocusCheckIns' | 'focusCheckInIntervalMinutes'>
): Promise<boolean> {
	if (settings.enableFocusCheckIns === false) return false;

	const state = await loadFocusCheckInState(app);
	if (state.debugForceDue) return true;

	const now = Date.now();
	if (state.snoozedUntil) {
		const snoozeEnd = new Date(state.snoozedUntil).getTime();
		if (now < snoozeEnd) return false;
	}

	const anchor = state.lastCheckInAt ? new Date(state.lastCheckInAt).getTime() : now;
	return now - anchor >= getCheckInIntervalMs(settings);
}

export function getCheckInLogPath(
	settings: Pick<GamificationPluginSettings, 'focusCheckInLogPath'>
): string {
	return settings.focusCheckInLogPath?.trim() || 'CheckIns.md';
}

function formatLogTimestamp(date: Date): string {
	const y = date.getFullYear();
	const mo = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	const h = String(date.getHours()).padStart(2, '0');
	const mi = String(date.getMinutes()).padStart(2, '0');
	return `${y}-${mo}-${d} ${h}:${mi}`;
}

export async function appendCheckInLog(
	app: App,
	settings: Pick<GamificationPluginSettings, 'focusCheckInLogPath' | 'focusCheckInIntervalMinutes'>,
	text: string
): Promise<void> {
	const trimmed = text.trim();
	if (!trimmed) return;

	const path = getCheckInLogPath(settings);
	const windowLabel = formatCheckInWindowLabel(settings);
	const header = `## ${formatLogTimestamp(new Date())} — ${windowLabel} window\n\n`;
	const block = `${header}${trimmed}\n\n---\n`;

	const existing = app.vault.getAbstractFileByPath(path);
	let file: TFile;

	if (existing instanceof TFile) {
		file = existing;
	} else {
		const intro =
			'# Focus Check-Ins\n\n' +
			'Reflection log — what you did during each check-in window.\n\n';
		const created = await app.vault.create(path, intro);
		if (!(created instanceof TFile)) return;
		file = created;
	}

	const content = await app.vault.read(file);
	const suffix = content.endsWith('\n') ? '' : '\n';
	await app.vault.modify(file, `${content}${suffix}${block}`);
}

export async function completeFocusCheckIn(
	app: App,
	settings: GamificationPluginSettings,
	text: string
): Promise<void> {
	await appendCheckInLog(app, settings, text);
	const state = await loadFocusCheckInState(app);
	state.lastCheckInAt = new Date().toISOString();
	state.snoozedUntil = null;
	state.debugForceDue = false;
	await saveFocusCheckInState(app, state);
}

export async function skipFocusCheckIn(app: App): Promise<void> {
	const state = await loadFocusCheckInState(app);
	state.lastCheckInAt = new Date().toISOString();
	state.snoozedUntil = null;
	state.debugForceDue = false;
	await saveFocusCheckInState(app, state);
}

export async function snoozeFocusCheckIn(
	app: App,
	settings: Pick<GamificationPluginSettings, 'focusCheckInSnoozeMinutes'>
): Promise<void> {
	const minutes = settings.focusCheckInSnoozeMinutes ?? 30;
	const state = await loadFocusCheckInState(app);
	state.snoozedUntil = new Date(Date.now() + minutes * 60 * 1000).toISOString();
	state.debugForceDue = false;
	await saveFocusCheckInState(app, state);
}

/** Debug: make the check-in button appear without waiting for the interval. */
export async function debugSimulateCheckInDue(app: App): Promise<void> {
	const state = await loadFocusCheckInState(app);
	state.debugForceDue = true;
	await saveFocusCheckInState(app, state);
}

export function subscribeFocusCheckInChanges(callback: () => void): () => void {
	const handler = () => callback();
	document.addEventListener(FOCUS_CHECKIN_CHANGED_EVENT, handler);
	return () => document.removeEventListener(FOCUS_CHECKIN_CHANGED_EVENT, handler);
}
