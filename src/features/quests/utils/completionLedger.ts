import type { App } from 'obsidian';

const LEDGER_PATH = '.obsidian/plugins/Gamification-into-Obsidian/completion-ledger.json';

export type CompletionLedger = Record<string, string>;

let cachedLedger: CompletionLedger | null = null;

export function buildCompletionKey(filePath: string, lineNumber?: number, suffix = ''): string {
	const line = lineNumber != null ? `:${lineNumber}` : '';
	const extra = suffix ? `:${suffix}` : '';
	return `${filePath}${line}${extra}`;
}

export async function loadCompletionLedger(app: App): Promise<CompletionLedger> {
	if (cachedLedger) return cachedLedger;
	try {
		const exists = await app.vault.adapter.exists(LEDGER_PATH);
		if (!exists) {
			cachedLedger = {};
			return cachedLedger;
		}
		const raw = await app.vault.adapter.read(LEDGER_PATH);
		cachedLedger = JSON.parse(raw) as CompletionLedger;
		return cachedLedger;
	} catch {
		cachedLedger = {};
		return cachedLedger;
	}
}

export async function saveCompletionLedger(app: App, ledger: CompletionLedger): Promise<void> {
	cachedLedger = ledger;
	try {
		await app.vault.adapter.write(LEDGER_PATH, JSON.stringify(ledger, null, 2));
	} catch (error) {
		console.error('[CompletionLedger] Failed to save:', error);
	}
}

export async function isCompletionRewarded(app: App, key: string): Promise<boolean> {
	const ledger = await loadCompletionLedger(app);
	return Boolean(ledger[key]);
}

export async function markCompletionRewarded(app: App, key: string): Promise<void> {
	const ledger = await loadCompletionLedger(app);
	ledger[key] = new Date().toISOString();
	await saveCompletionLedger(app, ledger);
}

export function clearCompletionLedgerCache(): void {
	cachedLedger = null;
}
