# Real-vault dogfood — install + phone verify

Personal daily-use install. Keep **`Gamified-test-0-plugin`** as the lab vault for experiments.

**Status right now (Mac):** production build `v1.0.0` published to iCloud test vault  
(`main.js` / `main.css` / `assets/` synced ~this session).

---

## Phase 0 — Phone verify blitz (do this first)

Use the **test vault** on iPhone so you don’t risk PersonalOS yet.

### 0A. Reload plugin on phone

1. Wait 1–3 min for iCloud (or pull down in Files → iCloud Drive → Obsidian).
2. Force-quit Obsidian.
3. Reopen → open **Gamified-test-0-plugin**.
4. Settings → Community plugins → **Gamification** → disable → enable.
5. Confirm settings show **v1.0.0**.
6. Command palette → **Open Player tab**.

### 0B. Critical path (~10 min) — check as you go

| # | Check | Pass? |
|---|--------|-------|
| 1 | Top tabs (Player / Quests / …) fully tappable — **not under Dynamic Island** | [ ] |
| 2 | After disable→re-enable, tabs still clear of the island | [ ] |
| 3 | Open Player → Quests → Shop → Crafting **without multi-second freeze** | [ ] |
| 4 | Scroll Player STATUS; energy batteries OK | [ ] |
| 5 | Quests: Today's Run strip loads; Next up opens a quest | [ ] |
| 6 | Complete **1 quest** — toast with XP/CP/coins | [ ] |
| 7 | Complete **1 habit** (Due today if shown) | [ ] |
| 8 | Check-in when due (or note N/A) | [ ] |
| 9 | Shop: browse + buy one cheap item | [ ] |
| 10 | Crafting: open recipes; craft **Energy Bar** (or Draught) | [ ] |
| 11 | Inventory → **Use** crafted item → `⚡ +N Energy` | [ ] |
| 12 | Inventory has **one** close control (System ✕ only) | [ ] |
| 13 | Workshop has **no** ghost `// Moon Tea` | [ ] |
| 14 | Achievements: open, scroll, open one badge | [ ] |
| 15 | Skills (Realm Map): open one skill codex | [ ] |

**If 1–4 or 10–12 fail:** stay on test vault; report what broke before installing elsewhere.  
**If mostly green:** go to Phase 1.

---

## Phase 1 — Pick a real vault

| Vault | Path (iCloud) | Notes |
|-------|----------------|-------|
| **PersonalOS-Vault** | `…/Documents/PersonalOS-Vault` | Likely “real life” OS vault — install only when Phase 0 feels boring |
| **learning zone** | `…/Documents/learning zone` | Lighter alternate; also fine for dogfood |
| Lab (keep) | `Gamified-test-0-plugin` | Experiments + Cursor builds only |

Tell the agent which vault name to use, then on Mac:

```bash
# From plugin repo root — copies built artifacts into that iCloud vault
GAMIFICATION_VAULT_NAME='PersonalOS-Vault' npm run publish:icloud
# or:
GAMIFICATION_VAULT_NAME='learning zone' npm run publish:icloud
```

### After copy — enable in Obsidian (desktop)

1. Open the target vault.
2. Settings → Community plugins → turn **Restricted mode** off if needed.
3. Enable **Gamified Obsidian Plugin** (`Gamification-into-Obsidian`).
   - If it doesn’t appear: Settings → Community plugins → folder icon / reload, or confirm files exist under `.obsidian/plugins/Gamification-into-Obsidian/`.
4. Run onboarding / set gameplay profile (**balanced** is fine).
5. Confirm folders (defaults under `SkillTree/`, plus quests / inventory paths in settings).

### First-week safety

- [ ] Backup (copy aside) any existing `SkillTree/PlayerData.md`, `Inventory.md`, `Recipes.md`, `Materials.md` if present
- [ ] Don’t delete the lab vault
- [ ] Only enable **one** gamification plugin (don’t also run `Gamification-Mobile` unless you know why)

---

## Phase 2 — 15‑min smoke on the real vault

Desktop first, then phone if that vault syncs to iPhone.

- [ ] Open Player tab
- [ ] Add or complete 1 quest
- [ ] Craft → Inventory Use → energy moves
- [ ] Inventory closes with one ✕
- [ ] Settings → Game Data Hub opens; looks usable
- [ ] Phone: Open Player tab + tab switch without freeze

Then use it daily for **one week** before inviting anyone else.

---

## Mac rebuild reminder

```bash
npm run build:sync          # lab iCloud vault (default)
# or after choosing a real vault:
GAMIFICATION_VAULT_NAME='PersonalOS-Vault' npm run build
GAMIFICATION_VAULT_NAME='PersonalOS-Vault' npm run publish:icloud
```

Phone after every change: wait sync → force-quit → disable → re-enable → **Open Player tab**.

---

## Feedback shorthand (paste back to agent)

```
Vault: test | PersonalOS | learning zone
Device: iPhone 14 Pro Max | desktop
Failed #: …
What I saw: …
```
