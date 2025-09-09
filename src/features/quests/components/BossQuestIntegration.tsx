import React, { useState } from 'react';
import { Boss, BossProgress } from '../types/BossTypes';
import { BossBattleModal } from '../modals/BossBattleModal';
import { BossCreationModal } from '../modals/BossCreationModal';
import { useQuestBossIntegration } from '../data/hooks/useBossIntegration';
import { Quest } from '../utils/taskParser';
import { getAllBossThemes } from '../utils/bossFactory';
import styles from './BossQuestIntegration.module.css';

interface BossQuestIntegrationProps {
    quest: Quest;
    onQuestUpdate?: (quest: Quest) => void;
    compact?: boolean;
    showCreateOption?: boolean;
}

export const BossQuestIntegration: React.FC<BossQuestIntegrationProps> = ({
    quest,
    onQuestUpdate,
    compact = false,
    showCreateOption = true
}) => {
    const {
        questBoss,
        isBossActive,
        bossRewards,
        startQuestBossBattle,
        endQuestBossBattle,
        createBoss,
        isLoading,
        error
    } = useQuestBossIntegration(quest.id);

    const [showBossBattle, setShowBossBattle] = useState(false);
    const [showBossCreation, setShowBossCreation] = useState(false);
    const [bossThemes] = useState(() => getAllBossThemes());

    const handleStartBattle = () => {
        if (questBoss) {
            setShowBossBattle(true);
        }
    };

    const handleCreateBoss = () => {
        setShowBossCreation(true);
    };

    const handleBossCreated = async (bossOptions: any) => {
        try {
            await createBoss(bossOptions, quest);
            setShowBossCreation(false);
        } catch (error) {
            console.error('Failed to create boss:', error);
        }
    };

    const handleBattleVictory = async () => {
        // Placeholder - will be implemented when boss system is ready
        setShowBossBattle(false);
        
        // Notify quest update if callback provided
        if (onQuestUpdate) {
            // Update quest with boss completion
            const updatedQuest = { ...quest, bossCompleted: true };
            onQuestUpdate(updatedQuest);
        }
    };

    const handleBattleDefeat = async () => {
        // Placeholder - will be implemented when boss system is ready
        setShowBossBattle(false);
    };

    const handleBattleClose = () => {
        setShowBossBattle(false);
    };

    // If no boss is active and we're not showing create option, don't render anything
    if (!isBossActive && !showCreateOption) {
        return null;
    }

    if (compact) {
        return (
            <div className={styles.compactBossCard}>
                {/* Placeholder - boss system not yet implemented */}
                <div className={styles.compactBossInfo}>
                    <span className={styles.bossIcon}>🐉</span>
                    <span className={styles.bossName}>Boss System</span>
                    <div className={styles.compactHpBar}>
                        <div className={styles.hpFill} style={{ width: '0%' }} />
                    </div>
                    <button 
                        className={styles.compactBattleButton}
                        disabled={true}
                        title="Boss system coming soon"
                    >
                        ⚔️
                    </button>
                </div>
                
                {error && <div className={styles.error}>{error}</div>}
            </div>
        );
    }

    return (
        <div className={styles.bossQuestIntegration}>
            {/* Placeholder - boss system not yet implemented */}
            <div className={styles.placeholderBossCard}>
                <div className={styles.placeholderIcon}>🐉</div>
                <h3>Boss System Coming Soon</h3>
                <p>This feature is under development and will be available in a future update.</p>
                <div className={styles.placeholderFeatures}>
                    <span>⚔️ Boss Battles</span>
                    <span>🎯 Quest Integration</span>
                    <span>🏆 Rewards System</span>
                </div>
            </div>

            {error && (
                <div className={styles.errorContainer}>
                    <span className={styles.errorIcon}>⚠️</span>
                    <span className={styles.errorText}>{error}</span>
                </div>
            )}

            {/* Boss system modals will be implemented when the system is ready */}
        </div>
    );
};

