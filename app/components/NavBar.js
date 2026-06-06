'use client';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function NavBar() {
  const pathname = usePathname();
  const parts = pathname.split('/').filter(Boolean);
  const inSeason = parts.length >= 2 && parts[0] !== 'new-league';
  const leagueSlug = inSeason ? parts[0] : null;
  const seasonSlug = inSeason ? parts[1] : null;

  const [context, setContext] = useState(null);
  const router = useRouter();

  useEffect(() => {
    if (!leagueSlug || !seasonSlug) return;
    localStorage.setItem('lastLeagueSlug', leagueSlug);
    localStorage.setItem('lastSeasonSlug', seasonSlug);
    fetch(`/api/leagues/${leagueSlug}`)
      .then(r => r.json())
      .then(d => {
        if (d.league && d.seasons) {
          const season = d.seasons.find(s => s.slug === seasonSlug);
          setContext({
            leagueName: d.league.name,
            seasonName: season?.name || seasonSlug,
          });
        }
      })
      .catch(() => {});
  }, [leagueSlug, seasonSlug]);

  const navLinks = inSeason ? [
    { label: 'Dashboard',  href: `/${leagueSlug}/${seasonSlug}` },
    { label: 'Check-In',   href: `/${leagueSlug}/${seasonSlug}/checkin` },
    { label: 'Game Night', href: `/${leagueSlug}/${seasonSlug}/gamenight` },
    { label: 'Report',     href: `/${leagueSlug}/${seasonSlug}/report` },
    { label: 'Schedule',   href: `/${leagueSlug}/${seasonSlug}/schedule` },
    { label: 'Roster',     href: `/${leagueSlug}/${seasonSlug}/roster` },
    { label: 'History',    href: `/${leagueSlug}/${seasonSlug}/history` },
    { label: 'Settings',   href: `/${leagueSlug}/${seasonSlug}/settings` },
  ] : [];

  return (
    <header style={{
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      padding: '0 24px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '60px',
      }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <div style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: '28px',
            letterSpacing: '2px',
            color: 'var(--accent)',
          }}>
            🎳 Bowling <span style={{ color: 'var(--accent2)' }}>Poker</span> Manager
          </div>
        </Link>
        {navLinks.length > 0 && (
          <nav style={{ display: 'flex', gap: '4px' }}>
            {navLinks.map(({ label, href }) => (
              <Link key={href} href={href} style={{
                color: 'var(--muted)',
                padding: '8px 12px',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                borderRadius: '4px',
                textDecoration: 'none',
              }}>{label}</Link>
            ))}
          </nav>
        )}
      </div>
      {context && (
        <div style={{
          position: 'relative',
          textAlign: 'center',
          fontSize: '10px',
          color: '#555',
          fontFamily: "'DM Mono', monospace",
          letterSpacing: '1px',
          paddingBottom: '6px',
          marginTop: '-6px',
        }}>
          {context.leagueName} &nbsp;·&nbsp; {context.seasonName}
          <button
            onClick={() => router.push('/')}
            onMouseEnter={e => { e.currentTarget.style.color = '#888'; e.currentTarget.style.borderColor = '#555'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#555'; e.currentTarget.style.borderColor = '#333'; }}
            style={{
              position: 'absolute',
              right: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '9px',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              color: '#555',
              background: 'transparent',
              border: '1px solid #333',
              borderRadius: '3px',
              padding: '2px 7px',
              cursor: 'pointer',
              fontFamily: "'DM Mono', monospace",
            }}
          >
            Leagues
          </button>
        </div>
      )}
    </header>
  );
}
