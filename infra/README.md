# iSATPrep — Infrastructure

Infra-as-code and config for taking iSATPrep live on **Firebase-native** infra
(Hosting + Auth + Firestore + Storage + Functions gen2). This implements
**Phase 1A** of [`../GO-LIVE-PLAN.md`](../GO-LIVE-PLAN.md) — read that first; it
is the plan of record and holds every locked decision.

> All resources are US-region. Users are US-based; Firestore is `nam5` (US
> multi-region, **permanent**), Functions/Storage are `us-central1` (Stage 2).

## Files in this repo

| File | Purpose |
|---|---|
| `../firebase.json` | Hosting (public dir `dist/`, multipage `.html` routing, cache headers), plus pointers to Firestore rules/indexes and Storage rules. (A `functions` codebase block is intentionally omitted until Stage 2 — see below.) |
| `../.firebaserc` | CLI project aliases: `default`/`prod` = `isatprep-prod`, `staging` = `isatprep-staging`. Switch with `firebase use <alias>`. |
| `../firestore.rules` | Stage 1 security rules. Own-data only; `plan`/`entitlements`/`admin` are server-only; `videos` read-only to signed-in users; default deny. |
| `../firestore.indexes.json` | Empty scaffold — composite indexes get added as queries are written (Stage 2). |
| `../storage.rules` | Locked down: deny all client reads/writes. Admin upload + signed playback come in Stage 2. |
| `bootstrap-isatprep.sh` | Idempotent, non-destructive bash that a human runs to create the project, link billing, enable APIs, add Firebase, create Firestore (`nam5`), apply the Option 1 org-policy override, and create the billing budget. |
| `../.github/workflows/deploy.yml` | CI: on push to `main`, build with Vite and deploy Hosting via keyless **Workload Identity Federation**. |

> The frontend (`package.json`, Vite config, `.env.example`, `src/`) is owned by
> another agent. This infra assumes `npm run build` emits to **`dist/`**, which
> `firebase.json` serves as the Hosting public dir.

## Automated vs manual

**Automated by `bootstrap-isatprep.sh`** (with confirmation prompts):
project create, billing link, API enablement, `addfirebase`, Firestore create
(`nam5`, Native), Option 1 org-policy override, billing budget (50/90/100%).

**Manual in the console** (the script prints these as NEXT STEPS — they cannot
or should not be scripted here):
1. Enable **Google** + **Email/Password** auth providers.
2. Configure the **OAuth consent screen**; add authorized domains
   `isatprep.net` and `isatprep-prod.web.app`.
3. **Add the web app** and copy `firebaseConfig` into the frontend `.env`
   (`VITE_FIREBASE_*` + `VITE_GA_MEASUREMENT_ID`); enable **GA4**.
4. Create the **WIF** pool/provider + deployer service account and fill the
   TODO placeholders in `deploy.yml`.

## Run order (human)

```bash
# 0. Auth once per machine
gcloud auth login ninkesh@padhai247.com
firebase login

# 1. Stand up the project (idempotent; safe to re-run)
chmod +x infra/bootstrap-isatprep.sh
./infra/bootstrap-isatprep.sh

# 2. Do the console NEXT STEPS the script prints (auth providers, OAuth
#    consent + authorized domains, add web app → fill .env, enable GA4).

# 3. From repo root: build the frontend, deploy rules, then hosting
firebase use prod
firebase deploy --only firestore:rules,storage:rules
npm ci && npm run build
firebase deploy --only hosting        # publishes dist/ to isatprep-prod.web.app

# 4. QA on https://isatprep-prod.web.app, THEN add the custom domain
#    isatprep.net in the console and cut DNS over (Phase 1C).

# 5. Wire CI/CD: create WIF + deployer SA, fill deploy.yml TODOs, add VITE_*
#    GitHub secrets. After that, push to main auto-deploys hosting.
```

## Org-policy override (Option 1)

`padhai247.com` enforces `iam.allowedPolicyMemberDomains`, which blocks public
(`allUsers`) endpoints org-wide. Stage 2 public Cloud Functions (Stripe webhook,
signed-URL minter) need public **ingress** — they still verify a Firebase ID
token + App Check internally, so security is not weakened. The script applies a
**project-scoped** override on `isatprep-prod` only; the rest of the org stays
strict. This requires **`roles/orgpolicy.policyAdmin`** — an org owner can
self-grant it (command is in the script's comments) or run that one step.
Reversible: `gcloud org-policies delete iam.allowedPolicyMemberDomains
--project=isatprep-prod` restores the inherited policy.

## Project-ID portability (prod vs staging)

Project IDs are never hardcoded in app code — they live in:
- **`.firebaserc`** — CLI aliases. `firebase use prod` / `firebase use staging`.
- **`.env.production` / `.env.staging`** — Vite-read `VITE_FIREBASE_*` web config
  + `VITE_GA_MEASUREMENT_ID` per project. Git-ignored; values from the Firebase
  console / CI secrets. (Owned by the frontend agent.)

Swapping projects is therefore a config change, not a refactor.

### Deploy to staging vs prod

```bash
# Staging (create the isatprep-staging project the same way first, then):
firebase use staging
firebase deploy --only hosting        # → isatprep-staging.web.app

# Prod
firebase use prod
firebase deploy --only hosting        # → isatprep-prod.web.app / isatprep.net
```

The `deploy.yml` workflow targets **prod** (`vars.GCP_PROJECT_ID`). Add a
separate workflow or a `workflow_dispatch` input + matching staging WIF/SA when
the staging project exists.

## Stage 2 placeholders (not provisioned now)

- A `functions` codebase is **deliberately not declared** in `firebase.json`
  yet — declaring it before the `functions/` dir exists would break
  `firebase deploy`. In Stage 2, add this block to `firebase.json` and create
  the dir (Stripe webhook + signed-URL minter, gen2, `us-central1`):

  ```json
  "functions": [
    { "source": "functions", "codebase": "default", "runtime": "nodejs20",
      "ignore": ["node_modules", ".git", "*.local"] }
  ]
  ```

  Until then, deploys use `--only hosting`; rules are deployed explicitly.
- Stage 2 APIs (Storage, Cloud Functions, Secret Manager, App Check, …) are
  listed but commented out in the bootstrap script.
- `storage.rules` stays fully locked until the Stage 2 upload/playback design
  lands.
