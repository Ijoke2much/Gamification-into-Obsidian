# 📅 Date Parsing & Quest Display Fix

## Issues Fixed

### 1. **Corrupted Coins Emoji** 🪙
- **Problem:** The coins emoji was displaying as `��` which corrupted the line parsing
- **Fix:** Replaced corrupted emojis with proper `🪙` emoji in GamifiedTasks.md
- **Added:** Special handling for corrupted emoji patterns in parser

### 2. **Date Extraction Not Working** 📅
- **Problem:** Dates weren't being extracted from quest lines
- **Root Cause:** The regex was consuming dates when matching other emojis
- **Fix:** 
  - Extract dates **FIRST** before processing other emojis
  - Improved regex to support both date (`2025-09-30`) and datetime (`2025-09-30T16:57`) formats
  - Exclude date emoji from general emoji regex to avoid conflicts

### 3. **Enhanced Debug Logging** 🔍
- Added comprehensive logging to track:
  - Quest file loading process
  - Each quest's parsed metadata (dates, XP, CP, etc.)
  - Emoji metadata extraction steps
  - Timeline and calendar view quest filtering

## Changes Made

### Files Modified

1. **`src/features/quests/utils/taskParser.ts`**
   - Enhanced `parseEmojiMetadata()` function
   - Extract dates with dedicated regex first: `/📅(\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2})?)/`
   - Added handling for corrupted coins emoji pattern
   - Improved title cleaning to remove more metadata emojis
   - Added detailed console logging for debugging

2. **`src/data/hooks/useQuestManagement.ts`**
   - Enhanced logging in `loadQuests()` function
   - Shows formatted quest details when loading
   - Displays cache status and file information

3. **`GamifiedTasks.md`**
   - Fixed corrupted coins emoji (�� → 🪙)

## How to Test

### Step 1: Reload Obsidian
Press `Ctrl/Cmd + R` to reload Obsidian with the new build

### Step 2: Clear Cache and Load Quests
Open the Developer Console (Ctrl/Cmd + Shift + I) and run:
```javascript
clearQuestCache()
await window.manualLoadQuests()
```

### Step 3: Check Console Output
You should see detailed logs like:
```
╔═══════════════════════════════════════════════════════╗
║       🎮 QUEST MANAGEMENT - LOADING QUESTS           ║
╚═══════════════════════════════════════════════════════╝
[QuestManagement] Starting to load quests...
...
📋 [QuestManagement] Quest details:
   1. "Read the Bible"
      📅 Due: 2025-09-30
      ✨ XP: 196, ⭐ CP: 48
      ✓ Completed: false
   2. "new test"
      📅 Due: 2025-09-30T16:57
      ✨ XP: 811, ⭐ CP: 47
      ✓ Completed: false
```

### Step 4: Verify Quest Cards
1. Go to **Quest Tab**
2. Quest cards should now show:
   - ✅ Due dates displayed
   - ✅ "Today", "Tomorrow", or countdown
   - ✅ All metadata (XP, CP, coins)

### Step 5: Verify Calendar View
1. Click **📅 Calendar** button
2. Check that:
   - ✅ Quests appear on September 30, 2025
   - ✅ Both quests are visible
   - ✅ Quest details show dates

### Step 6: Verify Timeline View
1. Click **📅 Timeline** button
2. Check that:
   - ✅ "Read the Bible" appears at 9:00 AM (or in all-day section if time not set)
   - ✅ "new test" appears at 4:57 PM
   - ✅ Time slots are clickable

## Expected Behavior

### Quest Cards
- Should display due dates with relative time: "Today", "Tomorrow", or "X days"
- Color-coded by urgency (red for overdue, orange for today, blue for tomorrow)
- Date icon appears next to due date

### Calendar View
- Quests appear on their due date
- Click a date to see all quests for that day
- Quest count badges show on dates with quests

### Timeline View
- Quests with times (e.g., `2025-09-30T16:57`) appear in timeline slots
- Quests with only dates appear in "All-Day" section
- Current time indicated with red line (if viewing today)

## Troubleshooting

### If dates still don't show:

1. **Check console for errors:**
   - Look for `[TaskParser]` logs
   - Verify dates are being extracted

2. **Verify quest format:**
   ```markdown
   - [ ] Quest Title #gamified-task ⭐CP ✨XP 🪙Coins 📅YYYY-MM-DD
   ```

3. **Check for emoji corruption:**
   - Emojis should be: ⭐ ✨ 🪙 📅 🔼 🔁 🛠️ 🌱
   - No `��` characters

4. **Clear cache manually:**
   ```javascript
   clearQuestCache()
   location.reload()
   ```

## Quest Format Reference

### Valid Quest Formats

**Date Only:**
```markdown
- [ ] Task #gamified-task ⭐48 ✨196 🪙20 📅2025-09-30
```

**Date + Time:**
```markdown
- [ ] Task #gamified-task ⭐48 ✨196 🪙20 📅2025-09-30T16:57
```

**Full Quest:**
```markdown
- [ ] Read the Bible #gamified-task ⭐48 ✨196 🪙20 🔼 🔁daily 🛠️Christianity 🌱 📅2025-09-30T09:00
  💭 Always read the word of God
```

### Emoji Order
1. Quest title
2. `#gamified-task` tag
3. ⭐ CP (Class Points)
4. ✨ XP (Experience Points)  
5. 🪙 Coins
6. 🔼 Priority (🔺 highest, ⏫ high, 🔼 medium, 🔽 low, ⏬ lowest)
7. 🔁 Recurrence
8. 🛠️ Skill
9. 🌱 Difficulty (🔥 hard, ⚖️ medium, 🌱 easy)
10. 🖼️ Banner (optional)
11. 📅 **Date (ALWAYS LAST)**

## Next Steps

If everything works:
- ✅ Quest cards show dates
- ✅ Calendar view displays quests
- ✅ Timeline view shows quests at correct times
- ✅ Quest modal shows dates when editing

**You're all set!** 🎉

If issues persist, check the console logs and share them for further debugging.

