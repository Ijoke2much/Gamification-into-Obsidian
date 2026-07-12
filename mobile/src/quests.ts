import { TFile, type Vault } from 'obsidian';
import type { MobileQuestItem, MobileSettings, QuestCompleteResult } from './types';
import { awardPlayerRewards } from './player';
import { parseQuestLine } from './questMeta';

const GAMIFIED_TASK_TAG = '#gamified-task';

export async function loadQuests(
	vault: Vault,
	settings: MobileSettings
): Promise<MobileQuestItem[]> {
	const file = vault.getAbstractFileByPath(settings.defaultQuestFilePath);
	if (!(file instanceof TFile)) {
		return [];
	}

	const content = await vault.read(file);
	const lines = content.split('\n');
	const quests: MobileQuestItem[] = [];

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		if (!line.includes(GAMIFIED_TASK_TAG)) continue;
		const parsed = parseQuestLine(line, i, {
			xp: settings.xpPerTask,
			coins: settings.coinPerTask,
		});
		if (!parsed) continue;
		if (settings.hideCompletedQuests && parsed.completed) continue;
		quests.push(parsed);
	}

	return quests;
}

export async function completeQuest(
	vault: Vault,
	settings: MobileSettings,
	quest: MobileQuestItem
): Promise<QuestCompleteResult> {
	if (quest.completed) {
		throw new Error('Quest is already completed');
	}

	const file = vault.getAbstractFileByPath(settings.defaultQuestFilePath);
	if (!(file instanceof TFile)) {
		throw new Error(`Quest file not found: ${settings.defaultQuestFilePath}`);
	}

	const lines = (await vault.read(file)).split('\n');
	if (quest.lineIndex < 0 || quest.lineIndex >= lines.length) {
		throw new Error('Quest line is out of date. Refresh and try again.');
	}

	const currentLine = lines[quest.lineIndex];
	if (!currentLine.includes(GAMIFIED_TASK_TAG) || !/^- \[ \]/.test(currentLine)) {
		throw new Error('Quest was already completed or changed in another view.');
	}

	let updatedLine = currentLine.replace('- [ ]', '- [x]');
	if (!updatedLine.includes('✅')) {
		updatedLine = `${updatedLine} ✅ ${formatDate()}`;
	}
	lines[quest.lineIndex] = updatedLine;
	await vault.modify(file, lines.join('\n'));

	const award = await awardPlayerRewards(vault, settings, quest.xp, quest.coins, quest.cp, {
		energyCost: quest.energyCost,
		skills: quest.skills,
		stats: quest.stats,
	});

	return {
		xp: quest.xp,
		coins: quest.coins,
		cp: quest.cp,
		leveledUp: award.leveledUp,
		newLevel: award.leveledUp ? award.newLevel : undefined,
		title: quest.title,
		skillLevelUps: award.skillLevelUps,
	};
}

function formatDate(date = new Date()): string {
	return date.toISOString().slice(0, 10);
}

export function countOpenQuests(quests: MobileQuestItem[]): number {
	return quests.filter((q) => !q.completed).length;
}
