// preview.jsx — Static "what's inside" tour for prospects.
// Pure mockup. No real auth, no progress storage, no backend.
// All data is hardcoded; ?plan=core|complete|free switches the demo state.

const DEMO_USER = { firstName: "Aanya" };

const PROGRESS_DATA = {
  // 3 of 4 picked — invites the prospect to pick a 4th and feel the picker work.
  core: {
    selectedModules: [1, 2, 5],
    progress: { 1: 24, 2: 12, 5: 0 },
    lastSeen: { module: 1, question: 24 },
  },
  complete: {
    selectedModules: [1, 2, 3, 4, 5, 6, 7, 8],
    progress: { 1: 47, 2: 18, 3: 100, 4: 32, 5: 5, 6: 0, 7: 0, 8: 0 },
    lastSeen: { module: 1, question: 47 },
  },
  free: {
    selectedModules: [],
    progress: { 1: 2, 2: 1, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 },
    lastSeen: { module: 1, question: 2 },
  },
};

const PLAN_LABELS = { free: "Free", core: "Core", complete: "Complete" };

const SAMPLE_PREVIEWS = [
  "Excerpt from a Charlotte Perkins Gilman story",
  "Mirazón Lahr on early human nutrition",
  "The neutron star sequence",
  "Sabatini Sloan on textile repair",
  "A Civil War correspondence excerpt",
  "Dust storms over the Sahel",
  "Cathedral acoustics, measured",
  "On the etymology of ‘serendipity’",
  "Migratory bird routes, mapped",
  "Mountain passes and trade languages",
  "A poet on the gravity of October",
  "Marie Tharp and the ocean floor",
];

function getQS(key, allowed, fallback) {
  const v = new URLSearchParams(window.location.search).get(key);
  if (allowed && !allowed.includes(v)) return fallback;
  return v ?? fallback;
}
function getPlan() { return getQS("plan", ["free","core","complete"], "core"); }
function getModuleN() {
  const n = parseInt(new URLSearchParams(window.location.search).get("n"), 10);
  return n >= 1 && n <= 8 ? n : 1;
}

function useHashScroll() {
  React.useEffect(() => {
    const hash = window.location.hash;
    if (!hash || hash === "#") return;
    requestAnimationFrame(() => {
      const el = document.querySelector(hash);
      if (el) el.scrollIntoView({ behavior: "instant", block: "start" });
    });
  }, []);
}

// =============================================================
// Shared chrome
// =============================================================

function DemoBanner({ plan }) {
  const upgrade = plan === "complete" ? "complete" : (plan === "core" ? "complete" : "core");
  const ctaLabel = plan === "complete" ? "Get Complete" : (plan === "core" ? "Upgrade to Complete" : "Get Core");
  return (
    <div className="demo-banner">
      <div className="wrap demo-banner__inner">
        <span className="demo-banner__label">PREVIEW</span>
        <span className="demo-banner__msg">
          Sample of the <em>{PLAN_LABELS[plan]}</em> experience. {DEMO_USER.firstName} isn't real &mdash; make it yours.
        </span>
        <a href={`signup.html?plan=${upgrade}`} className="btn btn-primary btn-sm">
          {ctaLabel} <span className="btn-arrow">&rarr;</span>
        </a>
      </div>
    </div>
  );
}

function PreviewNav({ plan }) {
  return (
    <nav className="nav">
      <div className="wrap nav-inner">
        <a href="index.html" className="brand">
          <span className="brand-mark">i</span>
          <span>iSATPrep</span>
        </a>
        <div className="nav-links">
          <a href={`preview-dashboard.html?plan=${plan}`} aria-current="page">Dashboard</a>
          <a href="topics.html">Topics</a>
          <a href="index.html#pricing">Pricing</a>
        </div>
        <div className="nav-cta preview-nav__user">
          <span className="preview-nav__name">{DEMO_USER.firstName}</span>
          <span className="preview-nav__plan">&middot; {PLAN_LABELS[plan]}</span>
        </div>
      </div>
    </nav>
  );
}

