// PATH: app/layout.js
import './globals.css';

export const metadata = {
  title: 'Bowling Poker Manager',
  description: 'LGBT Wednesday Community League — Poker Side Game Manager',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            const t = localStorage.getItem('theme');
            if (t === 'light') document.documentElement.classList.add('light-mode');
          } catch(e) {}
        ` }} />
      </head>
      <body>
        <header style={{
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '60px',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}>
          <div style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: '28px',
            letterSpacing: '2px',
            color: 'var(--accent)',
          }}>
            🎳 Bowling <span style={{ color: 'var(--accent2)' }}>Poker</span> Manager
          </div>
          <nav style={{ display: 'flex', gap: '4px' }}>
            {[
              { label: 'Dashboard', href: '/' },
              { label: 'Check-In',  href: '/checkin' },
              { label: 'Game Night', href: '/gamenight' },
              { label: 'Report',    href: '/report' },
              { label: 'Schedule',  href: '/schedule' },
              { label: 'Roster',    href: '/roster' },
              { label: 'History',   href: '/history' },
              { label: 'Settings',  href: '/settings' },
            ].map(({ label, href }) => (
              <a key={href} href={href} style={{
                color: 'var(--muted)',
                padding: '8px 12px',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                borderRadius: '4px',
                transition: 'color 0.2s',
              }}>{label}</a>
            ))}
          </nav>
        </header>
        <main style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
