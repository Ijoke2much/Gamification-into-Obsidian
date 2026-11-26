import { useMemo, useState, useEffect } from 'react';
import type { Quest } from '../utils/taskParser';

export type PlacedQuest = {
    quest: Quest;
    startMinutes: number;
    duration: number;
};

export type DayColumn = {
    date: Date;
    quests: Quest[];
    scheduled: PlacedQuest[];
    allDay: Quest[];
    energyRequired: number;
    isToday: boolean;
};

interface UseTimelineDataProps {
    quests: Quest[];
    viewMode: 'day' | 'week' | 'workweek';
    currentWeek: Date;
    visibleDate: Date;
    currentEnergy: number;
}

export const useTimelineData = ({
    quests,
    viewMode,
    currentWeek,
    visibleDate,
    currentEnergy
}: UseTimelineDataProps) => {
    const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const [showEnergyOverview, setShowEnergyOverview] = useState(true);
    const [showUnscheduled, setShowUnscheduled] = useState(true);

    // Per-quest color theme for calm palette (persisted locally)
    const [blockThemes, setBlockThemes] = useState<Record<string, string>>(() => {
        try {
            const raw = localStorage.getItem('questBlockThemes');
            return raw ? JSON.parse(raw) : {};
        } catch {
            return {};
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem('questBlockThemes', JSON.stringify(blockThemes));
        } catch (error) {
            console.error('Failed to save quest block themes:', error);
        }
    }, [blockThemes]);

    // Calculate day data for single day or week
    const dayColumns = useMemo(() => {
        const columns: DayColumn[] = [];

        window.console.log('[Timeline] Total quests received:', quests.length);
        window.console.log('[Timeline] View mode:', viewMode);
        window.console.log('[Timeline] Visible date:', visibleDate.toISOString());

        if (viewMode === 'day') {
            columns.push(calculateDayData(visibleDate, quests));
        } else {
            // Week or workweek view
            const startOfWeek = new Date(currentWeek);
            startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

            const numDays = viewMode === 'workweek' ? 5 : 7;
            for (let i = 0; i < numDays; i++) {
                const day = new Date(startOfWeek);
                day.setDate(day.getDate() + (viewMode === 'workweek' ? i + 1 : i)); // workweek starts Monday
                columns.push(calculateDayData(day, quests));
            }
        }

        window.console.log('[Timeline] Day columns calculated:', columns.length);
        columns.forEach((col, idx) => {
            window.console.log(`[Timeline] Day ${idx}:`, {
                date: col.date.toISOString(),
                totalQuests: col.quests.length,
                scheduled: col.scheduled.length,
                allDay: col.allDay.length,
                energyRequired: col.energyRequired
            });
        });

        return columns;
    }, [viewMode, currentWeek, visibleDate, quests]);

    // Get unscheduled quests (quests with due date but no time) - show all active date-only quests
    const unscheduledQuests = useMemo(() => {
        const filtered = quests.filter(q => {
            if (!q.due || q.completed) return false;
            // Include both date-only quests and overdue quests needing scheduling
            const isDateOnly = !q.due.includes('T');
            return isDateOnly;
        });
        window.console.log('[Timeline] Unscheduled quests:', filtered.length, filtered.map(q => ({
            title: q.title,
            due: q.due
        })));
        return filtered;
    }, [quests]);

    const totalScheduledEnergy = dayColumns.reduce((sum, col) => sum + col.energyRequired, 0);
    const isOvercommitted = viewMode === 'day' ? totalScheduledEnergy > currentEnergy : false;

    return {
        dayColumns,
        unscheduledQuests,
        totalScheduledEnergy,
        isOvercommitted,
        expandedBlocks,
        setExpandedBlocks,
        openDropdown,
        setOpenDropdown,
        showEnergyOverview,
        setShowEnergyOverview,
        showUnscheduled,
        setShowUnscheduled,
        blockThemes,
        setBlockThemes
    };
};

function calculateDayData(date: Date, allQuests: Quest[]): DayColumn {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setDate(endOfDay.getDate() + 1);
    endOfDay.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isToday = startOfDay.getTime() === today.getTime();

    // Filter quests for this specific date
    const dayQuests = allQuests.filter(quest => {
        if (!quest.due || quest.completed) return false;

        const questDate = new Date(quest.due);
        questDate.setHours(0, 0, 0, 0);

        return questDate.getTime() === startOfDay.getTime();
    });

    // Separate scheduled and all-day quests
    const scheduled: PlacedQuest[] = [];
    const allDay: Quest[] = [];

    dayQuests.forEach(quest => {
        if (quest.due && quest.due.includes('T')) {
            // Scheduled quest with time
            const questDateTime = new Date(quest.due);
            const startMinutes = questDateTime.getHours() * 60 + questDateTime.getMinutes();
            const duration = parseDurationToMin(quest.estimatedTime);

            scheduled.push({
                quest,
                startMinutes,
                duration
            });
        } else {
            // All-day quest
            allDay.push(quest);
        }
    });

    // Calculate total energy required
    const energyRequired = dayQuests.reduce((sum, quest) => {
        return sum + (quest.energyCost || 10);
    }, 0);

    return {
        date: startOfDay,
        quests: dayQuests,
        scheduled,
        allDay,
        energyRequired,
        isToday
    };
}

function parseDurationToMin(s?: string): number {
    if (!s) return 30;
    const str = s.toLowerCase();
    const mm = str.match(/(\d+)\s*m/);
    const hh = str.match(/(\d+)\s*h/);
    if (hh && mm) return parseInt(hh[1]) * 60 + parseInt(mm[1]);
    if (hh) return parseInt(hh[1]) * 60;
    if (mm) return parseInt(mm[1]);
    const num = parseInt(str);
    return Number.isFinite(num) ? num : 30;
}
