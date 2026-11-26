# 🎮 Enhanced Timeline View - ADHD-Friendly Quest Scheduling

## ✨ New Features

### 📅 Multi-View Support
Switch between three powerful view modes:

1. **Day View** - Detailed hourly schedule for a single day
2. **Work Week View** - Monday-Friday overview with energy distribution
3. **Full Week View** - Complete 7-day weekly planning

### ⚡ Energy Management System

#### Visual Energy Bar
- Real-time energy level display (0-100)
- Color-coded gradient (red → yellow → green)
- Overcommitment warnings when scheduled tasks exceed available energy

#### Daily Energy Tracking
- **Weekly Energy Overview** - See energy distribution across the week
- **Quest Energy Cost Badges** - Visual indicators on every quest:
  - 🟢 Low energy (0-15)
  - 🟡 Medium energy (16-30)
  - 🟠 High energy (31-50)
  - 🔴 Very high energy (51+)

### 🎯 ADHD-Specific Features

#### Quest Color Coding
Quests are automatically color-coded based on your current energy:
- **Green** - Perfect match (quest needs ≤30% of your energy)
- **Yellow** - Good match (quest needs ≤60% of your energy)
- **Red** - Challenging (quest needs >60% of your energy)

#### Hyperfocus Mode Indicators
- ✨ Purple glow on quests optimal for hyperfocus (hard difficulty + high energy)
- Sparkle animation to catch attention
- "Hyperfocus available" banner when energy ≥70

#### Smart Quest Placement

**All-Day Section**
- Shows quests with date-only due dates (no specific time)
- Drag-and-drop to schedule them at specific times
- Clearly separated from timed quests

**Unscheduled Quests Panel**
- Lists quests that need scheduling
- Shows quest count in header
- Drag quests directly to timeline
- Displays energy cost and estimated time

### 🎨 Gamified UI Elements

#### Visual Feedback
- **Completed quests** - Dashed border, reduced opacity, checkmark
- **Priority badges** - 🔥 for high-priority items
- **Hyperfocus badges** - ✨ sparkle effect
- **Now line** - Animated red line showing current time (today only)

#### Quick Actions (Day View)
Hover over any quest block to reveal:
- 🍅 **Pomodoro** - Start focused work session
- ✨ **Hyperfocus** - Enter deep work mode
- ✓ **Complete** - Mark quest as done

#### Animations
- Pulse effect on overcommitment warnings
- Glow effect on hyperfocus availability
- Sparkle animation on hyperfocus-optimal quests
- Smooth transitions on all interactions

### 🔧 Smart Scheduling

#### Auto-Scheduler (Coming Soon)
The system will intelligently suggest:
- Optimal times based on energy levels
- Task clustering by difficulty
- Break time placement
- Hyperfocus window utilization

#### Flexible Time Blocks
- **Collapsible hours** - Hide early morning (0-5am) and late night (10pm-12am)
- **Drag & drop** - Move quests to any time slot
- **Resize handles** - Adjust task duration by dragging edges
- **Snap to grid** - 5-minute increment snapping

### 📊 Weekly Energy Distribution
In week/workweek view:
- Vertical bar chart showing daily energy requirements
- Color-coded bars (green = good, red = overcommitted)
- Daily quest counts
- "Today" highlighting

## 🎮 How to Use

### Scheduling a Quest

**Method 1: Drag from Unscheduled Panel**
1. Find quest in "Unscheduled Quests" section
2. Drag to desired time slot
3. Drop to schedule

**Method 2: Drag from All-Day Section**
1. Quest shows in "All Day" if it has a date but no time
2. Drag to hourly timeline
3. Drop at preferred time

**Method 3: Manual Edit**
1. Double-click quest card
2. Edit quest details
3. Add time to due date (e.g., `2025-09-30T14:30`)

### Adjusting Quest Duration
1. Hover over scheduled quest block
2. Drag top edge to adjust start time
3. Drag bottom edge to adjust duration

### Energy-Aware Planning
- Check energy bar before scheduling
- Green quests = safe to schedule
- Yellow quests = consider energy level
- Red quests = may exceed available energy
- Look for ✨ hyperfocus indicators for hard tasks

### Weekly Planning
1. Switch to "Work Week" or "Full Week" view
2. Review weekly energy distribution chart
3. Balance workload across days
4. Avoid overcommitment (red bars)

## 💡 Tips for ADHD Users

### Energy Management
- **Morning Peak** (9am-12pm) - Schedule hard/important tasks
- **Afternoon Dip** (1pm-3pm) - Light tasks, admin work
- **Second Wind** (3pm-6pm) - Creative or hyperfocus tasks
- **Evening** (7pm+) - Planning, reflection, easy tasks

### Break Strategies
- Use 15-minute buffer between tasks
- Don't schedule more than 2 consecutive hours
- Watch for overcommitment warnings
- Honor your energy levels

### Hyperfocus Optimization
- Look for ✨ indicators on hard tasks
- Schedule during your peak times
- Ensure you have 70+ energy
- Minimize distractions beforehand

### Visual Cues
- 🟢 = "I've got this!"
- 🟡 = "I can probably do this"
- 🔴 = "This will be challenging"
- ✨ = "Enter the zone!"

## 🔄 Integration

### With Other Systems
- **Pomodoro Timer** - Click 🍅 to start focused session
- **Quest Cards** - Double-click to edit quest details
- **Calendar View** - Switch views with one click
- **Energy System** - Live updates based on player stats

### Data Persistence
- All scheduled times saved automatically
- Drag-and-drop changes persist
- Quest resizing updates estimated time
- Works with existing quest format

## 🐛 Troubleshooting

**"I don't see any quests in timeline view"**
- Quests need a due date (with or without time)
- Check if your quests have `due: YYYY-MM-DD` metadata
- Add time for hourly timeline: `due: YYYY-MM-DDT14:30`
- Date-only quests appear in "All Day" section

**"Energy bar is incorrect"**
- Energy syncs with player stats
- Complete tasks to restore energy
- Check Player tab for current stats

**"Can't drag quests"**
- Ensure quest is not completed
- Check that quest has a due date
- Try refreshing the view

## 🎯 Keyboard Shortcuts

All standard Quest Tab shortcuts work:
- `N` - New quest
- `/` - Search
- `F` - Filters
- `C` - Compact view
- `V` - Bulk mode
- `ESC` - Clear selection

## 🚀 What's Next

Planned enhancements:
- [ ] AI-powered auto-scheduling
- [ ] Break time recommendations
- [ ] Focus session tracking
- [ ] Energy trend analysis
- [ ] Multi-day quest support
- [ ] Recurring task visualization
- [ ] Habit integration
- [ ] Time blocking templates

---

**Remember**: This system is designed to support your ADHD brain, not fight against it. Use the energy indicators, respect your limits, and celebrate your wins! 🎉
