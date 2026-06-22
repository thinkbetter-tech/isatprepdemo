# iSATPrep — Production Go-Live Plan

**Status:** Definitive plan of record.
**Owner account:** `ninkesh@padhai247.com`
**Billing account:** `014CD4-D91E29-9756AB` (shared with `investment_agent`)
**Target scale:** ~1,000 concurrent users.
**Audience:** US-based SAT students, **13+** (age-gated; under-13 not supported — avoids COPPA).
**Hard constraint:** UI must remain visually identical; site must stay on `isatprep.net`.

### Locked decisions
| Decision | Choice |
|---|---|
| GCP/Firebase account | `ninkesh@padhai247.com` |
| Billing account | `014CD4-D91E29-9756AB` |
| New project | `isatprep-prod` (later `isatprep-staging`) |
| Stack | Firebase-native (Hosting + Auth + Firestore + Storage + Functions gen2) |
| Region | **US** — Firestore `nam5` (permanent), Functions/Storage `us-central1` |
| Org-policy blocker | **Option 1** — project-scoped `allUsers` override on `isatprep-prod` only |
| Frontend | Keep UI byte-identical; migrate in-browser Babel → **Vite** build |
| Age policy | **13+** (date-of-birth gate at signup) |
| Payments (Stage 2) | Stripe Checkout (SAQ-A); Core $59 / Complete $79 lifetime |
| Video (Stage 2) | Mux/Cloudflare Stream (recommended) vs GCS+Transcoder+Cloud CDN |

### Progress so far (built in repo — Stage 1 code complete, not yet deployed)
- ✅ `privacy.html`, `terms.html`, `legal.css` — brand-matched US/13+ legal pages (with `[INSERT ...]`
  placeholders + attorney-review markers). See §11.
- ✅ All dead `href="#"` Privacy/Terms links wired (`auth.jsx`, `sections.jsx`).
- ✅ **Vite build pipeline** — in-browser Babel removed; JSX bundled ahead of time. `*.jsx` → `src/`,
  per-page entry modules, multipage Vite config, `dist/` output. UI preserved. `npm run build` green.
- ✅ **Real Firebase auth** (`src/firebase.js`, `src/auth.jsx`) — Google + email/password + password
  reset + friendly error mapping. Degrades gracefully with no `.env` (shows "not configured", no
  crash, no fake redirect). Firebase SDK lazy-loaded + code-split.
- ✅ **13+ age gate** — DOB field on email signup (stores only `ageConfirmed`, not DOB); 13+ modal on
  first Google sign-in (declines → signed out, no profile).
- ✅ **Auth guard** — `requireAuth()` on the practice page (no-op until Firebase configured).
- ✅ **`users/{uid}` profile creation** on signup (`plan:'free'`, server-only plan/entitlements per rules).
- ✅ **GA4 + consent** — analytics gated behind consent banner + GPC; events `login`, `sign_up`,
  `demo_video_open`, `practice_start` wired (no-op until consent). Banner on all 8 pages.
- ✅ **Infra-as-code** — `firebase.json`, `.firebaserc`, `firestore.rules`, `firestore.indexes.json`,
  `storage.rules`, `infra/bootstrap-isatprep.sh`, `.github/workflows/deploy.yml`, `infra/README.md`.
- ⏳ **Not yet done:** run the bootstrap (create `isatprep-prod`, billing, Firestore `nam5`, org-policy
  override) — GATED on user approval; console steps (enable providers, OAuth consent, web app config);
  populate `.env`; deploy; DNS cutover; fill `[INSERT ...]` legal fields + attorney review; fill
  `deploy.yml` WIF TODOs (needs GitHub repo slug); accessibility pass. All of Stage 2.

This document supersedes ad-hoc notes. It is split into two stages:

- **Stage 1** — lift the *current* site to production-grade infra + make login real + add analytics.
- **Stage 2** — the new product capabilities: instructor video pipeline, payments, scale hardening.

