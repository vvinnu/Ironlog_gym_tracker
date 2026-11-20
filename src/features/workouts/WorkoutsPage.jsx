
/**
 * IRONLOG — WORKOUTSPAGE
 * File: src/features/workouts/WorkoutsPage.jsx
 * Responsibility: Renders the existing WorkoutsPage tab without changing its UI.
 * Used by: src/App.jsx
 * Related: src/components/AppShared.jsx; src/services/workoutService.js
 * Receives application state/actions as props; no Supabase calls here.
 */
import React from "react";
import { Plus, X } from "lucide-react";
import WorkoutLogger from "../../components/WorkoutLogger";
import { Empty } from "../../components/AppShared";

// ============================================================
// 01. PAGE RENDERING
// ============================================================
/**
 * 01.01 - RENDER WORKOUTSPAGE
 * Props are passed unchanged from App.jsx to preserve behavior.
 * @param {Object} props - Existing application state and callbacks.
 * @returns {React.ReactElement} Existing page JSX.
 */
export default function WorkoutsPage({
  userId,
  activeWorkout,
  setActiveWorkout,
  exerciseList,
  previousPerformance,
  saveSession,
  muscleFilter,
  setMuscleFilter,
  emptyWorkout,
  showExerciseForm,
  setShowExerciseForm,
  newExerciseName,
  setNewExerciseName,
  newExerciseMuscle,
  setNewExerciseMuscle,
  createExercise,
  busy,
}) {
      return (
      <section className="content">
        <div className="welcome-row"><div><div className="eyebrow">SESSION LOGGER</div><h1>Workout <span>builder.</span></h1><p className="muted">Record each working set as you train.</p></div>{!activeWorkout&&<button className="primary" onClick={()=>setActiveWorkout(emptyWorkout())}><Plus size={18}/> New workout</button>}</div>
{activeWorkout ? (
  <div className="panel workout-builder">
    <div className="builder-top">
      <div>
        <div className="eyebrow">IN PROGRESS</div>
        <h2>{activeWorkout.name}</h2>
      </div>

      <button
        className="icon-btn"
        title="Close workout preview"
        onClick={() => {
          if (
            window.confirm(
              "Close this workout preview? Unsaved entries will be lost."
            )
          ) {
            setActiveWorkout(null);
          }
        }}
      >
        <X />
      </button>
    </div>

    <div className="builder-fields">
      <div className="field">
        <label>Workout name</label>
        <input
          value={activeWorkout.name}
          onChange={e =>
            setActiveWorkout(w => ({
              ...w,
              name: e.target.value,
            }))
          }
        />
      </div>

      <div className="field">
        <label>Date</label>
        <input
          type="date"
          value={activeWorkout.workout_date}
          onChange={e =>
            setActiveWorkout(w => ({
              ...w,
              workout_date: e.target.value,
            }))
          }
        />
      </div>
    </div>

<WorkoutLogger
  key={userId}
  userId={userId}
  exercises={exerciseList}
  previousPerformance={previousPerformance}
  onSaveExercise={payload =>
    saveSession(payload, false)
  }
  onSaveWorkout={payload =>
    saveSession(payload, true)
  }
/>

    <div className="field">
      <label>Session notes</label>
      <textarea
        rows="2"
        value={activeWorkout.notes}
        onChange={e =>
          setActiveWorkout(w => ({
            ...w,
            notes: e.target.value,
          }))
        }
        placeholder="How did the session feel?"
      />
    </div>
  </div>
) : (
  <div className="panel">
    <Empty
      title="Ready for your next session?"
      text="Start a workout and add your exercises."
    />
    <button
      className="primary centered"
      onClick={() => setActiveWorkout(emptyWorkout())}
    >
      <Plus size={18} />
      Start a workout
    </button>
  </div>
)}
        
{/* ============================================================
    02. EXERCISE LIBRARY AND CREATION
    ============================================================ */}

<div className="panel">
  <div className="panel-head">
    <div>
      <div className="eyebrow">EXERCISE LIBRARY</div>
      <h2>Exercises</h2>
    </div>

    <select
      className="filter-select"
      value={muscleFilter}
      onChange={e => setMuscleFilter(e.target.value)}
    >
      {["All", "Back", "Chest", "Shoulders", "Arms", "Legs", "Core"].map(
        muscle => (
          <option key={muscle} value={muscle}>
            {muscle}
          </option>
        )
      )}
    </select>
  </div>

  {/* 02.01 - Toggle exercise creation form. */}
  <button
    type="button"
    className="primary"
    onClick={() => setShowExerciseForm(!showExerciseForm)}
  >
    <Plus size={18} />
    {showExerciseForm ? "Cancel" : "Add New Exercise"}
  </button>

  {/* 02.02 - Create an exercise using App.jsx validation. */}
  {showExerciseForm && (
    <div className="field">
      <label>Exercise name</label>
      <input
        value={newExerciseName}
        onChange={e => setNewExerciseName(e.target.value)}
        placeholder="e.g. Incline Dumbbell Curl"
      />

      <label>Primary muscle (optional)</label>
      <select
        value={newExerciseMuscle}
        onChange={e => setNewExerciseMuscle(e.target.value)}
      >
        <option value="">Select muscle</option>
        {["Back", "Chest", "Shoulders", "Arms", "Legs", "Core"].map(
          muscle => (
            <option key={muscle} value={muscle}>
              {muscle}
            </option>
          )
        )}
      </select>

      <button
        type="button"
        className="primary"
        disabled={busy || !newExerciseName.trim()}
        onClick={createExercise}
      >
        {busy ? "Saving..." : "Save Exercise"}
      </button>
    </div>
  )}

  {/* 02.03 - Existing exercise library display. */}
  <div className="exercise-grid">
    {exerciseList
      .filter(
        exercise =>
          muscleFilter === "All" ||
          exercise.primary_muscle === muscleFilter
      )
      .map(exercise => (
        <div className="exercise-chip" key={exercise.id}>
          <span>{exercise.name}</span>
          <small>{exercise.primary_muscle || "Other"}</small>
        </div>
      ))}
  </div>
</div>
      </section>
  );
}
