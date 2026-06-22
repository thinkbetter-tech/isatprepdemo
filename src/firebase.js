// src/firebase.js
// -----------------------------------------------------------------------------
// Shared Firebase + GA4 + consent foundation.
//
// CRITICAL DESIGN CONSTRAINT — works BOTH with and without Firebase env:
//   * When VITE_FIREBASE_API_KEY is present → real Firebase Auth/Firestore, and
//     (only after consent) real GA4 Analytics.
//   * When env is ABSENT (current local state, no `.env`) → every export below
//     SAFELY degrades: getFirebase() resolves to null, the auth helpers throw a
//     well-defined NOT_CONFIGURED error that the UI maps to a friendly inline
//     message, trackEvent() is a silent no-op, and the auth guard no-ops. No
//     Firebase SDK chunk is ever fetched, so no-env builds stay lean and never
//     crash.
//
// BUNDLE PARITY: the modular Firebase SDK is imported LAZILY via dynamic
// import() and ONLY when real config is present. Without env, Vite splits the
// Firebase code into a chunk the pages never load.
//
// CONSENT / GA CONTRACT (for the follow-up consent-banner agent):
//   * localStorage key:        'isatprep_consent'
//   * granted value:           'granted'   (any other value / absent → not granted)
//   * denied value (explicit): 'denied'
//   * Global Privacy Control:  navigator.globalPrivacyControl === true forces
//                              analytics OFF regardless of the stored value.
//   * Analytics initializes ONLY when (config exists) AND (consent granted) AND
//     (GPC not set). It is NEVER auto-started on import.
//   * After the user accepts in the banner, the banner should:
//       1. localStorage.setItem('isatprep_consent', 'granted')
//       2. await enableAnalyticsAfterConsent()
//     to spin up GA4 for the rest of the session. On decline it should set
//     'denied' (or leave unset) — trackEvent() stays a no-op.
// -----------------------------------------------------------------------------

// Error code thrown by guarded helpers when there is no Firebase config. The UI
// catches this and shows "Authentication isn't configured yet." instead of the
// old fake redirect.
export const NOT_CONFIGURED = 'isatprep/not-configured';

export const CONSENT_KEY = 'isatprep_consent';

// Mutable singletons. Null until (and unless) getFirebase() runs with real config.
export let app = null;
export let auth = null;
export let db = null;
export let analytics = null;

// Internal SDK function handles, captured once on init so helpers can reuse them
// without re-importing.
let _sdk = null;        // { ...firebase/auth fns, doc, getDoc, setDoc, serverTimestamp }
let _initPromise = null;

/**
 * Reads VITE_FIREBASE_* from the build-time env. Returns a config object only when
 * the minimum required key (apiKey) is present; otherwise returns null so callers
 * can detect "not configured".
 */
export function getFirebaseConfig() {
  const env = import.meta.env || {};
  const apiKey = env.VITE_FIREBASE_API_KEY;
  if (!apiKey) return null; // not configured — stay in no-op mode
  return {
    apiKey,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
    // measurementId may come from either the firebase config or the dedicated GA var.
    measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || env.VITE_GA_MEASUREMENT_ID,
  };
}

/** True when Firebase env config is present at build time. */
export function isFirebaseConfigured() {
  return getFirebaseConfig() !== null;
}

/** reCAPTCHA site key for App Check, or undefined if not provisioned yet. */
function getAppCheckSiteKey() {
  const env = import.meta.env || {};
  return env.VITE_APPCHECK_SITE_KEY || undefined;
}

/**
 * Initializes Firebase App Check with reCAPTCHA v3/Enterprise, gated on
 * VITE_APPCHECK_SITE_KEY. No-op when the key is absent so the app works before
 * App Check is set up. Failures are swallowed — App Check must never break the
 * app from the client side (server-side enforcement is what actually protects).
 */
