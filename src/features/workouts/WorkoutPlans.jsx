
/**
 * IRONLOG — WORKOUT PLANS
 * File: src/features/workouts/WorkoutPlans.jsx
 * Responsibility: Create, edit, display and delete workout plans.
 * Used by: src/features/workouts/WorkoutsPage.jsx
 * Related: src/services/workoutPlanService.js
 */

import React, { useState } from "react";
import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";

// ============================================================
// 01. FORM HELPERS
// ============================================================

/**
 * 01.01 - Create an empty workout plan form.
 * @returns {Object} New plan form.
 */
const emptyPlan = () => ({
  name: "",
  notes: "",
  exercises: [],
});

/**
 * 01.02 - Convert a saved plan into editable form values.
 * @param {Object} plan - Supabase plan with related exercises.
 * @returns {Object} Editable form.
 */
function planToForm(plan) {
  return {
    name: plan.name || "",
    notes: plan.notes || "",
    exercises: [...(plan.workout_plan_exercises || [])]
      .sort((a, b) => a.position - b.position)
      .map(entry => ({
        exercise_id: entry.exercise_id,
        target_sets: entry.target_sets ?? "",
        target_reps: entry.target_reps ?? "",
      })),
  };
}

// ============================================================
// 02. WORKOUT PLAN COMPONENT
// ============================================================

/**
 * 02.01 - Display saved plans and the plan editor.
 * @param {Object} props - Plans, exercise library and callbacks.
 * @returns {React.ReactElement} Workout plan management UI.
 */