function PlanToggle({ plan }) {
  const params = new URLSearchParams(window.location.search);
  const here = window.location.pathname.split("/").pop();
  const buildHref = (p) => {
    const u = new URLSearchParams(params);
    u.set("plan", p);
    return `${here}?${u.toString()}`;
  };
  return (
    <div className="plan-toggle-wrap">
      <div className="wrap plan-toggle">
        <span className="plan-toggle__lbl">Viewing</span>
        {["free","core","complete"].map(p => (
          <a
            key={p}
            href={buildHref(p)}
            className={"plan-toggle__opt" + (plan === p ? " sel" : "")}
          >{PLAN_LABELS[p]}</a>
        ))}
      </div>
    </div>
  );
}

// =============================================================
// Dashboard pieces
// =============================================================

function ContinueCard({ plan, lastSeen }) {
  if (!lastSeen) return null;
  const mod = TOPICS_FULL.find(t => t.n === lastSeen.module);
  if (!mod) return null;
  const resumeHref = plan === "free"
    ? `practice.html?from=preview&plan=${plan}&n=${mod.n}&q=${lastSeen.question}`
    : `signup.html?plan=${plan}`;
  return (
    <div className="continue-card">
      <div className="continue-card__left">
        <span className="mono continue-card__kicker">Pick up where you left off</span>
        <div className="continue-card__title">{mod.name}</div>
        <div className="continue-card__pos">
          Module {String(mod.n).padStart(2,"0")} &middot; Question {String(lastSeen.question).padStart(2,"0")}
        </div>
      </div>
      <a href={resumeHref} className="btn btn-primary btn-lg">
        Resume Question {lastSeen.question} <span className="btn-arrow">&rarr;</span>
      </a>
    </div>
  );
}

