# Dataview: quests & tactical loadout

## Default weapon on a quest (frontmatter)

Per-quest YAML above the `#gamified-task` line (or file-level frontmatter) is merged into the quest. Use:

```yaml
battle_weapon: rapier
```

Allowed values match plugin ids: `balanced`, `greatblade`, `rapier`, `ward`, `bulwark`, `tome`, `momentum`, `finisher`.

## Table of quests with loadout hint

```dataview
TABLE battle_weapon AS "Weapon", due AS "Due", xp
FROM "path/to/your/GamifiedTasks.md"
WHERE battle_weapon
```

If `battle_weapon` lives only in **per-quest** YAML blocks, Dataview may not expose it unless the Tasks/Dataview setup indexes those fields. In that case, add the same key to **inline fields** on the task line, e.g. `[battle_weapon:: ward]`, or keep a separate project note with frontmatter you control.

## Active raid state (plugin note)

Tactical progress is stored in **browser `localStorage`** under keys `tactical-battle-<quest id>`. Dataview cannot read `localStorage`. To dashboard “active raids” in notes, you would need a future sync (e.g. plugin writing a small YAML block to a note on save/exit). Until then, use quest `status` / tags you maintain manually.
