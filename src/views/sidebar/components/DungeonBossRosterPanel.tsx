import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type GamifiedObsidianPlugin from '../../../core/main';
import { ensureDefaultGateBosses } from '../../../features/quests/data/defaultGateBosses';
import type { JourneyFoeDefinition } from '../../../features/quests/data/journeyFoeCatalog';
import {
	affinityPillLabel,
	describeAffinity,
	describeAffinityRule,
} from '../../../features/quests/utils/journeyAffinity';
import {
	BOSS_RAID_UPDATED_EVENT,
	getActiveBossFileRaid,
	type ActiveBossFileRaid,
} from '../../../features/quests/utils/bossRaidService';
import { serializeAffinityRule } from '../../../features/quests/utils/foesParser';
import {
	createBossFile,
	getRequiredTasks,
	listBosses,
	type BossDifficulty,
	type BossFileData,
} from '../../../features/quests/utils/bossFile';
import { fieldNotice } from '../../../shared/utils/noticeUtils';
import hubStyles from './QuestHubPanels.module.css';

function pickRecommendedPath(bosses: BossFileData[], gateFoe?: JourneyFoeDefinition | null): string | null {
	if (bosses.length === 0) return null;

	if (gateFoe) {
		const foeName = gateFoe.name.toLowerCase();
		const byGate = bosses.find(
			(b) =>
				b.name.toLowerCase().includes(foeName) ||
				b.name.toLowerCase().includes(`${foeName} (raid)`) ||
				b.bossId.includes(gateFoe.id)
		);
		if (byGate) return byGate.filePath;
	}

	const active = bosses.find((b) => b.status === 'active');
	if (active) return active.filePath;

	const difficultyOrder = { hard: 0, medium: 1, easy: 2 } as const;
	const sorted = [...bosses].sort(
		(a, b) => difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty]
	);
	return sorted[0]?.filePath ?? bosses[0].filePath;
}

function formatBossStatus(boss: BossFileData): string {
	if (boss.status === 'active') return 'ACTIVE';
	if (boss.status === 'defeated') return 'READY';
	return 'DORMANT';
}

const DIFFICULTY_TAG_CLASS: Record<BossDifficulty, string> = {
	easy: 'diffTagEasy',
	medium: 'diffTagMedium',
	hard: 'diffTagHard',
};

function isNeutralAffinityRule(boss: BossFileData): boolean {
	return !boss.affinityRule || boss.affinityRule.kind === 'neutral';
}

function isNeutralAffinity(affinity: ActiveBossFileRaid['affinity'] | undefined): boolean {
	return !affinity || affinity.kind === 'neutral' || !affinity.target;
}

function getBossAffinityDisplay(
	boss: BossFileData,
	activeRaid: ActiveBossFileRaid | null
): { pill: string; title: string; isNeutral: boolean; isRolled: boolean } {
	const isActiveRaid = activeRaid?.bossFilePath === boss.filePath;
	if (isActiveRaid && activeRaid) {
		return {
			pill: affinityPillLabel(activeRaid.affinity),
			title: describeAffinity(activeRaid.affinity),
			isNeutral: isNeutralAffinity(activeRaid.affinity),
			isRolled: true,
		};
	}
	return {
		pill: describeAffinityRule(boss.affinityRule),
		title: describeAffinityRule(boss.affinityRule),
		isNeutral: isNeutralAffinityRule(boss),
		isRolled: false,
	};
}

interface DungeonBossRosterPanelProps {
	plugin: GamifiedObsidianPlugin;
	gateFoe?: JourneyFoeDefinition | null;
	pulseUnlock?: boolean;
	clearedForCycle?: boolean;
	onForgeBoss: () => void;
}

