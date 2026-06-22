# Post-Test Analysis — implementation plan

> **STATUS (build log):** Phases 1–5 are **BUILT & LIVE** — per-question timing capture, full
> attempt persistence (`progress/{uid}/attempts/**`, with history), pure `analysisEngine.js`, the
> rich `Analysis` report (snapshot / right / skipped / wrong / timeline / tabbed review), and the
> account-page **history** list (`test.html?attempt=<id>` re-renders any attempt). **Peer comparison
> (Phase 6) is partially live**: a PII-free `testStats/{testId}` aggregate updates on submit
> (client-side, transactional, rules-guarded) and surfaces only past **10 attempts**
> (`PEER_MIN_ATTEMPTS`), degrading to an honest "unlocks at N students" notice. The **server-side
> hardening** of that aggregate (Cloud Function) + **admin analytics** are scoped in
> `docs/ADMIN-ANALYTICS-AND-FUNCTIONS.md`. No hardcoded/sample data anywhere; all empty/threshold
> states handled.


Goal: after a student finishes a Mock Test, give them a **detailed, easy-to-consume analysis** —
quick snapshot → what they got right → what they skipped → what they got wrong — with
**per-question timing** and, where available, **peer comparison**. Also accessible **later** from
their account/history.

---

## 0. Reality check — what we capture today vs. what analysis needs

| Needed | Today | Gap |
|---|---|---|
| Per-question correctness | ✅ in memory during results | not persisted per-question |
| Per-question **time spent** | ❌ not tracked at all | must add timing in the runner |
| Skipped vs. wrong vs. right | ✅ derivable in memory | not persisted |
| Multi-attempt **history** | ❌ overwrites one summary doc | must store one doc per attempt |
| Peer aggregates | ❌ none | must aggregate across users (server-side) |

**Conclusion:** Step 1 is a data/persistence upgrade. Everything else builds on it. The current
runner (`src/test.jsx`) saves only a summary to `progress/{uid}/lessons/test:<id>` and overwrites it.

---

## 1. Data model changes (foundation)

### 1.1 Capture per-question timing in the runner
In `ModuleRunner` (`src/test.jsx`), record the time spent on each question:
- Track `questionEnterTime` when a question becomes visible; on leaving (Next/Back/jump/submit),
  add the delta to `timeSpent[questionId]`. Use a monotonic clock derived from the countdown (we
  can't call `Date.now()` in some sandboxes, but the runner is a live browser — `performance.now()`
  is fine here).
- Also record `firstAnswerTime` (time to first selection) and `changedAnswer` (did they revise) —
  both are strong behavioral signals.

### 1.2 Persist a full attempt record (one doc per attempt, with history)
New subcollection: `progress/{uid}/attempts/{attemptId}` (attemptId = test id + start timestamp).
```
{
  testId, testTitle, kind: 'full'|'mini', adaptive,
  startedAt, finishedAt, durationSec,
  module2Path: 'upper'|'lower'|null,
  score: { correct, total, scaledEstimate },
  perDomain: { <domain>: { correct, total, avgSecPerQ } },
  questions: [
    { id, domain, skill, difficulty,
      chosen, correct, status: 'right'|'wrong'|'skipped',
      timeSec, firstAnswerSec, changedAnswer, markedForReview }
  ],
  // denormalized counts for the snapshot
  counts: { right, wrong, skipped, marked }
}
```
- Rules already allow `progress/{uid}/**` own-writes — no rules change needed.
- Keep the existing lightweight `lessons/test:<id>` summary for the account dashboard tile, OR
  switch the dashboard to read the latest attempt. (Prefer the latter — single source.)

### 1.3 Peer comparison aggregates (server-side, privacy-safe)
Per-user docs can't be read by other users (correct). Peer stats require an **aggregate** that holds
NO personal data:
- `testStats/{testId}` (public-read, server-write):
  `{ attempts, scoreSum, scoreSumSq, perQuestion: { <qid>: { attempts, correctCount, timeSum, timeSumSq } } }`
- Updated by a **Cloud Function** triggered on attempt write (Stage 2 functions / App Check applies),
  OR a callable that the client invokes post-submit. Function uses Admin SDK (bypasses rules).
- From these we derive **mean score**, **percentile** (needs distribution — store coarse histogram
  buckets, e.g. 20-point bands), **avg time per question**, **% of peers who got each question right**.
- ⚠️ Peer comparison only becomes meaningful after enough attempts exist. **Gate it behind a minimum
  sample (e.g. ≥20 attempts for that test)**; until then, hide peer rows or show "not enough data yet."
- Privacy: aggregates store only counts/sums — never who scored what. Safe for the 13+/student context.

---

## 2. The analysis sections + the metrics for each

The four sections you asked for, each with a small, high-signal metric set (not a data dump).

### A. Quick Snapshot (the "at a glance" hero)
The 5-second takeaway. Metrics:
- **Scaled score estimate** (200–800) + module path (Upper/Lower) — already computed.
- **Right / Wrong / Skipped** counts as a single stacked bar.
- **Accuracy %** (right ÷ attempted) and **Completion %** (attempted ÷ total).
- **Total time used** vs. allotted, and **avg time per question**.
- **Strongest & weakest domain** (one chip each) — instant direction.
- *(peer, if available)* **Percentile band** ("top ~30%") + **vs. peer average** (+/− points).

