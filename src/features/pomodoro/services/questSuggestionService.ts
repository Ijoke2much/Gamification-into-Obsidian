// Smart Quest Suggestion Service for Pomodoro Integration
// Provides intelligent quest recommendations based on session type, time, and user patterns

import { App, TFile } from 'obsidian';
import { AttachedQuest, QuestSuggestion } from '../types/EnhancedTaskLinking';

export interface QuestSuggestionContext {
    sessionType: 'classic' | 'extended' | 'short' | 'custom' | 'deepWork' | 'quickFocus';
    availableTime: number; // in minutes
    timeOfDay: number; // hour (0-23)
    dayOfWeek: number; // 0-6 (Sunday = 0)
    userPreferences: {
        preferredDifficulty: 'easy' | 'medium' | 'hard' | 'epic';
        skillFocus: string[];
        projectFocus: string[];
    };
    recentQuests: string[]; // IDs of recently completed quests
    currentStreak: number;
}

export interface QuestCandidate {
    id: string;
    title: string;
    filePath: string;
    lineNumber: number;
    difficulty: 'easy' | 'medium' | 'hard' | 'epic';
    estimatedDuration: number; // in minutes
    priority: 'lowest' | 'low' | 'medium' | 'high' | 'highest' | 'urgent';
    skills: string[];
    tags: string[];
    dueDate?: string;
    rewards: {
        xp: number;
        coins: number;
        cp?: number;
        materials?: string[];
    };
    subtasks: Array<{
        text: string;
        completed: boolean;
        estimatedMinutes?: number;
    }>;
    isTimedQuest: boolean;
    lastWorkedOn?: Date;
    completionRate?: number; // 0-1
}

export class QuestSuggestionService {
    private app: App;
    private questCache: Map<string, QuestCandidate[]> = new Map();
    private cacheExpiry: number = 5 * 60 * 1000; // 5 minutes

    constructor(app: App) {
        this.app = app;
    }

    /**
     * Get smart quest suggestions for a Pomodoro session
     */
    async getQuestSuggestions(context: QuestSuggestionContext): Promise<QuestSuggestion[]> {
        try {
            // Get all available quests
            const candidates = await this.getAllQuestCandidates();

            // Filter and rank quests based on context
            const suggestions = this.rankQuestsForContext(candidates, context);

            // Return top suggestions
            return suggestions.slice(0, 5).map(suggestion => ({
                quest: this.convertToAttachedQuest(suggestion),
                relevanceScore: suggestion.relevanceScore,
                reason: suggestion.reason,
                suggestedSessionType: context.sessionType
            }));
        } catch (error) {
            console.error('Error getting quest suggestions:', error);
            return [];
        }
    }

    /**
     * Get quests that match a specific session type
     */
    async getQuestsForSessionType(sessionType: string): Promise<QuestSuggestion[]> {
        const context: QuestSuggestionContext = {
            sessionType: sessionType as any,
            availableTime: this.getSessionDuration(sessionType),
            timeOfDay: new Date().getHours(),
            dayOfWeek: new Date().getDay(),
            userPreferences: {
                preferredDifficulty: 'medium',
                skillFocus: [],
                projectFocus: []
            },
            recentQuests: [],
            currentStreak: 0
        };

        return this.getQuestSuggestions(context);
    }

    /**
     * Get quick focus suggestions for short sessions
     */
    async getQuickFocusSuggestions(): Promise<QuestSuggestion[]> {
        const candidates = await this.getAllQuestCandidates();

        // Filter for quick, easy tasks
        const quickTasks = candidates.filter(quest =>
            quest.estimatedDuration <= 15 &&
            quest.difficulty === 'easy' &&
            quest.subtasks.length <= 3
        );

        return quickTasks.slice(0, 3).map(quest => ({
            quest: this.convertToAttachedQuest(quest),
            relevanceScore: 0.9,
            reason: 'Perfect for quick focus sessions',
            suggestedSessionType: 'quickFocus'
        }));
    }

