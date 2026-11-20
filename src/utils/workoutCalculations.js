/**
 * Workout calculation utilities.
 *
 * Contains reusable calculations based on completed workout data.
 * These functions do not communicate with Supabase or modify React state.
 */

/**
 * Finds the latest completed performance for each exercise.
 *
 * Workouts are ordered newest-first by workout date, then by
 * completion/creation timestamp when multiple sessions share a date.
 *
 * Each exercise is identified by its database exercise ID,
 * not its display name.
 *
 * @param {Array} workouts - Completed workouts with flattened sets.
 * @returns {Object} Latest performance indexed by exercise ID.
 */
export function getPreviousPerformance(workouts) {
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

      // 01.02 - Keep notes from the same completed session
      // that supplied this exercise's previous sets.
      latest[exerciseId] = {
        workout_date: workout.workout_date,
        workout_name: workout.name,
        workout_notes: workout.notes || "",
        sets: sets.sort((a, b) => a.set_number - b.set_number),
      };
    }
  }

  return latest;
}