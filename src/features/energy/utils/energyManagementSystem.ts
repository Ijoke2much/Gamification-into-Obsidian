// Advanced Energy Management System
// Handles daily energy, restoration mechanics, and intelligent suggestions

import { PlayerData } from '../../../data/models/PlayerData';
import { playerStore } from '../../../shared/state/playerStore';

export interface EnergyState {
    energy: number;
    focus: number;
    motivation: number;
    calm: number;
    stress: number;

    // New energy system properties
    maxEnergy: number;
    energyRegenRate: number; // per hour
    restingEnergy: number; // energy while resting

    // Daily tracking
    energySpentToday: number;
    activitiesCompleted: number;
    restPeriodsToday: number;
    qualityScore: number; // 0-100 overall daily performance

    // Environmental factors
    timeOfDay: number; // 0-23
    dayOfWeek: number; // 0-6
    seasonalMultiplier: number; // weather/season effects

    // Restoration tracking
    lastRestTime: Date;
    nextRecommendedRest: Date;
    energyTrend: 'rising' | 'stable' | 'declining' | 'critical';
}

export interface EnergyActivity {
    id: string;
    name: string;
    type: 'productive' | 'restorative' | 'social' | 'creative' | 'physical';
    energyCost: number;
    duration: number; // in minutes
    energyReturn?: number; // for restorative activities
    requirements?: {
        minEnergy?: number;
        timeOfDay?: number[];
        mood?: string[];
    };
    effects: {
        energy?: number;
        focus?: number;
        motivation?: number;
        calm?: number;
        stress?: number;
    };
}

export interface EnergyRecommendation {
    id: string;
    type: 'activity' | 'rest' | 'warning' | 'opportunity';
    priority: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    suggestedActivity?: EnergyActivity;
    duration: number; // recommended duration in minutes
    expectedEffect: {
        energy: number;
        mood: string;
        productivity: number;
    };
    confidence: number; // 0-100% confidence in recommendation
}

export class EnergyManagementSystem {
    private static readonly ENERGY_ACTIVITIES: EnergyActivity[] = [
        // Productive Activities (Energy Cost)
        {
            id: 'deep_work',
            name: 'Deep Work Session',
            type: 'productive',
            energyCost: 25,
            duration: 90,
            effects: { energy: -25, focus: 15, motivation: 10, stress: 5 }
        },
        {
            id: 'creative_work',
            name: 'Creative Project',
            type: 'creative',
            energyCost: 20,
            duration: 60,
            effects: { energy: -20, focus: 5, motivation: 15, calm: 5 }
        },
        {
            id: 'admin_tasks',
            name: 'Administrative Tasks',
            type: 'productive',
            energyCost: 15,
            duration: 30,
            effects: { energy: -15, focus: -5, motivation: -5, stress: 10 }
        },

        // Restorative Activities (Energy Gain)
        {
            id: 'meditation',
            name: 'Meditation',
            type: 'restorative',
            energyCost: 0,
            energyReturn: 15,
            duration: 15,
            effects: { energy: 15, calm: 20, stress: -15, focus: 10 }
        },
        {
            id: 'nature_walk',
            name: 'Nature Walk',
            type: 'restorative',
            energyCost: 5,
            energyReturn: 20,
            duration: 30,
            effects: { energy: 15, calm: 15, stress: -10, motivation: 10 }
        },
        {
            id: 'power_nap',
            name: 'Power Nap',
            type: 'restorative',
            energyCost: 0,
            energyReturn: 30,
            duration: 20,
            effects: { energy: 30, focus: 15, stress: -20 }
        },
        {
            id: 'exercise',
            name: 'Exercise',
            type: 'physical',
            energyCost: 20,
            energyReturn: 25,
            duration: 45,
            effects: { energy: 5, motivation: 20, stress: -15, calm: 10 }
        },

        // Social Activities
        {
            id: 'social_time',
            name: 'Social Interaction',
            type: 'social',
            energyCost: 10,
            energyReturn: 15,
            duration: 60,
            effects: { energy: 5, motivation: 15, calm: 10, stress: -5 }
        }
    ];

