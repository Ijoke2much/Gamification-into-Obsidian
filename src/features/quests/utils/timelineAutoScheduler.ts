// Timeline Auto-Scheduler for ADHD-Friendly Quest Management
// Intelligently schedules quests based on energy levels, priorities, and optimal time blocks

import type { Quest } from './taskParser';

export interface SchedulingSuggestion {
    quest: Quest;
    suggestedTime: string; // ISO format YYYY-MM-DDTHH:MM
    reason: string;
    energyMatch: 'perfect' | 'good' | 'okay' | 'poor';
    confidence: number; // 0-100
}

export interface TimeBlock {
    startHour: number;
    endHour: number;
    energyLevel: 'high' | 'medium' | 'low';
    type: 'peak' | 'work' | 'recovery' | 'evening';
    suitableFor: string[];
}

export interface ADHDSchedulingPreferences {
    workingHours: { start: number; end: number };
    breakInterval: number; // minutes between tasks
    maxConsecutiveHours: number;
    preferredStartTime: number; // hour of day
    hyperfocusWindows: { start: number; end: number }[];
    avoidTimes: { start: number; end: number }[];
    energyProfile: 'morning' | 'afternoon' | 'evening' | 'variable';
}

const DEFAULT_PREFERENCES: ADHDSchedulingPreferences = {
    workingHours: { start: 9, end: 17 },
    breakInterval: 15,
    maxConsecutiveHours: 2,
    preferredStartTime: 9,
    hyperfocusWindows: [
        { start: 10, end: 12 },
        { start: 15, end: 17 }
    ],
    avoidTimes: [],
    energyProfile: 'morning'
};

// Define optimal time blocks based on ADHD research
const TIME_BLOCKS: TimeBlock[] = [
    {
        startHour: 9,
        endHour: 12,
        energyLevel: 'high',
        type: 'peak',
        suitableFor: ['hard', 'high', 'challenging', 'hyperfocus']
    },
    {
        startHour: 13,
        endHour: 15,
        energyLevel: 'medium',
        type: 'work',
        suitableFor: ['medium', 'normal', 'routine']
    },
    {
        startHour: 15,
        endHour: 17,
        energyLevel: 'high',
        type: 'peak',
        suitableFor: ['hard', 'creative', 'hyperfocus']
    },
    {
        startHour: 17,
        endHour: 19,
        energyLevel: 'medium',
        type: 'work',
        suitableFor: ['easy', 'admin', 'planning']
    },
    {
        startHour: 19,
        endHour: 21,
        energyLevel: 'low',
        type: 'evening',
        suitableFor: ['easy', 'reflection', 'planning']
    }
];

export class TimelineAutoScheduler {
    /**
     * Generate scheduling suggestions for unscheduled quests
     */
    static generateSuggestions(
        unscheduledQuests: Quest[],
        scheduledQuests: Quest[],
        currentEnergy: number,
        targetDate: Date,
        preferences: Partial<ADHDSchedulingPreferences> = {}
    ): SchedulingSuggestion[] {
        const prefs = { ...DEFAULT_PREFERENCES, ...preferences };
        const suggestions: SchedulingSuggestion[] = [];

        // Get available time slots
        const availableSlots = this.getAvailableTimeSlots(
            scheduledQuests,
            targetDate,
            prefs
        );

        // Sort quests by priority and energy requirements
        const sortedQuests = this.sortQuestsBySchedulingPriority(
            unscheduledQuests,
            currentEnergy
        );

        // Match quests to optimal time slots
        for (const quest of sortedQuests) {
            const bestSlot = this.findBestTimeSlot(
                quest,
                availableSlots,
                currentEnergy,
                prefs
            );

            if (bestSlot) {
                const suggestedTime = this.formatTimeSlot(targetDate, bestSlot.hour, bestSlot.minute);
                suggestions.push({
                    quest,
                    suggestedTime,
                    reason: bestSlot.reason,
                    energyMatch: bestSlot.energyMatch,
                    confidence: bestSlot.confidence
                });

                // Mark this slot as used
                this.markSlotAsUsed(availableSlots, bestSlot, quest);
            }
        }

        return suggestions;
    }

