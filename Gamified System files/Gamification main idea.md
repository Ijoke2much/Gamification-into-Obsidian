
## **Core Features Completed**

- Gamified stat system with EXP, Coins, and Class Points (CP)
    
- Skill Tree visual structure planned (Master > Class > Sub-skill)
    
- Custom stats defined (Muscle, Intelligence, etc.)
    
- YAML layout for stats in `Stats.md`
    
- Shop + Inventory system partially implemented
    
- Class leveling hierarchy defined
    

---

## 📅 **To-Do List for July 25th and Onward**

### 📦 1. **File Setup & Initialization**

-  Create/init file for `Stats.md` if missing
    
-  Auto-generate `Jester.md` master class file
    
-  Init `Classes.md`, `Skills.md`, and optionally `Canvas Skill Tree`
    

---

### 🧠 2. **Task Integration**

-  Integrate with **Tasks** plugin or **Task Genius**
    
-  Add task tags like `#muscle`, `#faith`, `#dexterity`
    
-  When completed, reward EXP, CP, Coins, and specific stat gain
    
-  Optional: Add modal to create categorized tasks more easily
    

---

### 📈 3. **Stat Progression System**

-  Read/write YAML from `Stats.md`
    
-  Add stat gain logic: update `value`, `current`, and level-up
    
-  Handle dynamic level-up requirement increases (e.g., ×1.25 per level)
    
-  Trigger UI notifications or effects when leveling up
    

---

### 🛍 4. **Shop + Inventory System**

-  Finalize Shop tab UI (from `Shop.md`)
    
-  Add Inventory system (`Inventory.md`)
    
-  Enable purchasing, restocking, and item templates (`ShopTemplates.md`)
    
-  Add item effects (e.g. increase stats, buffs, cosmetic perks)
    

---

### 🌳 5. **Skill Tree Visuals (Canvas or UI-based)**

-  Load skill hierarchy into Canvas or custom graph UI
    
-  Allow clicking nodes to view progress / CP levels
    
-  Option to upgrade sub-skills with CP
    
-  Display EXP flow from Sub-skills → Class → Master
    

---

### 🧙 6. **Boss Mode System**

-  Design a markdown or modal-based “Boss Challenge”
    
-  Boss has health / challenge stats (like tasks under pressure)
    
-  Defeat gives high reward: EXP, Coins, rare items
    
-  Track attempts, wins, and damage dealt
    

---

### 📊 7. **Stat Tab**

-  Create sidebar or modal to show all current stats
    
-  Use progress bars or levels per stat
    
-  Optional filters: Mental / Physical / Creative / Spiritual
    

---

### 🧩 8. **Perk or Trait System (Optional)**

-  When stats hit level 5, unlock a passive bonus
    
-  Show perk tree or assignable traits
    
-  Store in separate `Perks.md` or within frontmatter
    

---

### 🛠 Dev Utilities (Optional)

-  Add command: "Sync All Tasks with Stats"
    
-  Add command: "Reset Stats"
    
-  Export player profile as JSON/YAML