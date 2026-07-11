// Seasonal Tree Events System
// Manages special events that affect tree growth, rewards, and visual effects

import { TreeEvent, TreeItemDrop } from './treeRewardSystem';
;
import { pixelNotice } from '../../../shared/utils/noticeUtils';

export class SeasonalTreeEventManager {
    private static readonly STORAGE_KEY = 'gamified-seasonal-tree-events';
    private static events: TreeEvent[] = [];

    // Initialize default seasonal events
    static initializeEvents(): void {
        if (this.events.length > 0) return; // Already initialized
        const currentYear = new Date().getFullYear();

        this.events = [
            // Spring Growth Event
            {
                id: 'spring_growth_2024',
                name: 'Spring Awakening',
                description: 'Nature blooms with incredible power! Trees grow faster and drop rare items.',
                icon: '🌸',
                startDate: new Date(currentYear, 2, 20), // March 20
                endDate: new Date(currentYear, 5, 20),   // June 20
                isActive: false,
                effects: {
                    dropRateMultiplier: 1.5,
                    rewardMultiplier: 1.3,
                    specialItems: [
                        {
                            id: 'spring_blossom',
                            name: 'Spring Blossom',
                            description: 'A magical blossom that accelerates tree growth',
                            rarity: 'rare',
                            icon: '🌸',
                            effect: { type: 'growth_accelerator', value: 2.0, duration: 1440 }
                        },
                        {
                            id: 'petal_of_renewal',
                            name: 'Petal of Renewal',
                            description: 'Restores your energy and provides temporary protection',
                            rarity: 'uncommon',
                            icon: '🌺',
                            effect: { type: 'streak_protect', value: 1, duration: 720 }
                        }
                    ],
                    visualEffects: ['cherry_blossoms', 'green_growth', 'flower_particles']
                }
            },

            // Summer Festival Event
            {
                id: 'summer_festival_2024',
                name: 'Midsummer Tree Festival',
                description: 'The peak of summer brings incredible abundance to your trees!',
                icon: '☀️',
                startDate: new Date(currentYear, 5, 21), // June 21
                endDate: new Date(currentYear, 8, 22),   // September 22
                isActive: false,
                effects: {
                    dropRateMultiplier: 1.4,
                    rewardMultiplier: 1.5,
                    specialItems: [
                        {
                            id: 'sun_crystal',
                            name: 'Sun Crystal',
                            description: 'A crystal charged with pure sunlight energy',
                            rarity: 'legendary',
                            icon: '💎',
                            effect: { type: 'xp_boost', value: 75, duration: 360 }
                        },
                        {
                            id: 'golden_fruit',
                            name: 'Golden Fruit',
                            description: 'Fruit from the tree of prosperity',
                            rarity: 'rare',
                            icon: '🍎',
                            effect: { type: 'coin_boost', value: 50, duration: 240 }
                        }
                    ],
                    visualEffects: ['golden_glow', 'sun_rays', 'abundance_sparkles']
                }
            },

            // Autumn Harvest Event
            {
                id: 'autumn_harvest_2024',
                name: 'Great Harvest',
                description: 'The season of harvest brings bountiful rewards and wisdom.',
                icon: '🍂',
                startDate: new Date(currentYear, 8, 23),  // September 23
                endDate: new Date(currentYear, 11, 20),  // December 20
                isActive: false,
                effects: {
                    dropRateMultiplier: 1.6,
                    rewardMultiplier: 1.2,
                    specialItems: [
                        {
                            id: 'wisdom_acorn',
                            name: 'Wisdom Acorn',
                            description: 'An acorn containing ancient wisdom',
                            rarity: 'legendary',
                            icon: '🌰',
                            effect: { type: 'cp_boost', value: 60, duration: 480 }
                        },
                        {
                            id: 'harvest_blessing',
                            name: 'Harvest Blessing',
                            description: 'A blessing that multiplies all your gains',
                            rarity: 'rare',
                            icon: '✨',
                            effect: { type: 'double_rewards', value: 2, duration: 180 }
                        }
                    ],
                    visualEffects: ['falling_leaves', 'harvest_glow', 'autumn_colors']
                }
            },

            // Winter Solstice Event
            {
                id: 'winter_solstice_2024',
                name: 'Winter Tree Sanctuary',
                description: 'Even in winter, your trees show incredible resilience and beauty.',
                icon: '❄️',
                startDate: new Date(currentYear, 11, 21), // December 21
                endDate: new Date(currentYear + 1, 2, 19), // March 19 (next year)
                isActive: false,
                effects: {
                    dropRateMultiplier: 1.3,
                    rewardMultiplier: 1.4,
                    specialItems: [
                        {
                            id: 'ice_crystal',
                            name: 'Ice Crystal',
                            description: 'A crystal formed from the breath of winter trees',
                            rarity: 'rare',
                            icon: '❄️',
                            effect: { type: 'streak_protect', value: 2, duration: 2880 }
                        },
                        {
                            id: 'winter_star',
                            name: 'Winter Star',
                            description: 'A star that fell on the longest night',
                            rarity: 'legendary',
                            icon: '⭐',
                            effect: { type: 'growth_accelerator', value: 1.5, duration: 720 }
                        }
                    ],
                    visualEffects: ['snowfall', 'ice_crystals', 'winter_aurora']
                }
            },

            // Special Monthly Mini-Events
            {
                id: 'lunar_blessing_monthly',
                name: 'Lunar Blessing',
                description: 'The full moon blesses your trees with mystical energy.',
                icon: '🌕',
                startDate: new Date(), // Will be dynamically set
                endDate: new Date(),   // Will be dynamically set
                isActive: false,
                effects: {
                    dropRateMultiplier: 2.0,
                    rewardMultiplier: 1.8,
                    specialItems: [
                        {
                            id: 'moonbeam_essence',
                            name: 'Moonbeam Essence',
                            description: 'Pure moonlight captured in crystalline form',
                            rarity: 'mythic',
                            icon: '🌙',
                            effect: { type: 'double_rewards', value: 3, duration: 60 }
                        }
                    ],
                    visualEffects: ['moonbeam', 'silver_glow', 'lunar_particles']
                }
            }
        ];

        this.updateEventStates();
    }