---

## 1. Current-state assessment (ground truth)

Established by reading the repo, not assumed:

| Area | Today | Production gap |
|---|---|---|
| Frontend | Static HTML; JSX transpiled **in the browser** via `@babel/standalone` (CDN) | Slow first paint; breaks under load / CDN hiccup. Must precompile. |
| Hosting | GitHub Pages → `isatprep.net` (`CNAME`) | No atomic rollback, no app-layer control, no auth integration. |
| Auth | **Fake** — `setTimeout` → redirect; Google button is `alert()` | No real identity. Must implement Firebase Auth. |
| "Video" | One **YouTube embed** (`youtube.com/embed/z3ZQ-9Cn8TE`) in demo modal | Hosted by YouTube — fine as-is. Not the real video feature. |
| Real media | 4 **MP3** clips (`audio/q1–q4.mp3`, ~22 MB) for practice | Served fine as static assets from Hosting CDN. |
| Database | None | Needed once we persist users/progress (start of Stage 1D, full in Stage 2). |
| Payments | Display-only pricing | Entirely new (Stage 2). |
| Backend | None | Minimal in Stage 1; functions in Stage 2. |

**Conclusion:** Stage 1 is a small, low-risk lift. Video upload/streaming and payments are genuinely
new features and are correctly deferred to Stage 2.

---

## 2. Target architecture

**Firebase-native, single GCP project, all in one region.**

```
                        ┌──────────────────────────────────────────┐
                        │  isatprep.net (Firebase Hosting + CDN)     │
   Browser  ───────────▶│  Static bundle (Vite build of current UI) │
   (≤1000 concurrent)   │  + Firebase JS SDK (Auth, Analytics,       │
                        │    Firestore, Storage)                     │
                        └───────────┬───────────────┬───────────────┘
                                    │               │
                  Firebase Auth ◀───┘               └───▶ Firestore (users, progress,
                  (Google + email)                         videos metadata, entitlements)
                                    │
                                    │  (Stage 2)
                        ┌───────────▼───────────────────────────────┐
                        │  Cloud Functions (2nd gen / Cloud Run)     │
                        │  - Stripe webhook  → sets users.plan       │
                        │  - mint signed video playback URL          │
                        │  Public ingress enabled via project-scoped │
                        │  org-policy override (Option 1).           │
                        │  Auth enforced IN the function (Firebase   │
                        │  ID token + App Check).                    │
                        └───────────┬───────────────┬───────────────┘
                                    │               │
                  Secret Manager ◀──┘               └──▶ Video delivery
                  (Stripe key,                            (Mux / Cloudflare Stream
                   video signing key)                      OR GCS+Transcoder+Cloud CDN)
```

### 2.1 Service inventory

| Concern | Service | Stage |
|---|---|---|
| Frontend build | **Vite** (precompiled, multi-page) | 1 |
| Hosting + CDN + TLS | **Firebase Hosting** | 1 |
| Identity | **Firebase Authentication** (Google + Email/Password) | 1 |
| Analytics | **Google Analytics 4** (via Firebase Analytics SDK) | 1 |
| Database | **Cloud Firestore** (Native mode) | 1 (profiles) → 2 (full) |
| Object storage | **Cloud Storage for Firebase** | 2 |
| Server logic | **Cloud Functions (2nd gen)** | 2 |
| Secrets | **Secret Manager** | 2 |
| Abuse protection | **Firebase App Check** (reCAPTCHA Enterprise for web) | 2 |
| Video transcode + delivery | **Mux / Cloudflare Stream** (recommended) or GCS+Transcoder+Cloud CDN | 2 |
| Payments | **Stripe Checkout + webhook** | 2 |
| CI/CD | **GitHub Actions + Workload Identity Federation** | 1 (hosting) → 2 (functions) |
| Cost guardrail | **Cloud Billing budget + alerts** | 1 |

