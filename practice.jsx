// Practice page for "Text Structure & Purpose" — 4 unlocked questions + 96 locked.

const QUESTIONS = [
  {
    id: 1,
    title: "Question 1 · Text Structure",
    passage: "The following text is from Charlotte Perkins Gilman's 1892 short story \"The Yellow Wallpaper.\" The narrator, who has recently given birth, is describing the bedroom in which her physician husband has confined her for a \"rest cure.\"\n\nIt is the strangest yellow, that wall-paper! It makes me think of all the yellow things I ever saw — not beautiful ones like buttercups, but old foul, bad yellow things. ||But there is something else about that paper — the smell!|| ... The only thing I can think of that it is like is the color of the paper! A yellow smell.",
    prompt: "Which choice best describes the function of the underlined sentence in the text as a whole?",
    choices: [
      { k: "A", text: "It introduces a new aspect of the wallpaper that the narrator finds appealing despite her earlier criticisms." },
      { k: "B", text: "It marks a shift from describing the wallpaper's visual qualities to describing a sensory perception that intensifies her fixation." },
      { k: "C", text: "It establishes the narrator's growing confidence in her ability to interpret her surroundings rationally." },
      { k: "D", text: "It contrasts the narrator's earlier observations with her husband's clinical assessment of the room." },
    ],
    answer: "B",
    explanation: "The underlined sentence — \"But there is something else about that paper — the smell!\" — pivots from the narrator's prior **visual** description (\"the strangest yellow,\" \"foul, bad yellow things\") to a new **olfactory** preoccupation (\"a yellow smell\"). This is a structural transition: it doesn't soften her view (eliminating A), doesn't show rational interpretation (eliminating C), and her husband isn't referenced (eliminating D). Choice **B** correctly identifies the sentence as marking a shift in sensory mode that deepens her obsession.",
    method: [
      "Locate the underlined sentence and identify what comes before and after it.",
      "Before: visual description of the wallpaper's color. After: description of its smell.",
      "Predict: 'transitions from sight to smell.'",
      "Match prediction to the choice that names the same shift — B.",
    ],
  },
  {
    id: 2,
    title: "Question 2 · Purpose",
    passage: "Many archaeologists studying the early agricultural settlements of the Levant have argued that the shift to farming brought a decline in human health: skeletal remains from this period show evidence of nutritional deficiencies and increased disease. Anthropologist Marta Mirazón Lahr, however, contends that these conclusions rely on a narrow sample. In her 2019 review, Mirazón Lahr points to recent excavations in regions overlooked by earlier studies, where remains show no such decline — and in some cases, improved health markers.",
    prompt: "What is the main purpose of the text?",
    choices: [
      { k: "A", text: "To argue that early farming communities were healthier than hunter-gatherer populations." },
      { k: "B", text: "To summarize a researcher's challenge to a prevailing claim about early agriculture." },
      { k: "C", text: "To describe the methods used in a recent archaeological excavation." },
      { k: "D", text: "To explain why nutritional deficiencies were common in early farming settlements." },
    ],
    answer: "B",
    explanation: "The text sets up a prevailing view (\"shift to farming brought a decline in human health\") and then introduces Mirazón Lahr's counter (\"these conclusions rely on a narrow sample\"). The text's job is to **report her challenge**, not to settle the argument. A overstates — the text doesn't claim farming was healthier, only that the decline isn't universal. C is off-topic. D restates the claim being challenged.",
    method: [
      "Find the structure: claim → counter-claim.",
      "Predict the purpose: 'present a researcher pushing back on a common view.'",
      "Pick the choice that names that move — B.",
    ],
  },
  {
    id: 3,
    title: "Question 3 · Text Structure",
    passage: "When a star roughly eight times the mass of the Sun exhausts its nuclear fuel, gravity overwhelms the outward pressure that once held the star in equilibrium. The core collapses in seconds. As infalling matter rebounds off the now ultra-dense core, a shock wave tears outward — and the star, in a final paroxysm, becomes a supernova. What remains is no longer a star at all, but a neutron star: a city-sized sphere with the mass of the Sun.",
    prompt: "Which choice best describes the overall structure of the text?",
    choices: [
      { k: "A", text: "It compares two competing theories about how massive stars die." },
      { k: "B", text: "It outlines a sequence of events that transforms a massive star into a neutron star." },
      { k: "C", text: "It defines a scientific term and then provides examples of that term in use." },
      { k: "D", text: "It poses a question about stellar evolution and answers it with observational data." },
    ],
    answer: "B",
    explanation: "The text is a **chronological cause-and-effect chain**: fuel exhausted → gravity wins → core collapses → shock wave → supernova → neutron star. Each sentence advances the timeline. A is wrong — only one account is given. C is wrong — no term is formally defined first. D is wrong — there's no question posed.",
    method: [
      "Read the text and ask: is it list, contrast, sequence, or definition?",
      "Watch the verbs: 'exhausts → collapses → rebounds → tears outward → becomes.' That's a sequence.",
      "Predict: 'a chain of events.'",
      "Choose the option that names a sequence — B.",
    ],
  },
  {
    id: 4,
    title: "Question 4 · Purpose",
    passage: "In her 2021 essay \"On Repair,\" the writer Aisha Sabatini Sloan argues that the act of repairing a broken object is rarely just about restoring its function. Mending, she suggests, is also a form of attention — a slow refusal to discard. Her essay opens with the image of her grandmother darning a sock, the needle moving \"like a small animal returning home.\"",
    prompt: "Which choice best states the main purpose of the text?",
    choices: [
      { k: "A", text: "To describe the techniques Sabatini Sloan recommends for mending textiles." },
      { k: "B", text: "To trace the history of the essay form in twenty-first-century writing." },
      { k: "C", text: "To introduce a writer's central claim about the meaning of repair." },
      { k: "D", text: "To compare Sabatini Sloan's essay to a similar work by another writer." },
    ],
    answer: "C",
    explanation: "The text exists to summarize **what Sabatini Sloan argues** (\"repair is rarely just about restoring function\" / \"a form of attention\") and to give one illustrative image. That's an introduction of a claim — answer **C**. A is too literal — no techniques are described. B is off-topic. D is wrong — no comparison is made.",
    method: [
      "Identify the subject: a writer's essay.",
      "Identify what's said about it: her central argument.",
      "Predict: 'sets up the writer's main claim.'",
      "Match — C.",
    ],
  },
];

