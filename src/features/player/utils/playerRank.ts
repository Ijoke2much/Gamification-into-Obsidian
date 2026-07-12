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