async function initAppCheck(appInstance) {
  const siteKey = getAppCheckSiteKey();
  if (!siteKey) return; // not provisioned yet — skip
  try {
    const acMod = await import('firebase/app-check');
    // Optional debug token for local/dev (set window.FIREBASE_APPCHECK_DEBUG_TOKEN
    // = true in a dev console to register a debug device in the Firebase console).
    acMod.initializeAppCheck(appInstance, {
      provider: new acMod.ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
  } catch {
    /* App Check init must never throw into app startup */
  }
}

/**
 * Initializes app + auth + firestore exactly once and returns
 * `{ app, auth, db, analytics }`, or `null` when unconfigured.
 *
 * Safe to call from anywhere. When no config is present it is a pure no-op and
 * returns null synchronously-resolved — no dynamic import is triggered.
 */
export function getFirebase() {
  const config = getFirebaseConfig();
  if (!config) return Promise.resolve(null); // no env → no-op
  if (_initPromise) return _initPromise;

  _initPromise = Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
    import('firebase/firestore'),
  ]).then(async ([appMod, authMod, fsMod]) => {
    const { initializeApp, getApps } = appMod;
    app = getApps().length ? getApps()[0] : initializeApp(config);

    // App Check (Phase 2B): proves requests come from our real app, not a script
    // with a stolen API key. Gated on VITE_APPCHECK_SITE_KEY (a reCAPTCHA v3 /
    // Enterprise site key). Without it, App Check is skipped entirely — so the
    // app keeps working before App Check is provisioned, and enforcement can be
    // turned on later in the console without a code change. Must initialize
    // BEFORE auth/firestore are used so tokens attach to their requests.
    await initAppCheck(app);

    auth = authMod.getAuth(app);
    db = fsMod.getFirestore(app);

    // Stash the SDK fns the helpers need.
    _sdk = {
      // auth
      GoogleAuthProvider: authMod.GoogleAuthProvider,
      signInWithPopup: authMod.signInWithPopup,
      createUserWithEmailAndPassword: authMod.createUserWithEmailAndPassword,
      signInWithEmailAndPassword: authMod.signInWithEmailAndPassword,
      sendPasswordResetEmail: authMod.sendPasswordResetEmail,
      onAuthStateChanged: authMod.onAuthStateChanged,
      setPersistence: authMod.setPersistence,
      browserLocalPersistence: authMod.browserLocalPersistence,
      browserSessionPersistence: authMod.browserSessionPersistence,
      updateProfile: authMod.updateProfile,
      signOut: authMod.signOut,
      deleteUser: authMod.deleteUser,
      reauthenticateWithPopup: authMod.reauthenticateWithPopup,
      // firestore
      doc: fsMod.doc,
      getDoc: fsMod.getDoc,
      setDoc: fsMod.setDoc,
      deleteDoc: fsMod.deleteDoc,
      collection: fsMod.collection,
      getDocs: fsMod.getDocs,
      serverTimestamp: fsMod.serverTimestamp,
    };

    return { app, auth, db, analytics };
  });

  return _initPromise;
}

// Backwards-compatible alias: entry modules already call initFirebase(). Keeps
// the same fire-and-forget contract (no-op without env) but now also wires the
// real SDK when configured. Also attempts to auto-start analytics if the user
// has ALREADY granted consent in a prior session (GPC still respected inside).
export function initFirebase() {
  const p = getFirebase();
  // Best-effort: if consent was previously granted, bring analytics up now.
  if (isFirebaseConfigured()) {
    p.then(() => { if (hasConsent()) enableAnalyticsAfterConsent(); });
  }
  return p;
}

// -----------------------------------------------------------------------------
// Consent + GA4 analytics
// -----------------------------------------------------------------------------

/** True if the browser is signalling Global Privacy Control. */
function gpcEnabled() {
  try {
    return typeof navigator !== 'undefined' && navigator.globalPrivacyControl === true;
  } catch {
    return false;
  }
}

/** True only when the user has explicitly granted consent AND GPC is not set. */
export function hasConsent() {
  if (gpcEnabled()) return false; // GPC overrides any stored grant
  try {
    return localStorage.getItem(CONSENT_KEY) === 'granted';
  } catch {
    return false; // storage unavailable → treat as not granted
  }
}

/**
 * Initializes GA4 Analytics IFF (config exists) AND (consent granted) AND (no
 * GPC). Idempotent and safe to call repeatedly. Returns the analytics instance
 * or null. The consent banner calls this after the user accepts.
 */
export async function enableAnalyticsAfterConsent() {
  if (!isFirebaseConfigured()) return null;
  if (!hasConsent()) return null;          // not granted or GPC set → stay off
  if (analytics) return analytics;          // already up

  await getFirebase();                      // ensure app is initialized
  try {
    const analyticsMod = await import('firebase/analytics');
    const supported = await analyticsMod.isSupported();
    if (!supported) return null;            // e.g. SSR / unsupported browser
    analytics = analyticsMod.getAnalytics(app);
    _sdk.logEvent = analyticsMod.logEvent;
    return analytics;
  } catch {
    return null; // never let analytics failure break the page
  }
}

/**
 * Safe event tracker. No-op until analytics is ready (i.e. before consent). The
 * auth flows call this for `login` / `sign_up`; missing analytics is expected
 * and fine.
 */
export function trackEvent(name, params = {}) {
  try {
    if (analytics && _sdk && _sdk.logEvent) {
      _sdk.logEvent(analytics, name, params);
    }
  } catch {
    /* analytics must never throw into the UI */
  }
}

// -----------------------------------------------------------------------------
// Auth helpers — all guarded. Throw `NOT_CONFIGURED` when there is no env so the
// UI can show a friendly "not configured" message rather than silently failing.
// -----------------------------------------------------------------------------

