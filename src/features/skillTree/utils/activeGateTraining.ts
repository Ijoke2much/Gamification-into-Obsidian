import { describeAffinity, skillMatchesGateAffinity, type JourneyAffinity } from '../../quests/utils/journeyAffinity';
import { getActiveBossFileRaid } from '../../quests/utils/bossRaidService';
import { loadJourneyState } from '../../quests/utils/journeyRunService';

export function collectActiveGateAffinities(): JourneyAffinity[] {
	const out: JourneyAffinity[] = [];
	const raid = getActiveBossFileRaid();
	if (raid && !raid.defeated && raid.affinity) {
		out.push(raid.affinity);
	}
	const run = loadJourneyState().activeRun;
	if (run?.status === 'active' && run.affinity) {
		out.push(run.affinity);
	}
	return out;
}

export function isSkillOnActiveGate(skillName: string, className?: string): boolean {
	return collectActiveGateAffinities().some((affinity) =>
		skillMatchesGateAffinity(skillName, className, affinity)
	);
}

export function gateTrainingBanner(): string | null {
	const affinities = collectActiveGateAffinities().filter(
		(a) => a.kind !== 'neutral' && a.target
	);
	if (affinities.length === 0) return null;
	return affinities.map((a) => describeAffinity(a)).join(' · ');
}

export function resolveGateSkillNames(
	skills: Array<{ name: string; class?: string }>,
	affinities = collectActiveGateAffinities()
): string[] {
	const names = new Set<string>();
	for (const skill of skills) {
		if (isSkillOnActiveGate(skill.name, skill.class)) {
			names.add(skill.name);
		}
	}
	for (const affinity of affinities) {
		if (affinity.kind === 'skill' && affinity.target) names.add(affinity.target);
		for (const s of affinity.matchedSkills ?? []) names.add(s);
	}
	return Array.from(names);
}
