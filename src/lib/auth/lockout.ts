/**
 * Login lockout thresholds, kept in their own (non-"use server") module. A `'use server'`
 * file may only export async functions — exporting a plain constant alongside them
 * invalidates every export in the file — so these live here instead of in actions.ts.
 */
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
