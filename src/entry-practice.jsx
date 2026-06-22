// Entry module for practice.html. Verbatim behavior of the old inline render.
// Old load order: icons, sections, topics, preview, practice.
import React from 'react';
import ReactDOM from 'react-dom/client';
import { initFirebase } from './firebase.js';
import { mountConsentBanner } from './consentBanner.js';
import { requireAuth } from './authGuard.js';
import './icons.jsx';
import './sections.jsx';
import './topics.jsx';
import './preview.jsx';
import { PracticeApp } from './practice.jsx';

window.React = React;
window.ReactDOM = ReactDOM;

initFirebase(); // no-op without Firebase env
mountConsentBanner();

// Gate the practice page: when Firebase IS configured, unauthenticated visitors
// are redirected to login.html. When it is NOT configured (local dev, no .env),
// this is a no-op so the page still renders. We still render below either way —
// the redirect (when it fires) replaces the page before it matters.
requireAuth({ redirectTo: 'login.html' });

ReactDOM.createRoot(document.getElementById('root')).render(<PracticeApp />);
