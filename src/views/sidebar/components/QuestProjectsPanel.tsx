import React, { useEffect, useMemo, useState } from 'react';
import type { Quest } from '../../../features/quests/utils/taskParser';
import {
	buildProjectSummaries,
	getQuestProjectSlug,
	isProjectHeaderQuest,
	slugifyProjectId,
	getUpcomingWaypoints,
	type ProjectSummary,
} from '../../../features/quests/utils/questProjectUtils';
import { PRIORITY_OPTIONS } from '../../../features/quests/utils/questUtils';
import { useAutoQuestRewards } from '../../../features/quests/hooks/useAutoQuestRewards';
import type { SkillMetadata } from '../../../shared/utils/skillDiscovery';
import {
	getNextWaypointQuest,
	isClosedContract,
	pickActiveProject,
	pickOtherProjects,
	toContractDisplay,
	type ContractBadge,
	type ContractDisplayModel,
} from '../../../features/quests/utils/projectContractDisplay';
import { pixelNotice } from '../../../shared/utils/noticeUtils';
import { ProjectsGuildBanner } from './ProjectsGuildBanner';
import hubStyles from './QuestHubPanels.module.css';

const ACTIVE_CONTRACT_PIN_KEY = 'gamification-active-contract-pin';

/** Set true to show vault diagnostics under the Projects tab (dev only). */
const SHOW_PROJECT_DEBUG = false;

function loadPinnedContractId(): string | null {
	try {
		return localStorage.getItem(ACTIVE_CONTRACT_PIN_KEY);
	} catch {
		return null;
	}
}

export interface NewContractInput {
	name: string;
	description: string;
	due: string;
	xp: number;
	cp: number;
	coins: number;
	difficulty: '' | 'easy' | 'medium' | 'hard';
	priority: string;
	skill: string;
}

export interface TurnInResult {
	xp: number;
	coins: number;
	cp: number;
}

interface CelebrationState {
	title: string;
	rewards: TurnInResult;
}

interface QuestProjectsPanelProps {
	allQuests: Quest[];
	onQuestClick?: (quest: Quest) => void;
	onCreateProject?: () => void;
	/** Jump to the Tasks section filtered to this project slug. */
	onContinueOnTasks?: (projectId: string, projectTitle: string) => void;
	/** Open the contract header note (or detail fallback). */
	onOpenContract?: (project: ProjectSummary) => void;
	/** Complete the contract header and pay out rewards. Resolves the payout on success. */
	onTurnIn?: (project: ProjectSummary) => Promise<TurnInResult | null>;
	/** Toggle one subtask of a quest (persists to markdown). */
	onToggleSubtask?: (quest: Quest, subtaskIndex: number) => void;
	/** Complete a quest with rewards (used for the waypoint checkbox). */
	onCompleteQuest?: (quest: Quest) => void;
	/** Write a new project header to the contracts file. Resolves the new project id. */
	onCreateContract?: (input: NewContractInput) => Promise<string | null>;
	/** Add a checklist item under the current waypoint. */
	onAddChecklistItem?: (project: ProjectSummary, waypoint: Quest, title: string) => Promise<boolean>;
	/** Create a new linked waypoint mission on the contract. */
	onAddWaypoint?: (project: ProjectSummary, title: string) => Promise<boolean>;
	/** Open the contract header in the quest edit modal. */
	onEditContract?: (project: ProjectSummary) => void;
	/** Close the contract without payout. Resolves true on success. */
	onAbandonContract?: (project: ProjectSummary) => Promise<boolean>;
	currencyName?: string;
	currencySymbol?: string;
	skillOptions?: SkillMetadata[];
}

const BADGE_ICONS: Record<ContractBadge['variant'], string> = {
	momentum: '↗',
	due: '📅',
	stalled: '⏳',
	urgent: '⚠',
	reward: '★',
};

function badgeClass(variant: ContractBadge['variant']): string {
	switch (variant) {
		case 'momentum':
			return hubStyles.contractBadgeMomentum;
		case 'due':
			return hubStyles.contractBadgeDue;
		case 'stalled':
			return hubStyles.contractBadgeStalled;
		case 'urgent':
			return hubStyles.contractBadgeUrgent;
		case 'reward':
			return hubStyles.contractBadgeReward;
	}
}

function percentClass(tone: ContractDisplayModel['percentTone']): string {
	switch (tone) {
		case 'amber':
			return hubStyles.contractPctAmber;
		case 'muted':
			return hubStyles.contractPctMuted;
		case 'green':
			return hubStyles.contractPctGreen;
		default:
			return hubStyles.contractPct;
	}
}

const ContractBadges: React.FC<{ badges: ContractBadge[] }> = ({ badges }) => {
	if (badges.length === 0) return null;
	return (
		<div className={hubStyles.contractBadgeRow}>
			{badges.map((badge) => (
				<span
					key={`${badge.variant}-${badge.label}`}
					className={`${hubStyles.contractBadge} ${badgeClass(badge.variant)}`}
				>
					<span aria-hidden="true">{BADGE_ICONS[badge.variant]}</span> {badge.label}
				</span>
			))}
		</div>
	);
};

