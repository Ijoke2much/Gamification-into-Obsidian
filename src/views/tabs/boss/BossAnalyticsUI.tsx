import React, { useState, useEffect } from 'react';
import { Boss, BossAnalytics, BossBestiaryEntry, BossArena, BossScalingConfig } from '../../../features/quests/types/BossTypes';
import { PlayerData } from '../../../data/models/PlayerData';
import { bossAnalyticsService } from '../../../features/quests/utils/bossAnalyticsService';

interface BossAnalyticsUIProps {
    playerData: PlayerData | null;
}

type AnalyticsTab = 'overview' | 'trends' | 'effectiveness' | 'achievements' | 'time-patterns' | 'bestiary' | 'scaling' | 'arenas' | 'history';

export const BossAnalyticsUI: React.FC<BossAnalyticsUIProps> = ({ playerData }) => {
    const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview');
    const [bossAnalytics, setBossAnalytics] = useState<BossAnalytics[]>([]);
    const [bestiaryEntries, setBestiaryEntries] = useState<BossBestiaryEntry[]>([]);
    const [arenas, setArenas] = useState<BossArena[]>([]);
    const [scalingConfig, setScalingConfig] = useState<BossScalingConfig | null>(null);
    const [globalStats, setGlobalStats] = useState<any>(null);

    useEffect(() => {
        loadAnalyticsData();
    }, []);

    const loadAnalyticsData = () => {
        setBossAnalytics(bossAnalyticsService.getAllBossAnalytics());
        setBestiaryEntries(bossAnalyticsService.getAllBestiaryEntries());
        setArenas(bossAnalyticsService.getAllArenas());
        setScalingConfig(bossAnalyticsService.getScalingConfig());
        setGlobalStats(bossAnalyticsService.getGlobalStats());
    };

    const formatTime = (minutes: number): string => {
        // Handle very small numbers and round to 4 decimal places max
        const roundedMinutes = Math.round(minutes * 10000) / 10000;
        
        if (roundedMinutes < 0.0001) {
            return '0m';
        }
        
        if (roundedMinutes < 1) {
            return `${(roundedMinutes * 60).toFixed(1)}s`;
        }
        
        const hours = Math.floor(roundedMinutes / 60);
        const mins = Math.round(roundedMinutes % 60);
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    };

    const formatPercentage = (value: number): string => {
        // Handle very small numbers and cap at 4 decimal places
        const roundedValue = Math.round(value * 10000) / 10000;
        
        if (roundedValue < 0.01) {
            return '0%';
        }
        
        return `${roundedValue.toFixed(1)}%`;
    };

    const getDifficultyColor = (difficulty: string): string => {
        const colors = {
            easy: 'var(--color-green)',
            medium: 'var(--color-yellow)',
            hard: 'var(--color-red)',
            epic: 'var(--color-purple)',
            legendary: 'var(--color-red)'
        };
        return colors[difficulty as keyof typeof colors] || 'var(--text-muted)';
    };

    const getBossTypeColor = (type: string): string => {
        const colors = {
            'mini-boss': 'var(--color-green)',
            'boss': 'var(--color-blue)',
            'epic-boss': 'var(--color-purple)',
            'legendary-boss': 'var(--color-red)'
        };
        return colors[type as keyof typeof colors] || 'var(--text-muted)';
    };

    return (
        <div style={{
            width: '100%',
            height: '100%',
            minHeight: '800px',
            maxHeight: 'none',
            background: 'var(--background-primary)',
            color: 'var(--text-normal)',
            display: 'flex',
            flexDirection: 'column',
            fontSize: '16px',
            fontFamily: 'var(--font-interface)',
            lineHeight: '1.5'
        }}>
            {/* Header */}
            <div style={{ 
                padding: '20px 24px',
                borderBottom: '2px solid var(--background-modifier-border)',
                background: 'var(--background-secondary)',
                flexShrink: 0
            }}>
                <h1 style={{ 
                    fontSize: '28px', 
                    color: 'var(--text-accent)', 
                    margin: '0 0 8px 0',
                    fontWeight: '700'
                }}>
                    📊 Boss Analytics
                </h1>
                <p style={{ 
                    color: 'var(--text-muted)', 
                    fontSize: '16px', 
                    margin: 0,
                    fontWeight: '500'
                }}>
                    Performance tracking and battle statistics
                </p>
            </div>

            {/* Tab Navigation */}
            <div style={{
                padding: '16px 20px',
                borderBottom: '2px solid var(--background-modifier-border)',
                background: 'var(--background-secondary)',
                flexShrink: 0,
                overflowX: 'auto'
            }}>
                <div style={{
                    display: 'flex',
                    gap: '12px',
                    flexWrap: 'wrap'
                }}>
                    {[
                        { id: 'overview', label: 'Overview', icon: '📊' },
                        { id: 'achievements', label: 'Progress', icon: '🏆' },
                        { id: 'bestiary', label: 'Bestiary', icon: '📖' },
                        { id: 'history', label: 'History', icon: '📜' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as AnalyticsTab)}
                            style={{
                                padding: '12px 20px',
                                backgroundColor: activeTab === tab.id ? 'var(--interactive-accent)' : 'var(--background-primary)',
                                color: activeTab === tab.id ? 'var(--text-on-accent)' : 'var(--text-normal)',
                                border: '2px solid var(--background-modifier-border)',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '16px',
                                fontWeight: '600',
                                transition: 'all 0.2s ease',
                                whiteSpace: 'nowrap',
                                minHeight: '48px'
                            }}
                            onMouseEnter={(e) => {
                                if (activeTab !== tab.id) {
                                    e.currentTarget.style.backgroundColor = 'var(--background-modifier-hover)';
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (activeTab !== tab.id) {
                                    e.currentTarget.style.backgroundColor = 'var(--background-primary)';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                }
                            }}
                        >
                            <span style={{ marginRight: '8px', fontSize: '18px' }}>{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            <div style={{ 
                flex: 1,
                overflowY: 'auto',
                padding: '24px',
                minHeight: '600px'
            }}>
                {activeTab === 'overview' && (
                    <OverviewTab 
                        globalStats={globalStats}
                        bossAnalytics={bossAnalytics}
                        playerData={playerData}
                        formatTime={formatTime}
                        formatPercentage={formatPercentage}
                    />
                )}

                {activeTab === 'achievements' && (
                    <AchievementsTab />
                )}

                {activeTab === 'bestiary' && (
                    <BestiaryTab 
                        bestiaryEntries={bestiaryEntries}
                        bossAnalytics={bossAnalytics}
                        formatTime={formatTime}
                        formatPercentage={formatPercentage}
                        getDifficultyColor={getDifficultyColor}
                        getBossTypeColor={getBossTypeColor}
                    />
                )}

                {activeTab === 'history' && (
                    <HistoryTab 
                        bossAnalytics={bossAnalytics}
                        formatTime={formatTime}
                        formatPercentage={formatPercentage}
                    />
                )}

                {!['overview', 'achievements', 'bestiary', 'history'].includes(activeTab) && (
                    <div style={{ 
                        color: 'var(--text-muted)', 
                        textAlign: 'center', 
                        padding: '60px 40px',
                        fontSize: '18px'
                    }}>
                        <h3 style={{ margin: '0 0 16px 0', color: 'var(--text-normal)', fontSize: '28px', fontWeight: '700' }}>Coming Soon!</h3>
                        <p style={{ margin: 0, fontSize: '18px', fontWeight: '500' }}>This feature is under development.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// Stat Card Component
const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: string;
    color: string;
}> = ({ title, value, icon, color }) => {
    // Format numbers to avoid excessive decimals
    const formatValue = (val: string | number): string => {
        if (typeof val === 'number') {
            if (val < 0.0001) return '0';
            if (val < 1) return val.toFixed(4);
            if (val < 100) return val.toFixed(2);
            return Math.round(val).toString();
        }
        return val;
    };

    return (
        <div style={{
            background: 'var(--background-secondary)',
            borderRadius: '12px',
            padding: '24px',
            border: '2px solid var(--background-modifier-border)',
            textAlign: 'center',
            minHeight: '120px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            transition: 'all 0.2s ease'
        }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>{icon}</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color, marginBottom: '8px' }}>
                {formatValue(value)}
            </div>
            <div style={{ fontSize: '16px', color: 'var(--text-muted)', lineHeight: '1.3', fontWeight: '500' }}>{title}</div>
        </div>
    );
};

// Overview Tab Component
const OverviewTab: React.FC<{
    globalStats: any;
    bossAnalytics: BossAnalytics[];
    playerData: PlayerData | null;
    formatTime: (minutes: number) => string;
    formatPercentage: (value: number) => string;
}> = ({ globalStats, bossAnalytics, playerData, formatTime, formatPercentage }) => {
    if (!globalStats) return <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>Loading...</div>;

    const topBosses = bossAnalytics
        .sort((a, b) => b.totalBattles - a.totalBattles)
        .slice(0, 3);

    const mostChallenging = bossAnalytics
        .filter(a => a.totalBattles > 0)
        .sort((a, b) => (b.totalBattles - b.victories) - (a.totalBattles - a.victories))
        .slice(0, 3);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Global Stats Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '20px'
            }}>
                <StatCard
                    title="Bosses Defeated"
                    value={globalStats.totalBossesDefeated}
                    icon="🏆"
                    color="var(--color-green)"
                />
                <StatCard
                    title="Total Battles"
                    value={globalStats.totalBattlesFought}
                    icon="⚔️"
                    color="var(--color-blue)"
                />
                <StatCard
                    title="Win Rate"
                    value={formatPercentage(globalStats.averageWinRate)}
                    icon="📊"
                    color="var(--color-yellow)"
                />
                <StatCard
                    title="Time Spent"
                    value={formatTime(globalStats.totalTimeSpent)}
                    icon="⏱️"
                    color="var(--color-purple)"
                />
            </div>

            {/* Top Bosses */}
            <div style={{
                background: 'var(--background-secondary)',
                borderRadius: '12px',
                padding: '24px',
                border: '2px solid var(--background-modifier-border)'
            }}>
                <h3 style={{ 
                    color: 'var(--text-accent)', 
                    margin: '0 0 16px 0',
                    fontSize: '20px',
                    fontWeight: '700'
                }}>🥇 Most Fought Bosses</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {topBosses.length > 0 ? topBosses.map(boss => (
                        <div key={boss.bossId} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '16px 20px',
                            backgroundColor: 'var(--background-primary)',
                            borderRadius: '8px',
                            border: '2px solid var(--background-modifier-border)',
                            transition: 'all 0.2s ease'
                        }}>
                            <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ 
                                    fontWeight: '600',
                                    fontSize: '18px',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    marginBottom: '4px'
                                }}>{boss.bossName}</div>
                                <div style={{ 
                                    fontSize: '14px', 
                                    color: 'var(--text-muted)',
                                    fontWeight: '500'
                                }}>
                                    {boss.bossType} • {boss.difficulty}
                                </div>
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '16px' }}>
                                <div style={{ fontWeight: '700', fontSize: '20px', color: 'var(--text-accent)' }}>{boss.totalBattles}</div>
                                <div style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: '500' }}>
                                    {formatPercentage(boss.winRate)}
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div style={{ 
                            color: 'var(--text-muted)', 
                            fontStyle: 'italic', 
                            textAlign: 'center', 
                            padding: '40px',
                            fontSize: '18px',
                            fontWeight: '500'
                        }}>
                            No boss battles recorded yet.
                        </div>
                    )}
                </div>
            </div>

            {/* Most Challenging Bosses */}
            <div style={{
                background: 'var(--background-secondary)',
                borderRadius: '12px',
                padding: '24px',
                border: '2px solid var(--background-modifier-border)'
            }}>
                <h3 style={{ 
                    color: 'var(--text-accent)', 
                    margin: '0 0 16px 0',
                    fontSize: '20px',
                    fontWeight: '700'
                }}>💀 Most Challenging Bosses</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {mostChallenging.length > 0 ? mostChallenging.map(boss => (
                        <div key={boss.bossId} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '16px 20px',
                            backgroundColor: 'var(--background-primary)',
                            borderRadius: '8px',
                            border: '2px solid var(--background-modifier-border)',
                            transition: 'all 0.2s ease'
                        }}>
                            <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ 
                                    fontWeight: '600',
                                    fontSize: '18px',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    marginBottom: '4px'
                                }}>{boss.bossName}</div>
                                <div style={{ 
                                    fontSize: '14px', 
                                    color: 'var(--text-muted)',
                                    fontWeight: '500'
                                }}>
                                    {boss.defeats} defeats • {formatTime(boss.averageBattleTime)} avg
                                </div>
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '16px' }}>
                                <div style={{ fontWeight: '700', fontSize: '18px', color: 'var(--color-red)' }}>
                                    {boss.totalBattles - boss.victories} losses
                                </div>
                                <div style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: '500' }}>
                                    {formatPercentage(boss.winRate)} win rate
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div style={{ 
                            color: 'var(--text-muted)', 
                            fontStyle: 'italic', 
                            textAlign: 'center', 
                            padding: '40px',
                            fontSize: '18px',
                            fontWeight: '500'
                        }}>
                            No challenging bosses yet.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Achievements Tab Component
