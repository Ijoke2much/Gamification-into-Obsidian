import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type GamifiedObsidianPlugin from 'src/core/main';
import { PlayerData, DEFAULT_PLAYER_DESCRIPTION } from 'src/data/models/PlayerData';
import styles from './PlayerProfileCard.module.css';
import { SystemFrame, SystemResourceBar } from '../../../shared/components/ui/system';
import { ProgressBar } from 'src/shared/components/ui/ProgressBar';
import { getRankProgress } from '../utils/playerRank';
import { getAppliedVisualTheme } from '../../../shared/utils/visualThemeManager';
import { onSettingsUpdated } from '../../../shared/utils/settingsEvents';
import { isBookOfEasyEnabled } from '../../../shared/utils/gameplayConfig';
import { useMasterClassProgress } from '../hooks/useMasterClassProgress';
import {
  getDailyActivityStreak,
  recordDailyActivity,
} from '../../../shared/utils/dailyActivityStreak';
import { HunterLookPortrait } from '../../inventory/components/HunterLookPortrait';
import { getHunterKitItems, type EquippedGearItem } from '../../inventory/utils/gearFile';
import {
  buildDreamCombatStats,
  dreamStatBarMax,
  forecastDreamRaid,
  kitSummaryLine,
  lastOutcomeLine,
  summarizeDreamKit,
  type DreamRaidHint,
} from '../utils/dreamCombat';
import {
  BOSS_RAID_UPDATED_EVENT,
  getActiveBossFileRaid,
} from '../../quests/utils/bossRaidService';
import { readBoss } from '../../quests/utils/bossFile';

export type ProfileSheet = 'player' | 'dream';

const PROFILE_SHEET_KEY = 'gamification-profile-sheet-v1';

function readStoredSheet(): ProfileSheet {
  try {
    return window.localStorage.getItem(PROFILE_SHEET_KEY) === 'dream' ? 'dream' : 'player';
  } catch {
    return 'player';
  }
}

function writeStoredSheet(sheet: ProfileSheet) {
  try {
    window.localStorage.setItem(PROFILE_SHEET_KEY, sheet);
  } catch {
    /* ignore quota / private mode */
  }
}

export type PlayerIdentityPatch = {
  name?: string;
  masterClass?: string;
  description?: string;
};

export interface PlayerProfileCardProps {
  playerData: PlayerData;
  plugin: GamifiedObsidianPlugin;
  openAvatarPicker: () => void;
  /** Skip vault-wide class scans (mobile performance). */
  lightweight?: boolean;
  /** Show consecutive active-day streak (mobile Player tab). */
  showActivityStreak?: boolean;
  onOpenStats?: () => void;
  onOpenSkills?: () => void;
  onUpdateIdentity?: (patch: PlayerIdentityPatch) => Promise<void>;
}