interface MilestoneNode {
	icon: string;
	label: string;
	threshold: number;
	isCircle?: boolean;
}

const MILESTONE_NODES: MilestoneNode[] = [
	{ icon: '⛺', label: 'CAMP', threshold: 25 },
	{ icon: '🛖', label: 'OUTPOST', threshold: 50 },
	{ icon: '🏰', label: 'FORT', threshold: 75 },
	{ icon: '', label: 'DONE', threshold: 100, isCircle: true },
];

const MilestoneTrail: React.FC<{ progressPercent: number }> = ({ progressPercent }) => (
	<div className={hubStyles.milestoneSection}>
		<div className={hubStyles.milestoneSectionLabel}>MILESTONE PROGRESS</div>
		<div className={hubStyles.milestoneTrail} aria-hidden="true">
			{MILESTONE_NODES.map((node, idx) => {
				const reached = progressPercent >= node.threshold;
				return (
					<React.Fragment key={node.label}>
						{idx > 0 && (
							<div
								className={`${hubStyles.milestoneSeg} ${reached ? hubStyles.milestoneSegDone : ''}`}
							>
								<span className={hubStyles.milestoneSegDot} />
							</div>
						)}
						<div className={`${hubStyles.milestoneNode} ${reached ? hubStyles.milestoneNodeDone : ''}`}>
							{node.isCircle ? (
								<span
									className={`${hubStyles.milestoneCircle} ${reached ? hubStyles.milestoneCircleDone : ''}`}
								/>
							) : (
								<span className={hubStyles.milestoneIcon}>{node.icon}</span>
							)}
							<span className={hubStyles.milestoneLabel}>{node.label}</span>
						</div>
					</React.Fragment>
				);
			})}
		</div>
	</div>
);

const AddChecklistInlineForm: React.FC<{
	onSubmit: (title: string) => Promise<boolean>;
}> = ({ onSubmit }) => {
	const [title, setTitle] = useState('');
	const [busy, setBusy] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (busy || !title.trim()) return;
		setBusy(true);
		try {
			const ok = await onSubmit(title);
			if (ok) setTitle('');
		} finally {
			setBusy(false);
		}
	};

	return (
		<form
			className={hubStyles.waypointAddChecklist}
			onSubmit={handleSubmit}
			onClick={(e) => e.stopPropagation()}
		>
			<input
				type="text"
				className={hubStyles.waypointAddChecklistInput}
				value={title}
				onChange={(e) => setTitle(e.target.value)}
				placeholder="Add checklist item…"
				disabled={busy}
			/>
			<button type="submit" className={hubStyles.waypointAddChecklistBtn} disabled={busy || !title.trim()}>
				{busy ? '…' : '+'}
			</button>
		</form>
	);
};

const AddWaypointForm: React.FC<{
	onSubmit: (title: string) => Promise<boolean>;
}> = ({ onSubmit }) => {
	const [open, setOpen] = useState(false);
	const [title, setTitle] = useState('');
	const [busy, setBusy] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (busy || !title.trim()) return;
		setBusy(true);
		try {
			const ok = await onSubmit(title);
			if (ok) {
				setTitle('');
				setOpen(false);
			}
		} finally {
			setBusy(false);
		}
	};

	if (!open) {
		return (
			<button type="button" className={hubStyles.addWaypointBtn} onClick={() => setOpen(true)}>
				+ NEW WAYPOINT
			</button>
		);
	}

	return (
		<form className={hubStyles.addStepForm} onSubmit={handleSubmit}>
			<input
				type="text"
				className={hubStyles.addStepInput}
				value={title}
				onChange={(e) => setTitle(e.target.value)}
				onKeyDown={(e) => {
					if (e.key === 'Escape') setOpen(false);
				}}
				placeholder="New mission / chapter title…"
				// eslint-disable-next-line jsx-a11y/no-autofocus
				autoFocus
			/>
			<button type="submit" className={hubStyles.addStepSubmit} disabled={busy || !title.trim()}>
				{busy ? '…' : 'ADD'}
			</button>
			<button type="button" className={hubStyles.addStepCancel} onClick={() => setOpen(false)}>
				✕
			</button>
		</form>
	);
};

