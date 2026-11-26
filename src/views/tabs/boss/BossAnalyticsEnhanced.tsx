// Enhanced Analytics Components for Boss Mode
import React from 'react';
import { BossAnalytics } from '../../../features/quests/types/BossTypes';

// Performance Trends Tab Component
export const PerformanceTrendsTab: React.FC<{
    bossAnalytics: BossAnalytics[];
    formatTime: (minutes: number) => string;
    formatPercentage: (value: number) => string;
}> = ({ bossAnalytics, formatTime, formatPercentage }) => {
    // Calculate trends data
    const last30DaysBattles = bossAnalytics.flatMap(boss => 
        boss.battleHistory.filter(battle => {
            const daysDiff = (Date.now() - battle.battleDate.getTime()) / (1000 * 60 * 60 * 24);
            return daysDiff <= 30;
        })
    );

    const weeklyStats = Array.from({ length: 4 }, (_, weekIndex) => {
        const weekStart = Date.now() - (weekIndex + 1) * 7 * 24 * 60 * 60 * 1000;
        const weekEnd = Date.now() - weekIndex * 7 * 24 * 60 * 60 * 1000;
        
        const weekBattles = last30DaysBattles.filter(battle => 
            battle.battleDate.getTime() >= weekStart && battle.battleDate.getTime() <= weekEnd
        );

        return {
            week: `Week ${4 - weekIndex}`,
            battles: weekBattles.length,
            victories: weekBattles.filter(b => b.result === 'victory').length,
            avgDuration: weekBattles.length > 0 ? weekBattles.reduce((sum, b) => sum + b.duration, 0) / weekBattles.length : 0,
            totalXP: weekBattles.reduce((sum, b) => sum + b.rewards.xp, 0)
        };
    }).reverse();

    const difficultyBreakdown = ['easy', 'medium', 'hard', 'epic', 'legendary'].map(difficulty => {
        const difficultyBosses = bossAnalytics.filter(boss => boss.difficulty === difficulty);
        const totalBattles = difficultyBosses.reduce((sum, boss) => sum + boss.totalBattles, 0);
        const totalVictories = difficultyBosses.reduce((sum, boss) => sum + boss.victories, 0);
        
        return {
            difficulty,
            battles: totalBattles,
            winRate: totalBattles > 0 ? (totalVictories / totalBattles) * 100 : 0,
            avgTime: difficultyBosses.length > 0 ? difficultyBosses.reduce((sum, boss) => sum + boss.averageBattleTime, 0) / difficultyBosses.length : 0
        };
    });

    const StatCard: React.FC<{
        title: string;
        value: string | number;
        icon: string;
        color: string;
    }> = ({ title, value, icon, color }) => (
        <div style={{
            background: 'rgba(30, 41, 59, 0.8)',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #374151',
            textAlign: 'center'
        }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>{icon}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color, marginBottom: '5px' }}>
                {value}
            </div>
            <div style={{ fontSize: '14px', color: '#9ca3af' }}>{title}</div>
        </div>
    );

    const calculateWinStreak = (bossAnalytics: BossAnalytics[]): number => {
        const allBattles = bossAnalytics
            .flatMap(boss => boss.battleHistory)
            .sort((a, b) => b.battleDate.getTime() - a.battleDate.getTime());
        
        let currentStreak = 0;
        let maxStreak = 0;
        
        for (const battle of allBattles) {
            if (battle.result === 'victory') {
                currentStreak++;
                maxStreak = Math.max(maxStreak, currentStreak);
            } else {
                currentStreak = 0;
            }
        }
        
        return maxStreak;
    };

    return (
        <div style={{ display: 'grid', gap: '20px' }}>
            {/* Weekly Performance Chart */}
            <div style={{
                background: 'rgba(30, 41, 59, 0.8)',
                borderRadius: '12px',
                padding: '20px',
                border: '1px solid #374151'
            }}>
                <h3 style={{ color: '#ffd700', marginBottom: '20px', margin: '0 0 20px 0' }}>📈 Weekly Performance Trends</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
                    {weeklyStats.map(week => (
                        <div key={week.week} style={{
                            background: 'rgba(55, 65, 81, 0.5)',
                            borderRadius: '8px',
                            padding: '15px',
                            textAlign: 'center'
                        }}>
                            <h4 style={{ color: '#60a5fa', marginBottom: '10px', margin: '0 0 10px 0' }}>{week.week}</h4>
                            <div style={{ fontSize: '14px', color: '#94a3b8', lineHeight: '1.5' }}>
                                <div><strong>{week.battles}</strong> battles</div>
                                <div><strong>{week.victories}</strong> victories</div>
                                <div><strong>{formatTime(week.avgDuration)}</strong> avg</div>
                                <div><strong>{week.totalXP}</strong> XP earned</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Difficulty Analysis */}
            <div style={{
                background: 'rgba(30, 41, 59, 0.8)',
                borderRadius: '12px',
                padding: '20px',
                border: '1px solid #374151'
            }}>
                <h3 style={{ color: '#ffd700', marginBottom: '20px', margin: '0 0 20px 0' }}>🎯 Difficulty Performance</h3>
                <div style={{ display: 'grid', gap: '10px' }}>
                    {difficultyBreakdown.map(diff => (
                        <div key={diff.difficulty} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '15px',
                            backgroundColor: 'rgba(55, 65, 81, 0.5)',
                            borderRadius: '8px'
                        }}>
                            <div>
                                <div style={{ fontWeight: 'bold', textTransform: 'capitalize' }}>{diff.difficulty}</div>
                                <div style={{ fontSize: '14px', color: '#9ca3af' }}>
                                    {diff.battles} total battles
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: 'bold', color: diff.winRate >= 60 ? '#10b981' : diff.winRate >= 40 ? '#f59e0b' : '#ef4444' }}>
                                    {formatPercentage(diff.winRate)} win rate
                                </div>
                                <div style={{ fontSize: '14px', color: '#9ca3af' }}>
                                    {formatTime(diff.avgTime)} avg time
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Personal Records */}
            <div style={{
                background: 'rgba(30, 41, 59, 0.8)',
                borderRadius: '12px',
                padding: '20px',
                border: '1px solid #374151'
            }}>
                <h3 style={{ color: '#ffd700', marginBottom: '20px', margin: '0 0 20px 0' }}>🏅 Personal Records</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                    <StatCard
                        title="Fastest Victory"
                        value={formatTime(Math.min(...bossAnalytics.flatMap(boss => 
                            boss.battleHistory.filter(b => b.result === 'victory').map(b => b.duration)
                        )) || 0)}
                        icon="⚡"
                        color="#10b981"
                    />
                    <StatCard
                        title="Longest Battle"
                        value={formatTime(Math.max(...bossAnalytics.flatMap(boss => 
                            boss.battleHistory.map(b => b.duration)
                        )) || 0)}
                        icon="⏳"
                        color="#f59e0b"
                    />
                    <StatCard
                        title="Highest Damage"
                        value={Math.max(...bossAnalytics.map(boss => boss.highestDamageDealt)) || 0}
                        icon="💥"
                        color="#ef4444"
                    />
                    <StatCard
                        title="Best Win Streak"
                        value={calculateWinStreak(bossAnalytics)}
                        icon="🔥"
                        color="#8b5cf6"
                    />
                </div>
            </div>
        </div>
    );
};

