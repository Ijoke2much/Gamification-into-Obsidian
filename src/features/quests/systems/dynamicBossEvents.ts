import { Notice } from 'obsidian';
import { Boss, BossProgress } from '../types/BossTypes';
import { EnhancedBattleState } from '../types/EnhancedMoveTypes';

/**
 * Dynamic Boss Events System
 * Real-world productivity events that affect boss battles
 * Makes battles reflect actual life circumstances and project changes
 */
export class DynamicBossEvents {
    private static instance: DynamicBossEvents;
    private activeEvents: Map<string, BossEvent> = new Map();
    private eventHistory: BossEventHistory[] = [];
    private eventProbabilities: Map<EventType, number> = new Map();

    private constructor() {
        this.initializeEventProbabilities();
    }

    static getInstance(): DynamicBossEvents {
        if (!DynamicBossEvents.instance) {
            DynamicBossEvents.instance = new DynamicBossEvents();
        }
        return DynamicBossEvents.instance;
    }

    /**
     * Initialize event probabilities based on real-world likelihood
     */
    private initializeEventProbabilities(): void {
        this.eventProbabilities.set('unexpected_meeting', 0.15); // 15% chance per day
        this.eventProbabilities.set('sick_day', 0.05); // 5% chance per day
        this.eventProbabilities.set('weekend_motivation', 0.3); // 30% chance on weekends
        this.eventProbabilities.set('deadline_moved_up', 0.1); // 10% chance per week
        this.eventProbabilities.set('additional_requirements', 0.2); // 20% chance per week
        this.eventProbabilities.set('found_shortcut', 0.25); // 25% chance per week
        this.eventProbabilities.set('procrastination_wave', 0.2); // 20% chance per day
        this.eventProbabilities.set('inspiration_strike', 0.15); // 15% chance per day
        this.eventProbabilities.set('technical_issues', 0.1); // 10% chance per day
        this.eventProbabilities.set('collaboration_boost', 0.12); // 12% chance per day
    }

    /**
     * Check for and trigger events for a boss battle
     */
    async checkForEvents(boss: Boss, battleState: EnhancedBattleState): Promise<BossEvent[]> {
        const triggeredEvents: BossEvent[] = [];
        const currentTime = new Date();
        const dayOfWeek = currentTime.getDay();
        const hour = currentTime.getHours();

        // Check each event type
        for (const [eventType, probability] of this.eventProbabilities.entries()) {
            if (this.shouldTriggerEvent(eventType, probability, dayOfWeek, hour, boss)) {
                const event = this.createEvent(eventType, boss, battleState);
                if (event) {
                    triggeredEvents.push(event);
                    this.activeEvents.set(boss.id, event);
                    this.recordEvent(event);
                }
            }
        }

        return triggeredEvents;
    }

    /**
     * Determine if an event should trigger
     */
    private shouldTriggerEvent(
        eventType: EventType,
        baseProbability: number,
        dayOfWeek: number,
        hour: number,
        boss: Boss
    ): boolean {
        // Check if event is already active for this boss
        if (this.activeEvents.has(boss.id)) {
            return false;
        }

        // Adjust probability based on context
        let adjustedProbability = baseProbability;

        // Weekend adjustments
        if (dayOfWeek === 0 || dayOfWeek === 6) { // Sunday or Saturday
            if (eventType === 'weekend_motivation') {
                adjustedProbability *= 2; // Double chance on weekends
            } else if (eventType === 'unexpected_meeting') {
                adjustedProbability *= 0.3; // Much less likely on weekends
            }
        }

        // Time of day adjustments
        if (hour >= 9 && hour <= 17) { // Work hours
            if (eventType === 'unexpected_meeting') {
                adjustedProbability *= 1.5; // More likely during work hours
            }
        } else if (hour >= 6 && hour <= 9) { // Morning hours
            if (eventType === 'inspiration_strike') {
                adjustedProbability *= 1.3; // More likely in morning
            }
        }

        // Boss-specific adjustments
        if (boss.type === 'boss' || boss.type === 'epic-boss' || boss.type === 'legendary-boss') {
            if (eventType === 'additional_requirements') {
                adjustedProbability *= 1.2; // More likely for major bosses
            }
        }

        // Random chance
        return Math.random() < adjustedProbability;
    }