const NextWaypoint: React.FC<{
	contract: ContractDisplayModel;
	project: ProjectSummary;
	waypointQuest: Quest | null;
	onToggleSubtask?: (quest: Quest, subtaskIndex: number) => void;
	onCompleteQuest?: (quest: Quest) => void;
	onOpenDetails?: (quest: Quest) => void;
	onAddChecklistItem?: (title: string) => Promise<boolean>;
}> = ({
	contract,
	project,
	waypointQuest,
	onToggleSubtask,
	onCompleteQuest,
	onOpenDetails,
	onAddChecklistItem,
}) => {
	const [expanded, setExpanded] = useState(true);
	const wp = contract.nextWaypoint;
	if (!wp || !waypointQuest) return null;

	const subtasks = waypointQuest.subtasks ?? [];
	const upcoming = getUpcomingWaypoints(project, waypointQuest);
	const hasChecklist = subtasks.length > 0;
	const hasUpcoming = upcoming.length > 0;
	const canExpand = hasChecklist || hasUpcoming || Boolean(onAddChecklistItem);
	const showExpanded = canExpand && expanded;

	const handleRowActivate = () => {
		if (canExpand) {
			setExpanded((prev) => !prev);
		} else if (onOpenDetails) {
			onOpenDetails(waypointQuest);
		}
	};

	const allSubtasksDone = hasChecklist && subtasks.every((s) => s.completed);
	const subtasksBlocked = hasChecklist && !allSubtasksDone;
	const canCompleteParent =
		Boolean(!waypointQuest.completed && onCompleteQuest) && !subtasksBlocked;

	const checkboxTitle = wp.completed
		? 'Waypoint complete'
		: subtasksBlocked
			? `Finish checklist first (${subtasks.filter((s) => s.completed).length}/${subtasks.length})`
			: canCompleteParent
				? 'Complete this waypoint'
				: undefined;

	return (
		<div className={hubStyles.waypoint}>
			<div className={hubStyles.waypointHeader}>
				<span>NEXT WAYPOINT</span>
				{onOpenDetails && (
					<button
						type="button"
						className={hubStyles.waypointHeaderLink}
						onClick={(e) => {
							e.stopPropagation();
							onOpenDetails(waypointQuest);
						}}
					>
						DETAILS ▸
					</button>
				)}
			</div>
			<div
				className={`${hubStyles.waypointBody} ${canExpand ? hubStyles.waypointBodyClickable : ''}`}
				role={canExpand ? 'button' : undefined}
				tabIndex={canExpand ? 0 : undefined}
				onClick={canExpand ? handleRowActivate : undefined}
				onKeyDown={
					canExpand
						? (e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									handleRowActivate();
								}
							}
						: undefined
				}
				title={canExpand ? (expanded ? 'Collapse checklist' : 'Expand checklist') : undefined}
			>
				{canExpand && (
					<span
						className={`${hubStyles.waypointMarker} ${showExpanded ? hubStyles.waypointMarkerOpen : ''}`}
						aria-hidden="true"
					>
						▶
					</span>
				)}
				<span
					className={[
						hubStyles.waypointCheckbox,
						wp.completed ? hubStyles.waypointCheckboxDone : '',
						subtasksBlocked ? hubStyles.waypointCheckboxLocked : '',
						canCompleteParent ? hubStyles.waypointCheckboxReady : '',
					].filter(Boolean).join(' ')}
					role={canCompleteParent ? 'button' : undefined}
					tabIndex={canCompleteParent ? 0 : undefined}
					title={checkboxTitle}
					onMouseDown={(e) => e.stopPropagation()}
					onClick={(e) => {
						if (!canCompleteParent) return;
						e.stopPropagation();
						onCompleteQuest?.(waypointQuest);
					}}
					onKeyDown={
						canCompleteParent
							? (e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										e.stopPropagation();
										onCompleteQuest?.(waypointQuest);
									}
								}
							: undefined
					}
				>
					{wp.completed ? '✓' : ''}
				</span>
				<div className={hubStyles.waypointText}>
					<div className={hubStyles.waypointTitle}>{wp.title}</div>
					{!showExpanded && wp.description && (
						<div className={hubStyles.waypointDesc}>{wp.description}</div>
					)}
				</div>
				<div className={hubStyles.waypointSide}>
					{wp.subtaskTotal > 0 && (
						<span className={hubStyles.waypointCount}>
							{wp.subtaskDone}/{wp.subtaskTotal}
						</span>
					)}
					<span className={hubStyles.waypointSprite} aria-hidden="true">
						⚔️
					</span>
				</div>
			</div>

			{showExpanded && (
				<div className={hubStyles.waypointExpanded}>
					{wp.description && (
						<div className={hubStyles.waypointExpandedDesc}>{wp.description}</div>
					)}

					{hasChecklist ? (
						<div className={hubStyles.waypointSubtasks}>
							{subtasks.map((subtask, idx) => (
								<div
									key={idx}
									className={`${hubStyles.waypointSubtaskRow} ${subtask.completed ? hubStyles.waypointSubtaskDone : ''}`}
									role="button"
									tabIndex={0}
									onClick={() => onToggleSubtask?.(waypointQuest, idx)}
									onKeyDown={(e) => {
										if (e.key === 'Enter' || e.key === ' ') {
											e.preventDefault();
											onToggleSubtask?.(waypointQuest, idx);
										}
									}}
								>
									<span
										className={`${hubStyles.waypointSubtaskBox} ${subtask.completed ? hubStyles.waypointSubtaskBoxDone : ''}`}
										aria-hidden="true"
									>
										{subtask.completed ? '✓' : ''}
									</span>
									<span className={hubStyles.waypointSubtaskText}>{subtask.text}</span>
								</div>
							))}
						</div>
					) : (
						<div className={hubStyles.waypointEmptyChecklist}>
							No checklist yet — add small todos below.
						</div>
					)}

					{hasUpcoming && (
						<div className={hubStyles.waypointUpNext}>
							<div className={hubStyles.waypointUpNextHeader}>UP NEXT</div>
							<ul className={hubStyles.waypointUpNextList}>
								{upcoming.map((task) => (
									<li key={task.id || task.title}>
										<button
											type="button"
											className={hubStyles.waypointUpNextRow}
											onClick={() => onOpenDetails?.(task)}
										>
											{task.title}
										</button>
									</li>
								))}
							</ul>
						</div>
					)}

					{onAddChecklistItem && (
						<AddChecklistInlineForm onSubmit={onAddChecklistItem} />
					)}
				</div>
			)}
		</div>
	);
};

