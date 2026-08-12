import React, { useMemo } from 'react';
import type { Quest } from '../../../features/quests/utils/taskParser';
import styles from './CaptureInboxPanel.module.css';

const PAGE_SIZE = 10;
const HIDDEN_TAGS = new Set(['gamified-task', 'capture']);

function getCategoryLabel(quest: Quest): string | null {
	const tag = (quest.tags ?? []).find((t) => !HIDDEN_TAGS.has(t));
	return tag ? `#${tag}` : null;
}

interface CaptureInboxPanelProps {
	captures: Quest[];
	tagPresets: string[];
	activeTag: string;
	onTagChange: (tag: string) => void;
	collapsed: boolean;
	onToggleCollapse: () => void;
	onPromote: (quest: Quest) => void;
	onAddToTodayInbox: (quest: Quest) => void;
	onDismiss: (quest: Quest) => void;
	onOpenCaptureFile: () => void;
	showAll: boolean;
	onToggleShowAll: () => void;
	/** Mobile compact strip — no tag filters, bigger hit targets */
	lite?: boolean;
}

export const CaptureInboxPanel: React.FC<CaptureInboxPanelProps> = ({
	captures,
	tagPresets,
	activeTag,
	onTagChange,
	collapsed,
	onToggleCollapse,
	onPromote,
	onAddToTodayInbox,
	onDismiss,
	onOpenCaptureFile,
	showAll,
	onToggleShowAll,
	lite = false,
}) => {
	const filtered = useMemo(() => {
		if (lite || activeTag === 'all') return captures;
		return captures.filter((quest) => (quest.tags ?? []).includes(activeTag));
	}, [captures, activeTag, lite]);

	const visible = showAll ? filtered : filtered.slice(0, PAGE_SIZE);
	const hiddenCount = Math.max(0, filtered.length - PAGE_SIZE);

	const filterTags = useMemo(() => {
		const fromCaptures = new Set<string>();
		for (const quest of captures) {
			for (const tag of quest.tags ?? []) {
				if (!HIDDEN_TAGS.has(tag)) fromCaptures.add(tag);
			}
		}
		const merged = new Set([...tagPresets, ...fromCaptures]);
		return Array.from(merged).sort();
	}, [captures, tagPresets]);

	return (
		<section className={`${styles.section} ${lite ? styles.sectionLite : ''}`}>
			<div className={styles.header}>
				<div className={styles.title}>
					{lite ? 'Brain dumps' : 'Capture Inbox'}{' '}
					<span className={styles.count}>({captures.length})</span>
				</div>
				<button
					type="button"
					className={styles.collapseBtn}
					onClick={onToggleCollapse}
					title={collapsed ? 'Expand capture inbox' : 'Collapse capture inbox'}
					aria-expanded={!collapsed}
				>
					{collapsed ? '▸' : '▾'}
				</button>
			</div>

			{!collapsed && (
				<>
					{!lite && (
					<div className={styles.tagRow}>
						<button
							type="button"
							className={`${styles.tagChip} ${activeTag === 'all' ? styles.tagChipActive : ''}`}
							onClick={() => onTagChange('all')}
						>
							All
						</button>
						{filterTags.map((tag) => (
							<button
								key={tag}
								type="button"
								className={`${styles.tagChip} ${activeTag === tag ? styles.tagChipActive : ''}`}
								onClick={() => onTagChange(tag)}
							>
								#{tag}
							</button>
						))}
					</div>
					)}

					{filtered.length === 0 ? (
						<div className={styles.empty}>
							{captures.length === 0
								? lite
									? 'No dumps yet — tap Brain Dump above.'
									: 'No captures yet — use Brain Dump to add ideas.'
								: 'No captures match this tag.'}
						</div>
					) : (
						<div className={styles.list}>
							{visible.map((quest) => {
								const category = getCategoryLabel(quest);
								return (
									<div key={quest.id} className={`${styles.row} ${lite ? styles.rowLite : ''}`}>
										<div className={styles.rowMain}>
											<div className={styles.rowTitle} title={quest.title}>
												{quest.title}
											</div>
											{quest.description && (
												<div className={styles.rowDescription} title={String(quest.description)}>
													💭 {String(quest.description)}
												</div>
											)}
										</div>
										{!lite && category && (
											<span className={styles.categoryBadge}>{category}</span>
										)}
										<div className={`${styles.rowActions} ${lite ? styles.rowActionsLite : ''}`}>
											<button
												type="button"
												className={`${styles.actionBtn} ${styles.todayBtn} ${lite ? styles.actionBtnLite : ''}`}
												title="Add to today's inbox"
												onClick={() => onAddToTodayInbox(quest)}
											>
												{lite ? '→ Today' : "Add today's inbox"}
											</button>
											<button
												type="button"
												className={`${styles.actionBtn} ${styles.promoteBtn} ${lite ? styles.actionBtnLite : ''}`}
												title="Promote to full quest"
												onClick={() => onPromote(quest)}
											>
												{lite ? 'Edit' : 'Promote'}
											</button>
											<button
												type="button"
												className={`${styles.actionBtn} ${styles.dismissBtn} ${lite ? styles.actionBtnLite : ''}`}
												title="Dismiss capture"
												onClick={() => onDismiss(quest)}
												aria-label="Dismiss capture"
											>
												✕
											</button>
										</div>
									</div>
								);
							})}
						</div>
					)}

					<div className={styles.footer}>
						{!showAll && hiddenCount > 0 && (
							<button type="button" className={styles.footerBtn} onClick={onToggleShowAll}>
								Show {hiddenCount} more
							</button>
						)}
						{showAll && filtered.length > PAGE_SIZE && (
							<button type="button" className={styles.footerBtn} onClick={onToggleShowAll}>
								Show less
							</button>
						)}
						{!lite && (
						<button type="button" className={styles.footerBtn} onClick={onOpenCaptureFile}>
							Open Capture.md
						</button>
						)}
					</div>
				</>
			)}
		</section>
	);
};