### 2.2 Region & naming
- **Users are in the USA** → all regional resources live in the US for latency *and* data residency.
- **Region:** `us-central1` (Iowa) — broad service availability (Functions, Transcoder, etc.) and
  central US latency. (`nam5` multi-region for Firestore if we want US-wide redundancy.)
  ⚠️ **Firestore location is permanent once set** — choose a **US** location (`nam5` or `us-central1`)
  at project init. Do **not** pick `asia-south1` (that was the India-default; US users would pay a
  cross-Pacific round-trip on every read).
- **Hosting/CDN** is global regardless, so static assets are fast everywhere; the region choice only
  affects Firestore + Functions + Storage origin.
- **Project ID:** `isatprep-prod` (later: `isatprep-staging`).
- **Resource naming:** `isatprep-<purpose>-<env>` to mirror the `investment_agent` convention.

### 2.3 Why Firebase-native over the `investment_agent` Cloud Run + Cloud SQL stack
- The app is a static frontend + light backend; it does **not** need a VPC, Cloud NAT, reserved IP,
  or a relational DB. `investment_agent` needed those only because a partner (ICICI Breeze)
  whitelists its egress IP — iSATPrep has no such requirement.
- Firestore auto-scales to 1,000 concurrent with zero ops; Cloud SQL `db-f1-micro` would be a
  bottleneck and needs the proxy-sidecar machinery.
- We still **reuse the good patterns** from `investment_agent`: Firebase ID-token verification,
  Secret Manager discipline (resource in IaC, value out-of-band), WIF-based keyless CI/CD, and the
  billing-budget alerts.

---

## 3. Environment & configuration strategy (project-ID portability)

Project IDs must never be hardcoded, so swapping projects tomorrow is a config change, not a refactor.

- **`.firebaserc`** — CLI project aliases:
  ```json
  { "projects": { "default": "isatprep-prod", "staging": "isatprep-staging" } }
  ```
  Switch with `firebase use staging`.
- **`.env.production` / `.env.staging`** — Vite-read Firebase web config + GA measurement ID:
  ```
  VITE_FIREBASE_API_KEY=...
  VITE_FIREBASE_AUTH_DOMAIN=isatprep-prod.firebaseapp.com
  VITE_FIREBASE_PROJECT_ID=isatprep-prod
  VITE_FIREBASE_STORAGE_BUCKET=isatprep-prod.appspot.com
  VITE_FIREBASE_APP_ID=...
  VITE_GA_MEASUREMENT_ID=G-XXXXXXX
  ```
  `.env*` files are git-ignored; values come from Firebase console + CI secrets.
- **Functions config (Stage 2):** secrets via Secret Manager, never in code or `.env` shipped to client.

---

## 4. Org-policy decision (CONFIRMED: Option 1)

`padhai247.com` enforces `iam.allowedPolicyMemberDomains`, blocking public (`allUsers`) endpoints.
**Decision: project-scoped policy override** so `isatprep-prod` can host public Cloud Functions
(Stripe webhook + signed-URL minter) without API Gateway.

- Self-grant Org Policy Admin (org owner can), then:
  ```
  gcloud resource-manager org-policies allow iam.allowedPolicyMemberDomains \
    --project=isatprep-prod allUsers allAuthenticatedUsers
  ```
- Scope: **`isatprep-prod` only**; the rest of the org (incl. `investment_agent`) stays strict.
- Security is not weakened in practice: every public function still verifies a **Firebase ID token**
  + **App Check** token before doing work. "Public ingress" ≠ "unauthenticated logic".
- Reversible: re-applying the inherited policy restores the restriction.

---

# STAGE 1 — Current site to production

Outcome: identical UI on `isatprep.net`, fast/reliable hosting, **working Google + email login**,
GA4 on every page. No new product features.

