import type { App } from 'obsidian';
import { TFile } from 'obsidian';
import type { Quest } from './taskParser';
import { findQuestLineIndex } from './questProjectUtils';
import {
	awardQuestRewards,
	undoBossFileQuestCompletion,
	undoJourneyQuestCompletion,
	type QuestRewardSettings,
} from '../../../shared/utils/questCompletionPipeline';
import { buildCompletionKey, markCompletionRewarded } from './completionLedger';
import {
	applySharedNoteCompletion,
	findPrimaryTaskLineIndex,
	hydrateQuestRewardsFromNote,
	isSingleQuestNoteContent,
	isStatusDone,
	isTaskLineDone,
	isTaskLineOpen,
	markTaskLineComplete,
	markTaskLineOpen,
	noteCompletionKey,
	parseTaskNotesFrontmatter,
} from './taskNotesAdapter';

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
	const sharedNote = isSingleQuestNoteContent(content);
	const fm = parseTaskNotesFrontmatter(content);
	const lines = content.split('\n');
	let index = findQuestLineIndex(lines, quest);
	if (index === -1 && sharedNote) index = findPrimaryTaskLineIndex(lines, true);

	if (index === -1 && !sharedNote) {
		return { ...EMPTY_RESULT, failureReason: 'line_not_found' };
	}

	const lineDone = index >= 0 && isTaskLineDone(lines[index]);
	const statusDone = sharedNote && isStatusDone(fm?.status);
	if (lineDone || statusDone) {
		if (sharedNote) {
			const synced = applySharedNoteCompletion(content, true);
			if (synced !== content) {
				await app.vault.modify(file, synced);
				return { changed: true, awardedXP: 0, awardedCP: 0, awardedCoins: 0 };
			}
		}
		return { ...EMPTY_RESULT, failureReason: 'already_completed' };
	}

	let next = content;
	if (sharedNote) {
		next = applySharedNoteCompletion(content, true);
	} else {
		if (index < 0) {
			return { ...EMPTY_RESULT, failureReason: 'line_not_found' };
		}
		lines[index] = markTaskLineComplete(lines[index]);
		next = lines.join('\n');
	}
	const lineNumber = quest.lineNumber ?? (index >= 0 ? index + 1 : 1);
	await app.vault.modify(file, next);
	await markCompletionRewarded(app, buildCompletionKey(path, lineNumber));
	if (sharedNote) {
		await markCompletionRewarded(app, noteCompletionKey(path));
	}

	if (!awardRewards) {
		return { changed: true, awardedXP: 0, awardedCP: 0, awardedCoins: 0 };
	}

	const taskLine = index >= 0 ? (content.split('\n')[index] ?? lines[index]) : undefined;
	const rewardedQuest = hydrateQuestRewardsFromNote(quest, {
		app,
		file,
		content,
		taskLine,
	});
	const result = await awardQuestRewards(app.vault, rewardedQuest, rewardSettings, app);
	try {
		const { grantRolledCustomLoot } = await import('./questCustomRewardPool');
		await grantRolledCustomLoot(app, rewardedQuest);
	} catch (error) {
		console.error('[Quest persist] Custom rewards failed:', error);
	}
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
	const sharedNote = isSingleQuestNoteContent(content);
	const fm = parseTaskNotesFrontmatter(content);
	const lines = content.split('\n');
	let index = findQuestLineIndex(lines, quest);
	if (index === -1 && sharedNote) index = findPrimaryTaskLineIndex(lines);

	if (index === -1 && !sharedNote) {
		return { changed: false, failureReason: 'line_not_found' };
	}

	const lineOpen = index >= 0 && isTaskLineOpen(lines[index]);
	const statusOpen = !sharedNote || !isStatusDone(fm?.status);
	const lineNotDone = index === -1 || lineOpen;
	if (lineNotDone && statusOpen) {
		return { changed: false, failureReason: 'already_open' };
	}

	if (sharedNote) {
		await app.vault.modify(file, applySharedNoteCompletion(content, false));
	} else {
		if (index < 0) {
			return { changed: false, failureReason: 'line_not_found' };
		}
		lines[index] = markTaskLineOpen(lines[index]);
		await app.vault.modify(file, lines.join('\n'));
	}

	const journeyUndo = undoJourneyQuestCompletion(quest);
	const bossUndo = await undoBossFileQuestCompletion(app, quest);
	return {
		changed: true,
		...(journeyUndo.reverted ? { journeyHpRestored: journeyUndo.damage } : {}),
		...(bossUndo.reverted ? { bossRaidHpRestored: bossUndo.hpRestored } : {}),
	};
}
