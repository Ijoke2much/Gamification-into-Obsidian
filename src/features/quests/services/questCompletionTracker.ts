// Quest Completion Tracker Service
// Detects quest completion from vault file changes (plugin UI, TaskForge, TaskNotes, etc.)

import { App, TFile } from 'obsidian';
import type { GamificationPluginSettings } from '../../../core/settings';
import {
	resolvePluginSettings,
	emitQuestCompletionFeedback,
	parseEnergyCostFromMarkdownLine,
	awardQuestRewards,
	type QuestRewardResult,
} from '../../../shared/utils/questCompletionPipeline';
import { parseActivityProfileFromTaskLine } from '../../../shared/utils/questWellbeingProfiles';
import { getPluginSettingsFromApp } from '../../../shared/utils/gameplayConfig';
import {
	buildCompletionKey,
	isCompletionRewarded,
	markCompletionRewarded,
} from '../utils/completionLedger';
import {
	buildQuestFromTaskNotesContent,
	detectTaskNotesStatusCompletion,
	isGamifiedTaskContent,
	isTaskNotesContent,
} from '../utils/taskNotesAdapter';
import {
	cacheAllWatchedFiles,
	shouldWatchFileForCompletions,
} from '../utils/questWatchPaths';
import {
	openCompletionSummaryModal,
	type CompletedQuestSummaryItem,
} from '../modals/CompletionSummaryModal';
import type { Quest } from '../utils/taskParser';

export class QuestCompletionTracker {
	private app: App;
	private fileContentsCache: Map<string, string> = new Map();
	private isTracking = false;
	private modifyHandler: (file: TFile) => void;
	private pendingBatch: CompletedQuestSummaryItem[] = [];
	private batchTimer: ReturnType<typeof setTimeout> | null = null;

	constructor(app: App) {
		this.app = app;
		this.modifyHandler = (file: TFile) => {
			void this.handleFileModified(file);
		};
	}

	private getSettings(): GamificationPluginSettings {
		return (getPluginSettingsFromApp(this.app) ?? {}) as GamificationPluginSettings;
	}

	startTracking(): void {
		if (this.isTracking) return;

		this.isTracking = true;
		console.log('[QuestTracker] Starting quest completion tracking...');

		this.app.vault.on('modify', this.modifyHandler as never);
		void this.populateInitialCache();
	}

	stopTracking(): void {
		if (!this.isTracking) return;

		this.isTracking = false;
		this.app.vault.off('modify', this.modifyHandler as never);
		this.fileContentsCache.clear();
		if (this.batchTimer) clearTimeout(this.batchTimer);

		console.log('[QuestTracker] Stopped quest completion tracking');
	}

	/** Re-cache watched files after settings change. */
	async refreshWatchList(): Promise<void> {
		this.fileContentsCache.clear();
		await this.populateInitialCache();
	}

	private async handleFileModified(file: TFile): Promise<void> {
		const settings = this.getSettings();
		if (settings.externalCompletionSync === false) return;
		if (file.extension !== 'md') return;
		if (!shouldWatchFileForCompletions(file.path, settings)) return;

		try {
			const newContent = await this.app.vault.read(file);
			const oldContent = this.fileContentsCache.get(file.path) ?? '';

			this.fileContentsCache.set(file.path, newContent);

			await this.detectQuestCompletions(file.path, oldContent, newContent);
		} catch (error) {
			console.error(`[QuestTracker] Error processing ${file.path}:`, error);
		}
	}

	private async detectQuestCompletions(
		filePath: string,
		oldContent: string,
		newContent: string
	): Promise<void> {
		const settings = this.getSettings();
		const completions: Array<{ key: string; quest: Quest; title: string; lineNumber: number }> = [];

		const oldLines = oldContent.split('\n');
		const newLines = newContent.split('\n');

		for (let i = 0; i < Math.max(oldLines.length, newLines.length); i++) {
			const oldLine = oldLines[i] || '';
			const newLine = newLines[i] || '';

			if (!this.isInlineTaskCompletion(oldLine, newLine)) continue;

			const lineNumber = i + 1;
			const key = buildCompletionKey(filePath, lineNumber);
			if (await isCompletionRewarded(this.app, key)) continue;

			const quest = this.buildQuestFromLine(newLine, filePath, lineNumber);
			if (!quest) continue;

			completions.push({ key, quest, title: quest.title, lineNumber });
		}

		if (
			settings.taskNotesCompatibility !== false &&
			detectTaskNotesStatusCompletion(oldContent, newContent)
		) {
			const key = buildCompletionKey(filePath, undefined, 'status');
			if (!(await isCompletionRewarded(this.app, key))) {
				const eligible =
					isGamifiedTaskContent(newContent) ||
					isTaskNotesContent(newContent);
				if (eligible) {
					const quest = buildQuestFromTaskNotesContent(newContent, filePath);
					if (quest) {
						completions.push({ key, quest, title: quest.title, lineNumber: quest.lineNumber ?? 1 });
					}
				}
			}
		}

		for (const item of completions) {
			await this.processQuestCompletion(item.quest, item.key, item.title, filePath, item.lineNumber);
		}
	}

	private isInlineTaskCompletion(oldLine: string, newLine: string): boolean {
		if (!newLine.includes('#gamified-task')) return false;
		return oldLine.includes('- [ ]') && newLine.includes('- [x]');
	}

