# 🎮 Modern Settings UI

A beautiful, card-based settings interface for the Gamification Plugin that organizes settings into logical categories with an intuitive user experience.

## ✨ Features

### 🃏 Card-Based Navigation
- **8 Main Categories**: Currency, Quests, Energy, Penalties, Shop, Tree Rewards, File Paths, and Advanced
- **Visual Hierarchy**: Each category has its own color, icon, and description
- **Click to Navigate**: Click any card to dive into specific settings
- **Breadcrumb Navigation**: Easy navigation back to the main categories

### 🔍 Search & Filter
- **Real-time Search**: Find settings categories instantly
- **Smart Filtering**: Search by name or description
- **Responsive Results**: Results update as you type

### 🎯 Settings Presets
- **5 Built-in Presets**: Beginner Friendly, Hardcore Mode, Focus on Energy, Quest Master, Shop Enthusiast
- **One-Click Apply**: Apply entire preset configurations instantly
- **Visual Preset Cards**: Each preset has its own icon and description

### ✅ Validation & Feedback
- **Real-time Validation**: Settings are validated as you type
- **Error Highlighting**: Invalid settings are clearly marked
- **Warning System**: Helpful warnings for potentially problematic settings
- **Save Protection**: Cannot save with validation errors

### 🎨 Modern Design
- **Gradient Backgrounds**: Beautiful gradient backgrounds for each category
- **Smooth Animations**: Hover effects and transitions throughout
- **Responsive Layout**: Works perfectly on desktop and mobile
- **Glass Morphism**: Modern glass-like effects with backdrop blur

## 🏗️ Architecture

### Components
- `SettingsUI.tsx` - Main settings interface component
- `SettingsUI.module.css` - Modern CSS with animations and responsive design

### Settings Categories

#### 🪙 Currency & Rewards
- XP per task
- Coins per task
- Currency name and symbol
- Leveling formula

#### 📋 Quest System
- Sidebar quest board toggle
- Quest board position
- Auto-refresh settings
- Quest display options

#### ⚡ Energy & Focus
- Energy HUD toggle
- Daily reset hour
- Daily restore values
- Energy management settings

#### ⚠️ Penalties & Consequences
- Failure penalty percentages
- Daily debt caps
- Pomodoro failure settings

#### 🛒 Shop System
- Seasonal shop toggle
- Shop rotation settings
- Special events configuration

#### 🌳 Tree Rewards
- Progressive reward settings
- Item drop configuration
- Tree stage multipliers

#### 📁 File Paths
- All folder and file path configurations
- Image path settings
- Inventory file location

#### 🔧 Advanced
- Quest energy costs by difficulty
- Pomodoro energy costs
- Break recovery settings

## 🚀 Usage

### For Users
1. **Open Settings**: Go to Obsidian Settings → Community Plugins → Gamification
2. **Browse Categories**: Click on any category card to view related settings
3. **Apply Presets**: Click "📋 Presets" to quickly configure with predefined settings
4. **Search**: Use the search bar to find specific settings quickly
5. **Save**: Click "💾 Save Settings" when done

### For Developers
```typescript
import { SettingsUI } from '../features/settings/components/SettingsUI';

// Use in your component
<SettingsUI
  settings={pluginSettings}
  onSettingsChange={(newSettings) => {
    // Handle settings changes
  }}
  onSave={async () => {
    // Save settings
  }}
/>
```

## 🎨 Customization

### Adding New Categories
1. Add to `SETTINGS_CATEGORIES` in `settings.ts`
2. Create a new settings section component
3. Add the section to the main `SettingsUI` component

### Adding New Presets
1. Add to `SETTINGS_PRESETS` in `settings.ts`
2. Include icon, name, description, and settings object

### Styling
- All styles are in `SettingsUI.module.css`
- Uses CSS modules for scoped styling
- Responsive design with mobile-first approach

## 🔧 Technical Details

### Dependencies
- React 18+ with hooks
- CSS Modules for styling
- TypeScript for type safety

### Performance
- Lazy loading of settings sections
- Optimized re-renders with React.memo
- Efficient state management

### Accessibility
- Keyboard navigation support
- Screen reader friendly
- High contrast mode support
- Focus management

## 🐛 Troubleshooting

### Settings Not Loading
- Check browser console for errors
- Verify React and React-DOM are available
- Ensure all imports are correct

### Styling Issues
- Check CSS module imports
- Verify backdrop-filter support
- Test on different browsers

### Validation Errors
- Check settings validation logic
- Verify data types match expected values
- Review error messages for guidance

## 🔮 Future Enhancements

- [ ] Settings import/export functionality
- [ ] Custom preset creation
- [ ] Settings backup/restore
- [ ] Advanced search filters
- [ ] Settings comparison tool
- [ ] Dark/light theme toggle
- [ ] Settings analytics
- [ ] Bulk settings operations
