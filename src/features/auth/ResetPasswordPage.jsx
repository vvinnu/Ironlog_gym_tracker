/**
 * IRONLOG â€” RESET PASSWORD PAGE
 * 01.00 - Password update after a verified Supabase recovery link.
 */
import React, { useState } from "react";
import { Dumbbell } from "lucide-react";
import { updateAccountPassword, signOutAccount } from "../../services/authService";

/** 01.01 - Render the verified password-reset form. */
export default function ResetPasswordPage({
  recoveryReady, recoveryError, finishRecovery, cancelRecovery,
}) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  /** 01.02 - Validate and save the new password. */
  async function handleReset(event) {
    event.preventDefault();
    if (!recoveryReady || busy) return;
    if (password.length < 8) { setMessage("Use at least 8 characters."); return; }
    if (password !== confirmPassword) { setMessage("Passwords do not match."); return; }
    setBusy(true);
    setMessage("");
    try {
      const { error } = await updateAccountPassword(password);
      if (error) throw error;
      // 01.02.01 - End the recovery session so the user signs in again.
      const { error: signOutError } = await signOutAccount();
      if (signOutError) throw signOutError;
      setPassword("");
      setConfirmPassword("");
      finishRecovery();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  return <div className="auth-shell"><div className="auth-card">
    <div className="brand-mark"><Dumbbell size={25}/></div>
    <div className="eyebrow">ACCOUNT RECOVERY</div>
    <h1>Set a new <span>password.</span></h1>
    {!recoveryReady ? <>
      <p className="muted">{recoveryError || "Verifying your recovery link..."}</p>
      {recoveryError && <button type="button" className="link full"
        onClick={cancelRecovery}>Back to sign in</button>}
    </> : <>
      <p className="muted">Choose a new password for your IronLog account.</p>
      <form onSubmit={handleReset}>
        <div className="field"><label htmlFor="reset-password">New password</label>
          <input id="reset-password" type="password" autoComplete="new-password"
            required minLength={8} value={password}
            onChange={event => setPassword(event.target.value)}/></div>
        <div className="field"><label htmlFor="reset-confirm">Confirm new password</label>
          <input id="reset-confirm" type="password" autoComplete="new-password"
            required minLength={8} value={confirmPassword}
            onChange={event => setConfirmPassword(event.target.value)}/></div>
        <button type="submit" className="primary full" disabled={busy}>
          {busy ? "Updating..." : "Update password"}</button>
      </form>
      {message && <div className="notice" role="status">{message}</div>}
    </>}
    <div className="auth-foot">IRONLOG <span>â€¢</span> PRIVATE BY DESIGN</div>
  </div></div>;
}