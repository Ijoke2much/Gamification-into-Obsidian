/**
 * How a foe's weakness is determined when the journey board is rolled.
 * - neutral: any completed task damages this foe
 * - random: rolls either a skill or a class from the user's skill tree
 * - random-skill / random-class: rolls only that kind (narrow vs broad)
 * - fixed-skill / fixed-class: always weak to the pinned target
 */
export type JourneyAffinityRule =
	| { kind: 'neutral' }
	| { kind: 'random' }
	| { kind: 'random-skill' }
	| { kind: 'random-class' }
	| { kind: 'fixed-skill'; skill: string }
	| { kind: 'fixed-class'; className: string };

export interface JourneyFoeDefinition {
	id: string;
	name: string;
	description: string;
	emoji: string;
	maxHp: number;
	windowDays: number;
	difficulty: 'easy' | 'medium' | 'hard';
	lootTier: 'common' | 'uncommon' | 'rare';
	pathWhisper: string;
	affinityRule: JourneyAffinityRule;
	/** Vault-relative path to a sprite image; falls back to `emoji` when missing. */
	sprite?: string;
	/** True when the foe was defined by the user in Foes.md. */
	isCustom?: boolean;
}

export const JOURNEY_FOE_CATALOG: JourneyFoeDefinition[] = [
	{
		id: 'wandering-shade',
		name: 'Wandering Shade',
		description:
			'A half-formed spirit that gathers where intentions go unfulfilled. It cannot be struck directly—only starved by finished work. Each quest you complete this week peels strength from its form.',
		emoji: '👤',
		maxHp: 100,
		windowDays: 7,
		difficulty: 'medium',
		lootTier: 'common',
		pathWhisper:
			'The shade blocks the canyon trail. Each quest you finish this week is another step forward—and another cut at its strength.',
		affinityRule: { kind: 'random-class' },
	},
	{
		id: 'sloth-ghost',
		name: 'Sloth Ghost',
		description:
			'Drifts through lazy afternoons and open tabs. Weak to momentum: small tasks count, but hard quests hit harder. Leave the run early and it simply fades with no spoils.',
		emoji: '👻',
		maxHp: 80,
		windowDays: 7,
		difficulty: 'easy',
		lootTier: 'common',
		pathWhisper: 'It hums a lullaby. Keep moving—the road clears one checkbox at a time.',
		affinityRule: { kind: 'neutral' },
	},
	{
		id: 'inbox-hydra',
		name: 'Inbox Hydra',
		description:
			'Every cleared message seems to sprout two more—until you commit to deep work. High-energy tasks deal extra journey damage against this foe.',
		emoji: '🐍',
		maxHp: 140,
		windowDays: 7,
		difficulty: 'hard',
		lootTier: 'uncommon',
		pathWhisper: 'Heads turn when you finish something hard. That is the only blade that works here.',
		affinityRule: { kind: 'random-skill' },
	},
	{
		id: 'deadline-wraith',
		name: 'Deadline Wraith',
		description:
			'Feeds on approaching due dates. The clock is part of the fight—when the window ends, whatever HP remains determines whether it escapes or falls.',
		emoji: '⏳',
		maxHp: 120,
		windowDays: 5,
		difficulty: 'hard',
		lootTier: 'rare',
		pathWhisper: 'Time is already moving. Your completed tasks are the only spell that lands.',
		affinityRule: { kind: 'random' },
	},
];

