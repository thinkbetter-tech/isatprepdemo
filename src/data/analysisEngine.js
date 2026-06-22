// Post-test analysis engine — pure functions, no UI, no I/O.
// Turns a stored attempt record into the metrics for each analysis section
// (snapshot / right / skipped / wrong) plus per-question timing rollups.
//
// EVERYTHING here is derived from the actual attempt data passed in. There are
// NO hardcoded numbers or sample values — empty/degenerate inputs return
// well-defined empty results so the UI can render "not enough data" states.

const DOMAIN_NAMES = {
  'craft-and-structure': 'Craft and Structure',
  'information-and-ideas': 'Information and Ideas',
  'expression-of-ideas': 'Expression of Ideas',
  'standard-english-conventions': 'Standard English Conventions',
};
export function domainName(slug) { return DOMAIN_NAMES[slug] || slug || 'Unknown'; }

const SKILL_NAMES = {
  'words-in-context': 'Words in Context',
  'text-structure': 'Text Structure & Purpose',
  'cross-text-connections': 'Cross-Text Connections',
  'central-ideas-details': 'Central Ideas & Details',
  'command-of-evidence-textual': 'Command of Evidence (Textual)',
  'command-of-evidence-quantitative': 'Command of Evidence (Quantitative)',
  'inferences': 'Inferences',
  'rhetorical-synthesis': 'Rhetorical Synthesis',
  'transitions': 'Transitions',
  'boundaries': 'Boundaries',
  'form-structure-sense': 'Form, Structure & Sense',
};
export function skillName(slug) { return SKILL_NAMES[slug] || slug || '—'; }

// status helper: a question is 'right' | 'wrong' | 'skipped'
export function statusOf(q) {
  if (q.chosen == null) return 'skipped';
  return q.chosen === q.correctAnswer ? 'right' : 'wrong';
}

function mean(nums) {
  const a = nums.filter((n) => typeof n === 'number' && !Number.isNaN(n));
  return a.length ? a.reduce((s, n) => s + n, 0) / a.length : null;
}

// Group questions by a key and tally right/total + avg time.
function groupBy(questions, keyFn) {
  const out = {};
  for (const q of questions) {
    const k = keyFn(q);
    if (!out[k]) out[k] = { key: k, total: 0, right: 0, wrong: 0, skipped: 0, timeSecs: [] };
    const g = out[k];
    g.total++;
    g[statusOf(q)]++;
    if (typeof q.timeSec === 'number') g.timeSecs.push(q.timeSec);
  }
  return Object.values(out).map((g) => ({
    ...g,
    accuracy: g.total ? g.right / g.total : 0,
    avgSec: mean(g.timeSecs),
  }));
}

/**
 * Main entry: given an attempt record, produce the full analysis model.
 * attempt.questions[]: { id, domain, skill, difficulty, chosen, correctAnswer,
 *   timeSec, firstAnswerSec, changedAnswer, markedForReview, order }
 * attempt.score: { correct, total, scaledEstimate }
 * attempt.durationSec, attempt.allottedSec, attempt.module2Path
 */
