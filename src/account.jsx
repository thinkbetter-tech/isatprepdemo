import React from 'react';
import { Footer, NavCta } from './sections.jsx';
import {
  onUserChanged, isFirebaseConfigured, currentUser, linkedProviders,
  getUserDoc, updateDisplayName, changePassword, sendReset,
  exportUserData, getEmailPrefs, setEmailPrefs, getAllProgress,
  getConsent, setConsent, linkGoogle, linkEmailPassword, unlinkProvider,
} from './firebase.js';

// Account / Settings page. Sections: profile, plan, password, export,
// email prefs, progress, consent, connected sign-in methods (points 1-8).

const PLAN_LABEL = { free: 'Free', core: 'Core', complete: 'Complete' };

function mapErr(e) {
  if (!e) return 'Something went wrong. Please try again.';
  switch (e.code) {
    case 'auth/wrong-password':
    case 'auth/invalid-credential': return 'Current password is incorrect.';
    case 'auth/weak-password': return 'New password must be at least 6 characters.';
    case 'auth/requires-recent-login': return 'Please log in again, then retry.';
    case 'auth/email-already-in-use': return 'That email is already linked to another account.';
    case 'auth/credential-already-in-use': return 'That sign-in method is already in use.';
    case 'auth/popup-closed-by-user': return 'Cancelled.';
    case 'isatprep/last-provider': return 'You can’t remove your only sign-in method.';
    default: return (e.message || 'Something went wrong.').replace(/^Firebase:\s*/, '');
  }
}

// Small helper for a status line under each section action.
function Status({ msg }) {
  if (!msg) return null;
  return <p className={'acct-status ' + (msg.ok ? 'ok' : 'err')} role="status">{msg.text}</p>;
}

function AccountNav() {
  return (
    <nav className="nav">
      <div className="wrap nav-inner">
        <a href="index.html" className="brand">
          <span className="brand-mark">i</span>
          <span>iSATPrep</span>
        </a>
        <div className="nav-links">
          <a href="index.html#method">Method</a>
          <a href="topics.html">Topics</a>
          <a href="practice.html">Practice</a>
          <a href="tests.html">Practice Test</a>
        </div>
        <NavCta />
      </div>
    </nav>
  );
}

function ProfileSection({ user, doc, onSaved }) {
  const [name, setName] = React.useState(user.displayName || (doc && doc.name) || '');
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState(null);
  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try { await updateDisplayName(name); setMsg({ ok: true, text: 'Saved.' }); onSaved && onSaved(); }
    catch (err) { setMsg({ ok: false, text: mapErr(err) }); }
    finally { setBusy(false); }
  };
  return (
    <section className="acct-section">
      <h2 className="serif">Profile</h2>
      <form className="acct-form" onSubmit={save}>
        <div className="field">
          <label htmlFor="acct-name">Full name</label>
          <input id="acct-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" />
        </div>
        <div className="field">
          <label>Email</label>
          <input type="email" value={user.email || ''} disabled readOnly />
          <div className="hint">Email can’t be changed here. Contact hello@isatprep.net if you need to.</div>
        </div>
        <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</button>
        <Status msg={msg} />
      </form>
    </section>
  );
}

function PlanSection({ doc }) {
  const plan = (doc && doc.plan) || 'free';
  return (
    <section className="acct-section">
      <h2 className="serif">Plan</h2>
      <div className="acct-plan">
        <div>
          <div className="acct-plan-name">{PLAN_LABEL[plan] || 'Free'}</div>
          <div className="hint">{plan === 'free' ? 'Free plan — upgrade for full access.' : 'Lifetime access.'}</div>
        </div>
        {plan === 'free' && <a href="index.html#pricing" className="btn btn-primary btn-sm">Upgrade</a>}
      </div>
    </section>
  );
}

