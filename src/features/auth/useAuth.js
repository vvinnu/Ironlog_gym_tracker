/**
 * IRONLOG â€” AUTH STATE
 * 01.00 - Session and password recovery lifecycle.
 */
import { useEffect, useState } from "react";
import { supabase } from "../../supabase";

/** 01.01 - Inspect the recovery URL before auth initialization consumes it. */
function readRecoveryURL() {
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const query = new URLSearchParams(window.location.search);
  const error = hash.get("error_description") || query.get("error_description") || "";
  return {
    isRecovery: hash.get("type") === "recovery" || query.get("type") === "recovery" ||
      hash.has("error") || query.has("error"),
    error: error.replace(/\+/g, " "),
  };
}

const initialRecoveryURL = readRecoveryURL();

/** 01.02 - Manage authentication and verified recovery sessions. */
export default function useAuth() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [recoveryMode, setRecoveryMode] = useState(initialRecoveryURL.isRecovery);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [recoveryError, setRecoveryError] = useState(initialRecoveryURL.error);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }
    let active = true;

    // 01.02.01 - Register listener before requesting current session.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      setUser(session?.user ?? null);
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryMode(true);
        setRecoveryReady(true);
        setRecoveryError("");
      }
      if (event === "SIGNED_OUT") setRecoveryReady(false);
    });

    // 01.02.02 - Restore a verified recovery session on reload.
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setRecoveryError(error.message);
      else {
        setUser(data.session?.user ?? null);
        if (initialRecoveryURL.isRecovery && !initialRecoveryURL.error && data.session) {
          setRecoveryMode(true);
          setRecoveryReady(true);
        }
      }
      setAuthLoading(false);
    }).catch(error => {
      if (!active) return;
      setRecoveryError(error.message);
      setAuthLoading(false);
    });

    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  /** 01.03 - Clear the recovery URL after completing the reset. */
  function finishRecovery() {
    setRecoveryMode(false);
    setRecoveryReady(false);
    setRecoveryError("");
    window.history.replaceState({}, "", window.location.pathname);
  }

  /** 01.04 - Exit an invalid recovery link. */
  function cancelRecovery() {
    finishRecovery();
  }

  return { user, authLoading, recoveryMode, recoveryReady,
    recoveryError, finishRecovery, cancelRecovery };
}