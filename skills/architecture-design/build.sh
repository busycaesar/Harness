#!/usr/bin/env bash

# Builds an architecture map: puts the graph data and the graph library into the template.
# Data carrying "sections" builds a master map; data carrying "files" builds a file map.
# Usage: build.sh <data.json> <output.html>

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
if not (d.get("files") or d.get("sections")):
    sys.exit("build.sh: data has neither 'files' nor 'sections'")
CHECK

template="$here/template.html"
[[ -f $template ]] || { echo "build.sh: missing template at $template" >&2; exit 1; }

# Replace each marker line with the full contents of its file.
awk -v data="$data" -v lib="$here/cytoscape.min.js" '
  /\/\*@@DATA@@\*\// { while ((getline line < data) > 0) print line; close(data); next }
  /\/\*@@LIBRARY@@\*\// { while ((getline line < lib) > 0) print line; close(lib); next }
  { print }
' "$template" > "$out"

echo "$out"
