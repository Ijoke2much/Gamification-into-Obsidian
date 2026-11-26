import React from 'react';
import { EnhancedMove, EnhancedBattleState, ActiveEffect } from '../../../../features/quests/types/EnhancedMoveTypes';
import { PlayerStats } from '../../../../features/quests/types/BossTypes';
import styles from '../BossBattleStyles.module.css';

interface EnhancedMoveCardProps {
    move: EnhancedMove;
    battleState: EnhancedBattleState;
    playerStats: PlayerStats;
    isAvailable: boolean;
    turnsUntilAvailable: number;
    onUse: (move: EnhancedMove) => void;
    damage?: number;
}

export const EnhancedMoveCard: React.FC<EnhancedMoveCardProps> = ({
    move,
    battleState,
    playerStats,
    isAvailable,
    turnsUntilAvailable,
    onUse,
    damage
}) => {
    const getMoveTypeIcon = (category: string): string => {
        switch (category) {
            case 'attack': return '⚔️';
            case 'buff': return '🛡️';
            case 'debuff': return '💀';
            case 'utility': return '🔧';
            case 'combo': return '🔥';
            case 'ultimate': return '💥';
            default: return '⭐';
        }
    };

    const getMoveTypeColor = (category: string): string => {
        switch (category) {
            case 'attack': return '#ef4444';
            case 'buff': return '#10b981';
            case 'debuff': return '#8b5cf6';
            case 'utility': return '#3b82f6';
            case 'combo': return '#f97316';
            case 'ultimate': return '#ffd700';
            default: return '#64748b';
        }
    };

    const canUseMove = (): boolean => {
        const primaryStat = playerStats[move.statRequirements.primaryStat as keyof PlayerStats] || 0;
        const meetsRequirement = primaryStat >= move.statRequirements.primaryMinLevel;
        
        if (move.statRequirements.secondaryStat && move.statRequirements.secondaryMinLevel) {
            const secondaryStat = playerStats[move.statRequirements.secondaryStat as keyof PlayerStats] || 0;
            return meetsRequirement && secondaryStat >= move.statRequirements.secondaryMinLevel && isAvailable;
        }
        
        return meetsRequirement && isAvailable;
    };

    const getComboStatus = (): { canCombo: boolean; missingMoves: string[] } => {
        if (!move.comboRequirements || move.comboRequirements.length === 0) {
            return { canCombo: false, missingMoves: [] };
        }

        for (const comboReq of move.comboRequirements) {
            const recentMoves = battleState.moveHistory
                .filter(entry => entry.turn > battleState.currentTurn - comboReq.maxTurnGap)
                .map(entry => entry.moveName);
            
            const missingMoves = comboReq.previousMoves.filter(required => 
                !recentMoves.includes(required)
            );

            if (missingMoves.length === 0) {
                return { canCombo: true, missingMoves: [] };
            } else {
                return { canCombo: false, missingMoves };
            }
        }

        return { canCombo: false, missingMoves: [] };
    };

    const renderEffects = () => {
        if (!move.effects || move.effects.length === 0) return null;

        return (
            <div className={styles.moveEffectsList}>
                {move.effects.map((effect, index) => (
                    <div key={index} className={styles.effectTag}>
                        <span className={styles.effectIcon}>
                            {effect.type === 'damage' ? '💥' :
                             effect.type === 'heal' ? '💚' :
                             effect.type === 'stat_boost' ? '📈' :
                             effect.type === 'stat_reduction' ? '📉' :
                             effect.type === 'shield' ? '🛡️' :
                             effect.type === 'poison' ? '☠️' :
                             effect.type === 'regeneration' ? '🌱' :
                             effect.type === 'stun' ? '😵' :
                             effect.type === 'counter' ? '↩️' :
                             effect.type === 'critical_boost' ? '🎯' :
                             effect.type === 'accuracy_boost' ? '🏹' :
                             effect.type === 'vulnerability' ? '💔' : '✨'}
                        </span>
                        <span className={styles.effectText}>
                            {effect.magnitude}{effect.type === 'damage' ? ' DMG' : ''}
                            {effect.duration > 1 ? ` (${effect.duration}T)` : ''}
                            {effect.chance < 100 ? ` ${effect.chance}%` : ''}
                        </span>
                    </div>
                ))}
            </div>
        );
    };

    const renderStatScaling = () => {
        const primaryStat = playerStats[move.statRequirements.primaryStat as keyof PlayerStats] || 0;
        const statBonus = Math.floor((primaryStat - move.statRequirements.primaryMinLevel) * move.statScaling.scalingFactor);
        const totalPower = (damage || move.power) + Math.min(statBonus, move.statScaling.maxBonus);
        
        return (
            <div className={styles.statScalingContainer}>
                <div className={styles.statScalingHeader}>
                    <span className={styles.statScalingLabel}>Stat Scaling:</span>
                    <span className={styles.statScalingValue}>
                        {move.statRequirements.primaryStat} {primaryStat} → +{Math.min(statBonus, move.statScaling.maxBonus)} DMG
                    </span>
                </div>
                <div className={styles.powerBreakdown}>
                    <span className={styles.basePower}>Base: {damage || move.power}</span>
                    <span className={styles.bonusPower}>+{Math.min(statBonus, move.statScaling.maxBonus)}</span>
                    <span className={styles.totalPower}>= {totalPower} DMG</span>
                </div>
            </div>
        );
    };

    const renderCooldown = () => {
        if (isAvailable) return null;

        return (
            <div className={styles.cooldownOverlay}>
                <div className={styles.cooldownTimer}>
                    <div className={styles.cooldownIcon}>⏳</div>
                    <div className={styles.cooldownText}>
                        {turnsUntilAvailable} turn{turnsUntilAvailable !== 1 ? 's' : ''}
                    </div>
                </div>
            </div>
        );
    };

    const renderComboIndicator = () => {
        const comboStatus = getComboStatus();
        
        if (!move.comboRequirements || move.comboRequirements.length === 0) return null;

        return (
            <div className={`${styles.comboIndicator} ${comboStatus.canCombo ? styles.comboReady : styles.comboNotReady}`}>
                <span className={styles.comboIcon}>
                    {comboStatus.canCombo ? '🔥' : '🔗'}
                </span>
                <span className={styles.comboText}>
                    {comboStatus.canCombo ? 'COMBO READY!' : `Need: ${comboStatus.missingMoves.join(', ')}`}
                </span>
            </div>
        );
    };

    const renderUnlockStatus = () => {
        if (move.isUnlocked !== false) return null;

        return (
            <div className={styles.lockedOverlay}>
                <div className={styles.lockIcon}>🔒</div>
                <div className={styles.unlockRequirements}>
                    {move.unlockConditions.map((condition, index) => (
                        <div key={index} className={styles.unlockCondition}>
                            {condition.type === 'skill_level' && 
                                `${condition.skillName} Level ${condition.requirement}`}
                            {condition.type === 'battles_won' && 
                                `Win ${condition.requirement} battles`}
                            {condition.type === 'total_cp' && 
                                `${condition.requirement} Total CP`}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const cardClasses = [
        styles.moveCard,
        canUseMove() ? styles.available : styles.unavailable,
        move.category === 'ultimate' ? styles.ultimateMove : '',
        !isAvailable ? styles.onCooldown : ''
    ].filter(Boolean).join(' ');

    return (
        <div 
            className={cardClasses}
            onClick={() => canUseMove() && onUse(move)}
            style={{
                borderColor: getMoveTypeColor(move.category),
                position: 'relative'
            }}
        >
            {/* Move Header */}
            <div className={styles.moveHeader}>
                <div className={styles.moveTitle}>
                    <span className={styles.moveIcon}>
                        {getMoveTypeIcon(move.category)}
                    </span>
                    <h4 className={styles.moveName}>{move.name}</h4>
                </div>
                
                <div className={styles.movePowerContainer}>
                    <div className={styles.movePower}>
                        {damage || move.power} DMG
                    </div>
                    {move.category !== 'attack' && (
                        <div 
                            className={styles.moveType}
                            style={{ color: getMoveTypeColor(move.category) }}
                        >
                            {move.category.toUpperCase()}
                        </div>
                    )}
                </div>
            </div>

            {/* Move Description */}
            <p className={styles.moveDescription}>{move.description}</p>

            {/* Stat Scaling Display */}
            {renderStatScaling()}

            {/* Effects */}
            {renderEffects()}

            {/* Combo Indicator */}
            {renderComboIndicator()}

            {/* Requirements Section */}
            <div className={styles.moveRequirements}>
                <div className={styles.requirementsHeader}>
                    <span className={styles.requirementsTitle}>Requirements:</span>
                </div>
                <div className={styles.requirementsList}>
                    <div className={styles.requirementItem}>
                        <span className={styles.requirementLabel}>Primary:</span>
                        <span className={`${styles.requirement} ${
                            (playerStats[move.statRequirements.primaryStat as keyof PlayerStats] || 0) >= move.statRequirements.primaryMinLevel 
                                ? styles.met : styles.unmet
                        }`}>
                            {move.statRequirements.primaryStat} {move.statRequirements.primaryMinLevel}+
                        </span>
                    </div>
                    {move.statRequirements.secondaryStat && (
                        <div className={styles.requirementItem}>
                            <span className={styles.requirementLabel}>Secondary:</span>
                            <span className={`${styles.requirement} ${
                                (playerStats[move.statRequirements.secondaryStat as keyof PlayerStats] || 0) >= (move.statRequirements.secondaryMinLevel || 0)
                                    ? styles.met : styles.unmet
                            }`}>
                                {move.statRequirements.secondaryStat} {move.statRequirements.secondaryMinLevel}+
                            </span>
                        </div>
                    )}
                    <div className={styles.requirementItem}>
                        <span className={styles.requirementLabel}>Accuracy:</span>
                        <span className={`${styles.requirement} ${styles.met}`}>
                            {move.accuracy}%
                        </span>
                    </div>
                </div>

                {/* Cooldown Info */}
                {move.cooldown > 0 && (
                    <div className={styles.cooldownInfo}>
                        <span className={styles.cooldownLabel}>
                            ⏱️ {move.cooldown} turn{move.cooldown !== 1 ? 's' : ''} cooldown
                        </span>
                    </div>
                )}
            </div>

            {/* CP Gain */}
            {move.skillEffects?.cpGain && (
                <div className={styles.cpGainInfo}>
                    <span className={styles.cpIcon}>⭐</span>
                    <span className={styles.cpText}>+{move.skillEffects.cpGain} CP</span>
                </div>
            )}

            {/* Overlays */}
            {renderCooldown()}
            {renderUnlockStatus()}
        </div>
    );
};
