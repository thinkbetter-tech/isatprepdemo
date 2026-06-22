import React from 'react';
import { Footer } from './sections.jsx';
import { QUESTIONS } from './data/questions.js';
import { getTest, planAllows } from './data/tests.js';
import {
  assembleTest, scoreModule, chooseModule2Path, assembleAdaptiveModule2,
  estimateScaledScore, domainBreakdown,
} from './data/testEngine.js';
import { onUserChanged, isFirebaseConfigured, getUserDoc, saveLessonProgress } from './firebase.js';

// Bluebook-style adaptive exam runner. Phases:
//   loading -> gate (if not allowed) -> intro -> module -> break -> module -> results
// The timer only starts when the user clicks "Begin". Each module auto-submits
// at 0:00. For full tests, Module 2 difficulty adapts to Module 1 performance.

const DOMAIN_NAMES = {
  'craft-and-structure': 'Craft and Structure',
  'information-and-ideas': 'Information and Ideas',
  'expression-of-ideas': 'Expression of Ideas',
  'standard-english-conventions': 'Standard English Conventions',
};

function fmt(secs) {
  const m = Math.floor(secs / 60), s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Render passage with ||underline|| spans and \n paragraph breaks.
function Passage({ text }) {
  if (!text) return null;
  return (
    <div className="tq-passage">
      {text.split('\n').map((para, i) => (
        <p key={i}>
          {para.split(/(\|\|[^|]*\|\|)/g).map((seg, j) =>
            seg.startsWith('||') && seg.endsWith('||')
              ? <u key={j}>{seg.slice(2, -2)}</u>
              : <React.Fragment key={j}>{seg}</React.Fragment>
          )}
        </p>
      ))}
    </div>
  );
}

// ---- Countdown timer hook ----
function useCountdown(seconds, running, onExpire) {
  const [left, setLeft] = React.useState(seconds);
  const expiredRef = React.useRef(false);
  React.useEffect(() => { setLeft(seconds); expiredRef.current = false; }, [seconds]);
  React.useEffect(() => {
    if (!running) return undefined;
    const t = setInterval(() => {
      setLeft((v) => {
        if (v <= 1) {
          clearInterval(t);
          if (!expiredRef.current) { expiredRef.current = true; onExpire && onExpire(); }
          return 0;
        }
        return v - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [running, seconds]);
  return left;
}

// ---- Question navigator grid ----
function Navigator({ questions, answers, marked, current, onJump, onClose }) {
  return (
    <div className="tq-nav-overlay" role="dialog" aria-modal="true" aria-label="Question navigator" onClick={onClose}>
      <div className="tq-nav-panel" onClick={(e) => e.stopPropagation()}>
        <div className="tq-nav-head">
          <span>Go to question</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
        </div>
        <div className="tq-nav-grid">
          {questions.map((q, i) => {
            const answered = answers[q.id] != null;
            const cls = ['tq-nav-cell'];
            if (i === current) cls.push('current');
            if (answered) cls.push('answered');
            if (marked[q.id]) cls.push('marked');
            return (
              <button key={q.id} className={cls.join(' ')} onClick={() => { onJump(i); onClose(); }}>
                {i + 1}{marked[q.id] ? ' ★' : ''}
              </button>
            );
          })}
        </div>
        <div className="tq-nav-legend">
          <span><i className="dot answered" /> Answered</span>
          <span><i className="dot marked" /> Marked</span>
          <span><i className="dot" /> Unanswered</span>
        </div>
      </div>
    </div>
  );
}

// ---- A single module runner ----
function ModuleRunner({ moduleLabel, questions, minutes, onSubmit }) {
  const [idx, setIdx] = React.useState(0);
  const [answers, setAnswers] = React.useState({});
  const [marked, setMarked] = React.useState({});
  const [eliminated, setEliminated] = React.useState({}); // {qid: {A:true}}
  const [navOpen, setNavOpen] = React.useState(false);
  const [reviewing, setReviewing] = React.useState(false);

  const submit = React.useCallback((reason) => {
    onSubmit({ answers, reason });
  }, [answers, onSubmit]);

  const left = useCountdown(minutes * 60, true, () => submit('timeout'));
  const q = questions[idx];
  const lowTime = left <= 300;

  if (!q) return <div className="tq-shell"><p>No questions available.</p></div>;

  const choose = (k) => setAnswers((a) => ({ ...a, [q.id]: k }));
  const toggleMark = () => setMarked((m) => ({ ...m, [q.id]: !m[q.id] }));
  const toggleElim = (k) => setEliminated((e) => ({
    ...e, [q.id]: { ...(e[q.id] || {}), [k]: !(e[q.id] && e[q.id][k]) },
  }));

  const answeredCount = Object.keys(answers).length;

  return (
    <div className="tq-shell">
      <header className="tq-top">
        <div className="tq-top-left">
          <span className="tq-module">{moduleLabel}</span>
          <span className="tq-progress-text">Question {idx + 1} of {questions.length}</span>
        </div>
        <div className={'tq-timer' + (lowTime ? ' low' : '')} aria-live="polite">
          ⏱ {fmt(left)}
        </div>
        <div className="tq-top-right">
          <button className="btn btn-ghost btn-sm" onClick={() => setNavOpen(true)}>
            Navigator ({answeredCount}/{questions.length})
          </button>
        </div>
      </header>

      {!reviewing ? (
        <main className="tq-body">
          <section className="tq-left"><Passage text={q.passage} /></section>
          <section className="tq-right">
            <div className="tq-qhead">
              <span className="tq-qnum">{idx + 1}</span>
              <button className={'tq-mark' + (marked[q.id] ? ' on' : '')} onClick={toggleMark} aria-pressed={!!marked[q.id]}>
                {marked[q.id] ? '★ Marked for review' : '☆ Mark for review'}
              </button>
            </div>
            <p className="tq-prompt">{q.prompt}</p>
            <div className="tq-choices">
              {q.choices.map((c) => {
                const isElim = eliminated[q.id] && eliminated[q.id][c.k];
                const isSel = answers[q.id] === c.k;
                return (
                  <div key={c.k} className={'tq-choice' + (isSel ? ' sel' : '') + (isElim ? ' elim' : '')}>
                    <button className="tq-choice-main" onClick={() => choose(c.k)} disabled={isElim}>
                      <span className="tq-choice-key">{c.k}</span>
                      <span className="tq-choice-text">{c.text}</span>
                    </button>
                    <button className="tq-choice-elim" title="Eliminate" onClick={() => toggleElim(c.k)}>
                      {isElim ? 'Undo' : '⊘'}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        </main>
      ) : (
        <main className="tq-review">
          <h2 className="serif">Review your answers</h2>
          <p className="hint">Unanswered and marked questions are highlighted. Jump back or submit the module.</p>
          <div className="tq-nav-grid wide">
            {questions.map((qq, i) => {
              const cls = ['tq-nav-cell'];
              if (answers[qq.id] != null) cls.push('answered');
              if (marked[qq.id]) cls.push('marked');
              return (
                <button key={qq.id} className={cls.join(' ')} onClick={() => { setIdx(i); setReviewing(false); }}>
                  {i + 1}{marked[qq.id] ? ' ★' : ''}
                </button>
              );
            })}
          </div>
        </main>
      )}

      <footer className="tq-foot">
        <button className="btn btn-outline btn-sm" disabled={idx === 0} onClick={() => { setReviewing(false); setIdx((i) => Math.max(0, i - 1)); }}>
          ← Back
        </button>
        {!reviewing ? (
          idx < questions.length - 1 ? (
            <button className="btn btn-primary btn-sm" onClick={() => setIdx((i) => i + 1)}>Next →</button>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={() => setReviewing(true)}>Review →</button>
          )
        ) : (
          <button className="btn btn-primary btn-sm" onClick={() => submit('manual')}>Submit module</button>
        )}
      </footer>

      {navOpen && (
        <Navigator
          questions={questions} answers={answers} marked={marked}
          current={idx} onJump={setIdx} onClose={() => setNavOpen(false)}
        />
      )}
    </div>
  );
}

// ---- Break screen ----
function BreakScreen({ minutes, onResume }) {
  const left = useCountdown(minutes * 60, true, onResume);
  return (
    <div className="tq-center">
      <div className="tq-card">
        <h1 className="serif">Break</h1>
        <p>Take a {minutes}-minute break. Module 2 begins automatically when the timer ends.</p>
        <div className="tq-bigtimer">{fmt(left)}</div>
        <button className="btn btn-primary" onClick={onResume}>Resume now →</button>
      </div>
    </div>
  );
}

// ---- Intro / guidelines ----
function Intro({ test, onBegin }) {
  const total = test.modules.reduce((n, m) => n + m.count, 0);
  const time = test.modules.reduce((n, m) => n + m.minutes, 0);
  return (
    <div className="tq-center">
      <div className="tq-card tq-intro">
        <span className="tq-eyebrow mono">{test.kind === 'full' ? 'Full R&W Simulation' : 'Mini Test'}</span>
        <h1 className="serif">{test.title}</h1>
        <ul className="tq-facts">
          <li><strong>{test.modules.length}</strong> module{test.modules.length > 1 ? 's' : ''}</li>
          <li><strong>{total}</strong> questions</li>
          <li><strong>{time} min</strong> total{test.breakMinutes ? ` + ${test.breakMinutes}-min break` : ''}</li>
          {test.adaptive && <li><strong>Adaptive</strong> — Module 2 adjusts to your Module 1 performance</li>}
        </ul>
        <div className="tq-guidelines">
          <h3>Before you begin</h3>
          <ul>
            <li>The timer starts when you click <strong>Begin</strong> and runs per module. Nothing is timed until then.</li>
            <li>Each module <strong>auto-submits when its timer reaches 0:00</strong>.</li>
            <li>Use <strong>Mark for review</strong> to flag questions and the <strong>Navigator</strong> to jump around within a module.</li>
            <li>You can <strong>eliminate</strong> answer choices to focus your thinking.</li>
            <li>Once you submit or time out a module, you can’t return to it.</li>
            <li>Work on your own — no outside help, just like the real exam.</li>
          </ul>
        </div>
        <button className="btn btn-primary btn-lg" onClick={onBegin}>Begin test <span className="btn-arrow">→</span></button>
        <a href="tests.html" className="tq-back">← Back to tests</a>
      </div>
    </div>
  );
}

// ---- Results ----
function Results({ test, allQuestions, allAnswers, module1, module2, path }) {
  const scaled = test.adaptive ? estimateScaledScore({ module1, module2, path }) : null;
  const totalCorrect = module1.correct + (module2 ? module2.correct : 0);
  const totalQ = module1.total + (module2 ? module2.total : 0);
  const breakdown = domainBreakdown(allQuestions, allAnswers);

  return (
    <div className="tq-results wrap">
      <span className="tq-eyebrow mono">Results</span>
      <h1 className="serif">{test.title}</h1>
      <div className="tq-score-row">
        <div className="tq-score-card">
          <div className="tq-score-num">{totalCorrect}<span>/{totalQ}</span></div>
          <div className="hint">Questions correct</div>
        </div>
        {scaled != null && (
          <div className="tq-score-card">
            <div className="tq-score-num">{scaled}</div>
            <div className="hint">Estimated R&W score (200–800)</div>
          </div>
        )}
        {test.adaptive && (
          <div className="tq-score-card">
            <div className="tq-score-num" style={{ textTransform: 'capitalize' }}>{path}</div>
            <div className="hint">Module 2 path</div>
          </div>
        )}
      </div>
      {scaled != null && <p className="hint tq-est-note">Scaled score is an estimate for practice — not an official College Board score.</p>}

      <h2 className="serif">By domain</h2>
      <ul className="tq-domain-list">
        {Object.entries(breakdown).map(([d, v]) => (
          <li key={d}>
            <span>{DOMAIN_NAMES[d] || d}</span>
            <span className="hint">{v.correct}/{v.total} correct</span>
          </li>
        ))}
      </ul>

      <h2 className="serif">Review</h2>
      <div className="tq-review-list">
        {allQuestions.map((q, i) => {
          const chosen = allAnswers[q.id];
          const ok = chosen === q.answer;
          return (
            <details key={q.id} className={'tq-review-item ' + (ok ? 'ok' : 'no')}>
              <summary>
                <span className="tq-rev-num">{i + 1}</span>
                <span className={'tq-rev-verdict ' + (ok ? 'ok' : 'no')}>{ok ? '✓ Correct' : (chosen ? '✗ Incorrect' : '— Skipped')}</span>
                <span className="tq-rev-prompt">{q.prompt}</span>
              </summary>
              <div className="tq-rev-body">
                <Passage text={q.passage} />
                <ul className="tq-rev-choices">
                  {q.choices.map((c) => (
                    <li key={c.k} className={(c.k === q.answer ? 'correct' : '') + (c.k === chosen && c.k !== q.answer ? ' yourwrong' : '')}>
                      <strong>{c.k}.</strong> {c.text}
                      {c.k === q.answer && ' ✓'}
                      {c.k === chosen && c.k !== q.answer && ' (your answer)'}
                    </li>
                  ))}
                </ul>
                {q.explanation && <p className="tq-rev-exp">{q.explanation}</p>}
              </div>
            </details>
          );
        })}
      </div>
      <div className="tq-results-actions">
        <a href="tests.html" className="btn btn-primary">Back to tests</a>
      </div>
    </div>
  );
}

// ---- Top-level orchestrator ----
function TestApp() {
  const params = new URLSearchParams(window.location.search);
  const testId = params.get('id');
  const test = getTest(testId);

  const [phase, setPhase] = React.useState('loading'); // loading|gate|intro|m1|break|m2|results
  const [plan, setPlan] = React.useState('free');
  const [assembled, setAssembled] = React.useState(null);
  const [m1Result, setM1Result] = React.useState(null);
  const [m2Questions, setM2Questions] = React.useState(null);
  const [m2Result, setM2Result] = React.useState(null);
  const [path, setPath] = React.useState(null);
  const [answersAll, setAnswersAll] = React.useState({});

  // Resolve auth + plan, then decide gate vs intro.
  React.useEffect(() => {
    if (!test) { setPhase('notfound'); return undefined; }
    if (!isFirebaseConfigured()) { setPhase('intro'); return undefined; } // local dev: allow
    const unsub = onUserChanged(async (u) => {
      if (!u) { window.location.href = 'login.html'; return; }
      const doc = await getUserDoc();
      const p = (doc && doc.plan) || 'free';
      setPlan(p);
      setPhase(planAllows(p, test.requiredPlan) ? 'intro' : 'gate');
    });
    return () => unsub();
  }, []);

  const begin = () => {
    const seed = (testId || 'x').split('').reduce((a, c) => a + c.charCodeAt(0), 1);
    const built = assembleTest(test, QUESTIONS, seed);
    setAssembled(built);
    setPhase('m1');
  };

  const finishM1 = ({ answers }) => {
    const qs = assembled.assembled[0];
    const res = scoreModule(qs, answers);
    setM1Result({ ...res, questions: qs, answers });
    setAnswersAll((prev) => ({ ...prev, ...answers }));
    if (test.adaptive && test.modules.length > 1) {
      const p = chooseModule2Path(res);
      setPath(p);
      const seed = (testId || 'x').split('').reduce((a, c) => a + c.charCodeAt(0), 1);
      const m2 = assembleAdaptiveModule2(test, QUESTIONS, p, seed, qs.map((q) => q.id));
      setM2Questions(m2);
      setPhase(test.breakMinutes ? 'break' : 'm2');
    } else {
      persistAndShow(res, null, null, { ...answers });
      setPhase('results');
    }
  };

  const finishM2 = ({ answers }) => {
    const res = scoreModule(m2Questions, answers);
    setM2Result({ ...res, questions: m2Questions, answers });
    const merged = { ...answersAll, ...answers };
    setAnswersAll(merged);
    persistAndShow(m1Result, res, path, merged);
    setPhase('results');
  };

  const persistAndShow = (m1, m2, p, mergedAnswers) => {
    // Best-effort save to progress (no-op when signed out / unconfigured).
    try {
      const scaled = test.adaptive ? estimateScaledScore({ module1: m1, module2: m2, path: p }) : null;
      saveLessonProgress(`test:${test.id}`, {
        kind: 'test',
        testId: test.id,
        correct: m1.correct + (m2 ? m2.correct : 0),
        total: m1.total + (m2 ? m2.total : 0),
        scaled,
        path: p,
        finishedAt: Date.now(),
      });
    } catch { /* ignore */ }
  };

  if (phase === 'notfound') {
    return <div className="tq-center"><div className="tq-card"><h1 className="serif">Test not found</h1><a className="btn btn-primary" href="tests.html">Back to tests</a></div></div>;
  }
  if (phase === 'loading') {
    return <div className="tq-center"><div className="tq-card"><p className="hint">Loading…</p></div></div>;
  }
  if (phase === 'gate') {
    return (
      <div className="tq-center">
        <div className="tq-card">
          <span className="tq-eyebrow mono">Locked</span>
          <h1 className="serif">{test.title}</h1>
          <p>Practice tests are part of a paid plan. Upgrade to take full, timed, adaptive SAT Reading &amp; Writing tests.</p>
          <a href="index.html#pricing" className="btn btn-primary btn-lg">Upgrade to unlock <span className="btn-arrow">→</span></a>
          <a href="tests.html" className="tq-back">← Back to tests</a>
        </div>
      </div>
    );
  }
  if (phase === 'intro') return <Intro test={test} onBegin={begin} />;
  if (phase === 'm1') {
    return <ModuleRunner moduleLabel={test.modules.length > 1 ? 'Module 1' : 'Module'} questions={assembled.assembled[0]} minutes={test.modules[0].minutes} onSubmit={finishM1} />;
  }
  if (phase === 'break') return <BreakScreen minutes={test.breakMinutes} onResume={() => setPhase('m2')} />;
  if (phase === 'm2') {
    return <ModuleRunner moduleLabel="Module 2" questions={m2Questions} minutes={test.modules[1].minutes} onSubmit={finishM2} />;
  }
  if (phase === 'results') {
    const allQ = [...(m1Result ? m1Result.questions : []), ...(m2Result ? m2Result.questions : [])];
    return (
      <>
        <Results test={test} allQuestions={allQ} allAnswers={answersAll} module1={m1Result} module2={m2Result} path={path} />
        <Footer />
      </>
    );
  }
  return null;
}

Object.assign(window, { TestApp });
export { TestApp };