function PasswordSection({ hasPassword }) {
  const [cur, setCur] = React.useState('');
  const [nw, setNw] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState(null);

  if (!hasPassword) {
    // Google-only account: offer a reset email to set a password instead.
    const u = currentUser();
    const send = async () => {
      setBusy(true); setMsg(null);
      try { await sendReset(u.email); setMsg({ ok: true, text: 'Password setup email sent.' }); }
      catch (err) { setMsg({ ok: false, text: mapErr(err) }); }
      finally { setBusy(false); }
    };
    return (
      <section className="acct-section">
        <h2 className="serif">Password</h2>
        <p className="hint">You sign in with Google, so there’s no password set. You can set one via email.</p>
        <button className="btn btn-outline btn-sm" onClick={send} disabled={busy}>{busy ? 'Sending…' : 'Send password setup email'}</button>
        <Status msg={msg} />
      </section>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    if (nw.length < 6) { setMsg({ ok: false, text: 'New password must be at least 6 characters.' }); return; }
    setBusy(true); setMsg(null);
    try { await changePassword(cur, nw); setCur(''); setNw(''); setMsg({ ok: true, text: 'Password changed.' }); }
    catch (err) { setMsg({ ok: false, text: mapErr(err) }); }
    finally { setBusy(false); }
  };
  return (
    <section className="acct-section">
      <h2 className="serif">Change password</h2>
      <form className="acct-form" onSubmit={submit}>
        <div className="field">
          <label htmlFor="acct-cur">Current password</label>
          <input id="acct-cur" type="password" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" />
        </div>
        <div className="field">
          <label htmlFor="acct-new">New password</label>
          <input id="acct-new" type="password" value={nw} onChange={(e) => setNw(e.target.value)} autoComplete="new-password" placeholder="At least 6 characters" />
        </div>
        <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>{busy ? 'Updating…' : 'Update password'}</button>
        <Status msg={msg} />
      </form>
    </section>
  );
}

function ExportSection() {
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState(null);
  const run = async () => {
    setBusy(true); setMsg(null);
    try {
      const data = await exportUserData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'isatprep-my-data.json';
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      setMsg({ ok: true, text: 'Download started.' });
    } catch (err) { setMsg({ ok: false, text: mapErr(err) }); }
    finally { setBusy(false); }
  };
  return (
    <section className="acct-section">
      <h2 className="serif">Your data</h2>
      <p className="hint">Download a copy of your account, profile, and practice progress as JSON.</p>
      <button className="btn btn-outline btn-sm" onClick={run} disabled={busy}>{busy ? 'Preparing…' : 'Export my data'}</button>
      <Status msg={msg} />
    </section>
  );
}

function EmailPrefsSection() {
  const [prefs, setPrefs] = React.useState(null);
  const [msg, setMsg] = React.useState(null);
  React.useEffect(() => { getEmailPrefs().then(setPrefs); }, []);
  if (!prefs) return null;
  const toggle = async (key) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next); setMsg(null);
    try { await setEmailPrefs(next); setMsg({ ok: true, text: 'Saved.' }); }
    catch (err) { setMsg({ ok: false, text: mapErr(err) }); }
  };
  return (
    <section className="acct-section">
      <h2 className="serif">Email preferences</h2>
      <label className="acct-toggle-row">
        <input type="checkbox" checked={prefs.product} onChange={() => toggle('product')} />
        <span>Important account &amp; service emails <span className="hint">(password resets, receipts — recommended)</span></span>
      </label>
      <label className="acct-toggle-row">
        <input type="checkbox" checked={prefs.marketing} onChange={() => toggle('marketing')} />
        <span>Product news &amp; tips <span className="hint">(occasional marketing)</span></span>
      </label>
      <Status msg={msg} />
    </section>
  );
}

