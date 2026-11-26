import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type GamifiedObsidianPlugin from '../../../core/main';
import type { JourneyFoeDefinition } from '../../../features/quests/data/journeyFoeCatalog';
import { getJourneyFoeById, getJourneyFoes } from '../../../features/quests/utils/journeyFoeRegistry';
import { resolveFoeSpriteUrl } from '../../../features/quests/utils/foeSprites';
import {
	ensureJourneyBoard,
	getBoardDaysRemaining,
} from '../../../features/quests/utils/journeyBoardService';
import {
	debugSimulateJourneyTaskHit,
	getDungeonProgress,
	loadJourneyState,
	markJourneyVictoryLootClaimed,
} from '../../../features/quests/utils/journeyRunService';
import { JourneyRunOutcomePanel } from './JourneyRunOutcomePanel';
import {
	buildJourneyVictoryNotice,
	computeJourneyVictoryLoot,
	grantJourneyVictoryLoot,
} from '../../../features/quests/utils/journeyLootService';
import {
	notifyJourneyHit,
	notifyJourneyVictory,
	notifyDungeonUnlocked,
} from '../../../shared/services/ceremonyService';
import { useJourneyRun } from '../../../features/quests/hooks/useJourneyRun';
import { AddFoeModal } from '../../../features/quests/modals/AddFoeModal';
import { JourneyActiveRunPanel } from './JourneyActiveRunPanel';
import { JourneyRosterPanel } from './JourneyRosterPanel';
import { JourneySceneBanner } from './JourneySceneBanner';
import {
	SystemFrame,
	SystemHeader,
	SystemInfoBox,
	systemPanelStyles as sys,
} from '../../../shared/components/ui/system';
import { getAppliedVisualTheme } from '../../../shared/utils/visualThemeManager';
import hubStyles from './QuestHubPanels.module.css';
import { pixelNotice } from '../../../shared/utils/noticeUtils';

interface QuestJourneyPanelProps {
	plugin: GamifiedObsidianPlugin;
}

const SCENE_SYSTEM_META: Record<
	'idle' | 'encounter' | 'victory' | 'failed',
	{ icon: string; label: string; title: string }
> = {
	idle: { icon: '🗺', label: 'SYSTEM: OVERWORLD', title: 'The road' },
	encounter: { icon: '⚔', label: 'SYSTEM: ENCOUNTER', title: 'On the road' },
	victory: { icon: '✦', label: 'SYSTEM: VICTORY', title: 'Foe fallen' },
	failed: { icon: '☠', label: 'SYSTEM: FAILED', title: 'Foe escaped' },
};

