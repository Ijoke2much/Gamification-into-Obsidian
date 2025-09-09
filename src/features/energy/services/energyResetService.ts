// Energy Daily Reset Service
// Handles automatic daily energy restoration and reset mechanics

import { App, Notice } from 'obsidian';
import { playerStore } from '../../../shared/state/playerStore';
import { runtimeConfig } from '../../../shared/state/config';

export interface DailyResetState {
    lastResetDate: string; // YYYY-MM-DD format
    resetHour: number;
    consecutiveDays: number;
    energyConservationStreak: number;
}

export class EnergyResetService {
    private static instance: EnergyResetService;
    private app: App;
    private resetCheckInterval: NodeJS.Timeout | null = null;
    private resetState: DailyResetState;

    private constructor(app: App) {
        this.app = app;
        this.resetState = this.loadResetState();
    }

    static getInstance(app: App): EnergyResetService {
        if (!EnergyResetService.instance) {
            EnergyResetService.instance = new EnergyResetService(app);
        }
        return EnergyResetService.instance;
    }

    /**
     * Initialize the daily reset service
     */
    async initialize(): Promise<void> {
        // Check if we missed a reset (plugin was off during reset time)
        await this.checkMissedReset();

        // Start the reset check interval (every minute)
        this.startResetMonitoring();

        console.log('[EnergyResetService] Daily reset monitoring started');
    }

    /**
     * Stop the reset service
     */
    cleanup(): void {
        if (this.resetCheckInterval) {
            clearInterval(this.resetCheckInterval);
            this.resetCheckInterval = null;
        }
        console.log('[EnergyResetService] Daily reset monitoring stopped');
    }

    /**
     * Start monitoring for daily resets
     */
    private startResetMonitoring(): void {
        this.resetCheckInterval = setInterval(() => {
            this.checkForDailyReset();
        }, 60000); // Check every minute
    }

    /**
     * Check if it's time for a daily reset
     */
    private async checkForDailyReset(): Promise<void> {
        const now = new Date();
        const today = this.formatDate(now);
        const currentHour = now.getHours();

        // Check if we've already reset today
        if (this.resetState.lastResetDate === today) {
            return;
        }

        // Check if it's the reset hour
        if (currentHour === runtimeConfig.dailyResetHour) {
            await this.performDailyReset();
        }
    }

    /**
     * Check if we missed a reset (when plugin was inactive)
     */
    private async checkMissedReset(): Promise<void> {
        const now = new Date();
        const today = this.formatDate(now);
        const resetHour = runtimeConfig.dailyResetHour;

        // If last reset was yesterday or earlier, and we're past reset time
        if (this.resetState.lastResetDate < today) {
            // If it's past reset time today, apply the reset
            if (now.getHours() >= resetHour) {
                await this.performDailyReset();
            }
        }
    }

    /**
     * Perform the actual daily reset
     */
    private async performDailyReset(): Promise<void> {
        try {
            const playerData = await playerStore.get();
            if (!playerData) {
                console.warn('[EnergyResetService] No player data available for reset');
                return;
            }

            const currentStats = playerData.stats || {};
            const restore = runtimeConfig.dailyRestore;

            // Calculate energy conservation streak
            const energyBeforeReset = currentStats.energy || 0;
            if (energyBeforeReset >= 50) {
                this.resetState.energyConservationStreak++;
            } else {
                this.resetState.energyConservationStreak = 0;
            }

            // Apply daily restoration
            const newStats = {
                ...currentStats,
                energy: Math.min(100, (currentStats.energy || 0) + (restore.energy || 0)),
                focus: Math.min(100, (currentStats.focus || 0) + (restore.focus || 0)),
                motivation: Math.min(100, (currentStats.motivation || 0) + (restore.motivation || 0)),
                calm: Math.min(100, (currentStats.calm || 0) + (restore.calm || 0)),
                stress: Math.max(0, (currentStats.stress || 0) - (restore.stressReduce || 0))
            };

            // Update player data
            await playerStore.update(data => ({
                ...data,
                stats: newStats
            }));

            // Update reset state
            const today = this.formatDate(new Date());
            this.resetState.lastResetDate = today;
            this.resetState.consecutiveDays++;
            this.saveResetState();

            // Show notification
            this.showResetNotification(restore, this.resetState.energyConservationStreak);

            // Trigger achievement events for consecutive resets
            this.triggerResetAchievements();

            console.log(`[EnergyResetService] Daily reset completed for ${today}`);

        } catch (error) {
            console.error('[EnergyResetService] Failed to perform daily reset:', error);
        }
    }

    /**
     * Show reset notification to user
     */
    private showResetNotification(restore: typeof runtimeConfig.dailyRestore, conservationStreak: number): void {
        let message = `🌅 Daily Energy Reset Applied!\n`;
        message += `+${restore.energy} Energy, +${restore.focus} Focus, +${restore.motivation} Motivation`;

        if (conservationStreak > 0) {
            message += `\n⚡ Energy Conservation Streak: ${conservationStreak} days!`;
        }

        new Notice(message, 5000);
    }

    /**
     * Trigger achievement events for reset milestones
     */
    private async triggerResetAchievements(): Promise<void> {
        try {
            const { achievementEventService } = await import('../../achievements/services/achievementEventService');

            // Daily reset achievement
            await achievementEventService.processGameEvent({
                type: 'login_streak',
                data: {
                    streak: this.resetState.consecutiveDays,
                    type: 'daily_reset'
                },
                timestamp: new Date()
            });

            // Energy conservation achievement
            if (this.resetState.energyConservationStreak > 0) {
                await achievementEventService.processGameEvent({
                    type: 'energy_conservation',
                    data: {
                        streak: this.resetState.energyConservationStreak,
                        days: this.resetState.energyConservationStreak
                    },
                    timestamp: new Date()
                });
            }

        } catch (error) {
            console.warn('[EnergyResetService] Failed to trigger reset achievements:', error);
        }
    }

    /**
     * Get energy conservation streak for analytics
     */
    getEnergyConservationStreak(): number {
        return this.resetState.energyConservationStreak;
    }

    /**
     * Get consecutive reset days for analytics
     */
    getConsecutiveResetDays(): number {
        return this.resetState.consecutiveDays;
    }

    /**
     * Format date as YYYY-MM-DD
     */
    private formatDate(date: Date): string {
        return date.toISOString().split('T')[0];
    }

    /**
     * Load reset state from localStorage
     */
    private loadResetState(): DailyResetState {
        try {
            const saved = localStorage.getItem('gamified-energy-reset-state');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (error) {
            console.warn('[EnergyResetService] Failed to load reset state:', error);
        }

        // Default state
        return {
            lastResetDate: '1970-01-01',
            resetHour: runtimeConfig.dailyResetHour,
            consecutiveDays: 0,
            energyConservationStreak: 0
        };
    }

    /**
     * Save reset state to localStorage
     */
    private saveResetState(): void {
        try {
            localStorage.setItem('gamified-energy-reset-state', JSON.stringify(this.resetState));
        } catch (error) {
            console.warn('[EnergyResetService] Failed to save reset state:', error);
        }
    }

    /**
     * Manual reset for testing or admin purposes
     */
    async performManualReset(): Promise<void> {
        await this.performDailyReset();
        new Notice('🔧 Manual energy reset performed!', 3000);
    }
}
