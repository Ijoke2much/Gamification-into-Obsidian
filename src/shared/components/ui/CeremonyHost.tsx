import React, { useCallback, useEffect, useState } from 'react';
import { getRankWhisper } from '../../../features/player/utils/playerRank';
import { onCeremony, type CeremonyDetail } from '../../utils/ceremonyEvents';
import { showRankUpFallbackNotice } from '../../services/ceremonyService';
import {
	SystemActionBtn,
	SystemBackdrop,
	SystemFrame,
	SystemHeader,
	SystemLicenseCard,
	systemPanelStyles as s,
} from './system';

export interface CeremonyHostProps {
	/** Mobile: level-up modal only; rank_up becomes a notice */
	lite?: boolean;
}

export const CeremonyHost: React.FC<CeremonyHostProps> = ({ lite = false }) => {
	const [queue, setQueue] = useState<CeremonyDetail[]>([]);
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
		return onCeremony((detail) => {
			if (lite && detail.kind === 'rank_up') {
				showRankUpFallbackNotice(detail.oldRank, detail.newRank, detail.level);
				return;
			}
			if (lite && detail.kind !== 'level_up') return;
			setQueue((prev) => [...prev, detail]);
		});
	}, [lite]);

	const current = queue[0] ?? null;

	const dismiss = useCallback(() => {
		setQueue((prev) => prev.slice(1));
	}, []);

	useEffect(() => {
		if (!mounted || current) return;
	}, [mounted, current]);

	if (!current) return null;

	const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

	if (current.kind === 'rank_up') {
		const whisper = getRankWhisper(current.newRank);
		return (
			<div data-ceremony-host data-ceremony-lite={lite ? 'true' : undefined}>
				<SystemBackdrop onDismiss={dismiss} ariaLabelledBy="ceremony-rank-title">
					<SystemFrame wide onClick={stopPropagation}>
						<SystemHeader icon="🏛" label="SYSTEM: HUNTER ASSOCIATION" title="Rank elevated" />
						<SystemLicenseCard
							serial={String(current.level).padStart(6, '0')}
							rank={current.newRank}
							level={current.level}
							rankLabel={`${current.newRank}-rank hunter`}
						/>
						<div className={s.rankRow}>
							<span className={`${s.rankBadge} ${s.rankBadgeOld}`}>{current.oldRank}</span>
							<span className={s.rankArrow} aria-hidden="true">
								→
							</span>
							<span className={`${s.rankBadge} ${s.rankBadgeNew}`}>{current.newRank}</span>
						</div>
						<p className={s.whisper}>{whisper}</p>
						<SystemActionBtn onClick={dismiss}>Understood</SystemActionBtn>
					</SystemFrame>
				</SystemBackdrop>
			</div>
		);
	}

	return (
		<div data-ceremony-host data-ceremony-lite={lite ? 'true' : undefined}>
			<SystemBackdrop onDismiss={dismiss} ariaLabelledBy="ceremony-level-title">
				<SystemFrame wide onClick={stopPropagation}>
					<SystemHeader icon="✦" label="SYSTEM" title="Level up" />
					<div className={s.levelValue}>{current.newLevel}</div>
					<p className={s.subtitle}>Rank {current.rank}</p>
					<p className={s.whisper}>
						{lite
							? 'Level up recorded. Keep the run going.'
							: 'Your capacity grows. The vault records another step forward.'}
					</p>
					<SystemActionBtn onClick={dismiss}>Understood</SystemActionBtn>
				</SystemFrame>
			</SystemBackdrop>
		</div>
	);
};

/** Fallback when no React host is mounted (e.g. sidebar-only views). */
export function ensureCeremonyFallback(detail: CeremonyDetail): void {
	if (detail.kind === 'rank_up') {
		showRankUpFallbackNotice(detail.oldRank, detail.newRank, detail.level);
	}
}
