# LMS Design Language — Handoff Doc

> Paste this entire document into your LMS project's chat context (Claude / GPT / Cursor / etc.). It is self-contained: another LLM does not need access to any source repo to apply it. Every value, rule, and example below is concrete and load-bearing.

---

## 0. How to use this document

When you (the receiving LLM) build, edit, or review LMS UI, you must:

1. **Treat the design tokens in §3 as the single source of truth.** Use the CSS variables, never hex codes inline.
2. **Write copy that passes the voice tests in §2.** If a sentence sounds like SaaS marketing, rewrite it.
3. **Build components from the patterns in §7 and §8**, not from generic Tailwind/Bootstrap defaults.
4. **Refuse the anti-patterns in §9.** They are listed because they were tried and explicitly removed.

If a request would violate the rules above, push back and propose an alternative that fits.

---

## 1. The brand thesis

The product teaches with **a structured method, a repeatable formula, and rigorous reasoning.** Every visual and verbal choice should reinforce one feeling: **calm, structured, methodical, applied.**

Think *editorial textbook written by a respected teacher*, not *SaaS landing page*. Not playful, not corporate-energetic, not gamified. Confident, quiet, and useful.

The aesthetic anchors:

- **Bone-cream canvas, not pure white.** White is harsh; cream reads as paper.
- **Navy as accent, not slabs.** A wall of navy breaks the airy feel.
- **Amber as a single spotlight.** One amber thing per screen — usually the primary CTA or one italicized word.
- **Fraunces serif italic for emotional emphasis.** Set in amber, used on the *one* word per sentence that carries the meaning.
- **Generous whitespace.** When in doubt, add space, not decoration.

---

## 2. Voice & tone

### Posture

Confident, editorial, instructive. A teacher who respects you and assumes you can think.

### Cadence

One strong line, then one quieter line that explains it. Short, declarative sentences. Never paragraphs of marketing prose.

### Verbs we use

apply, eliminate, predict, structure, frame, walk through, master, practice, review, resume.

### Nouns we use

method, framework, formula, structure, lesson, module, question, passage, claim, evidence, progress.

### Italic-for-emphasis rule

When you want to emphasize one word, render it as `<em>word</em>` and let CSS style it (Fraunces italic, amber-deep, weight 500). **Never italicize a whole sentence.** The italic word should be the carrying word — the one that flips the meaning.

Examples:

- "The method is *waiting*."
- "Pick any *4* modules to master."
- "*47* of 100 done."
- "Apply the *formula*. Get results in seconds."

### Do say

- "Apply the formula. Get results in seconds."
- "Pick up where you left off."
- "Master four modules. Then pick more."
- "Watch the method, applied."
- "Resume Question 24."
- "4 free questions in each module."

### Don't say

- ❌ "Revolutionary AI-powered learning"
- ❌ "Unlock your potential!"
- ❌ "Join thousands of happy students"
- ❌ "Supercharge your study"
- ❌ "Transform your learning journey"
- ❌ Any sentence with "elevate," "empower," "unleash"
- ❌ More than one exclamation mark anywhere on a page (and ideally zero in body copy)
- ❌ All-caps shouting in headlines

### LMS-specific voice examples

| Context | Bad | Good |
|---|---|---|
| Empty dashboard | "You haven't started any courses yet! 🎉" | "Nothing started yet. Pick a module below." |
| Module locked | "🔒 Premium content!" | "Locked. Pick this module on Core to unlock its 100 questions." |
| Wrong answer | "Oops! Try again 😢" | "Not quite. Here's why — and the method that gets it right." |
| Right answer | "Awesome job!! 🎊" | "Correct. Here's how the method gets there." |
| Resume CTA | "Continue learning →" | "Resume Question 24 →" |
| Course completed | "Congratulations, you crushed it!" | "Module 03 done. 7 to go." |
| Loading | "Loading awesome content..." | "Loading…" |
| Error | "Something went wrong, please try again later" | "We couldn't load that. Refresh, or try again in a minute." |
| Onboarding hello | "Welcome to your learning journey!" | "Welcome back, *Aanya*." |

---

## 3. Design tokens

Drop this exact block into your stylesheet's `:root`. These are the only colors, fonts, and spacing values you should use.

```css
:root {
  /* COLORS */
  --navy:        #152647;  /* primary brand — headlines, brand mark, outline buttons */
  --navy-2:      #0F1E3D;  /* deep accent — feature panel backgrounds */
  --navy-3:      #1B2D52;  /* deep accent gradient stop */
  --amber:       #F59E0B;  /* action color — primary CTA bg, italic emphasis (light bg) */
  --amber-deep:  #C97A05;  /* hover state, italic emphasis text on light bg */
  --bg:          #FAFAF7;  /* page background — bone/cream, NOT pure white */
  --bg-2:        #F4F2EC;  /* alt section bg — for breaking long pages without slabs */
  --rule:        #E5E2D8;  /* hairline rules, card borders */
  --ink:         #1F2937;  /* default body text */
  --ink-soft:    #4B5563;  /* secondary copy, captions */
  --muted:       #9CA3AF;  /* faded — footer, hints, lowest tier */

  /* TYPE */
  --serif: "Fraunces", "Source Serif 4", Georgia, serif;
  --sans:  "Source Sans 3", "Inter", system-ui, sans-serif;
  --mono:  "JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace;

  /* LAYOUT */
  --pad-y: 7rem;          /* vertical padding per section */
  --maxw: 1240px;         /* container max width */
}
```

### Color rules