export const DungeonBossRosterPanel: React.FC<DungeonBossRosterPanelProps> = ({
	plugin,
	gateFoe,
	pulseUnlock = false,
	clearedForCycle = false,
	onForgeBoss,
}) => {
	const [bosses, setBosses] = useState<BossFileData[]>([]);
	const [loading, setLoading] = useState(true);
	const [selectedPath, setSelectedPath] = useState<string | null>(null);
	const [entering, setEntering] = useState(false);
	const [activeRaid, setActiveRaid] = useState<ActiveBossFileRaid | null>(() =>
		getActiveBossFileRaid()
	);

	const recommendedPath = useMemo(() => pickRecommendedPath(bosses, gateFoe), [bosses, gateFoe]);

	const reload = useCallback(async () => {
		setLoading(true);
		try {
			await ensureDefaultGateBosses(plugin.app);
			const list = await listBosses(plugin.app);
			setBosses(list);
			setSelectedPath((prev) => {
				if (prev && list.some((b) => b.filePath === prev)) return prev;
				return pickRecommendedPath(list, gateFoe);
			});
		} finally {
			setLoading(false);
		}
	}, [plugin.app, gateFoe]);

	useEffect(() => {
		void reload();
	}, [reload]);

	useEffect(() => {
		const handler = () => void reload();
		window.addEventListener('gamification-boss-updated', handler);
		return () => window.removeEventListener('gamification-boss-updated', handler);
	}, [reload]);

	useEffect(() => {
		const syncRaid = () => setActiveRaid(getActiveBossFileRaid());
		syncRaid();
		window.addEventListener(BOSS_RAID_UPDATED_EVENT, syncRaid);
		return () => window.removeEventListener(BOSS_RAID_UPDATED_EVENT, syncRaid);
	}, []);

	const handleSelect = (boss: BossFileData) => {
		setSelectedPath(boss.filePath);
		fieldNotice(`Target locked: ${boss.name}`, 2200);
	};

	const handleEditBoss = (event: React.MouseEvent, boss: BossFileData) => {
		event.stopPropagation();
		void plugin.openEditBossModal(boss, reload);
	};

	const handleCardKeyDown = (event: React.KeyboardEvent, boss: BossFileData) => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			handleSelect(boss);
		}
	};

	const handleEnterGate = async () => {
		if (clearedForCycle || entering) return;
		setEntering(true);
		try {
			let path = selectedPath;
			if (!path && bosses.length === 0) {
				const difficulty = gateFoe?.difficulty ?? 'medium';
				const count = getRequiredTasks(difficulty);
				const file = await createBossFile(plugin.app, {
					name: gateFoe ? `${gateFoe.name} (Raid)` : 'Gate Boss',
					emoji: gateFoe?.emoji ?? '🏰',
					description:
						gateFoe?.description ??
						'A gate boss risen from the Journey road. Only real work fells it.',
					skill: gateFoe ? serializeAffinityRule(gateFoe.affinityRule) : 'neutral',
					difficulty,
					tasks: Array.from({ length: count }, (_, i) => `Skill task ${i + 1}`),
				});
				path = file.path;
				await reload();
			}
			if (!path) {
				fieldNotice('Select a gate boss first.', 2500);
				return;
			}
			await plugin.openBossRaid(path, { lockDungeon: true });
		} catch (error) {
			console.error('[DungeonBossRosterPanel] Enter gate failed', error);
			fieldNotice('Could not open the gate.', 3000);
		} finally {
			setEntering(false);
		}
	};

	const selectedBoss = bosses.find((b) => b.filePath === selectedPath) ?? null;
	const selectedAffinity = selectedBoss
		? getBossAffinityDisplay(selectedBoss, activeRaid)
		: null;

	const rosterTitle = clearedForCycle ? 'GATE SEALED' : 'GATE BREAK DETECTED';
	const rosterWhisper = clearedForCycle
		? 'Raid cleared this cycle. The gate reopens when the board reshuffles.'
		: gateFoe
			? `A raid target stirs — risen from ${gateFoe.name}. Select one to enter.`
			: 'Select a registered gate boss. Completion grants cycle spoils.';

	const rosterBody = (
		<>
			{loading ? (
				<p className={hubStyles.gateRosterEmpty}>Scanning gate registry…</p>
			) : bosses.length === 0 ? (
				<div className={hubStyles.gateRosterEmpty}>
					<p>No registered gate bosses.</p>
					<p className={hubStyles.gateRosterEmptyHint}>
						Forge one, or enter to spawn from the gate foe.
					</p>
				</div>
			) : (
				<ul className={hubStyles.gateRosterList} role="listbox" aria-label="Gate boss roster">
					{bosses.map((boss) => {
						const selected = boss.filePath === selectedPath;
						const recommended = boss.filePath === recommendedPath;
						const affinity = getBossAffinityDisplay(boss, activeRaid);
						return (
							<li key={boss.filePath} role="presentation">
								<div
									role="option"
									tabIndex={0}
									aria-selected={selected}
									className={`${hubStyles.gateRosterCard} ${selected ? hubStyles.gateRosterCardSelected : ''}`}
									onClick={() => handleSelect(boss)}
									onKeyDown={(e) => handleCardKeyDown(e, boss)}
								>
									<button
										type="button"
										className={hubStyles.gateRosterEditBtn}
										title="Edit boss"
										aria-label={`Edit ${boss.name}`}
										onClick={(e) => handleEditBoss(e, boss)}
									>
										✎
									</button>
									{recommended && (
										<span className={hubStyles.gateRosterRecommendedTag}>RECOMMENDED</span>
									)}
									<div className={hubStyles.gateRosterPortrait} aria-hidden="true">
										<span className={hubStyles.gateRosterEmoji}>{boss.emoji || '👹'}</span>
									</div>
									<div className={hubStyles.gateRosterMeta}>
										<div className={hubStyles.gateRosterName}>{boss.name}</div>
										<div className={hubStyles.gateRosterBadges}>
											<span
												className={`${hubStyles.rosterBadge} ${
													hubStyles[DIFFICULTY_TAG_CLASS[boss.difficulty]]
												}`}
											>
												{boss.difficulty.toUpperCase()}
											</span>
											<span
												className={`${hubStyles.affinityPill} ${
													affinity.isNeutral
														? hubStyles.affinityPillNeutral
														: hubStyles.affinityPillTarget
												}`}
												title={affinity.title}
											>
												{affinity.pill}
											</span>
										</div>
										<div className={hubStyles.gateRosterStats}>
											<span>{boss.requiredTasks} tasks</span>
											<span aria-hidden="true">·</span>
											<span>{boss.timesDefeated}× cleared</span>
										</div>
										<span className={hubStyles.gateRosterStatus}>
											{formatBossStatus(boss)}
										</span>
									</div>
								</div>
							</li>
						);
					})}
				</ul>
			)}
		</>
	);

	return (
		<div className={hubStyles.gateRosterWrap}>
			<div
				className={`${hubStyles.gateRoster} ${pulseUnlock ? hubStyles.gateRosterPulse : ''}`}
				data-gate-ui="system"
			>
				<header className={hubStyles.gateRosterHeader}>
					<div className={hubStyles.gateRosterSystemLabel}>[ SYSTEM ]</div>
					<div className={hubStyles.gateRosterTitle}>{rosterTitle}</div>
					<p className={hubStyles.gateRosterWhisper}>{rosterWhisper}</p>
				</header>
				{rosterBody}
				{clearedForCycle && (
					<p className={hubStyles.gateRosterEmptyHint}>
						Dungeon raid cleared for this board cycle. Return after the roster reshuffles.
					</p>
				)}
			</div>

			<footer className={hubStyles.gateRosterFooter}>
				{selectedBoss && selectedAffinity && !clearedForCycle && (
					<p className={hubStyles.gateRosterSelectedHint}>
						Target: <strong>{selectedBoss.name}</strong>
						{' · '}
						{selectedBoss.difficulty.toUpperCase()}
						{' · '}
						{selectedAffinity.isRolled ? selectedAffinity.title : selectedAffinity.pill}
					</p>
				)}

				<button
					type="button"
					className={hubStyles.gateRosterEnterBtn}
					disabled={clearedForCycle || entering || (bosses.length > 0 && !selectedPath)}
					onClick={() => void handleEnterGate()}
				>
					{clearedForCycle
						? 'Cleared — reopens next cycle'
						: entering
							? 'Opening gate…'
							: bosses.length === 0
								? 'Enter gate (forge target)'
								: 'Enter gate'}
				</button>

				<div className={hubStyles.gateRosterActions}>
					<button type="button" className={hubStyles.dungeonSecondary} onClick={onForgeBoss}>
						Forge a boss
					</button>
				</div>
			</footer>
		</div>
	);
};
