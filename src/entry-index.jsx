// Entry module for index.html (Marketing Home).
//
// MODULE STRATEGY: ES module imports. Each component file exports its components
// AND still assigns them to window (legacy parity). This entry imports React +
// ReactDOM, imports the component modules in dependency order, and runs the SAME
// App() + createRoot render that previously lived in the inline <script type=
// "text/babel"> block — behavior is verbatim.
//
// React/ReactDOM are also placed on window to mirror the old CDN-global
// environment, so any `React.*` / `ReactDOM.*` reference resolves identically.
import React from 'react';
import ReactDOM from 'react-dom/client';
import { initFirebase, trackEvent } from './firebase.js';
import { mountConsentBanner } from './consentBanner.js';

// Mirror the old CDN globals (React, ReactDOM were window globals under unpkg).
window.React = React;
window.ReactDOM = ReactDOM;

// Import component modules in dependency order (their window assignments run as a
// side effect, matching the old <script> load order: tweaks-panel, icons, sections).
import { useTweaks, TweaksPanel, TweakSection, TweakColor, TweakSelect, TweakRadio } from './tweaks-panel.jsx';
import { Nav, Hero, Problem, Method, Demo, Instructor, Topics, Testimonials, Pricing, FAQ, FinalCTA, Footer, VideoModal } from './sections.jsx';

initFirebase();
mountConsentBanner();

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "navy": "#152647",
  "amber": "#F59E0B",
  "bg": "#FAFAF7",
  "headlineFont": "Fraunces",
  "bodyFont": "Source Sans 3",
  "density": "regular",
  "heroVariant": "diagram"
}/*EDITMODE-END*/;

const DEMO_VIDEO_URL = "https://www.youtube.com/embed/z3ZQ-9Cn8TE";

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [demoOpen, setDemoOpen] = React.useState(false);

  // Single source-of-truth for "user invoked the demo" (Hero "Watch demo" button
  // and the Demo card both call this). Opens the video modal. trackEvent() is a
  // safe no-op until analytics consent is granted.
  const openDemo = React.useCallback(() => {
    trackEvent('demo_video_open');
    setDemoOpen(true);
  }, []);

  // Apply tweaks to :root
  React.useEffect(() => {
    const r = document.documentElement.style;
    r.setProperty('--navy', t.navy);
    r.setProperty('--navy-2', t.navy);
    r.setProperty('--amber', t.amber);
    r.setProperty('--bg', t.bg);
    r.setProperty('--serif', `"${t.headlineFont}", Georgia, serif`);
    r.setProperty('--sans', `"${t.bodyFont}", system-ui, sans-serif`);

    document.body.classList.remove('density-compact','density-regular','density-comfy');
    document.body.classList.add('density-' + t.density);
  }, [t]);

  // Load font dynamically if not in default link
  React.useEffect(() => {
    const families = [t.headlineFont, t.bodyFont];
    const id = 'dyn-fonts';
    let l = document.getElementById(id);
    const href = `https://fonts.googleapis.com/css2?${families.map(f => `family=${encodeURIComponent(f)}:wght@400;500;600;700`).join('&')}&display=swap`;
    if (!l) {
      l = document.createElement('link');
      l.id = id; l.rel = 'stylesheet';
      document.head.appendChild(l);
    }
    l.href = href;
  }, [t.headlineFont, t.bodyFont]);

  // Cross-page #anchor scroll: the browser's native scroll-to-hash fires before
  // React has rendered the target section, so re-trigger it after mount.
  React.useEffect(() => {
    const hash = window.location.hash;
    if (!hash || hash === '#') return;
    requestAnimationFrame(() => {
      const el = document.querySelector(hash);
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
    });
  }, []);

  return (
    <div data-screen-label="Marketing Home">
      <Nav />
      <Hero onOpenDemo={openDemo} variant={t.heroVariant} />
      <Problem />
      <Method />
      <Demo onOpenDemo={openDemo} />
      <Instructor />
      <Topics />
      <Testimonials />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />

      <VideoModal open={demoOpen} onClose={() => setDemoOpen(false)} url={DEMO_VIDEO_URL} />

      <TweaksPanel title="Tweaks">
        <TweakSection label="Theme" />
        <TweakColor label="Navy" value={t.navy} onChange={(v)=>setTweak('navy',v)} />
        <TweakColor label="Amber" value={t.amber} onChange={(v)=>setTweak('amber',v)} />
        <TweakColor label="Background" value={t.bg} onChange={(v)=>setTweak('bg',v)} />

        <TweakSection label="Typography" />
        <TweakSelect label="Headline" value={t.headlineFont}
          options={[
            {value:"Fraunces", label:"Fraunces (warm serif)"},
            {value:"Playfair Display", label:"Playfair Display"},
            {value:"Source Serif 4", label:"Source Serif 4"},
            {value:"DM Serif Display", label:"DM Serif Display"},
          ]}
          onChange={(v)=>setTweak('headlineFont',v)} />
        <TweakSelect label="Body" value={t.bodyFont}
          options={[
            {value:"Source Sans 3", label:"Source Sans 3"},
            {value:"Inter", label:"Inter"},
            {value:"IBM Plex Sans", label:"IBM Plex Sans"},
            {value:"Geist", label:"Geist"},
          ]}
          onChange={(v)=>setTweak('bodyFont',v)} />

        <TweakSection label="Layout" />
        <TweakRadio label="Density" value={t.density}
          options={['compact','regular','comfy']}
          onChange={(v)=>setTweak('density',v)} />
        <TweakRadio label="Hero" value={t.heroVariant}
          options={['diagram','quiet']}
          onChange={(v)=>setTweak('heroVariant',v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