const ActiveContractCard: React.FC<{
	contract: ContractDisplayModel;
	project: ProjectSummary;
	waypointQuest: Quest | null;
	onContinue?: () => void;
	onOpenContract?: () => void;
	onQuestClick?: (quest: Quest) => void;
	onToggleSubtask?: (quest: Quest, subtaskIndex: number) => void;
	onCompleteQuest?: (quest: Quest) => void;
	onTurnIn?: () => void;
	turnInBusy?: boolean;
	onAddChecklistItem?: (title: string) => Promise<boolean>;
	onAddWaypoint?: (title: string) => Promise<boolean>;
	onEdit?: () => void;
	onAbandon?: () => void;
}> = ({
	contract,
	project,
	waypointQuest,
	onContinue,
	onOpenContract,
	onQuestClick,
	onToggleSubtask,
	onCompleteQuest,
	onTurnIn,
	turnInBusy,
	onAddChecklistItem,
	onAddWaypoint,
	onEdit,
	onAbandon,
}) => (
	<article className={hubStyles.activeContract}>
		<div className={hubStyles.activeContractLabel}>ACTIVE CONTRACT</div>

		<div className={hubStyles.contractHead}>
			<span className={hubStyles.contractName}>{contract.title}</span>
			<span className={percentClass(contract.percentTone)}>
				{contract.progressPercent}
				<span className={hubStyles.contractPctSign}>%</span>
			</span>
		</div>

		<ContractBadges badges={contract.badges} />
		{contract.metaLine && (
			<div className={hubStyles.contractMeta}>{contract.metaLine}</div>
		)}
		<MilestoneTrail progressPercent={contract.progressPercent} />
		{!contract.readyForTurnIn && (
			<NextWaypoint
				key={`${waypointQuest?.id || contract.id}-${waypointQuest?.subtasks?.length ?? 0}`}
				contract={contract}
				project={project}
				waypointQuest={waypointQuest}
				onToggleSubtask={onToggleSubtask}
				onCompleteQuest={onCompleteQuest}
				onOpenDetails={onQuestClick}
				onAddChecklistItem={onAddChecklistItem}
			/>
		)}

		<div className={hubStyles.contractFooter}>
			{contract.readyForTurnIn && onTurnIn && (
				<button
					type="button"
					className={`${hubStyles.contractCta} ${hubStyles.contractCtaTurnIn}`}
					onClick={onTurnIn}
					disabled={turnInBusy}
				>
					{turnInBusy ? 'TURNING IN…' : '★ TURN IN CONTRACT ★'}
				</button>
			)}

			{!contract.readyForTurnIn && onAddWaypoint && (
				<AddWaypointForm onSubmit={onAddWaypoint} />
			)}

			<div className={hubStyles.contractCtaRow}>
				<button
					type="button"
					className={`${hubStyles.contractCta} ${hubStyles.contractCtaBlue}`}
					onClick={onContinue}
					disabled={!onContinue}
				>
					CONTINUE ON TASKS
				</button>
				<button
					type="button"
					className={`${hubStyles.contractCta} ${hubStyles.contractCtaGold}`}
					onClick={onOpenContract}
					disabled={!onOpenContract}
				>
					OPEN CONTRACT <span aria-hidden="true">▸</span>
				</button>
			</div>

			{(onEdit || onAbandon) && (
				<div className={hubStyles.contractUtilityRow}>
					{onEdit && (
						<button type="button" className={hubStyles.contractUtilityBtn} onClick={onEdit}>
							✎ EDIT
						</button>
					)}
					{onAbandon && (
						<button
							type="button"
							className={`${hubStyles.contractUtilityBtn} ${hubStyles.contractUtilityBtnDanger}`}
							onClick={onAbandon}
						>
							🏳️ ABANDON
						</button>
					)}
				</div>
			)}
		</div>
	</article>
);

