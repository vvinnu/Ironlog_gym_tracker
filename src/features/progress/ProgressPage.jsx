
/**
 * IRONLOG — PROGRESSPAGE
 * File: src/features/progress/ProgressPage.jsx
 * Responsibility: Renders the existing ProgressPage tab without changing its UI.
 * Used by: src/App.jsx
 * Related: src/components/AppShared.jsx; src/services/workoutService.js
 * Receives application state/actions as props; no Supabase calls here.
 */
import React,{ lazy ,Suspense,useState} from "react";
import { Empty } from "../../components/AppShared";
import BodyWeightCheckIn from "../../components/BodyWeightCheckIn";

// 01.01 - Load the chart library separately.
const WeightChart = lazy(() => import("../../components/WeightChart"));
import { fmt } from "../../utils/formatters";

// ============================================================
// 01. PAGE RENDERING
// ============================================================
/**
 * 01.01 - RENDER PROGRESSPAGE
 * Props are passed unchanged from App.jsx to preserve behavior.
 * @param {Object} props - Existing application state and callbacks.
 * @returns {React.ReactElement} Existing page JSX.
 */
export default function ProgressPage({
  workouts,
  weights,
  totalVolume,
  prs,
  weightUnit,
  setWeightUnit,
  logWeight,
  weightSaving,
}) {
  // 01.02 - Filter the chart by check-in period.
  const [weightPeriod, setWeightPeriod] = useState("both");

  // 01.03 - Show the most recent check-ins first.
  const recentWeights = [...weights]
    .filter(entry =>
      ["morning", "bedtime"].includes(entry.check_in_type)
    )
    .sort((a, b) =>
      b.measurement_date.localeCompare(a.measurement_date) ||
      b.check_in_type.localeCompare(a.check_in_type)
    )
    .slice(0, 10);  return (
      <section className="content"><div className="welcome-row"><div><div className="eyebrow">THE BIG PICTURE</div><h1>Your <span>progress.</span></h1><p className="muted">Measure consistency, strength and body-weight trends.</p></div></div><div className="two-col">
        {/* 01.04 - Compact body-weight check-in and trends. */}
        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="eyebrow">BODY WEIGHT</div>
              <h2>Weight tracking</h2>
            </div>
          </div>

          <BodyWeightCheckIn
            weights={weights}
            weightUnit={weightUnit}
            setWeightUnit={setWeightUnit}
            logWeight={logWeight}
            weightSaving={weightSaving}
          />

          {/* 01.05 - Select the measurement series. */}
          <div className="bw-chart-heading">
            <h3>Weight trend</h3>

            <div className="bw-chart-filters">
              {["both", "morning", "bedtime"].map(option => (
                <button
                  key={option}
                  type="button"
                  className={weightPeriod === option ? "active" : ""}
                  onClick={() => setWeightPeriod(option)}
                >
                  {option === "both"
                    ? "Both"
                    : option === "morning"
                      ? "AM"
                      : "PM"}
                </button>
              ))}
            </div>
          </div>

          <Suspense
            fallback={<div className="chart-empty">Loading chart...</div>}
          >
            <WeightChart
              data={weights}
              large
              unit={weightUnit}
              period={weightPeriod}
            />
          </Suspense>

          <div className="bw-legend">
            <span><i className="bw-morning-dot" /> Morning</span>
            <span><i className="bw-bedtime-dot" /> Bedtime</span>
          </div>

          {/* 01.06 - Display recent saved measurements. */}
          <div className="bw-history">
            <h3>Recent check-ins</h3>

            {recentWeights.length === 0 ? (
              <p className="muted small">No check-ins yet.</p>
            ) : (
              recentWeights.map(entry => {
                const kg = Number(entry.weight_kg);
                const value = weightUnit === "lbs"
                  ? kg * 2.2046226218
                  : kg;

                return (
                  <div className="bw-history-row" key={entry.id}>
                    <span>{entry.measurement_date}</span>
                    <span>
                      {entry.check_in_type === "morning"
                        ? "Morning"
                        : "Bedtime"}
                    </span>
                    <strong>
                      {value.toFixed(1)} {weightUnit}
                    </strong>
                  </div>
                );
              })
            )}
          </div>
        </div><div className="panel"><div className="panel-head"><div><div className="eyebrow">TRAINING VOLUME</div><h2>Recent sessions</h2></div></div>{workouts.slice(0,8).map(w=><div className="volume-row" key={w.id}><span>{new Date(w.workout_date+"T12:00:00").toLocaleDateString(undefined,{month:"short",day:"numeric"})}</span><div className="volume-bar"><i style={{width:`${Math.min(100,(w.sets.reduce((a,s)=>a+(Number(s.weight_kg)||0)*(Number(s.reps)||0),0)/Math.max(1,totalVolume))*100*4)}%`}}/></div><b>{fmt(w.sets.reduce((a,s)=>a+(Number(s.weight_kg)||0)*(Number(s.reps)||0),0))}</b></div>)}{!workouts.length&&<Empty title="No training data yet" text="Log a few workouts to see your volume trend."/>}</div></div><div className="panel"><div className="panel-head"><div><div className="eyebrow">PERSONAL BESTS</div><h2>Best logged weight by exercise</h2></div></div>{Object.keys(prs).length?<div className="record-grid">{Object.entries(prs).map(([n,v])=><div className="record" key={n}><span>{n}</span><b>{fmt(v)} <small>kg</small></b></div>)}</div>:<Empty title="Your first PR is waiting" text="Start logging sets to build your personal records."/>}</div></section>
  );
}
