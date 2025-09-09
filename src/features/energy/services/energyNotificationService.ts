// Energy Notification Service
// Provides intelligent notifications for energy management

import { Notice } from 'obsidian';
import { playerStore, PlayerStateChange } from '../../../shared/state/playerStore';
import { PlayerData } from '../../../data/models/PlayerData';
import { EnergyManagementSystem, EnergyRecommendation } from '../utils/energyManagementSystem';

export interface EnergyNotificationSettings {
    enableLowEnergyWarnings: boolean;
    enableRestSuggestions: boolean;
    enableProductivityTips: boolean;
    lowEnergyThreshold: number; // 0-100
    restSuggestionInterval: number; // minutes
    notificationDuration: number; // ms
}

export interface EnergyAlert {
    id: string;
    type: 'low_energy' | 'rest_suggestion' | 'productivity_tip' | 'energy_restored' | 'high_stress';
    title: string;
    message: string;
    severity: 'info' | 'warning' | 'critical';
    timestamp: Date;
    acknowledged: boolean;
}

export class EnergyNotificationService {
    private static instance: EnergyNotificationService;
    private settings: EnergyNotificationSettings;
    private lastNotifications: Map<string, Date> = new Map();
    private alertHistory: EnergyAlert[] = [];
    private isActive: boolean = false;
    private unsubscribePlayerStore?: () => void;

    private constructor() {
        this.settings = this.loadNotificationSettings();
    }

    static getInstance(): EnergyNotificationService {
        if (!EnergyNotificationService.instance) {
            EnergyNotificationService.instance = new EnergyNotificationService();
        }
        return EnergyNotificationService.instance;
    }

    /**
     * Initialize the notification service
     */
    async initialize(): Promise<void> {
        if (this.isActive) return;

        this.isActive = true;

        // Subscribe to player data changes
        this.unsubscribePlayerStore = playerStore.onChange((change: PlayerStateChange) => {
            if (change.type === 'stats-changed') {
                this.handleStatsChange(change.payload);
            }
        });

        // Start periodic checks
        this.startPeriodicChecks();

        console.log('[EnergyNotificationService] Notification service initialized');
    }

    /**
     * Cleanup the notification service
     */
    cleanup(): void {
        if (!this.isActive) return;

        this.isActive = false;

        if (this.unsubscribePlayerStore) {
            this.unsubscribePlayerStore();
            this.unsubscribePlayerStore = undefined;
        }

        console.log('[EnergyNotificationService] Notification service stopped');
    }

    /**
     * Handle player stats changes
     */
    private async handleStatsChange(stats: any): Promise<void> {
        if (!this.settings.enableLowEnergyWarnings) return;

        const energy = stats.energy || 0;
        const focus = stats.focus || 0;
        const stress = stats.stress || 0;

        // Check for low energy warning
        if (energy <= this.settings.lowEnergyThreshold) {
            await this.triggerLowEnergyWarning(energy, focus, stress);
        }

        // Check for high stress warning
        if (stress >= 80) {
            await this.triggerHighStressWarning(stress);
        }

        // Check for energy restoration complete
        if (energy >= 90 && this.wasEnergyLow()) {
            await this.triggerEnergyRestoredNotification(energy);
        }
    }

    /**
     * Start periodic checks for rest suggestions
     */
    private startPeriodicChecks(): void {
        if (!this.settings.enableRestSuggestions) return;

        setInterval(async () => {
            await this.checkForRestSuggestions();
        }, this.settings.restSuggestionInterval * 60 * 1000);
    }

