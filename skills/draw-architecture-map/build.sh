#!/usr/bin/env bash

# Builds an architecture map: puts the graph data and the graph library into the template.
# Data carrying "sections" builds a master map; data carrying "files" builds a file map.
# Usage: build.sh <data.json> <output.html>
# Exit 1 with nothing written on any error; references the map cannot draw are warned on stderr.

set -euo pipefail

[[ $# -eq 2 ]] || { echo "usage: build.sh <data.json> <output.html>" >&2; exit 1; }
data=$1
out=$2
here=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

[[ -f "$data" ]] || { echo "build.sh: no data file at $data" >&2; exit 1; }

python3 - "$data" <<'CHECK' || exit 1
import json, sys
try:
    d = json.load(open(sys.argv[1]))
except Exception as e:
    sys.exit("build.sh: %s is not valid JSON: %s" % (sys.argv[1], e))
if not isinstance(d, dict):
    sys.exit("build.sh: data must be a JSON object")
has_files, has_sections = bool(d.get("files")), bool(d.get("sections"))
if has_files == has_sections:
    sys.exit("build.sh: data must carry exactly one of 'files' or 'sections'")

def warn(msg):
    print("build.sh: warning: " + msg, file=sys.stderr)

# Paths that can be drawn: files on a file map, section paths on a master.
nodes = set(d["files"]) if has_files else {s.get("path") for s in d["sections"]}
for pair in d.get("imports", []):
    if not (isinstance(pair, list) and len(pair) == 2):
        sys.exit("build.sh: import %r is not an [importing, imported] pair" % (pair,))
    missing = [p for p in pair if p not in nodes]
    if missing:
        warn("import %s -> %s not drawn: %s not on this map" % (pair[0], pair[1], ", ".join(missing)))
for f in d.get("entries", []) if has_files else []:
    if f not in nodes:
        warn("entry %s not ringed: not on this map" % f)
tiers = d.get("tiers")
if tiers is not None:
    named = list(d.get("tierOf", {}).values()) + [s.get("tier") for s in d.get("sections", []) if s.get("tier")]
    for t in sorted(set(named) - set(tiers)):
        warn("tier %s is not in 'tiers'; its parts go to Other" % t)
CHECK

template="$here/template.html"
lib="$here/cytoscape.min.js"
[[ -f $template ]] || { echo "build.sh: missing template at $template" >&2; exit 1; }
[[ -f $lib ]] || { echo "build.sh: missing graph library at $lib" >&2; exit 1; }

mkdir -p "$(dirname "$out")"
tmp=$(mktemp "$out.XXXXXX")
trap 'rm -f "$tmp"' EXIT

# Replace each marker line with the full contents of its file.
awk -v data="$data" -v lib="$lib" '
  /\/\*@@DATA@@\*\// { while ((getline line < data) > 0) print line; close(data); next }
  /\/\*@@LIBRARY@@\*\// { while ((getline line < lib) > 0) print line; close(lib); next }
  { print }
' "$template" > "$tmp"
mv "$tmp" "$out"
# mktemp creates the file as 0600; restore the usual map permissions.
chmod 644 "$out"
trap - EXIT

echo "$out"
