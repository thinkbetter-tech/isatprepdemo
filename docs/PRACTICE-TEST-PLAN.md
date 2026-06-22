# Practice Test feature — implementation plan

A new **Practice Test** section: locked behind a paid plan, lists logically-grouped
SAT R&W tests, and lets paid users take a high-fidelity, **adaptive**, Bluebook-style
timed test on the site.

## 0. Reality check (must read first)
- **Content today = 4 questions** (all *Craft and Structure*) hardcoded in `src/practice.jsx`.
  The "96 locked / 100 total" shown in the UI is **marketing copy + decorative lock tiles**,
  NOT real question data. Firestore has no `questions` collection.
- A real Digital SAT **R&W section = 54 questions** (2 modules × 27). A meaningful adaptive
  test library needs **a few hundred difficulty-tagged questions** across the 4 R&W domains.
- **Decision:** build the full engine now; seed with the 4 real questions + AI-drafted
  SAT-style questions (flagged `source: "ai-draft"` for review). Real bank swaps in later via
  the data format defined below. **No Math** (product is R&W-only).

## 1. Question data model (the foundation)
Move questions out of `practice.jsx` into structured data the whole app shares.

```
questions/{questionId}:
  domain: "craft-and-structure" | "information-and-ideas"
        | "expression-of-ideas" | "standard-english-conventions"
  skill:  string         // finer tag, e.g. "text-structure", "transitions"
  difficulty: "easy" | "medium" | "hard"   // drives adaptivity
  passage: string
  prompt: string
  choices: [{ k: "A", text }, ...]
  answer: "B"
  explanation: string
  source: "official" | "ai-draft"          // provenance for review
```
- Stored as a static JS module first (`src/data/questions.js`) — no backend cost, instant,
  works offline. Can migrate to a Firestore `questions` collection later if an admin
  authoring tool is wanted (Stage 3).
- The existing 4 questions are migrated here verbatim; `practice.jsx` reads from this module
  too (single source of truth).

## 2. Test definitions (logical grouping for an SAT student)
A separate module `src/data/tests.js` defines the test library. Grouping is pedagogical:

**A. Domain mini-tests (skill-building, shorter)**
- One per R&W domain: ~15 questions, ~20 min, single module, NOT adaptive.
- Purpose: drill one skill area. 4 mini-tests (one per domain).

**B. Full-length R&W section tests (exam simulation)**
- Mirrors the real Digital SAT R&W: **2 modules × 27 Q, 32 min each**, **adaptive**
  (Module 2 difficulty set by Module 1 performance), 10-min optional break between modules.
- Offer a few (e.g. "Full R&W Test 1/2/3") as content allows.

**Test definition shape:**
```
tests/{testId}:
  title, kind: "mini" | "full"
  domain?: <domain>            // mini only
  modules: [{ minutes, count, difficultyMix }]  // full = 2 modules, mini = 1
  adaptive: boolean
```
Tests are *assembled* from the question bank by domain/difficulty filters, so adding
questions automatically enriches tests.

## 3. Gating (paid-only)
- New nav item **"Practice Test"** on every page (marketing + app), with a lock affordance
  when the user is Free.
- Entitlement source of truth = `users/{uid}.plan` (`free|core|complete`), already server-only
  (Stripe webhook sets it in Stage 2; rules forbid client writes — secure).
- **Free user** clicking the tab → lands on the test-list page where every test shows a
  lock + an **Upgrade** nudge (→ `index.html#pricing`). They can SEE the catalog (drives
  conversion) but cannot start.
- **Paid user** → can start any test their plan includes.
- Enforcement: client checks `plan` to gate the UI; because questions currently ship in the
  bundle, true server-side content protection is limited (same caveat as YouTube embeds).
  Noted as a known limitation — real protection needs server-delivered questions (Stage 3).

## 4. The exam UI (high-fidelity, adaptive — Bluebook-style)
A dedicated full-screen test runner (`test.html` + `src/test.jsx`), distinct from the casual
practice page. Flow:

1. **Pre-test screen** — test title, structure (modules/Q count/time), and **instructions /
   guidelines**: timing rules, that the timer auto-submits, mark-for-review, no external help,
   break info, how navigation works. A **"Begin test"** button starts the timer (nothing is
   timed until they click).
2. **In-test runner (per module):**
   - **Countdown timer** (per module, e.g. 32:00) — visible, warns at 5 min, **auto-submits
     the module at 0**.
   - One question at a time: passage + prompt + choices.
   - **Mark for review** flag per question.
   - **Answer eliminator** (strike out choices) — a real Bluebook feature.
   - **Back / Next** navigation.
   - **Question navigator** grid (jump to any Q; shows answered / unanswered / marked).
   - **Module review screen** before submitting a module (see all statuses, jump back).
3. **Between modules (full test):** optional **10-minute break** screen with its own timer;
   **adaptive routing** — Module 1 score decides whether Module 2 pulls easier or harder
   questions.
4. **Results screen:** score (raw + estimated scaled band), per-domain breakdown, time used,
   and **per-question review** with correct answer + explanation. Saved to
   `progress/{uid}/tests/{attemptId}` so users can revisit attempts.

### Adaptivity logic (R&W, 2 modules)
- Module 1: fixed medium-difficulty mix (27 Q).
- Score Module 1 → if ≥ threshold, Module 2 = harder pool ("upper"); else easier ("lower").
- Estimated scaled score derived from which Module 2 path + correct count (documented
  approximation, clearly labeled "estimated" — real SAT scaling is proprietary).

## 5. Persistence
- `progress/{uid}/tests/{attemptId}`: testId, startedAt, finishedAt, perModule answers,
  module1Path, score, status (in-progress | completed | timed-out).
- **Resume an in-progress test?** Decision: for exam fidelity, a started test runs to
  completion or times out (like the real SAT) — but we DO save on submit/timeout so results
  persist. (Mid-test resume across reloads can be a later enhancement.)

## 6. Build sequence
1. **Data layer** — `src/data/questions.js` (migrate the 4 + add AI-drafted, difficulty-tagged)
   and `src/data/tests.js` (mini + full definitions). `practice.jsx` refactored to read it.
2. **Test assembly + scoring + adaptive logic** — pure functions in `src/data/testEngine.js`
   (unit-testable, no UI).
3. **Test list page** — `tests.html` + `src/tests-list.jsx`: catalog, plan gating, upgrade nudge.
4. **Exam runner** — `test.html` + `src/test.jsx`: pre-test → modules → break → results, with
   timer, navigator, mark-for-review, eliminator, auto-submit.
5. **Nav** — add "Practice Test" (locked icon for Free) to `NavCta`/marketing nav + practice nav.
6. **Persistence + results review**; Firestore rules already cover `progress/{uid}/**`.
7. Build, deploy, commit, push.

## 7. Explicit limitations / later work
- **Content quality:** AI-drafted questions need expert review before paying students rely on
  them. The `source` flag makes them filterable.
- **True content protection:** questions ship client-side; a determined paid user could extract
  them. Server-delivered questions + per-attempt fetch is a Stage 3 hardening.
- **Real adaptivity & scaling** are approximations of College Board's proprietary algorithm.
- **No Math** — product scope is R&W only; the UI should not imply a full SAT.
