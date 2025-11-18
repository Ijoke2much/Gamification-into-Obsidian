import { App, TFile, Vault, Notice } from "obsidian";
import { updatePlayerData } from "../../../shared/utils/progressUpdater";
import { MaterialInventoryManager } from "../../../shared/services/materialInventoryManager";

// Priority and difficulty options
export const PRIORITY_OPTIONS = ["Lowest", "Low", "Medium", "High", "Highest"];
export const DIFFICULTY_OPTIONS = ["Easy", "Medium", "Hard"];

// XP and CP range definitions based on priority and difficulty
export const getXPRange = (priority: string): [number, number] => {
    switch (priority) {
        case "Highest":
            return [2000, 3000];
        case "High":
            return [1000, 1999];
        case "Medium":
            return [500, 999];
        case "Low":
            return [200, 499];
        case "Lowest":
            return [100, 199];
        default:
            return [200, 499];
    }
};

export const getCPRange = (difficulty: string): [number, number] => {
    switch (difficulty) {
        case "Hard":
            return [100, 200];
        case "Medium":
            return [50, 99];
        case "Easy":
            return [10, 49];
        default:
            return [10, 49];
    }
};

// Helper function to get a random value within a range
export const getRandomInRange = (min: number, max: number): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Sanitize values for class names
export function sanitizeForClassName(value: string): string {
    return value.replace(/\s+/g, "-");
}

// Generate markdown task from quest data
export function generateMarkdownTask({
    title,
    description,
    subtasks,
    skills,
    priority,
    difficulty,
    xp,
    cp,
    due,
    recur,
    estimatedTime,
    banner,
    customRewards,
    enhancedRewards,
    metadataStyle = "emoji",
}: {
    title: string;
    description?: string;
    subtasks: { text: string; completed: boolean; description?: string }[];
    skills: string[]; // Changed from SkillMetadata to string[]
    priority: string;
    difficulty: string;
    xp: number;
    cp: number;
    due?: string;
    recur?: string;
    estimatedTime?: string;
    banner?: string;
    customRewards?: string[];
    enhancedRewards?: any[]; // Enhanced custom rewards
    metadataStyle?: "emoji" | "tags";
}): string {
    const sanitizedDifficulty = sanitizeForClassName(difficulty);
    const priorityEmoji =
        priority === "Highest"
            ? "🔺"
            : priority === "High"
                ? "⏫"
                : priority === "Medium"
                    ? "🔼"
                    : priority === "Low"
                        ? "🔽"
                        : priority === "Lowest"
                            ? "⏬"
                            : "";

    // --- Emoji-based metadata ---
    const emojiMeta: string[] = [];
    if (metadataStyle === "emoji") {
        // Always include CP, XP, and coins (rounded, 10% of XP)
        if (typeof cp === "number") emojiMeta.push(`⭐${cp}`);
        if (typeof xp === "number") emojiMeta.push(`✨${xp}`);
        const coins = Math.round((typeof xp === "number" ? xp : 0) * 0.1);
        emojiMeta.push(`��${coins}`);
        // Add priority emoji after coins
        if (priorityEmoji) emojiMeta.push(priorityEmoji);
        if (recur && recur.trim()) emojiMeta.push(`🔁${recur}`);
        if (skills.length > 0)
            emojiMeta.push(`🛠️${skills.join(",")}`);
        // Add stats if they exist (using 📊 emoji for stats)
        // Note: This will be added when quest creation supports stats
        // Add difficulty as separate metadata (not as priority emoji)
        if (sanitizedDifficulty) {
            const difficultyToEmoji: Record<string, string> = {
                'hard': '🔥', // fire for hard
                'medium': '⚖️', // balance for medium  
                'easy': '🌱' // seedling for easy
            };
            const emoji = difficultyToEmoji[sanitizedDifficulty.toLowerCase()] || '⚖️';
            emojiMeta.push(emoji);
        }
        // Add banner if present
        if (banner) emojiMeta.push(`🖼️${banner}`);
        // Add estimated time if present
        if (estimatedTime) emojiMeta.push(`⏱️${estimatedTime}`);
        // Place date last
        if (due) emojiMeta.push(`📅${due}`);
    }

    // --- Tasks plugin metadata (inline comment) ---
    const tasksMeta = [
        `difficulty: ${sanitizedDifficulty}`,
        `xp: ${xp}`,
        `cp: ${cp}`,
        due ? `due: ${due}` : null,
        recur ? `recur: ${recur}` : null,
        estimatedTime ? `time: ${estimatedTime}` : null,
        `skills: ${skills.join(", ")}`,
        banner ? `banner: ${banner}` : null,
        customRewards && customRewards.length > 0
            ? `rewards: ${customRewards.join(", ")}`
            : null,
    ].filter(Boolean);
    const tasksMetaString = tasksMeta.join(" | ");

    // --- TaskGenius plugin metadata (curly braces) ---
    const tgMetaObj: Record<string, string | number | boolean | string[]> = {
        difficulty: sanitizedDifficulty,
        xp,
        cp,
        ...(due ? { due } : {}),
        ...(recur ? { recur } : {}),
        ...(estimatedTime ? { time: estimatedTime } : {}),
        skills: skills,
        ...(banner ? { banner } : {}),
        ...(customRewards && customRewards.length > 0
            ? { rewards: customRewards }
            : {}),
    };
    const tgMetaString = `{${Object.entries(tgMetaObj)
        .map(([k, v]) =>
            Array.isArray(v)
                ? `${k}: [${v.map((x) => `"${x}"`).join(", ")}]`
                : typeof v === "string"
                    ? `${k}: "${v}"`
                    : `${k}: ${v}`
        )
        .join(", ")}}`;

    let md = `- [ ] ${title} #gamified-task`;
    // Only use emoji metadata style - no duplicate date/metadata
    if (emojiMeta.length > 0) {
        md += " " + emojiMeta.join(" ");
    }
    // Note: Removed tags/curly braces metadata to prevent duplicate {due:} appearing

    // Add description if provided
    if (description && description.trim()) {
        md += `\n  💭 ${description.trim()}`;
    }

    if (subtasks.length > 0) {
        md +=
            "\n" +
            subtasks
                .map((st) => {
                    let line = `  - [${st.completed ? "x" : " "}] ${st.text}`;
                    if (st.description) {
                        line += ` - ${st.description}`;
                    }
                    return line;
                })
                .join("\n");
    }
    return md;
}

