'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';

export default function Login() {
  const r = useRouter();
  const [email, setEmail] = useState('control@apxnet.lab');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  async function submit(e) {
    e.preventDefault();
    setErr('');
    try {
      const d = await api.login({ email, password });
      if (d.user.role !== 'admin') {
        await api.logout().catch(() => {});
        throw new Error('not an admin account');
      }
      r.push('/dashboard');
    } catch (e) { setErr(e.message); }
  }
  return (
    <main>
      <h2>Admin Login</h2>
      <form onSubmit={submit} style={form}>
        <input value={email} onChange={(e) => setEmail(e.target.value)} style={inp} />
        <input type="password" placeholder="password" value={password} onChange={(e) => setPassword(e.target.value)} style={inp} />
        {err && <p style={{ color: '#ff7b7b' }}>{err}</p>}
        <button style={btn}>Login</button>
      </form>
      <p style={{ opacity: 0.7 }}>Single admin: control@apxnet.lab (seeded via .env — same login as NAS admin)</p>
    </main>
  );
}
const form = { display: 'grid', gap: 12, maxWidth: 360 };
const inp = { padding: 10, borderRadius: 8, border: '1px solid #444', background: '#1a1a24', color: '#fff' };
const btn = { padding: 10, borderRadius: 8, background: '#7a3cff', color: '#fff', border: 0 };
