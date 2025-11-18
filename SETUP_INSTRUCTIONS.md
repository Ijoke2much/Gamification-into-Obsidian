# 🚀 Setup Instructions - Gamified Obsidian Plugin

## Quick Start (5 minutes)

### Step 1: Install Plugin

#### Option A: Manual Install (Recommended for Beta)
1. Download plugin files
2. Navigate to your vault: `YourVault/.obsidian/plugins/`
3. Create folder: `Gamification-into-Obsidian/`
4. Copy these files into the folder:
   - `main.js`
   - `manifest.json`
   - `styles.css`
5. Restart Obsidian
6. Go to Settings → Community Plugins
7. Enable "Gamification into Obsidian"

#### Option B: From Obsidian (When Released)
1. Open Settings → Community Plugins
2. Browse and search "Gamification"
3. Click Install
4. Enable plugin

### Step 2: Initial Setup

1. **Plugin loads automatically**
   - Look for game controller icon (🎮) in left sidebar
   - Or floating action button (mobile)

2. **Create required folder**
   - Plugin creates `SkillTree/` folder automatically
   - Or create manually in vault root

3. **Open Player Tab**
   - Click 🎮 icon or FAB
   - Player tab opens

4. **Customize Character**
   - Set your name
   - Choose avatar
   - Review starting stats

### Step 3: Create Your First Quest

1. Click **"Quest"** tab
2. Click **"+ New Quest"** button
3. Fill in:
   ```
   Title: My First Quest
   Description: Testing the plugin!
   Difficulty: Easy
   XP: 50
   Coins: 10
   Due Date: Today
   Time: 2 hours from now
   ```
4. Click **"Create Quest"**
5. Quest appears in list!

### Step 4: Complete Your First Quest

1. Find your quest in the list
2. Click the **checkmark (✓)** button
3. Watch the rewards animation
4. See XP and coins increase
5. 🎉 Success!

---

## Detailed Setup

### File Structure

Your vault should look like this:
```
YourVault/
├── .obsidian/
│   └── plugins/
│       └── Gamification-into-Obsidian/
│           ├── main.js
│           ├── manifest.json
│           └── styles.css
├── SkillTree/
│   ├── PlayerData.md (created automatically)
│   ├── Master-Class/
│   │   ├── Jester 🎭.md
│   │   ├── Class/
│   │   ├── Skills/
│   │   └── Stats/
│   └── SkillTree.canvas (optional)
└── GamifiedTasks.md (created on first quest)
```

### PlayerData.md Format

The plugin creates this automatically. It looks like:
```yaml
---
name: Your Name
avatar: 🎮
rank: Novice
masterClass: Jester
level: 1
xp: 0
xpRequired: 100
coins: 100
cp: 0
stats:
  energy: 100
  focus: 100
  motivation: 100
  calm: 100
  stress: 0
lastDailyReset: 2025-01-01
---

# Your Character
```

**⚠️ Don't edit manually unless you know what you're doing!**

### GamifiedTasks.md Format

Quests are stored here. Format:
```markdown
- [ ] Quest Title #gamified-task ⭐50 ✨100 🪙20 🛠️Programming 🌱 📅2025-10-02T14:00
  - description: Quest details here
  - difficulty: medium
  - energyCost: 20
```

**The plugin handles this automatically - you don't need to write this!**

---

## Configuration (Optional)

### Settings

Go to Settings → Gamification to customize:

#### Currency Settings
- **Currency Name:** "Coins" (default) or "Gold", "Credits", etc.
- **Currency Symbol:** 🪙 (default) or 💰, 🔶, etc.

#### XP & Rewards
- **XP per Task:** 50-100 (recommended)
- **Coins per Task:** 10-20 (recommended)
- **Leveling Formula:** Default is balanced

#### Quest Settings
- **Auto-refresh:** ON (recommended)
- **Hide completed:** OFF (see your achievements!)
- **Quest refresh interval:** 30 seconds

#### File Paths
- **Skill Tree Root:** `SkillTree` (default)
- **Inventory Path:** `SkillTree/Inventory.md`

### Themes

The plugin uses your Obsidian theme by default. For best experience:
- **Light themes:** Any light theme works
- **Dark themes:** Recommended (looks more game-like)

### Mobile Setup

