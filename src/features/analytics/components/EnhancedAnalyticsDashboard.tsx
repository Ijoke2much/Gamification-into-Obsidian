// Enhanced Analytics Dashboard - Comprehensive insights and motivation
import React, { useState, useEffect } from 'react';
import { 
    ComprehensiveAnalyticsEngine, 
    ComprehensiveAnalytics,
    AnalyticsInsight,
    AnalyticsPrediction,
    TrendAnalysis 
} from '../utils/comprehensiveAnalytics';
import { CircularProgressBar } from '../../../shared/components/ui/CircularProgressBar';
import { Card } from '../../../shared/components/ui/Card';
import styles from './EnhancedAnalyticsDashboard.module.css';

interface EnhancedAnalyticsDashboardProps {
    plugin: any; // GamifiedObsidianPlugin type
    className?: string;
    view?: 'overview' | 'detailed' | 'trends' | 'insights';
}

export const EnhancedAnalyticsDashboard: React.FC<EnhancedAnalyticsDashboardProps> = ({
    plugin,
    className = '',
    view = 'overview'
}) => {
    const [analytics, setAnalytics] = useState<ComprehensiveAnalytics | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedTimeframe, setSelectedTimeframe] = useState<'today' | 'week' | 'month' | 'alltime'>('week');
    const [selectedInsightCategory, setSelectedInsightCategory] = useState<string>('all');
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

    useEffect(() => {
        const loadAnalytics = async () => {
            setIsLoading(true);
            try {
                const data = await ComprehensiveAnalyticsEngine.generateComprehensiveAnalytics(plugin.app.vault);
                setAnalytics(data);
                setLastUpdate(new Date());
            } catch (error) {
                console.error('Failed to load comprehensive analytics:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadAnalytics();

        // Auto-refresh every 10 minutes
        const interval = setInterval(loadAnalytics, 10 * 60 * 1000);
        return () => clearInterval(interval);
    }, [plugin]);

    const getCurrentTimeframeData = () => {
        if (!analytics) return null;
        
        switch (selectedTimeframe) {
            case 'today': return analytics.today;
            case 'week': return analytics.thisWeek;
            case 'month': return analytics.thisMonth;
            case 'alltime': return analytics.allTime;
            default: return analytics.thisWeek;
        }
    };

    const renderPerformanceOverview = () => {
        if (!analytics) return null;

        const { performance, comparisons } = analytics;
        const timeframeData = getCurrentTimeframeData();

        return (
            <div className={styles.performanceOverview}>
                <div className={styles.metricsGrid}>
                    {/* Primary Performance Score */}
                    <Card className={styles.primaryScoreCard}>
                        <div className={styles.scoreHeader}>
                            <h3>Performance Score</h3>
                            <span className={styles.timeframe}>{selectedTimeframe}</span>
                        </div>
                        <div className={styles.scoreDisplay}>
                            <CircularProgressBar 
                                percent={performance.personalBenchmark} 
                                radius={50} 
                                stroke={8}
                            />
                            <div className={styles.scoreDetails}>
                                <div className={styles.scoreValue}>{performance.personalBenchmark}%</div>
                                <div className={styles.scoreLabel}>vs Personal Best</div>
                            </div>
                        </div>
                        <div className={styles.improvementRate}>
                            <span className={styles.improvementIcon}>📈</span>
                            <span>+{performance.improvementRate}% improvement rate</span>
                        </div>
                    </Card>

                    {/* Key Metrics */}
                    <Card className={styles.metricsCard}>
                        <h4>Key Metrics</h4>
                        <div className={styles.metricsList}>
                            <div className={styles.metricItem}>
                                <span className={styles.metricIcon}>✅</span>
                                <div className={styles.metricInfo}>
                                    <span className={styles.metricLabel}>Task Efficiency</span>
                                    <span className={styles.metricValue}>
                                        {performance.taskEfficiency.toFixed(1)} tasks/hour
                                    </span>
                                </div>
                            </div>
                            <div className={styles.metricItem}>
                                <span className={styles.metricIcon}>🎯</span>
                                <div className={styles.metricInfo}>
                                    <span className={styles.metricLabel}>Focus Quality</span>
                                    <span className={styles.metricValue}>
                                        {performance.focusEfficiency}%
                                    </span>
                                </div>
                            </div>
                            <div className={styles.metricItem}>
                                <span className={styles.metricIcon}>🔄</span>
                                <div className={styles.metricInfo}>
                                    <span className={styles.metricLabel}>Habit Consistency</span>
                                    <span className={styles.metricValue}>
                                        {performance.habitConsistency}%
                                    </span>
                                </div>
                            </div>
                            <div className={styles.metricItem}>
                                <span className={styles.metricIcon}>⚖️</span>
                                <div className={styles.metricInfo}>
                                    <span className={styles.metricLabel}>Work-Life Balance</span>
                                    <span className={styles.metricValue}>
                                        {performance.balanceScore}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Comparisons */}
                    <Card className={styles.comparisonsCard}>
                        <h4>Performance vs Previous</h4>
                        <div className={styles.comparisonsList}>
                            <div className={styles.comparisonItem}>
                                <span className={styles.comparisonLabel}>vs Last Week</span>
                                <span className={`${styles.comparisonValue} ${comparisons.vsLastWeek.overall > 0 ? styles.positive : styles.negative}`}>
                                    {comparisons.vsLastWeek.overall > 0 ? '+' : ''}{comparisons.vsLastWeek.overall}%
                                </span>
                            </div>
                            <div className={styles.comparisonItem}>
                                <span className={styles.comparisonLabel}>vs Last Month</span>
                                <span className={`${styles.comparisonValue} ${comparisons.vsLastMonth.overall > 0 ? styles.positive : styles.negative}`}>
                                    {comparisons.vsLastMonth.overall > 0 ? '+' : ''}{comparisons.vsLastMonth.overall}%
                                </span>
                            </div>
                            <div className={styles.comparisonItem}>
                                <span className={styles.comparisonLabel}>Goal Progress</span>
                                <span className={styles.comparisonValue}>
                                    {comparisons.vsGoals.overallProgress}%
                                </span>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        );
    };

    const renderInsights = () => {
        if (!analytics) return null;

        const { insights } = analytics;
        const filteredInsights = selectedInsightCategory === 'all' 
            ? insights 
            : insights.filter(insight => insight.category === selectedInsightCategory);

        return (
            <div className={styles.insightsSection}>
                <div className={styles.insightsHeader}>
                    <h3>💡 Smart Insights</h3>
                    <select 
                        value={selectedInsightCategory}
                        onChange={(e) => setSelectedInsightCategory(e.target.value)}
                        className={styles.categoryFilter}
                    >
                        <option value="all">All Categories</option>
                        <option value="productivity">Productivity</option>
                        <option value="focus">Focus</option>
                        <option value="wellness">Wellness</option>
                        <option value="habits">Habits</option>
                        <option value="skills">Skills</option>
                        <option value="motivation">Motivation</option>
                    </select>
                </div>

                <div className={styles.insightsList}>
                    {filteredInsights.map((insight) => (
                        <Card key={insight.id} className={`${styles.insightCard} ${styles[insight.type]}`}>
                            <div className={styles.insightHeader}>
                                <div className={styles.insightTitle}>{insight.title}</div>
                                <div className={styles.insightMeta}>
                                    <span className={`${styles.impactBadge} ${styles[insight.impact]}`}>
                                        {insight.impact}
                                    </span>
                                    <span className={styles.confidence}>
                                        {insight.confidence}% confidence
                                    </span>
                                </div>
                            </div>
                            
                            <p className={styles.insightDescription}>{insight.description}</p>
                            
                            {insight.actionable && insight.suggestedActions && (
                                <div className={styles.suggestedActions}>
                                    <div className={styles.actionsLabel}>💫 Suggested Actions:</div>
                                    <ul className={styles.actionsList}>
                                        {insight.suggestedActions.map((action, index) => (
                                            <li key={index} className={styles.actionItem}>{action}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            
                            {insight.dataSupporting.length > 0 && (
                                <div className={styles.supportingData}>
                                    <div className={styles.dataLabel}>📊 Data Supporting:</div>
                                    <div className={styles.dataPoints}>
                                        {insight.dataSupporting.map((data, index) => (
                                            <span key={index} className={styles.dataPoint}>{data}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </Card>
                    ))}
                </div>
            </div>
        );
    };

    const renderPredictions = () => {
        if (!analytics) return null;

        const { predictions } = analytics;

        return (
            <div className={styles.predictionsSection}>
                <h3>🔮 Predictions & Forecasts</h3>
                <div className={styles.predictionsList}>
                    {predictions.map((prediction) => (
                        <Card key={prediction.id} className={styles.predictionCard}>
                            <div className={styles.predictionHeader}>
                                <div className={styles.predictionTitle}>{prediction.title}</div>
                                <div className={styles.predictionMeta}>
                                    <span className={styles.timeframe}>{prediction.timeframe}</span>
                                    <div className={styles.probability}>
                                        <span className={styles.probabilityValue}>{prediction.probability}%</span>
                                        <span className={styles.probabilityLabel}>probability</span>
                                    </div>
                                </div>
                            </div>
                            
                            <p className={styles.predictionDescription}>{prediction.description}</p>
                            
                            <div className={styles.predictionBasedOn}>
                                <div className={styles.basedOnLabel}>Based on:</div>
                                <div className={styles.basedOnList}>
                                    {prediction.basedOn.map((factor, index) => (
                                        <span key={index} className={styles.basedOnItem}>{factor}</span>
                                    ))}
                                </div>
                            </div>
                            
                            {prediction.recommendedActions.length > 0 && (
                                <div className={styles.recommendedActions}>
                                    <div className={styles.actionsLabel}>Recommended Actions:</div>
                                    <ul className={styles.actionsList}>
                                        {prediction.recommendedActions.map((action, index) => (
                                            <li key={index} className={styles.actionItem}>{action}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </Card>
                    ))}
                </div>
            </div>
        );
    };

    const renderTrendsAnalysis = () => {
        if (!analytics) return null;

        const { trends } = analytics;

        return (
            <div className={styles.trendsSection}>
                <h3>📈 Trends Analysis</h3>
                
                {/* Short-term trends */}
                <Card className={styles.trendsCard}>
                    <h4>Short-term Trends (7 days)</h4>
                    <div className={styles.trendsList}>
                        {Object.entries(trends.shortTerm).map(([key, direction]) => (
                            <div key={key} className={styles.trendItem}>
                                <span className={styles.trendLabel}>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                                <div className={`${styles.trendDirection} ${styles[direction]}`}>
                                    <span className={styles.trendIcon}>
                                        {direction === 'rising' ? '📈' : direction === 'falling' ? '📉' : '➡️'}
                                    </span>
                                    <span className={styles.trendText}>{direction}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Patterns */}
                <Card className={styles.patternsCard}>
                    <h4>📊 Performance Patterns</h4>
                    <div className={styles.patternsList}>
                        <div className={styles.patternItem}>
                            <span className={styles.patternLabel}>Weekly Rhythm:</span>
                            <span className={styles.patternValue}>{trends.patterns.weeklyRhythm}</span>
                        </div>
                        <div className={styles.patternItem}>
                            <span className={styles.patternLabel}>Best Day:</span>
                            <span className={styles.patternValue}>
                                {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
                                    trends.patterns.dayOfWeekPreferences.indexOf(Math.max(...trends.patterns.dayOfWeekPreferences))
                                ]}
                            </span>
                        </div>
                        <div className={styles.patternItem}>
                            <span className={styles.patternLabel}>Optimal Time:</span>
                            <span className={styles.patternValue}>
                                {trends.patterns.timeOfDayOptimal.indexOf(Math.max(...trends.patterns.timeOfDayOptimal))}:00
                            </span>
                        </div>
                        <div className={styles.patternItem}>
                            <span className={styles.patternLabel}>Burnout Risk:</span>
                            <span className={`${styles.patternValue} ${styles[trends.longTerm.burnoutRisk]}`}>
                                {trends.longTerm.burnoutRisk}
                            </span>
                        </div>
                    </div>
                </Card>
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className={`${styles.dashboard} ${className}`}>
                <div className={styles.loading}>
                    <div className={styles.loadingSpinner}></div>
                    <span>Analyzing your performance data...</span>
                </div>
            </div>
        );
    }

    if (!analytics) {
        return (
            <div className={`${styles.dashboard} ${className}`}>
                <div className={styles.error}>
                    <span>❌ Failed to load analytics data</span>
                    <button onClick={() => window.location.reload()}>Retry</button>
                </div>
            </div>
        );
    }

    return (
        <div className={`${styles.dashboard} ${className}`}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.titleSection}>
                    <h2 className={styles.title}>📊 Enhanced Analytics</h2>
                    <div className={styles.lastUpdate}>
                        Last updated: {lastUpdate.toLocaleTimeString()}
                    </div>
                </div>
                
                <div className={styles.controls}>
                    <div className={styles.timeframeSelector}>
                        {(['today', 'week', 'month', 'alltime'] as const).map((timeframe) => (
                            <button
                                key={timeframe}
                                className={`${styles.timeframeBtn} ${selectedTimeframe === timeframe ? styles.active : ''}`}
                                onClick={() => setSelectedTimeframe(timeframe)}
                            >
                                {timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}
                            </button>
                        ))}
                    </div>
                    
                    <button 
                        className={styles.refreshBtn}
                        onClick={() => {
                            ComprehensiveAnalyticsEngine.clearCache();
                            window.location.reload();
                        }}
                    >
                        🔄 Refresh
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className={styles.content}>
                {view === 'overview' && (
                    <>
                        {renderPerformanceOverview()}
                        {renderInsights()}
                        {renderPredictions()}
                    </>
                )}
                
                {view === 'detailed' && renderPerformanceOverview()}
                {view === 'trends' && renderTrendsAnalysis()}
                {view === 'insights' && renderInsights()}
            </div>
        </div>
    );
};
