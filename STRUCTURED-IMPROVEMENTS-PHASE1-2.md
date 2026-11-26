# Phase 1 & 2 Implementation - Structured App Inspired

## Changes Being Made

### Phase 1 - Quick Wins
- ✅ Time range display (8:00 - 8:30 AM, 30 min)
- ✅ Circular completion indicators (right side)
- ✅ "X min remaining" for current task
- ✅ Task category icons

### Phase 2 - Visual Polish
- ✅ Pastel color palette (soft mint, amber, coral)
- ✅ Circular task icon avatars (left side, sidebar-optimized)
- ✅ Free time gap indicators
- ✅ Subtitle notes under task title

## Icon Mapping Function

```typescript
const getTaskIcon = (quest: Quest): string => {
  const title = quest.title.toLowerCase();
  if (title.includes('workout') || title.includes('exercise') || title.includes('gym')) return '💪';
  if (title.includes('meeting') || title.includes('call') || title.includes('zoom')) return '👥';
  if (title.includes('read') || title.includes('study') || title.includes('book')) return '📚';
  if (title.includes('write') || title.includes('blog') || title.includes('journal')) return '✍️';
  if (title.includes('cook') || title.includes('eat') || title.includes('meal') || title.includes('lunch') || title.includes('dinner')) return '🍽️';
  if (title.includes('clean') || title.includes('chore') || title.includes('laundry')) return '🧹';
  if (title.includes('code') || title.includes('dev') || title.includes('program')) return '💻';
  if (title.includes('pray') || title.includes('meditat') || title.includes('bible')) return '🙏';
  if (title.includes('bike') || title.includes('commute') || title.includes('drive')) return '🚴';
  if (title.includes('shop') || title.includes('grocery')) return '🛒';
  if (title.includes('walk') || title.includes('run') || title.includes('jog')) return '🏃';
  if (title.includes('music') || title.includes('practice')) return '🎵';
  if (title.includes('art') || title.includes('draw') || title.includes('paint')) return '🎨';
  if (quest.difficulty === 'hard') return '🔥';
  if (quest.difficulty === 'easy') return '🌱';
  return '📋';
};
```

## Implementation in TSX

Add before the block rendering section (around line 693):

