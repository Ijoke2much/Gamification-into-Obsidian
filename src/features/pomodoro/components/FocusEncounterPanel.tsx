import React, { useRef } from 'react';
import { PLUGIN_ASSETS, getPluginAssetUrl } from '../../../shared/utils/pluginAssetUrl';
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

function formatDue(due?: string): string | null {
	if (!due?.trim()) return null;
	const parsed = new Date(due);
	if (Number.isNaN(parsed.getTime())) return due;
	return parsed.toLocaleString(undefined, {
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
	});
}

function formatDifficulty(difficulty?: string): string | null {
	const label = difficulty?.trim();
	if (!label) return null;
	return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Center of the painted road, from the beach to the checkered flag. */
const ROUTE: Array<[number, number]> = [
	[310, 438],
	[420, 470],
	[540, 500],
	[660, 510],
	[780, 470],
	[860, 420],
	[940, 360],
	[1000, 280],
	[1020, 200],
];

const ROUTE_LENGTHS = ROUTE.slice(1).map((point, index) => {
	const prev = ROUTE[index];
	return Math.hypot(point[0] - prev[0], point[1] - prev[1]);
});

const ROUTE_TOTAL = ROUTE_LENGTHS.reduce((sum, length) => sum + length, 0);

function pointAlongRoute(progress: number): { x: number; y: number } {
	let remaining = Math.max(0, Math.min(1, progress)) * ROUTE_TOTAL;
	for (let index = 0; index < ROUTE_LENGTHS.length; index += 1) {
		const length = ROUTE_LENGTHS[index];
		if (remaining <= length || index === ROUTE_LENGTHS.length - 1) {
			const share = length === 0 ? 0 : remaining / length;
			const from = ROUTE[index];
			const to = ROUTE[index + 1];
			return {
				x: from[0] + (to[0] - from[0]) * share,
				y: from[1] + (to[1] - from[1]) * share,
			};
		}
		remaining -= length;
	}
	const end = ROUTE[ROUTE.length - 1];
	return { x: end[0], y: end[1] };
}

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
	const workApproach = Math.max(0, Math.min(1, 1 - hp.percent / 100));
	const turnedAt = useRef(0);
	if (!isBreak) turnedAt.current = workApproach;
	const breakRatio = totalSeconds > 0 ? Math.max(0, secondsLeft) / totalSeconds : 1;
	const approach = isBreak
		? turnedAt.current * (secondsLeft > 0 ? breakRatio : 1)
		: workApproach;
	const pin = pointAlongRoute(approach);
	const mapUrl = getPluginAssetUrl(PLUGIN_ASSETS.focusRouteMap);
	const subtasks = quest?.subtasks ?? [];
	const timed = Boolean(quest?.isTimedQuest);
	const canComplete = Boolean(quest && onCompleteQuest);
	const sessionMinutes = Math.max(1, Math.round(totalSeconds / 60));
	const sessionXp = Math.floor(sessionMinutes * 0.5);
	const sessionCoins = Math.floor(sessionMinutes * 0.2);
	const rewardXp = sessionXp + (quest?.rewards?.xp ?? 0);
	const rewardCoins = sessionCoins + (quest?.rewards?.coins ?? 0);
	const goalTitle = quest?.title?.trim() || 'Focus';
	const dueLabel = formatDue(quest?.dueDate);
	const difficultyLabel = quest ? formatDifficulty(quest.difficulty) : null;

	let status = 'Ready';
	if (isRunning && !isBreak) status = 'On the road';
	if ((grace || hp.downed) && !isBreak) status = 'At the flag';
	if (isBreak) status = 'Heading home';
	if (honorOffer) status = 'Confirm';

	if (density === 'kit') {
		return (
			<div
				className={`${styles.kit} ${clayUi ? styles.kitClay : ''} ${hp.downed ? styles.rootDowned : ''} ${isBreak ? styles.rootBreak : ''}`}
				data-encounter="focus-kit"
			>
				<div className={styles.kitBody}>
					<div className={styles.kitMeta}>
						<span className={styles.kitName}>{goalTitle}</span>
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
							{grace || hp.downed ? 'Arrive' : 'Complete'}
						</button>
					) : null}
				</div>
			</div>
		);
	}

	return (
		<div
			className={`${styles.root} ${clayUi ? styles.rootClay : ''} ${hp.downed ? styles.rootDowned : ''} ${isBreak ? styles.rootBreak : ''}`}
			data-encounter="focus"
			data-foe={foe.id}
			{...(clayUi ? {} : { 'data-gamification-pixel-enclave': 'focus' })}
		>
			<header className={styles.header}>
				<div className={styles.headerLeft}>
					<span className={styles.bossKicker}>Goal</span>
					<h2 className={styles.foeName}>{goalTitle}</h2>
					{timed ? <span className={styles.tag}>Timed</span> : null}
				</div>
				<div className={styles.headerRight}>
					<span className={styles.status}>{status}</span>
					{onNotes ? (
						<button type="button" className={styles.notes} onClick={onNotes}>
							Notes
						</button>
					) : null}
				</div>
			</header>

			<div className={styles.hud}>
				<aside className={styles.panel}>
					<p className={styles.panelTitle}>Goal</p>
					<p className={styles.goalTitle}>{goalTitle}</p>
					{difficultyLabel ? (
						<p className={styles.questLine}>
							<span>Difficulty</span> {difficultyLabel}
						</p>
					) : null}
					{timed && dueLabel ? (
						<p className={styles.questLine}>
							<span>Due</span> {dueLabel}
						</p>
					) : null}
					{timed ? (
						<p className={styles.flavor}>Finishing the quest moves you to the flag. The clock only ends the session.</p>
					) : quest ? (
						<p className={styles.flavor}>Stay on the road until you finish, or complete the quest to reach the flag.</p>
					) : (
						<p className={styles.flavor}>No quest attached. This session still counts.</p>
					)}
				</aside>

				<div className={styles.stageGutter}>
					<div className={styles.mapScene}>
						{mapUrl ? <img className={styles.mapArt} src={mapUrl} alt="" /> : null}
						<svg
							className={styles.mapOverlay}
							viewBox="0 0 1280 720"
							preserveAspectRatio="xMidYMid meet"
							aria-hidden="true"
						>
							<rect x="500" y="18" width="280" height="58" rx="12" fill="rgba(12, 28, 48, 0.45)" />
							<text className={styles.mapClock} x="640" y="58" textAnchor="middle">
								{formatTime(secondsLeft)}
							</text>
							<g transform={`translate(${pin.x} ${pin.y})`}>
								<path
									d="M0 0 C-4 -18 -28 -28 -28 -52 C-28 -72 -14 -86 0 -86 C14 -86 28 -72 28 -52 C28 -28 4 -18 0 0 Z"
									fill="#e10600"
									stroke="#7a0610"
									strokeWidth="3"
								/>
								<circle cx="0" cy="-54" r="10" fill="#fff6ee" />
								<g fill="#141414" transform="translate(34 2)">
									<circle cx="0" cy="-36" r="7" />
									<path d="M-5 -28 H5 L4 -10 H-4 Z" />
									<path d="M-4 -10 L-8 0 H-4 L-1 -10 Z" />
									<path d="M4 -10 L8 0 H4 L1 -10 Z" />
								</g>
							</g>
						</svg>
					</div>
				</div>

				<aside className={`${styles.panel} ${styles.panelSession}`}>
					<p className={styles.panelTitle}>This session</p>
					<p className={styles.goalTitle}>{formatTime(secondsLeft)}</p>
					<div className={styles.rewards}>
						<p className={styles.panelTitle}>Reward</p>
						<div className={styles.rewardRow}>
							<span>XP {rewardXp}</span>
							<span>Coins {rewardCoins}</span>
						</div>
					</div>
				</aside>
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
						<span className={styles.nodeMark}>⚑</span>
						<span className={styles.nodeLabel}>Flag</span>
					</span>
				</div>
			) : null}

			{honorOffer && onHonorComplete ? (
				<div className={styles.honor}>
					<p>You finished the session without completing the quest. If the work is done, confirm it. That reaches the flag.</p>
					<button type="button" className={styles.complete} onClick={onHonorComplete}>
						I finished this
					</button>
				</div>
			) : null}

			{canComplete ? (
				<button type="button" className={styles.complete} onClick={onCompleteQuest}>
					{grace || hp.downed ? 'Reach the flag' : 'Complete quest'}
				</button>
			) : null}
		</div>
	);
};
