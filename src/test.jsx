import React from 'react';
import { Footer } from './sections.jsx';
import { QUESTIONS, questionById } from './data/questions.js';
import { getTest, planAllows } from './data/tests.js';
import {
  assembleTest, scoreModule, chooseModule2Path, assembleAdaptiveModule2,
  estimateScaledScore, domainBreakdown,
} from './data/testEngine.js';
import { analyzeAttempt, domainName, skillName, fmtDuration } from './data/analysisEngine.js';
import {
  onUserChanged, isFirebaseConfigured, getUserDoc, saveLessonProgress, saveAttempt,
  getPeerComparison, PEER_MIN_ATTEMPTS, getAttempt, listAttempts,
} from './firebase.js';

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

  // --- Per-question timing (behavioral analytics for the post-test report) ---
  // timing[qid] = { timeMs, firstAnswerMs|null, changed }
  const timingRef = React.useRef({});
  const enterRef = React.useRef(null);   // performance.now() when current q became visible
  const now = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : 0);

  const ensureTiming = (id) => {
    if (!timingRef.current[id]) timingRef.current[id] = { timeMs: 0, firstAnswerMs: null, changed: false };
    return timingRef.current[id];
  };
  // Flush the time accrued on the currently-visible question into its record.
  const flushCurrent = React.useCallback(() => {
    const cur = questions[idx];
    if (!cur || enterRef.current == null) return;
    const t = ensureTiming(cur.id);
    t.timeMs += Math.max(0, now() - enterRef.current);
    enterRef.current = now();
  }, [idx, questions]);

  // Reset the enter-clock whenever the visible question changes (and we're not on
  // the review screen). Flush happens on navigation handlers below.
  React.useEffect(() => {
    if (!reviewing) enterRef.current = now();
    return undefined;
  }, [idx, reviewing]);

  // Build the timing payload at submit, flushing the last-viewed question first.
  const buildTiming = () => {
    flushCurrent();
    const out = {};
    for (const id of Object.keys(timingRef.current)) {
      const t = timingRef.current[id];
      out[id] = {
        timeSec: Math.round(t.timeMs / 1000),
        firstAnswerSec: t.firstAnswerMs == null ? null : Math.round(t.firstAnswerMs / 1000),
        changedAnswer: !!t.changed,
      };
    }
    return out;
  };

  const submit = React.useCallback((reason) => {
    onSubmit({ answers, marked, timing: buildTiming(), reason });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, marked, onSubmit, idx, questions]);

  const left = useCountdown(minutes * 60, true, () => submit('timeout'));
  const q = questions[idx];
  const lowTime = left <= 300;

  if (!q) return <div className="tq-shell"><p>No questions available.</p></div>;

  // Navigate helper: flush time on the current question before changing idx.
  const goTo = (nextIdx) => { flushCurrent(); setReviewing(false); setIdx(nextIdx); };

  const choose = (k) => {
    const t = ensureTiming(q.id);
    if (t.firstAnswerMs == null) {
      // time-to-first-answer = time already accrued on this q this visit
      flushCurrent();
      t.firstAnswerMs = t.timeMs;
    } else if (answers[q.id] != null && answers[q.id] !== k) {
      t.changed = true;
    }
    setAnswers((a) => ({ ...a, [q.id]: k }));
  };
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
                <button key={qq.id} className={cls.join(' ')} onClick={() => goTo(i)}>
                  {i + 1}{marked[qq.id] ? ' ★' : ''}
                </button>
              );
            })}
          </div>
        </main>
      )}

      <footer className="tq-foot">
        <button className="btn btn-outline btn-sm" disabled={idx === 0} onClick={() => goTo(Math.max(0, idx - 1))}>
          ← Back
        </button>
        {!reviewing ? (
          idx < questions.length - 1 ? (
            <button className="btn btn-primary btn-sm" onClick={() => goTo(idx + 1)}>Next →</button>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={() => { flushCurrent(); setReviewing(true); }}>Review →</button>
          )
        ) : (
          <button className="btn btn-primary btn-sm" onClick={() => submit('manual')}>Submit module</button>
        )}
      </footer>

      {navOpen && (
        <Navigator
          questions={questions} answers={answers} marked={marked}
          current={idx} onJump={(i) => goTo(i)} onClose={() => setNavOpen(false)}
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
// pct helper
const pct = (n) => `${Math.round((n || 0) * 100)}%`;

// One question's detailed review card (used in each section + full review).
function ReviewItem({ q, peerPct }) {
  const full = questionById(q.id) || {};
  const choices = full.choices || [];
  const verdict = q.status === 'right' ? '✓ Correct' : q.status === 'wrong' ? '✗ Incorrect' : '— Skipped';
  return (
    <details className={'tq-review-item ' + (q.status === 'right' ? 'ok' : 'no')}>
      <summary>
        <span className="tq-rev-num">{(q.order ?? 0) + 1}</span>
        <span className={'tq-rev-verdict ' + (q.status === 'right' ? 'ok' : 'no')}>{verdict}</span>
        <span className="tq-rev-prompt">{full.prompt || skillName(q.skill)}</span>
        {q.timeSec != null && <span className="tq-rev-time">{fmtDuration(q.timeSec)}</span>}
      </summary>
      <div className="tq-rev-body">
        {full.passage && <Passage text={full.passage} />}
        {full.prompt && <p className="tq-rev-promptfull">{full.prompt}</p>}
        <ul className="tq-rev-choices">
          {choices.map((c) => (
            <li key={c.k} className={(c.k === q.correctAnswer ? 'correct' : '') + (c.k === q.chosen && c.k !== q.correctAnswer ? ' yourwrong' : '')}>
              <strong>{c.k}.</strong> {c.text}
              {c.k === q.correctAnswer && ' ✓'}
              {c.k === q.chosen && c.k !== q.correctAnswer && ' (your answer)'}
            </li>
          ))}
        </ul>
        <div className="tq-rev-meta">
          <span>{domainName(q.domain)} · {skillName(q.skill)} · {q.difficulty}</span>
          {q.timeSec != null && <span>You spent {fmtDuration(q.timeSec)}{q.changedAnswer ? ' · changed answer' : ''}</span>}
          {peerPct != null && <span>{peerPct}% of students got this right</span>}
        </div>
        {full.explanation && <p className="tq-rev-exp">{full.explanation}</p>}
      </div>
    </details>
  );
}

// Per-question timeline strip (color-coded by status, width ~ time).
function Timeline({ timeline }) {
  const maxT = Math.max(1, ...timeline.map((t) => t.timeSec || 0));
  return (
    <div className="tq-timeline" role="img" aria-label="Time spent per question">
      {timeline.map((t) => (
        <div
          key={t.id}
          className={'tq-tl-bar ' + t.status}
          style={{ height: `${Math.max(8, Math.round(((t.timeSec || 0) / maxT) * 100))}%` }}
          title={`Q${(t.order ?? 0) + 1}: ${t.status}${t.timeSec != null ? ` · ${fmtDuration(t.timeSec)}` : ''}`}
        />
      ))}
    </div>
  );
}

// The full post-test analysis report. Driven entirely by the attempt record +
// (optional) peer data — no hardcoded values; empty inputs render gracefully.
function Analysis({ attempt, peer, backHref = 'tests.html', switcher = null }) {
  const a = React.useMemo(() => analyzeAttempt(attempt), [attempt]);
  const [tab, setTab] = React.useState('wrong'); // wrong is most actionable
  const s = a.snapshot;
  const peerQ = peer && peer.available ? peer.perQuestion : null;

  const sectionItems = tab === 'right' ? a.sectionRight.items
    : tab === 'skipped' ? a.sectionSkipped.items
    : a.sectionWrong.items;

  return (
    <div className="tq-results wrap">
      <span className="tq-eyebrow mono">Your analysis</span>
      <div className="tq-analysis-head">
        <h1 className="serif">{attempt.testTitle || 'Test results'}</h1>
        {switcher}
      </div>

      {/* ---- A. Quick snapshot ---- */}
      <div className="tq-score-row">
        {s.scaledEstimate != null && (
          <div className="tq-score-card">
            <div className="tq-score-num">{s.scaledEstimate}</div>
            <div className="hint">Est. R&W score (200–800)</div>
          </div>
        )}
        <div className="tq-score-card">
          <div className="tq-score-num">{s.right}<span>/{s.total}</span></div>
          <div className="hint">Correct · {pct(s.accuracy)} of attempted</div>
        </div>
        <div className="tq-score-card">
          <div className="tq-score-num">{fmtDuration(s.totalTimeSec)}</div>
          <div className="hint">Time used{s.avgSecPerQ != null ? ` · ${fmtDuration(s.avgSecPerQ)}/q avg` : ''}</div>
        </div>
        {peer && peer.available && peer.percentile != null && (
          <div className="tq-score-card">
            <div className="tq-score-num">{peer.percentile}<span>%ile</span></div>
            <div className="hint">vs. {peer.attempts} peers{peer.meanScore != null ? ` · avg ${peer.meanScore}` : ''}</div>
          </div>
        )}
      </div>

      {/* right/wrong/skipped bar */}
      <div className="tq-rws-bar" aria-label="Right, wrong, skipped breakdown">
        {s.right > 0 && <span className="rws right" style={{ flex: s.right }} title={`${s.right} right`}>{s.right}</span>}
        {s.wrong > 0 && <span className="rws wrong" style={{ flex: s.wrong }} title={`${s.wrong} wrong`}>{s.wrong}</span>}
        {s.skipped > 0 && <span className="rws skipped" style={{ flex: s.skipped }} title={`${s.skipped} skipped`}>{s.skipped}</span>}
      </div>
      <div className="tq-snapshot-chips">
        {s.strongestDomain && <span className="chip good">Strongest: {domainName(s.strongestDomain)}</span>}
        {s.weakestDomain && <span className="chip bad">Focus: {domainName(s.weakestDomain)}</span>}
        {attempt.module2Path && <span className="chip">Module 2: {attempt.module2Path}</span>}
      </div>
      {s.scaledEstimate != null && <p className="hint tq-est-note">Scaled score is an estimate for practice — not an official College Board score.</p>}

      {/* peer not-available notice (honest, never fabricated) */}
      {peer && !peer.available && (
        <p className="hint tq-peer-note">
          {peer.reason === 'below-threshold'
            ? `Peer comparison unlocks once ${peer.needed} students have taken this test (currently ${peer.attempts}).`
            : 'Peer comparison will appear once enough students have taken this test.'}
        </p>
      )}

      {/* ---- timeline ---- */}
      {a.hasTiming && (
        <>
          <h2 className="serif">Time per question</h2>
          <Timeline timeline={a.timeline} />
          <p className="hint">Taller = more time. <span className="leg right">■</span> right <span className="leg wrong">■</span> wrong <span className="leg skipped">■</span> skipped</p>
        </>
      )}

      {/* ---- B/C/D insight cards ---- */}
      <div className="tq-insights">
        <div className="tq-insight good">
          <h3>What you did right</h3>
          <ul>
            <li><strong>{a.sectionRight.items.length}</strong> correct{a.sectionRight.hardTotal > 0 ? `, incl. ${a.sectionRight.hardCleared}/${a.sectionRight.hardTotal} hard` : ''}</li>
            {a.sectionRight.confidentCorrect > 0 && <li><strong>{a.sectionRight.confidentCorrect}</strong> confident-correct (quick &amp; unchanged)</li>}
            {a.sectionRight.avgSecOnCorrect != null && <li>Avg {fmtDuration(a.sectionRight.avgSecOnCorrect)} on correct answers</li>}
          </ul>
        </div>
        <div className="tq-insight warn">
          <h3>What you skipped</h3>
          {a.sectionSkipped.count === 0 ? <p className="hint">Nothing skipped — you answered every question.</p> : (
            <ul>
              <li><strong>{a.sectionSkipped.count}</strong> skipped{a.sectionSkipped.easyMediumSkips > 0 ? ` (${a.sectionSkipped.easyMediumSkips} were easy/medium — recoverable)` : ''}</li>
              {a.sectionSkipped.pacingPattern === 'ran-out-of-time' && <li>Mostly at the end — a <strong>pacing</strong> issue</li>}
              {a.sectionSkipped.pacingPattern === 'scattered' && <li>Scattered throughout — review those topics</li>}
              {a.sectionSkipped.markedButSkipped > 0 && <li>{a.sectionSkipped.markedButSkipped} marked for review but never returned</li>}
            </ul>
          )}
        </div>
        <div className="tq-insight bad">
          <h3>What you got wrong</h3>
          {a.sectionWrong.items.length === 0 ? <p className="hint">No wrong answers. 🎯</p> : (
            <ul>
              {a.sectionWrong.byDomain.slice(0, 2).map((d) => <li key={d.key}><strong>{d.count}</strong> in {domainName(d.key)}</li>)}
              {a.sectionWrong.rushed > 0 && <li>{a.sectionWrong.rushed} rushed (well below your avg time)</li>}
              {a.sectionWrong.stuck > 0 && <li>{a.sectionWrong.stuck} stuck (well above avg)</li>}
              {a.sectionWrong.changedToWrong > 0 && <li>{a.sectionWrong.changedToWrong} changed from another answer</li>}
            </ul>
          )}
        </div>
      </div>

      {/* drill into weak topic */}
      {s.weakestDomain && (
        <a href={`practice.html?topic=${s.weakestDomain}`} className="btn btn-outline btn-sm tq-drill">
          Practice {domainName(s.weakestDomain)} →
        </a>
      )}

      {/* ---- tabbed question review ---- */}
      <h2 className="serif">Review questions</h2>
      <div className="tq-tabs">
        <button className={'tq-tab' + (tab === 'right' ? ' on' : '')} onClick={() => setTab('right')}>Right ({a.sectionRight.items.length})</button>
        <button className={'tq-tab' + (tab === 'skipped' ? ' on' : '')} onClick={() => setTab('skipped')}>Skipped ({a.sectionSkipped.items.length})</button>
        <button className={'tq-tab' + (tab === 'wrong' ? ' on' : '')} onClick={() => setTab('wrong')}>Wrong ({a.sectionWrong.items.length})</button>
      </div>
      <div className="tq-review-list">
        {sectionItems.length === 0
          ? <p className="hint">No questions in this category.</p>
          : sectionItems.map((q) => <ReviewItem key={q.id} q={q} peerPct={peerQ && peerQ[q.id] ? peerQ[q.id].pctCorrect : null} />)}
      </div>

      <div className="tq-results-actions">
        <a href="tests.html" className="btn btn-primary">Back to tests</a>
      </div>
    </div>
  );
}

// ---- Standalone viewer for a PAST attempt (test.html?attempt=<id>) ----
// Loads the requested attempt AND its siblings (same test) so the user can
// switch between attempts via a dropdown on the analysis page. Defaults to the
// latest when no specific id resolves.
function PastAttemptView({ attemptId }) {
  const [state, setState] = React.useState('loading'); // loading|notfound|ready
  const [siblings, setSiblings] = React.useState([]);   // all attempts of this test, newest first
  const [currentId, setCurrentId] = React.useState(attemptId);
  const [attempt, setAttempt] = React.useState(null);
  const [peer, setPeer] = React.useState(null);

  React.useEffect(() => {
    let alive = true;
    if (!isFirebaseConfigured()) { setState('notfound'); return undefined; }
    const unsub = onUserChanged(async (u) => {
      if (!u) { window.location.href = 'login.html'; return; }
      const a = await getAttempt(attemptId);
      if (!alive) return;
      if (!a) { setState('notfound'); return; }
      setAttempt(a); setCurrentId(a.id); setState('ready');
      getPeerComparison(a.testId, a).then((p) => { if (alive) setPeer(p); }).catch(() => {});
      // Load siblings for the switcher (best-effort).
      try {
        const all = await listAttempts(100);
        if (alive) setSiblings(all.filter((x) => x.testId === a.testId));
      } catch { /* dropdown just won't show */ }
    });
    return () => { alive = false; unsub(); };
  }, [attemptId]);

  // Switch to another attempt of the same test without a full reload; keep the
  // URL in sync so it's bookmarkable/shareable.
  const switchTo = async (id) => {
    if (!id || id === currentId) return;
    setPeer(null);
    const a = await getAttempt(id);
    if (!a) return;
    setAttempt(a); setCurrentId(id);
    try { window.history.replaceState(null, '', `test.html?attempt=${encodeURIComponent(id)}`); } catch { /* ignore */ }
    getPeerComparison(a.testId, a).then(setPeer).catch(() => {});
  };

  if (state === 'loading') return <div className="tq-center"><div className="tq-card"><p className="hint">Loading…</p></div></div>;
  if (state === 'notfound') return <div className="tq-center"><div className="tq-card"><h1 className="serif">Attempt not found</h1><a className="btn btn-primary" href="account.html">My test history</a></div></div>;

  // Build the dropdown only when there's more than one attempt of this test.
  const switcher = siblings.length > 1 ? (
    <label className="tq-attempt-switch">
      <span>Attempt</span>
      <select value={currentId} onChange={(e) => switchTo(e.target.value)}>
        {siblings.map((s, i) => {
          const n = siblings.length - i; // newest = highest number
          const date = s.startedAt ? new Date(s.startedAt).toLocaleDateString() : '';
          const sc = s.score && s.score.scaledEstimate != null ? ` · ${s.score.scaledEstimate}` : '';
          return <option key={s.id} value={s.id}>#{n} — {date}{sc}{i === 0 ? ' (latest)' : ''}</option>;
        })}
      </select>
    </label>
  ) : null;

  return <><Analysis attempt={attempt} peer={peer} backHref="account.html" switcher={switcher} /><Footer /></>;
}

// Thin dispatcher: history/deep-link mode (?attempt=) vs. live test runner.
// Keeps hooks rules clean — neither branch conditionally calls hooks.
function TestApp() {
  const viewAttemptId = new URLSearchParams(window.location.search).get('attempt');
  if (viewAttemptId) return <PastAttemptView attemptId={viewAttemptId} />;
  return <TestRunner />;
}

// ---- Live test orchestrator ----
function TestRunner() {
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
  const [finalAttempt, setFinalAttempt] = React.useState(null); // full attempt record for the report
  const [attemptId, setAttemptId] = React.useState(null);
  const [peer, setPeer] = React.useState(null); // peer comparison (null until fetched)

  // Fetch peer comparison once the attempt is finalized. saveAttempt has already
  // folded this attempt into the aggregate, so a tiny delay lets that land first.
  React.useEffect(() => {
    if (!finalAttempt) return undefined;
    let alive = true;
    const t = setTimeout(() => {
      getPeerComparison(finalAttempt.testId, finalAttempt)
        .then((p) => { if (alive) setPeer(p); })
        .catch(() => { if (alive) setPeer({ available: false, reason: 'error' }); });
    }, 800);
    return () => { alive = false; clearTimeout(t); };
  }, [finalAttempt]);

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

  // When the test started (epoch ms) — set at begin, used for attempt duration.
  const startRef = React.useRef(null);
  // Per-module submit payloads (answers + marked + timing), kept to build the
  // full attempt record at the end. m1 stored here; m2 passed through directly.
  const m1SubmitRef = React.useRef(null);

  const begin = () => {
    const seed = (testId || 'x').split('').reduce((a, c) => a + c.charCodeAt(0), 1);
    const built = assembleTest(test, QUESTIONS, seed);
    setAssembled(built);
    startRef.current = Date.now();
    setPhase('m1');
  };

  const finishM1 = (payload) => {
    const { answers } = payload;
    m1SubmitRef.current = payload;
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
      finalize(res, null, null, qs, [], payload, null);
      setPhase('results');
    }
  };

  const finishM2 = (payload) => {
    const { answers } = payload;
    const res = scoreModule(m2Questions, answers);
    setM2Result({ ...res, questions: m2Questions, answers });
    setAnswersAll((prev) => ({ ...prev, ...answers }));
    finalize(m1Result, res, path, (assembled && assembled.assembled[0]) || [], m2Questions, m1SubmitRef.current, payload);
    setPhase('results');
  };

  // Build the full, persisted attempt record (per-question detail + timing) and
  // save it. Also keeps the lightweight lessons/test summary for the dashboard.
  const finalize = (m1, m2, p, m1Qs, m2Qs, m1Payload, m2Payload) => {
    const scaled = test.adaptive ? estimateScaledScore({ module1: m1, module2: m2 || { correct: 0, total: 0 }, path: p }) : null;

    const buildQ = (q, moduleIdx, order, payload) => {
      const ans = payload && payload.answers ? payload.answers[q.id] : undefined;
      const timing = (payload && payload.timing && payload.timing[q.id]) || {};
      const markedMap = (payload && payload.marked) || {};
      return {
        id: q.id, domain: q.domain || null, skill: q.skill || null,
        difficulty: q.difficulty || 'medium',
        module: moduleIdx, order,
        chosen: ans == null ? null : ans,
        correctAnswer: q.answer,
        timeSec: typeof timing.timeSec === 'number' ? timing.timeSec : null,
        firstAnswerSec: timing.firstAnswerSec ?? null,
        changedAnswer: !!timing.changedAnswer,
        markedForReview: !!markedMap[q.id],
      };
    };

    let order = 0;
    const questions = [];
    m1Qs.forEach((q) => questions.push(buildQ(q, 1, order++, m1Payload)));
    (m2Qs || []).forEach((q) => questions.push(buildQ(q, 2, order++, m2Payload)));

    const correct = m1.correct + (m2 ? m2.correct : 0);
    const total = m1.total + (m2 ? m2.total : 0);
    const allottedSec = test.modules.reduce((n, mod) => n + mod.minutes * 60, 0);
    const durationSec = startRef.current ? Math.round((Date.now() - startRef.current) / 1000) : null;

    const attempt = {
      testId: test.id, testTitle: test.title, kind: test.kind, adaptive: !!test.adaptive,
      module2Path: p,
      startedAt: startRef.current || null,
      finishedAt: Date.now(),
      durationSec, allottedSec,
      score: { correct, total, scaledEstimate: scaled },
      questions,
    };

    // Full attempt (history + analysis). Best-effort; never blocks the UI.
    try { saveAttempt(attempt).then((id) => { if (id) setAttemptId(id); }); } catch { /* ignore */ }
    setFinalAttempt(attempt);

    // Lightweight summary for the account dashboard tile (kept for back-compat).
    try {
      saveLessonProgress(`test:${test.id}`, {
        kind: 'test', testId: test.id, correct, total, scaled, path: p, finishedAt: Date.now(),
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
    return (
      <>
        <Analysis attempt={finalAttempt} peer={peer} />
        <Footer />
      </>
    );
  }
  return null;
}

Object.assign(window, { TestApp });
export { TestApp };
