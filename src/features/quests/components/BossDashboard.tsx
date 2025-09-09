import React, { useState, useEffect } from 'react';
import { BossBattleModal } from '../modals/BossBattleModal';
import { BossCreationModal } from '../modals/BossCreationModal';
import { Boss, BossProgress, BossTheme } from '../types/BossTypes';
import { getAllBossThemes } from '../utils/bossFactory';
import styles from './BossDashboard.module.css';

interface BossDashboardProps {
    plugin: any; // Replace with proper plugin type
}

export const BossDashboard: React.FC<BossDashboardProps> = ({ plugin }) => {
    const [activeBosses, setActiveBosses] = useState<Array<{ boss: Boss; progress: BossProgress }>>([]);
    const [defeatedBosses, setDefeatedBosses] = useState<Boss[]>([]);
    const [bossThemes, setBossThemes] = useState<BossTheme[]>([]);
    const [selectedBoss, setSelectedBoss] = useState<Boss | null>(null);
    const [showBossBattle, setShowBossBattle] = useState(false);
    const [showBossCreation, setShowBossCreation] = useState(false);
    const [activeTab, setActiveTab] = useState<'active' | 'history' | 'create' | 'arena'>('active');

    useEffect(() => {
        loadBossData();
        loadBossThemes();
    }, []);

    const loadBossData = async () => {
        // TODO: Load active bosses and defeated bosses from plugin storage
        // For now, using mock data
        setActiveBosses([]);
        setDefeatedBosses([]);
    };

    const loadBossThemes = () => {
        const themes = getAllBossThemes();
        setBossThemes(themes);
    };

    const handleBossBattle = (boss: Boss) => {
        setSelectedBoss(boss);
        setShowBossBattle(true);
    };

    const handleBossCreation = () => {
        setShowBossCreation(true);
    };

    const handleBossDefeated = (boss: Boss) => {
        // Move boss from active to defeated
        setActiveBosses(prev => prev.filter(b => b.boss.id !== boss.id));
        setDefeatedBosses(prev => [...prev, boss]);
        setShowBossBattle(false);
    };

    const handleBossFled = (boss: Boss) => {
        setShowBossBattle(false);
    };

    return (
        <div className={styles.bossDashboard}>
            {/* Header */}
            <div className={styles.header}>
                <h1 className={styles.title}>🐉 Boss Arena</h1>
                <p className={styles.subtitle}>Face your fears, claim your rewards</p>
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
            </div>

            {/* Tab Content */}
            <div className={styles.content}>
                {activeTab === 'active' && (
                    <ActiveBattlesTab
                        activeBosses={activeBosses}
                        onBossBattle={handleBossBattle}
                        onCreateBoss={handleBossCreation}
                    />
                )}

                {activeTab === 'history' && (
                    <VictoryHallTab defeatedBosses={defeatedBosses} />
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
                        // TODO: Save boss to storage
                        setShowBossCreation(false);
                    }}
                />
            )}
        </div>
    );
};

// Active Battles Tab Component
const ActiveBattlesTab: React.FC<{
    activeBosses: Array<{ boss: Boss; progress: BossProgress }>;
    onBossBattle: (boss: Boss) => void;
    onCreateBoss: () => void;
}> = ({ activeBosses, onBossBattle, onCreateBoss }) => {
    if (activeBosses.length === 0) {
        return (
            <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>⚔️</div>
                <h3>No Active Battles</h3>
                <p>You're not currently fighting any bosses.</p>
                <button className={styles.primaryButton} onClick={onCreateBoss}>
                    Create Your First Boss
                </button>
            </div>
        );
    }

    return (
        <div className={styles.activeBattles}>
            <div className={styles.battlesGrid}>
                {activeBosses.map(({ boss, progress }) => (
                    <div key={boss.id} className={styles.bossCard}>
                        <div className={styles.bossAvatar}>
                            <img src={boss.visuals.avatar} alt={boss.name} />
                        </div>
                        <div className={styles.bossInfo}>
                            <h3>{boss.name}</h3>
                            <p className={styles.bossType}>{boss.type}</p>
                            <div className={styles.hpBar}>
                                <div className={styles.hpFill} style={{ width: `${(progress.currentHP / progress.maxHP) * 100}%` }} />
                                <span className={styles.hpText}>
                                    {progress.currentHP} / {progress.maxHP} HP
                                </span>
                            </div>
                            <p className={styles.bossPhase}>Phase {progress.phase}</p>
                        </div>
                        <button
                            className={styles.battleButton}
                            onClick={() => onBossBattle(boss)}
                        >
                            ⚔️ Battle
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Victory Hall Tab Component
const VictoryHallTab: React.FC<{ defeatedBosses: Boss[] }> = ({ defeatedBosses }) => {
    if (defeatedBosses.length === 0) {
        return (
            <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>🏆</div>
                <h3>No Victories Yet</h3>
                <p>Defeat your first boss to see it here!</p>
            </div>
        );
    }

    return (
        <div className={styles.victoryHall}>
            <div className={styles.battlesGrid}>
                {defeatedBosses.map((boss) => (
                    <div key={boss.id} className={`${styles.bossCard} ${styles.defeated}`}>
                        <div className={styles.bossAvatar}>
                            <img src={boss.visuals.avatar} alt={boss.name} />
                            <div className={styles.defeatedBadge}>✓</div>
                        </div>
                        <div className={styles.bossInfo}>
                            <h3>{boss.name}</h3>
                            <p className={styles.bossType}>{boss.type}</p>
                            <p className={styles.rewards}>
                                🎁 {boss.rewards.xp} XP, {boss.rewards.cp} CP
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
    activeBosses: Array<{ boss: Boss; progress: BossProgress }>;
    onBossBattle: (boss: Boss) => void;
}> = ({ activeBosses, onBossBattle }) => {
    return (
        <div className={styles.arenaMode}>
            <div className={styles.arenaInfo}>
                <h3>🏟️ Arena Mode</h3>
                <p>Challenge multiple bosses in sequence for epic rewards!</p>
            </div>
            
            {activeBosses.length > 0 ? (
                <div className={styles.arenaBosses}>
                    <h4>Available Bosses for Arena:</h4>
                    <div className={styles.battlesGrid}>
                        {activeBosses.map(({ boss }) => (
                            <div key={boss.id} className={styles.bossCard}>
                                <div className={styles.bossAvatar}>
                                    <img src={boss.visuals.avatar} alt={boss.name} />
                                </div>
                                <div className={styles.bossInfo}>
                                    <h3>{boss.name}</h3>
                                    <p className={styles.bossType}>{boss.type}</p>
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
