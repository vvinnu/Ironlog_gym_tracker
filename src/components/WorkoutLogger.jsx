
import { useEffect,useState } from "react";
import { Plus, Save, ChevronDown, ChevronUp, X } from "lucide-react";
import "./WorkoutLogger.css";

const blankRows = () =>
  Array.from({ length: 3 }, (_, i) => ({
    id: crypto.randomUUID(),
    weight: "",
    reps: "",
  }));

export default function WorkoutLogger({
  userId,
  exercises,
  previousPerformance = {},
  onSaveExercise,
  onSaveWorkout,
}) {
// ============================================================
// 01. ACCOUNT-SPECIFIC WORKOUT DRAFT
// ============================================================

// 01.01 - Each account uses a separate localStorage key.
const draftKey = `ironlog-workout-draft:${userId}`;

// 01.02 - Restore the current user's unfinished workout.
const [cards, setCards] = useState(() => {
  try {
    const saved = localStorage.getItem(draftKey);
    const parsed = saved ? JSON.parse(saved) : [];

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
});

// 01.03 - Workout logger UI state.
const [search, setSearch] = useState("");
const [message, setMessage] = useState("");
const [busy, setBusy] = useState(false);

// 01.04 - Automatically save unfinished changes locally.
useEffect(() => {
  try {
    localStorage.setItem(draftKey, JSON.stringify(cards));
  } catch {
    setMessage(
      "Unable to save draft locally. Avoid refreshing this page."
    );
  }
}, [cards, draftKey]);

  const updateCard = (id, change) => {
    setCards(previous =>
      previous.map(card =>
        card.id === id ? change(card) : card
      )
    );
  };

  const addExercise = exercise => {
    if (cards.some(c => c.exercise_id === exercise.id)) {
      setMessage("This exercise is already in your workout.");
      return;
    }

    setCards(previous => [
      ...previous,
      {
        id: crypto.randomUUID(),
        exercise_id: exercise.id,
        name: exercise.name,
        rows: blankRows(),
        collapsed: false,
        previousCollapsed: false,
        saved: false,
      },
    ]);

    setSearch("");
    setMessage("");
  };

  const updateSet = (cardId, rowId, field, value) => {
    updateCard(cardId, card => ({
      ...card,
      saved: false,
      rows: card.rows.map(row =>
        row.id === rowId
          ? { ...row, [field]: value }
          : row
      ),
    }));
  };

  const addSet = cardId => {
    updateCard(cardId, card => ({
      ...card,
      saved: false,
      rows: [
        ...card.rows,
        {
          id: crypto.randomUUID(),
          weight: "",
          reps: "",
        },
      ],
    }));
  };

    const copyPreviousSets = card => {
    const previous = previousPerformance[card.exercise_id];

    if (!previous || !previous.sets?.length) {
      setMessage("No previous sets available to copy.");
      return;
    }

    const hasEnteredValues = card.rows.some(
      row => row.weight !== "" || row.reps !== ""
    );

    if (hasEnteredValues) {
      const confirmed = window.confirm(
        `Replace today's entered sets for ${card.name} ` +
        "with the previous performance?"
      );

      if (!confirmed) return;
    }

    const copiedRows = [...previous.sets]
      .sort((a, b) => a.set_number - b.set_number)
      .map(set => ({
        id: crypto.randomUUID(),
        weight:
          set.weight_kg == null
            ? ""
            : String(set.weight_kg),
        reps:
          set.reps == null
            ? ""
            : String(set.reps),
      }));

    updateCard(card.id, current => ({
      ...current,
      rows: copiedRows,
      saved: false,
    }));

    setMessage(
      `${copiedRows.length} previous sets copied into ${card.name}. ` +
      "You can now edit them before saving."
    );
  };

  const togglePreviousPerformance = cardId => {
    updateCard(cardId, card => ({
      ...card,
      previousCollapsed: !card.previousCollapsed,
    }));
  };

  const prepareSets = card => {
    const filled = row =>
      row.weight.trim() !== "" ||
      row.reps.trim() !== "";

    const entered = card.rows
      .map((row, index) => ({ ...row, index }))
      .filter(filled);

    for (const row of entered) {
      if (
        (row.weight !== "" &&
          (!Number.isFinite(Number(row.weight)) ||
            Number(row.weight) < 0)) ||
        (row.reps !== "" &&
          (!Number.isInteger(Number(row.reps)) ||
            Number(row.reps) <= 0))
      ) {
        throw new Error(`Invalid values in ${card.name}.`);
      }
    }

    const gap = entered.some(
      (row, index) => row.index !== index
    );

    if (gap) {
      const proceed = window.confirm(
        `${card.name}: An earlier set is empty. ` +
        "Move filled sets up and number them consecutively?"
      );

      if (!proceed) {
        throw new Error("Review the skipped set.");
      }
    }

    return entered.map((row, index) => ({
      set_number: index + 1,
      weight_kg:
        row.weight === "" ? null : Number(row.weight),
      reps:
        row.reps === "" ? null : Number(row.reps),
    }));
  };

  const buildPayload = () =>
    cards.map(card => ({
      exercise_id: card.exercise_id,
      sets: prepareSets(card),
    }));

  const saveExercise = async card => {
    if (busy) return;

    try {
      const payload = buildPayload();

      setBusy(true);
      setMessage("");

      await onSaveExercise(payload);

      setCards(previous =>
        previous.map(item => ({
          ...item,
          saved: true,
        }))
      );

      setMessage(`${card.name}: workout draft saved to Supabase.`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  const saveWorkout = async () => {
    if (busy) return;

    try {
      const payload = buildPayload();

      if (!payload.some(item => item.sets.length > 0)) {
        throw new Error("Record at least one set.");
      }

      setBusy(true);
      setMessage("");

      await onSaveWorkout(payload);

      localStorage.removeItem(draftKey);
      setCards([]);
      setMessage("Workout saved successfully.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  
  const removeExercise = card => {
    if (
      card.rows.some(r => r.weight !== "" || r.reps !== "") &&
      !window.confirm(
        `Remove ${card.name} and its entered sets?`
      )
    ) return;

    setCards(previous =>
      previous.filter(item => item.id !== card.id)
    );
  };

  return (
    <div className="ironlog-logger">
      <h2>Workout in progress</h2>

      <div className="ironlog-search">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search and add exercise..."
        />

        {search.trim() && (
          <div className="ironlog-results">
            {exercises
              .filter(e =>
                e.name.toLowerCase().includes(
                  search.toLowerCase()
                )
              )
              .slice(0, 10)
              .map(exercise => (
                <button
                  key={exercise.id}
                  onClick={() => addExercise(exercise)}
                >
                  <Plus size={16} />
                  {exercise.name}
                </button>
              ))}
          </div>
        )}
      </div>

      {cards.map(card => (
        <div className="ironlog-card" key={card.id}>
          <div className="ironlog-card-header">
            <div>
              <h3>{card.name}</h3>
              <small>
                {card.saved ? "Draft saved" : "Unsaved changes"}
              </small>
            </div>

            <div className="ironlog-actions">
              <button
                aria-label="Collapse exercise"
                onClick={() =>
                  updateCard(card.id, c => ({
                    ...c,
                    collapsed: !c.collapsed,
                  }))
                }
              >
                {card.collapsed
                  ? <ChevronDown size={18} />
                  : <ChevronUp size={18} />}
              </button>

              <button
                aria-label="Remove exercise"
                onClick={() => removeExercise(card)}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {!card.collapsed && (
            <>
              {(() => {
                const previous =
                  previousPerformance[card.exercise_id];

                return (
                  <div
                    className="ironlog-previous-performance"
                    style={{
                      marginBottom: "18px",
                      padding: "14px",
                      border: "1px solid #303746",
                      borderRadius: "10px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <div>
                        <strong>Previous Performance</strong>

                        {previous && (
                          <div
                            style={{
                              fontSize: "12px",
                              opacity: 0.7,
                              marginTop: "4px",
                            }}
                          >
                            {previous.workout_name || "Workout"}
                            {" · "}
                            {previous.workout_date}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        aria-label={
                          card.previousCollapsed
                            ? "Expand previous performance"
                            : "Collapse previous performance"
                        }
                        aria-expanded={!card.previousCollapsed}
                        onClick={() =>
                          togglePreviousPerformance(card.id)
                        }
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "5px",
                        }}
                      >
                        {card.previousCollapsed ? (
                          <ChevronDown size={16} />
                        ) : (
                          <ChevronUp size={16} />
                        )}

                        {card.previousCollapsed
                          ? "Expand"
                          : "Collapse"}
                      </button>
                    </div>

                    {!card.previousCollapsed && (
                      <div style={{ marginTop: "14px" }}>
                        {previous?.sets?.length ? (
                          <>
                            <div className="ironlog-set-grid">
                              <strong>Set</strong>
                              <strong>Weight (kg)</strong>
                              <strong>Reps</strong>

                              {[...previous.sets]
                                .sort(
                                  (a, b) =>
                                    a.set_number - b.set_number
                                )
                                .map((set, index) => (
                                  <div
                                    className="ironlog-set-row"
                                    key={index}
                                  >
                                    <span>{set.set_number}</span>

                                    <span>
                                      {set.weight_kg ?? "—"}
                                    </span>

                                    <span>
                                      {set.reps ?? "—"}
                                    </span>
                                  </div>
                                ))}
                            </div>

                            <button
                              type="button"
                              className="ironlog-add-set"
                              disabled={busy}
                              onClick={() =>
                                copyPreviousSets(card)
                              }
                              style={{ marginTop: "12px" }}
                            >
                              <Save size={16} />
                              Copy to Today's Sets
                            </button>
                          </>
                        ) : (
                          <p
                            style={{
                              opacity: 0.7,
                              fontSize: "13px",
                            }}
                          >
                            No previous performance recorded.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="ironlog-set-grid">
                <strong>Set</strong>
                <strong>Weight (kg)</strong>
                <strong>Reps</strong>

                {card.rows.map((row, index) => (
                  <div
                    className="ironlog-set-row"
                    key={row.id}
                  >
                    <span>{index + 1}</span>

                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder="—"
                      value={row.weight}
                      onChange={e =>
                        updateSet(
                          card.id, row.id,
                          "weight", e.target.value
                        )
                      }
                    />

                    <input
                      type="number"
                      min="1"
                      step="1"
                      placeholder="—"
                      value={row.reps}
                      onChange={e =>
                        updateSet(
                          card.id, row.id,
                          "reps", e.target.value
                        )
                      }
                    />
                  </div>
                ))}
              </div>

              <button
                className="ironlog-add-set"
                onClick={() => addSet(card.id)}
              >
                <Plus size={16} /> Add another set
              </button>

              <button
                className="ironlog-save-exercise"
                disabled={busy}
                onClick={() => saveExercise(card)}
              >
                <Save size={16} /> Save Exercise
              </button>
            </>
          )}
        </div>
      ))}

      {message && <p role="status">{message}</p>}

      <button
        className="ironlog-save-workout"
        disabled={busy || !cards.length}
        onClick={saveWorkout}
      >
        Save Workout
      </button>
    </div>
  );
}
