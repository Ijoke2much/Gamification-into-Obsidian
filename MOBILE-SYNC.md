# Sync plugin to phone

## Open Player on iPhone (no ribbon needed)

1. Tap the **command palette**
2. Type **`Open Player tab`**
3. Run the command — Player / Quests / Habits tabs open in the editor

---

## Two vault folders on Mac (important for iCloud users)

| Folder | Used for |
|--------|----------|
| `~/Obsidian-vaults/Gamified-test-0-plugin` | Local dev / Cursor builds |
| `~/Library/Mobile Documents/iCloud~md~obsidian/Documents/Gamified-test-0-plugin` | **What iPhone syncs via Obsidian iCloud** |

`npm run build` only updates the **local** copy.

### One command for Mac → phone

```bash
npm run build:sync
```

This runs: TypeScript check → esbuild → verify → copy to iCloud vault.

Then wait 1–3 minutes for iCloud to sync to your phone.

---

## Files that must reach your phone

```
.obsidian/plugins/Gamification-into-Obsidian/
  manifest.json
  main.js            (~3–4 MB)
  main.css
  assets/
    trees/
    *.png
```

Game images live in **`assets/`** beside `main.js`.

---

## Checklist after every code change

- [ ] Mac: `npm run build:sync`
- [ ] iCloud vault has `assets/trees/`
- [ ] Wait for iCloud sync on phone
- [ ] Phone: disable → re-enable plugin
- [ ] Command palette → **Open Player tab** works

## Optional: Gamification-Mobile companion

Separate plugin at `.obsidian/plugins/Gamification-Mobile/`. Only enable one primary gamification plugin for daily use unless you know you need both.