const RosterContractCard: React.FC<{
	contract: ContractDisplayModel;
	onPin?: () => void;
	onOpenDetails?: () => void;
}> = ({ contract, onPin, onOpenDetails }) => {
	const toneClass =
		contract.cardTone === 'urgent'
			? hubStyles.rosterContractUrgent
			: contract.cardTone === 'stalled'
				? hubStyles.rosterContractStalled
				: '';
	const primaryBadge = contract.badges.find((b) => b.variant !== 'due') ?? contract.badges[0] ?? null;

	const clickable = Boolean(onPin);
	return (
		<article
			className={`${hubStyles.rosterContract} ${toneClass} ${clickable ? hubStyles.rosterContractClickable : ''}`}
			role={clickable ? 'button' : undefined}
			tabIndex={clickable ? 0 : undefined}
			onClick={onPin}
			onKeyDown={(e) => {
				if (clickable && (e.key === 'Enter' || e.key === ' ')) {
					e.preventDefault();
					onPin?.();
				}
			}}
			title={clickable ? 'Make this the active contract' : undefined}
		>
			<span className={hubStyles.rosterIcon} aria-hidden="true">
				📜
			</span>
			<div className={hubStyles.rosterText}>
				<div className={hubStyles.rosterTitle}>{contract.title}</div>
				<div className={hubStyles.rosterSubtitle}>
					{contract.subtitle ?? `${contract.completedCount}/${contract.totalCount} steps`}
				</div>
			</div>
			<div className={hubStyles.rosterProgress}>
				<span className={percentClass(contract.percentTone)}>
					{contract.progressPercent}
					<span className={hubStyles.contractPctSign}>%</span>
				</span>
				<div className={hubStyles.miniBar}>
					<div
						className={hubStyles.miniBarFill}
						style={{ width: `${contract.progressPercent}%`, opacity: contract.cardTone === 'stalled' ? 0.7 : 1 }}
					/>
				</div>
			</div>
			{primaryBadge && (
				<span className={`${hubStyles.contractBadge} ${badgeClass(primaryBadge.variant)}`}>
					<span aria-hidden="true">{BADGE_ICONS[primaryBadge.variant]}</span> {primaryBadge.label}
				</span>
			)}
			{onOpenDetails ? (
				<button
					type="button"
					className={`${hubStyles.rosterChevron} ${hubStyles.rosterChevronButton}`}
					title="Open contract details"
					onClick={(e) => {
						e.stopPropagation();
						onOpenDetails();
					}}
				>
					›
				</button>
			) : (
				<span className={hubStyles.rosterChevron} aria-hidden="true">
					›
				</span>
			)}
		</article>
	);
};

const CelebrationOverlay: React.FC<{
	celebration: CelebrationState;
	onDismiss: () => void;
}> = ({ celebration, onDismiss }) => {
	React.useEffect(() => {
		const timer = window.setTimeout(onDismiss, 6000);
		return () => window.clearTimeout(timer);
	}, [onDismiss]);

	const { rewards } = celebration;
	const rewardParts: string[] = [];
	if (rewards.xp > 0) rewardParts.push(`✨ +${rewards.xp} XP`);
	if (rewards.coins > 0) rewardParts.push(`🪙 +${rewards.coins}`);
	if (rewards.cp > 0) rewardParts.push(`⭐ +${rewards.cp} CP`);

	return (
		<div className={hubStyles.celebrationOverlay} onClick={onDismiss} role="presentation">
			<div className={hubStyles.celebrationCard}>
				<div className={hubStyles.celebrationStars} aria-hidden="true">★ ★ ★</div>
				<div className={hubStyles.celebrationHeading}>CONTRACT COMPLETE</div>
				<div className={hubStyles.celebrationTitle}>{celebration.title}</div>
				{rewardParts.length > 0 && (
					<div className={hubStyles.celebrationRewards}>
						{rewardParts.map((part) => (
							<span key={part} className={hubStyles.celebrationReward}>
								{part}
							</span>
						))}
					</div>
				)}
				<div className={hubStyles.celebrationHint}>The guild thanks you, adventurer.</div>
			</div>
		</div>
	);
};

const BASE_CONTRACT_INPUT = {
	name: '',
	description: '',
	due: '',
	difficulty: 'medium' as NewContractInput['difficulty'],
	priority: 'Medium',
	skill: '',
};

