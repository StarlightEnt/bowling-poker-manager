'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SeasonPickerPage({ params }) {
  const { leagueSlug } = params;
  const [data, setData] = useState(null);
  const router = useRouter();

  useEffect(() => {
    fetch(`/api/leagues/${leagueSlug}`)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {});
  }, [leagueSlug]);

  if (!data || !data.league) return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{
        background: '#141417',
        border: '1px solid #222',
        borderRadius: 6,
        padding: '18px 24px',
        marginBottom: 10,
        opacity: 0.4,
        height: 72,
        animation: 'pulse 1.5s ease-in-out infinite',
      }} />
    </div>
  );

  const { league, seasons } = data;

  function formatDateRange(start, end) {
    const fmt = d => d ? new Date(d).toLocaleDateString('en-US',
      { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : '—';
    return `${fmt(start)} – ${fmt(end)}`;
  }

  return (
    <div style={{ padding: '28px 32px', fontFamily: "'DM Mono', monospace" }}>
      <div style={{ fontSize: 11, color: '#555', marginBottom: 6, letterSpacing: 1 }}>
        {league.name} &nbsp;·&nbsp; {league.venue_name}, {league.venue_city}, {league.venue_state}
      </div>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32,
                    letterSpacing: 2, color: '#fff', marginBottom: 4 }}>
        Select a Season
      </div>
      <div style={{ color: '#555', fontSize: 12, marginBottom: 28 }}>
        Choose a season to manage, or set up a new one.
      </div>

      <div style={{ marginBottom: 32 }}>
        {seasons.map(season => (
          <div key={season.id}
            onClick={() => router.push(`/${leagueSlug}/${season.slug}`)}
            style={{
              background: '#141417',
              border: '1px solid #222',
              borderLeft: season.is_active
                ? `3px solid ${league.accent_color || '#3dffa0'}`
                : '3px solid #333',
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
              <div style={{
                fontFamily: "'Bebas Neue', sans-serif", fontSize: 26,
                letterSpacing: 2, lineHeight: 1,
                color: season.is_active ? '#fff' : '#888',
              }}>
                {season.name}
              </div>
              <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>
                {season.week_count} weeks &nbsp;·&nbsp; {formatDateRange(season.start_date, season.end_date)}
              </div>
            </div>
            <div style={{
              fontSize: 11, whiteSpace: 'nowrap', paddingLeft: 24,
              letterSpacing: 1, textTransform: 'uppercase',
              color: season.is_active ? '#e8ff47' : '#555',
            }}>
              {season.is_active ? '● Active' : 'Complete'}
            </div>
          </div>
        ))}
      </div>

      <div
        onClick={() => router.push(`/${leagueSlug}/${seasons.find(s => s.is_active)?.slug || seasons[0]?.slug}/setup`)}
        style={{
          display: 'inline-block', padding: 2, borderRadius: 8, cursor: 'pointer',
          background: 'linear-gradient(135deg, #FF0018 0%, #FFA52C 14%, #FFFF41 28%, #008018 42%, #0000F9 57%, #86007D 71%, #FF0018 85%, #FFA52C 100%)',
        }}
      >
        <div style={{
          background: '#141417', borderRadius: 6, padding: '32px 28px',
          width: 200, display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          <div style={{ fontSize: 22, color: '#e8ff47' }}>+</div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20,
                        letterSpacing: 1.5, color: '#fff' }}>
            Set Up New Season
          </div>
          <div style={{ fontSize: 11, color: '#555', lineHeight: 1.5 }}>
            Import roster and schedule PDFs for a new season.
          </div>
        </div>
      </div>
    </div>
  );
}
