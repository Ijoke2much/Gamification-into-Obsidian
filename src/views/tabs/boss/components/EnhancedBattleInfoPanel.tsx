import React from 'react';
import { ProductivityEquipment } from '../../../../features/quests/systems/productivityEquipmentSystem';
import styles from './EnhancedBattleInfoPanel.module.css';

interface EnhancedBattleInfoPanelProps {
    equippedGear: Map<string, ProductivityEquipment>;
    activeEvents: Map<string, any>;
    battlePreparation: any;
    playerStats: any;
    onEquipmentClick?: () => void;
}

export const EnhancedBattleInfoPanel: React.FC<EnhancedBattleInfoPanelProps> = ({
    equippedGear,
    activeEvents,
    battlePreparation,
    playerStats,
    onEquipmentClick
}) => {
    const renderEquipmentPanel = () => {
        if (equippedGear.size === 0) {
            return (
                <div className={styles.emptyEquipment}>
                    <div className={styles.emptyIcon}>⚔️</div>
                    <div className={styles.emptyText}>No Equipment</div>
                    <div className={styles.emptySubtext}>Visit inventory to equip productivity tools</div>
                    {onEquipmentClick && (
                        <button className={styles.equipButton} onClick={onEquipmentClick}>
                            Open Inventory
                        </button>
                    )}
                </div>
            );
        }

        return (
            <div className={styles.equipmentGrid}>
                {Array.from(equippedGear.entries()).map(([slot, equipment]) => (
                    <div key={slot} className={styles.equipmentItem}>
                        <div className={styles.equipmentIcon}>
                            {getEquipmentIcon(equipment.type)}
                        </div>
                        <div className={styles.equipmentInfo}>
                            <div className={styles.equipmentName}>{equipment.name}</div>
                            <div className={styles.equipmentEffects}>
                                {renderEquipmentEffects(equipment.effects)}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const renderActiveEvents = () => {
        if (activeEvents.size === 0) {
            return (
                <div className={styles.noEvents}>
                    <div className={styles.eventIcon}>🌟</div>
                    <div className={styles.eventText}>No Active Events</div>
                    <div className={styles.eventSubtext}>Stay productive to avoid negative events!</div>
                </div>
            );
        }

        return (
            <div className={styles.eventsGrid}>
                {Array.from(activeEvents.entries()).map(([bossId, event]) => (
                    <div key={event.id} className={`${styles.eventItem} ${getEventClassByType(event.type)}`}>
                        <div className={styles.eventHeader}>
                            <span className={styles.eventIconLarge}>{event.icon}</span>
                            <span className={styles.eventName}>{event.name}</span>
                        </div>
                        <div className={styles.eventDescription}>{event.description}</div>
                        {event.expiresAt && (
                            <div className={styles.eventTimer}>
                                ⏰ {formatTimeRemaining(event.expiresAt)}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    };

    const renderTaskDiscoveryInfo = () => {
        if (!battlePreparation?.taskDiscoveryResult) {
            return (
                <div className={styles.taskInfo}>
                    <div className={styles.taskIcon}>📋</div>
                    <div className={styles.taskText}>Task discovery active</div>
                    <div className={styles.taskSubtext}>New tasks will be detected automatically</div>
                </div>
            );
        }

        const { taskDiscoveryResult } = battlePreparation;
        const totalTasks = taskDiscoveryResult.tasks?.length || 0;
        const newTasks = taskDiscoveryResult.newTasks?.length || 0;
        const removedTasks = taskDiscoveryResult.removedTasks?.length || 0;

        return (
            <div className={styles.taskDiscoveryPanel}>
                <div className={styles.taskHeader}>
                    <span className={styles.taskIcon}>📋</span>
                    <span className={styles.taskTitle}>Task Discovery</span>
                </div>
                
                <div className={styles.taskStats}>
                    <div className={styles.taskStat}>
                        <span className={styles.taskStatValue}>{totalTasks}</span>
                        <span className={styles.taskStatLabel}>Total Tasks</span>
                    </div>
                    {newTasks > 0 && (
                        <div className={styles.taskStat}>
                            <span className={styles.taskStatValue}>+{newTasks}</span>
                            <span className={styles.taskStatLabel}>New</span>
                        </div>
                    )}
                    {removedTasks > 0 && (
                        <div className={styles.taskStat}>
                            <span className={styles.taskStatValue}>-{removedTasks}</span>
                            <span className={styles.taskStatLabel}>Removed</span>
                        </div>
                    )}
                </div>

                {taskDiscoveryResult.scopeChange && (
                    <div className={`${styles.scopeChange} ${styles[taskDiscoveryResult.scopeChange.impact]}`}>
                        <div className={styles.scopeIcon}>
                            {taskDiscoveryResult.scopeChange.impact === 'major' ? '🚨' : 
                             taskDiscoveryResult.scopeChange.impact === 'moderate' ? '⚠️' : 'ℹ️'}
                        </div>
                        <div className={styles.scopeText}>
                            {taskDiscoveryResult.scopeChange.description}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderPlayerStats = () => {
        if (!playerStats) return null;

        const statEntries = Object.entries(playerStats).filter(([key, value]) => 
            typeof value === 'number' && value > 0
        );

        return (
            <div className={styles.playerStatsPanel}>
                <div className={styles.statsHeader}>
                    <span className={styles.statsIcon}>📊</span>
                    <span className={styles.statsTitle}>Battle Stats</span>
                </div>
                
                <div className={styles.statsGrid}>
                    {statEntries.map(([statName, value]) => (
                        <div key={statName} className={styles.statItem}>
                            <div className={styles.statName}>
                                {getStatIcon(statName)} {formatStatName(statName)}
                            </div>
                            <div className={styles.statValue}>{String(value)}</div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const getEquipmentIcon = (type: string): string => {
        switch (type) {
            case 'weapon': return '⚔️';
            case 'armor': return '🛡️';
            case 'accessory': return '💍';
            case 'consumable': return '🧪';
            default: return '📦';
        }
    };

    const renderEquipmentEffects = (effects: any): string => {
        const effectStrings: string[] = [];
        
        Object.entries(effects).forEach(([key, value]) => {
            if (typeof value === 'boolean' && value) {
                effectStrings.push(`✅ ${key.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
            } else if (typeof value === 'number' && value > 0) {
                effectStrings.push(`+${Math.round(value * 100)}% ${key.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
            }
        });
        
        return effectStrings.join(', ');
    };

    const getEventClassByType = (eventType: string): string => {
        const positiveEvents = ['weekend_motivation', 'inspiration_strike', 'found_shortcut', 'collaboration_boost'];
        const negativeEvents = ['sick_day', 'unexpected_meeting', 'procrastination_wave', 'technical_issues'];
        
        if (positiveEvents.includes(eventType)) return styles.positiveEvent;
        if (negativeEvents.includes(eventType)) return styles.negativeEvent;
        return styles.neutralEvent;
    };

    const formatTimeRemaining = (expiresAt: Date): string => {
        const now = new Date();
        const remaining = expiresAt.getTime() - now.getTime();
        
        if (remaining <= 0) return 'Expired';
        
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    };

    const getStatIcon = (statName: string): string => {
        const iconMap: Record<string, string> = {
            strength: '💪',
            endurance: '🏃',
            focus: '🎯',
            intelligence: '🧠',
            creativity: '🎨',
            motivation: '🔥',
            patience: '🧘',
            agility: '⚡',
            charisma: '🗣️'
        };
        return iconMap[statName] || '📊';
    };

    const formatStatName = (statName: string): string => {
        return statName.charAt(0).toUpperCase() + statName.slice(1);
    };

    return (
        <div className={styles.enhancedBattleInfoPanel}>
            {/* Equipment Panel */}
            <div className={styles.infoSection}>
                <div className={styles.sectionHeader}>
                    <span className={styles.sectionIcon}>⚔️</span>
                    <span className={styles.sectionTitle}>Productivity Equipment</span>
                </div>
                <div className={styles.sectionContent}>
                    {renderEquipmentPanel()}
                </div>
            </div>

            {/* Active Events Panel */}
            <div className={styles.infoSection}>
                <div className={styles.sectionHeader}>
                    <span className={styles.sectionIcon}>🎲</span>
                    <span className={styles.sectionTitle}>Active Events</span>
                </div>
                <div className={styles.sectionContent}>
                    {renderActiveEvents()}
                </div>
            </div>

            {/* Task Discovery Panel */}
            <div className={styles.infoSection}>
                <div className={styles.sectionHeader}>
                    <span className={styles.sectionIcon}>📋</span>
                    <span className={styles.sectionTitle}>Task Discovery</span>
                </div>
                <div className={styles.sectionContent}>
                    {renderTaskDiscoveryInfo()}
                </div>
            </div>

            {/* Player Stats Panel */}
            <div className={styles.infoSection}>
                <div className={styles.sectionHeader}>
                    <span className={styles.sectionIcon}>📊</span>
                    <span className={styles.sectionTitle}>Battle Stats</span>
                </div>
                <div className={styles.sectionContent}>
                    {renderPlayerStats()}
                </div>
            </div>
        </div>
    );
};
