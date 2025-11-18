import { TFile, Vault, MetadataCache, CachedMetadata } from 'obsidian';
import { LinkedTask, TaskIntegrationConfig, TaskProgressUpdate, Boss } from '../types/BossTypes';
import { BossAnalyticsService } from './bossAnalyticsService';

export class TaskIntegrationService {
    private static instance: TaskIntegrationService;
    private vault: Vault;
    private metadataCache: MetadataCache;
    private config: TaskIntegrationConfig;
    private linkedTasks: Map<string, LinkedTask> = new Map();
    private taskToBossMap: Map<string, string> = new Map(); // taskId -> bossId
    private scanInterval: number | null = null;
    private analyticsService: BossAnalyticsService;

    constructor(vault: Vault, metadataCache: MetadataCache) {
        this.vault = vault;
        this.metadataCache = metadataCache;
        this.analyticsService = BossAnalyticsService.getInstance();

        // Default configuration
        this.config = {
            autoDamageMultiplier: 10,
            priorityMultipliers: {
                lowest: 0.5,
                low: 1,
                medium: 1.5,
                high: 2,
                highest: 3
            },
            typeMultipliers: {
                checkbox: 1,
                bullet: 0.8,
                heading: 1.2
            },
            enableRealTimeSync: true,
            scanInterval: 5000 // 5 seconds
        };

        this.startRealTimeSync();
    }

    static getInstance(vault?: Vault, metadataCache?: MetadataCache): TaskIntegrationService {
        if (!TaskIntegrationService.instance && vault && metadataCache) {
            TaskIntegrationService.instance = new TaskIntegrationService(vault, metadataCache);
        }
        return TaskIntegrationService.instance;
    }

    // Auto-detect tasks from vault files
    async scanVaultForTasks(): Promise<LinkedTask[]> {
        const allTasks: LinkedTask[] = [];
        const markdownFiles = this.vault.getMarkdownFiles();

        for (const file of markdownFiles) {
            try {
                const content = await this.vault.read(file);
                const tasks = this.extractTasksFromContent(content, file.path);
                allTasks.push(...tasks);
            } catch (error) {
                console.error(`Error scanning file ${file.path}:`, error);
            }
        }

        // Update our linked tasks map
        allTasks.forEach(task => {
            this.linkedTasks.set(task.id, task);
        });

        return allTasks;
    }

