import React, { useState, useEffect, useRef } from 'react';
import styles from '../BossBattleStyles.module.css';

export interface BattleLogEntry {
    id: string;
    timestamp: Date;
    type: 'damage' | 'heal' | 'buff' | 'debuff' | 'phase_transition' | 'victory' | 'defeat' | 'info' | 'critical' | 'combo';
    message: string;
    value?: number;
    actor: 'player' | 'boss' | 'system';
    turn?: number;
}

interface EnhancedBattleLogProps {
    entries: BattleLogEntry[];
    maxEntries?: number;
    autoScroll?: boolean;
}

export const EnhancedBattleLog: React.FC<EnhancedBattleLogProps> = ({
    entries,
    maxEntries = 10,
    autoScroll = true
}) => {
    const [displayedEntries, setDisplayedEntries] = useState<BattleLogEntry[]>([]);
    const logRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const recentEntries = entries.slice(-maxEntries);
        setDisplayedEntries(recentEntries);
    }, [entries, maxEntries]);

    useEffect(() => {
        if (autoScroll && logRef.current) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [displayedEntries, autoScroll]);

    const getEntryIcon = (type: BattleLogEntry['type']): string => {
        switch (type) {
            case 'damage': return '⚔️';
            case 'heal': return '💚';
            case 'buff': return '📈';
            case 'debuff': return '📉';
            case 'phase_transition': return '🌟';
            case 'victory': return '🏆';
            case 'defeat': return '💀';
            case 'critical': return '⚡';
            case 'combo': return '🔥';
            case 'info': return 'ℹ️';
            default: return '✨';
        }
    };

    const getEntryColor = (type: BattleLogEntry['type']): string => {
        switch (type) {
            case 'damage': return '#ef4444';
            case 'heal': return '#10b981';
            case 'buff': return '#3b82f6';
            case 'debuff': return '#8b5cf6';
            case 'phase_transition': return '#f59e0b';
            case 'victory': return '#ffd700';
            case 'defeat': return '#ef4444';
            case 'critical': return '#fbbf24';
            case 'combo': return '#f97316';
            case 'info': return '#64748b';
            default: return '#cbd5e1';
        }
    };

    const formatTimestamp = (timestamp: Date): string => {
        return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    const getActorPrefix = (actor: BattleLogEntry['actor']): string => {
        switch (actor) {
            case 'player': return '👤';
            case 'boss': return '👹';
            case 'system': return '⚙️';
            default: return '❓';
        }
    };

    return (
        <div className={styles.enhancedBattleLog}>
            <div className={styles.battleLogHeader}>
                <h3>Battle Log</h3>
                <div className={styles.battleLogStats}>
                    <span className={styles.logEntryCount}>
                        {displayedEntries.length} entries
                    </span>
                </div>
            </div>
            
            <div 
                ref={logRef}
                className={styles.battleLogContent}
            >
                {displayedEntries.length === 0 ? (
                    <div className={styles.emptyLog}>
                        <span className={styles.emptyLogIcon}>📜</span>
                        <span className={styles.emptyLogText}>Battle log is empty</span>
                    </div>
                ) : (
                    displayedEntries.map((entry) => (
                        <div
                            key={entry.id}
                            className={`${styles.enhancedLogEntry} ${styles[`logEntry${entry.type.charAt(0).toUpperCase() + entry.type.slice(1)}`]}`}
                            style={{
                                borderLeftColor: getEntryColor(entry.type)
                            }}
                        >
                            <div className={styles.logEntryHeader}>
                                <div className={styles.logEntryMeta}>
                                    <span className={styles.logEntryIcon}>
                                        {getEntryIcon(entry.type)}
                                    </span>
                                    <span className={styles.logEntryActor}>
                                        {getActorPrefix(entry.actor)}
                                    </span>
                                    {entry.turn && (
                                        <span className={styles.logEntryTurn}>
                                            Turn {entry.turn}
                                        </span>
                                    )}
                                </div>
                                <div className={styles.logEntryTimestamp}>
                                    {formatTimestamp(entry.timestamp)}
                                </div>
                            </div>
                            
                            <div className={styles.logEntryMessage}>
                                {entry.message}
                                {entry.value && (
                                    <span className={styles.logEntryValue}>
                                        {entry.type === 'damage' || entry.type === 'critical' ? '-' : '+'}{entry.value}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

// Hook for managing battle log entries
export const useBattleLog = () => {
    const [entries, setEntries] = useState<BattleLogEntry[]>([]);

    const addEntry = (entry: Omit<BattleLogEntry, 'id' | 'timestamp'>) => {
        const newEntry: BattleLogEntry = {
            ...entry,
            id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date()
        };
        setEntries(prev => [...prev, newEntry]);
    };

    const addDamageEntry = (damage: number, actor: 'player' | 'boss', isCritical: boolean = false, turn?: number) => {
        addEntry({
            type: isCritical ? 'critical' : 'damage',
            message: isCritical ? 'Critical hit!' : 'Attack hits!',
            value: damage,
            actor,
            turn
        });
    };

    const addHealEntry = (heal: number, actor: 'player' | 'boss', turn?: number) => {
        addEntry({
            type: 'heal',
            message: 'Healing effect!',
            value: heal,
            actor,
            turn
        });
    };

    const addPhaseTransitionEntry = (phaseName: string, turn?: number) => {
        addEntry({
            type: 'phase_transition',
            message: `${phaseName} phase begins!`,
            actor: 'system',
            turn
        });
    };

    const addComboEntry = (comboCount: number, turn?: number) => {
        addEntry({
            type: 'combo',
            message: `Combo chain x${comboCount}!`,
            value: comboCount,
            actor: 'player',
            turn
        });
    };

    const addVictoryEntry = (turn?: number) => {
        addEntry({
            type: 'victory',
            message: 'Boss defeated! Victory!',
            actor: 'system',
            turn
        });
    };

    const addDefeatEntry = (turn?: number) => {
        addEntry({
            type: 'defeat',
            message: 'Battle lost...',
            actor: 'system',
            turn
        });
    };

    const addInfoEntry = (message: string, turn?: number) => {
        addEntry({
            type: 'info',
            message,
            actor: 'system',
            turn
        });
    };

    const clearLog = () => {
        setEntries([]);
    };

    return {
        entries,
        addEntry,
        addDamageEntry,
        addHealEntry,
        addPhaseTransitionEntry,
        addComboEntry,
        addVictoryEntry,
        addDefeatEntry,
        addInfoEntry,
        clearLog
    };
};
