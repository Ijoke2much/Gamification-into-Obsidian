import React, { useState, useEffect } from 'react';
import { playerStore } from '../../../shared/state/playerStore';
import { PlayerData, Artifact } from '../../../data/models/PlayerData';
import styles from './ActiveArtifactsCard.module.css';

export const ActiveArtifactsCard: React.FC = () => {
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

    const activeArtifacts = (playerData.activeArtifacts || []).filter((artifact: Artifact) => 
        new Date(artifact.expiresAt) > new Date()
    );

    if (activeArtifacts.length === 0) return null;

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

    const getCategoryIcon = (category?: string): string => {
        switch (category) {
            case 'entertainment': return '🎬';
            case 'learning': return '📚';
            case 'exercise': return '🏃‍♂️';
            case 'social': return '👥';
            case 'creative': return '🎨';
            case 'relaxation': return '🧘';
            default: return '🏺';
        }
    };

    return (
        <div className={styles.statusCard}>
            <div className={styles.statusHeader}>
                <h3 className={styles.statusTitle}>🏺 Active Real-World Activities</h3>
            </div>
            
            <div className={styles.statusContent}>
                {activeArtifacts.map((artifact, index) => (
                    <div key={index} className={styles.artifactItem}>
                        <div className={styles.artifactIcon}>
                            {artifact.icon || getCategoryIcon(artifact.category)}
                        </div>
                        <div className={styles.artifactInfo}>
                            <div className={styles.artifactName}>{artifact.name}</div>
                            <div className={styles.artifactActivity}>{artifact.realWorldActivity}</div>
                            <div className={styles.artifactDescription}>{artifact.description}</div>
                        </div>
                        <div className={styles.artifactTime}>
                            <div className={styles.timeRemaining}>
                                {formatTimeRemaining(artifact.expiresAt)}
                            </div>
                            <div className={styles.timeLabel}>remaining</div>
                        </div>
                    </div>
                ))}
                
                <div className={styles.artifactsTip}>
                    <small>💡 Use artifact items from your inventory to enable real-world activities that show here!</small>
                </div>
            </div>
        </div>
    );
};
