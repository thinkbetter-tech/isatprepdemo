// Dedicated Topics page — the full 8-skill curriculum.
// Text Structure & Purpose is moved to position 01 (the only currently free + practiceable topic).

const TOPICS_FULL = [
  // 01 — Free + practiceable. Surfaced first per Ravish's note.
  {
    n: 1, originalN: 2,
    name: "Text Structure & Purpose",
    desc: "Understand how passages are built — claim, evidence, qualifier, transition.",
    long: "The structural backbone of every Reading passage. Learn to read for the move, not the meaning — and the answer falls out.",
    tier: "free",
    href: "practice.html",
    available: true,
    questions: 100,
  },
  { n: 2, originalN: 1, name: "Words in Context",            desc: "Decode vocabulary in any passage.",              long: "A repeatable substitution method that beats memorizing 5,000 flashcards.", tier: "59" },
  { n: 3, originalN: 3, name: "Cross-Text Connections",      desc: "Compare and link multiple texts.",               long: "Two passages, one question. Learn to map their relationship in seconds.",   tier: "59" },
  { n: 4, originalN: 4, name: "Central Ideas & Details",     desc: "Find the main point, fast.",                     long: "Train your eye to spot the thesis sentence — and ignore the noise.",        tier: "59" },
  { n: 5, originalN: 5, name: "Inferences",                  desc: "Read between the lines with precision.",         long: "An inference is a forced conclusion, not a guess. We show you the rules.",  tier: "59" },
  { n: 6, originalN: 6, name: "Command of Evidence",         desc: "Pick the right proof every time.",               long: "Quantitative and textual evidence questions, demystified.",                  tier: "59" },
  { n: 7, originalN: 7, name: "Boundaries (Grammar)",        desc: "Master punctuation and sentence structure.",     long: "Comma, semicolon, colon, dash. Rules — not vibes.",                          tier: "99" },
  { n: 8, originalN: 8, name: "Rhetorical Synthesis & Transitions", desc: "Connect ideas seamlessly.",              long: "The two highest-leverage Writing question types, solved methodically.",     tier: "99" },
];

function TopicsNav() {
  return (
    <nav className="nav">
      <div className="wrap nav-inner">
        <a href="index.html" className="brand">
          <span className="brand-mark">i</span>
          <span>iSATPrep</span>
        </a>
        <div className="nav-links">
          <a href="index.html#method">Method</a>
          <a href="topics.html" aria-current="page">Topics</a>
          <a href="index.html#instructor">About</a>
          <a href="index.html#pricing">Pricing</a>
        </div>
        <div className="nav-cta">
          <a href="login.html" className="btn btn-ghost btn-sm">Log in</a>
          <a href="signup.html?plan=free" className="btn btn-primary btn-sm">Start free</a>
        </div>
      </div>
    </nav>
  );
}

function TopicsHero() {
  return (
    <section style={{padding:"4.5rem 0 2.5rem"}}>
      <div className="wrap">
        <a href="index.html" style={{fontFamily:"var(--mono)", fontSize:12, color:"var(--ink-soft)", letterSpacing:"0.06em", textTransform:"uppercase"}}>← Home</a>
        <div style={{marginTop:18}}>
          <span className="eyebrow">The curriculum</span>
          <h1 style={{fontSize:"clamp(40px, 5vw, 64px)", marginTop:14, lineHeight:1.04, maxWidth:"18ch"}}>
            The 8 skills that define SAT Reading &amp; Writing.
          </h1>
          <p className="body-text" style={{marginTop:18, maxWidth:"60ch"}}>
            One method, eight applications. Start with the free sample topic — Text Structure &amp; Purpose —
            then unlock the rest as you go.
          </p>
        </div>
      </div>
    </section>
  );
}

function TopicCard({ t }) {
  const external = !!t.href;
  const href = t.href || "index.html#pricing";
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className={"topic-card" + (t.available ? " topic-card--free" : "")}
    >
      <div className="topic-card__head">
        <span className="topic-card__num">{String(t.n).padStart(2,"0")}</span>
        <TierBadge tier={t.tier} />
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
              <TierBadge tier={first.tier} />
              <span className="topic-feature__tag">Start here</span>
            </div>
            <h2 className="topic-feature__name">{first.name}</h2>
            <p className="topic-feature__desc">{first.long}</p>
            <div className="topic-feature__cta">
              <span className="btn btn-primary">
                Practice 4 free questions <span className="btn-arrow">→</span>
              </span>
              <span className="topic-feature__meta">{first.questions} total questions · 4 unlocked</span>
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

        <div className="topics-divider">
          <span className="topics-divider__line" />
          <span className="topics-divider__label">Topics 02 – 08 · unlock with a plan</span>
          <span className="topics-divider__line" />
        </div>

        <div className="topic-grid">
          {rest.map(t => <TopicCard key={t.n} t={t} />)}
        </div>
      </div>
    </section>
  );
}

function TopicsApp() {
  return (
    <div data-screen-label="Topics · Curriculum index">
      <TopicsNav />
      <TopicsHero />
      <TopicsGrid />
      <Pricing />
      <FinalCTA />
      <Footer />
    </div>
  );
}

Object.assign(window, { TopicsApp });