// Boss Effectiveness Tab Component
export const BossEffectivenessTab: React.FC<{
    bossAnalytics: BossAnalytics[];
    formatTime: (minutes: number) => string;
    formatPercentage: (value: number) => string;
}> = ({ bossAnalytics, formatTime, formatPercentage }) => {
    
    const calculateConsistencyScore = (boss: BossAnalytics): number => {
        const recentBattles = boss.battleHistory.slice(-5);
        if (recentBattles.length < 3) return 0.5;
        
        const victories = recentBattles.filter(b => b.result === 'victory').length;
        return victories / recentBattles.length;
    };

    const getRecommendationType = (boss: BossAnalytics): string => {
        const winRate = boss.victories / Math.max(boss.totalBattles, 1);
        const avgTime = boss.averageBattleTime;
        
        if (winRate > 0.8 && avgTime < 20) return 'Quick Wins';
        if (winRate > 0.6 && avgTime > 30) return 'Deep Work';
        if (winRate < 0.4) return 'Skill Building';
        return 'Balanced';
    };

    const getProductivityInsights = (bossEffectiveness: any[]): any[] => {
        const insights = [];
        
        if (bossEffectiveness.length > 0) {
            const topBoss = bossEffectiveness[0];
            insights.push({
                title: 'Most Motivating Boss',
                description: `${topBoss.bossName} is your most effective motivator with a ${topBoss.motivationScore}/100 score. Use this boss for important tasks!`,
                icon: '🎯',
                color: '16, 185, 129',
                borderColor: '#10b981'
            });
        }
        
        const quickWinBosses = bossEffectiveness.filter(boss => boss.recommendedFor === 'Quick Wins');
        if (quickWinBosses.length > 0) {
            insights.push({
                title: 'Quick Win Strategy',
                description: `You have ${quickWinBosses.length} bosses perfect for quick productivity boosts. Use them when you need immediate momentum!`,
                icon: '⚡',
                color: '245, 158, 11',
                borderColor: '#f59e0b'
            });
        }
        
        const deepWorkBosses = bossEffectiveness.filter(boss => boss.recommendedFor === 'Deep Work');
        if (deepWorkBosses.length > 0) {
            insights.push({
                title: 'Deep Work Champions',
                description: `${deepWorkBosses.length} bosses excel at sustaining long-term focus. Perfect for complex projects and intensive work sessions.`,
                icon: '🧠',
                color: '139, 92, 246',
                borderColor: '#8b5cf6'
            });
        }
        
        return insights;
    };

    // Calculate effectiveness scores
    const bossEffectiveness = bossAnalytics.map(boss => {
        const completionRate = boss.victories / Math.max(boss.totalBattles, 1);
        const engagementScore = Math.min(boss.totalTimeSpent / 60, 20); // Max 20 points for time
        const consistencyScore = calculateConsistencyScore(boss);
        const motivationScore = Math.round((completionRate * 40) + (engagementScore) + (consistencyScore * 20));
        
        return {
            ...boss,
            motivationScore,
            completionRate: completionRate * 100,
            engagementScore,
            consistencyScore,
            recommendedFor: getRecommendationType(boss)
        };
    }).sort((a, b) => b.motivationScore - a.motivationScore);

    return (
        <div style={{ display: 'grid', gap: '20px' }}>
            {/* Boss Effectiveness Ranking */}
            <div style={{
                background: 'rgba(30, 41, 59, 0.8)',
                borderRadius: '12px',
                padding: '20px',
                border: '1px solid #374151'
            }}>
                <h3 style={{ color: '#ffd700', marginBottom: '20px', margin: '0 0 20px 0' }}>🎯 Boss Effectiveness Analysis</h3>
                <p style={{ color: '#94a3b8', marginBottom: '20px', margin: '0 0 20px 0' }}>
                    Discover which bosses motivate you most and provide the best productivity boost!
                </p>
                
                <div style={{ display: 'grid', gap: '15px' }}>
                    {bossEffectiveness.length > 0 ? bossEffectiveness.map((boss, index) => (
                        <div key={boss.bossId} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '20px',
                            backgroundColor: 'rgba(55, 65, 81, 0.5)',
                            borderRadius: '8px',
                            border: index < 3 ? '2px solid #ffd700' : '1px solid #4b5563'
                        }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '1.5rem' }}>
                                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '📊'}
                                    </span>
                                    <h4 style={{ color: '#ffd700', margin: 0 }}>{boss.bossName}</h4>
                                    <span style={{
                                        padding: '2px 8px',
                                        backgroundColor: '#3b82f6',
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                        fontWeight: 'bold'
                                    }}>
                                        {boss.recommendedFor}
                                    </span>
                                </div>
                                <div style={{ color: '#94a3b8', fontSize: '14px' }}>
                                    {boss.bossType} • {boss.difficulty} • {boss.totalBattles} battles fought
                                </div>
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', textAlign: 'center', minWidth: '400px' }}>
                                <div>
                                    <div style={{ color: '#9ca3af', fontSize: '12px' }}>Motivation Score</div>
                                    <div style={{ 
                                        fontWeight: 'bold', 
                                        fontSize: '16px',
                                        color: boss.motivationScore >= 80 ? '#10b981' : boss.motivationScore >= 60 ? '#f59e0b' : '#ef4444' 
                                    }}>
                                        {boss.motivationScore}/100
                                    </div>
                                </div>
                                <div>
                                    <div style={{ color: '#9ca3af', fontSize: '12px' }}>Win Rate</div>
                                    <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#60a5fa' }}>
                                        {formatPercentage(boss.completionRate)}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ color: '#9ca3af', fontSize: '12px' }}>Avg Duration</div>
                                    <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#60a5fa' }}>
                                        {formatTime(boss.averageBattleTime)}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ color: '#9ca3af', fontSize: '12px' }}>Total Time</div>
                                    <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#60a5fa' }}>
                                        {formatTime(boss.totalTimeSpent)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div style={{ textAlign: 'center', color: '#9ca3af', fontStyle: 'italic', padding: '40px' }}>
                            No boss effectiveness data available yet. Fight some bosses to see analysis!
                        </div>
                    )}
                </div>
            </div>

            {/* Recommendations */}
            <div style={{
                background: 'rgba(30, 41, 59, 0.8)',
                borderRadius: '12px',
                padding: '20px',
                border: '1px solid #374151'
            }}>
                <h3 style={{ color: '#ffd700', marginBottom: '20px', margin: '0 0 20px 0' }}>💡 Productivity Insights</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
                    {getProductivityInsights(bossEffectiveness).map((insight, index) => (
                        <div key={index} style={{
                            background: `rgba(${insight.color}, 0.1)`,
                            border: `1px solid ${insight.borderColor}`,
                            borderRadius: '8px',
                            padding: '15px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                <span style={{ fontSize: '1.5rem' }}>{insight.icon}</span>
                                <h4 style={{ color: insight.borderColor, margin: 0 }}>{insight.title}</h4>
                            </div>
                            <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>
                                {insight.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// Achievements Tab Component
export const AchievementsTab: React.FC<{
    globalStats: any;
    bossAnalytics: BossAnalytics[];
    formatTime: (minutes: number) => string;
}> = ({ globalStats, bossAnalytics, formatTime }) => {
    if (!globalStats) return <div>Loading...</div>;

    const StatCard: React.FC<{
        title: string;
        value: string | number;
        icon: string;
        color: string;
    }> = ({ title, value, icon, color }) => (
        <div style={{
            background: 'rgba(30, 41, 59, 0.8)',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #374151',
            textAlign: 'center'
        }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>{icon}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color, marginBottom: '5px' }}>
                {value}
            </div>
            <div style={{ fontSize: '14px', color: '#9ca3af' }}>{title}</div>
        </div>
    );

    const hasSpeedVictory = (bossAnalytics: BossAnalytics[]): boolean => {
        return bossAnalytics.some(boss => 
            boss.battleHistory.some(battle => 
                battle.result === 'victory' && battle.duration < 10
            )
        );
    };

    const hasPerfectRecord = (globalStats: any): boolean => {
        if (globalStats.totalBattlesFought < 10) return false;
        return globalStats.averageWinRate >= 100;
    };

    const hasLegendaryVictory = (bossAnalytics: BossAnalytics[]): boolean => {
        return bossAnalytics.some(boss => 
            boss.difficulty === 'legendary' && boss.victories > 0
        );
    };

    const calculateStreakProgress = (bossAnalytics: BossAnalytics[]): number => {
        const allBattles = bossAnalytics.flatMap(boss => boss.battleHistory);
        const uniqueDays = new Set(allBattles.map(battle => 
            battle.battleDate.toISOString().split('T')[0]
        ));
        
        return Math.min((uniqueDays.size / 7) * 100, 100);
    };

    const hasHighDamage = (bossAnalytics: BossAnalytics[]): boolean => {
        return bossAnalytics.some(boss => boss.highestDamageDealt >= 1000);
    };

    const achievements = [
        {
            id: 'first_blood',
            name: 'First Blood',
            description: 'Defeat your first boss',
            icon: '🏆',
            category: 'Milestone',
            progress: globalStats.totalBossesDefeated >= 1 ? 100 : 0,
            unlocked: globalStats.totalBossesDefeated >= 1,
            requirement: '1 boss defeated'
        },
        {
            id: 'speed_demon',
            name: 'Speed Demon',
            description: 'Defeat a boss in under 10 minutes',
            icon: '⚡',
            category: 'Performance',
            progress: hasSpeedVictory(bossAnalytics) ? 100 : 0,
            unlocked: hasSpeedVictory(bossAnalytics),
            requirement: 'Victory in <10 minutes'
        },
        {
            id: 'marathon_runner',
            name: 'Marathon Runner',
            description: 'Spend over 100 hours in boss battles',
            icon: '🏃',
            category: 'Endurance',
            progress: Math.min((globalStats.totalTimeSpent / 6000) * 100, 100),
            unlocked: globalStats.totalTimeSpent >= 6000,
            requirement: '100 hours total'
        },
        {
            id: 'boss_slayer',
            name: 'Boss Slayer',
            description: 'Defeat 50 bosses',
            icon: '⚔️',
            category: 'Milestone',
            progress: Math.min((globalStats.totalBossesDefeated / 50) * 100, 100),
            unlocked: globalStats.totalBossesDefeated >= 50,
            requirement: '50 bosses defeated'
        },
        {
            id: 'perfectionist',
            name: 'Perfectionist',
            description: 'Achieve 100% win rate with at least 10 battles',
            icon: '💯',
            category: 'Performance',
            progress: hasPerfectRecord(globalStats) ? 100 : 0,
            unlocked: hasPerfectRecord(globalStats),
            requirement: '100% win rate (10+ battles)'
        },
        {
            id: 'legendary_hunter',
            name: 'Legendary Hunter',
            description: 'Defeat a legendary difficulty boss',
            icon: '👑',
            category: 'Difficulty',
            progress: hasLegendaryVictory(bossAnalytics) ? 100 : 0,
            unlocked: hasLegendaryVictory(bossAnalytics),
            requirement: 'Defeat legendary boss'
        },
        {
            id: 'consistency_king',
            name: 'Consistency King',
            description: 'Fight bosses for 7 days in a row',
            icon: '📅',
            category: 'Consistency',
            progress: calculateStreakProgress(bossAnalytics),
            unlocked: calculateStreakProgress(bossAnalytics) >= 100,
            requirement: '7-day streak'
        },
        {
            id: 'damage_dealer',
            name: 'Damage Dealer',
            description: 'Deal over 1000 damage in a single battle',
            icon: '💥',
            category: 'Performance',
            progress: hasHighDamage(bossAnalytics) ? 100 : 0,
            unlocked: hasHighDamage(bossAnalytics),
            requirement: '1000+ damage'
        }
    ];

    const unlockedAchievements = achievements.filter(a => a.unlocked);
    const categoryGroups = achievements.reduce((groups, achievement) => {
        if (!groups[achievement.category]) groups[achievement.category] = [];
        groups[achievement.category].push(achievement);
        return groups;
    }, {} as Record<string, typeof achievements>);

    return (
        <div style={{ display: 'grid', gap: '20px' }}>
            {/* Achievement Summary */}
            <div style={{
                background: 'rgba(30, 41, 59, 0.8)',
                borderRadius: '12px',
                padding: '20px',
                border: '1px solid #374151'
            }}>
                <h3 style={{ color: '#ffd700', marginBottom: '20px', margin: '0 0 20px 0' }}>🏆 Achievement Progress</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                    <StatCard
                        title="Unlocked Achievements"
                        value={`${unlockedAchievements.length}/${achievements.length}`}
                        icon="🏆"
                        color="#10b981"
                    />
                    <StatCard
                        title="Completion Rate"
                        value={`${Math.round((unlockedAchievements.length / achievements.length) * 100)}%`}
                        icon="📊"
                        color="#3b82f6"
                    />
                    <StatCard
                        title="Next Achievement"
                        value={achievements.find(a => !a.unlocked)?.name || 'All Complete!'}
                        icon="🎯"
                        color="#f59e0b"
                    />
                </div>
            </div>

            {/* Achievement Categories */}
            {Object.entries(categoryGroups).map(([category, categoryAchievements]) => (
                <div key={category} style={{
                    background: 'rgba(30, 41, 59, 0.8)',
                    borderRadius: '12px',
                    padding: '20px',
                    border: '1px solid #374151'
                }}>
                    <h3 style={{ color: '#ffd700', marginBottom: '20px', margin: '0 0 20px 0' }}>
                        {category} Achievements
                    </h3>
                    <div style={{ display: 'grid', gap: '15px' }}>
                        {categoryAchievements.map(achievement => (
                            <div key={achievement.id} style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '15px',
                                backgroundColor: achievement.unlocked 
                                    ? 'rgba(16, 185, 129, 0.1)' 
                                    : 'rgba(55, 65, 81, 0.5)',
                                borderRadius: '8px',
                                border: achievement.unlocked ? '1px solid #10b981' : '1px solid #4b5563',
                                opacity: achievement.unlocked ? 1 : 0.7
                            }}>
                                <div style={{ fontSize: '2rem', marginRight: '15px' }}>
                                    {achievement.icon}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h4 style={{ 
                                        color: achievement.unlocked ? '#10b981' : '#ffd700', 
                                        marginBottom: '5px', 
                                        margin: '0 0 5px 0' 
                                    }}>
                                        {achievement.name}
                                    </h4>
                                    <p style={{ 
                                        color: '#94a3b8', 
                                        fontSize: '14px', 
                                        marginBottom: '8px', 
                                        margin: '0 0 8px 0' 
                                    }}>
                                        {achievement.description}
                                    </p>
                                    <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                                        Requirement: {achievement.requirement}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ 
                                        fontWeight: 'bold', 
                                        color: achievement.unlocked ? '#10b981' : '#f59e0b',
                                        marginBottom: '5px'
                                    }}>
                                        {achievement.unlocked ? 'UNLOCKED' : `${Math.round(achievement.progress)}%`}
                                    </div>
                                    {!achievement.unlocked && (
                                        <div style={{
                                            width: '100px',
                                            height: '6px',
                                            backgroundColor: '#374151',
                                            borderRadius: '3px',
                                            overflow: 'hidden'
                                        }}>
                                            <div style={{
                                                width: `${achievement.progress}%`,
                                                height: '100%',
                                                backgroundColor: '#f59e0b',
                                                transition: 'width 0.3s ease'
                                            }} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

// Time Patterns Tab Component  
export const TimePatternsTab: React.FC<{
    bossAnalytics: BossAnalytics[];
    formatTime: (minutes: number) => string;
}> = ({ bossAnalytics, formatTime }) => {
    // Calculate hourly patterns
    const hourlyStats = Array.from({ length: 24 }, (_, hour) => {
        const hourBattles = bossAnalytics.flatMap(boss => 
            boss.battleHistory.filter(battle => battle.battleDate.getHours() === hour)
        );
        
        return {
            hour,
            battles: hourBattles.length,
            victories: hourBattles.filter(b => b.result === 'victory').length,
            avgDuration: hourBattles.length > 0 ? hourBattles.reduce((sum, b) => sum + b.duration, 0) / hourBattles.length : 0,
            winRate: hourBattles.length > 0 ? (hourBattles.filter(b => b.result === 'victory').length / hourBattles.length) * 100 : 0
        };
    });

    const bestPerformanceHour = hourlyStats.reduce((best, current) => 
        current.winRate > best.winRate ? current : best, hourlyStats[0]
    );

    const mostActiveHour = hourlyStats.reduce((most, current) => 
        current.battles > most.battles ? current : most, hourlyStats[0]
    );

    // Calculate day-of-week patterns
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dailyStats = dayNames.map((dayName, dayIndex) => {
        const dayBattles = bossAnalytics.flatMap(boss => 
            boss.battleHistory.filter(battle => battle.battleDate.getDay() === dayIndex)
        );
        
        return {
            day: dayName,
            battles: dayBattles.length,
            victories: dayBattles.filter(b => b.result === 'victory').length,
            avgDuration: dayBattles.length > 0 ? dayBattles.reduce((sum, b) => sum + b.duration, 0) / dayBattles.length : 0,
            winRate: dayBattles.length > 0 ? (dayBattles.filter(b => b.result === 'victory').length / dayBattles.length) * 100 : 0
        };
    });

    return (
        <div style={{ display: 'grid', gap: '20px' }}>
            {/* Key Insights */}
            <div style={{
                background: 'rgba(30, 41, 59, 0.8)',
                borderRadius: '12px',
                padding: '20px',
                border: '1px solid #374151'
            }}>
                <h3 style={{ color: '#ffd700', marginBottom: '20px', margin: '0 0 20px 0' }}>⏰ Your Productivity Patterns</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
                    <div style={{
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid #10b981',
                        borderRadius: '8px',
                        padding: '15px',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '1.5rem', marginBottom: '10px' }}>🏆</div>
                        <h4 style={{ color: '#10b981', marginBottom: '5px', margin: '0 0 5px 0' }}>Best Performance</h4>
                        <div style={{ color: '#94a3b8' }}>
                            {bestPerformanceHour.hour}:00 - {bestPerformanceHour.hour + 1}:00
                        </div>
                        <div style={{ fontSize: '14px', color: '#9ca3af' }}>
                            {Math.round(bestPerformanceHour.winRate)}% win rate
                        </div>
                    </div>
                    
                    <div style={{
                        background: 'rgba(59, 130, 246, 0.1)',
                        border: '1px solid #3b82f6',
                        borderRadius: '8px',
                        padding: '15px',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '1.5rem', marginBottom: '10px' }}>📊</div>
                        <h4 style={{ color: '#3b82f6', marginBottom: '5px', margin: '0 0 5px 0' }}>Most Active</h4>
                        <div style={{ color: '#94a3b8' }}>
                            {mostActiveHour.hour}:00 - {mostActiveHour.hour + 1}:00
                        </div>
                        <div style={{ fontSize: '14px', color: '#9ca3af' }}>
                            {mostActiveHour.battles} battles
                        </div>
                    </div>
                </div>
            </div>

            {/* Hourly Activity Chart */}
            <div style={{
                background: 'rgba(30, 41, 59, 0.8)',
                borderRadius: '12px',
                padding: '20px',
                border: '1px solid #374151'
            }}>
                <h3 style={{ color: '#ffd700', marginBottom: '20px', margin: '0 0 20px 0' }}>📈 Hourly Activity Pattern</h3>
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(12, 1fr)', 
                    gap: '8px',
                    marginBottom: '20px' 
                }}>
                    {hourlyStats.map(stat => (
                        <div key={stat.hour} style={{
                            textAlign: 'center',
                            padding: '8px 4px',
                            backgroundColor: stat.battles > 0 ? 'rgba(59, 130, 246, 0.3)' : 'rgba(55, 65, 81, 0.5)',
                            borderRadius: '4px',
                            fontSize: '12px'
                        }}>
                            <div style={{ fontWeight: 'bold' }}>{stat.hour}:00</div>
                            <div style={{ color: '#9ca3af' }}>{stat.battles}</div>
                        </div>
                    ))}
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
                    {hourlyStats.filter(stat => stat.battles > 0).slice(0, 6).map(stat => (
                        <div key={stat.hour} style={{
                            padding: '10px',
                            backgroundColor: 'rgba(55, 65, 81, 0.5)',
                            borderRadius: '6px',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontWeight: 'bold' }}>{stat.hour}:00</div>
                            <div style={{ fontSize: '14px', color: '#94a3b8' }}>
                                {stat.battles} battles • {Math.round(stat.winRate)}% win rate
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Weekly Pattern */}
            <div style={{
                background: 'rgba(30, 41, 59, 0.8)',
                borderRadius: '12px',
                padding: '20px',
                border: '1px solid #374151'
            }}>
                <h3 style={{ color: '#ffd700', marginBottom: '20px', margin: '0 0 20px 0' }}>📅 Weekly Activity Pattern</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '15px' }}>
                    {dailyStats.map(day => (
                        <div key={day.day} style={{
                            padding: '15px',
                            backgroundColor: 'rgba(55, 65, 81, 0.5)',
                            borderRadius: '8px',
                            textAlign: 'center'
                        }}>
                            <h4 style={{ color: '#60a5fa', marginBottom: '10px', margin: '0 0 10px 0' }}>
                                {day.day.slice(0, 3)}
                            </h4>
                            <div style={{ fontSize: '14px', color: '#94a3b8', lineHeight: '1.5' }}>
                                <div><strong>{day.battles}</strong> battles</div>
                                <div><strong>{Math.round(day.winRate)}%</strong> win rate</div>
                                <div><strong>{formatTime(day.avgDuration)}</strong> avg</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
