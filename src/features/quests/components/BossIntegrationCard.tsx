import React, { useState, useEffect } from 'react';
import { Boss, BossProgress } from '../types/BossTypes';
import { BossBattleModal } from '../modals/BossBattleModal';
import { bossManagementService } from '../utils/bossManagementService';
import { Quest } from '../utils/taskParser';
import styles from './BossIntegrationCard.module.css';

interface BossIntegrationCardProps {
    quest: Quest;
    onQuestUpdate?: (quest: Quest) => void;
    compact?: boolean;
}

export const BossIntegrationCard: React.FC<BossIntegrationCardProps> = ({ 
    quest, 
    onQuestUpdate,
    compact = false 
}) => {
    const [boss, setBoss] = useState<Boss | null>(null);
    const [bossProgress, setBossProgress] = useState<BossProgress | null>(null);
    const [showBossBattle, setShowBossBattle] = useState(false);
    const [isCreatingBoss, setIsCreatingBoss] = useState(false);

    // Load boss data when component mounts or quest changes
    useEffect(() => {
        if (quest.bossId) {
            const bossData = bossManagementService.getBossForQuest(quest.id);
            if (bossData) {
                setBoss(bossData.boss);
                setBossProgress(bossData.progress);
            }
        } else {
            setBoss(null);
            setBossProgress(null);
        }
    }, [quest.bossId, quest.id]);

    // Check if this quest should have a boss
    const shouldHaveBoss = bossManagementService.shouldCreateBossForQuest(quest);
    const bossRecommendation = bossManagementService.getBossRecommendation(quest);

    const handleCreateBoss = async () => {
        if (!shouldHaveBoss) return;
        
        setIsCreatingBoss(true);
        try {
            const newBoss = bossManagementService.createBossForQuest(quest, 5);
            if (newBoss) {
                setBoss(newBoss);
                const bossData = bossManagementService.getBossForQuest(quest.id);
                if (bossData) {
                    setBossProgress(bossData.progress);
                }
                
                // Notify parent component of quest update
                if (onQuestUpdate) {
                    onQuestUpdate(quest);
                }
            }
        } catch (error) {
            console.error('Failed to create boss:', error);
        } finally {
            setIsCreatingBoss(false);
        }
    };

    const handleUpdateProgress = async () => {
        if (!boss) return;
        
        try {
            const progress = bossManagementService.updateBossProgress(quest.id);
            if (progress) {
                setBossProgress(progress);
                
                // Check if boss can now be defeated
                if (progress.currentHP <= 1) {
                    console.log('🎉 Boss can now be defeated! All tasks completed!');
                }
                
                // Notify parent component of quest update
                if (onQuestUpdate) {
                    onQuestUpdate(quest);
                }
            }
        } catch (error) {
            console.error('Failed to update boss progress:', error);
        }
    };

    const handleBossVictory = (defeatedBoss: Boss) => {
        console.log('🏆 Boss defeated! Rewards:', defeatedBoss.rewards);
        setBoss(null);
        setBossProgress(null);
        setShowBossBattle(false);
        
        // Notify parent component of quest update
        if (onQuestUpdate) {
            onQuestUpdate(quest);
        }
    };

    const handleBossDefeat = () => {
        console.log('💀 Boss defeated you! Try again after completing more tasks.');
        setShowBossBattle(false);
    };

    // If quest is too simple for a boss, show minimal info
    if (!shouldHaveBoss) {
        if (compact) return null;
        
        return (
            <div className={styles.bossCard}>
                <div className={styles.bossHeader}>
                    <span className={styles.bossIcon}>🐉</span>
                    <span className={styles.bossTitle}>Boss System</span>
                </div>
                <div className={styles.bossContent}>
                    <p className={styles.bossDescription}>
                        This quest is too simple for a boss battle. 
                        Try creating a quest with high difficulty, priority, or many subtasks!
                    </p>
                </div>
            </div>
        );
    }

    // If no boss exists yet, show creation option
    if (!boss) {
        return (
            <div className={styles.bossCard}>
                <div className={styles.bossHeader}>
                    <span className={styles.bossIcon}>⚔️</span>
                    <span className={styles.bossTitle}>Boss Battle System</span>
                </div>
                <div className={styles.bossContent}>
                    <div className={styles.bossRecommendation}>
                        <strong>Boss Recommendation:</strong> {bossRecommendation.bossType}
                    </div>
                    <p className={styles.bossReason}>{bossRecommendation.reason}</p>
                    
                    <button
                        className={styles.createBossButton}
                        onClick={handleCreateBoss}
                        disabled={isCreatingBoss}
                    >
                        {isCreatingBoss ? 'Creating...' : '🗡️ Create Boss'}
                    </button>
                </div>
            </div>
        );
    }

    // Boss exists - show status and controls
    const healthPercentage = (boss.stats.currentHP / boss.stats.maxHP) * 100;
    const canDefeat = boss.stats.currentHP <= 1;

    return (
        <div className={styles.bossCard}>
            <div className={styles.bossHeader}>
                <span className={styles.bossIcon}>🐉</span>
                <span className={styles.bossTitle}>{boss.title}</span>
                <span className={styles.bossType}>{boss.type.replace('-', ' ')}</span>
            </div>
            
            <div className={styles.bossContent}>
                <p className={styles.bossDescription}>{boss.description}</p>
                
                {/* Boss HP Bar */}
                <div className={styles.bossHP}>
                    <div className={styles.hpBar}>
                        <div 
                            className={styles.hpFill}
                            style={{ 
                                width: `${healthPercentage}%`,
                                backgroundColor: healthPercentage > 50 ? '#4ecdc4' : 
                                               healthPercentage > 25 ? '#ff6b6b' : '#ff0000'
                            }}
                        />
                    </div>
                    <span className={styles.hpText}>
                        {boss.stats.currentHP} / {boss.stats.maxHP} HP
                    </span>
                </div>
                
                {/* Boss Phase */}
                <div className={styles.bossPhase}>
                    Phase {boss.currentPhase + 1} of {boss.phases.length}
                </div>
                
                {/* Boss Controls */}
                <div className={styles.bossControls}>
                    <button
                        className={styles.battleButton}
                        onClick={() => setShowBossBattle(true)}
                        disabled={!canDefeat}
                    >
                        ⚔️ Battle Boss
                    </button>
                    
                    <button
                        className={styles.updateButton}
                        onClick={handleUpdateProgress}
                    >
                        📋 Update Progress
                    </button>
                </div>
                
                {/* Progress Info */}
                {bossProgress && (
                    <div className={styles.progressInfo}>
                        <div>Last Updated: {bossProgress.lastUpdated.toLocaleString()}</div>
                        <div>Status: {bossProgress.isActive ? 'Active' : 'Defeated'}</div>
                        {canDefeat && (
                            <div className={styles.canDefeatMessage}>
                                🎉 All tasks completed! Boss can now be defeated!
                            </div>
                        )}
                    </div>
                )}
            </div>
            
            {/* Boss Battle Modal */}
            {showBossBattle && (
                <BossBattleModal
                    isOpen={showBossBattle}
                    onClose={() => setShowBossBattle(false)}
                    boss={boss}
                    onVictory={handleBossVictory}
                    onDefeat={handleBossDefeat}
                />
            )}
        </div>
    );
};

export default BossIntegrationCard;
