/**
 * IRONLOG — BODY WEIGHT CHECK-IN
 * File: src/components/BodyWeightCheckIn.jsx
 *
 * Compact morning/bedtime check-in form.
 * Converts display units without changing stored measurements.
 */

import React, { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

// 01.01 - Return the current local calendar date.
function localDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset)
    .toISOString()
    .slice(0, 10);
}

/**
 * 01.02 - Render the compact check-in form.
 *
 * @param {Object} props
 * @returns {React.ReactElement}
 */
export default function BodyWeightCheckIn({
  weights,
  weightUnit,
  setWeightUnit,
  logWeight,
  weightSaving,
}) {
  const [type, setType] = useState("morning");
  const [date, setDate] = useState(localDate);
  const [weight, setWeight] = useState("");

  // 01.03 - Find an existing check-in for the selected slot.
  const existing = weights.find(entry =>
    entry.measurement_date === date &&
    entry.check_in_type === type
  );

  // 01.04 - Populate the form when editing an existing entry.
  useEffect(() => {
    if (!existing) {
      setWeight("");
      return;
    }

    const kg = Number(existing.weight_kg);
    setWeight(
      (weightUnit === "lbs" ? kg * 2.2046226218 : kg)
        .toFixed(1)
    );
  }, [existing?.id, existing?.weight_kg, date, type]);

  /**
   * 01.05 - Change display units.
   * The numeric value is converted, not reinterpreted.
   *
   * @param {"kg"|"lbs"} nextUnit
   */
  function changeUnit(nextUnit) {
    if (nextUnit === weightUnit) return;

    setWeight(current => {
      if (!current.trim()) return "";

      const value = Number(current);
      if (!Number.isFinite(value)) return current;

      // 01.05.01 - Keep conversion precision until saving.
      return String(Number((
        nextUnit === "lbs"
          ? value * 2.2046226218
          : value / 2.2046226218
      ).toFixed(4)));
    });

    setWeightUnit(nextUnit);
  }

  /**
   * 01.06 - Submit the selected check-in.
   */
  async function handleSubmit(event) {
    event.preventDefault();

    const saved = await logWeight({
      weight,
      unit: weightUnit,
      date,
      type,
    });

    if (saved) {
      // Keep the saved value visible for editing.
    }
  }

  return (
    <form className="bw-checkin" onSubmit={handleSubmit}>
      <div className="bw-checkin-top">
        <h3>Weight check-in</h3>

        <div className="bw-unit-toggle">
          {["kg", "lbs"].map(unit => (
            <button
              key={unit}
              type="button"
              className={weightUnit === unit ? "active" : ""}
              onClick={() => changeUnit(unit)}
            >
              {unit}
            </button>
          ))}
        </div>
      </div>

      <div className="bw-period-grid">
        <button
          type="button"
          className={type === "morning" ? "active" : ""}
          onClick={() => setType("morning")}
        >
          <Sun size={16} />
          Morning
        </button>

        <button
          type="button"
          className={type === "bedtime" ? "active" : ""}
          onClick={() => setType("bedtime")}
        >
          <Moon size={16} />
          Bedtime
        </button>
      </div>

      <div className="bw-input-grid">
        <label>
          Weight ({weightUnit})
          <input
            type="number"
            inputMode="decimal"
            min="0.1"
            step="any"
            value={weight}
            onChange={event => setWeight(event.target.value)}
            placeholder="0.0"
            required
          />
        </label>

        <label>
          Date
          <input
            type="date"
            value={date}
            max={localDate()}
            onChange={event => setDate(event.target.value)}
            required
          />
        </label>
      </div>

      <button
        type="submit"
        className="primary full"
        disabled={
          weightSaving ||
          !weight.trim() ||
          !Number.isFinite(Number(weight)) ||
          Number(weight) <= 0 ||
          !date ||
          date > localDate()
        }
      >
        {weightSaving
          ? "Saving..."
          : existing
            ? "Update check-in"
            : "Save check-in"}
      </button>
    </form>
  );
}