## Phase 1A — Project & foundation (CLI; I drive, you approve)
1. `gcloud projects create isatprep-prod --name="iSATPrep"`
2. `gcloud billing projects link isatprep-prod --billing-account=014CD4-D91E29-9756AB`
3. Enable APIs: `firebase`, `firebasehosting`, `identitytoolkit`, `firestore`,
   `cloudresourcemanager`, `logging`, `monitoring`.
4. `firebase projects:addfirebase isatprep-prod` (enable Google Analytics in the same step).
5. Initialize Firestore in **Native mode**, **US location** (`nam5` multi-region, permanent) —
   data residency for US users.
6. Create `.firebaserc` (default + staging aliases).
7. Apply the **Option 1 org-policy override** on `isatprep-prod` (sets up Stage 2; harmless now).
8. Create **billing budget + email alerts** (50/90/100% → `ninkesh@padhai247.com`).

## Phase 1B — Build pipeline (kill in-browser Babel; UI byte-identical)
1. Add **Vite** + React deps; configure **multi-page** entries: `index`, `login`, `signup`,
   `topics`, `practice`, `preview-dashboard`, `preview-module`, `index-print`.
2. Convert `*.jsx` (`sections`, `icons`, `topics`, `practice`, `preview`, `auth`, `tweaks-panel`)
   into ES modules; bundle React instead of unpkg + `@babel/standalone`.
3. Keep all static assets unchanged: `styles.css`, `auth.css`, fonts, `instructor.jpg`,
   `screenshots/`, `audio/*.mp3`, `transcripts/`.
4. `npm run build` → `dist/`; `npm run dev` for local work.
5. **Acceptance:** screenshot-diff each page (index, login, signup, topics, practice) against the
   current live site — pixel parity required before proceeding.

## Phase 1C — Hosting + domain cutover
1. `firebase init hosting` → public dir `dist/`, SPA/multi-page rewrites matching current routes.
2. Deploy to free `isatprep-prod.web.app`; full QA there (no DNS risk yet).
3. Add custom domain `isatprep.net` (+ `www`) in Firebase Hosting; obtain verification + A/AAAA records.
4. **DNS cutover** at registrar: replace GitHub Pages records with Firebase records.
   - Plan a low-traffic window; TTL-aware (lower TTL beforehand if possible).
   - Keep GitHub Pages config noted for instant rollback.
5. Confirm managed TLS cert issued; verify `https://isatprep.net` serves the new build.
6. Decommission GitHub Pages deploy after 24–48h of stability.

## Phase 1D — Real authentication
1. Enable **Google** and **Email/Password** providers in Firebase Auth.
2. Configure OAuth consent screen; add `isatprep.net` + `isatprep-prod.web.app` to authorized domains.
3. Add a small `firebase.js` init module (reads `.env`); export `auth`, `analytics`, `db`.
4. Rewrite `auth.jsx`:
   - "Continue with Google" → `signInWithPopup(googleProvider)` (replace `alert()`).
   - Email/password → `createUserWithEmailAndPassword` / `signInWithEmailAndPassword`.
   - "Forgot?" → `sendPasswordResetEmail` (currently a placeholder `href="#"`).
   - Map Firebase error codes to the existing inline error UI.
   - **Age gate (13+):** add a date-of-birth / "I am 13 or older" check on the signup form; block
     under-13 signups. Store the confirmation (not necessarily full DOB) on the user doc. Applies to
     Google sign-up too (prompt for age on first sign-in if not present).
5. **Auth guard** on `practice.html`: `onAuthStateChanged` → redirect unauthenticated users to login.
6. Sign-out control; "keep me signed in" → `setPersistence` (local vs session).
7. On first sign-up, create `users/{uid}` Firestore doc: `{ name, email, plan: "free", createdAt }`.
8. Minimal Firestore rules: a user may read/write only their own `users/{uid}` doc.

