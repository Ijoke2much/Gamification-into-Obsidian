import { useEffect, useState } from 'react';
import type GamifiedObsidianPlugin from 'src/core/main';
import { getAllClasses, ClassMetadata, parseFrontmatterMobile } from 'src/shared/utils/skillDiscovery';
import { TFile } from 'obsidian';

export type MasterClassProgress = {
  level: number;
  currentCP: number;
  requiredCP: number;
  totalCP: number;
  icon?: string;
  filePath?: string;
};

export function useMasterClassProgress(
  plugin: GamifiedObsidianPlugin,
  masterClassName: string | undefined
): { classIcon: string | null; progress: MasterClassProgress | null } {
  const [classIcon, setClassIcon] = useState<string | null>(null);
  const [progress, setProgress] = useState<MasterClassProgress | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const vault = plugin.app.vault;
        const classes: ClassMetadata[] = await getAllClasses(vault);
        const clsMatch = classes.find((cls) => cls.masterClass === masterClassName);

        const candidates: TFile[] = [];
        for (const f of vault.getAllLoadedFiles()) {
          if (!(f instanceof TFile)) continue;
          if (!f.path.startsWith('SkillTree/Master-Class/')) continue;
          if (!f.path.endsWith('.md')) continue;
          if (f.path.includes('/Class/')) continue;
          if (f.path.includes('/Skills/')) continue;
          if (f.path.includes('/Stats/')) continue;
          if (f.path.includes('/Stat/')) continue;
          candidates.push(f);
        }

        const target = String(masterClassName || '').trim().toLowerCase();
        let best: { file: TFile; data: Record<string, unknown> } | null = null;

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

        if (cancelled) return;

        setClassIcon((best?.data?.icon as string | undefined) || clsMatch?.icon || null);

        if (best) {
          const d = best.data || {};
          setProgress({
            level: Number(d.level) || 1,
            currentCP: Number(d.currentCP ?? d.cp ?? 0) || 0,
            requiredCP: Number(d.requiredCP ?? 400) || 400,
            totalCP: Number(d.totalCP ?? 0) || 0,
            icon: (d.icon as string | undefined) || undefined,
            filePath: best.file.path,
          });
        } else {
          setProgress(null);
        }
      } catch (error) {
        console.error('Failed to load master class metadata:', error);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [plugin.app.vault, masterClassName]);

  return { classIcon, progress };
}
