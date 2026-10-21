---
description: Work out a project's architecture from its code — every file, which file imports which, where the program starts, which tier (frontend to data) each part belongs to, and whether it needs splitting into sections. The result is an interactive architecture map: one HTML file, or a master map with section maps for a large project. Use to get oriented in an unfamiliar codebase.
argument-hint: "[folder to map, default: the whole project]"
disable-model-invocation: true
---

# Project map

Work out a project's architecture from its code: which files exist, which file imports which, where the program starts, and which tier each part belongs to. Hand those findings to the `architecture-design` skill, which draws them.

This command owns the analysis. It makes no decision about how the map looks.

Writes nothing in the project except the map file or files at the configured path. Its data files go to a temporary location outside the project and are deleted once the map is drawn. No git state changes.

## The one rule: never assume

Every arrow comes from an import found in the code. If an import could point to more than one file and the codebase does not settle which, leave it off and list it in the report.

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

- An import that resolves to a file in the list is an arrow.
- An import that resolves to nothing in the list is an external package: leave it out.

Where a language binds by name rather than by path, resolve it the way that language does, and only when it lands on exactly one file. A C# `using` names a namespace spanning many files, so it settles nothing on its own; the type a file references does, when that type is declared in exactly one file of a namespace the file imports. A name declared in several candidate files is ambiguous: leave it off and report it.

For a large project, split the files by top-level folder across subagents, at most `max_parallel_tasks` at once. Each returns its import pairs and any ambiguous imports. Subagents only read.

## Step 4: Find the entry points

List the files where the program starts: a main guard or main function, the `main`, `bin` or start script in a package manifest, a `CMD` or `ENTRYPOINT` in a Dockerfile, a framework's app or server entry. Each one traces to that evidence.

## Step 5: Assign tiers

The project's main parts are:

- each top-level folder;
- but a folder holding more than half of the project's files is replaced by its subfolders, plus its own direct files under the folder's path. Repeat this for the subfolders.
- the files at the project root, under the key `.`.

The tiers below exist to group what the project actually has. **A tier with nothing in it is left out.** Never carry a tier because it is on this list: a project with no database has no `Data` column, and one that is only a library has neither `Frontend` nor `DevOps`. An empty column is a heading over nothing, and it tells the reader the project has a part it does not have.

Keep those you use in this order:

| Tier | Holds |
|---|---|
| `Frontend` | What users see or interact with: web UI, CLI, chat-bot interfaces. |
| `Backend` | The application behind it: entry points, logic, integrations with outside services, config and utilities. |
| `Data` | Only when the project uses a database or data store (SQL, NoSQL, cache, search index): its schemas, migrations, models and access code. Code that reads and writes plain files (JSON, YAML, CSV on disk) is `Backend`. |
| `DevOps` | CI/CD workflows, build and deploy scripts, containers, and the project's root setup files. |

Assign every part a tier from evidence: the framework or language of its files, what it imports and what imports it. A folder name alone is not evidence; it only counts when the code agrees. A part that fits more than one tier goes where most of its files belong. Decide every part yourself; do not ask.

## Step 6: Decide whether one map can hold it

Answer one question from what you measured: **can a reader take in this project in a single view?**

A map that holds every file of a large project still opens, which is what makes this easy to get wrong. It renders a wall of dots nobody can read, so judge legibility, not whether the file is produced.

Weigh what you found: how many files, how many imports, and how many boxes land in a tier column. Use these as calibration, and decide for yourself in between:

- A few hundred files, with imports in the low thousands, is comfortably one map.
- Many thousands of files, with tens of thousands of imports, is plainly past it. A project of 12,000 files and 42,000 imports is not one map.
- A single part holding most of the project is past it on its own, even when nothing else is.

Say in the report which way you went and the numbers behind it.

**If one map holds it,** go to Step 7 and write one data file.

**If it does not,** divide the project into sections:

1. Prefer natural seams: a top-level part that carries its own manifest (`package.json`, `*.sln` or `*.csproj`, `pyproject.toml`, `go.mod`, `Cargo.toml`) is its own section. Being a monorepo is not the reason to split; it is where the seams are once volume has already decided it.
2. Everything left over becomes one more section, so no file is dropped.

Each section gets its own map. The sections together get a master map.

### Then ask the same question again, of every section

Splitting once is not enough. A section carved out of a large project is often still far too big on its own: a service holding thousands of files does not become legible just because the rest of the repo was taken away from it.

So put each section through Step 6 from the top, exactly as you did the project. A section that cannot be taken in at one view splits in turn, and its own map becomes a master over its subsections rather than a wall of dots.

Inside a section, the seams are one level deeper: the subprojects it contains (each `*.csproj` in a solution, each workspace package), otherwise its top-level folders, with the leftovers gathered into one subsection as before.

**Stop at three levels.** A project splits into sections, a section splits into subsections, and a subsection is always drawn as it is. Past that the clicking costs the reader more than the density does. A subsection still too big at the third level is drawn anyway, and the report says it is dense.

Keep going only while splitting earns something: a section that would divide into one child, or into pieces nearly as large, is better left whole.

### What goes where

- A file belongs to exactly one map: the deepest one that holds it.
- An import between two files on the same map is drawn there.
- An import that crosses a boundary is left off both sides and becomes an arrow on the nearest map that contains both ends, carrying how many imports it stands for. An import between two subsections of one section belongs on that section's master; one between two sections belongs on the project master. Count them and report the total.
- Tiers are assigned once, over the whole project, and every map keeps the tier each part was given.
- **Each map lists only the tiers its own parts use.** The project master may span all four while a single section sits entirely in `Backend`; that section's map names `Backend` alone. Work out `tiers` per map from the parts on it, never by copying the project's list down.

## Step 7: Draw it

Read the input section of the `architecture-design` skill and write each data file in the format it defines, to a temporary location outside the project.

`files` holds every listed file. `tiers` lists only the tiers that have a part on this map, in the table's order. `tiers` and `tierOf` describe this map alone, so a section's data file names its own parts and its own tiers, not the project's.

**One map:** write that file and invoke the `architecture-design` skill with it and the map path.

**Sections:** write one data file per section, holding only that section's files, its own imports, and the entry points that fall inside it. Then write the master, which lists the sections, each naming the map file drawn for it.

Name the section maps beside the master: a master at `project-map.html` puts link-engine at `project-map.link-engine.html`, so the whole set moves together and the links keep working.

Invoke `architecture-design` once per section and once for the master. Delete the temporary files afterwards.

## Step 8: Report

- The map's path, and that it opens in any browser. With sections, the master's path first, then each section map.
- Whether it went to one map or sections, with the numbers behind that judgement.
- Counts: files, folders, imports. With sections, per section as well, plus how many imports cross sections and are therefore only on the master.
- Each entry point with its evidence.
- Each tier with its parts, and the evidence for each part in one line.
- Each import left off as ambiguous: the file, the import and the candidates.
- Any section still too dense to read comfortably.