// Active Boss Card Component
const ActiveBossCard: React.FC<{
    boss: Boss;
    progress: BossProgress;
    rewards: Boss['rewards'] | null;
    onStartBattle: () => void;
    isLoading: boolean;
}> = ({ boss, progress, rewards, onStartBattle, isLoading }) => {
    const hpPercentage = (progress.currentHP / progress.maxHP) * 100;
    const isLowHealth = hpPercentage <= 25;
    const isMediumHealth = hpPercentage <= 50;

    return (
        <div className={`${styles.activeBossCard} ${isLowHealth ? styles.lowHealth : ''}`}>
            <div className={styles.bossHeader}>
                <div className={styles.bossAvatar}>
                    <span className={styles.avatarText}>
                        {boss.visuals?.avatar || boss.image || '🐉'}
                    </span>
                    {boss.type && (
                        <span className={styles.bossType}>{boss.type}</span>
                    )}
                </div>
                <div className={styles.bossInfo}>
                    <h3 className={styles.bossName}>{boss.name}</h3>
                    <p className={styles.bossDescription}>{boss.description}</p>
                    <div className={styles.bossStats}>
                        <span className={styles.stat}>ATK: {boss.stats.attack}</span>
                        <span className={styles.stat}>DEF: {boss.stats.defense}</span>
                        <span className={styles.stat}>SPD: {boss.stats.speed}</span>
                    </div>
                </div>
            </div>

            <div className={styles.bossProgress}>
                <div className={styles.hpSection}>
                    <div className={styles.hpLabel}>
                        <span>HP</span>
                        <span className={styles.hpValues}>
                            {progress.currentHP} / {progress.maxHP}
                        </span>
                    </div>
                    <div className={`${styles.hpBar} ${isLowHealth ? styles.lowHealth : ''} ${isMediumHealth ? styles.mediumHealth : ''}`}>
                        <div 
                            className={styles.hpFill} 
                            style={{ width: `${hpPercentage}%` }} 
                        />
                    </div>
                </div>

                <div className={styles.phaseSection}>
                    <span className={styles.phaseLabel}>Phase {progress.phase + 1}</span>
                    <div className={styles.phaseProgress}>
                        <div 
                            className={styles.phaseFill} 
                            style={{ width: `${progress.phaseProgress}%` }} 
                        />
                    </div>
                </div>
            </div>

            {rewards && (
                <div className={styles.rewardsPreview}>
                    <span className={styles.rewardsLabel}>Rewards:</span>
                    <div className={styles.rewardsList}>
                        <span className={styles.reward}>🎯 {rewards.xp} XP</span>
                        <span className={styles.reward}>⭐ {rewards.cp} CP</span>
                        <span className={styles.reward}>🪙 {rewards.coins} Coins</span>
                    </div>
                </div>
            )}

            <div className={styles.bossActions}>
                <button
                    className={`${styles.battleButton} ${isLoading ? styles.loading : ''}`}
                    onClick={onStartBattle}
                    disabled={isLoading}
                >
                    {isLoading ? '⚔️ Loading...' : '⚔️ Battle Boss'}
                </button>
                <button
                    className={styles.viewButton}
                    onClick={() => console.log('View boss details:', boss)}
                    title="View boss details"
                >
                    👁️ Details
                </button>
            </div>
        </div>
    );
};

// No Boss Card Component
const NoBossCard: React.FC<{
    quest: Quest;
    onCreateBoss: () => void;
    showCreateOption: boolean;
    isLoading: boolean;
}> = ({ quest, onCreateBoss, showCreateOption, isLoading }) => {
    return (
        <div className={styles.noBossCard}>
            <div className={styles.noBossIcon}>🎯</div>
            <div className={styles.noBossContent}>
                <h3 className={styles.noBossTitle}>No Boss Assigned</h3>
                <p className={styles.noBossDescription}>
                    This quest doesn't have a boss yet. Create one to add challenge and rewards!
                </p>
                
                {showCreateOption && (
                    <button
                        className={`${styles.createBossButton} ${isLoading ? styles.loading : ''}`}
                        onClick={onCreateBoss}
                        disabled={isLoading}
                    >
                        {isLoading ? '🎨 Creating...' : '🎨 Create Boss'}
                    </button>
                )}
            </div>
        </div>
    );
};

export default BossQuestIntegration;
