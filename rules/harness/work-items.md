# Work items

- **Folder.** A work item (feature, fix, ticket, request) keeps all its documents in `<work-items>/<number>/`, where `<work-items>` is the `work-items` path (see `config.md`) and `<number>` is four digits, zero-padded: `0001`, `0002`, … (more digits once past `9999`).
- **Given a folder.** A skill given a work item folder uses it and never creates another.
- **Creating one.** Create `<work-items>` itself if missing (e.g. `mkdir -p`). Find the highest number among the folders under it (none: `0000`) and create the next number's folder with a command that fails if it already exists, such as `mkdir` without `-p`. If it fails because the folder already exists, try the next number; on any other failure, stop and report it. This claims the number, so agents running at the same time never share a folder.
- **Requirement IDs.** If the source numbers its requirements, criteria or constraints (`R1`, `R1.AC1`, `K1`, …), reuse those IDs exactly. Otherwise assign `R1`, `R2`, … in the order they appear.
