# Proofs

- **Never weaken a proof to make it pass.** No skipping or deleting a test, no loosening an assertion, no mocking away the thing under test.
- **Proofs are automated.** A checklist proof is a build, a command (a project command, or, only when the project records no test command, a one-off that changes no file and needs no network or long-running service) or an inspection of the code, never a manual action.
- **Proofs name only known units.** A proof names a unit only when its input gives the name; otherwise it describes the unit by what it does, and whoever verifies it records the unit it checked.
