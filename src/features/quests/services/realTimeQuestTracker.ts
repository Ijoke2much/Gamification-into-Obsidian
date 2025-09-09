import { TFile, TAbstractFile, App, Notice } from 'obsidian';
import { bossManagementService } from '../utils/bossManagementService';
import { Boss, BossProgress, BossRewards } from '../types/BossTypes';
import { Quest } from '../utils/taskParser';
import type GamifiedObsidianPlugin from '../../../core/main';

/**
 * Real-time quest completion tracker that monitors vault changes
 * and automatically deals damage to bosses when tagged quests are completed
 */
export class RealTimeQuestTracker {
    private app: App;
    private plugin: GamifiedObsidianPlugin;
    private isMonitoring = false;
    private processedTasks = new Set<string>(); // Track already processed tasks
    private debounceTimer: NodeJS.Timeout | null = null;

    constructor(app: App, plugin: GamifiedObsidianPlugin) {
        this.app = app;
        this.plugin = plugin;
    }

    /**
     * Start monitoring vault for quest completions
     */
    startMonitoring(): void {
        if (this.isMonitoring) return;

        this.isMonitoring = true;

        // Listen for file modifications
        this.app.vault.on('modify', this.handleFileModify.bind(this));

        // Initial scan of existing files
        this.performInitialScan();

        console.log('Real-time quest tracker started');
        new Notice('🎯 Boss quest tracking activated!');
    }

    /**
     * Stop monitoring
     */
    stopMonitoring(): void {
        if (!this.isMonitoring) return;

        this.isMonitoring = false;
        // this.app.vault.off('modify', this.handleFileModify.bind(this)); // Fixed in cleanup

        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        console.log('Real-time quest tracker stopped');
    }

    /**
     * Handle file modification events
     */
    private handleFileModify(file: TAbstractFile): void {
        if (!(file instanceof TFile) || !file.path.endsWith('.md')) return;

        // Debounce rapid file changes
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        this.debounceTimer = setTimeout(async () => {
            await this.scanFileForCompletedQuests(file);
        }, 500); // 500ms debounce
    }

    /**
     * Perform initial scan of vault for completed quests
     */
    private async performInitialScan(): Promise<void> {
        try {
            const allFiles = this.app.vault.getMarkdownFiles();

            for (const file of allFiles) {
                await this.scanFileForCompletedQuests(file, true); // Silent mode for initial scan
            }

            console.log('Initial quest scan completed');
        } catch (error) {
            console.error('Failed to perform initial scan:', error);
        }
    }

