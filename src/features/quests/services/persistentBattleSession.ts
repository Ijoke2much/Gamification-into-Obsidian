import { App } from 'obsidian';
import { Boss, BossProgress } from '../types/BossTypes';
import { Quest } from '../utils/taskParser';

export interface BattleSession {
    sessionId: string;
    bossId: string;
    questId: string;
    startTime: Date;
    lastActivity: Date;
    totalTimeSpent: number; // in seconds
    isActive: boolean;
    isPaused: boolean;
    pauseStartTime?: Date;
    totalPauseTime: number; // in seconds
    sessionData: {
        initialBossHP: number;
        currentBossHP: number;
        damageDealt: number;
        movesUsed: number;
        phasesCompleted: number;
        questsCompleted: number;
        lastQuestCompletion?: Date;
    };
    breakReminders: {
        enabled: boolean;
        interval: number; // in minutes
        lastReminder?: Date;
        nextReminder?: Date;
    };
    autoSave: {
        enabled: boolean;
        interval: number; // in seconds
        lastSave?: Date;
    };
}

export interface SessionStats {
    totalSessions: number;
    totalTimeSpent: number; // in seconds
    averageSessionLength: number; // in seconds
    longestSession: number; // in seconds
    mostActiveBoss: string;
    sessionsThisWeek: number;
    sessionsThisMonth: number;
}

export class PersistentBattleSession {
    private static instance: PersistentBattleSession;
    private app: App;
    private activeSessions: Map<string, BattleSession> = new Map();
    private sessionHistory: BattleSession[] = [];
    private autoSaveInterval: number | null = null;
    private breakReminderInterval: number | null = null;

    private constructor(app: App) {
        this.app = app;
        this.loadSessions();
        this.startAutoSave();
        this.startBreakReminders();
    }

    static getInstance(app: App): PersistentBattleSession {
        if (!PersistentBattleSession.instance) {
            PersistentBattleSession.instance = new PersistentBattleSession(app);
        }
        return PersistentBattleSession.instance;
    }

    /**
     * Start a new battle session
     */
    startSession(bossId: string, questId: string, initialBossHP: number): BattleSession {
        const sessionId = this.generateSessionId(bossId);

        const session: BattleSession = {
            sessionId,
            bossId,
            questId,
            startTime: new Date(),
            lastActivity: new Date(),
            totalTimeSpent: 0,
            isActive: true,
            isPaused: false,
            totalPauseTime: 0,
            sessionData: {
                initialBossHP,
                currentBossHP: initialBossHP,
                damageDealt: 0,
                movesUsed: 0,
                phasesCompleted: 0,
                questsCompleted: 0
            },
            breakReminders: {
                enabled: true,
                interval: 25, // 25 minutes (Pomodoro-style)
                nextReminder: new Date(Date.now() + 25 * 60 * 1000)
            },
            autoSave: {
                enabled: true,
                interval: 30 // 30 seconds
            }
        };

        this.activeSessions.set(sessionId, session);
        this.saveSessions();

        return session;
    }

    /**
     * Resume an existing session
     */
    resumeSession(sessionId: string): BattleSession | null {
        const session = this.activeSessions.get(sessionId);
        if (!session) return null;

        if (session.isPaused) {
            // Calculate pause time
            if (session.pauseStartTime) {
                const pauseDuration = (Date.now() - session.pauseStartTime.getTime()) / 1000;
                session.totalPauseTime += pauseDuration;
                session.pauseStartTime = undefined;
            }
            session.isPaused = false;
        }

        session.lastActivity = new Date();
        this.saveSessions();

        return session;
    }

    /**
     * Pause a session
     */
    pauseSession(sessionId: string): boolean {
        const session = this.activeSessions.get(sessionId);
        if (!session || session.isPaused) return false;

        session.isPaused = true;
        session.pauseStartTime = new Date();
        this.saveSessions();

        return true;
    }

    /**
     * End a session
     */
    endSession(sessionId: string, reason: 'victory' | 'defeat' | 'abandoned' | 'manual'): BattleSession | null {
        const session = this.activeSessions.get(sessionId);
        if (!session) return null;

        // Calculate final time spent
        this.updateSessionTime(session);

        session.isActive = false;
        session.isPaused = false;

        // Move to history
        this.sessionHistory.push({ ...session });
        this.activeSessions.delete(sessionId);

        this.saveSessions();

        return session;
    }

    /**
     * Update session data during battle
     */
    updateSession(sessionId: string, updates: Partial<BattleSession['sessionData']>): boolean {
        const session = this.activeSessions.get(sessionId);
        if (!session || !session.isActive || session.isPaused) return false;

        session.sessionData = { ...session.sessionData, ...updates };
        session.lastActivity = new Date();

        // Update time spent
        this.updateSessionTime(session);

        this.saveSessions();

        return true;
    }