    static async getCurrentEnergyState(): Promise<EnergyState> {
        const playerData = await playerStore.get();
        const now = new Date();
        
        // GRACEFUL DEGRADATION: Return default values if player data not available yet
        if (!playerData) {
            console.warn('[EnergyManagementSystem] Player data not available, returning default energy state');
            return {
                energy: 70,
                focus: 70,
                motivation: 70,
                calm: 70,
                stress: 30,
                maxEnergy: 100,
                energyRegenRate: 5,
                restingEnergy: 0,
                energySpentToday: 0,
                activitiesCompleted: 0,
                restPeriodsToday: 0,
                qualityScore: 75,
                timeOfDay: now.getHours(),
                dayOfWeek: now.getDay(),
                seasonalMultiplier: 1.0,
                lastRestTime: now,
                nextRecommendedRest: new Date(now.getTime() + 4 * 60 * 60 * 1000), // 4 hours
                energyTrend: 'stable'
            };
        }

        // Respect manual stat overrides if active
        const manualOverrides = (playerData as any)?.manualStatOverrides as Record<string, { value?: number; expiresAt?: string }> | undefined;
        
        const getStatWithOverride = (statName: string, defaultValue: number): number => {
            const override = manualOverrides?.[statName];
            if (override?.value != null && override?.expiresAt && new Date(override.expiresAt) > now) {
                return override.value;
            }
            return defaultValue;
        };

        return {
            energy: getStatWithOverride('energy', playerData.stats?.energy || 70),
            focus: getStatWithOverride('focus', playerData.stats?.focus || 70),
            motivation: getStatWithOverride('motivation', playerData.stats?.motivation || 70),
            calm: getStatWithOverride('calm', playerData.stats?.calm || 70),
            stress: getStatWithOverride('stress', playerData.stats?.stress || 30),

            maxEnergy: 100,
            energyRegenRate: this.calculateRegenRate(playerData),
            restingEnergy: 0,

            energySpentToday: this.getEnergySpentToday(playerData),
            activitiesCompleted: this.getActivitiesCompletedToday(playerData),
            restPeriodsToday: this.getRestPeriodsToday(playerData),
            qualityScore: this.calculateQualityScore(playerData),

            timeOfDay: now.getHours(),
            dayOfWeek: now.getDay(),
            seasonalMultiplier: this.getSeasonalMultiplier(),

            lastRestTime: this.getLastRestTime(playerData),
            nextRecommendedRest: this.calculateNextRestTime(playerData),
            energyTrend: this.calculateEnergyTrend(playerData)
        };
    }

    static async updateEnergyAfterActivity(
        activityId: string,
        duration?: number
    ): Promise<void> {
        const activity = this.ENERGY_ACTIVITIES.find(a => a.id === activityId);
        if (!activity) return;

        const playerData = await playerStore.get();
        if (!playerData) {
            throw new Error('Player data not available');
        }
        const currentEnergy = await this.getCurrentEnergyState();

        // Calculate actual effects based on current state
        const effectMultiplier = this.calculateEffectMultiplier(currentEnergy, activity);
        const actualDuration = duration || activity.duration;
        const durationMultiplier = actualDuration / activity.duration;

        const energyChange = activity.energyReturn
            ? (activity.energyReturn - activity.energyCost) * effectMultiplier * durationMultiplier
            : -activity.energyCost * effectMultiplier * durationMultiplier;

        // Apply energy changes
        const newStats = {
            ...playerData.stats,
            energy: Math.max(0, Math.min(100, currentEnergy.energy + energyChange)),
            focus: Math.max(0, Math.min(100, currentEnergy.focus + (activity.effects.focus || 0) * effectMultiplier)),
            motivation: Math.max(0, Math.min(100, currentEnergy.motivation + (activity.effects.motivation || 0) * effectMultiplier)),
            calm: Math.max(0, Math.min(100, currentEnergy.calm + (activity.effects.calm || 0) * effectMultiplier)),
            stress: Math.max(0, Math.min(100, currentEnergy.stress + (activity.effects.stress || 0) * effectMultiplier))
        };

        // Log the activity
        await this.logEnergyActivity(activityId, actualDuration, energyChange);

        // Update player data
        await playerStore.update((data: PlayerData) => {
            return { ...data, stats: newStats };
        });

        // Trigger achievement events
        try {
            const { achievementEventService } = await import('../../../features/achievements/services/achievementEventService');

            // Energy efficiency achievement (if energy was consumed efficiently)
            if (energyChange < 0) {
                const efficiency = this.calculateEnergyEfficiency(activity, energyChange, actualDuration);
                await achievementEventService.processGameEvent({
                    type: 'energy_efficiency',
                    data: {
                        efficiency,
                        activityType: activity.type,
                        energyConsumed: Math.abs(energyChange)
                    },
                    timestamp: new Date()
                });
            }

            // Energy restoration achievement (if energy was restored)
            if (energyChange > 0) {
                await achievementEventService.processGameEvent({
                    type: 'energy_restoration',
                    data: {
                        energyRestored: energyChange,
                        activityType: activity.type
                    },
                    timestamp: new Date()
                });
            }

            // Energy conservation achievement (if energy is maintained above threshold)
            if (newStats.energy >= 50) {
                const conservationDays = await this.getEnergyConservationDays();
                await achievementEventService.processGameEvent({
                    type: 'energy_conservation',
                    data: {
                        daysMaintained: conservationDays,
                        currentEnergy: newStats.energy
                    },
                    timestamp: new Date()
                });
            }
        } catch (error) {
            console.warn('Failed to process energy achievement events:', error);
        }
    }

