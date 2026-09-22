import React, { forwardRef, useImperativeHandle, useMemo, useRef, useState } from "react";
import type { Quest } from "../../../features/quests/utils/taskParser";
import { getQuestEnergyCost } from "../../../shared/utils/questCompletionPipeline";
import {
	parseQuestScheduleDragId,
	QUEST_SCHEDULE_DRAG_MIME,
} from "../../../features/quests/utils/questDateRange";
import styles from "./MobileDayAgenda.module.css";

export type AgendaThemeKey = "violet" | "blue" | "pink" | "amber" | "green" | "red";

export interface MobileAgendaBlock {
	quest: Quest;
	start: Date;
	end: Date;
	title: string;
	themeKey: AgendaThemeKey;
	mode: "scheduled" | "floating" | "suggested";
	clampedStart: number;
	clampedEnd: number;
}

export interface MobileDayAgendaHandle {
	scrollToNow: (behavior?: ScrollBehavior) => void;
}

interface MobileDayAgendaProps {
	blocks: MobileAgendaBlock[];
	currentTime: Date;
	isToday: boolean;
	plannerStartHour: number;
	plannerEndHour: number;
	onOpenQuest: (quest: Quest) => void;
	onCompleteQuest: (quest: Quest) => void;
	onOpenActions: (quest: Quest) => void;
	onAddAtMinutes: (minutesFromMidnight: number) => void;
	scheduleDragEnabled?: boolean;
	onDropQuestAtMinutes?: (quest: Quest, minutesFromMidnight: number) => void;
	/** Drop on the plan canvas or a large free hole — parent should open a time sheet. */
	onDropQuestAskTime?: (quest: Quest, suggestedMinutes: number) => void;
	/** Inbox + board quests so a drop can land a card that is not already on this day. */
	droppableQuests?: Quest[];
}

type AgendaRow =
	| { kind: "quest"; key: string; block: MobileAgendaBlock }
	| { kind: "gap"; key: string; startMin: number; endMin: number }
	| { kind: "now"; key: string; minutes: number };

/** Only surface free-time rows for meaningful holes (keeps the list calm). */
const MIN_GAP_MINUTES = 45;
/** Midpoint of a hole this large is a weak default — ask for a clock time. */
const ASK_TIME_GAP_MINUTES = 120;
const LONG_PRESS_MS = 420;