    /**
     * Get active session for a boss
     */
    getActiveSession(bossId: string): BattleSession | null {
        for (const session of this.activeSessions.values()) {
            if (session.bossId === bossId && session.isActive) {
                return session;
            }
        }
        return null;
    }

    /**
     * Get all active sessions
     */
    getActiveSessions(): BattleSession[] {
        return Array.from(this.activeSessions.values()).filter(session => session.isActive);
    }

    /**
     * Get session history for a boss
     */
    getBossSessionHistory(bossId: string): BattleSession[] {
        return this.sessionHistory.filter(session => session.bossId === bossId);
    }

    /**
     * Get session statistics
     */
    getSessionStats(): SessionStats {
        const allSessions = [...this.sessionHistory, ...this.activeSessions.values()];
        const totalSessions = allSessions.length;
        const totalTimeSpent = allSessions.reduce((sum, session) => sum + session.totalTimeSpent, 0);
        const averageSessionLength = totalSessions > 0 ? totalTimeSpent / totalSessions : 0;
        const longestSession = Math.max(...allSessions.map(session => session.totalTimeSpent), 0);

        // Count sessions by boss
        const bossCounts = new Map<string, number>();
        allSessions.forEach(session => {
            bossCounts.set(session.bossId, (bossCounts.get(session.bossId) || 0) + 1);
        });
        const mostActiveBoss = bossCounts.size > 0
            ? Array.from(bossCounts.entries()).reduce((a, b) => a[1] > b[1] ? a : b)[0]
            : '';

        // Count sessions this week/month
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const sessionsThisWeek = allSessions.filter(session =>
            new Date(session.startTime) >= weekAgo
        ).length;

        const sessionsThisMonth = allSessions.filter(session =>
            new Date(session.startTime) >= monthAgo
        ).length;

        return {
            totalSessions,
            totalTimeSpent,
            averageSessionLength,
            longestSession,
            mostActiveBoss,
            sessionsThisWeek,
            sessionsThisMonth
        };
    }

    /**
     * Get break reminder status
     */
    getBreakReminderStatus(sessionId: string): { shouldRemind: boolean; timeUntilReminder: number } {
        const session = this.activeSessions.get(sessionId);
        if (!session || !session.breakReminders.enabled) {
            return { shouldRemind: false, timeUntilReminder: 0 };
        }

        const now = Date.now();
        const nextReminder = session.breakReminders.nextReminder?.getTime() || 0;
        const timeUntilReminder = Math.max(0, nextReminder - now);
        const shouldRemind = timeUntilReminder === 0;

        return { shouldRemind, timeUntilReminder };
    }

    /**
     * Acknowledge break reminder
     */
    acknowledgeBreakReminder(sessionId: string): void {
        const session = this.activeSessions.get(sessionId);
        if (!session) return;

        session.breakReminders.lastReminder = new Date();
        session.breakReminders.nextReminder = new Date(
            Date.now() + session.breakReminders.interval * 60 * 1000
        );

        this.saveSessions();
    }

    /**
     * Configure break reminders
     */
    configureBreakReminders(sessionId: string, enabled: boolean, interval: number): void {
        const session = this.activeSessions.get(sessionId);
        if (!session) return;

        session.breakReminders.enabled = enabled;
        session.breakReminders.interval = interval;

        if (enabled) {
            session.breakReminders.nextReminder = new Date(
                Date.now() + interval * 60 * 1000
            );
        }

        this.saveSessions();
    }

    /**
     * Get time-based rewards for consistent daily progress
     */
    getTimeBasedRewards(sessionId: string): { xp: number; cp: number; coins: number } {
        const session = this.activeSessions.get(sessionId);
        if (!session) return { xp: 0, cp: 0, coins: 0 };

        const sessionDuration = session.totalTimeSpent / 60; // in minutes
        const consecutiveDays = this.getConsecutiveDays(session.bossId);

        // Base rewards
        let xp = Math.floor(sessionDuration * 2); // 2 XP per minute
        let cp = Math.floor(sessionDuration * 0.5); // 0.5 CP per minute
        let coins = Math.floor(sessionDuration * 1); // 1 coin per minute

        // Consecutive day bonus
        if (consecutiveDays > 0) {
            const bonus = Math.min(consecutiveDays * 0.1, 1.0); // Max 100% bonus
            xp = Math.floor(xp * (1 + bonus));
            cp = Math.floor(cp * (1 + bonus));
            coins = Math.floor(coins * (1 + bonus));
        }

        // Long session bonus (sessions over 60 minutes)
        if (sessionDuration > 60) {
            const longSessionBonus = Math.min((sessionDuration - 60) * 0.05, 0.5); // Max 50% bonus
            xp = Math.floor(xp * (1 + longSessionBonus));
            cp = Math.floor(cp * (1 + longSessionBonus));
            coins = Math.floor(coins * (1 + longSessionBonus));
        }

        return { xp, cp, coins };
    }