// ============================================================

function PracticeNav() {
  return (
    <nav className="nav">
      <div className="wrap nav-inner">
        <a href="index.html" className="brand">
          <span className="brand-mark">i</span>
          <span>iSATPrep</span>
        </a>
        <div className="nav-links">
          <a href="index.html#topics">Topics</a>
          <a href="index.html#pricing">Pricing</a>
          <a href="index.html#faq">FAQ</a>
        </div>
        <div className="nav-cta">
          <a href="index.html" className="btn btn-ghost btn-sm">← Back to home</a>
          <a href="index.html#pricing" className="btn btn-primary btn-sm">Upgrade</a>
        </div>
      </div>
    </nav>
  );
}

function TopicHeader({ unlocked, total }) {
  const pct = Math.round((unlocked / total) * 100);
  return (
    <section style={{padding:"3.5rem 0 2rem"}}>
      <div className="wrap">
        <a href="index.html#topics" style={{fontFamily:"var(--mono)", fontSize:12, color:"var(--ink-soft)", letterSpacing:"0.06em", textTransform:"uppercase"}}>← All topics</a>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-end", gap:32, marginTop:18, flexWrap:"wrap"}}>
          <div style={{flex:"1 1 480px"}}>
            <span className="eyebrow">Topic 02 · Free sample</span>
            <h1 style={{fontSize:"clamp(36px,4.4vw,56px)", marginTop:14, lineHeight:1.05}}>Text Structure & Purpose</h1>
            <p className="body-text" style={{marginTop:14, maxWidth:"56ch"}}>
              Understand how passages are built — claim, evidence, qualifier, transition.
              Apply the method, predict the answer, eliminate the rest. {unlocked} questions are unlocked for free practice.
            </p>
          </div>
          <div className="progress-card">
            <div className="progress-stat">
              <span className="progress-num">{unlocked}<span className="progress-denom">/{total}</span></span>
              <span className="progress-label">Questions unlocked</span>
            </div>
            <div className="progress-bar"><div className="progress-fill" style={{width: pct + "%"}}/></div>
            <a href="index.html#pricing" className="btn btn-primary btn-sm btn-block" style={{marginTop:14}}>Unlock all {total} →</a>
          </div>
        </div>
      </div>
    </section>
  );
}

