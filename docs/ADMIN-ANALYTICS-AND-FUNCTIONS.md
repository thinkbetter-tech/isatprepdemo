# Admin Analytics + Cloud Functions enablement milestone

Scopes (b): an admin's ability to analyze student performance and overall data, plus the
**Cloud Functions** foundation it shares with peer-stats hardening and Stripe payments.

---

## Why these are bundled
Three needed capabilities all require the same missing piece — **Cloud Functions (Admin SDK,
server-side)**:
1. **Admin analytics** — reading/aggregating across ALL students (a client can't and must not).
2. **Peer-stats hardening** — move the `testStats` aggregate write off the client (hot-doc → sharded
   counter or function-side aggregation).
3. **Payments** — the Stripe webhook must be a server endpoint.

So this is one "**Cloud Functions enablement**" milestone that unlocks all three. The org-policy
override (Option 1) is already applied, so public functions are permitted on `isatprep-prod`.

---

## Current state (what exists today)
- **Student-facing analysis: BUILT & LIVE** (see below) — fully client-side + Firestore, no functions.
- **No admin role, no admin dashboard, no Cloud Functions** yet.
- What an admin can do today: browse raw docs in the Firebase console, see Auth user list, see GA4
  usage funnels, and read the PII-free `testStats/{testId}` aggregate. No cross-student academic
  reporting, no friendly UI.

### Student analysis — shipped (for reference)
- Per-question **timing** captured in the runner (`timeSec`, `firstAnswerSec`, `changedAnswer`).
- Full **attempt records** at `progress/{uid}/attempts/{id}` (history; never overwritten); included in
  export-my-data and account deletion.
- `src/data/analysisEngine.js` (pure) → snapshot / right / skipped / wrong metrics + timeline.
- Rich report in `test.jsx` (`Analysis`): snapshot cards, right/wrong/skipped bar, per-question
  timeline, insight cards, tabbed review with explanations, drill-to-practice links.
- **Peer comparison**: PII-free `testStats/{testId}` aggregate, surfaced only past
  `PEER_MIN_ATTEMPTS = 10`; degrades to an honest "unlocks at N students" notice otherwise. No
  hardcoded data anywhere.
- **History**: `account.html` lists past attempts → `test.html?attempt=<id>` re-renders any attempt.

---

## Admin Analytics — scope

### Roles
- Add a custom claim **`admin: true`** (set via a secured callable function or one-off script;
  NEVER client-settable). Gate the admin UI + admin Firestore reads on it.

### Metrics an admin needs
**Cohort / overall**
- Active students, signups over time, plan mix (free/method/mastery).
- Tests taken (count, by test), completion rate, avg score per test, score distribution.
- Avg time-on-task; drop-off (started vs. finished modules).

**Per-domain / per-skill (across all students)**
- Accuracy by domain & skill → which topics the cohort struggles with.
- Per-question difficulty in practice (correct rate, avg time) → flag bad/too-hard/too-easy items
  (also doubles as a **content-quality signal** for the AI-drafted bank).

**Per-student drill-down**
- Roster → a student's attempts, scores, weak domains, time trends, last activity.

**Engagement**
- Practice questions attempted, streaks, recency — retention signals.

### Data approach (privacy-safe, scalable)
- A **Cloud Function** (scheduled nightly + on-attempt trigger) aggregates `progress/**` into:
  - `adminStats/overall`, `adminStats/byTest/{testId}`, `adminStats/byDomain/{slug}` — no PII, fast to read.
  - `adminStats/roster/{uid}` (admin-only read) — per-student rollups for drill-down.
- Admin UI reads these aggregates (cheap), not raw collections (which don't scale to scan client-side).
- Firestore rules: `adminStats/**` readable only if `request.auth.token.admin == true`.

### Admin UI
- New gated page (`admin.html`, `requireAdmin()` guard): overview dashboard (cohort cards + charts),
  per-test view, per-domain heatmap, roster + student drill-down, content-quality table
  (flag low-correct-rate questions for review). Reuse existing design tokens; charts via a tiny lib
  or hand-rolled bars.

---

## Cloud Functions enablement — tasks
1. Enable APIs: `cloudfunctions`, `cloudbuild`, `run`, `eventarc`, `artifactregistry`,
   `secretmanager` on `isatprep-prod` (+ staging).
2. `firebase init functions` (Node, 2nd gen); add a `functions/` codebase; wire `firebase.json`.
3. **Admin role**: `setAdminClaim` callable (guarded: only an existing admin / one-off bootstrap).
4. **Aggregation functions**: on-write trigger for attempts + nightly scheduled rollup → `adminStats/**`.
5. **Peer-stats hardening**: move `testStats` updates server-side (or distributed counter); set
   `testStats` rules to `allow write: if false` once the function owns writes.
6. **Stripe webhook** (separate but same infra): verify signature → set `users/{uid}.plan` via Admin SDK.
7. **App Check** on callable/HTTP functions; **audit logging** on entitlement/admin changes.
8. Deploy functions via CI (extend the WIF workflow) to prod + staging.

### Sequencing
- Functions milestone is **Stage 2 infra**. Recommended order once started: enable APIs → admin claim
  → aggregation + admin dashboard → peer-stats hardening → Stripe webhook.
- None of this blocks the **student analysis already live**; it's additive.

## Privacy / compliance
- Admin aggregates: `adminStats/overall|byTest|byDomain` hold NO PII. `adminStats/roster/{uid}` holds
  per-student academic data — admin-read only, and it's the school/operator's legitimate data on its
  own students; document in the Privacy Policy and restrict access by the `admin` claim.
- Per-question timing on minors stays within the student's own record + anonymous aggregates.
- Update the data-deletion function to also clear any per-student admin rollups on account deletion.
