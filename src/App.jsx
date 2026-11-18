import React, { useEffect, useMemo, useState } from "react";
import { supabase, isCloudConfigured } from "./supabase";
import {
  Activity, BarChart3, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight,
  CircleUserRound, Dumbbell, Flame, Home, LogOut, Menu, Plus, Settings, Timer,
  TrendingUp, Trophy, Weight, X
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const starterExercises = [
  ["Lat pulldown","Back"],["Pull-up","Back"],["Seated cable row","Back"],["Reverse fly","Shoulders"],
  ["Biceps curl machine","Arms"],["Hammer curl","Arms"],["Bench press","Chest"],["Incline dumbbell press","Chest"],
  ["Shoulder press","Shoulders"],["Lateral raise","Shoulders"],["Leg press","Legs"],["Squat","Legs"],
  ["Romanian deadlift","Legs"],["Leg curl","Legs"],["Calf raise","Legs"],["Cable triceps pushdown","Arms"],
  ["Plank","Core"],["Cable crunch","Core"]
].map(([name,muscle])=>({name,muscle}));

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
  const [exerciseList,setExerciseList] = useState(starterExercises);
  const [activeWorkout,setActiveWorkout] = useState(null);
  const [newWeight,setNewWeight] = useState("");
  const [selectedExercise,setSelectedExercise] = useState("Lat pulldown");
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
      const [w,b] = await Promise.all([
        supabase.from("workouts").select("*, workout_sets(*)").order("workout_date",{ascending:false}),
        supabase.from("bodyweight_logs").select("*").order("logged_at",{ascending:true})
      ]);
      if(!alive) return;
      if(w.error) setNotice(w.error.message); else setWorkouts((w.data||[]).map(x=>({...x,sets:x.workout_sets||[]})));
      if(b.error) setNotice(b.error.message); else setWeights(b.data||[]);
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
  async function signOut(){await supabase?.auth.signOut();setUser(null);setWorkouts([]);setWeights([])}
  async function saveWorkout(){
    if(!activeWorkout) return;
    if(!supabase || !user){setNotice("Sign in after connecting Supabase to save workouts to your cloud account.");return;}
    setBusy(true);
    const {sets,...workout}=activeWorkout;
    const saved=await supabase.from("workouts").insert({...workout,user_id:user.id}).select().single();
    if(saved.error){setNotice(saved.error.message);setBusy(false);return;}
    if(sets.length){
      const rows=sets.map(s=>({...s,workout_id:saved.data.id,user_id:user.id}));
      const ins=await supabase.from("workout_sets").insert(rows);
      if(ins.error){setNotice(ins.error.message);setBusy(false);return;}
    }
    const fresh={...saved.data,sets};
    setWorkouts(prev=>[fresh,...prev]);setActiveWorkout(null);setTab("History");setBusy(false);setNotice("Workout saved to your account.");
  }
  function addSet(){
    if(!activeWorkout || !setWeight || !setReps) return;
    setActiveWorkout(w=>({...w,sets:[...w.sets,{id:crypto.randomUUID(),exercise_name:selectedExercise,weight_kg:Number(setWeight),reps:Number(setReps),set_number:w.sets.filter(s=>s.exercise_name===selectedExercise).length+1}]}));
    setSetWeight("");
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
        {activeWorkout?<div className="panel workout-builder">
          <div className="builder-top"><div><div className="eyebrow">IN PROGRESS</div><h2>{activeWorkout.name}</h2></div><button className="icon-btn" onClick={()=>setActiveWorkout(null)}><X/></button></div>
          <div className="builder-fields"><div className="field"><label>Workout name</label><input value={activeWorkout.name} onChange={e=>setActiveWorkout(w=>({...w,name:e.target.value}))}/></div><div className="field"><label>Date</label><input type="date" value={activeWorkout.workout_date} onChange={e=>setActiveWorkout(w=>({...w,workout_date:e.target.value}))}/></div></div>
          <div className="set-entry"><div className="field exercise-field"><label>Exercise</label><select value={selectedExercise} onChange={e=>setSelectedExercise(e.target.value)}>{exerciseList.map(e=><option key={e.name}>{e.name}</option>)}</select></div><div className="field"><label>Weight (kg)</label><input type="number" min="0" step="0.5" value={setWeight} onChange={e=>setSetWeight(e.target.value)} placeholder="45"/></div><div className="field"><label>Reps</label><input type="number" min="1" value={setReps} onChange={e=>setSetReps(e.target.value)}/></div><button className="primary add-set" onClick={addSet}><Plus size={17}/> Add set</button></div>
          <div className="sets-table"><div className="set-head"><span>EXERCISE</span><span>SET</span><span>WEIGHT</span><span>REPS</span><span></span></div>
            {activeWorkout.sets.length?activeWorkout.sets.map((s,i)=><div className="set-row" key={s.id}><b>{s.exercise_name}</b><span>{s.set_number}</span><span>{fmt(s.weight_kg)} kg</span><span>{s.reps}</span><button className="remove-btn" onClick={()=>setActiveWorkout(w=>({...w,sets:w.sets.filter(x=>x.id!==s.id)}))}><X size={15}/></button></div>):<div className="empty-inline">No sets yet. Add your first set above.</div>}
          </div>
          <div className="field"><label>Session notes (optional)</label><textarea rows="2" placeholder="How did the session feel?" value={activeWorkout.notes} onChange={e=>setActiveWorkout(w=>({...w,notes:e.target.value}))}/></div>
          <div className="builder-footer"><span className="muted small">{activeWorkout.sets.length} sets · {fmt(activeWorkout.sets.reduce((a,s)=>a+s.weight_kg*s.reps,0))} kg volume</span><button className="primary" disabled={!activeWorkout.sets.length||busy} onClick={saveWorkout}><Check size={17}/> Save workout</button></div>
        </div>:<div className="panel"><Empty title="Ready for your next session?" text="Start a workout, choose an exercise, and log weight and reps set by set."/><button className="primary centered" onClick={()=>setActiveWorkout(emptyWorkout())}><Plus size={18}/> Start a workout</button></div>}
        <div className="panel"><div className="panel-head"><div><div className="eyebrow">EXERCISE LIBRARY</div><h2>Exercises</h2></div><select className="filter-select" value={muscleFilter} onChange={e=>setMuscleFilter(e.target.value)}>{["All","Back","Chest","Shoulders","Arms","Legs","Core"].map(x=><option>{x}</option>)}</select></div><div className="exercise-grid">{exerciseList.filter(e=>muscleFilter==="All"||e.muscle===muscleFilter).map(e=><div className="exercise-chip" key={e.name}><span>{e.name}</span><small>{e.muscle}</small></div>)}</div></div>
      </section>}
      {tab==="History" && <section className="content"><div className="welcome-row"><div><div className="eyebrow">ALL SESSIONS</div><h1>Training <span>history.</span></h1><p className="muted">Every session is another step forward.</p></div><button className="primary" onClick={()=>{setActiveWorkout(emptyWorkout());setTab("Workouts")}}><Plus size={18}/> Log workout</button></div><div className="panel">{workouts.length?workouts.map(w=><WorkoutRow key={w.id} workout={w} detailed/>):<Empty title="No workouts logged yet" text="Your completed sessions will be collected here."/>}</div></section>}
      {tab==="Progress" && <section className="content"><div className="welcome-row"><div><div className="eyebrow">THE BIG PICTURE</div><h1>Your <span>progress.</span></h1><p className="muted">Measure consistency, strength and body-weight trends.</p></div></div><div className="two-col"><div className="panel"><div className="panel-head"><div><div className="eyebrow">BODY WEIGHT</div><h2>Weight trend</h2></div></div><WeightChart data={weights} large/><div className="muted small">Entries are shown in the order they were logged.</div></div><div className="panel"><div className="panel-head"><div><div className="eyebrow">TRAINING VOLUME</div><h2>Recent sessions</h2></div></div>{workouts.slice(0,8).map(w=><div className="volume-row" key={w.id}><span>{new Date(w.workout_date+"T12:00:00").toLocaleDateString(undefined,{month:"short",day:"numeric"})}</span><div className="volume-bar"><i style={{width:`${Math.min(100,(w.sets.reduce((a,s)=>a+s.weight_kg*s.reps,0)/Math.max(1,totalVolume))*100*4)}%`}}/></div><b>{fmt(w.sets.reduce((a,s)=>a+s.weight_kg*s.reps,0))}</b></div>)}{!workouts.length&&<Empty title="No training data yet" text="Log a few workouts to see your volume trend."/>}</div></div><div className="panel"><div className="panel-head"><div><div className="eyebrow">PERSONAL BESTS</div><h2>Best logged weight by exercise</h2></div></div>{Object.keys(prs).length?<div className="record-grid">{Object.entries(prs).map(([n,v])=><div className="record" key={n}><span>{n}</span><b>{fmt(v)} <small>kg</small></b></div>)}</div>:<Empty title="Your first PR is waiting" text="Start logging sets to build your personal records."/>}</div></section>}
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