    /**
     * Create a specific event
     */
    private createEvent(eventType: EventType, boss: Boss, battleState: EnhancedBattleState): BossEvent | null {
        const eventId = `${boss.id}-${eventType}-${Date.now()}`;
        const currentTime = new Date();

        switch (eventType) {
            case 'unexpected_meeting':
                return {
                    id: eventId,
                    type: 'unexpected_meeting',
                    name: 'Unexpected Meeting',
                    description: 'A last-minute meeting has been scheduled, reducing your available work time.',
                    icon: '📅',
                    duration: 2, // 2 hours
                    effects: {
                        timeReduction: 0.3, // 30% less time available
                        energyDrain: 0.2, // 20% energy reduction
                        distractionIncrease: 0.4 // 40% more distractions
                    },
                    bossImpact: {
                        hpChange: 0,
                        defenseIncrease: 0.2, // Boss becomes harder to damage
                        specialEffect: 'meeting_distraction'
                    },
                    triggeredAt: currentTime,
                    expiresAt: new Date(currentTime.getTime() + 2 * 60 * 60 * 1000) // 2 hours
                };

            case 'sick_day':
                return {
                    id: eventId,
                    type: 'sick_day',
                    name: 'Sick Day',
                    description: 'You\'re feeling under the weather, significantly reducing your productivity.',
                    icon: '🤒',
                    duration: 24, // 24 hours
                    effects: {
                        energyReduction: 0.6, // 60% energy reduction
                        focusReduction: 0.5, // 50% focus reduction
                        motivationReduction: 0.4 // 40% motivation reduction
                    },
                    bossImpact: {
                        hpChange: 0,
                        defenseIncrease: 0.3, // Boss becomes much harder
                        specialEffect: 'sick_day_penalty'
                    },
                    triggeredAt: currentTime,
                    expiresAt: new Date(currentTime.getTime() + 24 * 60 * 60 * 1000) // 24 hours
                };

            case 'weekend_motivation':
                return {
                    id: eventId,
                    type: 'weekend_motivation',
                    name: 'Weekend Motivation',
                    description: 'You feel extra motivated to work on personal projects this weekend!',
                    icon: '🌟',
                    duration: 8, // 8 hours
                    effects: {
                        motivationBoost: 0.4, // 40% motivation boost
                        focusBoost: 0.3, // 30% focus boost
                        energyEfficiency: 0.25 // 25% better energy efficiency
                    },
                    bossImpact: {
                        hpChange: 0,
                        defenseDecrease: 0.2, // Boss becomes easier to damage
                        specialEffect: 'weekend_boost'
                    },
                    triggeredAt: currentTime,
                    expiresAt: new Date(currentTime.getTime() + 8 * 60 * 60 * 1000) // 8 hours
                };

            case 'deadline_moved_up':
                return {
                    id: eventId,
                    type: 'deadline_moved_up',
                    name: 'Deadline Moved Up',
                    description: 'The deadline has been moved up unexpectedly, increasing pressure!',
                    icon: '⏰',
                    duration: 0, // Permanent until boss is defeated
                    effects: {
                        pressureIncrease: 0.5, // 50% more pressure
                        urgencyBoost: 0.3, // 30% urgency boost
                        stressIncrease: 0.4 // 40% more stress
                    },
                    bossImpact: {
                        hpChange: 0,
                        attackIncrease: 0.3, // Boss becomes more aggressive
                        specialEffect: 'deadline_pressure'
                    },
                    triggeredAt: currentTime,
                    expiresAt: null // Permanent
                };

            case 'additional_requirements':
                return {
                    id: eventId,
                    type: 'additional_requirements',
                    name: 'Additional Requirements',
                    description: 'New requirements have been added to the project, increasing scope.',
                    icon: '📋',
                    duration: 0, // Permanent until boss is defeated
                    effects: {
                        scopeIncrease: 0.3, // 30% more work required
                        complexityIncrease: 0.25, // 25% more complex
                        timePressure: 0.2 // 20% more time pressure
                    },
                    bossImpact: {
                        hpChange: 50, // Boss gains HP (more work to do)
                        defenseIncrease: 0.15, // 15% harder to damage
                        specialEffect: 'scope_expansion'
                    },
                    triggeredAt: currentTime,
                    expiresAt: null // Permanent
                };

            case 'found_shortcut':
                return {
                    id: eventId,
                    type: 'found_shortcut',
                    name: 'Found Shortcut',
                    description: 'You discovered a more efficient way to complete the work!',
                    icon: '⚡',
                    duration: 0, // Permanent until boss is defeated
                    effects: {
                        efficiencyBoost: 0.4, // 40% more efficient
                        timeReduction: 0.25, // 25% less time needed
                        energyEfficiency: 0.3 // 30% better energy use
                    },
                    bossImpact: {
                        hpChange: -30, // Boss loses HP (less work to do)
                        defenseDecrease: 0.2, // 20% easier to damage
                        specialEffect: 'efficiency_boost'
                    },
                    triggeredAt: currentTime,
                    expiresAt: null // Permanent
                };

            case 'procrastination_wave':
                return {
                    id: eventId,
                    type: 'procrastination_wave',
                    name: 'Procrastination Wave',
                    description: 'A wave of procrastination hits, making it hard to focus.',
                    icon: '🌊',
                    duration: 4, // 4 hours
                    effects: {
                        focusReduction: 0.5, // 50% focus reduction
                        motivationReduction: 0.4, // 40% motivation reduction
                        distractionIncrease: 0.6 // 60% more distractions
                    },
                    bossImpact: {
                        hpChange: 0,
                        defenseIncrease: 0.25, // 25% harder to damage
                        specialEffect: 'procrastination_paralysis'
                    },
                    triggeredAt: currentTime,
                    expiresAt: new Date(currentTime.getTime() + 4 * 60 * 60 * 1000) // 4 hours
                };

            case 'inspiration_strike':
                return {
                    id: eventId,
                    type: 'inspiration_strike',
                    name: 'Inspiration Strike',
                    description: 'A burst of inspiration hits, boosting your creativity and motivation!',
                    icon: '💡',
                    duration: 3, // 3 hours
                    effects: {
                        creativityBoost: 0.5, // 50% creativity boost
                        motivationBoost: 0.4, // 40% motivation boost
                        focusBoost: 0.3, // 30% focus boost
                        energyBoost: 0.2 // 20% energy boost
                    },
                    bossImpact: {
                        hpChange: 0,
                        defenseDecrease: 0.3, // 30% easier to damage
                        specialEffect: 'inspiration_boost'
                    },
                    triggeredAt: currentTime,
                    expiresAt: new Date(currentTime.getTime() + 3 * 60 * 60 * 1000) // 3 hours
                };

            case 'technical_issues':
                return {
                    id: eventId,
                    type: 'technical_issues',
                    name: 'Technical Issues',
                    description: 'Technical problems are slowing down your progress.',
                    icon: '🔧',
                    duration: 2, // 2 hours
                    effects: {
                        efficiencyReduction: 0.4, // 40% efficiency reduction
                        frustrationIncrease: 0.3, // 30% more frustration
                        timeWaste: 0.5 // 50% time wasted
                    },
                    bossImpact: {
                        hpChange: 0,
                        defenseIncrease: 0.2, // 20% harder to damage
                        specialEffect: 'technical_delay'
                    },
                    triggeredAt: currentTime,
                    expiresAt: new Date(currentTime.getTime() + 2 * 60 * 60 * 1000) // 2 hours
                };

            case 'collaboration_boost':
                return {
                    id: eventId,
                    type: 'collaboration_boost',
                    name: 'Collaboration Boost',
                    description: 'Great collaboration with others is accelerating your progress!',
                    icon: '🤝',
                    duration: 6, // 6 hours
                    effects: {
                        productivityBoost: 0.3, // 30% productivity boost
                        motivationBoost: 0.25, // 25% motivation boost
                        efficiencyBoost: 0.2, // 20% efficiency boost
                        moraleBoost: 0.4 // 40% morale boost
                    },
                    bossImpact: {
                        hpChange: 0,
                        defenseDecrease: 0.25, // 25% easier to damage
                        specialEffect: 'collaboration_synergy'
                    },
                    triggeredAt: currentTime,
                    expiresAt: new Date(currentTime.getTime() + 6 * 60 * 60 * 1000) // 6 hours
                };

            default:
                return null;
        }
    }

