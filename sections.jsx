// iSATPrep — page sections

const TESTIMONIALS = [
  // REPLACE WITH REAL TESTIMONIALS
  { name: "Emma T.", gain: "+130 in R&W", quote: "I used to guess on every inference question. After two weeks of this method, I was eliminating wrong answers in seconds." },
  { name: "Jackson M.", gain: "+110 in R&W", quote: "The 'math way' framing actually clicked for me. It's the only SAT prep that didn't feel like memorizing tricks." },
  { name: "Olivia R.", gain: "+150 in R&W", quote: "I went from a 580 to a 730 in Reading & Writing. The structured approach is genuinely a game changer." },
  { name: "Aanya S.", gain: "+105 in R&W", quote: "Other courses dump content on you. This one teaches a real method you actually use on test day." },
  { name: "Sophia L.", gain: "+125 in R&W", quote: "The Words in Context lessons alone were worth the subscription. I stopped second-guessing myself." },
  { name: "Noah K.", gain: "+115 in R&W", quote: "Cleanest, clearest SAT prep I've taken. Every lesson builds on the last." },
];

const TOPICS = [
  { n: 1, name: "Text Structure & Purpose", desc: "Understand how passages are built", tier: "free", href: "practice.html" },
  { n: 2, name: "Words in Context", desc: "Decode vocabulary in any passage", tier: "59" },
  { n: 3, name: "Cross-Text Connections", desc: "Compare and link multiple texts", tier: "59" },
  { n: 4, name: "Central Ideas & Details", desc: "Find the main point, fast", tier: "59" },
  { n: 5, name: "Inferences", desc: "Read between the lines with precision", tier: "59" },
  { n: 6, name: "Command of Evidence", desc: "Pick the right proof every time", tier: "59" },
  { n: 7, name: "Boundaries (Grammar)", desc: "Master punctuation and sentence structure", tier: "99" },
  { n: 8, name: "Rhetorical Synthesis & Transitions", desc: "Connect ideas seamlessly", tier: "99" },
];

const FAQS = [
  { q: "Can I cancel anytime?", a: "Yes, cancel in one click from your account page. No questions, no fees." },
  { q: "Is the free plan really free?", a: "Yes. No credit card required to start. Use it as long as you want." },
  { q: "What if my score doesn't improve?", a: "Most students see meaningful gains within 2–4 weeks of consistent practice. If you're not improving, reach out and we'll work with you." },
  { q: "How long does each lesson take?", a: "Most lessons are 15–25 minutes, plus practice. You can move at your own pace." },
  { q: "Do you offer 1-on-1 tutoring?", a: "Currently the platform is self-paced. $99/month subscribers get priority Q&A access." },
  { q: "What's the difference between $59 and $99?", a: "$59 covers the 6 Reading topics where most students need help. $99 adds the 2 Grammar/Writing topics, timed practice tests, and analytics." },
];

function TierBadge({ tier }) {
  if (tier === "free") return <span className="badge badge-free">● Free</span>;
  if (tier === "59")   return <span className="badge badge-59">$59 plan</span>;
  return <span className="badge badge-99">$99 plan</span>;
}

function Nav({ onOpenDemo }) {
  return (
    <nav className="nav">
      <div className="wrap nav-inner">
        <a href="#top" className="brand">
          <span className="brand-mark">i</span>
          <span>iSATPrep</span>
        </a>
        <div className="nav-links">
          <a href="#method">Method</a>
          <a href="topics.html">Topics</a>
          <a href="#instructor">About</a>
          <a href="#pricing">Pricing</a>
          <a href="#faq">FAQ</a>
        </div>
        <div className="nav-cta">
          <a href="login.html" className="btn btn-ghost btn-sm">Log in</a>
          <a href="signup.html" className="btn btn-primary btn-sm">Start free <ArrowRight size={14} /></a>
        </div>
      </div>
    </nav>
  );
}

