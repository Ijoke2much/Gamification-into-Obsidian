/**
 * Energy spent or restored when a quest of a given activity type is finished.
 * Positive spends stats.energy. Negative restores it.
 * A quest can override the type with its own number (energyLocked).
 */

import { storedActivityTypeId } from "./questWellbeingProfiles";

export interface ActivityEnergyRule {
	id: string;
	label: string;
	energy: number;
}

export const ACTIVITY_ENERGY_MIN = -50;
export const ACTIVITY_ENERGY_MAX = 50;
export const GENERIC_ACTIVITY_ENERGY = 10;

export const DEFAULT_ACTIVITY_ENERGY_RULES: ActivityEnergyRule[] = [
	{ id: "chore", label: "Chores", energy: 15 },
	{ id: "social", label: "Social", energy: 20 },
	{ id: "deep_work", label: "Deep work", energy: 25 },
	{ id: "create", label: "Create", energy: 20 },
	{ id: "exercise", label: "Exercise", energy: -10 },
	{ id: "rest", label: "Rest", energy: -15 },
];

export function clampActivityEnergy(value: number): number {
	if (!Number.isFinite(value)) return 0;
	return Math.max(ACTIVITY_ENERGY_MIN, Math.min(ACTIVITY_ENERGY_MAX, Math.trunc(value)));
}

export function normalizeActivityEnergyRules(raw: unknown): ActivityEnergyRule[] {
	if (!Array.isArray(raw) || raw.length === 0) {
		return DEFAULT_ACTIVITY_ENERGY_RULES.map((rule) => ({ ...rule }));
	}
	const seen = new Set<string>();
	const out: ActivityEnergyRule[] = [];
	for (const item of raw) {
		if (!item || typeof item !== "object") continue;
		const rec = item as Record<string, unknown>;
		const id = storedActivityTypeId(String(rec.id ?? rec.label ?? ""));
		if (!id || id === "generic" || seen.has(id)) continue;
		const label =
			typeof rec.label === "string" && rec.label.trim() ? rec.label.trim() : id;
		seen.add(id);
		out.push({
			id,
			label,
			energy: clampActivityEnergy(Number(rec.energy)),
		});
	}
	return out.length > 0 ? out : DEFAULT_ACTIVITY_ENERGY_RULES.map((rule) => ({ ...rule }));
}

export function energyForActivityType(
	activityProfile: string | undefined | null,
	rules?: ActivityEnergyRule[] | null
): number | undefined {
	const slug = storedActivityTypeId(activityProfile);
	if (slug === "generic") return undefined;
	const rule = normalizeActivityEnergyRules(rules).find((item) => item.id === slug);
	return rule ? rule.energy : undefined;
}

/**
 * Signed energy change for one quest.
 * A locked number on the quest wins. Otherwise the activity type wins,
 * including over a saved 10 left by the old default.
 */
export function resolveActivityEnergy(
	quest: {
		activityProfile?: string;
		energyCost?: number;
		energyLocked?: boolean;
	} | null | undefined,
	rules?: ActivityEnergyRule[] | null
): number {
	const raw = quest?.energyCost;
	const hasRaw = typeof raw === "number" && Number.isFinite(raw);
	if (quest?.energyLocked === true && hasRaw) return clampActivityEnergy(raw as number);
	const fromType = energyForActivityType(quest?.activityProfile, rules);
	if (typeof fromType === "number") return fromType;
	if (hasRaw) return clampActivityEnergy(raw as number);
	return GENERIC_ACTIVITY_ENERGY;
}

export function activityEnergyLabel(
	activityProfile: string | undefined | null,
	rules?: ActivityEnergyRule[] | null
): string {
	const slug = storedActivityTypeId(activityProfile);
	if (slug === "generic") return "";
	const rule = normalizeActivityEnergyRules(rules).find((item) => item.id === slug);
	if (rule?.label) return rule.label;
	return slug.replace(/_/g, " ");
}

/** Positive cost stays a number. A restore is shown as +10. */
export function formatActivityEnergyAmount(cost: number): string {
	if (cost < 0) return `+${Math.abs(cost)}`;
	return String(cost);
}

export function formatActivityEnergyBadge(
	quest: {
		activityProfile?: string;
		energyCost?: number;
		energyLocked?: boolean;
	} | null | undefined,
	rules?: ActivityEnergyRule[] | null
): string | null {
	const label = activityEnergyLabel(quest?.activityProfile, rules);
	if (!label) return null;
	return `${label} · ${formatActivityEnergyAmount(resolveActivityEnergy(quest, rules))}`;
}

/** Append `energy` + `energyLock` onto the first line when this quest overrides its type. */
export function appendLockedEnergyMeta(
	markdown: string,
	energyCost: number | undefined,
	energyLocked?: boolean
): string {
	if (!energyLocked || typeof energyCost !== "number" || !Number.isFinite(energyCost)) {
		return markdown;
	}
	const fragment = `energy: ${Math.trunc(energyCost)} | energyLock: true`;
	const nl = markdown.indexOf("\n");
	const head = nl === -1 ? markdown : markdown.slice(0, nl);
	const tail = nl === -1 ? "" : markdown.slice(nl);
	const next = head.includes(" // ") ? `${head} | ${fragment}` : `${head} // ${fragment}`;
	return next + tail;
}
