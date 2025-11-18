import React from 'react';
import { Boss } from '../../../../features/quests/types/BossTypes';
import { BossAction } from '../../../../features/quests/types/EnhancedMoveTypes';
import styles from '../BossBattleStyles.module.css';

interface BossPersonalityDisplayProps {
    boss: Boss;
    lastAction?: BossAction;
    healthPercent: number;
}

export const BossPersonalityDisplay: React.FC<BossPersonalityDisplayProps> = ({
    boss,
    lastAction,
    healthPercent
}) => {
    if (!boss.ai?.personality || !boss.personalityInfo) {
        return null;
    }

    const getPersonalityIcon = (personality: string): string => {
        switch (personality) {
            case 'aggressive': return '⚔️';
            case 'defensive': return '🛡️';
            case 'tactical': return '🧠';
            case 'chaotic': return '🌪️';
            case 'counter': return '↩️';
            case 'endurance': return '⏳';
            default: return '👹';
        }
    };

    const getPersonalityColor = (personality: string): string => {
        switch (personality) {
            case 'aggressive': return '#ef4444';
            case 'defensive': return '#10b981';
            case 'tactical': return '#3b82f6';
            case 'chaotic': return '#8b5cf6';
            case 'counter': return '#f97316';
            case 'endurance': return '#64748b';
            default: return '#ffd700';
        }
    };

    const getMoodIndicator = (personality: string, healthPercent: number): string => {
        if (healthPercent < 25) {
            switch (personality) {
                case 'aggressive': return '🔥 ENRAGED';
                case 'defensive': return '🏰 FORTRESS MODE';
                case 'tactical': return '⚡ CRITICAL ANALYSIS';
                case 'chaotic': return '💀 REALITY CHAOS';
                case 'counter': return '⚖️ PERFECT BALANCE';
                case 'endurance': return '💪 SECOND WIND';
                default: return '😡 DESPERATE';
            }
        } else if (healthPercent < 60) {
            switch (personality) {
                case 'aggressive': return '😤 ANGRY';
                case 'defensive': return '🛡️ GUARDED';
                case 'tactical': return '🤔 ADAPTING';
                case 'chaotic': return '🎭 UNPREDICTABLE';
                case 'counter': return '⚡ REACTIVE';
                case 'endurance': return '😌 PATIENT';
                default: return '😐 FOCUSED';
            }
        } else {
            switch (personality) {
                case 'aggressive': return '😈 CONFIDENT';
                case 'defensive': return '😊 CALM';
                case 'tactical': return '🧐 OBSERVING';
                case 'chaotic': return '😜 PLAYFUL';
                case 'counter': return '🎯 READY';
                case 'endurance': return '😎 STEADY';
                default: return '🙂 CONFIDENT';
            }
        }
    };

    const renderPersonalityTraits = () => {
        if (!boss.personalityInfo?.traits) return null;
        
        return (
            <div className={styles.personalityTraits}>
                {boss.personalityInfo.traits.map((trait, index) => (
                    <span 
                        key={index} 
                        className={styles.traitTag}
                        style={{ borderColor: getPersonalityColor(boss.ai!.personality) }}
                    >
                        {trait.replace('_', ' ').toUpperCase()}
                    </span>
                ))}
            </div>
        );
    };

    const renderLastAction = () => {
        if (!lastAction) return null;

        return (
            <div className={styles.lastActionDisplay}>
                <div className={styles.actionLabel}>Last Action:</div>
                <div className={styles.actionText}>
                    <strong>{lastAction.moveName}</strong>
                    {lastAction.dialogue && (
                        <div className={styles.bossDialogue}>
                            💬 "{lastAction.dialogue}"
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div 
            className={styles.personalityDisplay}
            style={{ borderColor: getPersonalityColor(boss.ai.personality) }}
        >
            {/* Personality Header */}
            <div className={styles.personalityHeader}>
                <div className={styles.personalityIcon}>
                    {getPersonalityIcon(boss.ai.personality)}
                </div>
                <div className={styles.personalityInfo}>
                    <h4 
                        className={styles.personalityName}
                        style={{ color: getPersonalityColor(boss.ai.personality) }}
                    >
                        {boss.personalityInfo.name}
                    </h4>
                    <p className={styles.personalityDescription}>
                        {boss.personalityInfo.description}
                    </p>
                </div>
                <div className={styles.moodIndicator}>
                    {getMoodIndicator(boss.ai.personality, healthPercent)}
                </div>
            </div>

            {/* Personality Traits */}
            {renderPersonalityTraits()}

            {/* AI Adaptation Level */}
            <div className={styles.adaptationDisplay}>
                <div className={styles.adaptationLabel}>AI Learning:</div>
                <div className={styles.adaptationBar}>
                    <div 
                        className={styles.adaptationFill}
                        style={{ 
                            width: `${boss.ai.adaptationLevel * 100}%`,
                            backgroundColor: getPersonalityColor(boss.ai.personality)
                        }}
                    />
                </div>
                <div className={styles.adaptationText}>
                    {Math.round(boss.ai.adaptationLevel * 100)}% Adaptive
                </div>
            </div>

            {/* Last Action */}
            {renderLastAction()}

            {/* Personality Hints */}
            <div className={styles.personalityHints}>
                <h5>Strategy Tips:</h5>
                <ul>
                    {boss.ai.personality === 'aggressive' && (
                        <>
                            <li>Avoid using buffs - will trigger rage responses</li>
                            <li>Use defensive moves when boss health is low</li>
                        </>
                    )}
                    {boss.ai.personality === 'defensive' && (
                        <>
                            <li>Focus on high-damage attacks to break shields</li>
                            <li>Expect long battles with gradual progress</li>
                        </>
                    )}
                    {boss.ai.personality === 'tactical' && (
                        <>
                            <li>Vary your strategy - boss learns patterns</li>
                            <li>Avoid repeating the same moves frequently</li>
                        </>
                    )}
                    {boss.ai.personality === 'chaotic' && (
                        <>
                            <li>Expect the unexpected - no reliable patterns</li>
                            <li>Prepare for random damage and effects</li>
                        </>
                    )}
                    {boss.ai.personality === 'counter' && (
                        <>
                            <li>Every move will be countered - plan accordingly</li>
                            <li>Mix up move types to confuse responses</li>
                        </>
                    )}
                    {boss.ai.personality === 'endurance' && (
                        <>
                            <li>Boss gets stronger over time - end quickly</li>
                            <li>Focus on burst damage early in battle</li>
                        </>
                    )}
                </ul>
            </div>
        </div>
    );
};