## Phase 1E — Google Analytics 4 (every page)
1. Use the GA4 property auto-created with Firebase; put measurement ID in `.env`.
2. Initialize **Firebase Analytics** (`getAnalytics`) in the shared init so it loads on all pages.
3. Auto page_view + custom events: `login`, `sign_up`, `demo_video_open`, `practice_start`.
   (Reserve `begin_checkout` / `purchase` for Stage 2.)
4. Verify in GA Realtime after deploy.

## Phase 1F — Go-live hygiene & US compliance
1. **US compliance program — see §11** (this is a gating requirement for public launch, not optional):
   age gate (13+), real Privacy Policy + Terms, cookie/analytics consent banner with GA Consent Mode,
   data-deletion path, CAN-SPAM-compliant emails, accessibility pass, attorney review.
2. Error visibility: confirm Hosting + Auth logs; optionally add Sentry (frontend).
3. **Stage 1 smoke test (must all pass):**
   - Every page loads with identical visuals.
   - Google sign-in works end-to-end.
   - Email sign-up + login + password reset work.
   - Auth guard redirects correctly; sign-out works.
   - `users/{uid}` doc created on signup.
   - GA events appear in Realtime.
   - `isatprep.net` serves over HTTPS with valid cert.

## Phase 1G — CI/CD for hosting (keyless)
1. Set up **Workload Identity Federation** for the GitHub repo (mirror `investment_agent/wif.tf`).
2. GitHub Action: on merge to `main` → `npm ci && npm run build && firebase deploy --only hosting`.
3. Store `.env.production` values as GitHub Actions secrets (or fetch from Secret Manager).

---

# STAGE 2 — New product capabilities

Each item is net-new work, started only after Stage 1 is live and stable.

## Phase 2A — Data model & security rules (Firestore)
- Collections:
  - `users/{uid}` — profile, `plan` (`free|core|complete`), `entitlements`, timestamps.
  - `videos/{id}` — title, domain/topic, `requiredPlan`, provider `playbackId`, duration, status.
  - `progress/{uid}/lessons/{lessonId}` — completion, last position (for Resume).
- **Security Rules (server-enforced invariants):**
  - Users read/write only their own `users/{uid}` and `progress/{uid}/**`.
  - **No client can write its own `plan`/`entitlements`** — only Cloud Functions (Admin SDK) may.
  - `videos` metadata readable, but the **playback URL is gated** (minted server-side, see 2C).
- Add composite indexes for any list/filter queries the UI issues.

## Phase 2B — Public function ingress (Option 1 enablement)
- Org-policy override already applied in 1A.
- Provision **Cloud Functions (2nd gen)** with `--allow-unauthenticated` *ingress*, but every
  function verifies Firebase ID token + App Check internally.
- Enable **Firebase App Check** (reCAPTCHA Enterprise for web) to block scripted abuse.

## Phase 2C — Instructor upload + student streaming (1,000 concurrent)
1. **Choose provider:**
   - **Mux / Cloudflare Stream** (recommended): managed transcode + adaptive HLS + global CDN +
     signed playback. 1k concurrent viewers is trivial; least infra.
   - **All-GCP alternative:** Cloud Storage (source) → **Transcoder API** (HLS renditions) →
     **Cloud CDN** with signed URLs. More to build/operate.
2. **Admin model:** custom claim `admin: true`, set via a secured callable function (never client).
3. **Upload UI (admin-only):** resumable upload to Storage or provider direct-upload URL.
4. **On upload complete:** transcode → store `videos/{id}` (playbackId, status, `requiredPlan`).
5. **Gated playback (the core security boundary):** a function mints a **short-lived signed
   playback token/URL** only if the caller's `plan` covers `requiredPlan`. Signing secret lives in
   Secret Manager; students never get a raw, unsigned, or ungated URL.
6. **Player:** HLS, adaptive bitrate, embedded in lesson pages; save/resume position to Firestore.
7. **Storage rules:** students have **no** direct read of source files; only admins write source bucket.

