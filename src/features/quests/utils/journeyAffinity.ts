import type { Quest } from './taskParser';
import type { SkillMetadata } from '../../../shared/utils/skillDiscovery';
import type { JourneyAffinityRule } from '../data/journeyFoeCatalog';

/**
 * A resolved foe weakness for a board cycle / run.
 * - neutral: any task deals full damage
 * - skill: only tasks tagged with this exact skill deal full damage
 * - class: tasks tagged with the class, or any skill under it, deal full damage
 *
 * `matchedSkills` is resolved when the board is rolled so that damage checks
 * stay synchronous (no vault reads at completion time).
 */
export interface JourneyAffinity {
	kind: 'neutral' | 'skill' | 'class';
	target?: string;
	matchedSkills?: string[];
}

/** Damage multiplier for tasks that do NOT match the foe's affinity. */
export const JOURNEY_OFF_AFFINITY_MULTIPLIER = 0.25;

export const NEUTRAL_AFFINITY: JourneyAffinity = { kind: 'neutral' };

function norm(value: string | undefined | null): string {
	return (value ?? '').trim().toLowerCase();
}

function pickRandom<T>(items: T[]): T | undefined {
	if (items.length === 0) return undefined;
	return items[Math.floor(Math.random() * items.length)];
}

function buildClassMap(skills: SkillMetadata[]): Map<string, { name: string; skills: string[] }> {
	const map = new Map<string, { name: string; skills: string[] }>();
	for (const s of skills) {
		if (!s.class) continue;
		const key = norm(s.class);
		if (!key) continue;
		const entry = map.get(key) ?? { name: s.class.trim(), skills: [] };
		if (s.name) entry.skills.push(s.name.trim());
		map.set(key, entry);
	}
	return map;
}

function affinityForClass(
	classKey: string,
	classMap: Map<string, { name: string; skills: string[] }>
): JourneyAffinity | undefined {
	const entry = classMap.get(classKey);
	if (!entry) return undefined;
	return { kind: 'class', target: entry.name, matchedSkills: entry.skills };
}

/**
 * Resolve a foe's affinity rule into a concrete affinity using the user's
 * skill tree. Dangling fixed references and empty skill trees degrade to
 * neutral so a run can never become unwinnable by accident.
 */
export function rollAffinityForRule(
	rule: JourneyAffinityRule | undefined,
	skills: SkillMetadata[]
): JourneyAffinity {
	if (!rule || rule.kind === 'neutral') return NEUTRAL_AFFINITY;

	const classMap = buildClassMap(skills);
	const skillNames = skills.map((s) => s.name?.trim()).filter(Boolean) as string[];

	switch (rule.kind) {
		case 'fixed-skill': {
			const match = skillNames.find((n) => norm(n) === norm(rule.skill));
			return match ? { kind: 'skill', target: match } : NEUTRAL_AFFINITY;
		}
		case 'fixed-class': {
			return affinityForClass(norm(rule.className), classMap) ?? NEUTRAL_AFFINITY;
		}
		case 'random-skill': {
			const skill = pickRandom(skillNames);
			return skill ? { kind: 'skill', target: skill } : NEUTRAL_AFFINITY;
		}
		case 'random-class': {
			const classKey = pickRandom(Array.from(classMap.keys()));
			return (classKey && affinityForClass(classKey, classMap)) || NEUTRAL_AFFINITY;
		}
		case 'random': {
			const useSkill = Math.random() < 0.5;
			if (useSkill && skillNames.length > 0) {
				return { kind: 'skill', target: pickRandom(skillNames)! };
			}
			const classKey = pickRandom(Array.from(classMap.keys()));
			const byClass = classKey ? affinityForClass(classKey, classMap) : undefined;
			if (byClass) return byClass;
			const skill = pickRandom(skillNames);
			return skill ? { kind: 'skill', target: skill } : NEUTRAL_AFFINITY;
		}
		default:
			return NEUTRAL_AFFINITY;
	}
}

