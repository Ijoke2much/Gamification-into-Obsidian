import React from 'react';
import type { Quest } from '../../../features/quests/utils/taskParser';
import type { SprintLaneId } from '../../../features/quests/utils/sprintLanes';
import { BatteryProgressBar } from '../../../shared/components/ui/BatteryProgressBar';
import styles from './TodayRunStrip.module.css';

export interface SprintStripLane {
	id: SprintLaneId;
	label: string;
	count: number;
	wide?: boolean;
}

export interface SprintStripModel {
	status: string;
	locked: boolean;
	win: Quest | null;
	winStarted: boolean;
	lanes: SprintStripLane[];
	activeLane: SprintLaneId;
	onSelectLane: (lane: SprintLaneId) => void;
	onOpenWin: (quest: Quest) => void;
	onStartWin?: () => void;
}

export type NextUpPhase = 'now' | 'upcoming' | 'queue';

export interface TodayRunStripProps {
	dateLabel: string;
	questCount: number;
	nextUp: Quest | null;
	/** How nextUp was chosen — drives the label (Now / Up next / Next up) */
	nextUpPhase?: NextUpPhase;
	onOpenNextUp: (quest: Quest) => void;
	onJumpToNow?: () => void;
	onFocusNextUp?: () => void;
	energyCurrent?: number;
	energyMax?: number;
	variant?: 'mobile' | 'desktop';
	/** Quiet tip when pane is narrow (no button) */
	showWidenTip?: boolean;
	clayUi?: boolean;
	/** Phone sprint lanes. Desktop leaves this unset and keeps Next up. */
	sprint?: SprintStripModel | null;
}

