# Phase 2 — 2A (progress), 2B (App Check), 2E (staging)

What was built in this pass (video=2C and payments=2D remain parked). Reference for
revisiting later.

---

## 2A — Progress persistence ✅ built + deployed

Practice answers now persist per user and resume on return.

- **Data model:** `progress/{uid}/lessons/{lessonId}` —
  `{ lessonId, answers: { [questionId]: { pick, correct } }, lastQuestionId, updatedAt }`.
  Current lesson id: `craft-and-structure` (`LESSON_ID` in `src/practice.jsx`).
- **Rules:** `firestore.rules` already grants own-data read/write under `progress/{uid}/**`.
  (Also removed an unused helper that was emitting a compile warning.)
- **Helpers (`src/firebase.js`):** `recordAnswer(lessonId, questionId, pick, correct)`,
  `getLessonProgress(lessonId)`, `saveLessonProgress(lessonId, patch)`. All no-op safely
  when signed out / Firebase unconfigured, and swallow errors (progress is best-effort —
  never breaks the practice UX).
- **Wiring (`src/practice.jsx`):** Submit records the answer; `PracticeApp` loads saved
  progress on mount and passes `savedAnswer` to each `QuestionCard`, which restores the
  prior pick into the "submitted" state. Resume is skipped in the preview/demo flow.

**Future work:** only the 4 free questions are wired; extend `LESSON_ID` per module when
more practice pages land. Consider a "you're resuming" banner and a progress meter.

---

## 2B — Firebase App Check ✅ code wired, ⏳ needs console provisioning

App Check proves requests come from the real web app, not a script with a stolen API key.

- **Code (`src/firebase.js`):** `initAppCheck(app)` runs during init, BEFORE auth/firestore,
  gated on `VITE_APPCHECK_SITE_KEY`. Uses `ReCaptchaV3Provider` with auto-refresh. The
  `firebase/app-check` SDK is dynamically imported (code-split) and the whole thing is a
  **no-op while the key is blank** — so the app works today and App Check turns on with a
  config change, no code change.
- **Env:** `VITE_APPCHECK_SITE_KEY` added to `.env`, `.env.example`, `.env.staging` (blank).
- **API:** `firebaseappcheck.googleapis.com` enabled on both prod and staging.

**Remaining (console — do when ready to enforce):**
1. Firebase console → **App Check** → register the Web app with **reCAPTCHA v3** (or
   Enterprise). Copy the **site key**.
2. Put it in `.env` (prod) / `.env.staging` and as the `VITE_APPCHECK_SITE_KEY` GitHub
   secret; rebuild + redeploy.
3. Verify tokens appear in the App Check **Requests** dashboard (Unverified vs Verified).
4. Only AFTER traffic looks healthy: switch **Enforcement** ON for Authentication +
   Firestore (and later Storage/Functions). Enforcing before the client sends tokens would
   lock out real users — so this is deliberately a separate, later toggle.
5. For local dev, set `window.FIREBASE_APPCHECK_DEBUG_TOKEN = true` and register the debug
   token in the console.

---

## 2E — isatprep-staging project ✅ built

A pre-prod mirror of prod so future changes aren't tested on the live site.

- **Project:** `isatprep-staging` (#713262187176), billing linked to `014CD4-D91E29-9756AB`.
- **Mirrors prod:** same APIs, Firebase added, **Firestore `nam5`**, web app registered,
  Firestore rules deployed.
- **Config:** `.firebaserc` already had the `staging` alias; `.env.staging` holds the
  staging web config (gitignored).
- **Deploy to staging:**
  ```
  cp .env.staging .env && npm run build
  firebase deploy --only hosting,firestore:rules -P staging
  ```
  (or wire a separate CI job/branch for staging later). Staging hosting URL will be
  `https://isatprep-staging.web.app` once hosting is first deployed there.

**Note on permissions:** linking billing + enabling services needed cross-grants between
`ninkesh@` (project owner) and `ravish@` (billing/org rights) — same pattern as prod. The
`ravish@` account ended up with `firebase.admin`, `serviceusage.serviceUsageAdmin`,
`firebaserules.admin`, `billing.projectManager` on staging.

**Not done:** staging auth providers (Google/Email) aren't enabled — enable in the staging
console if you want to exercise login there. No org-policy override applied to staging yet
(only needed for Stage 2 public functions).

---

## Status
2A + 2B (code) + 2E are committed and 2A is deployed to prod. App Check enforcement and
staging auth providers are deliberate later console steps. Parked: 2C (video), 2D (payments),
DNS cutover, legal placeholder text.
