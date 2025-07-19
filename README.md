# Gamification into Obsidian Plugin

## 🎮 Quickstart Guide

1. **Install the Plugin**

    - Place the plugin folder in your vault's `.obsidian/plugins/` directory.
    - Enable the plugin in Obsidian's settings under "Community Plugins."

2. **Initial Setup**

    - On first load, a sidebar tab will appear with a custom dropdown menu for navigation.
    - Tabs include: Player, The Slop Shop, Quest, Stats, and Achievements.
    - Use the dropdown (with icons) to switch between tabs.

3. **The Slop Shop (Shop Tab)**

    - Access the in-game shop, now called **The Slop Shop**.
    - Buy items using coins earned from quests and achievements.
    - (More shopkeeper personality and daily deals coming soon!)

4. **Quest Tab (formerly Task Tab)**

    - Create and manage quests (tasks) for yourself.
    - Click the sword icon in the dropdown to access the Quest tab.
    - Add new quests, assign skills, XP, coins, and more.
    - (Quest list, completion, and progress tracking coming soon!)

5. **Using the Inventory**

    - Click the inventory button in the sidebar to open your inventory modal.
    - Add, view, or remove items as you progress.

6. **Skill Tree (Optional)**

    - Create a Canvas file (e.g., `SkillTree.canvas`) to visually map your skills and stats.
    - Link notes for each stat and skill for easy navigation.

7. **Leveling Up**

    - Earn XP by completing quests or achievements.
    - When you reach the XP threshold, your level increases and the progress bar resets.

8. **Settings & Customization**
    - Access plugin settings to customize XP/coin rewards, player name, and more (if available).

---

## 📝 How to Use the Gamified Features

-   **Custom Tab Navigation:**  
    Use the dropdown at the top of the sidebar to switch between Player, The Slop Shop, Quest, Stats, and Achievements tabs. Each tab has its own icon (including a sword for Quest).

-   **Quest Management:**  
    In the Quest tab, create new quests by filling out the form. Assign skills, XP, coins, and optional priority/difficulty. (Quest list and completion coming soon.)

-   **Shop (The Slop Shop):**  
    Buy items with coins. More features and personality for the shopkeeper are planned.

-   **Track Your Progress:**  
    View your XP, coins, and level in the Player tab at any time.

-   **Inventory Management:**  
    Add items you earn or unlock. Click items for details.

-   **Skill Tree Navigation:**  
    Use the Canvas or linked notes to visualize and plan your skill growth.

-   **Achievements:**  
    Unlock achievements by reaching milestones (e.g., level up, mastering a skill). (Coming soon.)

-   **Customization:**  
    Adjust settings to fit your play style (XP rates, player name, etc.).

---

## ⚙️ Developer Notes

-   **React Version:** Uses React 17 for compatibility with Obsidian’s environment.
-   **Bundling:** `react` and `react-dom` are marked as externals in the build config.
-   **TypeScript:** Use `@types/react@17` and `@types/react-dom@17` for type safety.
-   **Known Issues:** React 18+ APIs (like `createRoot`) are not supported in the main plugin UI. Use `ReactDOM.render` and `ReactDOM.unmountComponentAtNode`.

---

## 💡 Tips

-   Use tags and skills consistently for best results.
-   Regularly check your progress and inventory to stay motivated.
-   Expand your skill tree as you grow!

---

## 🚧 Feature Roadmap

-   [x] Custom dropdown tab navigation with icons
-   [x] The Slop Shop (shop tab)
-   [x] Quest tab (task creation)
-   [ ] Quest list, completion, and progress tracking
-   [ ] Achievements system
-   [ ] Shopkeeper personality and daily deals
-   [ ] Inventory management improvements
-   [ ] Theming and performance optimizations

Feedback and contributions welcome!
