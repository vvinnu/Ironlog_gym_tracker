
/**
 * IRONLOG — WORKOUT ROTATION
 * File: src/features/workouts/WorkoutRotation.jsx
 * Responsibility: Configure and follow a workout rotation.
 */

import React, { useState } from "react";

// ============================================================
// 01. DEFAULT ROTATION
// ============================================================

const defaultSteps = [
  { kind: "workout", plan_id: "" },
  { kind: "workout", plan_id: "" },
  { kind: "workout", plan_id: "" },
  { kind: "rest", plan_id: null },
];

/**
 * 01.01 - Display the active rotation and its next step.
 */
export default function WorkoutRotation({
  rotation,
  loading,
  busy,
  plans = [],
  activeWorkout,
  onCreate,
  onAdvance,
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("Push Pull Legs Rest");
  const [steps, setSteps] = useState(defaultSteps.map(s => ({ ...s })));
  const [message, setMessage] = useState("");

  const ordered = [...(rotation?.workout_rotation_steps || [])]
    .sort((a, b) => a.position - b.position);

  const current = ordered.find(
    step => step.position === rotation?.next_position
  );

  const currentPlan = current?.plan_id
    ? plans.find(plan => plan.id === current.plan_id)
    : null;

  // 01.02 - Update the plan assigned to a step.
  function updateStep(index, value) {
    setSteps(previous => previous.map((step, i) =>
      i === index
        ? { ...step, plan_id: value }
        : step
    ));
  }

  // 01.03 - Save a new rotation configuration.
  async function saveRotation() {
    setMessage("");

    if (!name.trim()) {
      setMessage("Enter a rotation name.");
      return;
    }

    if (steps.some(step =>
      step.kind === "workout" && !step.plan_id
    )) {
      setMessage("Assign a saved plan to each workout day.");
      return;
    }

    try {
      await onCreate(name.trim(), steps);
      setEditing(false);
    } catch (error) {
      setMessage(error.message);
    }
  }

  // 01.04 - Confirm rest completion or intentional skipping.
  async function advance(reason) {
    if (!rotation || busy) return;

    const description = reason === "rest"
      ? "Mark this rest day complete?"
      : "Skip this step and move to the next one?";

    if (!window.confirm(description)) return;

    setMessage("");

    try {
      await onAdvance();
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <div className="eyebrow">TRAINING ROTATION</div>
          <h2>Next suggested workout</h2>
        </div>
      </div>

      {message && <p role="alert">{message}</p>}

      {loading ? (
        <p className="muted">Loading rotation...</p>
      ) : rotation && current ? (
        <>
          <p className="muted">{rotation.name}</p>

          <div className="field">
            <strong>
              {current.kind === "rest"
                ? "Rest Day"
                : currentPlan?.name || "Unavailable plan"}
            </strong>
            <p className="muted">
              Step {ordered.findIndex(s => s.id === current.id) + 1}
              {" of "}
              {ordered.length}
            </p>


            {/* 01.05 - Workout selection happens on Today. */}
            {current.kind === "workout" && currentPlan && (
              <p className="muted">
                Go to Today to start this workout or choose
                another saved plan.
              </p>
            )}


            {current.kind === "rest" && (
              <button
                type="button"
                className="primary"
                disabled={busy || Boolean(activeWorkout)}
                onClick={() => advance("rest")}
              >
                Complete Rest Day
              </button>
            )}

            {current.kind === "workout" && (
              <p className="muted">
                Complete the suggested workout to advance
                automatically, or skip this step manually.
              </p>
            )}

            <button
              type="button"
              className="text-btn"
              disabled={busy || Boolean(activeWorkout)}
              onClick={() => advance("skip")}
            >
              Skip and advance
            </button>
          </div>

          <div className="field">
            <strong>Cycle</strong>
            <ol>
              {ordered.map(step => {
                const plan = plans.find(p => p.id === step.plan_id);
                return (
                  <li key={step.id}>
                    {step.kind === "rest"
                      ? "Rest"
                      : plan?.name || "Missing plan"}
                    {step.id === current.id ? " — Next" : ""}
                  </li>
                );
              })}
            </ol>
          </div>
        </>
      ) : (
        <p className="muted">
          No active rotation yet. Create one using your saved plans.
        </p>
      )}

      {!editing ? (
        <button
          type="button"
          className="primary"
          disabled={busy || loading}
          onClick={() => setEditing(true)}
        >
          {rotation ? "Create Replacement Rotation" : "Set Up Rotation"}
        </button>
      ) : (
        <div className="field">
          <h3>Configure rotation</h3>

          <label>Rotation name</label>
          <input
            value={name}
            maxLength={120}
            onChange={e => setName(e.target.value)}
          />

          {steps.map((step, index) => (
            <div className="field" key={index}>
              <strong>Day {index + 1}</strong>

              {step.kind === "rest" ? (
                <p className="muted">Rest Day</p>
              ) : (
                <>
                  <label>Saved workout plan</label>
                  <select
                    value={step.plan_id}
                    onChange={e =>
                      updateStep(index, e.target.value)
                    }
                  >
                    <option value="">Select a plan</option>
                    {plans.map(plan => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>
          ))}

          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <button
              type="button"
              className="primary"
              disabled={busy}
              onClick={saveRotation}
            >
              Save Rotation
            </button>

            <button
              type="button"
              className="text-btn"
              disabled={busy}
              onClick={() => {
                setEditing(false);
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
