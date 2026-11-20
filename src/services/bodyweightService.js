
/**
 * IRONLOG — BODYWEIGHT SERVICE
 * ============================================================
 *
 * File: src/services/bodyweightService.js
 * Feature: Bodyweight
 *
 * Responsibility:
 * Handles Supabase database operations for bodyweight logs.
 *
 * Dependencies:
 * - src/supabase.js
 *
 * Used by:
 * - src/App.jsx (after integration)
 *
 * Related modules:
 * - src/services/workoutService.js
 *
 * Notes:
 * - Database communication only.
 * - Does not manage React state or UI notifications.
 * - Authentication and row-level security are enforced
 *   through the existing Supabase configuration.
 */

import { supabase } from "../supabase";

// ============================================================
// 01. BODYWEIGHT HISTORY
// ============================================================

/**
 * 01.01 - FETCH BODYWEIGHT HISTORY
 *
 * Purpose:
 * Retrieves bodyweight entries for the signed-in user.
 *
 * How it works:
 * 1. Queries the bodyweight_logs table.
 * 2. Retrieves the existing log fields.
 * 3. Orders entries by logged_at, oldest first.
 *
 * Used by:
 * - App.jsx during initial user data loading.
 *
 * @returns {Promise<Object>} Supabase result containing data/error.
 */
export async function fetchBodyweightHistory() {
  return supabase
    .from("bodyweight_logs")
    .select("*")
    .order("logged_at", { ascending: true });
}

// ============================================================
// 02. BODYWEIGHT PERSISTENCE
// ============================================================

/**
 * 02.01 - SAVE BODYWEIGHT ENTRY
 *
 * Purpose:
 * Saves a new bodyweight measurement.
 *
 * How it works:
 * 1. Receives the authenticated user's ID.
 * 2. Receives the validated weight in kilograms.
 * 3. Inserts the measurement into bodyweight_logs.
 * 4. Returns the newly created record.
 *
 * Used by:
 * - App.jsx through its logWeight handler.
 *
 * Important:
 * - Weight validation remains in App.jsx.
 * - The database must also authorize the operation.
 *
 * @param {string} userId - Authenticated user's ID.
 * @param {number} weightKg - Bodyweight in kilograms.
 * @returns {Promise<Object>} Supabase result containing data/error.
 */
export async function saveBodyweightEntry(userId, weightKg) {
  return supabase
    .from("bodyweight_logs")
    .insert({
      user_id: userId,
      weight_kg: weightKg,
    })
    .select()
    .single();
}
