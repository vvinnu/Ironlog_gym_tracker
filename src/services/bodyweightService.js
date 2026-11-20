
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
    .order("measurement_date", { ascending: true })
    .order("check_in_type", { ascending: true });
}

// ============================================================
// 02. BODYWEIGHT PERSISTENCE
// ============================================================

/**
 * 02.01 - SAVE OR UPDATE BODYWEIGHT CHECK-IN
 *
 * Stores all measurements in kilograms.
 * A user can have one morning and one bedtime
 * measurement per calendar date.
 *
 * @param {string} userId - Authenticated account.
 * @param {number} weightKg - Converted weight in kg.
 * @param {string} measurementDate - YYYY-MM-DD.
 * @param {"morning"|"bedtime"} checkInType
 * @returns {Promise<Object>} Supabase result.
 */
export async function saveBodyweightEntry(
  userId,
  weightKg,
  measurementDate,
  checkInType
) {
  return supabase
    .from("bodyweight_logs")
    .upsert(
      {
        user_id: userId,
        weight_kg: weightKg,
        measurement_date: measurementDate,
        check_in_type: checkInType,
      },
      {
        onConflict: "user_id,measurement_date,check_in_type",
      }
    )
    .select()
    .single();
}