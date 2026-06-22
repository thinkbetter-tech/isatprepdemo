// src/consentBanner.js
// -----------------------------------------------------------------------------
// Cookie / analytics consent banner UI.
//
// Plain DOM (this module is intentionally NOT React, so it can be mounted from
// every per-page entry module without pulling React into pages that don't need
// it). It is built against the consent contract in src/firebase.js:
//
//   localStorage key : 'isatprep_consent'  (exported as CONSENT_KEY)
//     - 'granted'  → user accepted non-essential analytics
//     - 'denied'   → user declined (analytics stays off)
//     - absent     → no choice yet; show the banner
//
//   Global Privacy Control: navigator.globalPrivacyControl === true forces
//     analytics OFF regardless of stored value. When GPC is on we never show the
//     banner and treat consent as denied (recording it so initFirebase() on later
//     loads is unambiguous).
//
//   Accept → CONSENT_KEY='granted', then enableAnalyticsAfterConsent() (safe
//            no-op when Firebase is unconfigured), then remove the banner.
//   Decline → CONSENT_KEY='denied', remove the banner. trackEvent() stays a no-op.
//
// GA4 is never auto-started on import; firebase.initFirebase() resumes analytics
// on later loads if consent was already granted (GPC still respected), so the
// banner only handles the first-time choice.
// -----------------------------------------------------------------------------

import { CONSENT_KEY, enableAnalyticsAfterConsent } from './firebase.js';

const BANNER_ID = 'isatprep-consent-banner';
const STYLE_ID = 'isatprep-consent-banner-style';

/** True when the browser is signalling Global Privacy Control. */
function gpcEnabled() {
  try {
    return typeof navigator !== 'undefined' && navigator.globalPrivacyControl === true;
  } catch {
    return false;
  }
}

function getStoredConsent() {
  try {
    return localStorage.getItem(CONSENT_KEY);
  } catch {
    return null; // storage unavailable → treat as "no decision yet"
  }
}

function setStoredConsent(value) {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    /* storage unavailable — non-fatal; analytics simply can't be remembered */
  }
}

/** Scoped CSS, injected once. Reuses the site's design tokens (--navy, --amber…). */
function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
#${BANNER_ID}{
  position:fixed; left:0; right:0; bottom:0; z-index:90;
  display:flex; gap:18px; align-items:center; justify-content:center; flex-wrap:wrap;
  padding:14px 24px;
  background:var(--navy, #152647); color:#E8ECF4;
  border-top:1px solid rgba(255,255,255,0.12);
  box-shadow:0 -8px 24px -16px rgba(0,0,0,0.55);
  font-family:var(--sans, system-ui, sans-serif); font-size:14px; line-height:1.5;
}
#${BANNER_ID} .cb-msg{max-width:62ch; margin:0; color:#E8ECF4;}
#${BANNER_ID} .cb-msg a{color:var(--amber, #F59E0B); text-decoration:underline; text-underline-offset:2px;}
#${BANNER_ID} .cb-actions{display:flex; gap:10px; flex:0 0 auto;}
#${BANNER_ID} .cb-btn{
  font-family:var(--sans, system-ui, sans-serif); font-size:13px; font-weight:600;
  padding:9px 18px; border-radius:8px; border:1px solid transparent; cursor:pointer;
  transition:background .15s ease, color .15s ease, border-color .15s ease;
}
#${BANNER_ID} .cb-accept{background:var(--amber, #F59E0B); color:#1a1205; border-color:var(--amber, #F59E0B);}
#${BANNER_ID} .cb-accept:hover{background:var(--amber-deep, #C97A05); border-color:var(--amber-deep, #C97A05); color:#fff;}
#${BANNER_ID} .cb-decline{background:transparent; color:#E8ECF4; border-color:rgba(255,255,255,0.4);}
#${BANNER_ID} .cb-decline:hover{border-color:#fff;}
#${BANNER_ID} .cb-btn:focus-visible{outline:2px solid var(--amber, #F59E0B); outline-offset:2px;}
@media (max-width:560px){
  #${BANNER_ID}{flex-direction:column; align-items:stretch; text-align:left; gap:12px;}
  #${BANNER_ID} .cb-actions{justify-content:flex-end;}
}
`;
  document.head.appendChild(style);
}

function removeBanner() {
  const el = document.getElementById(BANNER_ID);
  if (el && el.parentNode) el.parentNode.removeChild(el);
}

/**
 * Mounts the consent banner.
 *
 * Behavior:
 *   - GPC on → do NOT show the banner; record 'denied' so the decision is
 *     unambiguous, and return. (hasConsent() already enforces GPC independently.)
 *   - A decision is already stored ('granted' or 'denied') → do NOT show, return.
 *   - Otherwise render the banner.
 *
 * Idempotent: safe to call on every page and multiple times — a banner already
 * in the DOM short-circuits, so it never double-renders.
 */
export function mountConsentBanner() {
  if (typeof document === 'undefined' || !document.body) return;

  // GPC forces analytics off — never prompt, just record the implied decline.
  if (gpcEnabled()) {
    if (getStoredConsent() !== 'denied') setStoredConsent('denied');
    return;
  }

  // Decision already made in a prior session — nothing to ask.
  const stored = getStoredConsent();
  if (stored === 'granted' || stored === 'denied') return;

  // Idempotency guard — don't double-render if already mounted this page.
  if (document.getElementById(BANNER_ID)) return;

  injectStyle();

  const banner = document.createElement('div');
  banner.id = BANNER_ID;
  banner.setAttribute('role', 'region');
  banner.setAttribute('aria-label', 'Cookie and analytics consent');

  const msg = document.createElement('p');
  msg.className = 'cb-msg';
  msg.innerHTML =
    'We use privacy-respecting analytics to understand how iSATPrep is used and improve it. ' +
    'No analytics run until you choose. See our ' +
    '<a href="privacy.html">Privacy Policy</a>.';

  const actions = document.createElement('div');
  actions.className = 'cb-actions';

  const decline = document.createElement('button');
  decline.type = 'button';
  decline.className = 'cb-btn cb-decline';
  decline.textContent = 'Decline';
  decline.addEventListener('click', () => {
    setStoredConsent('denied');
    removeBanner(); // analytics stays off
  });

  const accept = document.createElement('button');
  accept.type = 'button';
  accept.className = 'cb-btn cb-accept';
  accept.textContent = 'Accept';
  accept.addEventListener('click', async () => {
    setStoredConsent('granted');
    try {
      await enableAnalyticsAfterConsent(); // safe no-op when unconfigured
    } catch {
      /* analytics must never throw into the UI */
    }
    removeBanner();
  });

  actions.appendChild(decline);
  actions.appendChild(accept);
  banner.appendChild(msg);
  banner.appendChild(actions);
  document.body.appendChild(banner);
}
