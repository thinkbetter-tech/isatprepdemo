import katex from 'katex';

/**
 * Renders LaTeX math expressions to HTML using KaTeX
 */
export function renderMath(latex: string, displayMode: boolean = false): string {
  try {
    return katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      strict: false,
      trust: true,
      macros: {
        '\\vec': '\\overrightarrow{#1}',
      },
    });
  } catch (error) {
    console.error('KaTeX render error:', error);
    return latex;
  }
}

/**
 * Processes text containing LaTeX expressions and returns HTML
 * Handles multiple delimiter styles:
 * - Display math: $$...$$ and \[...\]
 * - Inline math: $...$ and \(...\)
 */
export function processLatex(text: string): string {
  if (!text) return '';

  let processed = text;

  // Process display math first ($$...$$)
  processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, (_, latex) => {
    const html = renderMath(latex.trim(), true);
    return `<div class="katex-display">${html}</div>`;
  });

  // Process display math (\[...\])
  processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, (_, latex) => {
    const html = renderMath(latex.trim(), true);
    return `<div class="katex-display">${html}</div>`;
  });

  // Process inline math (\(...\))
  processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, (_, latex) => {
    return renderMath(latex.trim(), false);
  });

  // Process inline math ($...$)
  // Use negative lookbehind/lookahead to avoid matching $$ or escaped \$
  processed = processed.replace(/(?<!\$)\$(?!\$)((?:[^$\\]|\\.)+?)\$(?!\$)/g, (_, latex) => {
    return renderMath(latex.trim(), false);
  });

  return processed;
}

/**
 * Checks if a string contains LaTeX math expressions
 * Detects: $...$, $$...$$, \(...\), and \[...\]
 */
export function containsLatex(text: string): boolean {
  if (!text) return false;
  // Check for $...$ or $$...$$ or \(...\) or \[...\]
  return /\$[^$]+\$|\$\$[\s\S]+?\$\$|\\\([\s\S]+?\\\)|\\\[[\s\S]+?\\\]/.test(text);
}

/**
 * Escapes special LaTeX characters in plain text
 */
export function escapeLatex(text: string): string {
  return text
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/[&%$#_{}~^]/g, '\\$&');
}

/**
 * Common physics/chemistry symbols mapping for display
 */
export const commonSymbols: Record<string, string> = {
  // Greek letters
  'alpha': 'α',
  'beta': 'β',
  'gamma': 'γ',
  'delta': 'δ',
  'epsilon': 'ε',
  'theta': 'θ',
  'lambda': 'λ',
  'mu': 'μ',
  'pi': 'π',
  'sigma': 'σ',
  'omega': 'ω',
  'Delta': 'Δ',
  'Omega': 'Ω',

  // Physics symbols
  'hbar': 'ℏ',
  'nabla': '∇',
  'infty': '∞',
  'partial': '∂',
  'approx': '≈',
  'neq': '≠',
  'leq': '≤',
  'geq': '≥',
  'pm': '±',
  'times': '×',
  'div': '÷',
  'cdot': '·',
  'sqrt': '√',
  'sum': 'Σ',
  'int': '∫',
  'rightarrow': '→',
  'leftarrow': '←',
  'Rightarrow': '⇒',
  'Leftarrow': '⇐',
};

/**
 * Formats a number with proper subscript/superscript HTML
 */
export function formatScientificNotation(num: number, precision: number = 2): string {
  if (num === 0) return '0';

  const exp = Math.floor(Math.log10(Math.abs(num)));
  const mantissa = num / Math.pow(10, exp);

  if (exp === 0) return num.toFixed(precision);

  return `${mantissa.toFixed(precision)} × 10<sup>${exp}</sup>`;
}

/**
 * Converts units string to proper format with superscripts
 * e.g., "m/s^2" -> "m/s²"
 */
export function formatUnits(units: string): string {
  const superscripts: Record<string, string> = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
    '-': '⁻', '+': '⁺',
  };

  return units.replace(/\^([0-9+-]+)/g, (_, exp) => {
    return exp.split('').map((c: string) => superscripts[c] || c).join('');
  });
}
