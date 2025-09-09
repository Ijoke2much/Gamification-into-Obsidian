import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Boss, BossBattleState } from '../types/BossTypes';
import { BossBattleEngine } from '../utils/bossBattleEngine';
import { BossRewardService, BossVictoryContext, EnhancedBossRewards } from '../services/bossRewardService';
import { playerStore } from '../../../shared/state/playerStore';
import styles from './BossBattleModal.module.css';
import { currencyDisplay } from '../../../shared/services/currencyDisplayService';

interface BossBattleModalProps {
  isOpen: boolean;
  onClose: () => void;
  boss: Boss;
  onVictory: (boss: Boss, rewards?: EnhancedBossRewards) => void;
  onDefeat: () => void;
  questContext?: {
    timeTaken?: number;
    questCompletionRate?: number;
    perfectCompletion?: boolean;
  };
}

export const BossBattleModal: React.FC<BossBattleModalProps> = ({
  isOpen,
  onClose,
  boss,
  onVictory,
  onDefeat,
  questContext
}) => {
  const [battleState, setBattleState] = useState<BossBattleState | null>(null);
  const [selectedMove, setSelectedMove] = useState<string>('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [showRewards, setShowRewards] = useState(false);
  const [enhancedRewards, setEnhancedRewards] = useState<EnhancedBossRewards | null>(null);
  const [battleStartTime, setBattleStartTime] = useState<number>(Date.now());
  const [rewardService] = useState(() => BossRewardService.getInstance());

  useEffect(() => {
    if (isOpen && boss) {
      initializeBattle();
    }
  }, [isOpen, boss]);

  const initializeBattle = () => {
    const initialState: BossBattleState = {
      boss: { ...boss },
      playerStats: {
        currentHP: 100,
        maxHP: 100,
        attack: 50,
        defense: 30,
        speed: 40,
        specialAttack: 45,
        specialDefense: 35,
        buffs: [],
        debuffs: []
      },
      battleLog: [],
      currentTurn: 0,
      isPlayerTurn: true,
      gameOver: false,
      victory: false,
      
      // Enhanced battle state properties
      timeRemaining: undefined,
      phaseTransition: false,
      specialEffects: [],
      comboCount: 0,
      bossMood: 'confident'
    };

    setBattleState(initialState);
    setBattleStartTime(Date.now());
  };

  const handleMoveSelection = (moveName: string) => {
    if (!battleState || isAnimating) return;
    
    setSelectedMove(moveName);
    setIsAnimating(true);

    // Process the turn
    const newState = BossBattleEngine.processTurn(battleState, moveName);
    setBattleState(newState);

    // Check for game over
    if (newState.gameOver) {
      if (newState.victory) {
        setTimeout(async () => {
          await processVictory();
          setShowRewards(true);
          setTimeout(() => onVictory(boss, enhancedRewards || undefined), 3000);
        }, 2000);
      } else {
        setTimeout(() => onDefeat(), 2000);
      }
    }

    setTimeout(() => setIsAnimating(false), 1000);
  };

  const processVictory = async () => {
    try {
      const player = await playerStore.get();
      if (!player) return;

      const timeTaken = (Date.now() - battleStartTime) / (1000 * 60); // Convert to minutes
      
      // Check for boss battle time penalties
      const timeLimit = boss.timer?.duration ? boss.timer.duration / 60 : 30; // Convert seconds to minutes, default 30 minutes
      const { BossPenaltyIntegration } = await import('../utils/bossPenaltyIntegration');
      
      const victoryContext: BossVictoryContext = {
        boss,
        timeTaken,
        playerLevel: player.level || 1,
        questCompletionRate: questContext?.questCompletionRate || 1.0,
        isFirstVictory: true, // TODO: Track defeats separately in boss analytics
        consecutiveWins: 0, // TODO: Track wins separately in boss analytics
        perfectCompletion: questContext?.perfectCompletion || false
      };

      // Get base rewards first
      const baseRewards = await rewardService.processBossVictory(victoryContext);
      
      // Apply boss time penalties if necessary
      const penaltyResult = await BossPenaltyIntegration.completeBossWithTimeCheck(
        boss,
        battleStartTime,
        timeLimit,
        {
          xp: baseRewards.xp,
          coins: baseRewards.coins,
          cp: baseRewards.cp
        }
      );
      
      // Update rewards with penalty results
      const finalRewards = {
        ...baseRewards,
        xp: penaltyResult.finalRewards.xp,
        coins: penaltyResult.finalRewards.coins,
        cp: penaltyResult.finalRewards.cp
      };
      
      setEnhancedRewards(finalRewards);

      // Show penalty messages if any
      if (penaltyResult.messages.length > 0) {
        // You could show these in the UI or as notifications
        console.log('Boss battle penalties:', penaltyResult.messages);
      }

      // Boss victory tracking moved to boss analytics system
      // TODO: Implement separate boss tracking system for analytics

    } catch (error) {
      console.error('Error processing boss victory:', error);
    }
  };

  const getPlayerMoves = () => {
    return [
      { name: 'Task Strike', description: 'Attack based on completed tasks', power: 50 },
      { name: 'Focus Beam', description: 'Special attack using focus stat', power: 60 },
      { name: 'Motivation Surge', description: 'Boost your stats temporarily', power: 0 },
      { name: 'Deadline Rush', description: 'High-risk, high-reward attack', power: 70 }
    ];
  };

  const getBossPhaseInfo = () => {
    if (!battleState) return null;
    const phaseInfo = BossBattleEngine.getBossPhaseInfo(battleState.boss);
    return phaseInfo;
  };

  if (!isOpen || !battleState) return null;

  const phaseInfo = getBossPhaseInfo();
  const healthPercentage = (battleState.boss.stats.currentHP / battleState.boss.stats.maxHP) * 100;
  const playerHealthPercentage = (battleState.playerStats.currentHP / battleState.playerStats.maxHP) * 100;

  return ReactDOM.createPortal(
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2>Boss Battle: {boss.title}</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <div className={styles.battleArea}>
          {/* Boss Display */}
          <div className={styles.bossSection}>
            <div className={styles.bossImage}>
              <div className={styles.bossAvatar}>{boss.image}</div>
              <div className={styles.bossType}>{boss.type.replace('-', ' ').toUpperCase()}</div>
            </div>
            <div className={styles.bossInfo}>
              <h3>{boss.name}</h3>
              <div className={styles.bossHP}>
                <div className={styles.hpBar}>
                  <div 
                    className={styles.hpFill}
                    style={{ 
                      width: `${healthPercentage}%`,
                      backgroundColor: healthPercentage > 50 ? '#4ecdc4' : healthPercentage > 25 ? '#ff6b6b' : '#ff0000'
                    }}
                  />
                </div>
                <span className={styles.hpText}>
                  {battleState.boss.stats.currentHP} / {battleState.boss.stats.maxHP} HP
                </span>
              </div>
              {phaseInfo && (
                <div className={styles.bossPhase}>
                  {phaseInfo.name} ({phaseInfo.current}/{phaseInfo.total})
                </div>
              )}
              <div className={styles.bossDescription}>
                {boss.description}
              </div>
            </div>
          </div>

          {/* Player Display */}
          <div className={styles.playerSection}>
            <div className={styles.playerStats}>
              <h4>Your Stats</h4>
              <div className={styles.statGrid}>
                <div className={styles.statItem}>
                  <span>HP:</span>
                  <div className={styles.playerHP}>
                    <div 
                      className={styles.hpFill}
                      style={{ 
                        width: `${playerHealthPercentage}%`,
                        backgroundColor: playerHealthPercentage > 50 ? '#4ecdc4' : playerHealthPercentage > 25 ? '#ff6b6b' : '#ff0000'
                      }}
                    />
                  </div>
                  <span>{battleState.playerStats.currentHP} / {battleState.playerStats.maxHP}</span>
                </div>
                <div className={styles.statItem}>
                  <span>ATK:</span>
                  <span>{battleState.playerStats.attack}</span>
                </div>
                <div className={styles.statItem}>
                  <span>DEF:</span>
                  <span>{battleState.playerStats.defense}</span>
                </div>
                <div className={styles.statItem}>
                  <span>SPD:</span>
                  <span>{battleState.playerStats.speed}</span>
                </div>
                <div className={styles.statItem}>
                  <span>SP.ATK:</span>
                  <span>{battleState.playerStats.specialAttack}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Battle Controls */}
        <div className={styles.battleControls}>
          <h4>Choose Your Move:</h4>
          <div className={styles.moveGrid}>
            {getPlayerMoves().map((move) => (
              <button
                key={move.name}
                className={`${styles.moveButton} ${selectedMove === move.name ? styles.selected : ''}`}
                onClick={() => handleMoveSelection(move.name)}
                disabled={isAnimating || battleState.gameOver}
              >
                <div className={styles.moveName}>{move.name}</div>
                <div className={styles.moveDescription}>{move.description}</div>
                {move.power > 0 && <div className={styles.movePower}>Power: {move.power}</div>}
              </button>
            ))}
          </div>
        </div>

        {/* Battle Log */}
        <div className={styles.battleLog}>
          <h4>Battle Log:</h4>
          <div className={styles.logContainer}>
            {battleState.battleLog.slice(-5).map((log, index) => (
              <div key={index} className={`${styles.logEntry} ${styles[log.actor]}`}>
                <span className={styles.turnNumber}>Turn {log.turn}:</span>
                <span className={styles.action}>{log.action}</span>
                {log.damage !== undefined && (
                  <span className={styles.damage}>-{log.damage} HP</span>
                )}
                {log.effects && log.effects.map((effect, i) => (
                  <span key={i} className={styles.effect}>{effect}</span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Game Over Screen */}
        {battleState.gameOver && (
          <div className={styles.gameOver}>
            <h2>{battleState.victory ? 'Victory!' : 'Defeat!'}</h2>
            {battleState.victory && showRewards && enhancedRewards ? (
              <div className={styles.victoryRewards}>
                <h3>🎉 Victory Rewards!</h3>
                
                {/* Base Rewards */}
                <div className={styles.rewardsList}>
                  <div className={styles.rewardItem}>
                    <span className={styles.rewardIcon}>✨</span>
                    <span className={styles.rewardText}>{enhancedRewards.xp} XP</span>
                    {enhancedRewards.experienceMultiplier > 1 && (
                      <span className={styles.multiplier}>({enhancedRewards.experienceMultiplier.toFixed(1)}x)</span>
                    )}
                  </div>
                  <div className={styles.rewardItem}>
                    <span className={styles.rewardIcon}>⭐</span>
                    <span className={styles.rewardText}>{enhancedRewards.cp} CP</span>
                  </div>
                  <div className={styles.rewardItem}>
                    <span className={styles.rewardIcon}>{currencyDisplay.getCurrencySymbol()}</span>
                    <span className={styles.rewardText}>{enhancedRewards.coins} {currencyDisplay.getCurrencyName()}</span>
                  </div>
                </div>

                {/* Bonus Rewards */}
                {enhancedRewards.bonusRewards.length > 0 && (
                  <div className={styles.bonusRewards}>
                    <h4>🌟 Bonus Rewards:</h4>
                    {enhancedRewards.bonusRewards.map((bonus, index) => (
                      <div key={index} className={styles.bonusItem}>
                        <span className={styles.bonusIcon}>🎯</span>
                        <span className={styles.bonusText}>
                          {bonus.description}: +{bonus.value} XP
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Materials */}
                {enhancedRewards.materials.length > 0 && (
                  <div className={styles.materialsSection}>
                    <h4>💎 Materials Earned:</h4>
                    {enhancedRewards.materials.map((material, index) => (
                      <div key={index} className={styles.rewardItem}>
                        <span className={styles.rewardIcon}>💎</span>
                        <span className={styles.rewardText}>
                          {material.quantity}x {material.name} ({material.rarity})
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Life Items */}
                {enhancedRewards.lifeItems.length > 0 && (
                  <div className={styles.lifeItemsSection}>
                    <h4>🎁 Life Rewards:</h4>
                    {enhancedRewards.lifeItems.map((item, index) => (
                      <div key={index} className={styles.rewardItem}>
                        <span className={styles.rewardIcon}>🎁</span>
                        <span className={styles.rewardText}>
                          {item.name}: {item.description}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Achievements */}
                {enhancedRewards.achievements.length > 0 && (
                  <div className={styles.achievements}>
                    <h4>🏆 Achievements Unlocked:</h4>
                    {enhancedRewards.achievements.map((achievement, index) => (
                      <div key={index} className={styles.achievement}>🏆 {achievement}</div>
                    ))}
                  </div>
                )}

                {/* Unlocked Features */}
                {enhancedRewards.unlockedFeatures.length > 0 && (
                  <div className={styles.unlockedFeatures}>
                    <h4>🔓 Unlocked Features:</h4>
                    {enhancedRewards.unlockedFeatures.map((feature, index) => (
                      <div key={index} className={styles.feature}>🔓 {feature}</div>
                    ))}
                  </div>
                )}

                {/* Seasonal Bonuses */}
                {enhancedRewards.seasonalBonuses.length > 0 && (
                  <div className={styles.seasonalBonuses}>
                    <h4>🎃 Seasonal Bonuses:</h4>
                    {enhancedRewards.seasonalBonuses.map((bonus, index) => (
                      <div key={index} className={styles.seasonalItem}>
                        <span className={styles.seasonalIcon}>🎃</span>
                        <span className={styles.seasonalText}>
                          {bonus.name}: +{bonus.value} XP
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.defeatMessage}>
                <p>The boss was too powerful this time. Complete more tasks to grow stronger!</p>
                <button className={styles.retryButton} onClick={onClose}>
                  Try Again Later
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
