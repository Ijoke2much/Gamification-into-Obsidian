import { Vault } from "obsidian";
import { readYamlFrontmatter, writeYamlFrontmatter } from "./progressUpdater";

export type BuffKind = "xp" | "coins" | "cp" | "rewards" | "trade" | "quest" | "pomodoro" | "all";

export interface Buff {
    id?: string;
    type: BuffKind;
    multiplier: number; // e.g., 1.25 for +25%
    expiresAt?: number; // epoch ms
    charges?: number; // optional usage-based expiration
    source?: string; // item or quest that created it
}

export interface Multipliers {
    xp: number;
    coins: number;
    cp: number;
}

export function parseDurationToMs(input: string): number | null {
    const s = input.trim().toLowerCase();
    const m = s.match(/^(\d+)(s|m|h|d|w)$/);
    if (!m) return null;
    const value = parseInt(m[1], 10);
    const unit = m[2];
    const unitMs: Record<string, number> = {
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000,
        w: 7 * 24 * 60 * 60 * 1000,
    };
    return value * unitMs[unit];
}

export async function getActiveBuffs(vault: Vault): Promise<Buff[]> {
    const playerPath = "SkillTree/PlayerData.md";
    const { frontmatter } = await readYamlFrontmatter(vault, playerPath);
    const now = Date.now();
    type PlayerFrontmatter = Record<string, unknown> & { buffs?: unknown };
    const fm = frontmatter as PlayerFrontmatter;
    const rawBuffs: Buff[] = Array.isArray(fm.buffs)
        ? (fm.buffs as Buff[])
        : [];
    const active = rawBuffs.filter((b: Buff) => {
        if (!b) return false;
        if (typeof b.expiresAt === "number" && b.expiresAt <= now) return false;
        if (typeof b.expiresAt === "string") {
            const t = Date.parse(b.expiresAt);
            if (!isNaN(t) && t <= now) return false;
        }
        return true;
    });
    // Persist filtered buffs (cleanup expired)
    fm.buffs = active;
    await writeYamlFrontmatter(vault, playerPath, frontmatter);
    return active;
}

export function computeRewardMultipliers(buffs: Buff[], debuffs: Buff[] = []): Multipliers {
    const result: Multipliers = { xp: 1, coins: 1, cp: 1 };

    const apply = (list: Buff[], sign: 1 | -1) => {
        for (const b of list) {
            const mult = Number(b.multiplier ?? 1);
            if (!mult || mult <= 0) continue;
            const m = sign === 1 ? mult : mult; // debuffs expected <=1, multiply directly
            if (b.type === "xp" || b.type === "all" || b.type === "rewards") result.xp *= m;
            if (b.type === "coins" || b.type === "all" || b.type === "rewards") result.coins *= m;
            if (b.type === "cp" || b.type === "all" || b.type === "rewards") result.cp *= m;
        }
    };

    apply(buffs, 1);
    apply(debuffs, -1);
    return result;
}

export async function addBuff(vault: Vault, buff: Buff): Promise<void> {
    const playerPath = "SkillTree/PlayerData.md";
    const { frontmatter } = await readYamlFrontmatter(vault, playerPath);
    type PlayerFrontmatter = Record<string, unknown> & { buffs?: unknown };
    const fm = frontmatter as PlayerFrontmatter;
    const list: Buff[] = Array.isArray(fm.buffs)
        ? (fm.buffs as Buff[])
        : [];
    list.push(buff);
    fm.buffs = list;
    await writeYamlFrontmatter(vault, playerPath, frontmatter);
}

export async function addDebuff(vault: Vault, debuff: Buff): Promise<void> {
    const playerPath = "SkillTree/PlayerData.md";
    const { frontmatter } = await readYamlFrontmatter(vault, playerPath);
    type PlayerFrontmatter = Record<string, unknown> & { debuffs?: unknown };
    const fm = frontmatter as PlayerFrontmatter;
    const list: Buff[] = Array.isArray(fm.debuffs)
        ? (fm.debuffs as Buff[])
        : [];
    list.push(debuff);
    fm.debuffs = list;
    await writeYamlFrontmatter(vault, playerPath, frontmatter);
}


