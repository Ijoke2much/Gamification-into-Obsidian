import type { Quest } from './taskParser';

const DONE_STATUSES = new Set(['done', 'complete', 'completed', 'cancelled', 'canceled']);

export interface TaskNotesFrontmatter {
	status?: string;
	title?: string;
	xp?: number;
	cp?: number;
	coins?: number;
	'gamified-task'?: boolean;
}

export function parseFrontmatterBlock(content: string): TaskNotesFrontmatter | null {
	const match = content.match(/^---\n([\s\S]*?)\n---/);
	if (!match) return null;

	const fm: TaskNotesFrontmatter = {};
	for (const line of match[1].split('\n')) {
		const kv = line.match(/^([a-zA-Z0-9_-]+):\s*(.+)$/);
		if (!kv) continue;
		const [, key, rawValue] = kv;
		const value = rawValue.trim().replace(/^["']|["']$/g, '');
		if (key === 'gamified-task') {
			fm['gamified-task'] = value === 'true';
		} else if (key === 'status') {
			fm.status = value.toLowerCase();
		} else if (key === 'title') {
			fm.title = value;
		} else if (key === 'xp' || key === 'cp' || key === 'coins') {
			const num = parseInt(value, 10);
			if (!Number.isNaN(num)) {
				(fm as Record<string, unknown>)[key] = num;
			}
		}
	}
	return fm;
}

export function isTaskNotesContent(content: string): boolean {
	const fm = parseFrontmatterBlock(content);
	if (!fm) return false;
	return typeof fm.status === 'string';
}

export function isGamifiedTaskContent(content: string): boolean {
	if (/#gamified-task/.test(content)) return true;
	const fm = parseFrontmatterBlock(content);
	return fm?.['gamified-task'] === true;
}

export function isStatusDone(status: string | undefined): boolean {
	if (!status) return false;
	return DONE_STATUSES.has(status.toLowerCase());
}

export function detectTaskNotesStatusCompletion(
	oldContent: string,
	newContent: string
): boolean {
	const oldFm = parseFrontmatterBlock(oldContent);
	const newFm = parseFrontmatterBlock(newContent);
	if (!oldFm?.status || !newFm?.status) return false;
	return !isStatusDone(oldFm.status) && isStatusDone(newFm.status);
}

export function buildQuestFromTaskNotesContent(content: string, filePath: string): Quest | null {
	const fm = parseFrontmatterBlock(content);
	if (!fm) return null;

	const lines = content.split('\n');
	const taskLine =
		lines.find((line) => /- \[[ x]\]/.test(line) && line.includes('#gamified-task')) ??
		lines.find((line) => /- \[[ x]\]/.test(line));

	let title = fm.title?.trim() || 'Unknown Quest';
	let xp = typeof fm.xp === 'number' ? fm.xp : 50;
	let cp = typeof fm.cp === 'number' ? fm.cp : 0;
	let coins = typeof fm.coins === 'number' ? fm.coins : Math.round(xp * 0.1);
	let lineNumber = 1;

	if (taskLine) {
		lineNumber = lines.indexOf(taskLine) + 1;
		const titleMatch = taskLine.match(/- \[[ x]\] (.+)/);
		if (titleMatch) {
			title = titleMatch[1].split(/[#✨⭐🔥⚖️🌱]/)[0].trim() || title;
		}
		const xpMatch = taskLine.match(/✨(\d+)/);
		if (xpMatch) xp = parseInt(xpMatch[1], 10);
		const cpMatch = taskLine.match(/⭐(\d+)/);
		if (cpMatch) cp = parseInt(cpMatch[1], 10);
	}

	return {
		id: filePath,
		title,
		className: '',
		filePath,
		lineNumber,
		xp,
		cp,
		coins,
		skills: [],
		stats: [],
		priority: 'medium',
		difficulty: taskLine?.includes('🔥') ? 'hard' : taskLine?.includes('🌱') ? 'easy' : 'medium',
		subtasks: [],
		completed: true,
	};
}
