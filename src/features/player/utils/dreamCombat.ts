import type {
	DreamCombatStats,
	DreamDurability,
	DreamForecast,
	DreamForecastTone,
	DreamKitSummary,
	DreamLastOutcome,
	DreamPlayerState,
} from '../../../data/models/DreamPlayer';
import type { InventoryItem } from '../../inventory/utils/updateInventoryFile';
import {
	GEAR_SLOTS,
	type EquippedGearItem,
	type GearSlot,
} from '../../inventory/utils/gearFile';

export interface DreamGearBonuses {
	atk: number;
	def: number;
	hp: number;
}

export interface DreamRaidHint {
	name: string;
	difficulty?: 'easy' | 'medium' | 'hard' | string;
	timesDefeated?: number;
}

const RARITY_BASE: Record<string, DreamGearBonuses> = {
	common: { atk: 2, def: 1, hp: 4 },
	uncommon: { atk: 4, def: 2, hp: 8 },
	rare: { atk: 7, def: 4, hp: 14 },
	epic: { atk: 11, def: 7, hp: 22 },
	legendary: { atk: 16, def: 10, hp: 32 },
};

const SLOT_WEIGHT: Record<GearSlot, { atk: number; def: number; hp: number }> = {
	head: { atk: 0.4, def: 1, hp: 0.8 },
	body: { atk: 0.3, def: 1.4, hp: 1.3 },
	hands: { atk: 0.7, def: 0.6, hp: 0.5 },
	feet: { atk: 0.4, def: 0.7, hp: 0.6 },
	weapon: { atk: 1.6, def: 0.2, hp: 0.3 },
	accessory: { atk: 0.6, def: 0.6, hp: 0.6 },
	tool: { atk: 0.5, def: 0.4, hp: 0.4 },
};

const DIFFICULTY_THREAT: Record<string, number> = {
	easy: 0.85,
	medium: 1,
	hard: 1.25,
};

const DREAM_EFFECT_ALIASES: Record<string, keyof DreamGearBonuses> = {
	atk: 'atk',
	attack: 'atk',
	def: 'def',
	defense: 'def',
	hp: 'hp',
	maxhp: 'hp',
};

function roundStat(value: number): number {
	return Math.max(0, Math.round(value));
}

export function dreamBaselineFromLevel(level: number): Pick<DreamCombatStats, 'baseAtk' | 'baseDef' | 'baseMaxHp'> {
	const lv = Math.max(1, Math.floor(level || 1));
	return {
		baseMaxHp: 80 + (lv - 1) * 4,
		baseAtk: 8 + (lv - 1) * 2,
		baseDef: 6 + (lv - 1),
	};
}

export function getDreamItemDurability(
	item: InventoryItem | null | undefined,
	unbreaking = false
): DreamDurability {
	if (!item || unbreaking) return 'intact';

	const tags = (item.tags ?? []).map((tag) => tag.toLowerCase());
	if (tags.includes('broken') || tags.includes('dream-broken')) return 'broken';
	if (tags.includes('worn') || tags.includes('dream-worn')) return 'worn';

	for (const line of item.effects ?? []) {
		const match = line
			.trim()
			.toLowerCase()
			.match(/^(?:dream:)?durability\s*[:=]\s*(\d+(?:\.\d+)?)/);
		if (!match) continue;
		const value = Number(match[1]);
		if (!Number.isFinite(value)) continue;
		if (value <= 0) return 'broken';
		if (value < 50) return 'worn';
		return 'intact';
	}

	return 'intact';
}

export function durabilityMultiplier(state: DreamDurability): number {
	if (state === 'broken') return 0;
	if (state === 'worn') return 0.5;
	return 1;
}

function parseExplicitDreamBonuses(item: InventoryItem): DreamGearBonuses {
	const bonuses: DreamGearBonuses = { atk: 0, def: 0, hp: 0 };
	for (const line of item.effects ?? []) {
		const match = line
			.trim()
			.toLowerCase()
			.match(/^(?:dream:)?(atk|attack|def|defense|hp|maxhp)\s*[:=]\s*([+-]?\d+(?:\.\d+)?)$/);
		if (!match) continue;
		const key = DREAM_EFFECT_ALIASES[match[1]];
		if (!key) continue;
		const value = Number(match[2]);
		if (!Number.isFinite(value)) continue;
		bonuses[key] += value;
	}
	return bonuses;
}

function rarityFallbackBonuses(item: InventoryItem, slot: GearSlot): DreamGearBonuses {
	const rarity = (item.rarity || 'common').toLowerCase();
	const base = RARITY_BASE[rarity] ?? RARITY_BASE.common;
	const weight = SLOT_WEIGHT[slot];
	return {
		atk: base.atk * weight.atk,
		def: base.def * weight.def,
		hp: base.hp * weight.hp,
	};
}