// This is the function that is called when the pomodoro timer is complete
// It marks the quest as completed and updates the player data
// It also calls the onQuestComplete function if it is provided
// It returns the rewards as an object with xp, cp, and coins

export async function handleCompleteQuestFromPomodoro(
    app: App,
    questTitle: string,
    vault: Vault,
    onQuestComplete?: (rewards: { xp: number; cp: number; coins: number }) => void
) {
    const questFile = app.vault.getAbstractFileByPath("GamifiedTasks.md");

    if (!(questFile instanceof TFile)) {
        new Notice("GamifiedTasks.md not found.");
        return;
    }

    const content = await vault.read(questFile);
    const lines = content.split("\n");
    const questIndex = lines.findIndex(line =>
        line.includes(questTitle) && line.includes("#gamified-task")
    );

    if (questIndex === -1) {
        new Notice(`Quest not found: ${questTitle}`);
        return;
    }

    // Mark the quest as completed
    lines[questIndex] = lines[questIndex].replace("- [ ]", "- [x]");
    await vault.modify(questFile, lines.join("\n"));

    // Extract XP and CP from the line if possible (fallbacks if missing)
    const line = lines[questIndex];
    const matchXP = line.match(/✨(\d+)/);
    const matchCP = line.match(/⭐(\d+)/);

    // More robust patterns for skills and stats extraction
    const matchSkills = line.match(/skills:\s*([^|}]+)/i);
    const matchStats = line.match(/stats:\s*([^|}]+)/i);

    // Also try alternative patterns for different metadata formats
    const matchSkillsAlt = line.match(/skills\s*=\s*([^|}]+)/i);
    const matchStatsAlt = line.match(/stats\s*=\s*([^|}]+)/i);

    // Emoji metadata parsing (e.g., 🛠️Skill One,Skill Two)
    const emojiSkills = (() => {
        // Capture everything after the hammer emoji up to next emoji/hashtag.
        // This also tolerates optional trailing punctuation.
        const m = line.match(/🛠️\s*([^✨⭐💰🔁🔥⚖️🌱📅#\n\r]+)/);
        if (!m) return [] as string[];
        const raw = m[1];
        return raw.split(/[;,]/).map(s => s.trim()).filter(Boolean);
    })();

    const skills = (matchSkills ? matchSkills[1]
        : matchSkillsAlt ? matchSkillsAlt[1]
            : emojiSkills.join(','))
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

    const stats = (matchStats ? matchStats[1]
        : matchStatsAlt ? matchStatsAlt[1]
            : '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

    const xp = matchXP ? parseInt(matchXP[1]) : 100;
    const cp = matchCP ? parseInt(matchCP[1]) : xp;

    // Debug notice for parsed values
    new Notice(`[Quest Parser] Parsed → XP: ${xp}, CP: ${cp}, Skills: ${skills.join(', ') || 'none'}, Stats: ${stats.join(', ') || 'none'}`);
    const coins = Math.round(xp * 0.1);

    await updatePlayerData(vault, xp, coins, cp);

    // Distribute CP to skill/class/master class/stat
    // This function is no longer imported, so it's removed.
    // The original code had `await distributeCPFromQuest(vault, { skills, stats, cp });`
    // which is now removed.

    // Add material rewards based on quest difficulty
    try {
        // Determine difficulty from the quest line
        let difficulty = 'medium'; // default
        if (line.includes('🔥')) difficulty = 'hard';
        else if (line.includes('🌱')) difficulty = 'easy';
        else if (line.includes('⚖️')) difficulty = 'medium';

        // Add materials to inventory
        const materialReward = await MaterialInventoryManager.addQuestMaterials(app, difficulty);

        // Show material reward notification
        if (materialReward.materials.length > 0) {
            MaterialInventoryManager.showMaterialRewardNotification(
                materialReward.materials,
                materialReward.quality,
                'quest completion'
            );
        }
    } catch (error) {
        console.error('Error adding material rewards:', error);
    }

    try {
        // @ts-ignore
        const plugin = (app as any).plugins?.plugins?.["Gamification-into-Obsidian"];
        const currencyName = plugin?.settings?.currencyName || "Coins";
        const currencySymbol = plugin?.settings?.currencySymbol || "🪙";
        new Notice(`✅ Task Complete! ${xp} XP, ${cp} CP, ${currencySymbol} ${coins} ${currencyName}`, 0);
    } catch {
        new Notice(`✅ Task Complete! ${xp} XP, ${cp} CP, ${coins} Coins`, 0);
    }

    if (onQuestComplete) {
        onQuestComplete({ xp, cp, coins });
    }
}

// Mark a quest failed and add to failure debt instead of deducting current XP/coins
export async function handleFailQuestAddDebt(
    app: App,
    questTitle: string,
    vault: Vault
) {
    const questFile = app.vault.getAbstractFileByPath("GamifiedTasks.md");
    if (!(questFile instanceof TFile)) {
        new Notice("GamifiedTasks.md not found.");
        return;
    }

    const content = await vault.read(questFile);
    const lines = content.split("\n");
    const questIndex = lines.findIndex(line =>
        line.includes(questTitle) && line.includes("#gamified-task")
    );
    if (questIndex === -1) {
        new Notice(`Quest not found: ${questTitle}`);
        return;
    }

    // Add failure markers to line
    let line = lines[questIndex];
    if (!line.includes("#status/failed")) {
        line = `${line} #status/failed`;
    }
    if (!line.includes("(Failed)")) {
        line = line.replace(/(\- \[.\]\s*)([^#]+)(\s*#gamified-task)/, (_m, p1, title, p3) => `${p1}${title.trim()} (Failed)${p3}`);
    }
    lines[questIndex] = line;
    await vault.modify(questFile, lines.join("\n"));

    // Extract XP and coins for debt baseline
    const matchXP = line.match(/✨(\d+)/);
    const xp = matchXP ? parseInt(matchXP[1]) : 0;
    const matchCoins = line.match(/🪙(\d+)/);
    const coins = matchCoins ? parseInt(matchCoins[1]) : Math.round(xp * 0.1);
    const priority = (line.match(/(🔺|⏫|🔼|🔽|⏬)/)?.[1]) || '';

    // Map emoji priority to text
    const priorityPct = (() => {
        switch (priority) {
            case '⏫': return 0.3; // High
            case '🔼': return 0.2; // Medium
            case '🔽': return 0.1; // Low
            case '🔺': return 0.3; // Highest → treat as High
            case '⏬': return 0.1; // Lowest → treat as Low
            default: return 0.2; // default medium
        }
    })();

    // Read settings for percentage overrides and daily caps
    const plugin = (app as any).plugins?.plugins?.["Gamification-into-Obsidian"]; // best-effort access
    const settings = plugin?.settings ?? {};
    const pct = priority === '⏫' || priority === '🔺' ? (settings.penaltyHighPct ?? 0.3)
        : priority === '🔼' ? (settings.penaltyMediumPct ?? 0.2)
            : (settings.penaltyLowPct ?? 0.1);
    let debtXP = Math.max(0, Math.round(xp * pct));
    let debtCoins = Math.max(0, Math.round(coins * pct));

    // Enforce daily caps (tracked naively in frontmatter per day key)
    const todayKey = new Date().toISOString().slice(0, 10);
    const capXP = Number(settings.dailyDebtCapXP ?? 500);
    const capCoins = Number(settings.dailyDebtCapCoins ?? 50);

    // Write/update debt and cap trackers in PlayerData
    const playerPath = 'SkillTree/PlayerData.md';
    const { frontmatter } = await import('../../../shared/utils/progressUpdater').then(m => m.readYamlFrontmatter(vault, playerPath));
    const fm: Record<string, unknown> = frontmatter as Record<string, unknown>;
    // compute used cap today
    const usedXPKey = `debtUsedXP_${todayKey}`;
    const usedCoinsKey = `debtUsedCoins_${todayKey}`;
    const usedXP = Number((fm[usedXPKey] as number | string | undefined) ?? 0);
    const usedCoins = Number((fm[usedCoinsKey] as number | string | undefined) ?? 0);
    const roomXP = Math.max(0, capXP - usedXP);
    const roomCoins = Math.max(0, capCoins - usedCoins);
    const appliedDebtXP = Math.min(debtXP, roomXP);
    const appliedDebtCoins = Math.min(debtCoins, roomCoins);
    fm[usedXPKey] = usedXP + appliedDebtXP;
    fm[usedCoinsKey] = usedCoins + appliedDebtCoins;
    fm.failureDebtXP = Number((fm.failureDebtXP as number | string | undefined) ?? 0) + appliedDebtXP;
    fm.failureDebtCoins = Number((fm.failureDebtCoins as number | string | undefined) ?? 0) + appliedDebtCoins;
    await import('../../../shared/utils/progressUpdater').then(m => m.writeYamlFrontmatter(vault, playerPath, frontmatter));

    try {
        // @ts-ignore
        const plugin = (app as any).plugins?.plugins?.["Gamification-into-Obsidian"];
        const currencyName = plugin?.settings?.currencyName || "Coins";
        const currencySymbol = plugin?.settings?.currencySymbol || "🪙";
        new Notice(`❌ Quest failed: ${questTitle}. Debt added: ${appliedDebtXP} XP, ${currencySymbol} ${appliedDebtCoins} ${currencyName.toLowerCase()}`);
    } catch {
        new Notice(`❌ Quest failed: ${questTitle}. Debt added: ${appliedDebtXP} XP, ${appliedDebtCoins} coins`);
    }
}