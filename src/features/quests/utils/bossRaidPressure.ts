import type { BossDifficulty, BossFileData } from './bossFile';
import {
	formatCooldown,
	getAttackCooldownRemainingMs,
	isAttackReady,
	settleArmorRegen,
} from './bossFile';

/** Raid-only meter — never touches playerStore.stats.energy. */
export const RAID_FOCUS_MAX = 100;

/** Grace period after entering the gate before the first boss strike. */
export const RAID_ENTRY_GRACE_MS = 45 * 1000;

/** Real-time cooldown between boss strikes (per difficulty). */
export const RAID_BOSS_STRIKE_COOLDOWN_MS: Record<BossDifficulty, number> = {
	easy: 2 * 60 * 1000,
	medium: 90 * 1000,
	hard: 60 * 1000,
};

/** Focus restored when the raider lands a gate strike or move. */
export const RAID_FOCUS_GAIN_STRIKE = 10;
export const RAID_FOCUS_GAIN_MOVE = 6;
export const RAID_FOCUS_GAIN_VAULT_HIT = 14;

/** Passive focus recovery tick (every 30s in battle while focus > 0 and < max). */
export const RAID_FOCUS_PASSIVE_REGEN = 2;
export const RAID_FOCUS_PASSIVE_INTERVAL_MS = 30 * 1000;

/** Max boss strikes applied when catching up after time away from battle. */
export const RAID_BOSS_STRIKE_CATCHUP_MAX = 3;

const STRIKE_FOCUS_DAMAGE: Record<BossDifficulty, number> = {
	easy: 14,
	medium: 18,
	hard: 22,
};

const STRIKE_ARMOR_FORTIFY_FRACTION: Record<BossDifficulty, number> = {
	easy: 0.06,
	medium: 0.08,
	hard: 0.1,
};

const STRIKE_MESSAGES: Record<BossDifficulty, string[]> = {
	easy: [
		'The gate guardian shoves back — your raid focus wavers.',
		'A dull pulse from the boss rattles your concentration.',
		'The foe hardens its guard while you hesitate.',
	],
	medium: [
		'The boss slams the arena — raid focus takes a hit!',
		'Counter-pressure surges from the gate. Stay on task!',
		'Armor plates lock back into place as the boss strikes.',
	],
	hard: [
		'CRUSHING counter-blow! Raid focus plummets.',
		'The gate boss roars — your momentum fractures.',
		'A brutal fortify wave — the boss refuses to fall quietly.',
	],
};

export type BossRaidStrikeKind = 'assault' | 'fortify';

export interface BossRaidStrikeResult {
	boss: BossFileData;
	kind: BossRaidStrikeKind;
	focusDamage: number;
	armorRestored: number;
	message: string;
	nextFocus: number;
}

/** Strike effectiveness while raid focus is low (1 = full, 0.5 = exhausted). */
export function getRaidFocusDamageMultiplier(focus: number): number {
	if (focus <= 0) return 0.5;
	if (focus < 20) return 0.6;
	if (focus < 40) return 0.75;
	if (focus < 60) return 0.88;
	return 1;
}

/** Move cooldown multiplier while focus is low (>1 = slower recharge). */
export function getRaidFocusCooldownMultiplier(focus: number): number {
	return 2 - getRaidFocusDamageMultiplier(focus);
}

export function clampRaidFocus(value: number): number {
	return Math.max(0, Math.min(RAID_FOCUS_MAX, Math.round(value)));
}

export function getRaidBossStrikeCooldownMs(difficulty: BossDifficulty): number {
	return RAID_BOSS_STRIKE_COOLDOWN_MS[difficulty] ?? RAID_BOSS_STRIKE_COOLDOWN_MS.medium;
}

export function getBossStrikeCountdownLabel(
	boss: Pick<BossFileData, 'attackReadyAt'>,
	now = Date.now()
): string {
	if (isAttackReady(boss, now)) return 'STRIKING';
	return formatCooldown(getAttackCooldownRemainingMs(boss, now));
}

function pickStrikeMessage(difficulty: BossDifficulty): string {
	const pool = STRIKE_MESSAGES[difficulty] ?? STRIKE_MESSAGES.medium;
	return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Boss lands a raid strike: drain raid focus and optionally fortify armor.
 * Does NOT modify player wellbeing / energy stats.
 */
export function applyBossRaidStrike(
	boss: BossFileData,
	currentFocus: number,
	now = Date.now()
): BossRaidStrikeResult {
	const settled = settleArmorRegen(boss, now);
	const focusDamage = STRIKE_FOCUS_DAMAGE[settled.difficulty] ?? STRIKE_FOCUS_DAMAGE.medium;
	const nextFocus = clampRaidFocus(currentFocus - focusDamage);

	const fortifyFrac = STRIKE_ARMOR_FORTIFY_FRACTION[settled.difficulty] ?? 0.08;
	const armorRestored =
		settled.currentArmor < settled.maxArmor
			? Math.min(
					settled.maxArmor - settled.currentArmor,
					Math.max(1, Math.round(settled.maxArmor * fortifyFrac))
				)
			: 0;

	const currentArmor = Math.min(settled.maxArmor, settled.currentArmor + armorRestored);
	const cooldown = getRaidBossStrikeCooldownMs(settled.difficulty);

	const nextBoss: BossFileData = {
		...settled,
		currentArmor,
		attackReadyAt: now + cooldown,
		status: 'active',
	};

	return {
		boss: nextBoss,
		kind: armorRestored > 0 ? 'fortify' : 'assault',
		focusDamage,
		armorRestored,
		message: pickStrikeMessage(settled.difficulty),
		nextFocus,
	};
}

/** Apply pending boss strikes after time away (capped). */
export function catchUpBossRaidStrikes(
	boss: BossFileData,
	currentFocus: number,
	maxCatchUp = RAID_BOSS_STRIKE_CATCHUP_MAX,
	now = Date.now()
): { boss: BossFileData; focus: number; strikes: BossRaidStrikeResult[] } {
	let focus = currentFocus;
	let working = boss;
	const strikes: BossRaidStrikeResult[] = [];
	let strikeAt = working.attackReadyAt ?? 0;

	while (strikes.length < maxCatchUp && strikeAt <= now) {
		const result = applyBossRaidStrike(working, focus, strikeAt);
		working = result.boss;
		focus = result.nextFocus;
		strikes.push(result);
		strikeAt = working.attackReadyAt;
	}

	return { boss: working, focus, strikes };
}

/** Schedule the first boss strike after entering a new gate raid. */
export function scheduleInitialBossStrike(boss: BossFileData, now = Date.now()): BossFileData {
	return {
		...boss,
		attackReadyAt: now + RAID_ENTRY_GRACE_MS,
		lastArmorRegenAt: now,
	};
}

export function gainRaidFocus(current: number, amount: number): number {
	return clampRaidFocus(current + amount);
}
