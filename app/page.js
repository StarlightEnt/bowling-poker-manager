'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LeaguePickerPage() {
  const [leagues, setLeagues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastLeagueSlug, setLastLeagueSlug] = useState(null);
  const router = useRouter();

  useEffect(() => {
    setLastLeagueSlug(localStorage.getItem('lastLeagueSlug'));
  }, []);

  useEffect(() => {
    fetch('/api/leagues')
      .then(r => r.json())
      .then(d => { setLeagues(d.leagues || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: '28px 32px', fontFamily: "'DM Mono', monospace" }}>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 48,
                    letterSpacing: 3, color: '#fff', marginBottom: 8 }}>
        Bowling Poker Manager
      </div>
      <div style={{ color: '#555', fontSize: 12, marginBottom: 28 }}>
        Select a league to continue, or set up a new one.
      </div>

      <div style={{ marginBottom: 32 }}>
        {leagues.map(league => (
          <div key={league.id}
            onClick={() => router.push(`/${league.slug}`)}
            style={{
              background: '#141417',
              border: '1px solid #222',
              borderLeft: `3px solid ${league.accent_color || '#3dffa0'}`,
              borderRadius: 6,
              padding: '18px 24px',
              marginBottom: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#18181c'}
            onMouseLeave={e => e.currentTarget.style.background = '#141417'}
          >
            <div>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 26,
                            letterSpacing: 2, color: '#fff', lineHeight: 1 }}>
                {league.name}
              </div>
              <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>
                {league.venue_name} · {league.venue_city}, {league.venue_state}
              </div>
            </div>
            <div style={{ fontSize: 12, color: '#555', whiteSpace: 'nowrap', paddingLeft: 24, textAlign: 'right' }}>
              {league.slug === lastLeagueSlug && (
                <span style={{
                  display: 'block',
                  fontSize: 9,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  color: league.accent_color || '#3dffa0',
                  fontFamily: "'DM Mono', monospace",
                  opacity: 0.8,
                  marginBottom: 4,
                  textAlign: 'right',
                }}>● last session</span>
              )}
              <span style={{ color: '#888' }}>{league.season_count}</span>
              {' '}{parseInt(league.season_count) === 1 ? 'season' : 'seasons'}
            </div>
          </div>
        ))}
      </div>

      <div
        onClick={() => router.push('/new-league')}
        style={{
          display: 'inline-block',
          padding: 2,
          borderRadius: 8,
          background: 'linear-gradient(135deg, #FF0018 0%, #FFA52C 14%, #FFFF41 28%, #008018 42%, #0000F9 57%, #86007D 71%, #FF0018 85%, #FFA52C 100%)',
          cursor: 'pointer',
        }}
      >
        <div style={{
          background: '#141417',
          borderRadius: 6,
          padding: '32px 28px',
          width: 200,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}>
          <div style={{ fontSize: 22, color: '#e8ff47' }}>+</div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20,
                        letterSpacing: 1.5, color: '#fff' }}>
            Set Up New League
          </div>
          <div style={{ fontSize: 11, color: '#555', lineHeight: 1.5 }}>
            Configure a new league, venue, and first season.
          </div>
        </div>
      </div>
    </div>
  );
}
