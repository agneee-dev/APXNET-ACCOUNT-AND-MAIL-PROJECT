import Link from 'next/link';
export default function Home() {
  return (
    <main>
      <h1>APXNET Account — Admin Console 🔐</h1>
      <p>Manage all accounts: create, suspend, reset passwords, delete, promote to admin.</p>
      <p>Backend: {process.env.NEXT_PUBLIC_API_URL}</p>
      <div style={{ display: 'flex', gap: 12 }}>
        <Link href="/login" style={btn}>Admin Login</Link>
        <Link href="/dashboard" style={btn}>Dashboard</Link>
      </div>
    </main>
  );
}
const btn = { padding: '10px 18px', background: '#7a3cff', color: '#fff', borderRadius: 8, textDecoration: 'none' };
