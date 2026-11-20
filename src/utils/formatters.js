
/**
 * IRONLOG — FORMATTERS
 * File: src/utils/formatters.js
 * Responsibility: Shared number formatting.
 * Used by: Dashboard, ProgressPage, AppShared.
 */
// ============================================================
// 01. NUMERIC DISPLAY
// ============================================================
/**
 * 01.01 - FORMAT NUMBER
 * @param {number|string|null} n - Value to format.
 * @returns {string} Locale-formatted number, up to one decimal.
 */
export const fmt = n => Number(n || 0).toLocaleString(undefined,{maximumFractionDigits:1});
