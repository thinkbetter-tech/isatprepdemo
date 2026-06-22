# Cross-persona UX audit (3 personas)

Auditing every auth/plan-sensitive surface for:
- **A. Logged-out** (no account)
- **B. Logged-in, unpaid** (plan = free)
- **C. Logged-in, paid** (plan = core/complete)

## Findings (before fix)

| # | Surface | Logged-out (A) | Unpaid (B) | Paid (C) | Issue |
|---|---|---|---|---|---|
| 1 | `login.html` / `signup.html` | form (correct) | **shows form again** | **shows form again** | ❌ No guard: a signed-in user landing here just re-sees login. THE reported bug. |
| 2 | Hero "Start free" → `#pricing` | ok | ok-ish | ❌ paid user pushed to pricing | CTA not auth/plan-aware |
| 3 | FinalCTA "Start free" → `#pricing` | ok | ok-ish | ❌ same | same |
| 4 | Pricing cards ("Start free"/"Get Method") → `signup.html?plan=` | ok | sends to signup (should checkout, Stage 2) | ❌ paid sent to signup | not auth-aware |
| 5 | `#pricing` section on home | ok | ok | ❌ shown to paid user (nothing to buy) | section always renders |
| 6 | Nav | ok | ok | ok (fixed earlier) | ✅ already plan-aware |
| 7 | Topics / practice gating | sample only | sample only | full bank | ✅ correct |
| 8 | Mock tests gating | locked | locked | unlocked | ✅ correct (flicker fixed) |

## Fix strategy
1. **Guard auth pages** (`entry-login`, `entry-signup`): if already signed in, redirect to `practice.html`. Fixes #1 and neutralizes the bad end of #2/#3/#4 (even if a paid user clicks "Start free", they won't be asked to log in again — they get bounced to the app).
2. **Make marketing CTAs auth/plan-aware** (Hero, FinalCTA): 
   - logged-out → "Start free" → signup
   - logged-in → "Go to practice" → practice.html (no pricing detour)
3. **Hide the `#pricing` section + Pricing-related CTAs for paid users** on the home page.
4. Pricing-card checkout (real payment) is Stage 2; until then signed-in users are routed into the app rather than signup.

## Desired end state per persona
- **A (logged-out):** sees Start free → signup; pricing visible; can browse, sample, get nudged to buy.
- **B (unpaid):** sees their account + "Go to practice"; pricing/upgrade visible; sampling works; nudged to upgrade.
- **C (paid):** NO pricing, NO "Start free", NO upgrade anywhere; CTAs send them into the product (practice/tests); account shows plan badge.
