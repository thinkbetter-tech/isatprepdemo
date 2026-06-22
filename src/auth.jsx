import React from 'react';
import {
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  sendReset,
  ensureUserDoc,
  userDocExists,
  trackEvent,
  NOT_CONFIGURED,
} from './firebase.js';
// Login & signup forms

// Post-auth destination (unchanged from the previous behavior).
const POST_AUTH_DEST = 'practice.html';

// Maps Firebase auth error codes (and our NOT_CONFIGURED sentinel) to friendly
// inline messages shown in the existing `.error` UI.
function friendlyAuthError(e) {
  const code = e && e.code;
  switch (code) {
    case NOT_CONFIGURED:
      return "Authentication isn't configured yet. Please try again later.";
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'That email or password is incorrect.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try logging in.';
    case 'auth/weak-password':
      return 'Password is too weak — use at least 8 characters.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'The Google sign-in window was closed before finishing.';
    case 'auth/popup-blocked':
      return 'Your browser blocked the Google sign-in popup. Please allow popups and retry.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    default:
      return (e && e.message) || 'Something went wrong. Please try again.';
  }
}

// Computes whole-years age from a YYYY-MM-DD date string. Returns null if unparseable.
function ageFromDob(dob) {
  if (!dob) return null;
  const d = new Date(dob + 'T00:00:00');
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18">
    <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.49h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.63z"/>
    <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26a5.4 5.4 0 0 1-3.04.85 5.36 5.36 0 0 1-5-3.7H.96v2.32A9 9 0 0 0 9 18z"/>
    <path fill="#FBBC05" d="M4 10.71a5.4 5.4 0 0 1 0-3.42V4.96H.96a9 9 0 0 0 0 8.08L4 10.7z"/>
    <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.34l2.58-2.58A9 9 0 0 0 9 0C5.48 0 2.44 2 .96 4.96L4 7.29A5.36 5.36 0 0 1 9 3.58z"/>
  </svg>
);

function AuthBrand() {
  return (
    <a href="index.html" className="brand">
      <span className="brand-mark">i</span>
      <span>iSATPrep</span>
    </a>
  );
}

function AuthSide({ mode }) {
  return (
    <aside className="auth-side">
      <div className="auth-side-top">
        <AuthBrand />
        <a href="index.html" className="home-link">← Back to home</a>
      </div>

      <div className="auth-editorial">
        <span className="auth-chapter">{mode === "signup" ? "Begin" : "Welcome back"}</span>
        <p className="auth-quote">
          {mode === "signup"
            ? <>You don't do English the English way — you do it the <em>math</em> way.</>
            : <>The method is <em>waiting</em>.</>
          }
        </p>
        <span className="auth-attribution">
          {mode === "signup"
            ? "— Shipra Batra, founder & lead instructor"
            : "Pick up where you left off."
          }
        </span>
      </div>

      <div className="auth-side-foot" aria-hidden="true" />
    </aside>
  );
}

