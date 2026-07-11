// Enhanced Energy HUD with Advanced Management Features
import React, { useState, useEffect } from 'react';
import { playerStore, PlayerStateChange } from '../../../shared/state/playerStore';
import { PlayerData } from '../../../data/models/PlayerData';
import { BatteryProgressBar } from '../../../shared/components/ui/BatteryProgressBar';
import { EnergyManagementSystem, EnergyRecommendation, EnergyActivity } from '../utils/energyManagementSystem';
import type { WellbeingStatKey } from '../../../shared/utils/energyHudConfig';
import { ENERGY_HUD_MODE_STATS } from '../../../shared/utils/energyHudConfig';
import styles from './EnhancedEnergyHUD.module.css';

/** Native tooltips: energy = physical drain; others = mental/emotional “shape of the day.” */
const HUD_STAT_TIPS: Record<string, string> = {
    energy:
        "How drained you feel physically. Quests spend this separately from stress or focus—the same quest can cost energy and still lower stress (e.g. cleaning).",
    focus: "How sharp or mentally on-task you feel.",
    motivation: "How driven or ready for action you feel.",
    calm: "How settled or at ease you feel.",
    stress:
        "How tense or overwhelmed you feel (lower is usually calmer). This is not the same as physical energy.",
};

interface EnhancedEnergyHUDProps {
    className?: string;
    showRecommendations?: boolean;
    compact?: boolean;
    autoRefresh?: boolean;
    variant?: 'default' | 'pixel';
    visibleStats?: WellbeingStatKey[];
    hudTitle?: string;
}