function LockIcon({size=14}) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <rect x="2.5" y="6" width="9" height="6.5" rx="1.2" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M4.5 6V4.2C4.5 2.8 5.6 1.7 7 1.7C8.4 1.7 9.5 2.8 9.5 4.2V6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

function QuestionCard({ q, idx }) {
  const [phase, setPhase] = React.useState("idle"); // idle | attempting | submitted | reviewing
  const [pick, setPick] = React.useState(null);
  const [playing, setPlaying] = React.useState(false);
  const [audioErr, setAudioErr] = React.useState(false);
  const audioRef = React.useRef(null);

  const correct = pick === q.answer;
  const passageParas = q.passage.split("\n\n");

  const audioSrc = `audio/q${q.id}.mp3`;

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    setAudioErr(false);
    if (a.paused) {
      const p = a.play();
      if (p && p.catch) {
        p.catch((err) => {
          // NotAllowedError = user gesture / autoplay block; ignore — they clicked, so it should work next try
          if (err && err.name !== "AbortError") {
            console.warn("audio play error:", err);
            setAudioErr(true);
          }
        });
      }
    } else {
      a.pause();
    }
  };

  return (
    <article className={"qcard " + (phase==="reviewing" ? "qcard-review" : "")}>
      <header className="qcard-head">
        <div>
          <span className="qcard-num">{String(q.id).padStart(2,"0")} / 100</span>
          <h2 className="qcard-title">{q.title}</h2>
        </div>
        {phase === "submitted" && (
          <span className={"qcard-verdict " + (correct ? "ok" : "no")}>
            {correct ? "✓ Correct" : "✗ Try the explanation"}
          </span>
        )}
      </header>

      {phase === "idle" && (
        <div className="qcard-idle">
          <p className="qcard-preview">
            {passageParas[0].slice(0, 180)}{passageParas[0].length > 180 ? "…" : ""}
          </p>
          <button className="btn btn-primary btn-lg" onClick={() => setPhase("attempting")}>
            Attempt question <span className="btn-arrow">→</span>
          </button>
        </div>
      )}

      {phase !== "idle" && (
        <div className="qcard-body">
          <div className="qcard-passage">
            <span className="kicker">Passage</span>
            {passageParas.map((p, i) => {
              // Render ||text|| as underlined spans
              const parts = p.split(/(\|\|[^|]+\|\|)/g);
              return (
                <p key={i}>
                  {parts.map((seg, j) => {
                    if (seg.startsWith("||") && seg.endsWith("||")) {
                      return <span key={j} className="passage-underline">{seg.slice(2, -2)}</span>;
                    }
                    return <React.Fragment key={j}>{seg}</React.Fragment>;
                  })}
                </p>
              );
            })}
          </div>
          <div className="qcard-question">
            <span className="kicker">Question</span>
            <p className="prompt">{q.prompt}</p>
            <div className="choices">
              {q.choices.map(c => {
                const chosen = pick === c.k;
                const isAnswer = c.k === q.answer;
                const showRight = phase !== "attempting" && isAnswer;
                const showWrong = phase !== "attempting" && chosen && !isAnswer;
                return (
                  <button
                    key={c.k}
                    className={"choice" + (chosen ? " chosen" : "") + (showRight ? " right" : "") + (showWrong ? " wrong" : "")}
                    disabled={phase !== "attempting"}
                    onClick={() => setPick(c.k)}
                  >
                    <span className="choice-key">{c.k}</span>
                    <span className="choice-text">{c.text}</span>
                  </button>
                );
              })}
            </div>

            {phase === "attempting" && (
              <div className="qcard-actions">
                <button className="btn btn-outline" onClick={() => { setPick(null); setPhase("idle"); }}>Cancel</button>
                <button className="btn btn-primary" disabled={!pick} onClick={() => setPhase("submitted")}>
                  Submit answer <span className="btn-arrow">→</span>
                </button>
              </div>
            )}

            {phase === "submitted" && (
              <div className="qcard-actions">
                <button className="btn btn-primary btn-lg" onClick={() => setPhase("reviewing")}>
                  Review for Detailed Explanation <span className="btn-arrow">→</span>
                </button>
              </div>
            )}
          </div>

          {phase === "reviewing" && (
            <div className="qcard-explain">
              <span className="kicker">Detailed explanation</span>
              <div className="explain-correct">
                <span className="badge-correct">Correct answer · {q.answer}</span>
              </div>
              <p>{q.explanation}</p>

              <div className="method-block">
                <span className="kicker">Method, applied</span>
                <ol className="method-steps">
                  {q.method.map((s, i) => <li key={i}>{s}</li>)}
                </ol>
              </div>

              <div className="explain-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => { setPick(null); setPhase("idle"); if(audioRef.current){audioRef.current.pause(); audioRef.current.currentTime=0;} setPlaying(false); }}>Close</button>
                <button className="btn btn-primary btn-sm" onClick={togglePlay}>
                  {playing ? (
                    <><svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><rect x="2" y="2" width="3" height="8" rx="0.5"/><rect x="7" y="2" width="3" height="8" rx="0.5"/></svg> Pause audio</>
                  ) : (
                    <><svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M3 2L10 6L3 10V2Z"/></svg> Explain it further</>
                  )}
                </button>
              </div>

              <audio
                ref={audioRef}
                src={audioSrc}
                preload="none"
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => setPlaying(false)}
                style={{display:"none"}}
              />
              {audioErr && (
                <p style={{fontFamily:"var(--mono)", fontSize:11, color:"var(--ink-soft)", letterSpacing:"0.04em", marginTop:8, marginBottom:0}}>
                  ⓘ Audio could not be played. Please try again.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function LockedRail() {
  // 96 placeholders, in groups of 4
  const items = Array.from({length: 96}, (_, i) => i + 5);
  return (
    <section className="locked-section">
      <div className="wrap">
        <div className="locked-head">
          <div>
            <span className="eyebrow" style={{color:"var(--ink-soft)"}}>96 questions locked</span>
            <h2 style={{marginTop:10}}>Unlock the full bank.</h2>
            <p className="body-text" style={{maxWidth:"54ch", marginTop:8}}>
              The free sample is just the start. Unlock 96 more graded practice questions across structure, purpose, and transitions.
            </p>
          </div>
          <a href="index.html#pricing" className="btn btn-primary btn-lg">Upgrade to unlock <span className="btn-arrow">→</span></a>
        </div>

        <div className="locked-grid">
          {items.map(n => (
            <div className="locked-tile" key={n}>
              <span className="locked-num">{String(n).padStart(2,"0")}</span>
              <span className="locked-icon"><LockIcon size={14}/></span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PracticeApp() {
  return (
    <div data-screen-label="Practice · Text Structure & Purpose">
      <PracticeNav />
      <TopicHeader unlocked={4} total={100}/>
      <section style={{padding:"1rem 0 5rem"}}>
        <div className="wrap" style={{maxWidth:980}}>
          <div className="qlist">
            {QUESTIONS.map((q, i) => <QuestionCard key={q.id} q={q} idx={i}/>)}
          </div>
        </div>
      </section>
      <LockedRail/>
      <Footer/>
    </div>
  );
}

Object.assign(window, { PracticeApp });
