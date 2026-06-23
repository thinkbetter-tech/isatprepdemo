// Entry module for classroom.html — the AI Classroom (voice tutor + board).
// Tailwind + KaTeX styles are imported here so they apply ONLY to this page.
import React from 'react';
import ReactDOM from 'react-dom/client';
// @ts-ignore - JS module without declarations
import { initFirebase } from './firebase.js';
// @ts-ignore - JS module without declarations
import { mountConsentBanner } from './consentBanner.js';
// @ts-ignore - JS module without declarations
import { requireAuth } from './authGuard.js';
import 'katex/dist/katex.min.css';
import './classroom.css';
import { ClassroomPage } from './pages/ClassroomPage';

(window as any).React = React;
(window as any).ReactDOM = ReactDOM;

initFirebase(); // no-op without Firebase env
mountConsentBanner();

// Gate the page: when Firebase IS configured, unauthenticated visitors are
// redirected to login. The paid-plan check happens inside ClassroomPage.
requireAuth({ redirectTo: 'login.html' });

ReactDOM.createRoot(document.getElementById('root')!).render(<ClassroomPage />);
