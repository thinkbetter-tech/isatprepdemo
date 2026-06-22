// src/authGuard.js
// -----------------------------------------------------------------------------
// Auth guard for gated pages (currently practice.html).
//
// Behavior:
//   * When Firebase IS configured: subscribe via onAuthStateChanged; if there is
//     no signed-in user, redirect to login.html.
//   * When Firebase is NOT configured (no `.env`, current local state): NO-OP.
//     Local dev without env still renders the page so the UI can be worked on.
//     (Acceptable per the design constraint — there's no backend to authenticate
//     against locally.)
// -----------------------------------------------------------------------------

import { isFirebaseConfigured, onUserChanged, whenAuthReady, signOutUser } from './firebase.js';

// Re-export so gated pages can wire a sign-out control without importing two
// modules. (No UI is added by this guard itself.)
export { signOutUser };

/**
 * Redirect unauthenticated users to `redirectTo`. Call early in a gated page's
 * entry module.
 *
 * Uses whenAuthReady() so we wait for Firebase to FINISH restoring auth state
 * from persistence before deciding — otherwise a signed-in user can be wrongly
 * bounced to login because the SDK hadn't rehydrated yet (the reported bug).
 *
 * @param {{ redirectTo?: string }} [opts]
 */
export function requireAuth({ redirectTo = 'login.html' } = {}) {
  if (!isFirebaseConfigured()) {
    // Not configured — do nothing so local dev (no env) still shows the page.
    return;
  }
  whenAuthReady().then((user) => {
    if (!user) window.location.href = redirectTo;
  });
}

/**
 * The inverse of requireAuth: if the visitor is ALREADY signed in, send them
 * away from this page (login/signup) into the app. Prevents a signed-in (often
 * paid) user from being shown a login/signup form again after clicking a generic
 * "Start free" / "Log in" CTA. No-op when unconfigured.
 *
 * @param {{ redirectTo?: string }} [opts]
 */
export function redirectIfSignedIn({ redirectTo = 'practice.html' } = {}) {
  if (!isFirebaseConfigured()) return;
  whenAuthReady().then((user) => {
    if (user) window.location.href = redirectTo;
  });
}

/**
 * Subscribe to auth state. Returns an unsubscribe function. Thin wrapper over
 * firebase.onUserChanged kept for backwards compatibility with earlier callers.
 * @param {(user: object|null) => void} cb
 * @returns {() => void} unsubscribe
 */
export function onUser(cb) {
  return onUserChanged(cb);
}