    static async getEnergyRecommendations(): Promise<EnergyRecommendation[]> {
        const currentState = await this.getCurrentEnergyState();
        const recommendations: EnergyRecommendation[] = [];

        // Critical energy warning
        if (currentState.energy < 20) {
            recommendations.push({
                id: 'critical_rest',
                type: 'warning',
                priority: 'critical',
                title: '⚠️ Critical Energy Level',
                description: 'Your energy is critically low. Take a break to restore your energy.',
                suggestedActivity: this.ENERGY_ACTIVITIES.find(a => a.id === 'power_nap'),
                duration: 20,
                expectedEffect: { energy: 30, mood: 'refreshed', productivity: 80 },
                confidence: 95
            });
        }

        // Stress management
        if (currentState.stress > 70) {
            recommendations.push({
                id: 'stress_relief',
                type: 'activity',
                priority: 'high',
                title: '🧘 Stress Relief Needed',
                description: 'Your stress levels are high. Consider a calming activity.',
                suggestedActivity: this.ENERGY_ACTIVITIES.find(a => a.id === 'meditation'),
                duration: 15,
                expectedEffect: { energy: 15, mood: 'calm', productivity: 60 },
                confidence: 85
            });
        }

        // Focus optimization
        if (currentState.focus < 50 && currentState.energy > 40) {
            recommendations.push({
                id: 'focus_boost',
                type: 'activity',
                priority: 'medium',
                title: '🎯 Focus Enhancement',
                description: 'Your focus could be improved. Try a short energizing activity.',
                suggestedActivity: this.ENERGY_ACTIVITIES.find(a => a.id === 'exercise'),
                duration: 20,
                expectedEffect: { energy: 5, mood: 'energized', productivity: 85 },
                confidence: 75
            });
        }

        // Time-based recommendations
        if (currentState.timeOfDay >= 14 && currentState.timeOfDay <= 16 && currentState.energy < 60) {
            recommendations.push({
                id: 'afternoon_boost',
                type: 'opportunity',
                priority: 'medium',
                title: '☀️ Afternoon Energy Boost',
                description: 'Perfect time for a natural energy boost to beat the afternoon slump.',
                suggestedActivity: this.ENERGY_ACTIVITIES.find(a => a.id === 'nature_walk'),
                duration: 15,
                expectedEffect: { energy: 20, mood: 'refreshed', productivity: 70 },
                confidence: 80
            });
        }

        // Productivity opportunity
        if (currentState.energy > 80 && currentState.focus > 70) {
            recommendations.push({
                id: 'peak_productivity',
                type: 'opportunity',
                priority: 'high',
                title: '🚀 Peak Performance Window',
                description: 'You\'re in optimal condition for high-focus work!',
                suggestedActivity: this.ENERGY_ACTIVITIES.find(a => a.id === 'deep_work'),
                duration: 90,
                expectedEffect: { energy: -25, mood: 'accomplished', productivity: 95 },
                confidence: 90
            });
        }

        return recommendations.sort((a, b) => {
            const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });
    }

