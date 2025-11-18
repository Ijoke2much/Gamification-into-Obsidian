// Energy Calculation Service for ADHD and Hyperfocus Management
// Calculates and manages energy costs, hyperfocus states, and optimal task scheduling

export interface EnergyState {
    currentEnergy: number; // 0-100
    maxEnergy: number; // 100
    energyType: 'mental' | 'physical' | 'creative' | 'analytical';
    hyperfocusLevel: number; // 0-100
    lastUpdated: Date;
    energyRegenRate: number; // per minute
    hyperfocusCooldown: number; // minutes until next hyperfocus available
}

export interface TaskEnergyProfile {
    taskId: string;
    title: string;
    baseEnergyCost: number; // 1-50
    energyType: 'mental' | 'physical' | 'creative' | 'analytical';
    hyperfocusMultiplier: number; // 0.5-2.0 (lower = easier in hyperfocus)
    difficulty: 'easy' | 'medium' | 'hard' | 'epic';
    estimatedDuration: number; // minutes
    subtasks: Array<{
        text: string;
        energyCost: number;
        hyperfocusFriendly: boolean;
    }>;
    optimalEnergyRange: {
        min: number;
        max: number;
    };
    hyperfocusOptimal: boolean;
}

export interface EnergyRecommendation {
    canStart: boolean;
    recommendedEnergy: number;
    hyperfocusRecommended: boolean;
    estimatedEnergyDrain: number;
    warningLevel: 'none' | 'low' | 'medium' | 'high';
    suggestions: string[];
    optimalTimeOfDay?: number;
}

export interface HyperfocusSession {
    sessionId: string;
    startTime: Date;
    endTime?: Date;
    initialEnergy: number;
    finalEnergy: number;
    tasksCompleted: string[];
    energyEfficiency: number; // 0-100
    hyperfocusLevel: number;
    interruptions: number;
    totalProductivity: number;
}

export class EnergyCalculationService {
    private static readonly ENERGY_TYPES = {
        'mental': { baseRegen: 2, hyperfocusBonus: 1.5 },
        'physical': { baseRegen: 1.5, hyperfocusBonus: 1.2 },
        'creative': { baseRegen: 1, hyperfocusBonus: 2.0 },
        'analytical': { baseRegen: 2.5, hyperfocusBonus: 1.8 }
    };

    private static readonly DIFFICULTY_ENERGY_MULTIPLIERS = {
        'easy': 1.0,
        'medium': 1.3,
        'hard': 1.8,
        'epic': 2.5
    };

    private static readonly HYPERFOCUS_THRESHOLDS = {
        low: 30,    // 30+ energy for basic hyperfocus
        medium: 50, // 50+ energy for medium hyperfocus
        high: 70,   // 70+ energy for high hyperfocus
        peak: 90    // 90+ energy for peak hyperfocus
    };

    private energyState: EnergyState = {
        currentEnergy: 100,
        maxEnergy: 100,
        energyType: 'mental',
        hyperfocusLevel: 0,
        lastUpdated: new Date(),
        energyRegenRate: 2, // 2 energy per minute
        hyperfocusCooldown: 0
    };

    private hyperfocusSessions: HyperfocusSession[] = [];

    /**
     * Calculate energy cost for a task
     */
    calculateTaskEnergyCost(task: TaskEnergyProfile, useHyperfocus: boolean = false): number {
        const baseCost = task.baseEnergyCost;
        const difficultyMultiplier = EnergyCalculationService.DIFFICULTY_ENERGY_MULTIPLIERS[task.difficulty];

        let totalCost = baseCost * difficultyMultiplier;

        // Apply hyperfocus modifier
        if (useHyperfocus && task.hyperfocusOptimal) {
            totalCost *= task.hyperfocusMultiplier;
        }

        // Apply energy type modifier
        const energyTypeModifier = this.getEnergyTypeModifier(task.energyType, useHyperfocus);
        totalCost *= energyTypeModifier;

        // Apply time-based modifier (longer tasks cost more energy)
        const timeModifier = Math.min(2.0, 1 + (task.estimatedDuration / 60) * 0.1);
        totalCost *= timeModifier;

        return Math.round(totalCost);
    }

