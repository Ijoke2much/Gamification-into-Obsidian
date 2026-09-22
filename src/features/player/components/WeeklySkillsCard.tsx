import React, { useEffect, useState } from 'react';
import type { Vault } from 'obsidian';
import {
	loadSkillCpLog,
	SKILL_CP_LOGGED_EVENT,
	summarizeSkillCpThisWeek,
	type WeeklySkillCpRow,
} from '../../skillTree/utils/skillCpLog';
import { gateTrainingBanner } from '../../skillTree/utils/activeGateTraining';
import { BOSS_RAID_UPDATED_EVENT } from '../../quests/utils/bossRaidService';
import { JOURNEY_UPDATED_EVENT } from '../../quests/utils/journeyRunService';
import styles from './WeeklySkillsCard.module.css';

export interface WeeklySkillsCardProps {
	vault: Vault;
	collapsed?: boolean;
}

export const WeeklySkillsCard: React.FC<WeeklySkillsCardProps> = ({
	vault,
	collapsed = false,
}) => {
	const [rows, setRows] = useState<WeeklySkillCpRow[]>([]);
	const [gateBanner, setGateBanner] = useState<string | null>(null);
	const [expanded, setExpanded] = useState(!collapsed);

	useEffect(() => {
		let cancelled = false;
		const refresh = () => {
			void loadSkillCpLog(vault)
				.then((entries) => {
					if (!cancelled) setRows(summarizeSkillCpThisWeek(entries));
				})
				.catch(() => {
					if (!cancelled) setRows([]);
				});
			setGateBanner(gateTrainingBanner());
		};
		refresh();
		document.addEventListener(SKILL_CP_LOGGED_EVENT, refresh);
		document.addEventListener('stats-updated', refresh);
		window.addEventListener(BOSS_RAID_UPDATED_EVENT, refresh);
		window.addEventListener(JOURNEY_UPDATED_EVENT, refresh);
		return () => {
			cancelled = true;
			document.removeEventListener(SKILL_CP_LOGGED_EVENT, refresh);
			document.removeEventListener('stats-updated', refresh);
			window.removeEventListener(BOSS_RAID_UPDATED_EVENT, refresh);
			window.removeEventListener(JOURNEY_UPDATED_EVENT, refresh);
		};
	}, [vault]);

	return (
		<section className={styles.card} data-clay-shell="week-skills">
			<button
				type="button"
				className={styles.header}
				onClick={collapsed ? () => setExpanded((v) => !v) : undefined}
				aria-expanded={expanded}
			>
				<span className={styles.title}>Skills this week</span>
				<span className={styles.count}>{rows.length}</span>
			</button>
			{expanded ? (
				<div className={styles.body}>
					{gateBanner ? <p className={styles.gateBanner}>{gateBanner}</p> : null}
					{rows.length === 0 ? (
						<p className={styles.empty}>
							Complete quests tagged with a skill to train it this week.
						</p>
					) : (
						<ul className={styles.list}>
							{rows.slice(0, 8).map((row) => (
								<li key={row.skillName} className={styles.row}>
									<span className={styles.name}>
										{row.skillName}
										{row.fromGate ? (
											<span className={styles.gateChip}>Gate</span>
										) : null}
									</span>
									<span className={styles.cp}>+{row.cp} CP</span>
								</li>
							))}
						</ul>
					)}
				</div>
			) : null}
		</section>
	);
};