    /**
     * Apply event effects to battle calculations
     */
    applyEventEffects(boss: Boss, battleState: EnhancedBattleState): EventBattleModifiers {
        const event = this.activeEvents.get(boss.id);
        if (!event) {
            return { damageModifier: 1, defenseModifier: 1, specialEffects: [] };
        }

        const modifiers: EventBattleModifiers = {
            damageModifier: 1,
            defenseModifier: 1,
            specialEffects: []
        };

        // Apply boss impact
        if (event.bossImpact.defenseIncrease) {
            modifiers.defenseModifier += event.bossImpact.defenseIncrease;
        }
        if (event.bossImpact.defenseDecrease) {
            modifiers.defenseModifier -= event.bossImpact.defenseDecrease;
        }
        if (event.bossImpact.attackIncrease) {
            modifiers.damageModifier += event.bossImpact.attackIncrease;
        }
        if (event.bossImpact.specialEffect) {
            modifiers.specialEffects.push(event.bossImpact.specialEffect);
        }

        return modifiers;
    }

    /**
     * Check if events have expired and clean them up
     */
    checkEventExpiration(): void {
        const now = new Date();
        const expiredEvents: string[] = [];

        for (const [bossId, event] of this.activeEvents.entries()) {
            if (event.expiresAt && event.expiresAt < now) {
                expiredEvents.push(bossId);
                this.recordEventExpiration(event);
            }
        }

        // Remove expired events
        for (const bossId of expiredEvents) {
            this.activeEvents.delete(bossId);
        }
    }

