
/**
 * IRONLOG — SETTINGSPAGE
 * File: src/features/settings/SettingsPage.jsx
 * Responsibility: Renders the existing SettingsPage tab without changing its UI.
 * Used by: src/App.jsx
 * Related: src/components/AppShared.jsx; src/services/workoutService.js
 * Receives application state/actions as props; no Supabase calls here.
 */
import React from "react";
import { LogOut } from "lucide-react";

// ============================================================
// 01. PAGE RENDERING
// ============================================================
/**
 * 01.01 - RENDER SETTINGSPAGE
 * Props are passed unchanged from App.jsx to preserve behavior.
 * @param {Object} props - Existing application state and callbacks.
 * @returns {React.ReactElement} Existing page JSX.
 */
export default function SettingsPage({ user, signOut }) {
  return (
      <section className="content"><div className="welcome-row"><div><div className="eyebrow">PREFERENCES</div><h1>App <span>settings.</span></h1><p className="muted">Manage your account and training units.</p></div></div><div className="panel settings-panel"><h2>Account</h2><p className="muted">{user.email}</p><div className="setting-row"><div><b>Cloud synchronization</b><small>Your workouts and body weight are stored in your Supabase account.</small></div><span className="sync-pill"><span className="live-dot"/> Connected</span></div><div className="setting-row"><div><b>Units</b><small>Weights and body weight are currently recorded in kilograms.</small></div><span className="muted">kg</span></div><button className="danger-btn" onClick={signOut}><LogOut size={17}/> Sign out</button></div></section>
  );
}
