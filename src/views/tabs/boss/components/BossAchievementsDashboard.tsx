import React, { useState, useEffect } from 'react';
import { bossAchievementSystem, BossAchievement, AchievementRarity, AchievementCategory } from '../../../../features/quests/systems/bossAchievementSystem';
import styles from '../BossBattleStyles.module.css';

interface BossAchievementsDashboardProps {
    onAchievementSelect?: (achievement: BossAchievement) => void;
}

export const BossAchievementsDashboard: React.FC<BossAchievementsDashboardProps> = ({
    onAchievementSelect
}) => {
    const [achievements, setAchievements] = useState<BossAchievement[]>([]);
    const [progress, setProgress] = useState<any>(null);
    const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | 'all'>('all');
    const [selectedRarity, setSelectedRarity] = useState<AchievementRarity | 'all'>('all');

    useEffect(() => {
        loadAchievements();
    }, []);

    const loadAchievements = () => {
        const allAchievements = Array.from(bossAchievementSystem.getAllAchievements().values());
        const achievementProgress = bossAchievementSystem.getAchievementProgress();
        
        setAchievements(allAchievements);
        setProgress(achievementProgress);
    };

    const getFilteredAchievements = () => {
        return achievements.filter(achievement => {
            const categoryMatch = selectedCategory === 'all' || achievement.category === selectedCategory;
            const rarityMatch = selectedRarity === 'all' || achievement.rarity === selectedRarity;
            return categoryMatch && rarityMatch;
        });
    };

    const isAchievementUnlocked = (achievementId: string) => {
        return progress?.unlockedAchievements.includes(achievementId) || false;
    };

    const getRarityColor = (rarity: AchievementRarity): string => {
        switch (rarity) {
            case 'common': return '#64748b';
            case 'uncommon': return '#10b981';
            case 'rare': return '#3b82f6';
            case 'epic': return '#8b5cf6';
            case 'legendary': return '#ffd700';
            default: return '#64748b';
        }
    };

    const getCategoryIcon = (category: AchievementCategory): string => {
        switch (category) {
            case 'progression': return '🎯';
            case 'speed': return '⚡';
            case 'skill': return '💎';
            case 'combat': return '⚔️';
            case 'personality': return '🎭';
            case 'endurance': return '💪';
            case 'streak': return '🔥';
            case 'collection': return '📚';
            case 'mastery': return '🌟';
            case 'legendary': return '👑';
            default: return '🏆';
        }
    };

    const getProgressPercentage = () => {
        if (!progress) return 0;
        return Math.round((progress.unlockedAchievements.length / achievements.length) * 100);
    };

    const getAchievementsByRarity = () => {
        const rarityCount: Record<AchievementRarity, number> = {
            common: 0,
            uncommon: 0,
            rare: 0,
            epic: 0,
            legendary: 0
        };

        const unlockedRarityCount: Record<AchievementRarity, number> = {
            common: 0,
            uncommon: 0,
            rare: 0,
            epic: 0,
            legendary: 0
        };

        achievements.forEach(achievement => {
            rarityCount[achievement.rarity]++;
            if (isAchievementUnlocked(achievement.id)) {
                unlockedRarityCount[achievement.rarity]++;
            }
        });

        return { rarityCount, unlockedRarityCount };
    };

    const renderAchievementCard = (achievement: BossAchievement) => {
        const unlocked = isAchievementUnlocked(achievement.id);
        
        return (
            <div
                key={achievement.id}
                className={`${styles.achievementCard} ${unlocked ? styles.unlocked : styles.locked}`}
                style={{ borderColor: getRarityColor(achievement.rarity) }}
                onClick={() => onAchievementSelect?.(achievement)}
            >
                <div className={styles.achievementHeader}>
                    <div className={styles.achievementIcon}>
                        {unlocked ? achievement.icon : '🔒'}
                    </div>
                    <div className={styles.achievementRarity} style={{ color: getRarityColor(achievement.rarity) }}>
                        {achievement.rarity.toUpperCase()}
                    </div>
                </div>

                <div className={styles.achievementContent}>
                    <h4 className={styles.achievementName}>
                        {unlocked ? achievement.name : '???'}
                    </h4>
                    <p className={styles.achievementDescription}>
                        {unlocked ? achievement.description : 'Achievement locked'}
                    </p>
                    
                    {unlocked && (
                        <div className={styles.achievementRewards}>
                            <div className={styles.rewardItem}>
                                💰 {achievement.rewards.coins} coins
                            </div>
                            <div className={styles.rewardItem}>
                                ⭐ {achievement.rewards.xp} XP
                            </div>
                            {achievement.rewards.title && (
                                <div className={styles.rewardItem}>
                                    👑 Title: {achievement.rewards.title}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className={styles.achievementFooter}>
                    <div className={styles.categoryTag}>
                        {getCategoryIcon(achievement.category)} {achievement.category}
                    </div>
                    {unlocked && (
                        <div className={styles.unlockedDate}>
                            ✅ Unlocked
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderProgressOverview = () => {
        const { rarityCount, unlockedRarityCount } = getAchievementsByRarity();
        
        return (
            <div className={styles.progressOverview}>
                <div className={styles.overallProgress}>
                    <h3>Achievement Progress</h3>
                    <div className={styles.progressBar}>
                        <div 
                            className={styles.progressFill}
                            style={{ width: `${getProgressPercentage()}%` }}
                        />
                    </div>
                    <div className={styles.progressText}>
                        {progress?.unlockedAchievements.length || 0} / {achievements.length} 
                        ({getProgressPercentage()}%)
                    </div>
                </div>

                <div className={styles.rarityBreakdown}>
                    <h4>By Rarity</h4>
                    <div className={styles.rarityGrid}>
                        {Object.entries(rarityCount).map(([rarity, total]) => (
                            <div key={rarity} className={styles.rarityItem}>
                                <div 
                                    className={styles.rarityColor}
                                    style={{ backgroundColor: getRarityColor(rarity as AchievementRarity) }}
                                />
                                <div className={styles.rarityLabel}>
                                    {rarity.charAt(0).toUpperCase() + rarity.slice(1)}
                                </div>
                                <div className={styles.rarityCount}>
                                    {unlockedRarityCount[rarity as AchievementRarity]} / {total}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    const renderFilters = () => {
        const categories: (AchievementCategory | 'all')[] = [
            'all', 'progression', 'speed', 'skill', 'combat', 'personality', 
            'endurance', 'streak', 'collection', 'mastery', 'legendary'
        ];
        
        const rarities: (AchievementRarity | 'all')[] = [
            'all', 'common', 'uncommon', 'rare', 'epic', 'legendary'
        ];

        return (
            <div className={styles.achievementFilters}>
                <div className={styles.filterGroup}>
                    <label>Category:</label>
                    <select 
                        value={selectedCategory} 
                        onChange={(e) => setSelectedCategory(e.target.value as AchievementCategory | 'all')}
                        className={styles.filterSelect}
                    >
                        {categories.map(category => (
                            <option key={category} value={category}>
                                {category === 'all' ? 'All Categories' : 
                                 `${getCategoryIcon(category as AchievementCategory)} ${category}`}
                            </option>
                        ))}
                    </select>
                </div>

                <div className={styles.filterGroup}>
                    <label>Rarity:</label>
                    <select 
                        value={selectedRarity} 
                        onChange={(e) => setSelectedRarity(e.target.value as AchievementRarity | 'all')}
                        className={styles.filterSelect}
                    >
                        {rarities.map(rarity => (
                            <option key={rarity} value={rarity}>
                                {rarity === 'all' ? 'All Rarities' : rarity.charAt(0).toUpperCase() + rarity.slice(1)}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        );
    };

    const renderRecentAchievements = () => {
        if (!progress) return null;
        
        const recentAchievements = progress.unlockedAchievements.slice(-5).map((id: string) => 
            achievements.find(a => a.id === id)
        ).filter(Boolean);

        if (recentAchievements.length === 0) return null;

        return (
            <div className={styles.recentAchievements}>
                <h4>Recently Unlocked</h4>
                <div className={styles.recentList}>
                    {recentAchievements.map((achievement: BossAchievement) => (
                        <div key={achievement.id} className={styles.recentItem}>
                            <span className={styles.recentIcon}>{achievement.icon}</span>
                            <span className={styles.recentName}>{achievement.name}</span>
                            <span 
                                className={styles.recentRarity}
                                style={{ color: getRarityColor(achievement.rarity) }}
                            >
                                {achievement.rarity}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    if (!progress) {
        return <div className={styles.loading}>Loading achievements...</div>;
    }

    return (
        <div className={styles.achievementsDashboard}>
            {renderProgressOverview()}
            {renderRecentAchievements()}
            {renderFilters()}
            
            <div className={styles.achievementsGrid}>
                {getFilteredAchievements().map(renderAchievementCard)}
            </div>
        </div>
    );
};
