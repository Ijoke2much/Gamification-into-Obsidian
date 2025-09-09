import React, { useState, useEffect } from 'react';
import { BossBattleModal } from '../modals/BossBattleModal';
import { BossCreationModal } from '../modals/BossCreationModal';
import { Boss, BossProgress, BossTheme } from '../types/BossTypes';
import { getAllBossThemes } from '../utils/bossFactory';
import { bossManagementService } from '../utils/bossManagementService';
import styles from './BossDashboard.module.css';

interface EnhancedBossDashboardProps {
    plugin: any; // Replace with proper plugin type
}

export const EnhancedBossDashboard: React.FC<EnhancedBossDashboardProps> = ({ plugin }) => {
    const [activeBosses, setActiveBosses] = useState<Array<{ boss: Boss; progress: BossProgress; quest: any }>>([]);
    const [defeatedBosses, setDefeatedBosses] = useState<Array<{ boss: Boss; quest: any; defeatedAt: Date }>>([]);
    const [bossThemes, setBossThemes] = useState<BossTheme[]>([]);
    const [selectedBoss, setSelectedBoss] = useState<Boss | null>(null);
    const [showBossBattle, setShowBossBattle] = useState(false);
    const [showBossCreation, setShowBossCreation] = useState(false);
    const [activeTab, setActiveTab] = useState<'active' | 'history' | 'create' | 'arena' | 'analytics'>('active');
    const [analytics, setAnalytics] = useState<any>(null);

    useEffect(() => {
        loadBossData();
        loadBossThemes();
        loadAnalytics();
    }, []);

    const loadBossData = () => {
        const active = bossManagementService.getActiveBosses();
        const defeated = bossManagementService.getDefeatedBosses();
        setActiveBosses(active);
        setDefeatedBosses(defeated);
    };

    const loadBossThemes = () => {
        const themes = getAllBossThemes();
        setBossThemes(themes);
    };

    const loadAnalytics = () => {
        const analyticsData = bossManagementService.getBossAnalytics();
        setAnalytics(analyticsData);
    };

    const handleBossBattle = (boss: Boss) => {
        setSelectedBoss(boss);
        setShowBossBattle(true);
    };

    const handleBossCreation = () => {
        setShowBossCreation(true);
    };

    const handleBossDefeated = (boss: Boss) => {
        // Refresh boss data after defeat
        loadBossData();
        loadAnalytics();
        setShowBossBattle(false);
    };

    const handleBossFled = (boss: Boss) => {
        setShowBossBattle(false);
    };

    const handleRefreshData = () => {
        loadBossData();
        loadAnalytics();
    };

    return (
        <div className={styles.bossDashboard}>
            {/* Header */}
            <div className={styles.header}>
                <h1 className={styles.title}>🐉 Boss Arena</h1>
                <p className={styles.subtitle}>Face your fears, claim your rewards</p>
                <button 
                    className={styles.refreshButton}
                    onClick={handleRefreshData}
                    title="Refresh boss data"
                >
                    🔄 Refresh
                </button>
            </div>

            {/* Navigation Tabs */}
            <div className={styles.tabs}>
                <button
                    className={`${styles.tab} ${activeTab === 'active' ? styles.active : ''}`}
                    onClick={() => setActiveTab('active')}
                >
                    ⚔️ Active Battles ({activeBosses.length})
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'history' ? styles.active : ''}`}
                    onClick={() => setActiveTab('history')}
                >
                    🏆 Victory Hall ({defeatedBosses.length})
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'create' ? styles.active : ''}`}
                    onClick={() => setActiveTab('create')}
                >
                    🎨 Create Boss
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'arena' ? styles.active : ''}`}
                    onClick={() => setActiveTab('arena')}
                >
                    🏟️ Arena Mode
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'analytics' ? styles.active : ''}`}
                    onClick={() => setActiveTab('analytics')}
                >
                    📊 Analytics
                </button>
            </div>

            {/* Tab Content */}
            <div className={styles.content}>
                {activeTab === 'active' && (
                    <ActiveBattlesTab
                        activeBosses={activeBosses}
                        onBossBattle={handleBossBattle}
                        onCreateBoss={handleBossCreation}
                        onRefresh={handleRefreshData}
                    />
                )}

                {activeTab === 'history' && (
                    <VictoryHallTab 
                        defeatedBosses={defeatedBosses}
                        onRefresh={handleRefreshData}
                    />
                )}

                {activeTab === 'create' && (
                    <CreateBossTab
                        bossThemes={bossThemes}
                        onCreateBoss={handleBossCreation}
                    />
                )}

                {activeTab === 'arena' && (
                    <ArenaModeTab
                        activeBosses={activeBosses}
                        onBossBattle={handleBossBattle}
                    />
                )}

                {activeTab === 'analytics' && (
                    <AnalyticsTab
                        analytics={analytics}
                        onRefresh={handleRefreshData}
                    />
                )}
            </div>

            {/* Modals */}
            {showBossBattle && selectedBoss && (
                <BossBattleModal
                    isOpen={showBossBattle}
                    onClose={() => setShowBossBattle(false)}
                    boss={selectedBoss}
                    onVictory={handleBossDefeated}
                    onDefeat={() => setShowBossBattle(false)}
                />
            )}

            {showBossCreation && (
                <BossCreationModal
                    isOpen={showBossCreation}
                    onClose={() => setShowBossCreation(false)}
                    bossThemes={bossThemes}
                    onCreateBoss={(boss) => {
                        // Refresh data after boss creation
                        loadBossData();
                        loadAnalytics();
                        setShowBossCreation(false);
                    }}
                />
            )}
        </div>
    );
};

