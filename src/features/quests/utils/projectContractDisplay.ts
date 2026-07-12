import type { Quest } from './taskParser';
import type { ProjectSummary } from './questProjectUtils';

export type ContractBadgeVariant = 'momentum' | 'due' | 'stalled' | 'urgent' | 'reward';

export interface ContractBadge {
	variant: ContractBadgeVariant;
	label: string;
}

export interface ContractWaypoint {
	title: string;
	completed: boolean;
	description: string | null;
	subtaskDone: number;
	subtaskTotal: number;
}

export interface ContractDisplayModel {
	id: string;
	title: string;
	subtitle: string | null;
	progressPercent: number;
	completedCount: number;
	totalCount: number;
	taskCount: number;
	difficultyLabel: string | null;
	metaLine: string;
	badges: ContractBadge[];
	cardTone: 'default' | 'urgent' | 'stalled';
	percentTone: 'gold' | 'amber' | 'muted' | 'green';
	nextWaypoint: ContractWaypoint | null;
	/** All linked work is done and the contract header is still open. */
	readyForTurnIn: boolean;
}

const MILESTONE_THRESHOLDS = [25, 50, 75, 100] as const;

export function milestoneTickDone(progressPercent: number, threshold: number): boolean {
	return progressPercent >= threshold;
}

export { MILESTONE_THRESHOLDS };

/** Underlying quest behind the "next waypoint" row (for click-through). */
export function getNextWaypointQuest(project: ProjectSummary): Quest | null {
	return firstIncompleteTask(project);
}

/**
 * A contract is ready to turn in when every linked task (and every header
 * subtask/phase, if any) is complete but the header checkbox is still open.
 * Turning in completes the header and pays out its reward metadata.
 */
export function isReadyForTurnIn(project: ProjectSummary): boolean {
	const header = project.headerQuest;
	if (!header || header.completed) return false;

	const subtasks = header.subtasks ?? [];
	const subtasksDone = subtasks.every((s) => s.completed);

	if (project.tasks.length > 0) {
		return project.tasks.every((t) => t.completed) && subtasksDone;
	}
	// Header-only contract: needs at least one cleared phase to count as work done.
	return subtasks.length > 0 && subtasksDone;
}

function firstIncompleteTask(project: ProjectSummary): Quest | null {
	for (const task of project.tasks) {
		if (!task.completed) return task;
	}
	// Fall back to the header itself when it still has open phases.
	if (project.headerQuest && !project.headerQuest.completed) {
		const hasOpenSubtask =
			project.headerQuest.subtasks.length === 0 ||
			project.headerQuest.subtasks.some((s) => !s.completed);
		if (hasOpenSubtask) return project.headerQuest;
	}
	return null;
}

function buildWaypoint(project: ProjectSummary): ContractWaypoint | null {
	const quest = firstIncompleteTask(project);
	if (!quest) return null;

	const subtaskTotal = quest.subtasks.length;
	const subtaskDone = quest.subtasks.filter((s) => s.completed).length;

	return {
		title: quest.title,
		completed: quest.completed,
		description: quest.description?.trim() || null,
		subtaskDone,
		subtaskTotal,
	};
}

function parseDueDate(raw?: string): Date | null {
	if (!raw) return null;
	const trimmed = String(raw).trim();
	const parsed = Date.parse(trimmed);
	if (Number.isNaN(parsed)) return null;
	return new Date(parsed);
}

function formatDueBadge(due?: string): string | null {
	if (!due) return null;
	const d = parseDueDate(due);
	if (!d) return `DUE ${due}`;
	const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
	return `DUE ${month} ${d.getDate()}`;
}

function daysUntilDue(due?: string): number | null {
	const d = parseDueDate(due);
	if (!d) return null;
	const now = new Date();
	now.setHours(0, 0, 0, 0);
	const dueDay = new Date(d);
	dueDay.setHours(0, 0, 0, 0);
	return Math.round((dueDay.getTime() - now.getTime()) / 86400000);
}

function difficultyLabel(project: ProjectSummary): string | null {
	const raw = project.headerQuest?.difficulty;
	if (!raw) return null;
	return `${String(raw).toLowerCase()} contract`;
}