    /**
     * Sort quests by scheduling priority
     */
    private static sortQuestsBySchedulingPriority(
        quests: Quest[],
        currentEnergy: number
    ): Quest[] {
        return [...quests].sort((a, b) => {
            // Priority order: highest, high, medium, low
            const priorityOrder: Record<string, number> = {
                highest: 4,
                high: 3,
                medium: 2,
                low: 1
            };

            const aPriority = priorityOrder[a.priority?.toLowerCase() || 'medium'] || 2;
            const bPriority = priorityOrder[b.priority?.toLowerCase() || 'medium'] || 2;

            if (aPriority !== bPriority) {
                return bPriority - aPriority;
            }

            // If priority is same, sort by energy cost (low energy tasks first when energy is low)
            const aEnergy = a.energyCost || 10;
            const bEnergy = b.energyCost || 10;

            if (currentEnergy < 50) {
                return aEnergy - bEnergy; // Low energy: schedule easier tasks first
            } else {
                return bEnergy - aEnergy; // High energy: schedule harder tasks first
            }
        });
    }

    /**
     * Get available time slots for the day
     */
    private static getAvailableTimeSlots(
        scheduledQuests: Quest[],
        targetDate: Date,
        prefs: ADHDSchedulingPreferences
    ): Array<{ hour: number; minute: number; available: boolean; duration: number }> {
        const slots: Array<{ hour: number; minute: number; available: boolean; duration: number }> = [];

        // Generate 15-minute slots for working hours
        for (let hour = prefs.workingHours.start; hour < prefs.workingHours.end; hour++) {
            for (let minute = 0; minute < 60; minute += 15) {
                slots.push({ hour, minute, available: true, duration: 15 });
            }
        }

        // Mark slots occupied by scheduled quests
        const dateStr = this.toISODate(targetDate);
        for (const quest of scheduledQuests) {
            if (quest.due?.startsWith(dateStr) && quest.due.includes('T')) {
                const [, time] = quest.due.split('T');
                const [hh, mm] = time.split(':').map(Number);
                const duration = this.parseDuration(quest.estimatedTime);

                this.markSlotsOccupied(slots, hh, mm, duration);
            }
        }

        // Mark avoid times
        for (const avoid of prefs.avoidTimes) {
            this.markSlotsOccupied(slots, avoid.start, 0, (avoid.end - avoid.start) * 60);
        }

        return slots;
    }

    /**
     * Find the best time slot for a quest
     */
    private static findBestTimeSlot(
        quest: Quest,
        availableSlots: Array<{ hour: number; minute: number; available: boolean; duration: number }>,
        currentEnergy: number,
        prefs: ADHDSchedulingPreferences
    ): {
        hour: number;
        minute: number;
        reason: string;
        energyMatch: 'perfect' | 'good' | 'okay' | 'poor';
        confidence: number;
    } | null {
        const questEnergy = quest.energyCost || 10;
        const difficulty = quest.difficulty?.toLowerCase() || 'medium';
        const priority = quest.priority?.toLowerCase() || 'medium';
        const duration = this.parseDuration(quest.estimatedTime);

        // Find suitable time blocks
        const suitableBlocks = TIME_BLOCKS.filter(block =>
            block.suitableFor.includes(difficulty) ||
            block.suitableFor.includes(priority)
        );

        // If quest is hard and energy is high, prefer hyperfocus windows
        const isHyperfocusCandidate = difficulty === 'hard' && currentEnergy >= 70;

        for (const block of suitableBlocks) {
            // Check if this is a hyperfocus window
            const isHyperfocusWindow = prefs.hyperfocusWindows.some(
                window => block.startHour >= window.start && block.endHour <= window.end
            );

            // Prioritize hyperfocus windows for hard tasks
            if (isHyperfocusCandidate && !isHyperfocusWindow) continue;

            // Find first available slot in this block
            for (let hour = block.startHour; hour < block.endHour; hour++) {
                for (let minute = 0; minute < 60; minute += 15) {
                    const slotIndex = this.findSlotIndex(availableSlots, hour, minute);
                    if (slotIndex === -1) continue;

                    // Check if enough consecutive slots are available
                    if (this.hasConsecutiveAvailableSlots(availableSlots, slotIndex, duration)) {
                        // Calculate energy match
                        let energyMatch: 'perfect' | 'good' | 'okay' | 'poor';
                        let confidence = 80;

                        if (questEnergy <= currentEnergy * 0.3) {
                            energyMatch = 'perfect';
                            confidence = 95;
                        } else if (questEnergy <= currentEnergy * 0.6) {
                            energyMatch = 'good';
                            confidence = 85;
                        } else if (questEnergy <= currentEnergy) {
                            energyMatch = 'okay';
                            confidence = 70;
                        } else {
                            energyMatch = 'poor';
                            confidence = 50;
                        }

                        // Build reason
                        let reason = `${block.type === 'peak' ? '🔥 Peak' : '💼 Work'} time`;
                        if (isHyperfocusWindow && isHyperfocusCandidate) {
                            reason = '✨ Hyperfocus window - perfect for challenging tasks';
                            confidence = 98;
                        } else if (block.energyLevel === 'high' && questEnergy > 30) {
                            reason = '⚡ High energy period - great for demanding tasks';
                        } else if (block.energyLevel === 'low' && questEnergy < 20) {
                            reason = '🌙 Low energy period - ideal for easy tasks';
                        }

                        return { hour, minute, reason, energyMatch, confidence };
                    }
                }
            }
        }

        // Fallback: find any available slot
        for (let i = 0; i < availableSlots.length; i++) {
            const slot = availableSlots[i];
            if (slot.available && this.hasConsecutiveAvailableSlots(availableSlots, i, duration)) {
                return {
                    hour: slot.hour,
                    minute: slot.minute,
                    reason: 'Available time slot',
                    energyMatch: 'okay',
                    confidence: 60
                };
            }
        }

        return null;
    }

