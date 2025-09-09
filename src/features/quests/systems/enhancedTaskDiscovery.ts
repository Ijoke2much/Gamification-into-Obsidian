import { Vault, TFile, TAbstractFile } from 'obsidian';
import { Notice } from 'obsidian';
import { Boss, BossProgress } from '../types/BossTypes';
import { bossManagementService } from '../utils/bossManagementService';

/**
 * Enhanced Task Discovery System
 * Automatically discovers and integrates new tasks for boss battles
 * Keeps boss battles dynamic and reflective of real project scope changes
 */
export class EnhancedTaskDiscovery {
    private static instance: EnhancedTaskDiscovery;
    private vault: Vault;
    private discoveryCache: Map<string, TaskDiscoveryData> = new Map();
    private autoRefreshInterval: number | null = null;
    private isScanning: boolean = false;

    private constructor(vault: Vault) {
        this.vault = vault;
        this.startAutoRefresh();
    }

    static getInstance(vault: Vault): EnhancedTaskDiscovery {
        if (!EnhancedTaskDiscovery.instance) {
            EnhancedTaskDiscovery.instance = new EnhancedTaskDiscovery(vault);
        }
        return EnhancedTaskDiscovery.instance;
    }

    /**
     * Start automatic task discovery refresh
     */
    private startAutoRefresh(): void {
        // Refresh every 5 minutes to catch new tasks
        this.autoRefreshInterval = window.setInterval(() => {
            this.performAutoRefresh();
        }, 5 * 60 * 1000); // 5 minutes

        // Also listen for file changes
        this.vault.on('modify', this.handleFileModify.bind(this));
    }

    /**
     * Handle file modifications for real-time task discovery
     */
    private async handleFileModify(file: TAbstractFile): Promise<void> {
        if (!(file instanceof TFile) || !file.path.endsWith('.md')) {
            return;
        }

        try {
            // We need to scan for all possible boss tags since we don't know which boss this file belongs to
            const allFiles = this.vault.getMarkdownFiles();
            for (const bossFile of allFiles) {
                // This is a simplified approach - in a real implementation, you'd need to determine
                // which boss this file is associated with
                const content = await this.vault.read(bossFile);
                if (content.includes('#gamified-boss')) {
                    // Extract boss name from content or use a default approach
                    const bossTag = '#gamified-boss'; // Simplified for now
                    await this.scanFileForBossTasks(file, bossTag);
                    break; // Only scan once per file modification
                }
            }
        } catch (error) {
            console.error('Error scanning modified file for boss tasks:', error);
        }
    }

    /**
     * Perform automatic refresh of all boss tasks
     */
    async performAutoRefresh(): Promise<void> {
        if (this.isScanning) return;

        this.isScanning = true;
        try {
            const activeBosses = await bossManagementService.getActiveBosses();

            for (const bossData of activeBosses) {
                // Extract the actual boss object from the data structure
                const boss = bossData.boss || bossData;
                await this.refreshBossTasks(boss);
            }

            console.log('Auto-refresh completed for all active bosses');
        } catch (error) {
            console.error('Error during auto-refresh:', error);
        } finally {
            this.isScanning = false;
        }
    }

    /**
     * Refresh tasks for a specific boss
     */
    async refreshBossTasks(boss: Boss): Promise<TaskDiscoveryResult> {
        const bossTag = this.generateBossTag(boss.name);
        const discoveryData = await this.discoverTasksForBoss(boss, bossTag);

        // Update boss HP based on new task discoveries
        const hpAdjustment = this.calculateHPAdjustment(discoveryData);
        if (hpAdjustment !== 0) {
            await this.adjustBossHP(boss, hpAdjustment, discoveryData);
        }

        // Update discovery cache
        this.discoveryCache.set(boss.id, discoveryData);

        return {
            bossId: boss.id,
            newTasks: discoveryData.newTasks,
            removedTasks: discoveryData.removedTasks,
            hpAdjustment,
            scopeChange: discoveryData.scopeChange
        };
    }

