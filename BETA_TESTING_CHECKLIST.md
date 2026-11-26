# 🧪 Beta Testing Checklist

## Pre-Testing Setup

### For Testers
- [ ] Install Obsidian (Desktop or Mobile)
- [ ] Enable Community Plugins
- [ ] Download plugin files
- [ ] Create `SkillTree` folder in vault root
- [ ] Read `SETUP_INSTRUCTIONS.md`

---

## Phase 1: Basic Setup (15 minutes)

### Player Setup
- [ ] Plugin loads without errors
- [ ] Player tab opens successfully
- [ ] PlayerData.md is created automatically
- [ ] Character customization works (name, avatar)
- [ ] Stats display correctly
- [ ] Level/XP/Coins display

**Expected Result:** See your character with Level 1, 0 XP, 100 Coins

---

## Phase 2: Quest System (30 minutes)

### Creating Quests
- [ ] Open Quest tab
- [ ] Click "New Quest" button
- [ ] Fill in quest details:
  - [ ] Title
  - [ ] Description
  - [ ] Difficulty (easy/medium/hard)
  - [ ] XP reward
  - [ ] Due date and time
  - [ ] Skills
- [ ] Save quest
- [ ] Quest appears in quest list

### Quest Views
- [ ] Switch to Card view - quest displays properly
- [ ] Switch to Timeline view - quest shows at correct time
- [ ] Switch to Calendar view - quest appears on correct day
- [ ] All quest metadata visible (XP, difficulty, skills, etc.)

### Completing Quests
- [ ] Click complete button on quest
- [ ] XP increases
- [ ] Coins increase
- [ ] Level up notification (if enough XP)
- [ ] Quest moves to completed section

**Expected Result:** Gain rewards, see progress

---

## Phase 3: Boss Battles (20 minutes)

### Creating a Boss
- [ ] Open Boss tab
- [ ] Create new boss from quest
- [ ] Boss displays with HP bar
- [ ] Boss stats show correctly

### Fighting Boss
- [ ] Select battle moves
- [ ] Deal damage to boss
- [ ] Boss HP decreases
- [ ] Complete quest subtasks to damage boss
- [ ] Defeat boss
- [ ] Receive boss rewards

**Expected Result:** Epic battle experience, extra rewards

---

## Phase 4: Skill Tree (15 minutes)

### Viewing Skills
- [ ] Open Skill Tree button (🌳)
- [ ] Skill tree modal opens
- [ ] View skills by class
- [ ] See skill levels and progress

### Creating Skills
- [ ] Click "Create New" tab
- [ ] Create new skill
- [ ] Assign to class
- [ ] Skill appears in tree

**Expected Result:** Skill tree displays and grows

---

## Phase 5: Inventory System (15 minutes)

### Viewing Inventory
- [ ] Click Inventory button (🎒)
- [ ] Inventory modal opens
- [ ] Materials tab works
- [ ] Equipment tab works

### Using Items
- [ ] Complete quest to get materials
- [ ] Materials appear in inventory
- [ ] Craft equipment (if materials available)
- [ ] Equip items
- [ ] Stats increase from equipment

**Expected Result:** Collect and use items

---

## Phase 6: Analytics (10 minutes)

### Viewing Analytics
- [ ] Open Analytics tab
- [ ] View Simple dashboard
- [ ] View Real-Time dashboard
- [ ] Check productivity score
- [ ] View skill progress
- [ ] See recent activity

**Expected Result:** Clear overview of progress

---

## Phase 7: Pomodoro Integration (15 minutes)

### Using Pomodoro
- [ ] Open Pomodoro tab
- [ ] Start focus session
- [ ] Attach quest to session
- [ ] Complete session
- [ ] Receive rewards
- [ ] Quest progress updates

**Expected Result:** Focused work rewarded

---

## Phase 8: Mobile Testing (Desktop users skip)

### Mobile-Specific Tests
- [ ] Plugin loads on mobile
- [ ] Touch controls work
- [ ] Floating action button appears
- [ ] Quests display correctly
- [ ] Can complete quests
- [ ] Data syncs between devices

**Expected Result:** Smooth mobile experience

---

