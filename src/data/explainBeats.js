// Question Explanation Animations — Beat List
// ─────────────────────────────────────────────────────────────────────────
// Four short walkthroughs (~37–41s each) of the free-tier practice
// questions on the Text Structure & Purpose topic. Shipra narrates each
// question's reasoning; this file holds the per-question data + timed beat
// list that the explain.jsx renderer uses to drive the passage highlights,
// choice-elimination sequence, and final answer stamp.
//
// Loaded as plain JS (no Babel) and exposed as window globals so
// explain.jsx (Babel-transformed) can reference it.

// ── Per-question data ──────────────────────────────────────────────────
// Passage, prompt, choices, correct answer, and audio file. The passage
// for Q1 carries ||...|| markers around the visibly-underlined sentence
// (the question prompt asks about "the underlined sentence"). Q2/Q3/Q4
// have no visible underlines — the teacher's "Underline." in narration is
// a verbal pointer at a sentence, animated via beat highlights only.

export const EXPLAIN_DATA = {
  1: {
    title: "Question 1 · Function",
    type: "Function",
    typeSubtitle: "What move does the sentence make?",
    passage:
      "The following text is from Charlotte Perkins Gilman's 1892 short story \"The Yellow Wallpaper.\" " +
      "The narrator, who has recently given birth, is describing the bedroom in which her physician " +
      "husband has confined her for a \"rest cure.\"\n\n" +
      "It is the strangest yellow, that wall-paper! It makes me think of all the yellow things I ever " +
      "saw — not beautiful ones like buttercups, but old foul, bad yellow things. ||But there is " +
      "something else about that paper — the smell!|| ... The only thing I can think of that it is " +
      "like is the color of the paper! A yellow smell.",
    prompt:
      "Which choice best describes the function of the underlined sentence in the text as a whole?",
    choices: [
      { letter: "A", text: "It introduces a new aspect of the wallpaper that the narrator finds appealing despite her earlier criticisms." },
      { letter: "B", text: "It marks a shift from describing the wallpaper's visual qualities to describing a sensory perception that intensifies her fixation." },
      { letter: "C", text: "It establishes the narrator's growing confidence in her ability to interpret her surroundings rationally." },
      { letter: "D", text: "It contrasts the narrator's earlier observations with her husband's clinical assessment of the room." },
    ],
    correct: "B",
    audio: "audio/q1_v2.mp3",
    duration: 40.91,
  },
  2: {
    title: "Question 2 · Purpose",
    type: "Purpose",
    typeSubtitle: "What is the passage doing?",
    passage:
      "Many archaeologists studying the early agricultural settlements of the Levant have argued " +
      "that the shift to farming brought a decline in human health: skeletal remains from this " +
      "period show evidence of nutritional deficiencies and increased disease. Anthropologist Marta " +
      "Mirazón Lahr, however, contends that these conclusions rely on a narrow sample. In her 2019 " +
      "review, Mirazón Lahr points to recent excavations in regions overlooked by earlier studies, " +
      "where remains show no such decline — and in some cases, improved health markers.",
    prompt: "What is the main purpose of the text?",
    choices: [
      { letter: "A", text: "To argue that early farming communities were healthier than hunter-gatherer populations." },
      { letter: "B", text: "To summarize a researcher's challenge to a prevailing claim about early agriculture." },
      { letter: "C", text: "To describe the methods used in a recent archaeological excavation." },
      { letter: "D", text: "To explain why nutritional deficiencies were common in early farming settlements." },
    ],
    correct: "B",
    audio: "audio/q2_v2.mp3",
    duration: 37.96,
  },
  3: {
    title: "Question 3 · Structure",
    type: "Structure",
    typeSubtitle: "How is the passage organized?",
    passage:
      "When a star roughly eight times the mass of the Sun exhausts its nuclear fuel, gravity " +
      "overwhelms the outward pressure that once held the star in equilibrium. The core collapses " +
      "in seconds. As infalling matter rebounds off the now ultra-dense core, a shock wave tears " +
      "outward — and the star, in a final paroxysm, becomes a supernova. What remains is no longer " +
      "a star at all, but a neutron star: a city-sized sphere with the mass of the Sun.",
    prompt: "Which choice best describes the overall structure of the text?",
    choices: [
      { letter: "A", text: "It compares two competing theories about how massive stars die." },
      { letter: "B", text: "It outlines a sequence of events that transforms a massive star into a neutron star." },
      { letter: "C", text: "It defines a scientific term and then provides examples of that term in use." },
      { letter: "D", text: "It poses a question about stellar evolution and answers it with observational data." },
    ],
    correct: "B",
    audio: "audio/q3_v2.mp3",
    duration: 38.61,
  },
  4: {
    title: "Question 4 · Purpose",
    type: "Purpose",
    typeSubtitle: "What is the passage doing?",
    passage:
      "In her 2021 essay \"On Repair,\" the writer Aisha Sabatini Sloan argues that the act of " +
      "repairing a broken object is rarely just about restoring its function. Mending, she " +
      "suggests, is also a form of attention — a slow refusal to discard. Her essay opens with the " +
      "image of her grandmother darning a sock, the needle moving \"like a small animal returning " +
      "home.\"",
    prompt: "Which choice best states the main purpose of the text?",
    choices: [
      { letter: "A", text: "To describe the techniques Sabatini Sloan recommends for mending textiles." },
      { letter: "B", text: "To trace the history of the essay form in twenty-first-century writing." },
      { letter: "C", text: "To introduce a writer's central claim about the meaning of repair." },
      { letter: "D", text: "To compare Sabatini Sloan's essay to a similar work by another writer." },
    ],
    correct: "C",
    audio: "audio/q4_v2.mp3",
    duration: 36.60,
  },
};