export const QuestJourneyPanel: React.FC<QuestJourneyPanelProps> = ({ plugin }) => {
	const {
		activeRun,
		clearedFoeIds,
		board,
		startRun,
		leaveRun,
		dismissVictory,
		dismissFailed,
		refresh,
	} = useJourneyRun();
	const [startError, setStartError] = useState<string | null>(null);
	const [foesVersion, setFoesVersion] = useState(0);

	useEffect(() => {
		let cancelled = false;
		void ensureJourneyBoard(plugin).then(() => {
			if (!cancelled) {
				setFoesVersion((v) => v + 1);
				refresh();
			}
		});
		return () => {
			cancelled = true;
		};
	}, [plugin, refresh]);

	useEffect(() => {
		const id = window.setInterval(() => refresh(), 60_000);
		return () => window.clearInterval(id);
	}, [refresh]);

	// eslint-disable-next-line react-hooks/exhaustive-deps
	const foes = useMemo(() => getJourneyFoes(), [foesVersion]);
	const foe = activeRun ? getJourneyFoeById(activeRun.foeId) : undefined;
	const hasActiveRun = activeRun != null && foe != null;

	const resolveSprite = useCallback(
		(f: JourneyFoeDefinition) => resolveFoeSpriteUrl(plugin, f),
		[plugin]
	);
	const foeSpriteUrl = foe ? resolveSprite(foe) : null;

	const sceneMode = !hasActiveRun
		? 'idle'
		: activeRun.status === 'completed'
			? 'victory'
			: activeRun.status === 'failed'
				? 'failed'
				: 'encounter';

	const systemUi = getAppliedVisualTheme().preset === 'system-hunter';
	const sceneMeta = SCENE_SYSTEM_META[sceneMode];

	const handleFaceFoe = (foeId: string) => {
		setStartError(null);
		const result = startRun(foeId);
		if (!result.ok) {
			setStartError(result.reason);
		}
	};

	const openFoeModal = (foeToEdit?: JourneyFoeDefinition) => {
		new AddFoeModal(
			plugin.app,
			plugin,
			() => {
				setFoesVersion((v) => v + 1);
				refresh();
			},
			foeToEdit
		).open();
	};

	const handleDebugTask = async () => {
		const hit = debugSimulateJourneyTaskHit();
		if (!hit.applied) {
			pixelNotice('Debug task could not apply — no active run?', 2500);
			refresh();
			return;
		}

		notifyJourneyHit(hit.damage, {
			defeated: hit.defeated,
			grazed: hit.grazed,
			hpPercentAfter: hit.hpPercentAfter,
		});
		if (hit.dungeonJustUnlocked) {
			notifyDungeonUnlocked(hit.clearedCount, hit.requiredClears);
		}

		if (hit.defeated) {
			const state = loadJourneyState();
			const run = state.activeRun;
			if (run && !run.victoryLootClaimed) {
				const f = getJourneyFoeById(run.foeId);
				const loot = await grantJourneyVictoryLoot(plugin.app.vault, run, plugin.app);
				if (loot) {
					markJourneyVictoryLootClaimed();
					notifyJourneyVictory(
						buildJourneyVictoryNotice(
							f?.name ?? 'Foe',
							loot,
							plugin.settings.currencySymbol ?? '🪙'
						)
					);
				}
			}
		}

		refresh();
	};

	const victoryLootPreview = useMemo(() => {
		if (!foe || activeRun?.status !== 'completed') return null;
		return computeJourneyVictoryLoot(foe);
	}, [foe, activeRun?.status]);

	const dungeonProgress = useMemo(
		() => getDungeonProgress({ activeRun, clearedFoeIds, board }, foes.length),
		[activeRun, clearedFoeIds, board, foes.length]
	);

	const handleDismissVictory = () => {
		const result = dismissVictory(foes.length);
		if (result.dungeonJustUnlocked) {
			notifyDungeonUnlocked(result.clearedCount, result.required);
		}
	};

	const runResolved =
		hasActiveRun && (activeRun.status === 'completed' || activeRun.status === 'failed');
	const showRosterBelow = !hasActiveRun || runResolved;

	const journeyBody = (
		<div className={systemUi ? sys.journeyInner : undefined}>
			<JourneySceneBanner
				mode={sceneMode}
				run={activeRun ?? undefined}
				foe={foe}
				foeSpriteUrl={foeSpriteUrl}
				dungeonUnlocked={dungeonProgress.unlocked}
				systemUi={systemUi}
			/>

			{hasActiveRun && activeRun.status === 'active' && (
				<JourneyActiveRunPanel
					run={activeRun}
					foe={foe}
					dungeonClearedCount={dungeonProgress.clearedCount}
					dungeonRequired={dungeonProgress.required}
					onLeaveRun={leaveRun}
					onDismissVictory={handleDismissVictory}
					onDebugTask={() => void handleDebugTask()}
					systemUi={systemUi}
				/>
			)}

			{hasActiveRun && activeRun.status === 'completed' && foe && (
				<JourneyRunOutcomePanel
					kind="victory"
					run={activeRun}
					foe={foe}
					loot={victoryLootPreview}
					currencySymbol={plugin.settings.currencySymbol ?? '🪙'}
					onDismiss={handleDismissVictory}
					systemUi={systemUi}
				/>
			)}

			{hasActiveRun && activeRun.status === 'failed' && foe && (
				<JourneyRunOutcomePanel
					kind="failed"
					run={activeRun}
					foe={foe}
					onDismiss={dismissFailed}
					systemUi={systemUi}
				/>
			)}

			{showRosterBelow && (
				<JourneyRosterPanel
					foes={foes}
					board={board}
					boardDaysRemaining={getBoardDaysRemaining(board)}
					activeRun={activeRun}
					clearedFoeIds={clearedFoeIds}
					onFaceFoe={handleFaceFoe}
					onCreateFoe={() => openFoeModal()}
					onEditFoe={(f) => openFoeModal(f)}
					resolveSprite={resolveSprite}
					startError={startError}
					compact={runResolved}
					systemUi={systemUi}
				/>
			)}

			{systemUi && !dungeonProgress.unlocked && (
				<SystemInfoBox title="Dungeon gate protocol">
					Defeat {dungeonProgress.required} Journey foes this board cycle to unlock the raid
					gate. Progress: {dungeonProgress.clearedCount}/{dungeonProgress.required}.
				</SystemInfoBox>
			)}
		</div>
	);

	return (
		<section
			className={systemUi ? hubStyles.journeyHubSystem : hubStyles.journeyHub}
			aria-label="Journey hub"
		>
			{systemUi ? (
				<SystemFrame>
					<SystemHeader
						icon={sceneMeta.icon}
						label={sceneMeta.label}
						title={sceneMeta.title}
					/>
					{journeyBody}
				</SystemFrame>
			) : (
				journeyBody
			)}
		</section>
	);
};
