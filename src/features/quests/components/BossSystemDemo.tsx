import React, { useState } from 'react';
import { BossFactory } from '../utils/bossFactory';
import { BossQuestIntegration } from '../utils/bossQuestIntegration';
import { BossBattleEngine } from '../utils/bossBattleEngine';
import { BossBattleModal } from '../modals/BossBattleModal';
import type { Boss } from '../types/BossTypes';
import type { Quest } from '../utils/taskParser';

interface BossSystemDemoProps {
  quest: Quest;
}

export const BossSystemDemo: React.FC<BossSystemDemoProps> = ({ quest }) => {
  const [boss, setBoss] = useState<Boss | null>(null);
  const [showBossBattle, setShowBossBattle] = useState(false);
  const [bossProgress, setBossProgress] = useState<any>(null);

  // Check if this quest should have a boss
  const shouldHaveBoss = BossQuestIntegration.shouldCreateBoss(quest);
  const bossRecommendation = BossQuestIntegration.getBossRecommendation(quest);

  // Create a boss for this quest
  const createBoss = () => {
    if (!shouldHaveBoss) return;
    
    const newBoss = BossQuestIntegration.createBossForQuest(quest, 5); // player skill level 5
    setBoss(newBoss);
    
    // Update quest with boss ID
    quest.bossId = newBoss.id;
    quest.bossProgress = {
      currentHP: newBoss.stats.currentHP,
      maxHP: newBoss.stats.maxHP,
      phase: 0,
      lastUpdated: new Date(),
      isActive: true
    };
    
    setBossProgress(quest.bossProgress);
  };

  // Update boss progress when subtasks are completed
  const updateBossProgress = () => {
    if (!boss) return;
    
    const progress = BossQuestIntegration.updateBossProgress(boss, quest);
    setBossProgress(progress);
    
    // Check if boss can be defeated
    if (BossBattleEngine.canDefeatBoss(boss, quest)) {
      console.log('🎉 Boss can now be defeated! All tasks completed!');
    }
  };

  // Handle boss victory
  const handleBossVictory = (defeatedBoss: Boss) => {
    console.log('🏆 Boss defeated! Rewards:', defeatedBoss.rewards);
    setBoss(null);
    setBossProgress(null);
    setShowBossBattle(false);
    
    // Here you would typically:
    // 1. Award XP, CP, coins to player
    // 2. Add materials to inventory
    // 3. Grant life items
    // 4. Unlock achievements
  };

  // Handle boss defeat
  const handleBossDefeat = () => {
    console.log('💀 Boss defeated you! Try again after completing more tasks.');
    setShowBossBattle(false);
  };

  if (!shouldHaveBoss) {
    return (
      <div style={{
        padding: '16px',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '8px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        marginTop: '16px'
      }}>
        <h4 style={{ margin: '0 0 12px 0', color: '#888' }}>🐉 Boss System</h4>
        <p style={{ margin: 0, color: '#888', fontSize: '14px' }}>
          This quest is too simple for a boss battle. 
          Try creating a quest with high difficulty, priority, or many subtasks!
        </p>
      </div>
    );
  }

  return (
    <div style={{
      padding: '16px',
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '8px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      marginTop: '16px'
    }}>
      <h4 style={{ margin: '0 0 12px 0', color: '#4a90e2' }}>🐉 Boss Battle System</h4>
      
      {!boss ? (
        <div>
          <div style={{ marginBottom: '12px' }}>
            <p style={{ margin: '0 0 8px 0', color: '#e2e8f0', fontSize: '14px' }}>
              <strong>Boss Recommendation:</strong> {bossRecommendation.bossType}
            </p>
            <p style={{ margin: 0, color: '#888', fontSize: '12px' }}>
              {bossRecommendation.reason}
            </p>
          </div>
          
          <button
            onClick={createBoss}
            style={{
              background: 'linear-gradient(135deg, #4a90e2 0%, #357abd 100%)',
              border: 'none',
              borderRadius: '6px',
              color: 'white',
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            🗡️ Create Boss
          </button>
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: '12px' }}>
            <h5 style={{ margin: '0 0 8px 0', color: '#ff6b6b' }}>
              {boss.title}
            </h5>
            <p style={{ margin: '0 0 8px 0', color: '#e2e8f0', fontSize: '14px' }}>
              {boss.description}
            </p>
            
            {/* Boss HP Bar */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{
                width: '100%',
                height: '20px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                overflow: 'hidden',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}>
                <div style={{
                  width: `${(boss.stats.currentHP / boss.stats.maxHP) * 100}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #4ecdc4 0%, #44a08d 100%)',
                  transition: 'width 0.3s ease'
                }} />
              </div>
              <div style={{
                textAlign: 'center',
                fontSize: '12px',
                color: '#888',
                marginTop: '4px'
              }}>
                {boss.stats.currentHP} / {boss.stats.maxHP} HP
              </div>
            </div>
            
            {/* Boss Phase */}
            <div style={{
              textAlign: 'center',
              fontSize: '12px',
              color: '#4ecdc4',
              marginBottom: '8px'
            }}>
              Phase {boss.currentPhase + 1} of {boss.phases.length}
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setShowBossBattle(true)}
              style={{
                background: 'linear-gradient(135deg, #ff6b6b 0%, #ff8e8e 100%)',
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                padding: '8px 16px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              ⚔️ Battle Boss
            </button>
            
            <button
              onClick={updateBossProgress}
              style={{
                background: 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)',
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                padding: '8px 16px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              📋 Update Progress
            </button>
          </div>
          
          {/* Progress Info */}
          {bossProgress && (
            <div style={{
              marginTop: '12px',
              padding: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '4px',
              fontSize: '12px',
              color: '#888'
            }}>
              <div>Last Updated: {bossProgress.lastUpdated.toLocaleString()}</div>
              <div>Status: {bossProgress.isActive ? 'Active' : 'Defeated'}</div>
            </div>
          )}
        </div>
      )}
      
      {/* Boss Battle Modal */}
      {boss && showBossBattle && (
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
