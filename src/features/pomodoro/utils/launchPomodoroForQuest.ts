import type { Quest } from '../../quests/utils/taskParser';
import type GamifiedObsidianPlugin from '../../../core/main';

function parseEstimatedMinutes(estimatedTime?: string): number {
	if (!estimatedTime) return 25;
	const timeStr = estimatedTime.toLowerCase().trim();
	const match = timeStr.match(/(\d+)\s*(m|min|mins|minute|minutes|h|hr|hrs|hour|hours)?/);
	if (!match) return 25;
	const value = parseInt(match[1], 10);
	const unit = match[2] || 'm';
	return unit.startsWith('h') ? value * 60 : value;
}

/**
 * Switch to Pomodoro and attach a quest (desktop + mobile).
 * Mirrors QuestTab's launch path via CustomEvents.
 */
export function launchPomodoroForQuest(
	plugin: GamifiedObsidianPlugin,
	quest: Quest,
	opts?: { mountDelayMs?: number }
): void {
	const estimatedTime = parseEstimatedMinutes(quest.estimatedTime);
	const attachedQuest = {
		title: quest.title,
		progress: 0,
		difficulty: quest.difficulty,
		priority: quest.priority,
		rewards: {
			xp: quest.xp || 0,
			coins: quest.cp || 0,
			cp: quest.cp || 0,
			materials: quest.rewards || [],
		},
		description: quest.description || 'Complete this quest to earn rewards!',
		dueDate: quest.due,
		subtasks:
			quest.subtasks?.map((subtask) => ({
				completed: subtask.completed,
				text: subtask.text,
			})) || [],
		tags: quest.tags || [],
		skills: quest.skills || [],
		filePath: quest.filePath || quest.id,
		lineNumber: 0,
		isTimedQuest: Boolean(quest.due && quest.due.includes('T')),
		estimatedTime,
	};

	(plugin.settings as unknown as Record<string, unknown>).pomodoroAttachedQuest = attachedQuest;
	void plugin.saveSettings();

	window.dispatchEvent(
		new CustomEvent('requestActiveTabChange', {
			detail: { targetTab: 'pomodoro' },
		})
	);

	const delay = opts?.mountDelayMs ?? 500;
	window.setTimeout(() => {
		window.dispatchEvent(
			new CustomEvent('switchToPomodoroTab', {
				detail: { attachedQuest },
			})
		);
	}, delay);
}
