import React from 'react';
import type { JourneyFoeDefinition } from '../../../features/quests/data/journeyFoeCatalog';
import type { JourneyRun } from '../../../features/quests/utils/journeyRunService';
import {
	getDayIndexForRun,
	getDaysRemainingForRun,
	getFoeHpPercent,
	getJourneyHpSegmentFill,
} from '../../../features/quests/utils/journeyRunService';
import { systemPanelStyles as sys } from '../../../shared/components/ui/system';
import {
	getPluginAssetUrl,
	PLUGIN_ASSETS,
} from '../../../shared/utils/pluginAssetUrl';
import hubStyles from './QuestHubPanels.module.css';

const HP_SEGMENT_COUNT = 8;

export type JourneySceneMode = 'idle' | 'encounter' | 'victory' | 'failed';

interface JourneySceneBannerProps {
	mode: JourneySceneMode;
	run?: JourneyRun;
	foe?: JourneyFoeDefinition;
	foeSpriteUrl?: string | null;
	dungeonUnlocked?: boolean;
	systemUi?: boolean;
}

export const JourneySceneBanner: React.FC<JourneySceneBannerProps> = ({
	mode,
	run,
	foe,
	foeSpriteUrl,
	dungeonUnlocked = false,
	systemUi = false,
}) => {
	const defeated = mode === 'victory';
	const failed = mode === 'failed';
	const encounter = mode === 'encounter' || mode === 'victory' || mode === 'failed';

	const dayIndex = run && foe ? getDayIndexForRun(run, foe) : null;
	const daysLeft = run ? getDaysRemainingForRun(run) : null;
	const urgent = mode === 'encounter' && daysLeft != null && daysLeft <= 1;
	const hpFilled =
		run && foe ? getJourneyHpSegmentFill(run.currentHp, run.maxHp, HP_SEGMENT_COUNT) : 0;
	const dungeonOpen = dungeonUnlocked;
	const hpPercent = run ? getFoeHpPercent(run) : null;
	const hpPctFill = run && foe ? Math.max(4, getFoeHpPercent(run)) : 0;

	const title =
		mode === 'victory'
			? '— FOE FALLEN —'
			: mode === 'failed'
				? '— FOE ESCAPED —'
				: mode === 'encounter'
					? urgent
						? '— GATE CLOSING —'
						: '— ON THE ROAD —'
					: '— THE ROAD —';

	const bannerSrc = encounter && !failed
		? getPluginAssetUrl(PLUGIN_ASSETS.journeyBattleBanner)
		: getPluginAssetUrl(PLUGIN_ASSETS.journeyOverworldBanner);
	const windowClass = [
		hubStyles.sceneWindow,
		systemUi ? sys.sceneWindowSystem : '',
		systemUi && urgent ? sys.sceneWindowSystemUrgent : '',
		mode === 'idle'
			? hubStyles.sceneWindowIdle
			: mode === 'encounter'
				? hubStyles.sceneWindowBattle
				: mode === 'failed'
					? hubStyles.sceneWindowFailed
					: hubStyles.sceneWindowVictory,
		!systemUi && urgent ? hubStyles.sceneWindowUrgent : '',
	]
		.filter(Boolean)
		.join(' ');

	const encounterLabel = defeated
		? 'VICTORY'
		: failed
			? 'ESCAPED'
			: urgent
				? 'URGENT'
				: dungeonOpen
					? 'RAID OPEN'
					: 'FOE NEAR';

	return (
		<>
			{!systemUi && (
				<h3
					className={`${hubStyles.journeyHubTitle} ${urgent ? hubStyles.journeyHubTitleUrgent : ''}`}
				>
					{title}
				</h3>
			)}

			<div className={hubStyles.sceneGutter}>
				<div className={windowClass}>
					<img className={hubStyles.sceneBanner} src={bannerSrc} alt="" aria-hidden="true" />

					{urgent && daysLeft != null && (
						<div className={hubStyles.gateCountdown} role="status">
							<span className={hubStyles.gateCountdownLabel}>GATE CLOSES IN</span>
							<span className={hubStyles.gateCountdownValue}>
								{daysLeft <= 0 ? '<1' : daysLeft}D
							</span>
						</div>
					)}

					{mode === 'idle' && (
						<span className={hubStyles.sceneIdleBadge}>CHOOSE A FOE BELOW</span>
					)}

					{encounter && foe && run && (
						<>
							<span className={hubStyles.dayBadge}>
								DAY {dayIndex}/{foe.windowDays}
							</span>
							<span
								className={`${hubStyles.encounterBadge} ${urgent ? hubStyles.encounterBadgeUrgent : ''} ${dungeonOpen && !urgent ? hubStyles.encounterBadgeRaid : ''}`}
							>
								{encounterLabel}
							</span>

							<div className={hubStyles.foeMarker} aria-hidden="true">
								<span
									className={`${hubStyles.foeBounce} ${defeated ? hubStyles.foeDefeated : ''} ${failed ? hubStyles.foeEscaped : ''}`}
								>
									{foeSpriteUrl ? (
										<img className={hubStyles.foeSpriteImg} src={foeSpriteUrl} alt="" />
									) : (
										foe.emoji
									)}
								</span>
								<span className={hubStyles.foeShadow} />
							</div>

							<div className={hubStyles.sceneHpStrip}>
								<div className={hubStyles.sceneHpLabel}>
									<span>{foe.name.toUpperCase()}</span>
									<span>
										{run.currentHp}/{run.maxHp}
										{hpPercent != null ? ` (${hpPercent}%)` : ''}
									</span>
								</div>
								{systemUi ? (
									<span className={sys.sceneHpBarSystem} aria-hidden="true">
										<span
											className={sys.sceneHpBarFillSystem}
											style={{ width: `${hpPctFill}%` }}
										/>
									</span>
								) : (
									<div className={hubStyles.sceneHpSegs} aria-hidden="true">
										{Array.from({ length: HP_SEGMENT_COUNT }, (_, i) => (
											<span
												key={i}
												className={i < hpFilled ? hubStyles.sceneHpSegOn : undefined}
											/>
										))}
									</div>
								)}
							</div>
						</>
					)}
				</div>
			</div>
		</>
	);
};
