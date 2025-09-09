import React from 'react';
import type GamifiedObsidianPlugin from 'src/core/main';
import { PlayerData } from 'src/data/models/PlayerData';
import styles from './PlayerInfoCard.module.css';
import { Card } from '../../../shared/components/ui/PlayerTabComponents';

interface PlayerInfoCardProps {
  playerData: PlayerData;
  plugin: GamifiedObsidianPlugin;
  openAvatarPicker: () => void;
}

export const PlayerInfoCard: React.FC<PlayerInfoCardProps> = ({ playerData, plugin, openAvatarPicker }) => (
  <div className={styles.infoCardGrid}>
    {/* Avatar & Main Info Card */}
    <Card className={styles.avatarCard}>
      <img
        src={plugin.app.vault.adapter.getResourcePath(playerData.avatar || 'assets/avatar-default.png')}
        className={styles.avatarImg}
        alt="Avatar"
        style={{ cursor: 'pointer' }}
        onClick={openAvatarPicker}
      />
      <button
        className={styles.changeAvatarBtn}
        onClick={openAvatarPicker}
      >
        Change Avatar
      </button>
      <div className={styles.playerMainInfo}>
        <div className={styles.playerName}>{playerData.name}</div>
        <div className={styles.playerRank}><strong>Rank:</strong> {(() => {
          const level = playerData.level;
          if (level <= 15) return 'E';
          if (level <= 25) return 'D';
          if (level <= 50) return 'C';
          if (level <= 75) return 'B';
          if (level <= 100) return 'A';
          if (level <= 200) return 'S';
          if (level <= 500) return 'SS';
          if (level <= 700) return 'SSS';
          if (level <= 999) return 'SSS+';
          return '???';
        })()}</div>
        <div className={styles.playerClass}>Class: {playerData.masterClass}</div>
        {playerData.description && (
          <div className={styles.playerDesc}>{playerData.description}</div>
        )}
      </div>
    </Card>
  </div>
); 