    /**
     * Trigger low energy warning
     */
    private async triggerLowEnergyWarning(energy: number, focus: number, stress: number): Promise<void> {
        const notificationKey = 'low_energy';

        // Throttle notifications (max once per 30 minutes)
        if (this.isRecentlyNotified(notificationKey, 30)) return;

        let severity: EnergyAlert['severity'] = 'warning';
        let title = '⚠️ Low Energy Warning';
        let message = `Energy is at ${energy}%. Consider taking a break or switching to lighter tasks.`;

        if (energy <= 10) {
            severity = 'critical';
            title = '🔴 Critical Energy Level';
            message = `Energy critically low (${energy}%)! Take a rest immediately to avoid burnout.`;
        }

        // Get personalized recommendations
        const recommendations = await EnergyManagementSystem.getEnergyRecommendations();
        const restActivity = recommendations.find(r => r.suggestedActivity?.type === 'restorative');

        if (restActivity && restActivity.suggestedActivity) {
            message += `\n\n💡 Suggestion: ${restActivity.suggestedActivity.name} (${restActivity.suggestedActivity.duration}min)`;
        }

        this.showNotification(title, message, severity);
        this.recordAlert(notificationKey, title, message, severity);
        this.lastNotifications.set(notificationKey, new Date());
    }

    /**
     * Trigger high stress warning
     */
    private async triggerHighStressWarning(stress: number): Promise<void> {
        const notificationKey = 'high_stress';

        if (this.isRecentlyNotified(notificationKey, 45)) return;

        const title = '😰 High Stress Alert';
        const message = `Stress level is high (${stress}%). Consider meditation, deep breathing, or a calming activity.`;

        this.showNotification(title, message, 'warning');
        this.recordAlert(notificationKey, title, message, 'warning');
        this.lastNotifications.set(notificationKey, new Date());
    }

    /**
     * Trigger energy restored notification
     */
    private async triggerEnergyRestoredNotification(energy: number): Promise<void> {
        const notificationKey = 'energy_restored';

        if (this.isRecentlyNotified(notificationKey, 60)) return;

        const title = '⚡ Energy Restored!';
        const message = `Great job! Your energy is back up to ${energy}%. Ready to tackle new challenges!`;

        this.showNotification(title, message, 'info');
        this.recordAlert(notificationKey, title, message, 'info');
        this.lastNotifications.set(notificationKey, new Date());
    }

    /**
     * Check for rest suggestions based on work patterns
     */
    private async checkForRestSuggestions(): Promise<void> {
        if (!this.settings.enableRestSuggestions) return;

        const playerData = await playerStore.get();
        if (!playerData?.stats) return;

        const stats = playerData.stats;
        const energy = stats.energy || 0;
        const focus = stats.focus || 0;

        // Suggest rest if energy/focus declining and it's been a while
        if (energy < 60 || focus < 50) {
            const notificationKey = 'rest_suggestion';

            if (this.isRecentlyNotified(notificationKey, 90)) return;

            const recommendations = await EnergyManagementSystem.getEnergyRecommendations();
            const restActivity = recommendations.find(r => r.suggestedActivity?.type === 'restorative');

            if (restActivity && restActivity.confidence > 60 && restActivity.suggestedActivity) {
                const title = '🌿 Rest Suggestion';
                const message = `You've been working hard! Consider: ${restActivity.suggestedActivity.name}\n` +
                    `Duration: ${restActivity.suggestedActivity.duration}min\n` +
                    `Benefits: ${restActivity.description}`;

                this.showNotification(title, message, 'info');
                this.recordAlert(notificationKey, title, message, 'info');
                this.lastNotifications.set(notificationKey, new Date());
            }
        }
    }

    /**
     * Show productivity tip notifications
     */
    async showProductivityTip(): Promise<void> {
        if (!this.settings.enableProductivityTips) return;

        const notificationKey = 'productivity_tip';
        if (this.isRecentlyNotified(notificationKey, 120)) return;

        const tips = [
            "💡 Try the Pomodoro technique: 25min work + 5min break",
            "🎯 Set clear goals for your next work session",
            "🧘 Take a 2-minute breathing break between tasks",
            "🌱 Keep a plant nearby - it helps with focus and calm",
            "💧 Stay hydrated - dehydration affects mental performance",
            "🎵 Instrumental music can enhance concentration",
            "📱 Put your phone in another room to reduce distractions"
        ];

        const randomTip = tips[Math.floor(Math.random() * tips.length)];
        const title = 'Productivity Tip';

        this.showNotification(title, randomTip, 'info');
        this.recordAlert(notificationKey, title, randomTip, 'info');
        this.lastNotifications.set(notificationKey, new Date());
    }

