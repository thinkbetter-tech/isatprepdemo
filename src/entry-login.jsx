// Entry module for login.html. Verbatim behavior of the old inline Page() block.
import React from 'react';
import ReactDOM from 'react-dom/client';
import { initFirebase } from './firebase.js';
import { mountConsentBanner } from './consentBanner.js';
import { LoginForm, AuthSide } from './auth.jsx';

window.React = React;
window.ReactDOM = ReactDOM;

initFirebase(); // no-op without Firebase env; real auth wired later
mountConsentBanner();

function Page() {
  return (
    <div className="auth-page">
      <LoginForm />
      <AuthSide mode="login" />
    </div>
  );
}
ReactDOM.createRoot(document.getElementById('root')).render(<Page />);
