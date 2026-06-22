// Entry module for test.html — the full-screen exam runner.
import React from 'react';
import ReactDOM from 'react-dom/client';
import { initFirebase } from './firebase.js';
import { requireAuth } from './authGuard.js';
import './icons.jsx';
import './sections.jsx';
import { TestApp } from './test.jsx';

window.React = React;
window.ReactDOM = ReactDOM;

initFirebase(); // no-op without Firebase env
// Taking a test requires being signed in (and, enforced in-app, a paid plan).
requireAuth({ redirectTo: 'login.html' });

ReactDOM.createRoot(document.getElementById('root')).render(<TestApp />);