### B. What they did RIGHT (reinforce + build confidence)
Goal: show competence, not just celebrate. Metrics:
- **Correct by domain & skill** (e.g. "Transitions 8/9") — surfaces strengths.
- **Difficulty cleared**: how many hard/medium/easy they nailed (e.g. "5/8 hard correct" is a strong signal).
- **Efficiency on correct answers**: avg time on correct vs. their overall avg — "you were fast AND right here."
- **Confident-correct** (answered quickly, didn't change, correct) — true mastery markers.
- *(peer)* questions they got right that **most peers missed** ("you beat the curve on these").

### C. What they SKIPPED (recover lost points)
Skips are the easiest score gains. Metrics:
- **Count + which domains/skills** were skipped (pattern detection — e.g. "you skipped 4 of 5 Cross-Text").
- **Time context**: were skips clustered at the **end** (ran out of time) or **scattered** (avoidance)?
  Derived from question order + timeSec — drives different advice ("pacing" vs. "confidence").
- **Difficulty of skips**: skipping easy/medium = recoverable points flagged prominently.
- **Marked-for-review but skipped** — they flagged it and never returned (navigation/pacing insight).
- Each skipped question is **one tap to review** (passage + answer + explanation + method).

### D. What they got WRONG (targeted improvement)
The highest-learning section. Metrics:
- **Wrong by domain & skill** — the prioritized study list ("focus: Command of Evidence").
- **Wrong by difficulty** — careless easy misses vs. genuinely hard.
- **Time signature of wrongs**:
  - **Rushed wrong** (well below avg time) → careless / misread.
  - **Stuck wrong** (well above avg time) → knowledge gap.
  - **Changed-to-wrong** (revised a right answer to wrong) → second-guessing.
- **Your answer vs. correct answer** side by side, with the **explanation + iSATPrep method steps**.
- *(peer)* "**X% of students got this right**" — calibrates whether it's a common trap or a rare miss.

### Cross-cutting: per-question timing (always available)
- Computed in the runner; shown as a **timeline / bar of seconds-per-question**, color-coded by
  right/wrong/skipped. Lets a student literally see where time drained.
- Surfaced both in the snapshot (avg) and inline on every question in B/C/D.

---

## 3. UX flow

### 3.1 Immediately after the test
- On submit, the runner **writes the attempt record** (with timing), then routes to a dedicated
  **Results & Analysis** view (replaces the current inline results screen with a richer one).
- Layout (top → bottom, single scroll, mobile-first):
  1. **Quick Snapshot** hero (cards + the stacked right/wrong/skipped bar + score dial).
  2. **Tabbed or sectioned** "Right · Skipped · Wrong" — default to **Wrong** (most actionable) but
     let the snapshot's weakest-domain chip deep-link to it.
  3. **Per-question timeline** strip.
  4. **Full question review** (accordion) — filterable by Right/Skipped/Wrong/Marked.
- "Easy to consume" principles: progressive disclosure (snapshot first, detail on tap), plain-language
  insights ("You ran out of time — 4 of 5 skips were the last questions"), color semantics consistent
  with the runner (green/red/grey), one primary action per section ("Review these", "Practice this skill").
- **Actionable bridges**: each weak domain links to `practice.html?topic=<slug>` to drill it.

### 3.2 Accessing analysis later
- New **"My Tests" / history** view (either a tab on the account page or a section on `tests.html`):
  list of past attempts (date, test, score, accuracy) → tap opens the same Results & Analysis view
  for that `attemptId`.
- Account page already has a "Your progress" section — extend it / link it to attempt history.
- Re-rendering an old attempt uses the **stored** attempt doc (no recompute needed), so it's exact.

### 3.3 Comparison over time (bonus, cheap once history exists)
- If a user has multiple attempts of the same test (or any full test), show a **trend**: score over
  time, accuracy by domain over time. Strong motivation/retention driver.

---

## 4. Implementation phases

1. **Timing capture** in `ModuleRunner` (per-question timeSec, firstAnswerSec, changedAnswer).
2. **Attempt persistence**: write `progress/{uid}/attempts/{attemptId}` on submit; helper
   `saveAttempt()` + `getAttempt(id)` + `listAttempts()` in `firebase.js`.
3. **Analysis engine** (`src/data/analysisEngine.js`, pure): take an attempt record → compute the
   metrics for sections A–D (no UI, unit-testable). Keeps logic out of the view.
4. **Results & Analysis UI** (`src/analysis.jsx` or fold into `test.jsx`): snapshot + 4 sections +
   timeline + review, reusing the existing `test.css` design language.
5. **History view**: list + deep-link to any attempt (`analysis.html?attempt=<id>` or in-app route).
6. **Peer comparison (last, needs functions)**: `testStats/{testId}` aggregate + Cloud Function
   updater + percentile/histogram; UI rows that gracefully hide until min-sample is met.

**Sequencing note:** 1–5 are fully client-side + Firestore (shippable now). **6 (peer)** needs Cloud
Functions (Stage 2 infra: enable functions API, deploy under the Option 1 override) and a minimum
attempt volume to be meaningful — so it's a fast-follow, not a blocker. The UI is designed so peer
rows are additive and absent-gracefully.

## 5. Privacy / compliance notes
- Attempt records are the user's own data under `progress/{uid}/**` (already rule-protected;
  included in export-my-data and account deletion — extend both to cover `attempts`).
- Peer aggregates contain **no PII** (counts/sums only). Document them as a sub-processor-free internal
  metric in the Privacy Policy.
- Per-question timing is behavioral data on a minor → keep it within the user's own record + anonymous
  aggregates; never expose one student's data to another.

## 6. Open decisions for the user
- **Peer comparison now or later?** (needs Cloud Functions + volume) — recommend ship 1–5 first.
- **Scaled-score trend** across attempts — include in v1 or fast-follow?
- **How much peer detail** — just percentile band, or also per-question "% got right"? (more functions work)
- Where history lives — **account page tab** vs. **Mock Tests page** section (recommend account).
