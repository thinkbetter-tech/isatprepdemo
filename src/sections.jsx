import React from 'react';
import { Check, NoCheck, ArrowRight, Plus, PlayIcon, GlyphRead, GlyphFormula, GlyphEliminate, HeroDiagram } from './icons.jsx';
import { onUserChanged, signOutUser, deleteAccount, isFirebaseConfigured, getUserDoc } from './firebase.js';
// iSATPrep — page sections

const TESTIMONIALS = [
  { name: "Anirudh Kidambi", quote: "With Ms. Shipra's help, the reading section of SAT became easier to navigate. I received a score of 760 which seemed nearly impossible for me to achieve before her sessions." },
  { name: "Ved Patel", quote: "I want to thank Ms. Shipra for helping me improve my SAT English score in just one month. The shortcut and strategies she taught me were extremely helpful and made it much easier to work through the questions quickly and confidently. Her strategies also helped me with vocabulary and understanding long reading passages. I really appreciate all her help." },
  { name: "Teena Dubey", quote: "Shipra is an exceptional SAT teacher whose strategies really worked for my daughter, and she got selected in her dream college because of that." },
  { name: "Jay Goyal", quote: "I'm incredibly grateful to my mom for the strategies, discipline, and confidence she instilled in me throughout my SAT journey. Her methods made even the toughest concepts feel manageable, and her constant encouragement pushed me to do my best. Thanks to her guidance, I achieved a stellar 1530 score. I truly couldn't have done it without her support and expertise." },
  { name: "Diya Sharma", quote: "The Words in Context lessons alone were worth every penny. I stopped second-guessing myself." },
  { name: "Aarav Mehta", quote: "Cleanest, clearest SAT prep I've taken. Every lesson builds on the last." },
];

// `available: true` = module has a working free-sample practice page wired up.
// Currently only Topic 01. Other modules ship with the same 4-free-question promise
// once their practice pages land — until then they route to signup on click.
const TOPICS = [
  { n: 1, name: "Craft and Structure", desc: "Vocabulary, structure, and how passages connect", available: true, href: "practice.html" },
  { n: 2, name: "Information and Ideas", desc: "Main ideas, evidence, and inference" },
  { n: 3, name: "Expression of Ideas", desc: "Rhetorical synthesis and transitions" },
  { n: 4, name: "Standard English Conventions", desc: "Punctuation, grammar, and boundaries" },
];

const FAQS = [
  { q: "What does \"choose any 2 modules\" mean on the Method plan?", a: "After you purchase Method, you'll select any 2 of the 4 modules to fully unlock — 100 practice questions per selected module. Pick the ones that match where you need the most work." },
  { q: "What if my score doesn't improve?", a: "Most students see meaningful gains within 2–4 weeks of consistent practice. If you're not improving, it only means more practice." },
  { q: "How long does each lesson take?", a: "Each module is self-paced, so you can move through it at your own speed. As you practice and become familiar with the method, you’ll gain confidence and complete the modules more quickly." },
  { q: "Why should I choose iSATPrep over others?", a: "iSATPrep isn’t a warehouse of AI-generated questions with generic explanations. Every question is carefully designed and reviewed by Shipra, a seasoned SAT tutor with over a decade of experience and a strong track record of results. This ensures that what you practice is thoughtful, effective, and truly aligned with how students improve." },
];

function TierBadge({ available }) {
  if (available) return <span className="badge badge-free">● Try 4 free</span>;
  return <span className="badge">100 questions · 4 free</span>;
}

// Keyboard/screen-reader skip link: first focusable element on the page, jumps
// past the nav straight to main content (WCAG 2.4.1). Visually hidden until
// focused (see .skip-link in styles.css).
function SkipLink() {
  return <a href="#top" className="skip-link">Skip to main content</a>;
}