function ProgressSection() {
  const [rows, setRows] = React.useState(null);
  React.useEffect(() => { getAllProgress().then(setRows); }, []);
  if (rows === null) return null;
  return (
    <section className="acct-section">
      <h2 className="serif">Your progress</h2>
      {rows.length === 0 ? (
        <p className="hint">No practice yet. <a href="practice.html">Start practicing →</a></p>
      ) : (
        <ul className="acct-progress">
          {rows.map((r) => {
            const answers = r.answers || {};
            const total = Object.keys(answers).length;
            const correct = Object.values(answers).filter((a) => a && a.correct).length;
            return (
              <li key={r.id}>
                <span className="acct-progress-name">{r.lessonId || r.id}</span>
                <span className="hint">{total} answered · {correct} correct</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function ConsentSection() {
  const [state, setState] = React.useState(getConsent());
  const granted = state === 'granted';
  const gpc = state === 'gpc';
  const change = async (on) => { await setConsent(on); setState(getConsent()); };
  return (
    <section className="acct-section">
      <h2 className="serif">Privacy &amp; analytics</h2>
      {gpc ? (
        <p className="hint">Your browser’s Global Privacy Control is on, so analytics stays off.</p>
      ) : (
        <label className="acct-toggle-row">
          <input type="checkbox" checked={granted} onChange={(e) => change(e.target.checked)} />
          <span>Allow anonymous usage analytics <span className="hint">(helps us improve the product)</span></span>
        </label>
      )}
      <p className="hint">See our <a href="privacy.html">Privacy Policy</a>.</p>
    </section>
  );
}

function ConnectionsSection({ onChanged }) {
  const providers = linkedProviders();
  const hasGoogle = providers.includes('google.com');
  const hasPassword = providers.includes('password');
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState(null);
  const [emailForm, setEmailForm] = React.useState(false);
  const [email, setEmail] = React.useState(currentUser()?.email || '');
  const [pw, setPw] = React.useState('');

  const wrap = (fn) => async () => {
    setBusy(true); setMsg(null);
    try { await fn(); onChanged && onChanged(); setMsg({ ok: true, text: 'Updated.' }); }
    catch (err) { setMsg({ ok: false, text: mapErr(err) }); }
    finally { setBusy(false); }
  };

  return (
    <section className="acct-section">
      <h2 className="serif">Sign-in methods</h2>
      <div className="acct-conn">
        <span>Google</span>
        {hasGoogle
          ? <button className="btn btn-outline btn-sm" disabled={busy} onClick={wrap(() => unlinkProvider('google.com'))}>Disconnect</button>
          : <button className="btn btn-outline btn-sm" disabled={busy} onClick={wrap(linkGoogle)}>Connect</button>}
      </div>
      <div className="acct-conn">
        <span>Email &amp; password</span>
        {hasPassword
          ? <button className="btn btn-outline btn-sm" disabled={busy} onClick={wrap(() => unlinkProvider('password'))}>Disconnect</button>
          : <button className="btn btn-outline btn-sm" disabled={busy} onClick={() => setEmailForm((v) => !v)}>Connect</button>}
      </div>
      {emailForm && !hasPassword && (
        <form className="acct-form" onSubmit={(e) => { e.preventDefault(); wrap(() => linkEmailPassword(email, pw))(); }}>
          <div className="field">
            <label htmlFor="link-email">Email</label>
            <input id="link-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div className="field">
            <label htmlFor="link-pw">Password</label>
            <input id="link-pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" placeholder="At least 6 characters" />
          </div>
          <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>Link email sign-in</button>
        </form>
      )}
      <Status msg={msg} />
    </section>
  );
}

function AccountApp() {
  const [user, setUser] = React.useState(undefined); // undefined = loading
  const [doc, setDoc] = React.useState(null);
  const [tick, setTick] = React.useState(0); // bump to re-read after changes

  React.useEffect(() => {
    if (!isFirebaseConfigured()) { setUser(null); return undefined; }
    const unsub = onUserChanged((u) => setUser(u || null));
    return () => unsub();
  }, []);

  React.useEffect(() => {
    if (user) getUserDoc().then(setDoc);
  }, [user, tick]);

  const refresh = () => setTick((t) => t + 1);

  return (
    <div data-screen-label="Account">
      <AccountNav />
      <main className="acct-page wrap" id="top">
        <h1 className="serif">Account</h1>
        {user === undefined && <p className="hint">Loading…</p>}
        {user === null && (
          <p className="hint">
            You’re not signed in. <a href="login.html">Log in</a> to manage your account.
          </p>
        )}
        {user && (
          <div className="acct-grid">
            <ProfileSection user={user} doc={doc} onSaved={refresh} />
            <PlanSection doc={doc} />
            <PasswordSection hasPassword={linkedProviders().includes('password')} />
            <ConnectionsSection onChanged={refresh} />
            <EmailPrefsSection />
            <ProgressSection />
            <ConsentSection />
            <ExportSection />
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

Object.assign(window, { AccountApp });
export { AccountApp };
