# Errors

- **Fail fast.** Check inputs and preconditions at the start and fail loudly, instead of carrying bad state forward.
- **Validate at the edges.** Check data where it enters the system (user input, API responses, files, environment). Inside, trust the validated types instead of re-checking everywhere.
- **Never swallow errors.** No empty `catch` blocks and no ignored error returns. Handle an error where something useful can be done; otherwise let it propagate.
- **Specific, actionable messages.** An error says what went wrong and with which value, so it can be fixed without a debugger.
- **No silent fallbacks.** Do not replace a failure with a default value unless the requirement says so.
- **Clean up resources** (files, connections, locks) on every path, including errors.
