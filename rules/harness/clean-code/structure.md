# Structure

- **Separate concerns.** Keep UI, business logic and data access in separate modules. Business logic never knows how it is displayed or stored.
- **Data apart from logic.** Static data (schemas, prompts, large constants, lookup tables) lives in its own module, apart from the logic that uses it.
- **Pure logic apart from I/O.** Calculations and transforms take data in and return new data; reading and writing files, databases or the network happens in separate functions.
- **Public first.** A file opens with what other code calls; its private helpers come after.
- **Isolated packages.** Each package or module is self-contained: it owns its code, exposes a small public surface, and is used only through that surface. Never reach into another package's internals.
- **High cohesion.** Code that changes together lives together. Organise by feature or domain, not by technical kind (no catch-all `utils` or `helpers` that everything depends on).
- **Low coupling.** Keep dependencies between modules few and one-directional. No circular imports.
- **Talk only to direct collaborators (Law of Demeter).** Avoid chains like `a.b().c().d()`; ask the nearest object for what you need.
- **Follow the project's existing structure** before introducing a new pattern, folder or layer.
