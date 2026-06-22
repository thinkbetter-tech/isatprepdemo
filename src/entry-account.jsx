// Entry module for account.html — the Account/Settings page.
import React from 'react';
import ReactDOM from 'react-dom/client';
import { initFirebase } from './firebase.js';
import { mountConsentBanner } from './consentBanner.js';
import { requireAuth } from './authGuard.js';
import './icons.jsx';
import './sections.jsx';
import { AccountApp } from './account.jsx';

window.React = React;
window.ReactDOM = ReactDOM;

initFirebase(); // no-op without Firebase env
mountConsentBanner();

// Account is a signed-in-only page: redirect to login when configured + signed out.
requireAuth({ redirectTo: 'login.html' });

ReactDOM.createRoot(document.getElementById('root')).render(<AccountApp />);
