# Online SQL ER MVP Implementation Plan

Goal: build the first usable Huisheng Chart MVP that turns MySQL `CREATE TABLE`
DDL into editable ER diagrams for university coursework.

## Scope

- Input: MySQL `CREATE TABLE` statements.
- Output views: Crow's Foot ER and Chen ER.
- Editing: generated nodes can be dragged and edited on a React Flow canvas; edges stay bound to nodes.
- Layout: automatic ELK layout with node-overlap validation and routing settings that reduce edge/node conflicts.
- Exports: Mermaid ER source, Markdown data dictionary, deterministic relationship report, PNG, and SVG.
- Parser behavior: preserve explicit foreign keys; create pending inferred relations for likely `*_id` columns without declared FKs.

## Architecture

- React + Vite + TypeScript frontend.
- `src/domain`: canonical ER model independent from parsing and rendering.
- `src/sql`: MySQL parsing and safe parse result wrapper.
- `src/diagram`: adapters from `ErModel` to React Flow graphs and ELK layout.
- `src/components`: editable canvas, custom nodes, and custom relationship edges.
- `src/export`: Mermaid, Markdown, and image export helpers.

## Reference Decisions

- Use `@xyflow/react` for editable nodes and bound edges.
- Use `elkjs` for automatic layout.
- Use `node-sql-parser` where it is helpful, with a fallback parser for MySQL DDL details that are easier to normalize from raw SQL.
- Use Mermaid only as an export format for Crow's Foot style output.
- Render Chen ER directly with custom React Flow nodes:
  - entity: rectangle
  - attribute: ellipse
  - relationship: diamond
  - cardinality: edge labels

## Task List

1. Scaffold Vite, React, TypeScript, Vitest, and base styles.
2. Define the canonical ER model and sample SQL.
3. Implement MySQL DDL parsing for tables, columns, primary keys, unique keys, comments, foreign keys, and inferred `*_id` relations.
4. Implement Mermaid and Markdown exporters.
5. Implement React Flow graph adapters for Crow's Foot and Chen ER.
6. Implement ELK layout and overlap validation.
7. Build the editable canvas and wire the app UI.
8. Add PNG and SVG image export.
9. Add safe parser error handling in the UI.
10. Run full verification, commit each stable slice, and push to `origin/main`.

## Verification

- `npm install`
- `npm run test`
- `npm run build`
- Browser smoke test on the local Vite URL:
  - sample SQL is visible
  - generate renders Crow's Foot and Chen tabs
  - generated table/entity names are visible
  - dragging nodes keeps relationship edges attached
  - auto layout leaves no detected node overlaps
  - Mermaid export includes `PK` and `FK`
  - data dictionary includes comments
  - PNG and SVG buttons trigger downloads

## Commit Strategy

- Commit the plan first.
- Commit after each stable implementation slice.
- Push all commits after the final verification passes.
