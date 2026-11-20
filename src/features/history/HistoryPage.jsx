
/**
 * IRONLOG — HISTORYPAGE
 * File: src/features/history/HistoryPage.jsx
 * Responsibility: Renders the existing HistoryPage tab without changing its UI.
 * Used by: src/App.jsx
 * Related: src/components/AppShared.jsx; src/services/workoutService.js
 * Receives application state/actions as props; no Supabase calls here.
 */
import React from "react";
import { Plus } from "lucide-react";
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
  return (
      <section className="content"><div className="welcome-row"><div><div className="eyebrow">ALL SESSIONS</div><h1>Training <span>history.</span></h1><p className="muted">Every session is another step forward.</p></div><button className="primary" onClick={()=>{setActiveWorkout(emptyWorkout());setTab("Workouts")}}><Plus size={18}/> Log workout</button></div><div className="panel">{workouts.length?workouts.map(w=><WorkoutRow key={w.id} workout={w} detailed/>):<Empty title="No workouts logged yet" text="Your completed sessions will be collected here."/>}</div></section>
  );
}
