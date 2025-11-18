import { Boss, BossBattleState, BossMove } from '../types/BossTypes';

export class BossBattleEngine {
    private static readonly CRITICAL_HIT_CHANCE = 0.1;
    private static readonly CRITICAL_HIT_MULTIPLIER = 1.5;
    private static readonly MISS_CHANCE = 0.05;
    private static readonly STAB_MULTIPLIER = 1.5; // Same Type Attack Bonus

    static calculateDamage(attacker: 'player' | 'boss', move: BossMove, attackerStats: any, defenderStats: any): number {
        // Check for miss
        if (Math.random() < this.MISS_CHANCE) return 0;

        let baseDamage = 0;

        if (move.type === 'attack') {
            baseDamage = (attackerStats.attack * 2 + move.power - defenderStats.defense) / 2;
        } else if (move.type === 'special') {
            baseDamage = (attackerStats.specialAttack * 2 + move.power - defenderStats.specialDefense) / 2;
        }

        // Apply critical hit
        if (Math.random() < this.CRITICAL_HIT_CHANCE) {
            baseDamage *= this.CRITICAL_HIT_MULTIPLIER;
        }

        // Apply random variance (±10%)
        const variance = 0.9 + Math.random() * 0.2;
        baseDamage *= variance;

        // Ensure minimum damage
        return Math.max(1, Math.floor(baseDamage));
    }

    static applyMoveEffects(move: BossMove, target: any, isPlayer: boolean): string[] {
        const effects: string[] = [];

        if (move.effect) {
            const { type, target: effectTarget, value, duration } = move.effect;

            if (effectTarget === 'player' && isPlayer) {
                if (type === 'debuff') {
                    target.debuffs.push({
                        name: `${move.name} Debuff`,
                        type: 'attack', // Default to attack debuff
                        value: -value,
                        duration
                    });
                    effects.push(`Player's attack reduced by ${value} for ${duration} turns`);
                }
            } else if (effectTarget === 'self' && !isPlayer) {
                if (type === 'buff') {
                    target.buffs.push({
                        name: `${move.name} Buff`,
                        type: 'attack',
                        value: value,
                        duration
                    });
                    effects.push(`Boss's attack increased by ${value} for ${duration} turns`);
                }
            }
        }

        return effects;
    }

    static processTurn(battleState: BossBattleState, playerMove: string): BossBattleState {
        const newState = { ...battleState };
        newState.currentTurn++;
        newState.battleLog = [...battleState.battleLog];

        // Player's turn
        const playerMoveObj = this.getPlayerMove(playerMove);
        if (playerMoveObj) {
            const damage = this.calculateDamage('player', playerMoveObj, newState.playerStats, newState.boss.stats);
            newState.boss.stats.currentHP = Math.max(1, newState.boss.stats.currentHP - damage);

            newState.battleLog.push({
                turn: newState.currentTurn,
                actor: 'player',
                action: `Used ${playerMoveObj.name}`,
                damage,
                timestamp: new Date()
            });

            // Check if boss should change phase
            this.checkPhaseChange(newState);
        }

        // Boss's turn (if not defeated)
        if (newState.boss.stats.currentHP > 1) {
            const bossMove = this.selectBossMove(newState.boss, newState);
            const damage = this.calculateDamage('boss', bossMove, newState.boss.stats, newState.playerStats);
            newState.playerStats.currentHP = Math.max(0, newState.playerStats.currentHP - damage);

            newState.battleLog.push({
                turn: newState.currentTurn,
                actor: 'boss',
                action: `Used ${bossMove.name}`,
                damage,
                timestamp: new Date()
            });

            // Apply move effects
            const effects = this.applyMoveEffects(bossMove, newState.playerStats, true);
            if (effects.length > 0) {
                newState.battleLog[newState.battleLog.length - 1].effects = effects;
            }
        }

        // Check win/lose conditions
        if (newState.playerStats.currentHP <= 0) {
            newState.gameOver = true;
            newState.victory = false;
        } else if (this.isBossDefeated(newState.boss)) {
            newState.gameOver = true;
            newState.victory = true;
        }

        // Update buffs/debuffs
        this.updateBuffsAndDebuffs(newState);

        return newState;
    }

    private static getPlayerMove(moveName: string): any {
        // Player moves based on completed tasks and stats
        const moves = [
            {
                name: 'Task Strike',
                type: 'attack',
                power: 50,
                accuracy: 90,
                description: 'Attack based on completed tasks'
            },
            {
                name: 'Focus Beam',
                type: 'special',
                power: 60,
                accuracy: 85,
                description: 'Special attack using focus stat'
            },
            {
                name: 'Motivation Surge',
                type: 'status',
                power: 0,
                accuracy: 100,
                description: 'Boost your stats temporarily'
            },
            {
                name: 'Deadline Rush',
                type: 'attack',
                power: 70,
                accuracy: 80,
                description: 'High-risk, high-reward attack'
            }
        ];

        return moves.find(move => move.name === moveName);
    }