async function ensureReady() {
  const fb = await getFirebase();
  if (!fb || !_sdk) {
    const e = new Error('Firebase is not configured.');
    e.code = NOT_CONFIGURED;
    throw e;
  }
  return fb;
}

/**
 * Applies "keep me signed in" persistence. local = survive browser restarts,
 * session = cleared when the tab closes. Best-effort; failures are swallowed.
 */
async function applyPersistence(keepSignedIn) {
  try {
    await _sdk.setPersistence(
      auth,
      keepSignedIn ? _sdk.browserLocalPersistence : _sdk.browserSessionPersistence,
    );
  } catch {
    /* non-fatal */
  }
}

/** Google popup sign-in / sign-up. Returns the firebase user. */
export async function signInWithGoogle({ keepSignedIn = true } = {}) {
  await ensureReady();
  await applyPersistence(keepSignedIn);
  const provider = new _sdk.GoogleAuthProvider();
  const cred = await _sdk.signInWithPopup(auth, provider);
  return cred.user;
}

/** Email/password account creation. Sets the display name. Returns the user. */
export async function signUpWithEmail({ name, email, password, keepSignedIn = true }) {
  await ensureReady();
  await applyPersistence(keepSignedIn);
  const cred = await _sdk.createUserWithEmailAndPassword(auth, email, password);
  if (name) {
    try { await _sdk.updateProfile(cred.user, { displayName: name }); } catch { /* non-fatal */ }
  }
  return cred.user;
}

