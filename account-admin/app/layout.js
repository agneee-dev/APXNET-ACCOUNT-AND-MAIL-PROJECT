export const metadata = { title: 'APXNET Admin', description: 'Account admin console' };
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0, background: '#0d0d12', color: '#eceaf2' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>{children}</div>
      </body>
    </html>
  );
}
