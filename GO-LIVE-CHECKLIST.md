# iSATPrep — Go-Live Checklist

Two stages, deliberately separated:

- **STAGE 1 — Lift the *current* site to production "as-is" + make login real.**
  Goal: same UI, same URL (`isatprep.net`), on solid infra, with working Google/email login.
- **STAGE 2 — The new stuff (real video upload pipeline, payments, scale hardening).**
  Tackled after Stage 1 is live and stable.

---

## Ground truth (what the project actually is today)

| Thing | Reality today |
|---|---|
| Frontend | Static HTML pages, JSX transpiled **in the browser** via `@babel/standalone` (CDN). |
| Hosting | GitHub Pages → `isatprep.net` (`CNAME`). |
| Login / signup | **Fake** — `setTimeout` then redirect to `practice.html`. Google button = `alert()`. |
| "Videos" on the page | **One YouTube embed** (`youtube.com/embed/z3ZQ-9Cn8TE`) in the demo modal. Hosted by YouTube. |
| Real media files | **4 MP3 audio clips** (`audio/q1–q4.mp3`, ~22 MB) for practice questions. Served as static files. |
| Storage today | git repo + GitHub Pages + YouTube CDN. **No bucket, no upload, no DB.** |
| Backend | None. |
| Payments | None (pricing is display-only). |

**Implication:** "current functionality" is a marketing/demo site + a static practice page.
Taking it live as-is is a small, low-risk job. Video upload/streaming and payments are genuinely
*new* features — correctly deferred to Stage 2.

---

## Decided setup
- **GCP/Firebase account:** `ninkesh@padhai247.com`
- **Billing account:** `014CD4-D91E29-9756AB` (shared with `investment_agent`)
- **New project:** `isatprep-prod` (dedicated; recommend `isatprep-staging` later)
- **Hosting:** Firebase Hosting on `isatprep.net`
- **Auth:** Firebase Authentication (Google + email/password)
- ⚠️ **Org constraint:** `padhai247.com` enforces `iam.allowedPolicyMemberDomains` → **no public
  `allUsers` IAM bindings allowed.** Firebase Hosting/Auth/Firestore/Storage are unaffected. Any
  *public* Cloud Run/Functions endpoint (Stage 2 payments/signed-URL) needs API Gateway or a
  workaround — same pattern `investment_agent` already uses.

---

# STAGE 1 — Current site to production (DOABLE NOW)

Everything here is fully possible with what we have (account + billing + CLIs ready).

## 1A. GCP/Firebase project (CLI — I can drive, you approve)
- [ ] `gcloud projects create isatprep-prod`
- [ ] Link billing account `014CD4-D91E29-9756AB`
- [ ] Enable APIs: `firebase`, `firebasehosting`, `identitytoolkit`, `firestore` (Firestore optional in Stage 1 — needed once we persist progress)
- [ ] `firebase projects:addfirebase isatprep-prod`
- [ ] Create `.firebaserc` with `default` + (later) `staging` aliases so swapping project IDs is one command

## 1B. Build pipeline — kill in-browser Babel (UI byte-identical)
- [ ] Add **Vite** (multi-page: index, login, signup, topics, practice, preview-*)
- [ ] Move `*.jsx` to real ES modules; bundle React instead of unpkg + Babel CDN
- [ ] Keep `styles.css`, `auth.css`, fonts, `instructor.jpg`, screenshots, `audio/*.mp3` as static assets
- [ ] `npm run build` → `dist/`; verify **screenshot parity** on every page (index/login/practice/topics)
- [ ] *Why mandatory:* in-browser Babel is slow + breaks under load — the #1 thing blocking real traffic.

## 1C. Firebase Hosting + domain cutover
- [ ] `firebase init hosting` → serve `dist/`, configure rewrites for the multi-page routes
- [ ] Deploy to the free `*.web.app` URL first; QA there
- [ ] Add `isatprep.net` (+ `www`) as custom domain in Firebase Hosting
- [ ] **DNS cutover** from GitHub Pages → Firebase (swap A/AAAA/TXT; plan a short propagation window)
- [ ] Confirm HTTPS cert issued; disable old GitHub Pages deploy; keep a rollback note

## 1D. Make login REAL (the "login isn't working" fix)
- [ ] Enable **Google** + **Email/Password** providers in Firebase Auth
- [ ] Configure OAuth consent screen + add `isatprep.net` to authorized domains
- [ ] Rewrite `auth.jsx`:
  - [ ] "Continue with Google" → real `signInWithPopup` (replace the `alert()`)
  - [ ] Email/password → `createUserWithEmailAndPassword` / `signInWithEmailAndPassword`
  - [ ] "Forgot?" → password-reset email
- [ ] Auth guard on `practice.html`: unauthenticated → redirect to login
- [ ] Sign-out + "keep me signed in" session handling
- [ ] (Optional Stage 1) On signup, write `users/{uid}` profile doc in Firestore

## 1E. Google Analytics (GA4) on every page
- [ ] Enable **Google Analytics** when adding Firebase (auto-creates a GA4 property + measurement ID)
- [ ] Add GA4 tracking to **all** pages (index, login, signup, topics, practice, preview-*)
      via the shared head/entry so it loads everywhere — use Firebase Analytics SDK (`getAnalytics`)
      since we're Firebase-native, or a plain `gtag.js` snippet with the measurement ID
- [ ] Track key events: page views (auto), `login`, `sign_up`, `begin_checkout` (Stage 2),
      demo-video open, practice start
