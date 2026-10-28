#!/usr/bin/env bash

# Builds the runbook: puts the route data into the template.
# Usage: build.sh <data.json> <output.html>
# Exit 1 with nothing written on any error.

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
routes = d.get("routes")
if not isinstance(routes, list):
    sys.exit("build.sh: data has no 'routes' list")
names = set()
for r in routes:
    name = r.get("name")
    if not name:
        sys.exit("build.sh: a route is missing 'name'")
    if name in names:
        sys.exit("build.sh: two routes are named '%s'" % name)
    names.add(name)
    steps = r.get("steps")
    if not isinstance(steps, list):
        sys.exit("build.sh: route '%s' has no 'steps' list" % name)
    ids = {s.get("id") for s in steps}
    for s in steps:
        for key in ("id", "title", "command"):
            if not s.get(key):
                sys.exit("build.sh: a step in route '%s' is missing '%s'" % (name, key))
        for need in s.get("needs") or []:
            if need not in ids:
                sys.exit("build.sh: step '%s' in route '%s' needs unknown step '%s'" % (s["id"], name, need))
CHECK

template="$here/template.html"
[[ -f $template ]] || { echo "build.sh: missing template at $template" >&2; exit 1; }

mkdir -p "$(dirname "$out")"
tmp=$(mktemp "$out.XXXXXX")
trap 'rm -f "$tmp"' EXIT

# Replace the marker line with the full contents of the data file.
awk -v data="$data" '
  /\/\*@@DATA@@\*\// { while ((getline line < data) > 0) print line; close(data); next }
  { print }
' "$template" > "$tmp"
mv "$tmp" "$out"
# mktemp creates the file as 0600; restore the usual runbook permissions.
chmod 644 "$out"
trap - EXIT

echo "$out"
