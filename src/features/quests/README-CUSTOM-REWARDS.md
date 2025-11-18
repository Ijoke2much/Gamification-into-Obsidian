# Enhanced Custom Rewards System

The enhanced custom rewards system allows you to create sophisticated, meaningful rewards for your quests that integrate directly with the crafting system and provide powerful effects.

## Features

### 🔨 Crafting Materials
Create custom materials that can be used in the crafting system:
- **Categories**: Herb, Mineral, Essence, Crystal, Organic, Mystical
- **Quality Levels**: Fresh, Normal, Dried, Refined, Masterwork
- **CP Values**: Automatically calculated based on rarity and quality
- **Integration**: Materials appear in your inventory and can be used for crafting

### ⚡ Effect Items
Create consumable items with powerful effects:
- **Buff Effects**: XP/CP/Reward multipliers with durations
- **Instant Rewards**: Immediate coins or XP
- **Artifacts**: Time-based productivity boosts
- **Custom Effects**: Advanced effect strings for power users

### ⚔️ Equipment & Artifacts
Create unique items and artifacts:
- **Equipment**: Weapons, armor, tools
- **Artifacts**: Special items with unique properties
- **Custom Icons**: Choose from hundreds of icons
- **Rarity System**: Common to Legendary with visual indicators

## How to Use

### Desktop
1. Open the Quest Modal (Create or Edit Quest)
2. Scroll to the "🎁 Custom Rewards" section
3. Click "✨ Create Custom Reward"
4. Choose your reward type and configure properties
5. Preview your reward and click "Create Reward"

### Mobile
The interface is fully optimized for mobile with:
- Touch-friendly buttons and inputs
- Responsive layout
- Simplified icon selection
- Easy-to-use dropdowns

## Examples

### Study Session Material Reward
```
Type: Crafting Material
Name: "Focused Mind Crystal"
Category: Essence
Quality: Refined
Rarity: Rare
Description: "Crystallized essence of deep concentration"
```

### Programming Boost Effect
```
Type: Effect Item
Name: "Code Optimizer Potion"
Effects: ["buff:xp;mult=1.3;dur=2h"]
Rarity: Uncommon
Description: "Enhances focus for coding tasks"
```

### Long-term Project Reward
```
Type: Crafting Material
Name: "Persistence Gem"
Category: Crystal
Quality: Masterwork
Rarity: Epic
Description: "Forged through dedication and perseverance"
```

## Integration Points

### Quest Completion
- Enhanced rewards are processed when quests are completed
- Materials are automatically added to the crafting system
- Effect items are added to inventory for immediate use
- Visual notifications show what was earned

### Crafting System
- Custom materials appear in crafting recipes
- Quality affects crafting success rates
- Rarity determines material value and effectiveness
- Materials can be combined with existing crafting items

### Inventory Management
- All custom rewards appear in the main inventory
- Proper categorization and filtering
- Rarity-based visual styling
- Effect tooltips and descriptions

## Advanced Features

### Effect Syntax
For power users, custom effect strings support:
- `buff:xp;mult=1.5;dur=1h` - 50% XP boost for 1 hour
- `coins:+100` - Immediate 100 coins
- `artifact:Study session:60:education` - 60-minute study artifact
- `debuff:xp;mult=0.8;dur=30m` - Temporary XP penalty

### Quality Multipliers
- **Fresh**: 1.5x (Recently gathered)
- **Normal**: 1.0x (Standard quality)
- **Dried**: 0.8x (Aged, unique properties)
- **Refined**: 1.3x (Processed for purity)
- **Masterwork**: 2.0x (Exceptional quality)

### Rarity Colors
- **Common**: Gray (#6b7280)
- **Uncommon**: Green (#10b981)
- **Rare**: Blue (#3b82f6)
- **Epic**: Purple (#8b5cf6)
- **Legendary**: Orange (#f59e0b)

## Tips for Effective Rewards

1. **Match the Quest**: Create rewards that thematically match your quest
2. **Progressive Difficulty**: Higher difficulty quests should have better rewards
3. **Long-term Value**: Materials are great for ongoing progression
4. **Immediate Impact**: Effect items provide instant gratification
5. **Personal Meaning**: Create rewards that motivate you personally

## Backward Compatibility

The system maintains full backward compatibility:
- Legacy custom rewards still work
- Quick-add functionality preserved
- Existing quest metadata unchanged
- Gradual migration supported

## Mobile Considerations [[memory:3236005]]

The mobile interface includes:
- Simplified reward type selection
- Touch-optimized controls
- Responsive preview cards
- Streamlined effect selection
- Voice-to-text support (where available)

## Future Enhancements

Planned improvements include:
- Recipe fragment rewards
- Set bonuses for related materials
- Seasonal/themed reward templates
- Achievement integration
- Reward sharing between users