// Active Battles Tab Component
const ActiveBattlesTab: React.FC<{
    activeBosses: Array<{ boss: Boss; progress: BossProgress; quest: any }>;
    onBossBattle: (boss: Boss) => void;
    onCreateBoss: () => void;
    onRefresh: () => void;
}> = ({ activeBosses, onBossBattle, onCreateBoss, onRefresh }) => {
    if (activeBosses.length === 0) {
        return (
            <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>⚔️</div>
                <h3>No Active Battles</h3>
                <p>You're not currently fighting any bosses.</p>
                <div className={styles.emptyActions}>
                    <button className={styles.primaryButton} onClick={onCreateBoss}>
                        Create Your First Boss
                    </button>
                    <button className={styles.secondaryButton} onClick={onRefresh}>
                        🔄 Refresh
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.activeBattles}>
            <div className={styles.battlesGrid}>
                {activeBosses.map(({ boss, progress, quest }) => (
                    <div key={boss.id} className={styles.bossCard}>
                        <div className={styles.bossAvatar}>
                            <span className={styles.avatarText}>{boss.visuals?.avatar || boss.image || '🐉'}</span>
                        </div>
                        <div className={styles.bossInfo}>
                            <h3>{boss.name}</h3>
                            <p className={styles.bossType}>{boss.type}</p>
                            <p className={styles.questTitle}>Quest: {quest.title}</p>
                            <div className={styles.hpBar}>
                                <div 
                                    className={styles.hpFill} 
                                    style={{ width: `${(progress.currentHP / progress.maxHP) * 100}%` }} 
                                />
                                <span className={styles.hpText}>
                                    {progress.currentHP} / {progress.maxHP} HP
                                </span>
                            </div>
                            <p className={styles.bossPhase}>Phase {progress.phase + 1}</p>
                            <div className={styles.bossStats}>
                                <span>ATK: {boss.stats.attack}</span>
                                <span>DEF: {boss.stats.defense}</span>
                                <span>SPD: {boss.stats.speed}</span>
                            </div>
                        </div>
                        <div className={styles.bossActions}>
                            <button
                                className={styles.battleButton}
                                onClick={() => onBossBattle(boss)}
                            >
                                ⚔️ Battle
                            </button>
                            <button
                                className={styles.viewButton}
                                onClick={() => console.log('View boss details:', boss)}
                            >
                                👁️ View
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Victory Hall Tab Component
const VictoryHallTab: React.FC<{ 
    defeatedBosses: Array<{ boss: Boss; quest: any; defeatedAt: Date }>;
    onRefresh: () => void;
}> = ({ defeatedBosses, onRefresh }) => {
    if (defeatedBosses.length === 0) {
        return (
            <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>🏆</div>
                <h3>No Victories Yet</h3>
                <p>Defeat your first boss to see it here!</p>
                <button className={styles.secondaryButton} onClick={onRefresh}>
                    🔄 Refresh
                </button>
            </div>
        );
    }

    return (
        <div className={styles.victoryHall}>
            <div className={styles.battlesGrid}>
                {defeatedBosses.map(({ boss, quest, defeatedAt }) => (
                    <div key={boss.id} className={`${styles.bossCard} ${styles.defeated}`}>
                        <div className={styles.bossAvatar}>
                            <span className={styles.avatarText}>{boss.visuals?.avatar || boss.image || '🐉'}</span>
                            <div className={styles.defeatedBadge}>✓</div>
                        </div>
                        <div className={styles.bossInfo}>
                            <h3>{boss.name}</h3>
                            <p className={styles.bossType}>{boss.type}</p>
                            <p className={styles.questTitle}>Quest: {quest.title}</p>
                            <p className={styles.rewards}>
                                🎁 {boss.rewards.xp} XP, {boss.rewards.cp} CP, {boss.rewards.coins} Coins
                            </p>
                            <p className={styles.defeatedDate}>
                                Defeated: {defeatedAt.toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Create Boss Tab Component
const CreateBossTab: React.FC<{
    bossThemes: BossTheme[];
    onCreateBoss: () => void;
}> = ({ bossThemes, onCreateBoss }) => {
    return (
        <div className={styles.createBoss}>
            <div className={styles.themeGrid}>
                {bossThemes.map((theme) => (
                    <div key={theme.id} className={styles.themeCard}>
                        <div className={styles.themeIcon}>{theme.defaultAvatar}</div>
                        <h3>{theme.name}</h3>
                        <p>{theme.description}</p>
                        <div className={styles.personality}>
                            <span>Confidence: {theme.personality.confidence}</span>
                            <span>Aggression: {theme.personality.aggression}</span>
                            <span>Intelligence: {theme.personality.intelligence}</span>
                        </div>
                        <button className={styles.selectThemeButton}>
                            Select Theme
                        </button>
                    </div>
                ))}
            </div>
            <button className={styles.primaryButton} onClick={onCreateBoss}>
                Create Custom Boss
            </button>
        </div>
    );
};

// Arena Mode Tab Component
const ArenaModeTab: React.FC<{
    activeBosses: Array<{ boss: Boss; progress: BossProgress; quest: any }>;
    onBossBattle: (boss: Boss) => void;
}> = ({ activeBosses, onBossBattle }) => {
    return (
        <div className={styles.arenaMode}>
            <div className={styles.arenaInfo}>
                <h3>🏟️ Arena Mode</h3>
                <p>Challenge multiple bosses in sequence for epic rewards!</p>
                <div className={styles.arenaRules}>
                    <h4>Arena Rules:</h4>
                    <ul>
                        <li>Bosses must be defeated in order</li>
                        <li>Each victory grants bonus rewards</li>
                        <li>Failure resets progress</li>
                        <li>Complete the arena for legendary rewards</li>
                    </ul>
                </div>
            </div>
            
            {activeBosses.length > 0 ? (
                <div className={styles.arenaBosses}>
                    <h4>Available Bosses for Arena:</h4>
                    <div className={styles.battlesGrid}>
                        {activeBosses.map(({ boss, progress }) => (
                            <div key={boss.id} className={styles.bossCard}>
                                <div className={styles.bossAvatar}>
                                    <span className={styles.avatarText}>{boss.visuals?.avatar || boss.image || '🐉'}</span>
                                </div>
                                <div className={styles.bossInfo}>
                                    <h3>{boss.name}</h3>
                                    <p className={styles.bossType}>{boss.type}</p>
                                    <div className={styles.hpBar}>
                                        <div 
                                            className={styles.hpFill} 
                                            style={{ width: `${(progress.currentHP / progress.maxHP) * 100}%` }} 
                                        />
                                    </div>
                                </div>
                                <button
                                    className={styles.battleButton}
                                    onClick={() => onBossBattle(boss)}
                                >
                                    ⚔️ Enter Arena
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className={styles.emptyState}>
                    <p>No bosses available for arena mode.</p>
                    <p>Create some bosses first!</p>
                </div>
            )}
        </div>
    );
};

// Analytics Tab Component
const AnalyticsTab: React.FC<{
    analytics: any;
    onRefresh: () => void;
}> = ({ analytics, onRefresh }) => {
    if (!analytics) {
        return (
            <div className={styles.emptyState}>
                <p>Loading analytics...</p>
                <button className={styles.secondaryButton} onClick={onRefresh}>
                    🔄 Refresh
                </button>
            </div>
        );
    }

    return (
        <div className={styles.analyticsTab}>
            <div className={styles.analyticsGrid}>
                <div className={styles.analyticsCard}>
                    <h3>📊 Boss Statistics</h3>
                    <div className={styles.statItem}>
                        <span>Total Bosses:</span>
                        <span className={styles.statValue}>{analytics.totalBosses}</span>
                    </div>
                    <div className={styles.statItem}>
                        <span>Active Bosses:</span>
                        <span className={styles.statValue}>{analytics.activeBosses}</span>
                    </div>
                    <div className={styles.statItem}>
                        <span>Defeated Bosses:</span>
                        <span className={styles.statValue}>{analytics.defeatedBosses}</span>
                    </div>
                    <div className={styles.statItem}>
                        <span>Average Boss HP:</span>
                        <span className={styles.statValue}>{analytics.averageBossHP}</span>
                    </div>
                    <div className={styles.statItem}>
                        <span>Most Common Theme:</span>
                        <span className={styles.statValue}>{analytics.mostCommonTheme}</span>
                    </div>
                </div>

                <div className={styles.analyticsCard}>
                    <h3>🎁 Total Rewards</h3>
                    <div className={styles.statItem}>
                        <span>Total XP:</span>
                        <span className={styles.statValue}>{analytics.totalRewards.xp}</span>
                    </div>
                    <div className={styles.statItem}>
                        <span>Total CP:</span>
                        <span className={styles.statValue}>{analytics.totalRewards.cp}</span>
                    </div>
                    <div className={styles.statItem}>
                        <span>Total Coins:</span>
                        <span className={styles.statValue}>{analytics.totalRewards.coins}</span>
                    </div>
                </div>
            </div>

            <button className={styles.secondaryButton} onClick={onRefresh}>
                🔄 Refresh Analytics
            </button>
        </div>
    );
};

export default EnhancedBossDashboard;
