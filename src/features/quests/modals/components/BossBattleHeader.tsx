import React, { memo } from 'react';
import styles from '../BossBattleModal.module.css';

interface BossBattleHeaderProps {
  bossTitle: string;
  onClose: () => void;
}

export const BossBattleHeader: React.FC<BossBattleHeaderProps> = memo(({
  bossTitle,
  onClose
}) => {
  return (
    <div className={styles.modalHeader}>
      <h2>Boss Battle: {bossTitle}</h2>
      <button className={styles.closeButton} onClick={onClose}>×</button>
    </div>
  );
});
