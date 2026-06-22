import React from 'react';
import { ArrowRight } from './icons.jsx';
import { TierBadge, Pricing, FinalCTA, Footer, SiteNav } from './sections.jsx';
// Dedicated Topics page — the full 4-skill curriculum.
// Craft and Structure is position 01 (the only currently free + practiceable topic).

// `available: true` = module has a wired-up free-sample practice page.
// All modules ship with the same 4-free-question promise per the pricing — once
// each practice page lands, set `available: true` and add an `href`.
// All four topics are now practiceable (free sample for everyone, full bank for
// paid). Each routes to practice.html?topic=<domain-slug>.
const TOPICS_FULL = [
  {
    n: 1,
    name: "Craft and Structure",
    desc: "Vocabulary in context, text structure, and connections across passages.",
    long: "How passages are built and how meaning moves through them. Read for the move, not just the meaning — and the answer falls out.",
    href: "practice.html?topic=craft-and-structure",
    available: true,
  },
  { n: 2, name: "Information and Ideas",        desc: "Main ideas, details, inferences, and command of evidence.", long: "Find the thesis, hold the details, and pick the right proof — every time.", href: "practice.html?topic=information-and-ideas", available: true },
  { n: 3, name: "Expression of Ideas",          desc: "Rhetorical synthesis and transitions.",                     long: "Connect ideas with rhetorical control — the highest-leverage Writing moves, solved methodically.", href: "practice.html?topic=expression-of-ideas", available: true },
  { n: 4, name: "Standard English Conventions", desc: "Punctuation, grammar, and sentence boundaries.",            long: "Comma, semicolon, colon, dash. Rules — not vibes.", href: "practice.html?topic=standard-english-conventions", available: true },
];

function TopicsHero() {
  return (
    <section style={{padding:"4.5rem 0 2.5rem"}}>
      <div className="wrap">
        <a href="index.html" style={{fontFamily:"var(--mono)", fontSize:12, color:"var(--ink-soft)", letterSpacing:"0.06em", textTransform:"uppercase"}}>← Home</a>
        <div style={{marginTop:18}}>
          <h1 style={{fontSize:"clamp(40px, 5vw, 64px)", marginTop:14, lineHeight:1.04, maxWidth:"18ch"}}>
            The 4 skills that define SAT Reading &amp; Writing.
          </h1>
          <p className="body-text" style={{marginTop:18, maxWidth:"60ch"}}>
            One method, four applications. Four free questions in every module — sample the method below,
            then unlock the modules you want.
          </p>
        </div>
      </div>
    </section>
  );
}

function TopicCard({ t }) {
  // All topics are practiceable now; same-tab navigation to the practice page.
  const href = t.href || "practice.html";
  return (
    <a
      href={href}
      className={"topic-card" + (t.available ? " topic-card--free" : "")}
    >
      <div className="topic-card__head">
        <span className="topic-card__num">{String(t.n).padStart(2,"0")}</span>
        <TierBadge available={t.available} />
      </div>
      <h3 className="topic-card__name">{t.name}</h3>
      <p className="topic-card__desc">{t.desc}</p>
      <p className="topic-card__long">{t.long}</p>
      <div className="topic-card__foot">
        <span className="topic-card__cta">
          {t.available ? "Practice 4 free questions" : "Unlock this topic"}
          <ArrowRight size={16} />
        </span>
      </div>
    </a>
  );
}

function TopicsGrid() {
  // First topic gets a featured row; remaining 7 in a denser grid.
  const [first, ...rest] = TOPICS_FULL;
  return (
    <section style={{padding:"1rem 0 5rem"}}>
      <div className="wrap">
        {/* Featured: the free + practiceable topic */}
        <a
          href={first.href}
          className="topic-feature"
        >
          <div className="topic-feature__left">
            <div className="topic-feature__head">
              <span className="topic-feature__num">{String(first.n).padStart(2,"0")}</span>
              <TierBadge available={first.available} />
              <span className="topic-feature__tag">Start here</span>
            </div>
            <h2 className="topic-feature__name">{first.name}</h2>
            <p className="topic-feature__desc">{first.long}</p>
            <div className="topic-feature__cta">
              <span className="btn btn-primary">
                Practice 4 free questions <span className="btn-arrow">→</span>
              </span>
              <span className="topic-feature__meta">Free sample + full bank on upgrade</span>
            </div>
          </div>
          <div className="topic-feature__right" aria-hidden="true">
            <div className="topic-feature__diagram">
              <span className="diag-row diag-row--1">claim</span>
              <span className="diag-row diag-row--2">evidence</span>
              <span className="diag-row diag-row--3">qualifier</span>
              <span className="diag-row diag-row--4">transition</span>
            </div>
          </div>
        </a>

        <div className="topic-grid">
          {rest.map(t => <TopicCard key={t.n} t={t} />)}
        </div>
      </div>
    </section>
  );
}

function TopicsApp() {
  // Cross-page #anchor scroll: re-trigger after React mounts, since the target
  // section doesn't exist when the browser does its native scroll-to-hash.
  React.useEffect(() => {
    const hash = window.location.hash;
    if (!hash || hash === '#') return;
    requestAnimationFrame(() => {
      const el = document.querySelector(hash);
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
    });
  }, []);

  return (
    <div data-screen-label="Topics · Curriculum index">
      <SiteNav current="topics" />
      <TopicsHero />
      <TopicsGrid />
      <Pricing />
      <FinalCTA />
      <Footer />
    </div>
  );
}

// TOPICS_FULL is consumed by preview.jsx. Under the old in-browser-Babel setup it
// was an implicit shared-scope global; expose it on window AND export it so the
// preview module can import it as a real ES dependency.
Object.assign(window, { TopicsApp, TOPICS_FULL });

export { TopicsApp, TOPICS_FULL };
