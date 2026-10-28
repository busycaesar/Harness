# Recorded files

For a file a skill writes from what it finds in the project, and rewrites on each run:

- **Hand-written content.** In a YAML file, every entry marked `source: manual`; in a Markdown rule file, everything under its `## Manual` heading. Set it aside before writing, put it back unchanged, and let it win over anything the scan found for the same thing. The rest of an existing file is replaced.
- **YAML files.** If the existing file cannot be parsed, stop without writing and report the parse error, so no manual entry is lost. Keep the template's header comments; comments go on the line above, never at the end of a line. Put each manual entry back under its same section and key, keeping that section even if the scan found nothing for it. A key the template always has, with nothing found, holds `[]` if it is a list, else the scalar `none found` in place of its value, with no `source`; a key the template marks optional is left out instead. After writing, re-read the file: each discovered entry's `source` exists and shows that evidence (a `[]` or `none found` key is skipped), and each manual entry is present unchanged. Drop or restore any entry that fails.
