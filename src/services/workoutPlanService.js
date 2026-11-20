
/**
 * IRONLOG — WORKOUT PLAN SERVICE
 * File: src/services/workoutPlanService.js
 * Responsibility: Read and manage saved workout plans.
 * Used by: src/App.jsx
 * Database tables: workout_plans, workout_plan_exercises
 */

import { supabase } from "../supabase";

// ============================================================
// 01. FETCH SAVED WORKOUT PLANS
// ============================================================

/**
 * 01.01 - Load the signed-in user's plans and ordered exercises.
 * Supabase RLS restricts the results to the current account.
 * @returns {Promise<Object>} Supabase data/error result.
 */
export async function fetchWorkoutPlans() {
  return supabase
    .from("workout_plans")
    .select(`
      id,
      name,
      notes,
      created_at,
      updated_at,
      workout_plan_exercises (
        id,
        exercise_id,
        position,
        target_sets,
        target_reps,
        notes,
        exercises (
          id,
          name,
          primary_muscle
        )
      )
    `)
    .order("created_at", { ascending: false });
}

// ============================================================
// 02. CREATE WORKOUT PLAN
// ============================================================

/**
 * 02.01 - Create a plan and its exercise entries.
 * @param {string} userId - Authenticated user ID.
 * @param {Object} plan - Validated plan form.
 * @returns {Promise<Object>} Result with data/error.
 */
export async function createWorkoutPlan(userId, plan) {
  const { data, error } = await supabase
    .from("workout_plans")
    .insert({
      user_id: userId,
      name: plan.name,
      notes: plan.notes,
    })
    .select("id")
    .single();

  if (error) return { data: null, error };

  const entries = plan.exercises.map((exercise, index) => ({
    user_id: userId,
    plan_id: data.id,
    exercise_id: exercise.exercise_id,
    position: index,
    target_sets: exercise.target_sets,
    target_reps: exercise.target_reps,
  }));

  if (entries.length) {
    const result = await supabase
      .from("workout_plan_exercises")
      .insert(entries);

    if (result.error) {
      // Roll back the newly created parent plan.
      const rollback = await supabase
        .from("workout_plans")
        .delete()
        .eq("id", data.id);

      if (rollback.error) {
        return {
          data: null,
          error: new Error(
            `${result.error.message}. Cleanup also failed: ${rollback.error.message}`
          ),
        };
      }

      return { data: null, error: result.error };
    }
  }

  return { data, error: null };
}

// ============================================================
// 03. UPDATE WORKOUT PLAN
// ============================================================

/**
 * 03.01 - Update a plan's details and exercise list.
 * This phase uses standard Supabase operations.
 * It is not an atomic multi-table transaction.
 * @param {string} userId - Authenticated user ID.
 * @param {string} planId - Existing plan ID.
 * @param {Object} plan - Validated plan form.
 * @returns {Promise<Object>} Result with data/error.
 */
export async function updateWorkoutPlan(userId, planId, plan) {
  // 03.01.01 - Read existing entries for recovery on failure.
  const existing = await supabase
    .from("workout_plan_exercises")
    .select("exercise_id,position,target_sets,target_reps,notes")
    .eq("plan_id", planId)
    .order("position");

  if (existing.error) return { data: null, error: existing.error };

  const previous = existing.data || [];

  // 03.01.02 - Replace the exercise list.
  const deleted = await supabase
    .from("workout_plan_exercises")
    .delete()
    .eq("plan_id", planId);

  if (deleted.error) return { data: null, error: deleted.error };

  const entries = plan.exercises.map((exercise, index) => ({
    user_id: userId,
    plan_id: planId,
    exercise_id: exercise.exercise_id,
    position: index,
    target_sets: exercise.target_sets,
    target_reps: exercise.target_reps,
  }));

  if (entries.length) {
    const inserted = await supabase
      .from("workout_plan_exercises")
      .insert(entries);

    if (inserted.error) {
      // Best-effort restoration of the previous list.
      const restore = previous.length
        ? await supabase
            .from("workout_plan_exercises")
            .insert(previous.map(entry => ({
              ...entry,
              user_id: userId,
              plan_id: planId,
            })))
        : { error: null };

      return {
        data: null,
        error: restore.error
          ? new Error(
              `${inserted.error.message}. Previous exercises could not be restored: ${restore.error.message}`
            )
          : inserted.error,
      };
    }
  }

  // 03.01.03 - Update metadata after exercise replacement.
  const updated = await supabase
    .from("workout_plans")
    .update({
      name: plan.name,
      notes: plan.notes,
    })
    .eq("id", planId)
    .select("id")
    .single();

  return updated;
}

// ============================================================
// 04. DELETE WORKOUT PLAN
// ============================================================

/**
 * 04.01 - Delete a plan.
 * Database foreign keys cascade to its plan exercises.
 * A plan referenced by a rotation cannot be deleted.
 * @param {string} planId - Plan ID to delete.
 * @returns {Promise<Object>} Supabase result.
 */
export async function deleteWorkoutPlan(planId) {
  return supabase
    .from("workout_plans")
    .delete()
    .eq("id", planId);
}
