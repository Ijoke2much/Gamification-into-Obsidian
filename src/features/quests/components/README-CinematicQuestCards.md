# 🎮 Cinematic Quest Cards

A Far Cry-inspired quest card system designed for both desktop and mobile with immersive video game aesthetics.

## 🌟 Features

### 🎨 Visual Design
- **Cinematic Backgrounds**: Rich gradients and texture overlays for each quest type
- **Dynamic Theming**: Color schemes based on quest categories (Creative, Tech, Fitness, etc.)
- **Game-Like Aesthetics**: Immersive UI with depth, shadows, and visual effects
- **Priority Indicators**: Color-coded borders and glows for urgency levels

### 📱 Mobile-First Responsive Design
- **Touch-Friendly**: 44px+ touch targets for all interactive elements
- **Swipe Gestures**: Swipe right to complete, left to edit quests
- **Long Press**: Toggle favorites with haptic feedback
- **Double Tap**: Quick expand/collapse for quest details
- **Adaptive Layout**: Optimized spacing and sizing for different screen sizes

### 📊 Progress & Multi-Step Support
- **Visual Progress Bars**: Animated progress indicators for multi-step quests
- **Subtask Tracking**: Interactive checkboxes with completion animations
- **Shimmer Effects**: Dynamic progress bar animations
- **Completion Celebrations**: Full-screen overlay animations

### 🎯 Quest Categories & Theming
- **Creative Quests** (Purple): Writing, journaling, creative tasks
- **Tech Quests** (Blue): Coding, programming, technical tasks  
- **Fitness Quests** (Green): Exercise, health, physical activities
- **Knowledge Quests** (Orange): Learning, studying, educational content
- **Career Quests** (Purple): Business, professional development
- **Urgent Quests** (Red): High priority, time-sensitive tasks

## 🚀 Usage

### Basic Implementation
```tsx
import { MobileCinematicQuestCard } from './components/MobileCinematicQuestCard';

<MobileCinematicQuestCard
  quest={quest}
  onEdit={handleEdit}
  onToggleSubtask={handleToggleSubtask}
  onCompleteQuest={handleCompleteQuest}
  onToggleFavorite={handleToggleFavorite}
  collapsed={false}
/>
```

### Desktop vs Mobile
The `MobileCinematicQuestCard` automatically detects the device and:
- **Mobile**: Adds touch gestures, haptic feedback, and swipe indicators
- **Desktop**: Uses hover effects and mouse interactions

## 🎮 Interactive Features

### Desktop Interactions
- **Hover Effects**: Cards lift and glow on hover
- **Click to Expand**: Tap quest header to show/hide details
- **Button Hover**: Action buttons scale and glow
- **Smooth Animations**: All transitions use cubic-bezier easing

### Mobile Interactions
- **Swipe Right**: Complete quest (green indicator)
- **Swipe Left**: Edit quest (blue indicator)  
- **Long Press**: Toggle favorite (haptic feedback)
- **Double Tap**: Expand/collapse quest details
- **Touch Targets**: All buttons are 44px+ for easy tapping

## 🎨 Visual Themes

### Quest Type Colors
```css
Creative Quest: #9333ea (Purple)
Tech Quest: #0ea5e9 (Blue)
Fitness Quest: #22c55e (Green)
Knowledge Quest: #f59e0b (Orange)
Career Quest: #8b5cf6 (Purple)
Urgent Quest: #ef4444 (Red)
```

### Difficulty Indicators
- **Easy**: ★☆☆ (Green)
- **Medium**: ★★☆ (Orange)  
- **Hard**: ★★★ (Red)

### Priority Visual Cues
- **High Priority**: Red left border + glow
- **Medium Priority**: Orange left border + glow
- **Low Priority**: Green left border + glow

## 📱 Responsive Breakpoints

### Mobile (≤ 768px)
- Larger touch targets (48px+)
- Increased padding and spacing
- Vertical button layout
- Larger progress bars (6px height)
- Simplified metadata layout

### Desktop (> 768px)
- Compact design with hover effects
- Horizontal button layout
- Smaller progress bars (4px height)
- Rich visual effects and animations

### Large Desktop (> 1200px)
- Enhanced spacing and typography
- Larger avatars and icons
- Optimized for mouse interactions

## 🎯 Accessibility Features

### Screen Reader Support
- Semantic HTML structure
- Proper ARIA labels
- Keyboard navigation support

### Visual Accessibility
- High contrast mode support
- Reduced motion preferences
- Color-blind friendly color schemes

### Touch Accessibility
- Minimum 44px touch targets
- Haptic feedback on mobile
- Clear visual feedback for all interactions

## 🔧 Customization

### CSS Custom Properties
```css
.questCard {
  --quest-color: #6b7280;    /* Primary quest color */
  --quest-bg: rgba(107, 114, 128, 0.1);  /* Background opacity */
  --quest-border: rgba(107, 114, 128, 0.3);  /* Border color */
}
```

### Theme Customization
Override the default quest category colors by modifying the `getQuestCategory()` function in `CinematicQuestCard.tsx`.

## 📦 Components

### Core Components
- **`CinematicQuestCard`**: Main quest card component
- **`MobileCinematicQuestCard`**: Mobile-enhanced wrapper with touch gestures
- **`CinematicQuestCardDemo`**: Demo component showcasing all features

### Supporting Files
- **`CinematicQuestCard.module.css`**: Complete styling with responsive design
- **`MobileCinematicQuestCard.tsx`**: Touch interaction wrapper

## 🎮 Demo

Run the demo component to see all quest types and interactions:

```tsx
import { CinematicQuestCardDemo } from './components/CinematicQuestCardDemo';

<CinematicQuestCardDemo />
```

## 🔄 Migration from Old Quest Cards

The new cinematic cards are drop-in replacements for the old `QuestCard` component:

```tsx
// Old
import { QuestCard } from './QuestCard';

// New  
import { MobileCinematicQuestCard } from './MobileCinematicQuestCard';

// Same props interface - no breaking changes!
```

## 🎯 Performance Optimizations

- **CSS Transforms**: Hardware-accelerated animations
- **Reduced Motion**: Respects user preferences
- **Touch Optimization**: Efficient gesture handling
- **Responsive Images**: Optimized for different screen densities

## 🐛 Browser Support

- **Modern Browsers**: Chrome 88+, Firefox 85+, Safari 14+
- **Mobile Browsers**: iOS Safari 14+, Chrome Mobile 88+
- **Fallbacks**: Graceful degradation for older browsers

---

*Built with ❤️ for the ultimate gamified productivity experience!*