    /**
     * Helper: Format time slot as ISO string
     */
    private static formatTimeSlot(date: Date, hour: number, minute: number): string {
        const pad = (n: number) => n < 10 ? `0${n}` : `${n}`;
        return `${this.toISODate(date)}T${pad(hour)}:${pad(minute)}`;
    }

    /**
     * Helper: Convert date to ISO date string
     */
    private static toISODate(d: Date): string {
        const pad = (n: number) => n < 10 ? `0${n}` : `${n}`;
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }

    /**
     * Helper: Parse duration string to minutes
     */
    private static parseDuration(duration?: string): number {
        if (!duration) return 30;
        const str = duration.toLowerCase();
        const mm = str.match(/(\d+)\s*m/);
        const hh = str.match(/(\d+)\s*h/);
        if (hh && mm) return parseInt(hh[1]) * 60 + parseInt(mm[1]);
        if (hh) return parseInt(hh[1]) * 60;
        if (mm) return parseInt(mm[1]);
        const num = parseInt(str);
        return Number.isFinite(num) ? num : 30;
    }

    /**
     * Helper: Find slot index by hour and minute
     */
    private static findSlotIndex(
        slots: Array<{ hour: number; minute: number; available: boolean }>,
        hour: number,
        minute: number
    ): number {
        return slots.findIndex(s => s.hour === hour && s.minute === minute);
    }

    /**
     * Helper: Check if consecutive slots are available
     */
    private static hasConsecutiveAvailableSlots(
        slots: Array<{ hour: number; minute: number; available: boolean }>,
        startIndex: number,
        durationMinutes: number
    ): boolean {
        const slotsNeeded = Math.ceil(durationMinutes / 15);
        for (let i = 0; i < slotsNeeded; i++) {
            if (startIndex + i >= slots.length || !slots[startIndex + i].available) {
                return false;
            }
        }
        return true;
    }

    /**
     * Helper: Mark slots as occupied
     */
    private static markSlotsOccupied(
        slots: Array<{ hour: number; minute: number; available: boolean }>,
        startHour: number,
        startMinute: number,
        durationMinutes: number
    ): void {
        const slotsNeeded = Math.ceil(durationMinutes / 15);
        const startIndex = this.findSlotIndex(slots, startHour, startMinute);
        if (startIndex === -1) return;

        for (let i = 0; i < slotsNeeded && startIndex + i < slots.length; i++) {
            slots[startIndex + i].available = false;
        }
    }

    /**
     * Helper: Mark slot as used after scheduling
     */
    private static markSlotAsUsed(
        slots: Array<{ hour: number; minute: number; available: boolean }>,
        slot: { hour: number; minute: number },
        quest: Quest
    ): void {
        const duration = this.parseDuration(quest.estimatedTime);
        this.markSlotsOccupied(slots, slot.hour, slot.minute, duration);
    }
}

export default TimelineAutoScheduler;
