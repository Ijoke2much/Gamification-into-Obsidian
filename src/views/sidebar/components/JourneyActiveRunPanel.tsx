import React from 'react';
import type { JourneyFoeDefinition } from '../../../features/quests/data/journeyFoeCatalog';
import type { JourneyRun } from '../../../features/quests/utils/journeyRunService';
import { getDaysRemainingForRun } from '../../../features/quests/utils/journeyRunService';
import { describeAffinity } from '../../../features/quests/utils/journeyAffinity';
import {
	SystemActionBtn,
	SystemInfoBox,
	SystemLicenseCard,
	SystemStatGrid,
	systemPanelStyles as sys,
} from '../../../shared/components/ui/system';
import hubStyles from './QuestHubPanels.module.css';

interface JourneyActiveRunPanelProps {
	run: JourneyRun;
	foe: JourneyFoeDefinition;
	dungeonClearedCount?: number;
	dungeonRequired?: number;
	onLeaveRun: () => void;
	onDismissVictory: () => void;
	onDebugTask?: () => void;
	systemUi?: boolean;
}

export const JourneyActiveRunPanel: React.FC<JourneyActiveRunPanelProps> = ({
	run,
	foe,
	dungeonClearedCount,
	dungeonRequired,
	onLeaveRun,
	onDismissVictory,
	onDebugTask,
	systemUi = false,
}) => {
	const daysLeft = getDaysRemainingForRun(run);
	const defeated = run.status === 'completed';
	const urgent = !defeated && daysLeft <= 1;
	const hasAffinity = run.affinity != null && run.affinity.kind !== 'neutral';

	const handleLeave = () => {
		const ok = window.confirm(
			'Leave this Journey run?\n\nYour completed tasks stay done, but you forfeit all Journey loot for this foe.'
		);
		if (ok) onLeaveRun();
	};

	const statCells = [
		{ label: 'Tasks', value: String(run.tasksCompletedCount) },
		{ label: 'Damage', value: String(run.totalDamageDealt) },
		{
			label: 'Days left',
			value: `${daysLeft}d`,
			highlight: urgent,
		},
	];

	if (dungeonRequired != null && dungeonClearedCount != null) {
		statCells.push({
			label: 'Raid gate',
			value: `${dungeonClearedCount}/${dungeonRequired}`,
		});
	}

	return (
		<div className={hubStyles.journeyHubBody} aria-label="Journey run progress">
			{systemUi ? (
				<>
					<SystemLicenseCard
						rank={foe.difficulty.charAt(0).toUpperCase()}
						level={daysLeft}
						rankLabel={`${foe.name} · ${describeAffinity(run.affinity)}`}
					/>
					<p className={sys.lead}>
						{defeated
							? 'This foe has fallen. Return below to pick a new foe from the roster.'
							: hasAffinity
								? 'Tasks matching the weakness deal full damage; everything else only grazes.'
								: 'Complete tasks in the Tasks tab to deal damage.'}
					</p>
					<SystemStatGrid cells={statCells} />
				</>
			) : (
				<article className={hubStyles.foeDetailCard}>
					<h4 className={hubStyles.foeDetailName}>{foe.name}</h4>
					<p className={hubStyles.foeDetailDesc}>{foe.description}</p>
					<span
						className={`${hubStyles.affinityPill} ${
							hasAffinity ? hubStyles.affinityPillTarget : hubStyles.affinityPillNeutral
						}`}
					>
						{describeAffinity(run.affinity)}
					</span>
					<p className={hubStyles.foeDetailHint}>
						{defeated
							? 'This foe has fallen. Return below to pick a new foe from the roster.'
							: hasAffinity
								? 'Tasks matching the weakness above deal full damage; everything else only grazes.'
								: 'Complete tasks in the Tasks tab to deal damage. No manual attacks on this screen.'}
					</p>
				</article>
			)}

			<div className={hubStyles.journeyActionRow}>
				{defeated ? (
					systemUi ? (
						<SystemActionBtn onClick={onDismissVictory}>Return to roster</SystemActionBtn>
					) : (
						<button type="button" className={hubStyles.btnVictory} onClick={onDismissVictory}>
							Return to roster
						</button>
					)
				) : systemUi ? (
					<>
						<SystemActionBtn secondary onClick={handleLeave}>
							Leave run
						</SystemActionBtn>
						{onDebugTask && (
							<SystemActionBtn secondary onClick={onDebugTask}>
								Debug +1 task
							</SystemActionBtn>
						)}
					</>
				) : (
					<>
						<button type="button" className={hubStyles.btnLeave} onClick={handleLeave}>
							Leave run
						</button>
						{onDebugTask && (
							<button
								type="button"
								className={hubStyles.btnDebugTask}
								onClick={onDebugTask}
								title="Simulate completing 1 task (dev)"
							>
								Debug +1 task
							</button>
						)}
					</>
				)}
			</div>

			{!systemUi && (
				<div className={hubStyles.journeyHubFooter}>
					<div className={hubStyles.statPills}>
						<span
							className={`${hubStyles.statPill} ${
								foe.difficulty === 'easy'
									? hubStyles.diffTagEasy
									: foe.difficulty === 'medium'
										? hubStyles.diffTagMedium
										: hubStyles.diffTagHard
							}`}
						>
							{foe.difficulty.toUpperCase()}
						</span>
						<span className={hubStyles.statPill}>
							Tasks: <strong>{run.tasksCompletedCount}</strong>
						</span>
						<span className={hubStyles.statPill}>
							Run dmg: <strong>{run.totalDamageDealt}</strong>
						</span>
						<span className={`${hubStyles.statPill} ${urgent ? hubStyles.statPillUrgent : ''}`}>
							{daysLeft}d left
						</span>
						{dungeonRequired != null && dungeonClearedCount != null && (
							<span className={hubStyles.statPill}>
								Raid gate: <strong>{dungeonClearedCount}/{dungeonRequired}</strong>
							</span>
						)}
					</div>

					<div className={hubStyles.damageLogSection}>
						<div className={hubStyles.damageLogTitle}>Task damage log</div>
						{run.damageLog.length === 0 ? (
							<p className={hubStyles.damageLogEmpty}>No tasks completed this run yet.</p>
						) : (
							<ul className={hubStyles.damageLogList}>
								{run.damageLog.map((entry, idx) => (
									<li
										key={`${entry.questId}-${entry.completedAt}-${idx}`}
										className={hubStyles.damageLogRow}
									>
										<span className={hubStyles.damageLogQuest}>{entry.questTitle}</span>
										<span
											className={`${hubStyles.damageLogDmg} ${entry.grazed ? hubStyles.damageLogGraze : ''}`}
											title={
												entry.grazed
													? 'Graze — task did not match the foe weakness'
													: undefined
											}
										>
											−{entry.damage} HP{entry.grazed ? ' ·graze' : ''}
										</span>
									</li>
								))}
							</ul>
						)}
					</div>

					<div className={hubStyles.journeyDialogue}>
						<div className={hubStyles.journeyDialogueTag}>PATH WHISPER</div>
						<p className={hubStyles.journeyDialogueText}>{foe.pathWhisper}</p>
					</div>
				</div>
			)}

			{systemUi && (
				<>
					{run.damageLog.length > 0 && (
						<div className={hubStyles.damageLogSection}>
							<div className={hubStyles.damageLogTitle}>Task damage log</div>
							<ul className={hubStyles.damageLogList}>
								{run.damageLog.map((entry, idx) => (
									<li
										key={`${entry.questId}-${entry.completedAt}-${idx}`}
										className={hubStyles.damageLogRow}
									>
										<span className={hubStyles.damageLogQuest}>{entry.questTitle}</span>
										<span
											className={`${hubStyles.damageLogDmg} ${entry.grazed ? hubStyles.damageLogGraze : ''}`}
										>
											−{entry.damage} HP{entry.grazed ? ' ·graze' : ''}
										</span>
									</li>
								))}
							</ul>
						</div>
					)}
					<SystemInfoBox title="Path whisper">{foe.pathWhisper}</SystemInfoBox>
				</>
			)}
		</div>
	);
};
