import { Quest } from '../utils/taskParser';

export interface EnergyCalculationResult {
    estimatedCost: number;
    confidence: number; // 0-100% confidence in the estimate
    breakdown: {
        base: number;
        duration: number;
        complexity: number;
        cognitive: number;
        subtasks: number;
    };
    recommendation: string;
    match: 'perfect' | 'good' | 'challenging' | 'insufficient';
}

export class EnergyCalculationService {
    /**
     * Calculate energy cost for a quest based on various factors
     */
    static calculateQuestEnergy(quest: Partial<Quest>, currentEnergy: number = 70): EnergyCalculationResult {
        // If energy cost is already set, use it
        if (quest.energyCost && quest.energyCost > 0) {
            return this.createResultFromExistingCost(quest.energyCost, currentEnergy);
        }

        const breakdown = {
            base: 10, // Base cost for any task
            duration: this.calculateDurationCost(quest.estimatedTime),
            complexity: this.calculateComplexityCost(quest.difficulty),
            cognitive: this.calculateCognitiveCost(quest.skills),
            subtasks: this.calculateSubtaskCost(quest.subtasks)
        };

        const totalCost = Math.min(
            breakdown.base + breakdown.duration + breakdown.complexity + breakdown.cognitive + breakdown.subtasks,
            50 // Maximum energy cost
        );

        const confidence = this.calculateConfidence(quest);
        const match = this.determineEnergyMatch(totalCost, currentEnergy);
        const recommendation = this.generateRecommendation(match, totalCost, currentEnergy);

        return {
            estimatedCost: Math.round(totalCost),
            confidence,
            breakdown,
            recommendation,
            match
        };
    }

    /**
     * Calculate energy cost based on estimated time
     */
    private static calculateDurationCost(estimatedTime?: string): number {
        if (!estimatedTime) return 5; // Default if no time estimate

        const minutes = this.parseTimeToMinutes(estimatedTime);

        // Energy cost scales with time, but not linearly
        if (minutes <= 5) return 2;
        if (minutes <= 15) return 5;
        if (minutes <= 30) return 8;
        if (minutes <= 60) return 15;
        if (minutes <= 120) return 25;
        return 30; // 2+ hours
    }

    /**
     * Calculate energy cost based on difficulty
     */
    private static calculateComplexityCost(difficulty?: string): number {
        switch (difficulty?.toLowerCase()) {
            case 'easy': return 0;
            case 'medium': return 5;
            case 'hard': return 15;
            case 'epic': return 25;
            default: return 5; // Default to medium
        }
    }

    /**
     * Calculate cognitive load based on skills required
     */
    private static calculateCognitiveCost(skills?: string[]): number {
        if (!skills || skills.length === 0) return 0;

        const cognitiveSkills = [
            '@coding', '@programming', '@development',
            '@writing', '@analysis', '@research',
            '@learning', '@studying', '@reading',
            '@design', '@creative', '@problem-solving'
        ];

        const cognitiveLoad = skills.reduce((acc, skill) => {
            if (cognitiveSkills.some(cs => skill.toLowerCase().includes(cs.substring(1)))) {
                return acc + 3; // High cognitive load skills
            }
            return acc + 1; // Regular skills
        }, 0);

        return Math.min(cognitiveLoad, 15); // Cap cognitive cost
    }

    /**
     * Calculate energy cost based on number of subtasks
     */
    private static calculateSubtaskCost(subtasks?: Array<{ text: string; completed: boolean }>): number {
        if (!subtasks || subtasks.length === 0) return 0;

        const incompleteTasks = subtasks.filter(st => !st.completed).length;
        return Math.min(incompleteTasks * 2, 10); // 2 energy per subtask, max 10
    }

    /**
     * Calculate confidence in the energy estimate
     */
    private static calculateConfidence(quest: Partial<Quest>): number {
        let confidence = 50; // Base confidence

        if (quest.estimatedTime) confidence += 30;
        if (quest.difficulty) confidence += 15;
        if (quest.skills && quest.skills.length > 0) confidence += 10;
        if (quest.subtasks && quest.subtasks.length > 0) confidence += 10;
        if (quest.description) confidence += 5;

        return Math.min(confidence, 95); // Never 100% confident
    }

    /**
     * Determine energy match level
     */
    private static determineEnergyMatch(energyCost: number, currentEnergy: number): EnergyCalculationResult['match'] {
        const ratio = energyCost / currentEnergy;

        if (ratio <= 0.3) return 'perfect';
        if (ratio <= 0.5) return 'good';
        if (ratio <= 0.8) return 'challenging';
        return 'insufficient';
    }

    /**
     * Generate recommendation based on energy match
     */
    private static generateRecommendation(
        match: EnergyCalculationResult['match'],
        energyCost: number,
        currentEnergy: number
    ): string {
        switch (match) {
            case 'perfect':
                return `🎯 Perfect match! You have plenty of energy for this task.`;
            case 'good':
                return `✅ Good fit. You can handle this comfortably.`;
            case 'challenging':
                return `⚡ Challenging but doable. Consider taking breaks.`;
            case 'insufficient':
                return `🔋 Low energy. Rest first or break this task into smaller pieces.`;
            default:
                return `⚡ Energy cost: ${energyCost} points.`;
        }
    }

    /**
     * Create result from existing energy cost
     */
    private static createResultFromExistingCost(energyCost: number, currentEnergy: number): EnergyCalculationResult {
        const match = this.determineEnergyMatch(energyCost, currentEnergy);
        const recommendation = this.generateRecommendation(match, energyCost, currentEnergy);

        return {
            estimatedCost: energyCost,
            confidence: 90, // High confidence since it's manually set
            breakdown: {
                base: energyCost,
                duration: 0,
                complexity: 0,
                cognitive: 0,
                subtasks: 0
            },
            recommendation,
            match
        };
    }

    /**
     * Parse time string to minutes
     */
    private static parseTimeToMinutes(timeStr: string): number {
        const match = timeStr.match(/(\d+(?:\.\d+)?)\s*(min|minute|hour|hr|h|m)/i);
        if (!match) return 15; // Default

        const value = parseFloat(match[1]);
        const unit = match[2].toLowerCase();

        if (unit.startsWith('h')) return value * 60;
        return value;
    }

    /**
     * Get energy match color for UI
     */
    static getEnergyMatchColor(match: EnergyCalculationResult['match']): string {
        switch (match) {
            case 'perfect': return '#10b981'; // Green
            case 'good': return '#22c55e'; // Light green
            case 'challenging': return '#f59e0b'; // Yellow
            case 'insufficient': return '#ef4444'; // Red
            default: return '#6b7280'; // Gray
        }
    }

    /**
     * Get energy match icon for UI
     */
    static getEnergyMatchIcon(match: EnergyCalculationResult['match']): string {
        switch (match) {
            case 'perfect': return '🎯';
            case 'good': return '✅';
            case 'challenging': return '⚡';
            case 'insufficient': return '🔋';
            default: return '⚡';
        }
    }

    /**
     * Auto-calculate and set energy cost for quest if not present
     */
    static enhanceQuestWithEnergy(quest: Quest, currentEnergy: number = 70): Quest {
        if (quest.energyCost) return quest; // Already has energy cost

        const calculation = this.calculateQuestEnergy(quest, currentEnergy);
        return {
            ...quest,
            energyCost: calculation.estimatedCost
        };
    }

    /**
     * Batch process multiple quests
     */
    static enhanceQuestsWithEnergy(quests: Quest[], currentEnergy: number = 70): Quest[] {
        return quests.map(quest => this.enhanceQuestWithEnergy(quest, currentEnergy));
    }
}