    /**
     * Get deep work suggestions for extended sessions
     */
    async getDeepWorkSuggestions(): Promise<QuestSuggestion[]> {
        const candidates = await this.getAllQuestCandidates();

        // Filter for complex, high-value tasks
        const deepWorkTasks = candidates.filter(quest =>
            quest.estimatedDuration >= 45 &&
            (quest.difficulty === 'hard' || quest.difficulty === 'epic') &&
            quest.rewards.xp >= 50
        );

        return deepWorkTasks.slice(0, 3).map(quest => ({
            quest: this.convertToAttachedQuest(quest),
            relevanceScore: 0.9,
            reason: 'Ideal for deep work sessions',
            suggestedSessionType: 'deepWork'
        }));
    }

    /**
     * Get all available quest candidates from the vault
     */
    private async getAllQuestCandidates(): Promise<QuestCandidate[]> {
        const cacheKey = 'all_quests';
        const cached = this.questCache.get(cacheKey);

        if (cached && Date.now() - (cached as any).timestamp < this.cacheExpiry) {
            return cached;
        }

        try {
            const files = this.app.vault.getMarkdownFiles();
            const allQuests: QuestCandidate[] = [];

            for (const file of files) {
                try {
                    const content = await this.app.vault.read(file);
                    const lines = content.split('\n');

                    lines.forEach((line, index) => {
                        const quest = this.parseQuestFromLine(line, index, file.path);
                        if (quest) {
                            allQuests.push(quest);
                        }
                    });
                } catch (error) {
                    console.warn(`Error reading file ${file.path}:`, error);
                }
            }

            // Cache the results
            this.questCache.set(cacheKey, allQuests as any);
            return allQuests;
        } catch (error) {
            console.error('Error loading quests:', error);
            return [];
        }
    }

    /**
     * Parse a quest from a markdown line
     */
    private parseQuestFromLine(line: string, lineNumber: number, filePath: string): QuestCandidate | null {
        // Look for unchecked task patterns with #gamified-task tag
        const uncheckedTaskMatch = line.match(/^[\s]*[-*][\s]*\[[\s]?\][\s]*(.+)$/);
        if (!uncheckedTaskMatch) return null;

        const taskText = uncheckedTaskMatch[1].trim();
        if (!taskText.includes('#gamified-task')) return null;

        // Extract quest information
        const title = this.extractQuestTitle(taskText);
        const difficulty = this.extractDifficulty(taskText);
        const estimatedDuration = this.estimateQuestDuration(taskText, difficulty);
        const priority = this.extractPriority(taskText);
        const skills = this.extractSkills(taskText);
        const tags = this.extractTags(taskText);
        const dueDate = this.extractDueDate(taskText);
        const rewards = this.extractRewards(taskText);
        const subtasks = this.extractSubtasks(taskText);
        const isTimedQuest = taskText.includes('🕐') || taskText.includes('⏰');

        return {
            id: `${filePath}:${lineNumber}`,
            title,
            filePath,
            lineNumber,
            difficulty,
            estimatedDuration,
            priority,
            skills,
            tags,
            dueDate,
            rewards,
            subtasks,
            isTimedQuest
        };
    }

