'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { nasAppBase } from '../../lib/apps';

export default function Nav() {
  const [nas, setNas] = useState('');
  useEffect(() => {
    setNas(nasAppBase());
  }, []);
  return (
    <nav className="nav">
      <Link href="/">Home</Link>
      <Link href="/dashboard">Dashboard</Link>
      {nas ? (
        <a href={`${nas}/login`} title="Open the NAS file portal">
          NAS Files
        </a>
      ) : (
        <span style={{ padding: '8px 14px', color: '#5f6a88', fontSize: 14 }}>NAS Files</span>
      )}
      <Link href="/login" className="btn btn-primary" style={{ marginLeft: 6 }}>
        Sign in
      </Link>
    </nav>
  );
}