    /**
     * Get active event for a boss
     */
    getActiveEvent(bossId: string): BossEvent | null {
        return this.activeEvents.get(bossId) || null;
    }

    /**
     * Get all active events
     */
    getAllActiveEvents(): Map<string, BossEvent> {
        return new Map(this.activeEvents);
    }

    /**
     * Record an event in history
     */
    private recordEvent(event: BossEvent): void {
        this.eventHistory.push({
            event,
            recordedAt: new Date()
        });

        // Show notification
        new Notice(`🎲 ${event.icon} ${event.name}: ${event.description}`, 5000);
    }

    /**
     * Record event expiration
     */
    private recordEventExpiration(event: BossEvent): void {
        new Notice(`⏰ Event "${event.name}" has expired`, 3000);
    }

    /**
     * Get event history
     */
    getEventHistory(): BossEventHistory[] {
        return [...this.eventHistory];
    }

    /**
     * Get event statistics
     */
    getEventStatistics(): EventStatistics {
        const totalEvents = this.eventHistory.length;
        const eventCounts: Record<EventType, number> = {} as Record<EventType, number>;

        // Initialize counts
        for (const eventType of this.eventProbabilities.keys()) {
            eventCounts[eventType] = 0;
        }

        // Count events
        for (const { event } of this.eventHistory) {
            eventCounts[event.type]++;
        }

        return {
            totalEvents,
            eventCounts,
            mostCommonEvent: this.getMostCommonEvent(eventCounts),
            averageEventsPerDay: this.calculateAverageEventsPerDay()
        };
    }

    /**
     * Get most common event type
     */
    private getMostCommonEvent(eventCounts: Record<EventType, number>): EventType | null {
        let maxCount = 0;
        let mostCommon: EventType | null = null;

        for (const [eventType, count] of Object.entries(eventCounts)) {
            if (count > maxCount) {
                maxCount = count;
                mostCommon = eventType as EventType;
            }
        }

        return mostCommon;
    }

    /**
     * Calculate average events per day
     */
    private calculateAverageEventsPerDay(): number {
        if (this.eventHistory.length === 0) return 0;

        const firstEvent = this.eventHistory[0];
        const lastEvent = this.eventHistory[this.eventHistory.length - 1];
        const daysDiff = (lastEvent.recordedAt.getTime() - firstEvent.recordedAt.getTime()) / (1000 * 60 * 60 * 24);

        return daysDiff > 0 ? this.eventHistory.length / daysDiff : 0;
    }
}

// Type definitions
export type EventType =
    | 'unexpected_meeting'
    | 'sick_day'
    | 'weekend_motivation'
    | 'deadline_moved_up'
    | 'additional_requirements'
    | 'found_shortcut'
    | 'procrastination_wave'
    | 'inspiration_strike'
    | 'technical_issues'
    | 'collaboration_boost';

export interface BossEvent {
    id: string;
    type: EventType;
    name: string;
    description: string;
    icon: string;
    duration: number; // hours, 0 = permanent
    effects: EventEffects;
    bossImpact: BossImpact;
    triggeredAt: Date;
    expiresAt: Date | null;
}

export interface EventEffects {
    // Player effects
    timeReduction?: number;
    energyDrain?: number;
    distractionIncrease?: number;
    energyReduction?: number;
    focusReduction?: number;
    motivationReduction?: number;
    motivationBoost?: number;
    focusBoost?: number;
    energyEfficiency?: number;
    pressureIncrease?: number;
    urgencyBoost?: number;
    stressIncrease?: number;
    scopeIncrease?: number;
    complexityIncrease?: number;
    timePressure?: number;
    efficiencyBoost?: number;
    creativityBoost?: number;
    energyBoost?: number;
    efficiencyReduction?: number;
    frustrationIncrease?: number;
    timeWaste?: number;
    productivityBoost?: number;
    moraleBoost?: number;
}

export interface BossImpact {
    hpChange: number;
    defenseIncrease?: number;
    defenseDecrease?: number;
    attackIncrease?: number;
    specialEffect?: string;
}

export interface EventBattleModifiers {
    damageModifier: number;
    defenseModifier: number;
    specialEffects: string[];
}

export interface BossEventHistory {
    event: BossEvent;
    recordedAt: Date;
}

export interface EventStatistics {
    totalEvents: number;
    eventCounts: Record<EventType, number>;
    mostCommonEvent: EventType | null;
    averageEventsPerDay: number;
}

// Export singleton instance
export const dynamicBossEvents = DynamicBossEvents.getInstance();
