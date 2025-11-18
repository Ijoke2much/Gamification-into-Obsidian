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

export const PlayerInfoCard: React.FC<PlayerInfoCardProps> = ({ playerData, plugin, openAvatarPicker }) => {
  // Enhanced debug logging for mobile description issue
  console.log('🎮 PlayerInfoCard render:', {
    hasPlayerData: !!playerData,
    description: playerData?.description,
    descriptionLength: playerData?.description?.length,
    descriptionRaw: JSON.stringify(playerData?.description),
    name: playerData?.name,
    allPlayerData: playerData
  });

  if (!playerData) {
    console.log('⚠️ PlayerInfoCard: No playerData provided');
    return <div className={styles.infoCardGrid}>Loading player data...</div>;
  }

  return (
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
          onClick={() => {
            console.log("testing working console");
            window.console.log("🎮 Avatar button clicked! Hello Squeef");
            openAvatarPicker();
          }}
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
          {playerData.description && playerData.description.trim() && (
            <div className={styles.playerDesc}>{playerData.description}</div>
          )}
          {(!playerData.description || !playerData.description.trim()) && (
            <div className={styles.playerDesc} style={{ fontStyle: 'italic', opacity: 0.6 }}>
              No description set
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}; 