/** Email/password sign-in. Returns the user. */
export async function signInWithEmail({ email, password, keepSignedIn = true }) {
  await ensureReady();
  await applyPersistence(keepSignedIn);
  const cred = await _sdk.signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

/** Sends a password-reset email. */
export async function sendReset(email) {
  await ensureReady();
  await _sdk.sendPasswordResetEmail(auth, email);
}

/** Signs the current user out. */
export async function signOutUser() {
  await ensureReady();
  await _sdk.signOut(auth);
}

/** Error code thrown by deleteAccount when there is no signed-in user. */
export const NO_CURRENT_USER = 'isatprep/no-current-user';

/**
 * Permanently deletes the signed-in user's account and personal data.
 *
 * Order matters: purge Firestore documents FIRST (while the user is still
 * authenticated, so security rules permit own-data writes), THEN delete the
 * Auth user. We remove:
 *   - progress/{uid}/lessons/*  (subcollection docs)
 *   - users/{uid}               (profile)
 *
 * Firebase requires a RECENT login to delete an Auth user. If the credential
 * is stale it throws `auth/requires-recent-login`; we transparently
 * re-authenticate via the Google popup when that provider is available, then
 * retry. (Email/password users who hit this are asked to re-login — surfaced
 * to the caller as `auth/requires-recent-login`.)
 *
 * This is the user/parent-facing data-deletion path required for US privacy
 * compliance (CCPA/state laws; minors). It is irreversible.
 */
export async function deleteAccount() {
  await ensureReady();
  const user = auth && auth.currentUser;
  if (!user) throw new Error(NO_CURRENT_USER);
  const uid = user.uid;

  // 1) Delete Firestore data while still authenticated.
  // Best-effort on the progress subcollection (may be empty).
  try {
    const lessons = _sdk.collection(db, 'progress', uid, 'lessons');
    const snap = await _sdk.getDocs(lessons);
    await Promise.all(snap.docs.map((d) => _sdk.deleteDoc(d.ref)));
  } catch {
    /* no progress data, or rules deny — proceed to profile + auth deletion */
  }
  try {
    await _sdk.deleteDoc(_sdk.doc(db, 'users', uid));
  } catch {
    /* profile may not exist; continue to auth deletion */
  }

  // 2) Delete the Auth user, re-authenticating if the credential is stale.
  try {
    await _sdk.deleteUser(user);
  } catch (e) {
    if (e && e.code === 'auth/requires-recent-login') {
      const providers = (user.providerData || []).map((p) => p && p.providerId);
      if (providers.includes('google.com')) {
        const provider = new _sdk.GoogleAuthProvider();
        await _sdk.reauthenticateWithPopup(user, provider);
        await _sdk.deleteUser(user);
      } else {
        // Password user: caller must prompt a fresh login, then retry.
        throw e;
      }
    } else {
      throw e;
    }
  }
}

/**
 * Subscribe to auth-state changes. Returns an unsubscribe function. When
 * unconfigured it reports null once and returns a no-op unsubscribe.
 */
export function onUserChanged(cb) {
  if (!isFirebaseConfigured()) {
    if (typeof cb === 'function') cb(null);
    return () => {};
  }
  let unsub = () => {};
  getFirebase().then((fb) => {
    if (fb && _sdk) unsub = _sdk.onAuthStateChanged(auth, cb);
    else if (typeof cb === 'function') cb(null);
  });
  // Return a stable unsubscribe that defers to the real one once ready.
  return () => unsub();
}

/**
 * Returns whether the given uid already has a profile doc. Used by the Google
 * age gate to decide if this is a first-time sign-in (new user).
 */
export async function userDocExists(uid) {
  await ensureReady();
  const ref = _sdk.doc(db, 'users', uid);
  const snap = await _sdk.getDoc(ref);
  return snap.exists();
}

/**
 * Creates users/{uid} on first sign-up/sign-in if it doesn't already exist.
 *
 * IMPORTANT (matches firestore.rules): the client may ONLY default `plan` to
 * 'free' on create and may NEVER set `entitlements`/`admin`. Paid plan changes
 * happen server-side (Stripe webhook, Stage 2). The `plan` argument here is only
 * used to RECORD the user's selection intent (Stage 2 checkout) — it does NOT
 * grant entitlement and the stored `plan` is always 'free' on create.
 */
export async function ensureUserDoc(user, extra = {}) {
  await ensureReady();
  if (!user || !user.uid) return;
  const ref = _sdk.doc(db, 'users', user.uid);
  const snap = await _sdk.getDoc(ref);
  if (snap.exists()) return; // never clobber an existing profile

  const data = {
    name: extra.name || user.displayName || '',
    email: user.email || '',
    plan: 'free',            // default only — rules forbid client paid plans
    ageConfirmed: true,      // we only create the doc once 13+ is confirmed
    createdAt: _sdk.serverTimestamp(),
  };
  // Record the selected plan for later checkout WITHOUT granting it.
  if (extra.selectedPlan && extra.selectedPlan !== 'free') {
    data.selectedPlan = extra.selectedPlan;
  }
  await _sdk.setDoc(ref, data);
}

// -----------------------------------------------------------------------------
// Lesson progress (Phase 2A) — per-user, owned data under progress/{uid}/lessons
// -----------------------------------------------------------------------------
// Document path: progress/{uid}/lessons/{lessonId}
// Shape: { lessonId, answers: { [questionId]: { pick, correct } }, completed,
//          lastQuestionId, updatedAt }
// Firestore rules already allow a user read/write only under their own
// progress/{uid}/** (see firestore.rules). All helpers no-op safely without a
// signed-in user / Firebase config so the demo still works offline.

/** Returns the current signed-in user's uid, or null. */
function currentUid() {
  return (auth && auth.currentUser && auth.currentUser.uid) || null;
}

/**
 * Merge-saves progress for one lesson. `patch` is shallow-merged into the
 * existing doc, so callers can update just `answers`/`lastQuestionId`/`completed`
 * without clobbering the rest. No-op (resolves) if unconfigured or signed out.
 */
export async function saveLessonProgress(lessonId, patch) {
  if (!isFirebaseConfigured()) return;
  await ensureReady();
  const uid = currentUid();
  if (!uid || !lessonId) return;
  const ref = _sdk.doc(db, 'progress', uid, 'lessons', String(lessonId));
  try {
    await _sdk.setDoc(
      ref,
      { lessonId: String(lessonId), updatedAt: _sdk.serverTimestamp(), ...patch },
      { merge: true },
    );
  } catch {
    /* progress is best-effort; never surface storage errors into practice UX */
  }
}

/**
 * Records a single answered question into the lesson's `answers` map and tracks
 * the last question answered (for resume). Uses a dotted field path so only that
 * one answer key is written. No-op when signed out / unconfigured.
 */
export async function recordAnswer(lessonId, questionId, pick, correct) {
  if (!isFirebaseConfigured()) return;
  await ensureReady();
  const uid = currentUid();
  if (!uid || !lessonId || questionId == null) return;
  const ref = _sdk.doc(db, 'progress', uid, 'lessons', String(lessonId));
  try {
    await _sdk.setDoc(
      ref,
      {
        lessonId: String(lessonId),
        lastQuestionId: questionId,
        updatedAt: _sdk.serverTimestamp(),
        answers: { [String(questionId)]: { pick, correct } },
      },
      { merge: true },
    );
  } catch {
    /* best-effort */
  }
}

/** Loads a lesson's progress doc, or null if none / signed out / unconfigured. */
export async function getLessonProgress(lessonId) {
  if (!isFirebaseConfigured()) return null;
  await ensureReady();
  const uid = currentUid();
  if (!uid || !lessonId) return null;
  try {
    const ref = _sdk.doc(db, 'progress', uid, 'lessons', String(lessonId));
    const snap = await _sdk.getDoc(ref);
    return snap.exists() ? snap.data() : null;
  } catch {
    return null;
  }
}