    /**
     * Discover all tasks for a specific boss
     */
    private async discoverTasksForBoss(boss: Boss, bossTag: string): Promise<TaskDiscoveryData> {
        const allFiles = this.vault.getMarkdownFiles();
        const bossTasks: DiscoveredTask[] = [];
        const newTasks: DiscoveredTask[] = [];
        const removedTasks: DiscoveredTask[] = [];

        // Get previously discovered tasks
        const previousDiscovery = this.discoveryCache.get(boss.id);
        const previousTasks = previousDiscovery?.tasks || [];

        // Scan all markdown files for boss tasks
        for (const file of allFiles) {
            const fileTasks = await this.scanFileForBossTasks(file, bossTag);
            bossTasks.push(...fileTasks);
        }

        // Identify new and removed tasks
        const previousTaskIds = new Set(previousTasks.map(t => t.id));
        const currentTaskIds = new Set(bossTasks.map(t => t.id));

        // Find new tasks
        for (const task of bossTasks) {
            if (!previousTaskIds.has(task.id)) {
                newTasks.push(task);
            }
        }

        // Find removed tasks
        for (const task of previousTasks) {
            if (!currentTaskIds.has(task.id)) {
                removedTasks.push(task);
            }
        }

        // Calculate scope change impact
        const scopeChange = this.calculateScopeChange(newTasks, removedTasks);

        return {
            tasks: bossTasks,
            newTasks,
            removedTasks,
            scopeChange,
            lastScanned: new Date()
        };
    }

    /**
     * Scan a specific file for boss tasks
     */
    private async scanFileForBossTasks(file: TFile, bossTag: string): Promise<DiscoveredTask[]> {
        try {
            const content = await this.vault.read(file);
            const tasks: DiscoveredTask[] = [];

            // Parse tasks with both #gamified-task and boss-specific tags
            const lines = content.split('\n');

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];

                // Check for task patterns
                if (this.isTaskLine(line) && this.hasRequiredTags(line, bossTag)) {
                    const task = this.parseTaskFromLine(line, file.path, i + 1);
                    if (task) {
                        tasks.push(task);
                    }
                }
            }

