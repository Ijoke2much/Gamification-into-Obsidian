// Simple Analytics Dashboard - Clean, user-friendly analytics interface
import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../../../shared/components/ui/Card';
import { CircularProgressBar } from '../../../shared/components/ui/CircularProgressBar';
import styles from './SimpleAnalyticsDashboard.module.css';

interface SimpleAnalyticsDashboardProps {
    plugin: any;
    className?: string;
    onQuestSelect?: (questId: string) => void;
}

interface DashboardMetrics {
    // Performance metrics
    productivityScore: number;
    taskEfficiency: number;
    focusQuality: number;
    habitConsistency: number;
    
    // Activity metrics
    tasksCompleted: number;
    tasksToday: number;
    focusTime: number;
    currentStreak: number;
    
    // Progress metrics
    weeklyGoal: number;
    weeklyProgress: number;
    skillProgress: Array<{
        name: string;
        level: number;
        progress: number;
        xp: number;
    }>;
    
    // Recent activity
    recentQuests: Array<{
        id: string;
        title: string;
        completed: boolean;
        xp: number;
        skills: string[];
    }>;
}

export const SimpleAnalyticsDashboard: React.FC<SimpleAnalyticsDashboardProps> = ({
    plugin,
    className = '',
    onQuestSelect
}) => {
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
    const [selectedTimeframe, setSelectedTimeframe] = useState<'today' | 'week' | 'month' | 'alltime'>('week');
    const [selectedSkillFilter, setSelectedSkillFilter] = useState<string>('all');
    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

    // Available skills for filtering
    const [availableSkills, setAvailableSkills] = useState<string[]>([]);

    useEffect(() => {
        const loadAnalytics = async () => {
            setIsLoading(true);
            try {
                // Load quest data
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
                                xp: 0,
                                skills: []
                            };
                            
                            // Extract XP
                            const xpMatch = content.match(/xp[:\s]*(\d+)/i);
                            if (xpMatch) quest.xp = parseInt(xpMatch[1]);
                            
                            // Extract skills
                            const skillsMatch = content.match(/skills[:\s]*([^\n]+)/i);
                            if (skillsMatch) {
                                quest.skills = skillsMatch[1].split(',').map((s: string) => s.trim()).filter(Boolean);
                            }
                            
                            questData.push(quest);
                        } catch (error) {
                            console.warn('Error reading quest file:', file.path, error);
                        }
                    }
                }

                // Calculate metrics
                const today = new Date();
                const weekStart = new Date(today);
                weekStart.setDate(today.getDate() - today.getDay());

                const completedQuests = questData.filter(q => q.completed);
                const todayQuests = questData.filter(q => {
                    // Simple heuristic - assume recent files are today's
                    return q.title.toLowerCase().includes('today') || q.title.toLowerCase().includes('urgent');
                });

                const allSkills = [...new Set(questData.flatMap(q => q.skills))];
                setAvailableSkills(allSkills);

                const calculatedMetrics: DashboardMetrics = {
                    productivityScore: Math.min(100, Math.round((completedQuests.length / Math.max(questData.length, 1)) * 100)),
                    taskEfficiency: Math.round((completedQuests.length / Math.max(questData.length, 1)) * 100),
                    focusQuality: Math.round(Math.random() * 40 + 60), // Placeholder
                    habitConsistency: Math.round(Math.random() * 30 + 70), // Placeholder
                    
                    tasksCompleted: completedQuests.length,
                    tasksToday: todayQuests.length,
                    focusTime: Math.round(Math.random() * 120 + 60), // Placeholder in minutes
                    currentStreak: Math.round(Math.random() * 10 + 1), // Placeholder
                    
                    weeklyGoal: 20,
                    weeklyProgress: Math.min(20, completedQuests.length),
                    
                    skillProgress: allSkills.slice(0, 5).map(skill => ({
                        name: skill,
                        level: Math.round(Math.random() * 10 + 1),
                        progress: Math.round(Math.random() * 100),
                        xp: Math.round(Math.random() * 1000 + 100)
                    })),
                    
                    recentQuests: questData.slice(-5).reverse()
                };

                setMetrics(calculatedMetrics);
                setLastUpdate(new Date());
            } catch (error) {
                console.error('Failed to load analytics:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadAnalytics();
        
        // Auto-refresh every 5 minutes
        const interval = setInterval(loadAnalytics, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [plugin, selectedTimeframe, selectedSkillFilter]);

    // Filter metrics based on selected filters
    const filteredMetrics = useMemo(() => {
        if (!metrics) return null;
        
        let filtered = { ...metrics };
        
        // Apply skill filter
        if (selectedSkillFilter !== 'all') {
            filtered.recentQuests = metrics.recentQuests.filter(quest => 
                quest.skills.includes(selectedSkillFilter)
            );
            filtered.skillProgress = metrics.skillProgress.filter(skill => 
                skill.name.toLowerCase().includes(selectedSkillFilter.toLowerCase())
            );
        }
        
        // Apply timeframe filter
        switch (selectedTimeframe) {
            case 'today':
                filtered.tasksCompleted = metrics.tasksToday;
                filtered.weeklyProgress = Math.min(metrics.weeklyGoal, metrics.tasksToday);
                break;
            case 'week':
                // Keep current values
                break;
            case 'month':
                // Scale up for monthly view
                filtered.tasksCompleted = Math.round(metrics.tasksCompleted * 4.3);
                filtered.weeklyProgress = Math.round(metrics.weeklyProgress * 4.3);
                break;
            case 'alltime':
                // Scale up for all-time view
                filtered.tasksCompleted = Math.round(metrics.tasksCompleted * 52);
                filtered.weeklyProgress = Math.round(metrics.weeklyProgress * 52);
                break;
        }
        
        return filtered;
    }, [metrics, selectedTimeframe, selectedSkillFilter]);

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

    const formatTime = (minutes: number): string => {
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    };

    if (isLoading) {
        return (
            <div className={`${styles.dashboard} ${className}`}>
                <div className={styles.loading}>
                    <div className={styles.loadingSpinner}></div>
                    <span>Loading analytics...</span>
                </div>
            </div>
        );
    }

    if (!filteredMetrics) {
        return (
            <div className={`${styles.dashboard} ${className}`}>
                <div className={styles.error}>
                    <span>❌ Failed to load analytics</span>
                </div>
            </div>
        );
    }

    return (
        <div className={`${styles.dashboard} ${className}`}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.titleSection}>
                    <h2 className={styles.title}>📊 Simple Analytics</h2>
                    <div className={styles.lastUpdate}>
                        Last updated: {lastUpdate.toLocaleTimeString()}
                    </div>
                </div>
                
                <div className={styles.controls}>
                    {/* Date Filter */}
                    <div className={styles.timeframeSelector}>
                        {(['today', 'week', 'month', 'alltime'] as const).map((timeframe) => (
                            <button
                                key={timeframe}
                                className={`${styles.timeframeBtn} ${selectedTimeframe === timeframe ? styles.active : ''}`}
                                onClick={() => setSelectedTimeframe(timeframe)}
                            >
                                {timeframe === 'today' ? 'Today' : 
                                 timeframe === 'week' ? 'Week' :
                                 timeframe === 'month' ? 'Month' : 'All Time'}
                            </button>
                        ))}
                    </div>
                    
                    {/* Skill Filter */}
                    <div className={styles.skillFilter}>
                        <select
                            value={selectedSkillFilter}
                            onChange={(e) => setSelectedSkillFilter(e.target.value)}
                            className={styles.skillSelect}
                        >
                            <option value="all">All Skills</option>
                            {availableSkills.map(skill => (
                                <option key={skill} value={skill}>{skill}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Main Metrics */}
            <div className={styles.metricsGrid}>
                {/* Productivity Score */}
                <Card className={styles.productivityCard}>
                    <div className={styles.cardHeader}>
                        <h3>Productivity Score</h3>
                        <span className={styles.timeframeBadge}>{selectedTimeframe}</span>
                    </div>
                    <div className={styles.scoreDisplay}>
                        <div className={styles.scoreCircle}>
                            <CircularProgressBar 
                                percent={filteredMetrics.productivityScore} 
                                radius={40} 
                                stroke={6}
                            />
                            <div className={styles.scoreEmoji}>
                                {getProductivityEmoji(filteredMetrics.productivityScore)}
                            </div>
                        </div>
                        <div className={styles.scoreValue}>
                            {filteredMetrics.productivityScore}%
                        </div>
                    </div>
                </Card>

                {/* Task Completion */}
                <Card className={styles.metricCard}>
                    <div className={styles.metricHeader}>
                        <span className={styles.metricIcon}>✅</span>
                        <h4>Tasks Completed</h4>
                    </div>
                    <div className={styles.metricValue}>
                        {filteredMetrics.tasksCompleted}
                    </div>
                    <div className={styles.metricSubtext}>
                        {filteredMetrics.weeklyProgress} / {filteredMetrics.weeklyGoal} weekly goal
                    </div>
                    <div className={styles.progressBar}>
                        <div 
                            className={styles.progressFill}
                            style={{ 
                                width: `${Math.min(100, (filteredMetrics.weeklyProgress / filteredMetrics.weeklyGoal) * 100)}%` 
                            }}
                        ></div>
                    </div>
                </Card>

                {/* Focus Time */}
                <Card className={styles.metricCard}>
                    <div className={styles.metricHeader}>
                        <span className={styles.metricIcon}>🎯</span>
                        <h4>Focus Time</h4>
                    </div>
                    <div className={styles.metricValue}>
                        {formatTime(filteredMetrics.focusTime)}
                    </div>
                    <div className={styles.metricSubtext}>
                        Today's session
                    </div>
                </Card>

                {/* Current Streak */}
                <Card className={styles.metricCard}>
                    <div className={styles.metricHeader}>
                        <span className={styles.metricIcon}>🔥</span>
                        <h4>Current Streak</h4>
                    </div>
                    <div className={styles.metricValue}>
                        {filteredMetrics.currentStreak} days
                    </div>
                    <div className={styles.metricSubtext}>
                        Keep it up!
                    </div>
                </Card>
            </div>

            {/* Skill Progress */}
            {filteredMetrics.skillProgress.length > 0 && (
                <Card className={styles.skillsCard}>
                    <div className={styles.cardHeader}>
                        <h3>Skill Progress</h3>
                        {selectedSkillFilter !== 'all' && (
                            <span className={styles.filterBadge}>Filtered: {selectedSkillFilter}</span>
                        )}
                    </div>
                    <div className={styles.skillsGrid}>
                        {filteredMetrics.skillProgress.map((skill, index) => (
                            <div key={index} className={styles.skillItem}>
                                <div className={styles.skillHeader}>
                                    <span className={styles.skillName}>{skill.name}</span>
                                    <span className={styles.skillLevel}>Lv.{skill.level}</span>
                                </div>
                                <div className={styles.skillProgressBar}>
                                    <div 
                                        className={styles.skillProgressFill}
                                        style={{ width: `${skill.progress}%` }}
                                    ></div>
                                </div>
                                <div className={styles.skillXP}>{skill.xp} XP</div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Recent Activity */}
            {filteredMetrics.recentQuests.length > 0 && (
                <Card className={styles.recentActivityCard}>
                    <div className={styles.cardHeader}>
                        <h3>Recent Activity</h3>
                        {selectedSkillFilter !== 'all' && (
                            <span className={styles.filterBadge}>Filtered: {selectedSkillFilter}</span>
                        )}
                    </div>
                    <div className={styles.questList}>
                        {filteredMetrics.recentQuests.map((quest, index) => (
                            <div 
                                key={index} 
                                className={`${styles.questItem} ${quest.completed ? styles.completed : styles.pending}`}
                                onClick={() => onQuestSelect?.(quest.id)}
                            >
                                <div className={styles.questStatus}>
                                    {quest.completed ? '✅' : '⏳'}
                                </div>
                                <div className={styles.questInfo}>
                                    <div className={styles.questTitle}>{quest.title}</div>
                                    <div className={styles.questMeta}>
                                        {quest.xp > 0 && <span className={styles.questXP}>+{quest.xp} XP</span>}
                                        {quest.skills.length > 0 && (
                                            <div className={styles.questSkills}>
                                                {quest.skills.map(skill => (
                                                    <span key={skill} className={styles.skillTag}>{skill}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    );
};
