export type DreamLastOutcome = 'survived' | 'wrecked';

export type DreamDurability = 'intact' | 'worn' | 'broken';

export type DreamForecastTone = 'comfortable' | 'even' | 'harsh' | 'brutal';

export interface DreamPlayerState {
	/** Current Dream HP. Omit or leave undefined for a full bar. */
	hp?: number;
	lastOutcome?: DreamLastOutcome | null;
	lastBossName?: string | null;
}

export interface DreamCombatStats {
	hp: number;
	maxHp: number;
	atk: number;
	def: number;
	/** atk + def + maxHp/4 — used to compare against a raid. */
	power: number;
	baseAtk: number;
	baseDef: number;
	baseMaxHp: number;
	gearAtk: number;
	gearDef: number;
	gearMaxHp: number;
}

export interface DreamKitSummary {
	equipped: number;
	slots: number;
	worn: number;
	broken: number;
	unbreaking: boolean;
}

export interface DreamForecast {
	tone: DreamForecastTone;
	label: string;
	detail: string;
	bossName?: string;
}

export const DEFAULT_DREAM_STATE: DreamPlayerState = {
	hp: undefined,
	lastOutcome: null,
	lastBossName: null,
};

export function normalizeDreamState(raw: unknown): DreamPlayerState {
	if (raw == null || raw === '') {
		return { ...DEFAULT_DREAM_STATE };
	}

	let parsed: Record<string, unknown> | null = null;
	if (typeof raw === 'string') {
		const trimmed = raw.trim();
		if (trimmed.startsWith('{')) {
			try {
				parsed = JSON.parse(trimmed) as Record<string, unknown>;
			} catch {
				parsed = null;
			}
		}
	} else if (typeof raw === 'object' && !Array.isArray(raw)) {
		parsed = raw as Record<string, unknown>;
	}

	if (!parsed) {
		return { ...DEFAULT_DREAM_STATE };
	}

	const hpRaw = parsed.hp;
	const hp =
		hpRaw === null || hpRaw === undefined || hpRaw === ''
			? undefined
			: Number(hpRaw);
	const outcomeRaw = String(parsed.lastOutcome ?? '').toLowerCase();
	const lastOutcome: DreamLastOutcome | null =
		outcomeRaw === 'survived' || outcomeRaw === 'wrecked' ? outcomeRaw : null;
	const lastBossName =
		typeof parsed.lastBossName === 'string' && parsed.lastBossName.trim()
			? parsed.lastBossName.trim()
			: null;

	return {
		hp: Number.isFinite(hp) ? Math.max(0, hp as number) : undefined,
		lastOutcome,
		lastBossName,
	};
}

export function serializeDreamState(dream?: DreamPlayerState | null): string {
	const next = dream ?? DEFAULT_DREAM_STATE;
	return JSON.stringify({
		hp: next.hp ?? null,
		lastOutcome: next.lastOutcome ?? null,
		lastBossName: next.lastBossName ?? null,
	});
}

export function dreamFromFrontmatter(data: Record<string, unknown> | null | undefined): DreamPlayerState {
	if (!data) return { ...DEFAULT_DREAM_STATE };
	if (data.dream != null) return normalizeDreamState(data.dream);
	if (data.dreamHp != null || data.dreamLastOutcome != null || data.dreamLastBossName != null) {
		return normalizeDreamState({
			hp: data.dreamHp,
			lastOutcome: data.dreamLastOutcome,
			lastBossName: data.dreamLastBossName,
		});
	}
	return { ...DEFAULT_DREAM_STATE };
}
