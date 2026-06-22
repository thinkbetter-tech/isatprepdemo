#!/usr/bin/env bash
#
# bootstrap-isatprep.sh — stand up the isatprep-prod GCP/Firebase project.
#
# PLAN OF RECORD: ../GO-LIVE-PLAN.md  (Phase 1A). All values below are LOCKED.
#
# This script is IDEMPOTENT and NON-DESTRUCTIVE: every create step guards on
# "already exists" and the script NEVER deletes anything. Safe to re-run.
#
# >>> A HUMAN runs this. It is not run by any agent or CI. <<<
#
# Prerequisites:
#   - gcloud CLI installed + logged in as ninkesh@padhai247.com
#       gcloud auth login
#   - firebase-tools installed (npm i -g firebase-tools) + logged in
#       firebase login
#   - You have Org Policy Admin (roles/orgpolicy.policyAdmin) on the
#     padhai247.com org, OR can get an org owner to run the org-policy step.
#       (Org owners can self-grant: see the ORG POLICY step below.)
#
# Usage:
#   chmod +x infra/bootstrap-isatprep.sh
#   ./infra/bootstrap-isatprep.sh
#
set -euo pipefail

# ----------------------------------------------------------------------------
# LOCKED configuration (see GO-LIVE-PLAN.md "Locked decisions")
# ----------------------------------------------------------------------------
ACCOUNT="ninkesh@padhai247.com"
PROJECT_ID="isatprep-prod"
PROJECT_NAME="iSATPrep"
BILLING_ACCOUNT="014CD4-D91E29-9756AB"

# Region/location. Firestore location is PERMANENT once set.
FIRESTORE_LOCATION="nam5"          # US multi-region — DO NOT CHANGE after init
REGION="us-central1"               # Functions/Storage region (Stage 2)

# Billing budget: alerts at 50/90/100% emailed to the account below.
# Amount is a guardrail signal, not a hard cap (GCP has no hard cost cap).
BUDGET_DISPLAY_NAME="isatprep-prod-monthly"
BUDGET_CURRENCY="INR"
BUDGET_AMOUNT_UNITS="10000"        # ₹10,000/mo — same posture as investment_agent
ALERT_EMAIL="ninkesh@padhai247.com"

# ----------------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------------
step()  { echo; echo "==> $*"; }
info()  { echo "    $*"; }
warn()  { echo "  ⚠️  $*"; }

confirm() {
  # confirm "Question?"  -> aborts unless the user types exactly: yes
  local prompt="$1"
  echo
  read -r -p "$prompt  Type 'yes' to continue: " reply
  if [[ "$reply" != "yes" ]]; then
    echo "Aborted by user."
    exit 1
  fi
}

require() {
  command -v "$1" >/dev/null 2>&1 || { echo "ERROR: '$1' not found on PATH."; exit 1; }
}

# ----------------------------------------------------------------------------
# 0. Preflight
# ----------------------------------------------------------------------------
step "Preflight: checking required CLIs"
require gcloud
require firebase
info "gcloud: $(gcloud --version | head -n1)"
info "firebase: $(firebase --version)"

step "Setting active gcloud account to ${ACCOUNT}"
warn "If this is a fresh machine, run:  gcloud auth login ${ACCOUNT}"
warn "and:  firebase login   (browser-based; uses the same Google identity)"
if gcloud auth list --filter="account=${ACCOUNT}" --format="value(account)" | grep -q "${ACCOUNT}"; then
  gcloud config set account "${ACCOUNT}"
  info "Active account set to ${ACCOUNT}."
else
  warn "${ACCOUNT} is not in 'gcloud auth list'. Run 'gcloud auth login ${ACCOUNT}' first."
  confirm "Continue anyway (e.g. you'll auth in another way)?"
fi

