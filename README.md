# Thinking Canvas

A visual thinking workspace for Jones.

Thinking Canvas is a repo-backed, agent-operable idea workspace that starts like a mind map, but is designed to grow into a richer thinking system over time.

## Why this exists

This project sits at the intersection of three proven patterns:

1. *IdeaCanvas* showed a strong interaction pattern: editable visual nodes with local AI expansion.
2. *trip-planner* proved a critical architecture pattern: Jarvis can directly modify structured app data through SDK-backed operations, instead of only chatting about it.
3. *thinking_with_ai* proved the long-term behavior pattern: Jones continuously writes, grows, and compounds ideas inside repos.

Thinking Canvas combines those ideas into one system:

- visual and editable
- structured and agent-operable
- repo-friendly
- designed for long-term compounding

## Initial product direction

The first version should *not* try to become a full knowledge graph system.

Instead, v0 should focus on a simple but powerful loop:

1. Jones creates or edits a thought node.
2. Jarvis can add, reorganize, or expand nodes directly.
3. The workspace stays visual and easy to manipulate.
4. The underlying data stays structured and durable.

In short:

> Start with a canvas that feels like a mind map.
> Keep the data model flexible enough to grow beyond a pure tree later.

## Design principles

### 1. Human-led, AI-augmented
The human owns direction.
AI helps expand, organize, connect, and maintain structure.

### 2. Structure over chat ephemera
Important thoughts should become durable nodes, not disappear into chat logs.

### 3. Editable by both UI and agent
This is a key requirement.
The data layer must be easy for both Jones and Jarvis to modify.

### 4. Tree-first interaction, graph-ready future
The early UI can feel tree-like because that is easier to understand and build.
But the system should avoid locking itself into a tree-only mental model forever.

### 5. Repo-backed thinking
The project should stay understandable as files, code, and structured data that Jones owns.

## Early scope for v0

### Must have
- visual canvas for thought nodes
- create, edit, delete nodes
- structured persistence layer
- clean README and architecture docs
- agent-friendly data model

### Nice to have soon
- AI expansion from a selected node
- tags / types / metadata on nodes
- import from repo-based knowledge sources
- multiple canvases or spaces
- lightweight cross-links between nodes

### Not for v0
- full graph analytics
- auto-extracted large-scale knowledge graph
- clustering / recommendation engine
- heavy multi-user collaboration

## Proposed architecture

### Frontend
- React + Vite
- canvas-style or SVG-based node view
- minimal editing UX first

### Data model
A first-pass node model might look like this:

```json
{
  "nodes": [
    {
      "id": "root",
      "title": "Thinking Canvas",
      "content": "Main root thought",
      "children": ["n1", "n2"],
      "links": [],
      "tags": ["root"],
      "position": { "x": 0, "y": 0 }
    }
  ]
}
```

This preserves a tree-like interaction path while leaving room for future graph links.

### Persistence options
Possible storage directions:

1. JSON files committed to repo
2. Firebase / Firestore-backed structured sync
3. hybrid approach, local-first UI with remote structured store

For the initial scaffold, keep it simple and local-friendly.

## Suggested folder structure

```text
thinking-canvas/
├── README.md
├── docs/
│   ├── product-direction.md
│   └── architecture-notes.md
├── src/
│   ├── components/
│   ├── lib/
│   └── data/
└── public/
```

## Immediate next steps

1. Create a simple React app scaffold.
2. Define the first node schema clearly.
3. Build a minimal editable canvas.
4. Add a simple sample dataset.
5. Later, connect agent-writable persistence.

## Working definition

Thinking Canvas is not just a note app, and not just a mind map.

It is a personal thinking workspace where ideas can be:
- created
- expanded
- reorganized
- connected
- preserved
- operated on collaboratively by Jones and Jarvis

## Status

This repo is now initialized as the starting point for the project.

More soon.
