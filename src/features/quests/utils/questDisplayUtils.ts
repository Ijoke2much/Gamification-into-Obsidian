// Shared utility functions for quest display formatting

/**
 * Format recurrence for display across all quest views
 */
export function formatRecur(recur?: string): string {
    if (!recur) return '';
    const v = recur.trim().toLowerCase();
    if (!v || ['none', 'no', 'no recurrence', 'off'].includes(v)) return '';
    if (['daily', 'every day', 'everyday'].includes(v)) return 'Daily';
    if (['weekly', 'every week'].includes(v)) return 'Weekly';
    if (['monthly', 'every month'].includes(v)) return 'Monthly';
    if (/^\d+d$/.test(v)) return `${v.replace('d', '')}-day interval`;
    if (/^\d+w$/.test(v)) return `${v.replace('w', '')}-week interval`;
    return recur; // fallback to whatever is stored
}

/**
 * Parse an estimated time string into minutes (supports: "5", "5m", "25 min", "1h", "1h30m")
 */
export function parseEstimatedMinutes(value?: string): number | null {
    if (!value) return null;
    const str = value.trim().toLowerCase();
    if (!str) return null;
    // Pattern for "1h30m", "1h", "90m", "25", "25 min"
    const comboMatch = str.match(/^(\d+)\s*h\s*(\d+)?\s*m?$/i);
    if (comboMatch) {
        const hours = parseInt(comboMatch[1], 10);
        const mins = comboMatch[2] ? parseInt(comboMatch[2], 10) : 0;
        return hours * 60 + mins;
    }
    const singleMatch = str.match(/^(\d+)\s*(m|min|mins|minute|minutes|h|hr|hrs|hour|hours)?$/i);
    if (singleMatch) {
        const val = parseInt(singleMatch[1], 10);
        const unit = (singleMatch[2] || 'm').toLowerCase();
        if (unit.startsWith('h')) return val * 60;
        return val;
    }
    return null;
}

/**
 * Format minutes as "1h 30m" or "45m"
 */
export function formatMinutesHuman(mins: number): string {
    if (!mins || mins <= 0) return '';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
}

