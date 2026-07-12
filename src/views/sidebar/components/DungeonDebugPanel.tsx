import React, { useMemo, useState } from 'react';
import type GamifiedObsidianPlugin from '../../../core/main';
import { getJourneyFoes, getJourneyFoeById } from '../../../features/quests/utils/journeyFoeRegistry';
import { listBosses } from '../../../features/quests/utils/bossFile';
import {
	debugAddClearedFoe,
	debugResetDungeonClears,
	debugSimulateVictoryDismiss,
	getDungeonProgress,
	loadJourneyState,
} from '../../../features/quests/utils/journeyRunService';
import { useJourneyRun } from '../../../features/quests/hooks/useJourneyRun';
import { notifyDungeonUnlocked } from '../../../shared/services/ceremonyService';
import { pixelNotice } from '../../../shared/utils/noticeUtils';
import hubStyles from './QuestHubPanels.module.css';

interface DungeonDebugPanelProps {
	plugin: GamifiedObsidianPlugin;
	onRefresh: () => void;
}

export const DungeonDebugPanel: React.FC<DungeonDebugPanelProps> = ({ plugin, onRefresh }) => {
	const { activeRun, clearedFoeIds, refresh } = useJourneyRun();
	const foes = useMemo(() => getJourneyFoes(), []);
	const foeCount = foes.length;
	const [expanded, setExpanded] = useState(false);
	const [lastEvent, setLastEvent] = useState<string | null>(null);

	const progress = useMemo(
		() => getDungeonProgress({ activeRun, clearedFoeIds, board: loadJourneyState().board }, foeCount),
		[activeRun, clearedFoeIds, foeCount]
	);

	const clearedNames = progress.clearedFoeIds
		.map((id) => getJourneyFoeById(id)?.name ?? id)
		.join(', ');

	const bump = () => {
		onRefresh();
		refresh();
	};

	const handleUnlockNotice = () => {
		notifyDungeonUnlocked(progress.clearedCount, progress.required);
		setLastEvent('Fired unlock notice (preview)');
	};

	const handleAddClear = () => {
		const state = loadJourneyState();
		const nextId = state.board?.entries.find((e) => !state.clearedFoeIds.includes(e.foeId))?.foeId
			?? foes.find((f) => !state.clearedFoeIds.includes(f.id))?.id;
		if (!nextId) {
			pixelNotice('All roster foes already cleared this cycle.', 2500);
			return;
		}
		const result = debugAddClearedFoe(nextId, foeCount);
		bump();
		const next = getJourneyFoeById(nextId);
		setLastEvent(
			result.dungeonJustUnlocked
				? `Added clear: ${next?.name ?? nextId} — dungeon unlocked`
				: `Added clear: ${next?.name ?? nextId}`
		);
		if (result.dungeonJustUnlocked) {
			notifyDungeonUnlocked(result.progress.clearedCount, result.progress.required);
		}
	};

	const handleVictoryDismiss = () => {
		const result = debugSimulateVictoryDismiss(foeCount);
		bump();
		if (!result.ok) {
			pixelNotice(result.reason ?? 'Victory dismiss failed', 2500);
			return;
		}
		setLastEvent(
			result.dungeonJustUnlocked
				? 'Victory dismissed — dungeon unlocked'
				: 'Victory dismissed — returned to roster'
		);
		if (result.dungeonJustUnlocked) {
			notifyDungeonUnlocked(result.progress.clearedCount, result.progress.required);
		}
	};

	const handleReset = () => {
		const next = debugResetDungeonClears();
		bump();
		setLastEvent(`Reset clears — ${next.clearedCount}/${next.required} toward unlock`);
	};

	const handleVictoryPreview = async () => {
		try {
			const bosses = await listBosses(plugin.app);
			const path = bosses[0]?.filePath;
			await plugin.openBossVictoryPreview(path);
			setLastEvent(
				path
					? `Opened victory preview in Boss workspace (${bosses[0]?.name})`
					: 'Opened victory preview in Boss workspace (fallback boss)'
			);
		} catch (error) {
			console.error('[DungeonDebugPanel] Victory preview failed', error);
			pixelNotice('Could not open victory preview.', 3000);
		}
	};

	return (
		<div className={hubStyles.dungeonDebugPanel}>
			<button
				type="button"
				className={hubStyles.dungeonDebugToggle}
				onClick={() => setExpanded((v) => !v)}
				aria-expanded={expanded}
			>
				Dungeon debug {expanded ? '▾' : '▸'}
			</button>

			{expanded && (
				<div className={hubStyles.dungeonDebugBody}>
					<dl className={hubStyles.dungeonDebugStats}>
						<div>
							<dt>Status</dt>
							<dd>{progress.unlocked ? 'UNLOCKED' : 'LOCKED'}</dd>
						</div>
						<div>
							<dt>Progress</dt>
							<dd>
								{progress.clearedCount}/{progress.required} foes
							</dd>
						</div>
						<div>
							<dt>Pending victory</dt>
							<dd>
								{progress.pendingVictoryFoeId
									? getJourneyFoeById(progress.pendingVictoryFoeId)?.name ?? progress.pendingVictoryFoeId
									: '—'}
							</dd>
						</div>
					</dl>

					<p className={hubStyles.dungeonDebugHint}>
						Cleared this cycle: {clearedNames || 'none yet'}
					</p>
					{activeRun && (
						<p className={hubStyles.dungeonDebugHint}>
							Active run: {getJourneyFoeById(activeRun.foeId)?.name ?? activeRun.foeId} ({activeRun.status})
						</p>
					)}

					<div className={hubStyles.dungeonDebugActions}>
						<button type="button" className={hubStyles.dungeonDebugBtn} onClick={handleAddClear}>
							+1 cleared foe
						</button>
						<button type="button" className={hubStyles.dungeonDebugBtn} onClick={handleVictoryDismiss}>
							Simulate victory dismiss
						</button>
						<button type="button" className={hubStyles.dungeonDebugBtn} onClick={handleReset}>
							Reset clears
						</button>
						<button type="button" className={hubStyles.dungeonDebugBtn} onClick={handleUnlockNotice}>
							Preview unlock notice
						</button>
						<button type="button" className={hubStyles.dungeonDebugBtn} onClick={() => void handleVictoryPreview()}>
							Preview boss victory (workspace)
						</button>
					</div>

					{lastEvent && <p className={hubStyles.dungeonDebugEvent}>Last: {lastEvent}</p>}
				</div>
			)}
		</div>
	);
};
