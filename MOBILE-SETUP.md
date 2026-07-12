# Gamification Mobile Companion

Lightweight Obsidian plugin for **phone and tablet**. Works alongside the full desktop plugin without removing any desktop features.

## Why two plugins?

The desktop plugin bundles a large React app (~12 MB). Obsidian Mobile often hangs on **"Loading plugins…"** when parsing that bundle. The companion plugin is small (~tens of KB) and only loads on mobile.

| Plugin | Folder | Loads on |
|--------|--------|----------|
| **Gamified Obsidian Plugin** | `Gamification-into-Obsidian` | Desktop only (`isDesktopOnly: true`) |
| **Gamified Obsidian (Mobile)** | `Gamification-Mobile` | Mobile + desktop* |

\*On desktop, you can disable the mobile plugin in settings if you only want the full UI.

## Install (synced vault)

### 1. Build both plugins

From this repo:

```bash
npm run build          # desktop plugin (unchanged features)
npm run build:mobile   # outputs to ../Gamification-Mobile/
```

### 2. Enable in Obsidian Mobile

1. **Settings → Community plugins**
2. Enable **Gamified Obsidian (Mobile)**
3. Leave **Gamified Obsidian Plugin** disabled on mobile (it is skipped automatically on mobile because it is desktop-only)

### 3. Open the Player tab

Any of these work:

- Tap the **🎮 Player** pill button (bottom-right, above Obsidian's toolbar)
- Open the **ribbon** (left sidebar tools) → **dice** icon → **Open Player**
- Command palette → **Open Player tab**

## Mobile MVP features

- **Player tab** with bottom navigation: Player · Quests · Calendar · Habits · Skills
- **Player snapshot** — player level, rank, XP/CP, coins, energy bar
- **Master class progress** — level + CP bar from `SkillTree/Master-Class/` notes (separate from player level)
- **Quest inbox** with ADHD-style filters: All · Good fit · Low energy
- **Quest completion** — checkbox, XP/coins/CP, energy cost, skill/stat CP distribution
- **Calendar** — month grid, tap a day to see due quests
- **Habits** — one-tap complete for today from `SkillTree/Habits/`
- **Skills** — list of skills with level and CP progress

## Shared data (same vault)

Both plugins use the same vault files:

- `SkillTree/PlayerData.md`
- `GamifiedTasks.md` (or your `defaultQuestFilePath` from desktop settings)

The mobile plugin reads desktop plugin settings from:

`.obsidian/plugins/Gamification-into-Obsidian/data.json`

Configure paths and XP/coin defaults on desktop once; mobile picks them up automatically.

## Development

```bash
npm run build:mobile
```

Source lives in `mobile/src/`. Output is written to:

```
../Gamification-Mobile/
  main.js
  manifest.json
  styles.css
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Stuck on "Loading plugins…" | Disable desktop gamification plugin on mobile; use only **Gamification-Mobile** |
| No quests shown | Ensure quest file exists and tasks include `#gamified-task` |
| No player data | Create/open vault with `SkillTree/PlayerData.md` from desktop plugin first |
| Wrong quest file path | Open desktop plugin settings and set default quest file; sync vault |

## Roadmap

- Habits one-tap completion
- Simple energy HUD
- Quick capture
- Pomodoro timer
