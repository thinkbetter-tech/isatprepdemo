// Entry module for explain.html — the animated, voiced question walkthrough
// launched from the free practice questions (?q=1..4).
import React from 'react';
import ReactDOM from 'react-dom/client';
import { initFirebase } from './firebase.js';
import { mountConsentBanner } from './consentBanner.js';
import { ExplainApp } from './explain.jsx';

window.React = React;
window.ReactDOM = ReactDOM;

initFirebase(); // no-op without Firebase env
mountConsentBanner();

ReactDOM.createRoot(document.getElementById('root')).render(<ExplainApp />);
