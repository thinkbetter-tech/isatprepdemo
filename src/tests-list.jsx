import React from 'react';
import { Footer, SiteNav } from './sections.jsx';
import { TESTS, DOMAINS, planAllows } from './data/tests.js';
import { onUserChanged, isFirebaseConfigured, getUserDoc } from './firebase.js';

// Practice Test catalog. Free users see the full catalog but every test is
// locked with an upgrade nudge; paid users can start any test.

function TestCard({ test, allowed }) {
  const total = test.modules.reduce((n, m) => n + m.count, 0);
  const minutes = test.modules.reduce((n, m) => n + m.minutes, 0);
  return (
    <div className={'tl-card' + (allowed ? '' : ' locked')}>
      <div className="tl-card-top">
        <span className="tl-kind mono">{test.kind === 'full' ? 'Full R&W' : 'Mini'}</span>
        {!allowed && <span className="tl-lock" aria-label="Locked">🔒</span>}
      </div>
      <h3>{test.title}</h3>
      <p className="tl-blurb">{test.blurb}</p>
      <ul className="tl-facts">
        <li>{test.modules.length} module{test.modules.length > 1 ? 's' : ''}</li>
        <li>{total} questions</li>
        <li>{minutes} min{test.breakMinutes ? ` +${test.breakMinutes} break` : ''}</li>
        {test.adaptive && <li>Adaptive</li>}
      </ul>
      {allowed ? (
        <a href={`test.html?id=${encodeURIComponent(test.id)}`} className="btn btn-primary btn-sm">Start test <span className="btn-arrow">→</span></a>
      ) : (
        <a href="index.html#pricing" className="btn btn-outline btn-sm">Upgrade to unlock</a>
      )}
    </div>
  );
}

function TestsApp() {
  const [plan, setPlan] = React.useState(null); // null = resolving
  const [signedIn, setSignedIn] = React.useState(false);

  React.useEffect(() => {
    if (!isFirebaseConfigured()) { setPlan('free'); return undefined; }
    const unsub = onUserChanged(async (u) => {
      setSignedIn(!!u);
      if (!u) { setPlan('free'); return; }
      const doc = await getUserDoc();
      setPlan((doc && doc.plan) || 'free');
    });
    return () => unsub();
  }, []);

  const full = TESTS.filter((t) => t.kind === 'full');
  const mini = TESTS.filter((t) => t.kind === 'mini');
  const isAllowed = (t) => plan != null && planAllows(plan, t.requiredPlan);

  return (
    <div data-screen-label="Practice Tests">
      <SiteNav current="tests" />
      <main className="tl-page wrap" id="top">
        <header className="tl-head">
          <span className="tl-eyebrow mono">Practice Test</span>
          <h1 className="serif">Full-length, timed, adaptive SAT practice.</h1>
          <p className="tl-lede">
            Simulate the Digital SAT Reading &amp; Writing section — timed modules, mark-for-review,
            and an adaptive second module — plus shorter mini-tests to drill each domain.
          </p>
          {plan === 'free' && (
            <div className="tl-upsell">
              <span>Practice tests are a paid feature.</span>
              <a href="index.html#pricing" className="btn btn-primary btn-sm">See plans</a>
            </div>
          )}
        </header>

        <section className="tl-section">
          <h2 className="serif">Full Reading &amp; Writing tests</h2>
          <div className="tl-grid">
            {full.map((t) => <TestCard key={t.id} test={t} allowed={isAllowed(t)} />)}
          </div>
        </section>

        <section className="tl-section">
          <h2 className="serif">Domain mini-tests</h2>
          <div className="tl-grid">
            {mini.map((t) => <TestCard key={t.id} test={t} allowed={isAllowed(t)} />)}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

Object.assign(window, { TestsApp });
export { TestsApp };