    /**
     * Scan a specific file for completed boss quests
     */
    private async scanFileForCompletedQuests(file: TFile, silent = false): Promise<void> {
        try {
            const content = await this.app.vault.read(file);
            const lines = content.split('\n');

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];

                if (this.isCompletedTask(line) && this.isBossTask(line)) {
                    const taskId = this.generateTaskId(file.path, i, line);

                    // Skip if already processed
                    if (this.processedTasks.has(taskId)) continue;

                    await this.processBossQuestCompletion(file, i, line, silent);
                    this.processedTasks.add(taskId);
                }
            }
        } catch (error) {
            console.error(`Failed to scan file ${file.path}:`, error);
        }
    }

    /**
     * Check if a line represents a completed task
     */
    private isCompletedTask(line: string): boolean {
        return /^[\s]*[-*+]\s*\[x\]/i.test(line.trim());
    }

    /**
     * Check if a task is boss-related
     */
    private isBossTask(line: string): boolean {
        return line.includes('#gamified-task') && line.includes('#gamified-boss') ||
            line.includes('#boss-quest') ||
            line.includes('#boss-') ||
            line.toLowerCase().includes('boss');
    }

    /**
     * Generate unique task ID for tracking
     */
    private generateTaskId(filePath: string, lineNumber: number, content: string): string {
        const contentHash = content.slice(0, 50).replace(/[^a-zA-Z0-9]/g, '');
        return `${filePath}:${lineNumber}:${contentHash}`;
    }

    /**
     * Process a completed boss quest
     */
    private async processBossQuestCompletion(
        file: TFile,
        lineNumber: number,
        questText: string,
        silent = false
    ): Promise<void> {
        try {
            // Get active bosses
            const activeBosses = bossManagementService.getActiveBosses();

            if (activeBosses.length === 0) {
                if (!silent) {
                    console.log('No active bosses to damage');
                }
                return;
            }

            // Extract boss-specific tag if present
            const bossTagMatch = questText.match(/#boss-([a-zA-Z0-9-]+)/);
            const targetBossId = bossTagMatch ? bossTagMatch[1] : null;

            // Find target bosses
            const targetBosses = targetBossId
                ? activeBosses.filter(bossData =>
                    bossData.boss.id.includes(targetBossId) ||
                    bossData.boss.name.toLowerCase().includes(targetBossId.toLowerCase())
                )
                : activeBosses; // Apply to all active bosses if no specific tag

            if (targetBosses.length === 0) {
                if (!silent) {
                    console.log(`No bosses found matching tag: ${targetBossId}`);
                }
                return;
            }

            // Calculate damage
            const damage = this.calculateQuestDamage(questText, file.path);

            // Apply damage to target bosses
            for (const bossData of targetBosses) {
                await this.dealDamageToBoss(bossData, damage, questText, file.path, silent);
            }

        } catch (error) {
            console.error('Failed to process boss quest completion:', error);
        }
    }

    /**
     * Calculate damage based on quest content and file
     */
    private calculateQuestDamage(questText: string, filePath: string): number {
        let baseDamage = 15; // Base damage

        // Analyze quest text for complexity
        const textLength = questText.length;
        if (textLength > 50) baseDamage += 5;
        if (textLength > 100) baseDamage += 10;
        if (textLength > 150) baseDamage += 15;

        // High-impact keywords
        const highImpactKeywords = [
            'complete', 'finish', 'achieve', 'master', 'build', 'create',
            'implement', 'develop', 'design', 'solve', 'optimize'
        ];

        // Medium-impact keywords
        const mediumImpactKeywords = [
            'practice', 'study', 'review', 'learn', 'improve', 'research',
            'analyze', 'plan', 'organize', 'prepare'
        ];

        // Low-impact keywords
        const lowImpactKeywords = [
            'read', 'watch', 'check', 'update', 'fix', 'clean'
        ];

        const lowerText = questText.toLowerCase();

        // Apply keyword bonuses
        for (const keyword of highImpactKeywords) {
            if (lowerText.includes(keyword)) {
                baseDamage += 12;
                break;
            }
        }

        for (const keyword of mediumImpactKeywords) {
            if (lowerText.includes(keyword)) {
                baseDamage += 8;
                break;
            }
        }

        for (const keyword of lowImpactKeywords) {
            if (lowerText.includes(keyword)) {
                baseDamage += 4;
                break;
            }
        }

        // File-based bonuses
        if (filePath.includes('Boss-Quest') || filePath.includes('boss-quest')) {
            baseDamage *= 1.5;
        }

        if (filePath.includes('Gamified-Boss-Quests')) {
            baseDamage *= 1.3;
        }

        // Time-based bonus (more damage for recently created quests)
        const now = Date.now();
        const fileCreationBonus = Math.max(1, 1.2 - ((now % (24 * 60 * 60 * 1000)) / (24 * 60 * 60 * 1000)) * 0.2);
        baseDamage *= fileCreationBonus;

        return Math.floor(baseDamage);
    }

    /**
     * Deal damage to a specific boss
     */
    private async dealDamageToBoss(
        bossData: { boss: Boss; progress: BossProgress; quest: Quest },
        damage: number,
        questText: string,
        filePath: string,
        silent = false
    ): Promise<void> {
        try {
            // Calculate new HP
            const oldHP = bossData.progress.currentHP;
            const newHP = Math.max(0, oldHP - damage);

            // Update boss progress directly
            bossData.progress.currentHP = newHP;
            bossData.progress.lastUpdated = new Date();
            bossData.boss.stats.currentHP = newHP;

            // Create notification
            if (!silent) {
                const questPreview = questText.length > 50
                    ? questText.substring(0, 47) + '...'
                    : questText;

                new Notice(`⚔️ ${damage} damage dealt to ${bossData.boss.name}!\n"${questPreview}"`);
            }

            // Dispatch custom event for UI updates
            window.dispatchEvent(new CustomEvent('boss-quest-damage', {
                detail: {
                    bossId: bossData.boss.id,
                    bossName: bossData.boss.name,
                    damage,
                    oldHP,
                    newHP,
                    questText: questText.substring(0, 100),
                    filePath
                }
            }));

            // Check for boss defeat
            if (newHP <= 0 && oldHP > 0) {
                await this.handleBossDefeat(bossData, silent);
            }

            console.log(`Dealt ${damage} damage to ${bossData.boss.name} (${oldHP} → ${newHP} HP)`);

        } catch (error) {
            console.error('Failed to deal damage to boss:', error);
        }
    }

    /**
     * Handle boss defeat
     */
    private async handleBossDefeat(
        bossData: { boss: Boss; progress: BossProgress; quest: Quest },
        silent = false
    ): Promise<void> {
        try {
            // Use the boss management service to handle defeat
            const result = bossManagementService.handleBossDefeat(bossData.boss.id);

            if (result) {
                // Award rewards
                await this.awardBossRewards(result, silent);

                if (!silent) {
                    new Notice(`🎉 Boss Defeated: ${result.boss.name}!\nCheck your rewards!`, 8000);
                }

                // Dispatch defeat event
                window.dispatchEvent(new CustomEvent('boss-defeated', {
                    detail: {
                        boss: result.boss,
                        rewards: result.rewards
                    }
                }));

                console.log(`Boss defeated: ${result.boss.name}`);
            }

        } catch (error) {
            console.error('Failed to handle boss defeat:', error);
        }
    }

    /**
     * Award boss rewards
     */
    private async awardBossRewards(
        defeatResult: { boss: Boss; quest: Quest; rewards: BossRewards },
        silent = false
    ): Promise<void> {
        try {
            const { boss, rewards } = defeatResult;

            // Create reward summary
            const rewardText = [
                `# 🎉 Boss Defeated: ${boss.name}`,
                `**Date**: ${new Date().toLocaleDateString()}`,
                '',
                '## Rewards Earned:',
                `- 💰 **${rewards.coins}** coins`,
                `- ⭐ **${rewards.xp}** XP`,
                `- 🪙 **${rewards.cp}** CP`,
                ''
            ];

            if (rewards.achievements && rewards.achievements.length > 0) {
                rewardText.push('## Achievements:');
                rewards.achievements.forEach((achievement: string) => {
                    rewardText.push(`- 🏆 ${achievement}`);
                });
                rewardText.push('');
            }

            if (rewards.materials && rewards.materials.length > 0) {
                rewardText.push('## Materials:');
                rewards.materials.forEach((material: { name: string; quantity: number }) => {
                    rewardText.push(`- ${material.name} x${material.quantity}`);
                });
                rewardText.push('');
            }

            const rewardContent = rewardText.join('\n');

            // Try to write to rewards file
            try {
                const rewardFilePath = 'Boss-Rewards.md';
                const existingFile = this.app.vault.getAbstractFileByPath(rewardFilePath);

                if (existingFile instanceof TFile) {
                    const existingContent = await this.app.vault.read(existingFile);
                    const newContent = existingContent + '\n\n---\n\n' + rewardContent;
                    await this.app.vault.modify(existingFile, newContent);
                } else {
                    await this.app.vault.create(rewardFilePath, rewardContent);
                }
            } catch (error) {
                console.warn('Could not write to rewards file:', error);
            }

            // Dispatch reward event
            window.dispatchEvent(new CustomEvent('boss-rewards-awarded', {
                detail: {
                    boss,
                    rewards,
                    rewardText: rewardContent
                }
            }));

        } catch (error) {
            console.error('Failed to award boss rewards:', error);
        }
    }

    /**
     * Get current tracking status
     */
    getStatus(): { isMonitoring: boolean; processedTaskCount: number } {
        return {
            isMonitoring: this.isMonitoring,
            processedTaskCount: this.processedTasks.size
        };
    }

    /**
     * Clear processed tasks cache (useful for testing)
     */
    clearProcessedTasks(): void {
        this.processedTasks.clear();
        console.log('Cleared processed tasks cache');
    }
}