# ----------------------------------------------------------------------------
# 1. Create project (idempotent)
# ----------------------------------------------------------------------------
step "Creating project ${PROJECT_ID} (\"${PROJECT_NAME}\")"
if gcloud projects describe "${PROJECT_ID}" >/dev/null 2>&1; then
  info "Project ${PROJECT_ID} already exists — skipping create."
else
  confirm "Create NEW GCP project '${PROJECT_ID}'?"
  gcloud projects create "${PROJECT_ID}" --name="${PROJECT_NAME}"
  info "Created ${PROJECT_ID}."
fi

# Pin the project for all subsequent gcloud calls in this shell.
gcloud config set project "${PROJECT_ID}"

# ----------------------------------------------------------------------------
# 2. Link billing (idempotent)
# ----------------------------------------------------------------------------
step "Linking billing account ${BILLING_ACCOUNT}"
CURRENT_BILLING="$(gcloud billing projects describe "${PROJECT_ID}" \
  --format='value(billingAccountName)' 2>/dev/null || true)"
if [[ "${CURRENT_BILLING}" == *"${BILLING_ACCOUNT}"* ]]; then
  info "Billing already linked to ${BILLING_ACCOUNT} — skipping."
else
  gcloud billing projects link "${PROJECT_ID}" --billing-account="${BILLING_ACCOUNT}"
  info "Linked billing."
fi

# ----------------------------------------------------------------------------
# 3. Enable APIs (idempotent — enabling an already-enabled API is a no-op)
# ----------------------------------------------------------------------------
step "Enabling required APIs (Stage 1)"
STAGE1_APIS=(
  "firebase.googleapis.com"
  "firebasehosting.googleapis.com"
  "identitytoolkit.googleapis.com"     # Firebase Auth
  "firestore.googleapis.com"
  "cloudresourcemanager.googleapis.com"
  "logging.googleapis.com"
  "monitoring.googleapis.com"
  "serviceusage.googleapis.com"
  "cloudbilling.googleapis.com"
  "billingbudgets.googleapis.com"      # needed for the budget step below
  "orgpolicy.googleapis.com"           # needed for the org-policy override below
)
gcloud services enable "${STAGE1_APIS[@]}" --project="${PROJECT_ID}"
info "Stage 1 APIs enabled."

# STAGE 2 APIs (NOT enabled now — uncomment when you start Stage 2):
#   storage.googleapis.com           # Cloud Storage for Firebase (video source)
#   cloudfunctions.googleapis.com    # Cloud Functions gen2 (Stripe webhook, signed URLs)
#   run.googleapis.com               # gen2 functions run on Cloud Run under the hood
#   cloudbuild.googleapis.com        # function deploy builds
#   secretmanager.googleapis.com     # Stripe key, video signing key
#   firebaseappcheck.googleapis.com  # App Check (reCAPTCHA Enterprise)
#   eventarc.googleapis.com          # gen2 triggers
info "Stage 2 APIs (storage/cloudfunctions/secretmanager/appcheck/...) intentionally NOT enabled yet."

# ----------------------------------------------------------------------------
# 4. Add Firebase to the project (idempotent)
# ----------------------------------------------------------------------------
step "Adding Firebase to ${PROJECT_ID}"
if firebase projects:list 2>/dev/null | grep -q "${PROJECT_ID}"; then
  info "Firebase already enabled on ${PROJECT_ID} — skipping addfirebase."
else
  confirm "Add Firebase to ${PROJECT_ID}?"
  firebase projects:addfirebase "${PROJECT_ID}"
  info "Firebase added."
fi
info "NOTE: Enable Google Analytics for the project in the Firebase console"
info "      (or during 'Add web app') to get the GA4 measurement ID for .env."

# ----------------------------------------------------------------------------
# 5. Create Firestore database — Native mode, US multi-region (PERMANENT)
# ----------------------------------------------------------------------------
step "Creating Firestore database (Native mode, location=${FIRESTORE_LOCATION})"
if gcloud firestore databases describe --database="(default)" \
     --project="${PROJECT_ID}" >/dev/null 2>&1; then
  info "Firestore '(default)' database already exists — skipping create."
