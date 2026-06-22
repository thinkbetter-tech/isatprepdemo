# Question bank schema (canonical)

Every question across the app uses this exact shape. Questions live in
`src/data/questions-<domain>.js`, one file per SAT R&W domain, each exporting a
default array.

```js
{
  id: "ci-001",            // unique string id: <domain-prefix>-<3 digits>
  domain: "information-and-ideas",  // one of the 4 domain slugs (see below)
  skill: "command-of-evidence",     // finer skill tag within the domain
  difficulty: "medium",    // "easy" | "medium" | "hard"
  source: "ai-draft",      // provenance — ALWAYS "ai-draft" for generated Qs
  title: "Question · Command of Evidence",  // short human label
  passage: "….",           // the stimulus/passage text. Use \n\n for paragraph breaks.
                           // Use ||text|| to mark an underlined span when the question
                           // refers to one (matches existing convention in practice.jsx).
  prompt: "Which choice best …?",
  choices: [
    { k: "A", text: "…" },
    { k: "B", text: "…" },
    { k: "C", text: "…" },
    { k: "D", text: "…" },
  ],
  answer: "B",             // the correct choice key
  explanation: "…",        // why the answer is right AND why others are wrong.
                           // **bold** markdown is allowed (rendered elsewhere).
  method: [                // 2-5 short solver steps (the iSATPrep "method")
    "Step 1 …",
    "Step 2 …",
  ],
}
```

## Domain slugs + prefixes
| Domain slug | Prefix | SAT skills to cover |
|---|---|---|
| `craft-and-structure` | `cs` | words in context, text structure & purpose, cross-text connections |
| `information-and-ideas` | `ii` | central ideas & details, command of evidence (textual + quantitative), inferences |
| `expression-of-ideas` | `eo` | rhetorical synthesis, transitions |
| `standard-english-conventions` | `se` | boundaries (punctuation), form/structure/sense (grammar, agreement, verbs) |

## Rules
- **120 questions per domain** → ~480 total. IDs sequential within a file (`cs-001`…`cs-120`).
- Difficulty spread per domain: ~40 easy, ~50 medium, ~30 hard.
- Each question is **self-contained** and answerable from its passage.
- 4 choices (A–D), exactly one correct. Plausible distractors.
- Digital SAT style: passages ~25–150 words; concise, exam-realistic prompts.
- For `information-and-ideas`, include some **quantitative** items (passage references a
  simple table/graph described in words) to mirror the real test.
- Valid JS: escape quotes, no trailing commas that break parsing. Export:
  `export default [ … ];`
