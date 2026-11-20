# IronLog Architecture

**Stack:** JavaScript/JSX, React, Vite, Supabase, CSS, Recharts, Lucide React  
**Deployment:** GitHub Pages; Vite base path `/Ironlog_gym_tracker/`

## 01. Application overview

IronLog is a personal gym tracker with Supabase authentication, an exercise library with user-created exercises, active workout logging, draft saves, completed workout history, previous exercise performance, bodyweight logs, and progress views.

The React frontend coordinates UI state and delegates database operations to services. Supabase stores account and training data. This document describes the implemented code, not a hypothetical folder layout.

## 02. Current source map

```text
src/
├── App.jsx                         # App shell, auth, state, handlers and navigation
├── main.jsx                        # React entry point
├── supabase.js                     # Supabase client and cloud configuration
├── styles.css                      # Shared application styles
├── components/
│   ├── AppShared.jsx               # Stat, Empty, WorkoutRow, WeightChart
│   ├── WorkoutLogger.jsx           # Exercise cards, set editor, local draft and save UI
│   └── WorkoutLogger.css           # Workout logger styles
├── features/
│   ├── dashboard/Dashboard.jsx     # Overview, stats and bodyweight entry
│   ├── workouts/WorkoutsPage.jsx   # Active workout, exercise library and creation UI
│   ├── history/HistoryPage.jsx     # Completed sessions
│   ├── progress/ProgressPage.jsx   # Bodyweight, volume and personal bests
│   └── settings/SettingsPage.jsx   # Account information and sign-out
├── services/
│   ├── workoutService.js           # Workout history query and save-session RPC
│   ├── bodyweightService.js        # Bodyweight query and insertion
│   └── exerciseService.js          # Exercise library query and insertion
└── utils/
    ├── workoutCalculations.js      # Previous exercise performance
    ├── workoutHistory.js           # Flatten nested Supabase workout records
    └── formatters.js               # Shared numeric formatter
```

## 03. Module responsibilities

### 03.01 Application coordinator — `src/App.jsx`

- Subscribes to Supabase authentication changes and renders sign-in/sign-up when signed out.
- Holds navigation, signed-in user, workouts, bodyweight logs, exercise list, active workout and UI state.
- Loads completed workouts, bodyweight history and exercises through the three service modules.
- Normalizes fetched workout history and calculates summary statistics and previous performance.
- Validates and coordinates exercise creation, workout saving/completion, and bodyweight entry.
- Passes data and callbacks to the five feature pages; retains the sidebar, top bar and mobile navigation.

### 03.02 Feature pages — `src/features/`

- `dashboard/Dashboard.jsx`: overview metrics, recent workouts, records and bodyweight logging UI.
- `workouts/WorkoutsPage.jsx`: starts and edits an active workout, hosts `WorkoutLogger`, filters the exercise library, and provides the restored **Add New Exercise** form. Exercise creation is handled by the `createExercise` callback from `App.jsx`.
- `history/HistoryPage.jsx`: lists completed workouts and allows starting a workout.
- `progress/ProgressPage.jsx`: displays bodyweight trend, workout volume and personal bests.
- `settings/SettingsPage.jsx`: displays account settings and sign-out action.

### 03.03 Workout editor — `src/components/WorkoutLogger.jsx`

- Manages exercise cards and editable set rows, including adding/removing rows.
- Displays the latest completed performance for each exercise and copies previous sets into editable rows.
- Validates and prepares exercise/set payloads for `onSaveExercise` (draft) and `onSaveWorkout` (completion).
- Persists exercise cards to browser `localStorage` under `ironlog-workout-draft` (currently **not account-scoped**).

### 03.04 Shared components — `src/components/AppShared.jsx`

Exports `Stat`, `Empty`, `WorkoutRow` and `WeightChart`. `WeightChart` uses Recharts. Shared numeric formatting lives in `src/utils/formatters.js` (`fmt`).

### 03.05 Services — `src/services/`

| Service | Exports | Supabase operation |
| --- | --- | --- |
| `workoutService.js` | `fetchCompletedWorkouts`, `saveWorkoutSession` | Fetch completed workouts and nested exercises/sets; call `ironlog_save_session` RPC |
| `bodyweightService.js` | `fetchBodyweightHistory`, `saveBodyweightEntry` | Read/insert `bodyweight_logs` |
| `exerciseService.js` | `fetchExercises`, `createExerciseRecord` | Read/insert `exercises` |

Services perform database communication; validation, state changes and UI notifications remain in `App.jsx` and/or the workout editor.

### 03.06 Pure utilities — `src/utils/`

