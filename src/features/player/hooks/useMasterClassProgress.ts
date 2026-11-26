import { useEffect, useState } from 'react';
import type GamifiedObsidianPlugin from 'src/core/main';
import { parseFrontmatterMobile } from 'src/shared/utils/skillDiscovery';
import { TFile } from 'obsidian';

export type MasterClassProgress = {
  level: number;
  currentCP: number;
  requiredCP: number;
  totalCP: number;
  icon?: string;
  filePath?: string;
};

function isMasterClassNote(f: TFile): boolean {
  if (!f.path.startsWith('SkillTree/Master-Class/')) return false;
  if (!f.path.endsWith('.md')) return false;
  if (f.path.includes('/Class/')) return false;
  if (f.path.includes('/Skills/')) return false;
  if (f.path.includes('/Stats/')) return false;
  if (f.path.includes('/Stat/')) return false;
  return true;
}

function masterNoteCandidates(name: string): string[] {
  const trimmed = name.trim();
  if (!trimmed) return [];
  return [
    `SkillTree/Master-Class/${trimmed}.md`,
    `SkillTree/Master-Class/${trimmed}/${trimmed}.md`,
  ];
}

async function findMasterClassNote(
  plugin: GamifiedObsidianPlugin,
  masterClassName: string
): Promise<TFile | null> {
  const vault = plugin.app.vault;
  const target = masterClassName.trim().toLowerCase();
  for (const path of masterNoteCandidates(masterClassName)) {
    const hit = vault.getAbstractFileByPath(path);
    if (hit instanceof TFile) return hit;
  }

  const files = vault.getMarkdownFiles();
  const exact = files.find(
    (f) => isMasterClassNote(f) && f.basename.trim().toLowerCase() === target
  );
  if (exact) return exact;

  return (
    files.find((f) => {
      if (!isMasterClassNote(f)) return false;
      const base = f.basename.trim().toLowerCase();
      return base.includes(target) || base.startsWith(target);
    }) ?? null
  );
}

/** Reads the named master-class note. getMarkdownFiles includes notes the phone has not opened. */
async function loadMasterClassProgressFast(
  plugin: GamifiedObsidianPlugin,
  masterClassName: string | undefined
): Promise<{ classIcon: string | null; progress: MasterClassProgress | null }> {
  const target = String(masterClassName || '').trim().toLowerCase();
  if (!target) return { classIcon: null, progress: null };

  const vault = plugin.app.vault;
  const named = await findMasterClassNote(plugin, masterClassName || '');
  const candidates: TFile[] = named ? [named] : [];

  let best: { file: TFile; data: Record<string, unknown> } | null = null;

  for (const f of candidates) {
    const raw = await vault.read(f);
    const { data } = parseFrontmatterMobile(raw);
    const fmName = String(data?.name || '').trim().toLowerCase();
    if (fmName && fmName === target) {
      best = { file: f, data };
      break;
    }
    if (!best) best = { file: f, data };
  }

  if (!best) return { classIcon: null, progress: null };

  const d = best.data || {};
  return {
    classIcon: (d.icon as string | undefined) || null,
    progress: {
      level: Number(d.level) || 1,
      currentCP: Number(d.currentCP ?? d.cp ?? 0) || 0,
      requiredCP: Number(d.requiredCP ?? 400) || 400,
      totalCP: Number(d.totalCP ?? 0) || 0,
      icon: (d.icon as string | undefined) || undefined,
      filePath: best.file.path,
    },
  };
}

export function useMasterClassProgress(
  plugin: GamifiedObsidianPlugin,
  masterClassName: string | undefined,
  options?: { lightweight?: boolean }
): { classIcon: string | null; progress: MasterClassProgress | null } {
  const [classIcon, setClassIcon] = useState<string | null>(null);
  const [progress, setProgress] = useState<MasterClassProgress | null>(null);
  const lightweight = options?.lightweight ?? false;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        if (lightweight) {
          const result = await loadMasterClassProgressFast(plugin, masterClassName);
          if (cancelled) return;
          setClassIcon(result.classIcon);
          setProgress(result.progress);
          return;
        }

        const { getAllClasses } = await import('src/shared/utils/skillDiscovery');
        const vault = plugin.app.vault;
        const classes = await getAllClasses(vault);
        const clsMatch = classes.find((cls) => cls.masterClass === masterClassName);

        const candidates: TFile[] = [];
        for (const f of vault.getAllLoadedFiles()) {
          if (!(f instanceof TFile) || !isMasterClassNote(f)) continue;
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

    void load();
    document.addEventListener('stats-updated', load);
    document.addEventListener('player-data-updated', load);
    return () => {
      cancelled = true;
      document.removeEventListener('stats-updated', load);
      document.removeEventListener('player-data-updated', load);
    };
  }, [plugin, masterClassName, lightweight]);

  return { classIcon, progress };
}
