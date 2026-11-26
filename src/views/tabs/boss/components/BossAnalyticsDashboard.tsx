import React, { useState, useEffect } from 'react';
import { enhancedBossAnalytics } from '../../../../features/quests/services/enhancedBossAnalytics';
import { bossAchievementSystem } from '../../../../features/quests/systems/bossAchievementSystem';
import styles from '../BossBattleStyles.module.css';

interface BossAnalyticsDashboardProps {
    timeframe?: 'week' | 'month' | 'all';
}

export const BossAnalyticsDashboard: React.FC<BossAnalyticsDashboardProps> = ({
    timeframe = 'all'
}) => {
    const [dashboardData, setDashboardData] = useState<any>(null);
    const [selectedView, setSelectedView] = useState<'overview' | 'performance' | 'insights'>('overview');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboardData();
    }, [timeframe]);

    const loadDashboardData = async () => {
        setLoading(true);
        try {
            const data = enhancedBossAnalytics.getAnalyticsDashboard();
            setDashboardData(data);
        } catch (error) {
            console.error('Failed to load analytics dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDuration = (minutes: number): string => {
        if (minutes < 60) {
            return `${Math.round(minutes)}m`;
        }
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        return `${hours}h ${mins}m`;
    };

    const formatNumber = (num: number): string => {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    };

    const renderOverviewStats = () => {
        if (!dashboardData?.overview) return null;

        const overview = dashboardData.overview;

        return (
            <div className={styles.analyticsGrid}>
                <div className={styles.analyticsCard}>
                    <h3>🎯 Total Battles</h3>
                    <div className={styles.statValue}>{overview.totalBattles}</div>
                    <div className={styles.statLabel}>Lifetime battles fought</div>
                </div>

                <div className={styles.analyticsCard}>
                    <h3>🏆 Win Rate</h3>
                    <div className={styles.statValue}>{Math.round(overview.winRate * 100)}%</div>
                    <div className={styles.statLabel}>Overall victory percentage</div>
                    <div className={`${styles.statChange} ${overview.winRate > 0.7 ? styles.positive : styles.negative}`}>
                        {overview.winRate > 0.7 ? '🔥 Excellent' : 'Room for improvement'}
                    </div>
                </div>

                <div className={styles.analyticsCard}>
                    <h3>⚡ Average Battle Time</h3>
                    <div className={styles.statValue}>{formatDuration(overview.averageBattleTime)}</div>
                    <div className={styles.statLabel}>Time per battle</div>
                    <div className={`${styles.statChange} ${overview.averageBattleTime < 10 ? styles.positive : styles.neutral}`}>
                        {overview.averageBattleTime < 10 ? '🚀 Fast finisher' : '⏱️ Take your time'}
                    </div>
                </div>

                <div className={styles.analyticsCard}>
                    <h3>⏳ Total Play Time</h3>
                    <div className={styles.statValue}>{formatDuration(overview.totalPlayTime)}</div>
                    <div className={styles.statLabel}>Time invested in battles</div>
                </div>

                <div className={styles.analyticsCard}>
                    <h3>👹 Bosses Defeated</h3>
                    <div className={styles.statValue}>{overview.bossesDefeated}</div>
                    <div className={styles.statLabel}>Total victories</div>
                </div>

                <div className={styles.analyticsCard}>
                    <h3>🔥 Current Streak</h3>
                    <div className={styles.statValue}>{overview.currentWinStreak}</div>
                    <div className={styles.statLabel}>Consecutive wins</div>
                    <div className={styles.statChange}>
                        Best: {overview.bestWinStreak} wins
                    </div>
                </div>

                <div className={styles.analyticsCard}>
                    <h3>⚡ Efficiency Rating</h3>
                    <div className={styles.statValue}>{Math.round(overview.efficiencyRating)}</div>
                    <div className={styles.statLabel}>Combat effectiveness score</div>
                    <div className={`${styles.statChange} ${overview.efficiencyRating > 80 ? styles.positive : styles.neutral}`}>
                        {overview.efficiencyRating > 80 ? '💎 Elite performer' : '📈 Keep improving'}
                    </div>
                </div>

                <div className={styles.analyticsCard}>
                    <h3>💪 Total Damage</h3>
                    <div className={styles.statValue}>{formatNumber(dashboardData.stats.totalDamageDealt)}</div>
                    <div className={styles.statLabel}>Lifetime damage dealt</div>
                </div>
            </div>
        );
    };

    const renderPersonalityMastery = () => {
        const achievementProgress = bossAchievementSystem.getAchievementProgress();
        const personalityMastery = achievementProgress.personalityMastery;

        const personalities = [
            { name: 'Aggressive', icon: '⚔️', key: 'aggressive' },
            { name: 'Defensive', icon: '🛡️', key: 'defensive' },
            { name: 'Tactical', icon: '🧠', key: 'tactical' },
            { name: 'Chaotic', icon: '🌪️', key: 'chaotic' },
            { name: 'Counter', icon: '↩️', key: 'counter' },
            { name: 'Endurance', icon: '⏳', key: 'endurance' }
        ];

        return (
            <div className={styles.analyticsCard}>
                <h3>🎭 Personality Mastery</h3>
                <div className={styles.personalityMasteryGrid}>
                    {personalities.map(personality => {
                        const victories = personalityMastery.get(personality.key as any) || 0;
                        return (
                            <div key={personality.key} className={styles.personalityMasteryItem}>
                                <div className={styles.personalityIcon}>{personality.icon}</div>
                                <div className={styles.personalityName}>{personality.name}</div>
                                <div className={styles.personalityProgress}>{victories} wins</div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderInsights = () => {
        if (!dashboardData?.insights) return null;

        const insights = dashboardData.insights;

        return (
            <div className={styles.insightsSection}>
                <h3>🧠 AI-Powered Insights</h3>
                <div className={styles.insightsList}>
                    {/* Strengths */}
                    {insights.strengths.map((strength: string, index: number) => (
                        <div key={`strength-${index}`} className={`${styles.insightItem} ${styles.strength}`}>
                            <div className={styles.insightTitle}>💪 Strength: {strength}</div>
                            <div className={styles.insightDescription}>
                                Keep leveraging this advantage in future battles.
                            </div>
                        </div>
                    ))}

                    {/* Weaknesses */}
                    {insights.weaknesses.map((weakness: string, index: number) => (
                        <div key={`weakness-${index}`} className={`${styles.insightItem} ${styles.weakness}`}>
                            <div className={styles.insightTitle}>🎯 Area for Improvement: {weakness}</div>
                            <div className={styles.insightDescription}>
                                Focus training on this aspect to improve overall performance.
                            </div>
                        </div>
                    ))}

                    {/* Recommendations */}
                    {insights.recommendations.map((rec: string, index: number) => (
                        <div key={`rec-${index}`} className={`${styles.insightItem} ${styles.recommendation}`}>
                            <div className={styles.insightTitle}>💡 Recommendation: {rec}</div>
                            <div className={styles.insightDescription}>
                                Strategic advice based on your battle patterns.
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderProgressReport = () => {
        const progressReport = enhancedBossAnalytics.generateProgressReport(timeframe);
        
        return (
            <div className={styles.analyticsCard}>
                <h3>📈 Progress Report ({timeframe})</h3>
                <div className={styles.progressStats}>
                    <div className={styles.statItem}>
                        <div className={styles.statLabel}>Battles This {timeframe}</div>
                        <div className={styles.statValue}>{progressReport.battleCount}</div>
                    </div>
                    <div className={styles.statItem}>
                        <div className={styles.statLabel}>Win Rate</div>
                        <div className={styles.statValue}>{Math.round(progressReport.winRate * 100)}%</div>
                    </div>
                    <div className={styles.statItem}>
                        <div className={styles.statLabel}>Average Time</div>
                        <div className={styles.statValue}>{formatDuration(progressReport.averageBattleTime)}</div>
                    </div>
                </div>
            </div>
        );
    };

    const renderTabNavigation = () => {
        const tabs = [
            { key: 'overview', label: '📊 Overview', icon: '📊' },
            { key: 'performance', label: '📈 Performance', icon: '📈' },
            { key: 'insights', label: '🧠 Insights', icon: '🧠' }
        ];

        return (
            <div className={styles.tabNavigation}>
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        className={`${styles.tabButton} ${selectedView === tab.key ? styles.active : ''}`}
                        onClick={() => setSelectedView(tab.key as any)}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>
        );
    };

    if (loading) {
        return <div className={styles.loading}>Loading analytics dashboard...</div>;
    }

    return (
        <div className={styles.analyticsDashboard}>
            {renderTabNavigation()}
            
            {selectedView === 'overview' && (
                <>
                    {renderOverviewStats()}
                    {renderPersonalityMastery()}
                    {renderProgressReport()}
                </>
            )}

            {selectedView === 'performance' && (
                <div>
                    {renderOverviewStats()}
                    <div className={styles.analyticsCard}>
                        <h3>📊 Performance Metrics</h3>
                        <p>Detailed performance charts and trends would be displayed here.</p>
                        <div className={styles.chartPlaceholder}>
                            📈 Win Rate Over Time<br/>
                            📊 Battle Duration Trends<br/>
                            ⚡ Efficiency Improvements<br/>
                            🎯 Skill Progression
                        </div>
                    </div>
                </div>
            )}

            {selectedView === 'insights' && (
                <>
                    {renderInsights()}
                    <div className={styles.analyticsCard}>
                        <h3>🔮 Advanced Analytics</h3>
                        <p>AI-powered pattern recognition and strategic recommendations.</p>
                        <div className={styles.insightsList}>
                            <div className={`${styles.insightItem} ${styles.recommendation}`}>
                                <div className={styles.insightTitle}>🎯 Optimal Battle Times</div>
                                <div className={styles.insightDescription}>
                                    You perform best during late morning hours. Schedule difficult battles accordingly.
                                </div>
                            </div>
                            <div className={`${styles.insightItem} ${styles.recommendation}`}>
                                <div className={styles.insightTitle}>🧠 Learning Patterns</div>
                                <div className={styles.insightDescription}>
                                    You adapt quickly to new boss personalities, showing strong tactical intelligence.
                                </div>
                            </div>
                            <div className={`${styles.insightItem} ${styles.recommendation}`}>
                                <div className={styles.insightTitle}>⚔️ Combat Style</div>
                                <div className={styles.insightDescription}>
                                    Aggressive playstyle with high damage output. Consider defensive training for balance.
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
