// Enhanced Energy HUD with Advanced Management Features
import React, { useState, useEffect } from 'react';
import { playerStore, PlayerStateChange } from '../../../shared/state/playerStore';
import { PlayerData } from '../../../data/models/PlayerData';
import { BatteryProgressBar } from '../../../shared/components/ui/BatteryProgressBar';
import { EnergyManagementSystem, EnergyRecommendation, EnergyActivity } from '../utils/energyManagementSystem';
import styles from './EnhancedEnergyHUD.module.css';

interface EnhancedEnergyHUDProps {
    className?: string;
    showRecommendations?: boolean;
    compact?: boolean;
    autoRefresh?: boolean;
}

export const EnhancedEnergyHUD: React.FC<EnhancedEnergyHUDProps> = ({
    className = '',
    showRecommendations = true,
    compact = false,
    autoRefresh = true
}) => {
    const [playerData, setPlayerData] = useState<PlayerData | null>(null);
    const [recommendations, setRecommendations] = useState<EnergyRecommendation[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedRecommendation, setSelectedRecommendation] = useState<string | null>(null);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

    useEffect(() => {
        const loadData = async () => {
            const data = await playerStore.get();
            setPlayerData(data);
            
            if (showRecommendations) {
                const recs = await EnergyManagementSystem.getEnergyRecommendations();
                setRecommendations(recs);
            }
            setLastUpdate(new Date());
        };

        loadData();

        // Subscribe to player data changes
        const unsubscribe = playerStore.onChange((change: PlayerStateChange) => {
            if (change.type === 'data-updated') {
                setPlayerData(change.payload);
                if (showRecommendations) {
                    EnergyManagementSystem.getEnergyRecommendations().then(setRecommendations);
                }
                setLastUpdate(new Date());
            }
        });

        // Auto-refresh every 5 minutes
        let interval: NodeJS.Timeout | null = null;
        if (autoRefresh) {
            interval = setInterval(loadData, 5 * 60 * 1000);
        }

        return () => {
            unsubscribe();
            if (interval) clearInterval(interval);
        };
    }, [showRecommendations, autoRefresh]);

    const handleActivityStart = async (activityId: string, duration?: number) => {
        setIsLoading(true);
        try {
            await EnergyManagementSystem.updateEnergyAfterActivity(activityId, duration);
            // Player data will update via subscription
        } catch (error) {
            console.error('Failed to start activity:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!playerData?.stats) {
        return <div className={`${styles.energyHUD} ${className}`}>Loading energy data...</div>;
    }

    const stats = playerData.stats;
    const energy = stats.energy || 50;
    const focus = stats.focus || 50;
    const motivation = stats.motivation || 50;
    const calm = stats.calm || 50;
    const stress = stats.stress || 50;

    const getStatColor = (value: number, inverse = false) => {
        if (inverse) {
            // For stress (lower is better)
            if (value <= 20) return 'high';
            if (value <= 50) return 'medium';
            if (value <= 70) return 'low';
            return 'critical';
        } else {
            // For energy, focus, etc. (higher is better)
            if (value >= 80) return 'high';
            if (value >= 50) return 'medium';
            if (value >= 20) return 'low';
            return 'critical';
        }
    };

    const getEnergyTrend = () => {
        if (energy < 20) return { icon: '🔴', text: 'Critical', class: styles.critical };
        if (energy < 40) return { icon: '📉', text: 'Declining', class: styles.declining };
        if (energy > 80) return { icon: '📈', text: 'Rising', class: styles.rising };
        return { icon: '➡️', text: 'Stable', class: styles.stable };
    };

    const renderRecommendationCard = (rec: EnergyRecommendation) => {
        const isSelected = selectedRecommendation === rec.id;
        const priorityClass = styles[`priority-${rec.priority}`] || '';

        return (
            <div 
                key={rec.id}
                className={`${styles.recommendationCard} ${priorityClass} ${isSelected ? styles.selected : ''}`}
                onClick={() => setSelectedRecommendation(isSelected ? null : rec.id)}
            >
                <div className={styles.recHeader}>
                    <span className={styles.recTitle}>{rec.title}</span>
                    <span className={styles.recDuration}>{rec.duration}min</span>
                </div>
                <p className={styles.recDescription}>{rec.description}</p>
                
                {isSelected && rec.suggestedActivity && (
                    <div className={styles.recActions}>
                        <div className={styles.expectedEffects}>
                            <span>Expected: Energy {rec.expectedEffect.energy > 0 ? '+' : ''}{rec.expectedEffect.energy}</span>
                            <span>Mood: {rec.expectedEffect.mood}</span>
                        </div>
                        <div className={styles.actionButtons}>
                            <button 
                                className={styles.startButton}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleActivityStart(rec.suggestedActivity!.id, rec.duration);
                                }}
                                disabled={isLoading}
                            >
                                {isLoading ? '⏳' : '▶️'} Start
                            </button>
                            <button 
                                className={styles.customizeButton}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    // Could open customization modal
                                }}
                            >
                                ⚙️ Customize
                            </button>
                        </div>
                    </div>
                )}
                
                <div className={styles.confidence}>
                    <span>Confidence: {rec.confidence}%</span>
                </div>
            </div>
        );
    };

    if (compact) {
        return (
            <div className={`${styles.energyHUD} ${styles.compact} ${className}`}>
                <div className={styles.compactStats}>
                    <div className={`${styles.compactStat} ${styles[getStatColor(energy)]}`}>
                        <span className={styles.compactIcon}>⚡</span>
                        <span className={styles.compactValue}>{energy}</span>
                    </div>
                    <div className={`${styles.compactStat} ${styles[getStatColor(focus)]}`}>
                        <span className={styles.compactIcon}>🎯</span>
                        <span className={styles.compactValue}>{focus}</span>
                    </div>
                    <div className={`${styles.compactStat} ${styles[getStatColor(motivation)]}`}>
                        <span className={styles.compactIcon}>💪</span>
                        <span className={styles.compactValue}>{motivation}</span>
                    </div>
                </div>
                {recommendations.length > 0 && (
                    <div className={styles.compactAlert}>
                        <span className={styles.alertIcon}>💡</span>
                        <span className={styles.alertCount}>{recommendations.length}</span>
                    </div>
                )}
            </div>
        );
    }

    const energyTrend = getEnergyTrend();

    return (
        <div className={`${styles.energyHUD} ${className}`}>
            {/* Header with trend and last update */}
            <div className={styles.header}>
                <div className={styles.titleSection}>
                    <h3 className={styles.title}>Energy Management</h3>
                    <div className={`${styles.trend} ${energyTrend.class}`}>
                        <span className={styles.trendIcon}>{energyTrend.icon}</span>
                        <span className={styles.trendText}>{energyTrend.text}</span>
                    </div>
                </div>
                <div className={styles.lastUpdate}>
                    Last updated: {lastUpdate.toLocaleTimeString()}
                </div>
            </div>

            {/* Enhanced stat bars */}
            <div className={styles.statsContainer}>
                <div className={styles.statRow}>
                    <div className={styles.statInfo}>
                        <span className={styles.statIcon}>⚡</span>
                        <span className={styles.statName}>Energy</span>
                        <span className={styles.statValue}>{energy}/100</span>
                    </div>
                    <div className={styles.statBar}>
                        <BatteryProgressBar 
                            percent={energy} 
                            segments={10} 
                            width={200} 
                            height={20}
                            className={getStatColor(energy)}
                        />
                    </div>
                </div>

                <div className={styles.statRow}>
                    <div className={styles.statInfo}>
                        <span className={styles.statIcon}>🎯</span>
                        <span className={styles.statName}>Focus</span>
                        <span className={styles.statValue}>{focus}/100</span>
                    </div>
                    <div className={styles.statBar}>
                        <BatteryProgressBar 
                            percent={focus} 
                            segments={10} 
                            width={200} 
                            height={20}
                            className={getStatColor(focus)}
                        />
                    </div>
                </div>

                <div className={styles.statRow}>
                    <div className={styles.statInfo}>
                        <span className={styles.statIcon}>💪</span>
                        <span className={styles.statName}>Motivation</span>
                        <span className={styles.statValue}>{motivation}/100</span>
                    </div>
                    <div className={styles.statBar}>
                        <BatteryProgressBar 
                            percent={motivation} 
                            segments={10} 
                            width={200} 
                            height={20}
                            className={getStatColor(motivation)}
                        />
                    </div>
                </div>

                <div className={styles.statRow}>
                    <div className={styles.statInfo}>
                        <span className={styles.statIcon}>🧘</span>
                        <span className={styles.statName}>Calm</span>
                        <span className={styles.statValue}>{calm}/100</span>
                    </div>
                    <div className={styles.statBar}>
                        <BatteryProgressBar 
                            percent={calm} 
                            segments={10} 
                            width={200} 
                            height={20}
                            className={getStatColor(calm)}
                        />
                    </div>
                </div>

                <div className={styles.statRow}>
                    <div className={styles.statInfo}>
                        <span className={styles.statIcon}>😰</span>
                        <span className={styles.statName}>Stress</span>
                        <span className={styles.statValue}>{stress}/100</span>
                    </div>
                    <div className={styles.statBar}>
                        <BatteryProgressBar 
                            percent={stress} 
                            segments={10} 
                            width={200} 
                            height={20}
                            className={getStatColor(stress, true)}
                        />
                    </div>
                </div>
            </div>

            {/* Energy management recommendations */}
            {showRecommendations && recommendations.length > 0 && (
                <div className={styles.recommendationsSection}>
                    <h4 className={styles.recommendationsTitle}>
                        💡 Smart Recommendations ({recommendations.length})
                    </h4>
                    <div className={styles.recommendationsList}>
                        {recommendations.slice(0, 3).map(renderRecommendationCard)}
                    </div>
                    {recommendations.length > 3 && (
                        <button className={styles.showMoreButton}>
                            Show {recommendations.length - 3} more recommendations
                        </button>
                    )}
                </div>
            )}

            {/* Quick actions */}
            <div className={styles.quickActions}>
                <button 
                    className={`${styles.quickAction} ${styles.restAction}`}
                    onClick={() => handleActivityStart('meditation', 10)}
                    disabled={isLoading}
                >
                    🧘 Quick Rest (10min)
                </button>
                <button 
                    className={`${styles.quickAction} ${styles.walkAction}`}
                    onClick={() => handleActivityStart('nature_walk', 15)}
                    disabled={isLoading}
                >
                    🚶 Fresh Air (15min)
                </button>
                <button 
                    className={`${styles.quickAction} ${styles.focusAction}`}
                    onClick={() => handleActivityStart('deep_work', 45)}
                    disabled={isLoading || energy < 40}
                >
                    🎯 Focus Session (45min)
                </button>
            </div>
        </div>
    );
};
