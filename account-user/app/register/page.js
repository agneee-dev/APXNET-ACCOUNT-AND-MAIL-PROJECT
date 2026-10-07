'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../lib/api';
import { goTo, readNextParam } from '../../lib/next-redirect';

export default function Register() {
  const r = useRouter();
  const [next] = useState(readNextParam);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [pending, setPending] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr('');
    setPending(true);
    try {
      await api.register({ name, email, password });
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
          <h1>Create your account</h1>
          <p className="sub">One APXNET account for the portal, the NAS and everything after.</p>
        </div>

        <form onSubmit={submit} className="form">
          <div className="field">
            <label className="label" htmlFor="name">
              Display name
            </label>
            <input
              id="name"
              className="input"
              placeholder="Alice Example"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </div>
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
              Password <span style={{ color: '#8b96b3', fontWeight: 500 }}>(min 8 characters)</span>
            </label>
            <input
              id="password"
              className="input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>

          {err && <div className="alert alert-error">{err}</div>}

          <button className="btn btn-primary btn-block" type="submit" disabled={pending}>
            {pending ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="auth-foot">
          Already registered? <Link href="/login">Sign in</Link>
        </p>
      </div>
    </main>
  );
}

