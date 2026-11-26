import React from 'react';
import type { JourneyFoeDefinition } from '../../../features/quests/data/journeyFoeCatalog';
import type { JourneyBoard, JourneyRun } from '../../../features/quests/utils/journeyRunService';
import { getBoardAffinityForFoe } from '../../../features/quests/utils/journeyRunService';
import { affinityPillLabel } from '../../../features/quests/utils/journeyAffinity';
import {
	SystemActionBtn,
	SystemHeader,
	systemPanelStyles as sys,
} from '../../../shared/components/ui/system';
import hubStyles from './QuestHubPanels.module.css';

interface JourneyRosterPanelProps {
	foes: JourneyFoeDefinition[];
	board: JourneyBoard | null;
	boardDaysRemaining: number;
	activeRun: JourneyRun | null;
	clearedFoeIds: string[];
	onFaceFoe: (foeId: string) => void;
	onCreateFoe?: () => void;
	onEditFoe?: (foe: JourneyFoeDefinition) => void;
	resolveSprite?: (foe: JourneyFoeDefinition) => string | null;
	startError: string | null;
	compact?: boolean;
	systemUi?: boolean;
}

const DIFFICULTY_TAG_CLASS: Record<JourneyFoeDefinition['difficulty'], string> = {
	easy: 'diffTagEasy',
	medium: 'diffTagMedium',
	hard: 'diffTagHard',
};

function foeStatus(
	foe: JourneyFoeDefinition,
	activeRun: JourneyRun | null,
	clearedFoeIds: string[]
): 'active' | 'cleared' | 'available' {
	if (activeRun?.foeId === foe.id && activeRun.status === 'active') return 'active';
	if (
		activeRun?.foeId === foe.id &&
		(activeRun.status === 'completed' || activeRun.status === 'failed')
	) {
		return 'active';
	}
	if (clearedFoeIds.includes(foe.id)) return 'cleared';
	return 'available';
}

export const JourneyRosterPanel: React.FC<JourneyRosterPanelProps> = ({
	foes,
	board,
	boardDaysRemaining,
	activeRun,
	clearedFoeIds,
	onFaceFoe,
	onCreateFoe,
	onEditFoe,
	resolveSprite,
	startError,
	compact = false,
	systemUi = false,
}) => {
	const hasBlockingRun = activeRun != null && activeRun.status === 'active';
	const heading = compact ? 'Pick your next foe' : 'Who blocks the road?';

	const rosterHint = (
		<p className={systemUi ? sys.lead : hubStyles.panelHint}>
			Pick a foe to face this week. Tasks matching a foe&apos;s weakness hit hard — everything
			else only grazes.
			{board && boardDaysRemaining > 0 && (
				<> Board reshuffles in {boardDaysRemaining}d.</>
			)}
		</p>
	);

	return (
		<div
			className={`${hubStyles.journeyRosterSection} ${compact ? hubStyles.journeyRosterCompact : ''} ${systemUi ? hubStyles.journeyRosterSystem : ''}`}
			aria-label="Journey foe roster"
		>
			{systemUi ? (
				<SystemHeader icon="👹" label="SYSTEM: FOE REGISTRY" title={heading} />
			) : (
				<h4 className={hubStyles.journeyRosterHeading}>{heading}</h4>
			)}
			{rosterHint}

			{startError && <p className={hubStyles.journeyError}>{startError}</p>}

			{hasBlockingRun && (
				<p className={hubStyles.journeyNotice}>
					Finish or leave your current run before facing another foe.
				</p>
			)}

			<ul className={hubStyles.rosterList}>
				{foes.map((foe) => {
					const status = foeStatus(foe, activeRun, clearedFoeIds);
					const canFace =
						(status === 'available' || status === 'cleared') && !hasBlockingRun;
					const affinity = getBoardAffinityForFoe(board, foe.id);
					const isNeutral = !affinity || affinity.kind === 'neutral';
					const spriteUrl = resolveSprite?.(foe) ?? null;
					const faceLabel =
						status === 'active'
							? 'In progress'
							: status === 'cleared'
								? 'Face again'
								: canFace
									? 'Face this foe'
									: 'Unavailable';

					return (
						<li key={foe.id} className={hubStyles.rosterCard}>
							<div className={hubStyles.rosterCardTop}>
								<span className={hubStyles.rosterEmoji} aria-hidden="true">
									{spriteUrl ? (
										<img className={hubStyles.rosterSprite} src={spriteUrl} alt="" />
									) : (
										foe.emoji
									)}
								</span>
								<div className={hubStyles.rosterMeta}>
									<div className={hubStyles.rosterNameRow}>
										<span className={hubStyles.rosterName}>{foe.name}</span>
										{foe.isCustom && onEditFoe && (
											<button
												type="button"
												className={hubStyles.rosterEditBtn}
												onClick={() => onEditFoe(foe)}
												aria-label={`Edit ${foe.name}`}
												title="Edit this custom foe"
											>
												✎
											</button>
										)}
										<span
											className={`${hubStyles.rosterBadge} ${
												hubStyles[DIFFICULTY_TAG_CLASS[foe.difficulty]]
											}`}
										>
											{foe.difficulty.toUpperCase()}
										</span>
										{status !== 'available' && (
											<span
												className={`${hubStyles.rosterBadge} ${
													status === 'active'
														? hubStyles.rosterBadgeActive
														: hubStyles.rosterBadgeCleared
												}`}
											>
												{status === 'active' ? 'ACTIVE' : 'CLEARED'}
											</span>
										)}
									</div>
									<p className={hubStyles.rosterBlurb}>{foe.description}</p>
									<div className={hubStyles.rosterStats}>
										<span>{foe.maxHp} HP</span>
										<span>{foe.windowDays}d window</span>
										<span>{foe.lootTier} loot</span>
									</div>
									<span
										className={`${hubStyles.affinityPill} ${
											isNeutral ? hubStyles.affinityPillNeutral : hubStyles.affinityPillTarget
										}`}
										title={
											isNeutral
												? 'Neutral: every completed task deals full damage.'
												: `Weak to ${affinity!.kind} "${affinity!.target}". Other tasks only graze.`
										}
									>
										{affinityPillLabel(affinity)}
									</span>
								</div>
							</div>
							{systemUi ? (
								<SystemActionBtn
									secondary={!canFace}
									disabled={!canFace}
									onClick={() => onFaceFoe(foe.id)}
								>
									{faceLabel}
								</SystemActionBtn>
							) : (
								<button
									type="button"
									className={hubStyles.rosterFaceBtn}
									disabled={!canFace}
									onClick={() => onFaceFoe(foe.id)}
								>
									{faceLabel}
								</button>
							)}
						</li>
					);
				})}
			</ul>

			{onCreateFoe &&
				(systemUi ? (
					<SystemActionBtn secondary onClick={onCreateFoe}>
						Create your own foe
					</SystemActionBtn>
				) : (
					<button type="button" className={hubStyles.rosterCreateBtn} onClick={onCreateFoe}>
						＋ Create your own foe
					</button>
				))}
		</div>
	);
};