// ── Beat lists ─────────────────────────────────────────────────────────
// Each beat carries the FULL state of the stage at that moment — verbose
// but explicit. The renderer doesn't accumulate; it just reads. Fields:
//   phase    — "intro" | "highlights" | "trace" | "knock" | "answer"
//   highlights — { span, role, caption? }[]
//                 role: "before" | "underline" | "after" | "claim" |
//                       "counter" | "pivot-word" | "step1" | "stepN" |
//                       "middle"
//   trace    — { caption, arrowFrom?, arrowTo? }   trace move between spans
//   knocked  — { letter, reason }[]                struck choices
//   ringCorrect — boolean                          whether B/C is ringed amber

export const EXPLAIN_BEATS = {
  // ─── Q1 — Yellow Wallpaper · Function (40.91s) ─────────────────────────
  // "Okay, function question. The underlined sentence is the pivot.
  //  Before it, 'strangest yellow, foul, bad yellow things,' all visual,
  //  sight. After it, 'a yellow smell,' sensory, and smelling colors shows
  //  her fixation deepening. So the sentence bridges visual to sensory,
  //  intensifying her obsession. That is exactly B. A says appealing, she
  //  calls it foul. C says rational, she is smelling colors, opposite.
  //  D pulls in the husband, not in the passage. Answer is B."
  1: [
    {
      id: "q1-b1", offset: 0, duration: 3, phase: "intro",
      payload: { introText: "Function question.", introSubtitle: "What move does the sentence make?" },
    },
    {
      id: "q1-b2", offset: 3, duration: 5, phase: "highlights",
      payload: {
        highlights: [
          { span: "But there is something else about that paper — the smell!", role: "underline", caption: "the pivot sentence" },
        ],
      },
    },
    {
      id: "q1-b3", offset: 8, duration: 6, phase: "highlights",
      payload: {
        highlights: [
          { span: "It is the strangest yellow, that wall-paper!", role: "before", caption: "visual" },
          { span: "old foul, bad yellow things.", role: "before" },
          { span: "But there is something else about that paper — the smell!", role: "underline", caption: "the pivot sentence" },
        ],
      },
    },
    {
      id: "q1-b4", offset: 14, duration: 7, phase: "highlights",
      payload: {
        highlights: [
          { span: "It is the strangest yellow, that wall-paper!", role: "before", caption: "visual" },
          { span: "old foul, bad yellow things.", role: "before" },
          { span: "But there is something else about that paper — the smell!", role: "underline", caption: "the pivot sentence" },
          { span: "A yellow smell.", role: "after", caption: "sensory" },
        ],
      },
    },
    {
      id: "q1-b5", offset: 21, duration: 6, phase: "trace",
      payload: {
        highlights: [
          { span: "It is the strangest yellow, that wall-paper!", role: "before" },
          { span: "old foul, bad yellow things.", role: "before" },
          { span: "But there is something else about that paper — the smell!", role: "underline" },
          { span: "A yellow smell.", role: "after" },
        ],
        trace: { caption: "visual → sensory · obsession deepens" },
        ringCorrect: true,
      },
    },
    {
      id: "q1-b6", offset: 27, duration: 11, phase: "knock",
      payload: {
        highlights: [
          { span: "But there is something else about that paper — the smell!", role: "underline" },
        ],
        knocked: [
          { letter: "A", reason: "she calls it foul — not appealing" },
          { letter: "C", reason: "she's smelling colors — not rational" },
          { letter: "D", reason: "husband never appears in the passage" },
        ],
        ringCorrect: true,
      },
    },
    {
      id: "q1-b7", offset: 38, duration: 3, phase: "answer",
      payload: { answer: "B", caption: "visual → sensory" },
    },
  ],

  // ─── Q2 — Levant · Purpose (37.96s) ────────────────────────────────────
  // "Okay, purpose question. Start, 'archaeologists argued farming brought
  //  a decline in health.' Underline. Then comes the pivot word, 'however.'
  //  Mirazón Lahr challenges with new excavations showing no decline.
  //  Underline. So a researcher is pushing back on a prevailing claim, and
  //  the passage is reporting that. That is exactly B. A overclaims, the
  //  text is not arguing. C talks about methods, never described. D goes
  //  opposite, the passage questions deficiencies. Answer is B."
  2: [
    {
      id: "q2-b1", offset: 0, duration: 3, phase: "intro",
      payload: { introText: "Purpose question.", introSubtitle: "What is the passage doing?" },
    },
    {
      id: "q2-b2", offset: 3, duration: 8, phase: "highlights",
      payload: {
        highlights: [
          { span: "the shift to farming brought a decline in human health", role: "claim", caption: "the prevailing claim" },
        ],
      },
    },
    {
      id: "q2-b3", offset: 11, duration: 5, phase: "highlights",
      payload: {
        highlights: [
          { span: "the shift to farming brought a decline in human health", role: "claim", caption: "the prevailing claim" },
          { span: "however", role: "pivot-word", caption: "the pivot" },
        ],
      },
    },
    {
      id: "q2-b4", offset: 16, duration: 7, phase: "highlights",
      payload: {
        highlights: [
          { span: "the shift to farming brought a decline in human health", role: "claim", caption: "the prevailing claim" },
          { span: "however", role: "pivot-word" },
          { span: "contends that these conclusions rely on a narrow sample", role: "counter", caption: "the challenge" },
        ],
      },
    },
    {
      id: "q2-b5", offset: 23, duration: 5, phase: "trace",
      payload: {
        highlights: [
          { span: "the shift to farming brought a decline in human health", role: "claim" },
          { span: "however", role: "pivot-word" },
          { span: "contends that these conclusions rely on a narrow sample", role: "counter" },
        ],
        trace: { caption: "claim → counter · the text reports the challenge" },
        ringCorrect: true,
      },
    },
    {
      id: "q2-b6", offset: 28, duration: 7, phase: "knock",
      payload: {
        knocked: [
          { letter: "A", reason: "the text reports, doesn't argue" },
          { letter: "C", reason: "methods never described" },
          { letter: "D", reason: "the text questions the deficiencies" },
        ],
        ringCorrect: true,
      },
    },
    {
      id: "q2-b7", offset: 35, duration: 3, phase: "answer",
      payload: { answer: "B", caption: "claim → counter" },
    },
  ],

  // ─── Q3 — Neutron star · Structure (38.61s) ────────────────────────────
  // "Okay, structure question. Start, 'a massive star exhausts its fuel,
  //  gravity wins.' Underline. End, 'what remains is a neutron star.'
  //  Underline. In between, core collapse, shock wave, supernova. That is
  //  a sequence, start to end, with steps. That is exactly B. A says two
  //  theories, only one explanation here. C says definition with examples,
  //  this is a process. D says question and answer, no question asked.
  //  Answer is B."
  3: [
    {
      id: "q3-b1", offset: 0, duration: 3, phase: "intro",
      payload: { introText: "Structure question.", introSubtitle: "How is the passage organized?" },
    },
    {
      id: "q3-b2", offset: 3, duration: 7, phase: "highlights",
      payload: {
        highlights: [
          { span: "When a star roughly eight times the mass of the Sun exhausts its nuclear fuel, gravity overwhelms the outward pressure that once held the star in equilibrium.", role: "step1", caption: "start" },
        ],
      },
    },
    {
      id: "q3-b3", offset: 10, duration: 6, phase: "highlights",
      payload: {
        highlights: [
          { span: "When a star roughly eight times the mass of the Sun exhausts its nuclear fuel, gravity overwhelms the outward pressure that once held the star in equilibrium.", role: "step1", caption: "start" },
          { span: "What remains is no longer a star at all, but a neutron star: a city-sized sphere with the mass of the Sun.", role: "stepN", caption: "end" },
        ],
      },
    },
    {
      id: "q3-b4", offset: 16, duration: 7, phase: "trace",
      payload: {
        highlights: [
          { span: "When a star roughly eight times the mass of the Sun exhausts its nuclear fuel, gravity overwhelms the outward pressure that once held the star in equilibrium.", role: "step1", caption: "start" },
          { span: "The core collapses in seconds.", role: "middle" },
          { span: "As infalling matter rebounds off the now ultra-dense core, a shock wave tears outward — and the star, in a final paroxysm, becomes a supernova.", role: "middle" },
          { span: "What remains is no longer a star at all, but a neutron star: a city-sized sphere with the mass of the Sun.", role: "stepN", caption: "end" },
        ],
        trace: { caption: "start → core collapse → shock wave → supernova → end · a sequence" },
      },
    },
    {
      id: "q3-b5", offset: 23, duration: 4, phase: "trace",
      payload: {
        highlights: [
          { span: "When a star roughly eight times the mass of the Sun exhausts its nuclear fuel, gravity overwhelms the outward pressure that once held the star in equilibrium.", role: "step1" },
          { span: "The core collapses in seconds.", role: "middle" },
          { span: "As infalling matter rebounds off the now ultra-dense core, a shock wave tears outward — and the star, in a final paroxysm, becomes a supernova.", role: "middle" },
          { span: "What remains is no longer a star at all, but a neutron star: a city-sized sphere with the mass of the Sun.", role: "stepN" },
        ],
        trace: { caption: "a sequence — start to end with steps" },
        ringCorrect: true,
      },
    },
    {
      id: "q3-b6", offset: 27, duration: 7, phase: "knock",
      payload: {
        knocked: [
          { letter: "A", reason: "only one account — no two theories" },
          { letter: "C", reason: "this is a process, not a definition" },
          { letter: "D", reason: "no question is asked in the passage" },
        ],
        ringCorrect: true,
      },
    },
    {
      id: "q3-b7", offset: 34, duration: 5, phase: "answer",
      payload: { answer: "B", caption: "a sequence" },
    },
  ],

  // ─── Q4 — Sabatini Sloan · Purpose (36.60s) ────────────────────────────
  // "Okay, purpose question. First sentence, 'Sabatini Sloan argues
  //  repairing is more than restoring function.' Underline, the writer's
  //  claim. End, her essay opens with the grandmother darning a sock.
  //  Underline, how the essay opens. So the passage is introducing a
  //  writer and her central claim about repair. That is exactly C. A says
  //  techniques, never given. B says history of the essay form, way too
  //  big. D says comparison, no second writer. Answer is C."
  4: [
    {
      id: "q4-b1", offset: 0, duration: 3, phase: "intro",
      payload: { introText: "Purpose question.", introSubtitle: "What is the passage doing?" },
    },
    {
      id: "q4-b2", offset: 3, duration: 8, phase: "highlights",
      payload: {
        highlights: [
          { span: "In her 2021 essay \"On Repair,\" the writer Aisha Sabatini Sloan argues that the act of repairing a broken object is rarely just about restoring its function.", role: "claim", caption: "the writer's claim" },
        ],
      },
    },
    {
      id: "q4-b3", offset: 11, duration: 7, phase: "highlights",
      payload: {
        highlights: [
          { span: "In her 2021 essay \"On Repair,\" the writer Aisha Sabatini Sloan argues that the act of repairing a broken object is rarely just about restoring its function.", role: "claim", caption: "the writer's claim" },
          { span: "Her essay opens with the image of her grandmother darning a sock, the needle moving \"like a small animal returning home.\"", role: "after", caption: "how the essay opens" },
        ],
      },
    },
    {
      id: "q4-b4", offset: 18, duration: 7, phase: "trace",
      payload: {
        highlights: [
          { span: "In her 2021 essay \"On Repair,\" the writer Aisha Sabatini Sloan argues that the act of repairing a broken object is rarely just about restoring its function.", role: "claim" },
          { span: "Her essay opens with the image of her grandmother darning a sock, the needle moving \"like a small animal returning home.\"", role: "after" },
        ],
        trace: { caption: "introduces a writer + her central claim" },
        ringCorrect: true,
      },
    },
    {
      id: "q4-b5", offset: 25, duration: 7, phase: "knock",
      payload: {
        knocked: [
          { letter: "A", reason: "no techniques are described" },
          { letter: "B", reason: "the essay-form's history is way too big" },
          { letter: "D", reason: "no second writer to compare to" },
        ],
        ringCorrect: true,
      },
    },
    {
      id: "q4-b6", offset: 32, duration: 4, phase: "answer",
      payload: { answer: "C", caption: "writer + claim + image" },
    },
  ],
};

window.EXPLAIN_DATA = EXPLAIN_DATA;
window.EXPLAIN_BEATS = EXPLAIN_BEATS;
