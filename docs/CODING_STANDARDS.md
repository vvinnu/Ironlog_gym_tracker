# IronLog Coding Standards

**Version:** 1.0  
**Stack:** JavaScript, React, Vite, Supabase  
**Scope:** All new code and incremental refactoring

## 01. Core principles

- Preserve existing behavior during refactoring. Do not combine feature additions with structural changes.
- Prefer readable code and small, cohesive modules over clever or compressed expressions.
- Use JavaScript and JSX; do not introduce TypeScript during this refactoring phase.
- Refactor one focused responsibility at a time, build, and test before proceeding.
- Do not change the database schema or run SQL without explicit approval.

## 02. Project organization

### 02.01 Feature ownership

Organize application-specific code by feature when moving it out of `App.jsx`:

- `src/features/auth/` — authentication and session UI/logic
- `src/features/workouts/` — workout logging, history, and previous performance
- `src/features/exercises/` — exercise library and creation
- `src/features/bodyweight/` — bodyweight entries and trends
- `src/features/progress/` — training metrics and charts

Keep shared UI in `src/components/ui/`, cross-feature utilities in `src/utils/`, and shared Supabase configuration in `src/supabase.js` (or a future documented equivalent). These are target locations, not directories that must exist immediately.

### 02.02 Module boundaries

- React components render UI and coordinate interactions.
- Feature hooks manage feature state and lifecycle when extraction is useful.
- Services encapsulate Supabase reads/writes and RPC calls.
- Pure utilities transform data without React state, browser storage, or network calls.
- Avoid circular imports and unnecessary cross-feature dependencies.
- Review components around 200–300 lines for possible extraction; this is a guideline, not a hard limit.

## 03. Naming conventions

| Item | Convention | Example |
| --- | --- | --- |
| React component file | PascalCase `.jsx` | `WorkoutLogger.jsx` |
| React component/function | PascalCase | `WorkoutLogger` |
| Service/utility file | camelCase `.js` | `workoutService.js` |
| Hook file/function | `use` + PascalCase | `useWorkoutHistory.js` |
| Function/variable | descriptive camelCase | `getPreviousPerformance` |
| Constant | camelCase or UPPER_SNAKE_CASE for true constants | `draftStorageKey`, `MAX_SETS` |
| CSS class | descriptive kebab-case | `ironlog-set-row` |
| Documentation file | uppercase descriptive name | `ARCHITECTURE.md` |

Use terminology consistently: `exerciseId`, `workoutId`, `sets`, `completedWorkouts`, and `previousPerformance` in JavaScript; retain database field names such as `exercise_id` at database boundaries.

## 04. Numbered comment system

### 04.01 File header

Add a concise header to substantial source modules. Include responsibility and meaningful relationships, not an exhaustive list of library imports.

```js
/**
 * IRONLOG — WORKOUT CALCULATIONS
 * ============================================================
 * File: src/utils/workoutCalculations.js
 * Feature: Workouts
 *
 * Responsibility:
 * - Derive previous exercise performance from completed workouts.
 *
 * Used by:
 * - src/App.jsx
 *
 * Related modules:
 * - src/components/WorkoutLogger.jsx (consumes the resulting data)
 *
 * Side effects: None.
 */
```

Keep paths accurate whenever files move. Use `Used by` for direct consumers and `Related modules` for indirect relationships; do not imply a direct import where there is none.

### 04.02 Numbered sections

Number **logical sections within each file**, starting at `01`. Numbering is local to that file, not global across the repository.

```js
// ============================================================
// 01. DATA TRANSFORMATION
// ============================================================

// 01.01 - Normalize completed workout sets.
```

Use `02`, `03`, etc. for subsequent major sections and `02.01`, `02.02`, etc. for related subsections. Renumber only the file being edited when sections change. Do not number every statement.

### 04.03 Function documentation

Use JSDoc for exported functions, complex calculations, non-obvious validation, and functions with important side effects.

```js
/**
 * 01.01 - GET PREVIOUS EXERCISE PERFORMANCE
 *
 * Purpose:
 * Find the most recent completed sets for each exercise ID.
 *
 * How it works:
 * 1. Sort completed workouts newest-first.
 * 2. Group sets within each workout by exercise ID.
 * 3. Keep the first (latest) group for each exercise.
 *
 * Used by: src/App.jsx
 * Consumed by: src/components/WorkoutLogger.jsx (through props)
 *
 * @param {Array} workouts - Completed workouts with flattened sets.
 * @returns {Object} Latest performance keyed by exercise ID.
 */
```

Explain *why* a decision exists, particularly around sorting, account isolation, validation, or data consistency. Avoid comments that merely restate obvious syntax.

### 04.04 Dependencies and data flow

When important, document:

- Which module calls the function and which component consumes its output.
- Relevant Supabase table(s), RPC names, and expected data shape.
- Whether the function reads/writes storage or changes state.
- Important constraints, such as matching exercises by ID rather than display name.

Do not maintain verbose lists of every import. Update documented relationships when code is moved.

## 05. Formatting and code quality

- Use consistent indentation and readable multi-line JSX.
- Prefer early returns for invalid states and errors.
- Avoid duplicate database queries and data transformations when one shared function can serve both call sites.
- Keep React state immutable; avoid mutating props or arrays received from state.
- Use stable React `key` values for rendered lists.
- Move repeated inline styles to feature CSS files when safe.
- Avoid adding dependencies solely for formatting or organization without discussion.
- Existing code need not be reformatted wholesale; format touched sections incrementally to keep diffs reviewable.

## 06. Supabase and data safety

- Put database access in clearly named service functions as modules are extracted.
- Document the tables and RPCs a service uses, and the expected returned shape.
- Keep user-scoped data isolated; do not assume local browser storage is account-specific.
- Do not expose private credentials in code, documentation, or commits.
- Treat `supabase/schema.sql` as the canonical schema source when schema changes are approved.
- Never execute SQL or change schema without explicit user approval.

## 07. Refactoring workflow

1. Confirm a clean Git checkpoint and identify the files affected.
2. Describe the existing behavior and exact responsibility to move.
3. Change one focused area at a time; provide precise file paths, existing text, and full replacement code.
4. Preserve public props, payload shapes, and database behavior unless a change is separately approved.
5. Run `npm run build`.
6. Manually test the affected workflow (including save/reload where relevant).
7. Update `docs/ARCHITECTURE.md` and module headers when ownership or data flow changes.
8. Review `git diff` before committing.

## 08. Documentation maintenance

- `docs/CODING_STANDARDS.md` defines conventions.
- `docs/ARCHITECTURE.md` describes the *current* system and clearly labels proposed changes.
- Keep README setup, deployment, and developer instructions aligned with actual behavior.
- When adding a feature, document its entry point, major dependencies, data flow, and validation/test checklist.
- Prefer short, accurate documentation over long, stale documentation.

## 09. Known deferred work

Cloud Draft Recovery, including cross-device recovery, duplicate prevention, and account isolation, remains deferred. Do not silently change draft-storage behavior as part of a documentation-only or structure-only refactor.
