import React, { useState } from 'react';
import type GamificationObsidianPlugin from '../../../core/main';
import { EnhancedBossDashboard } from '../../../features/quests/components/EnhancedBossDashboard';
import { BossIntegrationExample } from '../../../features/quests/components/BossIntegrationExample';
import styles from './BossDashboardModal.module.css';

interface BossDashboardModalProps {
    isOpen: boolean;
    onClose: () => void;
    plugin: GamificationObsidianPlugin;
}

export const BossDashboardModal: React.FC<BossDashboardModalProps> = ({ 
    isOpen, 
    onClose, 
    plugin 
}) => {
    const [activeView, setActiveView] = useState<'dashboard' | 'example' | 'tutorial'>('dashboard');

    const handleOverlayClick = (e: React.MouseEvent) => {
        // Only close if clicking the overlay, not the content
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        }
    };

    return (
        <div 
            className={styles.modalOverlay} 
            onClick={handleOverlayClick}
            onKeyDown={handleKeyDown}
            tabIndex={-1}
        >
            <div className={styles.modalContent}>
                <div className={styles.modalHeader}>
                    <div className={styles.headerContent}>
                        <h2>🐉 Boss Arena</h2>
                        <p className={styles.headerSubtitle}>
                            Challenge powerful bosses and earn epic rewards!
                        </p>
                    </div>
                    <button 
                        className={styles.closeButton} 
                        onClick={onClose}
                        aria-label="Close boss dashboard"
                    >
                        ✕
                    </button>
                </div>

                {/* Navigation Tabs */}
                <div className={styles.navigation}>
                    <button
                        className={`${styles.navButton} ${activeView === 'dashboard' ? styles.active : ''}`}
                        onClick={() => setActiveView('dashboard')}
                    >
                        🏰 Boss Dashboard
                    </button>
                    <button
                        className={`${styles.navButton} ${activeView === 'example' ? styles.active : ''}`}
                        onClick={() => setActiveView('example')}
                    >
                        🎮 Examples & Demo
                    </button>
                    <button
                        className={`${styles.navButton} ${activeView === 'tutorial' ? styles.active : ''}`}
                        onClick={() => setActiveView('tutorial')}
                    >
                        📚 Tutorial
                    </button>
                </div>

                <div className={styles.modalBody}>
                    {activeView === 'dashboard' && (
                        <div className={styles.dashboardView}>
                            <div className={styles.dashboardContainer}>
                                <EnhancedBossDashboard plugin={plugin} />
                            </div>
                        </div>
                    )}

                    {activeView === 'example' && (
                        <div className={styles.exampleView}>
                            <div className={styles.contentHeader}>
                                <h3>Boss System Examples</h3>
                                <p>See how the boss system works with interactive examples and demonstrations.</p>
                            </div>
                            <div className={styles.exampleContainer}>
                                <BossIntegrationExample />
                            </div>
                        </div>
                    )}

                    {activeView === 'tutorial' && (
                        <div className={styles.tutorialView}>
                            <div className={styles.contentHeader}>
                                <h3>How to Use the Boss System</h3>
                                <p>Master the art of boss battles and quest integration.</p>
                            </div>
                            <div className={styles.tutorialContent}>
                                <div className={styles.tutorialSection}>
                                    <h4>🎯 Creating Bosses</h4>
                                    <ul>
                                        <li>Go to the Boss Dashboard tab</li>
                                        <li>Click "Create Boss" to generate a new challenge</li>
                                        <li>Choose a theme and difficulty level</li>
                                        <li>Bosses are automatically assigned to quests</li>
                                    </ul>
                                </div>

                                <div className={styles.tutorialSection}>
                                    <h4>⚔️ Boss Battles</h4>
                                    <ul>
                                        <li>Click "Battle" on any active boss</li>
                                        <li>Use your quest progress to damage the boss</li>
                                        <li>Complete tasks to advance through boss phases</li>
                                        <li>Defeat bosses to earn XP, CP, and coins</li>
                                    </ul>
                                </div>

                                <div className={styles.tutorialSection}>
                                    <h4>🏆 Rewards & Progress</h4>
                                    <ul>
                                        <li>Track boss health and phase progress</li>
                                        <li>View detailed battle statistics</li>
                                        <li>Earn special rewards for defeating bosses</li>
                                        <li>Monitor your boss battle history</li>
                                    </ul>
                                </div>

                                <div className={styles.tutorialSection}>
                                    <h4>🔗 Quest Integration</h4>
                                    <ul>
                                        <li>Bosses automatically integrate with quests</li>
                                        <li>Quest completion damages bosses</li>
                                        <li>Boss difficulty scales with quest complexity</li>
                                        <li>Create epic quest-boss combinations</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BossDashboardModal;