const NewContractForm: React.FC<{
	onSubmit: (input: NewContractInput) => Promise<boolean>;
	currencyName: string;
	currencySymbol: string;
	skillOptions: SkillMetadata[];
}> = ({ onSubmit, currencyName, currencySymbol, skillOptions }) => {
	const [open, setOpen] = useState(false);
	const [input, setInput] = useState(BASE_CONTRACT_INPUT);
	const [busy, setBusy] = useState(false);

	const { xp, cp, coins, setXp, setCp, resetRewards } = useAutoQuestRewards(
		open,
		input.priority,
		input.difficulty || 'medium'
	);

	const update = <K extends keyof typeof BASE_CONTRACT_INPUT>(key: K, value: (typeof BASE_CONTRACT_INPUT)[K]) =>
		setInput((prev) => ({ ...prev, [key]: value }));

	const openForm = () => {
		setInput(BASE_CONTRACT_INPUT);
		setOpen(true);
		resetRewards('Medium', 'medium');
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (busy || !input.name.trim()) return;
		if (!input.skill.trim()) return;
		setBusy(true);
		try {
			const ok = await onSubmit({ ...input, xp, cp, coins });
			if (ok) {
				setInput(BASE_CONTRACT_INPUT);
				resetRewards('Medium', 'medium');
				setOpen(false);
			}
		} finally {
			setBusy(false);
		}
	};

	if (!open) {
		return (
			<button type="button" className={hubStyles.newContractBtn} onClick={openForm}>
				+ NEW CONTRACT
			</button>
		);
	}

	return (
		<form className={hubStyles.newContractForm} onSubmit={handleSubmit}>
			<div className={hubStyles.newContractTitle}>POST A NEW CONTRACT</div>

			<label className={hubStyles.newContractField}>
				<span>Name</span>
				<input
					type="text"
					value={input.name}
					onChange={(e) => update('name', e.target.value)}
					placeholder="e.g. Ship Plugin v2"
					// eslint-disable-next-line jsx-a11y/no-autofocus
					autoFocus
				/>
			</label>

			<label className={hubStyles.newContractField}>
				<span>Goal (one line)</span>
				<input
					type="text"
					value={input.description}
					onChange={(e) => update('description', e.target.value)}
					placeholder="What does done look like?"
				/>
			</label>

			<div className={hubStyles.newContractGrid}>
				<label className={hubStyles.newContractField}>
					<span>Due</span>
					<input type="date" value={input.due} onChange={(e) => update('due', e.target.value)} />
				</label>
				<label className={hubStyles.newContractField}>
					<span>Difficulty</span>
					<select
						value={input.difficulty}
						onChange={(e) => update('difficulty', e.target.value as NewContractInput['difficulty'])}
					>
						<option value="">none</option>
						<option value="easy">easy</option>
						<option value="medium">medium</option>
						<option value="hard">hard</option>
					</select>
				</label>
				<label className={hubStyles.newContractField}>
					<span>Priority</span>
					<select
						value={input.priority}
						onChange={(e) => update('priority', e.target.value)}
					>
						{PRIORITY_OPTIONS.map((option) => (
							<option key={option} value={option}>
								{option}
							</option>
						))}
					</select>
				</label>
				<label className={hubStyles.newContractField}>
					<span>Skill</span>
					<select
						value={input.skill}
						onChange={(e) => update('skill', e.target.value)}
						required
					>
						<option value="">Select skill…</option>
						{skillOptions.map((skill) => (
							<option key={skill.name} value={skill.name}>
								{skill.name}
								{skill.class ? ` (${skill.class})` : ''}
							</option>
						))}
					</select>
				</label>
			</div>

			<div className={`${hubStyles.newContractGrid} ${hubStyles.newContractGridTriple}`}>
				<label className={hubStyles.newContractField}>
					<span>✨ XP</span>
					<input
						type="number"
						min={0}
						value={xp}
						onChange={(e) => setXp(Math.max(0, Number(e.target.value) || 0))}
					/>
				</label>
				<label className={hubStyles.newContractField}>
					<span>⭐ CP</span>
					<input
						type="number"
						min={0}
						value={cp}
						onChange={(e) => setCp(Math.max(0, Number(e.target.value) || 0))}
					/>
				</label>
				<label className={hubStyles.newContractField}>
					<span>
						{currencySymbol} {currencyName}
					</span>
					<input type="number" min={0} value={coins} readOnly aria-readonly />
				</label>
			</div>

			<div className={hubStyles.newContractActions}>
				<button
					type="submit"
					className={`${hubStyles.contractCta} ${hubStyles.contractCtaGold}`}
					disabled={busy || !input.name.trim() || !input.skill.trim()}
				>
					{busy ? 'POSTING…' : 'POST CONTRACT'}
				</button>
				<button
					type="button"
					className={`${hubStyles.contractCta} ${hubStyles.contractCtaBlue}`}
					onClick={() => setOpen(false)}
					disabled={busy}
				>
					CANCEL
				</button>
			</div>
			<p className={hubStyles.newContractHint}>
				Use <strong>+ NEW WAYPOINT</strong> on the card for missions; expand the blue panel to add checklist items.
			</p>
		</form>
	);
};

interface ProjectDebugModel {
	totalQuests: number;
	projectHeaders: number;
	linkedTasks: number;
	sourceFiles: string[];
	activeContract: string;
	activeWaypoint: string;
	contractsWithoutHeaders: string[];
	headersWithoutTasks: string[];
}

