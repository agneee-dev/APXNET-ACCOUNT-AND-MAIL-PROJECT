'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';

export default function Dashboard() {
  const r = useRouter();
  const [me, setMe] = useState(null);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'user' });
  const [msg, setMsg] = useState('');

  async function load() {
    try {
      const m = await api.me();
      if (m.user.role !== 'admin') {
        await api.logout().catch(() => {});
        throw new Error('not admin');
      }
      setMe(m.user);
      setStats(await api.stats());
      const u = await api.listUsers(q ? `?q=${encodeURIComponent(q)}&limit=50` : '?limit=50');
      setUsers(u.users); setTotal(u.total);
    } catch { r.push('/login'); }
  }

  useEffect(() => { load(); }, []);

  if (!me) return <p>Loading…</p>;

  return (
    <main>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Admin — {me.email}</h2>
        <button style={danger} onClick={async () => { await api.logout(); r.push('/login'); }}>Logout</button>
      </div>

      {stats && (
        <div style={{ display: 'flex', gap: 12, margin: '16px 0' }}>
          {[['Total', stats.total], ['Admins', stats.admins], ['Suspended', stats.suspended], ['New 7d', stats.newLast7d]].map(([k, v]) => (
            <div key={k} style={card}><b style={{ fontSize: 22 }}>{v}</b><div>{k}</div></div>
          ))}
        </div>
      )}

      <h3>Create user</h3>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <input placeholder="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={inp} />
        <input placeholder="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} style={inp} />
        <input placeholder="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inp} />
        <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} style={inp}>
          <option value="user">user</option>
          <option value="admin">admin</option>
        </select>
        <button style={btn} onClick={async () => {
          try { await api.createUser(form); setMsg('user created'); setForm({ email: '', password: '', name: '', role: 'user' }); load(); }
          catch (e) { setMsg(e.message); }
        }}>Create</button>
      </div>

      <h3>All users ({total})</h3>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input placeholder="search email / name" value={q} onChange={(e) => setQ(e.target.value)} style={{ ...inp, flex: 1 }} />
        <button style={btn} onClick={load}>Search</button>
      </div>

      {msg && <p style={{ color: '#9fe6a8' }}>{msg}</p>}

      <div style={{ display: 'grid', gap: 8 }}>
        {users.map((u) => (
          <div key={u.id} style={row}>
            <div style={{ flex: 1 }}>
              <b>{u.email}</b> <span style={pill}>{u.role}</span> <span style={pill}>{u.status}</span>
              <div style={{ opacity: 0.7, fontSize: 13 }}>{u.name} · {new Date(u.created_at).toLocaleString()}</div>
            </div>
            <button style={sm} onClick={async () => { await api.updateUser(u.id, { role: u.role === 'admin' ? 'user' : 'admin' }); load(); }}>
              {u.role === 'admin' ? 'Demote' : 'Promote'}
            </button>
            <button style={sm} onClick={async () => { await api.updateUser(u.id, { status: u.status === 'active' ? 'suspended' : 'active' }); load(); }}>
              {u.status === 'active' ? 'Suspend' : 'Activate'}
            </button>
            <button style={sm} onClick={async () => {
              const p = prompt(`New password for ${u.email} (min 8 chars):`);
              if (p) { await api.resetPw(u.id, p); setMsg('password reset'); }
            }}>Reset PW</button>
            <button style={{ ...sm, background: '#5a2020' }} onClick={async () => {
              if (confirm(`Delete ${u.email}?`)) { await api.deleteUser(u.id); load(); }
            }}>Delete</button>
          </div>
        ))}
      </div>
    </main>
  );
}
const card = { background: '#1a1a24', padding: 16, borderRadius: 10, minWidth: 120, textAlign: 'center' };
const inp = { padding: 10, borderRadius: 8, border: '1px solid #444', background: '#1a1a24', color: '#fff' };
const btn = { padding: '10px 16px', borderRadius: 8, background: '#7a3cff', color: '#fff', border: 0 };
const danger = { padding: '10px 16px', borderRadius: 8, background: '#b33737', color: '#fff', border: 0 };
const sm = { padding: '6px 10px', borderRadius: 6, background: '#33334d', color: '#fff', border: 0, fontSize: 13 };
const row = { display: 'flex', gap: 8, alignItems: 'center', background: '#15151f', padding: 12, borderRadius: 10 };
const pill = { background: '#33334d', padding: '2px 8px', borderRadius: 20, fontSize: 12, marginLeft: 6 };
