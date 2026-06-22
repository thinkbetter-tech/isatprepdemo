// Aggregated question bank — single source of truth for the whole app.
// Combines the four per-domain generated files plus the original 4 hand-written
// questions (migrated from practice.jsx, tagged source:"original").
//
// The per-domain files are produced by the generation agents and conform to
// src/data/SCHEMA.md. Until a domain file is populated it exports [] (stub), so
// this aggregator is always safe to import.

import craftAndStructure from './questions-craft-and-structure.js';
import informationAndIdeas from './questions-information-and-ideas.js';
import expressionOfIdeas from './questions-expression-of-ideas.js';
import standardEnglishConventions from './questions-standard-english-conventions.js';
// Batch 2 (ids …-031..060)
import craftAndStructure2 from './questions-craft-and-structure-2.js';
import informationAndIdeas2 from './questions-information-and-ideas-2.js';
import expressionOfIdeas2 from './questions-expression-of-ideas-2.js';
import standardEnglishConventions2 from './questions-standard-english-conventions-2.js';

// The original 4 questions that shipped in practice.jsx, normalized to the schema
// (domain craft-and-structure; kept as the free-practice samples).
export const ORIGINAL_QUESTIONS = [
  {
    id: 'orig-1', domain: 'craft-and-structure', skill: 'text-structure',
    difficulty: 'medium', source: 'original',
    title: 'Question 1 · Text Structure',
    passage: "The following text is from Charlotte Perkins Gilman's 1892 short story \"The Yellow Wallpaper.\" The narrator, who has recently given birth, is describing the bedroom in which her physician husband has confined her for a \"rest cure.\"\n\nIt is the strangest yellow, that wall-paper! It makes me think of all the yellow things I ever saw — not beautiful ones like buttercups, but old foul, bad yellow things. ||But there is something else about that paper — the smell!|| ... The only thing I can think of that it is like is the color of the paper! A yellow smell.",
    prompt: 'Which choice best describes the function of the underlined sentence in the text as a whole?',
    choices: [
      { k: 'A', text: 'It introduces a new aspect of the wallpaper that the narrator finds appealing despite her earlier criticisms.' },
      { k: 'B', text: "It marks a shift from describing the wallpaper's visual qualities to describing a sensory perception that intensifies her fixation." },
      { k: 'C', text: "It establishes the narrator's growing confidence in her ability to interpret her surroundings rationally." },
      { k: 'D', text: "It contrasts the narrator's earlier observations with her husband's clinical assessment of the room." },
    ],
    answer: 'B',
    explanation: "The underlined sentence — \"But there is something else about that paper — the smell!\" — pivots from the narrator's prior **visual** description (\"the strangest yellow,\" \"foul, bad yellow things\") to a new **olfactory** preoccupation (\"a yellow smell\"). This is a structural transition: it doesn't soften her view (eliminating A), doesn't show rational interpretation (eliminating C), and her husband isn't referenced (eliminating D). Choice **B** correctly identifies the sentence as marking a shift in sensory mode that deepens her obsession.",
    method: [
      'Locate the underlined sentence and identify what comes before and after it.',
      "Before: visual description of the wallpaper's color. After: description of its smell.",
      "Predict: 'transitions from sight to smell.'",
      'Match prediction to the choice that names the same shift — B.',
    ],
  },
  {
    id: 'orig-2', domain: 'craft-and-structure', skill: 'text-structure',
    difficulty: 'medium', source: 'original',
    title: 'Question 2 · Purpose',
    passage: 'Many archaeologists studying the early agricultural settlements of the Levant have argued that the shift to farming brought a decline in human health: skeletal remains from this period show evidence of nutritional deficiencies and increased disease. Anthropologist Marta Mirazón Lahr, however, contends that these conclusions rely on a narrow sample. In her 2019 review, Mirazón Lahr points to recent excavations in regions overlooked by earlier studies, where remains show no such decline — and in some cases, improved health markers.',
    prompt: 'Which choice best states the main purpose of the text?',
    choices: [
      { k: 'A', text: 'To argue that farming improved health in early agricultural societies.' },
      { k: 'B', text: 'To present a challenge to a prevailing view about early farming and health.' },
      { k: 'C', text: 'To describe the excavation methods used by recent archaeologists.' },
      { k: 'D', text: 'To explain why early farming led to nutritional deficiencies.' },
    ],
    answer: 'B',
    explanation: "The text sets up a prevailing view (\"shift to farming brought a decline in human health\") and then introduces Mirazón Lahr's counter (\"these conclusions rely on a narrow sample\"). The text's job is to **report her challenge**, not to settle the argument. A overstates — the text doesn't claim farming was healthier, only that the decline isn't universal. C is off-topic. D restates the claim being challenged.",
    method: [
      'Identify the prevailing view stated first.',
      'Identify the turn ("however") and whose view follows.',
      "The purpose is to present that challenge — match to B.",
    ],
  },
  {
    id: 'orig-3', domain: 'craft-and-structure', skill: 'text-structure',
    difficulty: 'medium', source: 'original',
    title: 'Question 3 · Text Structure',
    passage: 'When a star roughly eight times the mass of the Sun exhausts its nuclear fuel, gravity overwhelms the outward pressure that once held the star in equilibrium. The core collapses in seconds. As infalling matter rebounds off the now ultra-dense core, a shock wave tears outward — and the star, in a final paroxysm, becomes a supernova. What remains is no longer a star at all, but a neutron star: a city-sized sphere with the mass of the Sun.',
    prompt: 'Which choice best describes the overall structure of the text?',
    choices: [
      { k: 'A', text: 'It presents two competing accounts of how stars die.' },
      { k: 'B', text: 'It traces a sequence of cause-and-effect stages in a single process.' },
      { k: 'C', text: 'It defines a technical term and then gives counterexamples.' },
      { k: 'D', text: 'It poses a question and surveys possible answers.' },
    ],
    answer: 'B',
    explanation: 'The text is a **chronological cause-and-effect chain**: fuel exhausted → gravity wins → core collapses → shock wave → supernova → neutron star. Each sentence advances the timeline. A is wrong — only one account is given. C is wrong — no term is formally defined first. D is wrong — there\'s no question posed.',
    method: [
      'Track what each sentence does in order.',
      'Notice each step causes the next (chronological cause/effect).',
      'Match that progression to B.',
    ],
  },
  {
    id: 'orig-4', domain: 'craft-and-structure', skill: 'text-structure',
    difficulty: 'medium', source: 'original',
    title: 'Question 4 · Purpose',
    passage: 'In her 2021 essay "On Repair," the writer Aisha Sabatini Sloan argues that the act of repairing a broken object is rarely just about restoring its function. Mending, she suggests, is also a form of attention — a slow refusal to discard. Her essay opens with the image of her grandmother darning a sock, the needle moving "like a small animal returning home."',
    prompt: 'Which choice best states the main purpose of the text?',
    choices: [
      { k: 'A', text: 'To explain the techniques involved in mending worn clothing.' },
      { k: 'B', text: "To compare Sabatini Sloan's essay to other essays about repair." },
      { k: 'C', text: "To introduce a claim from Sabatini Sloan's essay and an illustrative image." },
      { k: 'D', text: "To question whether repairing objects is worth the effort." },
    ],
    answer: 'C',
    explanation: "The text exists to summarize **what Sabatini Sloan argues** (\"repair is rarely just about restoring function\" / \"a form of attention\") and to give one illustrative image. That's an introduction of a claim — answer **C**. A is too literal — no techniques are described. B is off-topic. D is wrong — no comparison is made.",
    method: [
      'Identify whose idea the text reports and what that idea is.',
      'Note the opening image illustrating the idea.',
      'Purpose = introduce the claim + image → C.',
    ],
  },
];

// Full bank: generated questions per domain + the original samples.
export const QUESTIONS = [
  ...ORIGINAL_QUESTIONS,
  ...craftAndStructure, ...craftAndStructure2,
  ...informationAndIdeas, ...informationAndIdeas2,
  ...expressionOfIdeas, ...expressionOfIdeas2,
  ...standardEnglishConventions, ...standardEnglishConventions2,
];

export function questionsByDomain(slug) {
  return QUESTIONS.filter((q) => q.domain === slug);
}

// Free-practice sample = the original 4 (the publicly unlocked questions).
export const FREE_SAMPLE = ORIGINAL_QUESTIONS;

export function bankStats() {
  const byDomain = {};
  for (const q of QUESTIONS) byDomain[q.domain] = (byDomain[q.domain] || 0) + 1;
  return { total: QUESTIONS.length, byDomain };
}
