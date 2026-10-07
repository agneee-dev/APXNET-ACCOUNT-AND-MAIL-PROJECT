'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { nasLoginUrl } from '../lib/apps';

const features = [
  {
    icon: '🔐',
    title: 'Cookie-only sessions',
    body: 'Your tokens live in httpOnly cookies — invisible to JavaScript and safe from XSS. You stay signed in across restarts until you sign out.'
  },
  {
    icon: '👤',
    title: 'Your profile in one place',
    body: 'Update your display name and password once; every APXNET service that trusts this account picks it up.'
  },
  {
    icon: '🚀',
    title: 'One login, every app',
    body: 'Sign in here and continue straight into the NAS file portal — clicking your profile signs you into the NAS with no second password.'
  }
];

const apps = [
  {
    icon: '🗂️',
    name: 'NAS Files',
    body: 'Your shares, folders and uploads — plus the Windows/SMB password card.',
    href: () => nasLoginUrl(),
    cta: 'Open NAS Files'
  },
  {
    icon: '👤',
    name: 'My dashboard',
    body: 'Profile, password, session details and sign-out — all in one place.',
    href: () => '/dashboard',
    cta: 'Open dashboard'
  },
  {
    icon: '✉️',
    name: 'Mail (soon)',
    body: 'Webmail will trust this same sign-in when the mail app lands.',
    href: () => '#',
    cta: 'Coming soon',
    soon: true
  }
];

export default function Home() {
  const [me, setMe] = useState(null);
  useEffect(() => {
    let alive = true;
    api
      .me()
      .then((d) => {
        if (alive) setMe(d.user);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return (
    <main>
      <section className="container hero">
        <span className="hero-eyebrow">Central identity · APXNET</span>
        <h1>
          One account for <span className="accent">every APXNET service</span>
        </h1>
        <p>
          Register once, sign in once. Manage your profile and password here, then ride your
          session straight into the NAS portal and beyond.
        </p>
        {me ? (
          <div className="session-banner" role="status">
            <span className="session-dot" aria-hidden />
            <span>
              Signed in as <strong>{me.name || me.email}</strong> — pick an app below, no need to
              sign in again.
            </span>
            <Link href="/dashboard" className="btn btn-ghost btn-sm">
              My account
            </Link>
          </div>
        ) : null}
        <div className="hero-actions">
          {me ? (
            <a href={nasLoginUrl()} className="btn btn-primary">
              Continue to NAS Files →
            </a>
          ) : (
            <Link href="/login" className="btn btn-primary">
              Sign in
            </Link>
          )}
          <Link href="/register" className="btn btn-ghost">
            Create account
          </Link>
          <Link href="/dashboard" className="btn btn-ghost">
            My dashboard
          </Link>
        </div>
      </section>

      <section className="container">
        <div className="section-head">
          <h2>Your apps</h2>
          <p>Signed in once here — every app below trusts this session.</p>
        </div>
        <div className="app-grid">
          {apps.map((a) => (
            <article className="app-card" key={a.name}>
              <div className="feature-icon" aria-hidden>
                {a.icon}
              </div>
              <h3>{a.name}</h3>
              <p>{a.body}</p>
              {a.soon ? (
                <span className="btn btn-ghost btn-sm" aria-disabled="true">
                  {a.cta}
                </span>
              ) : a.href().startsWith('/') || a.href().startsWith('#') ? (
                <Link href={a.href()} className="btn btn-ghost btn-sm">
                  {a.cta} →
                </Link>
              ) : (
                <a href={a.href()} className="btn btn-ghost btn-sm">
                  {a.cta} →
                </a>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="container feature-grid">
        {features.map((f) => (
          <article className="feature" key={f.title}>
            <div className="feature-icon" aria-hidden>
              {f.icon}
            </div>
            <h3>{f.title}</h3>
            <p>{f.body}</p>
          </article>
        ))}
      </section>

      <section className="container how">
        <h2>How sign-in works</h2>
        <ol>
          <li>
            <strong>Sign in here once</strong> — email + password, session kept in httpOnly
            cookies.
          </li>
          <li>
            <strong>Open NAS Files</strong> — the NAS login page shows your profile from this
            portal.
          </li>
          <li>
            <strong>Click your profile</strong> — the NAS starts its own session for you. No
            username, no password, nothing to type.
          </li>
        </ol>
      </section>
    </main>
  );
}
