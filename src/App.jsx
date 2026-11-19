import React, { useEffect, useMemo, useState } from "react";
import { supabase, isCloudConfigured } from "./supabase";
import WorkoutLogger from "./components/WorkoutLogger";
import {
  Search, Activity, BarChart3, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight,
  CircleUserRound, Dumbbell, Flame, Home, LogOut, Menu, Plus, Settings, Timer,
  TrendingUp, Trophy, Weight, X
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const fmt = n => Number(n || 0).toLocaleString(undefined,{maximumFractionDigits:1});
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
  const [exerciseSearch,setExerciseSearch] = useState("");
  const [exerciseSearchOpen,setExerciseSearchOpen] = useState(false);
  const [newExerciseName,setNewExerciseName] = useState("");
  const [newExerciseMuscle,setNewExerciseMuscle] = useState("");
  const [showExerciseForm,setShowExerciseForm] = useState(false);
  const [activeWorkout,setActiveWorkout] = useState(null);
  const [newWeight,setNewWeight] = useState("");
  const [selectedExercise,setSelectedExercise] = useState("");
  const [setWeight,setSetWeight] = useState("");
  const [setReps,setSetReps] = useState("10");
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
      const [w,b,e] = await Promise.all([
        supabase
  .from("workouts")
  .select(`
    *,
    workout_exercises (
      id,
      exercise_id,
      exercise_name,
      position,
      workout_sets (
        id,
        set_number,
        weight_kg,
        reps,
        duration_seconds,
        distance_km
      )
    )
  `)
  .eq("status", "completed")
  .order("workout_date", { ascending: false }),
        supabase.from("bodyweight_logs").select("*").order("logged_at",{ascending:true}),
        supabase.from("exercises").select("id,name,primary_muscle,equipment,user_id").order("name")
      ]);
      if(!alive) return;
 if (w.error) {
  setNotice(w.error.message);
} else {
  setWorkouts(
    (w.data || []).map(workout => ({
      ...workout,
      sets: (workout.workout_exercises || []).flatMap(
        exercise =>
          (exercise.workout_sets || []).map(set => ({
            ...set,
            exercise_id: exercise.exercise_id,
            exercise_name: exercise.exercise_name,
          }))
      ),
    }))
  );
}
      if(b.error) setNotice(b.error.message); else setWeights(b.data||[]);
      if(e.error) setNotice(e.error.message); else {setExerciseList(e.data||[]);setSelectedExercise(old => old || e.data?.[0]?.id || "");}
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

     const previousPerformance = useMemo(() => {
    const latest = {};

    const sortedWorkouts = [...workouts].sort((a, b) => {
      const dateDifference =
        b.workout_date.localeCompare(a.workout_date);

      if (dateDifference !== 0) return dateDifference;

      return (b.completed_at || b.created_at || "").localeCompare(
        a.completed_at || a.created_at || ""
      );
    });

    for (const workout of sortedWorkouts) {
      const groupedExercises = {};

      for (const set of workout.sets || []) {
        if (!set.exercise_id) continue;

        if (!groupedExercises[set.exercise_id]) {
          groupedExercises[set.exercise_id] = [];
        }

        groupedExercises[set.exercise_id].push({
          set_number: set.set_number,
          weight_kg: set.weight_kg,
          reps: set.reps,
        });
      }

      for (const [exerciseId, sets] of Object.entries(groupedExercises)) {
        if (latest[exerciseId]) continue;

        latest[exerciseId] = {
          workout_date: workout.workout_date,
          workout_name: workout.name,
          sets: sets.sort((a, b) => a.set_number - b.set_number),
        };
      }
    }

    return latest;
  }, [workouts]);

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
  async function signOut(){await supabase?.auth.signOut();setUser(null);setWorkouts([]);setWeights([]);setExerciseList([]);setSelectedExercise("")}
  const selectedExerciseData = exerciseList.find(e=>e.id===selectedExercise);
  const matchingExercises = exerciseList.filter(e=>e.name.toLowerCase().includes(exerciseSearch.trim().toLowerCase()));

  async function createExercise(){
    const name=newExerciseName.trim();
    if(!name){setNotice("Exercise name is required.");return;}
    if(exerciseList.some(e=>e.name.trim().toLowerCase()===name.toLowerCase())){
      setNotice("An exercise with this name already exists. Select it from the list.");return;
    }
    setBusy(true);
    const {data,error}=await supabase.from("exercises").insert({
      user_id:user.id,name,primary_muscle:newExerciseMuscle.trim()||null
    }).select("id,name,primary_muscle,equipment,user_id").single();
    setBusy(false);
    if(error){setNotice(error.message);return;}
    setExerciseList(prev=>[...prev,data].sort((a,b)=>a.name.localeCompare(b.name)));
    setSelectedExercise(data.id);setExerciseSearch("");setNewExerciseName("");
    setNewExerciseMuscle("");setShowExerciseForm(false);setNotice("Exercise created.");
  }

  async function saveSession(exercises, complete = false) {
    if (!supabase || !user || !activeWorkout) {
      throw new Error("Sign in and start a workout first.");
    }

    const { data, error } = await supabase.rpc(
      "ironlog_save_session",
      {
        p_workout_id: activeWorkout.cloud_id || null,
        p_name: activeWorkout.name.trim(),
        p_workout_date: activeWorkout.workout_date,
        p_notes: activeWorkout.notes || "",
        p_exercises: exercises,
        p_complete: complete,
      }
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

    const { data: completed, error: historyError } =
      await supabase
        .from("workouts")
        .select(`
          *,
          workout_exercises (
            id,
            exercise_id,
            exercise_name,
            position,
            workout_sets (
              id,
              set_number,
              weight_kg,
              reps,
              duration_seconds,
              distance_km
            )
          )
        `)
        .eq("status", "completed")
        .order("workout_date", { ascending: false });

    if (historyError) {
      setNotice(
        "Workout saved, but history could not refresh: " +
        historyError.message
      );
    } else {
      setWorkouts(
        (completed || []).map(workout => ({
          ...workout,
          sets: (workout.workout_exercises || []).flatMap(
            exercise =>
              (exercise.workout_sets || []).map(set => ({
                ...set,
                exercise_id: exercise.exercise_id,
                exercise_name: exercise.exercise_name,
              }))
          ),
        }))
      );
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
    const {data,error}=await supabase.from("bodyweight_logs").insert({user_id:user.id,weight_kg:value}).select().single();
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
      {tab==="Overview" && <section className="content">
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
          <div className="panel"><div className="panel-head"><div><div className="eyebrow">QUICK CHECK-IN</div><h2>Body weight</h2></div><Weight size={19} className="dim"/></div><div className="weight-entry"><input type="number" step="0.1" placeholder="e.g. 63.5" value={newWeight} onChange={e=>setNewWeight(e.target.value)}/><span>kg</span><button className="primary compact" onClick={logWeight}><Plus size={16}/> Log</button></div><p className="muted small">Track your trend over time, not daily fluctuations.</p><WeightChart data={weights}/></div>
        </div>
        <div className="panel"><div className="panel-head"><div><div className="eyebrow">STRENGTH SNAPSHOT</div><h2>Top exercise weights</h2></div></div>
          {Object.keys(prs).length?<div className="record-grid">{Object.entries(prs).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([n,v])=><div className="record" key={n}><span>{n}</span><b>{fmt(v)} <small>kg</small></b></div>)}</div>:<Empty title="No records yet" text="Your best working weights will show here once you log sets."/>}
        </div>
      </section>}
      {tab==="Workouts" && <section className="content">
        <div className="welcome-row"><div><div className="eyebrow">SESSION LOGGER</div><h1>Workout <span>builder.</span></h1><p className="muted">Record each working set as you train.</p></div>{!activeWorkout&&<button className="primary" onClick={()=>setActiveWorkout(emptyWorkout())}><Plus size={18}/> New workout</button>}</div>
{activeWorkout ? (
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
          if (
            window.confirm(
              "Close this workout preview? Unsaved entries will be lost."
            )
          ) {
            setActiveWorkout(null);
          }
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
        
        <div className="panel"><div className="panel-head"><div><div className="eyebrow">EXERCISE LIBRARY</div><h2>Exercises</h2></div><select className="filter-select" value={muscleFilter} onChange={e=>setMuscleFilter(e.target.value)}>{["All","Back","Chest","Shoulders","Arms","Legs","Core"].map(x=><option key={x} value={x}>{x}</option>)}</select></div><div className="exercise-grid">{exerciseList.filter(e=>muscleFilter==="All"||e.primary_muscle===muscleFilter).map(e=><div className="exercise-chip" key={e.id}><span>{e.name}</span><small>{e.primary_muscle||"Other"}</small></div>)}</div></div>
      </section>}
      {tab==="History" && <section className="content"><div className="welcome-row"><div><div className="eyebrow">ALL SESSIONS</div><h1>Training <span>history.</span></h1><p className="muted">Every session is another step forward.</p></div><button className="primary" onClick={()=>{setActiveWorkout(emptyWorkout());setTab("Workouts")}}><Plus size={18}/> Log workout</button></div><div className="panel">{workouts.length?workouts.map(w=><WorkoutRow key={w.id} workout={w} detailed/>):<Empty title="No workouts logged yet" text="Your completed sessions will be collected here."/>}</div></section>}
      {tab==="Progress" && <section className="content"><div className="welcome-row"><div><div className="eyebrow">THE BIG PICTURE</div><h1>Your <span>progress.</span></h1><p className="muted">Measure consistency, strength and body-weight trends.</p></div></div><div className="two-col"><div className="panel"><div className="panel-head"><div><div className="eyebrow">BODY WEIGHT</div><h2>Weight trend</h2></div></div><WeightChart data={weights} large/><div className="muted small">Entries are shown in the order they were logged.</div></div><div className="panel"><div className="panel-head"><div><div className="eyebrow">TRAINING VOLUME</div><h2>Recent sessions</h2></div></div>{workouts.slice(0,8).map(w=><div className="volume-row" key={w.id}><span>{new Date(w.workout_date+"T12:00:00").toLocaleDateString(undefined,{month:"short",day:"numeric"})}</span><div className="volume-bar"><i style={{width:`${Math.min(100,(w.sets.reduce((a,s)=>a+(Number(s.weight_kg)||0)*(Number(s.reps)||0),0)/Math.max(1,totalVolume))*100*4)}%`}}/></div><b>{fmt(w.sets.reduce((a,s)=>a+(Number(s.weight_kg)||0)*(Number(s.reps)||0),0))}</b></div>)}{!workouts.length&&<Empty title="No training data yet" text="Log a few workouts to see your volume trend."/>}</div></div><div className="panel"><div className="panel-head"><div><div className="eyebrow">PERSONAL BESTS</div><h2>Best logged weight by exercise</h2></div></div>{Object.keys(prs).length?<div className="record-grid">{Object.entries(prs).map(([n,v])=><div className="record" key={n}><span>{n}</span><b>{fmt(v)} <small>kg</small></b></div>)}</div>:<Empty title="Your first PR is waiting" text="Start logging sets to build your personal records."/>}</div></section>}
      {tab==="Settings" && <section className="content"><div className="welcome-row"><div><div className="eyebrow">PREFERENCES</div><h1>App <span>settings.</span></h1><p className="muted">Manage your account and training units.</p></div></div><div className="panel settings-panel"><h2>Account</h2><p className="muted">{user.email}</p><div className="setting-row"><div><b>Cloud synchronization</b><small>Your workouts and body weight are stored in your Supabase account.</small></div><span className="sync-pill"><span className="live-dot"/> Connected</span></div><div className="setting-row"><div><b>Units</b><small>Weights and body weight are currently recorded in kilograms.</small></div><span className="muted">kg</span></div><button className="danger-btn" onClick={signOut}><LogOut size={17}/> Sign out</button></div></section>}
      <footer>IRONLOG <span>•</span> BUILT FOR YOUR NEXT REP</footer>
    </main>
    <nav className="mobile-nav">{nav.slice(0,4).map(([n,I])=><button key={n} className={tab===n?"active":""} onClick={()=>setTab(n)}><I size={19}/><small>{n}</small></button>)}</nav>
  </div>;
}

function Stat({icon:Icon,label,value,suffix,trend}){return <div className="stat-card"><div className="stat-top"><span>{label}</span><Icon size={18}/></div><div className="stat-value">{value}<small>{suffix}</small></div><div className="stat-foot">{trend}</div></div>}
function Empty({title,text}){return <div className="empty-state"><div className="empty-icon"><Dumbbell size={22}/></div><b>{title}</b><p>{text}</p></div>}
function WorkoutRow({workout,detailed}){const sets=workout.sets||[];const vol=sets.reduce((a,s)=>a+(Number(s.weight_kg)||0)*(Number(s.reps)||0),0);const names=[...new Set(sets.map(s=>s.exercise_name))];return <div className="workout-row"><div className="workout-date"><b>{new Date(workout.workout_date+"T12:00:00").toLocaleDateString(undefined,{day:"2-digit"})}</b><small>{new Date(workout.workout_date+"T12:00:00").toLocaleDateString(undefined,{month:"short",year:"numeric"})}</small></div><div className="workout-info"><b>{workout.name||"Workout"}</b><small>{names.slice(0,4).join(" · ")}{names.length>4?" …":""}</small>{detailed&&workout.notes&&<small className="note-text">{workout.notes}</small>}</div><div className="workout-meta"><b>{sets.length} sets</b><small>{fmt(vol)} kg vol.</small></div></div>}
function WeightChart({data,large}){if(!data.length)return <div className="chart-empty">Log your first weigh-in to see a chart.</div>;const chart=data.map((x,i)=>({date:new Date(x.logged_at).toLocaleDateString(undefined,{month:"short",day:"numeric"}),weight:Number(x.weight_kg),i}));return <div className={`chart ${large?"large":""}`}><ResponsiveContainer width="100%" height="100%"><AreaChart data={chart}><defs><linearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a3e635" stopOpacity={.24}/><stop offset="100%" stopColor="#a3e635" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#252a35" vertical={false}/><XAxis dataKey="date" tick={{fill:"#778091",fontSize:11}} axisLine={false} tickLine={false}/><YAxis domain={["dataMin - 1","dataMax + 1"]} tick={{fill:"#778091",fontSize:11}} axisLine={false} tickLine={false} width={35}/><Tooltip contentStyle={{background:"#151923",border:"1px solid #303746",borderRadius:10,color:"#fff"}}/><Area type="monotone" dataKey="weight" stroke="#a3e635" strokeWidth={2.5} fill="url(#weightFill)" /></AreaChart></ResponsiveContainer></div>}
