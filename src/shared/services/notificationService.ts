// Global Notification Service
// Provides a centralized notification system for the entire plugin

export interface Notification {
    id: string;
    type: 'success' | 'info' | 'warning' | 'error' | 'achievement' | 'quest' | 'boss' | 'crafting' | 'shop' | 'energy' | 'habit' | 'pomodoro';
    title: string;
    message: string;
    icon: string;
    duration: number;
    timestamp: number;
    action?: {
        label: string;
        onClick: () => void;
    };
    priority?: 'low' | 'normal' | 'high';
}

class NotificationService {
    private static instance: NotificationService;
    private listeners: Set<(notifications: Notification[]) => void> = new Set();
    private notifications: Notification[] = [];
    private maxNotifications = 5;

    private constructor() { }

    static getInstance(): NotificationService {
        if (!NotificationService.instance) {
            NotificationService.instance = new NotificationService();
        }
        return NotificationService.instance;
    }

    // Subscribe to notification changes
    subscribe(callback: (notifications: Notification[]) => void): () => void {
        this.listeners.add(callback);
        callback([...this.notifications]); // Initial call with current notifications

        return () => {
            this.listeners.delete(callback);
        };
    }

    // Add a new notification
    add(notification: Omit<Notification, 'id' | 'timestamp'>): string {
        const newNotification: Notification = {
            ...notification,
            id: this.generateId(),
            timestamp: Date.now(),
        };

        // Add to beginning of array (newest first)
        this.notifications.unshift(newNotification);

        // Limit the number of notifications
        if (this.notifications.length > this.maxNotifications) {
            this.notifications = this.notifications.slice(0, this.maxNotifications);
        }

        this.notifyListeners();

        // Auto-remove after duration
        setTimeout(() => {
            this.remove(newNotification.id);
        }, newNotification.duration);

        return newNotification.id;
    }

    // Remove a notification
    remove(id: string): void {
        this.notifications = this.notifications.filter(n => n.id !== id);
        this.notifyListeners();
    }

    // Clear all notifications
    clear(): void {
        this.notifications = [];
        this.notifyListeners();
    }

    // Get current notifications
    getNotifications(): Notification[] {
        return [...this.notifications];
    }

    // Convenience methods for common notification types
    success(title: string, message: string, duration = 4000): string {
        return this.add({
            type: 'success',
            title,
            message,
            icon: '✅',
            duration,
        });
    }

    info(title: string, message: string, duration = 4000): string {
        return this.add({
            type: 'info',
            title,
            message,
            icon: 'ℹ️',
            duration,
        });
    }

    warning(title: string, message: string, duration = 5000): string {
        return this.add({
            type: 'warning',
            title,
            message,
            icon: '⚠️',
            duration,
        });
    }

    error(title: string, message: string, duration = 6000): string {
        return this.add({
            type: 'error',
            title,
            message,
            icon: '❌',
            duration,
        });
    }

    achievement(title: string, message: string, duration = 5000): string {
        return this.add({
            type: 'achievement',
            title,
            message,
            icon: '🏆',
            duration,
        });
    }

    quest(title: string, message: string, duration = 4000): string {
        return this.add({
            type: 'quest',
            title,
            message,
            icon: '🎯',
            duration,
        });
    }

    boss(title: string, message: string, duration = 6000): string {
        return this.add({
            type: 'boss',
            title,
            message,
            icon: '🐉',
            duration,
        });
    }

    crafting(title: string, message: string, duration = 4000): string {
        return this.add({
            type: 'crafting',
            title,
            message,
            icon: '⚒️',
            duration,
        });
    }

    shop(title: string, message: string, duration = 4000): string {
        return this.add({
            type: 'shop',
            title,
            message,
            icon: '🛒',
            duration,
        });
    }

    energy(title: string, message: string, duration = 4000): string {
        return this.add({
            type: 'energy',
            title,
            message,
            icon: '⚡',
            duration,
        });
    }

    habit(title: string, message: string, duration = 4000): string {
        return this.add({
            type: 'habit',
            title,
            message,
            icon: '🌱',
            duration,
        });
    }

    pomodoro(title: string, message: string, duration = 4000): string {
        return this.add({
            type: 'pomodoro',
            title,
            message,
            icon: '⏰',
            duration,
        });
    }

    private notifyListeners(): void {
        this.listeners.forEach(callback => {
            try {
                callback([...this.notifications]);
            } catch (error) {
                console.error('Error in notification listener:', error);
            }
        });
    }

    private generateId(): string {
        return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();

// Export convenience functions for easy use
export const notify = {
    success: (title: string, message: string, duration?: number) => notificationService.success(title, message, duration),
    info: (title: string, message: string, duration?: number) => notificationService.info(title, message, duration),
    warning: (title: string, message: string, duration?: number) => notificationService.warning(title, message, duration),
    error: (title: string, message: string, duration?: number) => notificationService.error(title, message, duration),
    achievement: (title: string, message: string, duration?: number) => notificationService.achievement(title, message, duration),
    quest: (title: string, message: string, duration?: number) => notificationService.quest(title, message, duration),
    boss: (title: string, message: string, duration?: number) => notificationService.boss(title, message, duration),
    crafting: (title: string, message: string, duration?: number) => notificationService.crafting(title, message, duration),
    shop: (title: string, message: string, duration?: number) => notificationService.shop(title, message, duration),
    energy: (title: string, message: string, duration?: number) => notificationService.energy(title, message, duration),
    habit: (title: string, message: string, duration?: number) => notificationService.habit(title, message, duration),
    pomodoro: (title: string, message: string, duration?: number) => notificationService.pomodoro(title, message, duration),
};
