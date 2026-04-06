import React, { useEffect, useMemo, useRef, useState } from "react";
import { App, Notice, TFile, ItemView, WorkspaceLeaf } from "obsidian";
import { createRoot, Root } from "react-dom/client";
import type { Quest } from "../../features/quests/utils/taskParser";
import { parseQuestsFromMarkdown } from "../../features/quests/utils/taskParser";
import type GamifiedObsidianPlugin from "../../core/main";
import { QuestDetailModal } from "../../features/quests/modals/QuestDetailModal";
import { QuestModal } from "../../features/quests/modals/QuestModal";
import { readPlayerData } from "../../features/player/utils/playerDataUtils";
import { EnergyCalculationService } from "../../features/quests/services/energyCalculationService";
import { QuestCalendarView } from "../../features/quests/components/QuestCalendarView";
import { awardQuestRewards, buildCompletionNoticeText } from "../../shared/utils/questCompletionPipeline";
import styles from "./SidebarQuestView.module.css";

export const SIDEBAR_QUEST_VIEW_TYPE = "sidebar-quest-view";
const DEFAULT_PLANNER_START_HOUR = 0;
const DEFAULT_PLANNER_END_HOUR = 23;
const INBOX_COLLAPSE_KEY = "sidebarQuestInboxCollapseState.v1";
const CALENDAR_COLLAPSE_KEY = "sidebarQuestCalendarCollapse.v1";
const DEFAULT_TIMELINE_COLOR_MODE: TimelineColorMode = "adaptive";

interface SidebarQuestViewProps {
	app: App;
	plugin: GamifiedObsidianPlugin;
}

type InboxGroupId = "now" | "today" | "unscheduled" | "overdue" | "abandon";

interface DragState {
	quest: Quest;
	sourceGroup: InboxGroupId;
}

