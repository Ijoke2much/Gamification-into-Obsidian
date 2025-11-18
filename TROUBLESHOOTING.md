# 🔧 Troubleshooting Guide

## Current Build Status: ✅ READY

All code fixes have been applied. If issues persist, follow these steps:

## Quick Fix Steps

### 1. Clear Cache & Reload
```javascript
// In Dev Console (Ctrl/Cmd + Shift + I):
clearQuestCache()
// Then reload: Ctrl/Cmd + R
```

### 2. Check Quest File Format
Your `GamifiedTasks.md` should look like:
```markdown
- [ ] Read the Bible #gamified-task ⭐48 ✨196 🪙20 🔁daily 🛠️Cristianity 🌱 📅2025-09-30T09:00
- [ ] new test #gamified-task ⭐47 ✨811 🪙81 🔁daily 🛠️Body Builder 🌱 📅2025-09-30T16:21
```

**Key Requirements:**
- `📅` emoji directly before date (no space)
- Date format: `YYYY-MM-DDTHH:MM`
- Date comes LAST in the line
- NO curly braces `{due: ...}`

### 3. Debug Console Checks

Open Dev Console and look for these logs:

**Good Signs:**
```
[TaskParser] Parsing quest: new test
[TaskParser] Due date found: 2025-09-30T16:21
[Timeline] Filtered dayQuests: 2
```

**Bad Signs:**
```
[TaskParser] Due date found: (empty)
[Timeline] Filtered dayQuests: 0
```

### 4. Manual Quest Format Fix

If the quest shows "NO DUE DATE", edit it manually:

**Before (BROKEN):**
```markdown
- [ ] new test {due: 2025-09-30} #gamified-task ⭐47 ✨811 🪙81 📅2025-09-30T16:21
```

**After (FIXED):**
```markdown
- [ ] new test #gamified-task ⭐47 ✨811 🪙81 🔁daily 🛠️Body Builder 🌱 📅2025-09-30T16:21
```

### 5. Force Cache Clear

If quests still don't appear:

1. Open Dev Console
2. Run: `clearQuestCache()`
3. Run: `localStorage.clear()`
4. Reload Obsidian
5. Wait 2-3 seconds for quests to load

### 6. Check Timeline Date

Timeline shows **TODAY** by default. If your quests are dated for a different day:

- Use navigation arrows: `← Previous Day` / `Next Day →`
- Or update quest dates to today's date

## Common Issues & Solutions

### Issue: "No Due Date" in Quest Card

**Cause:** Quest parser not finding the date

**Solutions:**
1. Check format: `📅2025-09-30T16:21` (no space after emoji)
2. Remove any `{due: ...}` curly braces
3. Clear cache: `clearQuestCache()`
4. Check console for `[TaskParser]` logs

### Issue: Timeline View Empty

**Causes:**
1. Quest date doesn't match viewed date
2. Quest has no time (date only shows in "All Day")
3. Quest is completed
4. Cache issue

**Solutions:**
1. Check quest date matches timeline date
2. Add time to date: `📅2025-09-30T14:00`
3. Filter out completed: uncheck completed checkbox
4. Clear cache and reload

### Issue: Form Fields Blank When Editing

**Cause:** State initialization issue (SHOULD BE FIXED)

**Solution:**
1. Verify build completed successfully
2. Hard reload: `Ctrl/Cmd + Shift + R`
3. Check console for errors
4. If persists, re-run build: `npm run build`

### Issue: Still Slow Performance

**Causes:**
1. Cache not working
2. Large quest file
3. Other plugins interfering

**Solutions:**
1. Check console for cache hit logs
2. Reduce quest file size (archive old quests)
3. Disable other plugins temporarily
4. Increase cache TTL back to 5000ms

## Debug Commands

Run these in Dev Console:

### Check Cache Status
```javascript
// See if caching is working
// Should see "Using cached quests" after first load
```

### Force Reload Quests
```javascript
clearQuestCache()
// Then reload Obsidian
```

### Check Quest Count
```javascript
// Look for console logs showing:
// [QuestManagement] Total quests: X
```

## Expected Timeline Behavior

After all fixes, you should see:

1. **Quest Tab loads in <500ms**
2. **Timeline View shows:**
   - View mode selector (Day / Work Week / Full Week)
   - Energy bar at top
   - Unscheduled section (if any date-only quests)
   - 9:00 AM: "Read the Bible"
   - 4:21 PM: "new test"
3. **Edit quest shows:**
   - Date field: `2025-09-30`
   - Time field: `16:21`
   - All other fields populated

## Still Not Working?

### Step 1: Check Build
```bash
cd "/path/to/plugin"
npm run build
# Should see: ✅ Production build completed successfully!
```

### Step 2: Verify Files
1. Check `GamifiedTasks.md` format
2. No syntax errors
3. Proper emoji format

### Step 3: Full Reset
```bash
# In console:
clearQuestCache()
localStorage.clear()

# Then in terminal:
rm -rf node_modules
npm install
npm run build

# Reload Obsidian completely
```

### Step 4: Check Logs
Look for these in console:
- `[TaskParser] Parsing quest: ...`
- `[TaskParser] Due date found: ...`
- `[Timeline] Total quests received: ...`
- `[Timeline] Filtered dayQuests: ...`

### Step 5: Share Logs
If still broken, share these:
1. Console logs (filter by `[TaskParser]` or `[Timeline]`)
2. Your quest file format
3. What you see vs what you expect

## Current Code State

All these files have been fixed:
- ✅ `questUtils.ts` - No duplicate metadata
- ✅ `QuestModal.tsx` - Proper state initialization
- ✅ `QuestTimelineView.tsx` - Improved date parsing
- ✅ `useQuestManagement.ts` - Quest caching
- ✅ `ADHDEnhancedQuestCard.tsx` - React.memo
- ✅ `taskParser.ts` - Debug logging added

## Performance Targets

After all fixes:
- **Load time:** <500ms
- **Cache hit rate:** 80-90%
- **FPS:** Smooth 60fps
- **Memory:** <100KB cache overhead

## Next Actions

1. **Reload Obsidian**: `Ctrl/Cmd + R`
2. **Open Dev Console**: `Ctrl/Cmd + Shift + I`
3. **Check for logs**: Filter by `[TaskParser]` or `[Timeline]`
4. **Go to Quest Tab**: Should load instantly
5. **Switch to Timeline**: Click "📅 Timeline"
6. **Verify quests appear**: Should see 2 quests with times

If you see the quests, everything is working! 🎉
If not, follow the debugging steps above and check the console logs.
