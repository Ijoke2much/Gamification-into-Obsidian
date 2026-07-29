import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { App, TFile, ItemView, WorkspaceLeaf } from 'obsidian';
import { createRoot, Root } from "react-dom/client";
import type { Quest } from "../../features/quests/utils/taskParser";
import {
	parseQuestsFromMarkdown,
	normalizeQuestTimelineTheme,
	resolveQuestRef,
} from "../../features/quests/utils/taskParser";
import {
	describeQuestPersistFailure,
	describeQuestUncompleteFailure,
	persistQuestCompletion,
	persistQuestUncomplete,
} from "../../features/quests/utils/questPersistence";
import type GamifiedObsidianPlugin from "../../core/main";
import { QuestDetailModal } from "../../features/quests/modals/QuestDetailModal";
import { QuestModal } from "../../features/quests/modals/QuestModal";
import { readPlayerData } from "../../features/player/utils/playerDataUtils";
import { EnergyCalculationService } from "../../features/quests/services/energyCalculationService";
import { QuestCalendarView } from "../../features/quests/components/QuestCalendarView";
import { emitQuestCompletionFeedback, type QuestRewardResult } from "../../shared/utils/questCompletionPipeline";
import { tryClaimQuestDailyClearBonus } from "../../shared/utils/dailyClearBonus";
import { CeremonyHost } from "../../shared/components/ui/CeremonyHost";
import {
	loadAllQuests,
	registerQuestVaultWatchers,
} from "../../features/quests/utils/questNoteService";
import { launchPomodoroForQuest } from "../../features/pomodoro/utils/launchPomodoroForQuest";
import styles from "./SidebarQuestView.module.css";
import { pixelNotice } from '../../shared/utils/noticeUtils';
import { onSettingsUpdated } from '../../shared/utils/settingsEvents';
import { getAppliedVisualTheme } from '../../shared/utils/visualThemeManager';
import {
	getQuestProjectSlug,
	isRegularTaskQuest,
	parseQuestHubSection,
	slugifyProjectId,
	buildContractHeaderMarkdown,
	buildProjectSummaries,
	getProjectsFilePath,
	appendProjectStep,
	appendWaypointChecklistItem,
	findQuestLineIndex,
	listOpenContractTitles,
	QUEST_HUB_SECTION_KEY,
	type ProjectSummary,
	type QuestHubSection,
} from '../../features/quests/utils/questProjectUtils';
import { isClosedContract } from '../../features/quests/utils/projectContractDisplay';
import { getAllSkills, type SkillMetadata } from '../../shared/utils/skillDiscovery';
import hubStyles from './components/QuestHubPanels.module.css';
import { QuestHubNav } from './components/QuestHubNav';
import {
	QuestProjectsPanel,
	type NewContractInput,
	type TurnInResult,
} from './components/QuestProjectsPanel';
import { QuestJourneyPanel } from './components/QuestJourneyPanel';
import { QuestDungeonPanel } from './components/QuestDungeonPanel';
import { CaptureInboxPanel } from './components/CaptureInboxPanel';
import { MobileQuestDayPicker } from './components/MobileQuestDayPicker';
import {
	MobileDayAgenda,
	type MobileDayAgendaHandle,
} from './components/MobileDayAgenda';
import { TodayRunStrip } from './components/TodayRunStrip';
import { openQuickCaptureModal } from '../../features/quests/modals/QuickCaptureModal';
import {
	getCaptureTagPresets,
	loadCaptures,
	openCaptureFile,
	promoteCaptureToTodayInbox,
	removeCaptureLine,
	shouldReloadCapturesOnFileChange,
} from '../../features/quests/utils/captureService';
import { openFocusCheckInModal } from '../../features/focus/modals/FocusCheckInModal';
import {
	isFocusCheckInDue,
	subscribeFocusCheckInChanges,
} from '../../features/focus/utils/focusCheckInService';
import {
	getLocalDateString,
	isCompletedToday,
	isHabitScheduledOnLocalDate,
	loadHabitsFromFile,
} from '../../features/habits/utils/habitsUtils';
import { useMobileOptimizations } from '../../shared/hooks/useMobileOptimizations';
import { isLikelyMobileDevice } from '../../shared/utils/deviceDetect';

export const SIDEBAR_QUEST_VIEW_TYPE = "sidebar-quest-view";

const ACTIVE_CONTRACT_PIN_KEY = 'gamification-active-contract-pin';
const DEFAULT_PLANNER_START_HOUR = 0;
const DEFAULT_PLANNER_END_HOUR = 23;
const INBOX_COLLAPSE_KEY = "sidebarQuestInboxCollapseState.v1";
const CALENDAR_COLLAPSE_KEY = "sidebarQuestCalendarCollapse.v1";
const CAPTURE_COLLAPSE_KEY = "sidebarCaptureInboxCollapse.v1";
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

function emitQuestCompletionNotices(
	result: QuestRewardResult,
	settings: GamifiedObsidianPlugin['settings']
): void {
	emitQuestCompletionFeedback(result, settings);
}

