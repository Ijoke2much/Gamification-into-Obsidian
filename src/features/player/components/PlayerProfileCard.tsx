import React, { useEffect, useMemo, useState } from 'react';
import type GamifiedObsidianPlugin from 'src/core/main';
import { PlayerData } from 'src/data/models/PlayerData';
import styles from './PlayerProfileCard.module.css';
import { SystemFrame, SystemHeader, SystemResourceBar } from '../../../shared/components/ui/system';
import { ProgressBar } from 'src/shared/components/ui/ProgressBar';
import { getRankFromLevel } from '../utils/playerRank';
import { getAppliedVisualTheme } from '../../../shared/utils/visualThemeManager';
import { onSettingsUpdated } from '../../../shared/utils/settingsEvents';
import { useMasterClassProgress } from '../hooks/useMasterClassProgress';
import {
  getDailyActivityStreak,
  recordDailyActivity,
} from '../../../shared/utils/dailyActivityStreak';

export interface PlayerProfileCardProps {
  playerData: PlayerData;
  plugin: GamifiedObsidianPlugin;
  openAvatarPicker: () => void;
  /** Skip vault-wide class scans (mobile performance). */
  lightweight?: boolean;
  /** Show consecutive active-day streak (mobile Player tab). */
  showActivityStreak?: boolean;
}

export const PlayerProfileCard: React.FC<PlayerProfileCardProps> = ({
  playerData,
  plugin,
  openAvatarPicker,
  lightweight = false,
  showActivityStreak = false,
}) => {
  const [themeRevision, setThemeRevision] = useState(0);
  const [activityStreak, setActivityStreak] = useState(0);

  useEffect(() => onSettingsUpdated(() => setThemeRevision((n) => n + 1)), []);

  useEffect(() => {
    if (!showActivityStreak) return;
    // Opening Player counts as light activity for the streak day
    recordDailyActivity();
    setActivityStreak(getDailyActivityStreak());
  }, [showActivityStreak, playerData?.level, playerData?.xp]);

  const themePreset = useMemo(
    () => getAppliedVisualTheme().preset,
    [themeRevision]
  );
  const systemUi = themePreset === 'system-hunter';
  const clayUi = themePreset === 'clay';

  const { classIcon, progress: masterClassProgress } = useMasterClassProgress(
    plugin,
    playerData?.masterClass,
    { lightweight }
  );

  if (!playerData) {
    return <div className={styles.loading}>Loading player data...</div>;
  }

  const masterRequiredCP = Math.max(1, Number(masterClassProgress?.requiredCP) || 1);
  const masterCurrentCP = Math.max(0, Number(masterClassProgress?.currentCP) || 0);
  const masterPercent = Math.min(
    100,
    Math.max(0, Math.round((masterCurrentCP / masterRequiredCP) * 100))
  );
  const rank = getRankFromLevel(playerData.level);
  const description = playerData.description?.trim() || '';
  const avatarSrc = plugin.app.vault.adapter.getResourcePath(
    playerData.avatar || 'assets/avatar-default.png'
  );

  const content = (
    <>
      {systemUi ? (
        <SystemHeader label="STATUS" />
      ) : (
        <p
          className={`${styles.statLabel} ${clayUi ? styles.statLabelClay : ''}`}
          style={{ marginBottom: 4, letterSpacing: '0.2em' }}
        >
          {clayUi ? 'STATUS' : 'PROFILE'}
        </p>
      )}

      <div className={styles.portraitSection}>
        <button
          type="button"
          className={styles.portraitSlot}
          onClick={openAvatarPicker}
          aria-label="Change avatar"
        >
          <img src={avatarSrc} className={styles.portraitImg} alt="" />
          <span className={styles.portraitEditHint} aria-hidden="true">
            Edit
          </span>
        </button>
      </div>

      <div className={styles.identity}>
        <h2 className={styles.playerName}>{playerData.name}</h2>

        <div className={styles.rankLine} aria-label={`Rank ${rank}, level ${playerData.level}`}>
          <span className={styles.rankLabel}>Rank</span>
          <span className={styles.rankValue}>{rank}</span>
          <span className={styles.rankDivider} aria-hidden="true">
            ·
          </span>
          <span className={styles.rankLevel}>Lv.{playerData.level}</span>
        </div>

        {showActivityStreak && activityStreak > 0 && (
          <div
            className={styles.streakLine}
            aria-label={`${activityStreak} day${activityStreak === 1 ? '' : 's'} in a row`}
          >
            🔥 {activityStreak} day{activityStreak === 1 ? '' : 's'} in a row
          </div>
        )}

        <div className={styles.masterClassLine}>
          <span className={styles.masterClassLabel}>Master Class:</span>
          {classIcon && (
            <span className={styles.masterClassIcon} aria-hidden="true">
              {classIcon}
            </span>
          )}
          <span className={styles.masterClassName}>{playerData.masterClass || 'None'}</span>
        </div>

        <div className={styles.statsPanel}>
          <div className={styles.masterLvBlock}>
            <span className={styles.statLabel}>Master Lv</span>
            <span className={styles.statValue}>{masterClassProgress?.level ?? 1}</span>
          </div>

          <div className={styles.cpSection}>
            {systemUi ? (
              <SystemResourceBar
                label="CP"
                icon="cp"
                current={masterCurrentCP}
                max={masterRequiredCP}
              />
            ) : (
              <>
                {!clayUi && <span className={styles.statLabel}>CP</span>}
                <ProgressBar
                  progress={masterPercent}
                  height={clayUi ? 16 : 16}
                  variant="purple"
                  labelPosition={clayUi ? 'below' : 'center'}
                  appearance={clayUi ? 'clay' : 'pixel'}
                  label={`${masterCurrentCP} / ${masterRequiredCP} CP`}
                />
              </>
            )}
          </div>
        </div>

        {description ? (
          <p className={styles.description}>{description}</p>
        ) : (
          <p className={`${styles.description} ${styles.descriptionEmpty}`}>No description set</p>
        )}
      </div>
    </>
  );

  return (
    <div
      className={[
        styles.root,
        systemUi ? styles.rootSystem : clayUi ? styles.rootClay : styles.rootPixel,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {systemUi ? (
        <SystemFrame className={styles.frameSystem}>{content}</SystemFrame>
      ) : clayUi ? (
        <div className={styles.frameClay}>{content}</div>
      ) : (
        <div className={styles.framePixel}>{content}</div>
      )}
    </div>
  );
};
