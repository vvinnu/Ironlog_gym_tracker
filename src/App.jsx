import React, { lazy, Suspense, useEffect, useMemo, useState,useRef } from "react";
import { supabase, isCloudConfigured } from "./supabase";
import { getPreviousPerformance } from "./utils/workoutCalculations";
import { normalizeWorkoutHistory } from "./utils/workoutHistory";
import { fetchBodyweightHistory, saveBodyweightEntry } from "./services/bodyweightService";
import { fetchCompletedWorkouts,fetchDraftWorkouts, saveWorkoutSession } from "./services/workoutService";
import { fetchExercises, createExerciseRecord } from "./services/exerciseService";
import { fetchWorkoutPlans,createWorkoutPlan,updateWorkoutPlan,deleteWorkoutPlan,} from "./services/workoutPlanService";
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
// 01.01 - Create a workout associated with its account.
const emptyWorkout = (userId) => ({
  id: crypto.randomUUID(),
  owner_user_id: userId,
  workout_date: today,
  name: "Workout",
  notes: "",
  sets: [],
});
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

  // 02.07 - Saved workout plans for the current account.
  const [workoutPlans, setWorkoutPlans] = useState([]);
  const [workoutPlansLoading, setWorkoutPlansLoading] = useState(false);
  const [workoutPlansBusy, setWorkoutPlansBusy] = useState(false);

  const [newExerciseName,setNewExerciseName] = useState("");

  const [newExerciseMuscle,setNewExerciseMuscle] = useState("");
  const [showExerciseForm,setShowExerciseForm] = useState(false);
  const [activeWorkout,setActiveWorkout] = useState(null);
  // 02.04 - Unfinished sessions available in Supabase.
const [cloudDrafts, setCloudDrafts] = useState([]);
const [cloudDraftsLoading, setCloudDraftsLoading] = useState(false);
  // ============================================================
// 02. LOCAL WORKOUT METADATA RECOVERY
// ============================================================

// 02.01 - Track which account's draft has been loaded.
const restoredDraftUser = useRef(null);

// 02.02 - Restore workout metadata when the account changes.
useEffect(() => {
  if (!user?.id) {
    restoredDraftUser.current = null;
    setActiveWorkout(null);
    return;
  }

  const key = `ironlog-active-workout:${user.id}`;
  let restored = null;

  try {
    const saved = localStorage.getItem(key);

    if (saved) {
      const parsed = JSON.parse(saved);

      if (
        parsed &&
        typeof parsed === "object" &&
        typeof parsed.name === "string" &&
        typeof parsed.workout_date === "string" &&
        (!parsed.owner_user_id ||
          parsed.owner_user_id === user.id)
      ) {
        // 02.02.01 - Upgrade older account-specific drafts.
        restored = {
          ...parsed,
          owner_user_id: user.id,
        };
      }
    }
  } catch {
    setNotice("Unable to restore the saved workout metadata.");
  }

  restoredDraftUser.current = user.id;
  setActiveWorkout(restored);
}, [user?.id]);

// 02.03 - Persist metadata only for the correct account.
useEffect(() => {
  if (!user?.id || restoredDraftUser.current !== user.id) {
    return;
  }

  // 02.03.01 - Never persist metadata from another account.
  if (!activeWorkout || activeWorkout.owner_user_id !== user.id) {
    return;
  }

  try {
    localStorage.setItem(
      `ironlog-active-workout:${user.id}`,
      JSON.stringify(activeWorkout)
    );
  } catch {
    setNotice("Unable to save workout metadata locally.");
  }
}, [activeWorkout, user?.id]);

// ============================================================
// 02.05 - LOAD UNFINISHED CLOUD WORKOUTS
// ============================================================

/**
 * 02.05 - Discover unfinished workouts saved to Supabase.
 * This does not modify or overwrite the local workout.
 */
