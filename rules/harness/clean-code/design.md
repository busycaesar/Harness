# Design

SOLID, applied to functions and modules as well as classes.

- **Single responsibility.** A function, class or module does one job and has one reason to change. If describing it needs "and", split it.
- **Open for extension, closed for modification.** Add new behaviour by adding code (a new handler, a new implementation), not by growing `if`/`switch` chains in existing code. Apply this only where variation actually exists.
- **Substitutable implementations.** Anything that implements an interface or extends a base works wherever the base is expected, with no special cases for the caller.
- **Small interfaces.** Callers depend only on what they use. Prefer several focused interfaces or parameters over one large one.
- **Depend on abstractions at boundaries.** Core logic receives its dependencies (database, network, clock, file system) from outside instead of creating them, so it can be swapped and tested.
- **Composition over inheritance.** Build behaviour by combining small parts. Use inheritance only for a true "is a" relationship, and keep hierarchies shallow.