else
  warn "============================================================"
  warn " FIRESTORE LOCATION IS PERMANENT AND CANNOT BE CHANGED LATER."
  warn " Creating in: ${FIRESTORE_LOCATION}  (US multi-region)."
  warn " A wrong choice = delete + recreate the whole project."
  warn "============================================================"
  confirm "Create Firestore in '${FIRESTORE_LOCATION}' (PERMANENT)?"
  gcloud firestore databases create \
    --location="${FIRESTORE_LOCATION}" \
    --type="firestore-native" \
    --project="${PROJECT_ID}"
  info "Firestore created in ${FIRESTORE_LOCATION} (Native mode)."
fi
info "Deploy security rules later from repo root with:"
info "    firebase deploy --only firestore:rules"

# ----------------------------------------------------------------------------
# 6. Org-policy override — Option 1 (project-scoped allowedPolicyMemberDomains)
# ----------------------------------------------------------------------------
# padhai247.com enforces iam.allowedPolicyMemberDomains org-wide, which blocks
# public (allUsers / allAuthenticatedUsers) bindings. Stage 2 public Cloud
# Functions (Stripe webhook + signed-URL minter) need public *ingress* — they
# still verify a Firebase ID token + App Check internally (see PLAN §4).
#
# This sets a PROJECT-SCOPED override on isatprep-prod ONLY. The rest of the org
# (including investment_agent) stays strict. Reversible by re-applying the
# inherited policy.
#
# Requires: roles/orgpolicy.policyAdmin on the project (or org). An org owner
# can self-grant Org Policy Administrator in the console / via gcloud, e.g.:
#   gcloud organizations add-iam-policy-binding <ORG_ID> \
#     --member="user:${ACCOUNT}" --role="roles/orgpolicy.policyAdmin"
#
# Harmless to apply now even though functions arrive in Stage 2.
step "Applying Option 1 org-policy override (project-scoped allow allUsers)"
warn "This needs roles/orgpolicy.policyAdmin and affects ONLY ${PROJECT_ID}."
confirm "Apply the project-scoped allowedPolicyMemberDomains override now?"

# Newer org-policy API: write a policy file allowing all members on this project.
ORG_POLICY_FILE="$(mktemp -t isatprep-orgpolicy.XXXXXX.yaml)"
cat > "${ORG_POLICY_FILE}" <<EOF
name: projects/${PROJECT_ID}/policies/iam.allowedPolicyMemberDomains
spec:
  rules:
    - allowAll: true
EOF
info "Wrote temp policy: ${ORG_POLICY_FILE}"
gcloud org-policies set-policy "${ORG_POLICY_FILE}" --project="${PROJECT_ID}"
rm -f "${ORG_POLICY_FILE}"
info "Org-policy override applied to ${PROJECT_ID}."
#
# Legacy-CLI equivalent (if your gcloud lacks 'org-policies set-policy'):
#   gcloud resource-manager org-policies allow iam.allowedPolicyMemberDomains \
#     --project=${PROJECT_ID} allUsers allAuthenticatedUsers
#
# To REVERT (restore inherited org restriction):
#   gcloud org-policies delete iam.allowedPolicyMemberDomains --project=${PROJECT_ID}

# ----------------------------------------------------------------------------
# 7. Billing budget + 50/90/100% email alerts
# ----------------------------------------------------------------------------
step "Creating billing budget '${BUDGET_DISPLAY_NAME}' with 50/90/100% alerts"
# Default IAM recipients (billing admins) get the alert emails. To also email a
# specific address, attach a Cloud Monitoring email notification channel (see
# console fallback below) — that mirrors investment_agent/budget.tf.
EXISTING_BUDGET="$(gcloud billing budgets list \
  --billing-account="${BILLING_ACCOUNT}" \
  --filter="displayName=${BUDGET_DISPLAY_NAME}" \
  --format="value(name)" 2>/dev/null || true)"
