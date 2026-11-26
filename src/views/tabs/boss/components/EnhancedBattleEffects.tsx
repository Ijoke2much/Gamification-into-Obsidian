import React, { useState, useEffect } from 'react';
import styles from '../BossBattleStyles.module.css';

export interface BattleEffect {
    id: string;
    type: 'damage' | 'heal' | 'critical' | 'combo' | 'phase_transition' | 'buff' | 'debuff';
    value: number;
    x: number;
    y: number;
    duration: number;
    message?: string;
    color?: string;
}

interface EnhancedBattleEffectsProps {
    effects: BattleEffect[];
    onEffectComplete: (effectId: string) => void;
}

export const EnhancedBattleEffects: React.FC<EnhancedBattleEffectsProps> = ({
    effects,
    onEffectComplete
}) => {
    const [activeEffects, setActiveEffects] = useState<BattleEffect[]>([]);

    useEffect(() => {
        if (effects.length > 0) {
            setActiveEffects(prev => [...prev, ...effects]);
        }
    }, [effects]);

    const removeEffect = (effectId: string) => {
        setActiveEffects(prev => prev.filter(effect => effect.id !== effectId));
        onEffectComplete(effectId);
    };

    const getEffectIcon = (type: BattleEffect['type']): string => {
        switch (type) {
            case 'damage': return '💥';
            case 'heal': return '💚';
            case 'critical': return '⚡';
            case 'combo': return '🔥';
            case 'phase_transition': return '🌟';
            case 'buff': return '📈';
            case 'debuff': return '📉';
            default: return '✨';
        }
    };

    const getEffectColor = (type: BattleEffect['type']): string => {
        switch (type) {
            case 'damage': return '#ef4444';
            case 'heal': return '#10b981';
            case 'critical': return '#ffd700';
            case 'combo': return '#f97316';
            case 'phase_transition': return '#8b5cf6';
            case 'buff': return '#3b82f6';
            case 'debuff': return '#ef4444';
            default: return '#64748b';
        }
    };

    const getEffectAnimation = (type: BattleEffect['type']): string => {
        switch (type) {
            case 'damage': return styles.damageFloat;
            case 'heal': return styles.healFloat;
            case 'critical': return styles.criticalFloat;
            case 'combo': return styles.comboFloat;
            case 'phase_transition': return styles.phaseTransitionFloat;
            case 'buff': return styles.buffFloat;
            case 'debuff': return styles.debuffFloat;
            default: return styles.defaultFloat;
        }
    };

    return (
        <div className={styles.battleEffectsContainer}>
            {activeEffects.map((effect) => (
                <div
                    key={effect.id}
                    className={`${styles.battleEffect} ${getEffectAnimation(effect.type)}`}
                    style={{
                        left: `${50 + effect.x}%`,
                        top: `${50 + effect.y}%`,
                        color: effect.color || getEffectColor(effect.type),
                        animationDuration: `${effect.duration}ms`
                    }}
                    onAnimationEnd={() => removeEffect(effect.id)}
                >
                    <div className={styles.effectIcon}>
                        {getEffectIcon(effect.type)}
                    </div>
                    <div className={styles.effectValue}>
                        {effect.type === 'damage' || effect.type === 'critical' ? '-' : '+'}{effect.value}
                    </div>
                    {effect.message && (
                        <div className={styles.effectMessage}>
                            {effect.message}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

// Hook for creating battle effects
export const useBattleEffects = () => {
    const [effects, setEffects] = useState<BattleEffect[]>([]);

    const addEffect = (effect: Omit<BattleEffect, 'id'>) => {
        const newEffect: BattleEffect = {
            ...effect,
            id: `effect-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        };
        setEffects(prev => [...prev, newEffect]);
    };

    const createDamageEffect = (damage: number, x: number = 0, y: number = 0, isCritical: boolean = false) => {
        addEffect({
            type: isCritical ? 'critical' : 'damage',
            value: damage,
            x: x + (Math.random() * 100 - 50),
            y: y + (Math.random() * 50 - 25),
            duration: isCritical ? 3000 : 2000,
            message: isCritical ? 'CRITICAL HIT!' : undefined
        });
    };

    const createHealEffect = (heal: number, x: number = 0, y: number = 0) => {
        addEffect({
            type: 'heal',
            value: heal,
            x: x + (Math.random() * 100 - 50),
            y: y + (Math.random() * 50 - 25),
            duration: 2000
        });
    };

    const createComboEffect = (comboCount: number, x: number = 0, y: number = 0) => {
        addEffect({
            type: 'combo',
            value: comboCount,
            x: x + (Math.random() * 100 - 50),
            y: y + (Math.random() * 50 - 25),
            duration: 2500,
            message: `COMBO x${comboCount}!`
        });
    };

    const createPhaseTransitionEffect = (phaseName: string, x: number = 0, y: number = 0) => {
        addEffect({
            type: 'phase_transition',
            value: 0,
            x: x + (Math.random() * 100 - 50),
            y: y + (Math.random() * 50 - 25),
            duration: 4000,
            message: `${phaseName} Phase!`
        });
    };

    const createBuffEffect = (buffName: string, x: number = 0, y: number = 0) => {
        addEffect({
            type: 'buff',
            value: 0,
            x: x + (Math.random() * 100 - 50),
            y: y + (Math.random() * 50 - 25),
            duration: 2000,
            message: buffName
        });
    };

    const createDebuffEffect = (debuffName: string, x: number = 0, y: number = 0) => {
        addEffect({
            type: 'debuff',
            value: 0,
            x: x + (Math.random() * 100 - 50),
            y: y + (Math.random() * 50 - 25),
            duration: 2000,
            message: debuffName
        });
    };

    const clearEffects = () => {
        setEffects([]);
    };

    return {
        effects,
        addEffect,
        createDamageEffect,
        createHealEffect,
        createComboEffect,
        createPhaseTransitionEffect,
        createBuffEffect,
        createDebuffEffect,
        clearEffects
    };
};