## Phase 2D — Payments (Stripe; Core $59 / Complete $79, lifetime)
1. Stripe account + **Checkout** links per plan; carry `?plan=` from pricing/signup through.
2. Track `begin_checkout` (GA) on initiation.
3. **Webhook** (public Cloud Function) verifies Stripe signature → sets `users/{uid}.plan` +
   entitlements via Admin SDK. Stripe secret + webhook secret in Secret Manager.
4. On `purchase` success → GA `purchase` event; unlock gated videos.
5. Test full free→paid→unlock and refund handling minimally.

## Phase 2E — Scale hardening for 1,000 concurrent
- Load-test critical paths: Auth, Firestore reads, signed-URL minting, Checkout.
- Cloud Functions **min instances** (warm) if cold starts hurt playback/auth UX.
- Review quotas: Firestore, Functions concurrency, Auth, Identity Platform.
- CDN cache verification: zero origin egress per viewer for video + static assets.
- `isatprep-staging` project (full mirror) for pre-prod testing.
- Extend CI/CD to deploy functions + run integration tests.

---

## 5. Security model (summary)
- **All privileged state changes are server-side.** Plan/entitlement/admin flags writable only by
  Cloud Functions via Admin SDK; Firestore rules forbid client writes.
- **Every public endpoint authenticates** (Firebase ID token + App Check) regardless of public ingress.
- **Secrets** (Stripe, video signing) live only in Secret Manager; resource defined in IaC, value
  uploaded out-of-band (the `investment_agent` discipline) — never in client bundle or git.
- **Paid content** is protected by signed, short-lived, entitlement-checked playback URLs — not by
  client-side hiding.
- **Storage**: `public_access_prevention=enforced`, uniform bucket-level access, students no raw read.

---

## 6. Cost outlook (order of magnitude, INR/mo)
- **Stage 1:** effectively near-zero. Hosting + Auth + light Firestore are within free tiers for this
  traffic; main cost is bandwidth on the MP3s/assets (small). Budget alert at ₹ threshold catches surprises.
- **Stage 2 drivers:** video delivery bandwidth (provider-dependent — Mux/Cloudflare per-minute
  streamed, or Cloud CDN egress), Functions invocations, Firestore reads. Video egress dominates;
  model it once a provider and viewing volume are chosen.
- Reuse the `investment_agent` budget pattern: 50/90/100% alerts to `ninkesh@padhai247.com`.

---

## 7. Risk register
1. **In-browser Babel under load** — biggest pre-launch risk; eliminated in Phase 1B. (High → resolved)
2. **DNS cutover** GitHub Pages → Firebase — brief exposure; mitigated by `.web.app` QA first +
   documented rollback + low TTL. (Medium)
3. **Firestore location is permanent** — must pick a **US** location at init; wrong choice = recreate
   project. (Medium → resolved by checklist gate)
4. **Entitlement leakage** — only mitigated by server-side signed URLs + rules; never client-only. (High, Stage 2)
5. **Org policy** blocking functions — resolved by Option 1 override. (Resolved)
6. **OAuth consent / authorized domains** misconfig → Google login fails on prod domain; verify in 1D. (Medium)
7. **Minors' data (COPPA/FERPA/state laws)** — SAT prep means under-18 users; mishandling
   children's data carries real legal exposure. Mitigated by the compliance program in §11. (High)
8. **Stripe = card data** — never touch raw PAN; Stripe Checkout keeps us in PCI SAQ-A scope. (Medium)

---

## 8. Division of labor
| Task | Me (CLI/code, you approve) | You (interactive/console) |
|---|---|---|
| Create project, link billing, enable APIs, add Firebase, org-policy override | ✅ | — |
| Vite migration, rewrite `auth.jsx`, GA wiring, build/deploy config | ✅ | — |
| Deploy to Hosting; set up WIF + GitHub Action | ✅ | — |
| Enable Google provider / OAuth consent screen | drafts exact steps | ✅ click-through |
| DNS records at registrar | exact records provided | ✅ apply |
| Stripe account + keys (Stage 2) | wires once keys exist | ✅ create account |
| Choose video provider (Stage 2) | recommendation given | ✅ decide |

