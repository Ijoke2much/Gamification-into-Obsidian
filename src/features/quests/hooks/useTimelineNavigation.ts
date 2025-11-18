import { useState, useEffect } from 'react';

type TimelineViewMode = 'day' | 'week' | 'workweek';

interface UseTimelineNavigationProps {
    initialViewMode?: TimelineViewMode;
    date?: Date;
}

export const useTimelineNavigation = ({
    initialViewMode = 'day',
    date
}: UseTimelineNavigationProps) => {
    const [viewMode] = useState<TimelineViewMode>(initialViewMode);
    const [currentWeek, setCurrentWeek] = useState(() => {
        const d = date || new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    });

    // Local visible date for day view navigation
    const [visibleDate, setVisibleDate] = useState<Date>(() => {
        const d = date ? new Date(date) : new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    });

    useEffect(() => {
        if (date) {
            const d = new Date(date);
            d.setHours(0, 0, 0, 0);
            setVisibleDate(d);
        }
    }, [date]);

    const navigateWeek = (direction: number) => {
        const newWeek = new Date(currentWeek);
        newWeek.setDate(newWeek.getDate() + (direction * 7));
        setCurrentWeek(newWeek);
    };

    const navigateDay = (direction: number) => {
        const newDate = new Date(visibleDate);
        newDate.setDate(newDate.getDate() + direction);
        setVisibleDate(newDate);
    };

    const formatWeekRange = (week: Date) => {
        const start = new Date(week);
        start.setDate(start.getDate() - start.getDay());
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    };

    const formatDayTitle = (date: Date) => {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    };

    return {
        viewMode,
        currentWeek,
        visibleDate,
        setVisibleDate,
        navigateWeek,
        navigateDay,
        formatWeekRange,
        formatDayTitle
    };
};
