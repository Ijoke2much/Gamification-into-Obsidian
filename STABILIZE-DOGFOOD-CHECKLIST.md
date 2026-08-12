# Stabilize → Dogfood → BRAT

Use this after landing WIP on `cursor/game-data-hub`. Work top to bottom; don’t skip ahead.

---

## Phase A — Stabilize (Mac / Agent) — IN PROGRESS

- [x] Review diff: keep plugin code + checklists; skip `focus-checkin-state.json`
- [ ] Commit on `cursor/game-data-hub` (quests Now pin, week days, capture CSS, skill chips, skill load fix, shop/craft/player shell, materials, etc.)
- [ ] `npm run build:sync` — settings show **v1.0.0** on phone after sync
- [ ] Push branch to origin (optional but good before dogfood)
- [ ] Note follow-ups that shouldn’t block stabilize

---

## Phase B — Finishing touches (only if broken after A)

- [ ] Quest create on mobile: skill dropdown loads (not stuck on "Loading skills...")
- [ ] Skill Codex Create: can tap stats chips
- [ ] Inbox: drag Today → Now sticks; empty Now accepts drop
- [ ] Week calendar: quick press opens that day’s plan
- [ ] Capture action buttons readable (Today / Promote / ✕)
- [ ] Inventory: one close control; Use item applies energy
- [ ] Workshop: no ghost `// Moon Tea` recipe

---

## Phase C — Phone blitz (§6 · test vault only)

Reload: wait iCloud → force-quit Obsidian → disable→enable plugin → confirm **v1.0.0**.

- [ ] Tabs tappable (not under Dynamic Island)
- [ ] Player → Quests → Shop → Crafting: no multi-second freeze
- [ ] Player scroll + energy batteries OK
- [ ] Quests Today’s Run: strip + next-up + complete 1 quest (toast)
- [ ] Habits: complete 1
- [ ] Check-in when due (or N/A)
- [ ] Shop: browse + buy
- [ ] Crafting: craft Energy Bar / Draught
- [ ] Inventory: Use crafted item → energy toast; one close
- [ ] Achievements: scroll + open badge
- [ ] Skills Realm Map: open one skill (+ Create skill/stat if you use it)

**Gate:** if tabs / freeze / craft / inventory fail → stay on lab vault; fix before dogfood.

Also see: `REAL-VAULT-DOGFOOD.md` Phase 0, `FINISH-UP-CHECKLIST.md` §6.

---

## Phase D — Dogfood (§7 · real vault · after C mostly green)

- [ ] Keep lab vault `Gamified-test-0-plugin` for experiments
- [ ] Backup PlayerData / Inventory / Recipes / Materials if they exist
- [ ] Install: `GAMIFICATION_VAULT_NAME='YourVault' npm run publish:icloud`
- [ ] Enable plugin in that vault; balanced onboarding OK
- [ ] 15‑min smoke: Player → Quests → craft → Use → Inventory close
- [ ] Use daily for ~1 week before inviting others / BRAT

---

## Phase E — BRAT (later · not now)

- [ ] Tag beta (e.g. `1.0.0-beta.1`) matching `manifest.json`
- [ ] GitHub Release with `manifest.json`, `main.js`, `styles.css`, `assets/`
- [ ] Test BRAT install yourself once before sharing

---

## Suggested cadence

1. Finish **A** today  
2. Quick smoke of **B** on phone (10 min)  
3. Full **C** when you have ~15 focused minutes  
4. **D** only when C feels boring  
5. **E** after a week of D  

*Created for stabilize pass — Aug 2026*
