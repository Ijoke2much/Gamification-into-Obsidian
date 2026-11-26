# 📖 User Guide - Gamified Obsidian Plugin

## Table of Contents
1. [Introduction](#introduction)
2. [Player System](#player-system)
3. [Quest System](#quest-system)
4. [Boss Battles](#boss-battles)
5. [Skill Tree](#skill-tree)
6. [Inventory & Crafting](#inventory--crafting)
7. [Pomodoro Integration](#pomodoro-integration)
8. [Analytics](#analytics)
9. [Tips & Strategies](#tips--strategies)

---

## Introduction

Welcome, adventurer! This plugin transforms Obsidian into an RPG-style productivity game. Complete tasks, level up, battle bosses, and master skills while building your knowledge vault.

### Core Concept
- **Quests** = Your tasks and todos
- **XP & Levels** = Your progress
- **Skills** = Your areas of expertise
- **Bosses** = Major projects
- **Items** = Rewards and power-ups

---

## Player System

### Your Character

Access via **Player Tab** (🎮 icon)

#### Character Stats
- **Level**: Increases with XP (starts at 1)
- **XP**: Gained from completing quests
- **Coins**: Currency for shop purchases
- **CP**: Class Points for skill progression

#### Core Attributes
- **Energy** (⚡): Available action points
- **Focus** (🎯): Concentration ability
- **Motivation** (🔥): Drive and enthusiasm
- **Calm** (😌): Emotional stability
- **Stress** (😰): Pressure level

### Customization

**Change Your Avatar**
1. Open Player tab
2. Click avatar emoji
3. Select new emoji
4. Automatically saves

**Edit Your Name**
1. Click your name in Player tab
2. Type new name
3. Press Enter

**Master Class**
Your character class (e.g., "Jester 🎭") determines your playstyle. Classes can be customized in the Skill Tree.

### Leveling Up

**XP Requirements:**
- Level 1 → 2: 100 XP
- Level 2 → 3: 250 XP
- Level 3 → 4: 500 XP
- Formula: `base * (level ^ 1.5)`

**On Level Up:**
- 🎉 Celebration animation
- 📈 Stats increase
- 🎁 Unlock new features
- 💪 Boost all attributes

---

## Quest System

### Creating Quests

**Basic Quest**
1. Go to **Quest Tab**
2. Click **+ New Quest**
3. Fill in:
   - **Title**: "Write report"
   - **Description**: Details (optional)
   - **Difficulty**: Easy/Medium/Hard/Epic
   - **XP**: Reward (50-500)
   - **Coins**: Reward (10-100)
   - **Due Date**: When it's due
   - **Time**: Schedule specific time
4. Click **Create Quest**

**Advanced Options**
- **Skills**: Link to skills (e.g., "Writing", "Programming")
- **Priority**: High/Medium/Low
- **Energy Cost**: How much energy it takes
- **Recurrence**: Daily/Weekly/Monthly
- **Subtasks**: Break into smaller steps

### Quest Metadata

Quests are stored with emoji metadata:
- ⭐ = Difficulty
- ✨ = XP reward
- 🪙 = Coin reward
- 🔁 = Recurrence
- 🛠️ = Skills
- 📅 = Due date/time

**Example:**
```markdown
- [ ] Write report #gamified-task ⭐48 ✨100 🪙20 🛠️Writing 📅2025-10-02T14:00
  - description: Quarterly business report
  - difficulty: medium
  - energyCost: 30
```

### Quest Views

#### Card View (Default)
- Visual cards for each quest
- Color-coded by difficulty
- Progress bars
- Quick actions

**Best for:** Quick overview, visual learners

#### Timeline View
- Hourly schedule layout
- Time blocks for quests
- Energy bar indicator
- Drag-and-drop (coming soon)

**Best for:** Time management, daily planning

#### Calendar View
- Month/week calendar
- Quests on due dates
- Recurring tasks
- Color-coded dots

**Best for:** Long-term planning, monthly view

### Completing Quests

**Simple Completion**
1. Find quest
2. Click ✓ button
3. Receive rewards
4. Quest marked complete

**With Subtasks**
1. Complete each subtask first
2. Main quest auto-completes when all done
3. Partial rewards for each subtask

**Recurring Quests**
- Auto-repeats on schedule
- Creates new instance
- Previous completion tracked
- Maintains XP rewards

### Quest Difficulty

**Easy** (⭐ 20-40)
- Quick tasks (< 30 min)
- Low energy cost
- Low rewards
- Good for momentum

**Medium** (⭐ 40-60)
- Standard tasks (30-60 min)
- Moderate energy cost
- Balanced rewards
- Daily work

**Hard** (⭐ 60-80)
- Major tasks (1-3 hours)
- High energy cost
- High rewards
- Important projects

**Epic** (⭐ 80-100)
- Huge projects (days/weeks)
- Very high energy cost
- Massive rewards
- Consider boss battle!

---

## Boss Battles

Turn major projects into epic boss fights!

### When to Use Bosses

Perfect for:
- Large projects (3+ days)
- Challenging goals
- Multi-step tasks
- Team initiatives
- Personal challenges

### Creating a Boss

**Method 1: From Quest**
1. Create quest with multiple subtasks
2. Set difficulty to Hard/Epic
3. Plugin suggests boss conversion
4. Accept → Boss created!

**Method 2: Direct Creation**
1. Go to **Boss Tab**
2. Click **Create New Boss**
3. Fill in:
   - Name
   - Description
   - HP (health points)
   - Difficulty
   - Rewards (XP, coins, items)
4. Link to quest
5. Start battle!

### Battle Mechanics

**Dealing Damage:**
- Complete quest subtasks
- Each subtask = damage
- Boss HP decreases
- Visual health bar

**Boss Attacks:**
- Time pressure
- Status effects
- Motivation drains
- Can be blocked with items

**Victory:**
- Defeat boss (HP = 0)
- Massive rewards
- Achievement unlocked
- Epic animation

### Boss Personalities

Each boss has unique behavior:

**🔥 Aggressive** - High damage, fast attacks
**🛡️ Defensive** - High HP, absorbs damage
**⚡ Quick** - Fast strikes, low HP
**🧙 Strategic** - Status effects, debuffs
**👑 Legendary** - All of the above!

### Boss Analytics

Track your boss battle performance:
- Win rate
- Average time to defeat
- Best strategies
- Personality strengths
- Optimal battle times

---

## Skill Tree

Master your craft with the skill system!

### Opening Skill Tree

Click **🌳 Skill Tree** button anywhere in the plugin.

### Skill Structure

**Master Class** → **Classes** → **Skills** → **Stats**

Example:
```
Jester 🎭 (Master Class)
├── Developer (Class)
│   ├── Programming (Skill)
│   │   ├── Intelligence (Stat)
│   │   └── Creativity (Stat)
│   └── Design (Skill)
└── Writer (Class)
    └── Storytelling (Skill)
```

### Creating Skills

**Method 1: Skill Tree Modal**
1. Open Skill Tree
2. Go to "Create New" tab
3. Fill in:
   - Skill name
   - Class
   - Linked stats
   - Description
4. Save
5. Appears in tree

**Method 2: Manual File**
Create `SkillTree/Master-Class/Skills/YourSkill.md`:
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
Description: Software development skill
---

# Programming

Coding and problem-solving.
```

### Leveling Skills

**Gain CP (Class Points):**
- Complete quests with skill tag
- Higher difficulty = more CP
- Daily consistency bonus
- Skill-focused challenges

**Level Up:**
- Reach required CP
- Skill level increases
- Linked stats boost
- New abilities unlock

**CP Formula:**
```
CP per quest = (difficulty / 100) * baseCP * skillMultiplier
```

### Skill Progress Tracking

View in:
- Skill Tree modal (Overview tab)
- Analytics dashboard
- Player stat cards
- Quest completion screens

---

## Inventory & Crafting

Collect and use items to boost your performance!

### Opening Inventory

Click **🎒 Inventory** button anywhere in the plugin.

### Item Types

**Materials** (💎)
- Gathered from quests
- Used in crafting
- Can be sold for coins
- Examples: Crystal, Leather, Herbs

**Equipment** (⚔️)
- Weapons, armor, tools
- Boost specific stats
- Craftable or dropped
- Examples: Sword, Shield, Focus Ring

**Artifacts** (🗝️)
- Special quest items
- Unique effects
- Cannot be crafted
- Examples: Ancient Key, Magic Tome

### Getting Items

**Quest Rewards:**
- Complete quests
- Random drops
- Difficulty affects rarity

**Crafting:**
- Combine materials
- Create equipment
- Requires recipe
- Uses Crafting skill

**Shop:**
- Buy with coins
- Limited stock
- Refreshes daily

### Using Items

**Equipment:**
1. Open Inventory
2. Click item
3. Click "Equip"
4. Stats increase

**Consumables:**
1. Find item
2. Click "Use"
3. Effect applied
4. Item consumed

**Artifacts:**
- Automatically active when owned
- Permanent passive effects

### Crafting System

**Requirements:**
- Materials in inventory
- Crafting recipe
- Sufficient coins (optional)

**Process:**
1. Open Crafting modal
2. View available recipes
3. Select recipe
4. Check materials
5. Click "Craft"
6. Item created!

**Recipes:**
Located in `SkillTree/Crafting/Recipes/`

Example:
```yaml
---
name: Iron Sword
type: equipment
materials:
  - iron: 5
  - leather: 2
effects:
  - stat: strength
  - bonus: 10
---
```

---

## Pomodoro Integration

Focus sessions with gamification!

### Starting a Session

1. Go to **Pomodoro Tab**
2. Select session type:
   - **Focus** (25 min)
   - **Short Break** (5 min)
   - **Long Break** (15 min)
3. Optional: Link quest
4. Click **Start**

### Session Features

**Quest Integration:**
- Attach quest to session
- Auto-progress on completion
- Extra XP for focus
- Subtask completion

**Stats Tracking:**
- Focus time
- Sessions completed
- Break ratio
- Productivity score

**Rewards:**
- XP per session
- Coins bonus
- Focus stat boost
- Streak bonuses

### Advanced Features

**Hyperfocus Mode:**
- Extended sessions (50 min+)
- Higher rewards
- Risk of burnout
- Use strategically

**Session Suggestions:**
- AI recommends quests
- Based on energy
- Considers time of day
- Optimal difficulty

**Analytics:**
- Best focus times
- Session completion rate
- Quest progress per session
- Productivity trends

---

## Analytics

Track your gamified productivity journey!

### Analytics Dashboard

**Simple View:**
- Clean, minimal interface
- Key metrics at a glance
- Skill progress
- Recent activity

**Real-Time View:**
- Live updates
- Detailed charts
- Performance insights
- Battle statistics

### Key Metrics

**Productivity Score:**
- Overall performance rating
- Based on completion rate
- Time management
- Consistency

**Task Completion:**
- Daily/weekly/monthly
- Success rate
- Average per day
- Streaks

**Focus Time:**
- Total focused hours
- Pomodoro sessions
- Break ratios
- Peak hours

**Skill Progress:**
- CP gained
- Skills leveled
- Class progression
- Mastery levels

### Using Analytics

**Daily Review:**
- Check productivity score
- Review completed quests
- Adjust next day
- Celebrate wins

**Weekly Planning:**
- Identify patterns
- Set goals
- Focus on weak areas
- Leverage strengths

**Monthly Assessment:**
- Long-term trends
- Major achievements
- Skill mastery
- Boss victories

---

## Tips & Strategies

### Getting Started

1. **Start Small:** Create 2-3 easy quests
2. **Build Momentum:** Complete them quickly
3. **Level Up:** Reach level 2-3
4. **Expand:** Add harder quests
5. **Specialize:** Focus on 1-2 skills

### Daily Workflow

**Morning:**
```
1. Review analytics
2. Plan daily quests
3. Set priorities
4. Start with easy wins
```

**Throughout Day:**
```
1. Complete quests
2. Pomodoro sessions
3. Check timeline
4. Adjust as needed
```

**Evening:**
```
1. Complete remaining quests
2. Review progress
3. Prepare tomorrow
4. Celebrate wins
```

### Optimization Tips

**XP Farming:**
- Focus on medium quests
- Maintain streaks
- Use Pomodoro bonus
- Complete boss battles

**Skill Mastery:**
- Tag all quests with skills
- Focus on 1-2 skills first
- Complete skill-specific challenges
- Track progress in Skill Tree

**Resource Management:**
- Balance energy spending
- Take breaks
- Use stat-boosting items
- Plan high-energy tasks

**Boss Strategy:**
- Break into subtasks
- 1-2 subtasks per day
- Use focus sessions
- Equip best gear

### Common Mistakes

❌ **Creating too many quests**
✅ Start with 3-5 per day

❌ **All quests marked "Epic"**
✅ Mix difficulties realistically

❌ **Ignoring skills**
✅ Tag quests with skills for growth

❌ **No breaks**
✅ Use Pomodoro for sustainable pace

❌ **Hoarding items**
✅ Use equipment to boost performance

### Power User Features

**Keyboard Shortcuts:**
- `Ctrl/Cmd + N`: New quest
- `Ctrl/Cmd + E`: Edit quest
- `Ctrl/Cmd + D`: Complete quest
- `Ctrl/Cmd + K`: Open Skill Tree

**Quick Actions:**
- Right-click quest for menu
- Drag to reorder (card view)
- Double-click to edit
- Shift+click for bulk actions

**Custom Rewards:**
- Edit quest files
- Custom XP formulas
- Special items
- Unique effects

**Mobile Workflow:**
- Use voice input for quests
- Quick complete with FAB
- Swipe gestures
- Sync across devices

---

## Advanced Concepts

### Quest Chaining
Link quests in sequences for story-like progression.

### Skill Synergies
Combine skills for bonus effects.

### Class Specialization
Master one class deeply vs. spreading wide.

### Economy Management
Balance earning and spending coins.

### Meta-Gaming
Track patterns and optimize your system.

---

## Support & Community

### Getting Help
- Read `TROUBLESHOOTING.md`
- Check `KNOWN_ISSUES.md`
- Console logs (F12)
- GitHub Issues

### Contributing
- Report bugs
- Suggest features
- Share strategies
- Create content

### Resources
- Quick Reference: `QUICK_REFERENCE.md`
- Setup Guide: `SETUP_INSTRUCTIONS.md`
- Testing Checklist: `BETA_TESTING_CHECKLIST.md`

---

**May your quests be epic and your level-ups legendary!** ⚔️🎮

---

## Quick Command Reference

```
QUESTS
+ New Quest         Create new quest
✓ Complete          Mark as done
✏️ Edit              Modify quest
🗑️ Delete           Remove quest
🔁 Repeat           Set recurring
⚡ Energy Cost      Set energy

VIEWS
📋 Card View        Visual cards
📅 Timeline View    Daily schedule
📆 Calendar View    Monthly calendar

MODALS
🌳 Skill Tree       Manage skills
🎒 Inventory        View items
⚔️ Boss Battle      Epic fights
📊 Analytics        View stats

POMODORO
▶️ Start Session    Begin focus
⏸️ Pause            Pause timer
⏹️ Stop             End session
🔗 Link Quest       Attach quest

SHORTCUTS
Ctrl/Cmd + N        New quest
Ctrl/Cmd + E        Edit
Ctrl/Cmd + D        Complete
Ctrl/Cmd + K        Skill Tree
F12                 Console
```

Print this page for quick reference! 📄