function buildDebugModel(
	allQuests: Quest[],
	projects: ProjectSummary[],
	activeContract: ContractDisplayModel | null
): ProjectDebugModel {
	const projectHeaders = allQuests.filter(isProjectHeaderQuest);
	const linkedTasks = allQuests.filter((quest) => !isProjectHeaderQuest(quest) && getQuestProjectSlug(quest));
	const sourceFiles = Array.from(new Set(allQuests.map((quest) => quest.filePath).filter(Boolean) as string[])).sort();
	const headerIds = new Set(projectHeaders.map((quest) => slugifyProjectId(quest.title) || quest.id));
	const contractsWithoutHeaders = projects
		.filter((project) => project.tasks.length > 0 && !headerIds.has(project.id))
		.map((project) => project.title);
	const headersWithoutTasks = projects
		.filter((project) => project.headerQuest && project.tasks.length === 0)
		.map((project) => project.title);

	return {
		totalQuests: allQuests.length,
		projectHeaders: projectHeaders.length,
		linkedTasks: linkedTasks.length,
		sourceFiles,
		activeContract: activeContract?.title ?? 'None',
		activeWaypoint: activeContract?.nextWaypoint?.title ?? 'None',
		contractsWithoutHeaders,
		headersWithoutTasks,
	};
}

const ProjectDebugPanel: React.FC<{ debug: ProjectDebugModel }> = ({ debug }) => (
	<details className={hubStyles.projectDebugPanel}>
		<summary className={hubStyles.projectDebugSummary}>PROJECT DEBUG</summary>
		<div className={hubStyles.projectDebugGrid}>
			<span>Total quests</span>
			<strong>{debug.totalQuests}</strong>
			<span>Contract headers</span>
			<strong>{debug.projectHeaders}</strong>
			<span>Linked tasks</span>
			<strong>{debug.linkedTasks}</strong>
			<span>Active contract</span>
			<strong>{debug.activeContract}</strong>
			<span>Next waypoint</span>
			<strong>{debug.activeWaypoint}</strong>
		</div>

		<div className={hubStyles.projectDebugBlock}>
			<div className={hubStyles.projectDebugLabel}>Source files</div>
			{debug.sourceFiles.length > 0 ? (
				<ul className={hubStyles.projectDebugList}>
					{debug.sourceFiles.map((file) => (
						<li key={file}>{file}</li>
					))}
				</ul>
			) : (
				<p>No quest files detected.</p>
			)}
		</div>

		{debug.contractsWithoutHeaders.length > 0 && (
			<div className={hubStyles.projectDebugWarn}>
				<div className={hubStyles.projectDebugLabel}>Linked tasks without a contract header</div>
				<ul className={hubStyles.projectDebugList}>
					{debug.contractsWithoutHeaders.map((title) => (
						<li key={title}>{title}</li>
					))}
				</ul>
			</div>
		)}

		{debug.headersWithoutTasks.length > 0 && (
			<div className={hubStyles.projectDebugNote}>
				<div className={hubStyles.projectDebugLabel}>Headers with no linked tasks yet</div>
				<ul className={hubStyles.projectDebugList}>
					{debug.headersWithoutTasks.map((title) => (
						<li key={title}>{title}</li>
					))}
				</ul>
			</div>
		)}
	</details>
);

