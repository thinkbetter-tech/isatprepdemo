// Entry module for tests.html — the Practice Test catalog/list page.
import React from 'react';
import ReactDOM from 'react-dom/client';
import { initFirebase } from './firebase.js';
import { mountConsentBanner } from './consentBanner.js';
import './icons.jsx';
import './sections.jsx';
import { TestsApp } from './tests-list.jsx';

window.React = React;
window.ReactDOM = ReactDOM;

initFirebase(); // no-op without Firebase env
mountConsentBanner();

// NOTE: the list page is intentionally NOT auth-gated — free/anonymous users can
// browse the catalog (it drives upgrades). Individual tests gate on start.

ReactDOM.createRoot(document.getElementById('root')).render(<TestsApp />);
