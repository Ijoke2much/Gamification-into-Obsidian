import React, { useState, useEffect, useCallback } from 'react';
import { Notice } from 'obsidian';
import { Boss, PlayerStats, StatBasedMove, SkillTreeStats } from '../../../../features/quests/types/BossTypes';
import { EnhancedMove, EnhancedBattleState, ActiveEffect } from '../../../../features/quests/types/EnhancedMoveTypes';
import { SkillBasedBattleEngine } from '../../../../features/quests/utils/skillBasedBattleEngine';
import { EnhancedMoveEngine } from '../../../../features/quests/utils/enhancedMoveEngine';
import { EnhancedMoveCard } from './EnhancedMoveCard';
import styles from '../BossBattleStyles.module.css';

interface EnhancedBattleUIProps {
    boss: Boss;
    playerStats: PlayerStats;
    skillStats: SkillTreeStats;
    availableMoves: StatBasedMove[];
    moveCalculations: { [moveId: string]: any };
    battleLog: string[];
    isQuestTrackingActive: boolean;
    onMoveUse: (move: StatBasedMove) => void;
    onQuestTrackingToggle: () => void;
    onBattleAction: (action: string) => void;
}

export const EnhancedBattleUI: React.FC<EnhancedBattleUIProps> = ({
    boss,
    playerStats,
    skillStats,
    availableMoves,
    moveCalculations,
    battleLog,
    isQuestTrackingActive,
    onMoveUse,
    onQuestTrackingToggle,
    onBattleAction
}) => {
    const [damageAnimation, setDamageAnimation] = useState<{ damage: number; x: number; y: number } | null>(null);
    const [lastHP, setLastHP] = useState(boss.stats.currentHP);
    const [animatedHP, setAnimatedHP] = useState(boss.stats.currentHP);
    
    // Enhanced battle state
    const [enhancedBattleState, setEnhancedBattleState] = useState<EnhancedBattleState>({
        currentTurn: 1,
        activeEffects: new Map(),
        moveHistory: [],
        comboChain: [],
        lastComboTurn: 0,
        availableMoves: [],
        playerActionThisTurn: false,
        bossActionThisTurn: false,
        playerBuffs: [],
        bossDebuffs: []
    });
    
    // Enhanced moves
    const [enhancedMoves, setEnhancedMoves] = useState<EnhancedMove[]>([]);
    
    // Initialize enhanced moves
    useEffect(() => {
        const defaultMoves = EnhancedMoveEngine.createDefaultEnhancedMoves();
        setEnhancedMoves(defaultMoves);
        setEnhancedBattleState(prev => ({
            ...prev,
            availableMoves: defaultMoves
        }));
    }, []);

    // Animate HP changes
    useEffect(() => {
        if (boss.stats.currentHP !== lastHP) {
            const damage = lastHP - boss.stats.currentHP;
            if (damage > 0) {
                // Show damage animation
                setDamageAnimation({
                    damage,
                    x: Math.random() * 200 - 100,
                    y: Math.random() * 50 - 25
                });

                setTimeout(() => setDamageAnimation(null), 2000);
            }

            // Animate HP bar
            const startHP = animatedHP;
            const targetHP = boss.stats.currentHP;
            const duration = 800;
            const startTime = Date.now();

            const animateHP = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const currentHP = startHP + (targetHP - startHP) * progress;
                
                setAnimatedHP(currentHP);

                if (progress < 1) {
                    requestAnimationFrame(animateHP);
                }
            };

            requestAnimationFrame(animateHP);
            setLastHP(boss.stats.currentHP);
        }
    }, [boss.stats.currentHP, lastHP, animatedHP]);

    const getHPPercentage = () => {
        return Math.max(0, (animatedHP / boss.stats.maxHP) * 100);
    };

    const getHPColor = () => {
        const percentage = getHPPercentage();
        if (percentage > 60) return 'linear-gradient(90deg, #10b981 0%, #059669 100%)';
        if (percentage > 30) return 'linear-gradient(90deg, #f97316 0%, #ea580c 100%)';
        return 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)';
    };

    const isMoveAvailable = (move: StatBasedMove) => {
        const primaryStat = playerStats[move.statRequirements.primaryStat as keyof PlayerStats] || 0;
        const meetsRequirement = primaryStat >= move.statRequirements.primaryMinLevel;
        
        if (move.statRequirements.secondaryStat && move.statRequirements.secondaryMinLevel) {
            const secondaryStat = playerStats[move.statRequirements.secondaryStat as keyof PlayerStats] || 0;
            return meetsRequirement && secondaryStat >= move.statRequirements.secondaryMinLevel;
        }
        
        return meetsRequirement;
    };

    const renderBossAvatar = () => {
        const hasCustomImage = boss.visuals?.customImage;
        if (hasCustomImage) {
            return (
                <img 
                    src={boss.visuals.customImage} 
                    alt={boss.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                />
            );
        }
        return <div>{boss.visuals?.avatar || '👹'}</div>;
    };

    const renderPlayerStats = () => {
        const statEntries = Object.entries(playerStats);
        
        return (
            <div className={styles.playerStatsSection}>
                <h3 style={{ margin: '0 0 16px 0', color: '#10b981', fontSize: '20px', fontWeight: 'bold' }}>
                    ⚔️ Player Combat Stats
                </h3>
                <div className={styles.playerStatsGrid}>
                    {statEntries.map(([statName, value]) => {
                        const skillData = skillStats[statName] || skillStats[statName.charAt(0).toUpperCase() + statName.slice(1)];
                        return (
                            <div key={statName} className={styles.statCard}>
                                <div className={styles.statName}>{statName}</div>
                                <div className={styles.statValue}>{value}</div>
                                {skillData && (
                                    <div className={styles.statLevel}>
                                        Level {skillData.level} ({skillData.currentCP}/{skillData.requiredCP} CP)
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderMoves = () => {
        return (
            <div className={styles.movesSection}>
                <h3 style={{ margin: '0 0 16px 0', color: '#8b5cf6', fontSize: '20px', fontWeight: 'bold' }}>
                    🎯 Enhanced Moves
                </h3>
                
                {/* Turn Indicator */}
                <div className={styles.turnIndicator}>
                    <span className={styles.turnNumber}>Turn {enhancedBattleState.currentTurn}</span>
                    <span className={styles.turnPhase}>Player Phase</span>
                </div>
                
                {/* Active Effects */}
                {(enhancedBattleState.playerBuffs.length > 0 || enhancedBattleState.bossDebuffs.length > 0) && (
                    <div className={styles.activeEffectsPanel}>
                        <h4 style={{ margin: '0 0 8px 0', color: '#10b981', fontSize: '14px' }}>Active Effects</h4>
                        <div className={styles.activeEffectsList}>
                            {enhancedBattleState.playerBuffs.map((effect) => (
                                <div key={effect.id} className={styles.activeEffect}>
                                    <span>{effect.name}</span>
                                    <span className={styles.effectDuration}>{effect.remainingTurns}T</span>
                                </div>
                            ))}
                            {enhancedBattleState.bossDebuffs.map((effect) => (
                                <div key={effect.id} className={`${styles.activeEffect} ${styles.debuff}`}>
                                    <span>{effect.name} (Boss)</span>
                                    <span className={styles.effectDuration}>{effect.remainingTurns}T</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                <div className={styles.movesGrid}>
                    {enhancedMoves.map((move) => {
                        const isAvailable = EnhancedMoveEngine.isMoveAvailable(move, enhancedBattleState);
                        const turnsUntilAvailable = EnhancedMoveEngine.getTurnsUntilAvailable(move, enhancedBattleState);
                        const calculation = moveCalculations[move.name];
                        
                        return (
                            <EnhancedMoveCard
                                key={move.name}
                                move={move}
                                battleState={enhancedBattleState}
                                playerStats={playerStats}
                                isAvailable={isAvailable}
                                turnsUntilAvailable={turnsUntilAvailable}
                                damage={calculation?.totalPower}
                                onUse={handleEnhancedMoveUse}
                            />
                        );
                    })}
                </div>
            </div>
        );
    };
    
    const handleEnhancedMoveUse = async (enhancedMove: EnhancedMove) => {
        try {
            const result = await EnhancedMoveEngine.executeEnhancedMove(
                // We'll need to pass the vault from props or context
                {} as any, // vault placeholder
                enhancedMove,
                boss,
                enhancedBattleState,
                playerStats
            );
            
            // Update battle state
            setEnhancedBattleState(result.newBattleState);
            
            // Add messages to battle log
            result.messages.forEach(message => {
                // Add to existing battle log system
                console.log(message);
            });
            
            // Advance turn
            setEnhancedBattleState(prev => ({
                ...prev,
                currentTurn: prev.currentTurn + 1,
                playerActionThisTurn: true
            }));
            
        } catch (error) {
            console.error('Failed to execute enhanced move:', error);
        }
    };

    const renderBattleLog = () => {
        return (
            <div className={styles.battleLogSection}>
                <h3 style={{ margin: '0 0 16px 0', color: '#ffd700', fontSize: '20px', fontWeight: 'bold' }}>
                    📜 Battle Log
                </h3>
                <div className={styles.battleLog}>
                    {battleLog.slice(-10).map((log, index) => {
                        const logType = log.includes('damage') ? 'damage' : 
                                       log.includes('defeated') ? 'victory' :
                                       log.includes('tracking') ? 'info' : 'info';
                        
                        return (
                            <div key={index} className={`${styles.logEntry} ${styles[logType]}`}>
                                {log}
                            </div>
                        );
                    })}
                    {battleLog.length === 0 && (
                        <div className={styles.logEntry}>
                            Battle ready! Use moves or complete tagged quests to deal damage.
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderQuestTracking = () => {
        return (
            <div className={styles.questTrackingSection}>
                <h3 style={{ margin: '0 0 16px 0', color: '#10b981', fontSize: '20px', fontWeight: 'bold' }}>
                    🎯 Real-time Quest Tracking
                </h3>
                <div className={styles.trackingToggle}>
                    <button
                        onClick={onQuestTrackingToggle}
                        className={`${styles.toggleButton} ${isQuestTrackingActive ? styles.active : styles.inactive}`}
                    >
                        {isQuestTrackingActive ? '⏸️ Pause' : '▶️ Start'}
                    </button>
                    <div className={styles.trackingStatus}>
                        {isQuestTrackingActive 
                            ? 'Monitoring vault for completed #gamified-boss tasks...' 
                            : 'Complete tasks with #gamified-boss tags to deal damage'
                        }
                    </div>
                </div>
                <div style={{ 
                    background: 'rgba(255, 255, 255, 0.05)', 
                    borderRadius: '8px', 
                    padding: '12px',
                    fontSize: '14px',
                    color: '#cbd5e1'
                }}>
                    💡 <strong>Tip:</strong> Tag your tasks with <code>#gamified-task #gamified-boss</code> to deal automatic damage when completed!
                </div>
            </div>
        );
    };

    return (
        <div className={styles.battleContainer}>
            {/* Boss Section */}
            <div className={styles.bossSection}>
                <div className={styles.bossHeader}>
                    <div className={styles.bossAvatar}>
                        {renderBossAvatar()}
                    </div>
                    <div className={styles.bossInfo}>
                        <h2>{boss.name}</h2>
                        <p>{boss.description}</p>
                        <p style={{ color: '#8b5cf6', fontWeight: 'bold' }}>
                            {boss.difficulty.toUpperCase()} • {boss.type.replace('-', ' ').toUpperCase()}
                        </p>
                    </div>
                </div>

                {/* HP Bar */}
                <div className={styles.hpBarContainer}>
                    <div className={styles.hpBarLabel}>
                        <h3>Boss Health</h3>
                        <span className={styles.hpNumbers}>
                            {Math.floor(animatedHP)} / {boss.stats.maxHP} HP
                        </span>
                    </div>
                    <div className={styles.hpBar}>
                        <div 
                            className={styles.hpFill}
                            style={{ 
                                width: `${getHPPercentage()}%`,
                                background: getHPColor()
                            }}
                        />
                        {damageAnimation && (
                            <div 
                                className={styles.damageAnimation}
                                style={{
                                    left: `${50 + damageAnimation.x}%`,
                                    top: `${50 + damageAnimation.y}%`
                                }}
                            >
                                -{damageAnimation.damage}
                            </div>
                        )}
                    </div>
                </div>

                {/* Phase Indicator */}
                {boss.phases && boss.phases.length > 1 && (
                    <div className={styles.phaseIndicator}>
                        <span style={{ color: '#cbd5e1', marginRight: '8px' }}>Phase:</span>
                        {boss.phases.map((_, index) => (
                            <div 
                                key={index}
                                className={`${styles.phaseIcon} ${
                                    index === boss.currentPhase ? styles.active :
                                    index < boss.currentPhase ? styles.completed : ''
                                }`}
                            />
                        ))}
                        <span style={{ color: '#ffd700', marginLeft: '8px' }}>
                            {boss.phases[boss.currentPhase]?.name || `Phase ${boss.currentPhase + 1}`}
                        </span>
                    </div>
                )}
            </div>

            {/* Player Stats */}
            {renderPlayerStats()}

            {/* Available Moves */}
            {renderMoves()}

            {/* Quest Tracking */}
            {renderQuestTracking()}

            {/* Battle Log */}
            {renderBattleLog()}

            {/* Action Buttons */}
            <div className={styles.actionButtons}>
                <button 
                    className={`${styles.actionButton} ${styles.secondary}`}
                    onClick={() => onBattleAction('retreat')}
                >
                    🏃 Retreat
                </button>
                <button 
                    className={`${styles.actionButton} ${styles.primary}`}
                    onClick={() => onBattleAction('focus')}
                >
                    🧘 Focus (+10% damage next move)
                </button>
            </div>
        </div>
    );
};