function buildBadges(project: ProjectSummary): ContractBadge[] {
	const badges: ContractBadge[] = [];
	const due = project.headerQuest?.due;
	const days = daysUntilDue(due);
	const pct = project.progressPercent;

	if (isReadyForTurnIn(project)) {
		badges.push({ variant: 'reward', label: 'TURN IN' });
		return badges;
	}

	if (pct >= 100) {
		badges.push({ variant: 'reward', label: 'COMPLETE' });
		return badges;
	}

	if (days != null && days <= 3 && pct < 50) {
		badges.push({ variant: 'urgent', label: 'URGENT' });
	}

	if (pct >= 40) {
		badges.push({ variant: 'momentum', label: 'MOMENTUM' });
	}

	const dueLabel = formatDueBadge(due);
	if (dueLabel) {
		badges.push({ variant: 'due', label: dueLabel });
	}

	if (pct > 0 && pct < 35 && !badges.some((b) => b.variant === 'momentum' || b.variant === 'urgent')) {
		badges.push({ variant: 'stalled', label: 'STALLED' });
	}

	return badges;
}

function cardTone(project: ProjectSummary): 'default' | 'urgent' | 'stalled' {
	const badges = buildBadges(project);
	if (badges.some((b) => b.variant === 'urgent')) return 'urgent';
	if (badges.some((b) => b.variant === 'stalled')) return 'stalled';
	return 'default';
}

function percentTone(project: ProjectSummary): 'gold' | 'amber' | 'muted' | 'green' {
	const pct = project.progressPercent;
	if (pct >= 100 || isReadyForTurnIn(project)) return 'green';
	if (buildBadges(project).some((b) => b.variant === 'urgent')) return 'amber';
	if (buildBadges(project).some((b) => b.variant === 'stalled')) return 'muted';
	return 'gold';
}

function metaLine(project: ProjectSummary): string {
	const parts: string[] = [];
	const totalWaypoints = project.tasks.length;
	if (totalWaypoints > 0) {
		const doneWaypoints = project.tasks.filter((task) => task.completed).length;
		parts.push(`${doneWaypoints}/${totalWaypoints} waypoints`);
	} else {
		parts.push(`${project.completedCount}/${project.totalCount} checklist`);
	}

	const current = getNextWaypointQuest(project);
	if (current && current.subtasks.length > 0) {
		const done = current.subtasks.filter((s) => s.completed).length;
		parts.push(`${done}/${current.subtasks.length} on current`);
	}

	const diff = difficultyLabel(project);
	if (diff) parts.push(diff);
	if (isReadyForTurnIn(project)) {
		parts.push('ready for payout');
	} else if (project.progressPercent >= 100) {
		parts.push('contract complete');
	}
	return parts.join(' · ');
}

function subtitleLine(project: ProjectSummary): string | null {
	const desc = project.headerQuest?.description?.trim();
	if (desc) return desc;
	return null;
}

export function toContractDisplay(project: ProjectSummary): ContractDisplayModel {
	return {
		id: project.id,
		title: project.title,
		subtitle: subtitleLine(project),
		progressPercent: project.progressPercent,
		completedCount: project.completedCount,
		totalCount: project.totalCount,
		taskCount: project.tasks.length,
		difficultyLabel: difficultyLabel(project),
		metaLine: metaLine(project),
		badges: buildBadges(project),
		cardTone: cardTone(project),
		percentTone: percentTone(project),
		nextWaypoint: buildWaypoint(project),
		readyForTurnIn: isReadyForTurnIn(project),
	};
}

/** Header turned in or abandoned — exclude from active slot and open roster. */
export function isClosedContract(project: ProjectSummary): boolean {
	return Boolean(project.headerQuest?.completed);
}

export function pickActiveProject(
	projects: ProjectSummary[],
	pinnedId?: string | null
): ProjectSummary | null {
	const open = projects.filter((p) => !isClosedContract(p));
	if (open.length === 0) return null;

	if (pinnedId) {
		const pinned = open.find((p) => p.id === pinnedId);
		if (pinned) return pinned;
	}

	const inProgress = open.filter((p) => p.progressPercent < 100);
	if (inProgress.length === 0) return open[0];
	// Most-progressed open project reads as the "current campaign".
	return inProgress.reduce((best, p) => (p.progressPercent > best.progressPercent ? p : best));
}

export function pickOtherProjects(
	projects: ProjectSummary[],
	active: ProjectSummary | null
): ProjectSummary[] {
	if (!active) return projects;
	return projects.filter((p) => p.id !== active.id);
}

export function guildHallCaption(projects: ProjectSummary[], hasActive: boolean): string {
	const open = projects.filter((p) => p.progressPercent < 100).length;
	const active = hasActive ? 1 : 0;
	return `${open} open · ${active} active`;
}