    // Private helper methods
    private updateSessionTime(session: BattleSession): void {
        if (session.isPaused) return;

        const now = Date.now();
        const lastActivity = session.lastActivity.getTime();
        const timeDiff = (now - lastActivity) / 1000; // in seconds

        session.totalTimeSpent += timeDiff;
        session.lastActivity = new Date();
    }

    private getConsecutiveDays(bossId: string): number {
        const bossSessions = this.getBossSessionHistory(bossId);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let consecutiveDays = 0;
        let currentDate = new Date(today);

        while (true) {
            const hasSessionOnDate = bossSessions.some(session => {
                const sessionDate = new Date(session.startTime);
                sessionDate.setHours(0, 0, 0, 0);
                return sessionDate.getTime() === currentDate.getTime();
            });

            if (hasSessionOnDate) {
                consecutiveDays++;
                currentDate.setDate(currentDate.getDate() - 1);
            } else {
                break;
            }
        }

        return consecutiveDays;
    }

    private generateSessionId(bossId: string): string {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        return `session-${bossId}-${timestamp}-${random}`;
    }

    private startAutoSave(): void {
        this.autoSaveInterval = window.setInterval(() => {
            this.saveSessions();
        }, 30000); // Save every 30 seconds
    }

    private startBreakReminders(): void {
        this.breakReminderInterval = window.setInterval(() => {
            this.checkBreakReminders();
        }, 60000); // Check every minute
    }

    private checkBreakReminders(): void {
        for (const session of this.activeSessions.values()) {
            if (session.isActive && !session.isPaused && session.breakReminders.enabled) {
                const { shouldRemind } = this.getBreakReminderStatus(session.sessionId);
                if (shouldRemind) {
                    // This would trigger a notification in the UI
                    console.log(`Break reminder for session ${session.sessionId}`);
                }
            }
        }
    }

    private async loadSessions(): Promise<void> {
        try {
            const data = await this.app.vault.adapter.read('data/battle-sessions.json');
            const parsed = JSON.parse(data);

            this.activeSessions.clear();
            this.sessionHistory = [];

            for (const sessionData of parsed.activeSessions || []) {
                const session: BattleSession = {
                    ...sessionData,
                    startTime: new Date(sessionData.startTime),
                    lastActivity: new Date(sessionData.lastActivity),
                    pauseStartTime: sessionData.pauseStartTime ? new Date(sessionData.pauseStartTime) : undefined,
                    breakReminders: {
                        ...sessionData.breakReminders,
                        lastReminder: sessionData.breakReminders.lastReminder ? new Date(sessionData.breakReminders.lastReminder) : undefined,
                        nextReminder: sessionData.breakReminders.nextReminder ? new Date(sessionData.breakReminders.nextReminder) : undefined
                    },
                    autoSave: {
                        ...sessionData.autoSave,
                        lastSave: sessionData.autoSave.lastSave ? new Date(sessionData.autoSave.lastSave) : undefined
                    }
                };

                if (session.isActive) {
                    this.activeSessions.set(session.sessionId, session);
                } else {
                    this.sessionHistory.push(session);
                }
            }

            this.sessionHistory = (parsed.sessionHistory || []).map((sessionData: any) => ({
                ...sessionData,
                startTime: new Date(sessionData.startTime),
                lastActivity: new Date(sessionData.lastActivity),
                pauseStartTime: sessionData.pauseStartTime ? new Date(sessionData.pauseStartTime) : undefined,
                breakReminders: {
                    ...sessionData.breakReminders,
                    lastReminder: sessionData.breakReminders.lastReminder ? new Date(sessionData.breakReminders.lastReminder) : undefined,
                    nextReminder: sessionData.breakReminders.nextReminder ? new Date(sessionData.breakReminders.nextReminder) : undefined
                },
                autoSave: {
                    ...sessionData.autoSave,
                    lastSave: sessionData.autoSave.lastSave ? new Date(sessionData.autoSave.lastSave) : undefined
                }
            }));

        } catch (error) {
            console.log('No existing battle sessions found, starting fresh');
        }
    }

    private async saveSessions(): Promise<void> {
        try {
            const data = {
                activeSessions: Array.from(this.activeSessions.values()),
                sessionHistory: this.sessionHistory,
                lastSaved: new Date().toISOString()
            };

            await this.app.vault.adapter.write('data/battle-sessions.json', JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Failed to save battle sessions:', error);
        }
    }

    // Cleanup method
    destroy(): void {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
        if (this.breakReminderInterval) {
            clearInterval(this.breakReminderInterval);
        }
    }
}