useEffect(() => {
  if (!user?.id || !supabase) {
    setCloudDrafts([]);
    setCloudDraftsLoading(false);
    return;
  }

  let cancelled = false;

  async function loadCloudDrafts() {
    setCloudDrafts([]);
    setCloudDraftsLoading(true);

    try {
      const { data, error } = await fetchDraftWorkouts();

      if (cancelled) return;

      if (error) {
        setNotice(`Unable to load cloud drafts: ${error.message}`);
        return;
      }

      setCloudDrafts(data || []);
    } catch (error) {
      if (!cancelled) {
        setNotice(`Unable to load cloud drafts: ${error.message}`);
      }
    } finally {
      if (!cancelled) {
        setCloudDraftsLoading(false);
      }
    }
  }

  loadCloudDrafts();

  return () => {
    cancelled = true;
  };
}, [user?.id]);

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

// ============================================================
// 02.06 - RESTORE A CLOUD WORKOUT DRAFT
// ============================================================

/**
 * 02.06 - Reconstruct a Supabase draft for the workout logger.
 * Requires confirmation before replacing local workout data.
 *
 * @param {Object} draft - Selected Supabase workout draft.
 */
async function resumeCloudDraft(draft) {
  if (!user?.id || !draft?.id || !supabase) return;

  // 02.06.00 - Verify the cloud draft is still current.
  try {
    const { data: latestDraft, error } = await supabase
      .from("workouts")
      .select("id, status, updated_at")
      .eq("id", draft.id)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    if (
      latestDraft.status !== "draft" ||
      latestDraft.updated_at !== draft.updated_at
    ) {
      setNotice(
        "This cloud workout has changed on another device. " +
        "Refresh the page before resuming it."
      );
      return;
    }
  } catch (error) {
    setNotice(
      `Unable to verify cloud workout: ${error.message}`
    );
    return;
  }

  // 02.06.01 - Check for existing local workout data.
  const metadataKey = `ironlog-active-workout:${user.id}`;
  const cardsKey = `ironlog-workout-draft:${user.id}`;

  let existingCards = [];

  try {
    const storedCards = localStorage.getItem(cardsKey);
    const parsedCards = storedCards
      ? JSON.parse(storedCards)
      : [];

    existingCards = Array.isArray(parsedCards)
      ? parsedCards
      : [];
  } catch {
    setNotice("Unable to inspect the local workout draft.");
    return;
  }

  const hasLocalWorkout = Boolean(activeWorkout) ||
    existingCards.length > 0;

  if (hasLocalWorkout) {
    const confirmed = window.confirm(
      "Resume this cloud workout? " +
      "Your current local workout and its exercise entries " +
      "will be replaced. Unsaved local changes will be lost."
    );

    if (!confirmed) return;
  }

  // 02.06.02 - Reject measurements the logger cannot edit.
  const hasUnsupportedSets = (draft.workout_exercises || [])
    .some(exercise =>
      (exercise.workout_sets || []).some(set =>
        set.duration_seconds != null ||
        set.distance_km != null
      )
    );

  if (hasUnsupportedSets) {
    setNotice(
      "This cloud workout contains duration or distance data " +
      "that the current logger cannot safely restore."
    );
    return;
  }

  // 02.06.03 - Convert cloud exercises into logger cards.
  const recoveredCards = [...(draft.workout_exercises || [])]
    .sort((a, b) => a.position - b.position)
    .map(exercise => ({
      id: crypto.randomUUID(),
      exercise_id: exercise.exercise_id,
      name: exercise.exercise_name,
      rows: [...(exercise.workout_sets || [])]
        .sort((a, b) => a.set_number - b.set_number)
        .map(set => ({
          id: crypto.randomUUID(),
          weight: set.weight_kg == null
            ? ""
            : String(set.weight_kg),
          reps: set.reps == null
            ? ""
            : String(set.reps),
        })),
      collapsed: false,
      previousCollapsed: false,
      saved: true,
    }));

  // 02.06.03 - Preserve the cloud ID for subsequent saves.
  const recoveredWorkout = {
    id: crypto.randomUUID(),
    owner_user_id: user.id,
    cloud_id: draft.id,
    name: draft.name,
    workout_date: draft.workout_date,
    notes: draft.notes || "",
    sets: [],
  };

  // 02.06.04 - Persist recovery with rollback on storage failure.
  let previousCards;
  let previousMetadata;

  try {
    previousCards = localStorage.getItem(cardsKey);
    previousMetadata = localStorage.getItem(metadataKey);

    localStorage.setItem(
      cardsKey,
      JSON.stringify(recoveredCards)
    );

    localStorage.setItem(
      metadataKey,
      JSON.stringify(recoveredWorkout)
    );
  } catch {
    try {
      if (previousCards === null) {
        localStorage.removeItem(cardsKey);
      } else if (previousCards !== undefined) {
        localStorage.setItem(cardsKey, previousCards);
      }

      if (previousMetadata === null) {
        localStorage.removeItem(metadataKey);
      } else if (previousMetadata !== undefined) {
        localStorage.setItem(metadataKey, previousMetadata);
      }
    } catch {
      setNotice("Recovery failed and local draft rollback was unsuccessful.");
      return;
    }

    setNotice("Unable to store the recovered cloud workout locally.");
    return;
  }

  setActiveWorkout(recoveredWorkout);
  setNotice(`Cloud workout "${draft.name}" restored.`);
}

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
  
  // ============================================================
  // 02.08 - LOAD SAVED WORKOUT PLANS
  // ============================================================

  /**
   * 02.08 - Load plans whenever the signed-in account changes.
   * RLS restricts records to the current account.
   */
  useEffect(() => {
    if (!user?.id || !supabase) {
      setWorkoutPlans([]);
      setWorkoutPlansLoading(false);
      return;
    }

    let cancelled = false;

    setWorkoutPlans([]);
    setWorkoutPlansLoading(true);

    async function loadPlans() {
      try {
        const { data, error } = await fetchWorkoutPlans();

        if (cancelled) return;

        if (error) {
          setNotice(`Unable to load workout plans: ${error.message}`);
        } else {
          setWorkoutPlans(data || []);
        }
      } catch (error) {
        if (!cancelled) {
          setNotice(`Unable to load workout plans: ${error.message}`);
        }
      } finally {
        if (!cancelled) {
          setWorkoutPlansLoading(false);
        }
      }
    }

    loadPlans();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // ============================================================
  // 03.04 - WORKOUT PLAN VALIDATION
  // ============================================================

  /**
   * 03.04 - Validate plan details before saving to Supabase.
   * @param {Object} form - Editable workout plan.
   * @returns {Object} Normalized plan payload.
   */
  function validateWorkoutPlan(form) {
    const name = form.name.trim();

    if (!name || name.length > 120) {
      throw new Error(
        "Plan name must be between 1 and 120 characters."
      );
    }

    if (!form.exercises.length) {
      throw new Error("Add at least one exercise to the plan.");
    }

    const seen = new Set();

    const exercises = form.exercises.map(entry => {
      if (seen.has(entry.exercise_id)) {
        throw new Error("A plan cannot contain duplicate exercises.");
      }

      seen.add(entry.exercise_id);

      if (!exerciseList.some(item =>
        item.id === entry.exercise_id
      )) {
        throw new Error(
          "One of the selected exercises is no longer available."
        );
      }

      const rawSets = String(entry.target_sets ?? "").trim();
      const targetSets = rawSets === ""
        ? null
        : Number(rawSets);

      if (
        targetSets !== null &&
        (!Number.isSafeInteger(targetSets) || targetSets <= 0)
      ) {
        throw new Error(
          "Target sets must be a positive whole number."
        );
      }

      const targetReps =
        String(entry.target_reps ?? "").trim() || null;

      return {
        exercise_id: entry.exercise_id,
        target_sets: targetSets,
        target_reps: targetReps,
      };
    });

    return {
      name,
      notes: form.notes.trim(),
      exercises,
    };
  }

  // ============================================================
  // 03.05 - SAVE WORKOUT PLAN
  // ============================================================

  /**
   * 03.05 - Create or update a saved workout plan.
   * @param {string|null} planId - Existing ID or null.
   * @param {Object} form - Plan editor values.
   */
  async function savePlan(planId, form) {
    if (!user?.id || !supabase) {
      throw new Error("Sign in to save workout plans.");
    }

    if (workoutPlansBusy) return;

    const validated = validateWorkoutPlan(form);

    setWorkoutPlansBusy(true);

    try {
      const result = planId
        ? await updateWorkoutPlan(user.id, planId, validated)
        : await createWorkoutPlan(user.id, validated);

      if (result.error) {
        throw new Error(result.error.message);
      }

      const refreshed = await fetchWorkoutPlans();


      if (refreshed.error) {
        throw new Error(
          "Plan was saved to Supabase, but the list could not refresh. " +
          "Refresh the page before trying again. " +
          refreshed.error.message
        );
      }


      setWorkoutPlans(refreshed.data || []);
      setNotice(
        planId ? "Workout plan updated." : "Workout plan created."
      );
    } finally {
      setWorkoutPlansBusy(false);
    }
  }

  // ============================================================
  // 03.06 - DELETE WORKOUT PLAN
  // ============================================================

  /**
   * 03.06 - Delete a saved plan after UI confirmation.
   * @param {string} planId - Plan to delete.
   */
  async function removePlan(planId) {
    if (!user?.id || !supabase) {
      throw new Error("Sign in to delete workout plans.");
    }

    if (workoutPlansBusy) return;

    setWorkoutPlansBusy(true);

    try {
      const { error } = await deleteWorkoutPlan(planId);

      if (error) {
        throw new Error(error.message);
      }

      setWorkoutPlans(previous =>
        previous.filter(plan => plan.id !== planId)
      );

      setNotice("Workout plan deleted.");
    } finally {
      setWorkoutPlansBusy(false);
    }
  }

  
  // ============================================================
  // 03.07 - START WORKOUT FROM A SAVED PLAN
  // ============================================================

  /**
   * 03.07 - Convert a saved plan into a new local workout.
   * Uses the existing logger draft format and storage keys.
   * Does not modify the saved plan or cloud workout drafts.
   *
   * @param {Object} selectedPlan - Plan selected by the user.
   * @returns {boolean} Whether the workout was started.
   */
  function startWorkoutFromPlan(selectedPlan) {
    if (!user?.id || !selectedPlan?.id) {
      setNotice("Sign in and select a workout plan first.");
      return false;
    }

    // 03.07.01 - Use the current plan from application state.
    const plan = workoutPlans.find(
      item => item.id === selectedPlan.id
    );

    if (!plan) {
      setNotice("This plan is no longer available. Refresh the page.");
      return false;
    }

    const entries = [
      ...(plan.workout_plan_exercises || []),
    ].sort((a, b) => a.position - b.position);

    if (!entries.length) {
      setNotice("Add exercises to this plan before starting it.");
      return false;
    }

    // 03.07.02 - Validate every exercise before changing local data.
    const plannedExercises = [];

    for (const entry of entries) {
      const exercise = exerciseList.find(
        item => item.id === entry.exercise_id
      );

      if (!exercise) {
        setNotice(
          "An exercise in this plan is unavailable. " +
          "Refresh the exercise library before starting."
        );
        return false;
      }

      const setCount = entry.target_sets == null
        ? 3
        : Number(entry.target_sets);

      if (
        !Number.isSafeInteger(setCount) ||
        setCount < 1 ||
        setCount > 100
      ) {
        setNotice(
          "This plan has an invalid target set count. " +
          "Use a value between 1 and 100."
        );
        return false;
      }

      plannedExercises.push({
        exercise,
        setCount,
        targetReps: entry.target_reps || "",
      });
    }

    // 03.07.03 - Inspect the current account's local draft.
    const metadataKey = `ironlog-active-workout:${user.id}`;
    const cardsKey = `ironlog-workout-draft:${user.id}`;

    let previousMetadata;
    let previousCards;
    let existingCards;

    try {
      previousMetadata = localStorage.getItem(metadataKey);
      previousCards = localStorage.getItem(cardsKey);

      existingCards = previousCards
        ? JSON.parse(previousCards)
        : [];

      if (!Array.isArray(existingCards)) {
        throw new Error("Invalid existing workout draft.");
      }
    } catch {
      setNotice(
        "Unable to inspect the current local workout. " +
        "No changes were made."
      );
      return false;
    }

    // 03.07.04 - Never silently replace unfinished local work.
    const hasLocalWorkout =
      Boolean(activeWorkout) ||
      Boolean(previousMetadata) ||
      existingCards.length > 0;

    if (hasLocalWorkout) {
      const confirmed = window.confirm(
        `Start "${plan.name}"? ` +
        "Your current local workout and its entered sets " +
        "will be replaced. Unsaved local changes will be lost. " +
        "Workouts already saved to Supabase will remain in the cloud."
      );

      if (!confirmed) return false;
    }

    // 03.07.05 - Build ordered cards for the existing logger.
    const newCards = plannedExercises.map(
      ({ exercise, setCount, targetReps }) => ({
        id: crypto.randomUUID(),
        exercise_id: exercise.id,
        name: exercise.name,
        target_sets: setCount,
        target_reps: targetReps,
        rows: Array.from({ length: setCount }, () => ({
          id: crypto.randomUUID(),
          weight: "",
          reps: "",
        })),
        collapsed: false,
        previousCollapsed: false,
        saved: false,
      })
    );

    // 03.07.06 - Create independent workout metadata.
    // The existing save-session RPC does not accept plan_id.
    const newWorkout = {
      ...emptyWorkout(user.id),
      name: plan.name,
      notes: plan.notes || "",
    };

    // 03.07.07 - Save both local records with rollback on failure.
    try {
      localStorage.setItem(
        cardsKey,
        JSON.stringify(newCards)
      );

      localStorage.setItem(
        metadataKey,
        JSON.stringify(newWorkout)
      );
    } catch {
      try {
        if (previousCards === null) {
          localStorage.removeItem(cardsKey);
        } else {
          localStorage.setItem(cardsKey, previousCards);
        }

        if (previousMetadata === null) {
          localStorage.removeItem(metadataKey);
        } else {
          localStorage.setItem(metadataKey, previousMetadata);
        }
      } catch {
        setNotice(
          "Workout setup failed and local recovery was unsuccessful. " +
          "Avoid refreshing until you check your current workout."
        );
        return false;
      }

      setNotice("Unable to store the planned workout locally.");
      return false;
    }

    // 03.07.08 - A new workout ID remounts the logger.
    // Its cards are restored from the newly written local draft.
    setActiveWorkout(newWorkout);
    setNotice(`Workout "${plan.name}" started.`);
    return true;
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

      // 03.01.01 - Refresh cloud drafts after saving.
      const { data: drafts, error: draftsError } =
        await fetchDraftWorkouts();

      if (draftsError) {
        setNotice(
          `Workout saved, but cloud drafts could not refresh: ${draftsError.message}`
        );
      } else {
        setCloudDrafts(drafts || []);
      }

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

// 03.03 - Clear completed workout metadata.
try {
  localStorage.removeItem(`ironlog-active-workout:${user.id}`);
} catch {
  setNotice("Workout completed, but local metadata cleanup failed.");
}

setActiveWorkout(null);

// 03.03.01 - Remove the completed workout from cloud drafts.
setCloudDrafts(previous =>
  previous.filter(draft => draft.id !== data)
);

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

  // 04.01 - Create workouts for the currently signed-in account.
  const createEmptyWorkout = () => emptyWorkout(user.id);

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
        setTab={setTab} setActiveWorkout={setActiveWorkout} emptyWorkout={createEmptyWorkout}
      />}      
      
{tab === "Workouts" && (
  <WorkoutsPage
    key={user.id}

    userId={user.id}
    workoutPlans={workoutPlans}
    workoutPlansLoading={workoutPlansLoading}
    workoutPlansBusy={workoutPlansBusy}
    onSavePlan={savePlan}
    onDeletePlan={removePlan}
    onStartPlan={startWorkoutFromPlan}
    cloudDrafts={cloudDrafts}


    cloudDraftsLoading={cloudDraftsLoading}
    onResumeCloudDraft={resumeCloudDraft}
    activeWorkout={activeWorkout}
    setActiveWorkout={setActiveWorkout}
    exerciseList={exerciseList}
    previousPerformance={previousPerformance}
    saveSession={saveSession}
    muscleFilter={muscleFilter}
    setMuscleFilter={setMuscleFilter}
    emptyWorkout={createEmptyWorkout}
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
        setTab={setTab} emptyWorkout={createEmptyWorkout}
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
