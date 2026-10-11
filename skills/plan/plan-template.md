# Plan: {Title}

Requirements: {path to the requirements file, or "inline" when they were given in the conversation}

## Source requirements

{Only when the requirements were given inline: paste them verbatim. Omit this section when they come from a file.}

## Requirements covered

- R1 — {one-line summary}
- R2 — {one-line summary}

## Codebase context

- {Relevant module, pattern or convention, and why it matters.} (`path/to/file.ext:line`)

Project commands:

- Build: `{command}`
- Test: `{command}`
- Lint / type check: `{command}`

## Decisions

- D1 — {Technical decision}. Why: {reason}. Decided by: {agent, following `path:line` | user}.

## Waves

```mermaid
flowchart LR
  subgraph W1[Wave 1]
    T1[T1 · {short title}]
  end
  subgraph W2[Wave 2]
    T2[T2 · {short title}]
    T3[T3 · {short title}]
  end
  T1 --> T2
  T1 --> T3
```

| Wave | Tasks  | Runs after |
| ---- | ------ | ---------- |
| 1    | T1     | —          |
| 2    | T2, T3 | Wave 1     |

## Tasks

### T1 — {short title}

- Wave: 1
- Covers: R1, R2
- Files: `path/a.ext` (create), `path/b.ext` (modify)
- Depends on: —
- Approach: {what to change and how, in a few lines; name the pattern to follow}
- Done when: {checkable condition, including the tests this task adds passing}

### T2 — {short title}

...