    /**
     * Check if a notification type was recently sent
     */
    private isRecentlyNotified(key: string, minutes: number): boolean {
        const lastNotification = this.lastNotifications.get(key);
        if (!lastNotification) return false;

        const timeDiff = Date.now() - lastNotification.getTime();
        return timeDiff < (minutes * 60 * 1000);
    }

    /**
     * Check if energy was recently low
     */
    private wasEnergyLow(): boolean {
        const lowEnergyAlert = this.alertHistory
            .filter(alert => alert.type === 'low_energy')
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

        if (!lowEnergyAlert) return false;

        // Check if low energy alert was within last 2 hours
        const timeDiff = Date.now() - lowEnergyAlert.timestamp.getTime();
        return timeDiff < (2 * 60 * 60 * 1000);
    }

    /**
     * Show notification to user
     */
    private showNotification(title: string, message: string, severity: EnergyAlert['severity']): void {
        const duration = severity === 'critical' ? 8000 : this.settings.notificationDuration;

        const icon = severity === 'critical' ? '🚨' :
            severity === 'warning' ? '⚠️' : 'ℹ️';

        new Notice(`${icon} ${title}\n${message}`, duration);
    }

    /**
     * Record alert in history
     */
    private recordAlert(
        type: EnergyAlert['type'],
        title: string,
        message: string,
        severity: EnergyAlert['severity']
    ): void {
        const alert: EnergyAlert = {
            id: `${type}_${Date.now()}`,
            type,
            title,
            message,
            severity,
            timestamp: new Date(),
            acknowledged: false
        };

        this.alertHistory.push(alert);

        // Keep only last 50 alerts
        if (this.alertHistory.length > 50) {
            this.alertHistory = this.alertHistory.slice(-25);
        }
    }

    /**
     * Get alert history for analytics
     */
    getAlertHistory(): EnergyAlert[] {
        return [...this.alertHistory];
    }

    /**
     * Update notification settings
     */
    updateSettings(newSettings: Partial<EnergyNotificationSettings>): void {
        this.settings = { ...this.settings, ...newSettings };
        this.saveNotificationSettings();
    }

    /**
     * Get current notification settings
     */
    getSettings(): EnergyNotificationSettings {
        return { ...this.settings };
    }

    /**
     * Load notification settings from localStorage
     */
    private loadNotificationSettings(): EnergyNotificationSettings {
        try {
            const saved = localStorage.getItem('gamified-energy-notification-settings');
            if (saved) {
                return { ...this.getDefaultSettings(), ...JSON.parse(saved) };
            }
        } catch (error) {
            console.warn('[EnergyNotificationService] Failed to load settings:', error);
        }

        return this.getDefaultSettings();
    }

    /**
     * Save notification settings to localStorage
     */
    private saveNotificationSettings(): void {
        try {
            localStorage.setItem('gamified-energy-notification-settings', JSON.stringify(this.settings));
        } catch (error) {
            console.warn('[EnergyNotificationService] Failed to save settings:', error);
        }
    }

    /**
     * Get default notification settings
     */
    private getDefaultSettings(): EnergyNotificationSettings {
        return {
            enableLowEnergyWarnings: true,
            enableRestSuggestions: true,
            enableProductivityTips: true,
            lowEnergyThreshold: 25,
            restSuggestionInterval: 60, // 60 minutes
            notificationDuration: 5000 // 5 seconds
        };
    }
}
