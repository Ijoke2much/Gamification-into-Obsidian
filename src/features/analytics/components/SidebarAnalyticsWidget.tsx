import React, { useState, useEffect } from 'react';
import { realTimeAnalyticsService, SidebarAnalytics } from '../services/realTimeAnalyticsService';
import styles from './SidebarAnalyticsWidget.module.css';

interface SidebarAnalyticsWidgetProps {
    isMinimized?: boolean;
    onToggleMinimized?: () => void;
    className?: string;
}

export const SidebarAnalyticsWidget: React.FC<SidebarAnalyticsWidgetProps> = ({
    isMinimized = false,
    onToggleMinimized,
    className = ''
}) => {
    const [analytics, setAnalytics] = useState<SidebarAnalytics>({
        currentProductivity: 0,
        focusTime: 0,
        tasksCompleted: 0,
        currentStreak: 0,
        topStrength: 'Getting started',
        nextTip: 'Begin your productive session!'
    });

    const [isExpanded, setIsExpanded] = useState(!isMinimized);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

    useEffect(() => {
        // Initial load
        const initialData = realTimeAnalyticsService.getSidebarMetrics();
        setAnalytics(initialData);

        // Subscribe to real-time updates
        const handleAnalyticsUpdate = (sidebarData: SidebarAnalytics) => {
            setAnalytics(sidebarData);
            setLastUpdate(new Date());
        };

        realTimeAnalyticsService.addListener(handleAnalyticsUpdate);

        return () => {
            realTimeAnalyticsService.removeListener(handleAnalyticsUpdate);
        };
    }, []);

    const toggleExpanded = () => {
        setIsExpanded(!isExpanded);
        onToggleMinimized?.();
    };

    const getProductivityColor = (score: number): string => {
        if (score >= 80) return '#10b981'; // Green
        if (score >= 60) return '#f59e0b'; // Yellow
        if (score >= 40) return '#f97316'; // Orange
        return '#ef4444'; // Red
    };

    const getProductivityEmoji = (score: number): string => {
        if (score >= 80) return '🔥';
        if (score >= 60) return '💪';
        if (score >= 40) return '📈';
        return '🌱';
    };

    const formatFocusTime = (minutes: number): string => {
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    };

    const renderMinimizedView = () => {
        return (
            <div className={`${styles.sidebarWidget} ${styles.minimized} ${className}`}>
                <div className={styles.minimizedHeader} onClick={toggleExpanded}>
                    <div className={styles.productivityBadge}>
                        <span className={styles.productivityEmoji}>
                            {getProductivityEmoji(analytics.currentProductivity)}
                        </span>
                        <span 
                            className={styles.productivityScore}
                            style={{ color: getProductivityColor(analytics.currentProductivity) }}
                        >
                            {analytics.currentProductivity}%
                        </span>
                    </div>
                    <button className={styles.expandButton}>
                        📊
                    </button>
                </div>
            </div>
        );
    };

    const renderExpandedView = () => {
        return (
            <div className={`${styles.sidebarWidget} ${styles.expanded} ${className}`}>
                <div className={styles.widgetHeader}>
                    <div className={styles.headerTitle}>
                        📊 Productivity Analytics
                    </div>
                    <button className={styles.minimizeButton} onClick={toggleExpanded}>
                        ➖
                    </button>
                </div>

                <div className={styles.widgetContent}>
                    {/* Main Productivity Score */}
                    <div className={styles.mainMetric}>
                        <div className={styles.scoreContainer}>
                            <div className={styles.scoreEmoji}>
                                {getProductivityEmoji(analytics.currentProductivity)}
                            </div>
                            <div className={styles.scoreDetails}>
                                <div 
                                    className={styles.scoreValue}
                                    style={{ color: getProductivityColor(analytics.currentProductivity) }}
                                >
                                    {analytics.currentProductivity}%
                                </div>
                                <div className={styles.scoreLabel}>Productivity</div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats Grid */}
                    <div className={styles.statsGrid}>
                        <div className={styles.statItem}>
                            <div className={styles.statIcon}>⏱️</div>
                            <div className={styles.statValue}>{formatFocusTime(analytics.focusTime)}</div>
                            <div className={styles.statLabel}>Focus Time</div>
                        </div>

                        <div className={styles.statItem}>
                            <div className={styles.statIcon}>✅</div>
                            <div className={styles.statValue}>{analytics.tasksCompleted}</div>
                            <div className={styles.statLabel}>Tasks Done</div>
                        </div>

                        <div className={styles.statItem}>
                            <div className={styles.statIcon}>🔥</div>
                            <div className={styles.statValue}>{analytics.currentStreak}</div>
                            <div className={styles.statLabel}>Streak</div>
                        </div>
                    </div>

                    {/* Strength & Tip Section */}
                    <div className={styles.insightsSection}>
                        <div className={styles.strengthItem}>
                            <div className={styles.insightIcon}>💪</div>
                            <div className={styles.insightContent}>
                                <div className={styles.insightLabel}>Top Strength</div>
                                <div className={styles.insightText}>{analytics.topStrength}</div>
                            </div>
                        </div>

                        <div className={styles.tipItem}>
                            <div className={styles.insightIcon}>💡</div>
                            <div className={styles.insightContent}>
                                <div className={styles.insightLabel}>Next Tip</div>
                                <div className={styles.insightText}>{analytics.nextTip}</div>
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className={styles.progressSection}>
                        <div className={styles.progressLabel}>Today's Progress</div>
                        <div className={styles.progressBar}>
                            <div 
                                className={styles.progressFill}
                                style={{ 
                                    width: `${analytics.currentProductivity}%`,
                                    backgroundColor: getProductivityColor(analytics.currentProductivity)
                                }}
                            />
                        </div>
                        <div className={styles.progressText}>
                            Keep going! You're doing great 🚀
                        </div>
                    </div>

                    {/* Last Update */}
                    <div className={styles.updateInfo}>
                        <div className={styles.updateText}>
                            Last updated: {lastUpdate.toLocaleTimeString()}
                        </div>
                        <div className={styles.liveIndicator}>
                            <span className={styles.liveDot}></span>
                            Live
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return isExpanded ? renderExpandedView() : renderMinimizedView();
};
