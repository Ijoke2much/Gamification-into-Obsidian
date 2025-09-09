import React, { useState, useEffect } from 'react';
import { BattleSession, PersistentBattleSession } from '../../../../features/quests/services/persistentBattleSession';
import { Boss } from '../../../../features/quests/types/BossTypes';

interface BattleSessionTrackerProps {
    app: any; // Obsidian App instance
    boss: Boss;
    onSessionUpdate?: (session: BattleSession | null) => void;
    compact?: boolean;
}

export const BattleSessionTracker: React.FC<BattleSessionTrackerProps> = ({
    app,
    boss,
    onSessionUpdate,
    compact = false
}) => {
    const [session, setSession] = useState<BattleSession | null>(null);
    const [sessionManager] = useState(() => PersistentBattleSession.getInstance(app));
    const [currentTime, setCurrentTime] = useState(new Date());
    const [showBreakReminder, setShowBreakReminder] = useState(false);

    useEffect(() => {
        // Load existing session for this boss
        const existingSession = sessionManager.getActiveSession(boss.id);
        setSession(existingSession);
        if (onSessionUpdate) {
            onSessionUpdate(existingSession);
        }

        // Update time every second
        const timeInterval = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        // Check for break reminders
        const reminderInterval = setInterval(() => {
            if (session) {
                const { shouldRemind } = sessionManager.getBreakReminderStatus(session.sessionId);
                setShowBreakReminder(shouldRemind);
            }
        }, 1000);

        return () => {
            clearInterval(timeInterval);
            clearInterval(reminderInterval);
        };
    }, [boss.id, sessionManager, onSessionUpdate, session]);

    const startSession = () => {
        const newSession = sessionManager.startSession(boss.id, boss.questId, boss.stats.currentHP);
        setSession(newSession);
        if (onSessionUpdate) {
            onSessionUpdate(newSession);
        }
    };

    const pauseSession = () => {
        if (session) {
            sessionManager.pauseSession(session.sessionId);
            setSession({ ...session, isPaused: true });
        }
    };

    const resumeSession = () => {
        if (session) {
            const resumedSession = sessionManager.resumeSession(session.sessionId);
            if (resumedSession) {
                setSession(resumedSession);
                if (onSessionUpdate) {
                    onSessionUpdate(resumedSession);
                }
            }
        }
    };

    const endSession = (reason: 'victory' | 'defeat' | 'abandoned' | 'manual') => {
        if (session) {
            sessionManager.endSession(session.sessionId, reason);
            setSession(null);
            if (onSessionUpdate) {
                onSessionUpdate(null);
            }
        }
    };

    const acknowledgeBreakReminder = () => {
        if (session) {
            sessionManager.acknowledgeBreakReminder(session.sessionId);
            setShowBreakReminder(false);
        }
    };

    const formatDuration = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    };

    const getSessionStatus = (): 'active' | 'paused' | 'inactive' => {
        if (!session) return 'inactive';
        if (session.isPaused) return 'paused';
        return 'active';
    };

    const getStatusColor = (status: string): string => {
        switch (status) {
            case 'active': return '#10b981';
            case 'paused': return '#f59e0b';
            case 'inactive': return '#64748b';
            default: return '#64748b';
        }
    };

    const getStatusIcon = (status: string): string => {
        switch (status) {
            case 'active': return '⚔️';
            case 'paused': return '⏸️';
            case 'inactive': return '⏹️';
            default: return '❓';
        }
    };

    if (compact) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
                <span style={{ fontSize: '14px' }}>{getStatusIcon(getSessionStatus())}</span>
                {session ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: '#cbd5e1', fontSize: '12px' }}>
                            {formatDuration(session.totalTimeSpent)}
                        </span>
                        {session.isPaused ? (
                            <button
                                onClick={resumeSession}
                                style={{
                                    background: '#10b981',
                                    border: 'none',
                                    color: 'white',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '10px'
                                }}
                            >
                                ▶️
                            </button>
                        ) : (
                            <button
                                onClick={pauseSession}
                                style={{
                                    background: '#f59e0b',
                                    border: 'none',
                                    color: 'white',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '10px'
                                }}
                            >
                                ⏸️
                            </button>
                        )}
                    </div>
                ) : (
                    <button
                        onClick={startSession}
                        style={{
                            background: '#3b82f6',
                            border: 'none',
                            color: 'white',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '10px'
                        }}
                    >
                        Start
                    </button>
                )}
            </div>
        );
    }

    return (
        <div style={{
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            marginBottom: '16px'
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px'
            }}>
                <h3 style={{
                    margin: 0,
                    color: '#ffd700',
                    fontSize: '16px',
                    fontWeight: 'bold'
                }}>
                    Battle Session
                </h3>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                }}>
                    <span style={{ fontSize: '16px' }}>{getStatusIcon(getSessionStatus())}</span>
                    <span style={{
                        color: getStatusColor(getSessionStatus()),
                        fontSize: '12px',
                        fontWeight: 'bold',
                        textTransform: 'uppercase'
                    }}>
                        {getSessionStatus()}
                    </span>
                </div>
            </div>

            {session ? (
                <div>
                    {/* Session Stats */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                        gap: '8px',
                        marginBottom: '12px'
                    }}>
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            borderRadius: '6px',
                            padding: '8px',
                            textAlign: 'center'
                        }}>
                            <div style={{ color: '#cbd5e1', fontSize: '10px', marginBottom: '2px' }}>Time</div>
                            <div style={{ color: '#ffd700', fontSize: '14px', fontWeight: 'bold' }}>
                                {formatDuration(session.totalTimeSpent)}
                            </div>
                        </div>
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            borderRadius: '6px',
                            padding: '8px',
                            textAlign: 'center'
                        }}>
                            <div style={{ color: '#cbd5e1', fontSize: '10px', marginBottom: '2px' }}>Damage</div>
                            <div style={{ color: '#ef4444', fontSize: '14px', fontWeight: 'bold' }}>
                                {session.sessionData.damageDealt}
                            </div>
                        </div>
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            borderRadius: '6px',
                            padding: '8px',
                            textAlign: 'center'
                        }}>
                            <div style={{ color: '#cbd5e1', fontSize: '10px', marginBottom: '2px' }}>Moves</div>
                            <div style={{ color: '#8b5cf6', fontSize: '14px', fontWeight: 'bold' }}>
                                {session.sessionData.movesUsed}
                            </div>
                        </div>
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            borderRadius: '6px',
                            padding: '8px',
                            textAlign: 'center'
                        }}>
                            <div style={{ color: '#cbd5e1', fontSize: '10px', marginBottom: '2px' }}>Quests</div>
                            <div style={{ color: '#10b981', fontSize: '14px', fontWeight: 'bold' }}>
                                {session.sessionData.questsCompleted}
                            </div>
                        </div>
                    </div>

                    {/* Session Controls */}
                    <div style={{
                        display: 'flex',
                        gap: '8px',
                        marginBottom: '12px'
                    }}>
                        {session.isPaused ? (
                            <button
                                onClick={resumeSession}
                                style={{
                                    background: '#10b981',
                                    border: 'none',
                                    color: 'white',
                                    padding: '8px 16px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: 'bold'
                                }}
                            >
                                ▶️ Resume
                            </button>
                        ) : (
                            <button
                                onClick={pauseSession}
                                style={{
                                    background: '#f59e0b',
                                    border: 'none',
                                    color: 'white',
                                    padding: '8px 16px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: 'bold'
                                }}
                            >
                                ⏸️ Pause
                            </button>
                        )}
                        <button
                            onClick={() => endSession('manual')}
                            style={{
                                background: '#ef4444',
                                border: 'none',
                                color: 'white',
                                padding: '8px 16px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: 'bold'
                            }}
                        >
                            ⏹️ End
                        </button>
                    </div>

                    {/* Break Reminder */}
                    {showBreakReminder && (
                        <div style={{
                            background: 'rgba(245, 158, 11, 0.2)',
                            border: '1px solid rgba(245, 158, 11, 0.4)',
                            borderRadius: '8px',
                            padding: '12px',
                            marginBottom: '12px'
                        }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div>
                                    <div style={{
                                        color: '#f59e0b',
                                        fontSize: '14px',
                                        fontWeight: 'bold',
                                        marginBottom: '4px'
                                    }}>
                                        🕐 Break Time!
                                    </div>
                                    <div style={{
                                        color: '#cbd5e1',
                                        fontSize: '12px'
                                    }}>
                                        You've been battling for a while. Consider taking a short break!
                                    </div>
                                </div>
                                <button
                                    onClick={acknowledgeBreakReminder}
                                    style={{
                                        background: '#f59e0b',
                                        border: 'none',
                                        color: 'white',
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '10px'
                                    }}
                                >
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Time-based Rewards Preview */}
                    <div style={{
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        borderRadius: '8px',
                        padding: '8px 12px'
                    }}>
                        <div style={{
                            color: '#10b981',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            marginBottom: '4px'
                        }}>
                            Session Rewards Preview
                        </div>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '11px',
                            color: '#cbd5e1'
                        }}>
                            <span>XP: +{sessionManager.getTimeBasedRewards(session.sessionId).xp}</span>
                            <span>CP: +{sessionManager.getTimeBasedRewards(session.sessionId).cp}</span>
                            <span>Coins: +{sessionManager.getTimeBasedRewards(session.sessionId).coins}</span>
                        </div>
                    </div>
                </div>
            ) : (
                <div style={{
                    textAlign: 'center',
                    padding: '20px'
                }}>
                    <div style={{
                        color: '#64748b',
                        fontSize: '14px',
                        marginBottom: '12px'
                    }}>
                        No active session
                    </div>
                    <button
                        onClick={startSession}
                        style={{
                            background: '#3b82f6',
                            border: 'none',
                            color: 'white',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 'bold'
                        }}
                    >
                        🚀 Start Battle Session
                    </button>
                </div>
            )}
        </div>
    );
};
