
/**
 * IRONLOG — WORKOUT ROTATION SERVICE
 * File: src/services/workoutRotationService.js
 * Responsibility: Persist and advance workout rotations.
 */

import { supabase } from "../supabase";

// ============================================================
// 01. FETCH ACTIVE ROTATION
// ============================================================

/**
 * 01.01 - Fetch the active rotation and its ordered steps.
 */
export async function fetchActiveRotation() {
  return supabase
    .from("workout_rotations")
    .select(`
      id,
      user_id,
      name,
      is_active,
      next_position,
      workout_rotation_steps (
        id,
        position,
        kind,
        plan_id
      )
    `)
    .eq("is_active", true)
    .maybeSingle();
}

// ============================================================
// 02. CREATE ROTATION
// ============================================================

/**
 * 02.01 - Create a new rotation with its steps.
 * An existing active rotation remains active until the new
 * rotation and all its steps have been created successfully.
 *
 * @param {string} userId - Authenticated user.
 * @param {string} name - Rotation name.
 * @param {Array} steps - Ordered workout/rest steps.
 */
export async function createWorkoutRotation(userId, name, steps) {
  const created = await supabase
    .from("workout_rotations")
    .insert({
      user_id: userId,
      name,
      is_active: false,
      next_position: 0,
    })
    .select("id")
    .single();

  if (created.error) return created;

  const rotationId = created.data.id;

  const rows = steps.map((step, index) => ({
    user_id: userId,
    rotation_id: rotationId,
    position: index,
    kind: step.kind,
    plan_id: step.kind === "rest" ? null : step.plan_id,
  }));

  const inserted = await supabase
    .from("workout_rotation_steps")
    .insert(rows);

  if (inserted.error) {
    const cleanup = await supabase
      .from("workout_rotations")
      .delete()
      .eq("id", rotationId);

    return {
      data: null,
      error: cleanup.error
        ? new Error(
            `${inserted.error.message}. Cleanup failed: ${cleanup.error.message}`
          )
        : inserted.error,
    };
  }

  // 02.02 - Deactivate the old rotation before activation.
  const deactivated = await supabase
    .from("workout_rotations")
    .update({ is_active: false })
    .eq("user_id", userId)
    .eq("is_active", true);

  if (deactivated.error) {
    return { data: null, error: deactivated.error };
  }

  const activated = await supabase
    .from("workout_rotations")
    .update({ is_active: true })
    .eq("id", rotationId)
    .eq("user_id", userId)
    .select("id")
    .single();

  if (activated.error) {
    return {
      data: null,
      error: new Error(
        "Rotation was created but could not be activated. " +
        activated.error.message
      ),
    };
  }

  return { data: activated.data, error: null };
}

// ============================================================
// 03. ADVANCE ROTATION
// ============================================================

/**
 * 03.01 - Advance one step using an optimistic position check.
 * Prevents a stale browser from advancing an unexpected step.
 *
 * @param {Object} rotation - Current active rotation.
 */
export async function advanceWorkoutRotation(rotation) {
  const steps = [...(rotation.workout_rotation_steps || [])]
    .sort((a, b) => a.position - b.position);

  if (!steps.length) {
    return {
      data: null,
      error: new Error("Rotation has no steps."),
    };
  }

  const current = steps.find(
    step => step.position === rotation.next_position
  );

  if (!current) {
    return {
      data: null,
      error: new Error("Current rotation position is invalid."),
    };
  }

  const index = steps.findIndex(step => step.id === current.id);
  const nextPosition = steps[(index + 1) % steps.length].position;

  const result = await supabase
    .from("workout_rotations")
    .update({ next_position: nextPosition })
    .eq("id", rotation.id)
    .eq("is_active", true)
    .eq("next_position", rotation.next_position)
    .select("id");

  if (result.error) return result;

  if (!result.data?.length) {
    return {
      data: null,
      error: new Error(
        "Rotation changed on another device. Refresh before advancing."
      ),
    };
  }

  return { data: result.data[0], error: null };
}
