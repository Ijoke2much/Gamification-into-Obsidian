import React, { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Quest } from '../../../features/quests/utils/taskParser';
import { normalizeQuestTimelineTheme } from '../../../features/quests/utils/taskParser';
import { MissionSectionTitle } from './MissionSectionTitle';
import styles from './MobileQuestDayPicker.module.css';

export interface MobileQuestDayPickerProps {
	quests: Quest[];
	selectedDate: Date;
	onSelectDate: (date: Date) => void;
	onQuestSelect?: (quest: Quest) => void;
	onQuestComplete?: (quest: Quest) => void;
	onAddQuest?: (date: Date) => void;
	onUseDayPlan?: (date: Date) => void;
}

type CalView = 'week' | 'month';

type DayCell = {
	date: Date;
	iso: string;
	label: string;
	dayNum: number;
	count: number;
	dotColors: string[];
	isToday: boolean;
	isSelected: boolean;
	inMonth: boolean;
};

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MAX_DOTS = 3;
const SWIPE_THRESHOLD_PX = 56;
const LONG_PRESS_MS = 420;

const DOT_BY_THEME: Record<string, string> = {
	violet: '#a78bfa',
	blue: '#60a5fa',
	pink: '#f472b6',
	amber: '#fbbf24',
	green: '#4ade80',
	red: '#f87171',
};

function toISODate(date: Date): string {
	const y = date.getFullYear();
	const m = `${date.getMonth() + 1}`.padStart(2, '0');
	const d = `${date.getDate()}`.padStart(2, '0');
	return `${y}-${m}-${d}`;
}

function startOfWeek(date: Date): Date {
	const d = new Date(date);
	d.setHours(0, 0, 0, 0);
	d.setDate(d.getDate() - d.getDay());
	return d;
}