    // Check which events are currently active
    static getActiveEvents(): TreeEvent[] {
        this.updateEventStates();
        return this.events.filter(event => event.isActive);
    }

    // Get all events (for display purposes)
    static getAllEvents(): TreeEvent[] {
        return this.events;
    }

    // Update the active state of all events
    private static updateEventStates(): void {
        const now = new Date();

        this.events.forEach(event => {
            if (event.id === 'lunar_blessing_monthly') {
                // Special handling for lunar blessing - activate on full moon
                this.updateLunarEvent(event, now);
            } else {
                // Regular seasonal events
                event.isActive = now >= event.startDate && now <= event.endDate;
            }
        });
    }

    // Handle the special lunar blessing event
    private static updateLunarEvent(event: TreeEvent, now: Date): void {
        // Simple approximation: full moon roughly every 29.5 days
        const daysSinceEpoch = Math.floor(now.getTime() / (1000 * 60 * 60 * 24));
        const lunarCycle = daysSinceEpoch % 29.5;

        // Full moon is active for 3 days (day before, day of, day after)
        const isFullMoonPeriod = lunarCycle >= 13.5 && lunarCycle <= 16.5;

        if (isFullMoonPeriod && !event.isActive) {
            // Start lunar event
            event.startDate = new Date(now);
            event.endDate = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000)); // 3 days
            event.isActive = true;
        } else if (!isFullMoonPeriod && event.isActive) {
            // End lunar event
            event.isActive = false;
        }
    }

    // Get combined effects from all active events
    static getActiveEventEffects(): {
        dropRateMultiplier: number;
        rewardMultiplier: number;
        specialItems: TreeItemDrop[];
        visualEffects: string[];
    } {
        const activeEvents = this.getActiveEvents();

        if (activeEvents.length === 0) {
            return {
                dropRateMultiplier: 1.0,
                rewardMultiplier: 1.0,
                specialItems: [],
                visualEffects: []
            };
        }

        // Combine effects from all active events
        let dropRateMultiplier = 1.0;
        let rewardMultiplier = 1.0;
        const specialItems: TreeItemDrop[] = [];
        const visualEffects: string[] = [];

        activeEvents.forEach(event => {
            dropRateMultiplier *= event.effects.dropRateMultiplier;
            rewardMultiplier *= event.effects.rewardMultiplier;
            specialItems.push(...event.effects.specialItems);
            visualEffects.push(...event.effects.visualEffects);
        });

        return {
            dropRateMultiplier,
            rewardMultiplier,
            specialItems,
            visualEffects
        };
    }

    // Check if there are any active events and show notification
    static checkAndNotifyActiveEvents(): void {
        const activeEvents = this.getActiveEvents();
        const newlyActiveEvents = activeEvents.filter(event =>
            !this.wasEventPreviouslyActive(event.id)
        );

        newlyActiveEvents.forEach(event => {
            pixelNotice(
                `🌳 ${event.name} has begun! ${event.description}`,
                8000
            );
            this.markEventAsNotified(event.id);
        });
    }

    // Helper to track which events have been notified
    private static wasEventPreviouslyActive(eventId: string): boolean {
        const notifiedEvents = localStorage.getItem(this.STORAGE_KEY);
        if (!notifiedEvents) return false;

        try {
            const parsed = JSON.parse(notifiedEvents);
            return parsed.includes(eventId);
        } catch {
            return false;
        }
    }

    private static markEventAsNotified(eventId: string): void {
        const notifiedEvents = localStorage.getItem(this.STORAGE_KEY);
        let parsed: string[] = [];

        if (notifiedEvents) {
            try {
                parsed = JSON.parse(notifiedEvents);
            } catch {
                parsed = [];
            }
        }

        if (!parsed.includes(eventId)) {
            parsed.push(eventId);
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(parsed));
        }
    }

    // Force trigger an event (for testing or admin purposes)
    static triggerEvent(eventId: string, durationHours: number = 24): boolean {
        const event = this.events.find(e => e.id === eventId);
        if (!event) return false;

        const now = new Date();
        event.startDate = new Date(now);
        event.endDate = new Date(now.getTime() + (durationHours * 60 * 60 * 1000));
        event.isActive = true;

        pixelNotice(
            `🌳 ${event.name} has been manually triggered! Duration: ${durationHours} hours`,
            5000
        );

        return true;
    }

    // Get event information for UI display
    static getEventStatus(): {
        active: TreeEvent[];
        upcoming: TreeEvent[];
        description: string;
    } {
        const activeEvents = this.getActiveEvents();
        const now = new Date();
        const upcoming = this.events
            .filter(event => event.startDate > now)
            .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
            .slice(0, 3); // Next 3 upcoming events

        let description = '';
        if (activeEvents.length > 0) {
            description = `${activeEvents.length} active event${activeEvents.length > 1 ? 's' : ''}: ${activeEvents.map(e => e.name).join(', ')}`;
        } else if (upcoming.length > 0) {
            const nextEvent = upcoming[0];
            const daysUntil = Math.ceil((nextEvent.startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            description = `Next event: ${nextEvent.name} in ${daysUntil} day${daysUntil > 1 ? 's' : ''}`;
        } else {
            description = 'No upcoming events scheduled';
        }

        return { active: activeEvents, upcoming, description };
    }
}

// Initialize events when the module is loaded
SeasonalTreeEventManager.initializeEvents();