export default function WorkoutPlans({
  plans = [],
  loading = false,
  exercises = [],
  busy = false,
  onSavePlan,
  onDeletePlan,
  onStartPlan,
}) {
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(null);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  // 02.02 - Start creating a new plan.
  function startNewPlan() {
    setEditingId(null);
    setForm(emptyPlan());
    setSearch("");
    setMessage("");
  }

  // 02.03 - Load an existing plan into the editor.
  function startEditing(plan) {
    setEditingId(plan.id);
    setForm(planToForm(plan));
    setSearch("");
    setMessage("");
  }

  // 02.04 - Add an exercise only once per plan.
  function addExercise(exercise) {
    if (form.exercises.some(item =>
      item.exercise_id === exercise.id
    )) {
      setMessage("This exercise is already in the plan.");
      return;
    }

    setForm(previous => ({
      ...previous,
      exercises: [
        ...previous.exercises,
        {
          exercise_id: exercise.id,
          target_sets: "",
          target_reps: "",
        },
      ],
    }));

    setSearch("");
    setMessage("");
  }

  // 02.05 - Update one exercise's target.
  function updateExercise(index, field, value) {
    setForm(previous => ({
      ...previous,
      exercises: previous.exercises.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  }

  // 02.06 - Change exercise order.
  function moveExercise(index, direction) {
    const target = index + direction;

    if (target < 0 || target >= form.exercises.length) {
      return;
    }

    setForm(previous => {
      const reordered = [...previous.exercises];

      [reordered[index], reordered[target]] = [
        reordered[target],
        reordered[index],
      ];

      return { ...previous, exercises: reordered };
    });
  }

  // 02.07 - Remove an exercise from the plan.
  function removeExercise(index) {
    setForm(previous => ({
      ...previous,
      exercises: previous.exercises.filter((_, i) => i !== index),
    }));
  }

  // 02.08 - Save a new or edited plan.
  async function savePlan() {
    if (busy) return;

    setMessage("");

    try {
      await onSavePlan(editingId, form);
      setForm(null);
      setEditingId(null);
      setSearch("");
    } catch (error) {
      setMessage(error.message || "Unable to save plan.");
    }
  }

  // 02.09 - Confirm deletion before removing a plan.
  async function removePlan(plan) {
    if (busy) return;

    if (!window.confirm(
      `Delete "${plan.name}"? This cannot be undone.`
    )) {
      return;
    }

    setMessage("");

    try {
      await onDeletePlan(plan.id);

      if (editingId === plan.id) {
        setForm(null);
        setEditingId(null);
      }
    } catch (error) {
      setMessage(error.message || "Unable to delete plan.");
    }
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <div className="eyebrow">WORKOUT PLANS</div>
          <h2>Saved workout plans</h2>
        </div>

        {!form && (
          <button
            type="button"
            className="primary"
            disabled={busy}
            onClick={startNewPlan}
          >
            <Plus size={16} />
            New Plan
          </button>
        )}
      </div>

      <p className="muted">
        Build reusable exercise lists for Push, Pull, Legs,
        Upper Body, or your own routines.
      </p>

      {message && <p role="alert">{message}</p>}

      {/* 02.11 - Existing saved plans. */}
      {loading ? (
        <p className="muted">Loading saved plans...</p>
      ) : plans.length === 0 ? (
        <p className="muted">
          No saved workout plans yet.
        </p>
      ) : (
        <div className="exercise-grid">
          {plans.map(plan => {
            const entries = [
              ...(plan.workout_plan_exercises || []),
            ].sort((a, b) => a.position - b.position);

            return (
              <div className="field" key={plan.id}>
                <strong>{plan.name}</strong>

                {plan.notes && (
                  <p className="muted">{plan.notes}</p>
                )}

                <small className="muted">
                  {entries.length} exercises
                </small>

                {entries.length > 0 && (
                  <ol>
                    {entries.map(entry => (
                      <li key={entry.id}>
                        {entry.exercises?.name ||
                          "Unknown exercise"}
                        {entry.target_sets
                          ? ` · ${entry.target_sets} sets`
                          : ""}
                        {entry.target_reps
                          ? ` × ${entry.target_reps} reps`
                          : ""}
                      </li>
                    ))}
                  </ol>
                )}

                <div style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                  marginTop: "12px",
                }}>

                  {/* 02.15 - Start a new session from this plan. */}
                  <button
                    type="button"
                    className="primary"
                    disabled={
                      busy ||
                      Boolean(form) ||
                      entries.length === 0
                    }
                    onClick={() => onStartPlan(plan)}
                  >
                    Start Workout
                  </button>

                  <button
                    type="button"
                    className="primary"
                    disabled={busy || Boolean(form)}
                    onClick={() => startEditing(plan)}
                  >
                    Edit
                  </button>


                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`Delete ${plan.name}`}
                    title="Delete plan"
                    disabled={busy || Boolean(form)}
                    onClick={() => removePlan(plan)}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 02.12 - New/edit plan form. */}
      {form && (
        <div className="field" style={{ marginTop: "20px" }}>
          <h3>
            {editingId ? "Edit workout plan" : "New workout plan"}
          </h3>

          <label>Plan name</label>
          <input
            maxLength={120}
            value={form.name}
            onChange={e => setForm(previous => ({
              ...previous,
              name: e.target.value,
            }))}
            placeholder="e.g. Push Day"
          />

          <label>Plan notes (optional)</label>
          <textarea
            rows={2}
            value={form.notes}
            onChange={e => setForm(previous => ({
              ...previous,
              notes: e.target.value,
            }))}
            placeholder="Focus or instructions"
          />

          <h3>Exercises</h3>

          {/* 02.13 - Search the existing exercise library. */}
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search exercises to add..."
          />

          {search.trim() && (
            <div className="ironlog-results">
              {exercises
                .filter(exercise =>
                  exercise.name.toLowerCase().includes(
                    search.trim().toLowerCase()
                  )
                )
                .filter(exercise =>
                  !form.exercises.some(item =>
                    item.exercise_id === exercise.id
                  )
                )
                .slice(0, 10)
                .map(exercise => (
                  <button
                    type="button"
                    key={exercise.id}
                    disabled={busy}
                    onClick={() => addExercise(exercise)}
                  >
                    <Plus size={16} />
                    {exercise.name}
                  </button>
                ))}
            </div>
          )}

          {/* 02.14 - Ordered exercises and optional targets. */}
          {form.exercises.map((entry, index) => {
            const exercise = exercises.find(item =>
              item.id === entry.exercise_id
            );

            return (
              <div
                className="field"
                key={entry.exercise_id}
                style={{
                  border: "1px solid #303746",
                  borderRadius: "10px",
                  padding: "12px",
                  marginTop: "12px",
                }}
              >
                <strong>
                  {index + 1}. {exercise?.name || "Unknown exercise"}
                </strong>

                <div style={{
                  display: "flex",
                  gap: "8px",
                  marginTop: "10px",
                }}>
                  <button
                    type="button"
                    className="icon-btn"
                    title="Move up"
                    aria-label="Move exercise up"
                    disabled={busy || index === 0}
                    onClick={() => moveExercise(index, -1)}
                  >
                    <ChevronUp size={18} />
                  </button>

                  <button
                    type="button"
                    className="icon-btn"
                    title="Move down"
                    aria-label="Move exercise down"
                    disabled={
                      busy || index === form.exercises.length - 1
                    }
                    onClick={() => moveExercise(index, 1)}
                  >
                    <ChevronDown size={18} />
                  </button>

                  <button
                    type="button"
                    className="icon-btn"
                    title="Remove exercise"
                    aria-label="Remove exercise"
                    disabled={busy}
                    onClick={() => removeExercise(index)}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <label>Target sets (optional)</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={entry.target_sets}
                  onChange={e =>
                    updateExercise(
                      index,
                      "target_sets",
                      e.target.value
                    )
                  }
                  placeholder="e.g. 3"
                />

                <label>Target reps (optional)</label>
                <input
                  maxLength={50}
                  value={entry.target_reps}
                  onChange={e =>
                    updateExercise(
                      index,
                      "target_reps",
                      e.target.value
                    )
                  }
                  placeholder="e.g. 8-12"
                />
              </div>
            );
          })}

          <div style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
            marginTop: "16px",
          }}>
            <button
              type="button"
              className="primary"
              disabled={busy || !form.name.trim()}
              onClick={savePlan}
            >
              {busy ? "Saving..." : "Save Plan"}
            </button>

            <button
              type="button"
              className="text-btn"
              disabled={busy}
              onClick={() => {
                setForm(null);
                setEditingId(null);
                setSearch("");
                setMessage("");
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
