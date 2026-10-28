# Project sections

- **Sections.** A section (app or package) is a folder with its own manifest or task file: any file a package manager, build tool or task runner reads, including a dependency list under any name (e.g. `req.txt` read by `pip install -r`). A container file (Dockerfile, compose file) alone does not make a section. Take the members from the workspace definition when there is one (a workspaces field in the root manifest or a workspace file); otherwise each folder with its own manifest is a section. A project with a single app has one section, with path `.`.
- **A file's section.** A file belongs to the section whose `path` holds it most deeply.
- **Running one test.** Use its section's narrowest recorded test command (`name`, else `file`, else `all`), from that command's `cwd`.
