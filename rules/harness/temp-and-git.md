# Git and temporary files

- **No git state changes.** Never stage, commit, stash, branch, reset or check out. Read-only git commands are fine.
- **Temporary files.** Put them in a new folder outside the project: the session's scratchpad when there is one, else the system temp folder. Remove them when done, and confirm they are gone before reporting.
- **Starting diff.** The changes already uncommitted before the work began, as one patch file: the output of `git diff HEAD --binary`, followed by `git diff --no-index --binary /dev/null <file>` for each untracked file `git ls-files --others --exclude-standard` lists. The original code is `HEAD` plus that patch, applied with `git apply` inside a copy, never in the project.