---

## 9. Execution order (recommended)
1. **1A** project + billing + Firestore region + org-policy override + budget.
2. **1B** Vite migration → screenshot parity gate.
3. **1C** deploy to `*.web.app` → QA (no DNS risk).
4. **1D** real Google + email login + auth guard.
5. **1E** GA4 on all pages.
6. **1C** DNS cutover to `isatprep.net` → **1F** hygiene + smoke test.
7. **1G** keyless CI/CD.
8. Begin **Stage 2**: choose video provider (2C) → data model + rules (2A) → functions ingress (2B)
   → payments (2D) → scale hardening (2E).

---

## 10. Definition of done
- **Stage 1 done:** `isatprep.net` serves the identical UI from Firebase Hosting over HTTPS;
  Google + email login work end-to-end; GA4 reports in Realtime; CI auto-deploys on merge;
  budget alerts active. No in-browser Babel anywhere.
- **Stage 2 done:** instructors upload videos; students stream gated, entitlement-checked HLS at
  1,000 concurrent; Core/Complete purchases unlock content via Stripe; App Check enforced; staging
  mirror exists; load tests pass.

---

## 11. US compliance & privacy program

Users are in the **USA**, and this is **SAT prep — so a meaningful share are minors (13–17)**. That
pulls in real legal obligations. This is operational/legal guidance, **not legal advice** — have a
US attorney review the final policies before launch.

### 11.1 Which laws apply
| Law | Applies because | What it requires (practical) |
|---|---|---|
| **COPPA** (federal, under-13) | If anyone under 13 can register | Verifiable parental consent before collecting a child's data, or **block under-13 signups**. |
| **FERPA** | Only if we contract with schools/districts as a "school official" | Mostly N/A for direct-to-consumer; becomes relevant if you sell to schools. Note for later. |
| **State student-privacy laws** (e.g. California **SOPIPA**) | Operating an education service used by K-12 students | No targeted ads to students, no selling student data, reasonable security, deletion on request. |
| **CCPA/CPRA** (California), and **CPA/VCDPA/CTDPA** etc. (other states) | CA + a growing list of states; thresholds may exempt a small business initially | Privacy notice, right to know/delete/opt-out of "sale/share", honor Global Privacy Control. |
| **CAN-SPAM** | Any marketing email | Unsubscribe link, valid physical address, honor opt-outs. |
| **ADA / WCAG 2.1 AA** | US education sites are frequent accessibility-suit targets | Accessible UI (we already have semantic markup; audit before launch). |
| **PCI DSS (SAQ-A)** | Taking payments (Stage 2) | Use **Stripe Checkout** so card data never touches our servers → lowest PCI scope. |

### 11.2 Age strategy — decide this first (drives everything)
- [ ] **Recommended for launch: restrict signup to 13+** (and require parental involvement for 13–17
      where a state demands it). Add an **age gate / date-of-birth check** at signup. This avoids the
      heavy COPPA verifiable-parental-consent machinery for under-13.
- [ ] If under-13 must be supported → implement **verifiable parental consent** (COPPA) — significant
      extra work; defer unless required.
- [ ] Add a clear "**not for children under 13**" statement to Terms + signup if we 13-gate.

### 11.3 Privacy Policy (must be real before launch — Phase 1F)
Replace the `href="#"` placeholders in `auth.jsx`. The policy must cover:
- [ ] **What we collect:** name, email, Google profile (via OAuth), auth UID, progress data,
      **Google Analytics** data (device, approximate location, usage events), payment metadata
      (handled by Stripe — we store only status, never card numbers).
