# Mobile Shop + Crafting Checklist

Goal: usable Shop and Crafting on iPhone without freezing. Desktop unchanged.

**Skipped for now:** Analytics on phone.

---

## Phase A — Shop (mobile)

- [x] Add `shop` to `MOBILE_SAFE_PLAYER_TABS`
- [x] Shop tab appears in mobile ribbon when module enabled
- [x] Skip heavy shopkeeper image / typewriter on mobile
- [x] Hide admin chrome on mobile (change image / edit dialogue / debug)
- [x] Skip SystemScaffold / SystemFrame on mobile (flat shop content)
- [x] Browse categories + buy still works (unchanged purchase path)
- [x] Larger touch targets / single-column cards on narrow screens
- [x] Keep Shop mounted after first open (no remount thrash)
- [x] Fast Shop.md path lookup (no full-vault scan)
- [x] Mobile: hide shopkeeper/dialogue; paginate items; skip file/URL icons
- [ ] **Verify on phone:** open Shop, switch tabs, buy — feels seamless
- [ ] Desktop Shop unchanged

---

## Phase B — Crafting (mobile)

- [x] Add `crafting` to `MOBILE_SAFE_PLAYER_TABS`
- [x] Crafting tab appears in mobile ribbon when module enabled
- [x] Default to Materials + Recipes (craftable) first
- [x] Defer Skills / Discovery / Random templates until that sub-tab is opened
- [x] Craft button works; recipes list usable
- [x] Touch-friendly layout (`data-gamification-mobile` + existing CSS)
- [ ] **Verify on phone:** open Crafting, craft or view recipes, no freeze
- [ ] Desktop Crafting unchanged

---

## Phase C — After Shop + Crafting (later)

### Achievements (gallery lite)
- [x] Add `achievements` to `MOBILE_SAFE_PLAYER_TABS`
- [x] Mobile defaults: list view, hide locked, skip showcase / shimmer
- [x] Flat paginated list (20 + Show more)
- [x] Keep-alive mount after first open (like Shop/Crafting)
- [ ] **Verify on phone:** open Achievements, scroll, filter, open a badge detail, no freeze
- [ ] Desktop Achievements unchanged

### Skill Tree (Realm Map lite)
- [x] Unlock Skills button on Player (mobile)
- [x] Mount Skill Codex modal on phone (full-bleed)
- [x] Default to Realm Map; Canvas/Manage/Create behind Advanced
- [x] Skip canvas sync + defer stats load on mobile
- [x] Keep skills cache on reopen; Realm Map list + Show more; tap opens codex
- [ ] **Verify on phone:** open Skills, switch classes, open a skill, no freeze
- [ ] Desktop Skill Tree / canvas sync unchanged

### Inventory (Items lite + System restyle)
- [x] Unlock Items button on Player (mobile)
- [x] Full-bleed inventory modal; skip drag chrome on phone
- [x] List view + paginated rows; hide bulk / icon picker / materials chrome
- [x] Fix Filters & Sort wiring into list (category / rarity / equipped / sort)
- [x] Solo Leveling shell: `SYSTEM: INVENTORY` header, cyan system chrome
- [x] Bottom-sheet item detail with sticky Use / Equip / Sell / Drop
- [ ] **Verify on phone:** open Items, sort/filter, open item sheet, use or sell
- [ ] Desktop Inventory unchanged

- [x] Heavy penalty / coaching cards on phone (Recovery lite + coaching bottom sheet)
- [ ] **Verify on phone:** Player → Recovery strip expands; Coaching sheet; forgiveness when available; no freeze
- [ ] Desktop Penalty & Recovery Hub unchanged

- [x] Capture inbox + week/month calendar on mobile Quests (`MobileQuestDayPicker` + day sheet)
- [ ] **Verify on phone:** Week/Month toggle; tap day → full-screen day list + ✕; Done / open quest; Use day plan; Add quest with due date
- [ ] Desktop month calendar + drag unchanged

- [ ] ~~Analytics on phone~~ — **skipped for now**

---

## After each Mac change

```bash
npm run build:sync
```

Then on iPhone: wait for iCloud → force-quit Obsidian → disable → re-enable plugin.
