import React, { memo, useMemo } from 'react';
import { Boss, BossBattleState } from '../../types/BossTypes';
import { BossBattleEngine } from '../../utils/bossBattleEngine';
import styles from '../BossBattleModal.module.css';

interface BossBattleAreaProps {
  boss: Boss;
  battleState: BossBattleState;
}

export const BossBattleArea: React.FC<BossBattleAreaProps> = memo(({
  boss,
  battleState
}) => {
  const phaseInfo = useMemo(() => BossBattleEngine.getBossPhaseInfo(boss), [boss]);
  const healthPercentage = useMemo(() => 
    (battleState.boss.stats.currentHP / battleState.boss.stats.maxHP) * 100, 
    [battleState.boss.stats.currentHP, battleState.boss.stats.maxHP]
  );
  const playerHealthPercentage = useMemo(() => 
    (battleState.playerStats.currentHP / battleState.playerStats.maxHP) * 100,
    [battleState.playerStats.currentHP, battleState.playerStats.maxHP]
  );

  return (
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
  );
});
