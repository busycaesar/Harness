#!/usr/bin/env bash

# Builds the runbook: puts the step data into the template.
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
steps = d.get("steps")
if not isinstance(steps, list):
    sys.exit("build.sh: data has no 'steps' list")
ids = {s.get("id") for s in steps}
for s in steps:
    for key in ("id", "title", "command"):
        if not s.get(key):
            sys.exit("build.sh: a step is missing '%s'" % key)
    for need in s.get("needs") or []:
        if need not in ids:
            sys.exit("build.sh: step '%s' needs unknown step '%s'" % (s["id"], need))
CHECK

template="$here/template.html"
[[ -f $template ]] || { echo "build.sh: missing template at $template" >&2; exit 1; }

# Replace the marker line with the full contents of the data file.
awk -v data="$data" '
  /\/\*@@DATA@@\*\// { while ((getline line < data) > 0) print line; close(data); next }
  { print }
' "$template" > "$out"

echo "$out"