if [[ -n "${EXISTING_BUDGET}" ]]; then
  info "Budget '${BUDGET_DISPLAY_NAME}' already exists — skipping."
else
  confirm "Create billing budget '${BUDGET_DISPLAY_NAME}' (${BUDGET_CURRENCY} ${BUDGET_AMOUNT_UNITS})?"
  gcloud billing budgets create \
    --billing-account="${BILLING_ACCOUNT}" \
    --display-name="${BUDGET_DISPLAY_NAME}" \
    --filter-projects="projects/${PROJECT_ID}" \
    --budget-amount="${BUDGET_AMOUNT_UNITS}${BUDGET_CURRENCY}" \
    --threshold-rule=percent=0.5 \
    --threshold-rule=percent=0.9 \
    --threshold-rule=percent=1.0
  info "Budget created. Default IAM recipients (billing admins, incl. ${ALERT_EMAIL}"
  info "if they are a Billing Account Administrator) receive the alerts."
fi
#
# CONSOLE FALLBACK / to email ${ALERT_EMAIL} specifically regardless of IAM role:
#   1. Console → Billing → Budgets & alerts → CREATE BUDGET.
#   2. Scope to project ${PROJECT_ID}; amount ${BUDGET_CURRENCY} ${BUDGET_AMOUNT_UNITS}.
#   3. Thresholds 50/90/100% of actual spend.
#   4. Under "Manage notifications", add a Cloud Monitoring email channel for
#      ${ALERT_EMAIL} (Monitoring → Alerting → Notification channels → Email).
#      This is exactly the channel investment_agent/budget.tf provisions.

# ----------------------------------------------------------------------------
# 8. NEXT STEPS (manual — console only; cannot/should not be scripted here)
# ----------------------------------------------------------------------------
step "DONE with automated bootstrap. MANUAL NEXT STEPS (Firebase console):"
cat <<'NEXT'

  1) AUTH PROVIDERS (Firebase console → Build → Authentication → Sign-in method)
       - Enable "Google"
       - Enable "Email/Password"

  2) OAUTH CONSENT + AUTHORIZED DOMAINS
       - Configure the OAuth consent screen (GCP console → APIs & Services →
         OAuth consent screen). External user type; add support + dev contact.
       - Firebase Auth → Settings → Authorized domains: ensure BOTH are present:
             isatprep.net
             isatprep-prod.web.app
         (and isatprep-prod.firebaseapp.com, added by default)

  3) ADD THE WEB APP → get firebaseConfig for .env
       - Firebase console → Project settings → Your apps → Add app → Web.
       - Copy the config into the frontend .env files (the OTHER agent owns
         .env / .env.example). Map to:
             VITE_FIREBASE_API_KEY
             VITE_FIREBASE_AUTH_DOMAIN      = isatprep-prod.firebaseapp.com
             VITE_FIREBASE_PROJECT_ID       = isatprep-prod
             VITE_FIREBASE_STORAGE_BUCKET   = isatprep-prod.appspot.com
             VITE_FIREBASE_APP_ID
             VITE_GA_MEASUREMENT_ID         = G-XXXXXXX  (enable GA4 if not yet)

  4) DEPLOY RULES + FIRST HOSTING DEPLOY (from repo root, after `npm run build`)
       firebase use prod
       firebase deploy --only firestore:rules,storage:rules
       firebase deploy --only hosting

  5) CI/CD (Workload Identity Federation) — see .github/workflows/deploy.yml.
       Create a deployer service account + WIF pool/provider, fill the TODO
       placeholders in the workflow, and add VITE_* GitHub secrets.

  6) (Later) Repeat this script for isatprep-staging by changing PROJECT_ID,
       or create the staging project the same way and `firebase use staging`.

NEXT

step "Bootstrap script complete."
