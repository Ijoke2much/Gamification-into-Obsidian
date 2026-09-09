/** Rank ladder (E → ???). Derived from player level. */

export type Rank =
	| 'E'
	| 'D'
	| 'C'
	| 'B'
	| 'A'
	| 'S'
	| 'SS'
	| 'SSS'
	| 'SSS+'
	| '???';

const RANK_CAPS: Array<{ rank: Rank; maxLevel: number }> = [
	{ rank: 'E', maxLevel: 15 },
	{ rank: 'D', maxLevel: 25 },
	{ rank: 'C', maxLevel: 50 },
	{ rank: 'B', maxLevel: 75 },
	{ rank: 'A', maxLevel: 100 },
	{ rank: 'S', maxLevel: 200 },
	{ rank: 'SS', maxLevel: 500 },
	{ rank: 'SSS', maxLevel: 700 },
	{ rank: 'SSS+', maxLevel: 999 },
	{ rank: '???', maxLevel: Number.POSITIVE_INFINITY },
];

export function getRankFromLevel(level: number): Rank {
	const lv = Math.max(1, Math.floor(level || 1));
	if (lv <= 15) return 'E';
	if (lv <= 25) return 'D';
	if (lv <= 50) return 'C';
	if (lv <= 75) return 'B';
	if (lv <= 100) return 'A';
	if (lv <= 200) return 'S';
	if (lv <= 500) return 'SS';
	if (lv <= 700) return 'SSS';
	if (lv <= 999) return 'SSS+';
	return '???';
}

export function getRankProgress(level: number): {
	rank: Rank;
	nextRank: Rank | null;
	percent: number;
} {
	const lv = Math.max(1, Math.floor(level || 1));
	const rank = getRankFromLevel(lv);
	const index = RANK_CAPS.findIndex((band) => band.rank === rank);
	const prevMax = index <= 0 ? 0 : RANK_CAPS[index - 1].maxLevel;
	const thisMax = RANK_CAPS[index]?.maxLevel ?? Number.POSITIVE_INFINITY;
	if (!Number.isFinite(thisMax)) {
		return { rank, nextRank: null, percent: 100 };
	}
	const span = Math.max(1, thisMax - prevMax);
	const percent = Math.min(100, Math.max(0, Math.round(((lv - prevMax) / span) * 100)));
	return {
		rank,
		nextRank: RANK_CAPS[index + 1]?.rank ?? null,
		percent,
	};
}

export function getRankWhisper(rank: Rank): string {
	const whispers: Record<Rank, string> = {
		E: 'Every path starts here. Consistency is the first gate.',
		D: 'Your record begins to turn heads. Keep clearing the path.',
		C: 'Mid-tier ranks are earned through discipline, not luck.',
		B: 'You move with purpose now. Harder challenges await.',
		A: 'Elite status is within reach — mastery over many skills shows.',
		S: 'Few reach this tier without sustained effort.',
		SS: 'Few vaults sustain this pace for long.',
		SSS: 'Legendary consistency. The road still lengthens ahead.',
		'SSS+': 'Beyond the chart. Define the standard yourself.',
		'???': 'Unclassified power. The System offers no further label.',
	};
	return whispers[rank];
}
