import type { Rank } from '../../features/player/utils/playerRank';

export type CeremonyKind = 'level_up' | 'rank_up';

export interface LevelUpCeremonyDetail {
	kind: 'level_up';
	oldLevel: number;
	newLevel: number;
	rank: Rank;
}

export interface RankUpCeremonyDetail {
	kind: 'rank_up';
	oldRank: Rank;
	newRank: Rank;
	level: number;
}

export type CeremonyDetail = LevelUpCeremonyDetail | RankUpCeremonyDetail;

export const CEREMONY_EVENT = 'gamification-ceremony';

export function emitCeremony(detail: CeremonyDetail): void {
	if (typeof document === 'undefined') return;
	document.dispatchEvent(new CustomEvent(CEREMONY_EVENT, { detail }));
}

export function onCeremony(listener: (detail: CeremonyDetail) => void): () => void {
	if (typeof document === 'undefined') return () => undefined;

	const handler = (event: Event) => {
		const custom = event as CustomEvent<CeremonyDetail>;
		if (custom.detail?.kind) listener(custom.detail);
	};

	document.addEventListener(CEREMONY_EVENT, handler);
	return () => document.removeEventListener(CEREMONY_EVENT, handler);
}
