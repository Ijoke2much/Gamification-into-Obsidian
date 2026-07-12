import { App, TFile, TFolder } from "obsidian";
import yaml from "js-yaml";

/**
 * Opens a stat note in the workspace. Uses filePath when available,
 * otherwise scans the configured stat folder for a matching code.
 */
export async function openStatNote(
  app: App,
  opts: {
    statFolder: string;
    code: string;
    filePath?: string;
  }
): Promise<boolean> {
  const tryOpen = async (path: string): Promise<boolean> => {
    const file = app.vault.getAbstractFileByPath(path);
    if (file instanceof TFile) {
      await app.workspace.getLeaf(false).openFile(file);
      return true;
    }
    return false;
  };

  if (opts.filePath && (await tryOpen(opts.filePath))) {
    return true;
  }

  const folder = app.vault.getAbstractFileByPath(opts.statFolder);
  if (!(folder instanceof TFolder)) return false;

  const targetCode = opts.code.trim().toUpperCase();

  for (const child of folder.children) {
    if (!(child instanceof TFile) || child.extension !== "md") continue;

    try {
      const content = await app.vault.read(child);
      const match = content.match(/^---([\s\S]*?)---/);
      if (!match) continue;
      const fm = yaml.load(match[1]);
      if (!fm || typeof fm !== "object") continue;
      const code = String(
        (fm as { code?: string; name?: string }).code ??
          (fm as { name?: string }).name ??
          child.basename
      )
        .trim()
        .toUpperCase();
      if (code === targetCode || code.startsWith(targetCode)) {
        return tryOpen(child.path);
      }
    } catch {
      // skip unreadable files
    }
  }

  return false;
}
