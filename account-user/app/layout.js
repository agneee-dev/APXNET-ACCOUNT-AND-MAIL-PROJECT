import './globals.css';
import Link from 'next/link';
import Nav from './components/nav';

export const metadata = {
  title: { default: 'APXNET Account', template: '%s · APXNET Account' },
  description: 'Central account portal for APXNET — sign in, manage your profile and password.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="container">
            <Link href="/" className="brand">
              <span className="brand-mark">AX</span>
              <span>
                APXNET
                <span className="brand-sub">Account</span>
              </span>
            </Link>
            <Nav />
          </div>
        </header>

        {children}

        <footer className="site-footer">
          <div className="container">
            <span>© APXNET — one identity for every service.</span>
            <span>Sessions persist until you sign out · tokens live in httpOnly cookies</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
