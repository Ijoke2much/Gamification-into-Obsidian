// Quest Progress Tracking Service for Pomodoro Integration
// Tracks and updates quest progress in real-time during Pomodoro sessions

import { App, TFile } from 'obsidian';
import { AttachedQuest } from '../types/EnhancedTaskLinking';
import { pixelNotice } from '../../../shared/utils/noticeUtils';

export interface QuestProgressUpdate {
    questId: string;
    filePath: string;
    lineNumber: number;
    progress: number;
    subtasksCompleted: number;
    totalSubtasks: number;
    timeSpent: number; // in minutes
    sessionType: string;
    timestamp: Date;
}

export interface QuestProgressSession {
    questId: string;
    sessionId: string;
    startTime: Date;
    endTime?: Date;
    sessionType: string;
    progressUpdates: QuestProgressUpdate[];
    totalProgressGained: number;
    subtasksCompleted: number;
    focusScore: number; // 0-100
    interruptions: number;
}

export class QuestProgressTracker {
    private app: App;
    private activeSessions: Map<string, QuestProgressSession> = new Map();
    private progressHistory: QuestProgressUpdate[] = [];

    constructor(app: App) {
        this.app = app;
    }

    /**
     * Start tracking progress for a quest during a Pomodoro session
     */
    startQuestTracking(quest: AttachedQuest, sessionType: string): string {
        const sessionId = `quest-${quest.id}-${Date.now()}`;
        const session: QuestProgressSession = {
            questId: quest.id,
            sessionId,
            startTime: new Date(),
            sessionType,
            progressUpdates: [],
            totalProgressGained: 0,
            subtasksCompleted: 0,
            focusScore: 100,
            interruptions: 0
        };

        this.activeSessions.set(sessionId, session);

        console.log(`🎯 Started tracking quest: ${quest.title} (${sessionId})`);
        return sessionId;
    }

    /**
     * Update quest progress during a session
     */
    async updateQuestProgress(
        sessionId: string,
        quest: AttachedQuest,
        progressDelta: number,
        subtaskIndex?: number
    ): Promise<QuestProgressUpdate | null> {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
            console.warn(`Session ${sessionId} not found`);
            return null;
        }

        // Calculate new progress
        const newProgress = Math.min(100, quest.progress + progressDelta);
        const actualProgressDelta = newProgress - quest.progress;

        // Create progress update
        const update: QuestProgressUpdate = {
            questId: quest.id,
            filePath: quest.filePath,
            lineNumber: quest.lineNumber,
            progress: newProgress,
            subtasksCompleted: quest.subtasks?.filter(s => s.completed).length || 0,
            totalSubtasks: quest.subtasks?.length || 0,
            timeSpent: this.calculateSessionTime(session),
            sessionType: session.sessionType,
            timestamp: new Date()
        };

        // Update session
        session.progressUpdates.push(update);
        session.totalProgressGained += actualProgressDelta;

        if (subtaskIndex !== undefined) {
            session.subtasksCompleted++;
        }

        // Store in history
        this.progressHistory.push(update);

        // Update the quest file if progress was made
        if (actualProgressDelta > 0) {
            await this.updateQuestFile(quest, newProgress, subtaskIndex);
        }

