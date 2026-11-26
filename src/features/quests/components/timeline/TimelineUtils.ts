import type { Quest } from '../../utils/taskParser';

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

export function pad(n: number): string {
    return n < 10 ? `0${n}` : `${n}`;
}

export function toISODate(d: Date): string {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDurationToMin(s?: string): number {
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

export function parseStartMinutes(quest: Quest): number | null {
    if (quest.due && quest.due.includes('T')) {
        const t = quest.due.split('T')[1];
        const [hh, mm] = t.split(':').map(Number);
        if (Number.isFinite(hh) && Number.isFinite(mm)) return hh * 60 + mm;
    }
    return null;
}

export function getEnergyIcon(cost: number): string {
    if (cost <= 15) return '🟢';
    if (cost <= 30) return '🟡';
    if (cost <= 50) return '🟠';
    return '🔴';
}

export function getEnergyMatchClass(questEnergy: number, currentEnergy: number): string {
    if (questEnergy <= currentEnergy * 0.3) return 'low';
    if (questEnergy <= currentEnergy * 0.6) return 'medium';
    return 'high';
}

export function formatMinutesHuman(mins: number): string {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h} ${h === 1 ? 'hr' : 'hrs'} ${m} min`;
    if (h > 0) return `${h} ${h === 1 ? 'hr' : 'hrs'}`;
    return `${m} min`;
}
