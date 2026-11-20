
/**
 * IRONLOG — SHARED APPLICATION UI
 * File: src/components/AppShared.jsx
 * Responsibility: Existing reusable stat, empty-state, workout-row and chart UI.
 * Dependencies: react, lucide-react, recharts, src/utils/formatters.js
 * Used by: Dashboard, HistoryPage, ProgressPage, WorkoutsPage.
 * Existing JSX and chart behavior preserved from App.jsx.
 */
import React from "react";
import { Dumbbell } from "lucide-react";
import { fmt } from "../utils/formatters";

// ============================================================
// 01. SHARED PRESENTATION COMPONENTS
// ============================================================
export function Stat({icon:Icon,label,value,suffix,trend}){return <div className="stat-card"><div className="stat-top"><span>{label}</span><Icon size={18}/></div><div className="stat-value">{value}<small>{suffix}</small></div><div className="stat-foot">{trend}</div></div>}
export function Empty({title,text}){return <div className="empty-state"><div className="empty-icon"><Dumbbell size={22}/></div><b>{title}</b><p>{text}</p></div>}
export function WorkoutRow({workout,detailed}){const sets=workout.sets||[];const vol=sets.reduce((a,s)=>a+(Number(s.weight_kg)||0)*(Number(s.reps)||0),0);const names=[...new Set(sets.map(s=>s.exercise_name))];return <div className="workout-row"><div className="workout-date"><b>{new Date(workout.workout_date+"T12:00:00").toLocaleDateString(undefined,{day:"2-digit"})}</b><small>{new Date(workout.workout_date+"T12:00:00").toLocaleDateString(undefined,{month:"short",year:"numeric"})}</small></div><div className="workout-info"><b>{workout.name||"Workout"}</b><small>{names.slice(0,4).join(" · ")}{names.length>4?" …":""}</small>{detailed&&workout.notes&&<small className="note-text">{workout.notes}</small>}</div><div className="workout-meta"><b>{sets.length} sets</b><small>{fmt(vol)} kg vol.</small></div></div>}