// Lightweight 13+ confirmation modal used for Google sign-in/sign-up. Google
// never tells us a user's age, so on a FIRST Google sign-in (when no user doc
// exists yet) we require an explicit 13+ confirmation before creating the doc.
// Styled with the site's existing classes only (no new CSS).
function AgeGateModal({ onConfirm, onCancel }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Confirm your age"
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(21,38,71,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        className="auth-form"
        style={{
          background: '#fff', borderRadius: 12, padding: 28,
          maxWidth: 420, width: '100%',
          boxShadow: '0 20px 60px rgba(21,38,71,0.25)',
        }}
      >
        <h2 className="serif" style={{ fontSize: 26, fontWeight: 400, margin: 0 }}>One quick thing.</h2>
        <p className="lede" style={{ margin: 0 }}>
          iSATPrep is for students aged 13 and older. Please confirm to continue.
        </p>
        <button type="button" className="btn btn-primary btn-lg btn-block" onClick={onConfirm}>
          I confirm I am 13 or older <span className="btn-arrow">→</span>
        </button>
        <button type="button" className="btn-google" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function LoginForm() {
  const [email, setEmail] = React.useState("");
  const [pw, setPw] = React.useState("");
  const [keep, setKeep] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [err, setErr] = React.useState(null);
  const [notice, setNotice] = React.useState(null); // e.g. reset-email confirmation
  const [showAgeGate, setShowAgeGate] = React.useState(false);
  // Holds the just-authenticated Google user awaiting age confirmation.
  const [pendingGoogleUser, setPendingGoogleUser] = React.useState(null);

  // Email/password login.
  const submit = async (e) => {
    e.preventDefault();
    setErr(null); setNotice(null);
    if (!email || !pw) { setErr("Please enter email and password."); return; }
    setSubmitting(true);
    try {
      await signInWithEmail({ email, password: pw, keepSignedIn: keep });
      trackEvent('login', { method: 'password' });
      window.location.href = POST_AUTH_DEST;
    } catch (e2) {
      setSubmitting(false);
      setErr(friendlyAuthError(e2));
    }
  };

  // Google sign-in. Existing users go straight through; first-time Google users
  // must pass the 13+ age gate before we create their profile doc.
  const onGoogle = async () => {
    setErr(null); setNotice(null);
    setSubmitting(true);
    try {
      const user = await signInWithGoogle({ keepSignedIn: keep });
      const exists = await userDocExists(user.uid);
      if (!exists) {
        // First Google sign-in → require 13+ confirmation before completing.
        setPendingGoogleUser(user);
        setSubmitting(false);
        setShowAgeGate(true);
        return;
      }
      trackEvent('login', { method: 'google' });
      window.location.href = POST_AUTH_DEST;
    } catch (e2) {
      setSubmitting(false);
      setErr(friendlyAuthError(e2));
    }
  };

  const confirmGoogleAge = async () => {
    setShowAgeGate(false);
    try {
      await ensureUserDoc(pendingGoogleUser, {}); // ageConfirmed:true, plan:'free'
      trackEvent('sign_up', { method: 'google' });
      window.location.href = POST_AUTH_DEST;
    } catch (e2) {
      setErr(friendlyAuthError(e2));
    }
  };

  const cancelGoogleAge = async () => {
    setShowAgeGate(false);
    // User declined 13+ — sign them back out so no account is left dangling.
    try { const { signOutUser } = await import('./firebase.js'); await signOutUser(); } catch { /* ignore */ }
    setErr("You must be 13 or older to use iSATPrep.");
  };

  const onForgot = async (e) => {
    e.preventDefault();
    setErr(null); setNotice(null);
    if (!email) { setErr("Enter your email above, then tap Forgot."); return; }
    try {
      await sendReset(email);
      setNotice("Password reset email sent — check your inbox.");
    } catch (e2) {
      setErr(friendlyAuthError(e2));
    }
  };

  return (
    <div className="auth-form-side" data-screen-label="Login">
      {showAgeGate && <AgeGateModal onConfirm={confirmGoogleAge} onCancel={cancelGoogleAge} />}
      <div className="auth-top">
        <div className="auth-top-left" style={{display:"none"}}><AuthBrand /></div>
        <div></div>
        <div className="switch">
          New here? <a href="signup.html">Create an account</a>
        </div>
      </div>

      <div className="auth-form-wrap">
        <h1 className="serif">Log in.</h1>
        <p className="lede">Welcome back. Let's get back to the method.</p>

        <form className="auth-form" onSubmit={submit} noValidate>
          <button type="button" className="btn-google" onClick={onGoogle} disabled={submitting}>
            <GoogleIcon /> Continue with Google
          </button>

          <div className="divider">or with email</div>

          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
          </div>

          <div className="field">
            <div className="field-row">
              <label htmlFor="pw">Password</label>
              <a href="#" className="forgot" onClick={onForgot}>Forgot?</a>
            </div>
            <input id="pw" type="password" value={pw} onChange={(e)=>setPw(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
          </div>

          {err && <div className="error" style={{fontSize:13, color:"#B91C1C"}}>{err}</div>}
          {notice && <div className="hint" style={{fontSize:13, color:"#047857"}}>{notice}</div>}

          <label className="checkbox">
            <input type="checkbox" checked={keep} onChange={(e)=>setKeep(e.target.checked)} />
            <span>Keep me signed in on this device</span>
          </label>

          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={submitting}>
            {submitting ? "Signing in…" : <>Log in <span className="btn-arrow">→</span></>}
          </button>
        </form>
      </div>

      <div className="auth-bottom">
        <a href="privacy.html">Privacy</a>
        <a href="terms.html">Terms</a>
        <a href="mailto:hello@isatprep.net">hello@isatprep.net</a>
        <span style={{marginLeft:"auto"}}>© 2026 iSATPrep</span>
      </div>
    </div>
  );
}

function SignupForm() {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [pw, setPw] = React.useState("");
  const [dob, setDob] = React.useState("");
  const [plan, setPlan] = React.useState("free");
  const [submitting, setSubmitting] = React.useState(false);
  const [err, setErr] = React.useState(null);
  const [showAgeGate, setShowAgeGate] = React.useState(false);
  const [pendingGoogleUser, setPendingGoogleUser] = React.useState(null);

  const strength = (() => {
    if (!pw) return 0;
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
    if (/\d/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
  })();

  // Initial plan from query string ?plan=core|complete|free
  React.useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("plan");
    if (p && ["free","core","complete"].includes(p)) {
      setPlan(p);
      // Funnel signal: user arrived at signup intending a specific plan. Paid
      // plans map to GA's begin_checkout-style intent. No-op until consent.
      if (p !== "free") trackEvent('select_plan', { plan: p });
    }
  }, []);

  // Email/password signup, with the 13+ age gate enforced via date of birth.
  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    if (!name || !email || !pw) { setErr("Please fill out all fields."); return; }
    if (!dob) { setErr("Please enter your date of birth."); return; }
    if (pw.length < 8) { setErr("Password must be at least 8 characters."); return; }
    const age = ageFromDob(dob);
    if (age === null) { setErr("Please enter a valid date of birth."); return; }
    if (age < 13) { setErr("You must be at least 13 years old to create an account."); return; }

    setSubmitting(true);
    try {
      const user = await signUpWithEmail({ name, email, password: pw, keepSignedIn: true });
      // We store only the age-confirmation boolean (not the full DOB) for privacy.
      await ensureUserDoc(user, { name, selectedPlan: plan });
      trackEvent('sign_up', { method: 'password' });
      window.location.href = POST_AUTH_DEST;
    } catch (e2) {
      setSubmitting(false);
      setErr(friendlyAuthError(e2));
    }
  };

  // Google signup. On first Google sign-in (no profile doc yet) require 13+
  // confirmation before creating the profile.
  const onGoogle = async () => {
    setErr(null);
    setSubmitting(true);
    try {
      const user = await signInWithGoogle({ keepSignedIn: true });
      const exists = await userDocExists(user.uid);
      if (!exists) {
        setPendingGoogleUser(user);
        setSubmitting(false);
        setShowAgeGate(true);
        return;
      }
      // Returning user signing up again → just proceed.
      trackEvent('login', { method: 'google' });
      window.location.href = POST_AUTH_DEST;
    } catch (e2) {
      setSubmitting(false);
      setErr(friendlyAuthError(e2));
    }
  };

  const confirmGoogleAge = async () => {
    setShowAgeGate(false);
    try {
      await ensureUserDoc(pendingGoogleUser, { selectedPlan: plan });
      trackEvent('sign_up', { method: 'google' });
      window.location.href = POST_AUTH_DEST;
    } catch (e2) {
      setErr(friendlyAuthError(e2));
    }
  };

  const cancelGoogleAge = async () => {
    setShowAgeGate(false);
    try { const { signOutUser } = await import('./firebase.js'); await signOutUser(); } catch { /* ignore */ }
    setErr("You must be 13 or older to use iSATPrep.");
  };

  const PLAN_DETAILS = {
    free:     { name: "Free",     price: "$0",  note: "lifetime access" },
    core:     { name: "Core",     price: "$59", note: "one-time · lifetime access" },
    complete: { name: "Complete", price: "$79", note: "one-time · lifetime access" },
  };
  const planInfo = PLAN_DETAILS[plan] || PLAN_DETAILS.free;

  return (
    <div className="auth-form-side" data-screen-label="Signup">
      {showAgeGate && <AgeGateModal onConfirm={confirmGoogleAge} onCancel={cancelGoogleAge} />}
      <div className="auth-top">
        <div></div>
        <div className="switch">
          Already a member? <a href="login.html">Log in</a>
        </div>
      </div>

      <div className="auth-form-wrap">
        <h1 className="serif">Create your account.</h1>
        <p className="lede">Free to start. No credit card for the free plan.</p>

        <form className="auth-form" onSubmit={submit} noValidate>
          <button type="button" className="btn-google" onClick={onGoogle} disabled={submitting}>
            <GoogleIcon /> Sign up with Google
          </button>

          <div className="divider">or with email</div>

          <div className="field">
            <label htmlFor="name">Full name</label>
            <input id="name" type="text" value={name} onChange={(e)=>setName(e.target.value)} placeholder="Jane Doe" autoComplete="name" />
          </div>

          <div className="field">
            <label htmlFor="email2">Email</label>
            <input id="email2" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
          </div>

          <div className="field">
            <label htmlFor="dob">Date of birth</label>
            <input id="dob" type="date" value={dob} onChange={(e)=>setDob(e.target.value)} autoComplete="bday" max="9999-12-31" />
            <div className="hint">You must be 13 or older to use iSATPrep.</div>
          </div>

          <div className="field">
            <label htmlFor="pw2">Password</label>
            <input id="pw2" type="password" value={pw} onChange={(e)=>setPw(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" />
            <div className={"password-strength s" + strength}>
              <span/><span/><span/><span/>
            </div>
            <div className="hint">8+ characters, mix of letters, numbers, and a symbol for best strength.</div>
          </div>

          <div className="field">
            <label>Selected plan</label>
            <div className="plan-summary">
              <div>
                <div className="psum-name">{planInfo.name}</div>
                <div className="psum-note">{planInfo.note}</div>
              </div>
              <div className="psum-price">{planInfo.price}</div>
              <a href="index.html#pricing" className="psum-change">Change</a>
            </div>
          </div>

          {err && <div className="error" style={{fontSize:13, color:"#B91C1C"}}>{err}</div>}

          <label className="checkbox">
            <input type="checkbox" defaultChecked />
            <span>I agree to the <a href="terms.html">Terms of Service</a> and <a href="privacy.html">Privacy Policy</a>.</span>
          </label>

          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={submitting}>
            {submitting ? "Creating account…" : <>Create account <span className="btn-arrow">→</span></>}
          </button>
        </form>
      </div>

      <div className="auth-bottom">
        <a href="privacy.html">Privacy</a>
        <a href="terms.html">Terms</a>
        <a href="mailto:hello@isatprep.net">hello@isatprep.net</a>
        <span style={{marginLeft:"auto"}}>© 2026 iSATPrep</span>
      </div>
    </div>
  );
}

Object.assign(window, { AuthSide, LoginForm, SignupForm });

export { AuthSide, LoginForm, SignupForm };
