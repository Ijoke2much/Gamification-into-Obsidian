import React, { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import type { Quest } from "../../../features/quests/utils/taskParser";
import { getQuestEnergyCost } from "../../../shared/utils/questCompletionPipeline";
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
}

type AgendaRow =
	| { kind: "quest"; key: string; block: MobileAgendaBlock }
	| { kind: "gap"; key: string; startMin: number; endMin: number }
	| { kind: "now"; key: string; minutes: number };

/** Only surface free-time rows for meaningful holes (keeps the list calm). */
const MIN_GAP_MINUTES = 45;
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
		},
		ref
	) {
		const rootRef = useRef<HTMLDivElement | null>(null);
		const nowRef = useRef<HTMLDivElement | null>(null);
		const longPressTimer = useRef<number | null>(null);
		const longPressFired = useRef(false);

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

		if (sorted.length === 0) {
			return (
				<div
					className={styles.agenda}
					ref={rootRef}
					data-mobile-day-agenda
					aria-label="Day plan agenda"
				>
					<div className={styles.empty}>
						<span>No quests planned for this day</span>
						<p className={styles.emptyHint}>
							Schedule a due time, mark a quest for today, or add one into an open slot.
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
				className={styles.agenda}
				ref={rootRef}
				data-mobile-day-agenda
				aria-label="Day plan agenda"
			>
				{rows.map((row, index) => {
					const isLast = index === rows.length - 1;

					if (row.kind === "now") {
						return (
							<div
								key={row.key}
								ref={nowRef}
								className={styles.nowRow}
								aria-label="Current time"
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
						return (
							<div key={row.key} className={`${styles.row} ${styles.gapRow}`}>
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