const AchievementsTab: React.FC = () => {
    return (
        <div style={{ 
            color: 'var(--text-normal)',
            padding: '8px'
        }}>
            <div style={{
                background: 'var(--background-secondary)',
                borderRadius: '12px',
                padding: '24px',
                border: '2px solid var(--background-modifier-border)',
                marginBottom: '20px'
            }}>
                <h2 style={{ 
                    color: 'var(--text-accent)', 
                    margin: '0 0 16px 0',
                    fontSize: '24px',
                    fontWeight: '700'
                }}>🏆 Achievement Progress</h2>
                
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                }}>
                    <div style={{
                        background: 'var(--background-primary)',
                        borderRadius: '8px',
                        padding: '16px 20px',
                        border: '2px solid var(--background-modifier-border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <span style={{ fontSize: '16px', color: 'var(--text-muted)', fontWeight: '500' }}>Unlocked</span>
                        <span style={{ fontSize: '20px', fontWeight: '700', color: 'var(--color-green)' }}>0 / 18</span>
                    </div>
                    <div style={{
                        background: 'var(--background-primary)',
                        borderRadius: '8px',
                        padding: '16px 20px',
                        border: '2px solid var(--background-modifier-border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <span style={{ fontSize: '16px', color: 'var(--text-muted)', fontWeight: '500' }}>Bosses Defeated</span>
                        <span style={{ fontSize: '20px', fontWeight: '700', color: 'var(--color-yellow)' }}>0</span>
                    </div>
                </div>
            </div>

            <div style={{
                background: 'var(--background-secondary)',
                borderRadius: '12px',
                padding: '24px',
                border: '2px solid var(--background-modifier-border)'
            }}>
                <h3 style={{ 
                    color: 'var(--text-accent)', 
                    margin: '0 0 16px 0',
                    fontSize: '24px',
                    fontWeight: '700'
                }}>🧠 AI Insights</h3>
                
                <div style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '2px solid var(--color-red)',
                    borderRadius: '8px',
                    padding: '16px 20px',
                    marginBottom: '12px'
                }}>
                    <div style={{ 
                        color: 'var(--color-red)', 
                        fontSize: '16px', 
                        fontWeight: '600',
                        lineHeight: '1.4'
                    }}>⚠️ Low win rate - needs improvement</div>
                </div>
                
                <div style={{
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '2px solid var(--color-blue)',
                    borderRadius: '8px',
                    padding: '16px 20px'
                }}>
                    <div style={{ 
                        color: 'var(--color-blue)', 
                        fontSize: '16px', 
                        fontWeight: '600',
                        lineHeight: '1.4'
                    }}>💡 Focus on Fundamentals</div>
                </div>
            </div>
        </div>
    );
};

