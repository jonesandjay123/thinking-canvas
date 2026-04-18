# Architecture Notes

## v0 recommendation
- Keep the frontend lightweight
- Keep the data model explicit and inspectable
- Start local-first
- Do not overbuild graph logic yet

## Data model direction
Recommended starting entities:
- Node
- Canvas
- Link (future-ready, optional at first)

## Key constraint
Jarvis must be able to read and write the underlying structure reliably without fragile UI automation.

## Implication
The persistence layer should stay API-friendly and file-friendly.

## Evolution path
- v0: local structured node tree with positions
- v1: agent actions and richer metadata
- v2: cross-links and graph behavior
- v3: auto-discovered relationships from corpus inputs