```typescript
// Get task icon based on category
const getTaskIcon = (quest: Quest): string => {
  const title = quest.title.toLowerCase();
  if (title.includes('workout') || title.includes('exercise') || title.includes('gym')) return '💪';
  if (title.includes('meeting') || title.includes('call') || title.includes('zoom')) return '👥';
  if (title.includes('read') || title.includes('study') || title.includes('book')) return '📚';
  if (title.includes('write') || title.includes('blog') || title.includes('journal')) return '✍️';
  if (title.includes('cook') || title.includes('eat') || title.includes('meal')) return '🍽️';
  if (title.includes('clean') || title.includes('chore')) return '🧹';
  if (title.includes('code') || title.includes('dev')) return '💻';
  if (title.includes('pray') || title.includes('meditat') || title.includes('bible')) return '🙏';
  if (title.includes('bike') || title.includes('commute')) return '🚴';
  if (quest.difficulty === 'hard') return '🔥';
  if (quest.difficulty === 'easy') return '🌱';
  return '📋';
};

{/* Scheduled Quest Blocks */}
{dayCol.scheduled.map((block, blockIdx) => {
  const energy = block.quest.energyCost ?? 10;
  const energyMatch = getEnergyMatchClass(energy, currentEnergy);
  const isHyperfocusOptimal = block.quest.difficulty === 'hard' && currentEnergy >= 70;
  const isExpanded = expandedBlocks.has(block.quest.id);
  const isDropdownOpen = openDropdown === block.quest.id;
  
  const topPos = minutesToTop(block.startMinutes - dayStartHour*60);
  const heightVal = durationToHeight(block.duration);
  const isSmallBlock = heightVal < 80;
  
  const startHour = Math.floor(block.startMinutes / 60);
  const startMin = block.startMinutes % 60;
  const endMinutes = block.startMinutes + block.duration;
  const endHour = Math.floor(endMinutes / 60);
  const endMin = endMinutes % 60;
  
  // Time range string "8:00 - 8:30 AM (30 min)"
  const timeRangeStr = `${startHour % 12 || 12}:${startMin.toString().padStart(2, '0')} - ${endHour % 12 || 12}:${endMin.toString().padStart(2, '0')}${endHour >= 12 ? 'PM' : 'AM'}`;
  
  // Check if this is the current active task
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const isCurrentTask = dayCol.isToday && 
    currentMinutes >= block.startMinutes && 
    currentMinutes < (block.startMinutes + block.duration);
  const timeRemaining = isCurrentTask 
    ? (block.startMinutes + block.duration) - currentMinutes 
    : null;
  
  // Calculate free time gap
  const prevBlock = blockIdx > 0 ? dayCol.scheduled[blockIdx - 1] : null;
  const freeTimeGap = prevBlock 
    ? block.startMinutes - (prevBlock.startMinutes + prevBlock.duration) 
    : null;
  const showFreeTime = freeTimeGap && freeTimeGap >= 15;
  
  // Get task icon
  const taskIcon = getTaskIcon(block.quest);
  
  return (
    <React.Fragment key={block.quest.id}>
      {/* Free Time Gap Indicator */}
      {showFreeTime && prevBlock && (
        <div
          className={styles.freeTimeGap}
          style={{
            position: 'absolute',
            top: `${minutesToTop((prevBlock.startMinutes + prevBlock.duration) - dayStartHour*60)}px`,
            height: `${durationToHeight(freeTimeGap)}px`,
            left: '6px',
            right: '6px',
            zIndex: 1
          }}
        >
          <div className={styles.freeTimeContent}>
            <span className={styles.freeTimeIcon}>⏱️</span>
            <span className={styles.freeTimeText}>{freeTimeGap} min free</span>
          </div>
        </div>
      )}
      
      <div
        className={`
          ${styles.block} 
          ${styles[`energy_${energyMatch}`]}
          ${isHyperfocusOptimal ? styles.hyperfocusOptimal : ''}
          ${block.quest.completed ? styles.completed : ''}
          ${isExpanded ? styles.expanded : ''}
          ${isSmallBlock ? styles.smallBlock : ''}
          ${isCurrentTask ? styles.currentTask : ''}
        `}
        style={{ 
          position: 'absolute',
          top: `${topPos}px`, 
          height: isExpanded ? 'auto' : `${heightVal}px`,
          minHeight: isExpanded ? `${heightVal}px` : undefined,
          left: '6px',
          right: '6px',
          zIndex: isExpanded || isDropdownOpen ? 100 : 2,
        }}
        draggable={!isExpanded && !isDropdownOpen}
        onDragStart={() => !isExpanded && !isDropdownOpen && setDragging(block)}
        onDoubleClick={() => onQuestEdit(block.quest)}
        onClick={() => !isDropdownOpen && onQuestSelect(block.quest)}
        title={block.quest.title}
      >
        {/* Task Icon Circle (Left Side) */}
        <div className={`${styles.taskIconCircle} ${block.quest.completed ? styles.completedIcon : ''}`}>
          {taskIcon}
        </div>
        
        {/* Menu Button (Top Right) */}
        <div 
          className={styles.menuButton}
          onClick={(e) => toggleDropdown(block.quest.id, e)}
          title="Actions"
        >
          ⋮
        </div>

        {/* Dropdown Menu stays the same */}
        {/* ... existing dropdown code ... */}

        {/* Time Range Header */}
        <div className={styles.blockTimeRange}>
          {timeRangeStr} <span className={styles.durationBadge}>({block.duration}m)</span>
        </div>

        {/* Quest Title */}
        <div className={styles.blockTitle} style={{ 
          paddingLeft: '4px',
          paddingRight: '44px', // Room for completion circle
          marginTop: '28px',
          lineHeight: '1.4',
          overflow: isSmallBlock ? 'hidden' : 'visible',
          textOverflow: isSmallBlock ? 'ellipsis' : 'unset',
          whiteSpace: isSmallBlock ? 'nowrap' : 'normal'
        }}>
          {block.quest.title}
        </div>
        
        {/* Subtitle/Description */}
        {!isSmallBlock && block.quest.description && (
          <div className={styles.blockSubtitle}>
            {block.quest.description}
          </div>
        )}
        
        {/* Meta Info */}
        {!isSmallBlock && (
          <div className={styles.blockMeta} style={{ paddingLeft: '4px' }}>
            {block.quest.priority && `🎯 ${block.quest.priority}`}
            {block.quest.difficulty && ` • ${
              block.quest.difficulty === 'easy' ? '🌱' :
              block.quest.difficulty === 'medium' ? '⚖️' :
              '🔥'
            }`}
          </div>
        )}

        {/* Time Remaining Badge (Current Task) */}
        {isCurrentTask && timeRemaining && timeRemaining > 0 && (
          <div className={styles.timeRemainingBadge}>
            ⏱️ {timeRemaining} min left
          </div>
        )}

        {/* Completion Circle (Right Side) */}
        <div 
          className={`${styles.completionCircle} ${block.quest.completed ? styles.completedCircle : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            if (!block.quest.completed) onQuestComplete(block.quest.title);
          }}
          title={block.quest.completed ? "Completed" : "Mark complete"}
        >
          {block.quest.completed && <span className={styles.checkmark}>✓</span>}
        </div>

        {/* Resize Handles */}
        {viewMode === 'day' && !isExpanded && !isDropdownOpen && (
          <>
            <div
              className={styles.resizeHandleTop}
              onMouseDown={(e) => {
                e.stopPropagation();
                setResizing({ 
                  type: 'start', 
                  block, 
                  startY: e.clientY, 
                  originalStart: block.startMinutes, 
                  originalDuration: block.duration 
                });
              }}
              title="Drag to adjust start time"
            />
            <div
              className={styles.resizeHandleBottom}
              onMouseDown={(e) => {
                e.stopPropagation();
                setResizing({ 
                  type: 'end', 
                  block, 
                  startY: e.clientY, 
                  originalStart: block.startMinutes, 
                  originalDuration: block.duration 
                });
              }}
              title="Drag to adjust duration"
            />
          </>
        )}
      </div>
    </React.Fragment>
  );
})}
```

Files to update:
1. `QuestTimelineView.tsx` - Add the icon function and update block rendering
2. `QuestTimelineView.module.css` - Add new styles

