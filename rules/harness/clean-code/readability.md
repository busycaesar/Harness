# Readability

- **Meaningful names.** Names say what a thing is or does, without needing a comment. No abbreviations, single letters (outside short loops) or vague words like `data`, `info`, `manager`, `handle`.
- **Small functions.** A function does one thing at one level of abstraction. Long functions are split into well-named steps.
- **Few parameters.** More than three parameters suggests a missing object or a function doing too much. Avoid boolean flags that switch behaviour; write two functions instead.
- **Shallow nesting.** Return early instead of nesting `if` blocks. Keep nesting to two or three levels.
- **No magic values.** Name constants instead of leaving unexplained numbers or strings in the code.
- **Least surprise.** Code does what its name and signature suggest, with no hidden side effects.
- **Comments explain why, not what.** If code needs a comment to say what it does, rename or restructure it instead.
- **Comments go on the line above the code they describe, never at the end of a line.**
- **Match the surrounding code:** its naming, formatting, comment density and idioms.
