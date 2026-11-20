
/**
 * IRONLOG — WORKOUT HISTORY UTILITIES
 * ============================================================
 *
 * File: src/utils/workoutHistory.js
 * Feature: Workouts / History
 *
 * Responsibility:
 * Converts Supabase workout records into the structure
 * used throughout the IronLog application.
 *
 * Used by:
 * - src/App.jsx
 *
 * Related modules:
 * - src/utils/workoutCalculations.js
 * - src/components/WorkoutLogger.jsx
 *
 * Notes:
 * - Does not communicate directly with Supabase.
 * - Does not modify the original workout records.
 */

// ============================================================
// 01. WORKOUT HISTORY NORMALIZATION
// ============================================================

/**
 * 01.01 - NORMALIZE WORKOUT HISTORY
 *
 * Purpose:
 * Converts nested Supabase workout records into workout
 * objects containing a flattened `sets` array.
 *
 * How it works:
 * 1. Iterates through each completed workout.
 * 2. Reads the workout's associated exercises.
 * 3. Collects every exercise's recorded sets.
 * 4. Adds exercise ID and name to each set.
 * 5. Preserves the original workout properties.
 *
 * Used by:
 * - src/App.jsx (initial history loading)
 * - src/App.jsx (history refresh after saving)
 *
 * @param {Array} workouts - Supabase workout records.
 * @returns {Array} Workouts containing flattened sets.
 */
export function normalizeWorkoutHistory(workouts) {
  return (workouts || []).map(workout => ({
    ...workout,

    sets: (workout.workout_exercises || []).flatMap(
      exercise =>
        (exercise.workout_sets || []).map(set => ({
          ...set,
          exercise_id: exercise.exercise_id,
          exercise_name: exercise.exercise_name,
        }))
    ),
  }));
}