export function getDreamItemCombatBonuses(
	item: InventoryItem | null | undefined,
	slot: GearSlot,
	unbreaking = false
): DreamGearBonuses {
	if (!item) return { atk: 0, def: 0, hp: 0 };

	const explicit = parseExplicitDreamBonuses(item);
	const hasExplicit = explicit.atk !== 0 || explicit.def !== 0 || explicit.hp !== 0;
	const raw = hasExplicit ? explicit : rarityFallbackBonuses(item, slot);
	const mul = durabilityMultiplier(getDreamItemDurability(item, unbreaking));

	return {
		atk: raw.atk * mul,
		def: raw.def * mul,
		hp: raw.hp * mul,
	};
}

export function sumDreamGearBonuses(
	look: EquippedGearItem[],
	unbreaking = false
): DreamGearBonuses {
	return look.reduce(
		(total, entry) => {
			const piece = getDreamItemCombatBonuses(entry.item, entry.slot, unbreaking);
			total.atk += piece.atk;
			total.def += piece.def;
			total.hp += piece.hp;
			return total;
		},
		{ atk: 0, def: 0, hp: 0 }
	);
}

export function summarizeDreamKit(
	look: EquippedGearItem[],
	unbreaking = false
): DreamKitSummary {
	let equipped = 0;
	let worn = 0;
	let broken = 0;
	for (const entry of look) {
		if (!entry.itemName) continue;
		equipped += 1;
		const state = getDreamItemDurability(entry.item, unbreaking);
		if (state === 'worn') worn += 1;
		if (state === 'broken') broken += 1;
	}
	return {
		equipped,
		slots: GEAR_SLOTS.length,
		worn: unbreaking ? 0 : worn,
		broken: unbreaking ? 0 : broken,
		unbreaking,
	};
}

export function combatPower(atk: number, def: number, maxHp: number): number {
	return atk + def + maxHp / 4;
}

export function buildDreamCombatStats(
	level: number,
	look: EquippedGearItem[],
	dream: DreamPlayerState | undefined,
	unbreaking = false
): DreamCombatStats {
	const base = dreamBaselineFromLevel(level);
	const gear = sumDreamGearBonuses(look, unbreaking);
	const maxHp = roundStat(base.baseMaxHp + gear.hp);
	const atk = roundStat(base.baseAtk + gear.atk);
	const def = roundStat(base.baseDef + gear.def);
	const hp =
		dream?.hp == null ? maxHp : Math.max(0, Math.min(maxHp, Math.round(dream.hp)));

	return {
		hp,
		maxHp,
		atk,
		def,
		power: combatPower(atk, def, maxHp),
		baseAtk: base.baseAtk,
		baseDef: base.baseDef,
		baseMaxHp: base.baseMaxHp,
		gearAtk: roundStat(gear.atk),
		gearDef: roundStat(gear.def),
		gearMaxHp: roundStat(gear.hp),
	};
}

export function dreamThreatFromLevel(level: number): number {
	const base = dreamBaselineFromLevel(level);
	return combatPower(base.baseAtk, base.baseDef, base.baseMaxHp) * 1.05;
}

export function dreamThreatFromRaid(level: number, raid?: DreamRaidHint | null): number {
	const baseline = dreamThreatFromLevel(level);
	if (!raid) return baseline;
	const difficultyMul = DIFFICULTY_THREAT[String(raid.difficulty || 'medium').toLowerCase()] ?? 1;
	const clearBump = 1 + Math.min(0.35, Math.max(0, Number(raid.timesDefeated) || 0) * 0.04);
	return baseline * difficultyMul * clearBump;
}

function forecastCopy(
	tone: DreamForecastTone,
	bossName?: string
): Pick<DreamForecast, 'label' | 'detail'> {
	const vs = bossName ? `vs ${bossName}` : 'Typical raid';
	switch (tone) {
		case 'comfortable':
			return { label: vs, detail: 'Comfortable — light chip, kit holds' };
		case 'even':
			return { label: vs, detail: 'Even — expect wear' };
		case 'harsh':
			return { label: vs, detail: 'Harsh — HP will chip, loot down' };
		case 'brutal':
			return { label: vs, detail: 'Brutal — likely wrecked; quest still counts' };
	}
}

export function forecastDreamRaid(
	stats: DreamCombatStats,
	level: number,
	raid?: DreamRaidHint | null
): DreamForecast {
	const threat = dreamThreatFromRaid(level, raid);
	const ratio = stats.power / Math.max(1, threat);
	const tone: DreamForecastTone =
		ratio >= 1.25 ? 'comfortable' : ratio >= 0.95 ? 'even' : ratio >= 0.7 ? 'harsh' : 'brutal';
	const copy = forecastCopy(tone, raid?.name);
	return { tone, bossName: raid?.name, ...copy };
}

export function lastOutcomeLine(
	outcome?: DreamLastOutcome | null,
	bossName?: string | null
): string | null {
	if (!outcome) return null;
	const who = bossName?.trim() ? ` · ${bossName.trim()}` : '';
	if (outcome === 'wrecked') return `Last clear: wrecked${who}`;
	return `Last clear: survived${who}`;
}

