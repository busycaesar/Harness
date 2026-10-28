# Visual design

Every map or diagram drawn as a page (architecture, runbook, flow, data, anything else; by a skill or on request) follows this, so they all read as one family. A page adds only what its own content needs.

## File

- **One offline file.** Styles, scripts, libraries and data all inline. No CDN, web font, external stylesheet or fetch; it opens from disk in any browser.
- **Tokens only.** Every colour, shadow and font is a custom property on `:root`, with exactly these names and values. Drawing code (CSS, SVG, canvas, graph-library styles) reads a token through `var()` or `getComputedStyle` and never holds a colour literal. Add a token only for a role none of these covers.

```css
:root {
  --bg: #faf9f7; --grid: #e6e5df; --surface: #ffffff; --sunk: #f2f2ee;
  --text: #17171a; --muted: #63635d; --faint: #95958d; --line: #e2e1db; --edge: #a8a79f;
  --out: #2563eb; --in: #d97706; --match: #dc2626;
  --ok: #2d7a4b; --warn: #94620d; --warn-soft: #fbf2e1; --bad: #ad2f2c; --bad-soft: #fdeceb;
  --cat-1: #4e79a7; --cat-2: #f28e2b; --cat-3: #59a14f; --cat-4: #e15759;
  --cat-5: #76b7b2; --cat-6: #edc948; --cat-7: #b07aa1; --cat-8: #ff9da7;
  --cat-9: #9c755f; --cat-10: #8cd17d; --cat-11: #499894; --cat-12: #d37295;
  --cat-13: #86bcb6; --cat-14: #f1ce63; --cat-15: #a0cbe8; --cat-16: #ffbe7d;
  --shadow: 0 4px 16px rgba(0, 0, 0, 0.07), 0 1px 3px rgba(0, 0, 0, 0.05);
  --shadow-lg: 0 18px 48px rgba(0, 0, 0, 0.16);
  --sans: system-ui, -apple-system, "Segoe UI", sans-serif;
  --mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
}
@media screen and (prefers-color-scheme: dark) {
  :root {
    --bg: #121215; --grid: #232329; --surface: #1c1c21; --sunk: #26262c;
    --text: #ecebe6; --muted: #a4a49c; --faint: #76766e; --line: #33333c; --edge: #6a6a74;
    --out: #60a5fa; --in: #fbbf24; --match: #f87171;
    --ok: #84c79a; --warn: #e0b263; --warn-soft: #322714; --bad: #f0908c; --bad-soft: #371f20;
    --shadow: 0 4px 16px rgba(0, 0, 0, 0.4), 0 1px 3px rgba(0, 0, 0, 0.3);
    --shadow-lg: 0 18px 48px rgba(0, 0, 0, 0.6);
  }
}
```

| Token | Role |
|---|---|
| `--bg`, `--grid` | Page and canvas; the canvas dot grid |
| `--surface`, `--sunk` | Header, panel and cards; inputs, code, chips and hover fills |
| `--text`, `--muted`, `--faint` | Body text and selection; secondary text and headings; hints and keys |
| `--line`, `--edge` | Borders; resting arrows |
| `--out`, `--in` | What the focused thing uses; what uses it |
| `--match` | Search hits |
| `--ok`, `--warn`, `--bad` (`-soft` for their backgrounds) | Done; needs attention; destructive or failing |
| `--cat-1` … `--cat-16` | Categorical palette |

## Colour

- **Groups and kinds** (folders, sections, lanes, owners, node types) take `--cat-1`, `--cat-2`, … in order of first appearance, cycling after 16. A catch-all group (root, other, unknown) takes `--muted`; a destructive or failing kind takes `--bad`. Never choose colours per map.
- A group's colour is its box border, its fill at 6% opacity and its label. Everything inside shares it, so nesting stays legible at any depth.

## Type and sizes

- `--sans` for everything; `--mono` for paths, commands, code and ports. Page 14px/1.45; title 16px weight 650; panel title 15px weight 650; panel section headings 11px uppercase, letter-spacing 0.06em, `--faint` (or the relation colour they list); node labels 11–13px; column headings 20px bold `--muted`.
- Layout sizes (gaps, padding, node widths) are named constants at the top of the script, never numbers inline in drawing code. Radii: 4px chips, 6px controls, 8px code blocks and banners, 12px cards.

## Shapes

- **Group:** a rounded box in its group colour, bold label on top, nested exactly as the data nests. Collapsed, it shows its item count in its label.
- **Card** (an item with content): `--surface`, 1.5px `--line` border, 12px radius, `--shadow`, a 4px stripe of its kind colour down the left; it lifts to `--shadow-lg` on hover.
- **Dot** (an item with no content): filled with its group colour, label below.
- **Start or entry point:** a 3px `--text` ring and a bold label. **Selected:** a `--text` border.

## Arrows

- An arrow points the way things flow: from what is needed to what needs it. At rest it is 1–2px `--edge` with a small triangle head.
- An arrow standing for several links thickens with their count (logarithmic, capped at 7px); the count is in the panel.
- Dashed means not required (teardown, fallback, optional).
- A label sits mid-arrow, 10.5px weight 600, with a `--bg` halo; `--muted`, or a status token when it carries one.

## Focus

- **Hover** a node: arrows to what it uses turn `--out`, arrows from what uses it turn `--in`, both 2.5px and on top.
- **Click** selects: the same colours, everything unconnected fades to 15% opacity, and the panel shows its details. Clicking empty canvas or pressing Escape clears.
- **Search** gives hits a 3px `--match` border and fades the rest; Enter selects the first hit.

## Page

- **Header:** one bar across the top, `--surface` with a `--line` bottom border, padding 10px 16px. Title, a muted one-line summary (counts), then the controls on the right in this order: view tabs when the page has several views, search when there is something to find, `Fit`, the page's own actions, `Reset layout` when the user can move things.
- **Controls** share one style: 13px, padding 5px 10px, 6px radius, 1px `--line` border, `--surface` fill, `--sunk` on hover; the active tab or open view is `--text` fill with `--bg` text. Search is the same box, 220px wide.
- **Canvas:** fills the rest, `--bg` with 1.4px `--grid` dots every 26px. Left-drag pans (`grab`, `grabbing` while dragging), the wheel zooms around the cursor within fixed bounds, `Fit` shows the whole drawing without zooming past 1.5x.
- **Side panel:** on the right, 320px, `--surface` with a `--line` left border. With nothing selected it shows the legend and one-line hints (drag, scroll, click); otherwise the selection's details: title, a `--faint` mono line saying where it lives, then headed sections. Lists link back into the drawing; commands sit in `--sunk` mono blocks with a copy button.
- **Legend:** a 12px swatch for every colour the page uses, with what it means: each group or kind, and the `--out` and `--in` relations.
- **Layout memory:** anything the user rearranges is kept in `localStorage`, keyed on the page's name, a hash of its data and a hash of its default layout, so a redrawn page never inherits stale positions. Every storage call sits in try/catch and the page works without it. `Reset layout` clears it.
- **Print:** dark tokens apply to `screen` only, so print is always light. Header, panel and controls are hidden; a drawing with an order (steps, a sequence) prints as that ordered list, any other prints the canvas.
- **Phone:** below 760px the panel stacks under the canvas at 40% height, the header wraps and search takes the full width. Nothing scrolls the page sideways.
