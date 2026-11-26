import React from 'react';
import type { JourneyFoeDefinition } from '../../../features/quests/data/journeyFoeCatalog';
import type { JourneyVictoryLoot } from '../../../features/quests/utils/journeyLootService';
import type { JourneyRun } from '../../../features/quests/utils/journeyRunService';
import { describeAffinity } from '../../../features/quests/utils/journeyAffinity';
import {
	SystemActionBtn,
	SystemFrame,
	SystemHeader,
	SystemInfoBox,
	SystemStatGrid,
	systemPanelStyles as sys,
} from '../../../shared/components/ui/system';
import hubStyles from './QuestHubPanels.module.css';

interface JourneyRunOutcomePanelProps {
	kind: 'victory' | 'failed';
	run: JourneyRun;
	foe: JourneyFoeDefinition;
	loot?: JourneyVictoryLoot | null;
	currencySymbol?: string;
	onDismiss: () => void;
	systemUi?: boolean;
}

export const JourneyRunOutcomePanel: React.FC<JourneyRunOutcomePanelProps> = ({
	kind,
	run,
	foe,
	loot,
	currencySymbol = '🪙',
	onDismiss,
	systemUi = false,
}) => {
	const victory = kind === 'victory';

	const statCells = [
		{ label: 'Tasks', value: String(run.tasksCompletedCount) },
		{ label: 'Damage', value: String(run.totalDamageDealt) },
		{ label: 'Weakness', value: describeAffinity(run.affinity) },
	];

	const lootSummary =
		victory && loot
			? `+${loot.xp} XP · +${loot.cp} CP · +${currencySymbol}${loot.coins}${
					loot.materialNames.length > 0 ? ` · ${loot.materialNames.join(', ')}` : ''
				}`
			: null;

	if (systemUi) {
		return (
			<SystemFrame>
				<SystemHeader
					icon={victory ? '✦' : '☠'}
					label={victory ? 'SYSTEM: GATE CLEARED' : 'SYSTEM: GATE LOST'}
					title={foe.name}
				/>
				<p className={sys.lead}>
					{victory
						? 'The foe has fallen. Your completed tasks broke through before the window closed.'
						: `Time ran out — ${foe.name} escaped with ${run.currentHp} HP remaining.`}
				</p>
				<SystemStatGrid cells={statCells} />
				{lootSummary && (
					<SystemInfoBox title="Spoils awarded">{lootSummary}</SystemInfoBox>
				)}
				{!victory && (
					<SystemInfoBox title="Combat tip">
						Tag tasks with the foe&apos;s weakness for full damage instead of grazes.
					</SystemInfoBox>
				)}
				<SystemActionBtn onClick={onDismiss}>Return to roster</SystemActionBtn>
			</SystemFrame>
		);
	}

	return (
		<div
			className={`${hubStyles.journeyOutcomePanel} ${victory ? hubStyles.journeyOutcomeVictory : hubStyles.journeyOutcomeFailed}`}
			aria-label={victory ? 'Journey victory summary' : 'Journey failed summary'}
		>
			<div className={hubStyles.journeyOutcomeTag}>{victory ? 'GATE CLEARED' : 'GATE LOST'}</div>
			<h4 className={hubStyles.journeyOutcomeTitle}>{foe.name}</h4>
			<p className={hubStyles.journeyOutcomeLead}>
				{victory
					? 'The foe has fallen. Your completed tasks broke through before the window closed.'
					: `Time ran out — ${foe.name} escaped with ${run.currentHp} HP remaining.`}
			</p>

			<dl className={hubStyles.journeyOutcomeStats}>
				<div>
					<dt>Tasks landed</dt>
					<dd>{run.tasksCompletedCount}</dd>
				</div>
				<div>
					<dt>Total damage</dt>
					<dd>{run.totalDamageDealt}</dd>
				</div>
				<div>
					<dt>Weakness</dt>
					<dd>{describeAffinity(run.affinity)}</dd>
				</div>
			</dl>

			{victory && loot && (
				<div className={hubStyles.journeyOutcomeLoot}>
					<div className={hubStyles.journeyOutcomeLootLabel}>SPOILS</div>
					<div className={hubStyles.journeyOutcomeLootRow}>
						<span>+{loot.xp} XP</span>
						<span>+{loot.cp} CP</span>
						<span>
							+{currencySymbol}
							{loot.coins}
						</span>
						{loot.materialNames.length > 0 && <span>{loot.materialNames.join(', ')}</span>}
					</div>
				</div>
			)}

			{!victory && (
				<p className={hubStyles.journeyOutcomeHint}>
					Tip: tag tasks with the foe&apos;s weakness for full damage instead of grazes.
				</p>
			)}

			<button
				type="button"
				className={victory ? hubStyles.btnVictory : hubStyles.btnFailed}
				onClick={onDismiss}
			>
				Return to roster
			</button>
		</div>
	);
};