export const QuestProjectsPanel: React.FC<QuestProjectsPanelProps> = ({
	allQuests,
	onQuestClick,
	onContinueOnTasks,
	onOpenContract,
	onTurnIn,
	onToggleSubtask,
	onCompleteQuest,
	onCreateContract,
	onAddChecklistItem,
	onAddWaypoint,
	onEditContract,
	onAbandonContract,
	currencyName = 'Coins',
	currencySymbol = '🪙',
	skillOptions = [],
}) => {
	const [pinnedId, setPinnedId] = useState<string | null>(() => loadPinnedContractId());
	const [turnInBusy, setTurnInBusy] = useState(false);
	const [celebration, setCelebration] = useState<CelebrationState | null>(null);

	const projects = useMemo(() => buildProjectSummaries(allQuests), [allQuests]);
	const activeProject = useMemo(() => pickActiveProject(projects, pinnedId), [projects, pinnedId]);
	const otherProjects = useMemo(
		() => pickOtherProjects(projects, activeProject),
		[projects, activeProject]
	);
	const isArchivedProject = (p: ProjectSummary) => isClosedContract(p);
	const openRoster = otherProjects.filter((p) => !isArchivedProject(p));
	const archivedRoster = otherProjects.filter(isArchivedProject);
	const activeContract = activeProject ? toContractDisplay(activeProject) : null;
	const debug = useMemo(
		() => buildDebugModel(allQuests, projects, activeContract),
		[allQuests, projects, activeContract]
	);

	// Drop stale pins when a contract was closed (abandon / turn-in) outside this panel.
	useEffect(() => {
		if (!pinnedId) return;
		const pinned = projects.find((p) => p.id === pinnedId);
		if (pinned && isClosedContract(pinned)) {
			setPinnedId(null);
			try {
				localStorage.removeItem(ACTIVE_CONTRACT_PIN_KEY);
			} catch {
				// Ignore storage write failures.
			}
		}
	}, [projects, pinnedId]);

	const pinContract = (project: ProjectSummary) => {
		setPinnedId(project.id);
		try {
			localStorage.setItem(ACTIVE_CONTRACT_PIN_KEY, project.id);
		} catch {
			// Ignore storage write failures.
		}
		pixelNotice(`📌 Active contract: ${project.title}`);
	};

	const openProjectDetails = (project: ProjectSummary) => {
		const quest = project.headerQuest ?? project.tasks[0] ?? null;
		if (quest && onQuestClick) onQuestClick(quest);
	};

	const clearPinIfMatching = (projectId: string) => {
		if (pinnedId !== projectId) return;
		setPinnedId(null);
		try {
			localStorage.removeItem(ACTIVE_CONTRACT_PIN_KEY);
		} catch {
			// Ignore storage write failures.
		}
	};

	const handleTurnIn = async (project: ProjectSummary) => {
		if (!onTurnIn || turnInBusy) return;
		setTurnInBusy(true);
		try {
			const rewards = await onTurnIn(project);
			if (rewards) {
				setCelebration({ title: project.title, rewards });
				// Unpin so the next open contract takes the active slot.
				clearPinIfMatching(project.id);
			}
		} finally {
			setTurnInBusy(false);
		}
	};

	const handleAbandon = async (project: ProjectSummary) => {
		if (!onAbandonContract) return;
		const ok = await onAbandonContract(project);
		if (ok) clearPinIfMatching(project.id);
	};

	const waypointQuest = activeProject ? getNextWaypointQuest(activeProject) : null;

	const handleCreateContract = async (input: NewContractInput): Promise<boolean> => {
		if (!onCreateContract) return false;
		const newId = await onCreateContract(input);
		if (!newId) return false;
		// Surface the freshly posted contract as the active one.
		setPinnedId(newId);
		try {
			localStorage.setItem(ACTIVE_CONTRACT_PIN_KEY, newId);
		} catch {
			// Ignore storage write failures.
		}
		return true;
	};

	return (
		<section className={hubStyles.projectsHub} aria-label="Guild contracts">
			<ProjectsGuildBanner />

			{projects.length === 0 ? (
				<div className={hubStyles.projectsEmpty}>
					<div className={hubStyles.projectsEmptyEmoji}>📜</div>
					<p>No contracts posted yet.</p>
					<p className={hubStyles.projectsEmptyHint}>
						Tag tasks with <code>[project:: My Project]</code> or add a header with <code>[type:: project]</code>.
					</p>
				</div>
			) : (
				<div className={hubStyles.projectsHubBody}>
					{activeProject && activeContract && (
						<ActiveContractCard
							contract={activeContract}
							project={activeProject}
							waypointQuest={waypointQuest}
							onContinue={
								onContinueOnTasks
									? () => onContinueOnTasks(activeProject.id, activeProject.title)
									: undefined
							}
							onOpenContract={onOpenContract ? () => onOpenContract(activeProject) : undefined}
							onQuestClick={onQuestClick}
							onToggleSubtask={onToggleSubtask}
							onCompleteQuest={onCompleteQuest}
							onTurnIn={onTurnIn ? () => void handleTurnIn(activeProject) : undefined}
							turnInBusy={turnInBusy}
							onAddChecklistItem={
								onAddChecklistItem && waypointQuest
									? (title) => onAddChecklistItem(activeProject, waypointQuest, title)
									: undefined
							}
							onAddWaypoint={
								onAddWaypoint ? (title) => onAddWaypoint(activeProject, title) : undefined
							}
							onEdit={
								onEditContract && activeProject.headerQuest
									? () => onEditContract(activeProject)
									: undefined
							}
							onAbandon={
								onAbandonContract && activeProject.headerQuest && !activeProject.headerQuest.completed
									? () => void handleAbandon(activeProject)
									: undefined
							}
						/>
					)}

					{openRoster.length > 0 && (
						<div className={hubStyles.rosterHeading}>OTHER CONTRACTS</div>
					)}
					{openRoster.map((project) => (
						<RosterContractCard
							key={project.id}
							contract={toContractDisplay(project)}
							onPin={() => pinContract(project)}
							onOpenDetails={onQuestClick ? () => openProjectDetails(project) : undefined}
						/>
					))}

					{archivedRoster.length > 0 && (
						<details className={hubStyles.archivedSection}>
							<summary className={hubStyles.archivedSummary}>
								COMPLETED CONTRACTS ({archivedRoster.length})
							</summary>
							<div className={hubStyles.archivedList}>
								{archivedRoster.map((project) => (
									<RosterContractCard
										key={project.id}
										contract={toContractDisplay(project)}
										onOpenDetails={onQuestClick ? () => openProjectDetails(project) : undefined}
									/>
								))}
							</div>
						</details>
					)}
				</div>
			)}

			{onCreateContract && (
				<NewContractForm
					onSubmit={handleCreateContract}
					currencyName={currencyName}
					currencySymbol={currencySymbol}
					skillOptions={skillOptions}
				/>
			)}

			{SHOW_PROJECT_DEBUG && <ProjectDebugPanel debug={debug} />}

			{celebration && (
				<CelebrationOverlay celebration={celebration} onDismiss={() => setCelebration(null)} />
			)}
		</section>
	);
};
