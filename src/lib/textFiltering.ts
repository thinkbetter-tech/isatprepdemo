/**
 * Shared text filtering utilities for voice chat transcripts.
 * Filters out AI internal thinking/instruction text that shouldn't be displayed.
 */

// Patterns that indicate internal AI thinking (not meant for display)
const THINKING_PATTERNS = [
  /^\*\*[^*]+\*\*\s*$/,  // Lines that are ONLY **bold text** (thinking markers)
  /^\*\*[A-Z][a-z]+ [A-Z]/,  // **Title Case Headers like **Formulating a Plan**
  /^\*\*Beginning/i,
  /^\*\*Formulating/i,
  /^\*\*Constructing/i,
  /^\*\*Designing/i,
  /^\*\*Planning/i,
  /^\*\*Calculating/i,
  /^\*\*Initiating/i,
  /^\*\*Refocusing/i,
  /^\*\*Visualizing/i,
  /^\*\*Clarifying/i,
  /^\*\*Step \d+/i,
  /^\*\*Calling/i,
  /^\*\*Now I will/i,
  /^\*\*First,? I/i,
  /^\*\*Let me/i,
  /^\*\*I need to/i,
  /^\*\*Next,? I/i,
  /^\*\*Drawing/i,
  /^\*\*Using/i,
  /^Okay,? I've/i,
  /^I've decided/i,
  /^I've determined/i,
  /^I've shifted/i,
  /^I've sketched/i,
  /^I'm now/i,
  /^I'm starting/i,
  /^I'm setting/i,
  /^I'm hoping/i,
  /^I am trying/i,
  /^I am starting/i,
  /^I am working/i,
  /^Now, I'm/i,
  /^Right now, I'm/i,
  /^My next step/i,
  /^The goal is to/i,
  /^This visual setup/i,
  /^Each diagram/i,
  /^I'll call/i,
  /^Now calling/i,
  /^Executing/i,
];

function isThinkingParagraph(para: string): boolean {
  const trimmed = para.trim();
  for (const pattern of THINKING_PATTERNS) {
    if (pattern.test(trimmed)) return true;
  }
  if (trimmed.startsWith('**') && trimmed.endsWith('**')) return true;
  return false;
}

/**
 * Split a transcript into thinking paragraphs (preserved as a list) and the
 * user-facing answer. Markdown bold markers are stripped from both.
 *
 * Returning thinking as a list (not a single joined string) lets the UI show
 * the latest "thinking" line by default and expand to show the full history,
 * which is how the panel surfaces the model's chain-of-thought without
 * cluttering the chat bubble.
 */
export function extractThinking(text: string): {
  thinkingParagraphs: string[];
  answer: string;
} {
  if (!text || text.trim() === '') return { thinkingParagraphs: [], answer: '' };

  const stripBold = (s: string) => s.replace(/\*\*/g, '').trim();
  const paragraphs = text.trim().split(/\n\n+/);
  const thinkingParagraphs: string[] = [];
  const answerParts: string[] = [];

  for (const para of paragraphs) {
    if (isThinkingParagraph(para)) {
      const cleaned = stripBold(para);
      if (cleaned) thinkingParagraphs.push(cleaned);
    } else {
      answerParts.push(para.trim());
    }
  }

  return {
    thinkingParagraphs,
    answer: stripBold(answerParts.join('\n\n')),
  };
}

/**
 * Legacy shim — keeps the older { thinking, answer } shape working for
 * callers that haven't migrated to the paragraph-list version yet.
 */
export function extractThinkingAndAnswer(text: string): { thinking: string; answer: string } {
  const { thinkingParagraphs, answer } = extractThinking(text);
  return { thinking: thinkingParagraphs.join('\n\n'), answer };
}

/**
 * Filter out AI thinking/instruction text from transcriptions.
 * Returns cleaned text or null if everything was filtered out.
 */
export function filterThinkingText(text: string): string | null {
  const { answer } = extractThinkingAndAnswer(text);
  return answer || null;
}