    // Extract tasks from file content
    private extractTasksFromContent(content: string, filePath: string): LinkedTask[] {
        const tasks: LinkedTask[] = [];
        const lines = content.split('\n');

        lines.forEach((line, index) => {
            const trimmedLine = line.trim();

            // Detect different task types
            let taskMatch: RegExpMatchArray | null = null;
            let taskType: 'checkbox' | 'bullet' | 'heading' = 'checkbox';

            // Checkbox tasks: - [ ] or - [x]
            taskMatch = trimmedLine.match(/^- \[([ x])\] (.+)$/);
            if (taskMatch) {
                taskType = 'checkbox';
            } else {
                // Bullet point tasks: - something
                taskMatch = trimmedLine.match(/^- (.+)$/);
                if (taskMatch) {
                    taskType = 'bullet';
                } else {
                    // Heading tasks: ## TODO: something
                    taskMatch = trimmedLine.match(/^#{1,6}\s*(?:TODO|TASK):\s*(.+)$/i);
                    if (taskMatch) {
                        taskType = 'heading';
                    }
                }
            }

            if (taskMatch) {
                const taskText = taskMatch[taskMatch.length - 1];
                const isCompleted = taskType === 'checkbox' ? taskMatch[1] === 'x' : false;
                const priority = this.determinePriority(taskText);

                const task: LinkedTask = {
                    id: this.generateTaskId(filePath, index),
                    text: taskText,
                    filePath,
                    lineNumber: index + 1,
                    completed: isCompleted,
                    damageValue: this.calculateTaskDamage(taskType, priority),
                    taskType,
                    priority,
                    estimatedTime: this.estimateTaskTime(taskText),
                    createdAt: new Date()
                };

                tasks.push(task);
            }
        });

        return tasks;
    }

    // Generate unique task ID
    private generateTaskId(filePath: string, lineNumber: number): string {
        return `${filePath}:${lineNumber}:${Date.now()}`;
    }

    // Determine task priority based on content
    private determinePriority(taskText: string): 'lowest' | 'low' | 'medium' | 'high' | 'highest' {
        const text = taskText.toLowerCase();

        if (text.includes('critical') || text.includes('!!!') || text.includes('emergency')) {
            return 'highest';
        }

        if (text.includes('urgent') || text.includes('!!') || text.includes('asap')) {
            return 'high';
        }

        if (text.includes('important') || text.includes('priority') || text.includes('!')) {
            return 'medium';
        }

        if (text.includes('optional') || text.includes('nice to have') || text.includes('someday')) {
            return 'lowest';
        }

        return 'low';
    }

    // Calculate damage value for task completion
    private calculateTaskDamage(taskType: 'checkbox' | 'bullet' | 'heading', priority: 'lowest' | 'low' | 'medium' | 'high' | 'highest'): number {
        const baseDamage = this.config.autoDamageMultiplier;
        const typeMultiplier = this.config.typeMultipliers[taskType];
        const priorityMultiplier = this.config.priorityMultipliers[priority];

        return Math.round(baseDamage * typeMultiplier * priorityMultiplier);
    }

    // Estimate task completion time
    private estimateTaskTime(taskText: string): number {
        const text = taskText.toLowerCase();

        // Look for time indicators
        if (text.includes('quick') || text.includes('fast') || text.includes('5 min')) {
            return 5;
        }
        if (text.includes('short') || text.includes('brief') || text.includes('15 min')) {
            return 15;
        }
        if (text.includes('medium') || text.includes('30 min') || text.includes('half hour')) {
            return 30;
        }
        if (text.includes('long') || text.includes('1 hour') || text.includes('detailed')) {
            return 60;
        }

        // Estimate based on text length
        const wordCount = text.split(' ').length;
        if (wordCount < 5) return 15;
        if (wordCount < 10) return 30;
        return 45;
    }

    // Link tasks to a specific boss
    async linkTasksToBoss(bossId: string, taskIds: string[]): Promise<void> {
        taskIds.forEach(taskId => {
            this.taskToBossMap.set(taskId, bossId);
        });

        // Save the mapping
        await this.saveTaskBossMapping();
    }

    // Auto-link tasks to boss based on file content
    async autoLinkTasksToBoss(boss: Boss): Promise<string[]> {
        const linkedTaskIds: string[] = [];

        // If boss has a questId, try to find tasks in that quest file
        if (boss.questId) {
            const questFile = this.vault.getAbstractFileByPath(boss.questId);
            if (questFile instanceof TFile) {
                try {
                    const content = await this.vault.read(questFile);
                    const tasks = this.extractTasksFromContent(content, questFile.path);

                    // Link all tasks from this file to the boss
                    const taskIds = tasks.map(task => task.id);
                    await this.linkTasksToBoss(boss.id, taskIds);
                    linkedTaskIds.push(...taskIds);
                } catch (error) {
                    console.error(`Error auto-linking tasks for boss ${boss.id}:`, error);
                }
            }
        }

        return linkedTaskIds;
    }

    // Get tasks linked to a specific boss
    getLinkedTasks(bossId: string): LinkedTask[] {
        const linkedTasks: LinkedTask[] = [];

        for (const [taskId, linkedBossId] of this.taskToBossMap.entries()) {
            if (linkedBossId === bossId) {
                const task = this.linkedTasks.get(taskId);
                if (task) {
                    linkedTasks.push(task);
                }
            }
        }

        return linkedTasks;
    }

    // Process task completion and deal damage to boss
    async processTaskCompletion(taskId: string): Promise<TaskProgressUpdate | null> {
        const task = this.linkedTasks.get(taskId);
        const bossId = this.taskToBossMap.get(taskId);

        if (!task || !bossId || task.completed) {
            return null;
        }

        // Mark task as completed
        task.completed = true;
        task.completedAt = new Date();

        // Create progress update
        const progressUpdate: TaskProgressUpdate = {
            taskId,
            bossId,
            damageDealt: task.damageValue,
            timestamp: new Date(),
            taskText: task.text
        };

        // Record in analytics
        this.analyticsService.recordTaskCompletion(progressUpdate);

        return progressUpdate;
    }

    // Start real-time task monitoring
    private startRealTimeSync(): void {
        if (!this.config.enableRealTimeSync) return;

        this.scanInterval = window.setInterval(() => {
            this.checkForTaskUpdates();
        }, this.config.scanInterval);
    }

    // Check for task updates
    private async checkForTaskUpdates(): Promise<void> {
        try {
            const currentTasks = await this.scanVaultForTasks();

            // Compare with existing tasks to find newly completed ones
            currentTasks.forEach(currentTask => {
                const existingTask = this.linkedTasks.get(currentTask.id);

                if (existingTask && !existingTask.completed && currentTask.completed) {
                    // Task was just completed
                    this.processTaskCompletion(currentTask.id);
                }
            });
        } catch (error) {
            console.error('Error checking for task updates:', error);
        }
    }

    // Get all tasks with their completion status
    getAllTasks(): LinkedTask[] {
        return Array.from(this.linkedTasks.values());
    }

    // Get task completion stats
    getTaskStats() {
        const allTasks = this.getAllTasks();
        const completed = allTasks.filter(task => task.completed).length;
        const total = allTasks.length;

        return {
            total,
            completed,
            pending: total - completed,
            completionRate: total > 0 ? completed / total : 0
        };
    }

    // Update configuration
    updateConfig(newConfig: Partial<TaskIntegrationConfig>): void {
        this.config = { ...this.config, ...newConfig };

        // Restart sync if interval changed
        if (newConfig.scanInterval || newConfig.enableRealTimeSync !== undefined) {
            this.stopRealTimeSync();
            this.startRealTimeSync();
        }
    }

    // Stop real-time sync
    private stopRealTimeSync(): void {
        if (this.scanInterval) {
            window.clearInterval(this.scanInterval);
            this.scanInterval = null;
        }
    }

    // Save task-boss mapping to storage
    private async saveTaskBossMapping(): Promise<void> {
        try {
            const mappingData = Object.fromEntries(this.taskToBossMap);
            // You can implement storage logic here - for now just log
            console.log('Task-Boss mapping saved:', mappingData);
        } catch (error) {
            console.error('Error saving task-boss mapping:', error);
        }
    }

    // Load task-boss mapping from storage
    private async loadTaskBossMapping(): Promise<void> {
        try {
            // You can implement storage loading logic here
            console.log('Task-Boss mapping loaded');
        } catch (error) {
            console.error('Error loading task-boss mapping:', error);
        }
    }

    // Cleanup
    destroy(): void {
        this.stopRealTimeSync();
        this.linkedTasks.clear();
        this.taskToBossMap.clear();
    }
}
