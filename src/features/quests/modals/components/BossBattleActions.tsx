import React, { memo, useMemo, useCallback } from 'react';
import { BossBattleState } from '../../types/BossTypes';
import styles from '../BossBattleModal.module.css';

interface BossBattleActionsProps {
  battleState: BossBattleState;
  selectedMove: string;
  isAnimating: boolean;
  onMoveSelection: (moveName: string) => void;
}

export const BossBattleActions: React.FC<BossBattleActionsProps> = memo(({
  battleState,
  selectedMove,
  isAnimating,
  onMoveSelection
}) => {
  const playerMoves = useMemo(() => [
    { name: 'Task Strike', description: 'Attack based on completed tasks', power: 50 },
    { name: 'Focus Beam', description: 'Special attack using focus stat', power: 60 },
    { name: 'Motivation Surge', description: 'Boost your stats temporarily', power: 0 },
    { name: 'Deadline Rush', description: 'High-risk, high-reward attack', power: 70 }
  ], []);

  const handleMoveClick = useCallback((moveName: string) => {
    onMoveSelection(moveName);
  }, [onMoveSelection]);

  return (
    <div className={styles.battleControls}>
      <h4>Choose Your Move:</h4>
      <div className={styles.moveGrid}>
        {playerMoves.map((move) => (
          <button
            key={move.name}
            className={`${styles.moveButton} ${selectedMove === move.name ? styles.selected : ''}`}
            onClick={() => handleMoveClick(move.name)}
            disabled={isAnimating || battleState.gameOver}
          >
            <div className={styles.moveName}>{move.name}</div>
            <div className={styles.moveDescription}>{move.description}</div>
            {move.power > 0 && <div className={styles.movePower}>Power: {move.power}</div>}
          </button>
        ))}
      </div>
    </div>
  );
});
