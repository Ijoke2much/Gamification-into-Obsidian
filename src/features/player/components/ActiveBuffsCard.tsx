import React, { useState, useEffect } from 'react';
import { playerStore } from '../../../shared/state/playerStore';
import { PlayerData, Buff } from '../../../data/models/PlayerData';
import styles from './ActiveBuffsCard.module.css';

export const ActiveBuffsCard: React.FC = () => {
    const [playerData, setPlayerData] = useState<PlayerData | null>(null);

    useEffect(() => {
        // Get initial data
        playerStore.get().then(setPlayerData);
        
        // Subscribe to changes
        const unsubscribe = playerStore.onChange((change) => {
            if (change.type === 'data-updated') {
                setPlayerData(change.payload);
            }
        });
        
        return unsubscribe;
    }, []);

    if (!playerData) return null;

    const activeBuffs = (playerData.buffs || []).filter((buff: Buff) => 
        !buff.expiresAt || new Date(buff.expiresAt) > new Date()
    );

    if (activeBuffs.length === 0) return null;

    const formatTimeRemaining = (expiresAt: string): string => {
        const now = new Date();
        const expiry = new Date(expiresAt);
        const diffMs = expiry.getTime() - now.getTime();
        
        if (diffMs <= 0) return 'Expired';
        
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    };

    const getBuffIcon = (buff: Buff): string => {
        if (buff.icon) return buff.icon;
        
        // Default icons based on buff type
        switch (buff.type) {
            case 'multiplier':
                return '⚡';
            case 'flat':
                return '📈';
            case 'temporary':
                return '⏰';
            default:
                return '✨';
        }
    };

    const getBuffColor = (buff: Buff): string => {
        // Color based on buff category or type
        switch (buff.category) {
            case 'energy': return '#FFD700'; // Gold
            case 'focus': return '#4CAF50'; // Green
            case 'motivation': return '#FF9800'; // Orange
            case 'general': return '#2196F3'; // Blue
            default:
                switch (buff.type) {
                    case 'multiplier': return '#4CAF50';
                    case 'flat': return '#2196F3';
                    case 'temporary': return '#FF9800';
                    default: return '#9C27B0';
                }
        }
    };

    const formatBuffValue = (buff: Buff): string => {
        switch (buff.type) {
            case 'multiplier':
                const percentage = ((buff.value - 1) * 100).toFixed(0);
                return percentage.startsWith('-') ? `${percentage}%` : `+${percentage}%`;
            case 'flat':
                return `+${buff.value}`;
            case 'temporary':
                return `${buff.value}`;
            default:
                return `${buff.value}`;
        }
    };

    const getBuffEffect = (buff: Buff): string => {
        if (buff.description) return buff.description;
        
        switch (buff.type) {
            case 'multiplier':
                return `Multiplies rewards by ${buff.value.toFixed(2)}x`;
            case 'flat':
                return `Adds ${buff.value} to rewards`;
            case 'temporary':
                return `Temporary effect: ${buff.value}`;
            default:
                return 'Provides a beneficial effect';
        }
    };

    return (
        <div className={styles.buffsCard}>
            <div className={styles.buffsHeader}>
                <h3 className={styles.buffsTitle}>✨ Active Buffs</h3>
                <div className={styles.buffsCount}>
                    {activeBuffs.length} active
                </div>
            </div>
            
            <div className={styles.buffsContent}>
                {activeBuffs.map((buff, index) => (
                    <div 
                        key={index} 
                        className={styles.buffItem}
                        style={{ borderLeftColor: getBuffColor(buff) }}
                    >
                        <div className={styles.buffIcon}>
                            {getBuffIcon(buff)}
                        </div>
                        <div className={styles.buffInfo}>
                            <div className={styles.buffName}>{buff.name}</div>
                            <div className={styles.buffEffect}>{getBuffEffect(buff)}</div>
                            <div className={styles.buffValue}>
                                <span className={styles.valueBadge}>
                                    {formatBuffValue(buff)}
                                </span>
                                {buff.category && (
                                    <span className={styles.categoryBadge}>
                                        {buff.category}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className={styles.buffTime}>
                            <div className={styles.timeRemaining}>
                                {buff.expiresAt ? formatTimeRemaining(buff.expiresAt) : 'Permanent'}
                            </div>
                            <div className={styles.timeLabel}>remaining</div>
                        </div>
                    </div>
                ))}
                
                <div className={styles.buffsTip}>
                    <small>💡 Buffs provide temporary bonuses to your rewards and stats!</small>
                </div>
            </div>
        </div>
    );
};
