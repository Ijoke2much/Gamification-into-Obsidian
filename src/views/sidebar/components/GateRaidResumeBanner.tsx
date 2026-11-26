import React, { useCallback, useEffect, useState } from 'react';
import type GamifiedObsidianPlugin from '../../../core/main';
import {
	BOSS_UPDATED_EVENT,
	getBossHpPercent,
	readBoss,
	type BossFileData,
} from '../../../features/quests/utils/bossFile';
import {
	BOSS_RAID_UPDATED_EVENT,
	describeBossRaidAffinity,
	getActiveBossFileRaid,
	type ActiveBossFileRaid,
} from '../../../features/quests/utils/bossRaidService';
import hubStyles from './QuestHubPanels.module.css';

interface GateRaidResumeBannerProps {
	plugin: GamifiedObsidianPlugin;
}

export const GateRaidResumeBanner: React.FC<GateRaidResumeBannerProps> = ({ plugin }) => {
	const [raid, setRaid] = useState<ActiveBossFileRaid | null>(() => getActiveBossFileRaid());
	const [boss, setBoss] = useState<BossFileData | null>(null);
	const [busy, setBusy] = useState(false);

	const sync = useCallback(async () => {
		const active = getActiveBossFileRaid();
		setRaid(active);
		if (!active) {
			setBoss(null);
			return;
		}
		setBoss(await readBoss(plugin.app, active.bossFilePath));
	}, [plugin.app]);

	useEffect(() => {
		void sync();
		const handler = () => void sync();
		window.addEventListener(BOSS_RAID_UPDATED_EVENT, handler);
		window.addEventListener(BOSS_UPDATED_EVENT, handler);
		return () => {
			window.removeEventListener(BOSS_RAID_UPDATED_EVENT, handler);
			window.removeEventListener(BOSS_UPDATED_EVENT, handler);
		};
	}, [sync]);

	if (!raid || !boss) return null;

	const strikesDone = boss.tasks.filter((t) => t.completed).length;
	const hpPct = getBossHpPercent(boss);
	const showClaim = raid.pendingVictoryClaim;
	const showResume =
		!showClaim && !raid.defeated && boss.status === 'active' && boss.currentHp > 0;

	if (!showClaim && !showResume) return null;

	const handlePrimary = async () => {
		if (busy) return;
		setBusy(true);
		try {
			await plugin.openBossRaid(raid.bossFilePath, {
				lockDungeon: raid.lockDungeon,
				resumeClaim: showClaim,
			});
		} finally {
			setBusy(false);
		}
	};

	const label = busy ? 'Opening…' : showClaim ? 'Claim gate spoils' : 'Return to battle';
	const tag = showClaim ? 'VICTORY PENDING' : 'RAID IN PROGRESS';
	const affinityLabel = describeBossRaidAffinity(raid);
	const meta = showClaim
		? 'Gate broken — claim your spoils in the battle workspace.'
		: `HP ${hpPct}% · Strikes ${strikesDone}/${boss.requiredTasks}${
				raid.questsApplied > 0
					? ` · ${raid.questsApplied} vault hit${raid.questsApplied === 1 ? '' : 's'}`
					: ''
			}`;

	return (
		<div className={hubStyles.gateRaidBanner} role="status" aria-live="polite">
			<div className={hubStyles.gateRaidBannerHead}>
				<span className={hubStyles.gateRaidBannerTag}>{tag}</span>
				<strong className={hubStyles.gateRaidBannerTitle}>
					{boss.emoji} {boss.name}
				</strong>
			</div>
			<p className={hubStyles.gateRaidBannerMeta}>{meta}</p>
			{affinityLabel && (
				<p className={hubStyles.gateRaidBannerMeta}>{affinityLabel}</p>
			)}
			<button
				type="button"
				className={hubStyles.gateRaidBannerBtn}
				disabled={busy}
				onClick={() => void handlePrimary()}
			>
				{label}
			</button>
		</div>
	);
};
