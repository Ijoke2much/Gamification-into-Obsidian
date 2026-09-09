# Gamified Obsidian

Turn notes into quests, focus into fights, and practice into a skill tree. Vault-native: progress lives in markdown (`SkillTree/PlayerData.md`, quest notes), not a hidden database.

**Version:** `1.0.0-beta.3` (beta)

## Install

### BRAT (recommended for a second vault)

This is how phones and a clean vault should get the plugin. BRAT only installs **three files** from a GitHub Release: `manifest.json`, `main.js`, `styles.css`. Sprites are inlined in `main.js`.

1. Install [BRAT](https://github.com/TfTHacker/obsidian42-brat).
2. Community plugins → BRAT → **Add beta plugin** → `https://github.com/Ijoke2much/Gamification-into-Obsidian`
3. Pick the latest release (prerelease is fine).
4. Enable **Gamified Obsidian** and reload if the version in Settings does not match the release.

**Check for updates** in BRAT after each new GitHub Release. Do not point BRAT at this git folder.

### This git folder (dev vault only)

If the plugin folder is already the clone (`…/.obsidian/plugins/Gamification-into-Obsidian`):

```
npm install
npm run build
```

Then reload Obsidian. Do **not** BRAT-update this folder — you would overwrite local work.

## First open

1. Enable the plugin. Choose **Balanced** unless you want Lite (quests + focus only) or Hardcore (penalties on).
2. Open the **Player** tab (ribbon dice, or command **Open Player**).
3. Open **Quests**. Capture or add a quest, complete it. XP/CP/coins land on `PlayerData.md`.
4. **Journey** wears down foes; **Dungeon** starts the boss fight. Projects are contracts, not a second combat game.

New vaults default to the **Clay** look and quieter notices. Vaults that already had a theme stay on **Classic** until you change Appearance.

## Themes

Settings → Appearance:

- **Clay** — cream cards, matte teal (default for new vaults)
- **Classic** — original pixel board
- **System Hunter** — Solo Leveling-style chrome (focus combat stays pixel)

## Daily loop

| You | The game |
| --- | --- |
| Tasks | Quests on the hub board |
| Deep work | Pomodoro / focus encounter |
| Big projects | Contracts → Journey → Dungeon |
| Practice | Skill Realm Map |
| Treats | Shop / inventory |

## Files

Typical vault paths (created on first use):

- `SkillTree/PlayerData.md`
- `SkillTree/Master-Class/` (starter Hunter + Focus if empty)
- Quest notes or `GamifiedTasks.md`
- `Capture.md` for brain dumps

## Maintainers: cut a BRAT release

1. `npm run build` (and `npm run test:persistence` if you touched saves).
2. Commit. Tag the version in `manifest.json` (example: `git tag 1.0.0-beta.3`).
3. `git push origin HEAD && git push origin 1.0.0-beta.3`
4. The **Release plugin** workflow publishes the three files. BRAT users then Check for updates.