export const MobileDayAgenda = forwardRef<MobileDayAgendaHandle, MobileDayAgendaProps>(
	function MobileDayAgenda(
		{
			blocks,
			currentTime,
			isToday,
			plannerStartHour,
			plannerEndHour,
			onOpenQuest,
			onCompleteQuest,
			onOpenActions,
			onAddAtMinutes,
			scheduleDragEnabled = false,
			onDropQuestAtMinutes,
			onDropQuestAskTime,
			droppableQuests = [],
		},
		ref
	) {
		const rootRef = useRef<HTMLDivElement | null>(null);
		const nowRef = useRef<HTMLDivElement | null>(null);
		const longPressTimer = useRef<number | null>(null);
		const longPressFired = useRef(false);
		const [canvasDropHover, setCanvasDropHover] = useState(false);

		const sorted = useMemo(
			() =>
				[...blocks]
					// Timed + flexible (floating) + suggested — same set as the old hour-grid planner
					.filter((b) => b.mode === "scheduled" || b.mode === "floating" || b.mode === "suggested")
					.sort((a, b) => a.clampedStart - b.clampedStart || a.clampedEnd - b.clampedEnd),
			[blocks]
		);

		const rows = useMemo(() => {
			const plannerStart = plannerStartHour * 60;
			const plannerEnd = plannerEndHour * 60;
			const nowMin = currentTime.getHours() * 60 + currentTime.getMinutes();
			const out: AgendaRow[] = [];
			let cursor = plannerStart;
			let nowInserted = false;
			let sawQuest = false;

			const maybeInsertNow = (beforeMin: number) => {
				if (!isToday || nowInserted) return;
				if (nowMin < plannerStart || nowMin > plannerEnd) return;
				if (nowMin <= beforeMin && nowMin >= cursor) {
					out.push({ kind: "now", key: "now", minutes: nowMin });
					nowInserted = true;
				}
			};

			const pushFutureGap = (startMin: number, endMin: number) => {
				const minutes = endMin - startMin;
				if (minutes < MIN_GAP_MINUTES) return;
				// Skip past holes entirely — they clutter the list.
				if (isToday && endMin <= nowMin) return;
				// Clip leading edge of a gap that straddles "now".
				const gapStart = isToday && startMin < nowMin ? nowMin : startMin;
				if (endMin - gapStart < MIN_GAP_MINUTES) return;
				out.push({
					kind: "gap",
					key: `gap-${gapStart}-${endMin}`,
					startMin: gapStart,
					endMin,
				});
			};

			for (const block of sorted) {
				const start = Math.max(plannerStart, block.clampedStart);
				const end = Math.max(start + 1, Math.min(plannerEnd, block.clampedEnd));

				maybeInsertNow(start);
				// Only insert free slots *between* timed quests (skip empty morning lead-in).
				if (sawQuest) {
					pushFutureGap(cursor, start);
				}

				out.push({
					kind: "quest",
					key: `quest-${block.quest.id}-${start}`,
					block,
				});
				sawQuest = true;
				cursor = Math.max(cursor, end);
			}

			if (sawQuest) {
				maybeInsertNow(plannerEnd);
				pushFutureGap(cursor, plannerEnd);
			}

			if (!nowInserted && isToday && nowMin >= plannerStart && nowMin <= plannerEnd) {
				out.push({ kind: "now", key: "now", minutes: nowMin });
			}

			return out;
		}, [sorted, plannerStartHour, plannerEndHour, currentTime, isToday]);

		useImperativeHandle(ref, () => ({
			scrollToNow: (behavior: ScrollBehavior = "smooth") => {
				const target = nowRef.current ?? rootRef.current;
				target?.scrollIntoView({ behavior, block: "center" });
			},
		}));

		const clearLongPress = () => {
			if (longPressTimer.current != null) {
				window.clearTimeout(longPressTimer.current);
				longPressTimer.current = null;
			}
		};

		const bindLongPress = (quest: Quest) => ({
			onPointerDown: () => {
				longPressFired.current = false;
				clearLongPress();
				longPressTimer.current = window.setTimeout(() => {
					longPressFired.current = true;
					onOpenActions(quest);
				}, LONG_PRESS_MS);
			},
			onPointerUp: clearLongPress,
			onPointerLeave: clearLongPress,
			onPointerCancel: clearLongPress,
		});

		const findQuestFromDrag = (e: React.DragEvent): Quest | null => {
			const id = parseQuestScheduleDragId(e.dataTransfer);
			if (!id) return null;
			return (
				blocks.find((b) => b.quest.id === id)?.quest ??
				droppableQuests.find((q) => q.id === id || q.title === id) ??
				null
			);
		};

		const defaultAskMinutes = () => {
			if (isToday) {
				const nowMin = currentTime.getHours() * 60 + currentTime.getMinutes();
				return Math.max(plannerStartHour * 60, Math.min(plannerEndHour * 60, nowMin));
			}
			return Math.max(plannerStartHour * 60, 9 * 60);
		};

		const bindDropAt = (minutes: number) => {
			if (!scheduleDragEnabled || !onDropQuestAtMinutes) return {};
			return {
				onDragOver: (e: React.DragEvent) => {
					e.preventDefault();
					e.stopPropagation();
					e.dataTransfer.dropEffect = "move";
				},
				onDrop: (e: React.DragEvent) => {
					e.preventDefault();
					e.stopPropagation();
					setCanvasDropHover(false);
					const quest = findQuestFromDrag(e);
					if (quest) onDropQuestAtMinutes(quest, minutes);
				},
			};
		};

		const bindAskTime = (suggestedMinutes: number) => {
			if (!scheduleDragEnabled || !onDropQuestAskTime) return {};
			return {
				onDragOver: (e: React.DragEvent) => {
					e.preventDefault();
					e.stopPropagation();
					e.dataTransfer.dropEffect = "move";
				},
				onDrop: (e: React.DragEvent) => {
					e.preventDefault();
					e.stopPropagation();
					setCanvasDropHover(false);
					const quest = findQuestFromDrag(e);
					if (quest) onDropQuestAskTime(quest, suggestedMinutes);
				},
			};
		};

		const bindCanvasAsk = () => {
			if (!scheduleDragEnabled || !onDropQuestAskTime) return {};
			return {
				onDragOver: (e: React.DragEvent) => {
					e.preventDefault();
					e.dataTransfer.dropEffect = "move";
					setCanvasDropHover(true);
				},
				onDragLeave: (e: React.DragEvent) => {
					if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
						setCanvasDropHover(false);
					}
				},
				onDrop: (e: React.DragEvent) => {
					e.preventDefault();
					e.stopPropagation();
					setCanvasDropHover(false);
					const quest = findQuestFromDrag(e);
					if (quest) onDropQuestAskTime(quest, defaultAskMinutes());
				},
			};
		};

		if (sorted.length === 0) {
			return (
				<div
					className={`${styles.agenda}${canvasDropHover ? ` ${styles.agendaDropHover}` : ""}`}
					ref={rootRef}
					data-mobile-day-agenda
					aria-label="Day plan agenda"
					{...bindCanvasAsk()}
				>
					<div className={styles.empty}>
						<span>No quests planned for this day</span>
						<p className={styles.emptyHint}>
							Drop a quest here to pick a time, or add a timed quest.
						</p>
						<button
							type="button"
							className={styles.emptyAdd}
							onClick={() => onAddAtMinutes(Math.max(plannerStartHour * 60, 9 * 60))}
						>
							+ Add timed quest
						</button>
					</div>
				</div>
			);
		}

		return (
			<div
				className={`${styles.agenda}${canvasDropHover ? ` ${styles.agendaDropHover}` : ""}`}
				ref={rootRef}
				data-mobile-day-agenda
				aria-label="Day plan agenda"
				{...bindCanvasAsk()}
			>
				{canvasDropHover && (
					<div className={styles.canvasDropHint}>Drop to pick a time</div>
				)}
				{rows.map((row, index) => {
					const isLast = index === rows.length - 1;

					if (row.kind === "now") {
						return (
							<div
								key={row.key}
								ref={nowRef}
								className={styles.nowRow}
								aria-label="Current time"
								{...bindDropAt(row.minutes)}
							>
								<div className={`${styles.timeCol} ${styles.timeColNow}`}>
									{formatAgendaClock(row.minutes)}
								</div>
								<div className={styles.railCol}>
									<span className={styles.railLine} />
									<span className={styles.railDot} />
								</div>
								<div className={styles.nowBody}>
									<div className={styles.nowLine}>
										<span className={styles.nowTag}>Now</span>
									</div>
								</div>
							</div>
						);
					}

					if (row.kind === "gap") {
						const minutes = row.endMin - row.startMin;
						const mid = Math.floor((row.startMin + row.endMin) / 2);
						const gapDrop =
							minutes >= ASK_TIME_GAP_MINUTES
								? bindAskTime(mid)
								: bindDropAt(mid);
						return (
							<div
								key={row.key}
								className={`${styles.row} ${styles.gapRow}`}
								{...gapDrop}
							>
								<div className={styles.timeCol} aria-hidden="true" />
								<div className={styles.railCol}>
									<span className={`${styles.railLine} ${styles.railLineDashed}`} />
								</div>
								<div className={styles.body}>
									<div className={styles.gapBody}>
										<span className={styles.gapLabel}>
											{formatGapDuration(minutes)} free
										</span>
										<button
											type="button"
											className={styles.gapAdd}
											data-agenda-add
											onClick={() => onAddAtMinutes(mid)}
										>
											<span aria-hidden="true">+</span> Add quest
										</button>
									</div>
								</div>
							</div>
						);
					}

					const { block } = row;
					const themeClass = themeClassFor(block.themeKey, styles);
					const energy = getQuestEnergyCost(block.quest);
					const durationLabel = formatAgendaDuration(block.start, block.end);
					const timeLabel = `${formatAgendaTime(block.start)} – ${formatAgendaTime(block.end)} (${durationLabel})`;
					const longPress = bindLongPress(block.quest);
					const modeLabel =
						block.mode === "floating"
							? "Flexible"
							: block.mode === "suggested"
								? "Suggested"
								: null;
					const isFlexible = block.mode === "floating" || block.mode === "suggested";

					return (
						<div
							key={row.key}
							className={`${styles.row} ${styles.questRow} ${themeClass}${isFlexible ? ` ${styles.questRowFlexible}` : ""}`}
							draggable={scheduleDragEnabled}
							onDragStart={
								scheduleDragEnabled
									? (e) => {
											e.dataTransfer.setData(
												QUEST_SCHEDULE_DRAG_MIME,
												JSON.stringify({ id: block.quest.id })
											);
											e.dataTransfer.setData("text/plain", block.quest.id || block.title);
											e.dataTransfer.effectAllowed = "move";
									  }
									: undefined
							}
						>
							<div className={styles.timeCol}>{formatAgendaTime(block.start, true)}</div>
							<div className={styles.railCol}>
								{!isLast && <span className={styles.railLine} />}
								{isLast && <span className={`${styles.railLine} ${styles.railLineEnd}`} />}
								<span className={styles.railIcon} aria-hidden="true">
									{iconForTheme(block.themeKey)}
								</span>
							</div>
							<div className={styles.body}>
								<div className={`${styles.cardShell}${isFlexible ? ` ${styles.cardShellFlexible}` : ""}`}>
									<div
										role="button"
										tabIndex={0}
										className={styles.card}
										onClick={() => {
											if (longPressFired.current) {
												longPressFired.current = false;
												return;
											}
											onOpenQuest(block.quest);
										}}
										onKeyDown={(e) => {
											if (e.key === "Enter" || e.key === " ") {
												e.preventDefault();
												onOpenQuest(block.quest);
											}
										}}
										{...longPress}
									>
										<div className={styles.cardMain}>
											<div className={styles.title}>{block.title}</div>
											<div className={styles.meta}>
												<span>{timeLabel}</span>
												{modeLabel && (
													<span className={styles.modeChip} title={`${modeLabel} block`}>
														{modeLabel}
													</span>
												)}
												<span className={styles.energyChip} title="Energy cost">
													<span aria-hidden="true">🔥</span>
													{energy}
												</span>
											</div>
										</div>
									</div>
									<button
										type="button"
										className={styles.menuBtn}
										data-agenda-menu
										aria-label={`Actions for ${block.title}`}
										title="Actions"
										onClick={(e) => {
											e.stopPropagation();
											onOpenActions(block.quest);
										}}
									>
										⋯
									</button>
									<button
										type="button"
										className={styles.checkBtn}
										data-agenda-check
										aria-label={`Complete ${block.title}`}
										title="Mark complete"
										onClick={() => onCompleteQuest(block.quest)}
									/>
								</div>
							</div>
						</div>
					);
				})}
			</div>
		);
	}
);

