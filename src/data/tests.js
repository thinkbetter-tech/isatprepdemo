// Test definitions — the catalog shown on the Practice Test page.
// Tests are ASSEMBLED from the question bank by domain/difficulty filters (see
// testEngine.js), so adding questions automatically enriches them.
//
// Two kinds:
//  - "mini": one domain, single module, ~15 Q, ~20 min, NOT adaptive — skill drills.
//  - "full": full Digital SAT R&W simulation — 2 modules × 27 Q × 32 min, ADAPTIVE.
//
// requiredPlan gates access: 'core' covers everything we ship today. Free users
// see the catalog but cannot start (upgrade nudge).

export const DOMAINS = [
  { slug: 'craft-and-structure',          name: 'Craft and Structure' },
  { slug: 'information-and-ideas',         name: 'Information and Ideas' },
  { slug: 'expression-of-ideas',           name: 'Expression of Ideas' },
  { slug: 'standard-english-conventions',  name: 'Standard English Conventions' },
];

// Module shapes consumed by testEngine.assembleModule:
//   { minutes, count, domains?, skill?, difficultyMix? }
const MINI_MINUTES = 20;
const MINI_COUNT = 15;
const FULL_MODULE_MINUTES = 32;
const FULL_MODULE_COUNT = 27;
const BREAK_MINUTES = 10;

const miniTests = DOMAINS.map((d, i) => ({
  id: `mini-${d.slug}`,
  kind: 'mini',
  title: `${d.name} — Mini Test`,
  blurb: `A focused, timed ${MINI_COUNT}-question drill on ${d.name}.`,
  requiredPlan: 'core',
  adaptive: false,
  breakMinutes: 0,
  modules: [
    { minutes: MINI_MINUTES, count: MINI_COUNT, domains: [d.slug], difficultyMix: ['easy', 'medium', 'hard'] },
  ],
  order: 10 + i,
}));

const fullTests = [1, 2, 3].map((n) => ({
  id: `full-rw-${n}`,
  kind: 'full',
  title: `Full Reading & Writing Test ${n}`,
  blurb: 'Full Digital SAT R&W simulation: 2 adaptive modules, 27 questions and 32 minutes each, with a 10-minute break.',
  requiredPlan: 'core',
  adaptive: true,
  breakMinutes: BREAK_MINUTES,
  modules: [
    // Module 1: all domains, balanced medium-first mix (the routing module).
    { minutes: FULL_MODULE_MINUTES, count: FULL_MODULE_COUNT, domains: DOMAINS.map((d) => d.slug), difficultyMix: ['medium', 'easy', 'hard'] },
    // Module 2: difficultyMix is overridden at runtime by the adaptive path
    // (upper => hard-first, lower => easy-first) in testEngine.assembleAdaptiveModule2.
    { minutes: FULL_MODULE_MINUTES, count: FULL_MODULE_COUNT, domains: DOMAINS.map((d) => d.slug), difficultyMix: ['medium'] },
  ],
  order: n,
}));

export const TESTS = [...fullTests, ...miniTests].sort((a, b) => a.order - b.order);

export function getTest(id) {
  return TESTS.find((t) => t.id === id) || null;
}

// Plan ranking for gating: does `userPlan` satisfy `requiredPlan`?
const PLAN_RANK = { free: 0, core: 1, complete: 2 };
export function planAllows(userPlan, requiredPlan) {
  return (PLAN_RANK[userPlan] ?? 0) >= (PLAN_RANK[requiredPlan] ?? 1);
}
