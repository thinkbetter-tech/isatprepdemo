// Entry module for preview-dashboard.html. Verbatim behavior of old inline render.
// Old load order: icons, sections, topics, preview.
import React from 'react';
import ReactDOM from 'react-dom/client';
import { initFirebase } from './firebase.js';
import { mountConsentBanner } from './consentBanner.js';
import './icons.jsx';
import './sections.jsx';
import './topics.jsx';
import { DashboardApp } from './preview.jsx';

window.React = React;
window.ReactDOM = ReactDOM;

initFirebase(); // no-op without Firebase env
mountConsentBanner();

ReactDOM.createRoot(document.getElementById('root')).render(<DashboardApp />);