1. Sync your vault to mobile (iCloud, Dropbox, etc.)
2. Install Obsidian mobile app
3. Open vault
4. Plugin syncs automatically
5. Look for floating action button (bottom right)
6. Tap to open plugin

**Mobile Notes:**
- Takes 2-3 seconds longer to load
- Touch-optimized interface
- All features available
- Data syncs between devices

---

## Skill Tree Setup (Optional)

### Auto-Setup (Recommended)
Plugin creates basic structure automatically.

### Manual Setup
If you want custom skills:

1. Create skill file: `SkillTree/Master-Class/Skills/YourSkill.md`
2. Format:
   ```yaml
   ---
   name: Programming
   class: Developer
   stats:
     - intelligence
     - creativity
   level: 1
   currentCP: 0
   requiredCP: 100
   totalCP: 0
   Description: Coding and software development
   ---
   
   # Programming
   
   A skill for building software and solving problems.
   ```

3. Open Skill Tree modal
4. Skill appears in tree

---

## Boss System Setup (Optional)

Bosses are created automatically from quests, but you can customize:

### Create Custom Boss

1. Go to Boss tab
2. Click "Create Boss"
3. Fill in:
   - Name
   - Description
   - Difficulty
   - HP
   - Rewards
4. Link to quest
5. Start battle!

### Convert Quest to Boss

1. Create a quest with multiple subtasks
2. Set difficulty to "Hard" or "Epic"
3. Set duration > 3 days
4. Plugin suggests converting to boss
5. Accept conversion
6. Boss battle begins!

---

## Troubleshooting Setup

### Plugin Won't Load

**Check:**
1. Files in correct location?
2. Obsidian restarted?
3. Community plugins enabled?
4. Check console (Ctrl/Cmd + Shift + I) for errors

**Fix:**
```
1. Settings → Community Plugins → Reload
2. Restart Obsidian
3. Disable/Re-enable plugin
```

### PlayerData.md Not Created

**Manual creation:**
1. Create `SkillTree/` folder
2. Create `PlayerData.md` file
3. Copy template from above
4. Fill in your name
5. Save and reload plugin

### Quests Not Appearing

**Check:**
1. Did you create a quest?
2. Is it scheduled for today?
3. Try switching views (Card/Timeline/Calendar)
4. Check console for parser errors

**Fix:**
```
1. Open Dev Console (F12)
2. Run: clearQuestCache()
3. Reload Obsidian
4. Create new quest
```

### Mobile Not Working

**Check:**
1. Vault synced to mobile?
2. Plugin enabled on mobile?
3. Wait 5 seconds for initial load

**Fix:**
```
1. Force quit Obsidian mobile
2. Reopen
3. Wait for vault sync
4. Look for floating button
```

---

## Next Steps

After setup:

1. **Read:** `USER_GUIDE.md` - Learn all features
2. **Test:** `BETA_TESTING_CHECKLIST.md` - Try everything
3. **Reference:** `QUICK_REFERENCE.md` - Quick tips
4. **Issues:** `KNOWN_ISSUES.md` - Current limitations

---

## Getting Help

### Check These First
1. `TROUBLESHOOTING.md` - Common problems
2. Console errors (F12)
3. Plugin enabled?
4. Files in right location?

### Report Issues
- GitHub Issues (link here)
- Discord (link here)
- Email developer

### Include in Report
- Obsidian version
- Plugin version
- Operating system
- Error messages
- Screenshots
- Steps to reproduce

---

## Quick Reference Card

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   GAMIFIED OBSIDIAN - QUICK START
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📂 Files
├── SkillTree/PlayerData.md
└── GamifiedTasks.md

🎮 Open Plugin
• Click 🎮 icon (sidebar)
• Or floating button (mobile)

✅ Create Quest
• Quest tab → + New Quest
• Fill form → Save

⚔️ Boss Battle
• Boss tab → Create Boss
• Or convert hard quest

🌳 Skill Tree
• Click 🌳 button
• View progress
• Create skills

🎒 Inventory
• Click 🎒 button
• View items
• Equip gear

📊 Analytics
• Analytics tab
• Track progress
• View insights

🍅 Pomodoro
• Pomodoro tab
• Start session
• Focus & earn

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Print this and keep it handy! 📋

---

**Welcome to Gamified Obsidian!** 🎉

Transform your productivity into an epic adventure.

