import type { App } from 'obsidian';
import { TFile } from 'obsidian';
import type { Quest } from './taskParser';
import { appendCompletedDate, removeCompletedDate } from './taskParser';
import { findQuestLineIndex } from './questProjectUtils';
import {
	awardQuestRewards,
	undoBossFileQuestCompletion,
	undoJourneyQuestCompletion,
	type QuestRewardSettings,
} from '../../../shared/utils/questCompletionPipeline';
import { buildCompletionKey, markCompletionRewarded } from './completionLedger';

export type QuestPersistAction = 'complete' | 'turn_in' | 'abandon';

export type QuestPersistFailureReason = 'file_not_found' | 'line_not_found' | 'already_completed';

export interface QuestPersistResult {
	changed: boolean;
	awardedXP: number;
	awardedCP: number;
	awardedCoins: number;
	failureReason?: QuestPersistFailureReason;
	journeyDamage?: number;
	journeyDefeated?: boolean;
	journeyGrazed?: boolean;
	journeyVictoryNotice?: string;
}

const EMPTY_RESULT: QuestPersistResult = {
	changed: false,
	awardedXP: 0,
	awardedCP: 0,
	awardedCoins: 0,
};

/** User-facing copy when markdown persistence fails or is a no-op. */
export function describeQuestPersistFailure(
	reason: QuestPersistFailureReason,
	quest: Quest,
	action: QuestPersistAction
): string {
	const file = quest.filePath?.trim() || 'GamifiedTasks.md';
	const title = quest.title?.trim() || 'quest';

	switch (reason) {
		case 'file_not_found':
			if (action === 'turn_in') {
				return `Contract note not found (${file}). Check Settings → Guild contracts file path.`;
			}
			return `Quest file not found: ${file}`;
		case 'line_not_found':
			if (action === 'turn_in') {
				return `Could not find "${title}" in ${file}. Open the contract note and confirm the header line is still there.`;
			}
			if (action === 'abandon') {
				return `Could not find "${title}" in ${file} to close the contract.`;
			}
			return `Could not find "${title}" in ${file} — the line may have moved or been edited.`;
		case 'already_completed':
			if (action === 'turn_in') return 'Contract was already turned in.';
			if (action === 'abandon') return 'Contract is already closed.';
			return 'Quest is already complete.';
	}
}

export async function persistQuestCompletion(
	app: App,
	quest: Quest,
	awardRewards: boolean,
	rewardSettings?: QuestRewardSettings
): Promise<QuestPersistResult> {
	const path = quest.filePath?.trim() || 'GamifiedTasks.md';
	const file = app.vault.getAbstractFileByPath(path);
	if (!(file instanceof TFile)) {
		return { ...EMPTY_RESULT, failureReason: 'file_not_found' };
	}

	const content = await app.vault.read(file);
	const lines = content.split('\n');
	const index = findQuestLineIndex(lines, quest);
	if (index === -1) {
		return { ...EMPTY_RESULT, failureReason: 'line_not_found' };
	}
	if (lines[index].includes('- [x]')) {
		return { ...EMPTY_RESULT, failureReason: 'already_completed' };
	}

	lines[index] = appendCompletedDate(lines[index].replace('- [ ]', '- [x]'));
	const lineNumber = quest.lineNumber ?? index + 1;
	await markCompletionRewarded(app, buildCompletionKey(path, lineNumber));
	await app.vault.modify(file, lines.join('\n'));

	if (!awardRewards) {
		return { changed: true, awardedXP: 0, awardedCP: 0, awardedCoins: 0 };
	}

	const result = await awardQuestRewards(app.vault, quest, rewardSettings, app);
	return { changed: true, ...result };
}

export type QuestUncompleteFailureReason = 'file_not_found' | 'line_not_found' | 'already_open';

export interface QuestUncompleteResult {
	changed: boolean;
	failureReason?: QuestUncompleteFailureReason;
	journeyHpRestored?: number;
	bossRaidHpRestored?: number;
}

export function describeQuestUncompleteFailure(
	reason: QuestUncompleteFailureReason,
	quest: Quest
): string {
	const file = quest.filePath?.trim() || 'GamifiedTasks.md';
	const title = quest.title?.trim() || 'quest';

	switch (reason) {
		case 'file_not_found':
			return `Quest file not found: ${file}`;
		case 'line_not_found':
			return `Could not find "${title}" in ${file} to reopen.`;
		case 'already_open':
			return `"${title}" is already open.`;
	}
}

export async function persistQuestUncomplete(
	app: App,
	quest: Quest
): Promise<QuestUncompleteResult> {
	const path = quest.filePath?.trim() || 'GamifiedTasks.md';
	const file = app.vault.getAbstractFileByPath(path);
	if (!(file instanceof TFile)) {
		return { changed: false, failureReason: 'file_not_found' };
	}

	const content = await app.vault.read(file);
	const lines = content.split('\n');
	const index = findQuestLineIndex(lines, quest);
	if (index === -1) {
		return { changed: false, failureReason: 'line_not_found' };
	}
	if (lines[index].includes('- [ ]')) {
		return { changed: false, failureReason: 'already_open' };
	}

	lines[index] = removeCompletedDate(lines[index].replace('- [x]', '- [ ]'));
	await app.vault.modify(file, lines.join('\n'));

	const journeyUndo = undoJourneyQuestCompletion(quest);
	const bossUndo = await undoBossFileQuestCompletion(app, quest);
	return {
		changed: true,
		...(journeyUndo.reverted ? { journeyHpRestored: journeyUndo.damage } : {}),
		...(bossUndo.reverted ? { bossRaidHpRestored: bossUndo.hpRestored } : {}),
	};
}
