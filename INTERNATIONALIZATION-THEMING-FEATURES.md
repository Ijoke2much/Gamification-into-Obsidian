# 🌍🎨 Internationalization & Theming Features

## ✅ **What's Been Implemented**

### 🌍 **Internationalization (i18n)**
- **Locale Detection**: Automatically detects user's browser locale
- **Date/Time Formatting**: Locale-aware date and time formatting
- **Number Formatting**: Regional number formatting (commas, decimals, etc.)
- **Currency Formatting**: Locale-specific currency display
- **Translation System**: Extensible translation key system
- **Relative Time**: "2 hours ago", "in 3 days" formatting

### 🎨 **Theming System**
- **Dark/Light Mode**: Auto, light, or dark mode selection
- **Accent Colors**: Customizable primary accent color
- **Color Palettes**: Predefined palettes (Default, Ocean, Forest, Sunset)
- **Accessibility**: Color-blind friendly options and high contrast mode
- **CSS Variables**: Automatic CSS custom property generation
- **Obsidian Integration**: Respects Obsidian's theme changes

## 🚀 **How to Use**

### **Accessing the Settings**
1. Go to **Obsidian Settings** → **Community Plugins** → **Gamification**
2. Look for the new **"Appearance & Localization"** section
3. Choose between **Theming** and **Internationalization** tabs

### **Theming Options**
- **Theme Mode**: Auto (follows Obsidian), Light, or Dark
- **Accent Color**: Pick your favorite color with the color picker
- **Color Palette**: Choose from 4 beautiful predefined palettes
- **Accessibility**: Enable color-blind friendly or high contrast modes

### **Internationalization Options**
- **Language**: Select from 6 supported locales (en-US, en-GB, de-DE, fr-FR, es-ES, ja-JP)
- **Date Format**: Short, Medium, Long, or Full date display
- **Time Format**: Short, Medium, or Long time display
- **Number Format**: Standard, Scientific, or Engineering notation
- **Currency Format**: Standard or Accounting format

## 🔧 **Technical Implementation**

### **Safe Design Principles**
- **Non-Intrusive**: Won't interfere with Obsidian's core functionality
- **Graceful Fallbacks**: Falls back to safe defaults if anything fails
- **Error Handling**: Comprehensive error handling and logging
- **Performance**: Lightweight and efficient implementation

### **Files Added**
```
src/shared/utils/
├── i18n.ts                    # Internationalization service
├── theming.ts                 # Theming service
└── integrationExample.ts      # Usage examples

src/features/settings/components/
├── AppearanceSettings.tsx     # Settings UI component
└── AppearanceSettings.css     # Styling for settings

src/core/
└── settings.ts                # Updated with new settings
```

## 📝 **Usage Examples**

### **Using i18n in Components**
```typescript
import { t, formatDate, formatNumber, formatCurrency } from '../shared/utils/i18n';

// Translation keys
const title = t('questBoard');
const description = t('questDescription');

// Locale-aware formatting
const formattedDate = formatDate(new Date());
const formattedNumber = formatNumber(1234.56);
const formattedCurrency = formatCurrency(100, 'USD');
```

### **Using Theming in Components**
```typescript
import { theming, getTheme } from '../shared/utils/theming';

// Get current theme
const theme = getTheme();

// Apply theme-aware CSS
const styles = {
  backgroundColor: 'var(--gamification-background)',
  color: 'var(--gamification-text)',
  borderColor: 'var(--gamification-primary)'
};
```

### **CSS Integration**
```css
.quest-card {
  background-color: var(--gamification-background);
  color: var(--gamification-text);
  border: 1px solid var(--gamification-primary);
}

.quest-card.completed {
  background-color: var(--gamification-success);
}
```

## 🌍 **Supported Locales**

| Locale | Language | Date Format | Time Format | Number Format |
|--------|----------|-------------|-------------|---------------|
| en-US  | English (US) | 12/25/2024 | 3:30 PM | 1,234.56 |
| en-GB  | English (UK) | 25/12/2024 | 15:30 | 1,234.56 |
| de-DE  | German | 25.12.2024 | 15:30 | 1.234,56 |
| fr-FR  | French | 25/12/2024 | 15:30 | 1 234,56 |
| es-ES  | Spanish | 25/12/2024 | 15:30 | 1.234,56 |
| ja-JP  | Japanese | 2024/12/25 | 15:30 | 1,234.56 |

## 🎨 **Color Palettes**

### **Default Palette**
- Primary: #667eea (Blue)
- Secondary: #764ba2 (Purple)
- Success: #10b981 (Green)
- Warning: #f59e0b (Amber)
- Error: #ef4444 (Red)

### **Ocean Palette**
- Primary: #0ea5e9 (Sky Blue)
- Secondary: #06b6d4 (Cyan)
- Calming blues and teals

### **Forest Palette**
- Primary: #059669 (Forest Green)
- Secondary: #0d9488 (Teal)
- Natural greens and earth tones

### **Sunset Palette**
- Primary: #f97316 (Orange)
- Secondary: #8b5cf6 (Purple)
- Warm oranges and purples

## ♿ **Accessibility Features**

### **Color-Blind Friendly**
- Optimized color combinations
- High contrast alternatives
- Pattern-based differentiation

### **High Contrast Mode**
- Maximum contrast ratios
- Enhanced visibility
- Better readability

### **Reduced Motion**
- Respects system preferences
- Disables animations when requested
- Smooth, accessible transitions

## 🔄 **Migration Guide**

### **For Existing Components**
1. **Import the utilities**:
   ```typescript
   import { t, formatDate, formatNumber } from '../shared/utils/i18n';
   import { theming } from '../shared/utils/theming';
   ```

2. **Replace hardcoded strings**:
   ```typescript
   // Before
   const title = "Quest Board";
   
   // After
   const title = t('questBoard');
   ```

3. **Use CSS custom properties**:
   ```css
   /* Before */
   .component { background: #ffffff; color: #000000; }
   
   /* After */
   .component { background: var(--gamification-background); color: var(--gamification-text); }
   ```

## 🐛 **Troubleshooting**

### **Common Issues**
1. **Settings not saving**: Check that you're using the correct settings structure
2. **Theme not applying**: Ensure CSS custom properties are being used
3. **Locale not changing**: Verify the locale is supported and properly set

### **Debug Mode**
Enable console logging to see what's happening:
```typescript
// Check current locale
console.log('Current locale:', i18n.getLocale());

// Check current theme
console.log('Current theme:', getTheme());
```

## 🚀 **Future Enhancements**

### **Planned Features**
- [ ] More language translations
- [ ] Custom color palette creation
- [ ] Theme import/export
- [ ] Advanced accessibility options
- [ ] RTL (Right-to-Left) language support
- [ ] Timezone support
- [ ] Custom date/time formats

### **Contributing**
To add new translations or themes, see the `integrationExample.ts` file for detailed examples.

## 📊 **Performance Impact**

- **Minimal**: Lightweight implementation with minimal performance impact
- **Lazy Loading**: Features only load when needed
- **Caching**: Efficient caching of formatted values
- **Memory Efficient**: Clean memory management with proper cleanup

---

**Note**: These features are designed to be safe and non-intrusive. They won't interfere with Obsidian's core functionality and include comprehensive error handling to ensure stability.