    // Helper methods
    private static calculateRegenRate(playerData: PlayerData): number {
        const baseRegen = 5; // base 5 energy per hour
        const levelBonus = Math.floor(playerData.level / 10); // +1 per 10 levels
        const achievementBonus = 0; // Achievements now handled by achievements module

        return baseRegen + levelBonus + achievementBonus;
    }

    private static getEnergySpentToday(playerData: PlayerData): number {
        // Implementation would track daily energy expenditure
        return 0; // Placeholder
    }

    private static getActivitiesCompletedToday(playerData: PlayerData): number {
        // Implementation would count completed activities today
        return 0; // Placeholder
    }

    private static getRestPeriodsToday(playerData: PlayerData): number {
        // Implementation would count rest periods today
        return 0; // Placeholder
    }

    private static calculateQualityScore(playerData: PlayerData): number {
        // Calculate overall daily performance score
        const energy = playerData.stats?.energy || 50;
        const focus = playerData.stats?.focus || 50;
        const motivation = playerData.stats?.motivation || 50;
        const stress = playerData.stats?.stress || 50;

        return Math.round((energy + focus + motivation + (100 - stress)) / 4);
    }

    private static getSeasonalMultiplier(): number {
        const month = new Date().getMonth();
        // Winter months have slightly lower energy (seasonal affective)
        if (month === 11 || month === 0 || month === 1) return 0.9;
        // Spring/Summer have normal/slightly higher energy
        if (month >= 3 && month <= 8) return 1.1;
        return 1.0; // Fall
    }

    private static getLastRestTime(playerData: PlayerData): Date {
        // Implementation would track last rest activity
        return new Date(Date.now() - 4 * 60 * 60 * 1000); // 4 hours ago placeholder
    }

    private static calculateNextRestTime(playerData: PlayerData): Date {
        const energy = playerData.stats?.energy || 50;
        const hoursUntilRest = energy > 70 ? 4 : energy > 40 ? 2 : 1;
        return new Date(Date.now() + hoursUntilRest * 60 * 60 * 1000);
    }

    private static calculateEnergyTrend(playerData: PlayerData): 'rising' | 'stable' | 'declining' | 'critical' {
        const energy = playerData.stats?.energy || 50;
        if (energy < 20) return 'critical';
        if (energy < 40) return 'declining';
        if (energy > 80) return 'rising';
        return 'stable';
    }

    private static calculateEffectMultiplier(
        currentState: EnergyState,
        activity: EnergyActivity
    ): number {
        let multiplier = 1.0;

        // Time of day effects
        if (activity.type === 'restorative' && currentState.timeOfDay >= 14 && currentState.timeOfDay <= 16) {
            multiplier *= 1.2; // Afternoon rest is more effective
        }

        // Energy level effects
        if (activity.type === 'productive' && currentState.energy < 30) {
            multiplier *= 0.7; // Reduced productivity when tired
        }

        // Stress effects
        if (currentState.stress > 70) {
            multiplier *= 0.8; // High stress reduces all activity effectiveness
        }

        return multiplier;
    }

    private static async logEnergyActivity(
        activityId: string,
        duration: number,
        energyChange: number
    ): Promise<void> {
        // Implementation would log activity to analytics/history
        console.log(`Energy Activity: ${activityId}, Duration: ${duration}min, Energy: ${energyChange > 0 ? '+' : ''}${energyChange}`);
    }

    private static calculateEnergyEfficiency(activity: EnergyActivity, energyChange: number, duration: number): number {
        // Calculate efficiency based on energy consumed vs. duration
        // Higher efficiency means less energy consumed per minute
        const energyPerMinute = Math.abs(energyChange) / duration;
        const baseEfficiency = 100 - (energyPerMinute * 10); // Scale to 0-100
        return Math.max(0, Math.min(100, baseEfficiency));
    }

    private static async getEnergyConservationDays(): Promise<number> {
        // Get conservation streak from the reset service
        try {
            const { EnergyResetService } = await import('../services/energyResetService');
            const resetService = EnergyResetService.getInstance(null as any); // App not needed for getter
            return resetService.getEnergyConservationStreak();
        } catch (error) {
            console.warn('Failed to get energy conservation days:', error);
            return 0;
        }
    }
}
