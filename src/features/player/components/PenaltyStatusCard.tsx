import React, { useState, useEffect } from 'react';
import { playerStore } from '../../../shared/state/playerStore';
import { PlayerData, Buff, Debuff } from '../../../data/models/PlayerData';
import { penaltyAnalyticsService, PenaltyInsight } from '../../../shared/services/penaltyAnalyticsService';
import { penaltyForgivenessService, ForgivenessEvent } from '../../../shared/services/penaltyForgivenessService';
import { penaltyCoachingService, CoachingSession } from '../../../shared/services/penaltyCoachingService';
import styles from './PenaltyStatusCard.module.css';

export const PenaltyStatusCard: React.FC = () => {
    const [playerData, setPlayerData] = useState<PlayerData | null>(null);
    const [insights, setInsights] = useState<PenaltyInsight[]>([]);
    const [forgivenessEvents, setForgivenessEvents] = useState<ForgivenessEvent[]>([]);
    const [coachingSession, setCoachingSession] = useState<CoachingSession | null>(null);
    const [showAnalytics, setShowAnalytics] = useState(false);
    const [showCoaching, setShowCoaching] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Get initial data
        loadData();
        
        // Subscribe to changes
        const unsubscribe = playerStore.onChange((change) => {
            if (change.type === 'data-updated') {
                setPlayerData(change.payload);
                loadData(); // Reload analytics when player data changes
            }
        });
        
        return unsubscribe;
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [player, insightsData, forgivenessData, coachingData] = await Promise.all([
                playerStore.get(),
                penaltyAnalyticsService.getInsights(),
                penaltyForgivenessService.getAvailableForgivenessEvents(),
                penaltyCoachingService.getCurrentSession()
            ]);

            setPlayerData(player);
            setInsights(insightsData);
            setForgivenessEvents(forgivenessData);
            setCoachingSession(coachingData);
        } catch (error) {
            console.error('Error loading penalty data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateCoachingSession = async () => {
        setLoading(true);
        try {
            const session = await penaltyCoachingService.generateCoachingSession();
            setCoachingSession(session);
            setShowCoaching(true);
        } catch (error) {
            console.error('Error generating coaching session:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCheckForgivenessEvents = async () => {
        setLoading(true);
        try {
            const results = await penaltyForgivenessService.checkForgivenessEvents();
            if (results.length > 0) {
                // Reload data to reflect changes
                await loadData();
            }
        } catch (error) {
            console.error('Error checking forgiveness events:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!playerData) return null;

    const debtXP = playerData.failureDebtXP || 0;
    const debtCoins = playerData.failureDebtCoins || 0;
    const reputation = playerData.questReputation || 0;
    const activeDebuffs = (playerData.debuffs || []).filter((debuff: Debuff) => 
        !debuff.expiresAt || new Date(debuff.expiresAt) > new Date()
    );

    const hasAnyPenalties = debtXP > 0 || debtCoins > 0 || reputation < 0 || activeDebuffs.length > 0;
    const activeBuffs = (playerData.buffs || []).filter((buff: Buff) => 
        !buff.expiresAt || new Date(buff.expiresAt) > new Date()
    );

    const formatTimeRemaining = (expiresAt: string): string => {
        const now = new Date();
        const expiry = new Date(expiresAt);
        const diffMs = expiry.getTime() - now.getTime();
        
        if (diffMs <= 0) return 'Expired';
        
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    };

    const getReputationColor = (rep: number): string => {
        if (rep >= 50) return '#b0c9b1';
        if (rep >= 0) return '#d9a66e';
        return '#d4a5a5';
    };

    const getSeverityColor = (severity: string): string => {
        switch (severity) {
            case 'high': return '#d4a5a5';
            case 'medium': return '#d9a66e';
            case 'low': return '#b0c9b1';
            default: return '#9aa0a6';
        }
    };

    return (
        <div className={styles.penaltyCard}>
            <div className={styles.header}>
                <h3>💼 Penalty & Recovery Hub</h3>
                <div className={styles.statusIndicators}>
                    {hasAnyPenalties && <span className={styles.warning}>⚠ Active Penalties</span>}
                    {insights.length > 0 && <span className={styles.insight}>{insights.length} Insights</span>}
                    {forgivenessEvents.length > 0 && <span className={styles.forgiveness}>{forgivenessEvents.length} Opportunities</span>}
                </div>
            </div>

            {/* Quick Status Overview */}
            <div className={styles.quickStatus}>
                <div className={styles.statusItem}>
                    <span className={styles.label}>Debt:</span>
                    <span className={styles.value}>
                        {debtXP > 0 && <span className={styles.debt}>📉 {debtXP} XP</span>}
                        {debtCoins > 0 && <span className={styles.debt}>📉 {debtCoins} Coins</span>}
                        {debtXP === 0 && debtCoins === 0 && <span className={styles.clean}>✅ Clean</span>}
                    </span>
                </div>
                <div className={styles.statusItem}>
                    <span className={styles.label}>Reputation:</span>
                    <span 
                        className={styles.value} 
                        style={{ color: getReputationColor(reputation) }}
                    >
                        {reputation >= 0 ? '+' : ''}{reputation}
                    </span>
                </div>
                <div className={styles.statusItem}>
                    <span className={styles.label}>Active Buffs:</span>
                    <span className={styles.value}>
                        {activeBuffs.length > 0 ? 
                            <span className={styles.buff}>✨ {activeBuffs.length}</span> : 
                            <span className={styles.clean}>✅ None</span>
                        }
                    </span>
                </div>
                <div className={styles.statusItem}>
                    <span className={styles.label}>Active Debuffs:</span>
                    <span className={styles.value}>
                        {activeDebuffs.length > 0 ? 
                            <span className={styles.debuff}>😞 {activeDebuffs.length}</span> : 
                            <span className={styles.clean}>✅ None</span>
                        }
                    </span>
                </div>
            </div>

            {/* Action Buttons */}
            <div className={styles.actionButtons}>
                <button 
                    className={styles.actionButton}
                    onClick={() => setShowAnalytics(!showAnalytics)}
                    disabled={loading}
                >
                    📊 Analytics
                </button>
                <button 
                    className={styles.actionButton}
                    onClick={() => setShowCoaching(!showCoaching)}
                    disabled={loading}
                >
                    🎓 Coaching
                </button>
                <button 
                    className={styles.actionButton}
                    onClick={handleCheckForgivenessEvents}
                    disabled={loading || forgivenessEvents.length === 0}
                >
                    🔄 Check Forgiveness
                </button>
                {!coachingSession && (
                    <button 
                        className={styles.actionButton}
                        onClick={handleGenerateCoachingSession}
                        disabled={loading}
                    >
                        🚀 Get Coaching
                    </button>
                )}
            </div>

            {/* Analytics Panel */}
            {showAnalytics && (
                <div className={styles.analyticsPanel}>
                    <h4>📊 Penalty Insights</h4>
                    {insights.length > 0 ? (
                        <div className={styles.insightsList}>
                            {insights.map((insight, index) => (
                                <div 
                                    key={index} 
                                    className={styles.insightItem}
                                    style={{ borderLeftColor: getSeverityColor(insight.severity) }}
                                >
                                    <div className={styles.insightHeader}>
                                        <span className={styles.insightType}>{insight.type}</span>
                                        <span className={styles.insightSeverity}>{insight.severity}</span>
                                    </div>
                                    <h5>{insight.title}</h5>
                                    <p>{insight.description}</p>
                                    {insight.actionable && insight.action && (
                                        <div className={styles.insightAction}>
                                            <strong>Action:</strong> {insight.action}
                                        </div>
                                    )}
                                    {insight.impact && (
                                        <div className={styles.insightImpact}>
                                            <strong>Impact:</strong> {insight.impact}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className={styles.noData}>No insights available. Keep up the good work!</p>
                    )}
                </div>
            )}

            {/* Coaching Panel */}
            {showCoaching && coachingSession && (
                <div className={styles.coachingPanel}>
                    <h4>🎓 Coaching Session</h4>
                    <div className={styles.coachingHeader}>
                        <span>Focus Area: {coachingSession.focusArea.replace('_', ' ')}</span>
                        <span>Progress: {Math.round(coachingSession.progress.improvementRate * 100)}%</span>
                    </div>
                    <div className={styles.suggestionsList}>
                        {coachingSession.suggestions.map((suggestion, index) => (
                            <div key={index} className={styles.suggestionItem}>
                                <div className={styles.suggestionHeader}>
                                    <h5>{suggestion.title}</h5>
                                    <span 
                                        className={styles.priority}
                                        style={{ backgroundColor: getSeverityColor(suggestion.priority) }}
                                    >
                                        {suggestion.priority}
                                    </span>
                                </div>
                                <p>{suggestion.description}</p>
                                <div className={styles.benefits}>
                                    <span>💰 -{suggestion.estimatedBenefit.debtReduction} debt</span>
                                    <span>⭐ +{suggestion.estimatedBenefit.reputationGain} rep</span>
                                    <span>⏰ {suggestion.estimatedBenefit.timeSaved}min saved</span>
                                </div>
                                <div className={styles.actionSteps}>
                                    <strong>Action Steps:</strong>
                                    <ol>
                                        {suggestion.actionSteps.map((step, stepIndex) => (
                                            <li key={stepIndex}>{step}</li>
                                        ))}
                                    </ol>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Forgiveness Events */}
            {forgivenessEvents.length > 0 && (
                <div className={styles.forgivenessPanel}>
                    <h4>🎉 Forgiveness Opportunities</h4>
                    <div className={styles.forgivenessList}>
                        {forgivenessEvents.slice(0, 3).map((event, index) => (
                            <div key={index} className={styles.forgivenessItem}>
                                <h5>{event.name}</h5>
                                <p>{event.description}</p>
                                <div className={styles.forgivenessRewards}>
                                    <span>💰 -{event.rewards.debtReduction.xp} XP, -{event.rewards.debtReduction.coins} Coins</span>
                                    <span>⭐ +{event.rewards.reputationBoost} Reputation</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Active Buffs */}
            {activeBuffs.length > 0 && (
                <div className={styles.buffsPanel}>
                    <h4>✨ Active Buffs</h4>
                    <div className={styles.buffsList}>
                        {activeBuffs.map((buff, index) => (
                            <div key={index} className={styles.buffItem}>
                                <div className={styles.buffHeader}>
                                    <span className={styles.buffIcon}>{buff.icon || '✨'}</span>
                                    <span className={styles.buffName}>{buff.name}</span>
                                    <span className={styles.buffTime}>
                                        {buff.expiresAt ? formatTimeRemaining(buff.expiresAt) : 'Permanent'}
                                    </span>
                                </div>
                                <p className={styles.buffDescription}>{buff.description}</p>
                                <div className={styles.buffValue}>
                                    {buff.type === 'multiplier' && (
                                        <span className={styles.valueBadge}>
                                            +{((buff.value - 1) * 100).toFixed(0)}%
                                        </span>
                                    )}
                                    {buff.type === 'flat' && (
                                        <span className={styles.valueBadge}>
                                            +{buff.value}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Active Debuffs */}
            {activeDebuffs.length > 0 && (
                <div className={styles.debuffsPanel}>
                    <h4>😞 Active Debuffs</h4>
                    <div className={styles.debuffsList}>
                        {activeDebuffs.map((debuff, index) => (
                            <div key={index} className={styles.debuffItem}>
                                <div className={styles.debuffHeader}>
                                    <span className={styles.debuffIcon}>{debuff.icon}</span>
                                    <span className={styles.debuffName}>{debuff.name}</span>
                                    <span className={styles.debuffTime}>
                                        {debuff.expiresAt ? formatTimeRemaining(debuff.expiresAt) : 'Permanent'}
                                    </span>
                                </div>
                                <p className={styles.debuffDescription}>{debuff.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Recovery Tips */}
            {hasAnyPenalties && (
                <div className={styles.recoveryTips}>
                    <h4>💡 Recovery Tips</h4>
                    <ul>
                        <li>Complete quests on time to improve reputation</li>
                        <li>Use shorter work sessions to rebuild focus</li>
                        <li>Take breaks to restore motivation</li>
                        <li>Check for forgiveness opportunities regularly</li>
                        <li>Follow coaching suggestions for faster recovery</li>
                    </ul>
                </div>
            )}

            {loading && (
                <div className={styles.loading}>
                    <span>Loading...</span>
                </div>
            )}
        </div>
    );
};