function ModulePicker({ selected, setSelected }) {
  const max = 4;
  const count = selected.length;
  const status = count < max ? "under" : (count > max ? "over" : "ok");
  const toggle = (n) => {
    setSelected(selected.includes(n) ? selected.filter(x => x !== n) : [...selected, n]);
  };
  return (
    <div className="picker">
      <div className="picker__head">
        <h2 className="picker__h">
          Choose any <em>4</em> modules to master.
        </h2>
        <p className={"picker__count picker__count--" + status}>
          {status === "ok" && <>All four picked. Lock them in below.</>}
          {status === "under" && <>You picked <em>{count}</em> of 4 &mdash; pick {max - count} more.</>}
          {status === "over" && <>You picked <em>{count}</em> of 4 &mdash; drop {count - max}.</>}
        </p>
      </div>
      <div className="picker__grid">
        {TOPICS_FULL.map(t => {
          const isSel = selected.includes(t.n);
          return (
            <button
              key={t.n}
              type="button"
              className={"picker__chip" + (isSel ? " sel" : "")}
              onClick={() => toggle(t.n)}
              aria-pressed={isSel}
            >
              <span className="picker__chip-num">{String(t.n).padStart(2,"0")}</span>
              <span className="picker__chip-name">{t.name}</span>
              <span className="picker__chip-state">{isSel ? "Picked" : "Pick"}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ModuleGrid({ plan, selected, progress, lastSeen }) {
  const moduleStatus = (n) => {
    const p = progress[n] || 0;
    if (plan === "complete") {
      return { unlocked: true, p, label: `${p}/100`, cta: p > 0 ? "Continue" : "Start" };
    }
    if (plan === "core") {
      const isSel = selected.includes(n);
      if (isSel) return { unlocked: true, p, label: `${p}/100`, cta: p > 0 ? "Continue" : "Start" };
      return { unlocked: false, p: 0, label: "Locked", cta: "Pick to unlock" };
    }
    return { unlocked: false, p, label: `${p}/4 free`, cta: "Try free questions" };
  };
  return (
    <div className="mgrid">
      {TOPICS_FULL.map(t => {
        const s = moduleStatus(t.n);
        const isMostRecent = lastSeen && lastSeen.module === t.n && s.unlocked;
        const cls = "mcard"
          + (s.unlocked ? " mcard--open" : " mcard--locked")
          + (isMostRecent ? " mcard--recent" : "");
        return (
          <a
            key={t.n}
            href={`preview-module.html?plan=${plan}&n=${t.n}`}
            className={cls}
          >
            <div className="mcard__head">
              <span className="mcard__num">{String(t.n).padStart(2,"0")}</span>
              <span className="mcard__pill">{s.label}</span>
            </div>
            <h3 className="mcard__name">{t.name}</h3>
            <p className="mcard__desc">{t.desc}</p>
            <div className="mcard__bar" aria-hidden="true">
              <div className="mcard__bar-fill" style={{ width: (s.unlocked ? s.p : 0) + "%" }}/>
            </div>
            <div className="mcard__cta">{s.cta} <span className="btn-arrow">&rarr;</span></div>
          </a>
        );
      })}
    </div>
  );
}

// =============================================================
// Page roots
// =============================================================

function DashboardApp() {
  useHashScroll();
  const plan = getPlan();
  const data = PROGRESS_DATA[plan];
  const [selected, setSelected] = React.useState(data.selectedModules);
  // Derive a synced lastSeen+progress that reflects current selection on Core
  const effectiveProgress = plan === "core"
    ? Object.fromEntries(Object.entries(data.progress).filter(([k]) => selected.includes(parseInt(k,10))))
    : data.progress;
  const lastSeen = (plan === "core" && !selected.includes(data.lastSeen?.module)) ? null : data.lastSeen;

  return (
    <div data-screen-label={`Preview · Dashboard (${PLAN_LABELS[plan]})`}>
      <DemoBanner plan={plan} />
      <PreviewNav plan={plan} />
      <PlanToggle plan={plan} />

      <section className="preview-hero">
        <div className="wrap">
          <h1 className="preview-hero__h">
            Welcome back, <em>{DEMO_USER.firstName}</em>.
          </h1>
          <p className="preview-hero__sub">
            {plan === "free"     && <>Your free preview is below. Upgrade when you're ready.</>}
            {plan === "core"     && <>Pick four modules. Master them. Then pick more.</>}
            {plan === "complete" && <>Every module is yours. Keep going.</>}
          </p>
        </div>
      </section>

      {lastSeen && (
        <section className="preview-section">
          <div className="wrap">
            <ContinueCard plan={plan} lastSeen={lastSeen} />
          </div>
        </section>
      )}

      {plan === "core" && (
        <section className="preview-section bg-bone">
          <div className="wrap">
            <ModulePicker selected={selected} setSelected={setSelected} />
          </div>
        </section>
      )}

      <section className="preview-section">
        <div className="wrap">
          <h2 className="preview-section__h">
            {plan === "core"     && <>Your modules</>}
            {plan === "complete" && <>All eight modules</>}
            {plan === "free"     && <>All modules &mdash; <em>4 free</em> questions in each</>}
          </h2>
          <ModuleGrid plan={plan} selected={selected} progress={effectiveProgress} lastSeen={lastSeen} />
        </div>
      </section>

      <Footer />
    </div>
  );
}

function ModuleApp() {
  useHashScroll();
  const plan = getPlan();
  const moduleN = getModuleN();
  const mod = TOPICS_FULL.find(t => t.n === moduleN);
  const data = PROGRESS_DATA[plan];
  const isPicked = plan === "complete" || (plan === "core" && data.selectedModules.includes(moduleN));
  const userProgress = isPicked ? (data.progress[moduleN] || 0) : 0;

  const totalCount = 100;
  const sampleCount = 12;
  const buildQuestion = (n) => {
    let status;
    if (plan === "free") {
      status = n <= 4 ? (n <= (data.progress[moduleN] || 0) ? "done" : "free") : "locked";
    } else if (!isPicked) {
      status = "locked";
    } else if (n <= userProgress) {
      status = "done";
    } else if (n === userProgress + 1) {
      status = "current";
    } else {
      status = "todo";
    }
    return { n, status, preview: SAMPLE_PREVIEWS[(n - 1) % SAMPLE_PREVIEWS.length] };
  };
  const questions = Array.from({ length: sampleCount }, (_, i) => buildQuestion(i + 1));

  const startQ = userProgress > 0 ? userProgress + 1 : 1;
  const startCta = isPicked
    ? (userProgress > 0 ? `Resume Question ${userProgress + 1}` : "Start Question 01")
    : (plan === "free" ? "Try 4 free questions" : "Pick this module on Core");
  const startHref = plan === "free"
    ? `practice.html?from=preview&plan=${plan}&n=${moduleN}&q=${startQ}`
    : isPicked
      ? `signup.html?plan=${plan}`
      : `preview-dashboard.html?plan=${plan}#picker`;

  return (
    <div data-screen-label={`Preview · Module ${moduleN}`}>
      <DemoBanner plan={plan} />
      <PreviewNav plan={plan} />
      <PlanToggle plan={plan} />

      <section className="preview-section">
        <div className="wrap">
          <a href={`preview-dashboard.html?plan=${plan}`} className="back-link">
            &larr; Back to dashboard
          </a>
          <div className="modhero">
            <div className="modhero__num mono">Module {String(mod.n).padStart(2,"0")}</div>
            <h1 className="modhero__h">{mod.name}</h1>
            <p className="modhero__desc">{mod.long || mod.desc}</p>
            <div className="modhero__bar" aria-hidden="true">
              <div className="modhero__bar-fill" style={{ width: (isPicked ? userProgress : 0) + "%" }}/>
            </div>
            <div className="modhero__progress">
              {isPicked && (
                <>{userProgress} of 100 done &middot; <em>{100 - userProgress}</em> to go</>
              )}
              {!isPicked && plan === "free" && (
                <>4 free questions to try &middot; upgrade to unlock all 100</>
              )}
              {!isPicked && plan === "core" && (
                <>Pick this module on Core to unlock its 100 questions</>
              )}
            </div>
            <a href={startHref} className="btn btn-primary btn-lg">
              {startCta} <span className="btn-arrow">&rarr;</span>
            </a>
          </div>
        </div>
      </section>

      <section className="preview-section bg-bone">
        <div className="wrap">
          <h2 className="preview-section__h">Question bank</h2>
          <div className="qbank-list">
            {questions.map(q => (
              <a
                key={q.n}
                href={plan === "free"
                  ? `practice.html?from=preview&plan=${plan}&n=${moduleN}&q=${q.n}`
                  : `signup.html?plan=${plan}`}
                className={"qbank-row qbank-row--" + q.status}
              >
                <span className="qbank-row__num">Q{String(q.n).padStart(2,"0")}</span>
                <span className="qbank-row__preview">{q.preview}</span>
                <span className="qbank-row__status">
                  {q.status === "done"    && <>&#x2713; Done</>}
                  {q.status === "current" && <>&#x25B7; Resume</>}
                  {q.status === "todo"    && <>Start</>}
                  {q.status === "free"    && <>&#x25CF; Free</>}
                  {q.status === "locked"  && <>Locked</>}
                </span>
              </a>
            ))}
          </div>
          <p className="qbank-list__more">+ {totalCount - sampleCount} more questions in this module</p>
        </div>
      </section>

      <Footer />
    </div>
  );
}

Object.assign(window, {
  DashboardApp, ModuleApp,
  DemoBanner, PreviewNav, PlanToggle,
  ContinueCard, ModulePicker, ModuleGrid,
});
