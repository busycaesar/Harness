# Simplicity

- **Keep it simple (KISS).** Choose the simplest code that meets the requirement. No clever tricks, no extra layers, no configurability nobody asked for.
- **Build only what is needed now (YAGNI).** No speculative features, parameters, hooks or abstractions for cases that do not exist yet.
- **Don't repeat knowledge (DRY).** Each rule, value or piece of logic lives in one place. When the same logic appears a third time, extract it.
- DRY is about knowledge, not text. Code that only looks alike but changes for different reasons stays separate.

## When they conflict

- Prefer a little duplication over the wrong abstraction. Simplicity and YAGNI win over DRY until the repetition is real.
- Remove code that is no longer used instead of keeping it "just in case".