export const EnhancedEnergyHUD: React.FC<EnhancedEnergyHUDProps> = ({
    className = '',
    showRecommendations = true,
    compact = false,
    autoRefresh = true,
    variant = 'default',
    visibleStats = ENERGY_HUD_MODE_STATS.full,
    hudTitle = 'Energy Management',
}) => {
    const [playerData, setPlayerData] = useState<PlayerData | null>(null);
    const [recommendations, setRecommendations] = useState<EnergyRecommendation[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedRecommendation, setSelectedRecommendation] = useState<string | null>(null);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
    const [showStatModal, setShowStatModal] = useState<{ stat: string; value: number } | null>(null);
    const [manualStatValue, setManualStatValue] = useState<number>(70);
    const [manualStatHours, setManualStatHours] = useState<number>(4);

    // Update modal value when stat modal opens
    useEffect(() => {
        if (showStatModal) {
            setManualStatValue(showStatModal.value);
        }
    }, [showStatModal]);

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

    const hudRootClass = `${styles.energyHUD} ${variant === 'pixel' ? styles.pixelSkin : ''} ${className}`.trim();
    const batteryPixel = variant === 'pixel';

    if (!playerData?.stats) {
        return <div className={hudRootClass}>Loading energy data...</div>;
    }

    const stats = playerData.stats;
    const manualOverrides = (playerData as any)?.manualStatOverrides as Record<string, { value?: number; expiresAt?: string }> | undefined;
    const now = new Date();
    
    const getStatWithOverride = (statName: string, defaultValue: number): number => {
        const override = manualOverrides?.[statName];
        if (override?.value != null && override?.expiresAt && new Date(override.expiresAt) > now) {
            return override.value;
        }
        return defaultValue;
    };
    
    const energy = getStatWithOverride('energy', stats.energy || 50);
    const focus = getStatWithOverride('focus', stats.focus || 50);
    const motivation = getStatWithOverride('motivation', stats.motivation || 50);
    const calm = getStatWithOverride('calm', stats.calm || 50);
    const stress = getStatWithOverride('stress', stats.stress || 50);
    const showStat = (stat: WellbeingStatKey) => visibleStats.includes(stat);
    
    const getActiveOverrides = () => {
        const active: Array<{ stat: string; value: number; expiresAt: string }> = [];
        if (manualOverrides) {
            Object.entries(manualOverrides).forEach(([stat, override]) => {
                if (!showStat(stat as WellbeingStatKey)) return;
                if (override?.value != null && override?.expiresAt && new Date(override.expiresAt) > now) {
                    active.push({ stat, value: override.value, expiresAt: override.expiresAt });
                }
            });
        }
        return active;
    };
    const activeOverrides = getActiveOverrides();

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

    const applyManualStatOverride = async (statName: string, value: number, hours: number) => {
        try {
            const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
            await playerStore.update((data: PlayerData) => {
                const next: any = { ...(data as any) };
                next.stats = { ...(data.stats || {}), [statName]: value };
                if (!next.manualStatOverrides) {
                    next.manualStatOverrides = {};
                }
                next.manualStatOverrides[statName] = { value, expiresAt };
                return next;
            });
            setShowStatModal(null);
        } catch (e) {
            console.error(`Failed to set manual ${statName} override:`, e);
        }
    };

    const clearManualStatOverride = async (statName?: string) => {
        try {
            await playerStore.update((data: PlayerData) => {
                const next: any = { ...(data as any) };
                if (next.manualStatOverrides) {
                    if (statName) {
                        delete next.manualStatOverrides[statName];
                    } else {
                        delete next.manualStatOverrides;
                    }
                }
                return next;
            });
        } catch (e) {
            console.error('Failed to clear manual stat override:', e);
        }
    };
    
    const getStatDisplayName = (statName: string): string => {
        const names: Record<string, string> = {
            energy: 'Energy',
            focus: 'Focus',
            motivation: 'Motivation',
            calm: 'Calm',
            stress: 'Stress'
        };
        return names[statName] || statName;
    };
    
    const getStatIcon = (statName: string): string => {
        const icons: Record<string, string> = {
            energy: '⚡',
            focus: '🎯',
            motivation: '💪',
            calm: '🧘',
            stress: '😰'
        };
        return icons[statName] || '📊';
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
                    <div className={styles.recHeaderMeta}>
                        <span className={styles.recDuration}>{rec.duration}min</span>
                        <span className={styles.confidence}>
                            Confidence: {rec.confidence}%
                        </span>
                    </div>
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
            </div>
        );
    };

    if (compact) {
        const compactStatDefs = ([
            { key: 'energy', value: energy, icon: '⚡', tip: HUD_STAT_TIPS.energy },
            { key: 'focus', value: focus, icon: '🎯', tip: HUD_STAT_TIPS.focus },
            { key: 'motivation', value: motivation, icon: '💪', tip: HUD_STAT_TIPS.motivation },
            { key: 'calm', value: calm, icon: '🧘', tip: HUD_STAT_TIPS.calm },
            { key: 'stress', value: stress, icon: '😰', tip: HUD_STAT_TIPS.stress },
        ] as const).filter((item) => showStat(item.key));

        return (
            <div className={`${styles.energyHUD} ${styles.compact} ${variant === 'pixel' ? styles.pixelSkin : ''} ${className}`.trim()}>
                <div className={styles.compactStats}>
                    {compactStatDefs.map((item) => (
                    <div
                        key={item.key}
                        className={`${styles.compactStat} ${styles[getStatColor(item.value, item.key === 'stress')]}`}
                        title={item.tip}
                    >
                        <span className={styles.compactIcon}>{item.icon}</span>
                        <span className={styles.compactValue}>{item.value}</span>
                    </div>
                    ))}
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
        <div className={hudRootClass}>
            {/* Header with trend and last update */}
            <div className={styles.header}>
                <div className={styles.titleSection}>
                    <h3
                        className={styles.title}
                        title="Physical energy (drain) is separate from stress, motivation, focus, and calm—how regulated, driven, or sharp you feel."
                    >
                        {hudTitle}
                    </h3>
                    <div className={`${styles.trend} ${energyTrend.class}`}>
                        <span className={styles.trendIcon}>{energyTrend.icon}</span>
                        <span className={styles.trendText}>{energyTrend.text}</span>
                    </div>
                </div>
                <div className={styles.lastUpdate}>
                    Last updated: {lastUpdate.toLocaleTimeString()}
                </div>
            </div>
            {/* Manual override indicators */}
            {activeOverrides.length > 0 && (
                <div className={styles.overrideBanner} style={{ 
                    margin: '8px 0', padding: '8px 10px', borderRadius: 6, 
                    background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', 
                    display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 
                }}>
                    {activeOverrides.map(override => (
                        <div key={override.stat} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span>{getStatIcon(override.stat)} Manual {getStatDisplayName(override.stat)} set to {override.value}/100</span>
                            <span style={{ opacity: 0.8 }}>until {new Date(override.expiresAt).toLocaleTimeString()}</span>
                            <button onClick={() => clearManualStatOverride(override.stat)} style={{ marginLeft: 'auto', fontSize: 12, padding: '4px 8px' }}>
                                Clear
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Enhanced stat bars */}
            <div className={styles.statsContainer}>
                {showStat('energy') && (
                <div className={styles.statRow}>
                    <div className={styles.statInfo} title={HUD_STAT_TIPS.energy}>
                        <span className={styles.statIcon}>⚡</span>
                        <span className={styles.statName}>Energy</span>
                        <span className={styles.statValue}>{energy}/100</span>
                    </div>
                    <div className={styles.statBar}>
                        <BatteryProgressBar 
                            percent={energy} 
                            segments={10} 
                            width={200} 
                            height={22}
                            statType="energy"
                            pixel={batteryPixel}
                            statLabel="Energy"
                        />
                    </div>
                    <button 
                        type="button"
                        className={batteryPixel ? styles.statEditBtn : undefined}
                        onClick={() => { 
                            setManualStatValue(energy); 
                            setShowStatModal({ stat: 'energy', value: energy }); 
                        }} 
                        title="Adjust energy manually"
                        style={batteryPixel ? undefined : { marginLeft: 8, fontSize: 12, padding: '2px 6px' }}
                    >
                        ✎
                    </button>
                </div>
                )}

                {showStat('focus') && (
                <div className={styles.statRow}>
                    <div className={styles.statInfo} title={HUD_STAT_TIPS.focus}>
                        <span className={styles.statIcon}>🎯</span>
                        <span className={styles.statName}>Focus</span>
                        <span className={styles.statValue}>{focus}/100</span>
                    </div>
                    <div className={styles.statBar}>
                        <BatteryProgressBar 
                            percent={focus} 
                            segments={10} 
                            width={200} 
                            height={22}
                            statType="focus"
                            pixel={batteryPixel}
                            statLabel="Focus"
                        />
                    </div>
                    <button 
                        type="button"
                        className={batteryPixel ? styles.statEditBtn : undefined}
                        onClick={() => { 
                            setManualStatValue(focus); 
                            setShowStatModal({ stat: 'focus', value: focus }); 
                        }} 
                        title="Adjust focus manually"
                        style={batteryPixel ? undefined : { marginLeft: 8, fontSize: 12, padding: '2px 6px' }}
                    >
                        ✎
                    </button>
                </div>
                )}

                {showStat('motivation') && (
                <div className={styles.statRow}>
                    <div className={styles.statInfo} title={HUD_STAT_TIPS.motivation}>
                        <span className={styles.statIcon}>💪</span>
                        <span className={styles.statName}>Motivation</span>
                        <span className={styles.statValue}>{motivation}/100</span>
                    </div>
                    <div className={styles.statBar}>
                        <BatteryProgressBar 
                            percent={motivation} 
                            segments={10} 
                            width={200} 
                            height={22}
                            statType="motivation"
                            pixel={batteryPixel}
                            statLabel="Motivation"
                        />
                    </div>
                    <button 
                        type="button"
                        className={batteryPixel ? styles.statEditBtn : undefined}
                        onClick={() => { 
                            setManualStatValue(motivation); 
                            setShowStatModal({ stat: 'motivation', value: motivation }); 
                        }} 
                        title="Adjust motivation manually"
                        style={batteryPixel ? undefined : { marginLeft: 8, fontSize: 12, padding: '2px 6px' }}
                    >
                        ✎
                    </button>
                </div>
                )}

                {showStat('calm') && (
                <div className={styles.statRow}>
                    <div className={styles.statInfo} title={HUD_STAT_TIPS.calm}>
                        <span className={styles.statIcon}>🧘</span>
                        <span className={styles.statName}>Calm</span>
                        <span className={styles.statValue}>{calm}/100</span>
                    </div>
                    <div className={styles.statBar}>
                        <BatteryProgressBar 
                            percent={calm} 
                            segments={10} 
                            width={200} 
                            height={22}
                            statType="calm"
                            pixel={batteryPixel}
                            statLabel="Calm"
                        />
                    </div>
                    <button 
                        type="button"
                        className={batteryPixel ? styles.statEditBtn : undefined}
                        onClick={() => { 
                            setManualStatValue(calm); 
                            setShowStatModal({ stat: 'calm', value: calm }); 
                        }} 
                        title="Adjust calm manually"
                        style={batteryPixel ? undefined : { marginLeft: 8, fontSize: 12, padding: '2px 6px' }}
                    >
                        ✎
                    </button>
                </div>
                )}

                {showStat('stress') && (
                <div className={styles.statRow}>
                    <div className={styles.statInfo} title={HUD_STAT_TIPS.stress}>
                        <span className={styles.statIcon}>😰</span>
                        <span className={styles.statName}>Stress</span>
                        <span className={styles.statValue}>{stress}/100</span>
                    </div>
                    <div className={styles.statBar}>
                        <BatteryProgressBar 
                            percent={stress} 
                            segments={10} 
                            width={200} 
                            height={22}
                            statType="stress"
                            pixel={batteryPixel}
                            statLabel="Stress"
                        />
                    </div>
                    <button 
                        type="button"
                        className={batteryPixel ? styles.statEditBtn : undefined}
                        onClick={() => { 
                            setManualStatValue(stress); 
                            setShowStatModal({ stat: 'stress', value: stress }); 
                        }} 
                        title="Adjust stress manually"
                        style={batteryPixel ? undefined : { marginLeft: 8, fontSize: 12, padding: '2px 6px' }}
                    >
                        ✎
                    </button>
                </div>
                )}
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
            {/* Manual Stat Modal */}
            {showStatModal && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999
                }}
                    onClick={() => setShowStatModal(null)}
                >
                    <div 
                        style={{ 
                            background: 'var(--background-primary)', 
                            border: '1px solid var(--background-modifier-border)',
                            borderRadius: 10,
                            padding: 16,
                            width: 340,
                            boxShadow: '0 10px 30px rgba(0,0,0,0.35)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h4 style={{ margin: 0, marginBottom: 8 }}>
                            {getStatIcon(showStatModal.stat)} Adjust {getStatDisplayName(showStatModal.stat)}
                        </h4>
                        <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 12 }}>
                            Set how you feel right now; this will temporarily override system {getStatDisplayName(showStatModal.stat).toLowerCase()}.
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                            <span style={{ width: 36 }}>Value</span>
                            <input 
                                type="range" 
                                min={0} max={100} 
                                value={manualStatValue} 
                                onChange={(e) => setManualStatValue(parseInt(e.target.value))}
                                style={{ flex: 1 }}
                            />
                            <input 
                                type="number" 
                                min={0} max={100} 
                                value={manualStatValue} 
                                onChange={(e) => setManualStatValue(Math.max(0, Math.min(100, parseInt(e.target.value || '0'))))}
                                style={{ width: 64 }}
                            />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                            <span style={{ width: 36 }}>Expires</span>
                            <select 
                                value={manualStatHours} 
                                onChange={(e) => setManualStatHours(parseInt(e.target.value))}
                            >
                                <option value={1}>in 1 hour</option>
                                <option value={2}>in 2 hours</option>
                                <option value={4}>in 4 hours</option>
                                <option value={8}>in 8 hours</option>
                                <option value={12}>in 12 hours</option>
                                <option value={24}>in 24 hours</option>
                            </select>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <button onClick={() => setShowStatModal(null)}>Cancel</button>
                            <button 
                                onClick={() => applyManualStatOverride(showStatModal.stat, manualStatValue, manualStatHours)}
                                style={{ background: 'var(--interactive-accent)', color: 'var(--text-on-accent)', border: 'none', padding: '6px 10px', borderRadius: 6 }}
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <div className={styles.quickActions}>
                <button 
                    className={`${styles.quickAction} ${styles.restAction}`}
                    onClick={async () => {
                        if (isLoading) return;
                        // 1) Switch to Pomodoro tab
                        window.dispatchEvent(new CustomEvent('requestActiveTabChange', {
                            detail: { targetTab: 'pomodoro' }
                        }));
                        // 2) Build a rest session payload (meditation, 10 min)
                        const attachedQuest = {
                            title: 'Rest Break',
                            progress: 0,
                            difficulty: 'Easy',
                            priority: 'low',
                            rewards: { xp: 0, coins: 0, cp: 0, materials: [] },
                            description: '10-minute restorative break (meditation)',
                            dueDate: null as any,
                            subtasks: [] as Array<{ completed: boolean; text: string }>,
                            tags: ['#rest-session'],
                            skills: [] as string[],
                            filePath: 'system/rest',
                            lineNumber: 0,
                            isTimedQuest: false,
                            estimatedTime: 10,
                            // rest metadata used by PomodoroTab on completion
                            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                            // @ts-ignore allow dynamic payload fields for cross-feature event
                            restActivityId: 'meditation',
                            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                            // @ts-ignore
                            restDuration: 10
                        };
                        // 3) After a short delay, start the timer with attached rest session
                        setTimeout(() => {
                            // Stash globally in case the event fires before the tab mounts
                            (window as any).__nextPomodoroAttachedQuest = attachedQuest;
                            window.dispatchEvent(new CustomEvent('switchToPomodoroTab', {
                                detail: { attachedQuest }
                            }));
                        }, 300);
                    }}
                    disabled={isLoading}
                >
                    🧘 Quick Rest (10min)
                </button>
                <button 
                    className={`${styles.quickAction} ${styles.walkAction}`}
                    onClick={async () => {
                        if (isLoading) return;
                        window.dispatchEvent(new CustomEvent('requestActiveTabChange', {
                            detail: { targetTab: 'pomodoro' }
                        }));
                        const attachedQuest = {
                            title: 'Fresh Air Break',
                            progress: 0,
                            difficulty: 'Easy',
                            priority: 'low',
                            rewards: { xp: 0, coins: 0, cp: 0, materials: [] },
                            description: '15-minute nature walk break',
                            dueDate: null as any,
                            subtasks: [] as Array<{ completed: boolean; text: string }>,
                            tags: ['#rest-session'],
                            skills: [] as string[],
                            filePath: 'system/rest',
                            lineNumber: 0,
                            isTimedQuest: false,
                            estimatedTime: 15,
                            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                            // @ts-ignore
                            restActivityId: 'nature_walk',
                            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                            // @ts-ignore
                            restDuration: 15
                        };
                        setTimeout(() => {
                            (window as any).__nextPomodoroAttachedQuest = attachedQuest;
                            window.dispatchEvent(new CustomEvent('switchToPomodoroTab', {
                                detail: { attachedQuest }
                            }));
                        }, 300);
                    }}
                    disabled={isLoading}
                >
                    🚶 Fresh Air (15min)
                </button>
                <button 
                    className={`${styles.quickAction} ${styles.focusAction}`}
                    onClick={async () => {
                        if (isLoading || energy < 40) return;
                        window.dispatchEvent(new CustomEvent('requestActiveTabChange', {
                            detail: { targetTab: 'pomodoro' }
                        }));
                        const attachedQuest = {
                            title: 'Focus Session',
                            progress: 0,
                            difficulty: 'Normal',
                            priority: 'medium',
                            rewards: { xp: 0, coins: 0, cp: 0, materials: [] },
                            description: '45-minute focused work session',
                            dueDate: null as any,
                            subtasks: [] as Array<{ completed: boolean; text: string }>,
                            tags: ['#focus-session'],
                            skills: [] as string[],
                            filePath: 'system/focus',
                            lineNumber: 0,
                            isTimedQuest: false,
                            estimatedTime: 45
                        };
                        setTimeout(() => {
                            (window as any).__nextPomodoroAttachedQuest = attachedQuest;
                            window.dispatchEvent(new CustomEvent('switchToPomodoroTab', {
                                detail: { attachedQuest }
                            }));
                        }, 300);
                    }}
                    disabled={isLoading || energy < 40}
                >
                    🎯 Focus Session (45min)
                </button>
            </div>
        </div>
    );
};
