// Shared SVG icons, glyphs, and the hero diagram for iSATPrep.

const Check = ({color="#0F1E3D"}) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M3 8.5L6.5 12L13 4.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const NoCheck = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M4 8H12" stroke="#9CA3AF" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);

const ArrowRight = ({size=16, color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M3 8H13M13 8L8.5 3.5M13 8L8.5 12.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const Plus = ({size=14}) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
    <path d="M7 2V12M2 7H12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);

const PlayIcon = ({size=32}) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <path d="M11 7L24 16L11 25V7Z" fill="#1a1205"/>
  </svg>
);

// Method step glyphs — math-y / set-notation
const GlyphRead = () => (
  <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
    <rect x="14" y="20" width="52" height="40" rx="2" stroke="#152647" strokeWidth="1.5"/>
    <line x1="22" y1="30" x2="58" y2="30" stroke="#152647" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="22" y1="38" x2="50" y2="38" stroke="#152647" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
    <line x1="22" y1="46" x2="56" y2="46" stroke="#152647" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
    <line x1="22" y1="54" x2="44" y2="54" stroke="#152647" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
    <rect x="20" y="27" width="40" height="6" fill="#F59E0B" opacity="0.35"/>
  </svg>
);

const GlyphFormula = () => (
  <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
    <path d="M22 20 Q 14 20 14 28 V 52 Q 14 60 22 60" stroke="#152647" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    <path d="M58 20 Q 66 20 66 28 V 52 Q 66 60 58 60" stroke="#152647" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    <text x="40" y="38" textAnchor="middle" fill="#152647" fontFamily="Fraunces, serif" fontSize="14" fontWeight="500">f(x)</text>
    <line x1="26" y1="46" x2="54" y2="46" stroke="#F59E0B" strokeWidth="1.5"/>
    <text x="40" y="56" textAnchor="middle" fill="#152647" fontFamily="Fraunces, serif" fontSize="11" fontStyle="italic">answer</text>
  </svg>
);

const GlyphEliminate = () => (
  <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
    <g>
      <rect x="14" y="18" width="52" height="9" rx="1.5" stroke="#152647" strokeWidth="1.5"/>
      <line x1="18" y1="22.5" x2="62" y2="22.5" stroke="#9CA3AF" strokeWidth="1.5"/>
    </g>
    <g>
      <rect x="14" y="30" width="52" height="9" rx="1.5" stroke="#152647" strokeWidth="1.5"/>
      <line x1="18" y1="34.5" x2="62" y2="34.5" stroke="#9CA3AF" strokeWidth="1.5"/>
    </g>
    <g>
      <rect x="14" y="42" width="52" height="9" rx="1.5" stroke="#F59E0B" strokeWidth="1.8" fill="#FFF8EC"/>
    </g>
    <g>
      <rect x="14" y="54" width="52" height="9" rx="1.5" stroke="#152647" strokeWidth="1.5"/>
      <line x1="18" y1="58.5" x2="62" y2="58.5" stroke="#9CA3AF" strokeWidth="1.5"/>
    </g>
  </svg>
);

const HeroDiagram = () => (
  <div className="hero-diagram" aria-hidden="true">
    <svg viewBox="0 0 480 480" width="100%" height="100%">
      {/* Outer brackets — set notation */}
      <path d="M70 90 Q 50 90 50 110 V 370 Q 50 390 70 390" stroke="#152647" strokeWidth="1.5" fill="none"/>
      <path d="M410 90 Q 430 90 430 110 V 370 Q 430 390 410 390" stroke="#152647" strokeWidth="1.5" fill="none"/>

      {/* Faint grid */}
      <g opacity="0.35">
        <line x1="80" y1="160" x2="400" y2="160" stroke="#E5E2D8" strokeWidth="1"/>
        <line x1="80" y1="240" x2="400" y2="240" stroke="#E5E2D8" strokeWidth="1"/>
        <line x1="80" y1="320" x2="400" y2="320" stroke="#E5E2D8" strokeWidth="1"/>
      </g>

      {/* "passage" block */}
      <g transform="translate(80,120)">
        <text fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#9CA3AF" letterSpacing="1.4">PASSAGE</text>
        <rect x="0" y="10" width="160" height="64" rx="3" fill="#F4F2EC" stroke="#E5E2D8"/>
        <line x1="8" y1="22" x2="148" y2="22" stroke="#152647" strokeWidth="1.2" opacity="0.7"/>
        <line x1="8" y1="32" x2="138" y2="32" stroke="#152647" strokeWidth="1.2" opacity="0.45"/>
        <line x1="8" y1="42" x2="148" y2="42" stroke="#152647" strokeWidth="1.2" opacity="0.45"/>
        <line x1="8" y1="52" x2="120" y2="52" stroke="#152647" strokeWidth="1.2" opacity="0.45"/>
        <rect x="6" y="60" width="60" height="8" fill="#F59E0B" opacity="0.45"/>
      </g>

      {/* operator + */}
      <text x="265" y="160" fontFamily="Fraunces, serif" fontSize="38" fill="#152647" textAnchor="middle">+</text>

      {/* "method" block */}
      <g transform="translate(290,120)">
        <text fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#9CA3AF" letterSpacing="1.4">METHOD</text>
        <rect x="0" y="10" width="100" height="64" rx="3" fill="#152647"/>
        <text x="50" y="38" textAnchor="middle" fontFamily="Fraunces, serif" fontStyle="italic" fontSize="20" fill="#fff">f</text>
        <text x="50" y="56" textAnchor="middle" fontFamily="Fraunces, serif" fontSize="11" fill="#fff" opacity="0.8">x → y</text>
      </g>

      {/* equals line */}
      <line x1="80" y1="220" x2="400" y2="220" stroke="#152647" strokeWidth="1.2"/>
      <line x1="80" y1="226" x2="400" y2="226" stroke="#152647" strokeWidth="1.2"/>

      {/* answer choices, one highlighted */}
      <g transform="translate(80,250)">
        <text fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#9CA3AF" letterSpacing="1.4">ANSWER</text>
        <g transform="translate(0,16)">
          <rect width="320" height="22" rx="3" fill="none" stroke="#E5E2D8"/>
          <text x="14" y="15" fontFamily="JetBrains Mono, monospace" fontSize="11" fill="#9CA3AF">A.</text>
          <line x1="32" y1="11" x2="200" y2="11" stroke="#9CA3AF" strokeWidth="1"/>
          <line x1="280" y1="11" x2="306" y2="11" stroke="#9CA3AF" strokeWidth="1"/>
        </g>
        <g transform="translate(0,42)">
          <rect width="320" height="22" rx="3" fill="#FFF8EC" stroke="#F59E0B" strokeWidth="1.5"/>
          <text x="14" y="15" fontFamily="JetBrains Mono, monospace" fontSize="11" fill="#C97A05" fontWeight="600">B.</text>
          <line x1="32" y1="11" x2="220" y2="11" stroke="#152647" strokeWidth="1.2"/>
          <line x1="290" y1="11" x2="306" y2="11" stroke="#F59E0B" strokeWidth="1.5"/>
        </g>
        <g transform="translate(0,68)">
          <rect width="320" height="22" rx="3" fill="none" stroke="#E5E2D8"/>
          <text x="14" y="15" fontFamily="JetBrains Mono, monospace" fontSize="11" fill="#9CA3AF">C.</text>
          <line x1="32" y1="11" x2="180" y2="11" stroke="#9CA3AF" strokeWidth="1"/>
        </g>
        <g transform="translate(0,94)">
          <rect width="320" height="22" rx="3" fill="none" stroke="#E5E2D8"/>
          <text x="14" y="15" fontFamily="JetBrains Mono, monospace" fontSize="11" fill="#9CA3AF">D.</text>
          <line x1="32" y1="11" x2="210" y2="11" stroke="#9CA3AF" strokeWidth="1"/>
        </g>
      </g>

      {/* margin note */}
      <g transform="translate(370,260)">
        <text fontFamily="JetBrains Mono, monospace" fontSize="9" fill="#C97A05" letterSpacing="0.6">∴ B</text>
      </g>
    </svg>
  </div>
);

Object.assign(window, { Check, NoCheck, ArrowRight, Plus, PlayIcon, GlyphRead, GlyphFormula, GlyphEliminate, HeroDiagram });
