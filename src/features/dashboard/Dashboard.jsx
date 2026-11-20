
/**
 * IRONLOG — DASHBOARD
 * File: src/features/dashboard/Dashboard.jsx
 * Responsibility: Renders the existing Dashboard tab without changing its UI.
 * Used by: src/App.jsx
 * Related: src/components/AppShared.jsx; src/services/workoutService.js
 * Receives application state/actions as props; no Supabase calls here.
 */
import React,{lazy,Suspense} from "react";
import { Plus, Dumbbell, Activity, Trophy, Weight, ChevronRight } from "lucide-react";
import { Stat, WorkoutRow, Empty } from "../../components/AppShared";

// 01.01 - Load the chart library separately.
const WeightChart = lazy(() => import("../../components/WeightChart")); import { fmt } from "../../utils/formatters";

// ============================================================
// 01. PAGE RENDERING
// ============================================================
/**
 * 01.01 - RENDER DASHBOARD
 * Props are passed unchanged from App.jsx to preserve behavior.
 * @param {Object} props - Existing application state and callbacks.
 * @returns {React.ReactElement} Existing page JSX.
 */
export default function Dashboard({ workouts, weights, weekCount, totalVolume, prs, latestWeight, newWeight, setNewWeight, logWeight, setTab, setActiveWorkout, emptyWorkout }) {
  return (
      <section className="content">
        <div className="welcome-row"><div><div className="eyebrow">{new Date().toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"})}</div><h1>Let's get <span>stronger.</span></h1><p className="muted">Small improvements add up. Keep showing up.</p></div><button className="primary" onClick={()=>{setActiveWorkout(emptyWorkout());setTab("Workouts")}}><Plus size={18}/> Start workout</button></div>
        <div className="stats-grid">
          <Stat icon={Dumbbell} label="Workouts this week" value={weekCount} suffix="/ 5" trend="Consistency is key"/>
          <Stat icon={Activity} label="Total volume logged" value={fmt(totalVolume)} suffix="kg" trend="Weight × reps"/>
          <Stat icon={Trophy} label="Exercise records" value={Object.keys(prs).length} trend="Exercises tracked"/>
          <Stat icon={Weight} label="Latest body weight" value={latestWeight?fmt(latestWeight):"—"} suffix={latestWeight?"kg":""} trend="Log a weigh-in"/>
        </div>
        <div className="two-col">
          <div className="panel"><div className="panel-head"><div><div className="eyebrow">YOUR ACTIVITY</div><h2>Recent workouts</h2></div><button className="text-btn" onClick={()=>setTab("History")}>View history <ChevronRight size={15}/></button></div>
            {workouts.slice(0,4).length?workouts.slice(0,4).map(w=><WorkoutRow key={w.id} workout={w}/>):<Empty title="Your training history starts here" text="Log your first session to see it appear on your dashboard."/>}
          </div>
          <div className="panel"><div className="panel-head"><div><div className="eyebrow">QUICK CHECK-IN</div><h2>Body weight</h2></div><Weight size={19} className="dim"/></div><div className="weight-entry"><input type="number" step="0.1" placeholder="e.g. 63.5" value={newWeight} onChange={e=>setNewWeight(e.target.value)}/><span>kg</span><button className="primary compact" onClick={logWeight}><Plus size={16}/> Log</button></div><p className="muted small">Track your trend over time, not daily fluctuations.</p><Suspense fallback={<div className="chart-empty">Loading chart...</div>}>
  <WeightChart data={weights} />
</Suspense></div>
        </div>
        <div className="panel"><div className="panel-head"><div><div className="eyebrow">STRENGTH SNAPSHOT</div><h2>Top exercise weights</h2></div></div>
          {Object.keys(prs).length?<div className="record-grid">{Object.entries(prs).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([n,v])=><div className="record" key={n}><span>{n}</span><b>{fmt(v)} <small>kg</small></b></div>)}</div>:<Empty title="No records yet" text="Your best working weights will show here once you log sets."/>}
        </div>
      </section>
  );
}
