#!/usr/bin/env bash

# Builds the project map: puts the graph data and the graph library into the template.
# Usage: build.sh <data.json> <output.html>

set -euo pipefail

[[ $# -eq 2 ]] || { echo "usage: build.sh <data.json> <output.html>" >&2; exit 1; }
data=$1
out=$2
here=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

[[ -f "$data" ]] || { echo "build.sh: no data file at $data" >&2; exit 1; }

# Replace each marker line with the full contents of its file.
awk -v data="$data" -v lib="$here/cytoscape.min.js" '
  /\/\*@@DATA@@\*\// { while ((getline line < data) > 0) print line; close(data); next }
  /\/\*@@LIBRARY@@\*\// { while ((getline line < lib) > 0) print line; close(lib); next }
  { print }
' "$here/template.html" > "$out"

echo "$out"
