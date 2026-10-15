# Structure

- **Separate concerns.** Keep UI, business logic and data access in separate modules. Business logic never knows how it is displayed or stored.
- **Isolated packages.** Each package or module is self-contained: it owns its code, exposes a small public surface, and is used only through that surface. Never reach into another package's internals.
- **High cohesion.** Code that changes together lives together. Organise by feature or domain, not by technical kind (no catch-all `utils` or `helpers` that everything depends on).
- **Low coupling.** Keep dependencies between modules few and one-directional. No circular imports.
- **Talk only to direct collaborators (Law of Demeter).** Avoid chains like `a.b().c().d()`; ask the nearest object for what you need.
- **Follow the project's existing structure** before introducing a new pattern, folder or layer.