    /**
     * Get energy recommendation for starting a task
     */
    getEnergyRecommendation(task: TaskEnergyProfile, currentTime: Date = new Date()): EnergyRecommendation {
        const estimatedCost = this.calculateTaskEnergyCost(task);
        const hyperfocusCost = this.calculateTaskEnergyCost(task, true);

        const canStart = this.energyState.currentEnergy >= estimatedCost;
        const canHyperfocus = this.canEnterHyperfocus() && task.hyperfocusOptimal;

        let warningLevel: 'none' | 'low' | 'medium' | 'high' = 'none';
        const suggestions: string[] = [];

        // Determine warning level
        if (this.energyState.currentEnergy < estimatedCost * 0.5) {
            warningLevel = 'high';
            suggestions.push('Energy too low! Consider taking a break first.');
        } else if (this.energyState.currentEnergy < estimatedCost * 0.7) {
            warningLevel = 'medium';
            suggestions.push('Energy is getting low. Consider a shorter session.');
        } else if (this.energyState.currentEnergy < estimatedCost) {
            warningLevel = 'low';
            suggestions.push('Energy is borderline. Monitor your energy levels.');
        }

        // Hyperfocus recommendations
        if (canHyperfocus && hyperfocusCost < this.energyState.currentEnergy * 0.8) {
            suggestions.push('Perfect time for hyperfocus mode!');
        }

        // Time-based recommendations
        const optimalHour = this.getOptimalTimeForTask(task);
        const currentHour = currentTime.getHours();
        if (Math.abs(currentHour - optimalHour) > 2) {
            suggestions.push(`Optimal time for this task: ${optimalHour}:00`);
        }

        return {
            canStart,
            recommendedEnergy: Math.max(estimatedCost * 1.2, 30),
            hyperfocusRecommended: canHyperfocus && task.hyperfocusOptimal,
            estimatedEnergyDrain: estimatedCost,
            warningLevel,
            suggestions,
            optimalTimeOfDay: optimalHour
        };
    }

    /**
     * Start a hyperfocus session
     */
    startHyperfocusSession(task: TaskEnergyProfile): HyperfocusSession {
        const sessionId = `hyperfocus-${Date.now()}`;

        const session: HyperfocusSession = {
            sessionId,
            startTime: new Date(),
            initialEnergy: this.energyState.currentEnergy,
            finalEnergy: 0,
            tasksCompleted: [],
            energyEfficiency: 0,
            hyperfocusLevel: this.energyState.hyperfocusLevel,
            interruptions: 0,
            totalProductivity: 0
        };

        this.hyperfocusSessions.push(session);

        // Set hyperfocus cooldown
        this.energyState.hyperfocusCooldown = 60; // 1 hour cooldown

        console.log(`🧠 Started hyperfocus session: ${task.title}`);
        return session;
    }

    /**
     * End a hyperfocus session
     */
    endHyperfocusSession(sessionId: string, energyUsed: number, tasksCompleted: string[]): HyperfocusSession | null {
        const session = this.hyperfocusSessions.find(s => s.sessionId === sessionId);
        if (!session) return null;

        session.endTime = new Date();
        session.finalEnergy = this.energyState.currentEnergy;
        session.tasksCompleted = tasksCompleted;

        // Calculate efficiency (productivity per energy used)
        const duration = (session.endTime.getTime() - session.startTime.getTime()) / (1000 * 60);
        const productivity = tasksCompleted.length * 10; // Base productivity score
        session.totalProductivity = productivity;
        session.energyEfficiency = productivity / Math.max(energyUsed, 1);

        // Update energy state
        this.energyState.currentEnergy = Math.max(0, this.energyState.currentEnergy - energyUsed);
        this.energyState.lastUpdated = new Date();

        console.log(`🧠 Ended hyperfocus session: ${tasksCompleted.length} tasks completed, efficiency: ${session.energyEfficiency.toFixed(1)}`);
        return session;
    }

    /**
     * Update energy state over time
     */
    updateEnergyState(): void {
        const now = new Date();
        const timeDiff = (now.getTime() - this.energyState.lastUpdated.getTime()) / (1000 * 60); // minutes

        // Regenerate energy
        const regenAmount = this.energyState.energyRegenRate * timeDiff;
        this.energyState.currentEnergy = Math.min(
            this.energyState.maxEnergy,
            this.energyState.currentEnergy + regenAmount
        );

        // Update hyperfocus cooldown
        if (this.energyState.hyperfocusCooldown > 0) {
            this.energyState.hyperfocusCooldown = Math.max(0, this.energyState.hyperfocusCooldown - timeDiff);
        }

        // Update hyperfocus level based on recent performance
        this.updateHyperfocusLevel();

        this.energyState.lastUpdated = now;
    }

