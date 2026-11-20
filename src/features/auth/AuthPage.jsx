/**
 * IRONLOG â€” AUTH PAGE
 * 01.00 - Login, registration, and password reset email.
 */
import React, { useState } from "react";
import { Dumbbell } from "lucide-react";
import { isCloudConfigured } from "../../supabase";
import { signIn, signUp, sendRecoveryEmail } from "../../services/authService";

/** 01.01 - Render the public authentication screens. */
export default function AuthPage() {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  /** 01.02 - Sign in or register an account. */
  async function handleAuth(event) {
    event.preventDefault();
    if (!isCloudConfigured || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const { data, error } = mode === "signup"
        ? await signUp(email.trim(), password)
        : await signIn(email.trim(), password);
      if (error) throw error;
      if (mode === "signup" && !data?.session) {
        setMessage("Check your email to confirm your account.");
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  /** 01.03 - Send a recovery link without disclosing account existence. */
  async function handleRecovery(event) {
    event.preventDefault();
    if (!isCloudConfigured || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const { error } = await sendRecoveryEmail(email.trim());
      if (error) throw error;
      setMessage("If an account exists for this email, a password reset link will be sent.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  /** 01.04 - Switch authentication screens and clear stale passwords. */
  function changeMode(next) {
    setMode(next);
    setPassword("");
    setMessage("");
  }

  return <div className="auth-shell"><div className="auth-card">
    <div className="brand-mark"><Dumbbell size={25}/></div>
    <div className="eyebrow">YOUR TRAINING, YOUR DATA</div>
    <h1>{mode === "forgot" ? <>Reset your <span>password.</span></> :
      <>Build strength.<br/><span>Track every rep.</span></>}</h1>
    <p className="muted">{mode === "forgot"
      ? "Enter your account email to receive a secure password reset link."
      : "Your personal gym log, progress dashboard and training history."}</p>
    <form onSubmit={mode === "forgot" ? handleRecovery : handleAuth}>
      <div className="field"><label htmlFor="auth-email">Email</label>
        <input id="auth-email" type="email" autoComplete="email" required value={email}
          onChange={event => setEmail(event.target.value)} placeholder="you@example.com"/></div>
      {mode !== "forgot" && <div className="field"><label htmlFor="auth-password">Password</label>
        <input id="auth-password" type="password" required minLength={6}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          value={password} onChange={event => setPassword(event.target.value)}
          placeholder="Enter your password"/></div>}
      <button type="submit" className="primary full"
        disabled={busy || !isCloudConfigured || !email.trim() || (mode !== "forgot" && !password)}>
        {busy ? "Please wait..." : mode === "forgot" ? "Send reset link" :
          mode === "signup" ? "Create account" : "Sign in"}</button>
    </form>
    {mode === "signin" && <button type="button" className="link full"
      onClick={() => changeMode("forgot")}>Forgot password?</button>}
    <button type="button" className="link full"
      onClick={() => changeMode(mode === "signup" ? "signin" :
        mode === "forgot" ? "signin" : "signup")}>
      {mode === "signup" ? "Already have an account? Sign in" :
        mode === "forgot" ? "Back to sign in" : "New here? Create an account"}</button>
    {!isCloudConfigured && <div className="setup-note"><strong>Setup needed</strong><br/>
      Connect your Supabase project.</div>}
    {message && <div className="notice" role="status">{message}</div>}
    <div className="auth-foot">IRONLOG <span>â€¢</span> PRIVATE BY DESIGN</div>
  </div></div>;
}