    /**
     * Extract quest title from task text
     */
    private extractQuestTitle(taskText: string): string {
        let title = taskText;

        // Remove #gamified-task tag
        title = title.replace(/#gamified-task\s*/g, '');

        // Find the first emoji/reward symbol and cut the title there
        const emojis = ['⭐', '✨', '🪙', '🛠️', '🔼', '🔄', '🕐', '⏰', '📅'];
        let firstIndex = -1;

        for (const emoji of emojis) {
            const index = title.indexOf(emoji);
            if (index !== -1 && (firstIndex === -1 || index < firstIndex)) {
                firstIndex = index;
            }
        }

        if (firstIndex !== -1) {
            title = title.substring(0, firstIndex);
        }

        return title.trim();
    }

    /**
     * Extract difficulty from quest text
     */
    private extractDifficulty(taskText: string): 'easy' | 'medium' | 'hard' | 'epic' {
        if (taskText.includes('#difficulty-easy') || taskText.includes('🟢')) return 'easy';
        if (taskText.includes('#difficulty-hard') || taskText.includes('🔴')) return 'hard';
        if (taskText.includes('#difficulty-epic') || taskText.includes('🟣')) return 'epic';
        return 'medium'; // default
    }

    /**
     * Estimate quest duration based on content and difficulty
     */
    private estimateQuestDuration(taskText: string, difficulty: string): number {
        // Look for explicit time indicators
        const timeMatch = taskText.match(/(\d+)\s*(?:min|minutes?|hour|hours?)/i);
        if (timeMatch) {
            const value = parseInt(timeMatch[1]);
            return timeMatch[0].toLowerCase().includes('hour') ? value * 60 : value;
        }

        // Estimate based on difficulty and content
        const baseTime = {
            'easy': 15,
            'medium': 25,
            'hard': 45,
            'epic': 90
        };

        // Adjust based on subtask count (rough estimate)
        const subtaskCount = (taskText.match(/^\s+[-*]\s*\[/gm) || []).length;
        const adjustedTime = baseTime[difficulty as keyof typeof baseTime] + (subtaskCount * 5);

        return Math.min(adjustedTime, 120); // Cap at 2 hours
    }

    /**
     * Extract priority from quest text
     */
    private extractPriority(taskText: string): 'lowest' | 'low' | 'medium' | 'high' | 'highest' | 'urgent' {
        if (taskText.includes('#priority-urgent') || taskText.includes('🚨')) return 'urgent';
        if (taskText.includes('#priority-highest') || taskText.includes('🔺')) return 'highest';
        if (taskText.includes('#priority-high') || taskText.includes('🔴')) return 'high';
        if (taskText.includes('#priority-medium') || taskText.includes('🟡')) return 'medium';
        if (taskText.includes('#priority-low') || taskText.includes('🟢')) return 'low';
        if (taskText.includes('#priority-lowest') || taskText.includes('⏬')) return 'lowest';
        return 'medium'; // default
    }

    /**
     * Extract skills from quest text
     */
    private extractSkills(taskText: string): string[] {
        const skillMatches = taskText.match(/🛠️([^⭐✨🪙🔼🔄\s]+(?:\s+[^⭐✨🪙🔼🔄\s]+)*)/gu);
        return skillMatches ? skillMatches.map(skill => skill.replace('🛠️', '').trim()) : [];
    }

    /**
     * Extract tags from quest text
     */
    private extractTags(taskText: string): string[] {
        const tagMatches = taskText.match(/#[\w-]+/g);
        return tagMatches || [];
    }

    /**
     * Extract due date from quest text
     */
    private extractDueDate(taskText: string): string | undefined {
        const dueDateMatch = taskText.match(/📅[\s]*(\d{4}-\d{2}-\d{2})/);
        return dueDateMatch ? dueDateMatch[1] : undefined;
    }

    /**
     * Extract rewards from quest text
     */
    private extractRewards(taskText: string): { xp: number; coins: number; cp?: number; materials?: string[] } {
        const rewards: { xp: number; coins: number; cp?: number; materials?: string[] } = { xp: 0, coins: 0, materials: [] };

        const xpMatch = taskText.match(/⭐(\d+)/);
        const coinsMatch = taskText.match(/✨(\d+)/);
        const cpMatch = taskText.match(/🪙(\d+)/);

        if (xpMatch) rewards.xp = parseInt(xpMatch[1]);
        if (coinsMatch) rewards.coins = parseInt(coinsMatch[1]);
        if (cpMatch) rewards.cp = parseInt(cpMatch[1]);

        // Extract materials
        const materialMatches = taskText.match(/💎(\d+)/g);
        if (materialMatches) {
            rewards.materials = materialMatches.map(match => `💎${match.replace('💎', '')} Materials`);
        }

        return rewards;
    }

    /**
     * Extract subtasks from quest text
     */
    private extractSubtasks(taskText: string): Array<{ text: string; completed: boolean; estimatedMinutes?: number }> {
        // This is a simplified version - in practice, you'd need to parse the full file
        // to get subtasks that are indented below the main task
        return [];
    }

    /**
     * Rank quests based on context
     */
    private rankQuestsForContext(candidates: QuestCandidate[], context: QuestSuggestionContext): Array<QuestCandidate & { relevanceScore: number; reason: string }> {
        const sessionDuration = this.getSessionDuration(context.sessionType);

        return candidates
            .map(quest => {
                let score = 0;
                const reasons: string[] = [];

                // Time matching
                const timeDiff = Math.abs(quest.estimatedDuration - sessionDuration);
                if (timeDiff <= 5) {
                    score += 0.3;
                    reasons.push('Perfect time match');
                } else if (timeDiff <= 10) {
                    score += 0.2;
                    reasons.push('Good time match');
                } else if (quest.estimatedDuration <= sessionDuration) {
                    score += 0.1;
                    reasons.push('Fits in session time');
                }

                // Difficulty matching
                if (quest.difficulty === context.userPreferences.preferredDifficulty) {
                    score += 0.2;
                    reasons.push('Matches preferred difficulty');
                }

                // Priority boost
                if (quest.priority === 'urgent') {
                    score += 0.3;
                    reasons.push('Urgent priority');
                } else if (quest.priority === 'high') {
                    score += 0.2;
                    reasons.push('High priority');
                }

                // Due date urgency
                if (quest.dueDate) {
                    const dueDate = new Date(quest.dueDate);
                    const today = new Date();
                    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                    if (daysUntilDue <= 1) {
                        score += 0.4;
                        reasons.push('Due soon!');
                    } else if (daysUntilDue <= 3) {
                        score += 0.2;
                        reasons.push('Due in few days');
                    }
                }

                // Skill focus matching
                if (context.userPreferences.skillFocus.length > 0) {
                    const matchingSkills = quest.skills.filter(skill =>
                        context.userPreferences.skillFocus.some(focus =>
                            skill.toLowerCase().includes(focus.toLowerCase())
                        )
                    );
                    if (matchingSkills.length > 0) {
                        score += 0.2;
                        reasons.push(`Matches ${matchingSkills.join(', ')} skills`);
                    }
                }

                // Session type optimization
                if (context.sessionType === 'deepWork' && quest.difficulty === 'hard') {
                    score += 0.2;
                    reasons.push('Great for deep work');
                } else if (context.sessionType === 'quickFocus' && quest.estimatedDuration <= 15) {
                    score += 0.2;
                    reasons.push('Perfect for quick focus');
                }

                return {
                    ...quest,
                    relevanceScore: score,
                    reason: reasons.join(', ') || 'General match'
                };
            })
            .filter(quest => quest.relevanceScore > 0)
            .sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    /**
     * Get session duration for different session types
     */
    private getSessionDuration(sessionType: string): number {
        const durations = {
            'classic': 25,
            'extended': 45,
            'short': 15,
            'custom': 25,
            'deepWork': 90,
            'quickFocus': 10
        };
        return durations[sessionType as keyof typeof durations] || 25;
    }

    /**
     * Convert QuestCandidate to AttachedQuest
     */
    private convertToAttachedQuest(candidate: QuestCandidate): AttachedQuest {
        return {
            id: candidate.id,
            title: candidate.title,
            filePath: candidate.filePath,
            lineNumber: candidate.lineNumber,
            progress: 0,
            estimatedDuration: candidate.estimatedDuration,
            actualTimeSpent: 0,
            difficulty: candidate.difficulty,
            priority: candidate.priority,
            description: '',
            dueDate: candidate.dueDate,
            tags: candidate.tags,
            skills: candidate.skills,
            rewards: {
                baseXP: candidate.rewards.xp,
                baseCoins: candidate.rewards.coins,
                cp: candidate.rewards.cp,
                materials: candidate.rewards.materials
            },
            subtasks: candidate.subtasks.map((subtask, index) => ({
                id: `${candidate.id}-subtask-${index}`,
                text: subtask.text,
                completed: subtask.completed,
                estimatedMinutes: subtask.estimatedMinutes
            })),
            pomodoroSessions: [],
            analytics: {
                totalSessions: 0,
                totalTimeSpent: 0,
                averageFocusScore: 0,
                completionRate: 0,
                estimatedVsActual: 1
            },
            status: 'planning',
            attachedAt: new Date(),
            isTimedQuest: candidate.isTimedQuest,
            isCriticalPath: candidate.priority === 'urgent'
        };
    }

    /**
     * Clear quest cache
     */
    clearCache(): void {
        this.questCache.clear();
    }
}
