import React, { useState, useEffect } from 'react';
import { realTimeAnalyticsService, DetailedAnalytics, AnalyticsListener } from '../services/realTimeAnalyticsService';
import styles from './RealTimeAnalyticsDashboard.module.css';

interface RealTimeAnalyticsDashboardProps {
    className?: string;
}

export const RealTimeAnalyticsDashboard: React.FC<RealTimeAnalyticsDashboardProps> = ({ className = '' }) => {
    const [analytics, setAnalytics] = useState<DetailedAnalytics | null>(null);
    const [selectedTab, setSelectedTab] = useState<'overview' | 'performance' | 'insights' | 'battles'>('overview');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Initial load
        const initialData = realTimeAnalyticsService.getDetailedAnalytics();
        setAnalytics(initialData);
        setIsLoading(false);

        // Subscribe to real-time updates
        const handleAnalyticsUpdate: AnalyticsListener = (_, detailedData) => {
            setAnalytics(detailedData);
        };

        realTimeAnalyticsService.addListener(handleAnalyticsUpdate);

        return () => {
            realTimeAnalyticsService.removeListener(handleAnalyticsUpdate);
        };
    }, []);

    if (isLoading || !analytics) {
        return (
            <div className={`${styles.dashboard} ${className}`}>
                <div className={styles.loadingState}>
                    <div className={styles.loadingSpinner}>📊</div>
                    <div className={styles.loadingText}>Loading analytics...</div>
                </div>
            </div>
        );
    }

    const renderTabNavigation = () => {
        const tabs = [
            { id: 'overview', label: '📊 Overview', icon: '📊' },
            { id: 'performance', label: '🎯 Performance', icon: '🎯' },
            { id: 'insights', label: '💡 Insights', icon: '💡' },
            { id: 'battles', label: '⚔️ Battles', icon: '⚔️' }
        ];

        return (
            <div className={styles.tabNavigation}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`${styles.tabButton} ${selectedTab === tab.id ? styles.active : ''}`}
                        onClick={() => setSelectedTab(tab.id as any)}
                    >
                        <span className={styles.tabIcon}>{tab.icon}</span>
                        <span className={styles.tabLabel}>{tab.label}</span>
                    </button>
                ))}
            </div>
        );
    };

    const renderOverviewTab = () => {
        const { session, daily, performance } = analytics;
        
        return (
            <div className={styles.overviewTab}>
                {/* Current Session */}
                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>🕐 Current Session</h3>
                    <div className={styles.metricsGrid}>
                        <div className={styles.metricCard}>
                            <div className={styles.metricIcon}>⏱️</div>
                            <div className={styles.metricContent}>
                                <div className={styles.metricValue}>
                                    {Math.round(session.totalFocusTime / 60)}m
                                </div>
                                <div className={styles.metricLabel}>Focus Time</div>
                            </div>
                        </div>

                        <div className={styles.metricCard}>
                            <div className={styles.metricIcon}>✅</div>
                            <div className={styles.metricContent}>
                                <div className={styles.metricValue}>{session.tasksCompleted}</div>
                                <div className={styles.metricLabel}>Tasks Completed</div>
                            </div>
                        </div>

                        <div className={styles.metricCard}>
                            <div className={styles.metricIcon}>🔥</div>
                            <div className={styles.metricContent}>
                                <div className={styles.metricValue}>{session.currentStreak}</div>
                                <div className={styles.metricLabel}>Current Streak</div>
                            </div>
                        </div>

                        <div className={styles.metricCard}>
                            <div className={styles.metricIcon}>📈</div>
                            <div className={styles.metricContent}>
                                <div className={styles.metricValue}>{session.productivityScore}%</div>
                                <div className={styles.metricLabel}>Productivity Score</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Daily Summary */}
                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>📅 Today's Summary</h3>
                    <div className={styles.dailySummary}>
                        <div className={styles.summaryRow}>
                            <span className={styles.summaryLabel}>Work Time</span>
                            <span className={styles.summaryValue}>{Math.round(daily.totalWorkTime / 60)}m</span>
                        </div>
                        <div className={styles.summaryRow}>
                            <span className={styles.summaryLabel}>Bosses Defeated</span>
                            <span className={styles.summaryValue}>{daily.bossesDefeated}</span>
                        </div>
                        <div className={styles.summaryRow}>
                            <span className={styles.summaryLabel}>Materials Collected</span>
                            <span className={styles.summaryValue}>{daily.materialsCollected}</span>
                        </div>
                        <div className={styles.summaryRow}>
                            <span className={styles.summaryLabel}>Equipment Crafted</span>
                            <span className={styles.summaryValue}>{daily.equipmentCrafted}</span>
                        </div>
                        <div className={styles.summaryRow}>
                            <span className={styles.summaryLabel}>Peak Hour</span>
                            <span className={styles.summaryValue}>
                                {daily.peakProductivityHour > 0 ? `${daily.peakProductivityHour}:00` : 'N/A'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Active Status */}
                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>🔴 Live Status</h3>
                    <div className={styles.liveStatus}>
                        <div className={styles.statusItem}>
                            <div className={styles.statusIcon}>🎮</div>
                            <div className={styles.statusContent}>
                                <div className={styles.statusLabel}>Active Boss</div>
                                <div className={styles.statusValue}>
                                    {session.activeBossId ? 'In Battle' : 'No Active Boss'}
                                </div>
                            </div>
                        </div>

                        <div className={styles.statusItem}>
                            <div className={styles.statusIcon}>⚔️</div>
                            <div className={styles.statusContent}>
                                <div className={styles.statusLabel}>Equipment</div>
                                <div className={styles.statusValue}>
                                    {session.equippedGear.length} items equipped
                                </div>
                            </div>
                        </div>

                        <div className={styles.statusItem}>
                            <div className={styles.statusIcon}>🎲</div>
                            <div className={styles.statusContent}>
                                <div className={styles.statusLabel}>Active Events</div>
                                <div className={styles.statusValue}>
                                    {session.activeEvents.length} events
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderPerformanceTab = () => {
        const { performance } = analytics;
        
        const performanceMetrics = [
            { name: 'Focus', value: performance.focusScore, icon: '🎯' },
            { name: 'Endurance', value: performance.enduranceScore, icon: '💪' },
            { name: 'Creativity', value: performance.creativityScore, icon: '🎨' },
            { name: 'Organization', value: performance.organizationScore, icon: '📋' }
        ];

        return (
            <div className={styles.performanceTab}>
                {/* Overall Score */}
                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>🏆 Overall Performance</h3>
                    <div className={styles.overallScore}>
                        <div className={styles.scoreCircle}>
                            <div className={styles.scoreValue}>
                                {Math.round(performance.overallProductivity)}%
                            </div>
                            <div className={styles.scoreLabel}>Overall</div>
                        </div>
                    </div>
                </div>

                {/* Individual Metrics */}
                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>📊 Individual Metrics</h3>
                    <div className={styles.performanceGrid}>
                        {performanceMetrics.map(metric => (
                            <div key={metric.name} className={styles.performanceCard}>
                                <div className={styles.performanceHeader}>
                                    <span className={styles.performanceIcon}>{metric.icon}</span>
                                    <span className={styles.performanceName}>{metric.name}</span>
                                </div>
                                <div className={styles.performanceBar}>
                                    <div 
                                        className={styles.performanceFill}
                                        style={{ 
                                            width: `${metric.value}%`,
                                            backgroundColor: getPerformanceColor(metric.value)
                                        }}
                                    />
                                </div>
                                <div className={styles.performanceValue}>{Math.round(metric.value)}%</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Strengths & Areas */}
                <div className={styles.section}>
                    <div className={styles.strengthsGrid}>
                        <div className={styles.strengthsCard}>
                            <h4 className={styles.cardTitle}>💪 Strengths</h4>
                            <div className={styles.itemsList}>
                                {performance.strengths.length > 0 ? (
                                    performance.strengths.map((strength, index) => (
                                        <div key={index} className={styles.strengthItem}>
                                            ✅ {strength}
                                        </div>
                                    ))
                                ) : (
                                    <div className={styles.emptyState}>Keep working to build your strengths!</div>
                                )}
                            </div>
                        </div>

                        <div className={styles.improvementCard}>
                            <h4 className={styles.cardTitle}>🎯 Growth Areas</h4>
                            <div className={styles.itemsList}>
                                {performance.improvementAreas.length > 0 ? (
                                    performance.improvementAreas.map((area, index) => (
                                        <div key={index} className={styles.improvementItem}>
                                            📈 {area}
                                        </div>
                                    ))
                                ) : (
                                    <div className={styles.emptyState}>You're doing great across all areas!</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderInsightsTab = () => {
        const { insights } = analytics;
        
        return (
            <div className={styles.insightsTab}>
                {/* Productivity Tips */}
                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>💡 Efficiency Tips</h3>
                    <div className={styles.tipsList}>
                        {insights.efficiencyTips.length > 0 ? (
                            insights.efficiencyTips.map((tip, index) => (
                                <div key={index} className={styles.tipItem}>
                                    <div className={styles.tipIcon}>💡</div>
                                    <div className={styles.tipText}>{tip}</div>
                                </div>
                            ))
                        ) : (
                            <div className={styles.emptyTips}>
                                <div className={styles.emptyIcon}>🌟</div>
                                <div className={styles.emptyText}>You're doing great! Keep up the good work.</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Personalized Recommendations */}
                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>🎯 Personalized Recommendations</h3>
                    <div className={styles.recommendationsList}>
                        {insights.personalizedRecommendations.length > 0 ? (
                            insights.personalizedRecommendations.map((rec, index) => (
                                <div key={index} className={styles.recommendationItem}>
                                    <div className={styles.recommendationIcon}>🎯</div>
                                    <div className={styles.recommendationText}>{rec}</div>
                                </div>
                            ))
                        ) : (
                            <div className={styles.emptyRecommendations}>
                                <div className={styles.emptyIcon}>🚀</div>
                                <div className={styles.emptyText}>Keep working to unlock personalized insights!</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Patterns Analysis */}
                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>📈 Patterns & Trends</h3>
                    <div className={styles.patternsGrid}>
                        <div className={styles.patternCard}>
                            <h4 className={styles.cardTitle}>⏰ Optimal Hours</h4>
                            <div className={styles.hoursList}>
                                {insights.optimalWorkHours.length > 0 ? (
                                    insights.optimalWorkHours.map(hour => (
                                        <span key={hour} className={styles.hourBadge}>
                                            {hour}:00
                                        </span>
                                    ))
                                ) : (
                                    <div className={styles.emptyState}>Building data...</div>
                                )}
                            </div>
                        </div>

                        <div className={styles.patternCard}>
                            <h4 className={styles.cardTitle}>🚨 Distractions</h4>
                            <div className={styles.distractionsList}>
                                {insights.distractionPatterns.length > 0 ? (
                                    insights.distractionPatterns.map((pattern, index) => (
                                        <div key={index} className={styles.distractionItem}>
                                            ⚠️ {pattern}
                                        </div>
                                    ))
                                ) : (
                                    <div className={styles.emptyState}>Great focus! No patterns detected.</div>
                                )}
                            </div>
                        </div>

                        <div className={styles.patternCard}>
                            <h4 className={styles.cardTitle}>🔥 Motivation</h4>
                            <div className={styles.motivationList}>
                                {insights.motivationTriggers.length > 0 ? (
                                    insights.motivationTriggers.map((trigger, index) => (
                                        <div key={index} className={styles.motivationItem}>
                                            💪 {trigger}
                                        </div>
                                    ))
                                ) : (
                                    <div className={styles.emptyState}>Discovering your motivators...</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderBattlesTab = () => {
        const { battle } = analytics;
        
        const winRate = battle.totalBattles > 0 ? (battle.victories / battle.totalBattles) * 100 : 0;
        
        return (
            <div className={styles.battlesTab}>
                {/* Battle Stats */}
                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>⚔️ Battle Statistics</h3>
                    <div className={styles.battleStatsGrid}>
                        <div className={styles.battleStatCard}>
                            <div className={styles.statIcon}>🎮</div>
                            <div className={styles.statValue}>{battle.totalBattles}</div>
                            <div className={styles.statLabel}>Total Battles</div>
                        </div>

                        <div className={styles.battleStatCard}>
                            <div className={styles.statIcon}>🏆</div>
                            <div className={styles.statValue}>{battle.victories}</div>
                            <div className={styles.statLabel}>Victories</div>
                        </div>

                        <div className={styles.battleStatCard}>
                            <div className={styles.statIcon}>📊</div>
                            <div className={styles.statValue}>{Math.round(winRate)}%</div>
                            <div className={styles.statLabel}>Win Rate</div>
                        </div>

                        <div className={styles.battleStatCard}>
                            <div className={styles.statIcon}>⏱️</div>
                            <div className={styles.statValue}>{Math.round(battle.averageBattleTime)}s</div>
                            <div className={styles.statLabel}>Avg Time</div>
                        </div>
                    </div>
                </div>

                {/* Equipment & Rewards */}
                <div className={styles.section}>
                    <div className={styles.battleDetailsGrid}>
                        <div className={styles.battleDetailCard}>
                            <h4 className={styles.cardTitle}>⚔️ Equipment</h4>
                            <div className={styles.equipmentInfo}>
                                <div className={styles.equipmentItem}>
                                    <span className={styles.equipmentLabel}>Most Used:</span>
                                    <span className={styles.equipmentValue}>
                                        {battle.mostUsedEquipment || 'None'}
                                    </span>
                                </div>
                                <div className={styles.equipmentItem}>
                                    <span className={styles.equipmentLabel}>Crafting Level:</span>
                                    <span className={styles.equipmentValue}>{battle.craftingLevel}</span>
                                </div>
                            </div>
                        </div>

                        <div className={styles.battleDetailCard}>
                            <h4 className={styles.cardTitle}>💎 Rewards</h4>
                            <div className={styles.rewardsInfo}>
                                <div className={styles.rewardItem}>
                                    <span className={styles.rewardLabel}>Total Damage:</span>
                                    <span className={styles.rewardValue}>{battle.damageDealtTotal}</span>
                                </div>
                                <div className={styles.rewardItem}>
                                    <span className={styles.rewardLabel}>Materials Earned:</span>
                                    <span className={styles.rewardValue}>{battle.materialsEarned}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Progress Indicators */}
                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>📈 Progress Tracking</h3>
                    <div className={styles.progressCards}>
                        <div className={styles.progressCard}>
                            <div className={styles.progressHeader}>
                                <span className={styles.progressIcon}>🎯</span>
                                <span className={styles.progressTitle}>Battle Mastery</span>
                            </div>
                            <div className={styles.progressBar}>
                                <div 
                                    className={styles.progressFill}
                                    style={{ width: `${Math.min(winRate, 100)}%` }}
                                />
                            </div>
                            <div className={styles.progressText}>
                                {winRate < 50 ? 'Learning the ropes' : 
                                 winRate < 80 ? 'Getting stronger' : 'Battle master!'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const getPerformanceColor = (value: number): string => {
        if (value >= 80) return '#10b981';
        if (value >= 60) return '#f59e0b';
        if (value >= 40) return '#f97316';
        return '#ef4444';
    };

    return (
        <div className={`${styles.dashboard} ${className}`}>
            <div className={styles.dashboardHeader}>
                <h2 className={styles.dashboardTitle}>📊 Real-Time Analytics</h2>
                <div className={styles.liveIndicator}>
                    <span className={styles.liveDot}></span>
                    Live Updates
                </div>
            </div>

            {renderTabNavigation()}

            <div className={styles.tabContent}>
                {selectedTab === 'overview' && renderOverviewTab()}
                {selectedTab === 'performance' && renderPerformanceTab()}
                {selectedTab === 'insights' && renderInsightsTab()}
                {selectedTab === 'battles' && renderBattlesTab()}
            </div>
        </div>
    );
};
