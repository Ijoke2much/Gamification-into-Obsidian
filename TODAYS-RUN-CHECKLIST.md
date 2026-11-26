# Today's Run — Mobile Roadmap Checklist

Goal: daily ADHD-friendly game loop — see today, check off quests/habits, timeblock, check-in, feel like a game.

**Constraint:** Mobile changes must not break desktop Quests (desktop left as-is).

---

## Phase 1 — Today's Run MVP

*Shipped. Re-verify on phone after each release.*

### Check-in
- [x] Focus check-in button visible on mobile when due (Player shell)
- [x] Check-in CTA inside Quests Today's Run strip (mobile only)
- [x] Mobile due polling enabled (lighter interval than desktop)
- [ ] **Verify on phone:** check-in opens, snooze/skip/complete work

### Today's Run strip (Quests)
- [x] Date + "Today's Run" header
- [x] Quest count (now + today)
- [x] Habit remaining / due counts
- [x] "Next up" quest (earliest timed, else first today)
- [x] "Now" jumps to current time on timeline
- [x] Strip gated to **mobile only** (desktop Quests unchanged)
- [ ] **Verify on phone:** strip loads, next-up opens quest, counts look right

### Defaults & layout
- [x] First mobile open defaults to Quests tab (when no saved tab)
- [x] Calendar / Capture deferred or hidden on mobile first paint
- [ ] **Verify on phone:** open → land on Quests

### Game feedback
- [x] Quest complete notice: `✅ QUEST COMPLETE! +XP · +CP · coins`
- [x] Habit complete notice: same style toast
- [ ] **Verify on phone:** complete a quest + habit, see toasts

### Smoke test
- [ ] Player / Quests / Habits open without freeze/crash
- [ ] Scroll Player tab; energy batteries OK
- [ ] Complete 1 quest from inbox or next-up
- [ ] Complete 1 habit
- [ ] Check-in when due

---

## Phase 2 — Quests usable + timeblock (COMPLETE in code)

*Implemented Jul 2026. Desktop Quests path preserved via `isMobile` gates.*

### 2.0 Unfreeze / restore desktop
- [x] Today strip + habit preload + Quests check-in → **mobile only**
- [x] Desktop Quests: no Today strip, full capture + calendar as before
- [x] CeremonyHost skipped on mobile Quests mount

### 2.1 Progressive boot
- [x] Load quests first, then energy; defer captures on mobile
- [x] Defer `getAllSkills` on mobile until Projects hub or quest modal
- [x] Defer habit count scan (~350ms after open)
- [x] Mobile loading line while quests fetch

### 2.2 Lazy day plan
- [x] Day timeline collapsed by default on mobile (`Show plan`)
- [x] Skip timeline block layout work until expanded
- [x] Expand + Now scrolls to current hour

### 2.3 Today-only + timeline UX
- [x] **Today only** chip (default on for mobile) — Now / Today / Overdue
- [x] Hide Unscheduled / Abandon when Today only
- [x] Hide tag/priority/difficulty filter row on mobile
- [x] Larger mobile timeline blocks / action hit targets
- [x] Disable drag-and-drop on mobile inbox rows

### 2.4 Energy filter
- [x] **⚡ Fits energy** chip — hide quests costing more than current energy
- [x] Desktop ignores energy/today chips

### Phase 2 verify on phone
- [ ] Quests opens without freeze
- [ ] Today's Run strip + Next up work
- [ ] Today only / Fits energy toggles work
- [ ] Show plan expands timeline; Now jumps
- [ ] Desktop Quests still looks/behaves as before

### Phase 2.5 — Schedule workflow + system buttons (COMPLETE in code)

*Fixes empty Quests after brain dump / untimed edits. Desktop unchanged.*

- [x] **Today** filter still keeps **To schedule** (unscheduled) visible
- [x] Unscheduled renamed **To schedule** on mobile; always shown
- [x] Lite **Brain dumps** strip on mobile (→ Today / Edit / dismiss)
- [x] Brain Dump refreshes + expands the strip
- [x] Solo Leveling system buttons: `[ + ADD QUEST ]`, `[ BRAIN DUMP ]`, filter chips
- [ ] **Verify on phone:** dump → appears in Brain dumps → → Today or Edit → shows in list
- [ ] **Verify on phone:** buttons look sharp cyan / bracket style
- [ ] Desktop Quests still OK

---

## Phase 3 — ADHD + gamification depth (COMPLETE in code)

*Implemented Jul 2026. Desktop Quests/Habits paths preserved where gated.*

- [x] Habits: **Due today** section pinned at top (Quick Check renamed; mobile hero styling)
- [x] Daily habit clear bonus (+40 coins once/day when all due habits done)
- [x] Daily quest clear bonus (+50 coins once/day when Now+Today inbox cleared)
- [x] Timeline snooze **+15m / +1h** + **+1d** (keeps time) on mobile
- [x] **[ FOCUS ]** on Today's Run + ⏱ on timeline → Pomodoro with quest attached
- [x] Pomodoro enabled on mobile safe tabs; mounts when selected
- [ ] **Verify on phone:** Due today check-off; clear bonus toast
- [ ] **Verify on phone:** snooze moves block; Focus opens Pomodoro
- [ ] Desktop still OK

---

## Phase 4 — Full game feel (COMPLETE in code)

*Mobile-gated. Desktop ceremonies / full achievement toast / expanded buffs unchanged.*

- [x] Lite CeremonyHost on mobile (level-up modal; rank → notice)
- [x] Achievement unlock toasts on mobile (no confetti, shorter)
- [x] Daily activity streak on Player ("N days in a row")
- [x] Buffs / Artifacts on mobile — collapsed by default, after heavy-ready
- [x] Penalty / Recovery lite on mobile (Phase C — collapsed strip + coaching sheet)
- [ ] **Verify on phone:** level-up modal; achievement toast; streak line
- [ ] **Verify on phone:** Buffs/Artifacts expand without freeze
- [ ] **Verify on phone:** Recovery strip + Coaching sheet
- [ ] Desktop still OK

---

## Next: Mobile Shop + Crafting

See **`MOBILE-SHOP-CRAFTING-CHECKLIST.md`** (Analytics skipped for now).

## Explicitly later / desktop-first

- [x] Achievements tab on phone (gallery lite — see `MOBILE-SHOP-CRAFTING-CHECKLIST.md` Phase C; phone verify still open)
- [x] Skill Tree on phone (Realm Map lite — see Phase C; phone verify still open)
- [x] Inventory on phone (Items lite — see Phase C; phone verify still open)
- [x] Heavy penalty / coaching cards on phone (Recovery lite + coaching sheet; phone verify still open)
- [x] Capture inbox + week/month calendar on mobile Quests (`MobileQuestDayPicker` + day sheet; phone verify still open)
- [ ] Analytics on phone (deferred)

---

## After each Mac change

```bash
npm run build:sync
```

Then on iPhone: wait for iCloud → force-quit Obsidian → disable → re-enable plugin → Open Player tab.