const SidebarQuestViewComponent: React.FC<SidebarQuestViewProps> = ({ app, plugin }) => {
	const [quests, setQuests] = useState<Quest[]>([]);
	const [isQuestModalOpen, setIsQuestModalOpen] = useState(false);
	const [editingQuest, setEditingQuest] = useState<Quest | null>(null);
	const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
	const [detailOpen, setDetailOpen] = useState(false);
	const [currentEnergy, setCurrentEnergy] = useState(70);
	const [selectedDate, setSelectedDate] = useState(() => {
		const d = new Date();
		d.setHours(0, 0, 0, 0);
		return d;
	});

	// Inbox filters
	const [tagFilter, setTagFilter] = useState("all");
	const [priorityFilter, setPriorityFilter] = useState("all");
	const [difficultyFilter, setDifficultyFilter] = useState("all");
	const [collapsedGroups, setCollapsedGroups] = useState<Record<InboxGroupId, boolean>>(
		() => loadCollapsedGroups()
	);
	const [dragState, setDragState] = useState<DragState | null>(null);
	const [activeDropZone, setActiveDropZone] = useState<InboxGroupId | null>(null);
	const [calendarCollapsed, setCalendarCollapsed] = useState<boolean>(() => loadCalendarCollapsed());
	const [currentTime, setCurrentTime] = useState(() => new Date());
	const plannerScrollRef = useRef<HTMLDivElement | null>(null);

	const loadQuests = async () => {
		try {
			const file = app.vault.getAbstractFileByPath("GamifiedTasks.md");
			if (file && file instanceof TFile) {
				const content = await app.vault.read(file);
				const parsed = parseQuestsFromMarkdown(content).filter((q) => !q.completed);
				setQuests(parsed);
			}
		} catch (error) {
			console.error("Error loading sidebar quests:", error);
		}
	};

	const loadEnergy = async () => {
		try {
			const playerData = await readPlayerData(plugin.app.vault);
			const energyValue = playerData?.stats?.energy;
			if (typeof energyValue === "number" && Number.isFinite(energyValue)) {
				setCurrentEnergy(energyValue);
			}
		} catch (error) {
			console.error("Failed to load player energy for sidebar:", error);
		}
	};

	useEffect(() => {
		loadQuests();
		loadEnergy();

		const file = app.vault.getAbstractFileByPath("GamifiedTasks.md");
		let cleanup = () => {};
		if (file && file instanceof TFile) {
			const onModify = (f: TFile) => {
				if (f.path === file.path) loadQuests();
			};
			app.vault.on("modify", onModify as never);
			cleanup = () => app.vault.off("modify", onModify as never);
		}
		const onPlayerUpdated = () => loadEnergy();
		document.addEventListener("player-data-updated", onPlayerUpdated);

		return () => {
			cleanup();
			document.removeEventListener("player-data-updated", onPlayerUpdated);
		};
	}, [app, plugin.app.vault]);

	useEffect(() => {
		try {
			localStorage.setItem(INBOX_COLLAPSE_KEY, JSON.stringify(collapsedGroups));
		} catch (e) {
			// Ignore storage write failures.
		}
	}, [collapsedGroups]);

	useEffect(() => {
		try {
			localStorage.setItem(CALENDAR_COLLAPSE_KEY, calendarCollapsed ? "1" : "0");
		} catch (e) {
			// Ignore storage write failures.
		}
	}, [calendarCollapsed]);

	useEffect(() => {
		const timer = window.setInterval(() => setCurrentTime(new Date()), 60_000);
		return () => window.clearInterval(timer);
	}, []);

	const availableTags = useMemo(() => {
		return Array.from(new Set(quests.flatMap((q) => q.tags || []))).sort();
	}, [quests]);

	const filteredQuests = useMemo(() => {
		return quests.filter((quest) => {
			if (tagFilter !== "all" && !(quest.tags || []).includes(tagFilter)) return false;
			if (priorityFilter !== "all" && (quest.priority || "none").toLowerCase() !== priorityFilter) return false;
			if (difficultyFilter !== "all" && (quest.difficulty || "none").toLowerCase() !== difficultyFilter) return false;
			return true;
		});
	}, [quests, tagFilter, priorityFilter, difficultyFilter]);

	const selectedDateISO = toISODate(selectedDate);
	const todayISO = toISODate(currentTime);
	const now = currentTime;
	const timelineSettings = plugin.settings?.timelineViewSettings;
	const timelineColorMode: TimelineColorMode =
		timelineSettings?.colorMode || DEFAULT_TIMELINE_COLOR_MODE;
	const { startHour: plannerStartHour, endHour: plannerEndHour } = normalizePlannerHourRange({
		useCustomDayRange: timelineSettings?.useCustomDayRange ?? false,
		startHour: timelineSettings?.dayStartHour,
		endHour: timelineSettings?.dayEndHour,
	});

	const timedTimelineBlocks = useMemo(() => {
		return filteredQuests
			.filter((quest) => isSameDate(quest.due, selectedDateISO) && hasTime(quest.due))
			.map((quest) => {
				const start = quest.due ? new Date(quest.due) : new Date();
				const duration = parseMinutes(quest.estimatedTime) || 60;
				const end = new Date(start.getTime() + duration * 60000);
				return { quest, start, end, duration, mode: "scheduled" as const };
			})
			.sort((a, b) => a.start.getTime() - b.start.getTime());
	}, [filteredQuests, selectedDateISO]);

	const flexibleTimelineBlocks = useMemo(() => {
		const sameDayFloating = filteredQuests.filter((quest) => {
			if (timedTimelineBlocks.some((block) => block.quest.id === quest.id)) return false;
			if (isSameDate(quest.due, selectedDateISO) && !hasTime(quest.due)) return true;
			if (!quest.due && selectedDateISO === todayISO) return true;
			if (quest.today && selectedDateISO === todayISO) return true;
			return false;
		});
		return placeFlexibleBlocks(sameDayFloating, selectedDate, 9, "floating");
	}, [filteredQuests, selectedDate, selectedDateISO, timedTimelineBlocks, todayISO]);

	const timelineBlocks = useMemo(() => {
		return [...timedTimelineBlocks, ...flexibleTimelineBlocks].sort(
			(a, b) => a.start.getTime() - b.start.getTime()
		);
	}, [timedTimelineBlocks, flexibleTimelineBlocks]);

	const plannerHours = useMemo(() => {
		const hours: number[] = [];
		for (let h = plannerStartHour; h <= plannerEndHour; h++) hours.push(h);
		return hours;
	}, [plannerStartHour, plannerEndHour]);

	const plannerBlocks = useMemo<PlannerBlock[]>(() => {
		const plannerStart = plannerStartHour * 60;
		const plannerEnd = plannerEndHour * 60;
		const totalMinutes = plannerEnd - plannerStart;
		const toPercent = (minutes: number) => (minutes / totalMinutes) * 100;
		const COLUMN_GAP_PERCENT = 1.1;
		const DENSE_COLUMN_GAP_PERCENT = 1.9;
		const MIN_COLUMN_WIDTH_PERCENT = 12;
		const TIGHT_CLUSTER_WIDTH_THRESHOLD = 30;

		const normalized = timelineBlocks
			.map((block, idx) => {
				const startOfDay = block.start.getHours() * 60 + block.start.getMinutes();
				const endOfDay = block.end.getHours() * 60 + block.end.getMinutes();
				let clampedStart = Math.max(plannerStart, startOfDay);
				let clampedEnd = Math.min(plannerEnd, Math.max(endOfDay, clampedStart + 15));

				// Keep quests that start exactly at planner end visible as a tail block.
				if (clampedStart >= plannerEnd) {
					clampedStart = Math.max(plannerStart, plannerEnd - 15);
					clampedEnd = plannerEnd;
				}

				// Ensure a visible minimum height for blocks clipped at the planner edge.
				if (clampedEnd - clampedStart < 15) {
					clampedEnd = Math.min(plannerEnd, clampedStart + 15);
				}
				const topPercent = toPercent(clampedStart - plannerStart);
				const heightPercent = Math.max(toPercent(clampedEnd - clampedStart), 6.5);

				return {
					...block,
					sortIndex: idx,
					clampedStart,
					clampedEnd,
					topPercent,
					heightPercent,
					title: getQuestDisplayTitle(block.quest),
					time: `${toTime(block.start)} - ${toTime(block.end)}`,
					themeKey: resolveTimelineTheme(block.quest, idx, timelineColorMode),
				};
			})
			.filter((block) => block.heightPercent > 0 && block.topPercent <= 100)
			.sort((a, b) => {
				if (a.clampedStart !== b.clampedStart) return a.clampedStart - b.clampedStart;
				if (a.clampedEnd !== b.clampedEnd) return a.clampedEnd - b.clampedEnd;
				return a.sortIndex - b.sortIndex;
			});

		if (normalized.length === 0) return normalized;

		type LayoutBlock = PlannerBlock & {
			columnIndex: number;
			clusterId: number;
		};

		const withColumns: LayoutBlock[] = [];
		let active: Array<{ end: number; column: number; blockRef: LayoutBlock }> = [];
		let clusterBlocks: LayoutBlock[] = [];
		let clusterMaxColumns = 0;
		let clusterId = 0;

		const finalizeCluster = () => {
			if (clusterBlocks.length === 0) return;
			const columns = Math.max(1, clusterMaxColumns);
			let gapPercent = columns >= 3 ? DENSE_COLUMN_GAP_PERCENT : COLUMN_GAP_PERCENT;
			let totalGap = Math.max(0, columns - 1) * gapPercent;
			let colWidth = (100 - totalGap) / columns;

			// Preserve minimum readable width while keeping visible separation.
			if (colWidth < MIN_COLUMN_WIDTH_PERCENT && columns > 1) {
				const maxGapForMinWidth =
					(100 - columns * MIN_COLUMN_WIDTH_PERCENT) / Math.max(1, columns - 1);
				gapPercent = Math.max(0.35, Math.min(gapPercent, maxGapForMinWidth));
				totalGap = Math.max(0, columns - 1) * gapPercent;
				colWidth = Math.max(MIN_COLUMN_WIDTH_PERCENT, (100 - totalGap) / columns);
			}

			const overlapCount = Math.max(0, columns - 1);
			const isTightCluster = columns >= 3 || colWidth <= TIGHT_CLUSTER_WIDTH_THRESHOLD;
			for (const block of clusterBlocks) {
				block.leftPercent = block.columnIndex * (colWidth + gapPercent);
				block.widthPercent = colWidth;
				block.clusterSize = columns;
				block.overlapCount = overlapCount;
				block.isTightCluster = isTightCluster;
			}
		};

		for (const block of normalized) {
			active = active.filter((entry) => entry.end > block.clampedStart);

			if (active.length === 0 && clusterBlocks.length > 0) {
				finalizeCluster();
				clusterBlocks = [];
				clusterMaxColumns = 0;
				clusterId += 1;
			}

			const usedColumns = new Set(active.map((entry) => entry.column));
			let columnIndex = 0;
			while (usedColumns.has(columnIndex)) columnIndex += 1;

			const layoutBlock: LayoutBlock = {
				...block,
				columnIndex,
				clusterId,
			};
			clusterBlocks.push(layoutBlock);
			active.push({ end: block.clampedEnd, column: columnIndex, blockRef: layoutBlock });
			clusterMaxColumns = Math.max(clusterMaxColumns, active.length);
			withColumns.push(layoutBlock);
		}

		finalizeCluster();

		return withColumns
			.sort((a, b) => a.sortIndex - b.sortIndex)
			.map((block) => ({
				...block,
				leftPercent: block.leftPercent,
				widthPercent: block.widthPercent,
				clusterSize: block.clusterSize,
				overlapCount: block.overlapCount,
				isTightCluster: block.isTightCluster,
			}));
	}, [timelineBlocks, plannerStartHour, plannerEndHour, timelineColorMode]);

	const nowMarkerPercent = useMemo(() => {
		if (selectedDateISO !== todayISO) return null;
		const startMinutes = plannerStartHour * 60;
		const endMinutes = plannerEndHour * 60;
		const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
		if (currentMinutes < startMinutes || currentMinutes > endMinutes) return null;
		// Keep marker line inside track bounds (avoid appearing below last hour line).
		const safeMinutes = Math.min(currentMinutes, endMinutes - 1);
		return ((safeMinutes - startMinutes) / (endMinutes - startMinutes)) * 100;
	}, [selectedDateISO, todayISO, currentTime, plannerStartHour, plannerEndHour]);

	useEffect(() => {
		if (selectedDateISO !== todayISO) return;
		const plannerEl = plannerScrollRef.current;
		if (!plannerEl) return;

		const startMinutes = plannerStartHour * 60;
		const endMinutes = plannerEndHour * 60;
		const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
		const clamped = Math.max(startMinutes, Math.min(endMinutes, currentMinutes));
		const ratio = (clamped - startMinutes) / (endMinutes - startMinutes);
		const viewport = plannerEl.clientHeight;
		const content = plannerEl.scrollHeight;
		const targetTop = ratio * content - viewport * 0.35;
		plannerEl.scrollTop = Math.max(0, Math.min(targetTop, content - viewport));
	}, [selectedDateISO, todayISO, plannerStartHour, plannerEndHour, currentTime]);

	const inboxByGroup = useMemo(() => {
		const groups: Record<InboxGroupId, Quest[]> = {
			now: [],
			today: [],
			unscheduled: [],
			overdue: [],
			abandon: [],
		};

		for (const quest of filteredQuests) {
			const group = classifyInboxGroup(quest, {
				todayISO,
				now,
			});
			groups[group].push(quest);
		}

		return groups;
	}, [filteredQuests, todayISO, now]);

	const openCreate = () => {
		setEditingQuest(null);
		setIsQuestModalOpen(true);
	};

	const openDetails = (quest: Quest) => {
		setSelectedQuest(quest);
		setDetailOpen(true);
	};

	const handleEditQuest = (quest: Quest) => {
		setDetailOpen(false);
		setEditingQuest(quest);
		setIsQuestModalOpen(true);
	};

	const handleQuestModalClose = () => {
		setIsQuestModalOpen(false);
		setEditingQuest(null);
		loadQuests();
	};

	const openQuestTab = () => {
		app.workspace.onLayoutReady(async () => {
			const leaf = app.workspace.getRightLeaf(false);
			if (leaf) {
				await leaf.setViewState({
					type: "gamified-task-tab-view",
					active: true,
				});
			}
		});
	};

	const handleQuestComplete = async (questTitle: string) => {
		try {
			const quest = quests.find((q) => q.title === questTitle || q.id === questTitle);
			if (!quest) return;
			const result = await persistQuestCompletion(app, quest, true);
			await loadQuests();
			if (result.changed) {
				new Notice(buildCompletionNoticeText(result, plugin.settings), 3500);
			}
		} catch (error) {
			console.error("Failed to complete quest from sidebar calendar:", error);
		}
	};

	const handleQuestUncomplete = async (questTitle: string) => {
		try {
			const quest = quests.find((q) => q.title === questTitle || q.id === questTitle);
			if (!quest) return;
			const changed = await persistQuestUncomplete(app, quest);
			await loadQuests();
			if (changed) {
				new Notice(`Reopened "${getQuestDisplayTitle(quest)}"`, 2500);
			}
		} catch (error) {
			console.error("Failed to uncomplete quest from sidebar details:", error);
			new Notice("Could not reopen quest. Please try again.", 3500);
		}
	};

	const handleQuestMove = async (questId: string, newDate: string) => {
		try {
			const file = app.vault.getAbstractFileByPath("GamifiedTasks.md");
			if (!(file instanceof TFile)) return;
			const content = await app.vault.read(file);
			const lines = content.split("\n");
			const quest = quests.find((q) => q.id === questId || q.title === questId);
			const idx = lines.findIndex((line) => {
				if (!line.includes("#gamified-task")) return false;
				if (quest?.title && line.includes(quest.title)) return true;
				if (questId && line.includes(questId)) return true;
				return false;
			});
			if (idx === -1) return;
			let updated = lines[idx]
				.replace(/📅\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?/g, "")
				.replace(/due::\s*\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?/gi, "")
				.replace(/due:\s*\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?/gi, "")
				.replace(/\s{2,}/g, " ")
				.trim();
			updated = upsertMetaField(updated, "due", newDate);
			lines[idx] = updated;
			await app.vault.modify(file, lines.join("\n"));
			await loadQuests();
		} catch (error) {
			console.error("Failed to move quest from sidebar calendar:", error);
		}
	};

	const toggleGroupCollapse = (groupId: InboxGroupId) => {
		setCollapsedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
	};

	const handleDragStart = (quest: Quest, sourceGroup: InboxGroupId) => {
		setDragState({ quest, sourceGroup });
	};

	const handleDragEnd = () => {
		setDragState(null);
		setActiveDropZone(null);
	};

	const canDropToGroup = (targetGroup: InboxGroupId): boolean => {
		if (!dragState) return false;
		if (targetGroup === "overdue") return false; // derived group
		return true;
	};

	const handleDropToGroup = async (targetGroup: InboxGroupId) => {
		if (!dragState) return;
		if (!canDropToGroup(targetGroup)) {
			setDragState(null);
			setActiveDropZone(null);
			return;
		}
		try {
			const questName = getQuestDisplayTitle(dragState.quest);
			await persistQuestGroupMove(app, dragState.quest, targetGroup, todayISO);
			await loadQuests();
			new Notice(`Moved "${questName}" to ${groupTitle(targetGroup)}`, 2500);
		} catch (error) {
			console.error("Failed to move quest between inbox groups:", error);
			new Notice("Could not move quest. Please try again.", 3500);
		} finally {
			setDragState(null);
			setActiveDropZone(null);
		}
	};

	const handleTimelineKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, quest: Quest) => {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			openDetails(quest);
		}
	};

	const handleTimelineComplete = async (quest: Quest) => {
		try {
			const result = await persistQuestCompletion(app, quest, true);
			await loadQuests();
			if (result.changed) {
				new Notice(buildCompletionNoticeText(result, plugin.settings), 3500);
			}
		} catch (error) {
			console.error("Failed to complete quest from timeline:", error);
			new Notice("Could not complete quest. Please try again.", 3500);
		}
	};

	const handleTimelineMoveByDays = async (quest: Quest, daysToMove: number) => {
		try {
			const baseIso = quest.due?.split("T")[0] || selectedDateISO;
			const targetDate = new Date(`${baseIso}T00:00:00`);
			if (Number.isNaN(targetDate.getTime())) return;
			targetDate.setDate(targetDate.getDate() + daysToMove);
			const targetIso = toISODate(targetDate);
			await persistQuestDateMove(app, quest, targetIso, todayISO);
			await loadQuests();
			const label = targetDate.toLocaleDateString([], { month: "short", day: "numeric" });
			new Notice(`Moved "${getQuestDisplayTitle(quest)}" to ${label}`, 2500);
		} catch (error) {
			console.error("Failed to move quest from timeline:", error);
			new Notice("Could not move quest. Please try again.", 3500);
		}
	};

	const scrollTimelineToNow = (behavior: ScrollBehavior = "smooth") => {
		const plannerEl = plannerScrollRef.current;
		if (!plannerEl) return;
		const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
		scrollPlannerToMinute({
			plannerEl,
			currentMinutes,
			startHour: plannerStartHour,
			endHour: plannerEndHour,
			behavior,
		});
	};

	const handleJumpToNow = () => {
		if (selectedDateISO !== todayISO) {
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			setSelectedDate(today);
			window.setTimeout(() => scrollTimelineToNow("smooth"), 0);
			return;
		}
		scrollTimelineToNow("smooth");
	};

	return (
		<div className={styles.container}>
			<div className={styles.panelHeader}>
				<h2 className={styles.panelTitle}>Quests</h2>
				<button
					type="button"
					className={styles.linkButton}
					title="Open Boss Battle in the main workspace tab"
					onClick={() => void plugin.activateBossView()}
				>
					Boss Battle →
				</button>
			</div>

			<div className={styles.topRow}>
				<button
					type="button"
					className={styles.addButton}
					onClick={openCreate}
				>
					+ Add Quest
				</button>
			</div>

			<section className={`${styles.section} ${styles.calendarSection}`}>
				<div className={styles.calendarSectionHeader}>
					<div className={styles.sectionTitle}>Calendar</div>
					<button
						type="button"
						className={styles.calendarCollapseBtn}
						onClick={() => setCalendarCollapsed((prev) => !prev)}
						title={calendarCollapsed ? "Expand calendar" : "Collapse calendar"}
					>
						{calendarCollapsed ? "▸" : "▾"}
					</button>
				</div>
				{!calendarCollapsed && (
					<div className={styles.calendarInner}>
						<QuestCalendarView
							quests={filteredQuests}
							plugin={plugin}
							currentEnergy={currentEnergy}
							onQuestSelect={openDetails}
							onQuestComplete={handleQuestComplete}
							onQuestEdit={handleEditQuest}
							onDateSelect={(date) => {
								const d = new Date(date);
								d.setHours(0, 0, 0, 0);
								setSelectedDate(d);
							}}
							onQuestMove={handleQuestMove}
							hideSelectedDateDetails={true}
							showFocusEnergyControls={false}
						/>
					</div>
				)}
			</section>

			<section className={styles.section}>
				<div className={styles.timelineHeader}>
					<span>Day</span>
					<div className={styles.timelineHeaderActions}>
						<button
							type="button"
							className={styles.timelineNowBtn}
							title="Jump to current time"
							onClick={handleJumpToNow}
						>
							Now
						</button>
						<button type="button" className={styles.timelineHeaderIcon} title="Day schedule">
							☷
						</button>
					</div>
				</div>
				<div className={styles.timelinePlanner} ref={plannerScrollRef}>
					<div className={styles.timelineHourColumn}>
						{plannerHours.map((hour) => (
							<div key={`hour-${hour}`} className={styles.timelineHourLabel}>
								{toHourTickFromNumber(hour)}
							</div>
						))}
					</div>
					<div className={styles.timelineTrack}>
						{plannerHours.map((hour) => (
							<div key={`line-${hour}`} className={styles.timelineHourLine} />
						))}
						{nowMarkerPercent !== null && (
							<div
								className={styles.timelineNowMarker}
								style={{ top: `${nowMarkerPercent}%` }}
								aria-hidden="true"
							>
								<span className={styles.timelineNowMarkerLabel}>Now</span>
								<span className={styles.timelineNowMarkerLine} />
							</div>
						)}
						{plannerBlocks.length === 0 && (
							<div className={styles.timelineEmpty}>
								<div className={styles.timelineEmptyContent}>
									<span>No quests scheduled for this day</span>
									<button type="button" className={styles.timelineEmptyAdd} onClick={openCreate}>
										+ Add Quest
									</button>
								</div>
							</div>
						)}
						{plannerBlocks.map((block, idx) => (
							<div
								key={`planner-${block.quest.id}-${idx}`}
								role="button"
								tabIndex={0}
								className={[
									styles.timelineQuestBlock,
									block.mode === "suggested" ? styles.timelineQuestBlockSuggested : "",
									block.mode === "floating" ? styles.timelineQuestBlockFloating : "",
									(block.clusterSize || 1) >= 3 ? styles.timelineQuestBlockDense : "",
									block.isTightCluster ? styles.timelineQuestBlockTight : "",
									(block.overlapCount || 0) >= 2 && block.isTightCluster
										? styles.timelineQuestBlockWithOverlapBadge
										: "",
									getTimelineThemeClass(block.themeKey, styles),
								].filter(Boolean).join(" ")}
								onClick={() => openDetails(block.quest)}
								onKeyDown={(e) => handleTimelineKeyDown(e, block.quest)}
								title={block.title}
								style={{
									top: `${block.topPercent}%`,
									height: `${block.heightPercent}%`,
									left: `${block.leftPercent ?? 0}%`,
									width: `${block.widthPercent ?? 100}%`,
								}}
							>
								{(block.overlapCount || 0) >= 2 && block.isTightCluster && (
									<div className={styles.timelineOverlapBadge}>
										+{block.overlapCount} overlapping
									</div>
								)}
								<div className={styles.timelineQuestActions}>
									<button
										type="button"
										className={styles.timelineActionBtn}
										title="Open details"
										onClick={(e) => {
											e.stopPropagation();
											openDetails(block.quest);
										}}
									>
										⋯
									</button>
									{block.heightPercent >= 10 && (
										<>
											<button
												type="button"
												className={styles.timelineActionBtn}
												title="Move one day later"
												onClick={(e) => {
													e.stopPropagation();
													void handleTimelineMoveByDays(block.quest, 1);
												}}
											>
												+1d
											</button>
											<button
												type="button"
												className={styles.timelineActionBtn}
												title="Mark complete"
												onClick={(e) => {
													e.stopPropagation();
													void handleTimelineComplete(block.quest);
												}}
											>
												✓
											</button>
										</>
									)}
								</div>
								<div className={styles.timelineQuestTitle}>{block.title}</div>
								<div className={styles.timelineQuestTime}>{block.time}</div>
							</div>
						))}
					</div>
				</div>
				{plannerBlocks.length > 0 && (
					<div className={styles.timelineFreeSummary}>
						Free time:{" "}
						{formatDurationForBlocks(plannerBlocks, plannerStartHour, plannerEndHour)} available in this
						window
					</div>
				)}
			</section>

			<section className={styles.section}>
				<div className={styles.sectionTitle}>Inbox</div>
				<div className={styles.filterRow}>
					<select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} className={styles.filterSelect}>
						<option value="all">All tags</option>
						{availableTags.map((tag) => (
							<option key={tag} value={tag}>{tag}</option>
						))}
					</select>
					<select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className={styles.filterSelect}>
						<option value="all">Priority</option>
						<option value="highest">Highest</option>
						<option value="high">High</option>
						<option value="medium">Medium</option>
						<option value="low">Low</option>
						<option value="lowest">Lowest</option>
					</select>
					<select value={difficultyFilter} onChange={(e) => setDifficultyFilter(e.target.value)} className={styles.filterSelect}>
						<option value="all">Difficulty</option>
						<option value="easy">Easy</option>
						<option value="medium">Medium</option>
						<option value="hard">Hard</option>
						<option value="epic">Epic</option>
					</select>
				</div>

				<InboxGroup
					groupId="now"
					title="Now"
					quests={inboxByGroup.now}
					currentEnergy={currentEnergy}
					onQuestClick={openDetails}
					collapsed={collapsedGroups.now}
					onToggleCollapse={toggleGroupCollapse}
					onDragStart={handleDragStart}
					onDragEnd={handleDragEnd}
					onDragOver={(groupId) => {
						if (canDropToGroup(groupId)) setActiveDropZone(groupId);
					}}
					onDrop={handleDropToGroup}
					isDropActive={activeDropZone === "now" && canDropToGroup("now")}
				/>
				<InboxGroup
					groupId="today"
					title="Today"
					quests={inboxByGroup.today}
					currentEnergy={currentEnergy}
					onQuestClick={openDetails}
					collapsed={collapsedGroups.today}
					onToggleCollapse={toggleGroupCollapse}
					onDragStart={handleDragStart}
					onDragEnd={handleDragEnd}
					onDragOver={(groupId) => {
						if (canDropToGroup(groupId)) setActiveDropZone(groupId);
					}}
					onDrop={handleDropToGroup}
					isDropActive={activeDropZone === "today" && canDropToGroup("today")}
				/>
				<InboxGroup
					groupId="unscheduled"
					title="Unscheduled"
					quests={inboxByGroup.unscheduled}
					currentEnergy={currentEnergy}
					onQuestClick={openDetails}
					collapsed={collapsedGroups.unscheduled}
					onToggleCollapse={toggleGroupCollapse}
					onDragStart={handleDragStart}
					onDragEnd={handleDragEnd}
					onDragOver={(groupId) => {
						if (canDropToGroup(groupId)) setActiveDropZone(groupId);
					}}
					onDrop={handleDropToGroup}
					isDropActive={activeDropZone === "unscheduled" && canDropToGroup("unscheduled")}
				/>
				<InboxGroup
					groupId="overdue"
					title="Overdue"
					quests={inboxByGroup.overdue}
					currentEnergy={currentEnergy}
					onQuestClick={openDetails}
					collapsed={collapsedGroups.overdue}
					onToggleCollapse={toggleGroupCollapse}
					onDragStart={handleDragStart}
					onDragEnd={handleDragEnd}
					onDragOver={() => setActiveDropZone(null)}
					onDrop={handleDropToGroup}
					isDropActive={false}
				/>
				<InboxGroup
					groupId="abandon"
					title="Abandon"
					quests={inboxByGroup.abandon}
					currentEnergy={currentEnergy}
					onQuestClick={openDetails}
					collapsed={collapsedGroups.abandon}
					onToggleCollapse={toggleGroupCollapse}
					onDragStart={handleDragStart}
					onDragEnd={handleDragEnd}
					onDragOver={(groupId) => {
						if (canDropToGroup(groupId)) setActiveDropZone(groupId);
					}}
					onDrop={handleDropToGroup}
					isDropActive={activeDropZone === "abandon" && canDropToGroup("abandon")}
				/>
			</section>

			{isQuestModalOpen && (
				<QuestModal
					isOpen={isQuestModalOpen}
					plugin={plugin}
					mode={editingQuest ? "edit" : "create"}
					quest={editingQuest}
					onClose={handleQuestModalClose}
					onSubmit={handleQuestModalClose}
				/>
			)}

			<QuestDetailModal
				isOpen={detailOpen}
				onClose={() => setDetailOpen(false)}
				quest={selectedQuest}
				plugin={plugin}
				currentEnergy={currentEnergy}
				onEdit={handleEditQuest}
				onComplete={handleQuestComplete}
				onUncomplete={handleQuestUncomplete}
			/>
		</div>
	);
};

