
/**
 * IRONLOG — HISTORYPAGE
 * File: src/features/history/HistoryPage.jsx
 * Responsibility: Renders the existing HistoryPage tab without changing its UI.
 * Used by: src/App.jsx
 * Related: src/components/AppShared.jsx; src/services/workoutService.js
 * Receives application state/actions as props; no Supabase calls here.
 */
import React from "react";
import { Plus,ChevronDown  } from "lucide-react";
import { WorkoutRow, Empty } from "../../components/AppShared";

// ============================================================
// 01. PAGE RENDERING
// ============================================================
/**
 * 01.01 - RENDER HISTORYPAGE
 * Props are passed unchanged from App.jsx to preserve behavior.
 * @param {Object} props - Existing application state and callbacks.
 * @returns {React.ReactElement} Existing page JSX.
 */
export default function HistoryPage({ workouts, setActiveWorkout, setTab, emptyWorkout }) {

  // ============================================================
  // 01.02 - EXPANDABLE WORKOUT HISTORY
  // ============================================================

  /**
   * 01.02.01 - Group recorded sets by exercise.
   * Preserves the saved exercise and set order.
   *
   * @param {Object} workout - Completed workout record.
   * @returns {Array} Exercises with their recorded sets.
   */
  function getWorkoutExercises(workout) {
    return [...(workout.workout_exercises || [])]
      .sort((a, b) => a.position - b.position)
      .map(exercise => ({
        id: exercise.id,
        name: exercise.exercise_name || "Unnamed Exercise",
        sets: [...(exercise.workout_sets || [])].sort(
          (a, b) => a.set_number - b.set_number
        ),
      }));
  }

  return (
    <section className="content">
      {/* 01.02.02 - History page heading. */}
      <div className="welcome-row">
        <div>
          <div className="eyebrow">ALL SESSIONS</div>
          <h1>Training <span>history.</span></h1>
          <p className="muted">
            Select a workout to view every recorded exercise and set.
          </p>
        </div>

        <button
          type="button"
          className="primary"
          onClick={() => {
            if (window.confirm(
              "Open the workout logger? If you have an " +
              "unfinished local workout, continue it from Workouts."
            )) {
              setTab("Workouts");
            }
          }}
        >
          <Plus size={18} />
          Go to Workouts
        </button>
      </div>

      {/* 01.02.03 - Expandable completed sessions. */}
      <div className="panel">
        {workouts.length === 0 ? (
          <Empty
            title="No workouts logged yet"
            text="Your completed sessions will be collected here."
          />
        ) : (
          workouts.map(workout => {
            const exercises = getWorkoutExercises(workout);

            return (
              <details
                className="history-session"
                key={workout.id}
              >
                <summary className="history-session-summary">
                  <div className="history-summary-content">
                    <WorkoutRow
                      workout={workout}
                      detailed={false}
                    />
                  </div>

                  <ChevronDown
                    className="history-chevron"
                    size={18}
                  />
                </summary>

                {/* 01.02.04 - Detailed workout content. */}
                <div className="history-session-details">
                  <div className="history-detail-heading">
                    <h3>{workout.name || "Workout"}</h3>
                    <span className="muted">
                      {exercises.length} exercise
                      {exercises.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  {workout.notes && (
                    <div className="history-workout-notes">
                      <strong>Workout notes</strong>
                      <p>{workout.notes}</p>
                    </div>
                  )}

                  {exercises.length === 0 ? (
                    <p className="muted">
                      No exercise details were recorded.
                    </p>
                  ) : (

                    exercises.map((exercise, exerciseIndex) => (
                      <div
                        className="history-exercise"
                        key={exercise.id}
                      >
                        {/* 01.02.05 - Compact exercise heading. */}
                        <div className="history-exercise-heading">
                          <div className="history-exercise-title">
                            <span className="history-exercise-number">
                              {String(exerciseIndex + 1).padStart(2, "0")}
                            </span>
                            <h4>{exercise.name}</h4>
                          </div>

                          <span className="history-exercise-count">
                            {exercise.sets.length}{" "}
                            {exercise.sets.length === 1
                              ? "set"
                              : "sets"}
                          </span>
                        </div>

                        {exercise.sets.length === 0 ? (
                          <p className="muted">
                            No sets recorded.
                          </p>
                        ) : (
                          <div className="history-set-list">
                            {/* 01.02.06 - Consistent set columns. */}
                            <div className="history-set-header">
                              <span>SET</span>
                              <span>WEIGHT</span>
                              <span>REPS</span>
                            </div>

                            {exercise.sets.map((set, index) => (
                              <div
                                className="history-set-row"
                                key={set.id || index}
                              >
                                <span className="history-set-number">
                                  {set.set_number ?? index + 1}
                                </span>

                                <span className="history-set-weight">
                                  {set.weight_kg != null
                                    ? `${set.weight_kg} kg`
                                    : "—"}
                                </span>

                                <span className="history-set-reps">
                                  {set.reps != null
                                    ? set.reps
                                    : "—"}
                                </span>

                                {/* 01.02.07 - Optional set metrics. */}
                                {(set.duration_seconds != null ||
                                  set.distance_km != null) && (
                                  <div className="history-set-extras">
                                    {set.duration_seconds != null && (
                                      <span>
                                        Duration: {set.duration_seconds} sec
                                      </span>
                                    )}

                                    {set.distance_km != null && (
                                      <span>
                                        Distance: {set.distance_km} km
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))

                  )}
                </div>
              </details>
            );
          })
        )}
      </div>
    </section>
  );

}
