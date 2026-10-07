'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';

function initials(user) {
  const src = String(user.name || user.email || '?').trim();
  const parts = src.split(/[\s@._-]+/).filter(Boolean);
  return ((parts[0]?.[0] || '?') + (parts[1]?.[0] || '')).toUpperCase();
}

function when(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '—';
  }
}

export default function Dashboard() {
  const r = useRouter();
  const [user, setUser] = useState(null);
  const [name, setName] = useState('');
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [profileMsg, setProfileMsg] = useState(null); // { type: 'ok' | 'error', text }
  const [pwMsg, setPwMsg] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    api
      .me()
      .then((d) => {
        setUser(d.user);
        setName(d.user.name || '');
      })
      .catch(() => r.push('/login'));
  }, [r]);

  if (!user) return <div className="loading">Loading your account…</div>;

  async function saveProfile(e) {
    e.preventDefault();
    setProfileMsg(null);
    setSavingProfile(true);
    try {
      const d = await api.updateMe({ name });
      setUser(d.user);
      setProfileMsg({ type: 'ok', text: 'Profile saved.' });
    } catch (e) {
      setProfileMsg({ type: 'error', text: e.message });
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    setPwMsg(null);
    if (String(pw.newPassword).length < 8) {
      setPwMsg({ type: 'error', text: 'New password must be at least 8 characters.' });
      return;
    }
    setSavingPw(true);
    try {
      await api.changePassword(pw);
      setPwMsg({
        type: 'ok',
        text: 'Password changed — you will be asked to sign in again on every device.'
      });
      setTimeout(() => r.push('/login'), 1600);
    } catch (e) {
      setPwMsg({ type: 'error', text: e.message });
      setSavingPw(false);
    }
  }

  async function logout() {
    setLoggingOut(true);
    await api.logout().catch(() => {});
    r.push('/login');
  }

  const alertClass = (m) => (m.type === 'error' ? 'alert alert-error' : 'alert alert-ok');

  return (
    <main className="container page">
      <div className="page-head">
        <div>
          <h1>Account</h1>
          <p>Your profile, security and session — all in one place.</p>
        </div>
        <button className="btn btn-ghost" onClick={logout} disabled={loggingOut}>
          {loggingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </div>

      <section className="card identity">
        <div className="avatar" aria-hidden>
          {initials(user)}
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div className="identity-name">{user.name || user.email}</div>
          <div className="identity-email">{user.email}</div>
          <div className="pill-row">
            {user.role === 'admin' ? (
              <span className="pill pill-brand">Administrator</span>
            ) : (
              <span className="pill">Member</span>
            )}
            {user.status === 'suspended' ? (
              <span className="pill pill-danger">Suspended</span>
            ) : (
              <span className="pill pill-ok">Active</span>
            )}
            {user.email_verified ? (
              <span className="pill pill-ok">Email verified</span>
            ) : (
              <span className="pill pill-warn">Email unverified</span>
            )}
          </div>
        </div>
      </section>

      <div className="panel-grid">
        <section className="card">
          <h2 className="card-title">Profile</h2>
          <p className="card-hint">Display name shown across APXNET services.</p>
          <form className="form" onSubmit={saveProfile}>
            <div className="field">
              <label className="label" htmlFor="display-name">
                Display name
              </label>
              <input
                id="display-name"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
              />
            </div>
            {profileMsg && <div className={alertClass(profileMsg)}>{profileMsg.text}</div>}
            <div>
              <button className="btn btn-primary" type="submit" disabled={savingProfile}>
                {savingProfile ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        </section>

        <section className="card">
          <h2 className="card-title">Change password</h2>
          <p className="card-hint">Changing your password ends every session, everywhere.</p>
          <form className="form" onSubmit={changePassword}>
            <div className="field">
              <label className="label" htmlFor="current-password">
                Current password
              </label>
              <input
                id="current-password"
                className="input"
                type="password"
                placeholder="••••••••"
                value={pw.currentPassword}
                onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })}
                autoComplete="current-password"
                required
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="new-password">
                New password <span style={{ color: '#8b96b3', fontWeight: 500 }}>(min 8)</span>
              </label>
              <input
                id="new-password"
                className="input"
                type="password"
                placeholder="••••••••"
                value={pw.newPassword}
                onChange={(e) => setPw({ ...pw, newPassword: e.target.value })}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
            {pwMsg && <div className={alertClass(pwMsg)}>{pwMsg.text}</div>}
            <div>
              <button className="btn btn-primary" type="submit" disabled={savingPw}>
                {savingPw ? 'Changing…' : 'Change password'}
              </button>
            </div>
          </form>
        </section>

        <section className="card">
          <h2 className="card-title">Session &amp; details</h2>
          <p className="card-hint">
            Signed in via httpOnly cookies — you stay signed in until you sign out.
          </p>
          <dl className="meta-list">
            <div>
              <dt>Member since</dt>
              <dd>{when(user.created_at)}</dd>
            </div>
            <div>
              <dt>Last updated</dt>
              <dd>{when(user.updated_at)}</dd>
            </div>
            <div>
              <dt>Account ID</dt>
              <dd style={{ fontSize: 12 }}>{String(user.id).slice(0, 8)}…</dd>
            </div>
          </dl>
        </section>
      </div>
    </main>
  );
}