interface InboxGroupProps {
	groupId: InboxGroupId;
	title: string;
	quests: Quest[];
	currentEnergy: number;
	onQuestClick: (quest: Quest) => void;
	collapsed: boolean;
	onToggleCollapse: (groupId: InboxGroupId) => void;
	onDragStart: (quest: Quest, sourceGroup: InboxGroupId) => void;
	onDragEnd: () => void;
	onDragOver: (groupId: InboxGroupId) => void;
	onDrop: (groupId: InboxGroupId) => void;
	isDropActive: boolean;
}

const InboxGroup: React.FC<InboxGroupProps> = ({
	groupId,
	title,
	quests,
	currentEnergy,
	onQuestClick,
	collapsed,
	onToggleCollapse,
	onDragStart,
	onDragEnd,
	onDragOver,
	onDrop,
	isDropActive,
}) => (
	<div className={styles.inboxGroup}>
		<button
			type="button"
			className={`${styles.inboxGroupTitle} ${styles.inboxGroupHeaderButton}`}
			onClick={() => onToggleCollapse(groupId)}
			onDragOver={(e) => {
				e.preventDefault();
				onDragOver(groupId);
			}}
			onDrop={(e) => {
				e.preventDefault();
				onDrop(groupId);
			}}
		>
			<span className={styles.groupTitleText}>
				<span className={styles.groupChevron}>{collapsed ? "▸" : "▾"}</span>
				{groupIcon(title)} {title}
			</span>
			<span className={styles.groupCount}>{quests.length}</span>
		</button>
		{!collapsed && quests.length === 0 ? (
			<div className={`${styles.emptyState} ${isDropActive ? styles.emptyStateDropActive : ""}`}>
				{isDropActive ? `Drop here to move to ${title}` : "No quests"}
			</div>
		) : !collapsed ? (
			<div
				className={`${styles.inboxList} ${isDropActive ? styles.inboxDropActive : ""}`}
				onDragOver={(e) => {
					e.preventDefault();
					onDragOver(groupId);
				}}
				onDrop={(e) => {
					e.preventDefault();
					onDrop(groupId);
				}}
			>
				{isDropActive && (
					<div className={styles.dropHint}>Drop here to move to {title}</div>
				)}
				{quests.map((quest, index) => {
					const energy = EnergyCalculationService.calculateQuestEnergy(quest, currentEnergy);
					const titleText = getQuestDisplayTitle(quest);
					const compactDue = compactDueLabel(quest);
					const primaryTag = firstMeaningfulTag(quest.tags);
					const isFocusRow = index === 0 && title === "Today";
					return (
						<button
							key={`inbox-${title}-${quest.id}`}
							type="button"
							className={`${styles.inboxItem} ${isFocusRow ? styles.inboxItemFocus : ""}`}
							onClick={() => onQuestClick(quest)}
							title={titleText}
							draggable
							onDragStart={(e) => {
								e.dataTransfer.setData("text/plain", quest.id || titleText);
								onDragStart(quest, groupId);
							}}
							onDragEnd={onDragEnd}
						>
							<div className={styles.inboxItemLeft}>
								<span className={styles.dragHandle}>⋮⋮</span>
								<span className={styles.inboxCheck}>☐</span>
								<span className={styles.inboxItemTitle}>{titleText}</span>
							</div>
							<div className={styles.inboxItemRight}>
								{compactDue && <span className={`${styles.badge} ${styles.badgeDue}`}>{compactDue}</span>}
								<span className={`${styles.badge} ${styles.badgeEnergy}`}>
									{EnergyCalculationService.getEnergyMatchIcon(energy.match)}
								</span>
								{typeof quest.xp === "number" && quest.xp > 0 && (
									<span className={`${styles.badge} ${styles.badgeXpCompact}`}>+{quest.xp} XP</span>
								)}
								{typeof quest.coins === "number" && quest.coins > 0 && (
									<span className={`${styles.badge} ${styles.badgeCoinCompact}`}>+{quest.coins}</span>
								)}
								{primaryTag && <span className={`${styles.badge} ${styles.badgeTagCompact}`}>#{primaryTag}</span>}
								<span className={styles.rowChevron}>›</span>
							</div>
						</button>
					);
				})}
			</div>
		) : null}
	</div>
);

function hasTime(due?: string): boolean {
	return Boolean(due && due.includes("T"));
}

function isSameDate(due: string | undefined, isoDate: string): boolean {
	if (!due) return false;
	return due.split("T")[0] === isoDate;
}

function toISODate(date: Date): string {
	const y = date.getFullYear();
	const m = `${date.getMonth() + 1}`.padStart(2, "0");
	const d = `${date.getDate()}`.padStart(2, "0");
	return `${y}-${m}-${d}`;
}

function parseMinutes(timeString?: string): number {
	if (!timeString) return 60;
	const trimmed = timeString.trim();
	if (/^\d+$/.test(trimmed)) {
		return Math.max(1, Number(trimmed));
	}
	const match = timeString.match(/(\d+)\s*(m|min|h|hr|hour)/i);
	if (!match) return 60;
	const value = Number(match[1]);
	const unit = match[2].toLowerCase();
	return unit.startsWith("h") ? value * 60 : value;
}

function toTime(date: Date): string {
	return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
}

function dueLabel(quest: Quest): string {
	if (!quest.due) return "No due date";
	const due = new Date(quest.due);
	if (Number.isNaN(due.getTime())) return "No due date";
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const dueDay = new Date(due);
	dueDay.setHours(0, 0, 0, 0);
	if (dueDay.getTime() === today.getTime()) return "Today";
	const tomorrow = new Date(today);
	tomorrow.setDate(today.getDate() + 1);
	if (dueDay.getTime() === tomorrow.getTime()) return "Tomorrow";
	if (dueDay < today) return "Overdue";
	return due.toLocaleDateString();
}

function placeFlexibleBlocks(
	quests: Quest[],
	selectedDate: Date,
	startHour: number,
	mode: "floating" | "suggested"
) {
	return quests.map((quest, idx) => {
		const start = new Date(selectedDate);
		start.setHours(startHour, 0, 0, 0);
		start.setMinutes(start.getMinutes() + idx * 90);
		const duration = parseMinutes(quest.estimatedTime) || 60;
		const end = new Date(start.getTime() + duration * 60000);
		return { quest, start, end, duration, mode };
	});
}

type TimelineQuestBlock = {
	quest: Quest;
	start: Date;
	end: Date;
	duration: number;
	mode: "scheduled" | "floating" | "suggested";
};

type TimelineThemeKey = "violet" | "blue" | "pink" | "amber" | "green";
type TimelineColorMode = "adaptive" | "priority" | "difficulty" | "tag";
type PlannerBlock = TimelineQuestBlock & {
	sortIndex: number;
	clampedStart: number;
	clampedEnd: number;
	topPercent: number;
	heightPercent: number;
	leftPercent?: number;
	widthPercent?: number;
	clusterSize?: number;
	overlapCount?: number;
	isTightCluster?: boolean;
	title: string;
	time: string;
	themeKey: TimelineThemeKey;
};

function normalizePlannerHourRange(args: {
	useCustomDayRange: boolean;
	startHour?: number;
	endHour?: number;
}): { startHour: number; endHour: number } {
	if (!args.useCustomDayRange) {
		return {
			startHour: DEFAULT_PLANNER_START_HOUR,
			endHour: DEFAULT_PLANNER_END_HOUR,
		};
	}

	const start = clampHour(args.startHour ?? DEFAULT_PLANNER_START_HOUR);
	const end = clampHour(args.endHour ?? DEFAULT_PLANNER_END_HOUR);

	if (end <= start) {
		return {
			startHour: DEFAULT_PLANNER_START_HOUR,
			endHour: DEFAULT_PLANNER_END_HOUR,
		};
	}

	return { startHour: start, endHour: end };
}

function clampHour(hour: number): number {
	return Math.max(0, Math.min(23, Math.floor(hour)));
}

function scrollPlannerToMinute(args: {
	plannerEl: HTMLDivElement;
	currentMinutes: number;
	startHour: number;
	endHour: number;
	behavior: ScrollBehavior;
}) {
	const startMinutes = args.startHour * 60;
	const endMinutes = args.endHour * 60;
	const clamped = Math.max(startMinutes, Math.min(endMinutes, args.currentMinutes));
	const ratio = (clamped - startMinutes) / (endMinutes - startMinutes);
	const viewport = args.plannerEl.clientHeight;
	const content = args.plannerEl.scrollHeight;
	const targetTop = ratio * content - viewport * 0.35;
	args.plannerEl.scrollTo({
		top: Math.max(0, Math.min(targetTop, content - viewport)),
		behavior: args.behavior,
	});
}

function toHourTick(date: Date): string {
	return date.toLocaleTimeString([], { hour: "numeric", hour12: true });
}

function formatDuration(start: Date, end: Date): string {
	const totalMinutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
	if (hours > 0) return `${hours}h`;
	return `${minutes}m`;
}

function toHourTickFromNumber(hour: number): string {
	const d = new Date();
	d.setHours(hour, 0, 0, 0);
	return d.toLocaleTimeString([], { hour: "numeric", hour12: true });
}

function formatDurationForBlocks(
	blocks: Array<{ start: Date; end: Date }>,
	startHour: number,
	endHour: number
): string {
	const plannerStart = startHour * 60;
	const plannerEnd = endHour * 60;
	const totalMinutes = plannerEnd - plannerStart;

	let occupied = 0;
	for (const block of blocks) {
		const start = Math.max(plannerStart, block.start.getHours() * 60 + block.start.getMinutes());
		const end = Math.min(plannerEnd, block.end.getHours() * 60 + block.end.getMinutes());
		occupied += Math.max(0, end - start);
	}
	const free = Math.max(0, totalMinutes - occupied);
	const h = Math.floor(free / 60);
	const m = free % 60;
	if (h > 0 && m > 0) return `${h}h ${m}m`;
	if (h > 0) return `${h}h`;
	return `${m}m`;
}

function getQuestDisplayTitle(quest: Quest): string {
	const candidate = sanitizeQuestTitle(quest.title);
	if (candidate) return candidate;
	const fallbackId = quest.id?.trim();
	if (fallbackId) return fallbackId;
	return "Untitled quest";
}

function sanitizeQuestTitle(input?: string): string {
	if (!input) return "";
	let value = input.trim();
	if (!value) return "";

	// Strip markdown/task control characters that can leak from parser lines.
	value = value
		.replace(/^-+\s*/, "")
		.replace(/^\[[ xX]\]\s*/, "")
		.replace(/\s{2,}/g, " ")
		.trim();

	// If title is only punctuation/symbols, treat as invalid.
	const alnum = value.replace(/[^a-zA-Z0-9]/g, "");
	if (alnum.length === 0) return "";

	// Cap to keep sidebar cards clean.
	return value.length > 80 ? `${value.slice(0, 77)}...` : value;
}

function groupIcon(group: string): string {
	switch (group.toLowerCase()) {
		case "now":
			return "⟡";
		case "today":
			return "⌄";
		case "unscheduled":
			return "ᚱ";
		default:
			return "•";
	}
}

function groupTitle(groupId: InboxGroupId): string {
	switch (groupId) {
		case "now":
			return "Now";
		case "today":
			return "Today";
		case "unscheduled":
			return "Unscheduled";
		case "overdue":
			return "Overdue";
		case "abandon":
			return "Abandon";
		default:
			return "Inbox";
	}
}

function resolveTimelineTheme(
	quest: Quest,
	fallbackIndex: number,
	mode: TimelineColorMode
): TimelineThemeKey {
	if (mode === "priority" || mode === "adaptive") {
		const p = (quest.priority || "").toLowerCase();
		if (["highest", "high"].includes(p)) return "pink";
		if (["low", "lowest"].includes(p)) return "green";
		if (p === "medium") return "blue";
	}
	if (mode === "difficulty" || mode === "adaptive") {
		const d = (quest.difficulty || "").toLowerCase();
		if (["epic", "hard"].includes(d)) return "amber";
		if (d === "easy") return "green";
		if (d === "medium") return "blue";
	}
	if (mode === "tag" || mode === "adaptive") {
		const tag = firstMeaningfulTag(quest.tags) || "";
		if (tag) {
			const themes: TimelineThemeKey[] = ["violet", "blue", "pink", "amber", "green"];
			return themes[hashString(tag) % themes.length];
		}
	}
	const fallback: TimelineThemeKey[] = ["violet", "blue", "pink", "amber", "green"];
	return fallback[fallbackIndex % fallback.length];
}

function getTimelineThemeClass(
	theme: TimelineThemeKey,
	moduleStyles: Record<string, string>
): string {
	switch (theme) {
		case "violet":
			return moduleStyles.timelineThemeViolet;
		case "blue":
			return moduleStyles.timelineThemeBlue;
		case "pink":
			return moduleStyles.timelineThemePink;
		case "amber":
			return moduleStyles.timelineThemeAmber;
		case "green":
			return moduleStyles.timelineThemeGreen;
		default:
			return moduleStyles.timelineThemeBlue;
	}
}

function hashString(value: string): number {
	let hash = 0;
	for (let i = 0; i < value.length; i++) {
		hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
	}
	return hash;
}

function compactDueLabel(quest: Quest): string {
	if (!quest.due) return "";
	const due = new Date(quest.due);
	if (Number.isNaN(due.getTime())) return "";
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const dueDay = new Date(due);
	dueDay.setHours(0, 0, 0, 0);
	const diffDays = Math.round((dueDay.getTime() - today.getTime()) / 86400000);
	if (diffDays < 0) return "OVERDUE";
	if (diffDays === 0) {
		const hasTime = quest.due.includes("T");
		if (hasTime) {
			return `DUE ${due.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
		}
		return "TODAY";
	}
	if (diffDays === 1) return "TOMORROW";
	return due.toLocaleDateString([], { month: "short", day: "numeric" }).toUpperCase();
}

function loadCollapsedGroups(): Record<InboxGroupId, boolean> {
	const defaults: Record<InboxGroupId, boolean> = {
		now: false,
		today: false,
		unscheduled: false,
		overdue: false,
		abandon: true,
	};
	try {
		const raw = localStorage.getItem(INBOX_COLLAPSE_KEY);
		if (!raw) return defaults;
		const parsed = JSON.parse(raw) as Partial<Record<InboxGroupId, boolean>>;
		return { ...defaults, ...parsed };
	} catch {
		return defaults;
	}
}

function loadCalendarCollapsed(): boolean {
	try {
		return localStorage.getItem(CALENDAR_COLLAPSE_KEY) === "1";
	} catch {
		return false;
	}
}

function classifyInboxGroup(
	quest: Quest,
	ctx: { todayISO: string; now: Date }
): InboxGroupId {
	if (isAbandonQuest(quest, ctx.now)) return "abandon";
	if (isNowQuest(quest, ctx.todayISO, ctx.now)) return "now";
	if (isTodayQuest(quest, ctx.todayISO)) return "today";
	if (isOverdueQuest(quest)) return "overdue";
	return "unscheduled";
}

function isTodayQuest(quest: Quest, todayISO: string): boolean {
	if (quest.today === true) return true;
	if (!quest.due) return false;
	return quest.due.split("T")[0] === todayISO;
}

function isNowQuest(quest: Quest, todayISO: string, now: Date): boolean {
	if (!quest.due || !hasTime(quest.due)) return false;
	if (quest.due.split("T")[0] !== todayISO) return false;
	const due = new Date(quest.due);
	const diffMins = (due.getTime() - now.getTime()) / 60000;
	return diffMins <= 90 && diffMins >= -60;
}

function isOverdueQuest(quest: Quest): boolean {
	if (!quest.due) return false;
	const due = new Date(quest.due);
	if (Number.isNaN(due.getTime())) return false;
	const now = new Date();
	if (hasTime(quest.due)) {
		return due < now;
	}
	const todayStart = new Date(now);
	todayStart.setHours(0, 0, 0, 0);
	const dueDay = new Date(due);
	dueDay.setHours(0, 0, 0, 0);
	return dueDay < todayStart;
}

function isAbandonQuest(quest: Quest, now: Date): boolean {
	if (quest.status?.toLowerCase() === "abandoned") return true;
	const touchedRaw = quest.lastModified || quest.createdDate || "";
	if (!touchedRaw) return false;
	const touched = new Date(touchedRaw);
	if (Number.isNaN(touched.getTime())) return false;
	const days = (now.getTime() - touched.getTime()) / (1000 * 60 * 60 * 24);
	return days >= 14;
}

async function persistQuestGroupMove(
	app: App,
	quest: Quest,
	targetGroup: InboxGroupId,
	todayISO: string
): Promise<void> {
	const file = app.vault.getAbstractFileByPath("GamifiedTasks.md");
	if (!(file instanceof TFile)) return;
	const content = await app.vault.read(file);
	const lines = content.split("\n");
	const index = findQuestLineIndex(lines, quest);
	if (index === -1) return;

	lines[index] = applyGroupMoveToLine(lines[index], targetGroup, todayISO);
	await app.vault.modify(file, lines.join("\n"));
}

async function persistQuestCompletion(
	app: App,
	quest: Quest,
	awardRewards: boolean
): Promise<{ changed: boolean; awardedXP: number; awardedCP: number; awardedCoins: number }> {
	const file = app.vault.getAbstractFileByPath("GamifiedTasks.md");
	if (!(file instanceof TFile)) return { changed: false, awardedXP: 0, awardedCP: 0, awardedCoins: 0 };
	const content = await app.vault.read(file);
	const lines = content.split("\n");
	const index = findQuestLineIndex(lines, quest);
	if (index === -1) return { changed: false, awardedXP: 0, awardedCP: 0, awardedCoins: 0 };
	if (lines[index].includes("- [x]")) return { changed: false, awardedXP: 0, awardedCP: 0, awardedCoins: 0 };
	lines[index] = lines[index].replace("- [ ]", "- [x]");
	await app.vault.modify(file, lines.join("\n"));

	if (!awardRewards) {
		return { changed: true, awardedXP: 0, awardedCP: 0, awardedCoins: 0 };
	}

	// Delegate reward distribution to the shared pipeline.
	const result = await awardQuestRewards(app.vault, quest);
	return { changed: true, ...result };
}

async function persistQuestUncomplete(app: App, quest: Quest): Promise<boolean> {
	const file = app.vault.getAbstractFileByPath("GamifiedTasks.md");
	if (!(file instanceof TFile)) return false;
	const content = await app.vault.read(file);
	const lines = content.split("\n");
	const index = findQuestLineIndex(lines, quest);
	if (index === -1) return false;
	if (lines[index].includes("- [ ]")) return false;
	lines[index] = lines[index].replace("- [x]", "- [ ]");
	await app.vault.modify(file, lines.join("\n"));
	return true;
}

async function persistQuestDateMove(
	app: App,
	quest: Quest,
	targetDateISO: string,
	todayISO: string
): Promise<void> {
	const file = app.vault.getAbstractFileByPath("GamifiedTasks.md");
	if (!(file instanceof TFile)) return;
	const content = await app.vault.read(file);
	const lines = content.split("\n");
	const index = findQuestLineIndex(lines, quest);
	if (index === -1) return;
	lines[index] = applyDateMoveToLine(lines[index], targetDateISO, todayISO);
	await app.vault.modify(file, lines.join("\n"));
}

function findQuestLineIndex(lines: string[], quest: Quest): number {
	const title = (quest.title || "").trim();
	const id = (quest.id || "").trim();
	let idx = lines.findIndex((line) => line.includes("#gamified-task") && title && line.includes(title));
	if (idx !== -1) return idx;
	idx = lines.findIndex((line) => line.includes("#gamified-task") && id && line.includes(id));
	return idx;
}

function applyGroupMoveToLine(line: string, targetGroup: InboxGroupId, todayISO: string): string {
	let updated = line;
	const nowIso = new Date().toISOString();

	// Remove stale status/today tags and time hints we manage.
	updated = updated
		.replace(/\s#status\/[^\s]+/g, "")
		.replace(/\s#today\/[^\s]+/g, "")
		.replace(/\s#due\/[^\s]+/g, "");

	// Strip due markers for unscheduled movement.
	if (targetGroup === "unscheduled") {
		updated = updated
			.replace(/📅\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?/g, "")
			.replace(/due::\s*\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?/gi, "")
			.replace(/due:\s*\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?/gi, "");
	}

	// Ensure metadata segment exists for modified/today markers.
	if (!updated.includes("//")) {
		updated = `${updated} //`;
	}
	updated = upsertMetaField(updated, "modified", nowIso);

	switch (targetGroup) {
		case "now":
		case "today":
			updated = updated
				.replace(/📅\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?/g, "")
				.replace(/due::\s*\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?/gi, "")
				.replace(/due:\s*\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?/gi, "");
			updated = upsertMetaField(updated, "due", todayISO);
			updated = upsertMetaField(updated, "today", "true");
			updated += " #today/true #status/active";
			break;
		case "unscheduled":
			updated = upsertMetaField(updated, "today", "false");
			updated += " #today/false #status/active";
			break;
		case "abandon":
			updated = upsertMetaField(updated, "today", "false");
			updated += " #today/false #status/abandoned";
			break;
		case "overdue":
		default:
			break;
	}

	return updated.replace(/\s{2,}/g, " ").trim();
}

function applyDateMoveToLine(line: string, targetDateISO: string, todayISO: string): string {
	let updated = line;
	const nowIso = new Date().toISOString();
	updated = updated
		.replace(/\s#status\/[^\s]+/g, "")
		.replace(/\s#today\/[^\s]+/g, "")
		.replace(/\s#due\/[^\s]+/g, "")
		.replace(/📅\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?/g, "")
		.replace(/due::\s*\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?/gi, "")
		.replace(/due:\s*\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?/gi, "");
	if (!updated.includes("//")) {
		updated = `${updated} //`;
	}
	updated = upsertMetaField(updated, "modified", nowIso);
	updated = upsertMetaField(updated, "due", targetDateISO);
	const isToday = targetDateISO === todayISO;
	updated = upsertMetaField(updated, "today", isToday ? "true" : "false");
	updated += isToday ? " #today/true #status/active" : " #today/false #status/active";
	return updated.replace(/\s{2,}/g, " ").trim();
}

function upsertMetaField(line: string, key: string, value: string): string {
	const marker = "//";
	const markerIndex = line.indexOf(marker);
	if (markerIndex === -1) return `${line} // ${key}: ${value}`;
	const before = line.slice(0, markerIndex + marker.length);
	const after = line.slice(markerIndex + marker.length).trim();

	const parts = after
		.split("|")
		.map((part) => part.trim())
		.filter(Boolean);
	let found = false;
	const nextParts = parts.map((part) => {
		if (part.toLowerCase().startsWith(`${key.toLowerCase()}:`)) {
			found = true;
			return `${key}: ${value}`;
		}
		return part;
	});
	if (!found) nextParts.push(`${key}: ${value}`);
	return `${before} ${nextParts.join(" | ")}`.trim();
}

function firstMeaningfulTag(tags?: string[]): string | null {
	if (!tags || tags.length === 0) return null;
	const cleaned = tags
		.map((tag) => tag.replace(/^#/, "").trim())
		.filter((tag) => tag.length > 0 && tag.toLowerCase() !== "gamified-task");
	return cleaned[0] || null;
}

export { SidebarQuestViewComponent };
export default SidebarQuestViewComponent;

export class SidebarQuestBoardView extends ItemView {
	root: Root | null = null;
	plugin: GamifiedObsidianPlugin;

	constructor(leaf: WorkspaceLeaf, plugin: GamifiedObsidianPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType() {
		return SIDEBAR_QUEST_VIEW_TYPE;
	}

	getDisplayText() {
		return "Sidebar Quest Board";
	}

	async onOpen() {
		const container = this.containerEl.children[1];
		this.root = createRoot(container);
		this.root.render(<SidebarQuestViewComponent app={this.app} plugin={this.plugin} />);
	}

	async onClose() {
		if (this.root) {
			this.root.unmount();
			this.root = null;
		}
	}
}
