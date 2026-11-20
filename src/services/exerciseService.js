
/**
 * IRONLOG — EXERCISE SERVICE
 * File: src/services/exerciseService.js
 * Responsibility: Supabase exercise-library reads and inserts.
 * Dependencies: src/supabase.js
 * Used by: src/App.jsx
 * Related: src/components/WorkoutLogger.jsx
 * Database operations only; UI validation and state remain in App.
 */
import { supabase } from "../supabase";

// ============================================================
// 01. EXERCISE LIBRARY
// ============================================================
/**
 * 01.01 - FETCH EXERCISES
 * @returns {Promise<Object>} Supabase data/error result.
 */
export async function fetchExercises() {
  return supabase
    .from("exercises")
    .select("id,name,primary_muscle,equipment,user_id")
    .order("name");
}

// ============================================================
// 02. EXERCISE CREATION
// ============================================================
/**
 * 02.01 - CREATE EXERCISE
 * Caller validates duplicates and name before invoking this function.
 * @param {string} userId - Authenticated user ID.
 * @param {string} name - Trimmed exercise name.
 * @param {string} muscle - Trimmed primary muscle, possibly empty.
 * @returns {Promise<Object>} Supabase data/error result.
 */
export async function createExerciseRecord(userId, name, muscle) {
  return supabase
    .from("exercises")
    .insert({ user_id: userId, name, primary_muscle: muscle || null })
    .select("id,name,primary_muscle,equipment,user_id")
    .single();
}