- [ ] **Why / legal basis & purposes**, and that we **do not sell student personal information**.
- [ ] **Third parties / sub-processors:** Google (Firebase Auth, Hosting, Firestore), **Google
      Analytics**, **Stripe** (Stage 2), the **video provider** (Mux/Cloudflare, Stage 2).
- [ ] **Cookies/analytics disclosure** + how to opt out; honor **Global Privacy Control**.
- [ ] **Children's privacy** section (matches the age strategy above).
- [ ] **User rights:** access, correction, **deletion**, data export; how to exercise them + contact
      (`hello@isatprep.net` or a privacy alias).
- [ ] **Data retention** and **security** summary; **breach notification** commitment.
- [ ] **Effective date** + change-notification process.

### 11.4 Terms of Service (Phase 1F)
- [ ] Eligibility/age, acceptable use, IP ownership of course content, payment/refund terms
      (lifetime plans), disclaimers (no SAT-score guarantee), limitation of liability, governing law
      (your US state), dispute resolution.

### 11.5 Consent & UX mechanics
- [ ] **Cookie/analytics consent banner** before non-essential analytics fire (GA4) — esp. for CA
      users; wire GA to respect a denied state (Consent Mode).
- [ ] Signup checkbox: explicit agreement to Terms + Privacy (already present in `auth.jsx` — link it
      to the real pages).
- [ ] **Data deletion path:** a way for a user (or parent) to request account + data deletion;
      implement a deletion function that purges Auth + Firestore + Storage records.
- [ ] Email footer with unsubscribe + physical address (CAN-SPAM) for any marketing sends.

### 11.6 Technical safeguards backing the policy
- [ ] **US data residency** — Firestore/Storage/Functions in US region (set in §2.2 / Phase 1A).
- [ ] **Encryption** in transit (HTTPS, enforced) + at rest (Google-managed, default).
- [ ] **Least-privilege** access; **App Check** (Stage 2) to limit abuse.
- [ ] **Audit logging** (Cloud Logging) for admin/privileged actions.
- [ ] **Stripe-hosted checkout** → PCI SAQ-A; no card data on our infra.
- [ ] **Sub-processor list** kept current as we add providers.

### 11.7 Status & action items by stage
**Already built (this repo):**
- ✅ `privacy.html` — Privacy Policy page (brand-matched, US/13+/CCPA/COPPA-aware). Has `[INSERT ...]`
  placeholders for effective date, legal entity name, mailing address.
- ✅ `terms.html` — Terms of Service page (eligibility 13+, content license, refunds, no-score-guarantee,
  liability, governing law). Has `[INSERT ...]` placeholders incl. state + refund policy.
- ✅ `legal.css` — shared styling for both pages.
- ✅ All dead `href="#"` Privacy/Terms links wired up (`auth.jsx` login + signup + checkbox;
  `sections.jsx` footer).

**Decided:** age policy = **13+** (date-of-birth gate at signup).

**Still to do in Stage 1 (before public launch):**
- [ ] Fill all `[INSERT ...]` fields (dates, legal name, address, state, refund terms).
- [ ] **Attorney review** of both pages (touches minors' data — do not skip).
- [ ] **Age gate** in signup (DOB / 13+ confirmation) — wire during the Phase 1D auth rewrite.
- [ ] **Cookie/analytics consent banner** with GA Consent Mode (respect denied state + GPC).
- [ ] **Data-deletion path** (account settings + a function that purges Auth + Firestore + Storage).
- [ ] **CAN-SPAM** footer (unsubscribe + physical address) on any marketing email.
- [ ] **Accessibility** pass (WCAG 2.1 AA).
- **Stage 2 (with payments/video):** Stripe Checkout (SAQ-A); update Privacy Policy with Stripe +
  video provider as sub-processors; confirm video provider's US data handling + DPA; App Check;
  audit logging on entitlement changes.
