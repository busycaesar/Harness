---
name: map
description: Draw an interactive map of a project's structure — every file as a dot inside its real folders, with lines showing which file imports which. Writes one self-contained HTML file that opens offline in a browser. Use to get oriented in an unfamiliar codebase.
argument-hint: "[folder to map, default: the whole project]"
---

# Project map

Build one HTML file that shows the project as it is on disk: folders as nested groups, files as dots, and a line from each file to every project file it imports.

The map shows structure only. It adds no summaries, no layers and no grouping of its own: folders are the project's folders, exactly.

Changes no file except the map itself. No git state changes.

## The one rule: never assume

Every line on the map is an import found in the code. If an import could point to more than one file and the codebase does not settle which, leave it off and list it in the report.

## Step 1: Settings

1. Read the `map` path from `.claude/config/paths.yaml`. If the file or key is missing, use `project-map.html` at the project root. An existing map at that path is replaced.
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

## Step 4: Build the map

1. Write the data to a temporary file outside the project:

   ```json
   {
     "project": "<project folder name>",
     "files": ["src/app.ts", "src/lib/db.ts", "README.md"],
     "imports": [["src/app.ts", "src/lib/db.ts"]]
   }
   ```

   `files` holds every listed file, whether or not it imports anything. Each pair in `imports` is `[importing file, imported file]`.
2. Run [build.sh](build.sh) from this skill's folder: `bash <skill folder>/build.sh <data file> <map path>`. It puts the data and the embedded graph library ([cytoscape.min.js](cytoscape.min.js)) into [template.html](template.html).
3. Delete the temporary file.

## Step 5: Report

- The map's path, and that it opens in any browser.
- Counts: files, folders, import lines.
- Each import left off as ambiguous: the file, the import and the candidates.