const SidebarQuestViewComponent: React.FC<SidebarQuestViewProps> = ({ app, plugin }) => {
	const [allQuests, setAllQuests] = useState<Quest[]>([]);
	const [quests, setQuests] = useState<Quest[]>([]);
	const [hubSection, setHubSection] = useState<QuestHubSection>(() => {
		try {
			return parseQuestHubSection(localStorage.getItem(QUEST_HUB_SECTION_KEY));
		} catch {
			return 'tasks';
		}
	});
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
	const [contractSkills, setContractSkills] = useState<SkillMetadata[]>([]);
	const [visualThemeRevision, setVisualThemeRevision] = useState(0);
	const appliedVisualTheme = useMemo(
		() => getAppliedVisualTheme(),
		[visualThemeRevision]
	);

	useEffect(() => onSettingsUpdated(() => setVisualThemeRevision((n) => n + 1)), []);

	// Inbox filters
	const [projectFilter, setProjectFilter] = useState<{ slug: string; title: string } | null>(null);
	const [tagFilter, setTagFilter] = useState("all");
	const [priorityFilter, setPriorityFilter] = useState("all");
	const [difficultyFilter, setDifficultyFilter] = useState("all");
	const [collapsedGroups, setCollapsedGroups] = useState<Record<InboxGroupId, boolean>>(
		() => loadCollapsedGroups()
	);
	const [dragState, setDragState] = useState<DragState | null>(null);
	const [activeDropZone, setActiveDropZone] = useState<InboxGroupId | null>(null);
	const [calendarCollapsed, setCalendarCollapsed] = useState<boolean>(() => loadCalendarCollapsed());
	const [captures, setCaptures] = useState<Quest[]>([]);
	const [captureCollapsed, setCaptureCollapsed] = useState<boolean>(() => loadCaptureCollapsed());
	const [captureTagFilter, setCaptureTagFilter] = useState('all');
	const [captureShowAll, setCaptureShowAll] = useState(false);
	const [promotingCapture, setPromotingCapture] = useState<Quest | null>(null);
	const [createDueISO, setCreateDueISO] = useState<string | undefined>(undefined);
	const [currentTime, setCurrentTime] = useState(() => new Date());
	const mobileAgendaRef = useRef<MobileDayAgendaHandle | null>(null);
	const [dayScheduleOpen, setDayScheduleOpen] = useState(false);
	const [mobileTimelineMenuId, setMobileTimelineMenuId] = useState<string | null>(null);
	const dayScheduleShellRef = useRef<HTMLDivElement | null>(null);
	const { isMobile } = useMobileOptimizations();
	const [checkInDue, setCheckInDue] = useState(false);
	const [habitDueTotal, setHabitDueTotal] = useState<number | null>(null);
	const [habitRemaining, setHabitRemaining] = useState<number | null>(null);
	const [questsReady, setQuestsReady] = useState(false);
	/** Mobile day plan starts open so the agenda is visible without an extra tap. */
	const [dayPlanExpanded, setDayPlanExpanded] = useState(true);
	/** Mobile ADHD filters — desktop ignores these. */
	const [todayOnly, setTodayOnly] = useState(() => isLikelyMobileDevice());
	const [fitEnergy, setFitEnergy] = useState(false);

	const loadCapturesList = async () => {
		try {
			const items = await loadCaptures(app, plugin.settings);
			setCaptures(items);
		} catch (error) {
			console.error('Error loading capture inbox:', error);
		}
	};

	const loadQuests = async () => {
		try {
			const merged = await loadAllQuests(app, plugin.settings);
			setAllQuests(merged);
			setQuests(merged.filter((q) => !q.completed));
			setQuestsReady(true);
		} catch (error) {
			console.error("Error loading sidebar quests:", error);
			setQuestsReady(true);
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
		let cancelled = false;
		const boot = async () => {
			await loadQuests();
			if (cancelled) return;

			// Energy is cheap and needed for filters; load next.
			await loadEnergy();
			if (cancelled) return;

			if (isMobile) {
				// Defer capture inbox — not needed for Today's Run first paint
				window.setTimeout(() => {
					if (!cancelled) void loadCapturesList();
				}, 500);
			} else {
				void loadCapturesList();
				void getAllSkills(app.vault)
					.then(setContractSkills)
					.catch((error) => console.error('Failed to load skills for contract form:', error));
			}
		};
		void boot();

		const cleanupWatchers = registerQuestVaultWatchers(
			app.vault,
			plugin.settings,
			() => void loadQuests()
		);
		const onCaptureVaultChange = (file: TFile) => {
			if (shouldReloadCapturesOnFileChange(file.path, plugin.settings)) {
				void loadCapturesList();
			}
		};
		app.vault.on('modify', onCaptureVaultChange as never);
		app.vault.on('create', onCaptureVaultChange as never);
		app.vault.on('delete', onCaptureVaultChange as never);
		const onPlayerUpdated = () => loadEnergy();
		document.addEventListener("player-data-updated", onPlayerUpdated);

		return () => {
			cancelled = true;
			cleanupWatchers();
			app.vault.off('modify', onCaptureVaultChange as never);
			app.vault.off('create', onCaptureVaultChange as never);
			app.vault.off('delete', onCaptureVaultChange as never);
			document.removeEventListener("player-data-updated", onPlayerUpdated);
		};
	}, [app, plugin.app.vault, plugin.settings, isMobile]);

	// Desktop loads skills on boot; mobile only when Projects or quest modal needs them
	useEffect(() => {
		if (!isMobile) return;
		if (hubSection !== 'projects' && !isQuestModalOpen) return;
		if (contractSkills.length > 0) return;
		let cancelled = false;
		void getAllSkills(app.vault)
			.then((skills) => {
				if (!cancelled) setContractSkills(skills);
			})
			.catch((error) => console.error('Failed to load skills for contract form:', error));
		return () => {
			cancelled = true;
		};
	}, [isMobile, hubSection, isQuestModalOpen, app.vault, contractSkills.length]);

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
		try {
			localStorage.setItem(CAPTURE_COLLAPSE_KEY, captureCollapsed ? '1' : '0');
		} catch {
			// Ignore storage write failures.
		}
	}, [captureCollapsed]);

	useEffect(() => {
		setCaptureShowAll(false);
	}, [captureTagFilter]);

	useEffect(() => {
		const timer = window.setInterval(() => setCurrentTime(new Date()), 60_000);
		return () => window.clearInterval(timer);
	}, []);

	useEffect(() => {
		if (!dayScheduleOpen) return;
		const onPointerDown = (e: PointerEvent) => {
			if (!dayScheduleShellRef.current) return;
			if (!dayScheduleShellRef.current.contains(e.target as Node)) {
				setDayScheduleOpen(false);
			}
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") setDayScheduleOpen(false);
		};
		document.addEventListener("pointerdown", onPointerDown);
		document.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("pointerdown", onPointerDown);
			document.removeEventListener("keydown", onKey);
		};
	}, [dayScheduleOpen]);

	useEffect(() => {
		try {
			localStorage.setItem(QUEST_HUB_SECTION_KEY, hubSection);
		} catch {
			// Ignore storage write failures.
		}
	}, [hubSection]);

	useEffect(() => {
		const handler = (e: Event) => {
			const section = (e as CustomEvent<{ section?: QuestHubSection }>).detail?.section;
			if (section) setHubSection(section);
		};
		window.addEventListener('gamification-quest-hub-focus', handler);
		return () => window.removeEventListener('gamification-quest-hub-focus', handler);
	}, []);

	const taskQuests = useMemo(() => quests.filter(isRegularTaskQuest), [quests]);

	const openContractOptions = useMemo(() => {
		const summaries = buildProjectSummaries(allQuests);
		return listOpenContractTitles(summaries, isClosedContract);
	}, [allQuests]);

	const defaultContractTitle = useMemo(() => {
		const summaries = buildProjectSummaries(allQuests);
		try {
			const pinnedId = localStorage.getItem(ACTIVE_CONTRACT_PIN_KEY);
			if (!pinnedId) return undefined;
			const pinned = summaries.find((p) => p.id === pinnedId && !isClosedContract(p));
			return pinned?.title;
		} catch {
			return undefined;
		}
	}, [allQuests]);

	const availableTags = useMemo(() => {
		return Array.from(new Set(taskQuests.flatMap((q) => q.tags || []))).sort();
	}, [taskQuests]);

	const filteredQuests = useMemo(() => {
		return taskQuests.filter((quest) => {
			if (projectFilter && getQuestProjectSlug(quest) !== projectFilter.slug) return false;
			if (tagFilter !== "all" && !(quest.tags || []).includes(tagFilter)) return false;
			if (priorityFilter !== "all" && (quest.priority || "none").toLowerCase() !== priorityFilter) return false;
			if (difficultyFilter !== "all" && (quest.difficulty || "none").toLowerCase() !== difficultyFilter) return false;
			// Mobile-only ADHD filters (desktop never applies these).
			// Keep unscheduled visible — that's the brain-dump → timeblock pile.
			if (isMobile && todayOnly) {
				const group = classifyInboxGroup(quest, {
					todayISO: toISODate(currentTime),
					now: currentTime,
				});
				if (
					group !== "now" &&
					group !== "today" &&
					group !== "overdue" &&
					group !== "unscheduled"
				) {
					return false;
				}
			}
			if (isMobile && fitEnergy) {
				const cost = quest.energyCost ?? 10;
				if (cost > currentEnergy) return false;
			}
			return true;
		});
	}, [
		taskQuests,
		projectFilter,
		tagFilter,
		priorityFilter,
		difficultyFilter,
		isMobile,
		todayOnly,
		fitEnergy,
		currentEnergy,
		currentTime,
	]);

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
		if (isMobile && !dayPlanExpanded) return [];
		return filteredQuests
			.filter((quest) => isSameDate(quest.due, selectedDateISO) && hasTime(quest.due))
			.map((quest) => {
				const start = quest.due ? new Date(quest.due) : new Date();
				const duration = parseMinutes(quest.estimatedTime) || 60;
				const end = new Date(start.getTime() + duration * 60000);
				return { quest, start, end, duration, mode: "scheduled" as const };
			})
			.sort((a, b) => a.start.getTime() - b.start.getTime());
	}, [filteredQuests, selectedDateISO, isMobile, dayPlanExpanded]);

	const flexibleTimelineBlocks = useMemo(() => {
		if (isMobile && !dayPlanExpanded) return [];
		const sameDayFloating = filteredQuests.filter((quest) => {
			if (timedTimelineBlocks.some((block) => block.quest.id === quest.id)) return false;
			if (isSameDate(quest.due, selectedDateISO) && !hasTime(quest.due)) return true;
			if (!quest.due && selectedDateISO === todayISO) return true;
			if (quest.today && selectedDateISO === todayISO) return true;
			return false;
		});
		return placeFlexibleBlocks(sameDayFloating, selectedDate, 9, "floating");
	}, [filteredQuests, selectedDate, selectedDateISO, timedTimelineBlocks, todayISO, isMobile, dayPlanExpanded]);

	const timelineBlocks = useMemo(() => {
		return [...timedTimelineBlocks, ...flexibleTimelineBlocks].sort(
			(a, b) => a.start.getTime() - b.start.getTime()
		);
	}, [timedTimelineBlocks, flexibleTimelineBlocks]);

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

	useEffect(() => {
		if (selectedDateISO !== todayISO) return;
		// Defer so the agenda has painted the Now marker.
		const id = window.setTimeout(() => {
			mobileAgendaRef.current?.scrollToNow("auto");
		}, 50);
		return () => window.clearTimeout(id);
	}, [selectedDateISO, todayISO, plannerStartHour, plannerEndHour]);

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

	const todayRunQuests = useMemo(
		() => [...inboxByGroup.now, ...inboxByGroup.today],
		[inboxByGroup.now, inboxByGroup.today]
	);

	const nextUpQuest = useMemo(() => {
		const timed = todayRunQuests
			.filter((q) => q.due && hasTime(q.due))
			.sort(
				(a, b) =>
					new Date(a.due!).getTime() - new Date(b.due!).getTime()
			);
		return timed[0] ?? inboxByGroup.now[0] ?? inboxByGroup.today[0] ?? null;
	}, [todayRunQuests, inboxByGroup.now, inboxByGroup.today]);

	const todayDateLabel = useMemo(
		() =>
			currentTime.toLocaleDateString(undefined, {
				weekday: 'short',
				month: 'short',
				day: 'numeric',
			}),
		[currentTime]
	);

	useEffect(() => {
		if (!isMobile) {
			setHabitDueTotal(null);
			setHabitRemaining(null);
			return;
		}
		let cancelled = false;
		const refreshHabits = async () => {
			try {
				const habits = await loadHabitsFromFile(app.vault);
				const today = getLocalDateString();
				const due = habits.filter(
					(h) => !h.archived && isHabitScheduledOnLocalDate(h, today)
				);
				if (cancelled) return;
				setHabitDueTotal(due.length);
				setHabitRemaining(due.filter((h) => !isCompletedToday(h)).length);
			} catch {
				if (!cancelled) {
					setHabitDueTotal(null);
					setHabitRemaining(null);
				}
			}
		};
		// Defer habit scan until after first quest paint
		const startId = window.setTimeout(() => void refreshHabits(), 350);
		const interval = window.setInterval(() => void refreshHabits(), 90_000);
		return () => {
			cancelled = true;
			window.clearTimeout(startId);
			window.clearInterval(interval);
		};
	}, [app.vault, isMobile]);

	useEffect(() => {
		if (!isMobile) {
			setCheckInDue(false);
			return;
		}
		if (plugin.settings.enableFocusCheckIns === false) {
			setCheckInDue(false);
			return;
		}
		let cancelled = false;
		const refresh = async () => {
			const due = await isFocusCheckInDue(app, plugin.settings);
			if (!cancelled) setCheckInDue(due);
		};
		const startId = window.setTimeout(() => void refresh(), 400);
		const unsub = subscribeFocusCheckInChanges(() => {
			void refresh();
		});
		const interval = window.setInterval(() => void refresh(), 60_000);
		return () => {
			cancelled = true;
			window.clearTimeout(startId);
			unsub();
			window.clearInterval(interval);
		};
	}, [app, plugin.settings, isMobile]);

	const openCreate = () => {
		setEditingQuest(null);
		setPromotingCapture(null);
		setCreateDueISO(undefined);
		setIsQuestModalOpen(true);
	};

	const openCreateForDate = (date: Date) => {
		const y = date.getFullYear();
		const m = `${date.getMonth() + 1}`.padStart(2, "0");
		const d = `${date.getDate()}`.padStart(2, "0");
		setEditingQuest(null);
		setPromotingCapture(null);
		setCreateDueISO(`${y}-${m}-${d}`);
		setIsQuestModalOpen(true);
	};

	const openCreateAtMinutes = (minutesFromMidnight: number) => {
		const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.floor(minutesFromMidnight)));
		const hh = String(Math.floor(clamped / 60)).padStart(2, "0");
		const mm = String(clamped % 60).padStart(2, "0");
		const y = selectedDate.getFullYear();
		const mo = `${selectedDate.getMonth() + 1}`.padStart(2, "0");
		const d = `${selectedDate.getDate()}`.padStart(2, "0");
		setEditingQuest(null);
		setPromotingCapture(null);
		setCreateDueISO(`${y}-${mo}-${d}T${hh}:${mm}`);
		setIsQuestModalOpen(true);
	};

	const handleQuickCapture = () => {
		openQuickCaptureModal(app, plugin.settings);
		// Refresh capture list after modal may have written — don't block open
		window.setTimeout(() => {
			void loadCapturesList().then(() => {
				if (isMobile) setCaptureCollapsed(false);
			});
		}, 900);
	};

	const handleAddCaptureToTodayInbox = async (quest: Quest) => {
		try {
			const ok = await promoteCaptureToTodayInbox(app, plugin.settings, quest);
			if (ok) {
				pixelNotice("Added to today's inbox", 2000);
				await loadCapturesList();
				await loadQuests();
			}
		} catch (error) {
			console.error('Failed to add capture to today inbox:', error);
			pixelNotice("Could not add to today's inbox", 2500);
		}
	};

	const handlePromoteCapture = (quest: Quest) => {
		setPromotingCapture(quest);
		setEditingQuest(null);
		setIsQuestModalOpen(true);
	};

	const handleDismissCapture = async (quest: Quest) => {
		try {
			const removed = await removeCaptureLine(app, plugin.settings, quest);
			if (removed) {
				pixelNotice('Capture dismissed', 1500);
				await loadCapturesList();
			}
		} catch (error) {
			console.error('Failed to dismiss capture:', error);
			pixelNotice('Could not dismiss capture', 2500);
		}
	};

	const handleOpenCaptureFile = () => {
		void openCaptureFile(app, plugin.settings);
	};

	const captureTagPresets = useMemo(
		() => getCaptureTagPresets(plugin.settings),
		[plugin.settings]
	);

	const openDetails = (quest: Quest) => {
		setSelectedQuest(quest);
		setDetailOpen(true);
	};

	const handleContinueOnTasks = (projectSlug: string, projectTitle: string) => {
		setProjectFilter({ slug: projectSlug, title: projectTitle });
		setHubSection('tasks');
		pixelNotice(`🗡️ Showing tasks for: ${projectTitle}`);
	};

	const handleOpenContract = async (project: ProjectSummary) => {
		const headerQuest = project.headerQuest;
		const contractPath = headerQuest?.filePath ?? project.tasks[0]?.filePath ?? null;
		if (contractPath) {
			const file = app.vault.getAbstractFileByPath(contractPath);
			if (file instanceof TFile) {
				const leaf = app.workspace.getLeaf(false);
				await leaf.openFile(file);
				return;
			}
		}
		// Fallback: show the contract header (or first task) in the detail modal.
		const fallbackQuest = headerQuest ?? project.tasks[0] ?? null;
		if (fallbackQuest) {
			openDetails(fallbackQuest);
		} else {
			pixelNotice('📜 No contract note found for this project.');
		}
	};

	const handleTurnInContract = async (project: ProjectSummary): Promise<TurnInResult | null> => {
		const header = project.headerQuest
			? resolveQuestRef(allQuests, project.headerQuest)
			: undefined;
		if (!header) {
			pixelNotice('📜 This contract has no header to turn in.');
			return null;
		}
		try {
			const result = await persistQuestCompletion(app, header, true, plugin.settings);
			await loadQuests();
			if (!result.changed) {
				if (result.failureReason) {
					pixelNotice(describeQuestPersistFailure(result.failureReason, header, 'turn_in'), 4000);
				}
				return null;
			}
			return {
				xp: result.awardedXP,
				coins: result.awardedCoins,
				cp: result.awardedCP,
			};
		} catch (error) {
			console.error('Failed to turn in contract:', error);
			pixelNotice('Could not turn in the contract. Please try again.', 3500);
			return null;
		}
	};

	const handleAddChecklistItem = async (
		project: ProjectSummary,
		waypoint: Quest,
		title: string
	): Promise<boolean> => {
		const stepTitle = title.trim();
		if (!stepTitle) return false;
		if (!waypoint) {
			pixelNotice('Add a waypoint first (+ NEW WAYPOINT).', 3000);
			return false;
		}
		try {
			await appendWaypointChecklistItem(app, waypoint, stepTitle);
			await loadQuests();
			pixelNotice(`✓ Checklist item added to "${waypoint.title}"`, 2500);
			return true;
		} catch (error) {
			console.error('Failed to add checklist item:', error);
			const message = error instanceof Error ? error.message : 'Unknown error';
			pixelNotice(`Could not add checklist item: ${message}`, 4000);
			return false;
		}
	};

	const handleAddProjectWaypoint = async (project: ProjectSummary, title: string): Promise<boolean> => {
		const stepTitle = title.trim();
		if (!stepTitle) return false;
		try {
			await appendProjectStep(app, plugin.settings, project, stepTitle, contractSkills);
			await loadQuests();
			pixelNotice(`🗺️ New waypoint: ${stepTitle}`, 2500);
			return true;
		} catch (error) {
			console.error('Failed to add project waypoint:', error);
			pixelNotice('Could not add the waypoint. Please try again.', 3000);
			return false;
		}
	};

	const handleEditContract = (project: ProjectSummary) => {
		const header = project.headerQuest;
		if (header) {
			handleEditQuest(header);
		} else {
			pixelNotice('📜 This contract has no header note to edit yet.');
		}
	};

	const handleAbandonContract = async (project: ProjectSummary): Promise<boolean> => {
		const header = project.headerQuest
			? resolveQuestRef(allQuests, project.headerQuest)
			: undefined;
		if (!header) {
			pixelNotice('📜 This contract has no header to abandon.');
			return false;
		}
		const confirmed = window.confirm(
			`Abandon "${project.title}"? The contract closes without payout. ` +
			'(You can reopen it by unchecking the header in its note.)'
		);
		if (!confirmed) return false;
		try {
			const result = await persistQuestCompletion(app, header, false);
			await loadQuests();
			if (!result.changed) {
				if (result.failureReason) {
					pixelNotice(describeQuestPersistFailure(result.failureReason, header, 'abandon'), 4000);
				}
				return false;
			}
			pixelNotice(`🏳️ Contract abandoned: ${project.title} — no payout.`, 3500);
			return true;
		} catch (error) {
			console.error('Failed to abandon contract:', error);
			pixelNotice('Could not abandon the contract. Please try again.', 3500);
			return false;
		}
	};

	const handleToggleSubtask = async (questRef: Quest | string, subtaskIndex: number) => {
		try {
			const quest = resolveQuestRef(allQuests, questRef);
			if (!quest) {
				pixelNotice('Could not find that quest.', 2500);
				return;
			}
			const file = app.vault.getAbstractFileByPath(quest.filePath || "GamifiedTasks.md");
			if (!(file instanceof TFile)) {
				pixelNotice(`Quest file not found: ${quest.filePath || 'GamifiedTasks.md'}`, 3500);
				return;
			}
			const content = await app.vault.read(file);
			const lines = content.split("\n");
			const questLineIndex = findQuestLineIndex(lines, quest);
			if (questLineIndex === -1) {
				pixelNotice('Could not find the quest line in its note.', 3000);
				return;
			}
			const subtaskLineIndex = findSubtaskLineIndex(lines, questLineIndex, subtaskIndex);
			if (subtaskLineIndex === -1) {
				pixelNotice('Could not find that checklist item in the note.', 3000);
				return;
			}
			const line = lines[subtaskLineIndex];
			lines[subtaskLineIndex] = line.includes("- [ ]")
				? line.replace("- [ ]", "- [x]")
				: line.replace(/- \[[xX]\]/, "- [ ]");
			await app.vault.modify(file, lines.join("\n"));
			await loadQuests();
		} catch (error) {
			console.error("Failed to toggle subtask from sidebar:", error);
			pixelNotice("Could not update the subtask. Please try again.", 3000);
		}
	};

	const getContractFilePath = (): string => getProjectsFilePath(plugin.settings);

	const handleCreateContract = async (input: NewContractInput): Promise<string | null> => {
		const title = input.name.trim();
		if (!title) return null;
		if (!input.skill.trim()) {
			pixelNotice('Pick a skill for this contract.', 3000);
			return null;
		}
		try {
			const duplicate = allQuests.some(
				(q) => slugifyProjectId(q.title) === slugifyProjectId(title)
			);
			if (duplicate) {
				pixelNotice(`📜 A contract or quest named "${title}" already exists.`, 3500);
				return null;
			}

			const skillMeta = contractSkills.find((s) => s.name === input.skill);
			const block = buildContractHeaderMarkdown({
				name: title,
				description: input.description,
				due: input.due || undefined,
				xp: input.xp,
				cp: input.cp,
				coins: input.coins,
				difficulty: input.difficulty || undefined,
				priority: input.priority,
				skillName: input.skill,
				skillClass: skillMeta?.class,
			});

			const path = getContractFilePath();
			const file = app.vault.getAbstractFileByPath(path);
			if (file instanceof TFile) {
				const content = await app.vault.read(file);
				const base = content.replace(/\n*$/, "");
				await app.vault.modify(file, `${base}\n\n${block}\n`);
			} else {
				await app.vault.create(path, `# Gamified Projects\n\n${block}\n`);
			}

			await loadQuests();
			pixelNotice(`📜 New contract posted: ${title}`, 3500);
			return slugifyProjectId(title);
		} catch (error) {
			console.error("Failed to create contract:", error);
			pixelNotice("Could not create the contract. Please try again.", 3500);
			return null;
		}
	};

	const handleEditQuest = (quest: Quest) => {
		setDetailOpen(false);
		setEditingQuest(quest);
		setIsQuestModalOpen(true);
	};

	const handleQuestModalClose = () => {
		setIsQuestModalOpen(false);
		setEditingQuest(null);
		setPromotingCapture(null);
		setCreateDueISO(undefined);
	};

	const handleQuestModalSubmit = async () => {
		if (promotingCapture) {
			try {
				await removeCaptureLine(app, plugin.settings, promotingCapture);
				await loadCapturesList();
			} catch (error) {
				console.error('Failed to remove promoted capture:', error);
			}
		}
		setIsQuestModalOpen(false);
		setEditingQuest(null);
		setPromotingCapture(null);
		setCreateDueISO(undefined);
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

	const handleQuestComplete = async (ref: Quest | string) => {
		try {
			const quest = resolveQuestRef(allQuests, ref);

			if (!quest) {
				pixelNotice('Could not find that quest.', 2500);
				return;
			}

			const openSubtasks = quest.subtasks?.filter((s) => !s.completed) ?? [];
			if (openSubtasks.length > 0) {
				pixelNotice(
					`Finish the checklist first (${quest.subtasks!.length - openSubtasks.length}/${quest.subtasks!.length} done).`,
					3500
				);
				return;
			}

			const result = await persistQuestCompletion(app, quest, true, plugin.settings);
			await loadQuests();
			if (result.changed) {
				emitQuestCompletionNotices(result, plugin.settings);
				await claimQuestClearIfDone(quest.id);
			} else if (result.failureReason) {
				pixelNotice(describeQuestPersistFailure(result.failureReason, quest, 'complete'), 4000);
			}
		} catch (error) {
			console.error('Failed to complete quest from sidebar calendar:', error);
			pixelNotice('Could not complete the quest. Please try again.', 3500);
		}
	};

	const handleQuestUncomplete = async (ref: Quest | string) => {
		try {
			const quest = resolveQuestRef(allQuests, ref);
			if (!quest) {
				pixelNotice('Could not find that quest.', 2500);
				return;
			}
			const result = await persistQuestUncomplete(app, quest);
			await loadQuests();
			if (result.changed) {
				pixelNotice(`Reopened "${getQuestDisplayTitle(quest)}"`, 2500);
				if (result.journeyHpRestored != null && result.journeyHpRestored > 0) {
					pixelNotice(`Journey +${result.journeyHpRestored} HP restored`, 2800);
				}
			} else if (result.failureReason) {
				pixelNotice(describeQuestUncompleteFailure(result.failureReason, quest), 3500);
			}
		} catch (error) {
			console.error("Failed to uncomplete quest from sidebar details:", error);
			pixelNotice("Could not reopen quest. Please try again.", 3500);
		}
	};

	const handleQuestMove = async (questId: string, newDate: string) => {
		try {
			const quest = quests.find((q) => q.id === questId || q.title === questId);
			const file = app.vault.getAbstractFileByPath(quest?.filePath || "GamifiedTasks.md");
			if (!(file instanceof TFile)) return;
			const content = await app.vault.read(file);
			const lines = content.split("\n");
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
			pixelNotice(`Moved "${questName}" to ${groupTitle(targetGroup)}`, 2500);
		} catch (error) {
			console.error("Failed to move quest between inbox groups:", error);
			pixelNotice("Could not move quest. Please try again.", 3500);
		} finally {
			setDragState(null);
			setActiveDropZone(null);
		}
	};

	const claimQuestClearIfDone = async (completedQuestId?: string) => {
		const remaining = todayRunQuests.filter((q) => q.id !== completedQuestId);
		await tryClaimQuestDailyClearBonus({
			todayInboxCleared: todayRunQuests.length > 0 && remaining.length === 0,
			day: todayISO,
		});
	};

	const handleTimelineComplete = async (quest: Quest) => {
		try {
			const resolved = resolveQuestRef(allQuests, quest) ?? quest;
			const result = await persistQuestCompletion(app, resolved, true, plugin.settings);
			await loadQuests();
			if (result.changed) {
				emitQuestCompletionNotices(result, plugin.settings);
				await claimQuestClearIfDone(resolved.id);
			} else if (result.failureReason) {
				pixelNotice(describeQuestPersistFailure(result.failureReason, resolved, 'complete'), 4000);
			}
		} catch (error) {
			console.error("Failed to complete quest from timeline:", error);
			pixelNotice("Could not complete quest. Please try again.", 3500);
		}
	};

	const handleTimelineMoveByDays = async (quest: Quest, daysToMove: number) => {
		try {
			const baseIso = quest.due?.split("T")[0] || selectedDateISO;
			const timePart = quest.due && hasTime(quest.due) ? quest.due.split("T")[1]?.slice(0, 5) : null;
			const targetDate = new Date(`${baseIso}T00:00:00`);
			if (Number.isNaN(targetDate.getTime())) return;
			targetDate.setDate(targetDate.getDate() + daysToMove);
			const targetIso = timePart
				? `${toISODate(targetDate)}T${timePart}`
				: toISODate(targetDate);
			await persistQuestDueDateTime(app, quest, targetIso, todayISO);
			await loadQuests();
			const label = targetDate.toLocaleDateString([], { month: "short", day: "numeric" });
			pixelNotice(`Moved "${getQuestDisplayTitle(quest)}" to ${label}`, 2500);
		} catch (error) {
			console.error("Failed to move quest from timeline:", error);
			pixelNotice("Could not move quest. Please try again.", 3500);
		}
	};

	const handleTimelineSnoozeMinutes = async (quest: Quest, minutes: number) => {
		try {
			const base =
				quest.due && hasTime(quest.due) ? new Date(quest.due) : new Date();
			if (Number.isNaN(base.getTime())) return;
			base.setMinutes(base.getMinutes() + minutes);
			const hh = String(base.getHours()).padStart(2, "0");
			const mm = String(base.getMinutes()).padStart(2, "0");
			const dueIso = `${toISODate(base)}T${hh}:${mm}`;
			await persistQuestDueDateTime(app, quest, dueIso, todayISO);
			await loadQuests();
			pixelNotice(`Snoozed +${minutes}m → ${hh}:${mm}`, 2200);
		} catch (error) {
			console.error("Failed to snooze quest from timeline:", error);
			pixelNotice("Could not snooze quest. Please try again.", 3500);
		}
	};

	const handleStartFocus = (quest: Quest) => {
		launchPomodoroForQuest(plugin, quest, { mountDelayMs: isMobile ? 650 : 500 });
		pixelNotice(`⏱ Focus: ${getQuestDisplayTitle(quest)}`, 2000);
	};

	const scrollTimelineToNow = (behavior: ScrollBehavior = "smooth") => {
		mobileAgendaRef.current?.scrollToNow(behavior);
	};

	const handleJumpToNow = () => {
		if (isMobile && !dayPlanExpanded) {
			setDayPlanExpanded(true);
		}
		if (selectedDateISO !== todayISO) {
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			setSelectedDate(today);
			window.setTimeout(() => scrollTimelineToNow("smooth"), 80);
			return;
		}
		window.setTimeout(() => scrollTimelineToNow("smooth"), isMobile ? 80 : 0);
	};

	return (
		<>
			{/* Lite on mobile so Quests can still show level-up without heavy rank UI */}
			<CeremonyHost lite={isMobile} />
		<div
			className={`${styles.container} ${styles.pixelSidebarQuestShell}${isMobile ? ` ${styles.mobileTodayRun}` : ''}`}
			data-gamification-theme-root
			data-gamification-visual-theme={appliedVisualTheme.preset}
			data-gamification-shell={appliedVisualTheme.shell}
			data-gamification-mobile={isMobile ? 'true' : 'false'}
			data-pixel-shell="quests"
		>
			<div className={styles.panelHeader}>
				<h2 className={styles.panelTitle}>Quests</h2>
			</div>

			<QuestHubNav
				active={hubSection}
				onChange={setHubSection}
				pixelShell={appliedVisualTheme.preset !== 'system-hunter'}
			/>
			{hubSection === 'tasks' && (
				<>
			{isMobile && (
				<TodayRunStrip
					dateLabel={todayDateLabel}
					questCount={todayRunQuests.length}
					habitRemaining={habitRemaining}
					habitDueTotal={habitDueTotal}
					nextUp={nextUpQuest}
					checkInDue={checkInDue && plugin.settings.enableFocusCheckIns !== false}
					onOpenCheckIn={() => openFocusCheckInModal(app, plugin.settings)}
					onOpenNextUp={openDetails}
					onJumpToNow={handleJumpToNow}
					onFocusNextUp={nextUpQuest ? () => handleStartFocus(nextUpQuest) : undefined}
				/>
			)}
			{isMobile && (
				<div className={styles.mobileFilterRow} role="group" aria-label="Today filters">
					<button
						type="button"
						className={`${styles.mobileFilterChip} ${todayOnly ? styles.mobileFilterChipActive : ''}`}
						onClick={() => setTodayOnly((v) => !v)}
						aria-pressed={todayOnly}
						title="Focus Now / Today / Overdue — To schedule always stays visible"
					>
						[ TODAY ]
					</button>
					<button
						type="button"
						className={`${styles.mobileFilterChip} ${fitEnergy ? styles.mobileFilterChipActive : ''}`}
						onClick={() => setFitEnergy((v) => !v)}
						aria-pressed={fitEnergy}
						title={`Show quests costing ≤ ${currentEnergy} energy`}
					>
						[ ⚡ ENERGY ≤ {currentEnergy} ]
					</button>
				</div>
			)}
			{!questsReady && isMobile && (
				<div className={styles.mobileQuestsLoading}>Loading today's quests…</div>
			)}
			<div className={styles.actionColumn}>
				<button
					type="button"
					className={styles.addButton}
					onClick={openCreate}
				>
					{isMobile ? '[ + ADD QUEST ]' : '+ Add Quest'}
				</button>
				<button
					type="button"
					className={styles.captureButton}
					onClick={handleQuickCapture}
					title="Brain dump — saves to Capture.md"
				>
					{isMobile ? '[ BRAIN DUMP ]' : '🧠 Brain Dump'}
				</button>
				{projectFilter && (
					<span className={hubStyles.projectFilterChip}>
						<span aria-hidden="true">📜</span>
						<span className={hubStyles.projectFilterChipLabel}>{projectFilter.title}</span>
						<button
							type="button"
							className={hubStyles.projectFilterChipClear}
							title="Clear project filter"
							onClick={() => setProjectFilter(null)}
						>
							✕
						</button>
					</span>
				)}
			</div>

			<CaptureInboxPanel
				captures={captures}
				tagPresets={captureTagPresets}
				activeTag={captureTagFilter}
				onTagChange={setCaptureTagFilter}
				collapsed={captureCollapsed}
				onToggleCollapse={() => setCaptureCollapsed((prev) => !prev)}
				onPromote={handlePromoteCapture}
				onAddToTodayInbox={(quest) => void handleAddCaptureToTodayInbox(quest)}
				onDismiss={(quest) => void handleDismissCapture(quest)}
				onOpenCaptureFile={handleOpenCaptureFile}
				showAll={captureShowAll}
				onToggleShowAll={() => setCaptureShowAll((prev) => !prev)}
				lite={isMobile}
			/>

			{isMobile && (
				<MobileQuestDayPicker
					quests={filteredQuests}
					selectedDate={selectedDate}
					onSelectDate={(date) => {
						setSelectedDate(date);
						setDayPlanExpanded(true);
						setMobileTimelineMenuId(null);
					}}
					onQuestSelect={openDetails}
					onQuestComplete={(quest) => void handleQuestComplete(quest)}
					onAddQuest={openCreateForDate}
					onUseDayPlan={(date) => {
						setSelectedDate(date);
						setDayPlanExpanded(true);
						window.setTimeout(() => scrollTimelineToNow("smooth"), 80);
					}}
				/>
			)}

			{!isMobile && (
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
			)}

			<section className={`${styles.section}${dayPlanExpanded || !isMobile ? ` ${isMobile ? styles.dayPlanSectionMobile : styles.dayPlanSectionDesktop}` : ''}`}>
				<div className={styles.timelineDayShell} ref={dayScheduleShellRef}>
					<div className={styles.timelineHeader}>
						<span>Day plan</span>
						<div className={styles.timelineHeaderActions}>
							{isMobile && (
								<button
									type="button"
									className={`${styles.timelineNowBtn} ${dayPlanExpanded ? styles.timelineHeaderIconActive : ''}`}
									onClick={() => {
										setDayPlanExpanded((open) => {
											const next = !open;
											if (next) {
												setCaptureCollapsed(true);
												window.setTimeout(() => scrollTimelineToNow("smooth"), 80);
											}
											return next;
										});
									}}
									aria-expanded={dayPlanExpanded}
								>
									{dayPlanExpanded ? 'Hide plan' : 'Show plan'}
								</button>
							)}
							<button
								type="button"
								className={styles.timelineNowBtn}
								title="Jump to current time"
								onClick={handleJumpToNow}
							>
								Now
							</button>
							{!isMobile && (
							<button
								type="button"
								className={`${styles.timelineHeaderIcon} ${dayScheduleOpen ? styles.timelineHeaderIconActive : ""}`}
								title="Open a chronological list of quests for the selected day. Click again to close."
								aria-expanded={dayScheduleOpen}
								aria-controls="sidebar-day-schedule-list"
								onClick={() => setDayScheduleOpen((open) => !open)}
							>
								☷
							</button>
							)}
						</div>
					</div>
					{!isMobile && dayScheduleOpen && (
						<div
							id="sidebar-day-schedule-list"
							className={styles.daySchedulePanel}
							role="region"
							aria-label="Day schedule"
						>
							<div className={styles.daySchedulePanelDate}>
								{selectedDate.toLocaleDateString(undefined, {
									weekday: "short",
									month: "short",
									day: "numeric",
									year: "numeric",
								})}
							</div>
							{timelineBlocks.length === 0 ? (
								<div className={styles.dayScheduleEmpty}>No quests for this day.</div>
							) : (
								<ul className={styles.dayScheduleList}>
									{timelineBlocks.map((block, idx) => {
										const timeStr = `${toTime(block.start)} – ${toTime(block.end)}`;
										const label =
											block.mode === "scheduled" ? "Timed" : block.mode === "suggested" ? "Suggested" : "Flexible";
										return (
											<li key={`day-schedule-${block.quest.id}-${idx}`}>
												<button
													type="button"
													className={styles.dayScheduleRow}
													onClick={() => {
														setDayScheduleOpen(false);
														openDetails(block.quest);
													}}
												>
													<span className={styles.dayScheduleTime}>{timeStr}</span>
													<span className={styles.dayScheduleRowBody}>
														<span className={styles.dayScheduleTitle}>
															{getQuestDisplayTitle(block.quest)}
														</span>
														<span className={styles.dayScheduleBadge}>{label}</span>
													</span>
												</button>
											</li>
										);
									})}
								</ul>
							)}
						</div>
					)}
				</div>
				{(!isMobile || dayPlanExpanded) ? (
				<>
					<MobileDayAgenda
						ref={mobileAgendaRef}
						blocks={plannerBlocks}
						currentTime={currentTime}
						isToday={selectedDateISO === todayISO}
						plannerStartHour={plannerStartHour}
						plannerEndHour={plannerEndHour}
						onOpenQuest={openDetails}
						onCompleteQuest={(quest) => void handleTimelineComplete(quest)}
						onOpenActions={(quest) => setMobileTimelineMenuId(quest.id)}
						onAddAtMinutes={openCreateAtMinutes}
					/>
				</>
				) : (
					<button
						type="button"
						className={styles.dayPlanCollapsedHint}
						onClick={() => {
							setDayPlanExpanded(true);
							window.setTimeout(() => scrollTimelineToNow("smooth"), 80);
						}}
					>
						Tap Show plan for today's time blocks
					</button>
				)}
			</section>

			<section className={styles.section}>
				<div className={styles.sectionTitle}>Inbox</div>
				{!isMobile && (
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
				)}

				<InboxGroup
					groupId="now"
					title="Now"
					quests={inboxByGroup.now}
					currentEnergy={currentEnergy}
					onQuestClick={openDetails}
					collapsed={collapsedGroups.now}
					onToggleCollapse={toggleGroupCollapse}
					onDragStart={isMobile ? undefined : handleDragStart}
					onDragEnd={isMobile ? undefined : handleDragEnd}
					onDragOver={isMobile ? undefined : (groupId) => {
						if (canDropToGroup(groupId)) setActiveDropZone(groupId);
					}}
					onDrop={isMobile ? undefined : handleDropToGroup}
					isDropActive={!isMobile && activeDropZone === "now" && canDropToGroup("now")}
				/>
				<InboxGroup
					groupId="today"
					title="Today"
					quests={inboxByGroup.today}
					currentEnergy={currentEnergy}
					onQuestClick={openDetails}
					collapsed={collapsedGroups.today}
					onToggleCollapse={toggleGroupCollapse}
					onDragStart={isMobile ? undefined : handleDragStart}
					onDragEnd={isMobile ? undefined : handleDragEnd}
					onDragOver={isMobile ? undefined : (groupId) => {
						if (canDropToGroup(groupId)) setActiveDropZone(groupId);
					}}
					onDrop={isMobile ? undefined : handleDropToGroup}
					isDropActive={!isMobile && activeDropZone === "today" && canDropToGroup("today")}
				/>
				{/* Always show on mobile — brain dumps land here until timed */}
				<InboxGroup
					groupId="unscheduled"
					title={isMobile ? "To schedule" : "Unscheduled"}
					quests={inboxByGroup.unscheduled}
					currentEnergy={currentEnergy}
					onQuestClick={openDetails}
					collapsed={collapsedGroups.unscheduled}
					onToggleCollapse={toggleGroupCollapse}
					onDragStart={isMobile ? undefined : handleDragStart}
					onDragEnd={isMobile ? undefined : handleDragEnd}
					onDragOver={isMobile ? undefined : (groupId) => {
						if (canDropToGroup(groupId)) setActiveDropZone(groupId);
					}}
					onDrop={isMobile ? undefined : handleDropToGroup}
					isDropActive={!isMobile && activeDropZone === "unscheduled" && canDropToGroup("unscheduled")}
				/>
				<InboxGroup
					groupId="overdue"
					title="Overdue"
					quests={inboxByGroup.overdue}
					currentEnergy={currentEnergy}
					onQuestClick={openDetails}
					collapsed={collapsedGroups.overdue}
					onToggleCollapse={toggleGroupCollapse}
					onDragStart={isMobile ? undefined : handleDragStart}
					onDragEnd={isMobile ? undefined : handleDragEnd}
					onDragOver={isMobile ? undefined : () => setActiveDropZone(null)}
					onDrop={isMobile ? undefined : handleDropToGroup}
					isDropActive={false}
				/>
				{!isMobile && (
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
				)}
			</section>
				</>
			)}

			{hubSection === 'projects' && (
				<QuestProjectsPanel
					allQuests={allQuests}
					onQuestClick={openDetails}
					onCreateProject={openCreate}
					onContinueOnTasks={handleContinueOnTasks}
					onOpenContract={(project) => void handleOpenContract(project)}
					onTurnIn={handleTurnInContract}
					onToggleSubtask={(quest, idx) => void handleToggleSubtask(quest, idx)}
					onCompleteQuest={(quest) => void handleQuestComplete(quest)}
					onCreateContract={handleCreateContract}
					onAddChecklistItem={handleAddChecklistItem}
					onAddWaypoint={handleAddProjectWaypoint}
					onEditContract={handleEditContract}
					onAbandonContract={handleAbandonContract}
					currencyName={plugin.settings.currencyName || 'Coins'}
					currencySymbol={plugin.settings.currencySymbol || '🪙'}
					skillOptions={contractSkills}
				/>
			)}

			{hubSection === 'journey' && (
				<QuestJourneyPanel plugin={plugin} />
			)}

			{hubSection === 'dungeon' && (
				<QuestDungeonPanel plugin={plugin} />
			)}

			{isQuestModalOpen && (
				<QuestModal
					isOpen={isQuestModalOpen}
					plugin={plugin}
					mode={editingQuest ? "edit" : "create"}
					quest={editingQuest}
					onClose={handleQuestModalClose}
					onSubmit={handleQuestModalSubmit}
					openContracts={openContractOptions}
					defaultContract={defaultContractTitle}
					prefill={
						promotingCapture
							? { title: promotingCapture.title }
							: createDueISO
								? { dueISO: createDueISO }
								: undefined
					}
				/>
			)}

			{mobileTimelineMenuId &&
				createPortal(
					(() => {
						const menuQuest =
							filteredQuests.find((q) => q.id === mobileTimelineMenuId) ??
							allQuests.find((q) => q.id === mobileTimelineMenuId) ??
							plannerBlocks.find((b) => b.quest.id === mobileTimelineMenuId)?.quest ??
							null;
						if (!menuQuest) return null;
						const title = getQuestDisplayTitle(menuQuest);
						return (
							<div
								className={styles.timelineActionSheetBackdrop}
								role="presentation"
								onClick={() => setMobileTimelineMenuId(null)}
							>
								<div
									className={styles.timelineActionSheet}
									role="dialog"
									aria-modal="true"
									aria-label={`Actions for ${title}`}
									onClick={(e) => e.stopPropagation()}
								>
									<div className={styles.timelineActionSheetHeader}>
										<div>
											<span className={styles.timelineActionSheetEyebrow}>
												System: Actions
											</span>
											<p className={styles.timelineActionSheetTitle}>{title}</p>
										</div>
										<button
											type="button"
											className={styles.timelineActionSheetClose}
											aria-label="Close actions"
											onClick={() => setMobileTimelineMenuId(null)}
										>
											✕
										</button>
									</div>
									<div className={styles.timelineActionSheetBody}>
										<button
											type="button"
											className={styles.timelineActionSheetBtn}
											onClick={() => {
												setMobileTimelineMenuId(null);
												openDetails(menuQuest);
											}}
										>
											Details
										</button>
										<button
											type="button"
											className={styles.timelineActionSheetBtn}
											onClick={() => {
												setMobileTimelineMenuId(null);
												void handleTimelineSnoozeMinutes(menuQuest, 15);
											}}
										>
											+15m snooze
										</button>
										<button
											type="button"
											className={styles.timelineActionSheetBtn}
											onClick={() => {
												setMobileTimelineMenuId(null);
												void handleTimelineSnoozeMinutes(menuQuest, 60);
											}}
										>
											+1h snooze
										</button>
										<button
											type="button"
											className={styles.timelineActionSheetBtn}
											onClick={() => {
												setMobileTimelineMenuId(null);
												void handleTimelineMoveByDays(menuQuest, 1);
											}}
										>
											+1 day
										</button>
										<button
											type="button"
											className={styles.timelineActionSheetBtn}
											onClick={() => {
												setMobileTimelineMenuId(null);
												handleStartFocus(menuQuest);
											}}
										>
											Start focus
										</button>
										<button
											type="button"
											className={`${styles.timelineActionSheetBtn} ${styles.timelineActionSheetBtnPrimary}`}
											onClick={() => {
												setMobileTimelineMenuId(null);
												void handleTimelineComplete(menuQuest);
											}}
										>
											Complete ✓
										</button>
									</div>
								</div>
							</div>
						);
					})(),
					document.body
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
				onToggleSubtask={(questId, idx) => void handleToggleSubtask(questId, idx)}
			/>
		</div>
		</>
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
	onDragStart?: (quest: Quest, sourceGroup: InboxGroupId) => void;
	onDragEnd?: () => void;
	onDragOver?: (groupId: InboxGroupId) => void;
	onDrop?: (groupId: InboxGroupId) => void;
	isDropActive?: boolean;
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
	isDropActive = false,
}) => (
	<div className={styles.inboxGroup}>
		<button
			type="button"
			className={`${styles.inboxGroupTitle} ${styles.inboxGroupHeaderButton}`}
			onClick={() => onToggleCollapse(groupId)}
			onDragOver={(e) => {
				if (!onDragOver) return;
				e.preventDefault();
				onDragOver(groupId);
			}}
			onDrop={(e) => {
				if (!onDrop) return;
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
					if (!onDragOver) return;
					e.preventDefault();
					onDragOver(groupId);
				}}
				onDrop={(e) => {
					if (!onDrop) return;
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
							draggable={Boolean(onDragStart)}
							onDragStart={
								onDragStart
									? (e) => {
											e.dataTransfer.setData("text/plain", quest.id || titleText);
											onDragStart(quest, groupId);
									  }
									: undefined
							}
							onDragEnd={onDragEnd}
						>
							<div className={styles.inboxItemLeft}>
								{onDragStart ? <span className={styles.dragHandle}>⋮⋮</span> : null}
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

/**
 * Difference in whole local calendar days: due day minus ref day.
 * Date-only strings (`YYYY-MM-DD`) use local midnight, not UTC (fixes false "OVERDUE" in western timezones).
 */
function diffCalendarDaysForDue(dueStr: string, ref: Date): number {
	let dueStart: Date;
	if (dueStr.includes("T")) {
		const due = new Date(dueStr);
		if (Number.isNaN(due.getTime())) return 0;
		dueStart = new Date(due.getFullYear(), due.getMonth(), due.getDate(), 0, 0, 0, 0);
	} else {
		const m = dueStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
		if (!m) {
			const due = new Date(dueStr);
			if (Number.isNaN(due.getTime())) return 0;
			dueStart = new Date(due.getFullYear(), due.getMonth(), due.getDate(), 0, 0, 0, 0);
		} else {
			dueStart = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0);
		}
	}
	const refStart = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), 0, 0, 0, 0);
	return Math.round((dueStart.getTime() - refStart.getTime()) / 86400000);
}

/** `Date` for labels; date-only dues use local Y-M-D, not `new Date("YYYY-MM-DD")` (UTC). */
function localDateFromDueString(dueStr: string): Date | null {
	if (dueStr.includes("T")) {
		const due = new Date(dueStr);
		return Number.isNaN(due.getTime()) ? null : due;
	}
	const m = dueStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
	if (!m) {
		const due = new Date(dueStr);
		return Number.isNaN(due.getTime()) ? null : due;
	}
	return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0);
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
	const ref = new Date();
	const diffDays = diffCalendarDaysForDue(quest.due, ref);
	if (diffDays === 0) return "Today";
	if (diffDays === 1) return "Tomorrow";
	if (diffDays < 0) return "Overdue";
	const display = localDateFromDueString(quest.due);
	if (!display) return "No due date";
	return display.toLocaleDateString();
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

type TimelineThemeKey = "violet" | "blue" | "pink" | "amber" | "green" | "red";
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
	const explicit = normalizeQuestTimelineTheme(quest.timelineTheme);
	if (explicit) return explicit;
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

function hashString(value: string): number {
	let hash = 0;
	for (let i = 0; i < value.length; i++) {
		hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
	}
	return hash;
}

function compactDueLabel(quest: Quest): string {
	if (!quest.due) return "";
	const ref = new Date();
	const diffDays = diffCalendarDaysForDue(quest.due, ref);
	if (diffDays < 0) return "OVERDUE";
	if (diffDays === 0) {
		if (hasTime(quest.due)) {
			const due = new Date(quest.due);
			if (Number.isNaN(due.getTime())) return "";
			return `DUE ${due.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
		}
		return "TODAY";
	}
	if (diffDays === 1) return "TOMORROW";
	const display = localDateFromDueString(quest.due);
	if (!display) return "";
	return display.toLocaleDateString([], { month: "short", day: "numeric" }).toUpperCase();
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
		const raw = localStorage.getItem(CALENDAR_COLLAPSE_KEY);
		// First visit: collapse calendar on mobile so Today's Run + timeline come first
		if (raw === null) return isLikelyMobileDevice();
		return raw === "1";
	} catch {
		return false;
	}
}

function loadCaptureCollapsed(): boolean {
	try {
		const raw = localStorage.getItem(CAPTURE_COLLAPSE_KEY);
		// First visit: collapse capture on mobile so Today's Run stays above the fold
		if (raw === null) return isLikelyMobileDevice();
		return raw === "1";
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
	const now = new Date();
	if (hasTime(quest.due)) {
		const due = new Date(quest.due);
		if (Number.isNaN(due.getTime())) return false;
		return due < now;
	}
	return diffCalendarDaysForDue(quest.due, now) < 0;
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
	const file = app.vault.getAbstractFileByPath(quest.filePath || "GamifiedTasks.md");
	if (!(file instanceof TFile)) return;
	const content = await app.vault.read(file);
	const lines = content.split("\n");
	const index = findQuestLineIndex(lines, quest);
	if (index === -1) return;

	lines[index] = applyGroupMoveToLine(lines[index], targetGroup, todayISO);
	await app.vault.modify(file, lines.join("\n"));
}

async function persistQuestDateMove(
	app: App,
	quest: Quest,
	targetDateISO: string,
	todayISO: string
): Promise<void> {
	await persistQuestDueDateTime(app, quest, targetDateISO, todayISO);
}

/** Persist due date and optional time (YYYY-MM-DD or YYYY-MM-DDTHH:mm). */
async function persistQuestDueDateTime(
	app: App,
	quest: Quest,
	dueISO: string,
	todayISO: string
): Promise<void> {
	const file = app.vault.getAbstractFileByPath(quest.filePath || "GamifiedTasks.md");
	if (!(file instanceof TFile)) return;
	const content = await app.vault.read(file);
	const lines = content.split("\n");
	const index = findQuestLineIndex(lines, quest);
	if (index === -1) return;
	lines[index] = applyDueDateTimeToLine(lines[index], dueISO, todayISO);
	await app.vault.modify(file, lines.join("\n"));
}

/**
 * Find the file line for the nth indented `- [ ]` subtask under a quest line.
 * Skips indented non-checkbox lines (e.g. 💭 descriptions) and stops at the
 * next top-level line.
 */
function findSubtaskLineIndex(lines: string[], questLineIndex: number, subtaskIndex: number): number {
	let count = 0;
	for (let i = questLineIndex + 1; i < lines.length; i++) {
		const line = lines[i];
		if (line.trim() === "") continue;
		if (!/^[ \t]/.test(line)) break;
		if (/^[ \t]+- \[[ xX]\]/.test(line)) {
			if (count === subtaskIndex) return i;
			count++;
		}
	}
	return -1;
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
	return applyDueDateTimeToLine(line, targetDateISO, todayISO);
}

function applyDueDateTimeToLine(line: string, dueISO: string, todayISO: string): string {
	let updated = line;
	const nowIso = new Date().toISOString();
	const datePart = dueISO.split("T")[0];
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
	updated = upsertMetaField(updated, "due", dueISO);
	const isToday = datePart === todayISO;
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