export function dreamStatBarMax(kind: 'atk' | 'def', stats: DreamCombatStats): number {
	if (kind === 'atk') {
		return Math.max(stats.atk, Math.round(stats.baseAtk * 2.4 + 20));
	}
	return Math.max(stats.def, Math.round(stats.baseDef * 2.4 + 14));
}

export function kitSummaryLine(kit: DreamKitSummary): string {
	if (kit.unbreaking) return 'Unbreaking';
	if (kit.equipped === 0) return `Kit  0/${kit.slots}  ·  empty`;
	const parts = [`Kit  ${kit.equipped}/${kit.slots}`];
	if (kit.worn > 0) parts.push(`${kit.worn} worn`);
	if (kit.broken > 0) parts.push(`${kit.broken} broken`);
	return parts.join('  ·  ');
}

const CHIP_FRAC: Record<DreamForecastTone, number> = {
	comfortable: 0.08,
	even: 0.16,
	harsh: 0.3,
	brutal: 0.55,
};

const DREAM_DURABILITY_TAGS = new Set(['worn', 'broken', 'dream-worn', 'dream-broken']);

export function nextDreamDurability(state: DreamDurability): DreamDurability {
	return state === 'intact' ? 'worn' : 'broken';
}

export function lootStepsDownForTone(tone: DreamForecastTone): number {
	if (tone === 'brutal') return 2;
	if (tone === 'harsh') return 1;
	return 0;
}

export function wearCountForTone(tone: DreamForecastTone, rng: () => number = Math.random): number {
	switch (tone) {
		case 'comfortable':
			return rng() < 0.22 ? 1 : 0;
		case 'even':
			return 1;
		case 'harsh':
			return rng() < 0.45 ? 2 : 1;
		case 'brutal':
			return 2;
	}
}

export function applyDreamDurabilityToItem(
	item: InventoryItem,
	next: DreamDurability
): InventoryItem {
	const tags = (item.tags ?? []).filter((tag) => !DREAM_DURABILITY_TAGS.has(tag.toLowerCase()));
	if (next === 'worn') tags.push('worn');
	if (next === 'broken') tags.push('broken');

	const effects = (item.effects ?? []).map((line) => {
		if (!/^(?:dream:)?durability\s*[:=]/i.test(line.trim())) return line;
		if (next === 'broken') return 'dream:durability=0';
		if (next === 'worn') return 'dream:durability=25';
		return 'dream:durability=100';
	});

	return { ...item, tags, effects };
}

export interface DreamBattleTickPlan {
	chip: number;
	hpBefore: number;
	hpAfter: number;
	outcome: DreamLastOutcome;
	tone: DreamForecastTone;
	bossName?: string;
	wearNames: string[];
	lootStepsDown: number;
	unbreaking: boolean;
}

function pickWearTargets(
	look: EquippedGearItem[],
	count: number,
	unbreaking: boolean,
	rng: () => number
): string[] {
	if (unbreaking || count <= 0) return [];
	const candidates = look.filter((entry) => {
		if (!entry.item || !entry.itemName) return false;
		return getDreamItemDurability(entry.item, false) !== 'broken';
	});
	for (let i = candidates.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		const tmp = candidates[i];
		candidates[i] = candidates[j];
		candidates[j] = tmp;
	}
	return candidates.slice(0, count).map((entry) => entry.itemName as string);
}

export function planDreamBattleTick(
	stats: DreamCombatStats,
	forecast: DreamForecast,
	look: EquippedGearItem[],
	unbreaking = false,
	rng: () => number = Math.random
): DreamBattleTickPlan {
	const tone = forecast.tone;
	const mitigation = 1 - Math.min(0.4, stats.def / (stats.def + 48));
	let chip = Math.round(stats.maxHp * CHIP_FRAC[tone] * mitigation);
	chip = Math.max(tone === 'comfortable' ? 1 : 2, chip);
	if (stats.hp <= 0) chip = 0;
	const hpAfter = Math.max(0, stats.hp - chip);
	const wearNames = pickWearTargets(look, wearCountForTone(tone, rng), unbreaking, rng);

	return {
		chip,
		hpBefore: stats.hp,
		hpAfter,
		outcome: hpAfter <= 0 ? 'wrecked' : 'survived',
		tone,
		bossName: forecast.bossName,
		wearNames,
		lootStepsDown: lootStepsDownForTone(tone),
		unbreaking,
	};
}

export function dreamTickNoticeLine(plan: DreamBattleTickPlan): string {
	const hpBit = plan.chip > 0 ? ` · −${plan.chip} HP` : '';
	if (plan.outcome === 'wrecked') {
		return `Dream wrecked${hpBit} · quest still counts`;
	}
	if (plan.unbreaking) {
		return `Dream survived${hpBit} · Unbreaking`;
	}
	if (plan.wearNames.length > 0) {
		const label = plan.wearNames.length === 1 ? plan.wearNames[0] : `${plan.wearNames.length} pieces`;
		return `Dream survived${hpBit} · ${label} worn`;
	}
	return `Dream survived${hpBit}`;
}
