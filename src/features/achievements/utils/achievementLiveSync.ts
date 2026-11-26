import type { App } from 'obsidian';
import type { PlayerData } from '../../../data/models/PlayerData';
import { AchievementTracker } from '../../../data/models/AchievementSystem';
import { loadCompletionLedger } from '../../quests/utils/completionLedger';
import { PomodoroStatsManager } from '../../pomodoro/utils/pomodoroStatsManager';
import { loadHabitsFromFile } from '../../habits/utils/habitsUtils';

export interface LiveAchievementInput {
	player?: PlayerData | null;
	questCount?: number;
	pomodoroSessions?: number;
	pomodoroStreak?: number;
	pomodoroXp?: number;
	deepWorkSessions?: number;
	quickFocusSessions?: number;
	habitStreak?: number;
}

/** Push the player's real counts into the shared achievement tracker. Never moves a bar backward. */
export function syncAchievementsFromLive(
	tracker: AchievementTracker,
	live: LiveAchievementInput
): void {
	const player = live.player;
	const level = player?.level ?? 0;
	const xp = player?.total_exp ?? 0;
	const coins = player?.coins ?? 0;
	const bosses = player?.totalBossVictories ?? player?.defeatedBosses?.length ?? 0;
	const bossStreak = player?.consecutiveBossWins ?? 0;
	const skills = player?.unlockedSkills?.length ?? 0;
	const items = player?.inventory?.length ?? 0;

	for (const { achievement } of tracker.getAllAchievements()) {
		if (typeof achievement.criteria.target !== 'number') continue;
		const value = measureAchievement(achievement.criteria.type, achievement.criteria.meta, {
			level,
			xp,
			coins,
			bosses,
			bossStreak,
			skills,
			items,
			questCount: live.questCount ?? 0,
			pomodoroSessions: live.pomodoroSessions ?? 0,
			pomodoroStreak: live.pomodoroStreak ?? 0,
			pomodoroXp: live.pomodoroXp ?? 0,
			deepWorkSessions: live.deepWorkSessions ?? 0,
			quickFocusSessions: live.quickFocusSessions ?? 0,
			habitStreak: live.habitStreak ?? 0,
		});
		if (value == null) continue;
		tracker.updateProgress(achievement.id, value);
	}
}

function measureAchievement(
	type: string,
	meta: Record<string, string | number | boolean> | undefined,
	counts: {
		level: number;
		xp: number;
		coins: number;
		bosses: number;
		bossStreak: number;
		skills: number;
		items: number;
		questCount: number;
		pomodoroSessions: number;
		pomodoroStreak: number;
		pomodoroXp: number;
		deepWorkSessions: number;
		quickFocusSessions: number;
		habitStreak: number;
	}
): number | null {
	switch (type) {
		case 'level_reached':
			return counts.level;
		case 'xp_total':
			return counts.xp;
		case 'coins_earned':
			return counts.coins;
		case 'quest_count':
			return counts.questCount;
		case 'boss_defeated':
			return counts.bosses;
		case 'boss_streak':
			return counts.bossStreak;
		case 'pomodoro_sessions':
			return counts.pomodoroSessions;
		case 'pomodoro_streak':
			return counts.pomodoroStreak;
		case 'pomodoro_xp':
			return counts.pomodoroXp;
		case 'pomodoro_session_type':
			if (meta?.sessionType === 'deepWork') return counts.deepWorkSessions;
			if (meta?.sessionType === 'quickFocus') return counts.quickFocusSessions;
			return null;
		case 'habit_streak':
			return counts.habitStreak;
		case 'skill_unlocked':
			return counts.skills;
		case 'custom':
			if (meta?.type === 'inventory_count') return counts.items;
			return null;
		default:
			return null;
	}
}

export async function collectLiveAchievementInput(
	app: App | undefined,
	player: PlayerData | null | undefined
): Promise<LiveAchievementInput> {
	let questCount = 0;
	let habitStreak = 0;
	if (app) {
		try {
			const ledger = await loadCompletionLedger(app);
			questCount = Object.keys(ledger).filter(
				(key) => !key.endsWith(':note') && !key.endsWith(':status')
			).length;
		} catch {
			questCount = 0;
		}
		try {
			const habits = await loadHabitsFromFile(app.vault);
			habitStreak = habits.reduce(
				(max, habit) => Math.max(max, habit.streak || 0, habit.longestStreak || 0),
				0
			);
		} catch {
			habitStreak = 0;
		}
	}

	let pomodoroSessions = 0;
	let pomodoroStreak = 0;
	let pomodoroXp = 0;
	let deepWorkSessions = 0;
	let quickFocusSessions = 0;
	try {
		const stats = PomodoroStatsManager.loadStats();
		pomodoroSessions = stats.totalSessions || 0;
		pomodoroStreak = stats.currentStreak || 0;
		pomodoroXp = stats.totalPomodoroXP || 0;
		deepWorkSessions = stats.sessionsByType?.deepWork || 0;
		quickFocusSessions = stats.sessionsByType?.quickFocus || 0;
	} catch {
		/* stats stay at zero */
	}

	return {
		player,
		questCount,
		pomodoroSessions,
		pomodoroStreak,
		pomodoroXp,
		deepWorkSessions,
		quickFocusSessions,
		habitStreak,
	};
}