function formatNextUpTime(quest: Quest): string | null {
	if (!quest.due || !quest.due.includes('T')) return null;
	const d = new Date(quest.due);
	if (Number.isNaN(d.getTime())) return null;
	return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function phaseLabel(phase: NextUpPhase): string {
	if (phase === 'now') return 'Now';
	if (phase === 'upcoming') return 'Up next';
	return 'Next up';
}

/**
 * "Today's Run" HUD — left: energy + quest count; right: next-up + START FOCUS.
 * On wide panes, left column grows (battery fills) and next-up anchors the right.
 */
export const TodayRunStrip: React.FC<TodayRunStripProps> = ({
	dateLabel,
	questCount,
	nextUp,
	nextUpPhase = 'queue',
	onOpenNextUp,
	onJumpToNow,
	onFocusNextUp,
	energyCurrent,
	energyMax = 100,
	variant = 'mobile',
	showWidenTip = false,
	clayUi = false,
	sprint = null,
}) => {
	const nextTime = nextUp ? formatNextUpTime(nextUp) : null;
	const hasEnergy =
		typeof energyCurrent === 'number' && Number.isFinite(energyCurrent);
	const energyPct = hasEnergy
		? Math.max(0, Math.min(100, (energyCurrent! / Math.max(1, energyMax)) * 100))
		: null;
	const isDesktop = variant === 'desktop';
	/* Mobile: fixed compact battery. Desktop: omit width so CSS can fill the left column. */
	const batteryWidth = isDesktop ? undefined : 200;
	const batteryHeight = isDesktop ? 28 : 24;

	return (
		<section
			className={`${styles.strip} ${isDesktop ? styles.stripDesktop : ''} ${clayUi ? styles.stripClay : ''}`}
			data-today-run-strip
			aria-label="Today's run"
		>
			<div className={styles.topRow}>
				<div className={styles.dateBlock}>
					<span className={styles.eyebrow}>Today's Run</span>
					<span className={styles.dateLabel}>{dateLabel}</span>
				</div>
				{onJumpToNow && (
					<button type="button" className={styles.nowBtn} onClick={onJumpToNow}>
						Now
					</button>
				)}
			</div>

			{sprint ? (
				<div className={styles.sprintBody}>
					{hasEnergy && energyPct != null && (
						<div
							className={styles.energyBlock}
							title={`Energy ${Math.round(energyCurrent!)}/${energyMax}`}
						>
							<span className={styles.energyLabel}>
								Energy <strong>{Math.round(energyCurrent!)}</strong>/{energyMax}
							</span>
							<div className={styles.batteryWrap}>
								{clayUi ? (
									<div
										className={styles.clayEnergyTrack}
										role="meter"
										aria-valuemin={0}
										aria-valuemax={energyMax}
										aria-valuenow={Math.round(energyCurrent!)}
									>
										<span
											className={styles.clayEnergyFill}
											style={{ width: `${energyPct}%` }}
										/>
									</div>
								) : (
									<BatteryProgressBar
										percent={energyPct}
										segments={12}
										width={batteryWidth}
										height={batteryHeight}
										statType="energy"
										pixel={false}
									/>
								)}
							</div>
						</div>
					)}
					<p className={styles.sprintStatus}>{sprint.status}</p>
					<div className={styles.sprintWin}>
						<span className={styles.nextUpLabel}>Today's win</span>
						{sprint.win ? (
							<button
								type="button"
								className={styles.nextUpWell}
								onClick={() => sprint.onOpenWin(sprint.win as Quest)}
							>
								<span className={styles.nextUpTitle}>{sprint.win.title}</span>
							</button>
						) : (
							<span className={styles.clearState}>Pin a win from a lane.</span>
						)}
						{sprint.win && sprint.winStarted && (
							<span className={styles.clearState}>Started</span>
						)}
						{sprint.win && !sprint.winStarted && sprint.onStartWin && (
							<button
								type="button"
								className={styles.focusBtn}
								onClick={sprint.onStartWin}
							>
								Start this
							</button>
						)}
					</div>
					{!sprint.locked && (
						<div
							className={`${styles.laneGrid} ${isDesktop ? styles.laneGridDesktop : ''}`}
							role="group"
							aria-label="Sprint lanes"
						>
							{sprint.lanes.map((lane) => (
								<button
									key={lane.id}
									type="button"
									className={`${styles.sprintLane} ${lane.wide ? styles.sprintLaneWide : ''} ${
										sprint.activeLane === lane.id ? styles.sprintLaneOn : ''
									}`}
									aria-pressed={sprint.activeLane === lane.id}
									onClick={() => sprint.onSelectLane(lane.id)}
								>
									<span className={styles.laneCount}>{lane.count}</span>
									<span className={styles.laneName}>{lane.label}</span>
								</button>
							))}
						</div>
					)}
				</div>
			) : (
			<div className={styles.hudGrid}>
				<div className={styles.hudLeft}>
					{hasEnergy && energyPct != null && (
						<div
							className={styles.energyBlock}
							title={`Energy ${Math.round(energyCurrent!)}/${energyMax}`}
						>
							<span className={styles.energyLabel}>
								⚡ Energy <strong>{Math.round(energyCurrent!)}</strong>/{energyMax}
							</span>
							<div className={styles.batteryWrap}>
								{clayUi ? (
									<div
										className={styles.clayEnergyTrack}
										role="meter"
										aria-valuemin={0}
										aria-valuemax={energyMax}
										aria-valuenow={Math.round(energyCurrent!)}
									>
										<span
											className={styles.clayEnergyFill}
											style={{ width: `${energyPct}%` }}
										/>
									</div>
								) : (
									<BatteryProgressBar
										percent={energyPct}
										segments={12}
										width={batteryWidth}
										height={batteryHeight}
										statType="energy"
										pixel={false}
									/>
								)}
							</div>
						</div>
					)}
					<span className={styles.countChip}>
						⚔️{' '}
						{questCount === 0
							? 'No quests due'
							: `${questCount} quest${questCount === 1 ? '' : 's'}`}
					</span>
				</div>

				<div className={styles.hudRight}>
					{nextUp ? (
						<div className={styles.nextUpCard}>
							<button
								type="button"
								className={styles.nextUpWell}
								onClick={() => onOpenNextUp(nextUp)}
								aria-label={`${phaseLabel(nextUpPhase)}: ${nextUp.title}`}
							>
								<span className={styles.nextUpLabel}>{phaseLabel(nextUpPhase)}:</span>
								<span className={styles.nextUpTitle}>
									{nextTime ? (
										<span className={styles.nextUpTime}>{nextTime}</span>
									) : null}
									{nextUp.title}
								</span>
							</button>
							{onFocusNextUp && (
								<button
									type="button"
									className={styles.focusBtn}
									onClick={onFocusNextUp}
									title="Start Pomodoro focus"
								>
									⚡ [ START FOCUS ]
								</button>
							)}
						</div>
					) : (
						<div className={styles.nextUpCard}>
							<div className={styles.nextUpWell}>
								<span className={styles.nextUpLabel}>Next up:</span>
								<span className={styles.clearState}>
									{questCount === 0
										? 'Nothing timed yet — schedule below.'
										: 'Pick a quest below to start.'}
								</span>
							</div>
						</div>
					)}
				</div>
			</div>
			)}

			{showWidenTip && (
				<p className={styles.widenTip}>
					Tip: widen this pane for Day Plan | Inbox side by side
				</p>
			)}
		</section>
	);
};