## Phase 9: Data Persistence (Critical!)

### Test Save/Load
- [ ] Complete several quests
- [ ] Note your Level, XP, Coins
- [ ] Close Obsidian completely
- [ ] Reopen Obsidian
- [ ] Check Level, XP, Coins match
- [ ] Completed quests still completed
- [ ] Inventory items persist

**Expected Result:** NO data loss

---

## Phase 10: Performance (5 minutes)

### Speed Tests
- [ ] Quest tab loads in < 1 second
- [ ] Switching views is smooth
- [ ] No lag when completing quests
- [ ] Boss battles animate smoothly
- [ ] No freezing or crashing

**Expected Result:** Responsive, no lag

---

## Common Issues to Report

### Critical (Stop Testing)
- [ ] Plugin fails to load
- [ ] Data loss on reload
- [ ] Crashes Obsidian
- [ ] Cannot create quests

### High Priority
- [ ] Quests don't appear in views
- [ ] Rewards not granted
- [ ] Boss battles broken
- [ ] Mobile completely unusable

### Medium Priority
- [ ] UI elements misaligned
- [ ] Some features slow
- [ ] Confusing workflows
- [ ] Missing features

### Low Priority
- [ ] Typos
- [ ] Style inconsistencies
- [ ] Minor bugs
- [ ] Feature requests

---

## Feedback Form

After testing, please provide:

1. **Overall Experience (1-10):** _____
2. **Easiest Feature:** _____
3. **Hardest Feature:** _____
4. **Most Fun Feature:** _____
5. **Least Clear Feature:** _____
6. **Bugs Encountered:** _____
7. **Suggestions:** _____

---

## Test Scenarios

### Scenario 1: Daily Routine
```
Goal: Set up and complete a morning routine

1. Create quest: "Morning Workout"
   - Due: Tomorrow at 7:00 AM
   - Duration: 30m
   - Difficulty: Medium
   - XP: 100

2. Add subtasks:
   - [ ] Warm up (5 min)
   - [ ] Exercise (20 min)
   - [ ] Cool down (5 min)

3. Next day: Complete each subtask
4. Mark quest complete
5. Check rewards received

Expected: 100 XP, coins, satisfaction
```

### Scenario 2: Project Boss Battle
```
Goal: Turn a big project into an epic boss

1. Create quest: "Build Personal Website"
   - Duration: 5 days
   - Difficulty: Hard
   - Multiple subtasks

2. Convert to boss battle
3. Work on project each day
4. Complete subtasks = damage boss
5. Defeat boss on final day

Expected: Epic battle, extra rewards
```

### Scenario 3: Skill Mastery
```
Goal: Level up a skill through quests

1. Create skill: "Programming"
2. Create 3 quests with Programming skill
3. Complete all 3 quests
4. Check skill progress in Skill Tree
5. See CP increase

Expected: Skill level increases
```

---

## Success Criteria

✅ **Ready for Release** if:
- All Phase 1-5 tests pass
- No critical bugs
- Data persists correctly
- Performance acceptable
- At least 7/10 user satisfaction

⚠️ **Needs Work** if:
- Any Phase 1-5 fails
- Critical bugs found
- Data loss occurs
- Major features broken
- User satisfaction < 5/10

❌ **Not Ready** if:
- Plugin won't load
- Data loss guaranteed
- Crashes frequently
- Core features don't work
- User satisfaction < 3/10

---

## Report Format

When reporting issues:

```markdown
**Issue:** Quest doesn't appear in Timeline
**Severity:** High
**Steps to Reproduce:**
1. Create quest with due date
2. Switch to Timeline view
3. Quest not visible

**Expected:** Quest should appear at scheduled time
**Actual:** Empty timeline
**Screenshots:** [attach]
**Console Errors:** [paste from F12]
```

---

## Thank You! 🎉

Your testing helps make this plugin better for everyone. Report issues on GitHub or directly to the developer.

**Quick Links:**
- Setup Instructions: `SETUP_INSTRUCTIONS.md`
- User Guide: `USER_GUIDE.md`
- Known Issues: `KNOWN_ISSUES.md`
- Troubleshooting: `TROUBLESHOOTING.md`

