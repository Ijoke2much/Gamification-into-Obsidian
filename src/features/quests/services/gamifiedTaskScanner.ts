// Gamified Task Scanner Service
// Automatically finds and processes tasks with #gamified-task tag

import { Vault, TFile, Notice, App } from 'obsidian';

export interface TaskScanResult {
    newTasks: Array<{
        title: string;
        xp: number;
        filePath: string;
        lineNumber: number;
    }>;
    completedTasks: Array<{
        title: string;
        xp: number;
        coins: number;
        filePath: string;
    }>;
    totalScanned: number;
}

export class GamifiedTaskScanner {
    private app: App;
    private vault: Vault;
    private isScanning: boolean = false;
    private lastScanTime: number = 0;

    constructor(app: App) {
        this.app = app;
        this.vault = app.vault;
    }

    /**
     * Scan all markdown files for tasks with #gamified-task tag
     */
    async scanForGamifiedTasks(): Promise<TaskScanResult> {
        if (this.isScanning) {
            console.log('[TaskScanner] Scan already in progress, skipping...');
            return { newTasks: [], completedTasks: [], totalScanned: 0 };
        }

        this.isScanning = true;
        const result: TaskScanResult = {
            newTasks: [],
            completedTasks: [],
            totalScanned: 0
        };

        try {
            const markdownFiles = this.vault.getMarkdownFiles();
            console.log(`[TaskScanner] Scanning ${markdownFiles.length} files for gamified tasks...`);

            for (const file of markdownFiles) {
                // Skip GamifiedTasks.md to avoid duplicates
                if (file.path === 'GamifiedTasks.md') continue;

                try {
                    const content = await this.vault.read(file);
                    const tasks = this.extractGamifiedTasks(content, file.path);

                    result.totalScanned += tasks.length;

                    for (const task of tasks) {
                        if (task.completed) {
                            // Process completed task
                            await this.processCompletedTask(task);
                            result.completedTasks.push({
                                title: task.title,
                                xp: task.xp,
                                coins: task.coins,
                                filePath: file.path
                            });
                        } else {
                            // Track new task
                            result.newTasks.push({
                                title: task.title,
                                xp: task.xp,
                                filePath: file.path,
                                lineNumber: task.lineNumber
                            });
                        }
                    }
                } catch (error) {
                    console.error(`[TaskScanner] Error scanning ${file.path}:`, error);
                }
            }

            this.lastScanTime = Date.now();

            if (result.completedTasks.length > 0) {
                new Notice(`🎉 Completed ${result.completedTasks.length} gamified tasks!`);
            }

            console.log(`[TaskScanner] Scan complete: ${result.newTasks.length} active, ${result.completedTasks.length} completed`);

        } catch (error) {
            console.error('[TaskScanner] Scan failed:', error);
        } finally {
            this.isScanning = false;
        }

        return result;
    }

    /**
     * Extract gamified tasks from file content
     */
    private extractGamifiedTasks(content: string, filePath: string) {
        const lines = content.split('\n');
        const tasks: Array<any> = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Match task pattern: - [ ] or - [x]
            const taskMatch = line.match(/^(\s*)- \[([x ])\] (.+)/);
            if (!taskMatch) continue;

            const [, indent, checked, taskText] = taskMatch;

            // Must have #gamified-task tag
            if (!taskText.includes('#gamified-task')) continue;

            const completed = checked === 'x';
            const title = this.extractTitle(taskText);
            const xp = this.extractXP(taskText);
            const difficulty = this.extractDifficulty(taskText);
            const skills = this.extractSkills(taskText);

            tasks.push({
                title,
                completed,
                xp,
                coins: Math.round(xp * 0.1),
                difficulty,
                skills,
                lineNumber: i + 1,
                filePath,
                originalLine: line
            });
        }

        return tasks;
    }

    /**
     * Extract clean title from task text
     */
    private extractTitle(taskText: string): string {
        return taskText
            .split(/[#✨⭐🔥⚖️🌱]/)[0] // Split on first emoji or hashtag
            .trim();
    }

    /**
     * Extract XP value from task text
     */
    private extractXP(taskText: string): number {
        const xpMatch = taskText.match(/✨(\d+)/);
        if (xpMatch) {
            return parseInt(xpMatch[1]);
        }

        // Auto-calculate XP based on title complexity
        const title = this.extractTitle(taskText);
        let baseXP = 50;

        if (title.length > 50) baseXP += 25;
        if (title.length > 100) baseXP += 25;

        // Adjust for difficulty
        if (taskText.includes('🔥')) return baseXP + 50; // Hard
        if (taskText.includes('🌱')) return Math.max(25, baseXP - 25); // Easy

        return baseXP; // Medium
    }

    /**
     * Extract difficulty from task text
     */
    private extractDifficulty(taskText: string): string {
        if (taskText.includes('🔥')) return 'hard';
        if (taskText.includes('🌱')) return 'easy';
        if (taskText.includes('⚖️')) return 'medium';

        // Auto-detect from title
        const title = this.extractTitle(taskText).toLowerCase();
        if (title.includes('research') || title.includes('complex')) return 'hard';
        if (title.includes('quick') || title.includes('simple')) return 'easy';

        return 'medium';
    }

    /**
     * Extract skills from hashtags
     */
    private extractSkills(taskText: string): string[] {
        const tags = (taskText.match(/#[\w\-]+/g) || [])
            .map(tag => tag.substring(1))
            .filter(tag => tag !== 'gamified-task');

        return tags.length > 0 ? tags : ['General'];
    }

    /**
     * Process a completed task and award rewards
     */
    private async processCompletedTask(task: any): Promise<void> {
        try {
            // Use shared pipeline for consistent reward handling
            const { awardQuestRewards, resolvePluginSettings } = await import('../../../shared/utils/questCompletionPipeline');
            const questShim = {
                xp: task.xp,
                coins: task.coins,
                cp: 0,
                skills: [] as string[],
                stats: [] as string[],
            } as unknown as import('../utils/taskParser').Quest;
            await awardQuestRewards(this.vault, questShim, resolvePluginSettings(this.app));

            // Trigger achievement events
            const { achievementEventService } = await import('../../achievements/services/achievementEventService');
            await achievementEventService.processGameEvent({
                type: 'quest_completed',
                data: {
                    questData: {
                        title: task.title,
                        xp: task.xp,
                        difficulty: task.difficulty,
                        completion: 100
                    }
                },
                timestamp: new Date()
            });

            console.log(`[TaskScanner] Processed completed task: ${task.title} (+${task.xp} XP, +${task.coins} coins)`);

        } catch (error) {
            console.error(`[TaskScanner] Error processing completed task ${task.title}:`, error);
        }
    }

    /**
     * Start automatic scanning every 10 seconds
     */
    startAutoScan(): void {
        const scanInterval = setInterval(async () => {
            await this.scanForGamifiedTasks();
        }, 10000); // 10 seconds

        console.log('[TaskScanner] Auto-scan started (every 10 seconds)');

        // Store interval for cleanup
        (this as any).scanInterval = scanInterval;
    }

    /**
     * Stop automatic scanning
     */
    stopAutoScan(): void {
        if ((this as any).scanInterval) {
            clearInterval((this as any).scanInterval);
            console.log('[TaskScanner] Auto-scan stopped');
        }
    }
}
