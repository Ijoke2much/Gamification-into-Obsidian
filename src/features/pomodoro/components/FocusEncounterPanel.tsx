import React from 'react';
import { PLUGIN_ASSETS, getPluginAssetUrl } from '../../../shared/utils/pluginAssetUrl';
import { resolveBundledFoeSpriteUrl } from '../../../shared/utils/pixelSprites';
import {
	computeFocusHp,
	type FocusEncounterQuest,
	type FocusFoeDef,
	type FocusSessionMode,
} from '../utils/focusEncounter';
import styles from './FocusEncounterPanel.module.css';

function formatTime(seconds: number): string {
	const min = Math.floor(Math.max(0, seconds) / 60)
		.toString()
		.padStart(2, '0');
	const sec = Math.floor(Math.max(0, seconds) % 60)
		.toString()
		.padStart(2, '0');
	return `${min}:${sec}`;
}

const MODE_RANK: Record<FocusSessionMode, string> = {
	quickFocus: 'E',
	short: 'D',
	classic: 'C',
	custom: 'C',
	extended: 'B',
	deepWork: 'A',
};

const MODE_DUNGEON: Record<FocusSessionMode, string> = {
	quickFocus: 'Burst Gate',
	short: 'Burst Gate',
	classic: 'Focus Hollow',
	custom: 'Focus Hollow',
	extended: 'Long Watch',
	deepWork: 'Inbox Depths',
};

