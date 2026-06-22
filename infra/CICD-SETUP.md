# CI/CD setup — finishing steps (needs GitHub repo admin)

The GCP side of keyless CI/CD is **already provisioned** on `isatprep-prod`:

- Deployer service account: `gh-deployer@isatprep-prod.iam.gserviceaccount.com`
  - Roles: `roles/firebasehosting.admin`, `roles/serviceusage.serviceUsageConsumer`
- Workload Identity Federation pool: `github-pool` (global)
- OIDC provider: `github-provider`, locked to repo `thinkbetter-tech/isatprepdemo`
  via `attribute.repository == 'thinkbetter-tech/isatprepdemo'`
- The deployer SA trusts that repo's Actions principals
  (`roles/iam.workloadIdentityUser`).

The workflow `.github/workflows/deploy.yml` is already parameterized and will
auto-deploy to Firebase Hosting on every push to `main` — it just needs the
values below set in the repo. **This requires admin/write on
`thinkbetter-tech/isatprepdemo`** (the CLI available here only had READ).

## What to set in GitHub

Repo → **Settings → Secrets and variables → Actions**.

### Repository VARIABLES (not secret)
| Name | Value |
|---|---|
| `GCP_PROJECT_ID` | `isatprep-prod` |
| `GCP_WIF_PROVIDER` | `projects/850089153551/locations/global/workloadIdentityPools/github-pool/providers/github-provider` |
| `GCP_DEPLOYER_SA` | `gh-deployer@isatprep-prod.iam.gserviceaccount.com` |

### Repository SECRETS — the Vite build config (Firebase web config; not true secrets but kept as secrets)
The exact values are in the local, git-ignored `.env` file at the repo root. Copy
each value from there into the matching GitHub Actions secret. (They are not pasted
here because GitHub push protection blocks the Firebase API key's `AIza...` pattern,
even though Firebase web config keys are safe to ship in the client bundle.)

| Name | Source (in `.env`) |
|---|---|
| `VITE_FIREBASE_API_KEY` | `VITE_FIREBASE_API_KEY` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `isatprep-prod.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `isatprep-prod` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `isatprep-prod.firebasestorage.app` |
| `VITE_FIREBASE_APP_ID` | `1:850089153551:web:f6fb8b527fc3168b303f7a` |
| `VITE_GA_MEASUREMENT_ID` | `G-RGN236SXVF` |

### Or via gh CLI (run by someone with repo admin)
```bash
R=thinkbetter-tech/isatprepdemo
gh variable set GCP_PROJECT_ID   --repo $R --body "isatprep-prod"
gh variable set GCP_WIF_PROVIDER --repo $R --body "projects/850089153551/locations/global/workloadIdentityPools/github-pool/providers/github-provider"
gh variable set GCP_DEPLOYER_SA  --repo $R --body "gh-deployer@isatprep-prod.iam.gserviceaccount.com"

# Loads values straight from the local .env (run from repo root). This avoids
# pasting the Firebase API key anywhere that gets committed.
set -a; . ./.env; set +a
gh secret set VITE_FIREBASE_API_KEY        --repo $R --body "$VITE_FIREBASE_API_KEY"
gh secret set VITE_FIREBASE_AUTH_DOMAIN    --repo $R --body "$VITE_FIREBASE_AUTH_DOMAIN"
gh secret set VITE_FIREBASE_PROJECT_ID     --repo $R --body "$VITE_FIREBASE_PROJECT_ID"
gh secret set VITE_FIREBASE_STORAGE_BUCKET --repo $R --body "$VITE_FIREBASE_STORAGE_BUCKET"
gh secret set VITE_FIREBASE_APP_ID         --repo $R --body "$VITE_FIREBASE_APP_ID"
gh secret set VITE_GA_MEASUREMENT_ID       --repo $R --body "$VITE_GA_MEASUREMENT_ID"
```

After setting these, push to `main` (or run the workflow manually via
**Actions → Deploy to Firebase Hosting → Run workflow**) to verify the first
keyless deploy.

## Note on the repo
The code currently lives on branch `golive-stage1` in the local clone. The
remote `origin` is `https://github.com/thinkbetter-tech/isatprepdemo`. Pushing
`golive-stage1` and opening a PR into `main` requires write access to that repo.
