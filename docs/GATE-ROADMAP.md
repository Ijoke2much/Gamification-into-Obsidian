# Gate & Dungeon Roadmap

Track progress on the file-backed gate raid loop. Check items off as you ship them.

## Core loop (done)

- [x] Journey clears unlock the dungeon gate
- [x] Gate boss roster + picker (`Bosses/` notes)
- [x] Workspace fight (`TacticalBattleUI` — HP + armor, moves + strikes)
- [x] Gate spoils on victory (XP, CP, coins, materials)
- [x] Dungeon seals until next board cycle
- [x] Debug strike tasks (reset each gate entry)
- [x] Vault quest strikes + undo on uncomplete
- [x] Roster shows difficulty + skill/affinity
- [x] Gate Battle workspace cleanup (legacy tabs removed)

## In progress / next

- [x] **1. Return-to-battle banner** — Dungeon sidebar shows active raid, resume fight, or claim spoils
- [x] **2. System Hunter theme polish** — Gate/journey hub respects `system-hunter` preset tokens
- [x] **3. Boss note management** — Edit bosses from Game Data Hub + roster; open vault notes

## Backlog

- [x] **4. Retire legacy Boss Selection** — Gate Battle workspace is raid-only (hide old quest-linked bosses)
- [x] **5. Distribute gate CP to skills** — Route gate CP through skill/class tags like quest completion
- [x] **6. Boss attack pressure** — Raid-only focus meter + boss strike timer in gate battles (does not drain vault energy)
- [x] **7. Boss rename / move** — Safe rename of boss notes without breaking raids
- [x] **8. Mid-cycle dungeon reset debug** — Clear `dungeonClearedForCycle` from settings (not only debug panel)

## Quick test after changes

1. Unlock dungeon → pick boss → **Enter gate** → fight → **Continue — claim gate spoils**
2. Leave mid-fight → Dungeon shows **Return to battle**
3. Settings → Appearance → **System Hunter** → check gate roster + journey hub colors
4. Settings → Game Data Hub → **Bosses** tab → edit a boss → roster updates
5. Open **Gate Battle** workspace with no raid → idle hub (no legacy boss grid)
6. **Open Dungeon sidebar** from idle hub → Quest sidebar switches to Dungeon
