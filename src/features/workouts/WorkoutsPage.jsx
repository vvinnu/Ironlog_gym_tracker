
/**
 * IRONLOG — WORKOUTSPAGE
 * File: src/features/workouts/WorkoutsPage.jsx
 * Responsibility: Renders the existing WorkoutsPage tab without changing its UI.
 * Used by: src/App.jsx
 * Related: src/components/AppShared.jsx; src/services/workoutService.js
 * Receives application state/actions as props; no Supabase calls here.
 */
import React, { useEffect, useState } from "react";
import {
  Plus,
  X,
  CalendarDays,
  Dumbbell,
  Layers3,
  Repeat2,
  BookOpen,
} from "lucide-react";
import WorkoutLogger from "../../components/WorkoutLogger";
import WorkoutPlans from "./WorkoutPlans";
import WorkoutRotation from "./WorkoutRotation";
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

  // 01.02 - Saved workout plan state and actions.
  workoutPlans = [],
  workoutPlansLoading = false,
  workoutPlansBusy = false,
  onSavePlan,
  onDeletePlan,
  // 01.03 - Start a workout from a saved plan.

  onStartPlan,

  // 01.04 - Rotation state and actions.
  workoutRotation,
  rotationLoading = false,
  rotationBusy = false,
  onSaveRotation,
  onAdvanceRotation,
  onStartSuggestedWorkout,

  cloudDrafts = [],


  cloudDraftsLoading = false,
  onResumeCloudDraft,
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
  // ============================================================
  // 03. WORKOUT WORKSPACE NAVIGATION
  // ============================================================

  // 03.01 - Show the active session first when one exists.
  const [workoutView, setWorkoutView] = useState(
    activeWorkout ? "session" : "today"
  );

  // 03.02 - Automatically open the logger when a workout starts
  // or when a different workout is resumed.
  useEffect(() => {
    if (activeWorkout?.id) {
      setWorkoutView("session");
    }
  }, [activeWorkout?.id]);

  // 03.03 - Navigation definitions.
  const workspaceTabs = [
    { id: "today", label: "Today", Icon: CalendarDays },
    { id: "session", label: "Workout", Icon: Dumbbell },
    { id: "plans", label: "Plans", Icon: Layers3 },
    { id: "rotation", label: "Rotation", Icon: Repeat2 },
    { id: "library", label: "Library", Icon: BookOpen },
  ];

  // 03.04 - Keep sections mounted when hidden.
  // This prevents tab changes from resetting local component state.

  const viewStyle = view => ({
    display: workoutView === view ? undefined : "none",
  });

  // ============================================================
  // 03.12 - TODAY WORKOUT SELECTION
  // ============================================================

  // 03.12.01 - Find the next step in the active rotation.
  const rotationSteps = [
    ...(workoutRotation?.workout_rotation_steps || []),
  ].sort((a, b) => a.position - b.position);

  const suggestedStep = rotationSteps.find(
    step => step.position === workoutRotation?.next_position
  );

  // 03.12.02 - Match the scheduled step to a saved plan.
  const suggestedPlan = suggestedStep?.kind === "workout"
    ? workoutPlans.find(
        plan => plan.id === suggestedStep.plan_id
      )
    : null;

  return (


      <section className="content">
        {/* ============================================================
            03.05 - WORKOUT WORKSPACE HEADER
        ============================================================ */}
        <div className="workout-workspace-header">
          <div>
            <div className="eyebrow">TRAINING WORKSPACE</div>
            <h1>Workouts</h1>
            <p className="muted">
              Your training, organized in one place.
            </p>
          </div>

          {activeWorkout && (
            <button
              type="button"
              className="primary"
              onClick={() => setWorkoutView("session")}
            >
              <Dumbbell size={16} />
              Continue Workout
            </button>
          )}
        </div>

        {/* 03.06 - Switch between dedicated workspace views. */}
        <nav
          className="workout-workspace-tabs"
          aria-label="Workout workspace"
        >
          {workspaceTabs.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              className={`workout-workspace-tab ${
                workoutView === id ? "active" : ""
              }`}
              aria-current={
                workoutView === id ? "page" : undefined
              }
              onClick={() => setWorkoutView(id)}
            >
              <Icon size={17} />
              <span>{label}</span>
              {id === "session" && activeWorkout && (
                <span className="workout-active-indicator" />
              )}
            </button>
          ))}
        </nav>


        {/* ============================================================
            03.07 - TODAY: WORKOUT SELECTION
        ============================================================ */}
        <div style={viewStyle("today")}>
          <div className="panel">
            <div className="eyebrow">TODAY'S TRAINING</div>
            <h2>Choose your workout</h2>
            <p className="muted">
              Choose your suggested workout or any saved plan.
            </p>

            {/* 03.07.01 - Continue the active local workout. */}
            {activeWorkout && (
              <div className="today-suggested-card">
                <div className="eyebrow">IN PROGRESS</div>
                <h3>{activeWorkout.name}</h3>
                <button
                  type="button"
                  className="primary"
                  onClick={() => setWorkoutView("session")}
                >
                  Continue Workout
                </button>
              </div>
            )}

            {/* 03.07.02 - Highlight the next rotation step. */}
            <div className="today-suggested-card">
              <div className="eyebrow">SUGGESTED NEXT</div>

              {rotationLoading || workoutPlansLoading ? (
                <p className="muted">
                  Loading your workout suggestion...
                </p>
              ) : suggestedStep?.kind === "rest" ? (
                <>
                  <h3>Rest Day</h3>
                  <p className="muted">
                    Your rotation suggests recovery.
                    You can still train using a plan below.
                  </p>
                  <button
                    type="button"
                    className="workout-secondary-btn"
                    onClick={() => setWorkoutView("rotation")}
                  >
                    Manage Rest Day
                  </button>
                </>
              ) : suggestedPlan ? (
                <>
                  <h3>{suggestedPlan.name}</h3>
                  <p className="muted">
                    Step {rotationSteps.findIndex(
                      step => step.id === suggestedStep.id
                    ) + 1} of {rotationSteps.length}
                  </p>

                  <button
                    type="button"
                    className="primary"
                    disabled={
                      rotationBusy ||
                      workoutPlansBusy ||
                      !suggestedPlan.workout_plan_exercises?.length
                    }
                    onClick={() =>
                      onStartSuggestedWorkout(suggestedPlan)
                    }
                  >
                    Start Suggested Workout
                  </button>
                </>
              ) : (
                <>
                  <h3>
                    {suggestedStep
                      ? "Suggested plan unavailable"
                      : "No rotation configured"}
                  </h3>
                  <p className="muted">
                    Choose a saved workout below, or configure
                    your rotation.
                  </p>
                  <button
                    type="button"
                    className="workout-secondary-btn"
                    onClick={() => setWorkoutView("rotation")}
                  >
                    Manage Rotation
                  </button>
                </>
              )}
            </div>

            {/* 03.07.03 - All saved plans are selectable. */}
            <div className="today-workout-heading">
              <h3>Or choose any workout</h3>
              <button
                type="button"
                className="workout-secondary-btn"
                onClick={() => setWorkoutView("plans")}
              >
                Manage Plans
              </button>
            </div>

            {workoutPlansLoading ? (
              <p className="muted">Loading saved plans...</p>
            ) : workoutPlans.length === 0 ? (
              <p className="muted">
                No saved plans yet. Create one in Plans.
              </p>
            ) : (
              <div className="today-workout-grid">
                {workoutPlans.map(plan => {
                  const exerciseCount =
                    plan.workout_plan_exercises?.length || 0;

                  const isSuggested =
                    suggestedStep?.kind === "workout" &&
                    suggestedStep.plan_id === plan.id;

                  return (
                    <div
                      key={plan.id}
                      className="today-workout-card"
                    >
                      <div>
                        <div className="today-plan-title">
                          <h3>{plan.name}</h3>
                          {isSuggested && (
                            <span className="today-plan-badge">
                              Suggested
                            </span>
                          )}
                        </div>
                        <p className="muted">
                          {exerciseCount} exercise
                          {exerciseCount === 1 ? "" : "s"}
                        </p>
                      </div>

                      {/* Manual selection never advances rotation. */}
                      <button
                        type="button"
                        className="primary"
                        disabled={
                          workoutPlansBusy ||
                          rotationBusy ||
                          exerciseCount === 0
                        }
                        onClick={() => onStartPlan(plan)}
                      >
                        Start Workout
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 03.07.04 - Blank workout without data loss. */}
            <div className="today-blank-workout">
              <button
                type="button"
                className="workout-secondary-btn"
                onClick={() => {
                  if (activeWorkout) {
                    setWorkoutView("session");
                    return;
                  }

                  setActiveWorkout(emptyWorkout());
                  setWorkoutView("session");
                }}
              >
                <Plus size={16} />
                {activeWorkout
                  ? "Continue Current Workout"
                  : "Start Blank Workout"}
              </button>
            </div>
          </div>
        </div>

        {/* ============================================================
            03.09 - ROTATION VIEW
        ============================================================ */}
        <div style={viewStyle("rotation")}>
          <WorkoutRotation
          rotation={workoutRotation}
          loading={rotationLoading}
          busy={rotationBusy}
          plans={workoutPlans}
          activeWorkout={activeWorkout}
          onCreate={onSaveRotation}
          onAdvance={onAdvanceRotation}
         />
        </div>

        {/* ============================================================
            00. SAVED WORKOUT PLANS============================== */}
        <div style={viewStyle("plans")}>
          <WorkoutPlans
          key={userId}
          plans={workoutPlans}
          loading={workoutPlansLoading}
          exercises={exerciseList}
          busy={workoutPlansBusy}
          onSavePlan={onSavePlan}
          onDeletePlan={onDeletePlan}
          />
                  </div>

        {/* ============================================================
            03.10 - TODAY: CLOUD DRAFT RECOVERY
        ============================================================ */}
        <div style={viewStyle("today")}>
        {/* ============================================================
    00. CLOUD DRAFT DISCOVERY
    ============================================================ */}

{(cloudDraftsLoading || cloudDrafts.length > 0) && (
  <div className="panel">
    <div className="panel-head">
      <div>
        <div className="eyebrow">CLOUD RECOVERY</div>
        <h2>Unfinished cloud workouts</h2>
      </div>
    </div>

    {cloudDraftsLoading ? (
      <p className="muted">Checking Supabase for drafts...</p>
    ) : (
      <>
<p className="muted">
  Resume a workout saved to Supabase.
  Replacing an existing local workout requires confirmation.
</p>

        {cloudDrafts.map(draft => (
          <div key={draft.id} className="field">
            <strong>{draft.name}</strong>
            <small className="muted">
              {draft.workout_date}
              {" · "}
              {draft.workout_exercises?.length || 0} exercises
            </small>

            {/* 00.01 - Resume a selected cloud workout. */}
            <button
              type="button"
              className="primary"
              onClick={() => onResumeCloudDraft(draft)}
            >
              Resume Workout
            </button>
          </div>
        ))}
      </>
    )}
  </div>
)}
        </div>

        {/* ============================================================
            03.08 - DEDICATED WORKOUT LOGGER VIEW
        ============================================================ */}
        <div style={viewStyle("session")}>
        {/* 03.11 - Workout logger header. */}
        <div className="welcome-row">
          <div>
            <div className="eyebrow">SESSION LOGGER</div>
            <h1>
              Workout <span>builder.</span>
            </h1>
            <p className="muted">
              Record each working set as you train.
            </p>
          </div>

          {!activeWorkout && (
            <button
              type="button"
              className="primary"
              onClick={() => setActiveWorkout(emptyWorkout())}
            >
              <Plus size={18} />
              New workout
            </button>
          )}
        </div>{activeWorkout ? (
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
  const confirmed = window.confirm(
    "Discard this local workout draft? " +
    "The workout name, notes and locally entered sets will be cleared. " +
    "Any draft already saved to Supabase will remain in the cloud."
  );

  if (!confirmed) return;

  try {
    localStorage.removeItem(`ironlog-active-workout:${userId}`);
    localStorage.removeItem(`ironlog-workout-draft:${userId}`);
  } catch {
    window.alert(
      "Unable to clear the local draft. Please check browser storage."
    );
    return;
  }

  setActiveWorkout(null);
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
  key={`${userId}:${activeWorkout.id}`}
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
        </div>

{/* ============================================================
    02. EXERCISE LIBRARY AND CREATION
    ============================================================ */}

<div style={viewStyle("library")}>
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
</div>
      </section>
  );
}