    /**
     * Consume energy for a task
     */
    consumeEnergy(amount: number, taskType: string = ''): boolean {
        if (this.energyState.currentEnergy < amount) {
            console.warn(`⚠️ Insufficient energy: ${this.energyState.currentEnergy}/${amount}`);
            return false;
        }

        this.energyState.currentEnergy -= amount;
        this.energyState.lastUpdated = new Date();

        console.log(`⚡ Consumed ${amount} energy for ${taskType}. Remaining: ${this.energyState.currentEnergy}`);
        return true;
    }

    /**
     * Restore energy (breaks, rest, etc.)
     */
    restoreEnergy(amount: number, source: string = 'rest'): void {
        const oldEnergy = this.energyState.currentEnergy;
        this.energyState.currentEnergy = Math.min(
            this.energyState.maxEnergy,
            this.energyState.currentEnergy + amount
        );

        const restored = this.energyState.currentEnergy - oldEnergy;
        console.log(`💤 Restored ${restored} energy from ${source}. Total: ${this.energyState.currentEnergy}`);
    }

    /**
     * Check if hyperfocus is available
     */
    canEnterHyperfocus(): boolean {
        return this.energyState.currentEnergy >= EnergyCalculationService.HYPERFOCUS_THRESHOLDS.low &&
            this.energyState.hyperfocusCooldown <= 0;
    }

    /**
     * Get current energy state
     */
    getEnergyState(): EnergyState {
        this.updateEnergyState();
        return { ...this.energyState };
    }

    /**
     * Get hyperfocus sessions history
     */
    getHyperfocusHistory(): HyperfocusSession[] {
        return [...this.hyperfocusSessions];
    }

    /**
     * Get energy type modifier
     */
    private getEnergyTypeModifier(energyType: string, inHyperfocus: boolean): number {
        const typeConfig = EnergyCalculationService.ENERGY_TYPES[energyType as keyof typeof EnergyCalculationService.ENERGY_TYPES];
        if (!typeConfig) return 1.0;

        return inHyperfocus ?
            typeConfig.hyperfocusBonus :
            typeConfig.baseRegen / 2; // Normal energy consumption
    }

    /**
     * Get optimal time of day for a task
     */
    private getOptimalTimeForTask(task: TaskEnergyProfile): number {
        // Based on energy type, return optimal hour
        switch (task.energyType) {
            case 'mental':
                return 10; // Morning mental work
            case 'creative':
                return 14; // Afternoon creativity
            case 'analytical':
                return 9; // Early morning analysis
            case 'physical':
                return 16; // Afternoon physical tasks
            default:
                return 11; // Default morning time
        }
    }

    /**
     * Update hyperfocus level based on recent performance
     */
    private updateHyperfocusLevel(): void {
        const recentSessions = this.hyperfocusSessions.filter(s =>
            s.endTime && (Date.now() - s.endTime.getTime()) < (7 * 24 * 60 * 60 * 1000) // Last 7 days
        );

        if (recentSessions.length === 0) {
            this.energyState.hyperfocusLevel = Math.max(0, this.energyState.hyperfocusLevel - 1);
            return;
        }

        const avgEfficiency = recentSessions.reduce((sum, s) => sum + s.energyEfficiency, 0) / recentSessions.length;
        const avgInterruptions = recentSessions.reduce((sum, s) => sum + s.interruptions, 0) / recentSessions.length;

        // Calculate hyperfocus level based on performance
        let newLevel = Math.min(100, avgEfficiency * 10); // Efficiency contributes to level

        // Reduce level based on interruptions
        newLevel -= avgInterruptions * 5;

        // Smooth transition to new level
        this.energyState.hyperfocusLevel = Math.max(0, Math.min(100,
            (this.energyState.hyperfocusLevel * 0.8) + (newLevel * 0.2)
        ));
    }

    /**
     * Create task energy profile from quest data
     */
    createTaskEnergyProfile(quest: any): TaskEnergyProfile {
        const energyType = this.determineEnergyType(quest);
        const baseCost = quest.energyCost || this.estimateEnergyCost(quest);

        return {
            taskId: quest.id || `${quest.filePath}:${quest.lineNumber}`,
            title: quest.title,
            baseEnergyCost: baseCost,
            energyType,
            hyperfocusMultiplier: this.getHyperfocusMultiplier(quest),
            difficulty: quest.difficulty || 'medium',
            estimatedDuration: quest.estimatedDuration || 25,
            subtasks: quest.subtasks?.map((subtask: any) => ({
                text: subtask.text,
                energyCost: Math.round(baseCost * 0.2), // Each subtask costs 20% of base
                hyperfocusFriendly: this.isHyperfocusFriendly(subtask.text)
            })) || [],
            optimalEnergyRange: {
                min: Math.round(baseCost * 0.7),
                max: Math.round(baseCost * 1.3)
            },
            hyperfocusOptimal: this.isHyperfocusOptimal(quest)
        };
    }

