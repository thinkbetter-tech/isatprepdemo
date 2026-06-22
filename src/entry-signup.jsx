// Entry module for signup.html. Verbatim behavior of the old inline Page() block.
import React from 'react';
import ReactDOM from 'react-dom/client';
import { initFirebase } from './firebase.js';
import { mountConsentBanner } from './consentBanner.js';
import { redirectIfSignedIn } from './authGuard.js';
import { SignupForm, AuthSide } from './auth.jsx';

window.React = React;
window.ReactDOM = ReactDOM;

initFirebase(); // no-op without Firebase env; real auth wired later
mountConsentBanner();
// Already signed in? Skip signup — go to the app.
redirectIfSignedIn({ redirectTo: 'practice.html' });

function Page() {
  return (
    <div className="auth-page">
      <SignupForm />
      <AuthSide mode="signup" />
    </div>
  );
}
ReactDOM.createRoot(document.getElementById('root')).render(<Page />);