function formatAgendaTime(date: Date, compact = false): string {
	const h = date.getHours();
	const m = date.getMinutes();
	if (compact && m === 0) return String(h);
	return `${h}:${String(m).padStart(2, "0")}`;
}

function formatAgendaClock(minutes: number): string {
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	return `${h}:${String(m).padStart(2, "0")}`;
}

function formatAgendaDuration(start: Date, end: Date): string {
	const total = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
	const hours = Math.floor(total / 60);
	const minutes = total % 60;
	if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
	if (hours > 0) return `${hours}h`;
	return `${minutes}m`;
}

function formatGapDuration(minutes: number): string {
	const hours = Math.floor(minutes / 60);
	const m = minutes % 60;
	if (hours > 0 && m > 0) return `${hours}h ${m}m`;
	if (hours > 0) return `${hours}h`;
	return `${m}m`;
}

function iconForTheme(theme: AgendaThemeKey): string {
	switch (theme) {
		case "violet":
			return "⚔";
		case "blue":
			return "◈";
		case "pink":
			return "◆";
		case "amber":
			return "▣";
		case "green":
			return "◎";
		case "red":
			return "▲";
		default:
			return "✦";
	}
}

function themeClassFor(
	theme: AgendaThemeKey,
	moduleStyles: Record<string, string>
): string {
	switch (theme) {
		case "violet":
			return moduleStyles.themeViolet;
		case "blue":
			return moduleStyles.themeBlue;
		case "pink":
			return moduleStyles.themePink;
		case "amber":
			return moduleStyles.themeAmber;
		case "green":
			return moduleStyles.themeGreen;
		case "red":
			return moduleStyles.themeRed;
		default:
			return moduleStyles.themeBlue;
	}
}
