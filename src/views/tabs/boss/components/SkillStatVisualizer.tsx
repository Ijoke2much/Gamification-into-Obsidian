import React, { useState, useEffect } from 'react';
import { PlayerStats, StatBasedMove } from '../../../../features/quests/types/BossTypes';
import { SkillTreeStats } from '../../../../features/quests/types/BossTypes';

interface SkillStatVisualizerProps {
    playerStats: PlayerStats;
    skillStats: SkillTreeStats;
    availableMoves: StatBasedMove[];
    selectedMove?: StatBasedMove | null;
    onMoveSelect?: (move: StatBasedMove) => void;
    compact?: boolean;
}

interface StatConnection {
    stat: string;
    level: number;
    requiredLevel: number;
    isMet: boolean;
    moves: StatBasedMove[];
    skillProgress?: {
        currentCP: number;
        requiredCP: number;
        level: number;
    };
}

export const SkillStatVisualizer: React.FC<SkillStatVisualizerProps> = ({
    playerStats,
    skillStats,
    availableMoves,
    selectedMove,
    onMoveSelect,
    compact = false
}) => {
    const [statConnections, setStatConnections] = useState<StatConnection[]>([]);
    const [hoveredStat, setHoveredStat] = useState<string | null>(null);

    useEffect(() => {
        generateStatConnections();
    }, [playerStats, skillStats, availableMoves]);

    const generateStatConnections = () => {
        const connections: StatConnection[] = [];
        const statNames = Object.keys(playerStats) as Array<keyof PlayerStats>;

        for (const statName of statNames) {
            const statLevel = playerStats[statName] || 0;
            const movesForStat = availableMoves.filter(move => 
                move.statRequirements.primaryStat.toLowerCase() === statName.toLowerCase()
            );

            // Find the highest requirement for this stat
            const maxRequiredLevel = Math.max(
                ...movesForStat.map(move => move.statRequirements.primaryMinLevel),
                1
            );

            // Get skill progress if available
            const skillProgress = skillStats[statName] ? {
                currentCP: skillStats[statName].currentCP,
                requiredCP: skillStats[statName].requiredCP,
                level: skillStats[statName].level
            } : undefined;

            connections.push({
                stat: statName,
                level: statLevel,
                requiredLevel: maxRequiredLevel,
                isMet: statLevel >= maxRequiredLevel,
                moves: movesForStat,
                skillProgress
            });
        }

        setStatConnections(connections);
    };

    const getStatColor = (connection: StatConnection): string => {
        if (connection.isMet) return '#10b981';
        if (connection.level > 0) return '#f59e0b';
        return '#64748b';
    };

    const getStatIcon = (stat: string): string => {
        switch (stat.toLowerCase()) {
            case 'strength': return '💪';
            case 'endurance': return '🛡️';
            case 'focus': return '🎯';
            case 'intelligence': return '🧠';
            case 'creativity': return '🎨';
            case 'motivation': return '🔥';
            case 'patience': return '⏳';
            case 'agility': return '⚡';
            case 'charisma': return '💬';
            default: return '⭐';
        }
    };

    const getProgressPercentage = (connection: StatConnection): number => {
        if (connection.requiredLevel === 0) return 100;
        return Math.min((connection.level / connection.requiredLevel) * 100, 100);
    };

    const getUnlockedMovesCount = (connection: StatConnection): number => {
        return connection.moves.filter(move => 
            connection.level >= move.statRequirements.primaryMinLevel
        ).length;
    };

    if (compact) {
        return (
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                padding: '12px',
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
                {statConnections.map(connection => (
                    <div
                        key={connection.stat}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 8px',
                            background: getStatColor(connection) + '20',
                            borderRadius: '4px',
                            border: `1px solid ${getStatColor(connection)}40`,
                            cursor: 'pointer',
                            transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={() => setHoveredStat(connection.stat)}
                        onMouseLeave={() => setHoveredStat(null)}
                    >
                        <span style={{ fontSize: '12px' }}>{getStatIcon(connection.stat)}</span>
                        <span style={{
                            color: getStatColor(connection),
                            fontSize: '11px',
                            fontWeight: 'bold'
                        }}>
                            {connection.level}
                        </span>
                        <span style={{
                            color: '#64748b',
                            fontSize: '10px'
                        }}>
                            /{connection.requiredLevel}
                        </span>
                    </div>
                ))}
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
            <h3 style={{
                margin: '0 0 16px 0',
                color: '#ffd700',
                fontSize: '16px',
                fontWeight: 'bold'
            }}>
                Skill & Stat Connections
            </h3>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px'
            }}>
                {statConnections.map(connection => (
                    <div
                        key={connection.stat}
                        style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            borderRadius: '8px',
                            padding: '12px',
                            border: `2px solid ${getStatColor(connection)}40`,
                            transition: 'all 0.3s ease',
                            cursor: 'pointer',
                            transform: hoveredStat === connection.stat ? 'translateY(-2px)' : 'none',
                            boxShadow: hoveredStat === connection.stat 
                                ? `0 4px 12px ${getStatColor(connection)}30` 
                                : 'none'
                        }}
                        onMouseEnter={() => setHoveredStat(connection.stat)}
                        onMouseLeave={() => setHoveredStat(null)}
                    >
                        {/* Stat Header */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '8px'
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}>
                                <span style={{ fontSize: '16px' }}>{getStatIcon(connection.stat)}</span>
                                <span style={{
                                    color: '#ffd700',
                                    fontSize: '14px',
                                    fontWeight: 'bold'
                                }}>
                                    {connection.stat}
                                </span>
                            </div>
                            <div style={{
                                background: getStatColor(connection),
                                color: 'white',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: 'bold'
                            }}>
                                {connection.level}
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div style={{
                            background: 'rgba(0, 0, 0, 0.3)',
                            borderRadius: '4px',
                            height: '6px',
                            marginBottom: '8px',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                background: `linear-gradient(90deg, ${getStatColor(connection)} 0%, ${getStatColor(connection)}80 100%)`,
                                height: '100%',
                                width: `${getProgressPercentage(connection)}%`,
                                transition: 'width 0.3s ease'
                            }} />
                        </div>

                        {/* Stat Info */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '11px',
                            color: '#cbd5e1',
                            marginBottom: '8px'
                        }}>
                            <span>Required: {connection.requiredLevel}</span>
                            <span>{getProgressPercentage(connection).toFixed(0)}%</span>
                        </div>

                        {/* Skill Progress (if available) */}
                        {connection.skillProgress && (
                            <div style={{
                                background: 'rgba(139, 92, 246, 0.1)',
                                borderRadius: '4px',
                                padding: '6px',
                                marginBottom: '8px',
                                border: '1px solid rgba(139, 92, 246, 0.3)'
                            }}>
                                <div style={{
                                    color: '#8b5cf6',
                                    fontSize: '10px',
                                    fontWeight: 'bold',
                                    marginBottom: '2px'
                                }}>
                                    Skill Progress
                                </div>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    fontSize: '10px',
                                    color: '#cbd5e1'
                                }}>
                                    <span>Level {connection.skillProgress.level}</span>
                                    <span>{connection.skillProgress.currentCP}/{connection.skillProgress.requiredCP} CP</span>
                                </div>
                            </div>
                        )}

                        {/* Move Count */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '11px'
                        }}>
                            <span style={{ color: '#cbd5e1' }}>Moves Available:</span>
                            <span style={{
                                color: getStatColor(connection),
                                fontWeight: 'bold'
                            }}>
                                {getUnlockedMovesCount(connection)}/{connection.moves.length}
                            </span>
                        </div>

                        {/* Move Preview */}
                        {hoveredStat === connection.stat && connection.moves.length > 0 && (
                            <div style={{
                                marginTop: '8px',
                                padding: '8px',
                                background: 'rgba(0, 0, 0, 0.3)',
                                borderRadius: '4px',
                                border: '1px solid rgba(255, 255, 255, 0.1)'
                            }}>
                                <div style={{
                                    color: '#8b5cf6',
                                    fontSize: '10px',
                                    fontWeight: 'bold',
                                    marginBottom: '4px'
                                }}>
                                    Available Moves:
                                </div>
                                {connection.moves.slice(0, 3).map((move, index) => (
                                    <div
                                        key={index}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            fontSize: '10px',
                                            color: connection.level >= move.statRequirements.primaryMinLevel 
                                                ? '#10b981' 
                                                : '#64748b',
                                            marginBottom: '2px',
                                            cursor: 'pointer'
                                        }}
                                        onClick={() => onMoveSelect?.(move)}
                                    >
                                        <span>{move.name}</span>
                                        <span>{move.power} DMG</span>
                                    </div>
                                ))}
                                {connection.moves.length > 3 && (
                                    <div style={{
                                        color: '#64748b',
                                        fontSize: '9px',
                                        fontStyle: 'italic'
                                    }}>
                                        +{connection.moves.length - 3} more...
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Move Unlock Progression */}
            <div style={{
                marginTop: '16px',
                padding: '12px',
                background: 'rgba(139, 92, 246, 0.1)',
                borderRadius: '8px',
                border: '1px solid rgba(139, 92, 246, 0.3)'
            }}>
                <h4 style={{
                    margin: '0 0 8px 0',
                    color: '#8b5cf6',
                    fontSize: '14px',
                    fontWeight: 'bold'
                }}>
                    Move Unlock Progression
                </h4>
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '6px'
                }}>
                    {availableMoves.map((move, index) => {
                        const isUnlocked = (playerStats[move.statRequirements.primaryStat as keyof PlayerStats] || 0) >= move.statRequirements.primaryMinLevel;
                        return (
                            <div
                                key={index}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '4px 8px',
                                    background: isUnlocked 
                                        ? 'rgba(16, 185, 129, 0.2)' 
                                        : 'rgba(100, 116, 139, 0.2)',
                                    borderRadius: '4px',
                                    border: `1px solid ${isUnlocked ? '#10b981' : '#64748b'}`,
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease'
                                }}
                                onClick={() => onMoveSelect?.(move)}
                            >
                                <span style={{ fontSize: '12px' }}>
                                    {isUnlocked ? '✅' : '🔒'}
                                </span>
                                <span style={{
                                    color: isUnlocked ? '#10b981' : '#64748b',
                                    fontSize: '11px',
                                    fontWeight: 'bold'
                                }}>
                                    {move.name}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