    private static selectBossMove(boss: Boss, battleState: BossBattleState): BossMove {
        const availableMoves = boss.moves.filter(move => {
            if (move.cooldown && move.lastUsed) {
                return battleState.currentTurn - move.lastUsed >= move.cooldown;
            }
            return true;
        });

        if (availableMoves.length === 0) {
            return boss.moves[0]; // Fallback to basic attack
        }

        // Simple AI: prefer moves with effects, then high damage
        const moveWithEffects = availableMoves.find(move => move.effect);
        if (moveWithEffects) return moveWithEffects;

        const highestDamageMove = availableMoves.reduce((best, current) =>
            current.power > best.power ? current : best
        );
        return highestDamageMove;
    }

    private static checkPhaseChange(battleState: BossBattleState): void {
        const boss = battleState.boss;
        const currentPhase = boss.currentPhase;
        const hpPercentage = (boss.stats.currentHP / boss.stats.maxHP) * 100;

        if (currentPhase < boss.phases.length - 1) {
            const nextPhase = boss.phases[currentPhase + 1];
            if (hpPercentage <= nextPhase.hpThreshold) {
                boss.currentPhase = currentPhase + 1;
                battleState.battleLog.push({
                    turn: battleState.currentTurn,
                    actor: 'boss',
                    action: `Phase Change: ${nextPhase.name}`,
                    timestamp: new Date()
                });
            }
        }
    }

    private static isBossDefeated(boss: Boss): boolean {
        // Boss can only be defeated when all quest tasks are completed
        // This will be checked externally
        return false;
    }

    private static updateBuffsAndDebuffs(battleState: BossBattleState): void {
        // Update player buffs
        battleState.playerStats.buffs = battleState.playerStats.buffs
            .map(buff => ({ ...buff, duration: buff.duration - 1 }))
            .filter(buff => buff.duration > 0);

        // Update player debuffs
        battleState.playerStats.debuffs = battleState.playerStats.debuffs
            .map(debuff => ({ ...debuff, duration: debuff.duration - 1 }))
            .filter(debuff => debuff.duration > 0);

        // Apply buff/debuff effects to stats
        this.applyBuffsAndDebuffs(battleState.playerStats);
    }

    private static applyBuffsAndDebuffs(stats: any): void {
        // Reset stats to base values first
        // This would need to be implemented based on your player stats system

        // Apply buffs
        stats.buffs.forEach((buff: any) => {
            if (buff.type === 'attack') stats.attack += buff.value;
            if (buff.type === 'defense') stats.defense += buff.value;
            if (buff.type === 'speed') stats.speed += buff.value;
            if (buff.type === 'special') stats.specialAttack += buff.value;
        });

        // Apply debuffs
        stats.debuffs.forEach((debuff: any) => {
            if (debuff.type === 'attack') stats.attack += debuff.value;
            if (debuff.type === 'defense') stats.defense += debuff.value;
            if (debuff.type === 'speed') stats.speed += debuff.value;
            if (debuff.type === 'special') stats.specialAttack += debuff.value;
        });
    }

    // New method to calculate damage from task completion
    static calculateTaskCompletionDamage(quest: any, completedSubtasks: number): number {
        const totalSubtasks = quest.subtasks?.length || 0;
        if (totalSubtasks === 0) return 0;

        // Base damage per completed subtask
        const baseDamage = 25;
        const completionBonus = (completedSubtasks / totalSubtasks) * 75;

        // Difficulty multiplier
        let difficultyMultiplier = 1;
        if (quest.difficulty === 'Hard') difficultyMultiplier = 1.5;
        else if (quest.difficulty === 'Easy') difficultyMultiplier = 0.8;

        // Priority multiplier
        let priorityMultiplier = 1;
        if (quest.priority === 'High') priorityMultiplier = 1.3;
        else if (quest.priority === 'Low') priorityMultiplier = 0.9;

        const totalDamage = Math.floor((baseDamage + completionBonus) * difficultyMultiplier * priorityMultiplier);

        return Math.max(10, totalDamage); // Minimum 10 damage
    }

    // Method to check if boss can be defeated
    static canDefeatBoss(boss: Boss, quest: any): boolean {
        if (!quest.subtasks) return false;

        const totalSubtasks = quest.subtasks.length;
        const completedSubtasks = quest.subtasks.filter((subtask: any) => subtask.completed).length;

        // Boss can only be defeated when ALL subtasks are completed
        return totalSubtasks > 0 && completedSubtasks === totalSubtasks;
    }

    // Method to get boss health percentage
    static getBossHealthPercentage(boss: Boss): number {
        return Math.round((boss.stats.currentHP / boss.stats.maxHP) * 100);
    }

    // Method to get boss phase info
    static getBossPhaseInfo(boss: Boss): { current: number; total: number; name: string } {
        return {
            current: boss.currentPhase + 1,
            total: boss.phases.length,
            name: boss.phases[boss.currentPhase]?.name || 'Unknown Phase'
        };
    }
}