- **Navy is an accent, not a wall.** A full-bleed navy section is heavy. To anchor visual weight, use `--bg-2` (bone alt) plus a hairline rule. Use a deep navy gradient (`--navy-2` → `--navy-3`) only for one rare *featured* element per page (e.g., a featured module hero).
- **Amber is a spotlight.** One amber element per screen — the primary CTA, or one italicized word. If two things are amber, neither is.
- **No gradients except the navy feature gradient.** No glows. No glassmorphism. No drop shadows except a gentle button lift: `0 8px 22px -10px rgba(217, 119, 6, 0.55)` on primary button hover, and a softer `0 24px 60px -38px rgba(15,30,61,0.18)` on cards that need elevation.
- **Status colors** (use sparingly):
  - Success / "done": text `#0F7A3D` or `#047857`, bg `#ECFDF5`, border `#A7F3D0`.
  - Error / "wrong": text `#B91C1C`, bg `#FEF2F2`, border `#EF4444`.
  - Warning / "current": use `--amber-deep` text on bg `#FFF8EC` with border `#F5D9A0`.

---

## 4. Typography

Three faces, loaded from Google Fonts in every page `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Source+Sans+3:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### Roles

| Family | Variable | Role |
|---|---|---|
| **Fraunces** (variable serif) | `--serif` | All headlines `h1`–`h4`, pull quotes, italic emphasis, large display copy. Use `font-variation-settings: "SOFT" 30, "WONK" 0` for a warmer cut. |
| **Source Sans 3** | `--sans` | Body copy, buttons, form fields, navigation. |
| **JetBrains Mono** | `--mono` | Small uppercase labels, kickers, captions, badges, code-feel accents. Always letter-spaced `0.06em–0.18em`, all caps unless it's a number. |

### Hierarchy (exact)

```css
body { font-family: var(--sans); font-size: 17px; line-height: 1.55; color: var(--ink); background: var(--bg); }
h1,h2,h3,h4 { font-family: var(--serif); color: var(--navy); margin: 0; font-weight: 500; letter-spacing: -0.015em; text-wrap: balance; }
h1 { font-size: clamp(44px, 6.2vw, 84px); line-height: 1.02; letter-spacing: -0.03em; font-weight: 400; }
h2 { font-size: clamp(32px, 3.8vw, 52px); line-height: 1.06; letter-spacing: -0.02em; }
h3 { font-size: clamp(22px, 2vw, 28px); line-height: 1.15; }
p  { margin: 0 0 1em; text-wrap: pretty; }
```

### Type rules

- **Headlines: `text-wrap: balance;`** — prevents orphan words on multi-line headlines.
- **Body: `text-wrap: pretty;`** — softens hyphenation and rivers.
- **Italic is always Fraunces italic, weight 500, color `--amber-deep`.** Wrap the carrying word in `<em>`. CSS:
  ```css
  em { font-style: italic; font-family: var(--serif); color: var(--amber-deep); font-weight: 500; }
  ```
- **Mono labels are short** — 1–4 words. Used for kickers (`MODULE 03`), badges (`FREE`), pills (`24/100`), and caption metadata.
- **Body max-width is ~60ch.** Never let prose stretch the full container.
- **No eyebrow labels above section headlines.** They were removed because they distract before the headline lands. Don't reintroduce them.

### Reusable text utility classes

```css
.serif  { font-family: var(--serif); font-optical-sizing: auto; font-variation-settings: "SOFT" 30, "WONK" 0; }
.mono   { font-family: var(--mono); letter-spacing: -0.01em; }
.muted  { color: var(--ink-soft); }
.lead   { font-size: clamp(20px, 1.6vw, 24px); line-height: 1.45; color: var(--ink); font-family: var(--serif); font-weight: 400; }
.body-text { color: var(--ink-soft); font-size: 17px; }
.kicker { font-family: var(--mono); font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--amber-deep); display: inline-block; margin-bottom: 10px; }
```

---

## 5. Layout & rhythm

- **Container:** `.wrap { max-width: 1240px; margin: 0 auto; padding: 0 32px; }` (drops to `24px` side padding on narrow viewports).
- **Vertical section padding:** `7rem` top and bottom. Generous. Don't compress.
- **Two-column splits:** `1fr 1fr` or `1.4fr 1fr` depending on which side carries the headline. Gap is `48–80px`.
- **Section background alternation:** Default is `--bg`. To break long pages, use `.bg-bone` (which sets `background: var(--bg-2)` plus hairline rules top and bottom). Avoid full-bleed navy.
- **Density modifiers:** Optionally support `body.density-compact { --pad-y: 5rem; }` and `body.density-comfy { --pad-y: 9rem; }` for power users.

```css
.wrap { max-width: var(--maxw); margin: 0 auto; padding: 0 32px; }
section { padding: var(--pad-y) 0; }
.rule { border: 0; border-top: 1px solid var(--rule); margin: 0; }
.bg-bone { background: var(--bg-2); border-top: 1px solid var(--rule); border-bottom: 1px solid var(--rule); }
```

---

## 6. Buttons

```css
.btn {
  display: inline-flex; align-items: center; gap: 8px;
  font-family: var(--sans); font-size: 15px; font-weight: 600;
  padding: 12px 22px; border-radius: 8px; cursor: pointer;
  transition: transform .12s ease, box-shadow .15s ease, background .15s, border-color .15s;
  border: 1px solid transparent;
  white-space: nowrap;
}
.btn-primary { background: var(--amber); color: #1a1205; border-color: var(--amber); }
.btn-primary:hover { background: var(--amber-deep); border-color: var(--amber-deep); color: #fff; transform: translateY(-1px); box-shadow: 0 8px 22px -10px rgba(217, 119, 6, 0.55); }
.btn-outline { background: transparent; color: var(--navy); border-color: var(--navy); }
.btn-outline:hover { background: var(--navy); color: #fff; }
.btn-ghost  { background: transparent; color: var(--navy); border-color: var(--rule); }
.btn-ghost:hover { border-color: var(--navy); }
.btn-sm     { font-size: 13px; padding: 8px 14px; }
.btn-lg     { font-size: 17px; padding: 16px 28px; }
.btn-block  { width: 100%; justify-content: center; }
.btn-arrow  { display: inline-block; transition: transform .15s ease; }
.btn:hover .btn-arrow { transform: translateX(3px); }
```

**Usage rule:** One `.btn-primary` per visible page area. Secondary actions are `.btn-outline` or `.btn-ghost`. Primary CTAs include the right-shifting arrow:

```html
<a href="..." class="btn btn-primary">Resume Question 24 <span class="btn-arrow">→</span></a>
```

---

## 7. Core components

### Nav (sticky, translucent)

```css
.nav {
  position: sticky; top: 0; z-index: 50;
  background: rgba(250, 250, 247, 0.82);
  backdrop-filter: saturate(180%) blur(14px);
  -webkit-backdrop-filter: saturate(180%) blur(14px);
  border-bottom: 1px solid var(--rule);
}
.nav-inner { display: flex; align-items: center; justify-content: space-between; height: 64px; }
.nav-links { display: flex; gap: 28px; align-items: center; font-size: 14px; color: var(--ink-soft); }
.nav-links a:hover { color: var(--navy); }
@media (max-width: 800px) { .nav-links { display: none; } }
```

### Brand mark

A 28px navy-bordered rounded square with a lowercase `i` (or your product's initial) in mono, plus an amber dot in the bottom-right corner. Always paired with the wordmark in Fraunces, weight 500.

```css
.brand { display: flex; align-items: center; gap: 10px; font-family: var(--serif); color: var(--navy); font-size: 20px; font-weight: 500; letter-spacing: -0.01em; }
.brand-mark {
  width: 28px; height: 28px;
  border: 1.5px solid var(--navy); border-radius: 6px;
  display: grid; place-items: center;
  color: var(--navy); font-family: var(--mono); font-size: 12px; font-weight: 600;
  background: var(--bg);
  position: relative;
}
.brand-mark::after {
  content: ""; position: absolute; right: -3px; bottom: -3px;
  width: 8px; height: 8px; background: var(--amber); border-radius: 1px;
}
```

### Section header

```html
<header class="section-head">
  <h2>Master four modules. <em>Then</em> pick more.</h2>
  <p class="body-text">Every module is 100 questions, structured by topic, with the method applied in every explanation.</p>
</header>
```

```css
.section-head { display: flex; flex-direction: column; gap: 14px; margin-bottom: 56px; max-width: 760px; }
.section-head.center { align-items: center; text-align: center; margin-left: auto; margin-right: auto; }
```

**No mono label above the headline.** The headline carries itself.

### Cards (generic)

```css
.card {
  background: var(--bg); border: 1px solid var(--rule); border-radius: 14px;
  padding: 28px; transition: border-color .15s, transform .15s, box-shadow .15s;
}
.card:hover { border-color: var(--navy); transform: translateY(-3px); box-shadow: 0 18px 40px -22px rgba(15, 30, 61, 0.35); }
```

### Badges

```css
.badge {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: var(--mono); font-size: 11px; letter-spacing: 0.06em;
  padding: 5px 9px; border-radius: 999px; border: 1px solid var(--rule); background: var(--bg);
  color: var(--ink-soft); font-weight: 500; text-transform: uppercase;
  white-space: nowrap;
}
.badge-free { color: var(--amber-deep); border-color: #F5D9A0; background: #FFF8EC; }
.badge-pro  { color: #fff; border-color: var(--navy); background: var(--navy); }
.badge-tier { color: var(--navy); border-color: #C9D2E5; background: #EDF1F9; }
```

### Pull quote

```css
.pullquote {
  border-left: 3px solid var(--amber);
  padding: 18px 0 18px 24px;
  margin: 32px 0;
  font-family: var(--serif); font-size: clamp(22px, 2vw, 28px); line-height: 1.25;
  color: var(--navy); font-weight: 500; letter-spacing: -0.01em;
}
```

### FAQ accordion

```css
.faq-item { border-bottom: 1px solid var(--rule); }
.faq-item:first-child { border-top: 1px solid var(--rule); }
.faq-q {
  width: 100%; background: transparent; border: 0; cursor: pointer;
  display: flex; justify-content: space-between; align-items: center; gap: 24px;
  padding: 24px 4px; text-align: left;
  font-family: var(--serif); font-size: 20px; color: var(--navy); font-weight: 500;
  letter-spacing: -0.01em;
}
.faq-q:hover { color: var(--amber-deep); }
.faq-q .plus {
  width: 28px; height: 28px; border-radius: 999px; border: 1px solid var(--rule);
  display: grid; place-items: center; flex-shrink: 0;
  transition: transform .25s ease, background .15s, border-color .15s;
  color: var(--navy);
}
.faq-item.open .faq-q .plus { transform: rotate(45deg); background: var(--navy); color: #fff; border-color: var(--navy); }
.faq-a { max-height: 0; overflow: hidden; transition: max-height .35s ease, padding .25s ease; color: var(--ink-soft); font-size: 16px; line-height: 1.6; }
.faq-item.open .faq-a { max-height: 240px; padding: 0 4px 24px; }
```

### Footer

Footer is the **only** place navy is full-bleed. Use it as a quiet endpoint — never as a content area.

```css
footer { background: var(--navy); color: rgba(232, 236, 244, 0.7); padding: 56px 0 32px; }
footer h4 { font-family: var(--mono); font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: rgba(255, 255, 255, 0.5); font-weight: 500; margin-bottom: 14px; }
.foot-grid { display: grid; grid-template-columns: 1.4fr 1fr 1fr 1fr; gap: 48px; padding-bottom: 48px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); }
.foot-grid a { display: block; padding: 6px 0; font-size: 14px; }
.foot-grid a:hover { color: #fff; }
.foot-bottom { display: flex; justify-content: space-between; align-items: center; padding-top: 24px; font-size: 13px; flex-wrap: wrap; gap: 16px; }
```

---

## 8. LMS-specific component patterns

These are the patterns to use for the actual learning surfaces. Build from these, not from generic dashboard templates.

### 8.1 Dashboard greeting hero

```html
<section class="lms-hero">
  <div class="wrap">
    <h1 class="lms-hero__h">Welcome back, <em>Aanya</em>.</h1>
    <p class="lms-hero__sub">Pick four modules. Master them. Then pick more.</p>
  </div>
</section>
```

```css
.lms-hero { padding: 42px 0 12px; }
.lms-hero__h { font-family: var(--serif); font-size: clamp(34px, 4.5vw, 56px); line-height: 1.05; color: var(--navy); font-weight: 500; letter-spacing: -0.015em; margin: 0; }
.lms-hero__h em { font-style: italic; font-family: var(--serif); color: var(--amber-deep); font-weight: 500; }
.lms-hero__sub { font-size: 18px; color: var(--ink-soft); margin: 14px 0 0; max-width: 60ch; }
```

### 8.2 Continue card ("resume where you left off")

A single horizontal card pinned near the top of the dashboard. The whole card is the affordance.

```html
<div class="continue-card">
  <div class="continue-card__left">
    <span class="mono continue-card__kicker">Pick up where you left off</span>
    <div class="continue-card__title">Words in Context</div>
    <div class="continue-card__pos">Module 02 · Question 24</div>
  </div>
  <a href="..." class="btn btn-primary btn-lg">Resume Question 24 <span class="btn-arrow">→</span></a>
</div>
```

```css
.continue-card {
  display: flex; align-items: center; justify-content: space-between; gap: 32px;
  padding: 28px 32px; border: 1px solid var(--rule); border-radius: 14px;
  background: var(--bg); flex-wrap: wrap;
  box-shadow: 0 1px 0 rgba(15,30,61,0.02), 0 24px 60px -38px rgba(15,30,61,0.18);
}
.continue-card__kicker { font-size: 11px; color: var(--ink-soft); letter-spacing: 0.14em; text-transform: uppercase; }
.continue-card__title { font-family: var(--serif); font-size: 24px; color: var(--navy); font-weight: 500; letter-spacing: -0.012em; }
.continue-card__pos { font-family: var(--mono); font-size: 12px; color: var(--ink-soft); letter-spacing: 0.06em; }
```

### 8.3 Module / course grid

A 4-column grid (collapses to 2, then 1) of compact cards. Each card has number, status pill, name, description, progress bar, and CTA.

```html
<div class="mgrid">
  <a href="..." class="mcard mcard--recent">
    <div class="mcard__head">
      <span class="mcard__num">02</span>
      <span class="mcard__pill">24/100</span>
    </div>
    <h3 class="mcard__name">Words in Context</h3>
    <p class="mcard__desc">Pick the meaning the passage actually supports — not the one that sounds smart.</p>
    <div class="mcard__bar"><div class="mcard__bar-fill" style="width: 24%"></div></div>
    <div class="mcard__cta">Continue <span class="btn-arrow">→</span></div>
  </a>
  <!-- … -->
</div>
```

```css
.mgrid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
@media (max-width: 1100px) { .mgrid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 600px)  { .mgrid { grid-template-columns: 1fr; } }
.mcard {
  display: flex; flex-direction: column; gap: 10px;
  padding: 22px 22px 20px; border: 1px solid var(--rule); border-radius: 12px;
  background: var(--bg); text-decoration: none;
  transition: border-color .12s, transform .12s, box-shadow .12s;
}
.mcard:hover { border-color: var(--navy); transform: translateY(-2px); box-shadow: 0 1px 0 rgba(15,30,61,0.04), 0 18px 40px -28px rgba(15,30,61,0.35); }
.mcard--locked { background: var(--bg-2); opacity: 0.85; }
.mcard--recent { border-color: var(--amber); box-shadow: 0 0 0 2px rgba(245,158,11,0.15); }
.mcard__head { display: flex; justify-content: space-between; align-items: center; }
.mcard__num  { font-family: var(--mono); font-size: 11px; color: var(--muted); letter-spacing: 0.08em; }
.mcard__pill { font-family: var(--mono); font-size: 11px; letter-spacing: 0.06em; color: var(--ink-soft); padding: 3px 8px; border: 1px solid var(--rule); border-radius: 999px; background: var(--bg); }
.mcard__name { font-family: var(--serif); font-size: 18px; color: var(--navy); font-weight: 500; letter-spacing: -0.005em; margin: 4px 0 0; }
.mcard__desc { font-size: 13px; color: var(--ink-soft); line-height: 1.45; margin: 0; flex: 1; }
.mcard__bar  { height: 3px; background: var(--rule); border-radius: 2px; overflow: hidden; }
.mcard__bar-fill { height: 100%; background: var(--amber); transition: width .25s; }
.mcard__cta  { font-family: var(--mono); font-size: 11px; color: var(--navy); letter-spacing: 0.08em; text-transform: uppercase; display: flex; align-items: center; gap: 6px; }
```

**Status conventions:**
- `mcard--recent` (amber border + soft amber halo) — the most recently active module.
- `mcard--locked` (bone bg, 0.85 opacity) — content the user can't access yet.
- Default — unlocked, untouched, or in progress.

### 8.4 Module detail hero (lesson page top)

```html
<a href="dashboard" class="back-link">← Back to dashboard</a>
<div class="modhero">
  <div class="modhero__num mono">Module 02</div>
  <h1 class="modhero__h">Words in Context</h1>
  <p class="modhero__desc">Pick the meaning the passage actually supports — not the one that sounds smart.</p>
  <div class="modhero__bar"><div class="modhero__bar-fill" style="width: 24%"></div></div>
  <div class="modhero__progress">24 of 100 done · <em>76</em> to go</div>
  <a href="..." class="btn btn-primary btn-lg">Resume Question 25 <span class="btn-arrow">→</span></a>
</div>
```

```css
.back-link { display: inline-block; font-family: var(--mono); font-size: 12px; color: var(--ink-soft); letter-spacing: 0.06em; text-transform: uppercase; text-decoration: none; padding-bottom: 18px; }
.back-link:hover { color: var(--amber-deep); }
.modhero { display: flex; flex-direction: column; gap: 14px; padding: 36px 0 8px; }
.modhero__num { font-size: 11px; color: var(--ink-soft); letter-spacing: 0.16em; text-transform: uppercase; }
.modhero__h { font-family: var(--serif); font-size: clamp(36px, 4.6vw, 56px); line-height: 1.05; color: var(--navy); font-weight: 500; letter-spacing: -0.015em; margin: 0; }
.modhero__desc { font-size: 17px; color: var(--ink-soft); line-height: 1.55; margin: 0; max-width: 60ch; }
.modhero__bar { height: 6px; background: var(--rule); border-radius: 3px; overflow: hidden; margin-top: 14px; max-width: 540px; }
.modhero__bar-fill { height: 100%; background: var(--amber); transition: width .25s; }
.modhero__progress { font-family: var(--mono); font-size: 13px; color: var(--ink-soft); letter-spacing: 0.04em; max-width: 540px; }
.modhero__progress em { font-style: normal; font-family: var(--serif); color: var(--amber-deep); font-weight: 600; }
.modhero .btn { align-self: flex-start; margin-top: 10px; }
```

### 8.5 Question / lesson list

A clean indexed list — like a textbook table of contents.

```html
<div class="qbank-list">
  <a href="..." class="qbank-row qbank-row--done">
    <span class="qbank-row__num">Q01</span>
    <span class="qbank-row__preview">A short, evocative preview of the question's passage</span>
    <span class="qbank-row__status">✓ Done</span>
  </a>
  <a href="..." class="qbank-row qbank-row--current">
    <span class="qbank-row__num">Q02</span>
    <span class="qbank-row__preview">Mirazón Lahr on early human nutrition</span>
    <span class="qbank-row__status">▷ Resume</span>
  </a>
  <a href="..." class="qbank-row qbank-row--locked">
    <span class="qbank-row__num">Q03</span>
    <span class="qbank-row__preview">The neutron star sequence</span>
    <span class="qbank-row__status">Locked</span>
  </a>
</div>
```

```css
.qbank-list { display: flex; flex-direction: column; background: var(--bg); border: 1px solid var(--rule); border-radius: 12px; overflow: hidden; }
.qbank-row { display: grid; grid-template-columns: 64px 1fr 110px; align-items: center; gap: 18px; padding: 14px 22px; border-bottom: 1px solid var(--rule); text-decoration: none; transition: background .12s; }
.qbank-row:last-child { border-bottom: none; }
.qbank-row:hover { background: var(--bg-2); }
.qbank-row__num { font-family: var(--mono); font-size: 12px; color: var(--ink-soft); letter-spacing: 0.06em; }
.qbank-row__preview { font-family: var(--serif); font-size: 15px; color: var(--navy); font-weight: 500; }
.qbank-row__status { font-family: var(--mono); font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; text-align: right; color: var(--ink-soft); }
.qbank-row--done    .qbank-row__status { color: #0F7A3D; }
.qbank-row--current .qbank-row__status { color: var(--amber-deep); }
.qbank-row--free    .qbank-row__status { color: var(--amber-deep); }
.qbank-row--locked  { background: var(--bg-2); }
.qbank-row--locked  .qbank-row__preview { color: var(--ink-soft); }
.qbank-row--locked  .qbank-row__status  { color: var(--muted); }
```

### 8.6 Quiz / practice card

A card per question. Passage in a bone block, prompt in serif navy, choices as buttons that update color on submit.

```html
<article class="qcard">
  <header class="qcard-head">
    <div>
      <span class="qcard-num">Question 24</span>
      <h3 class="qcard-title">What does "temper" most nearly mean?</h3>
    </div>
    <span class="qcard-verdict ok">Correct</span> <!-- or .no -->
  </header>

  <div class="qcard-body">
    <div class="qcard-passage">
      <p>The passage text appears here in serif. Optional <span class="passage-underline">underlined evidence</span> uses an amber 2px underline with offset.</p>
    </div>

    <div class="qcard-question">
      <p class="prompt">Pick the meaning the passage actually supports.</p>
      <div class="choices">
        <button class="choice"><span class="choice-key">A</span><span class="choice-text">An angry outburst</span></button>
        <button class="choice right"><span class="choice-key">B</span><span class="choice-text">A measured response</span></button>
        <button class="choice wrong"><span class="choice-key">C</span><span class="choice-text">A loud confrontation</span></button>
        <button class="choice"><span class="choice-key">D</span><span class="choice-text">An indifferent reply</span></button>
      </div>
    </div>

    <div class="qcard-explain">
      <span class="badge-correct">B is correct</span>
      <p>Apply the formula: the passage frames the response as deliberate and restrained, so "measured" fits.</p>
      <div class="method-block">
        <span class="kicker">The method, applied</span>
        <ol class="method-steps">
          <li>Read the passage for the claim about the response.</li>
          <li>Predict the meaning before reading the choices.</li>
          <li>Eliminate choices that contradict the passage.</li>
        </ol>
      </div>
    </div>
  </div>
</article>
```

```css
.qcard { background: var(--bg); border: 1px solid var(--rule); border-radius: 16px; padding: 32px; transition: border-color .15s, box-shadow .15s; }
.qcard:hover { border-color: #D4CFC0; }
.qcard-review { border-color: var(--amber); box-shadow: 0 18px 42px -28px rgba(245,158,11,0.4); }
.qcard-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 18px; flex-wrap: wrap; }
.qcard-num { font-family: var(--mono); font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--ink-soft); display: block; margin-bottom: 4px; }
.qcard-title { font-family: var(--serif); font-size: 24px; color: var(--navy); font-weight: 500; margin: 0; letter-spacing: -0.01em; }
.qcard-verdict { font-family: var(--mono); font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; padding: 6px 12px; border-radius: 999px; }
.qcard-verdict.ok { color: #047857; background: #ECFDF5; border: 1px solid #A7F3D0; }
.qcard-verdict.no { color: var(--amber-deep); background: #FFF8EC; border: 1px solid #F5D9A0; }

.qcard-body { display: flex; flex-direction: column; gap: 24px; }
.qcard-passage { background: var(--bg-2); border-radius: 12px; padding: 22px 24px; border: 1px solid var(--rule); }
.qcard-passage p { font-family: var(--serif); font-size: 17px; line-height: 1.65; color: var(--ink); margin: 0 0 12px; font-weight: 400; }
.qcard-passage p:last-child { margin-bottom: 0; }
.passage-underline { text-decoration: underline; text-decoration-color: var(--amber); text-decoration-thickness: 2px; text-underline-offset: 4px; font-weight: 500; }

.qcard-question .prompt { font-family: var(--serif); font-size: 20px; line-height: 1.4; color: var(--navy); font-weight: 500; margin: 0 0 18px; letter-spacing: -0.005em; }
.choices { display: flex; flex-direction: column; gap: 10px; }
.choice {
  display: flex; gap: 14px; align-items: flex-start; text-align: left;
  background: var(--bg); border: 1px solid var(--rule); border-radius: 10px;
  padding: 14px 16px; cursor: pointer; transition: border-color .12s, background .12s, transform .08s;
  font: inherit; color: var(--ink); font-size: 15px; line-height: 1.45;
}
.choice:hover:not(:disabled) { border-color: var(--navy); background: #fff; }
.choice:disabled { cursor: default; }
.choice.chosen { border-color: var(--navy); background: #fff; }
.choice.right  { border-color: #10B981; background: #ECFDF5; }
.choice.right  .choice-key { background: #10B981; color: #fff; border-color: #10B981; }
.choice.wrong  { border-color: #EF4444; background: #FEF2F2; }
.choice.wrong  .choice-key { background: #EF4444; color: #fff; border-color: #EF4444; }
.choice-key {
  flex-shrink: 0; width: 28px; height: 28px; border-radius: 6px;
  border: 1px solid var(--rule); display: grid; place-items: center;
  font-family: var(--mono); font-size: 13px; font-weight: 600; color: var(--navy);
  background: var(--bg-2);
}
.choice.chosen .choice-key { background: var(--navy); color: #fff; border-color: var(--navy); }
.choice-text { flex: 1; padding-top: 3px; }

.qcard-explain { background: #FFFCF4; border: 1px solid #F5D9A0; border-radius: 12px; padding: 24px 26px; margin-top: 8px; }
.qcard-explain p { font-size: 16px; line-height: 1.6; color: var(--ink); }
.badge-correct { display: inline-block; font-family: var(--mono); font-size: 12px; letter-spacing: 0.08em; background: var(--navy); color: #fff; padding: 6px 12px; border-radius: 999px; margin-bottom: 14px; font-weight: 500; }
.method-block { margin-top: 22px; padding-top: 20px; border-top: 1px dashed #F5D9A0; }
.method-steps { margin: 8px 0 0 0; padding-left: 22px; display: flex; flex-direction: column; gap: 8px; }
.method-steps li { font-size: 15px; line-height: 1.55; color: var(--ink); }
.method-steps li::marker { color: var(--amber-deep); font-family: var(--mono); font-weight: 600; }
```

### 8.7 Progress card (sidebar widget)

```html
<aside class="progress-card">
  <div class="progress-stat">
    <span class="progress-num">24<span class="progress-denom">/100</span></span>
    <span class="progress-label">Module progress</span>
  </div>
  <div class="progress-bar"><div class="progress-fill" style="width: 24%"></div></div>
</aside>
```

```css
.progress-card { background: var(--bg); border: 1px solid var(--rule); border-radius: 14px; padding: 20px 24px; min-width: 280px; max-width: 320px; }
.progress-stat { display: flex; flex-direction: column; gap: 2px; margin-bottom: 14px; }
.progress-num { font-family: var(--serif); font-size: 42px; color: var(--navy); font-weight: 500; line-height: 1; letter-spacing: -0.02em; }
.progress-num .progress-denom { color: var(--muted); font-size: 24px; }
.progress-label { font-family: var(--mono); font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-soft); }
.progress-bar { height: 6px; background: var(--bg-2); border-radius: 999px; overflow: hidden; }
.progress-fill { height: 100%; background: var(--amber); border-radius: 999px; transition: width .3s ease; }
```

### 8.8 Locked-content rail (visual depth without backend gating)

A grid of small "tiles" that hint at scope without revealing content. Use diagonal hairlines for the locked feel — never a solid lock icon front-and-center.

```css
.locked-section { background: var(--bg-2); border-top: 1px solid var(--rule); padding: 5rem 0; }
.locked-grid    { display: grid; grid-template-columns: repeat(auto-fill, minmax(72px, 1fr)); gap: 8px; }
.locked-tile {
  aspect-ratio: 1/1; background: var(--bg); border: 1px solid var(--rule); border-radius: 8px;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;
  color: var(--muted); transition: border-color .12s, color .12s;
  position: relative; overflow: hidden;
}
.locked-tile::before {
  content: ""; position: absolute; inset: 0;
  background: repeating-linear-gradient(135deg, transparent 0 4px, rgba(15,30,61,0.025) 4px 8px);
}
.locked-tile:hover { border-color: var(--navy); color: var(--navy); }
```

### 8.9 Plan toggle (preview / role switcher)

A pill row centered below the nav. Useful for letting users compare plan tiers, role views, or course tracks.

```html
<div class="plan-toggle-wrap">
  <div class="wrap plan-toggle">
    <span class="plan-toggle__lbl">Viewing</span>
    <a class="plan-toggle__opt">Free</a>
    <a class="plan-toggle__opt sel">Core</a>
    <a class="plan-toggle__opt">Complete</a>
  </div>
</div>
```

```css
.plan-toggle-wrap { padding: 18px 0 6px; }
.plan-toggle { display: flex; align-items: center; justify-content: center; gap: 8px; }
.plan-toggle__lbl { font-family: var(--mono); font-size: 11px; color: var(--ink-soft); letter-spacing: 0.14em; text-transform: uppercase; margin-right: 8px; }
.plan-toggle__opt { font-family: var(--sans); font-size: 14px; color: var(--ink); padding: 7px 16px; border: 1px solid var(--rule); border-radius: 999px; text-decoration: none; background: var(--bg); transition: border-color .12s, color .12s, background .12s; }
.plan-toggle__opt:hover { border-color: var(--navy); }
.plan-toggle__opt.sel  { border-color: var(--navy); background: var(--navy); color: #fff; }
```

### 8.10 Featured / hero card (the rare navy moment)

When you need *one* big anchor — e.g., the featured course on a course catalog — use a deep navy gradient panel with a diagram on the right. Reserve for one element per page max.

```css
.featured {
  display: grid; grid-template-columns: 1.25fr 1fr; gap: 0;
  background: var(--navy); color: #E8ECF4;
  border-radius: 18px; overflow: hidden;
  border: 1px solid var(--navy);
  box-shadow: 0 1px 0 rgba(15,30,61,0.04), 0 30px 70px -42px rgba(15,30,61,0.45);
}
.featured__left  { padding: 48px 52px 44px; }
.featured__right {
  background: linear-gradient(135deg, #1B2D52 0%, #0F1E3D 100%);
  border-left: 1px solid rgba(255,255,255,0.06);
  padding: 48px 44px;
  display: flex; align-items: center; justify-content: center;
}
.featured__name {
  font-family: var(--serif); color: #fff;
  font-size: clamp(34px, 3.4vw, 48px); line-height: 1.05; letter-spacing: -0.015em;
  margin: 0 0 16px;
}
.featured__desc { color: rgba(232,236,244,0.75); font-size: 18px; line-height: 1.55; margin: 0; max-width: 46ch; }
@media (max-width: 900px) { .featured { grid-template-columns: 1fr; } .featured__right { display: none; } }
```

### 8.11 Modal (video / detail overlay)

```css
.modal-backdrop { position: fixed; inset: 0; background: rgba(15,30,61,0.6); backdrop-filter: blur(6px); z-index: 100; display: grid; place-items: center; padding: 24px; animation: fadeIn .2s ease; }
.modal { width: min(960px, 100%); aspect-ratio: 16/9; background: #000; border-radius: 16px; overflow: hidden; position: relative; box-shadow: 0 40px 100px rgba(0,0,0,0.5); }
.modal-close { position: absolute; right: -2px; top: -44px; background: transparent; border: 0; color: #fff; font-size: 14px; font-family: var(--mono); cursor: pointer; display: flex; align-items: center; gap: 8px; }
@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
```

---

## 9. Anti-patterns — explicitly avoid

These were tried and removed. Don't reintroduce them:

1. **No mono "eyebrow" labels above section headlines** (e.g., `// CHAPTER 2` over an `<h2>`). They distract before the headline lands. The headline carries itself.
2. **No heavy color slabs in content areas.** Especially full-bleed navy. Use bone alt (`--bg-2`) plus a hairline rule. Navy is reserved for the footer and one optional featured panel per page.
3. **No decorative SVG flourishes.** If a graphic doesn't teach something or anchor the brand mark, cut it.
4. **No "stat block" rows of three giant numbers** (`5000+ students | 95% pass rate | 200 lessons`). Reads as SaaS marketing noise. If a number matters, write it into a sentence.
5. **No exclamation marks in section headlines.** Confidence doesn't shout. Body copy: at most one per page, and ideally zero.
6. **No emojis in product UI**, including buttons, headings, status indicators, or empty states. Use the mono kicker / serif italic system instead.
7. **No glow / glassmorphism / gradients** outside the one navy feature gradient and the soft button shadow.
8. **No drop shadows on cards by default.** The hover shadow is intentional; the resting state is a hairline border.
9. **No purple / teal / cool blue.** The palette is navy + amber + bone — that's it. Don't introduce a third hue.
10. **No "Gen Z" voice.** No "vibes," "literally," "we got you," "no cap," etc. Editorial textbook, not Twitter.
11. **No lock-icon-on-everything.** For locked content, use the bone-bg + soft opacity treatment from §8.3 / §8.5, or the diagonal-hairline tile from §8.8. The padlock emoji is forbidden.
12. **No giant generic illustration.** No 3D Memphis blobs, no isometric robots, no AI-stock-art. If you need a visual anchor, use a typographic diagram (mono labels in indented rows, like the featured course panel in §8.10).

---

## 10. Page recipes

Drop-in skeletons for the three core LMS surfaces. Plug in your data; keep the structure.

### 10.1 Dashboard page

```
[ Demo / status banner — optional, only when relevant ]
[ Sticky translucent nav with brand mark + links + user pill ]
[ Optional plan / role toggle (pills) ]

Hero greeting:
  "Welcome back, <em>{firstName}</em>."
  Subhead (one quiet line)

Continue card (if there's a lastSeen):
  Kicker mono: PICK UP WHERE YOU LEFT OFF
  Title (serif): {moduleName}
  Pos (mono): Module {NN} · Question {NN}
  Primary CTA: Resume Question {N} →

Section header (no eyebrow):
  h2: "Your modules" / "All modules"
  Optional one-line body-text below

Module grid:
  4-col → 2-col → 1-col mcards
  most recent module gets .mcard--recent
  locked modules get .mcard--locked

Footer (navy, quiet)
```

### 10.2 Module / lesson detail page

```
Sticky nav

[ wrap ]
  back-link: ← Back to dashboard
  modhero:
    mono num: MODULE 02
    h1: {moduleName}
    desc (ink-soft, max 60ch)
    progress bar (amber on rule)
    progress mono: "24 of 100 done · <em>76</em> to go"
    primary CTA: Resume Question {N} →

[ bg-bone section ]
  h2 (preview-section__h): Question bank
  qbank-list (rows with status: done/current/todo/free/locked)
  list footer mono: "+ {N} more questions in this module"

Footer
```

### 10.3 Practice / quiz page

```
Sticky nav (compact: hide secondary links)

[ wrap split: 1fr 320px ]
  Main column:
    qcard with passage / prompt / choices
    on submit: choices recolor (right=green, wrong=red, others stay)
    qcard-explain panel slides in below with method-steps

  Sidebar:
    progress-card (current module progress)
    Optional: "Up next" link list (3 items)

[ Bottom action bar ]
  ghost: Skip
  outline: Mark for review
  primary: Submit / Next →
```

---

## 11. Drop-in starter (copy-paste-ready)

The minimum CSS to make a new page look like the brand. Append your component styles from §6–§8 below this block.

```css
:root {
  --navy:#152647; --navy-2:#0F1E3D; --navy-3:#1B2D52;
  --amber:#F59E0B; --amber-deep:#C97A05;
  --bg:#FAFAF7; --bg-2:#F4F2EC; --rule:#E5E2D8;
  --ink:#1F2937; --ink-soft:#4B5563; --muted:#9CA3AF;
  --serif:"Fraunces","Source Serif 4",Georgia,serif;
  --sans:"Source Sans 3","Inter",system-ui,sans-serif;
  --mono:"JetBrains Mono",ui-monospace,"SF Mono",Menlo,monospace;
  --pad-y:7rem; --maxw:1240px;
}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
html{scroll-behavior:smooth}
body{font-family:var(--sans);background:var(--bg);color:var(--ink);font-size:17px;line-height:1.55;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;}
h1,h2,h3,h4{font-family:var(--serif);color:var(--navy);margin:0;font-weight:500;letter-spacing:-0.015em;text-wrap:balance;}
h1{font-size:clamp(44px,6.2vw,84px);line-height:1.02;letter-spacing:-0.03em;font-weight:400;}
h2{font-size:clamp(32px,3.8vw,52px);line-height:1.06;letter-spacing:-0.02em;}
h3{font-size:clamp(22px,2vw,28px);line-height:1.15;}
p{margin:0 0 1em;text-wrap:pretty;}
a{color:inherit;text-decoration:none}
em{font-style:italic;font-family:var(--serif);color:var(--amber-deep);font-weight:500;}
.wrap{max-width:var(--maxw);margin:0 auto;padding:0 32px;}
section{padding:var(--pad-y) 0;}
```

---

## 12. Quick mental checklist before shipping a screen

Before you call any LMS screen "done," walk through:

- [ ] Background is bone (`--bg`), not white.
- [ ] Exactly one amber element on screen (the primary CTA, or one italic word).
- [ ] All headlines are Fraunces serif, weight 400/500.
- [ ] All small uppercase labels are mono with `letter-spacing: 0.06–0.18em`.
- [ ] No eyebrow label above any section headline.
- [ ] No exclamation marks in headlines; ≤1 in body.
- [ ] No emojis anywhere.
- [ ] No gradient except the optional navy feature panel.
- [ ] All cards are 1px hairline border + radius 12–16px, shadow only on hover.
- [ ] Body prose max-width is ~60ch.
- [ ] Section vertical padding is 5–9rem; never tighter.
- [ ] Locked content uses bone bg + soft opacity, not a padlock icon.
- [ ] Voice passes: "would a respected teacher write this?"

If any answer is "no," fix it before you call it done.
