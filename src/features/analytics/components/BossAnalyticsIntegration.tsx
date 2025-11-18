import React, { useState, useEffect } from 'react';
import { enhancedBossAnalytics } from '../../quests/services/enhancedBossAnalytics';
import { bossAchievementSystem } from '../../quests/systems/bossAchievementSystem';
import styles from './BossAnalyticsIntegration.module.css';

interface BossAnalyticsIntegrationProps {
    className?: string;
}

export const BossAnalyticsIntegration: React.FC<BossAnalyticsIntegrationProps> = ({
    className
}) => {
    const [analyticsData, setAnalyticsData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [timeframe, setTimeframe] = useState<'week' | 'month' | 'all'>('month');

    useEffect(() => {
        loadAnalyticsData();
    }, [timeframe]);

    const loadAnalyticsData = async () => {
        setLoading(true);
        try {
            const dashboard = enhancedBossAnalytics.getAnalyticsDashboard();
            const progressReport = enhancedBossAnalytics.generateProgressReport(timeframe);
            const achievementProgress = bossAchievementSystem.getAchievementProgress();
            
            setAnalyticsData({
                dashboard,
                progressReport,
                achievementProgress
            });
        } catch (error) {
            console.error('Failed to load boss analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDuration = (minutes: number): string => {
        if (minutes < 60) return `${Math.round(minutes)}m`;
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        return `${hours}h ${mins}m`;
    };

    const formatNumber = (num: number): string => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    };

    const renderBossMetrics = () => {
        if (!analyticsData?.dashboard?.overview) return null;

        const overview = analyticsData.dashboard.overview;

        return (
            <div className={styles.bossMetricsSection}>
                <h3 className={styles.sectionTitle}>
                    ⚔️ Boss Battle Analytics
                </h3>
                
                <div className={styles.metricsGrid}>
                    <div className={styles.metricCard}>
                        <div className={styles.metricIcon}>🎯</div>
                        <div className={styles.metricValue}>{overview.totalBattles}</div>
                        <div className={styles.metricLabel}>Total Battles</div>
                        <div className={styles.metricChange}>
                            {analyticsData.progressReport.battleCount} this {timeframe}
                        </div>
                    </div>

                    <div className={styles.metricCard}>
                        <div className={styles.metricIcon}>🏆</div>
                        <div className={styles.metricValue}>{Math.round(overview.winRate * 100)}%</div>
                        <div className={styles.metricLabel}>Win Rate</div>
                        <div className={`${styles.metricChange} ${overview.winRate > 0.7 ? styles.positive : styles.negative}`}>
                            {overview.winRate > 0.7 ? '↗️ Excellent' : '📈 Improving'}
                        </div>
                    </div>

                    <div className={styles.metricCard}>
                        <div className={styles.metricIcon}>⚡</div>
                        <div className={styles.metricValue}>{formatDuration(overview.averageBattleTime)}</div>
                        <div className={styles.metricLabel}>Avg Battle Time</div>
                        <div className={`${styles.metricChange} ${overview.averageBattleTime < 10 ? styles.positive : styles.neutral}`}>
                            {overview.averageBattleTime < 10 ? '🚀 Fast' : '⏱️ Steady'}
                        </div>
                    </div>

                    <div className={styles.metricCard}>
                        <div className={styles.metricIcon}>🔥</div>
                        <div className={styles.metricValue}>{overview.currentWinStreak}</div>
                        <div className={styles.metricLabel}>Current Streak</div>
                        <div className={styles.metricChange}>
                            Best: {overview.bestWinStreak}
                        </div>
                    </div>

                    <div className={styles.metricCard}>
                        <div className={styles.metricIcon}>💎</div>
                        <div className={styles.metricValue}>{Math.round(overview.efficiencyRating)}</div>
                        <div className={styles.metricLabel}>Efficiency</div>
                        <div className={`${styles.metricChange} ${overview.efficiencyRating > 80 ? styles.positive : styles.neutral}`}>
                            {overview.efficiencyRating > 80 ? '💎 Elite' : '📊 Good'}
                        </div>
                    </div>

                    <div className={styles.metricCard}>
                        <div className={styles.metricIcon}>💪</div>
                        <div className={styles.metricValue}>{formatNumber(analyticsData.dashboard.stats.totalDamageDealt)}</div>
                        <div className={styles.metricLabel}>Total Damage</div>
                        <div className={styles.metricChange}>
                            Lifetime dealt
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderAchievementSummary = () => {
        if (!analyticsData?.achievementProgress) return null;

        const progress = analyticsData.achievementProgress;
        const totalAchievements = bossAchievementSystem.getAllAchievements().size;
        const unlockedCount = progress.unlockedAchievements.length;
        const progressPercentage = Math.round((unlockedCount / totalAchievements) * 100);

        return (
            <div className={styles.achievementSummary}>
                <h4 className={styles.subsectionTitle}>🏆 Achievement Progress</h4>
                
                <div className={styles.achievementOverview}>
                    <div className={styles.achievementProgress}>
                        <div className={styles.progressCircle}>
                            <div className={styles.progressValue}>{progressPercentage}%</div>
                        </div>
                        <div className={styles.progressInfo}>
                            <div className={styles.progressLabel}>
                                {unlockedCount} / {totalAchievements} Unlocked
                            </div>
                            <div className={styles.progressSubtext}>
                                {progress.specialTitles.length} special titles earned
                            </div>
                        </div>
                    </div>

                    <div className={styles.achievementStats}>
                        <div className={styles.achievementStat}>
                            <div className={styles.statIcon}>⚔️</div>
                            <div className={styles.statText}>
                                <div className={styles.statValue}>{progress.totalBossesDefeated}</div>
                                <div className={styles.statLabel}>Bosses Defeated</div>
                            </div>
                        </div>
                        
                        <div className={styles.achievementStat}>
                            <div className={styles.statIcon}>⏱️</div>
                            <div className={styles.statText}>
                                <div className={styles.statValue}>{formatDuration(progress.totalBattleTime)}</div>
                                <div className={styles.statLabel}>Battle Time</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderPersonalityBreakdown = () => {
        if (!analyticsData?.achievementProgress) return null;

        const personalityMastery = analyticsData.achievementProgress.personalityMastery;
        
        const personalities = [
            { name: 'Aggressive', icon: '⚔️', key: 'aggressive', color: '#ef4444' },
            { name: 'Defensive', icon: '🛡️', key: 'defensive', color: '#10b981' },
            { name: 'Tactical', icon: '🧠', key: 'tactical', color: '#3b82f6' },
            { name: 'Chaotic', icon: '🌪️', key: 'chaotic', color: '#8b5cf6' },
            { name: 'Counter', icon: '↩️', key: 'counter', color: '#f97316' },
            { name: 'Endurance', icon: '⏳', key: 'endurance', color: '#64748b' }
        ];

        const victories = Array.from(personalityMastery.values()).map(v => typeof v === 'number' ? v : 0);
        const maxVictories = victories.length > 0 ? Math.max(...victories, 1) : 1;

        return (
            <div className={styles.personalityBreakdown}>
                <h4 className={styles.subsectionTitle}>🎭 Personality Mastery</h4>
                
                <div className={styles.personalityGrid}>
                    {personalities.map(personality => {
                        const victories = personalityMastery.get(personality.key as any) || 0;
                        const percentage = (victories / maxVictories) * 100;
                        
                        return (
                            <div key={personality.key} className={styles.personalityItem}>
                                <div className={styles.personalityHeader}>
                                    <span className={styles.personalityIcon}>{personality.icon}</span>
                                    <span className={styles.personalityName}>{personality.name}</span>
                                </div>
                                
                                <div className={styles.personalityBar}>
                                    <div 
                                        className={styles.personalityFill}
                                        style={{ 
                                            width: `${percentage}%`,
                                            backgroundColor: personality.color 
                                        }}
                                    />
                                </div>
                                
                                <div className={styles.personalityVictories}>
                                    {victories} victories
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderTimeframeSelector = () => {
        const timeframes = [
            { key: 'week', label: 'This Week' },
            { key: 'month', label: 'This Month' },
            { key: 'all', label: 'All Time' }
        ];

        return (
            <div className={styles.timeframeSelector}>
                {timeframes.map(tf => (
                    <button
                        key={tf.key}
                        className={`${styles.timeframeButton} ${timeframe === tf.key ? styles.active : ''}`}
                        onClick={() => setTimeframe(tf.key as any)}
                    >
                        {tf.label}
                    </button>
                ))}
            </div>
        );
    };

    const renderInsightsSummary = () => {
        if (!analyticsData?.dashboard?.insights) return null;

        const insights = analyticsData.dashboard.insights;
        const topInsights = [
            ...insights.strengths.slice(0, 2).map((s: string) => ({ type: 'strength', text: s })),
            ...insights.weaknesses.slice(0, 1).map((w: string) => ({ type: 'weakness', text: w })),
            ...insights.recommendations.slice(0, 1).map((r: string) => ({ type: 'recommendation', text: r }))
        ];

        return (
            <div className={styles.insightsSummary}>
                <h4 className={styles.subsectionTitle}>🧠 AI Insights</h4>
                
                <div className={styles.insightsList}>
                    {topInsights.map((insight, index) => (
                        <div key={index} className={`${styles.insightItem} ${styles[insight.type]}`}>
                            <div className={styles.insightIcon}>
                                {insight.type === 'strength' ? '💪' : 
                                 insight.type === 'weakness' ? '🎯' : '💡'}
                            </div>
                            <div className={styles.insightText}>{insight.text}</div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className={`${styles.bossAnalyticsIntegration} ${className}`}>
                <div className={styles.loading}>Loading boss analytics...</div>
            </div>
        );
    }

    return (
        <div className={`${styles.bossAnalyticsIntegration} ${className}`}>
            {renderTimeframeSelector()}
            {renderBossMetrics()}
            
            <div className={styles.twoColumnLayout}>
                <div className={styles.leftColumn}>
                    {renderAchievementSummary()}
                    {renderInsightsSummary()}
                </div>
                <div className={styles.rightColumn}>
                    {renderPersonalityBreakdown()}
                </div>
            </div>
        </div>
    );
};