            return tasks;
        } catch (error) {
            console.error(`Error scanning file ${file.path}:`, error);
            return [];
        }
    }

    /**
     * Check if a line contains a task
     */
    private isTaskLine(line: string): boolean {
        // Match various task patterns
        const taskPatterns = [
            /^[\s]*[-*+]\s+\[[\sx]\]/,  // - [ ] or - [x]
            /^[\s]*[-*+]\s+/,           // - task item
            /^[\s]*\d+\.\s+\[[\sx]\]/,  // 1. [ ] or 1. [x]
            /^[\s]*\d+\.\s+/,           // 1. task item
            /^[\s]*#{1,6}\s+.*\[[\sx]\]/, // # Heading [ ]
            /^[\s]*#{1,6}\s+.*\[[\sx]\]/  // # Heading [x]
        ];

        return taskPatterns.some(pattern => pattern.test(line));
    }

    /**
     * Check if a line has the required tags
     */
    private hasRequiredTags(line: string, bossTag: string): boolean {
        const hasGamifiedTask = line.includes('#gamified-task');
        const hasGamifiedBoss = line.includes('#gamified-boss');
        const hasBossTag = line.includes(bossTag);

        return hasGamifiedTask && hasGamifiedBoss && hasBossTag;
    }

    /**
     * Parse a task from a line
     */
    private parseTaskFromLine(line: string, filePath: string, lineNumber: number): DiscoveredTask | null {
        try {
            // Extract task text
            const taskText = this.extractTaskText(line);
            if (!taskText) return null;

            // Determine if completed
            const isCompleted = line.includes('[x]') || line.includes('[X]');

            // Extract priority from tags
            const priority = this.extractPriority(line);

            // Extract estimated time if present
            const estimatedTime = this.extractEstimatedTime(line);

            // Generate unique ID
            const id = this.generateTaskId(filePath, lineNumber, taskText);

            return {
                id,
                text: taskText,
                filePath,
                lineNumber,
                completed: isCompleted,
                priority,
                estimatedTime,
                discoveredAt: new Date(),
                tags: this.extractAllTags(line)
            };
        } catch (error) {
            console.error('Error parsing task from line:', error);
            return null;
        }
    }

    /**
     * Extract task text from a line
     */
    private extractTaskText(line: string): string {
        // Remove task markers and clean up
        let text = line
            .replace(/^[\s]*[-*+]\s+\[[\sx]\]\s*/, '')  // Remove - [ ] or - [x]
            .replace(/^[\s]*[-*+]\s+/, '')              // Remove - 
            .replace(/^[\s]*\d+\.\s+\[[\sx]\]\s*/, '')  // Remove 1. [ ] or 1. [x]
            .replace(/^[\s]*\d+\.\s+/, '')              // Remove 1.
            .replace(/^[\s]*#{1,6}\s+/, '')             // Remove # heading
            .trim();

        // Remove tags from the end
        text = text.replace(/#[\w-]+/g, '').trim();

        return text;
    }

    /**
     * Extract priority from task line
     */
    private extractPriority(line: string): 'low' | 'medium' | 'high' {
        if (line.includes('#priority-high') || line.includes('#urgent')) {
            return 'high';
        }
        if (line.includes('#priority-low') || line.includes('#optional')) {
            return 'low';
        }
        return 'medium';
    }

    /**
     * Extract estimated time from task line
     */
    private extractEstimatedTime(line: string): number | null {
        const timeMatch = line.match(/#time-(\d+)/);
        return timeMatch ? parseInt(timeMatch[1]) : null;
    }

    /**
     * Extract all tags from a line
     */
    private extractAllTags(line: string): string[] {
        const tagMatches = line.match(/#[\w-]+/g);
        return tagMatches || [];
    }

    /**
     * Generate unique task ID
     */
    private generateTaskId(filePath: string, lineNumber: number, taskText: string): string {
        const hash = this.simpleHash(filePath + lineNumber + taskText);
        return `task-${hash}`;
    }

    /**
     * Simple hash function
     */
    private simpleHash(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }

    /**
     * Generate boss-specific tag
     */
    private generateBossTag(bossName: string): string {
        return `#boss-${bossName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    }

    /**
     * Calculate HP adjustment based on task discoveries
     */
    private calculateHPAdjustment(discoveryData: TaskDiscoveryData): number {
        let adjustment = 0;

        // New tasks increase boss HP (more work to do)
        for (const task of discoveryData.newTasks) {
            const baseHP = this.getTaskHPValue(task);
            adjustment += baseHP;
        }

        // Removed tasks decrease boss HP (less work to do)
        for (const task of discoveryData.removedTasks) {
            const baseHP = this.getTaskHPValue(task);
            adjustment -= baseHP;
        }

        return adjustment;
    }

    /**
     * Get HP value for a task based on its characteristics
     */
    private getTaskHPValue(task: DiscoveredTask): number {
        let baseHP = 10; // Base HP per task

        // Priority multiplier
        switch (task.priority) {
            case 'high': baseHP *= 1.5; break;
            case 'low': baseHP *= 0.7; break;
            default: baseHP *= 1.0; break;
        }

        // Time-based multiplier
        if (task.estimatedTime) {
            baseHP *= Math.min(task.estimatedTime / 30, 2.0); // Cap at 2x
        }

        // Text length multiplier (longer tasks = more complex)
        const textLength = task.text.length;
        if (textLength > 100) baseHP *= 1.3;
        if (textLength > 200) baseHP *= 1.5;

        return Math.round(baseHP);
    }

    /**
     * Calculate scope change impact
     */
    private calculateScopeChange(newTasks: DiscoveredTask[], removedTasks: DiscoveredTask[]): ScopeChange {
        const newTaskCount = newTasks.length;
        const removedTaskCount = removedTasks.length;
        const netChange = newTaskCount - removedTaskCount;

        let impact: 'minor' | 'moderate' | 'major' = 'minor';
        if (Math.abs(netChange) >= 5) impact = 'major';
        else if (Math.abs(netChange) >= 2) impact = 'moderate';

        return {
            newTaskCount,
            removedTaskCount,
            netChange,
            impact,
            description: this.generateScopeChangeDescription(newTaskCount, removedTaskCount, impact)
        };
    }

    /**
     * Generate scope change description
     */
    private generateScopeChangeDescription(newCount: number, removedCount: number, impact: string): string {
        if (newCount > 0 && removedCount > 0) {
            return `Project scope adjusted: +${newCount} tasks, -${removedCount} tasks (${impact} change)`;
        } else if (newCount > 0) {
            return `Project scope expanded: +${newCount} new tasks discovered (${impact} change)`;
        } else if (removedCount > 0) {
            return `Project scope reduced: -${removedCount} tasks removed (${impact} change)`;
        }
        return 'No scope changes detected';
    }

    /**
     * Adjust boss HP based on task discoveries
     */
    private async adjustBossHP(boss: Boss, hpAdjustment: number, discoveryData: TaskDiscoveryData): Promise<void> {
        try {
            // Update boss HP
            const newHP = Math.max(1, boss.stats.currentHP + hpAdjustment);
            const newMaxHP = Math.max(newHP, boss.stats.maxHP + hpAdjustment);

            boss.stats.currentHP = newHP;
            boss.stats.maxHP = newMaxHP;

            // Update boss progress
            await bossManagementService.updateBossProgress(boss.questId || '');

            // Show notification
            const message = hpAdjustment > 0
                ? `📈 Boss "${boss.name}" gained ${hpAdjustment} HP from new tasks!`
                : `📉 Boss "${boss.name}" lost ${Math.abs(hpAdjustment)} HP from removed tasks!`;

            new Notice(message, 5000);

            // Log scope change
            if (discoveryData.scopeChange.impact !== 'minor') {
                new Notice(`🔄 ${discoveryData.scopeChange.description}`, 7000);
            }

        } catch (error) {
            console.error('Error adjusting boss HP:', error);
        }
    }

    /**
     * Get discovery data for a boss
     */
    getDiscoveryData(bossId: string): TaskDiscoveryData | null {
        return this.discoveryCache.get(bossId) || null;
    }

    /**
     * Get all discovered tasks for a boss
     */
    getBossTasks(bossId: string): DiscoveredTask[] {
        const data = this.discoveryCache.get(bossId);
        return data?.tasks || [];
    }

    /**
     * Force refresh for a specific boss
     */
    async forceRefresh(bossId: string): Promise<TaskDiscoveryResult | null> {
        try {
            const activeBosses = await bossManagementService.getActiveBosses();
            const bossData = activeBosses.find(b => (b.boss || b).id === bossId);

            if (!bossData) {
                console.warn(`Boss ${bossId} not found for refresh`);
                return null;
            }

            const boss = bossData.boss || bossData;
            return await this.refreshBossTasks(boss);
        } catch (error) {
            console.error('Error during force refresh:', error);
            return null;
        }
    }

    /**
     * Stop auto-refresh
     */
    stopAutoRefresh(): void {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }
    }
}

// Type definitions
export interface DiscoveredTask {
    id: string;
    text: string;
    filePath: string;
    lineNumber: number;
    completed: boolean;
    priority: 'low' | 'medium' | 'high';
    estimatedTime: number | null;
    discoveredAt: Date;
    tags: string[];
}

export interface TaskDiscoveryData {
    tasks: DiscoveredTask[];
    newTasks: DiscoveredTask[];
    removedTasks: DiscoveredTask[];
    scopeChange: ScopeChange;
    lastScanned: Date;
}

export interface ScopeChange {
    newTaskCount: number;
    removedTaskCount: number;
    netChange: number;
    impact: 'minor' | 'moderate' | 'major';
    description: string;
}

export interface TaskDiscoveryResult {
    bossId: string;
    newTasks: DiscoveredTask[];
    removedTasks: DiscoveredTask[];
    hpAdjustment: number;
    scopeChange: ScopeChange;
}

// Export singleton factory
export const createEnhancedTaskDiscovery = (vault: Vault) => EnhancedTaskDiscovery.getInstance(vault);
