/** @type {import('tailwindcss').Config} */
// Tailwind is used ONLY by the AI Classroom pages (the marketing site keeps
// styles.css). The classroom components were authored against a set of
// semantic token names (surface/primary/text/etc.); here those names are
// remapped to iSATPrep's brand palette (navy / amber / cream, Fraunces +
// Source Sans) so the ported UI renders on-brand. The generated CSS is
// imported only by entry-classroom, so it never touches the marketing pages.
export default {
  content: [
    './classroom.html',
    './src/components/**/*.{js,jsx,ts,tsx}',
    './src/hooks/**/*.{js,jsx,ts,tsx}',
    './src/pages/**/*.{js,jsx,ts,tsx}',
    './src/entry-classroom.{jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Paper canvas
        background: '#FAFAF7',            // --bg
        'background-secondary': '#F4F2EC', // --bg-2
        surface: '#FFFFFF',
        'surface-hover': '#F4F2EC',
        'surface-active': '#ECE9DF',
        border: '#E5E2D8',                // --rule
        'border-light': '#D9D5CA',

        // Primary = navy (the brand ink/structure color)
        primary: '#152647',               // --navy
        'primary-hover': '#0F1E3D',       // --navy-2
        'primary-muted': '#1B2D52',       // --navy-3
        'primary-soft': '#DCE3EE',        // light navy tint

        // Amber = the single accent
        amber: '#F59E0B',                 // --amber
        'amber-soft': '#FCE9C7',
        'amber-ink': '#C97A05',           // --amber-deep

        // Semantic signifiers
        success: '#2F8552',
        'success-muted': '#1E7546',
        'success-soft': '#D7F4E0',
        warning: '#C97A05',
        'warning-muted': '#C97A05',
        error: '#C9302D',
        'error-muted': '#9E1618',
        info: '#2584B2',
        'info-muted': '#1D6A90',

        // Ink on paper
        text: '#1F2937',                  // --ink
        'text-secondary': '#374151',
        'text-muted': '#4B5563',          // --ink-soft
        'text-dim': '#6B7280',
      },
      fontFamily: {
        sans: ['"Source Sans 3"', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['Fraunces', '"Source Serif 4"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SF Mono', 'Menlo', 'monospace'],
      },
      borderRadius: {
        lg: '10px',
        xl: '14px',
        '2xl': '20px',
        '3xl': '28px',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(15, 23, 42, 0.05), 0 8px 24px -12px rgba(15, 23, 42, 0.12)',
        'soft-lg': '0 2px 4px rgba(15, 23, 42, 0.04), 0 24px 60px -20px rgba(15, 23, 42, 0.18)',
      },
    },
  },
  plugins: [],
};
