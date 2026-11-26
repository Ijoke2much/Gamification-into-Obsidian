# ⚠️ Known Issues & Limitations

**Last Updated:** Pre-Beta Release
**Plugin Version:** 1.0.0-beta

---

## Critical Issues

### None Currently! 🎉

All critical bugs have been fixed. Data persistence, quest parsing, and mobile loading are working correctly.

---

## High Priority Issues

### 1. Multi-Day Quest Support (Not Implemented)

**Status:** ❌ Not available

**Description:**
Quests can have due dates, but don't natively support spanning multiple days with start/end dates.

**Workaround:**
- Create quest with end date as due date
- Use subtasks for daily chunks
- Convert to boss battle for multi-day projects

**Planned Fix:** v1.1.0

---

### 2. Quest Sharing System (Disabled by Default)

**Status:** ⚠️ Exists but untested

**Description:**
The quest sharing system was built for cross-vault synchronization (not multiplayer). It's disabled by default and hasn't been thoroughly tested with beta users.

**Current State:**
- Code exists in `QuestSharingSystem.ts`
- Setting: `enableSharing` (default: false)
- Not recommended for beta testing

**Recommendation:** Keep disabled until v1.2.0

---

## Medium Priority Issues

### 3. Timeline Drag-and-Drop (Not Implemented)

**Status:** ❌ Not available

**Description:**
You can't drag quests to reorder or reschedule them in Timeline view yet.

**Workaround:**
- Edit quest to change time
- Use Calendar view for monthly drag-drop

**Planned Fix:** v1.1.0

---

### 4. Mobile Performance on Older Devices

**Status:** ⚠️ May be slow

**Description:**
Older mobile devices (iPhone 8, older Android) may experience:
- Slow initial load (5-10 seconds)
- Animation stuttering
- Occasional lag

**Workaround:**
- Disable animations in settings (coming soon)
- Limit active quests to <20
- Clear cache regularly

**Note:** Modern devices (iPhone 11+, recent Android) work fine.

---

### 5. Large Quest Files (>500 quests)

**Status:** ⚠️ Performance degradation

**Description:**
If `GamifiedTasks.md` contains >500 quests, loading may be slow.

**Workaround:**
- Archive completed quests monthly
- Split into multiple files (manual setup)
- Use filters to reduce active quests

**Planned Fix:** Automatic archiving in v1.1.0

---

### 6. AI Recommendations (Rule-Based)

**Status:** ✅ Working, but limited

**Description:**
The "AI-powered recommendations" are actually rule-based algorithms, not true AI/ML. They provide:
- Quest suggestions based on context
- Boss battle strategy recommendations
- Optimal Pomodoro timing

**Limitations:**
- Not learning from your behavior
- Basic pattern matching
- No predictive capabilities

**Future:** May integrate real AI in v2.0.0

---

## Low Priority Issues

### 7. Occasional Quest Duplication

**Status:** 🐛 Rare bug

**Description:**
Very rarely, editing a quest quickly after creation may create a duplicate entry.

**Frequency:** <1% of edits
**Severity:** Low (easy to delete duplicate)

**Workaround:**
- Wait 1 second after creating before editing
- Delete duplicate manually

---

### 8. Mobile Quest Edit Modal Small

**Status:** ⚠️ UI issue

**Description:**
Quest edit modal on small phones (iPhone SE, small Android) is cramped.

**Workaround:**
- Rotate to landscape
- Use desktop for detailed edits
- Mobile quick edits work fine

**Planned Fix:** Responsive modal redesign in v1.1.0

---

### 9. Theme Compatibility

**Status:** ⚠️ Some themes need adjustment

**Description:**
Plugin uses Obsidian theme variables, but some custom themes may have:
- Color contrast issues
- Emoji rendering problems
- Modal positioning quirks

**Known Compatible Themes:**
- Default Obsidian theme ✅
- Minimal theme ✅
- Blue Topaz ✅
- California Coast ✅

**Known Issues:**
- Dracula theme (slight color issues) ⚠️
- Some light themes (low contrast) ⚠️

**Workaround:** Switch to compatible theme or report issues

---

### 10. Recurring Quest Completion Timing

**Status:** 🐛 Minor bug

**Description:**
Recurring quests sometimes reset at midnight UTC instead of local timezone.

**Impact:** Low (quests still recur, just timing off)

**Workaround:**
- Complete quests before midnight
- Manually adjust next occurrence

**Planned Fix:** v1.0.1

---

## Feature Limitations

### What's NOT Included (Yet)

❌ **Multiplayer/Collaboration**
- Single-player only for now
- No shared quests between users
- Planned: v2.0.0

❌ **Cloud Sync Management**
- Uses Obsidian's native sync
- No built-in conflict resolution
- Manual merge required if conflicts

❌ **Custom Animation System**
- Basic animations only
- No particle effects
- No advanced transitions

❌ **Sound Effects**
- Silent by default
- No audio feedback
- Planned: Optional sounds in v1.2.0

❌ **Advanced Statistics**
- Basic analytics only
- No predictive insights
- No correlation analysis

❌ **Plugin API**
- Not extensible yet
- No custom integrations
- Planned: API in v1.3.0

❌ **Quest Templates Library**
- Basic templates only
- No community templates
- No template marketplace

❌ **Achievements Gallery**
- Achievements tracked
- No visual gallery (basic list)
- Planned: Full gallery in v1.1.0

---

## Mobile-Specific Limitations

### iOS

