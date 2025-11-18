import React, { memo } from 'react';
import { BossBattleState } from '../../types/BossTypes';
import styles from '../BossBattleModal.module.css';

interface BossBattleLogProps {
  battleState: BossBattleState;
}

export const BossBattleLog: React.FC<BossBattleLogProps> = memo(({
  battleState
}) => {
  return (
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
  );
});
