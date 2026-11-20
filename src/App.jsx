import React, { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { supabase, isCloudConfigured } from "./supabase";
import { getPreviousPerformance } from "./utils/workoutCalculations";
import { normalizeWorkoutHistory } from "./utils/workoutHistory";
import { fetchBodyweightHistory, saveBodyweightEntry } from "./services/bodyweightService";
import { fetchCompletedWorkouts, saveWorkoutSession } from "./services/workoutService";
import { fetchExercises, createExerciseRecord } from "./services/exerciseService";
import { Home, Dumbbell, CalendarDays, TrendingUp, Settings, Menu, X, LogOut, CircleUserRound } from "lucide-react";
// ============================================================
// 01. LAZY-LOADED FEATURE PAGES
// ============================================================

const Dashboard = lazy(() => import("./features/dashboard/Dashboard"));
const WorkoutsPage = lazy(() => import("./features/workouts/WorkoutsPage"));
const HistoryPage = lazy(() => import("./features/history/HistoryPage"));
const ProgressPage = lazy(() => import("./features/progress/ProgressPage"));
const SettingsPage = lazy(() => import("./features/settings/SettingsPage"));
const dateKey = d => new Date(d).toISOString().slice(0,10);
const today = dateKey(new Date());
const emptyWorkout = () => ({id:crypto.randomUUID(), workout_date:today, name:"Workout", notes:"", sets:[]});

export default function App(){
  const [tab,setTab] = useState("Overview");
  const [user,setUser] = useState(null);
  const [authMode,setAuthMode] = useState("signin");
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [busy,setBusy] = useState(false);
  const [notice,setNotice] = useState("");
  const [workouts,setWorkouts] = useState([]);
  const [weights,setWeights] = useState([]);
  const [exerciseList,setExerciseList] = useState([]);
  const [newExerciseName,setNewExerciseName] = useState("");
  const [newExerciseMuscle,setNewExerciseMuscle] = useState("");
  const [showExerciseForm,setShowExerciseForm] = useState(false);
  const [activeWorkout,setActiveWorkout] = useState(null);
  const [newWeight,setNewWeight] = useState("");
  const [muscleFilter,setMuscleFilter] = useState("All");
  const [mobileMenu,setMobileMenu] = useState(false);

  useEffect(()=>{
    if(!supabase) return;
    supabase.auth.getSession().then(({data})=>setUser(data.session?.user ?? null));
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_event,session)=>setUser(session?.user ?? null));
    return ()=>subscription.unsubscribe();
  },[]);

  useEffect(()=>{
    if(!user || !supabase) return;
    let alive=true;
    (async()=>{

// ============================================================
// 02.01 - LOAD USER DATA FROM SUPABASE
// ============================================================
//
// Load completed workouts, bodyweight history,
// and the exercise library through their dedicated services.

const [w, b, e] = await Promise.all([
  fetchCompletedWorkouts(),

// 02.02 - Retrieve bodyweight history.
// See: src/services/bodyweightService.js
fetchBodyweightHistory(),

  // 02.03 - Exercise library query; see exerciseService.js.
  fetchExercises(),

]);      if(!alive) return;
 if (w.error) {
  setNotice(w.error.message);
} else {

// 02.01 - Normalize the completed workouts loaded from Supabase.
setWorkouts(normalizeWorkoutHistory(w.data));

}
      if(b.error) setNotice(b.error.message); else setWeights(b.data||[]);
if (e.error) {
  setNotice(e.error.message);
} else {
  setExerciseList(e.data || []);
}
    })();
    return ()=>{alive=false};
  },[user]);

  const allSets = workouts.flatMap(w=>(w.sets||[]).map(s=>({...s,workout_date:w.workout_date})));
  const totalVolume = allSets.reduce((a,s)=>a+(Number(s.weight_kg)||0)*(Number(s.reps)||0),0);
  const prs = useMemo(()=>{
    const map={}; allSets.forEach(s=>{const n=s.exercise_name; map[n]=Math.max(map[n]||0,Number(s.weight_kg)||0)}); return map;
  },[workouts]);
  const latestWeight = weights.length ? Number(weights[weights.length-1].weight_kg) : null;
  const weekCount = workouts.filter(w=>(Date.now()-new Date(w.workout_date+"T12:00:00").getTime())<7*86400000).length;

