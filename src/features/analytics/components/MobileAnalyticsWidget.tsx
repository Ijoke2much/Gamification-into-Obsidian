// Mobile Analytics Widget - Compact sidebar widget for quick insights
import React, { useState, useEffect } from 'react';
import styles from './MobileAnalyticsWidget.module.css';

interface MobileAnalyticsWidgetProps {
    plugin: any;
    isMinimized?: boolean;
    onToggleMinimized?: () => void;
    className?: string;
}

interface WidgetMetrics {
    productivityScore: number;
    tasksToday: number;
    focusTime: number;
    currentStreak: number;
    topSkill: string;
    nextTip: string;
    recentActivity: Array<{
        id: string;
        title: string;
        completed: boolean;
        xp: number;
    }>;
}

export const MobileAnalyticsWidget: React.FC<MobileAnalyticsWidgetProps> = ({
    plugin,
    isMinimized = false,
    onToggleMinimized,
    className = ''
}) => {
    const [metrics, setMetrics] = useState<WidgetMetrics>({
        productivityScore: 0,
        tasksToday: 0,
        focusTime: 0,
        currentStreak: 0,
        topSkill: 'Getting Started',
        nextTip: 'Begin your productive session!',
        recentActivity: []
    });
    
    const [isExpanded, setIsExpanded] = useState(!isMinimized);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

    useEffect(() => {
        const loadMetrics = async () => {
            try {
                // Load basic metrics from plugin data
                const quests = await plugin.app.vault.getMarkdownFiles();
                const questData = [];
                
                for (const file of quests) {
                    if (file.path.includes('Quests/') || file.path.includes('Tasks/')) {
                        try {
                            const content = await plugin.app.vault.read(file);
                            const lines = content.split('\n');
                            
                            const quest = {
                                id: file.basename,
                                title: lines[0].replace(/^#+\s*/, '') || file.basename,
                                completed: lines.some((line: string) => line.includes('- [x]') || line.includes('✅')),
                                xp: 0
                            };
                            
                            // Extract XP
                            const xpMatch = content.match(/xp[:\s]*(\d+)/i);
                            if (xpMatch) quest.xp = parseInt(xpMatch[1]);
                            
                            questData.push(quest);
                        } catch (error) {
                            console.warn('Error reading quest file:', file.path, error);
                        }
                    }
                }

                const completedQuests = questData.filter(q => q.completed);
                const todayQuests = questData.slice(-5); // Assume recent are today's

                const calculatedMetrics: WidgetMetrics = {
                    productivityScore: Math.min(100, Math.round((completedQuests.length / Math.max(questData.length, 1)) * 100)),
                    tasksToday: todayQuests.filter(q => q.completed).length,
                    focusTime: Math.round(Math.random() * 120 + 60), // Placeholder
                    currentStreak: Math.round(Math.random() * 10 + 1), // Placeholder
                    topSkill: 'Focus',
                    nextTip: completedQuests.length > 5 ? 'Great progress! Take a break.' : 'Keep building momentum!',
                    recentActivity: questData.slice(-3).reverse()
                };

                setMetrics(calculatedMetrics);
                setLastUpdate(new Date());
            } catch (error) {
                console.error('Failed to load widget metrics:', error);
            }
        };

        loadMetrics();
        
        // Refresh every 2 minutes
        const interval = setInterval(loadMetrics, 2 * 60 * 1000);
        return () => clearInterval(interval);
    }, [plugin]);

    const toggleExpanded = () => {
        setIsExpanded(!isExpanded);
        onToggleMinimized?.();
    };

    const getProductivityColor = (score: number): string => {
        if (score >= 80) return '#10b981';
        if (score >= 60) return '#f59e0b';
        if (score >= 40) return '#f97316';
        return '#ef4444';
    };

    const getProductivityEmoji = (score: number): string => {
        if (score >= 80) return '🔥';
        if (score >= 60) return '💪';
        if (score >= 40) return '📈';
        return '🌱';
    };

    const formatTime = (minutes: number): string => {
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    };

    const renderMinimizedView = () => {
        return (
            <div className={`${styles.widget} ${styles.minimized} ${className}`}>
                <div className={styles.minimizedHeader} onClick={toggleExpanded}>
                    <div className={styles.productivityBadge}>
                        <span className={styles.productivityEmoji}>
                            {getProductivityEmoji(metrics.productivityScore)}
                        </span>
                        <span 
                            className={styles.productivityScore}
                            style={{ color: getProductivityColor(metrics.productivityScore) }}
                        >
                            {metrics.productivityScore}%
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
            <div className={`${styles.widget} ${styles.expanded} ${className}`}>
                <div className={styles.widgetHeader}>
                    <div className={styles.headerTitle}>
                        📊 Quick Stats
                    </div>
                    <button 
                        className={styles.minimizeButton}
                        onClick={toggleExpanded}
                    >
                        ➖
                    </button>
                </div>

                <div className={styles.metricsGrid}>
                    {/* Productivity Score */}
                    <div className={styles.metricItem}>
                        <div className={styles.metricHeader}>
                            <span className={styles.metricIcon}>📈</span>
                            <span className={styles.metricLabel}>Productivity</span>
                        </div>
                        <div 
                            className={styles.metricValue}
                            style={{ color: getProductivityColor(metrics.productivityScore) }}
                        >
                            {metrics.productivityScore}%
                        </div>
                    </div>

                    {/* Tasks Today */}
                    <div className={styles.metricItem}>
                        <div className={styles.metricHeader}>
                            <span className={styles.metricIcon}>✅</span>
                            <span className={styles.metricLabel}>Tasks Today</span>
                        </div>
                        <div className={styles.metricValue}>
                            {metrics.tasksToday}
                        </div>
                    </div>

                    {/* Focus Time */}
                    <div className={styles.metricItem}>
                        <div className={styles.metricHeader}>
                            <span className={styles.metricIcon}>🎯</span>
                            <span className={styles.metricLabel}>Focus Time</span>
                        </div>
                        <div className={styles.metricValue}>
                            {formatTime(metrics.focusTime)}
                        </div>
                    </div>

                    {/* Current Streak */}
                    <div className={styles.metricItem}>
                        <div className={styles.metricHeader}>
                            <span className={styles.metricIcon}>🔥</span>
                            <span className={styles.metricLabel}>Streak</span>
                        </div>
                        <div className={styles.metricValue}>
                            {metrics.currentStreak}
                        </div>
                    </div>
                </div>

                {/* Top Skill */}
                <div className={styles.topSkill}>
                    <div className={styles.topSkillLabel}>Top Skill:</div>
                    <div className={styles.topSkillValue}>{metrics.topSkill}</div>
                </div>

                {/* Next Tip */}
                <div className={styles.nextTip}>
                    <div className={styles.tipIcon}>💡</div>
                    <div className={styles.tipText}>{metrics.nextTip}</div>
                </div>

                {/* Recent Activity */}
                {metrics.recentActivity.length > 0 && (
                    <div className={styles.recentActivity}>
                        <div className={styles.activityHeader}>Recent:</div>
                        <div className={styles.activityList}>
                            {metrics.recentActivity.map((activity, index) => (
                                <div key={index} className={styles.activityItem}>
                                    <span className={styles.activityStatus}>
                                        {activity.completed ? '✅' : '⏳'}
                                    </span>
                                    <span className={styles.activityTitle}>
                                        {activity.title.length > 20 
                                            ? activity.title.substring(0, 20) + '...' 
                                            : activity.title
                                        }
                                    </span>
                                    {activity.xp > 0 && (
                                        <span className={styles.activityXP}>+{activity.xp}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Last Update */}
                <div className={styles.lastUpdate}>
                    Updated: {lastUpdate.toLocaleTimeString()}
                </div>
            </div>
        );
    };

    return isExpanded ? renderExpandedView() : renderMinimizedView();
};
