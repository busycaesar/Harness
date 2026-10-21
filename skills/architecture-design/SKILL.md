---
name: architecture-design
description: "Renderer. Turns an architecture data file into the interactive project-map HTML. It performs no analysis of its own and will not read a codebase."
user-invocable: false
---

# Architecture map: how it is drawn

Takes an architecture data file and writes one self-contained HTML file.

This skill owns every presentation decision. It owns no analysis: it never lists files, resolves an import, or decides a tier. Whatever the data says is what gets drawn.

## Input

A JSON file in this shape:

```json
{
  "project": "<project folder name>",
  "files": ["src/app.ts", "src/lib/db.ts", "README.md"],
  "imports": [["src/app.ts", "src/lib/db.ts"]],
  "entries": ["src/app.ts"],
  "tiers": ["Frontend", "Backend", "Data", "DevOps"],
  "tierOf": { "web": "Frontend", "src": "Backend", "src/db": "Data", ".": "DevOps" }
}
```

`files` holds every file to draw, whether or not it imports anything. Each pair in `imports` is `[importing file, imported file]`. `entries` names the files where the program starts. `tiers` lists the tier columns in left-to-right order; `tierOf` maps each top-level part's path to its tier, with `.` for the files at the project root.

Only `files` is required. Missing `imports` draws no arrows, missing `entries` rings nothing, and missing `tiers` spreads the boxes over a few unnamed columns.

### Master input

A project too large for one view arrives as several maps: one per section, each a normal data file, plus a master that carries `sections` instead of `files`:

```json
{
  "project": "<project folder name>",
  "sections": [
    { "path": "link-engine", "label": "link-engine", "url": "project-map.link-engine.html",
      "files": 5583, "tier": "Backend", "entries": 2 }
  ],
  "imports": [["link-engine", "link-ui"]],
  "weights": { "link-engine>link-ui": 37 },
  "tiers": ["Frontend", "Backend", "Data", "DevOps"]
}
```

Each section's `url` names the map drawn for it. `imports` pairs section paths the same way it pairs files, `[importing, imported]`; `weights` gives how many file imports each pair stands for.

A data file carrying `sections` is a master; one carrying `files` is an ordinary map. The data decides which sections exist and what they contain. Never infer them.

Masters nest. A section too large to draw at once arrives as a master of its own, listing its subsections, and the map above points at it exactly as it would point at a file map. Nothing here changes with depth: a master is drawn from `sections` whether it sits over a whole project or over one part of it, and the `url` on a section may lead to either kind.

## Build

Run [build.sh](build.sh) from this skill's folder:

```
bash <skill folder>/build.sh <data file> <map path>
```

It substitutes the data and the embedded graph library ([cytoscape.min.js](cytoscape.min.js)) into [template.html](template.html). The result opens offline in any browser, with no server and no network.

Never change or delete the data file.

## Shape

- A file is a **dot**. A folder is a **rounded box** drawn around its files and subfolders, nested exactly as on disk. The map never regroups files and adds no summaries.
- Boxes sit in **tier columns, left to right**, in the order `tiers` gives. A part with no tier falls into a column named `Other`.
- **A column with nothing in it is not drawn.** Draw the columns the parts on this map actually occupy, so a map whose parts are all one tier shows one column. A heading over an empty column tells the reader the project has something it does not.
- A top-level folder is one box, except that a folder holding most of the project is split into its subfolders plus a box of its own loose files. The project root is always split, so its loose files get their own box.
- Inside a tier, the leading boxes come first: entry points, then the boxes that drive the rest (they import many and are imported by few), with the helpers everything imports (config, utilities) last.
- Inside a box, subfolders pack first, largest first, then the files, in rows.
- Rows of boxes alternate direction, so each box stays beside the one before it and the block stays roughly rectangular.

## Arrows

- An arrow runs **from the imported file to the file that imports it**, so it points the way the dependency flows.
- Collapsing a folder aggregates its arrows into one thicker meta-edge between boxes, with width scaled by how many imports it stands for. This is what keeps a large map responsive.
- Hovering a file lights what it **uses** in one colour and what **uses it** in another, and fades everything else.

## Colour

Colours are CSS custom properties on `:root`, with a dark-mode block under `prefers-color-scheme: dark`. Never hardcode a colour in the graph styles; read the token.

| Token | Role |
|---|---|
| `--bg`, `--panel` | Page and panel backgrounds |
| `--text`, `--muted` | Body text, secondary text and tier labels |
| `--border`, `--edge` | Panel borders, and the resting arrow colour |
| `--out` | What the hovered file imports |
| `--in` | What imports the hovered file |
| `--match` | Search hits |

A box takes its colour from its tier, drawn at low background opacity with a stronger border, so nesting stays legible many levels deep.

## Size

Set in graph pixels at the top of the template, and changed there rather than inline:

`DOT 14` · `FILE_H 36` · `COLLAPSED_H 36` · `GAP 20` · `PAD 14` · `LABEL_H 24` · `COLUMN_GAP 200` · `BOX_GAP 50` · `HEADER_H 60`

An entry point draws 4px larger with a 3px ring and a bold label.

## Interaction

- **Left drag anywhere pans**, with a `grab` cursor that becomes `grabbing` while panning. A click without a drag still opens the file or folder under the pointer.
- **Right drag** selects an area over empty space, or moves a box or the current selection.
- **The scroll wheel zooms around the cursor**, between 0.05x and 4x.
- Clicking resolves to the **innermost node under the cursor**: a file before its folder, a subfolder before its parent.
- Header controls: search, `Fit`, `Collapse all`, `Expand all`, `Reset layout`. The side panel lists what the selected file imports and what imports it.
- Dragged positions persist per map in the browser, keyed on the data and the default layout, so a regenerated map never inherits stale positions.

## The master map

A master is drawn in the same language as any other map, so the two read as one thing. A section takes the place of a folder box: same tier columns in the same order, same colour per tier, same packing and alternating rows, same pan, zoom and hover.

What differs:

- A section box is sized by how many files it holds, so relative weight is visible at a glance, and is labelled with that count. A section containing an entry point carries the same ring a file entry point gets.
- There are no dots. A section is the smallest thing on a master.
- An arrow between sections stands for every file import crossing that boundary, drawn with `weights` the way a collapsed folder's meta-edge is drawn: thicker for more imports, with the count in the side panel.
- **Clicking a section opens its `url` in a new tab.** The cursor turns to a pointer over a section that has one. A section with no `url` is inert. Hovering still lights what it imports and what imports it, so the master is readable without leaving it.
- Links are relative, so the master and its sections stay a set that can be moved or shared together.

A section map is an ordinary map and needs nothing special. It holds only its own files and its own internal imports; the imports crossing its boundary live on the master.

## Rules

- Presentation only. If a change needs new facts about the codebase, it belongs in the data file, not here.
- Draw exactly what the data says. Never infer an arrow, a tier, or a grouping the data did not provide.
- The output stays one self-contained file: no CDN, no external stylesheet, no fetch.
- Keep it readable at both ends of the range, a handful of files and tens of thousands.