function Hero({ onOpenDemo, variant }) {
  return (
    <section className={"hero" + (variant === "quiet" ? " hero-variant-quiet" : "")} id="top">
      <div className="wrap hero-grid">
        <div>
          <span className="eyebrow">Digital SAT · Reading & Writing</span>
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
          <span className="eyebrow">The problem</span>
          <h2 className="mt-2">Math feels solvable. Verbal feels like a guessing game.</h2>
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
          <span className="eyebrow">The method</span>
          <h2>A clean, structured method.<br/>Apply, don't guess.</h2>
          <p className="body-text" style={{maxWidth:"60ch"}}>
            Our framework gives you a clear approach you can use across any passage,
            regardless of genre, and a reliable way to evaluate answer choices without
            spiraling into confusion. Apply the formula, get results in seconds.
          </p>
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
          <span className="eyebrow">See it in action</span>
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
          <span className="eyebrow">Meet your instructor</span>
          <h2 className="mt-2" style={{marginBottom:32}}>Decades of teaching, distilled into one method.</h2>
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
            <span className="eyebrow">The curriculum</span>
            <h2 className="topics-cta__h">8 skills. One method. <em>Built for each one.</em></h2>
            <p className="body-text topics-cta__p">
              Every Digital SAT Reading &amp; Writing question type, mapped to a repeatable framework.
              Start with the free sample topic, or browse all 8.
            </p>
            <div className="topics-cta__btns">
              <a href="topics.html" className="btn btn-primary btn-lg">
                Browse all 8 topics <span className="btn-arrow">→</span>
              </a>
              <a href="practice.html" className="btn btn-ghost btn-lg">
                Try a free topic
              </a>
            </div>
          </div>
          <div className="topics-cta__list" aria-hidden="true">
            {TOPICS.map(t => (
              <div className="topics-cta__row" key={t.n}>
                <span className="topics-cta__num">{String(t.n).padStart(2,"0")}</span>
                <span className="topics-cta__name">{t.name}</span>
                <span className="topics-cta__badge"><TierBadge tier={t.tier} /></span>
              </div>
            ))}
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
          <span className="eyebrow">Results</span>
          <h2>Students who stopped guessing — and started scoring.</h2>
        </div>
        <div className="tcard-grid">
          {TESTIMONIALS.map((t, i) => (
            <div className="tcard" key={i}>
              <div className="top">
                <span className="who">{t.name}</span>
                <span className="gain">{t.gain}</span>
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

function PriceCard({ tier, name, price, per, tagline, features, cta, popular, planId }) {
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
    </div>
  );
}

function Pricing() {
  return (
    <section className="bg-bone" id="pricing">
      <div className="wrap">
        <div className="section-head center">
          <span className="eyebrow">Pricing</span>
          <h2>Choose your level of access.</h2>
          <p className="body-text">Cancel anytime. No hidden fees.</p>
        </div>
        <div className="price-grid">
          <PriceCard
            tier="Tier 01"
            name="Free"
            price="0"
            per="forever"
            tagline="Taste the method."
            cta="Start free"
            planId="free"
            features={[
              { text: "Topic 2: Text Structure & Purpose (sample access)" },
              { text: "4 sample practice questions with full explanations" },
              { text: "Method overview video" },
              { text: "All other topics locked", no: true },
              { text: "Full question bank locked", no: true },
              { text: "Progress tracking", no: true },
            ]}
          />
          <PriceCard
            tier="Tier 02"
            name="Core"
            price="59"
            per="/ month"
            tagline="Core mastery — everything you need for the Reading section."
            cta="Start 7-day free trial"
            popular
            planId="core"
            features={[
              { text: "Everything in Free" },
              { text: "All Reading topics fully unlocked (Topics 1–6)" },
              { text: "Full lesson library for 6 topics" },
              { text: "Complete practice question bank for 6 topics" },
              { text: "Progress tracking & dashboard" },
              { text: "Writing/Grammar topics (Topics 7–8) locked", no: true },
              { text: "Timed full-section practice", no: true },
            ]}
          />
          <PriceCard
            tier="Tier 03"
            name="Complete"
            price="99"
            per="/ month"
            tagline="The full prep experience for top scores."
            cta="Get complete access"
            planId="complete"
            features={[
              { text: "Everything in Core" },
              { text: "All 8 topics fully unlocked" },
              { text: "Writing & Grammar lessons (Boundaries, Rhetorical Synthesis)" },
              { text: "Timed full-section practice tests" },
              { text: "Score-tracking analytics dashboard" },
              { text: "Priority Q&A support" },
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
          <span className="eyebrow">Questions & answers</span>
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
        <span className="eyebrow" style={{color:"rgba(26,18,5,0.55)"}}>Ready to begin</span>
        <h2 className="mt-2">Ready to do English the math way?</h2>
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
            <a href="#">Twitter / X</a>
            <a href="#">Instagram</a>
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
  if (!open) return null;
  React.useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e)=>e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>ESC · close ✕</button>
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

function Walkthroughs() {
  const videos = [
    { id: "z3ZQ-9Cn8TE", kicker: "Walkthrough · 01", title: "Apply the formula, eliminate cleanly", desc: "Shipra walks through a Reading question end-to-end using the method." },
    { id: "z3FHqo26uL0", kicker: "Walkthrough · 02", title: "Predict, then match — every time", desc: "A second question type, solved with the same repeatable framework." },
  ];
  return (
    <section id="walkthroughs">
      <div className="wrap">
        <div className="section-head">
          <span className="eyebrow">Solution walkthroughs</span>
          <h2>Watch the method, applied.</h2>
          <p className="body-text" style={{maxWidth:"60ch"}}>
            Two real SAT R&W questions, solved on camera using the framework — narrated by Shipra.
          </p>
        </div>
        <div className="walkthroughs">
          {videos.map(v => (
            <a key={v.id} className="walk-card" href={`https://www.youtube.com/watch?v=${v.id}`} target="_blank" rel="noopener noreferrer">
              <div className="walk-vid">
                <img src={`https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`} alt={v.title} loading="lazy" />
                <div className="walk-play"><PlayIcon size={32} /></div>
                <div className="walk-yt">
                  <svg width="14" height="10" viewBox="0 0 28 20" fill="none"><path d="M27.4 3.1c-.3-1.2-1.3-2.2-2.5-2.5C22.6 0 14 0 14 0S5.4 0 3.1.6C1.9.9.9 1.9.6 3.1 0 5.4 0 10 0 10s0 4.6.6 6.9c.3 1.2 1.3 2.2 2.5 2.5C5.4 20 14 20 14 20s8.6 0 10.9-.6c1.2-.3 2.2-1.3 2.5-2.5C28 14.6 28 10 28 10s0-4.6-.6-6.9z" fill="#FF0000"/><path d="M11.2 14.3l7.2-4.3-7.2-4.3v8.6z" fill="#fff"/></svg>
                  <span>YouTube</span>
                </div>
              </div>
              <div className="walk-meta">
                <span className="kicker">{v.kicker}</span>
                <h3>{v.title}</h3>
                <p>{v.desc}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { Nav, Hero, Problem, Method, Demo, Walkthroughs, Instructor, Topics, TopicsCTA, Testimonials, Pricing, FAQ, FinalCTA, Footer, VideoModal, TierBadge });
