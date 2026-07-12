export type Rank = 'E' | 'D' | 'C' | 'B' | 'A' | 'S' | 'SS' | 'SSS' | 'SSS+' | '???';

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
