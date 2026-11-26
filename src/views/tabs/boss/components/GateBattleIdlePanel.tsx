import React, { useCallback, useEffect, useState } from 'react';
import type GamifiedObsidianPlugin from '../../../../core/main';
import {
	BOSS_UPDATED_EVENT,
	getBossHpPercent,
	readBoss,
	type BossFileData,
} from '../../../../features/quests/utils/bossFile';
import {
	BOSS_RAID_UPDATED_EVENT,
	getActiveBossFileRaid,
	type ActiveBossFileRaid,
} from '../../../../features/quests/utils/bossRaidService';
import hubStyles from '../BossHubPixel.module.css';

interface GateBattleIdlePanelProps {
	plugin: GamifiedObsidianPlugin;
}

export const GateBattleIdlePanel: React.FC<GateBattleIdlePanelProps> = ({ plugin }) => {
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

	const openDungeon = () => void plugin.focusQuestHubSection('dungeon');

	const resumeRaid = async () => {
		if (!raid || busy) return;
		setBusy(true);
		try {
			await plugin.openBossRaid(raid.bossFilePath, {
				lockDungeon: raid.lockDungeon,
				resumeClaim: raid.pendingVictoryClaim,
			});
		} finally {
			setBusy(false);
		}
	};

	const showClaim = !!raid?.pendingVictoryClaim && boss;
	const showResume =
		!!raid &&
		!!boss &&
		!showClaim &&
		!raid.defeated &&
		boss.status === 'active' &&
		boss.currentHp > 0;

	const strikesDone = boss?.tasks.filter((t) => t.completed).length ?? 0;

	return (
		<div className={hubStyles.idlePanel}>
			<div className={hubStyles.idleHero}>
				<div className={hubStyles.idleIcon} aria-hidden="true">
					🚪
				</div>
				<h2 className={hubStyles.idleTitle}>Raid chamber</h2>
				<p className={hubStyles.idleLead}>
					File-backed gate raids are launched from the Quest sidebar <strong>Dungeon</strong> tab.
					Clear Journey foes, pick a boss, then enter the gate to fight here.
				</p>
			</div>

			{(showClaim || showResume) && boss && (
				<div className={hubStyles.idleRaidCard} role="status">
					<span className={hubStyles.idleRaidTag}>
						{showClaim ? 'VICTORY PENDING' : 'RAID IN PROGRESS'}
					</span>
					<strong className={hubStyles.idleRaidName}>
						{boss.emoji} {boss.name}
					</strong>
					<p className={hubStyles.idleRaidMeta}>
						{showClaim
							? 'Spoils are waiting — claim them to seal the dungeon for this cycle.'
							: `HP ${getBossHpPercent(boss)}% · Strikes ${strikesDone}/${boss.requiredTasks}${
									raid!.questsApplied > 0
										? ` · ${raid!.questsApplied} vault hit${raid!.questsApplied === 1 ? '' : 's'}`
										: ''
								}`}
					</p>
					<button
						type="button"
						className={hubStyles.idlePrimaryBtn}
						disabled={busy}
						onClick={() => void resumeRaid()}
					>
						{busy ? 'Opening…' : showClaim ? 'Claim gate spoils' : 'Return to battle'}
					</button>
				</div>
			)}

			<ol className={hubStyles.idleSteps}>
				<li>
					Quest sidebar → <strong>Journey</strong> — defeat enough foes to unlock the gate
				</li>
				<li>
					Switch to <strong>Dungeon</strong> — pick a boss from the gate roster
				</li>
				<li>
					<strong>Enter gate</strong> — fight with strikes, moves, and vault quest hits
				</li>
			</ol>

			<div className={hubStyles.idleActions}>
				<button type="button" className={hubStyles.idlePrimaryBtn} onClick={openDungeon}>
					Open dungeon sidebar
				</button>
				<button
					type="button"
					className={hubStyles.idleSecondaryBtn}
					onClick={() => void plugin.openCreateBossModal()}
				>
					Forge a boss
				</button>
			</div>
		</div>
	);
};