/** Collect every skill name attached to a quest (skills field + #skill/ tags). */
function collectQuestSkills(quest: Quest): string[] {
	const out: string[] = [];
	for (const s of quest.skills ?? []) {
		if (s) out.push(norm(s));
	}
	for (const tag of quest.tags ?? []) {
		const t = norm(tag);
		if (t.startsWith('skill/')) out.push(t.slice('skill/'.length));
	}
	return out;
}

/** Collect every class name attached to a quest (className field + #class/ tags). */
function collectQuestClasses(quest: Quest): string[] {
	const out: string[] = [];
	if (quest.className) out.push(norm(quest.className));
	for (const tag of quest.tags ?? []) {
		const t = norm(tag);
		if (t.startsWith('class/')) out.push(t.slice('class/'.length));
	}
	return out;
}

export function questMatchesAffinity(quest: Quest, affinity: JourneyAffinity | undefined): boolean {
	if (!affinity || affinity.kind === 'neutral') return true;
	const target = norm(affinity.target);
	if (!target) return true;

	const questSkills = collectQuestSkills(quest);

	if (affinity.kind === 'skill') {
		return questSkills.includes(target);
	}

	// class affinity: direct class match, or any quest skill under the class
	if (collectQuestClasses(quest).includes(target)) return true;
	const memberSkills = new Set((affinity.matchedSkills ?? []).map(norm));
	return questSkills.some((s) => memberSkills.has(s));
}

/** Short human-readable label for roster cards and run banners. */
export function describeAffinity(affinity: JourneyAffinity | undefined): string {
	if (!affinity || affinity.kind === 'neutral' || !affinity.target) {
		return 'Neutral — any task lands';
	}
	return affinity.kind === 'skill'
		? `Weak to skill: ${affinity.target}`
		: `Weak to class: ${affinity.target}`;
}

/** Compact pill label, e.g. "🎯 Body Builder" / "🛡 Physical" / "Neutral". */
export function affinityPillLabel(affinity: JourneyAffinity | undefined): string {
	if (!affinity || affinity.kind === 'neutral' || !affinity.target) return 'Neutral';
	return affinity.kind === 'skill' ? `🎯 ${affinity.target}` : `🛡 ${affinity.target}`;
}

/** Label describing a rule before it is rolled (for roster cards pre-roll). */
export function describeAffinityRule(rule: JourneyAffinityRule | undefined): string {
	if (!rule || rule.kind === 'neutral') return 'Neutral';
	switch (rule.kind) {
		case 'random':
			return 'Random skill or class';
		case 'random-skill':
			return 'Random skill';
		case 'random-class':
			return 'Random class';
		case 'fixed-skill':
			return `Always skill: ${rule.skill}`;
		case 'fixed-class':
			return `Always class: ${rule.className}`;
	}
}

/**
 * Skill names that should receive gate raid CP (same routing as quest completion).
 * Class affinities fan out to every skill under the class when known.
 */
export function resolveCpSkillsFromAffinity(affinity: JourneyAffinity | undefined): string[] {
	if (!affinity || affinity.kind === 'neutral' || !affinity.target) return [];

	if (affinity.kind === 'skill') {
		return [affinity.target.trim()];
	}

	if (affinity.matchedSkills?.length) {
		return affinity.matchedSkills.map((s) => s.trim()).filter(Boolean);
	}

	return [affinity.target.trim()];
}

/** Fallback CP targets from a boss note when no active raid affinity is stored. */
export function resolveCpSkillsFromBossSkillTag(skillTag: string | undefined): string[] {
	const skill = (skillTag ?? '').trim();
	if (!skill || skill === 'neutral') return [];
	if (skill.startsWith('skill:')) {
		const name = skill.slice('skill:'.length).trim();
		return name ? [name] : [];
	}
	if (skill.startsWith('class:')) {
		const name = skill.slice('class:'.length).trim();
		return name ? [name] : [];
	}
	return [];
}