/**
 * Previous completed performance for each exercise.
 * Recalculates only when the workout history changes.
 */
const previousPerformance = useMemo(
  () => getPreviousPerformance(workouts),
  [workouts]
);
  async function auth(){
    if(!supabase){setNotice("Cloud setup is not connected yet. Follow the Supabase setup guide in the project README.");return;}
    setBusy(true); setNotice("");
    const result = authMode==="signup"
      ? await supabase.auth.signUp({email,password})
      : await supabase.auth.signInWithPassword({email,password});
    setBusy(false);
    if(result.error) setNotice(result.error.message);
    else setNotice(authMode==="signup" ? "Check your email to confirm your account." : "Signed in.");
  }
// 03.01 - Sign out without deleting locally saved workout drafts.
async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    setNotice(error.message);
    return;
  }

  setUser(null);
  setWorkouts([]);
  setWeights([]);
  setExerciseList([]);
  setActiveWorkout(null);
  setShowExerciseForm(false);
}
  async function createExercise(){
    const name=newExerciseName.trim();
    if(!name){setNotice("Exercise name is required.");return;}
    if(exerciseList.some(e=>e.name.trim().toLowerCase()===name.toLowerCase())){
      setNotice("An exercise with this name already exists. Select it from the list.");return;
    }
    setBusy(true);
    // 02.04 - Persist exercise through exerciseService.js.
    const {data,error}=await createExerciseRecord(
      user.id, name, newExerciseMuscle.trim()
    );
    setBusy(false);
    if(error){setNotice(error.message);return;}
setExerciseList(prev =>
  [...prev, data].sort((a, b) => a.name.localeCompare(b.name))
);

setNewExerciseName("");
setNewExerciseMuscle("");
setShowExerciseForm(false);
setNotice("Exercise created.");
  }

  async function saveSession(exercises, complete = false) {
    if (!supabase || !user || !activeWorkout) {
      throw new Error("Sign in and start a workout first.");
    }

// 03.01 - Save the workout through the dedicated service.
// See: src/services/workoutService.js
const { data, error } = await saveWorkoutSession(
  activeWorkout,
  exercises,
  complete
);

    if (error) {
      throw new Error(error.message);
    }

    if (!complete) {
      setActiveWorkout(previous =>
        previous
          ? { ...previous, cloud_id: data }
          : previous
      );

      return data;
    }

// 03.02 - Refresh completed history after saving a workout.
// Uses the same query as the initial data load.
const { data: completed, error: historyError } =
  await fetchCompletedWorkouts();
    if (historyError) {
      setNotice(
        "Workout saved, but history could not refresh: " +
        historyError.message
      );
    } else {

// 02.02 - Refresh normalized history after completing a workout.
setWorkouts(normalizeWorkoutHistory(completed));
      setNotice("Workout saved to Supabase.");
    }

    setActiveWorkout(null);
    setTab("History");

    return data;
  }
  async function logWeight(){
    const value=Number(newWeight);
    if(!value || value<20 || value>400) return setNotice("Enter a valid body weight in kg.");
    if(!supabase || !user) return setNotice("Connect Supabase and sign in to save body weight entries.");
// 03.01 - Save the validated bodyweight measurement.
// See: src/services/bodyweightService.js
const { data, error } = await saveBodyweightEntry(
  user.id,
  value
);
    if(error) setNotice(error.message); else {setWeights(p=>[...p,data]);setNewWeight("");setNotice("Body weight saved.");}
  }

  if(!user) return <div className="auth-shell">
    <div className="auth-card">
      <div className="brand-mark"><Dumbbell size={25}/></div>
      <div className="eyebrow">YOUR TRAINING, YOUR DATA</div>
      <h1>Build strength.<br/><span>Track every rep.</span></h1>
      <p className="muted">Your personal gym log, progress dashboard and training history.</p>
      <div className="field"><label>Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></div>
      <div className="field"><label>Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 6 characters"/></div>
      <button className="primary full" disabled={busy || !email || !password} onClick={auth}>{busy?"Please wait…":authMode==="signup"?"Create account":"Sign in"}</button>
      <button className="link full" onClick={()=>setAuthMode(authMode==="signup"?"signin":"signup")}>{authMode==="signup"?"Already have an account? Sign in":"New here? Create an account"}</button>
      {!isCloudConfigured && <div className="setup-note"><strong>Setup needed</strong><br/>Connect your free Supabase project using the steps in README.md. The app will then enable secure accounts and cloud sync.</div>}
      {notice && <div className="notice">{notice}</div>}
      <div className="auth-foot">IRONLOG <span>•</span> PRIVATE BY DESIGN</div>
    </div>
  </div>;

  const nav=[["Overview",Home],["Workouts",Dumbbell],["History",CalendarDays],["Progress",TrendingUp],["Settings",Settings]];
  return <div className="app-shell">
    <aside className={`sidebar ${mobileMenu?"open":""}`}>
      <div className="brand"><div className="brand-mark"><Dumbbell size={20}/></div><span>IRON<span className="accent">LOG</span></span></div>
      <div className="side-label">WORKSPACE</div>
      {nav.map(([n,I])=><button key={n} className={`nav-item ${tab===n?"active":""}`} onClick={()=>{setTab(n);setMobileMenu(false)}}><I size={18}/>{n}</button>)}
      <div className="sidebar-bottom"><div className="user-chip"><CircleUserRound/><div><b>{user.email?.split("@")[0]}</b><small>Personal account</small></div></div><button className="nav-item" onClick={signOut}><LogOut size={18}/>Sign out</button></div>
    </aside>
    <main className="main">
      <header className="topbar"><button className="icon-btn menu-btn" onClick={()=>setMobileMenu(!mobileMenu)}><Menu/></button><div><div className="eyebrow">TRAINING SPACE</div><div className="top-title">{tab}</div></div><div className="top-right"><span className="sync-pill"><span className="live-dot"/>{isCloudConfigured?"Cloud account":"Cloud setup"}</span><div className="avatar">{(user.email||"U")[0].toUpperCase()}</div></div></header>
      {notice && <div className="notice global-notice">{notice}<button onClick={()=>setNotice("")}><X size={15}/></button></div>}
