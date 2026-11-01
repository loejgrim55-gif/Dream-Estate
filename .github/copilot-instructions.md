# Dream-Estate — Copilot Repository Instructions

## Product identity

Dream-Estate is a modern, shared 3D property exploration and design platform for two equal owners. Both owners should be able to create, explore, edit, save, and manage properties.

The product direction is modern, minimalist, architectural, and approachable. It should feel like a polished architecture and interior-design product, not a generic dashboard or a static 3D showcase.

## Verified starting point

Treat the repository as the source of truth. The current application is a React 19 + TypeScript + Vite frontend with Tailwind CSS v4 and an imperative Three.js scene.

The current implementation includes a procedurally constructed, hard-coded estate scene, orbit/plan/walk camera modes, keyboard movement, mouse look, room selection, raycast interaction, roof visibility, cinematic orbit, and visual settings for finishes, lighting, time, weather, and season.

Important limitations in the starting implementation:
- Scene content is hard-coded rather than generated from a saved property document.
- Settings are in memory and reset on reload.
- There is no authentication, database, cloud persistence, project sharing, or collaboration layer.
- There is no general-purpose visual object editor or editable architectural geometry.
- Walk movement is not constrained by collision geometry.
- The current Plan view is a perspective camera view, not a true orthographic floor plan.
- Furniture image paths currently need Vite-safe asset handling.
- Three.js resources need deliberate lifecycle and disposal management.

These are baseline observations, not permanent assumptions. Reinspect the code before relying on them; the repository may have changed.

## Architecture rules

1. Preserve the existing React, TypeScript, Vite, Tailwind, and Three.js foundation unless there is a demonstrated reason to change it.
2. The current scene is built imperatively with Three.js. Do not migrate it wholesale to React Three Fiber just because that library is familiar. First identify boundaries, benefits, migration cost, and a reversible incremental path.
3. Keep the existing working scene and controls functional while extracting modules.
4. Separate domain data, transient UI/editor state, rendering, and backend services.
5. The Explore experience and Studio editor must operate on the same serializable property/scene document.
6. Never persist live Three.js objects. Persist validated, serializable records such as stable object IDs, object types or asset references, transforms, material parameters, and metadata.
7. Avoid speculative abstractions and unnecessary dependencies. Explain why a dependency is needed before adding it.
8. Do not assume a backend exists. Add Supabase or another service only as an explicitly planned milestone.

## Product areas

Build toward four product areas:
- Discover: browse and find properties.
- Explore: navigate a property in a 3D environment.
- Studio: visually create and customise property scenes.
- My Properties: manage drafts, saved properties, shared projects, and versions.

## 3D engineering standards

- Use delta time for movement; do not make movement frame-rate dependent.
- Keep camera controls, keyboard input, raycasting, and UI interaction coordinated.
- Add collision and navigation bounds before describing free-walk as complete.
- Reuse geometries and materials where appropriate.
- Dispose of geometries, materials, textures, renderers, and event listeners according to clear ownership and lifecycle rules.
- Avoid repeated texture/material allocation during setting changes.
- Profile before optimising; consider draw calls, shadows, pixel ratio, texture size, instancing, and mobile GPU limits.
- Provide graceful handling for WebGL/context failures and reduced-motion preferences where appropriate.
- Use GLTF/GLB only when a real asset pipeline is introduced; do not invent model files or pretend placeholders are production assets.

## Studio/editor standards

Develop the editor incrementally:
1. Scene document and validation.
2. Selectable objects with stable IDs.
3. Move, rotate, and scale controls.
4. Furniture/asset placement.
5. Material and colour editing.
6. Undo/redo.
7. Save, reload, and preview in Explore.

Every visible control must perform its advertised action. Label prototypes and incomplete controls honestly.

## Shared ownership and future backend

Both owners have equal project authority. Do not hard-code one person as the sole editor.

When backend work is approved:
- Use authenticated user identities.
- Enforce access in backend policies, not only in the UI.
- Use project membership to scope reads, writes, uploads, and realtime channels.
- Support two owner memberships where appropriate.
- Keep service-role credentials server-side.
- Validate scene documents and uploaded assets.
- Preserve version history; restore by creating a new version rather than destroying prior history.

## Development workflow

For each task:
1. Inspect the relevant files and current implementation.
2. State the intended behaviour and affected modules for significant work.
3. Make the smallest coherent change.
4. Preserve existing behaviour unless the task explicitly changes it.
5. Run relevant checks: TypeScript/lint, tests if present, and build when appropriate.
6. Report changed files, checks actually run, results, and remaining limitations.

Do not claim a test, build, feature, or deployment succeeded unless it was actually verified.

## Safety

Do not delete major functionality, overwrite user work, change production data, perform destructive migrations, expose secrets, or deploy without explicit approval. Do not commit credentials or private data.

Communicate in clear language. Explain consequential trade-offs without unnecessary jargon. Ask a focused question when a requirement is ambiguous and materially affects architecture.
