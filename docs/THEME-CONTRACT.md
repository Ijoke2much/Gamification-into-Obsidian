# Theme Contract

New visual themes should define the semantic `--go-*` tokens first. Legacy `--pixel-*` and `--system-*` tokens are still supported for older surfaces, but new and migrated UI should read from this contract.

## Core Surface Tokens

- `--go-bg`: root/background color.
- `--go-panel`: primary panel surface.
- `--go-panel-strong`: stronger/deeper panel surface.
- `--go-card`: card fill for raised content.
- `--go-card-soft`: softer card fill for nested areas.
- `--go-screen-bg`: layered background for modal/system screens.
- `--go-screen-overlay`: optional scanline/static overlay.
- `--go-static-opacity`: opacity for overlay/static effects.

## Text And Accent Tokens

- `--go-text`: normal readable text.
- `--go-text-bright`: high-emphasis text and titles.
- `--go-muted`: secondary helper text.
- `--go-border`: default border.
- `--go-border-strong`: highlighted border.
- `--go-accent`: main interactive/accent hue.
- `--go-accent-soft`: translucent accent fill.
- `--go-gold`: rank, level, and premium emphasis.
- `--go-success`, `--go-warning`, `--go-danger`: state colors.

## Progress Tokens

- `--go-progress-track`: generic progress track.
- `--go-progress-fill`: generic progress fill.
- `--go-progress-fill-strong`: generic progress end/highlight.
- `--go-progress-glow`: generic progress glow.
- `--go-cp-progress-fill`: CP-specific fill.
- `--go-cp-progress-fill-strong`: CP-specific end/highlight.
- `--go-cp-progress-glow`: CP-specific glow.
- `--go-exp-progress-fill`: EXP-specific fill.
- `--go-exp-progress-fill-strong`: EXP-specific end/highlight.
- `--go-exp-progress-glow`: EXP-specific glow.
- `--go-exp-text`: numeric CP/EXP value text.

## Typography And Shape

- `--go-font-ui`: main UI font.
- `--go-font-display`: display/title font.
- `--go-font-body`: body/notice font.
- `--go-radius`: default radius for theme-aware components.
- `--go-shadow`: strong theme shadow/glow.
- `--go-shadow-soft`: subtle theme shadow/glow.

## Theme Development Checklist

1. Define the `--go-*` tokens in the preset.
2. Confirm legacy aliases still resolve through `visualThemeManager`.
3. Check the Appearance settings contract preview.
4. Check Player/Profile, Stats modal, Skill Realm, and System resource bars.
5. Run `npm run build`.