<Suspense fallback={<div className="content">Loading page...</div>}>
  {tab==="Overview" && <Dashboard
        workouts={workouts} weights={weights} weekCount={weekCount}
        totalVolume={totalVolume} prs={prs} latestWeight={latestWeight}
        newWeight={newWeight} setNewWeight={setNewWeight} logWeight={logWeight}
        setTab={setTab} setActiveWorkout={setActiveWorkout} emptyWorkout={emptyWorkout}
      />}      
      
{tab === "Workouts" && (
  <WorkoutsPage
    key={user.id}
    userId={user.id}
    activeWorkout={activeWorkout}
    setActiveWorkout={setActiveWorkout}
    exerciseList={exerciseList}
    previousPerformance={previousPerformance}
    saveSession={saveSession}
    muscleFilter={muscleFilter}
    setMuscleFilter={setMuscleFilter}
    emptyWorkout={emptyWorkout}

    // 01.01 - Exercise creation controls.
    showExerciseForm={showExerciseForm}
    setShowExerciseForm={setShowExerciseForm}
    newExerciseName={newExerciseName}
    setNewExerciseName={setNewExerciseName}
    newExerciseMuscle={newExerciseMuscle}
    setNewExerciseMuscle={setNewExerciseMuscle}
    createExercise={createExercise}
    busy={busy}
  />
)}

{tab==="History" && <HistoryPage
        workouts={workouts} setActiveWorkout={setActiveWorkout}
        setTab={setTab} emptyWorkout={emptyWorkout}
      />}
{tab==="Progress" && <ProgressPage
        workouts={workouts} weights={weights} totalVolume={totalVolume} prs={prs}
      />}
{tab==="Settings" && <SettingsPage user={user} signOut={signOut} />}
</Suspense>
      <footer>IRONLOG <span>•</span> BUILT FOR YOUR NEXT REP</footer>
    </main>
    <nav className="mobile-nav">{nav.slice(0,4).map(([n,I])=><button key={n} className={tab===n?"active":""} onClick={()=>setTab(n)}><I size={19}/><small>{n}</small></button>)}</nav>
  </div>;
}
