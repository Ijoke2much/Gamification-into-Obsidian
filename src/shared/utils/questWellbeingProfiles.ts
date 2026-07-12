/**
 * Activity profiles: on quest completion, adjust wellbeing stats (stress, motivation, focus, calm)
 * separately from physical energy (applyQuestEnergyCost).
 */

import type { GamificationPluginSettings } from "../../core/settings";
import type { Quest } from "../../features/quests/utils/taskParser";
import { filterWellbeingDeltas } from "./energyHudConfig";
import { playerStore } from "../state/playerStore";

export const ACTIVITY_PROFILE_IDS = [
	"generic",
	"chore",
	"exercise",
	"deep_work",
	"social",
	"rest",
] as const;

export type ActivityProfileId = (typeof ACTIVITY_PROFILE_IDS)[number];

const ALIASES: Record<string, ActivityProfileId> = {
	generic: "generic",
	default: "generic",
	chore: "chore",
	cleaning: "chore",
	household: "chore",
	life: "chore",
	exercise: "exercise",
	gym: "exercise",
	workout: "exercise",
	deep_work: "deep_work",
	deepwork: "deep_work",
	focus: "deep_work",
	social: "social",
	rest: "rest",
	recovery: "rest",
};

/** Per-completion deltas. Stress: negative = less stressed. */
export const WELLBEING_DELTAS: Record<
	ActivityProfileId,
	Partial<Record<"stress" | "motivation" | "focus" | "calm", number>>
> = {
	generic: {},
	chore: { stress: -10, calm: +8, motivation: +5 },
	exercise: { stress: -8, motivation: +10, focus: +8 },
	deep_work: { focus: +10, stress: +4, motivation: +3 },
	social: { motivation: +8, stress: -5, calm: +3 },
	rest: { calm: +12, stress: -8, motivation: +6, focus: +4 },
};

export function normalizeActivityProfileId(raw: string | undefined | null): ActivityProfileId {
	if (!raw || typeof raw !== "string") return "generic";
	const key = raw.trim().toLowerCase().replace(/\s+/g, "_");
	if ((ACTIVITY_PROFILE_IDS as readonly string[]).includes(key)) {
		return key as ActivityProfileId;
	}
	return ALIASES[key] ?? "generic";
}

export function parseActivityProfileFromTaskLine(line: string): ActivityProfileId {
	const m = line.match(/#activity\/([\w-]+)/i);
	if (m?.[1]) return normalizeActivityProfileId(m[1]);
	const brace = line.match(/\{([^}]*)\}/);
	if (brace) {
		const im = brace[1].match(/(?:activity|activityProfile)\s*:\s*["']?([\w-]+)["']?/i);
		if (im?.[1]) return normalizeActivityProfileId(im[1]);
	}
	const pipe = line.match(/(?:\||\s)(?:activity|activityProfile)\s*:\s*([\w-]+)/i);
	if (pipe?.[1]) return normalizeActivityProfileId(pipe[1]);
	return "generic";
}

export function resolveActivityProfileFromQuest(
	quest: Pick<Quest, "activityProfile" | "tags"> | null | undefined
): ActivityProfileId {
	if (!quest) return "generic";
	if (quest.activityProfile) return normalizeActivityProfileId(quest.activityProfile);
	if (quest.tags?.length) {
		for (const t of quest.tags) {
			const [k, v] = t.split("/");
			if (k?.toLowerCase() === "activity" && v) return normalizeActivityProfileId(v);
		}
	}
	return "generic";
}

export type WellbeingStatKey = 'stress' | 'motivation' | 'focus' | 'calm';

export type WellbeingDeltas = Partial<Record<WellbeingStatKey, number>>;

export interface WellbeingEffectResult {
	profile: ActivityProfileId;
	deltas: WellbeingDeltas;
}

function clamp(n: number, lo: number, hi: number): number {
	return Math.max(lo, Math.min(hi, n));
}

const WELLBEING_LABELS: Record<WellbeingStatKey, string> = {
	stress: 'Stress',
	motivation: 'Motivation',
	focus: 'Focus',
	calm: 'Calm',
};

export function formatWellbeingDeltaLine(deltas: WellbeingDeltas): string | null {
	const parts: string[] = [];
	(['focus', 'motivation', 'calm', 'stress'] as const).forEach((stat) => {
		const delta = deltas[stat];
		if (typeof delta !== 'number' || !Number.isFinite(delta) || delta === 0) return;
		const sign = delta > 0 ? '+' : '';
		parts.push(`${WELLBEING_LABELS[stat]} ${sign}${delta}`);
	});
	return parts.length > 0 ? parts.join(' · ') : null;
}

/**
 * Apply stress / motivation / focus / calm changes. Does not modify energy.
 */
export async function applyQuestWellbeingEffects(
	quest: Pick<Quest, "activityProfile" | "tags"> | null | undefined,
	settings?: Partial<GamificationPluginSettings> | null
): Promise<WellbeingEffectResult> {
	const profile = resolveActivityProfileFromQuest(quest);
	const deltas = filterWellbeingDeltas(WELLBEING_DELTAS[profile], settings) ?? {};
	if (!deltas || Object.keys(deltas).length === 0) {
		return { profile, deltas: {} };
	}

	await playerStore.update((data) => {
		const stats = { ...(data.stats || {}) };
		const defaults: Record<string, number> = {
			stress: 50,
			motivation: 50,
			focus: 50,
			calm: 50,
		};
		(
			["stress", "motivation", "focus", "calm"] as const
		).forEach((stat) => {
			const delta = deltas[stat];
			if (typeof delta !== "number" || !Number.isFinite(delta)) return;
			const cur =
				typeof stats[stat] === "number" && Number.isFinite(stats[stat] as number)
					? (stats[stat] as number)
					: defaults[stat] ?? 50;
			stats[stat] = clamp(cur + delta, 0, 100);
		});
		return { ...data, stats };
	});

	return { profile, deltas };
}

export function formatActivityProfileLabel(id: ActivityProfileId): string {
	const labels: Record<ActivityProfileId, string> = {
		generic: "Generic task",
		chore: "Chore / life admin",
		exercise: "Exercise / movement",
		deep_work: "Deep work / focus",
		social: "Social / creative",
		rest: "Rest / recovery",
	};
	return labels[id];
}
