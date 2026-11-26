# 🐛 Timeline View Debug Guide

## Not Seeing Quest Cards?

### 1. Check Browser Console
Open Obsidian Dev Tools (`Ctrl/Cmd + Shift + I`) and look for:
```
[Timeline] Total quests received: X
[Timeline] View mode: day
[Timeline] Target date: 2025-09-30T...
[Timeline] calculateDayData for: 2025-09-30
[Timeline] All quests: [...]
[Timeline] Filtered dayQuests: X
[Timeline] Unscheduled quests: X
```

### 2. Quest Format Requirements

For quests to appear in timeline, they need:

#### Option A: Date with Time (Shows in Hourly Timeline)
```markdown
- [ ] My Task #gamified-task 📅2025-09-30T14:30
```
Format: `YYYY-MM-DDTHH:MM`

#### Option B: Date Only (Shows in All-Day Section)  
```markdown
- [ ] My Task #gamified-task 📅2025-09-30
```
Format: `YYYY-MM-DD`

#### Option C: Today Flag (Shows in All-Day Section)
```markdown
- [ ] My Task #gamified-task {today: true}
```

### 3. Common Issues

#### Issue: "I have quests but none show"
**Solution**: Check the date format
- ❌ Wrong: `📅09-30-2025` (month-day-year)
- ❌ Wrong: `📅2025/09/30` (slashes instead of dashes)
- ✅ Correct: `📅2025-09-30`

#### Issue: "Quests show in cards view but not timeline"
**Solution**: Quests need due dates for timeline
```markdown
# Before (won't show in timeline)
- [ ] My Task #gamified-task

# After (will show in timeline) 
- [ ] My Task #gamified-task 📅2025-09-30
```

#### Issue: "Quest is in past/future date"
**Solution**: Timeline shows quests for the selected date
- Check which day you're viewing (top of timeline)
- Use navigation arrows to go to the quest's date
- Or update quest's due date to today

### 4. Quick Test

Add this quest to test:
```markdown
- [ ] Timeline Test Quest #gamified-task 📅2025-09-30T14:30 ⭐10 ✨50 🪙5 🌱
```

Replace `2025-09-30` with today's date in `YYYY-MM-DD` format.

### 5. Date Parser Check

The parser looks for these patterns:
- `📅YYYY-MM-DD` - Date only
- `📅YYYY-MM-DDTHH:MM` - Date with time
- `{due: YYYY-MM-DD}` - Metadata format
- `{due: YYYY-MM-DDTHH:MM}` - Metadata with time
- `due:: YYYY-MM-DD` - Dataview format

### 6. Enable Console Logging

The debug build now logs:
1. Total quests received
2. Quest filtering logic
3. Date matching
4. Scheduled vs all-day categorization

Look for warnings like:
- `[Timeline] Filtered dayQuests: 0` = No quests match today's date
- `[Timeline] Unscheduled quests: X` = Quests with date but no time

### 7. Manual Test Steps

1. **Create a test quest**:
   ```markdown
   - [ ] Test @ 2PM Today #gamified-task 📅2025-09-30T14:00 ⭐10 ✨50 🪙5 🌱
   ```

2. **Reload plugin**: `Ctrl/Cmd + R` in Obsidian

3. **Open Quest Tab**: Click "Quests" in sidebar

4. **Switch to Timeline**: Click "📅 Timeline" button

5. **Check console**: Should see debug logs

### 8. View Modes Explained

#### Day View
- Shows: Today's quests with specific times (hourly grid)
- Also shows: Date-only quests for today (in "All Day" section)
- Navigation: Previous/Next Day arrows

#### Work Week View
- Shows: Monday-Friday quests
- Compact view with all scheduled quests
- Best for: Weekly planning

#### Full Week View  
- Shows: All 7 days (Sunday-Saturday)
- Complete weekly overview
- Best for: Long-term planning

### 9. Expected Behavior

**When you open timeline**, you should see:

1. **View mode selector** (Day / Work Week / Full Week)
2. **Navigation header** (date and arrows)
3. **Energy bar** (current energy level)
4. **Unscheduled section** (if you have date-only quests)
5. **All-Day section** (quests with date but no time)
6. **Hourly timeline** (6am-10pm by default)
7. **Quest blocks** (colored by energy level)

**If you see NONE of these**, check:
- Is the timeline component rendering? (should see view mode buttons)
- Are there any React errors in console?
- Did the build complete successfully?

### 10. Force Quests to Show

To guarantee a quest shows up TODAY:

```markdown
- [ ] Guaranteed Quest #gamified-task {today: true} ⭐10 ✨50 🪙5 🌱
```

The `{today: true}` flag forces it to appear regardless of date.

---

## Still Having Issues?

Check console logs and share:
1. What you see in `[Timeline]` logs
2. Example quest from your GamifiedTasks.md
3. Which view mode you're using
4. Current date

The debug logs will tell us exactly what's happening!
