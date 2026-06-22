// Entry module for index-print.html. Verbatim behavior of the old inline block,
// including the auto-print routine. Old load order: tweaks-panel, icons, sections.
//
// NOTE ON PARITY: the original PrintApp references <Walkthroughs />, a component
// that has NEVER been defined or exported by sections.jsx (verified against git
// history). Under the old in-browser-Babel setup this referenced an undefined
// global and threw at render time — i.e. this print page was already broken in
// production. We preserve that exact behavior here rather than silently "fixing"
// it (fixing would change behavior and is out of scope). `Walkthroughs` is read
// off window so the bundle compiles; it is `undefined` at runtime, reproducing the
// same render failure as today. The later owner of print can decide to add it.
import React from 'react';
import ReactDOM from 'react-dom/client';
import { initFirebase } from './firebase.js';
import { mountConsentBanner } from './consentBanner.js';
import './tweaks-panel.jsx';
import { Nav, Hero, Problem, Method, Demo, Instructor, Topics, Testimonials, Pricing, FAQ, FinalCTA, Footer } from './sections.jsx';

window.React = React;
window.ReactDOM = ReactDOM;

initFirebase(); // no-op without Firebase env
mountConsentBanner();

// Preserves the original (broken) reference: undefined at runtime, as it was.
const Walkthroughs = window.Walkthroughs;

const TWEAK_DEFAULTS = {
  "navy": "#152647",
  "amber": "#F59E0B",
  "bg": "#FAFAF7",
  "headlineFont": "Fraunces",
  "bodyFont": "Source Sans 3",
  "density": "regular",
  "heroVariant": "diagram"
};

function PrintApp() {
  // Apply theme variables once (no tweaks panel in print)
  React.useEffect(() => {
    const r = document.documentElement.style;
    r.setProperty('--navy', TWEAK_DEFAULTS.navy);
    r.setProperty('--navy-2', TWEAK_DEFAULTS.navy);
    r.setProperty('--amber', TWEAK_DEFAULTS.amber);
    r.setProperty('--bg', TWEAK_DEFAULTS.bg);
    r.setProperty('--serif', `"${TWEAK_DEFAULTS.headlineFont}", Georgia, serif`);
    r.setProperty('--sans', `"${TWEAK_DEFAULTS.bodyFont}", system-ui, sans-serif`);
    document.body.classList.add('density-regular');
  }, []);

  return (
    <div data-screen-label="Marketing Home (print)">
      <Nav />
      <Hero onOpenDemo={() => {}} variant="diagram" />
      <Problem />
      <Method />
      <Demo onOpenDemo={() => {}} />
      <Walkthroughs />
      <Instructor />
      <Topics />
      <Testimonials />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<PrintApp />);

// Auto-print once everything is ready
(async function autoPrint(){
  try { if (document.fonts && document.fonts.ready) { await document.fonts.ready; } } catch(e){}
  // Wait for images to load
  const imgs = Array.from(document.images || []);
  await Promise.all(imgs.map(img => img.complete ? null : new Promise(res => { img.onload = img.onerror = res; })));
  await new Promise(r => setTimeout(r, 500));
  window.print();
})();
