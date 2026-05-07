# iSATPrep — Brand & Design Language

A working reference, grounded in what's actually in the codebase. Update it when the codebase changes.

---

## 1. The thesis

iSATPrep teaches the Digital SAT Reading & Writing section as if it were math — with a structured method, a repeatable formula, and a rigorous way to evaluate answer choices. Every visual and verbal choice should reinforce that thesis: **calm, structured, methodical, applied.**

The core line — **"You don't do English the English way — you do it the math way."** — is the brand. Everything else points back to it.

---

## 2. Voice & tone

**Posture:** Confident, editorial, instructive. Like a textbook written by a teacher who respects you, not a SaaS landing page.

**Cadence:** One strong line, then one quieter line that explains it. Short bold statements, never paragraphs of marketing prose.

**Verbs we use a lot:** apply, eliminate, predict, structure, frame, walk through.

**Nouns we use a lot:** method, framework, formula, structure, passage, claim, evidence.

**Italic for emphasis** — almost always set in Fraunces italic with amber color. Use it on the *one* word per sentence that carries the meaning.

### Do

- "Apply the formula. Get results in seconds."
- "Math feels solvable. Verbal feels like a guessing game."
- "The method is *waiting*."
- "Watch the method, applied."

### Don't

- ❌ "Revolutionary AI-powered SAT prep"
- ❌ "Unlock your potential!"
- ❌ "Join thousands of happy students"
- ❌ Exclamation marks in body copy (rare; never more than one per page)
- ❌ Generic SaaS verbs: "supercharge," "transform," "elevate"

---

## 3. Color palette

All values live in `styles.css:2-13` as CSS custom properties. Use the variables, not the hex codes.

| Role | Variable | Hex | When to use |
|---|---|---|---|
| Page background | `--bg` | `#FAFAF7` | Default canvas. Bone/cream, not pure white. |
| Alt section background | `--bg-2` | `#F4F2EC` | Apply via `.bg-bone` to alternate sections without breaking flow. |
| Hairline rules & borders | `--rule` | `#E5E2D8` | All dividers, card borders. Thin lines only. |
| Primary brand | `--navy` | `#152647` | Headlines, brand mark, outline buttons. **As an accent, not a slab.** |
| Navy depths | `--navy-2` `--navy-3` | `#0F1E3D` `#1B2D52` | Demo card backgrounds, deep accents. |
| Action / accent | `--amber` | `#F59E0B` | Primary CTAs, italic emphasis, the dot on the brand mark. |
| Amber deep | `--amber-deep` | `#C97A05` | Hover states, italic-emphasis text on light bg. |
| Body ink | `--ink` | `#1F2937` | Default body text. |
| Muted body | `--ink-soft` | `#4B5563` | Secondary copy, captions. |
| Faded | `--muted` | `#9CA3AF` | Footer text, hints, the lowest tier. |

### Color rules

- **Navy is an accent, not a wall.** A full-bleed navy block is heavy and breaks the airy aesthetic. If you need to anchor visual weight, use `--bg-2` (bone alt) plus a hairline rule. Reserve `.bg-navy` for the rare case where you want a deliberate jolt — currently nothing on the live site uses it.
- **Amber is a spotlight.** One amber thing per screen, ideally — the primary CTA, or the italic word in the headline. If two things are amber, neither is.
- **No gradients.** No drop shadows except the gentle `0 8px 22px -10px` lift on primary buttons. No glows, no glassmorphism.

---

## 4. Typography

Three faces, loaded from Google Fonts in every HTML head:

| Family | Variable | Use for |
|---|---|---|
| **Fraunces** (serif) | `--serif` | All headlines (`h1`–`h4`), pull quotes, italic emphasis. Variable font — uses `SOFT 30, WONK 0` for a warmer, less academic cut. |
| **Source Sans 3** (sans) | `--sans` | All body copy, buttons, form fields. |
| **JetBrains Mono** (mono) | `--mono` | Small uppercase labels, kickers, captions, code-feel accents. Letter-spaced `0.14–0.18em`, tracked tight. |

