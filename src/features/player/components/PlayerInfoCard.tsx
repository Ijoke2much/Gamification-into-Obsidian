import React, { useEffect, useState } from 'react';
import type GamifiedObsidianPlugin from 'src/core/main';
import { PlayerData } from 'src/data/models/PlayerData';
import styles from './PlayerInfoCard.module.css';
import { Card } from '../../../shared/components/ui/PlayerTabComponents';
import { getAllClasses, ClassMetadata, parseFrontmatterMobile } from 'src/shared/utils/skillDiscovery';
import { ProgressBar } from 'src/shared/components/ui/ProgressBar';
import { TFile } from 'obsidian';

interface PlayerInfoCardProps {
  playerData: PlayerData;
  plugin: GamifiedObsidianPlugin;
  openAvatarPicker: () => void;
}

type MasterClassProgress = {
  level: number;
  currentCP: number;
  requiredCP: number;
  totalCP: number;
  icon?: string;
  filePath?: string;
};

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

  const [classIcon, setClassIcon] = useState<string | null>(null);
  const [masterClassProgress, setMasterClassProgress] = useState<MasterClassProgress | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadMasterClassMeta = async () => {
      try {
        const vault = plugin.app.vault;

        // 1) Try to find any class belonging to this master class (for an icon fallback)
        const classes: ClassMetadata[] = await getAllClasses(vault);
        const clsMatch = classes.find((cls) => cls.masterClass === playerData.masterClass);

        // 2) Find the master class .md (not a Class/Skills/Stats file)
        const allFiles = vault.getAllLoadedFiles();
        const candidates: TFile[] = [];
        for (const f of allFiles) {
          if (!(f instanceof TFile)) continue;
          if (!f.path.startsWith('SkillTree/Master-Class/')) continue;
          if (!f.path.endsWith('.md')) continue;
          if (f.path.includes('/Class/')) continue;
          if (f.path.includes('/Skills/')) continue;
          if (f.path.includes('/Stats/')) continue;
          if (f.path.includes('/Stat/')) continue;
          candidates.push(f);
        }

        const target = String(playerData.masterClass || '').trim().toLowerCase();
        let best: { file: TFile; data: Record<string, any> } | null = null;

        // Prefer an exact name match in frontmatter, then filename match
        for (const f of candidates) {
          const base = f.basename.trim().toLowerCase();
          if (!base.includes(target) && !base.startsWith(target)) continue;
          const raw = await vault.read(f);
          const { data } = parseFrontmatterMobile(raw);
          const fmName = String(data?.name || '').trim().toLowerCase();
          if (fmName && fmName === target) {
            best = { file: f, data };
            break;
          }
          if (!best) best = { file: f, data };
        }

        // If none matched by filename, do a slower scan by frontmatter name
        if (!best) {
          for (const f of candidates) {
            const raw = await vault.read(f);
            const { data } = parseFrontmatterMobile(raw);
            const fmName = String(data?.name || '').trim().toLowerCase();
            if (fmName && fmName === target) {
              best = { file: f, data };
              break;
            }
          }
        }

        if (!cancelled) {
          setClassIcon((best?.data?.icon as string | undefined) || clsMatch?.icon || null);
          if (best) {
            const d = best.data || {};
            const lvl = Number(d.level) || 1;
            const currentCP = Number(d.currentCP ?? d.cp ?? 0) || 0;
            const requiredCP = Number(d.requiredCP ?? 400) || 400;
            const totalCP = Number(d.totalCP ?? 0) || 0;
            setMasterClassProgress({
              level: lvl,
              currentCP,
              requiredCP,
              totalCP,
              icon: (d.icon as string | undefined) || undefined,
              filePath: best.file.path,
            });
          } else {
            setMasterClassProgress(null);
          }
        }
      } catch (error) {
        console.error('Failed to load master class metadata for PlayerInfoCard:', error);
      }
    };

    loadMasterClassMeta();

    return () => {
      cancelled = true;
    };
  }, [plugin.app.vault, playerData.masterClass]);

  if (!playerData) {
    console.log('⚠️ PlayerInfoCard: No playerData provided');
    return <div className={styles.infoCardGrid}>Loading player data...</div>;
  }

  const xpRequired = Math.max(1, Number(playerData.xpRequired) || 1);
  const xp = Math.max(0, Number(playerData.xp) || 0);
  const xpPercent = Math.min(100, Math.max(0, Math.round((xp / xpRequired) * 100)));

  const masterRequiredCP = Math.max(1, Number(masterClassProgress?.requiredCP) || 1);
  const masterCurrentCP = Math.max(0, Number(masterClassProgress?.currentCP) || 0);
  const masterPercent = Math.min(100, Math.max(0, Math.round((masterCurrentCP / masterRequiredCP) * 100)));

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
          <div className={styles.playerClass}>
            <strong>Master Class:</strong>{' '}
            {classIcon && (
              <span className={styles.masterClassIcon} aria-hidden="true">
                {classIcon}
              </span>
            )}
            <span className={styles.masterClassName}>{playerData.masterClass}</span>
          </div>

          {/* Master Class progress (side-by-side inside card): MASTER LV + CP */}
          <div className={styles.masterProgressRowContainer}>
            <div className={styles.sidebarProgressRow}>
              <div className={styles.sidebarMasterLevelCard}>
                <div className={styles.sidebarMiniLabel}>MASTER LV</div>
                <div className={styles.sidebarLevelValue}>{masterClassProgress?.level ?? 1}</div>
              </div>

              <div className={styles.sidebarCpCard}>
                <div className={styles.sidebarMiniLabel}>CP</div>
                <ProgressBar
                  progress={masterPercent}
                  height={14}
                  variant="purple"
                  labelPosition="center"
                  label={`${masterCurrentCP}/${masterRequiredCP} CP`}
                />
              </div>
            </div>
          </div>

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