// Canonical signed-in account control: "Name ▾" dropdown → Sign out + Delete
// account (with confirm dialog). Used in EVERY nav across the site so the
// account UX is identical everywhere. Renders nothing when signed out /
// unconfigured (NavCta decides what to show in that case).
function AccountControl() {
  const [user, setUser] = React.useState(null);
  const [plan, setPlan] = React.useState('free');
  const [open, setOpen] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState(null);

  React.useEffect(() => {
    if (!isFirebaseConfigured()) return undefined;
    const unsub = onUserChanged(async (u) => {
      setUser(u);
      if (u) {
        try { const doc = await getUserDoc(); setPlan((doc && doc.plan) || 'free'); }
        catch { setPlan('free'); }
      } else {
        setPlan('free');
      }
    });
    return () => unsub();
  }, []);

  // Close the dropdown on outside click / Escape.
  React.useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (!e.target.closest('.acct')) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('click', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('click', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);

  if (!user) return null;

  const PLAN_LABEL = { free: 'Free', core: 'Method', complete: 'Mastery' };
  const planName = PLAN_LABEL[plan] || 'Free';
  const isPaid = plan === 'core' || plan === 'complete';

  const onSignOut = async () => {
    try { await signOutUser(); } catch { /* ignore */ }
    window.location.href = 'index.html';
  };

  const onDelete = async () => {
    setBusy(true); setErr(null);
    try {
      await deleteAccount();
      window.location.href = 'index.html';
    } catch (e) {
      setBusy(false);
      if (e && e.code === 'auth/requires-recent-login') {
        setErr('For your security, please log in again, then retry deletion.');
      } else if (e && e.code === 'auth/popup-closed-by-user') {
        setErr('Re-authentication was cancelled. Account not deleted.');
      } else {
        setErr('Could not delete the account. Please try again or contact hello@isatprep.net.');
      }
    }
  };

  return (
    <div className="acct">
      <button
        type="button"
        className="btn btn-ghost btn-sm acct-toggle"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="acct-name">{user.displayName || user.email || 'Account'}</span>
        {isPaid && <span className="plan-badge" title={`${planName} plan`}>{planName}</span>}
        <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="acct-menu" role="menu" aria-label="Account">
          <div className="acct-menu-head">
            <div className="acct-menu-email">{user.email}</div>
            <div className={'acct-menu-plan' + (isPaid ? ' paid' : '')}>
              {isPaid ? `★ ${planName} — full access` : 'Free plan'}
              {!isPaid && <a href="index.html#pricing" className="acct-menu-upgrade">Upgrade</a>}
            </div>
          </div>
          <a href="account.html" role="menuitem" className="acct-item">
            Account &amp; settings
          </a>
          <button type="button" role="menuitem" className="acct-item" onClick={onSignOut}>
            Sign out
          </button>
          <button type="button" role="menuitem" className="acct-item acct-item-danger" onClick={() => { setOpen(false); setConfirming(true); }}>
            Delete account
          </button>
        </div>
      )}

      {confirming && (
        <div className="acct-backdrop" role="dialog" aria-modal="true" aria-labelledby="del-title" onClick={() => !busy && setConfirming(false)}>
          <div className="acct-dialog" onClick={(e) => e.stopPropagation()}>
            <h2 id="del-title" className="serif">Delete your account?</h2>
            <p>
              This permanently deletes your account and all associated data
              (profile and saved progress). This cannot be undone.
            </p>
            {err && <p className="acct-err" role="alert">{err}</p>}
            <div className="acct-dialog-actions">
              <button type="button" className="btn btn-outline" disabled={busy} onClick={() => setConfirming(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-danger" disabled={busy} onClick={onDelete}>
                {busy ? 'Deleting…' : 'Delete permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Shared auth + plan state hook. ONE subscription point used by the whole nav so
// every page reflects the same signed-in / paid state consistently.
//   status: 'loading' | 'out' | 'in'
//   paid:   boolean (plan core/complete). Only meaningful when status==='in'.
// -----------------------------------------------------------------------------
function useAuthPlan() {
  const [state, setState] = React.useState(
    isFirebaseConfigured() ? { status: 'loading', paid: false } : { status: 'out', paid: false }
  );
  React.useEffect(() => {
    if (!isFirebaseConfigured()) return undefined;
    const unsub = onUserChanged(async (u) => {
      if (!u) { setState({ status: 'out', paid: false }); return; }
      let paid = false;
      try {
        const doc = await getUserDoc();
        const plan = (doc && doc.plan) || 'free';
        paid = plan === 'core' || plan === 'complete';
      } catch { /* default unpaid */ }
      setState({ status: 'in', paid });
    });
    return () => unsub();
  }, []);
  return state;
}

// Right-hand nav CTA. Signed in → account dropdown; signed out → Log in / Start
// free. `loading` renders a placeholder to avoid a Login→Account flash.
function NavCta({ auth }) {
  if (auth.status === 'loading') return <div className="nav-cta" aria-hidden="true" />;
  if (auth.status === 'in') {
    return (
      <div className="nav-cta">
        <AccountControl />
      </div>
    );
  }
  return (
    <div className="nav-cta">
      <a href="login.html" className="btn btn-ghost btn-sm">Log in</a>
      <a href="signup.html" className="btn btn-primary btn-sm">Start free <ArrowRight size={14} /></a>
    </div>
  );
}

// THE canonical site nav, used on every page. Auth- and plan-aware.
//   props: { onIndex?: boolean, current?: 'topics'|'tests'|'account' }
// - `onIndex` makes section links use bare #anchors (smooth scroll on the home
//   page); off-index they use absolute index.html#anchor links.
// - "Pricing" / upgrade affordances are HIDDEN for paid users (nothing to buy).
// - Topics is the home for practicing questions (per-topic), so there is NO
//   separate "Practice" tab. The two learning destinations are Topics and Mock
//   Tests — shown consistently regardless of auth state (gating happens on the
//   page itself), which removes the earlier appears/disappears ambiguity.
function SiteNav({ onIndex = false, current } = {}) {
  const auth = useAuthPlan();
  const home = (anchor) => (onIndex ? `#${anchor}` : `index.html#${anchor}`);
  const brandHref = onIndex ? '#top' : 'index.html';
  const isPaid = auth.status === 'in' && auth.paid;

  return (
    <nav className="nav">
      <SkipLink />
      <div className="wrap nav-inner">
        <a href={brandHref} className="brand">
          <span className="brand-mark">i</span>
          <span>iSATPrep</span>
        </a>
        <div className="nav-links">
          <a href={home('method')}>Method</a>
          <a href="topics.html" aria-current={current === 'topics' ? 'page' : undefined}>Topics</a>
          <a href="tests.html" aria-current={current === 'tests' ? 'page' : undefined}>Mock Tests</a>
          <a href={home('instructor')}>About</a>
          {/* Pricing only matters to people who can still buy: signed-out or unpaid. */}
          {!isPaid && <a href={home('pricing')}>Pricing</a>}
          <a href={home('faq')}>FAQ</a>
        </div>
        <NavCta auth={auth} />
      </div>
    </nav>
  );
}

// Back-compat: the index page calls <Nav/>. It's the home page, so onIndex=true.
function Nav({ onOpenDemo }) {
  return <SiteNav onIndex={true} />;
}

function Hero({ onOpenDemo, variant }) {
  return (
    <section className={"hero" + (variant === "quiet" ? " hero-variant-quiet" : "")} id="top">
      <div className="wrap hero-grid">
        <div>
          <h1 className="mt-2">
            You don't do English the English way — you do it the <em>math</em> way.
          </h1>
          <p className="hero-sub">
            A structured, formula-driven framework for the SAT Reading & Writing
            section. No more guessing. No more second-guessing. Just results.
          </p>
          <div className="hero-ctas">
            <a href="#pricing" className="btn btn-primary btn-lg">Start free <span className="btn-arrow">→</span></a>
            <button className="btn btn-outline btn-lg" onClick={onOpenDemo}>
              <PlayIcon size={14} /> Watch demo
            </button>
          </div>
        </div>
        <HeroDiagram />
      </div>
    </section>
  );
}

function Problem() {
  return (
    <section className="bg-bone">
      <div className="wrap split-2">
        <div>
          <h2>Math feels solvable. Verbal feels like a guessing game.</h2>
        </div>
        <p className="lead">
          Students from every background grasp math with relative ease, but consistently struggle with the verbal section.
          It's not a lack of intelligence — it's the nature of the passages: dense texts, closely written ideas, and answer choices designed to feel almost identical.
          Even the sharpest minds get tripped up.
        </p>
      </div>
    </section>
  );
}

function Method() {
  return (
    <section id="method">
      <div className="wrap">
        <div className="section-head">
          <h2>Do each question in 3 steps!!!</h2>
        </div>
        <div className="method-flow">
          <div className="method-step">
            <div className="num">STEP 01</div>
            <div className="glyph"><GlyphRead /></div>
            <h3>Read with intent</h3>
            <p>Anchor on the passage's structure — claim, evidence, qualifier — instead of vibes.</p>
          </div>
          <div className="method-step">
            <div className="num">STEP 02</div>
            <div className="glyph"><GlyphFormula /></div>
            <h3>Apply the formula</h3>
            <p>Each question type has a repeatable rule. Plug in inputs; get a predicted answer.</p>
          </div>
          <div className="method-step">
            <div className="num">STEP 03</div>
            <div className="glyph"><GlyphEliminate /></div>
            <h3>Eliminate cleanly</h3>
            <p>Score each choice against the prediction. The right answer falls out — fast.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Demo({ onOpenDemo }) {
  return (
    <section className="bg-bone">
      <div className="wrap" style={{maxWidth:"960px"}}>
        <div className="section-head center">
          <h2>Watch the method solve a real passage.</h2>
        </div>
        <div className="demo-card" onClick={onOpenDemo} role="button" tabIndex={0} onKeyDown={(e)=>e.key==="Enter"&&onOpenDemo()}>
          <svg className="deco" viewBox="0 0 800 450" preserveAspectRatio="none">
            <defs>
              <pattern id="dotgrid" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1" fill="#fff"/>
              </pattern>
            </defs>
            <rect width="800" height="450" fill="url(#dotgrid)"/>
            <path d="M50 350 Q 200 250 400 320 T 750 280" stroke="#F59E0B" strokeWidth="2" fill="none" opacity="0.4"/>
            <circle cx="160" cy="120" r="80" fill="none" stroke="#fff" strokeWidth="1" opacity="0.4"/>
            <rect x="540" y="60" width="180" height="120" fill="none" stroke="#fff" strokeWidth="1" opacity="0.4"/>
          </svg>
          <div className="play"><PlayIcon size={36} /></div>
        </div>
        <div className="demo-caption">
          <span className="mono">— 2 min walkthrough</span>
          <span>See the method in action</span>
        </div>
      </div>
    </section>
  );
}

function Instructor() {
  return (
    <section id="instructor">
      <div className="wrap instructor-grid">
        <div>
          <div className="portrait">
            <img src="instructor.jpg" alt="Shipra Batra, founder and lead instructor at iSATPrep"
              style={{position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", objectPosition:"center 22%", display:"block"}}/>
          </div>
          <div className="instructor-meta">
            <div className="name">Shipra Batra</div>
            <div className="role">Founder & Lead Instructor, iSATPrep</div>
          </div>
        </div>
        <div>
          <h2 style={{marginBottom:32}}>Decades of teaching, distilled into one method.</h2>
          <div className="bio">
            <p>Over my decades of teaching and tutoring, one pattern has been impossible to ignore: students from every background grasp math with relative ease, but consistently struggle with the verbal section.</p>
            <p>It's not a lack of intelligence. It's the nature of the passages: dense texts, closely written ideas, and answer choices designed to feel almost identical. Even the sharpest minds can get tripped up.</p>
            <p>That's why I created a clean, structured method that turns the verbal section into something you can apply, not guess, and most importantly, have fun doing it… (isn't it fun when you apply the formula and get results in seconds!) It gives students a clear framework they can use across any passage, regardless of genre, and a reliable way to evaluate answer choices without spiraling into confusion or second-guessing.</p>

            <div className="pullquote">"You don't do English the English way — you do it the math way."</div>

            <p>This approach has been a game changer. I've seen students improve their scores by over 100 points using this method alone.</p>
            <p>Good luck, and congratulations. You're about to begin a journey that will completely change the way you see reading and testing.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Topics() {
  // Slim CTA — full curriculum lives on topics.html.
  return (
    <section className="bg-bone" id="topics">
      <div className="wrap">
        <div className="topics-cta">
          <div className="topics-cta__copy">
            <h2 className="topics-cta__h">4 skills. One method. <em>Built for each one.</em></h2>
            <p className="body-text topics-cta__p">
              Every Digital SAT Reading &amp; Writing question type, mapped to a repeatable framework.
              Four free questions in every module — sample the method, then unlock the rest.
            </p>
            <div className="topics-cta__btns">
              <a href="topics.html" className="btn btn-primary btn-lg">
                Browse all 4 topics <span className="btn-arrow">→</span>
              </a>
              <a href="practice.html" className="btn btn-ghost btn-lg">
                Try 4 free questions
              </a>
            </div>
          </div>
          <div className="method-card" aria-hidden="true">
            <h3 className="method-card__title">Four modules. <em>One</em> method, applied.</h3>
            <div className="method-card__diagram">
              <div className="mdg-row mdg-row--1">Craft and Structure</div>
              <div className="mdg-row mdg-row--2">Information and Ideas</div>
              <div className="mdg-row mdg-row--3">Expression of Ideas</div>
              <div className="mdg-row mdg-row--4">Standard English Conventions</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Backwards-compat alias used by the topics.html page export list.
const TopicsCTA = Topics;

function Testimonials() {
  return (
    <section>
      <div className="wrap">
        <div className="section-head">
          <h2>Students who stopped guessing — and started scoring.</h2>
        </div>
        <div className="tcard-grid">
          {TESTIMONIALS.map((t, i) => (
            <div className="tcard" key={i}>
              <div className="top">
                <span className="who">{t.name}</span>
              </div>
              <p className="quote">{t.quote}</p>
              <div className="stars" aria-label="5 stars">★★★★★</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PriceCard({ tier, name, price, per, tagline, features, cta, popular, planId, showPreview }) {
  return (
    <div className={"pcard" + (popular ? " pop" : "")}>
      {popular && <div className="ribbon">★ Most popular</div>}
      <div className="tier">{tier}</div>
      <div className="name">{name}</div>
      <div className="price">
        <span className="amt">${price}</span>
        <span className="per">{per}</span>
      </div>
      <div className="desc">{tagline}</div>
      <ul>
        {features.map((f,i) => (
          <li key={i} className={f.no ? "no" : ""}>
            {f.no ? <NoCheck/> : <Check color={popular ? "#C97A05" : "#0F1E3D"} />}
            <span>{f.text}</span>
          </li>
        ))}
      </ul>
      <a href={"signup.html?plan=" + (planId || "free")} className={"btn btn-block " + (popular ? "btn-primary" : "btn-outline")}>{cta}</a>
      {showPreview && (
        <a href={"preview-dashboard.html?plan=" + planId} className="pcard__preview-link">
          See what you get →
        </a>
      )}
    </div>
  );
}

function Pricing() {
  return (
    <section className="bg-bone" id="pricing">
      <div className="wrap">
        <div className="section-head center">
          <h2>Choose your level of access.</h2>
          <p className="body-text">One-time payment. <em>Lifetime</em> access.</p>
        </div>
        <div className="price-grid">
          <PriceCard
            tier="Tier 01"
            name="Free"
            price="0"
            per="lifetime"
            tagline={<>A <em>preview</em> of the method.</>}
            cta="Start free"
            planId="free"
            features={[
              { text: "4 sample questions in each module" },
              { text: "Preview of the optimised learning approach for your selected module" },
              { text: "One-month access" },
            ]}
          />
          <PriceCard
            tier="Tier 02"
            name="Method"
            price="59"
            per="one-time"
            tagline={<>Pick <em>any </em> two modules to master.</>}
            cta="Get Method"
            popular
            planId="core"
            showPreview
            features={[

              { text: "Choose any 2 modules of your choice" },
              { text: "100 practice questions per selected module" },
              { text: "Optimised learning approach per selected module" },
              { text: "Lifetime access" },
            ]}
          />
          <PriceCard
            tier="Tier 03"
            name="Mastery"
            price="79"
            per="one-time"
            tagline={<>The <em>full</em> method, every module.</>}
            cta="Get Mastery"
            planId="complete"
            showPreview
            features={[
              { text: "Access to all 4 modules" },
              { text: "Entire question bank and learning approaches unlocked" },
              { text: "2 Mock Tests unlocked"},
              { text: "Lifetime access" },
            ]}
          />
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const [open, setOpen] = React.useState(0);
  return (
    <section id="faq">
      <div className="wrap">
        <div className="section-head center">
          <h2>Common questions.</h2>
        </div>
        <div className="faq">
          {FAQS.map((f, i) => (
            <div key={i} className={"faq-item" + (open===i ? " open" : "")}>
              <button className="faq-q" onClick={() => setOpen(open===i ? -1 : i)} aria-expanded={open===i}>
                <span>{f.q}</span>
                <span className="plus"><Plus /></span>
              </button>
              <div className="faq-a">{f.a}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="bg-amber final-cta">
      <div className="wrap">
        <h2>Ready to do English the math way?</h2>
        <p>Start free. Upgrade when you're ready.</p>
        <a href="#pricing" className="btn btn-lg" style={{background:"#152647", color:"#fff", borderColor:"#152647"}}>
          Start free <span className="btn-arrow">→</span>
        </a>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer>
      <div className="wrap">
        <div className="foot-grid">
          <div>
            <div className="brand" style={{marginBottom:14}}>
              <span className="brand-mark">i</span>
              <span>iSATPrep</span>
            </div>
            <p style={{fontSize:14, maxWidth:"36ch", color:"rgba(232,236,244,0.55)"}}>
              English, but rigorous like math. A structured framework for the Digital SAT Reading & Writing section.
            </p>
          </div>
          <div>
            <h4>Explore</h4>
            <a href="#top">Home</a>
            <a href="#instructor">About</a>
            <a href="#method">Method</a>
            <a href="#pricing">Pricing</a>
          </div>
          <div>
            <h4>Account</h4>
            <a href="login.html">Log in</a>
            <a href="signup.html">Sign up</a>
            <a href="#faq">FAQ</a>
          </div>
          <div>
            <h4>Contact</h4>
            <a href="mailto:hello@isatprep.net">hello@isatprep.net</a>
            <a href="https://www.linkedin.com/in/shipra-batra-40aa99275/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
            <a href="privacy.html">Privacy</a>
            <a href="terms.html">Terms</a>
          </div>
        </div>
        <div className="foot-bottom">
          <div>© 2026 iSATPrep. All rights reserved.</div>
          <div className="mono" style={{fontSize:12}}>v.1.0 · made for sharp minds</div>
        </div>
      </div>
    </footer>
  );
}

function VideoModal({ open, onClose, url }) {
  // Hooks must run unconditionally (Rules of Hooks) — guard inside the effect,
  // not via an early return placed before the hook.
  React.useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e)=>e.stopPropagation()} role="dialog" aria-modal="true" aria-label="iSATPrep demo video">
        <button className="modal-close" onClick={onClose} aria-label="Close demo video (press Escape)">ESC · close ✕</button>
        <iframe
          src={url}
          width="100%" height="100%" frameBorder="0" allow="autoplay; encrypted-media"
          allowFullScreen
          title="iSATPrep demo"
          style={{display:"block"}}
        />
      </div>
    </div>
  );
}

Object.assign(window, { Nav, NavCta, SiteNav, useAuthPlan, AccountControl, Hero, Problem, Method, Demo, Instructor, Topics, TopicsCTA, Testimonials, Pricing, FAQ, FinalCTA, Footer, VideoModal, TierBadge });

export { Nav, NavCta, SiteNav, useAuthPlan, AccountControl, Hero, Problem, Method, Demo, Instructor, Topics, TopicsCTA, Testimonials, Pricing, FAQ, FinalCTA, Footer, VideoModal, TierBadge };
