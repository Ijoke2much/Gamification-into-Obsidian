import React, { useState } from 'react';
import { BossQuestIntegration } from './BossQuestIntegration';
import { EnhancedBossDashboard } from './EnhancedBossDashboard';
import { useBossIntegration } from '../data/hooks/useBossIntegration';
import { Quest } from '../utils/taskParser';
import styles from './BossIntegrationExample.module.css';

// Example quest data
const exampleQuest: Quest = {
    id: 'example-quest-1',
    title: 'Complete Project Documentation',
    description: 'Write comprehensive documentation for the new feature',
    status: 'in-progress',
    priority: 'high',
    difficulty: 'medium',
    xp: 150,
    cp: 25,
    coins: 50,
    due: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
    tags: ['documentation', 'project', 'feature'],
    subtasks: [
        { text: 'Research existing documentation', completed: false },
        { text: 'Create outline', completed: false },
        { text: 'Write content', completed: false },
        { text: 'Review and edit', completed: false }
    ],
    notes: 'This is a critical project that needs thorough documentation.',
    createdDate: new Date().toISOString().split('T')[0],
    lastModified: new Date().toISOString().split('T')[0],
    completed: false,
    giver: 'Project Manager',
    rewards: ['xp:150', 'cp:25', 'coins:50'],
    className: 'example-quest',
    stats: []
};

export const BossIntegrationExample: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'integration' | 'dashboard' | 'hooks'>('integration');
    const [showCompact, setShowCompact] = useState(false);
    const [showCreateOption, setShowCreateOption] = useState(true);
    
    const bossIntegration = useBossIntegration();

    const handleQuestUpdate = (updatedQuest: Quest) => {
        console.log('Quest updated:', updatedQuest);
        // In a real app, you would update the quest in your state management
    };

    return (
        <div className={styles.bossIntegrationExample}>
            <div className={styles.header}>
                <h1>🐉 Boss Integration System</h1>
                <p>Complete example of how to integrate bosses with quests</p>
            </div>

            {/* Navigation Tabs */}
            <div className={styles.tabs}>
                <button
                    className={`${styles.tab} ${activeTab === 'integration' ? styles.active : ''}`}
                    onClick={() => setActiveTab('integration')}
                >
                    🎯 Quest Integration
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'dashboard' ? styles.active : ''}`}
                    onClick={() => setActiveTab('dashboard')}
                >
                    🏰 Boss Dashboard
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'hooks' ? styles.active : ''}`}
                    onClick={() => setActiveTab('hooks')}
                >
                    🪝 Custom Hooks
                </button>
            </div>

            {/* Tab Content */}
            <div className={styles.content}>
                {activeTab === 'integration' && (
                    <IntegrationTab
                        quest={exampleQuest}
                        onQuestUpdate={handleQuestUpdate}
                        showCompact={showCompact}
                        showCreateOption={showCreateOption}
                        onToggleCompact={() => setShowCompact(!showCompact)}
                        onToggleCreateOption={() => setShowCreateOption(!showCreateOption)}
                    />
                )}

                {activeTab === 'dashboard' && (
                    <DashboardTab />
                )}

                {activeTab === 'hooks' && (
                    <HooksTab bossIntegration={bossIntegration} />
                )}
            </div>
        </div>
    );
};

