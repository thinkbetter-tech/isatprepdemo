// Entry module for topics.html. Verbatim behavior of the old inline render.
// Old load order: icons, sections, topics.
import React from 'react';
import ReactDOM from 'react-dom/client';
import { initFirebase } from './firebase.js';
import { mountConsentBanner } from './consentBanner.js';
import './icons.jsx';
import './sections.jsx';
import { TopicsApp } from './topics.jsx';

window.React = React;
window.ReactDOM = ReactDOM;

initFirebase(); // no-op without Firebase env
mountConsentBanner();

ReactDOM.createRoot(document.getElementById('root')).render(<TopicsApp />);
