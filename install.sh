#!/usr/bin/env bash

# Installs the Harness into the current project's .claude/ folder.
# Run it from the root of the project that should get the harness.

# Stop on errors, on unset variables, and on failures inside pipelines.
set -euo pipefail

# Where to fetch the harness from. Overridable for testing a fork or branch.
repo=${HARNESS_REPO:-https://github.com/busycaesar/Harness.git}
ref=${HARNESS_REF:-Master}

# Folders the project owns: files here are installed once and never overwritten,
# so local edits survive updates.
project_owned=(config rules/project)

project=$(pwd)
target="$project/.claude"

die() {
  echo "harness: $*" >&2
  exit 1
}

command -v git >/dev/null 2>&1 || die "git is required but not installed."

# Inside a git repo, refuse to run anywhere but its root.
if top=$(git -C "$project" rev-parse --show-toplevel 2>/dev/null); then
  [[ "$top" == "$project" ]] || die "run this from the project root: $top"
fi

# Temporary workspace for the download, removed on exit.
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

# Fetch the file list only: latest commit, no file contents yet.
git clone -q --depth 1 --filter=blob:none --no-checkout -b "$ref" "$repo" "$tmp/repo" || die "could not download the harness from $repo ($ref)."
cd "$tmp/repo"

# Build the skip list from .distignore. .distignore itself is always skipped.
ignore=(.distignore)
if git cat-file -e HEAD:.distignore 2>/dev/null; then
  while IFS= read -r line || [[ -n "$line" ]]; do
    # Strip comments, then surrounding whitespace.
    line=${line%%#*}
    line=${line#"${line%%[![:space:]]*}"}
    line=${line%"${line##*[![:space:]]}"}
    [[ -n "$line" ]] && ignore+=("$line")
  done < <(git show HEAD:.distignore)
fi

# Keep every file that no ignore entry matches, as a path, a folder or a file-name pattern.
files=()
while IFS= read -r path; do
  for pattern in "${ignore[@]}"; do
    [[ "$path" == "$pattern" || "$path" == "$pattern/"* || "${path##*/}" == $pattern ]] && continue 2
  done
  files+=("$path")
done < <(git ls-tree -r --name-only HEAD)

(( ${#files[@]} > 0 )) || die "nothing to install."

# Download the kept files only.
git checkout -q HEAD -- "${files[@]}"

installed=0
kept=0
for path in "${files[@]}"; do
  dest="$target/$path"

  # Never overwrite an existing file in a project-owned folder.
  owned=false
  for dir in "${project_owned[@]}"; do
    [[ "$path" == "$dir/"* ]] && owned=true
  done
  if $owned && [[ -e "$dest" ]]; then
    kept=$((kept + 1))
    continue
  fi

  mkdir -p "$(dirname "$dest")"
  cp "$path" "$dest"
  installed=$((installed + 1))
done

echo "harness: installed $installed file(s) into $target"
(( kept == 0 )) || echo "harness: kept $kept existing project file(s) unchanged"
