// Test engine — pure, UI-free logic for assembling, scoring, and adapting tests.
// Depends only on the question SCHEMA (not on any specific question content), so
// it can be built and unit-reasoned independently of the generated question bank.
//
// A "test definition" (see tests.js) describes WHAT a test is; this module turns
// it into a concrete set of questions, scores answers, drives Module 2 adaptivity,
// and estimates a scaled score.

// ---------------------------------------------------------------------------
// Deterministic shuff/sample helpers
// ---------------------------------------------------------------------------
// We avoid Math.random at module load so test assembly is stable within an
// attempt; callers pass a numeric seed (e.g. derived from attempt id / index).
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Pick up to `n` questions matching a filter, by difficulty preference.
// `pref` is an ordered list of difficulties to draw from (falls back across them).
function pick(pool, n, pref, rng) {
  const byDiff = { easy: [], medium: [], hard: [] };
  for (const q of pool) (byDiff[q.difficulty] || byDiff.medium).push(q);
  Object.keys(byDiff).forEach((k) => { byDiff[k] = shuffle(byDiff[k], rng); });

  const out = [];
  const order = pref && pref.length ? pref : ['medium', 'easy', 'hard'];
  // Round-robin across the preferred difficulties for a natural mix.
  let guard = 0;
  while (out.length < n && guard < 10000) {
    let added = false;
    for (const d of order) {
      if (out.length >= n) break;
      if (byDiff[d] && byDiff[d].length) { out.push(byDiff[d].pop()); added = true; }
    }
    if (!added) break; // pools exhausted
    guard++;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------
/**
 * Build the question list for a single module from the bank.
 * @param {Array} bank      full question array
 * @param {Object} moduleDef { count, difficultyMix?, domains?, skill? }
 * @param {number} seed
 * @returns {Array} questions for the module
 */
export function assembleModule(bank, moduleDef, seed) {
  const rng = mulberry32(seed);
  let pool = bank;
  if (moduleDef.domains && moduleDef.domains.length) {
    pool = pool.filter((q) => moduleDef.domains.includes(q.domain));
  }
  if (moduleDef.skill) pool = pool.filter((q) => q.skill === moduleDef.skill);

  // difficultyMix is an ordered preference, e.g. ['medium','easy'] for Module 1,
  // ['hard','medium'] for an "upper" adaptive Module 2, ['easy','medium'] for "lower".
  return pick(pool, moduleDef.count, moduleDef.difficultyMix, rng);
}

/**
 * Assemble Module 1 (and, for mini/non-adaptive tests, the whole test). Module 2
 * for full adaptive tests is assembled later via assembleAdaptiveModule2 once
 * Module 1 is scored.
 */
export function assembleTest(def, bank, seed = 1) {
  const modules = def.modules.map((m, i) => assembleModule(bank, m, seed + i * 101));
  return { ...def, assembled: modules };
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------
/**
 * Score one module's answers.
 * @param {Array} questions  the module's questions
 * @param {Object} answers   map questionId -> chosen key ("A".."D")
 */
export function scoreModule(questions, answers) {
  let correct = 0;
  const perQuestion = questions.map((q) => {
    const chosen = answers ? answers[q.id] : undefined;
    const isCorrect = chosen != null && chosen === q.answer;
    if (isCorrect) correct++;
    return { id: q.id, chosen: chosen ?? null, correct: isCorrect, answer: q.answer };
  });
  return { correct, total: questions.length, perQuestion };
}

// ---------------------------------------------------------------------------
// Adaptivity (Digital SAT: Module 2 difficulty depends on Module 1 performance)
// ---------------------------------------------------------------------------
/**
 * Decide the Module 2 path from Module 1 score. Returns 'upper' (harder) or
 * 'lower' (easier). Threshold ~60% mirrors the real test's routing intent.
 */
export function chooseModule2Path(module1Score) {
  const ratio = module1Score.total ? module1Score.correct / module1Score.total : 0;
  return ratio >= 0.6 ? 'upper' : 'lower';
}

/** Build Module 2 for a full adaptive test given the chosen path. */
export function assembleAdaptiveModule2(def, bank, path, seed, excludeIds = []) {
  const m2 = def.modules[1];
  const difficultyMix = path === 'upper' ? ['hard', 'medium'] : ['easy', 'medium'];
  const pool = bank.filter((q) => !excludeIds.includes(q.id));
  return assembleModule(pool, { ...m2, difficultyMix }, seed + 777);
}

// ---------------------------------------------------------------------------
// Scaled-score estimate (clearly an approximation, NOT College Board's algorithm)
// ---------------------------------------------------------------------------
/**
 * Estimate an R&W scaled score (200-800). The real exam uses a proprietary
 * adaptive model; this is a transparent approximation: base band set by the
 * Module 2 path, then interpolated by total correct ratio. Always present this
 * to users as "estimated".
 */
export function estimateScaledScore({ module1, module2, path }) {
  const totalCorrect = module1.correct + (module2 ? module2.correct : 0);
  const totalQ = module1.total + (module2 ? module2.total : 0);
  const ratio = totalQ ? totalCorrect / totalQ : 0;
  // Path sets the reachable band; ratio places within it.
  const band = path === 'upper' ? { min: 480, max: 800 } : { min: 200, max: 600 };
  const raw = band.min + (band.max - band.min) * ratio;
  // Round to nearest 10 like SAT subscores.
  return Math.max(200, Math.min(800, Math.round(raw / 10) * 10));
}

/** Aggregate per-domain performance for the results breakdown. */
export function domainBreakdown(questions, answers) {
  const by = {};
  for (const q of questions) {
    const d = q.domain || 'unknown';
    by[d] = by[d] || { correct: 0, total: 0 };
    by[d].total++;
    if (answers && answers[q.id] === q.answer) by[d].correct++;
  }
  return by;
}