- [ ] Put the measurement ID in `.env` (not hardcoded) so swapping projects swaps the GA property
- [ ] Verify hits land in GA Realtime after deploy

## 1F. Minimal go-live hygiene
- [ ] Billing **budget + alerts** for `isatprep-prod` (mirror `investment_agent`'s pattern)
- [ ] Real **Privacy** + **Terms** pages (currently `href="#"` in `auth.jsx`) — note GA usage there
- [ ] Basic error visibility (Hosting/Auth logs; optionally Sentry)
- [ ] Smoke test: load every page → Google login → email login → reset → practice page → sign out

### ✅ End of Stage 1 you have
Same site, same URL, fast/reliable hosting, **real working login** — production-grade for the
*current* feature set. The YouTube demo embed and the 4 practice MP3s keep working exactly as now
(MP3s just served from Firebase Hosting's CDN instead of GitHub Pages).

---

# STAGE 2 — New capabilities (PENDING after Stage 1)

Possible, but each is real new work — not "lift the current site."

## 2A. Instructor video upload + student streaming (1,000 concurrent)
- [ ] Choose delivery: **Mux / Cloudflare Stream** (managed, easiest for 1k concurrent) vs **GCP
      Cloud Storage → Transcoder API → Cloud CDN** (all-GCP, more to build)
- [ ] Admin-only upload UI (custom claim `admin:true`); resumable upload to Storage/provider
- [ ] Transcode → adaptive HLS; store playback IDs in Firestore `videos/{id}` with `requiredPlan`
- [ ] **Gated playback**: server mints signed/tokenized URLs only if the user's plan covers the video
      *(needs a public endpoint — see "Solving the org-policy blocker" below)*
- [ ] HLS player in lesson pages; save/resume position
- [ ] Storage rules: students get **no** direct read of raw files; only admins write source bucket

## 2B. Payments (Core $59 / Complete $79, lifetime)
- [ ] Stripe account + Checkout links per plan
- [ ] Webhook (Cloud Function/Run, fronted by API Gateway) verifies payment → sets `users/{uid}.plan`
- [ ] Entitlement gating wired to video access; test free→paid unlock

## 2C. Data model + security at scale
- [ ] Firestore: `users`, `videos`, `progress/{uid}`; composite indexes for list/filter queries
- [ ] **Security Rules**: users touch only their own docs; nobody can self-upgrade `plan`; video
      metadata read-gated by plan
- [ ] **Firebase App Check** (you already use it in `investment_agent`) to block abusive traffic

## 2X. Solving the org-policy blocker (`allUsers` not allowed)

`padhai247.com` enforces `iam.allowedPolicyMemberDomains`, so no public `allUsers` binding on
Cloud Run/Functions. Stage 2 needs two public-facing endpoints: the **Stripe webhook** and the
**signed-video-URL minter**. Pick one approach:

- [ ] **Option 1 — Project-scoped policy override (recommended for iSATPrep).** Relax the policy for
      `isatprep-prod` only; rest of the org stays strict. Then a normal public Cloud Function works.
      You own the org, so you can self-grant Org Policy Admin and run:
      ```
      gcloud resource-manager org-policies allow iam.allowedPolicyMemberDomains \
        --project=isatprep-prod allUsers allAuthenticatedUsers
      ```
      Trade-off: widens allowed members on that one project. Cleanest, least infra.
- [ ] **Option 2 — API Gateway (no policy change).** Same pattern as `investment_agent`: public
      `*.gateway.dev` URL invokes Cloud Run as one dedicated SA (single identity = allowed). App
      enforces Firebase auth itself. Trade-off: extra component + ~200–300ms hop.
- [ ] **Option 3 — Hybrid.** Signed video URLs via a **Firebase callable function** (invoked through
      the Firebase SDK, auth verified in-function, secret never on client) → no public binding needed.
      Stripe webhook still needs Option 1 or 2 (Stripe must POST to a public URL).

**Recommendation:** Option 1 — this is a consumer web app, not the IP-whitelisted-partner situation
that forced `investment_agent` onto API Gateway, so the gateway is overkill. Override the policy on
the single project and enforce real auth inside every function.

## 2D. Scale hardening for 1k concurrent
- [ ] Load-test critical paths (auth, Firestore reads, signed-URL minting)
- [ ] Function **min instances** (warm) if cold starts hurt UX; review Firestore/Auth quotas
- [ ] CI/CD: GitHub Actions → build + deploy to Hosting on merge to `main` (reuse WIF pattern)
- [ ] `isatprep-staging` project for pre-prod testing

---

## What I can do vs what only you can do

| Task | Me (CLI, with your approval) | You (interactive/console) |
|---|---|---|
| Create project, link billing, enable APIs, add Firebase | ✅ | — |
| Vite migration, rewrite `auth.jsx`, build/deploy config | ✅ | — |
| Deploy to Firebase Hosting | ✅ | — |
| Enable Google sign-in provider / OAuth consent screen | drafts exact steps | ✅ click-through |
| DNS record changes at your registrar | gives exact records | ✅ apply them |
| Stripe account + keys (Stage 2) | wires it once keys exist | ✅ create account |

---

## Suggested order
1. **1A** create project (5 min, CLI) → **1B** Vite migration (UI identical) → **1C** deploy to
   `*.web.app` and QA → **1D** real login → **1C** DNS cutover to `isatprep.net` → **1E** hygiene.
2. Then start **Stage 2**, beginning with the video provider decision (2A) and payments (2B).
```
