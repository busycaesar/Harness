---
name: onboard
description: Draw an interactive map of a project's architecture — every file as a dot inside its real folders, folders arranged in tier columns (frontend to data), with arrows showing which file imports which. Writes one self-contained HTML file that opens offline in a browser. Use to get oriented in an unfamiliar codebase.
argument-hint: "[folder to map, default: the whole project]"
---

# Project map

Build one HTML file that shows the project's architecture: folders as nested boxes, files as dots, an arrow from each file to every project file that imports it, and the folders arranged left to right by tier.

Boxes are the project's folders, exactly; the map never regroups files. It adds no summaries.

Changes no file except the map itself. No git state changes.

## The one rule: never assume

Every arrow on the map is an import found in the code. If an import could point to more than one file and the codebase does not settle which, leave it off and list it in the report.

Every entry point and tier assignment traces to evidence in the code.

## Step 1: Settings

1. Read the `onboard` path from `.claude/config/paths.yaml`. If the file or key is missing, use `project-map.html` at the project root. An existing map at that path is replaced.
2. Read `max_parallel_tasks` from `.claude/config/settings.yaml`. If missing, use 4.
3. If `$ARGUMENTS` names a folder, map only that folder. Otherwise map the whole project.

## Step 2: List the files

- In a git repository, list them with `git ls-files --cached --others --exclude-standard`, then drop any that no longer exist on disk.
- Otherwise, list every file, skipping `.git` and everything `.gitignore` excludes.

Paths are relative to the project root and use `/`.

## Step 3: Find the imports

For every file, find each place where it loads another file: `import`, `require`, `include`, `use`, `from`, `@import`, a `src` or `href` to a local file, and their equivalents in the file's language.

Resolve each one to a project file, the way the project itself resolves it: relative paths, source roots, path aliases in the project's config, module or package names that map to folders, and index or init files. Read the config that defines these; do not guess them.

- An import that resolves to a file in the list is a line on the map.
- An import that resolves to nothing in the list is an external package: leave it out.

For a large project, split the files by top-level folder across subagents, at most `max_parallel_tasks` at once. Each returns its import pairs and any ambiguous imports. Subagents only read.

## Step 4: Find the entry points

List the files where the program starts: a main guard or main function, the `main`, `bin` or start script in a package manifest, a `CMD` or `ENTRYPOINT` in a Dockerfile, a framework's app or server entry. Each one traces to that evidence.

## Step 5: Assign tiers

The map places the project's main parts in tier columns, left to right. The parts are:

- each top-level folder;
- but a folder holding more than half of the project's files is replaced by its subfolders, plus its own direct files under the folder's path. Repeat this for the subfolders.
- the files at the project root, under the key `.`.

The tiers, in this order, using only those the project has:

| Tier | Holds |
|---|---|
| `Frontend` | What users see or interact with: web UI, CLI, chat-bot interfaces. |
| `Backend` | The application behind it: entry points, logic, integrations with outside services, config and utilities. |
| `Data` | Only when the project uses a database or data store (SQL, NoSQL, cache, search index): its schemas, migrations, models and access code. Code that reads and writes plain files (JSON, YAML, CSV on disk) is `Backend`. |
| `DevOps` | CI/CD workflows, build and deploy scripts, containers, and the project's root setup files. |

Assign every part a tier from evidence: the framework or language of its files, what it imports and what imports it. A folder name alone is not evidence; it only counts when the code agrees. A part that fits more than one tier goes where most of its files belong. Decide every part yourself; do not ask.

The map orders the parts inside each tier itself, from the entry points through what they import.

## Step 6: Build the map

1. Write the data to a temporary file outside the project:

   ```json
   {
     "project": "<project folder name>",
     "files": ["src/app.ts", "src/lib/db.ts", "README.md"],
     "imports": [["src/app.ts", "src/lib/db.ts"]],
     "entries": ["src/app.ts"],
     "tiers": ["Frontend", "Backend", "Data", "DevOps"],
     "tierOf": { "web": "Frontend", "src": "Backend", "src/db": "Data", ".github": "DevOps", ".": "DevOps" }
   }
   ```

   `files` holds every listed file, whether or not it imports anything. Each pair in `imports` is `[importing file, imported file]`. `entries` lists the entry points. `tiers` lists the tiers the project has, in the table's order; `tierOf` maps each part's path (`.` for the root files) to its tier.
2. Run [build.sh](build.sh) from this skill's folder: `bash <skill folder>/build.sh <data file> <map path>`. It puts the data and the embedded graph library ([cytoscape.min.js](cytoscape.min.js)) into [template.html](template.html).
3. Delete the temporary file.

## Step 7: Report

- The map's path, and that it opens in any browser.
- Counts: files, folders, imports.
- Each entry point with its evidence.
- Each tier with its parts, and the evidence for each part in one line.
- Each import left off as ambiguous: the file, the import and the candidates.