// Bestiary Tab Component
const BestiaryTab: React.FC<{
    bestiaryEntries: BossBestiaryEntry[];
    bossAnalytics: BossAnalytics[];
    formatTime: (minutes: number) => string;
    formatPercentage: (value: number) => string;
    getDifficultyColor: (difficulty: string) => string;
    getBossTypeColor: (type: string) => string;
}> = ({ bestiaryEntries, bossAnalytics, formatTime, formatPercentage, getDifficultyColor, getBossTypeColor }) => {
    const [filter, setFilter] = useState<'all' | 'unlocked' | 'defeated'>('all');
    const [searchTerm, setSearchTerm] = useState('');

    const filteredEntries = bestiaryEntries.filter(entry => {
        if (filter === 'unlocked' && !entry.isUnlocked) return false;
        if (filter === 'defeated' && !entry.isDefeated) return false;
        if (searchTerm && !entry.bossName.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Filters */}
            <div style={{
                background: 'var(--background-secondary)',
                borderRadius: '12px',
                padding: '20px',
                border: '2px solid var(--background-modifier-border)'
            }}>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                    {(['all', 'unlocked', 'defeated'] as const).map(filterOption => (
                        <button
                            key={filterOption}
                            onClick={() => setFilter(filterOption)}
                            style={{
                                padding: '12px 20px',
                                backgroundColor: filter === filterOption ? 'var(--interactive-accent)' : 'var(--background-primary)',
                                color: filter === filterOption ? 'var(--text-on-accent)' : 'var(--text-normal)',
                                border: '2px solid var(--background-modifier-border)',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '16px',
                                fontWeight: '600',
                                textTransform: 'capitalize',
                                minHeight: '48px',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {filterOption}
                        </button>
                    ))}
                </div>
                <input
                    type="text"
                    placeholder="Search bosses..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '16px 20px',
                        backgroundColor: 'var(--background-primary)',
                        border: '2px solid var(--background-modifier-border)',
                        borderRadius: '8px',
                        color: 'var(--text-normal)',
                        fontSize: '16px',
                        fontWeight: '500'
                    }}
                />
            </div>

            {/* Boss List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {filteredEntries.length > 0 ? filteredEntries.slice(0, 10).map(entry => {
                    const analytics = bossAnalytics.find(a => a.bossId === entry.bossId);
                    return (
                        <div key={entry.bossId} style={{
                            background: 'var(--background-secondary)',
                            borderRadius: '12px',
                            padding: '20px',
                            border: '2px solid var(--background-modifier-border)',
                            transition: 'all 0.2s ease'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                <div style={{ minWidth: 0, flex: 1 }}>
                                    <h4 style={{ 
                                        margin: '0 0 8px 0',
                                        fontSize: '20px',
                                        fontWeight: '700',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}>
                                        {entry.avatar} {entry.bossName}
                                    </h4>
                                    <div style={{ 
                                        fontSize: '16px', 
                                        color: 'var(--text-muted)',
                                        marginBottom: '8px',
                                        fontWeight: '500'
                                    }}>
                                        <span style={{ color: getBossTypeColor(entry.bossType), fontWeight: '600' }}>{entry.bossType}</span>
                                        {' • '}
                                        <span style={{ color: getDifficultyColor(entry.difficulty), fontWeight: '600' }}>{entry.difficulty}</span>
                                    </div>
                                </div>
                                <div style={{ fontSize: '20px', color: 'var(--text-muted)', textAlign: 'right' }}>
                                    {entry.isUnlocked ? '✅' : '🔒'} {entry.isDefeated ? '🏆' : '⚔️'}
                                </div>
                            </div>

                            {analytics && (
                                <div style={{
                                    background: 'var(--background-primary)',
                                    borderRadius: '8px',
                                    padding: '16px',
                                    fontSize: '16px'
                                }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        <div style={{ fontWeight: '600' }}>Battles: <span style={{ color: 'var(--text-accent)' }}>{analytics.totalBattles}</span></div>
                                        <div style={{ fontWeight: '600' }}>Win Rate: <span style={{ color: 'var(--text-accent)' }}>{formatPercentage(analytics.winRate)}</span></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                }) : (
                    <div style={{ 
                        color: 'var(--text-muted)', 
                        fontStyle: 'italic', 
                        textAlign: 'center', 
                        padding: '40px',
                        fontSize: '18px',
                        fontWeight: '500'
                    }}>
                        No bosses found matching your criteria.
                    </div>
                )}
            </div>
        </div>
    );
};

// History Tab Component
const HistoryTab: React.FC<{
    bossAnalytics: BossAnalytics[];
    formatTime: (minutes: number) => string;
    formatPercentage: (value: number) => string;
}> = ({ bossAnalytics, formatTime, formatPercentage }) => {
    const allBattles = bossAnalytics
        .flatMap(analytics => analytics.battleHistory.map(battle => ({ ...battle, bossName: analytics.bossName })))
        .sort((a, b) => new Date(b.battleDate).getTime() - new Date(a.battleDate).getTime())
        .slice(0, 20);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ 
                color: 'var(--text-accent)', 
                margin: '0 0 16px 0',
                fontSize: '24px',
                fontWeight: '700'
            }}>📜 Recent Battle History</h3>
            
            {allBattles.length > 0 ? allBattles.map((battle, index) => (
                <div key={`${battle.battleId}-${index}`} style={{
                    background: 'var(--background-secondary)',
                    borderRadius: '12px',
                    padding: '20px',
                    border: '2px solid var(--background-modifier-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.2s ease'
                }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ 
                            fontSize: '18px',
                            fontWeight: '600',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            marginBottom: '8px'
                        }}>
                            {(battle as any).bossName}
                        </div>
                        <div style={{ fontSize: '16px', color: 'var(--text-muted)', fontWeight: '500' }}>
                            {new Date(battle.battleDate).toLocaleDateString()} • {formatTime(battle.duration)}
                        </div>
                    </div>
                    <span style={{
                        fontSize: '16px',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        backgroundColor: battle.result === 'victory' ? 'var(--color-green)' : 'var(--color-red)',
                        color: 'white',
                        fontWeight: '700',
                        minWidth: '80px',
                        textAlign: 'center'
                    }}>
                        {battle.result === 'victory' ? 'WIN' : battle.result === 'defeat' ? 'LOSS' : 'ABANDONED'}
                    </span>
                </div>
            )) : (
                <div style={{ 
                    color: 'var(--text-muted)', 
                    fontStyle: 'italic', 
                    textAlign: 'center', 
                    padding: '40px',
                    fontSize: '18px',
                    fontWeight: '500'
                }}>
                    No battle history available.
                </div>
            )}
        </div>
    );
};