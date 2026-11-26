// Enhanced Pomodoro Integration Demo Component
// Shows how Task Linking, Focus Rewards, and Session Tracking work together

import React, { useState, useEffect } from 'react';
import { AttachedQuest } from '../types/EnhancedTaskLinking';
import { FocusRewardSystem, FocusMetrics } from '../utils/focusRewardSystem';
import { SessionAnalyticsManager, SessionRecord } from '../utils/sessionAnalytics';

interface EnhancedPomodoroIntegrationProps {
    currentSession?: string;
    attachedQuests: AttachedQuest[];
    onQuestAttach: (quest: AttachedQuest) => void;
    onSessionComplete: (sessionData: any) => void;
}

export const EnhancedPomodoroIntegration: React.FC<EnhancedPomodoroIntegrationProps> = ({
    currentSession,
    attachedQuests,
    onQuestAttach,
    onSessionComplete
}) => {
    const [sessionMetrics, setSessionMetrics] = useState<Partial<FocusMetrics>>({});
    const [realtimeRewards, setRealtimeRewards] = useState<any>(null);
    const [sessionAnalytics, setSessionAnalytics] = useState<any>(null);

    // Real-time focus tracking simulation
    useEffect(() => {
        if (!currentSession) return;

        const interval = setInterval(() => {
            // Simulate real-time metrics collection
            const mockMetrics: FocusMetrics = {
                sessionDuration: 25, // Current session progress
                sessionType: 'classic',
                interruptions: Math.floor(Math.random() * 3),
                timeSpentFocused: 23, // 92% focus
                completedTasks: attachedQuests.filter(q => q.status === 'completed').length,
                questDifficulty: attachedQuests[0]?.difficulty,
                timeOfDay: new Date().getHours(),
                consecutiveSessionsToday: 3,
                currentStreak: 7,
                isWeekend: [0, 6].includes(new Date().getDay()),
                attachedQuestCount: attachedQuests.length
            };

            setSessionMetrics(mockMetrics);
            
            // Calculate real-time rewards preview
            const rewards = FocusRewardSystem.calculateFocusRewards(mockMetrics);
            setRealtimeRewards(rewards);
        }, 5000); // Update every 5 seconds

        return () => clearInterval(interval);
    }, [currentSession, attachedQuests]);

    // Load session analytics on mount
    useEffect(() => {
        const loadAnalytics = async () => {
            const today = new Date().toISOString().split('T')[0];
            const dayAnalytics = await SessionAnalyticsManager.getDayAnalytics(today);
            const insights = await SessionAnalyticsManager.getProductivityInsights('week');
            
            setSessionAnalytics({
                today: dayAnalytics,
                insights
            });
        };

        loadAnalytics();
    }, []);

    return (
        <div className="enhanced-pomodoro-integration">
            {/* Task Linking Panel */}
            <div className="task-linking-panel">
                <h3>🎯 Smart Quest Linking</h3>
                
                {attachedQuests.length === 0 ? (
                    <div className="no-quests">
                        <p>No quests attached. Smart suggestions:</p>
                        <div className="quest-suggestions">
                            <div className="suggestion-card">
                                <span className="suggestion-icon">📚</span>
                                <div className="suggestion-info">
                                    <strong>Study Session</strong>
                                    <div className="suggestion-meta">
                                        Medium difficulty • 25 min estimated
                                    </div>
                                </div>
                                <div className="suggestion-rewards">
                                    <span>+35 XP</span>
                                    <span>+15 coins</span>
                                </div>
                            </div>
                            
                            <div className="suggestion-card">
                                <span className="suggestion-icon">💻</span>
                                <div className="suggestion-info">
                                    <strong>Code Review</strong>
                                    <div className="suggestion-meta">
                                        Hard difficulty • 45 min estimated
                                    </div>
                                </div>
                                <div className="suggestion-rewards">
                                    <span>+55 XP</span>
                                    <span>+22 coins</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="attached-quests">
                        {attachedQuests.map((quest, index) => (
                            <div key={quest.id} className="quest-card">
                                <div className="quest-header">
                                    <span className="quest-icon">🎯</span>
                                    <div className="quest-info">
                                        <strong>{quest.title}</strong>
                                        <div className="quest-meta">
                                            {quest.difficulty} • {quest.estimatedDuration}min estimated
                                        </div>
                                    </div>
                                    <div className="quest-progress">
                                        {quest.progress}%
                                    </div>
                                </div>
                                
                                {quest.subtasks.length > 0 && (
                                    <div className="subtasks">
                                        {quest.subtasks.map((subtask, idx) => (
                                            <div key={subtask.id} className={`subtask ${subtask.completed ? 'completed' : ''}`}>
                                                <span className="subtask-checkbox">
                                                    {subtask.completed ? '✅' : '⬜'}
                                                </span>
                                                <span className="subtask-text">{subtask.text}</span>
                                                {subtask.estimatedMinutes && (
                                                    <span className="subtask-time">
                                                        {subtask.estimatedMinutes}min
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                
                                <div className="quest-analytics">
                                    <div className="analytics-item">
                                        <span className="analytics-label">Sessions:</span>
                                        <span className="analytics-value">{quest.analytics.totalSessions}</span>
                                    </div>
                                    <div className="analytics-item">
                                        <span className="analytics-label">Focus Score:</span>
                                        <span className="analytics-value">{quest.analytics.averageFocusScore.toFixed(1)}</span>
                                    </div>
                                    <div className="analytics-item">
                                        <span className="analytics-label">Efficiency:</span>
                                        <span className="analytics-value">{(quest.analytics.estimatedVsActual * 100).toFixed(0)}%</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Focus Rewards Preview */}
            <div className="focus-rewards-panel">
                <h3>⚡ Real-time Rewards</h3>
                
                {currentSession && realtimeRewards ? (
                    <div className="rewards-preview">
                        <div className="current-performance">
                            <div className="performance-metric">
                                <span className="metric-icon">🎯</span>
                                <div className="metric-info">
                                    <div className="metric-value">{((sessionMetrics.timeSpentFocused || 0) / (sessionMetrics.sessionDuration || 1) * 100).toFixed(0)}%</div>
                                    <div className="metric-label">Focus Quality</div>
                                </div>
                            </div>
                            
                            <div className="performance-metric">
                                <span className="metric-icon">🚫</span>
                                <div className="metric-info">
                                    <div className="metric-value">{sessionMetrics.interruptions || 0}</div>
                                    <div className="metric-label">Interruptions</div>
                                </div>
                            </div>
                            
                            <div className="performance-metric">
                                <span className="metric-icon">🔥</span>
                                <div className="metric-info">
                                    <div className="metric-value">{sessionMetrics.currentStreak || 0}</div>
                                    <div className="metric-label">Day Streak</div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="rewards-breakdown">
                            <div className="reward-section">
                                <h4>Session Rewards</h4>
                                <div className="reward-item">
                                    <span className="reward-label">Base XP:</span>
                                    <span className="reward-value">+{realtimeRewards.baseXP}</span>
                                </div>
                                <div className="reward-item bonus">
                                    <span className="reward-label">Bonus XP:</span>
                                    <span className="reward-value">+{realtimeRewards.bonusXP}</span>
                                </div>
                                <div className="reward-item total">
                                    <span className="reward-label">Total XP:</span>
                                    <span className="reward-value">+{realtimeRewards.totalXP}</span>
                                </div>
                            </div>
                            
                            <div className="multipliers-section">
                                <h4>Active Multipliers</h4>
                                {realtimeRewards.multipliers.map((multiplier: any, index: number) => (
                                    <div key={index} className="multiplier-item">
                                        <span className="multiplier-name">{multiplier.description}</span>
                                        <span className="multiplier-value">×{multiplier.multiplier.toFixed(1)}</span>
                                        <span className="multiplier-bonus">+{multiplier.bonusXP}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="no-session">
                        <p>Start a Pomodoro session to see real-time rewards!</p>
                        <div className="potential-rewards">
                            <h4>Potential Session Rewards:</h4>
                            <div className="reward-preview">
                                <span>Classic (25min): 12-18 XP</span>
                                <span>Deep Work (60min): 45-67 XP</span>
                                <span>With Perfect Focus: +50% bonus</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Session Analytics Dashboard */}
            <div className="analytics-panel">
                <h3>📊 Performance Analytics</h3>
                
                {sessionAnalytics ? (
                    <div className="analytics-dashboard">
                        <div className="today-stats">
                            <h4>Today's Performance</h4>
                            <div className="stats-grid">
                                <div className="stat-item">
                                    <div className="stat-value">{sessionAnalytics.today.totalSessions}</div>
                                    <div className="stat-label">Sessions</div>
                                </div>
                                <div className="stat-item">
                                    <div className="stat-value">{sessionAnalytics.today.totalFocusTime}min</div>
                                    <div className="stat-label">Focus Time</div>
                                </div>
                                <div className="stat-item">
                                    <div className="stat-value">{sessionAnalytics.today.averageFocusScore.toFixed(0)}</div>
                                    <div className="stat-label">Avg Focus</div>
                                </div>
                                <div className="stat-item">
                                    <div className="stat-value">{sessionAnalytics.today.questsCompleted}</div>
                                    <div className="stat-label">Quests Done</div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="trends-section">
                            <h4>Productivity Trends</h4>
                            <div className="trend-item">
                                <span className="trend-label">Focus Quality:</span>
                                <span className={`trend-value ${sessionAnalytics.today.productivityTrend === 'up' ? 'positive' : 'neutral'}`}>
                                    {sessionAnalytics.today.productivityTrend === 'up' ? '📈' : '📊'} 
                                    {sessionAnalytics.today.productivityTrend}
                                </span>
                            </div>
                            <div className="trend-item">
                                <span className="trend-label">Mood Change:</span>
                                <span className={`trend-value ${sessionAnalytics.today.mood.moodImprovement > 0 ? 'positive' : 'neutral'}`}>
                                    {sessionAnalytics.today.mood.moodImprovement > 0 ? '😊' : '😐'} 
                                    {sessionAnalytics.today.mood.moodImprovement > 0 ? '+' : ''}{sessionAnalytics.today.mood.moodImprovement.toFixed(1)}
                                </span>
                            </div>
                        </div>
                        
                        {/* Quick insights */}
                        <div className="insights-section">
                            <h4>Quick Insights</h4>
                            <div className="insight-item">
                                💡 Your best focus time is typically 9-11 AM
                            </div>
                            <div className="insight-item">
                                🎯 Deep Work sessions show 23% higher completion rates
                            </div>
                            <div className="insight-item">
                                📱 Mobile sessions average 2.3 more interruptions
                            </div>
                        </div>
                        
                        <div className="export-section">
                            <button 
                                className="export-btn"
                                onClick={() => SessionAnalyticsManager.exportData('json', 'week').then(data => {
                                    const blob = new Blob([data], { type: 'application/json' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = 'pomodoro-analytics.json';
                                    a.click();
                                })}
                            >
                                📊 Export Week Data
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="loading-analytics">
                        <p>Loading analytics...</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// CSS styles would go in a separate .module.css file
export const enhancedPomodoroStyles = `
.enhanced-pomodoro-integration {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 20px;
    padding: 20px;
}

.task-linking-panel, .focus-rewards-panel, .analytics-panel {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
    border-radius: 12px;
    padding: 20px;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.quest-card {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    padding: 15px;
    margin-bottom: 10px;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.quest-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
}

.subtasks {
    margin: 10px 0;
}

.subtask {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 0;
    font-size: 0.9em;
}

.subtask.completed {
    opacity: 0.6;
    text-decoration: line-through;
}

.quest-analytics {
    display: flex;
    gap: 15px;
    margin-top: 10px;
    font-size: 0.8em;
}

.analytics-item {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.rewards-preview {
    background: rgba(0, 255, 100, 0.1);
    border-radius: 8px;
    padding: 15px;
    border: 1px solid rgba(0, 255, 100, 0.3);
}

.performance-metric {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
}

.metric-info {
    display: flex;
    flex-direction: column;
}

.metric-value {
    font-size: 1.2em;
    font-weight: bold;
}

.metric-label {
    font-size: 0.8em;
    opacity: 0.7;
}

.multiplier-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 5px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 15px;
}

.stat-item {
    text-align: center;
    padding: 10px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 6px;
}

.stat-value {
    font-size: 1.5em;
    font-weight: bold;
    color: #4fc3f7;
}

.stat-label {
    font-size: 0.8em;
    opacity: 0.7;
}

.export-btn {
    background: linear-gradient(135deg, #4fc3f7, #29b6f6);
    border: none;
    color: white;
    padding: 10px 15px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9em;
    transition: all 0.2s ease;
}

.export-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(79, 195, 247, 0.3);
}

@media (max-width: 1024px) {
    .enhanced-pomodoro-integration {
        grid-template-columns: 1fr;
    }
}
`;