- `workoutHistory.js`: `normalizeWorkoutHistory(workouts)` flattens nested workout exercises and sets while preserving workout metadata.
- `workoutCalculations.js`: `getPreviousPerformance(workouts)` identifies the most recent completed sets by **exercise ID**, not display name.
- `formatters.js`: `fmt(number)` formats numeric values for display.

## 04. Main data flows

### 04.01 Initial signed-in data load

```text
Supabase Auth → App.jsx (user)
    ↓
Promise.all: fetchCompletedWorkouts + fetchBodyweightHistory + fetchExercises
    ↓
App.jsx: normalizeWorkoutHistory(workouts), setWorkouts, setWeights, setExerciseList
    ↓
Dashboard / WorkoutsPage / HistoryPage / ProgressPage
```

### 04.02 Previous performance and copying sets

```text
workoutService.fetchCompletedWorkouts()
    ↓
workoutHistory.normalizeWorkoutHistory()
    ↓
workoutCalculations.getPreviousPerformance()
    ↓
App.jsx → WorkoutsPage.jsx → WorkoutLogger.jsx
    ↓
Show previous sets / copy into today's editable rows
```

### 04.03 Save workout draft or complete workout

```text
WorkoutLogger.jsx: validate rows and build exercise payload
    ↓
WorkoutsPage.jsx: passes save callbacks
    ↓
App.jsx: saveSession(exercises, complete)
    ↓
workoutService.saveWorkoutSession() → Supabase ironlog_save_session RPC
    ├── Draft: keep returned cloud_id in activeWorkout
    └── Complete: refetch completed history, normalize, clear activeWorkout,
                  navigate to History
```

### 04.04 Create a custom exercise

```text
WorkoutsPage.jsx: Add New Exercise form
    ↓
App.jsx: createExercise() (required name and duplicate checks)
    ↓
exerciseService.createExerciseRecord()
    ↓
Supabase exercises table
    ↓
App.jsx: update exerciseList → WorkoutsPage / WorkoutLogger
```

### 04.05 Bodyweight tracking

```text
Dashboard.jsx: bodyweight entry
    ↓
App.jsx: logWeight() (validates 20–400 kg)
    ↓
bodyweightService.saveBodyweightEntry() → Supabase bodyweight_logs
    ↓
App.jsx: update weights → Dashboard / ProgressPage charts
```

## 05. Supabase data referenced by frontend

| Table / RPC | Role |
| --- | --- |
| `workouts` | Workout metadata, status and dates |
| `workout_exercises` | Exercises associated with a workout |
| `workout_sets` | Logged sets, weights, reps, duration and distance fields |
| `exercises` | Shared and user-created exercise library |
| `bodyweight_logs` | User bodyweight measurements |
| `ironlog_save_session` | Draft and completed workout persistence |

The canonical schema is `supabase/schema.sql`. This document does not assert specific database policies or constraints without inspecting that file. **No SQL or schema changes are part of this documentation update.**

## 06. Completed refactoring milestones

| Stage | Result | Status |
| --- | --- | --- |
| 01 | Extract previous-performance calculation | Complete |
| 02 | Extract workout history normalization | Complete |
| 03 | Extract workout queries and save RPC | Complete |
| 04 | Extract bodyweight queries and insert | Complete |
| 05 | Extract exercise queries and insert | Complete |
| 06 | Extract dashboard, workouts, history, progress and settings pages | Complete |
| 07 | Extract shared UI and formatting helpers | Complete |
| 08 | Restore Add New Exercise form and callback wiring | Complete; user-tested |
| 09 | Update architecture documentation | Complete with this revision |

## 07. Known limitations and planned work

- **Account isolation / draft recovery:** The logger uses a single local-storage key. Sign-out does not currently clear all active-workout/draft state. Design user-scoped local storage and cloud draft recovery together, including duplicate prevention.
- **Code cleanup:** Review leftover unused `App.jsx` state and stale comments before removing anything; preserve current behavior.
- **Performance:** Production Vite build previously warned about a JavaScript chunk larger than 500 kB. Profile and consider route-level lazy loading after verifying baseline performance.
- **Tests:** Build and manual workflow tests have been performed by the user. Automated regression tests are not documented here.
- **Future features:** Workout plans/templates and cycle suggestions are deferred.

## 08. Maintenance rules

- Follow `docs/CODING_STANDARDS.md` for numbered sections, JSDoc, dependency references and surgical edits.
- Update this document whenever module ownership or data flow changes.
- Preserve workout payloads, Supabase behavior and UI functionality during refactors.
- Do not run SQL or change `supabase/schema.sql` without explicit approval.