function startOfMonth(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addDays(date: Date, n: number): Date {
	const d = new Date(date);
	d.setDate(d.getDate() + n);
	return d;
}

function formatTime(due?: string): string | null {
	if (!due || !due.includes('T')) return null;
	const part = due.split('T')[1]?.slice(0, 5);
	return part || null;
}

function displayTitle(quest: Quest): string {
	const t = (quest.title || '').trim().replace(/^-+\s*/, '').replace(/^\[[ xX]\]\s*/, '');
	return t || quest.id || 'Untitled quest';
}

function questDotColor(quest: Quest): string {
	const explicit = normalizeQuestTimelineTheme(quest.timelineTheme);
	if (explicit && DOT_BY_THEME[explicit]) return DOT_BY_THEME[explicit];

	const p = (quest.priority || '').toLowerCase();
	if (p === 'highest' || p === 'high') return DOT_BY_THEME.pink;
	if (p === 'low' || p === 'lowest') return DOT_BY_THEME.green;
	if (p === 'medium') return DOT_BY_THEME.blue;

	const d = (quest.difficulty || '').toLowerCase();
	if (d === 'epic' || d === 'hard') return DOT_BY_THEME.amber;
	if (d === 'easy') return DOT_BY_THEME.green;

	return DOT_BY_THEME.blue;
}

function buildDayCell(
	date: Date,
	questsByDay: Map<string, Quest[]>,
	todayISO: string,
	selectedISO: string,
	inMonth: boolean
): DayCell {
	const iso = toISODate(date);
	const list = questsByDay.get(iso) || [];
	return {
		date,
		iso,
		label: WEEKDAYS[date.getDay()],
		dayNum: date.getDate(),
		count: list.length,
		dotColors: list.slice(0, MAX_DOTS).map(questDotColor),
		isToday: iso === todayISO,
		isSelected: iso === selectedISO,
		inMonth,
	};
}

export const MobileQuestDayPicker: React.FC<MobileQuestDayPickerProps> = ({
	quests,
	selectedDate,
	onSelectDate,
	onQuestSelect,
	onQuestComplete,
	onAddQuest,
	onUseDayPlan,
}) => {
	const [view, setView] = useState<CalView>('week');
	const [sheetOpen, setSheetOpen] = useState(false);
	const [collapsed, setCollapsed] = useState(false);
	const [dragX, setDragX] = useState(0);
	const [dragging, setDragging] = useState(false);

	const pointerIdRef = useRef<number | null>(null);
	const startXRef = useRef(0);
	const startYRef = useRef(0);
	const axisLockRef = useRef<'x' | 'y' | null>(null);
	const longPressTimer = useRef<number | null>(null);
	const longPressFired = useRef(false);
	const ignoreClickRef = useRef(false);

	const todayISO = useMemo(() => toISODate(new Date()), []);
	const selectedISO = toISODate(selectedDate);
	const weekStart = useMemo(() => startOfWeek(selectedDate), [selectedDate]);
	const monthStart = useMemo(() => startOfMonth(selectedDate), [selectedDate]);

	const questsByDay = useMemo(() => {
		const map = new Map<string, Quest[]>();
		for (const quest of quests) {
			if (quest.completed) continue;
			const due = quest.due?.split('T')[0];
			if (!due) continue;
			const list = map.get(due) || [];
			list.push(quest);
			map.set(due, list);
		}
		for (const [, list] of map) {
			list.sort((a, b) => {
				const at = a.due?.includes('T') ? a.due : `${a.due || ''}T99:99`;
				const bt = b.due?.includes('T') ? b.due : `${b.due || ''}T99:99`;
				return at.localeCompare(bt);
			});
		}
		return map;
	}, [quests]);

	const dayQuests = questsByDay.get(selectedISO) || [];

	const weekPages = useMemo(() => {
		const offsets = [-7, 0, 7];
		return offsets.map((offset) => {
			const pageStart = addDays(weekStart, offset);
			const days = Array.from({ length: 7 }, (_, i) =>
				buildDayCell(addDays(pageStart, i), questsByDay, todayISO, selectedISO, true)
			);
			return { key: toISODate(pageStart), days };
		});
	}, [weekStart, questsByDay, todayISO, selectedISO]);

	const monthDays = useMemo(() => {
		const gridStart = startOfWeek(monthStart);
		return Array.from({ length: 42 }, (_, i) => {
			const date = addDays(gridStart, i);
			return buildDayCell(
				date,
				questsByDay,
				todayISO,
				selectedISO,
				date.getMonth() === monthStart.getMonth()
			);
		});
	}, [monthStart, questsByDay, todayISO, selectedISO]);

	const rangeLabel = useMemo(() => {
		if (view === 'month') {
			return selectedDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
		}
		const end = addDays(weekStart, 6);
		const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
		return `${weekStart.toLocaleDateString(undefined, opts)} – ${end.toLocaleDateString(undefined, opts)}`;
	}, [view, selectedDate, weekStart]);

	const selectedLabel = selectedDate.toLocaleDateString(undefined, {
		weekday: 'short',
		month: 'short',
		day: 'numeric',
	});

	const goToDayPlan = (date: Date) => {
		const d = new Date(date);
		d.setHours(0, 0, 0, 0);
		onSelectDate(d);
		onUseDayPlan?.(d);
	};

	const openDaySheet = (date: Date) => {
		const d = new Date(date);
		d.setHours(0, 0, 0, 0);
		onSelectDate(d);
		setSheetOpen(true);
	};

	const shift = (delta: number) => {
		const next =
			view === 'month'
				? new Date(selectedDate.getFullYear(), selectedDate.getMonth() + delta, 1)
				: addDays(selectedDate, delta * 7);
		next.setHours(0, 0, 0, 0);
		onSelectDate(next);
		setDragX(0);
	};

	const goToday = () => {
		const t = new Date();
		t.setHours(0, 0, 0, 0);
		goToDayPlan(t);
	};

	const clearLongPress = () => {
		if (longPressTimer.current != null) {
			window.clearTimeout(longPressTimer.current);
			longPressTimer.current = null;
		}
	};

	const onWeekPointerDown = (e: React.PointerEvent) => {
		if (e.button !== 0 && e.pointerType === 'mouse') return;
		// Day buttons own taps/long-press — capturing here steals click and makes days feel dead.
		const dayEl = (e.target as HTMLElement | null)?.closest?.('[data-week-day]');
		if (dayEl) return;
		pointerIdRef.current = e.pointerId;
		startXRef.current = e.clientX;
		startYRef.current = e.clientY;
		axisLockRef.current = null;
		longPressFired.current = false;
		ignoreClickRef.current = false;
		setDragging(true);
		(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
	};

	const onWeekPointerMove = (e: React.PointerEvent) => {
		if (pointerIdRef.current !== e.pointerId) return;
		const dx = e.clientX - startXRef.current;
		const dy = e.clientY - startYRef.current;

		if (!axisLockRef.current) {
			if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
			axisLockRef.current = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
			if (axisLockRef.current === 'x') clearLongPress();
		}

		if (axisLockRef.current === 'y') return;
		e.preventDefault();
		setDragX(dx);
		if (Math.abs(dx) > 12) {
			ignoreClickRef.current = true;
			clearLongPress();
		}
	};

	const onWeekPointerUp = (e: React.PointerEvent) => {
		if (pointerIdRef.current !== e.pointerId) return;
		const dx = dragX;
		pointerIdRef.current = null;
		setDragging(false);
		axisLockRef.current = null;

		if (Math.abs(dx) >= SWIPE_THRESHOLD_PX) {
			ignoreClickRef.current = true;
			shift(dx < 0 ? 1 : -1);
			return;
		}
		setDragX(0);
	};

	const onWeekPointerCancel = () => {
		pointerIdRef.current = null;
		setDragging(false);
		axisLockRef.current = null;
		setDragX(0);
		clearLongPress();
	};

	const selectDayFromPress = (day: DayCell) => {
		if (ignoreClickRef.current || longPressFired.current) return;
		goToDayPlan(day.date);
	};

	const renderDayButton = (day: DayCell) => (
		<button
			key={day.iso}
			type="button"
			role="listitem"
			data-week-day={day.iso}
			className={[
				styles.day,
				day.isSelected ? styles.daySelected : '',
				day.isToday ? styles.dayToday : '',
				!day.inMonth ? styles.dayOutside : '',
			]
				.filter(Boolean)
				.join(' ')}
			onPointerDown={(e) => {
				// Keep week swipe from capturing this pointer (see onWeekPointerDown).
				e.stopPropagation();
				try {
					e.currentTarget.setPointerCapture(e.pointerId);
				} catch {
					/* ignore */
				}
				longPressFired.current = false;
				ignoreClickRef.current = false;
				clearLongPress();
				longPressTimer.current = window.setTimeout(() => {
					longPressFired.current = true;
					ignoreClickRef.current = true;
					openDaySheet(day.date);
				}, LONG_PRESS_MS);
			}}
			onPointerUp={(e) => {
				e.stopPropagation();
				try {
					if (e.currentTarget.hasPointerCapture(e.pointerId)) {
						e.currentTarget.releasePointerCapture(e.pointerId);
					}
				} catch {
					/* ignore */
				}
				const wasLongPress = longPressFired.current;
				clearLongPress();
				// Quick press → open that day's plan (not just highlight the cell).
				if (!wasLongPress && !ignoreClickRef.current) {
					goToDayPlan(day.date);
					ignoreClickRef.current = true;
				}
				longPressFired.current = false;
			}}
			onClick={(e) => {
				// Keyboard / accessibility fallback when pointerup path didn't run.
				e.preventDefault();
				selectDayFromPress(day);
				ignoreClickRef.current = false;
			}}
			onPointerCancel={(e) => {
				e.stopPropagation();
				try {
					if (e.currentTarget.hasPointerCapture(e.pointerId)) {
						e.currentTarget.releasePointerCapture(e.pointerId);
					}
				} catch {
					/* ignore */
				}
				clearLongPress();
				longPressFired.current = false;
				ignoreClickRef.current = false;
			}}
			aria-pressed={day.isSelected}
			aria-label={`${day.date.toLocaleDateString(undefined, {
				weekday: 'long',
				month: 'short',
				day: 'numeric',
			})}${day.count ? `, ${day.count} quests` : ''}. Tap for day plan, long-press for list.`}
		>
			{view === 'week' && <span className={styles.weekday}>{day.label}</span>}
			<span className={styles.dayNumWrap}>
				<span className={styles.dayNum}>{day.dayNum}</span>
			</span>
			<span className={styles.dots} aria-hidden="true">
				{day.count === 0 ? (
					<span className={styles.dotEmpty} />
				) : (
					<>
						{day.dotColors.map((color, i) => (
							<span
								key={`${day.iso}-dot-${i}`}
								className={styles.dot}
								style={{ background: color }}
							/>
						))}
						{day.count > MAX_DOTS && (
							<span className={styles.dotMore}>+{day.count - MAX_DOTS}</span>
						)}
					</>
				)}
			</span>
		</button>
	);

	const trackStyle: React.CSSProperties = {
		transform: `translate3d(calc(-33.333% + ${dragX}px), 0, 0)`,
		transition: dragging ? 'none' : 'transform 0.22s ease-out',
	};

	return (
		<section className={styles.wrap} aria-label="Quest calendar">
			<div className={styles.header}>
				<button
					type="button"
					className={styles.collapseToggle}
					onClick={() => setCollapsed((v) => !v)}
					aria-expanded={!collapsed}
					title={collapsed ? 'Show calendar details' : 'Hide calendar details'}
				>
					<MissionSectionTitle
						title={view === 'month' ? 'Month' : 'Week'}
						icon="📅"
						className={styles.missionTitleInToggle}
					/>
					<span className={styles.range}>{rangeLabel}</span>
				</button>
				<div className={styles.nav}>
					<button
						type="button"
						className={styles.navBtn}
						onClick={() => shift(-1)}
						aria-label={view === 'month' ? 'Previous month' : 'Previous week'}
					>
						‹
					</button>
					<button type="button" className={styles.todayBtn} onClick={goToday}>
						Today
					</button>
					<button
						type="button"
						className={styles.navBtn}
						onClick={() => shift(1)}
						aria-label={view === 'month' ? 'Next month' : 'Next week'}
					>
						›
					</button>
				</div>
			</div>

			{/* Week day strip stays available for quick-press → day plan, even when details are collapsed. */}
			{view === 'week' && (
				<div
					className={styles.weekViewport}
					onPointerDown={onWeekPointerDown}
					onPointerMove={onWeekPointerMove}
					onPointerUp={onWeekPointerUp}
					onPointerCancel={onWeekPointerCancel}
				>
					<div className={styles.weekTrack} style={trackStyle}>
						{weekPages.map((page) => (
							<div key={page.key} className={styles.weekPage} role="list">
								{page.days.map((day) => renderDayButton(day))}
							</div>
						))}
					</div>
				</div>
			)}

			{!collapsed && (
				<>
					<div className={styles.viewToggle} role="tablist" aria-label="Calendar view">
						<button
							type="button"
							role="tab"
							aria-selected={view === 'week'}
							className={`${styles.viewBtn}${view === 'week' ? ` ${styles.viewBtnActive}` : ''}`}
							onClick={() => setView('week')}
						>
							Week
						</button>
						<button
							type="button"
							role="tab"
							aria-selected={view === 'month'}
							className={`${styles.viewBtn}${view === 'month' ? ` ${styles.viewBtnActive}` : ''}`}
							onClick={() => {
								setView('month');
								setCollapsed(false);
							}}
						>
							Month
						</button>
					</div>

					{view === 'month' && (
						<>
							<div className={styles.monthWeekdays} aria-hidden="true">
								{WEEKDAYS.map((d, i) => (
									<span key={`${d}-${i}`}>{d}</span>
								))}
							</div>
							<div className={styles.month} role="list">
								{monthDays.map((day) => renderDayButton(day))}
							</div>
						</>
					)}

					<div className={styles.selectedBar}>
						<span className={styles.selectedLabel}>{selectedLabel}</span>
						<span className={styles.selectedCount}>
							{dayQuests.length} quest{dayQuests.length === 1 ? '' : 's'}
						</span>
						<button
							type="button"
							className={styles.openDayBtn}
							onClick={() => setSheetOpen(true)}
						>
							Open day
						</button>
					</div>
				</>
			)}

			{sheetOpen &&
				createPortal(
					<div
						className={styles.sheetBackdrop}
						role="presentation"
						onClick={() => setSheetOpen(false)}
					>
						<div
							className={styles.sheetPanel}
							role="dialog"
							aria-modal="true"
							aria-label={`Quests for ${selectedLabel}`}
							onClick={(e) => e.stopPropagation()}
						>
							<div className={styles.sheetHeader}>
								<div className={styles.sheetTitleBlock}>
									<span className={styles.sheetEyebrow}>System: Day</span>
									<h4 className={styles.sheetTitle}>{selectedLabel}</h4>
								</div>
								<button
									type="button"
									className={styles.sheetClose}
									onClick={() => setSheetOpen(false)}
									aria-label="Close day calendar"
								>
									✕
								</button>
							</div>

							<div className={styles.sheetBody}>
								{dayQuests.length === 0 ? (
									<p className={styles.empty}>No quests due this day.</p>
								) : (
									<ul className={styles.questList}>
										{dayQuests.map((quest) => {
											const time = formatTime(quest.due);
											return (
												<li key={quest.id} className={styles.questRow}>
													<button
														type="button"
														className={styles.questMain}
														onClick={() => {
															setSheetOpen(false);
															onQuestSelect?.(quest);
														}}
													>
														<span className={styles.questTime}>
															{time || 'All day'}
														</span>
														<span className={styles.questName}>
															{displayTitle(quest)}
														</span>
													</button>
													{onQuestComplete && (
														<button
															type="button"
															className={styles.questDone}
															onClick={() => {
																onQuestComplete(quest);
															}}
															aria-label={`Complete ${displayTitle(quest)}`}
														>
															Done
														</button>
													)}
												</li>
											);
										})}
									</ul>
								)}
							</div>

							<div className={styles.sheetActions}>
								{onUseDayPlan && (
									<button
										type="button"
										className={styles.actionPrimary}
										onClick={() => {
											onUseDayPlan(selectedDate);
											setSheetOpen(false);
										}}
									>
										Use day plan
									</button>
								)}
								{onAddQuest && (
									<button
										type="button"
										className={styles.actionSecondary}
										onClick={() => {
											onAddQuest(selectedDate);
											setSheetOpen(false);
										}}
									>
										+ Add quest
									</button>
								)}
							</div>
						</div>
					</div>,
					document.body
				)}
		</section>
	);
};