// Integration Tab Component
const IntegrationTab: React.FC<{
    quest: Quest;
    onQuestUpdate: (quest: Quest) => void;
    showCompact: boolean;
    showCreateOption: boolean;
    onToggleCompact: () => void;
    onToggleCreateOption: () => void;
}> = ({ quest, onQuestUpdate, showCompact, showCreateOption, onToggleCompact, onToggleCreateOption }) => {
    return (
        <div className={styles.integrationTab}>
            <div className={styles.controls}>
                <h3>Integration Controls</h3>
                <div className={styles.controlGroup}>
                    <label>
                        <input
                            type="checkbox"
                            checked={showCompact}
                            onChange={onToggleCompact}
                        />
                        Show Compact Mode
                    </label>
                    <label>
                        <input
                            type="checkbox"
                            checked={showCreateOption}
                            onChange={onToggleCreateOption}
                        />
                        Show Create Option
                    </label>
                </div>
            </div>

            <div className={styles.questPreview}>
                <h3>Quest Preview</h3>
                <div className={styles.questCard}>
                    <h4>{quest.title}</h4>
                    <p>{quest.description}</p>
                    <div className={styles.questMeta}>
                        <span>XP: {quest.xp}</span>
                        <span>CP: {quest.cp}</span>
                        <span>Coins: {quest.coins}</span>
                        <span>Status: {quest.status}</span>
                    </div>
                </div>
            </div>

            <div className={styles.bossIntegration}>
                <h3>Boss Integration</h3>
                <BossQuestIntegration
                    quest={quest}
                    onQuestUpdate={onQuestUpdate}
                    compact={showCompact}
                    showCreateOption={showCreateOption}
                />
            </div>

            <div className={styles.usageExample}>
                <h3>Usage Example</h3>
                <div className={styles.codeBlock}>
                    <pre>
{`// Basic usage in a quest card
<BossQuestIntegration
    quest={quest}
    onQuestUpdate={handleQuestUpdate}
    compact={false}
    showCreateOption={true}
/>

// Compact mode for small spaces
<BossQuestIntegration
    quest={quest}
    compact={true}
    showCreateOption={false}
/>

// Without create option
<BossQuestIntegration
    quest={quest}
    showCreateOption={false}
/>`}
                    </pre>
                </div>
            </div>
        </div>
    );
};

// Dashboard Tab Component
const DashboardTab: React.FC = () => {
    return (
        <div className={styles.dashboardTab}>
            <h3>Enhanced Boss Dashboard</h3>
            <p>This is the full boss management dashboard with all features:</p>
            
            <div className={styles.dashboardPreview}>
                <EnhancedBossDashboard plugin={null} />
            </div>
        </div>
    );
};

// Hooks Tab Component
const HooksTab: React.FC<{ bossIntegration: ReturnType<typeof useBossIntegration> }> = ({ bossIntegration }) => {
    return (
        <div className={styles.hooksTab}>
            <h3>Custom Hooks Usage</h3>
            
            <div className={styles.hookExample}>
                <h4>useBossIntegration Hook</h4>
                <p>Provides access to all boss management functionality:</p>
                
                <div className={styles.codeBlock}>
                    <pre>
{`const {
    activeBosses,
    defeatedBosses,
    isLoading,
    error,
    createBoss,
    startBossBattle,
    endBossBattle,
    updateBossProgress,
    removeBoss,
    refreshBossData,
    getBossByQuest,
    isQuestBossActive,
    getBossRewards
} = useBossIntegration();`}
                    </pre>
                </div>

                <div className={styles.hookExample}>
                    <h4>useQuestBossIntegration Hook</h4>
                    <p>Specialized hook for quest-specific boss integration:</p>
                    
                    <div className={styles.codeBlock}>
                        <pre>
{`const {
    questBoss,
    isBossActive,
    bossRewards,
    startQuestBossBattle,
    endQuestBossBattle,
    // ... all other methods
} = useQuestBossIntegration(questId);`}
                        </pre>
                    </div>
                </div>

                <div className={styles.hookExample}>
                    <h4>useBossAnalytics Hook</h4>
                    <p>Hook for boss analytics and statistics:</p>
                    
                    <div className={styles.codeBlock}>
                        <pre>
{`const {
    analytics,
    isLoading,
    error,
    refreshAnalytics
} = useBossAnalytics();`}
                        </pre>
                    </div>
                </div>
            </div>

            <div className={styles.currentState}>
                <h4>Current Boss State</h4>
                <div className={styles.stateInfo}>
                    <p><strong>Active Bosses:</strong> {bossIntegration.activeBosses.length}</p>
                    <p><strong>Defeated Bosses:</strong> {bossIntegration.defeatedBosses.length}</p>
                    <p><strong>Loading:</strong> {bossIntegration.isLoading ? 'Yes' : 'No'}</p>
                    {bossIntegration.error && (
                        <p><strong>Error:</strong> {bossIntegration.error}</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BossIntegrationExample;
