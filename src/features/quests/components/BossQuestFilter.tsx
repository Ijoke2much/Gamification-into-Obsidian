import React, { useState, useEffect } from 'react';
import { Boss } from '../types/BossTypes';
import { Quest } from '../utils/taskParser';
import { EnhancedBossQuestIntegration } from '../services/enhancedBossQuestIntegration';
import { bossManagementService } from '../utils/bossManagementService';

interface BossQuestFilterProps {
    app: any; // Obsidian App instance
    onFilterChange: (filter: { tags: string[]; description: string } | null) => void;
    currentFilter?: { tags: string[]; description: string } | null;
    compact?: boolean;
}

export const BossQuestFilter: React.FC<BossQuestFilterProps> = ({
    app,
    onFilterChange,
    currentFilter,
    compact = false
}) => {
    const [activeBosses, setActiveBosses] = useState<Boss[]>([]);
    const [selectedBossId, setSelectedBossId] = useState<string | null>(null);
    const [bossQuestIntegration] = useState(() => EnhancedBossQuestIntegration.getInstance(app));
    const [questStats, setQuestStats] = useState<Map<string, { linked: number; active: number }>>(new Map());

    useEffect(() => {
        loadActiveBosses();
    }, []);

    useEffect(() => {
        if (selectedBossId) {
            updateQuestStats(selectedBossId);
        }
    }, [selectedBossId]);

    const loadActiveBosses = () => {
        const bosses = bossManagementService.getActiveBosses();
        setActiveBosses(bosses.map(bossData => bossData.boss));
    };

    const updateQuestStats = (bossId: string) => {
        const linkedQuests = bossQuestIntegration.getQuestsForBoss(bossId);
        const activeQuests = bossQuestIntegration.getQuestsForBoss(bossId, { isActive: true });
        
        setQuestStats(prev => new Map(prev.set(bossId, {
            linked: linkedQuests.length,
            active: activeQuests.length
        })));
    };

    const handleBossSelect = (bossId: string) => {
        if (selectedBossId === bossId) {
            // Deselect if clicking the same boss
            setSelectedBossId(null);
            onFilterChange(null);
        } else {
            setSelectedBossId(bossId);
            const filter = bossQuestIntegration.getBossQuestFilter(bossId);
            onFilterChange(filter);
        }
    };

    const handleRefresh = async () => {
        // Refresh boss-quest links
        const quests: Quest[] = []; // This would come from the quest system
        await bossQuestIntegration.refreshQuestBossLinks(quests);
        loadActiveBosses();
        
        if (selectedBossId) {
            updateQuestStats(selectedBossId);
        }
    };

    const getBossStatus = (boss: Boss): 'active' | 'defeated' | 'inactive' => {
        const bossData = bossManagementService.getBossForQuest(boss.questId);
        if (!bossData) return 'inactive';
        
        if (bossData.progress.currentHP <= 0) return 'defeated';
        if (bossData.progress.isActive) return 'active';
        return 'inactive';
    };

    const getBossStatusColor = (status: string): string => {
        switch (status) {
            case 'active': return '#10b981';
            case 'defeated': return '#ef4444';
            case 'inactive': return '#64748b';
            default: return '#64748b';
        }
    };

    const getBossStatusIcon = (status: string): string => {
        switch (status) {
            case 'active': return '⚔️';
            case 'defeated': return '💀';
            case 'inactive': return '😴';
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
                background: 'rgba(139, 92, 246, 0.1)',
                borderRadius: '8px',
                border: '1px solid rgba(139, 92, 246, 0.3)'
            }}>
                <span style={{ fontSize: '14px', color: '#8b5cf6' }}>🎯</span>
                <select
                    value={selectedBossId || ''}
                    onChange={(e) => handleBossSelect(e.target.value)}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#cbd5e1',
                        fontSize: '12px',
                        outline: 'none'
                    }}
                >
                    <option value="">All Quests</option>
                    {activeBosses.map(boss => (
                        <option key={boss.id} value={boss.id}>
                            {boss.name}
                        </option>
                    ))}
                </select>
                {selectedBossId && (
                    <button
                        onClick={() => handleBossSelect(selectedBossId)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            fontSize: '12px'
                        }}
                    >
                        ✕
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
                    Boss Quest Filter
                </h3>
                <button
                    onClick={handleRefresh}
                    style={{
                        background: 'rgba(59, 130, 246, 0.2)',
                        border: '1px solid rgba(59, 130, 246, 0.4)',
                        color: '#60a5fa',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                    }}
                >
                    🔄 Refresh
                </button>
            </div>

            {activeBosses.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    color: '#64748b',
                    fontSize: '14px',
                    padding: '20px'
                }}>
                    <span style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}>👹</span>
                    No active bosses found
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '8px'
                }}>
                    {activeBosses.map(boss => {
                        const status = getBossStatus(boss);
                        const stats = questStats.get(boss.id) || { linked: 0, active: 0 };
                        const isSelected = selectedBossId === boss.id;

                        return (
                            <div
                                key={boss.id}
                                onClick={() => handleBossSelect(boss.id)}
                                style={{
                                    background: isSelected 
                                        ? 'rgba(139, 92, 246, 0.2)' 
                                        : 'rgba(255, 255, 255, 0.05)',
                                    border: `2px solid ${isSelected ? '#8b5cf6' : getBossStatusColor(status)}`,
                                    borderRadius: '8px',
                                    padding: '12px',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    position: 'relative'
                                }}
                            >
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
                                        <span style={{ fontSize: '16px' }}>
                                            {getBossStatusIcon(status)}
                                        </span>
                                        <span style={{
                                            color: '#ffd700',
                                            fontSize: '14px',
                                            fontWeight: 'bold'
                                        }}>
                                            {boss.name}
                                        </span>
                                    </div>
                                    <div style={{
                                        background: getBossStatusColor(status),
                                        color: 'white',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        fontSize: '10px',
                                        fontWeight: 'bold',
                                        textTransform: 'uppercase'
                                    }}>
                                        {status}
                                    </div>
                                </div>

                                <div style={{
                                    color: '#cbd5e1',
                                    fontSize: '12px',
                                    marginBottom: '4px'
                                }}>
                                    {boss.description}
                                </div>

                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    fontSize: '11px',
                                    color: '#8b5cf6'
                                }}>
                                    <span>Linked: {stats.linked}</span>
                                    <span>Active: {stats.active}</span>
                                </div>

                                {isSelected && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '4px',
                                        right: '4px',
                                        background: '#8b5cf6',
                                        color: 'white',
                                        borderRadius: '50%',
                                        width: '16px',
                                        height: '16px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '10px'
                                    }}>
                                        ✓
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {currentFilter && (
                <div style={{
                    marginTop: '12px',
                    padding: '8px 12px',
                    background: 'rgba(139, 92, 246, 0.1)',
                    borderRadius: '6px',
                    border: '1px solid rgba(139, 92, 246, 0.3)'
                }}>
                    <div style={{
                        color: '#8b5cf6',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        marginBottom: '4px'
                    }}>
                        Active Filter:
                    </div>
                    <div style={{
                        color: '#cbd5e1',
                        fontSize: '14px'
                    }}>
                        {currentFilter.description}
                    </div>
                    <div style={{
                        color: '#64748b',
                        fontSize: '11px',
                        marginTop: '4px'
                    }}>
                        Tags: {currentFilter.tags.join(', ')}
                    </div>
                </div>
            )}
        </div>
    );
};