**Working:**
- ✅ All core features
- ✅ Floating Action Button
- ✅ Touch controls
- ✅ Data persistence

**Limited:**
- ⚠️ Slower initial load
- ⚠️ Some animations laggy
- ⚠️ Modal sizing on small screens

**Not Working:**
- ❌ Desktop-only keyboard shortcuts
- ❌ Hover effects
- ❌ Right-click menus

### Android

**Working:**
- ✅ All core features
- ✅ Floating Action Button
- ✅ Touch controls

**Limited:**
- ⚠️ Variable performance (device-dependent)
- ⚠️ Emoji rendering varies by version

**Not Working:**
- ❌ Desktop keyboard shortcuts
- ❌ Some custom fonts

---

## Edge Cases

### Quest Parsing

**May Fail:**
- Quests with special characters in title (`, {, })
- Extremely long quest titles (>200 chars)
- Malformed emoji metadata

**Solution:** Follow quest format guidelines in `USER_GUIDE.md`

### Data Corruption

**Rare Cases:**
- Obsidian crashes during save
- Manual file editing errors
- iCloud sync conflicts

**Prevention:**
- Let plugin handle file writes
- Enable Obsidian's file recovery
- Regular backups recommended

---

## Performance Considerations

### Recommended Limits

**Optimal Performance:**
- Active quests: <50
- Total quests: <500
- Skills: <30
- Inventory items: <100
- Bosses: <10 active

**Acceptable Performance:**
- Active quests: 50-100
- Total quests: 500-1000
- Skills: 30-50
- Inventory items: 100-200
- Bosses: 10-20 active

**May Experience Lag:**
- Active quests: >100
- Total quests: >1000
- Skills: >50
- Inventory items: >200
- Bosses: >20 active

---

## Browser Compatibility

### Desktop

**Fully Supported:**
- Chrome/Chromium ✅
- Safari ✅
- Firefox ✅
- Edge ✅

**Electron:** Obsidian uses Electron, so all features work

### Mobile

**Supported:**
- iOS 14+ ✅
- Android 8+ ✅

**Not Tested:**
- Older versions ❓
- Tablets (should work) ❓

---

## Reporting New Issues

### Before Reporting

1. Check this list
2. Check `TROUBLESHOOTING.md`
3. Try clearing cache
4. Try reloading Obsidian
5. Check console for errors

### What to Include

**Required:**
- Obsidian version
- Plugin version
- Operating system
- Clear description
- Steps to reproduce

**Helpful:**
- Screenshots
- Console errors (F12)
- Quest file excerpt
- Settings configuration

**Format:**
```markdown
**Issue:** Quest doesn't show in timeline
**Severity:** Medium
**Frequency:** Always / Sometimes / Rare
**Steps:**
1. Create quest with due date
2. Switch to Timeline view
3. Quest not visible

**Expected:** Quest appears at scheduled time
**Actual:** Empty timeline
**Console Errors:** [paste here]
**Screenshots:** [attach]
```

### Where to Report

- GitHub Issues (preferred)
- Discord (link)
- Email developer

---

## Workarounds Summary

| Issue | Workaround |
|-------|-----------|
| Multi-day quests | Use subtasks or boss battles |
| Slow mobile | Limit active quests, archive old ones |
| Theme issues | Switch to compatible theme |
| Large quest file | Archive completed quests |
| Quest duplication | Wait before editing, delete duplicates |
| Drag-and-drop | Edit manually for now |
| Recurring timing | Complete before midnight |

---

## What's Working Great ✅

Despite these issues, the following work excellently:

- ✅ Quest creation and completion
- ✅ XP, leveling, rewards
- ✅ Boss battle mechanics
- ✅ Skill tree system
- ✅ Inventory and crafting
- ✅ Pomodoro integration
- ✅ Analytics tracking
- ✅ Data persistence
- ✅ Mobile support (modern devices)
- ✅ Three view types (Card/Timeline/Calendar)
- ✅ Recurring quests
- ✅ Subtasks
- ✅ Energy management
- ✅ Achievement tracking

---

## Release Roadmap

### v1.0.1 (Bug Fixes)
- Fix recurring quest timezone
- Fix occasional duplication
- Mobile modal improvements

### v1.1.0 (Features)
- Multi-day quest support
- Timeline drag-and-drop
- Automatic quest archiving
- Achievements gallery
- Custom rewards editor

### v1.2.0 (Enhancement)
- Optional sound effects
- Quest sharing beta
- Performance improvements
- Theme customization

### v2.0.0 (Major)
- True AI recommendations
- Plugin API
- Multiplayer exploration
- Advanced analytics

---

## Beta Testing Notes

### What to Focus On

**High Priority Testing:**
- Data persistence (reload frequently!)
- Quest completion flow
- Boss battles
- Mobile functionality
- Performance with many quests

**Medium Priority:**
- UI/UX feedback
- Feature suggestions
- Missing functionality
- Theme compatibility

**Low Priority:**
- Minor visual bugs
- Nice-to-have features
- Edge cases

### Known Non-Issues

**These are expected behavior:**
- Plugin takes 2-3 seconds to load on mobile
- Quest metadata uses emojis (not editable in UI yet)
- Skill Tree requires manual file creation
- Boss HP is abstract (not tied to actual work)
- Analytics update on refresh, not live

---

**Questions?** See `TROUBLESHOOTING.md` or contact developer.

**Found a bug not listed here?** Please report it!

Thank you for helping test this plugin! 🙏🎮

