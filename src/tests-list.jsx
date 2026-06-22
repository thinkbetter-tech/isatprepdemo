import React from 'react';
import { Footer, SiteNav, cachedPlan, setCachedPlan } from './sections.jsx';
import { TESTS, DOMAINS, planAllows } from './data/tests.js';
import { onUserChanged, isFirebaseConfigured, getUserDoc, listAttempts } from './firebase.js';

// Practice Test catalog. Free users see the full catalog but every test is
// locked with an upgrade nudge; paid users can start any test. Each card also
// surfaces the user's PAST attempts of that test (entry point to its analysis).

// `allowed` may be null while the plan is still resolving — render a neutral
// placeholder CTA then (no lock, no start) to avoid the locked→unlocked flicker.
// `attempts` = this user's past attempts of THIS test (newest first), or [].
function TestCard({ test, allowed, attempts }) {
  const total = test.modules.reduce((n, m) => n + m.count, 0);
  const minutes = test.modules.reduce((n, m) => n + m.minutes, 0);
  const resolving = allowed === null;
  const locked = allowed === false;
  const taken = attempts && attempts.length > 0;
  const n = taken ? attempts.length : 0;
  return (
    <div className={'tl-card' + (locked ? ' locked' : '')}>
      <div className="tl-card-top">
        <span className="tl-kind mono">{test.kind === 'full' ? 'Full R&W' : 'Mini'}</span>
        {taken
          ? <span className="tl-status">{n} attempt{n > 1 ? 's' : ''}</span>
          : (locked && <span className="tl-lock" aria-label="Locked">🔒</span>)}
      </div>
      <h3>{test.title}</h3>
      <p className="tl-blurb">{test.blurb}</p>
      <ul className="tl-facts">
        <li>{test.modules.length} module{test.modules.length > 1 ? 's' : ''}</li>
        <li>{total} questions</li>
        <li>{minutes} min{test.breakMinutes ? ` +${test.breakMinutes} break` : ''}</li>
        {test.adaptive && <li>Adaptive</li>}
      </ul>
      {resolving ? (
        <a className="btn btn-outline btn-sm" aria-hidden="true" style={{ visibility: 'hidden' }}>…</a>
      ) : !allowed ? (
        <a href="index.html#pricing" className="btn btn-outline btn-sm">Upgrade to unlock</a>
      ) : taken ? (
        // Two side-by-side CTAs once the test has been attempted. "View result"
        // opens the LATEST attempt; the analysis page has a dropdown to switch
        // between attempts.
        <div className="tl-cta-row">
          <a href={`test.html?id=${encodeURIComponent(test.id)}`} className="btn btn-outline btn-sm">Retake test</a>
          <a href={`test.html?attempt=${encodeURIComponent(attempts[0].id)}`} className="btn btn-primary btn-sm">View result</a>
        </div>
      ) : (
        <a href={`test.html?id=${encodeURIComponent(test.id)}`} className="btn btn-primary btn-sm">
          Start test <span className="btn-arrow">→</span>
        </a>
      )}
    </div>
  );
}

function TestsApp() {
  // Seed from the cached plan so returning paid users see "Start test" with no
  // flicker. null only when configured AND no cache (genuinely unknown yet).
  const [plan, setPlan] = React.useState(() => {
    if (!isFirebaseConfigured()) return 'free';
    return cachedPlan(); // 'core'/'complete'/'free' or null
  });

  // Past attempts grouped by testId (newest first). {} = none/loading.
  const [attemptsByTest, setAttemptsByTest] = React.useState({});

  React.useEffect(() => {
    if (!isFirebaseConfigured()) return undefined;
    const unsub = onUserChanged(async (u) => {
      if (!u) { setPlan('free'); setCachedPlan(null); setAttemptsByTest({}); return; }
      const doc = await getUserDoc();
      const p = (doc && doc.plan) || 'free';
      setPlan(p); setCachedPlan(p);
      // Load this user's attempt history and group by test (best-effort).
      try {
        const all = await listAttempts(100);
        const grouped = {};
        for (const at of all) {
          if (!at.testId) continue;
          (grouped[at.testId] = grouped[at.testId] || []).push(at);
        }
        // listAttempts already returns newest-first; preserve that per group.
        setAttemptsByTest(grouped);
      } catch { /* leave empty */ }
    });
    return () => unsub();
  }, []);

  const full = TESTS.filter((t) => t.kind === 'full');
  const mini = TESTS.filter((t) => t.kind === 'mini');
  // null plan → null allowed (resolving placeholder); otherwise real gate.
  const isAllowed = (t) => (plan == null ? null : planAllows(plan, t.requiredPlan));

  return (
    <div data-screen-label="Mock Tests">
      <SiteNav current="tests" />
      <main className="tl-page wrap" id="top">
        <header className="tl-head">
          <span className="tl-eyebrow mono">Mock Tests</span>
          <h1 className="serif">Full-length, timed, adaptive SAT practice.</h1>
          <p className="tl-lede">
            Simulate the Digital SAT Reading &amp; Writing section — timed modules, mark-for-review,
            and an adaptive second module — plus shorter mini-tests to drill each domain.
          </p>
          {plan === 'free' && (
            <div className="tl-upsell">
              <span>Mock tests are a paid feature.</span>
              <a href="index.html#pricing" className="btn btn-primary btn-sm">See plans</a>
            </div>
          )}
        </header>

        <section className="tl-section">
          <h2 className="serif">Full Reading &amp; Writing tests</h2>
          <div className="tl-grid">
            {full.map((t) => <TestCard key={t.id} test={t} allowed={isAllowed(t)} attempts={attemptsByTest[t.id]} />)}
          </div>
        </section>

        <section className="tl-section">
          <h2 className="serif">Domain mini-tests</h2>
          <div className="tl-grid">
            {mini.map((t) => <TestCard key={t.id} test={t} allowed={isAllowed(t)} attempts={attemptsByTest[t.id]} />)}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

Object.assign(window, { TestsApp });
export { TestsApp };