export const PlayerProfileCard: React.FC<PlayerProfileCardProps> = ({
  playerData,
  plugin,
  openAvatarPicker,
  lightweight = false,
  showActivityStreak = false,
  onOpenStats,
  onOpenSkills,
  onUpdateIdentity,
}) => {
  const [themeRevision, setThemeRevision] = useState(0);
  const [activityStreak, setActivityStreak] = useState(0);
  const [look, setLook] = useState<EquippedGearItem[]>([]);
  const [sheet, setSheet] = useState<ProfileSheet>(readStoredSheet);
  const [raidHint, setRaidHint] = useState<DreamRaidHint | null>(null);
  const [identityModalOpen, setIdentityModalOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [classDraft, setClassDraft] = useState('');
  const [descDraft, setDescDraft] = useState('');

  useEffect(() => {
    if (!identityModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIdentityModalOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [identityModalOpen]);

  useEffect(() => onSettingsUpdated(() => setThemeRevision((n) => n + 1)), []);

  useEffect(() => {
    let cancelled = false;
    const loadKit = async () => {
      try {
        const { look: lookItems } = await getHunterKitItems(plugin.app);
        if (!cancelled) setLook(lookItems);
      } catch {
        if (!cancelled) setLook([]);
      }
    };
    void loadKit();
    const refresh = () => {
      void loadKit();
    };
    window.addEventListener('gear-updated', refresh);
    window.addEventListener('inventory-updated', refresh);
    return () => {
      cancelled = true;
      window.removeEventListener('gear-updated', refresh);
      window.removeEventListener('inventory-updated', refresh);
    };
  }, [plugin.app]);

  useEffect(() => {
    let cancelled = false;
    const loadRaid = async () => {
      const raid = getActiveBossFileRaid();
      if (!raid || raid.defeated) {
        if (!cancelled) setRaidHint(null);
        return;
      }
      try {
        const boss = await readBoss(plugin.app, raid.bossFilePath);
        if (cancelled) return;
        if (!boss) {
          setRaidHint(null);
          return;
        }
        setRaidHint({
          name: boss.name,
          difficulty: boss.difficulty,
          timesDefeated: boss.timesDefeated,
        });
      } catch {
        if (!cancelled) setRaidHint(null);
      }
    };
    void loadRaid();
    const refresh = () => {
      void loadRaid();
    };
    window.addEventListener(BOSS_RAID_UPDATED_EVENT, refresh);
    return () => {
      cancelled = true;
      window.removeEventListener(BOSS_RAID_UPDATED_EVENT, refresh);
    };
  }, [plugin.app]);

  useEffect(() => {
    if (!showActivityStreak) return;
    recordDailyActivity();
    setActivityStreak(getDailyActivityStreak());
  }, [showActivityStreak, playerData?.level, playerData?.xp]);

  const themePreset = useMemo(
    () => getAppliedVisualTheme().preset,
    [themeRevision]
  );
  const systemUi = themePreset === 'system-hunter';
  const clayUi = themePreset === 'clay';
  const bookOfEasy = isBookOfEasyEnabled(plugin.settings);

  const { classIcon, progress: masterClassProgress } = useMasterClassProgress(
    plugin,
    playerData?.masterClass,
    { lightweight }
  );

  const dreamStats = useMemo(
    () => buildDreamCombatStats(playerData?.level ?? 1, look, playerData?.dream, bookOfEasy),
    [playerData?.level, playerData?.dream, look, bookOfEasy]
  );
  const dreamKit = useMemo(() => summarizeDreamKit(look, bookOfEasy), [look, bookOfEasy]);
  const dreamForecast = useMemo(
    () => forecastDreamRaid(dreamStats, playerData?.level ?? 1, raidHint),
    [dreamStats, playerData?.level, raidHint]
  );
  const dreamOutcome = lastOutcomeLine(
    playerData?.dream?.lastOutcome,
    playerData?.dream?.lastBossName
  );

  const selectSheet = (next: ProfileSheet) => {
    setSheet(next);
    writeStoredSheet(next);
  };

  if (!playerData) {
    return <div className={styles.loading}>Loading player data...</div>;
  }

  const masterRequiredCP = Math.max(1, Number(masterClassProgress?.requiredCP) || 1);
  const masterCurrentCP = Math.max(0, Number(masterClassProgress?.currentCP) || 0);
  const masterPercent = Math.min(
    100,
    Math.max(0, Math.round((masterCurrentCP / masterRequiredCP) * 100))
  );
  const rankProgress = getRankProgress(playerData.level);
  const rank = rankProgress.rank;
  const description = playerData.description?.trim() || '';
  const descriptionIsPlaceholder =
    !description || description === DEFAULT_PLAYER_DESCRIPTION;
  const avatarSrc = plugin.app.vault.adapter.getResourcePath(
    playerData.avatar || 'assets/avatar-default.png'
  );
  const isDream = sheet === 'dream';
  const xp = Number(playerData.xp || 0);
  const xpRequired = Math.max(1, Number(playerData.xpRequired || 1));
  const xpPercent = Math.min(100, Math.max(0, Math.round((xp / xpRequired) * 100)));
  const atkBarMax = dreamStatBarMax('atk', dreamStats);
  const defBarMax = dreamStatBarMax('def', dreamStats);

  const openIdentityModal = () => {
    if (!onUpdateIdentity) return;
    setNameDraft(playerData.name);
    setClassDraft(playerData.masterClass || '');
    setDescDraft(playerData.description || '');
    setIdentityModalOpen(true);
  };

  const saveIdentityModal = async () => {
    if (!onUpdateIdentity) {
      setIdentityModalOpen(false);
      return;
    }
    const name = nameDraft.trim() || playerData.name;
    const masterClass = classDraft.trim() || playerData.masterClass;
    const nextDesc = descDraft.trim();
    const patch: PlayerIdentityPatch = {};
    if (name !== playerData.name) patch.name = name;
    if (masterClass !== playerData.masterClass) patch.masterClass = masterClass;
    if (nextDesc !== (playerData.description || '')) patch.description = nextDesc;
    if (Object.keys(patch).length > 0) await onUpdateIdentity(patch);
    setIdentityModalOpen(false);
  };

  const sheetToggle = (
    <div className={styles.sheetToggle} role="tablist" aria-label="Profile sheet">
      <button
        type="button"
        role="tab"
        aria-selected={!isDream}
        className={`${styles.sheetTab} ${!isDream ? styles.sheetTabActive : ''}`}
        onClick={() => selectSheet('player')}
      >
        Player
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={isDream}
        className={`${styles.sheetTab} ${isDream ? styles.sheetTabActive : ''}`}
        onClick={() => selectSheet('dream')}
      >
        Dream
      </button>
    </div>
  );

  const content = (
    <>
      {sheetToggle}

      <div className={styles.hunterHeader}>
        {systemUi ? (
          <>
            <h2 className={styles.hunterTitle}>{isDream ? 'Dream Player' : 'Player'}</h2>
            <div className={styles.playerXpPanel}>
              <div className={styles.masterLvBlock}>
                <span className={styles.statLabel}>Level</span>
                <span className={styles.statValue}>{playerData.level}</span>
              </div>
              <SystemResourceBar
                label="XP"
                icon="exp"
                current={xp}
                max={xpRequired}
                className={styles.xpResource}
              />
            </div>
          </>
        ) : (
          <>
            <div className={styles.hunterTitleRow}>
              <h2 className={styles.hunterTitle}>{isDream ? 'Dream Player' : 'Player'}</h2>
              <span className={styles.hunterLevel}>Level {playerData.level}</span>
            </div>
            <ProgressBar
              progress={xpPercent}
              height={clayUi ? 16 : 16}
              variant={clayUi ? 'ivory' : 'purple'}
              labelPosition={clayUi ? 'below' : 'center'}
              appearance={clayUi ? 'clay' : 'pixel'}
              label={`${xp.toLocaleString()} / ${xpRequired.toLocaleString()} XP`}
            />
          </>
        )}
      </div>

      <div className={styles.portraitSection}>
        <HunterLookPortrait
          avatarSrc={avatarSrc}
          look={look}
          compact
          showEditHint
          forceIntact={bookOfEasy}
          clayUi={clayUi}
          onPortraitClick={openAvatarPicker}
        />
      </div>

      <div className={`${styles.identity} ${isDream ? styles.identityDream : ''}`}>
        <div className={styles.identityHead}>
          <h3 className={styles.playerName}>{playerData.name}</h3>
          {onUpdateIdentity && (
            <button
              type="button"
              className={styles.editIdentity}
              onClick={openIdentityModal}
              aria-label="Edit name, class, and description"
              title="Edit identity"
            >
              <PencilIcon />
            </button>
          )}
        </div>

        {isDream ? (
          <>
            <div className={styles.hunterStats} aria-label="Dream combat stats">
              <HunterStatRow
                icon="❤️"
                label="HP"
                value={dreamStats.hp}
                max={dreamStats.maxHp}
                color="#ff6b6b"
                title={`${dreamStats.hp} / ${dreamStats.maxHp} HP`}
              />
              <HunterStatRow
                icon="⚔️"
                label="ATK"
                value={dreamStats.atk}
                max={atkBarMax}
                color="#c4b5fd"
                title={`Base ${dreamStats.baseAtk} + gear ${dreamStats.gearAtk}`}
              />
              <HunterStatRow
                icon="🛡️"
                label="DEF"
                value={dreamStats.def}
                max={defBarMax}
                color="#67e8f9"
                title={`Base ${dreamStats.baseDef} + gear ${dreamStats.gearDef}`}
              />
            </div>

            <div className={styles.hunterRankBlock} aria-label={`Rank ${rank}`}>
              <p className={styles.hunterRankLine}>
                Rank <span className={styles.rankValue}>{rank}</span>
              </p>
              {rankProgress.nextRank && (
                <div className={styles.nextRankRow}>
                  <span className={styles.nextRankLabel}>Next rank</span>
                  <div
                    className={styles.nextRankTrack}
                    role="progressbar"
                    aria-valuenow={rankProgress.percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${rankProgress.percent} percent to rank ${rankProgress.nextRank}`}
                  >
                    <div
                      className={styles.nextRankFill}
                      style={{ width: `${rankProgress.percent}%` }}
                    />
                  </div>
                  <span className={styles.nextRankValue}>{rankProgress.percent}%</span>
                </div>
              )}
            </div>

            <p className={styles.dreamKitLine}>{kitSummaryLine(dreamKit)}</p>

            <p className={`${styles.dreamForecast} ${styles[`dreamForecast_${dreamForecast.tone}`]}`}>
              <span className={styles.dreamForecastLabel}>{dreamForecast.label}</span>
              {dreamForecast.detail}
            </p>

            {dreamOutcome && <p className={styles.dreamOutcome}>{dreamOutcome}</p>}

            {bookOfEasy && (
              <p className={styles.dreamRelic} title="Dream equipment never breaks">
                Relics · 📖 Book of Easy
              </p>
            )}
          </>
        ) : (
          <>
            <div className={styles.rankLine} aria-label={`Rank ${rank}`}>
              <span className={styles.rankLabel}>Rank</span>
              <span className={styles.rankValue}>{rank}</span>
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

            <p
              className={`${styles.description} ${
                descriptionIsPlaceholder ? styles.descriptionEmpty : ''
              }`}
            >
              {description || DEFAULT_PLAYER_DESCRIPTION}
            </p>

            {(onOpenStats || onOpenSkills) && (
              <div className={styles.cardActions}>
                {onOpenStats && (
                  <button
                    type="button"
                    className={styles.cardAction}
                    onClick={onOpenStats}
                    aria-label="View Stats"
                  >
                    <span className={styles.cardActionIcon} aria-hidden="true">
                      📊
                    </span>
                    Stats
                  </button>
                )}
                {onOpenSkills && (
                  <button
                    type="button"
                    className={styles.cardAction}
                    onClick={onOpenSkills}
                    aria-label="Open Skill Tree"
                  >
                    <span className={styles.cardActionIcon} aria-hidden="true">
                      🌳
                    </span>
                    Skills
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );

  return (
    <>
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
    {identityModalOpen &&
      createPortal(
        <div
          className={`${styles.identityModalOverlay} ${clayUi ? styles.identityModalClay : ''} ${
            systemUi ? styles.identityModalSystem : ''
          }`}
          role="presentation"
          onClick={() => setIdentityModalOpen(false)}
        >
          <div
            className={styles.identityModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="identity-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="identity-modal-title" className={styles.identityModalTitle}>
              Edit identity
            </h2>
            <label className={styles.identityModalField}>
              <span>Name</span>
              <input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                autoFocus
              />
            </label>
            <label className={styles.identityModalField}>
              <span>Master class</span>
              <input
                value={classDraft}
                onChange={(e) => setClassDraft(e.target.value)}
              />
            </label>
            <label className={styles.identityModalField}>
              <span>Description</span>
              <textarea
                rows={4}
                value={descDraft}
                onChange={(e) => setDescDraft(e.target.value)}
              />
            </label>
            <div className={styles.identityModalActions}>
              <button
                type="button"
                className={styles.identityModalSecondary}
                onClick={() => setIdentityModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.identityModalPrimary}
                onClick={() => void saveIdentityModal()}
              >
                Save
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 20h4.5L19 9.5 14.5 5 4 15.5V20z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M13.2 6.3 17.7 10.8" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function HunterStatRow({
  icon,
  label,
  value,
  max,
  color,
  title,
}: {
  icon: string;
  label: string;
  value: number;
  max: number;
  color: string;
  title?: string;
}) {
  const percent = Math.min(100, Math.max(0, Math.round((value / Math.max(1, max)) * 100)));
  return (
    <div
      className={styles.hunterStat}
      title={title}
      style={{ ['--hunter-stat' as string]: color }}
    >
      <span className={styles.hunterStatIcon} aria-hidden="true">
        {icon}
      </span>
      <span className={styles.hunterStatName}>{label}</span>
      <div className={styles.hunterStatTrack}>
        <div className={styles.hunterStatFill} style={{ width: `${percent}%` }} />
      </div>
      <span className={styles.hunterStatValue}>{value}</span>
    </div>
  );
}
