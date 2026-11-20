/**
 * IRONLOG â€” AUTH SERVICE
 * 01.00 - Supabase authentication operations.
 */
import { supabase } from "../supabase";

/** 01.01 - Sign in using email and password. */
export function signIn(email, password) {
  return supabase.auth.signInWithPassword({ email, password });
}

/** 01.02 - Create an account. */
export function signUp(email, password) {
  return supabase.auth.signUp({ email, password });
}

/** 01.03 - Email a recovery link to the actual Vite app base path. */
export function sendRecoveryEmail(email) {
  const redirectTo = new URL(import.meta.env.BASE_URL, window.location.origin).href;
  return supabase.auth.resetPasswordForEmail(email, { redirectTo });
}

/** 01.04 - Update the password for a verified recovery session. */
export function updateAccountPassword(password) {
  return supabase.auth.updateUser({ password });
}

/** 01.05 - Sign out of the current session. */
export function signOutAccount() {
  return supabase.auth.signOut();
}