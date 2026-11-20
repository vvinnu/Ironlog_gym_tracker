
/**
 * IRONLOG — WORKOUT SERVICE
 * ============================================================
 *
 * File: src/services/workoutService.js
 * Feature: Workouts
 *
 * Responsibility:
 * Handles Supabase operations for workout sessions and
 * completed workout history.
 *
 * Dependencies:
 * - src/supabase.js
 *
 * Used by:
 * - src/App.jsx (after integration)
 *
 * Related modules:
 * - src/utils/workoutHistory.js
 * - src/utils/workoutCalculations.js
 * - src/components/WorkoutLogger.jsx
 *
 * Notes:
 * - This module handles database communication only.
 * - React state updates remain in App.jsx.
 * - Workout history normalization remains in workoutHistory.js.
 * - The save-session RPC is defined in supabase/schema.sql.
 */

import { supabase } from "../supabase";

// ============================================================
// 01. COMPLETED WORKOUT HISTORY
// ============================================================

/**
 * 01.01 - FETCH COMPLETED WORKOUTS
 *
 * Purpose:
 * Retrieves completed workouts, their exercises, and sets.
 *
 * How it works:
 * 1. Queries the workouts table.
 * 2. Includes related workout_exercises records.
 * 3. Includes workout_sets for each exercise.
 * 4. Filters for completed workouts.
 * 5. Orders workouts by date, newest first.
 *
 * Used by:
 * - App.jsx during initial data loading.
 * - App.jsx after completing a workout.
 *
 * Returns raw Supabase results.
 * The caller handles errors and normalizes the data.
 *
 * @returns {Promise<Object>} Supabase result containing data/error.
 */
export async function fetchCompletedWorkouts() {
  return supabase
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
}

// ============================================================
// 01.02 - FETCH UNFINISHED CLOUD WORKOUTS
// ============================================================

/**
 * Retrieves the signed-in user's cloud drafts,
 * including exercise cards and recorded sets.
 *
 * @returns {Promise<Object>} Supabase result.
 */
export async function fetchDraftWorkouts() {
  return supabase
    .from("workouts")
    .select(`
      id,
      name,
      workout_date,
      notes,
      updated_at,
      workout_exercises (
        exercise_id,
        exercise_name,
        position,
        workout_sets (
          set_number,
          weight_kg,
          reps,
          duration_seconds,
          distance_km
        )
      )
    `)
    .eq("status", "draft")
    .order("updated_at", { ascending: false });
}

// ============================================================
// 02. WORKOUT SESSION PERSISTENCE
// ============================================================

/**
 * 02.01 - SAVE WORKOUT SESSION
 *
 * Purpose:
 * Saves a workout draft or completes a workout in Supabase.
 *
 * How it works:
 * 1. Receives the active workout and prepared exercise sets.
 * 2. Calls the ironlog_save_session Supabase RPC.
 * 3. Passes the existing cloud ID when updating a draft.
 * 4. Uses the complete flag to distinguish drafts from
 *    completed sessions.
 *
 * Used by:
 * - App.jsx through its saveSession handler.
 *
 * Related module:
 * - WorkoutLogger.jsx builds the exercise payload.
 *
 * @param {Object} workout - Active workout metadata.
 * @param {Array} exercises - Prepared exercise/set payload.
 * @param {boolean} complete - Whether to complete the session.
 * @returns {Promise<Object>} Supabase result containing data/error.
 */
export async function saveWorkoutSession(
  workout,
  exercises,
  complete = false
) {
  return supabase.rpc("ironlog_save_session", {
    p_workout_id: workout.cloud_id || null,
    p_name: workout.name.trim(),
    p_workout_date: workout.workout_date,
    p_notes: workout.notes || "",
    p_exercises: exercises,
    p_complete: complete,
  });
}