        console.log(`📈 Quest progress updated: ${quest.title} (+${actualProgressDelta}%)`);
        return update;
    }

    /**
     * Complete a quest tracking session
     */
    async completeQuestSession(
        sessionId: string,
        quest: AttachedQuest,
        finalProgress: number,
        focusScore: number = 100
    ): Promise<QuestProgressSession | null> {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
            console.warn(`Session ${sessionId} not found`);
            return null;
        }

        // Finalize session
        session.endTime = new Date();
        session.focusScore = focusScore;
        session.totalProgressGained = finalProgress - quest.progress;

        // Create final progress update
        const finalUpdate: QuestProgressUpdate = {
            questId: quest.id,
            filePath: quest.filePath,
            lineNumber: quest.lineNumber,
            progress: finalProgress,
            subtasksCompleted: quest.subtasks?.filter(s => s.completed).length || 0,
            totalSubtasks: quest.subtasks?.length || 0,
            timeSpent: this.calculateSessionTime(session),
            sessionType: session.sessionType,
            timestamp: new Date()
        };

        session.progressUpdates.push(finalUpdate);
        this.progressHistory.push(finalUpdate);

        // Update quest file with final progress
        await this.updateQuestFile(quest, finalProgress);

        // Remove from active sessions
        this.activeSessions.delete(sessionId);

        console.log(`✅ Quest session completed: ${quest.title} (${session.totalProgressGained}% progress gained)`);
        return session;
    }

    /**
     * Record an interruption during quest tracking
     */
    recordInterruption(sessionId: string): void {
        const session = this.activeSessions.get(sessionId);
        if (session) {
            session.interruptions++;
            // Reduce focus score based on interruptions
            session.focusScore = Math.max(0, 100 - (session.interruptions * 10));
            console.log(`⚠️ Interruption recorded for session ${sessionId}. Focus score: ${session.focusScore}`);
        }
    }

    /**
     * Get progress statistics for a quest
     */
    getQuestProgressStats(questId: string): {
        totalSessions: number;
        totalProgressGained: number;
        averageFocusScore: number;
        totalTimeSpent: number;
        subtasksCompleted: number;
        lastUpdated: Date | null;
    } {
        const questUpdates = this.progressHistory.filter(update => update.questId === questId);

        if (questUpdates.length === 0) {
            return {
                totalSessions: 0,
                totalProgressGained: 0,
                averageFocusScore: 0,
                totalTimeSpent: 0,
                subtasksCompleted: 0,
                lastUpdated: null
            };
        }

        const sessions = new Set(questUpdates.map(update => update.timestamp.toDateString()));
        const totalProgressGained = questUpdates.reduce((sum, update) => sum + update.progress, 0) / questUpdates.length;
        const totalTimeSpent = questUpdates.reduce((sum, update) => sum + update.timeSpent, 0);
        const subtasksCompleted = questUpdates.reduce((sum, update) => sum + update.subtasksCompleted, 0);
        const lastUpdated = questUpdates[questUpdates.length - 1].timestamp;

        return {
            totalSessions: sessions.size,
            totalProgressGained,
            averageFocusScore: 85, // Placeholder - would need to track focus scores
            totalTimeSpent,
            subtasksCompleted,
            lastUpdated
        };
    }

    /**
     * Get all active quest tracking sessions
     */
    getActiveSessions(): QuestProgressSession[] {
        return Array.from(this.activeSessions.values());
    }

    /**
     * Get progress history for all quests
     */
    getProgressHistory(): QuestProgressUpdate[] {
        return [...this.progressHistory];
    }

    /**
     * Calculate session time in minutes
     */
    private calculateSessionTime(session: QuestProgressSession): number {
        const endTime = session.endTime || new Date();
        return Math.round((endTime.getTime() - session.startTime.getTime()) / (1000 * 60));
    }

    /**
     * Update the quest file with new progress
     */
    private async updateQuestFile(quest: AttachedQuest, progress: number, subtaskIndex?: number): Promise<void> {
        try {
            const file = this.app.vault.getAbstractFileByPath(quest.filePath);
            if (!(file instanceof TFile)) {
                console.warn(`Quest file not found: ${quest.filePath}`);
                return;
            }

            const content = await this.app.vault.read(file);
            const lines = content.split('\n');

            // Update the main quest line
            if (quest.lineNumber > 0 && quest.lineNumber <= lines.length) {
                const lineIndex = quest.lineNumber - 1;
                let line = lines[lineIndex];

                // Add or update progress indicator
                if (line.includes('#progress-')) {
                    line = line.replace(/#progress-\d+/, `#progress-${Math.round(progress)}`);
                } else {
                    line += ` #progress-${Math.round(progress)}`;
                }

                lines[lineIndex] = line;
            }

            // Update subtask if specified
            if (subtaskIndex !== undefined && quest.subtasks && quest.subtasks[subtaskIndex]) {
                const subtask = quest.subtasks[subtaskIndex];
                const subtaskLineIndex = quest.lineNumber + subtaskIndex;

                if (subtaskLineIndex < lines.length) {
                    let subtaskLine = lines[subtaskLineIndex];

                    if (subtask.completed && subtaskLine.includes('- [ ]')) {
                        subtaskLine = subtaskLine.replace('- [ ]', '- [x]');
                        lines[subtaskLineIndex] = subtaskLine;
                    }
                }
            }

            // Write updated content back to file
            await this.app.vault.modify(file, lines.join('\n'));

            console.log(`📝 Updated quest file: ${quest.filePath} (${progress}% progress)`);
        } catch (error) {
            console.error('Error updating quest file:', error);
            pixelNotice('Failed to update quest progress in file');
        }
    }

    /**
     * Estimate quest completion time based on progress rate
     */
    estimateCompletionTime(quest: AttachedQuest, currentProgress: number): number {
        const stats = this.getQuestProgressStats(quest.id);

        if (stats.totalSessions === 0 || stats.totalProgressGained === 0) {
            // Default estimation based on difficulty and subtasks
            const baseTime = {
                'easy': 15,
                'medium': 25,
                'hard': 45,
                'epic': 90
            };

            return baseTime[quest.difficulty] || 25;
        }

        // Calculate based on historical progress rate
        const averageProgressPerSession = stats.totalProgressGained / stats.totalSessions;
        const remainingProgress = 100 - currentProgress;
        const estimatedSessions = remainingProgress / averageProgressPerSession;
        const averageSessionTime = stats.totalTimeSpent / stats.totalSessions;

        return Math.ceil(estimatedSessions * averageSessionTime);
    }

    /**
     * Get quests that are close to completion
     */
    getQuestsNearCompletion(threshold: number = 80): QuestProgressUpdate[] {
        return this.progressHistory
            .filter(update => update.progress >= threshold)
            .sort((a, b) => b.progress - a.progress);
    }

    /**
     * Clear progress history (useful for testing or reset)
     */
    clearProgressHistory(): void {
        this.progressHistory = [];
        this.activeSessions.clear();
        console.log('🧹 Quest progress history cleared');
    }
}
