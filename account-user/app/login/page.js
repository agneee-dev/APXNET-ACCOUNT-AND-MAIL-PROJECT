'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../lib/api';
import { goTo, readNextParam } from '../../lib/next-redirect';

export default function Login() {
  const r = useRouter();
  const [next] = useState(readNextParam);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [pending, setPending] = useState(false);

  // Arrived with ?next=… (e.g. from the NAS portal) and already signed in?
  // Skip the form and continue straight to the destination.
  useEffect(() => {
    if (!next) return;
    let alive = true;
    api
      .me()
      .then(() => {
        if (alive) goTo(r, next);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(e) {
    e.preventDefault();
    setErr('');
    setPending(true);
    try {
      await api.login({ email, password });
      goTo(r, next || '/dashboard');
    } catch (e) {
      setErr(e.message);
      setPending(false);
    }
  }

  return (
    <main className="container auth-wrap">
      <div className="card auth-card">
        <div className="card-head">
          <h1>Welcome back</h1>
          <p className="sub">
            Sign in with your APXNET account{next ? ' to continue' : ''}. Sessions last until you
            sign out.
          </p>
        </div>

        <form onSubmit={submit} className="form">
          <div className="field">
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className="input"
              placeholder="you@apxnet.lab"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              className="input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {err && <div className="alert alert-error">{err}</div>}

          <button className="btn btn-primary btn-block" type="submit" disabled={pending}>
            {pending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="auth-foot">
          No account yet? <Link href="/register">Create one</Link>
        </p>
      </div>
    </main>
  );
}

