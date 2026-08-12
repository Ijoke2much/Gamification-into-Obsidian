# Finish-up checklist

Dogfood / pre-real-vault wrap-up. Check items as you verify on device.

---

## 1. Mobile safe-area (top tabs) — DONE in code

- [x] Push Player / Shop / Check-in / settings below Dynamic Island / status bar
- [x] Sticky tab ribbon so content doesn’t cover taps while scrolling
- [x] Fix: safe-area lives in **imported** `tab-system-shell.css` (not dead `styles.css`) with `!important` + 59px floor
- [x] Pad Obsidian leaf `.view-content` / `.gamification-player-view-root` as well as the React shell
- [ ] **Verify on iPhone 14 Pro Max:** tabs fully tappable; not under the black pill
- [ ] **Verify after disable→re-enable:** reload still keeps tabs below the island
- [ ] **Verify:** no huge empty gap on non-notch phones / iPad if you use them

---

## 1b. Mobile lag / freeze — DONE in code

- [x] Remove sticky tab `backdrop-filter` blur (iOS compositor killer)
- [x] Unmount Shop / Crafting / Achievements when leaving on mobile (no keep-alive pile-up)
- [x] Defer Player Energy / Buffs / Penalty / Artifacts until idle (~800ms) on Player tab only
- [x] Path-first + cached resolve for Recipes / Materials / Inventory / ShopTemplates
- [x] Inject mobile animation-nuke stylesheet once (not per hook caller)
- [ ] **Verify on phone:** open Player → Quests → Shop → Crafting without multi-second freeze
- [ ] **Verify:** scroll Player STATUS feels smooth

---

## 2. Materials economy (fair drops → craft sinks) — DONE in code

- [x] Drop chance config (`materialEconomyConfig.ts`)
- [x] Main quest path grants mats via `awardQuestRewards` (chance by difficulty)
- [x] Pomodoro grants chance-based; ultra-rares no longer guaranteed in the base pool
- [x] Quality roll biased toward intended quality
- [ ] **Verify:** complete a quest → sometimes see `📦 Materials: …`
- [ ] **Verify:** craft Energy Bar / Draught still affordable after a normal day
- [ ] **Verify:** long pomos don’t flood diamond/phoenix every time

---

## 3. Solo Leveling chrome pass

- [ ] Shop tab matches Inventory / Workshop system language
- [ ] Player STATUS cards already SL — spot-check consistency on phone
- [ ] Achievements lite: same cyan/system feel, not leftover pixel chrome
- [ ] Toast / notices use system style when shell is system-hunter

---

## 4. Game Data Hub / creator UX

- [x] Add Recipe lives in Settings → Game Data Hub (not Workshop footer)
- [x] Add Recipe fluff removed (skill / time / station)
- [x] Effect presets write machine lines
- [x] SYSTEM : DATA HUB shell (header, text tabs, row cards, footer)
- [x] Recipes / Materials / Shop / Bosses as system rows (not plain settings tables)
- [x] Add Material modal trimmed (no quality/source fluff)
- [ ] **Verify:** open Settings → Game Data Hub — matches Inventory/Workshop language
- [ ] **Verify:** add a recipe in Hub → appears in Workshop as CUSTOM → craft works
- [ ] **Verify:** add a material → shows in Hub + Workshop materials strip

---

## 5. Crafting / inventory payoff

- [x] Ghost `// Moon Tea` parser fix
- [x] Craft writes `// effect:` lines; Use applies `energy:+N` / buffs
- [x] Inventory single close hardened (System ✕ only)
- [ ] **Live:** Craft Energy Bar → Inventory → Use → `⚡ +15 Energy` (+ buff if present)
- [ ] **Live:** Inventory has one close button (no Obsidian frame X)
- [ ] **Live:** Workshop has no ghost Moon Tea with `//` in the name

---

## 6. Mobile verify blitz (from existing checklists)

Pull from `MOBILE-SHOP-CRAFTING-CHECKLIST.md` + `TODAYS-RUN-CHECKLIST.md`:

- [ ] Shop: browse + buy, no freeze
- [ ] Crafting: open + craft, no freeze
- [ ] Achievements: scroll / open badge
- [ ] Skills Realm Map: open codex skill
- [ ] Inventory Items: filter, Use / Sell
- [ ] Quests Today’s Run: strip, next-up, complete 1 quest
- [ ] Habits: complete 1
- [ ] Check-in when due
- [ ] Player scroll + energy batteries OK

---

## 7. Real-vault dogfood readiness

See **`REAL-VAULT-DOGFOOD.md`** for the full walk (phone blitz → pick vault → install).

- [ ] Keep lab vault (`Gamified-test-0-plugin`) for experiments
- [ ] Phone verify blitz (REAL-VAULT-DOGFOOD Phase 0) mostly green
- [ ] Install built plugin into personal vault (`GAMIFICATION_VAULT_NAME=… npm run publish:icloud`)
- [ ] Backup `PlayerData` / `Inventory.md` / `Recipes.md` before first week
- [ ] 15‑min smoke on personal vault: Player → Quests → craft → Use → Inventory close
- [ ] One week daily use before inviting others

---

## Suggested order when you come back

1. Phone verify **§1** (tabs) + **§5** (payoff / close / no ghost recipe)  
2. Phone verify **§2** materials feel  
3. Then **§3** chrome or **§6** mobile blitz — whichever frustrates you more in daily use  
4. **§7** when the above feels boring  

---

*Last updated: mobile safe-area + materials economy pass*
