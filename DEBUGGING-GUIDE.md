# Debugging Calendar/Timeline Quest Visibility Issue

## Quick Diagnosis Steps

### Step 1: Open Browser Console
1. In Obsidian, press `Cmd+Option+I` (Mac) or `Ctrl+Shift+I` (Windows/Linux)
2. Click on the "Console" tab

### Step 2: Check if quests are loading
Run this in the console:

```javascript
// Force reload quests and see what's loaded
await window.manualLoadQuests?.();
```

You should see extensive debug logging that shows:
- How many quests were parsed
- Each quest's title, due date, XP, CP
- Whether parsing succeeded

### Step 3: Check quest filtering
Run this to see the current quests and their dates:

```javascript
// Get the quest data
const questData = JSON.parse(localStorage.getItem('quests_GamifiedTasks.md') || '{}');
if (questData.data) {
    console.log('📋 Loaded Quests:', questData.data.length);
    questData.data.forEach((q, idx) => {
        console.log(`${idx + 1}. "${q.title}" - Due: ${q.due} - Completed: ${q.completed}`);
    });
} else {
    console.log('❌ No quest data in cache');
}
```

### Step 4: Clear cache and force reload
If quests aren't showing up, try clearing the cache:

```javascript
// Clear all caches
window.clearQuestCache?.();
localStorage.clear();
console.log('✅ Cache cleared. Please reload Obsidian (Cmd+R or Ctrl+R)');
```

### Step 5: Check date filtering in timeline
When viewing the timeline, you should see lots of debug logs like:

```
[Timeline] ═══════════════════════════════════════
[Timeline] calculateDayData for: 2025-10-15
[Timeline] Checking "test": questDate=2025-10-02, dayISO=2025-10-15
[Timeline] ✅ Including "test" - overdue quest
```

If you don't see these logs, the timeline component might not be rendering.

## Common Issues

### Issue 1: Quests show in console but not in timeline/calendar
**Cause:** The quests might be filtered out by the active filters
**Solution:** 
1. Check the filter dropdown in the Quests tab
2. Make sure "Status" is set to "All" or "Active"
3. Make sure "Due Date" is set to "All"
4. Try clicking "Clear Filters"

### Issue 2: Timeline shows "No quests scheduled"
**Cause:** The timeline only shows quests with TIME (e.g., `📅2025-10-02T22:11`). Quests with only dates (e.g., `📅2025-10-09`) appear in the "All Day" section above the timeline.
**Solution:** 
- Look for the "All Day" section above the timeline
- Or edit your quests to add a time (e.g., `📅2025-10-09T10:00`)

### Issue 3: Calendar shows no dots/indicators
**Cause:** The calendar might be looking at a different month
**Solution:** 
- Use the navigation arrows to go to the month where your quests are
- For October 2025, make sure you're viewing that month

### Issue 4: Dates are all in the past
**Cause:** Your system date might be set incorrectly (shows October 15, 2025)
**Solution:** 
- Check your system date/time settings
- Or update your quest dates to be relative to "today"

## Manual Fix: Force Reload Component

If nothing works, try forcing a full component reload:

```javascript
// Force unmount and remount the Quest tab
location.reload();
```

## Still Not Working?

Check these:

1. **File location**: Make sure your quests are in `GamifiedTasks.md` in the root of your vault
2. **Quest format**: Make sure your quests have `#gamified-task` tag
3. **Date format**: Make sure dates are in format `📅YYYY-MM-DD` or `📅YYYY-MM-DDTHH:MM`
4. **Plugin loaded**: Make sure the plugin is enabled in Settings → Community Plugins

## Debug Info to Share

If you need help, run this and share the output:

```javascript
console.log('=== DEBUG INFO ===');
console.log('System Date:', new Date().toISOString());
console.log('Quest File Exists:', !!app.vault.getAbstractFileByPath('GamifiedTasks.md'));
console.log('LocalStorage Keys:', Object.keys(localStorage).filter(k => k.includes('quest')));
console.log('Window Functions:', {
    manualLoadQuests: typeof window.manualLoadQuests,
    clearQuestCache: typeof window.clearQuestCache,
});
```

