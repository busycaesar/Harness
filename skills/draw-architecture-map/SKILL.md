---
name: draw-architecture-map
description: "Use when given an architecture data file (a file map carrying `files`, or a master carrying `sections`) and a map path, to render it as one self-contained, offline, interactive HTML map. Renders only: not for listing files, resolving imports, assigning tiers or otherwise analysing a codebase."
user-invocable: false
metadata:
  model-tier: Budget
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

`details` is optional: it maps a file path to a list of `{ "label": "...", "text": "..." }` items, shown in that order in the side panel when the file is selected, above its imports. Text is shown as given, preserving line breaks; the map never derives it.

`importLists` is optional: set to `false`, the side panel leaves out a file's Imports and Imported by lists and shows only its `details`. Arrows and hover highlighting are unchanged.

`tierLabels` is optional: set to `true`, each tier's name is drawn, as a heading over its column or in a gutter left of its band. Left out, tiers are laid out the same but carry no name.

Only `files` is required. Missing `imports` draws no arrows, missing `entries` rings nothing, and missing `tiers` spreads the boxes over a few unnamed columns.

`orientation` chooses how the tiers are laid out. Left out, or any value but `vertical`, draws them as **columns** side by side, which suits a map whose tiers are layers of a stack. Set to `vertical`, it draws each tier as a **band** running across the map, stacked top to bottom, with the tier's name in a gutter on the left when `tierLabels` is set, so the flow reads left to right within each band. Use it when the tiers are stages of a pipeline rather than layers.

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

A data file carrying `sections` is a master; one carrying `files` is an ordinary map; one carrying both or neither is rejected. The data decides which sections exist and what they contain. Never infer them.

Masters nest. A section too large to draw at once arrives as a master of its own, listing its subsections, and the map above points at it exactly as it would point at a file map. Nothing here changes with depth: a master is drawn from `sections` whether it sits over a whole project or over one part of it, and the `url` on a section may lead to either kind.

## Build

Inputs are one or more data files, each with the map path to write it to. Follow the never-assume rule in `.claude/rules/harness/never-assume.md`: if a data file or its map path is missing, stop and ask for it.

For each pair, run [build.sh](build.sh) from this skill's folder:

```
bash <skill folder>/build.sh <data file> <map path>
```

It checks the data, then substitutes it and the embedded graph library ([cytoscape.min.js](cytoscape.min.js)) into [template.html](template.html), creating the map's folder if needed and replacing any map already at that path. The result opens offline in any browser, with no server and no network.

- **Exit non-zero:** nothing was written for that pair. Do not retry with altered data or write the HTML another way; report the error.
- **Warnings** on stderr name references the map cannot draw (an import or entry naming something not on the map, a tier missing from `tiers`). The map is still written; pass each warning on in the report.

Never change or delete a data file, and never hand-write or patch the map HTML; every map comes from `build.sh`.

## Report

Each map path written, in the order given; every warning, under the map it belongs to; and for each failed pair, its data file and the error. Before reporting, confirm every listed path exists and every data file is unchanged.

## Shape

- A file is a **dot**. A folder is a **rounded box** drawn around its files and subfolders, nested exactly as on disk. The map never regroups files and adds no summaries.
- Boxes sit in **tier columns, left to right**, in the order `tiers` gives, or in **tier bands, top to bottom** when `orientation` is `vertical`. A part with no tier falls into a column or band named `Other`.
- A band is a single row: its contents spread across the map rather than wrapping, so the order of the tiers reads as the order of the flow.
- **A column with nothing in it is not drawn.** Draw the columns the parts on this map actually occupy, so a map whose parts are all one tier shows one column. A heading over an empty column tells the reader the project has something it does not.
- A top-level folder is one box, except that a folder holding most of the project is split into its subfolders plus a box of its own loose files. The project root is always split, so its loose files get their own box.
- Inside a tier, the leading boxes come first: entry points, then the boxes that drive the rest (they import many and are imported by few), with the helpers everything imports (config, utilities) last.
- Inside a box, subfolders pack first, largest first, then the files, in rows.
- Rows of boxes alternate direction, so each box stays beside the one before it and the block stays roughly rectangular.

## Arrows

- An arrow runs **from the imported file to the file that imports it**, so it points the way the dependency flows.
- Collapsing a folder aggregates its arrows into one thicker meta-edge between boxes. This is what keeps a large map responsive.

## Look and interaction

The map follows `.claude/rules/harness/visual-design.md`. Specific to this map:

- Each top-level box is a group and takes the next palette colour; root files take `--muted`. The map adds one token of its own, `--mark`, for a dot the reader has marked.
- **Dragging empty space pans**, and so does right or middle drag anywhere, with a `grab` cursor that becomes `grabbing` while panning.
- **Shift with left drag over empty space** selects an area. Left drag on a box moves it, or the current selection. A click without a drag still opens the file or folder under the pointer; clicking a folder collapses or expands it.
- **A two-finger trackpad swipe pans.** A trackpad pinch (a wheel event with `ctrlKey`, or Safari's gesture events) and the mouse wheel zoom around the cursor, between 0.05x and 4x.
- Clicking resolves to the **innermost node under the cursor**: a file before its folder, a subfolder before its parent.
- Header controls: search, `Fit`, `Collapse all`, `Expand all`, `Reset layout`. The side panel lists what the selected file imports and what imports it.
- **Shift-click or alt-click a dot marks it**, and again clears it. `Clear N marks` empties the set and `Copy marks` puts the marked paths on the clipboard, one per line, so a reading of the map can leave the map.
- Dragged positions persist per map in the browser, keyed on the data and the default layout, so a regenerated map never inherits stale positions. Marks are kept under their own key with no layout hash in it, so moving boxes or resetting the layout keeps them; only a change to the data retires them.

## The master map

A master is drawn in the same language as any other map, so the two read as one thing. A section takes the place of a folder box: same tier columns in the same order (a section's column comes from its `tier`), same palette, same packing and alternating rows, same pan, zoom and hover.

What differs:

- A section box is sized by how many files it holds, so relative weight is visible at a glance, and is labelled with that count. A section containing an entry point carries the same ring a file entry point gets.
- There are no dots. A section is the smallest thing on a master.
- An arrow between sections stands for every file import crossing that boundary, drawn with `weights` the way a collapsed folder's meta-edge is drawn: thicker for more imports, with the count in the side panel.
- **Clicking a section opens its `url` in a new tab.** The cursor turns to a pointer over a section that has one. A section with no `url` is inert. Hovering still lights what it imports and what imports it, so the master is readable without leaving it.
- Links are relative, so the master and its sections stay a set that can be moved or shared together.

A section map is an ordinary map and needs nothing special. It holds only its own files and its own internal imports; the imports crossing its boundary live on the master.

## Rules

- Presentation only. Never read the codebase to add or correct a fact; draw the data as given.
- Draw exactly what the data says. Never infer an arrow, a tier, or a grouping the data did not provide.
- Keep it readable at both ends of the range, a handful of files and tens of thousands.