	private buildQuestFromLine(taskLine: string, filePath: string, lineNumber: number): Quest | null {
		const title = this.extractTitle(taskLine);
		if (!title) return null;

		const xp = this.extractXP(taskLine);
		const cp = this.extractCP(taskLine);
		const coins = Math.round(xp * 0.1);
		const difficulty = this.extractDifficulty(taskLine);
		const skills = this.extractSkills(taskLine);

		const energyFromLine = (() => {
			const m = taskLine.match(/🔋\s*(\d+)/);
			if (m) return Math.min(100, parseInt(m[1], 10));
			return parseEnergyCostFromMarkdownLine(taskLine);
		})();
		const activityId = parseActivityProfileFromTaskLine(taskLine);

		return {
			id: buildCompletionKey(filePath, lineNumber),
			title,
			className: '',
			filePath,
			lineNumber,
			xp,
			cp,
			coins,
			skills,
			stats: [],
			priority: 'medium',
			difficulty,
			subtasks: [],
			completed: true,
			...(typeof energyFromLine === 'number' ? { energyCost: energyFromLine } : {}),
			...(activityId !== 'generic' ? { activityProfile: activityId } : {}),
		};
	}

	private async processQuestCompletion(
		quest: Quest,
		ledgerKey: string,
		title: string,
		filePath: string,
		lineNumber: number
	): Promise<void> {
		try {
			console.log(`[QuestTracker] Quest completed: "${title}" in ${filePath}:${lineNumber}`);

			const settings = this.getSettings();
			const rewardResult = await awardQuestRewards(this.app.vault, quest, settings, this.app);

			await markCompletionRewarded(this.app, ledgerKey);

			const { achievementEventService } = await import(
				'../../achievements/services/achievementEventService'
			);
			await achievementEventService.processGameEvent({
				type: 'quest_completed',
				data: {
					questData: { title, xp: quest.xp, difficulty: quest.difficulty, completion: 100 },
				},
				timestamp: new Date(),
			});
			await achievementEventService.processGameEvent({
				type: 'task_completed',
				data: { taskData: { title, difficulty: quest.difficulty } },
				timestamp: new Date(),
			});

			this.enqueueCompletionSummary(title, filePath, rewardResult, settings);
		} catch (error) {
			console.error('[QuestTracker] Error processing quest completion:', error);
		}
	}

	private enqueueCompletionSummary(
		title: string,
		filePath: string,
		result: QuestRewardResult,
		settings: GamificationPluginSettings
	): void {
		this.pendingBatch.push({ title, filePath, result });

		if (this.batchTimer) clearTimeout(this.batchTimer);

		this.batchTimer = setTimeout(() => {
			const batch = [...this.pendingBatch];
			this.pendingBatch = [];
			this.batchTimer = null;
			this.flushCompletionBatch(batch, settings);
		}, 400);
	}

	private flushCompletionBatch(
		batch: CompletedQuestSummaryItem[],
		settings: GamificationPluginSettings
	): void {
		if (batch.length === 0) return;

		if (settings.externalCompletionSummary !== false && batch.length >= 1) {
			openCompletionSummaryModal(
				this.app,
				batch,
				settings,
				batch.length > 1
					? 'Quests completed while you were away'
					: 'Quest completed'
			);
		} else {
			for (const item of batch) {
				emitQuestCompletionFeedback(item.result, settings);
			}
		}
	}

	private extractTitle(taskLine: string): string {
		const taskMatch = taskLine.match(/- \[x\] (.+)/);
		if (!taskMatch) return '';

		return taskMatch[1].split(/[#✨⭐🔥⚖️🌱]/)[0].trim();
	}

	private extractXP(taskLine: string): number {
		const xpMatch = taskLine.match(/✨(\d+)/);
		if (xpMatch) return parseInt(xpMatch[1], 10);
		if (taskLine.includes('🔥')) return 100;
		if (taskLine.includes('🌱')) return 25;
		return 50;
	}

	private extractCP(taskLine: string): number {
		const cpMatch = taskLine.match(/⭐(\d+)/);
		if (cpMatch) return parseInt(cpMatch[1], 10);
		return 0;
	}

	private extractSkills(taskLine: string): string[] {
		const line = taskLine.toLowerCase();
		const fieldMatch = line.match(/skills:\s*([^|}#]+)/i);
		if (fieldMatch) {
			return fieldMatch[1]
				.split(',')
				.map((s) => s.trim())
				.filter(Boolean);
		}
		const emojiMatch = taskLine.match(/🛠️\s*([^✨⭐💰🔁🔥⚖️🌱📅#\n\r]+)/);
		if (emojiMatch) {
			return emojiMatch[1]
				.split(/[;,]/)
				.map((s) => s.trim())
				.filter(Boolean);
		}
		return [];
	}

	private extractDifficulty(taskLine: string): string {
		if (taskLine.includes('🔥')) return 'hard';
		if (taskLine.includes('🌱')) return 'easy';
		return 'medium';
	}

	private async populateInitialCache(): Promise<void> {
		try {
			const settings = this.getSettings();
			await cacheAllWatchedFiles(this.app, settings, this.fileContentsCache);
			console.log(
				`[QuestTracker] Cached ${this.fileContentsCache.size} watched file(s) for tracking`
			);
		} catch (error) {
			console.error('[QuestTracker] Error caching watched files:', error);
		}
	}
}
