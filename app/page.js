// PATH: app/page.js
export default function Home() {
  return (
    <div>
      <div style={{
        fontFamily: "'Bebas Neue', sans-serif",
        fontSize: '48px',
        letterSpacing: '3px',
        color: 'var(--text)',
        marginBottom: '8px',
      }}>
        Welcome
      </div>
      <div style={{ color: 'var(--muted)', marginBottom: '32px', fontSize: '12px' }}>
        LGBT Wednesday Community League — Poker Side Game Manager
      </div>
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '32px',
        maxWidth: '500px',
      }}>
        <div style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: '22px',
          color: 'var(--accent)',
          marginBottom: '12px',
        }}>
          No Active Season
        </div>
        <p style={{ color: 'var(--muted)', lineHeight: '1.6', marginBottom: '20px' }}>
          Get started by setting up a season. Upload your League Standings PDF
          to import teams and bowlers, and your Schedule PDF to import the
          weekly lane assignments.
        </p>
        <a href="/setup" style={{
          display: 'inline-block',
          background: 'var(--accent)',
          color: 'var(--bg)',
          padding: '10px 20px',
          borderRadius: '4px',
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: '16px',
          letterSpacing: '1px',
        }}>
          Set Up Season →
        </a>
      </div>
    </div>
  );
}