### Hierarchy (from `styles.css:37-42`)

- `h1` — `clamp(44px, 6.2vw, 84px)`, weight 400, line-height 1.02
- `h2` — `clamp(32px, 3.8vw, 52px)`, weight 500, line-height 1.06
- `h3` — `clamp(22px, 2vw, 28px)`, line-height 1.15
- Body — 17px, line-height 1.55, max-width ~60ch

### Type rules

- Headlines have **`text-wrap:balance`** — keeps multi-line headlines from leaving an orphan word.
- Body has **`text-wrap:pretty`** — softer hyphenation, no rivers.
- Italic is *always* Fraunces italic, *always* amber-deep, weight 500. Never italicize a whole sentence — just the one carrying word.
- Mono labels are short — 1–4 words. We removed all section "eyebrow" labels in May 2026 because they were noise before each headline. **Don't reintroduce them.**

---

## 5. Layout & rhythm

- **Max width:** `--maxw: 1240px`, applied via `.wrap`.
- **Vertical padding per section:** `--pad-y: 7rem`. Generous — never compress.
- **Side padding:** `32px` desktop, drops to `24px` on narrow screens.
- **Body text max-width:** ~60ch (sometimes 56ch). Never let prose stretch the full container.
- **Grid splits:** `1fr 1fr` for two-column sections, with content on one side and copy on the other.

### Whitespace is the visual

The site reads as airy because every section has real breathing room. When in doubt, add space, not decoration.

---

## 6. Components

### Buttons (`styles.css:90-108`)

| Class | Look | Use |
|---|---|---|
| `.btn-primary` | Amber bg, dark ink text | The single primary action on a page (Start free, Sign up). |
| `.btn-outline` | Transparent bg, navy border | Secondary navy action. |
| `.btn-ghost` | Transparent bg, hairline border | Tertiary — inline alternates next to a primary. |

Modifiers: `.btn-sm`, `.btn-lg`, `.btn-block`. Add `<span class="btn-arrow">→</span>` for the rightward-shifting arrow on hover.

### Section heads

Pattern: `.section-head` (optionally `.center`) wrapping an `<h2>` and an optional `<p class="body-text">` below. **No eyebrow label above.** The headline carries itself.

### Cards

Border `1px solid var(--rule)`, radius `14px`, `transition` on `border-color, transform, box-shadow`. Hover lifts `translateY(-3px)` with the navy border darkening. See `.walk-card` (`styles.css:369-396`) as the canonical example.

### Brand mark

A 28px navy-bordered square with a lowercase `i` in mono inside, plus an amber dot at the bottom-right corner (`styles.css:71-80`). Always paired with the wordmark "iSATPrep" set in Fraunces, weight 500.

---

## 7. Visual patterns we avoid

Lessons learned, codified:

- **No mono "eyebrow" labels above section headlines.** Distracts before the headline lands. (Removed May 2026 — see commit `72505b9`.)
- **No heavy color slabs.** Particularly the full-navy auth panel — replaced with an editorial bone treatment using a hairline divider and a Fraunces italic quote.
- **No decorative SVG flourishes that don't serve content.** The old `f(x) METHOD` diagram on the auth page was decoration for decoration's sake. If a graphic doesn't teach something or anchor the brand, cut it.
- **No "stat blocks" with three giant numbers.** Comes across as SaaS marketing-module noise. If a number matters, write it into a sentence.
- **No exclamation marks in section headlines.** Confidence doesn't shout.

---

## 8. Voice anchor — Shipra's pullquote

Shipra Batra is the founder and lead instructor. Her voice is the brand voice. When in doubt about phrasing, ask: *would Shipra say this?* Her core pullquote, used verbatim on the homepage and signup page, is:

> *"You don't do English the English way — you do it the math way."*

That's the line. Everything else is an echo of it.