export const FocusEncounterPanel: React.FC<{
	foe: FocusFoeDef;
	quest: FocusEncounterQuest | null;
	sessionMode?: FocusSessionMode;
	secondsLeft: number;
	totalSeconds: number;
	isBreak: boolean;
	isRunning: boolean;
	grace: boolean;
	honorOffer: boolean;
	density?: 'arena' | 'kit';
	clayUi?: boolean;
	onSubtaskToggle?: (index: number) => void;
	onCompleteQuest?: () => void;
	onHonorComplete?: () => void;
	onAbandon?: () => void;
	onNotes?: () => void;
	onExpand?: () => void;
	onPause?: () => void;
	onStart?: () => void;
}> = ({
	foe,
	quest,
	sessionMode = 'classic',
	secondsLeft,
	totalSeconds,
	isBreak,
	isRunning,
	grace,
	honorOffer,
	density = 'arena',
	clayUi = false,
	onSubtaskToggle,
	onCompleteQuest,
	onHonorComplete,
	onAbandon,
	onNotes,
	onExpand,
	onPause,
	onStart,
}) => {
	const elapsedRatio =
		totalSeconds > 0 ? 1 - Math.max(0, secondsLeft) / totalSeconds : 0;
	const hp = computeFocusHp(
		isBreak || grace || honorOffer ? 1 : elapsedRatio,
		quest?.subtasks
	);
	const spriteUrl = resolveBundledFoeSpriteUrl(foe.id);
	const stageUrl = getPluginAssetUrl(PLUGIN_ASSETS.focusStage);
	const subtasks = quest?.subtasks ?? [];
	const timed = Boolean(quest?.isTimedQuest);
	const canComplete = Boolean(quest && onCompleteQuest);
	const rank = timed ? 'S' : MODE_RANK[sessionMode];
	const dungeon = timed ? 'Deadline Gate' : MODE_DUNGEON[sessionMode];
	const sessionMinutes = Math.max(1, Math.round(totalSeconds / 60));

	let status = 'LIVE';
	if (isBreak) status = 'STAGGERED';
	if (hp.downed && quest && !isBreak) status = 'DOWNED';
	if (grace) status = timed ? 'CONFIRM KILL' : 'FOE DOWN';
	if (honorOffer) status = 'SCOUTS’ HONOR';

	const effects = [
		{ label: `Time chips HP (−${hp.timeDamage})` },
		subtasks.length > 0
			? { label: `Subtasks strike (−${hp.subtaskDamage})` }
			: { label: 'Stay in session to wear it down' },
	];
	const weakPoints = [
		timed ? 'Deadlines' : 'Unbroken time',
		subtasks.length > 0 ? 'Checklists' : 'Confirm the kill',
	];

	if (density === 'kit') {
		return (
			<div
				className={`${styles.kit} ${clayUi ? styles.kitClay : ''} ${hp.downed ? styles.rootDowned : ''} ${isBreak ? styles.rootBreak : ''}`}
				data-encounter="focus-kit"
			>
				{spriteUrl ? <img className={styles.kitBadge} src={spriteUrl} alt="" /> : null}
				<div className={styles.kitBody}>
					<div className={styles.kitMeta}>
						<span className={styles.kitName}>{foe.name}</span>
						<span className={styles.kitStatus}>{status}</span>
					</div>
					<div className={styles.kitClock}>{formatTime(secondsLeft)}</div>
					<div className={styles.kitHp} role="progressbar" aria-valuenow={hp.percent} aria-valuemin={0} aria-valuemax={100}>
						<span className={styles.hpFill} style={{ width: `${hp.percent}%` }} />
					</div>
				</div>
				<div className={styles.kitActions}>
					{onExpand ? (
						<button type="button" className={styles.kitGhost} onClick={onExpand}>
							Arena
						</button>
					) : null}
					{onNotes ? (
						<button type="button" className={styles.kitGhost} onClick={onNotes}>
							Notes
						</button>
					) : null}
					{isRunning && onPause ? (
						<button type="button" className={styles.kitGhost} onClick={onPause}>
							Pause
						</button>
					) : null}
					{!isRunning && onStart && !grace && !honorOffer ? (
						<button type="button" className={styles.kitGhost} onClick={onStart}>
							Start
						</button>
					) : null}
					{honorOffer && onHonorComplete ? (
						<button type="button" className={styles.complete} onClick={onHonorComplete}>
							Confirm
						</button>
					) : canComplete ? (
						<button type="button" className={styles.complete} onClick={onCompleteQuest}>
							{grace || hp.downed ? 'Claim' : 'Complete'}
						</button>
					) : null}
				</div>
			</div>
		);
	}

	return (
		<div
			className={`${styles.root} ${hp.downed ? styles.rootDowned : ''} ${isBreak ? styles.rootBreak : ''}`}
			data-encounter="focus"
			data-foe={foe.id}
			data-gamification-pixel-enclave="focus"
		>
			<div
				className={styles.stage}
				style={stageUrl ? { backgroundImage: `url("${stageUrl}")` } : undefined}
			>
				<div className={styles.vignette} />
				{spriteUrl && !stageUrl ? (
					<img className={`${styles.foeMark} ${hp.downed ? styles.foeMarkDown : ''}`} src={spriteUrl} alt="" />
				) : null}
				<div className={styles.clock}>{formatTime(secondsLeft)}</div>
			</div>

			<header className={styles.header}>
				<div className={styles.headerLeft}>
					{spriteUrl ? (
						<img className={styles.foeBadge} src={spriteUrl} alt="" />
					) : null}
					<span className={styles.bossKicker}>Boss</span>
					<h2 className={styles.foeName}>{foe.name}</h2>
					<span className={styles.tag}>{timed ? 'TIMED' : foe.tag}</span>
				</div>
				<div className={styles.headerRight}>
					<span className={styles.status}>{status}</span>
					{onNotes ? (
						<button type="button" className={styles.notes} onClick={onNotes}>
							Notes
						</button>
					) : null}
					{onAbandon ? (
						<button type="button" className={styles.abandon} onClick={onAbandon}>
							Abandon
						</button>
					) : null}
				</div>
			</header>

			<div className={styles.hud}>
				<aside className={styles.panel}>
					<p className={styles.panelTitle}>Intel</p>
					<dl className={styles.statList}>
						<div>
							<dt>Level</dt>
							<dd>{sessionMinutes}</dd>
						</div>
						<div>
							<dt>Type</dt>
							<dd>{foe.tag}</dd>
						</div>
						<div>
							<dt>Rank</dt>
							<dd className={styles.rank}>{rank}</dd>
						</div>
						<div>
							<dt>Dungeon</dt>
							<dd>{dungeon}</dd>
						</div>
					</dl>
					<p className={styles.flavor}>{foe.flavor}</p>
					{quest ? (
						<p className={styles.questLine}>
							<span>{quest.title}</span>
							{timed
								? ' Timer win ≠ quest win. Complete confirms the kill.'
								: ' Complete claims the kill.'}
						</p>
					) : (
						<p className={styles.questLine}>No quest — skirmish. Session XP still awards.</p>
					)}
				</aside>

				<div className={styles.stageGutter} aria-hidden="true" />

				<aside className={styles.panel}>
					<p className={styles.panelTitle}>Effects</p>
					<ul className={styles.effectList}>
						{effects.map((effect) => (
							<li key={effect.label}>{effect.label}</li>
						))}
					</ul>
					<p className={styles.panelTitle}>Weak point</p>
					<ul className={styles.weakList}>
						{weakPoints.map((point) => (
							<li key={point}>{point}</li>
						))}
					</ul>
					<div className={styles.rewards}>
						<p className={styles.panelTitle}>Rewards</p>
						{quest ? (
							<div className={styles.rewardRow}>
								<span>XP {quest.rewards?.xp ?? '—'}</span>
								<span>Coins {quest.rewards?.coins ?? '—'}</span>
							</div>
						) : (
							<p className={styles.muted}>Session XP on the clock</p>
						)}
						{timed ? <p className={styles.timedBonus}>Timed bonus</p> : null}
					</div>
				</aside>
			</div>

			<div className={styles.hpDock}>
				<div className={styles.hpMeta}>
					<span>Health</span>
					<span>
						{Math.round(hp.hp)} / {hp.maxHp} HP
					</span>
					<span className={styles.hpPct}>{hp.percent}%</span>
				</div>
				<div className={styles.hpTrack} role="progressbar" aria-valuenow={hp.percent} aria-valuemin={0} aria-valuemax={100}>
					<span className={styles.hpFill} style={{ width: `${hp.percent}%` }} />
				</div>
			</div>

			{subtasks.length > 0 ? (
				<div className={styles.rail} aria-label="Quest subtasks">
					{subtasks.map((sub, i) => (
						<button
							key={`${sub.text}-${i}`}
							type="button"
							className={`${styles.node} ${sub.completed ? styles.nodeDone : ''} ${
								!sub.completed && i === subtasks.findIndex((s) => !s.completed)
									? styles.nodeActive
									: ''
							}`}
							onClick={() => onSubtaskToggle?.(i)}
							title={sub.text}
						>
							<span className={styles.nodeMark}>{sub.completed ? '✓' : i + 1}</span>
							<span className={styles.nodeLabel}>{sub.text}</span>
						</button>
					))}
					<span className={`${styles.node} ${styles.nodeSkull} ${hp.downed ? styles.nodeDone : ''}`}>
						<span className={styles.nodeMark}>☠</span>
						<span className={styles.nodeLabel}>Boss</span>
					</span>
				</div>
			) : null}

			{honorOffer && onHonorComplete ? (
				<div className={styles.honor}>
					<p>
						You ran the session but didn’t press Complete. If you finished the work —
						scouts’ honor — confirm now. No extra loot, no penalty.
					</p>
					<button type="button" className={styles.complete} onClick={onHonorComplete}>
						I finished this — confirm
					</button>
				</div>
			) : null}

			{canComplete ? (
				<button type="button" className={styles.complete} onClick={onCompleteQuest}>
					{grace || hp.downed ? 'Complete — claim the kill' : 'Complete Quest'}
				</button>
			) : null}

			{isRunning ? <p className={styles.live}>Encounter live</p> : null}
		</div>
	);
};
