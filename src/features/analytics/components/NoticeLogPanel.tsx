import React, { useEffect, useState } from 'react';
import { Card } from '../../../shared/components/ui/Card';
import {
	clearTodaysNotices,
	getTodaysNotices,
	subscribeNoticeLog,
	type NoticeLogEntry,
	type NoticeLogKind,
} from '../../../shared/utils/noticeLog';
import styles from './NoticeLogPanel.module.css';

function formatTime(iso: string): string {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return '';
	return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function kindLabel(kind: NoticeLogKind): string {
	if (kind === 'system') return 'System';
	if (kind === 'game') return 'Game';
	return 'Field';
}

export const NoticeLogPanel: React.FC = () => {
	const [entries, setEntries] = useState<NoticeLogEntry[]>(() => getTodaysNotices());

	useEffect(() => {
		return subscribeNoticeLog(() => {
			setEntries(getTodaysNotices());
		});
	}, []);

	return (
		<div className={styles.panel} data-clay-shell>
			<div className={styles.header}>
				<div>
					<h3 className={styles.title}>Today’s notices</h3>
					<p className={styles.subtitle}>
						Toasts stay until you click them (Normal). This list keeps the same messages for the day.
					</p>
				</div>
				{entries.length > 0 && (
					<button type="button" className={styles.clearBtn} onClick={() => clearTodaysNotices()}>
						Clear today
					</button>
				)}
			</div>

			{entries.length === 0 ? (
				<Card className={styles.emptyCard}>
					<p className={styles.empty}>No notices yet today. Completing a quest will show up here.</p>
				</Card>
			) : (
				<ul className={styles.list}>
					{entries.map((entry) => (
						<li key={entry.id} className={styles.item}>
							<div className={styles.meta}>
								<span className={styles.time}>{formatTime(entry.at)}</span>
								<span className={styles.kind} data-kind={entry.kind}>
									{kindLabel(entry.kind)}
								</span>
							</div>
							<p className={styles.message}>{entry.text}</p>
						</li>
					))}
				</ul>
			)}
		</div>
	);
};