    /**
     * Determine energy type from quest content
     */
    private determineEnergyType(quest: any): 'mental' | 'physical' | 'creative' | 'analytical' {
        const title = quest.title.toLowerCase();
        const description = (quest.description || '').toLowerCase();
        const skills = (quest.skills || []).join(' ').toLowerCase();
        const content = `${title} ${description} ${skills}`;

        // Creative tasks
        if (content.includes('design') || content.includes('write') || content.includes('create') ||
            content.includes('brainstorm') || content.includes('art') || content.includes('music')) {
            return 'creative';
        }

        // Physical tasks
        if (content.includes('exercise') || content.includes('walk') || content.includes('clean') ||
            content.includes('organize') || content.includes('move') || content.includes('build')) {
            return 'physical';
        }

        // Analytical tasks
        if (content.includes('analyze') || content.includes('calculate') || content.includes('review') ||
            content.includes('research') || content.includes('data') || content.includes('code')) {
            return 'analytical';
        }

        // Default to mental
        return 'mental';
    }

    /**
     * Estimate energy cost for a quest
     */
    private estimateEnergyCost(quest: any): number {
        let baseCost = 10; // Default cost

        // Adjust based on difficulty
        switch (quest.difficulty) {
            case 'easy': baseCost = 8; break;
            case 'medium': baseCost = 12; break;
            case 'hard': baseCost = 18; break;
            case 'epic': baseCost = 25; break;
        }

        // Adjust based on estimated duration
        const duration = quest.estimatedDuration || 25;
        baseCost = Math.round(baseCost * (duration / 25));

        // Adjust based on subtask count
        const subtaskCount = quest.subtasks?.length || 0;
        baseCost += subtaskCount * 2;

        return Math.min(50, Math.max(5, baseCost)); // Clamp between 5-50
    }

    /**
     * Get hyperfocus multiplier for a quest
     */
    private getHyperfocusMultiplier(quest: any): number {
        const energyType = this.determineEnergyType(quest);

        // Different energy types have different hyperfocus benefits
        switch (energyType) {
            case 'creative': return 0.6; // Creative tasks are very hyperfocus-friendly
            case 'analytical': return 0.7; // Analytical tasks benefit from hyperfocus
            case 'mental': return 0.8; // Mental tasks are moderately hyperfocus-friendly
            case 'physical': return 1.2; // Physical tasks don't benefit much from hyperfocus
            default: return 1.0;
        }
    }

    /**
     * Check if a quest is hyperfocus-optimal
     */
    private isHyperfocusOptimal(quest: any): boolean {
        const energyType = this.determineEnergyType(quest);
        const duration = quest.estimatedDuration || 25;

        // Creative and analytical tasks are good for hyperfocus
        if (energyType === 'creative' || energyType === 'analytical') {
            return true;
        }

        // Longer mental tasks can benefit from hyperfocus
        if (energyType === 'mental' && duration >= 45) {
            return true;
        }

        return false;
    }

    /**
     * Check if a subtask is hyperfocus-friendly
     */
    private isHyperfocusFriendly(subtaskText: string): boolean {
        const text = subtaskText.toLowerCase();

        // Hyperfocus-friendly tasks
        const friendlyKeywords = ['write', 'code', 'design', 'analyze', 'research', 'create', 'solve'];
        return friendlyKeywords.some(keyword => text.includes(keyword));
    }

    /**
     * Get energy visualization data
     */
    getEnergyVisualizationData(): {
        currentEnergy: number;
        maxEnergy: number;
        energyType: string;
        hyperfocusLevel: number;
        hyperfocusAvailable: boolean;
        cooldownRemaining: number;
        recentEfficiency: number;
    } {
        this.updateEnergyState();

        const recentSessions = this.hyperfocusSessions.filter(s =>
            s.endTime && (Date.now() - s.endTime.getTime()) < (24 * 60 * 60 * 1000) // Last 24 hours
        );

        const recentEfficiency = recentSessions.length > 0 ?
            recentSessions.reduce((sum, s) => sum + s.energyEfficiency, 0) / recentSessions.length : 0;

        return {
            currentEnergy: this.energyState.currentEnergy,
            maxEnergy: this.energyState.maxEnergy,
            energyType: this.energyState.energyType,
            hyperfocusLevel: this.energyState.hyperfocusLevel,
            hyperfocusAvailable: this.canEnterHyperfocus(),
            cooldownRemaining: this.energyState.hyperfocusCooldown,
            recentEfficiency
        };
    }
}