export function analyzeAttempt(attempt) {
  const qs = (attempt && attempt.questions) || [];
  const total = qs.length;
  const withStatus = qs.map((q) => ({ ...q, status: statusOf(q) }));

  const right = withStatus.filter((q) => q.status === 'right');
  const wrong = withStatus.filter((q) => q.status === 'wrong');
  const skipped = withStatus.filter((q) => q.status === 'skipped');
  const attempted = right.length + wrong.length;

  const allTimes = withStatus.map((q) => q.timeSec).filter((t) => typeof t === 'number');
  const avgSec = mean(allTimes);
  const totalTimeSec = allTimes.reduce((s, t) => s + t, 0);

  const byDomain = groupBy(withStatus, (q) => q.domain);
  const bySkill = groupBy(withStatus, (q) => q.skill);
  const byDifficulty = groupBy(withStatus, (q) => q.difficulty || 'medium');

  // strongest / weakest domain by accuracy (only domains actually present)
  const domainsRanked = byDomain.filter((g) => g.total > 0).sort((a, b) => b.accuracy - a.accuracy);
  const strongestDomain = domainsRanked[0] || null;
  const weakestDomain = domainsRanked.length > 1 ? domainsRanked[domainsRanked.length - 1] : null;

  // ---- Section A: snapshot ----
  const snapshot = {
    scaledEstimate: attempt.score ? attempt.score.scaledEstimate ?? null : null,
    module2Path: attempt.module2Path || null,
    right: right.length, wrong: wrong.length, skipped: skipped.length, total,
    accuracy: attempted ? right.length / attempted : 0,        // of attempted
    completion: total ? attempted / total : 0,
    totalTimeSec: attempt.durationSec ?? totalTimeSec,
    allottedSec: attempt.allottedSec ?? null,
    avgSecPerQ: avgSec,
    strongestDomain: strongestDomain ? strongestDomain.key : null,
    weakestDomain: weakestDomain ? weakestDomain.key : null,
  };

  // ---- Section B: right ----
  const rightAvg = mean(right.map((q) => q.timeSec));
  const sectionRight = {
    items: right,
    byDomain: byDomain.map((g) => ({ key: g.key, right: g.right, total: g.total })),
    bySkill: bySkill.filter((g) => g.right > 0).map((g) => ({ key: g.key, right: g.right, total: g.total })),
    hardCleared: right.filter((q) => q.difficulty === 'hard').length,
    hardTotal: withStatus.filter((q) => q.difficulty === 'hard').length,
    avgSecOnCorrect: rightAvg,
    // "confident-correct": answered without changing and faster than their own average
    confidentCorrect: right.filter((q) => !q.changedAnswer && typeof q.timeSec === 'number' && avgSec != null && q.timeSec <= avgSec).length,
  };

  // ---- Section C: skipped ----
  // cluster detection: are skips concentrated in the last third (ran out of time)?
  const lastThirdStart = Math.ceil(total * 2 / 3);
  const skipsInLastThird = skipped.filter((q) => typeof q.order === 'number' && q.order >= lastThirdStart).length;
  const sectionSkipped = {
    items: skipped,
    count: skipped.length,
    byDomain: groupBy(skipped, (q) => q.domain).map((g) => ({ key: g.key, count: g.total })),
    easyMediumSkips: skipped.filter((q) => q.difficulty === 'easy' || q.difficulty === 'medium').length,
    markedButSkipped: skipped.filter((q) => q.markedForReview).length,
    pacingPattern: skipped.length === 0 ? 'none'
      : (skipsInLastThird / skipped.length >= 0.6 ? 'ran-out-of-time' : 'scattered'),
  };

  // ---- Section D: wrong ----
  const wrongRushed = wrong.filter((q) => typeof q.timeSec === 'number' && avgSec != null && q.timeSec < avgSec * 0.5).length;
  const wrongStuck = wrong.filter((q) => typeof q.timeSec === 'number' && avgSec != null && q.timeSec > avgSec * 1.5).length;
  const wrongChanged = wrong.filter((q) => q.changedAnswer).length;
  const sectionWrong = {
    items: wrong,
    byDomain: groupBy(wrong, (q) => q.domain).map((g) => ({ key: g.key, count: g.total })).sort((a, b) => b.count - a.count),
    bySkill: groupBy(wrong, (q) => q.skill).map((g) => ({ key: g.key, count: g.total })).sort((a, b) => b.count - a.count),
    byDifficulty: groupBy(wrong, (q) => q.difficulty || 'medium').map((g) => ({ key: g.key, count: g.total })),
    rushed: wrongRushed,
    stuck: wrongStuck,
    changedToWrong: wrongChanged,
  };

  // ---- timeline (per question, in test order) ----
  const timeline = withStatus
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((q) => ({ id: q.id, order: q.order, status: q.status, timeSec: q.timeSec ?? null }));

  return {
    snapshot, sectionRight, sectionSkipped, sectionWrong, timeline,
    byDomain, bySkill, byDifficulty,
    hasTiming: allTimes.length > 0,
  };
}

// Format helpers used by the UI.
export function fmtDuration(sec) {
  if (sec == null) return '—';
  const m = Math.floor(sec / 60), s = Math.round(sec % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}
