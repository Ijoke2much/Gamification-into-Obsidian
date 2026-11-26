import React, { useEffect, useMemo, useRef, useState } from 'react';
import type GamifiedObsidianPlugin from '../../../core/main';
import { getJourneyFoes, getJourneyFoeById } from '../../../features/quests/utils/journeyFoeRegistry';
import { getDungeonProgress } from '../../../features/quests/utils/journeyRunService';
import { useJourneyRun } from '../../../features/quests/hooks/useJourneyRun';
import { DungeonBossRosterPanel } from './DungeonBossRosterPanel';
import { DungeonDebugPanel } from './DungeonDebugPanel';
import { GateRaidResumeBanner } from './GateRaidResumeBanner';
import hubStyles from './QuestHubPanels.module.css';

interface QuestDungeonPanelProps {
	plugin: GamifiedObsidianPlugin;
}

export const QuestDungeonPanel: React.FC<QuestDungeonPanelProps> = ({ plugin }) => {
	const { state, activeRun, clearedFoeIds, refresh } = useJourneyRun();
	const foes = useMemo(() => getJourneyFoes(), []);
	const progress = useMemo(
		() =>
			getDungeonProgress(
				{
					activeRun,
					clearedFoeIds,
					board: null,
					dungeonRaid: state.dungeonRaid,
					dungeonClearedForCycle: state.dungeonClearedForCycle,
				},
				foes.length
			),
		[activeRun, clearedFoeIds, state.dungeonRaid, state.dungeonClearedForCycle, foes.length]
	);
	const unlocked = progress.unlocked;
	const clearProgress = Math.min(
		100,
		Math.round((progress.clearedCount / Math.max(1, progress.required)) * 100)
	);
	const bossSource = progress.bossSourceFoeId ? getJourneyFoeById(progress.bossSourceFoeId) : null;

	const prevUnlocked = useRef(unlocked);
	const [pulseUnlock, setPulseUnlock] = useState(false);

	useEffect(() => {
		if (unlocked && !prevUnlocked.current) {
			setPulseUnlock(true);
			const t = window.setTimeout(() => setPulseUnlock(false), 4000);
			return () => window.clearTimeout(t);
		}
		prevUnlocked.current = unlocked;
	}, [unlocked]);

	return (
		<div data-gamification-pixel-enclave data-gamification-shell="pixel">
			<section
				className={`${hubStyles.panelSection} ${unlocked ? hubStyles.panelSectionGateOpen : ''}`}
			>
				<h3 className={hubStyles.panelTitle}>Dungeon</h3>
				<p className={hubStyles.panelHint}>
					{unlocked
						? 'Gate open — pick a boss and enter the raid.'
						: `Optional boss raids for premium loot. Unlocks after you defeat enough Journey foes this board cycle (${progress.required} required on a roster of ${foes.length}).`}
				</p>

				{!unlocked && (
					<div className={hubStyles.dungeonWeakenTrack}>
						<div className={hubStyles.dungeonWeakenLabel}>
							<span>Clearance progress</span>
							<span>
								{progress.clearedCount}/{progress.required}
							</span>
						</div>
						<div className={hubStyles.dungeonWeakenBar} aria-hidden="true">
							<span
								className={hubStyles.dungeonWeakenFill}
								style={{ width: `${Math.max(4, clearProgress)}%` }}
							/>
						</div>
						<p className={hubStyles.dungeonWeakenHint}>
							{progress.pendingVictoryFoeId
								? 'Return to roster after victory to count your latest clear'
								: 'Each defeated foe on the weekly board counts toward the raid gate'}
						</p>
					</div>
				)}

				{unlocked && (
					<>
						<GateRaidResumeBanner plugin={plugin} />
						<DungeonBossRosterPanel
							plugin={plugin}
							gateFoe={bossSource}
							pulseUnlock={pulseUnlock}
							clearedForCycle={progress.clearedForCycle}
							onForgeBoss={() => void plugin.openCreateBossModal(refresh)}
						/>
					</>
				)}

				{!unlocked && (
					<div className={`${hubStyles.dungeonCard} ${hubStyles.dungeonCardLocked}`}>
						<div className={hubStyles.dungeonIcon} aria-hidden="true">
							🔒
						</div>
						<div className={hubStyles.dungeonTitle}>Raid chamber sealed</div>
						<p className={hubStyles.dungeonBody}>
							Defeat {progress.required - progress.clearedCount} more Journey foe
							{progress.required - progress.clearedCount === 1 ? '' : 's'} to unlock a dungeon raid.
						</p>
					</div>
				)}
			</section>

			<section className={hubStyles.dungeonDebugSection} aria-label="Dungeon debug tools">
				<DungeonDebugPanel plugin={plugin} onRefresh={refresh} />
			</section>
		</div>
	);
};
