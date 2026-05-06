// Login & signup forms

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

function LoginForm() {
  const [email, setEmail] = React.useState("");
  const [pw, setPw] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [err, setErr] = React.useState(null);

  const submit = (e) => {
    e.preventDefault();
    setErr(null);
    if (!email || !pw) { setErr("Please enter email and password."); return; }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      // Demo: just navigate to practice
      window.location.href = "practice.html";
    }, 700);
  };

  return (
    <div className="auth-form-side" data-screen-label="Login">
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
          <button type="button" className="btn-google" onClick={() => alert("Google sign-in (demo)")}>
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
              <a href="#" className="forgot">Forgot?</a>
            </div>
            <input id="pw" type="password" value={pw} onChange={(e)=>setPw(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
          </div>

          {err && <div className="error" style={{fontSize:13, color:"#B91C1C"}}>{err}</div>}

          <label className="checkbox">
            <input type="checkbox" defaultChecked />
            <span>Keep me signed in on this device</span>
          </label>

          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={submitting}>
            {submitting ? "Signing in…" : <>Log in <span className="btn-arrow">→</span></>}
          </button>
        </form>
      </div>

      <div className="auth-bottom">
        <a href="#">Privacy</a>
        <a href="#">Terms</a>
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
  const [plan, setPlan] = React.useState("free");
  const [submitting, setSubmitting] = React.useState(false);
  const [err, setErr] = React.useState(null);

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
    if (p && ["free","core","complete"].includes(p)) setPlan(p);
  }, []);

  const submit = (e) => {
    e.preventDefault();
    setErr(null);
    if (!name || !email || !pw) { setErr("Please fill out all fields."); return; }
    if (pw.length < 8) { setErr("Password must be at least 8 characters."); return; }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      window.location.href = "practice.html";
    }, 800);
  };

  const PLAN_DETAILS = {
    free:     { name: "Free",     price: "$0",  note: "lifetime access" },
    core:     { name: "Core",     price: "$59", note: "one-time · lifetime access" },
    complete: { name: "Complete", price: "$79", note: "one-time · lifetime access" },
  };
  const planInfo = PLAN_DETAILS[plan] || PLAN_DETAILS.free;

  return (
    <div className="auth-form-side" data-screen-label="Signup">
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
          <button type="button" className="btn-google" onClick={() => alert("Google sign-up (demo)")}>
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
            <span>I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.</span>
          </label>

          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={submitting}>
            {submitting ? "Creating account…" : <>Create account <span className="btn-arrow">→</span></>}
          </button>
        </form>
      </div>

      <div className="auth-bottom">
        <a href="#">Privacy</a>
        <a href="#">Terms</a>
        <a href="mailto:hello@isatprep.net">hello@isatprep.net</a>
        <span style={{marginLeft:"auto"}}>© 2026 iSATPrep</span>
      </div>
    </div>
  );
}

Object.assign(window, { AuthSide, LoginForm, SignupForm });
