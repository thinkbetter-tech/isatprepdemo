# Data Deletion & Accessibility — what's built (Stage 1)

Reference doc for the data-deletion path and accessibility work shipped in Stage 1.
Use this to revisit, extend, or audit later. Live at https://isatprep-prod.web.app.

---

## 1. Data deletion (US privacy compliance: CCPA/state laws, minors)

**Why:** US users, 13+ audience. Users (and parents) must be able to delete their
account and personal data on request. Implemented as a self-service in-app path.

### What it does
A signed-in user can permanently delete their account from the **practice page nav**
→ account menu → **Delete account** → confirm dialog → **Delete permanently**.

Deletion order (matters for Firestore security rules):
1. Delete `progress/{uid}/lessons/*` subcollection docs (best-effort; may be empty).
2. Delete the `users/{uid}` profile doc.
3. Delete the Firebase **Auth** user.

If Firebase returns `auth/requires-recent-login` (stale credential), the code
transparently re-authenticates:
- **Google users:** re-auth via Google popup, then retry deletion automatically.
- **Email/password users:** surfaced to the UI as "please log in again, then retry"
  (we don't have their password to silently re-auth).

On success the user is redirected to `index.html`. The action is irreversible.

### Where the code lives
| Piece | File | Notes |
|---|---|---|
| `deleteAccount()` | `src/firebase.js` | Core logic; guarded, throws `NO_CURRENT_USER` if not signed in. |
| SDK fns added to `_sdk` | `src/firebase.js` | `deleteUser`, `reauthenticateWithPopup`, `deleteDoc`, `collection`, `getDocs`. |
| `AccountControl` component | `src/practice.jsx` | Account menu (Sign out + Delete account) + confirm dialog. Renders only when signed in AND Firebase configured. |
| Styles | `styles.css` | `.acct*`, `.acct-dialog*`, `.btn-danger`. |

### Known limitations / future work
- **Client-side deletion only.** It deletes what the signed-in client can reach under
  Firestore rules (`users/{uid}`, `progress/{uid}/**`). When Stage 2 adds server-owned
  data (Stripe customer/subscription records, uploaded media, entitlements written by
  Cloud Functions), deletion must be extended **server-side** — a Cloud Function (or the
  Firebase "Delete User Data" extension) that also purges those. Add this when Stage 2
  data exists.
- **No "export my data" path yet.** Some state laws grant a right to access/portability.
  Not built. Add if/when required (a function that returns the user's docs as JSON).
- **No audit log** of deletions. Consider logging deletion events (without PII) in Stage 2.
- **Email/password re-auth** is not automated (by design — no stored password). The user
  must log in again and retry. Acceptable, but a smoother re-auth modal could be added.
- **Grace period / soft delete:** none — deletion is immediate and hard. Fine for now;
  revisit if support wants a recovery window.

### How to test (after a real login)
1. Sign in at `/login.html` (or `/signup.html`).
2. Go to `/practice.html` → account menu (top-right) → **Delete account** → confirm.
3. Verify in Firebase console: the Auth user is gone and `users/{uid}` no longer exists.

---

## 2. Accessibility (WCAG 2.1 AA — first pass)

**Why:** US education sites are frequent accessibility-litigation targets. This was a
baseline pass, not a full audit.

### What was added/fixed
| Item | WCAG | File | Notes |
|---|---|---|---|
| Skip-to-content link | 2.4.1 Bypass Blocks | `src/sections.jsx` (`SkipLink` in `Nav`), `styles.css` (`.skip-link`) | First focusable element; visually hidden until focused; jumps to `#top`. On all pages using the shared `Nav`. |
| Global keyboard focus outline | 2.4.7 Focus Visible | `styles.css` (`:focus-visible`) | There were **zero** focus styles before. Amber 3px outline. |
| Video modal dialog semantics | 4.1.2 Name/Role/Value | `src/sections.jsx` (`VideoModal`) | Added `role="dialog"`, `aria-modal="true"`, `aria-label`, labelled close button. |
| Rules-of-Hooks bug fix | n/a (correctness) | `src/sections.jsx` (`VideoModal`) | `useEffect` was after an early `return null` — would crash on toggle. Moved guard inside the effect. |

### Already in good shape (pre-existing)
- `lang="en"` on all HTML pages.
- All `<img>` have `alt` text.
- Audio play/pause buttons have text labels alongside icons.
- Decorative bars/icons use `aria-hidden`; star ratings have `aria-label`.
- Demo card is keyboard-activatable (`role="button"`, `tabIndex`, Enter handler).

### Known gaps / future work (NOT yet done)
- **No full audit.** Recommend running axe DevTools / Lighthouse a11y on every page and
  a screen-reader pass (VoiceOver/NVDA) before heavy public traffic.
- **Color contrast** not formally verified against 4.5:1 (esp. muted greys on bone bg,
  amber on white). Check with a contrast tool.
- **Focus trapping** in modals (VideoModal, the delete-account dialog) is not implemented
  — focus can leave the dialog with Tab. Add a focus trap for full AA.
- **Reduced motion:** no `prefers-reduced-motion` handling for the smooth-scroll / transitions.
- **Form error association:** auth form inline errors are shown but not programmatically
  tied to inputs via `aria-describedby`. Add for better SR support.
- **Heading order / landmarks:** not audited for strict hierarchy or `<main>`/`<nav>` landmarks
  on every page.

### How to re-audit
```
npx lighthouse https://isatprep-prod.web.app --only-categories=accessibility --view
```
or run axe DevTools in the browser on each page (index, login, signup, topics, practice).

---

## Status
Both shipped and **deployed** to https://isatprep-prod.web.app (Stage 1).
Committed locally as `3964c45` ("Add data-deletion path + accessibility pass").
Revisit the "future work" lists above when Stage 2 adds server-owned data and before
scaling public traffic.
