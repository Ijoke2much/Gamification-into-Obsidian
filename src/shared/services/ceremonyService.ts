import type { GamificationPluginSettings } from '../../core/settings';
import { getRankWhisper, type Rank } from '../../features/player/utils/playerRank';
import type { XPGainResult } from '../state/playerStore';
import { DEFAULT_VISUAL_THEME_SETTINGS, type VisualCeremonyLevel } from '../themes/types';
import { emitCeremony } from '../utils/ceremonyEvents';
import { fieldNotice, systemNotice } from '../utils/noticeUtils';
import { getPluginSettingsFromApp } from '../utils/gameplayConfig';
import { isLikelyMobileDevice } from '../utils/deviceDetect';

function resolveCeremonyLevel(settings?: Partial<GamificationPluginSettings> | null): VisualCeremonyLevel {
	return settings?.visualTheme?.ceremonyLevel ?? DEFAULT_VISUAL_THEME_SETTINGS.ceremonyLevel ?? 'minimal';
}

export function processXPGainCeremonies(
	xpGain: XPGainResult,
	settings?: Partial<GamificationPluginSettings> | null
): void {
	const level = resolveCeremonyLevel(settings);
	if (level === 'off') return;
	const mobile = isLikelyMobileDevice();

	if (xpGain.rankChanged) {
		if (level === 'full' || level === 'minimal') {
			// Mobile lite host skips rank modal — notice only
			if (mobile) {
				showRankUpFallbackNotice(xpGain.oldRank, xpGain.newRank, xpGain.newLevel);
			} else {
				emitCeremony({
					kind: 'rank_up',
					oldRank: xpGain.oldRank,
					newRank: xpGain.newRank,
					level: xpGain.newLevel,
				});
			}
		}
		return;
	}

	if (xpGain.leveledUp) {
		// Mobile always gets a light level-up ceremony (even when settings are "minimal")
		if (level === 'full' || mobile) {
			emitCeremony({
				kind: 'level_up',
				oldLevel: xpGain.oldLevel,
				newLevel: xpGain.newLevel,
				rank: xpGain.newRank,
			});
			return;
		}

		if (level === 'minimal') {
			systemNotice(
				`LEVEL UP\nYou reached Level ${xpGain.newLevel} · Rank ${xpGain.newRank}`,
				6000,
				'high'
			);
		}
	}
}

export function showRankUpFallbackNotice(
	oldRank: string,
	newRank: string,
	level: number
): void {
	systemNotice(
		`RANK ELEVATED\n${oldRank} → ${newRank} at Level ${level}\n${getRankWhisper(newRank as Rank)}`,
		8000,
		'high'
	);
}

/** Resolve settings from app when plugin reference is unavailable. */
export function getCeremonySettingsFromApp(app?: unknown): Partial<GamificationPluginSettings> | undefined {
	return getPluginSettingsFromApp(app as Parameters<typeof getPluginSettingsFromApp>[0]);
}

/** Journey / combat feedback uses field (pixel) notices. */
export function notifyJourneyHit(
	damage: number,
	options?: { defeated?: boolean; grazed?: boolean; hpPercentAfter?: number }
): void {
	if (options?.grazed && !options?.defeated) {
		fieldNotice(
			`GRAZE HIT\n−${damage} HP (25% — task missed foe weakness)\nMatch affinity for full damage`,
			4000,
			'normal'
		);
		return;
	}

	const suffix = options?.defeated ? '\n— FOE FALLEN!' : '';
	const hpLine =
		options?.hpPercentAfter != null && !options?.defeated
			? `\nFoe at ${options.hpPercentAfter}% HP`
			: '';
	fieldNotice(`Journey −${damage} HP${hpLine}${suffix}`, 3200);
}

export function notifyBossRaidHit(
	damage: number,
	options?: {
		defeated?: boolean;
		grazed?: boolean;
		hpPercentAfter?: number;
		bossName?: string;
		pendingVictory?: boolean;
	}
): void {
	const label = options?.bossName ? options.bossName : 'Gate boss';
	if (options?.grazed && !options?.defeated) {
		fieldNotice(
			`RAID GRAZE\n−${damage} HP vs ${label}\nTag the boss weakness for full damage`,
			4000,
			'normal'
		);
		return;
	}

	if (options?.defeated) {
		fieldNotice(
			options?.pendingVictory
				? `GATE BOSS FELLED\n${label} defeated!\nOpen Boss Battle to claim spoils.`
				: `${label} defeated!`,
			4500,
			'high'
		);
		return;
	}

	const hpLine =
		options?.hpPercentAfter != null ? `\nBoss at ${options.hpPercentAfter}% HP` : '';
	fieldNotice(`Raid −${damage} HP vs ${label}${hpLine}`, 3200);
}

export function notifyDungeonUnlocked(clearedCount?: number, required?: number): void {
	const progressLine =
		clearedCount != null && required != null
			? `\n${clearedCount}/${required} foes cleared this board cycle`
			: '';
	fieldNotice(
		`RAID CHAMBER UNLOCKED${progressLine}\nOpen the Dungeon tab for a bonus raid.`,
		5500,
		'high'
	);
}

export function notifyJourneyVictory(message: string): void {
	fieldNotice(message, 4500, 'high');
}

export function notifyQuestComplete(message: string): void {
	systemNotice(message, 5000, 'normal');
}
