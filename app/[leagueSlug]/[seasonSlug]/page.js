'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function DashboardPage({ params }) {
  const { leagueSlug, seasonSlug } = params;
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [laneData, setLaneData] = useState(null);

  useEffect(() => {
    fetch(`/api/${leagueSlug}/${seasonSlug}/dashboard`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [leagueSlug, seasonSlug]);

  useEffect(() => {
    fetch(`/api/${leagueSlug}/${seasonSlug}/dashboard/lanes`)
      .then(r => r.json())
      .then(d => setLaneData(d))
      .catch(() => {});
  }, [leagueSlug, seasonSlug]);

  if (loading) return (
    <div style={pageStyle}>
      <p style={{ color: '#555', fontSize: 13 }}>Loading...</p>
    </div>
  );

  if (error) return (
    <div style={pageStyle}>
      <p style={{ color: '#ff6b35', fontSize: 13 }}>Error: {error}</p>
    </div>
  );

  if (!data?.season) return (
    <div style={pageStyle}>
      <h1 style={titleStyle}>Welcome</h1>
      <p style={{ color: '#555', fontSize: 12, marginBottom: 24 }}>
        No season data found.
      </p>
      <div style={emptyCardStyle}>
        <p style={{ color: '#666', fontFamily: 'monospace', fontSize: 13, marginBottom: 16 }}>
          NO ACTIVE SEASON
        </p>
        <Link href={`/${leagueSlug}/${seasonSlug}/setup`} style={ctaButton}>SET UP SEASON →</Link>
      </div>
    </div>
  );

  const { season, currentWeek, stats } = data;

  function weekStatusLabel(status) {
    if (status === 'locked')   return { text: 'TONIGHT', color: '#e8ff47' };
    if (status === 'complete') return { text: 'COMPLETE', color: '#3dffa0' };
    return { text: 'UPCOMING', color: '#555' };
  }

  const wsl = weekStatusLabel(currentWeek?.status);
  const pool = stats.checkedIn * 5;

  const navCards = [
    {
      href: `/${leagueSlug}/${seasonSlug}/checkin`,
      label: 'Check-In', icon: '✓',
      desc: currentWeek?.status === 'locked' ? `${stats.checkedIn} players checked in` : 'Mark players as paid',
      accent: '#e8ff47', enabled: true,
    },
    {
      href: `/${leagueSlug}/${seasonSlug}/gamenight`,
      label: 'Game Night', icon: '♠',
      desc: stats.gamesEntered > 0 ? `${stats.gamesEntered} of 3 games entered` : 'Record winners',
      accent: '#ff6b35', enabled: currentWeek?.status === 'locked',
    },
    {
      href: `/${leagueSlug}/${seasonSlug}/report`,
      label: 'Report', icon: '⬇',
      desc: 'Download weekly PNG',
      accent: '#3dffa0', enabled: stats.weeksComplete > 0,
    },
    {
      href: `/${leagueSlug}/${seasonSlug}/schedule`,
      label: 'Schedule', icon: '≡',
      desc: `${stats.weeksComplete} of ${stats.totalWeeks} weeks done`,
      accent: '#888', enabled: true,
    },
    {
      href: `/${leagueSlug}/${seasonSlug}/history`,
      label: 'History', icon: '◷',
      desc: 'Leaderboard & past weeks',
      accent: '#888', enabled: stats.weeksComplete > 0,
    },
    {
      href: `/${leagueSlug}/${seasonSlug}/settings`,
      label: 'Settings', icon: '⚙',
      desc: 'Buy-in, progressive, charity',
      accent: '#888', enabled: true,
    },
  ];

  return (
    <div style={pageStyle}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={titleStyle}>{season.name}</h1>
      </div>

      {currentWeek && (
        <div style={{
          background: '#141417', border: '1px solid #222',
          borderLeft: `3px solid ${wsl.color}`, borderRadius: 6,
          padding: '14px 18px', marginBottom: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 12,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span style={{ background: '#1e1e22', color: wsl.color, fontSize: 10, padding: '2px 8px', borderRadius: 3, letterSpacing: 1, fontFamily: 'monospace' }}>
                WK {String(currentWeek.week_number).padStart(2, '0')}
              </span>
              <span style={{ color: wsl.color, fontSize: 10, letterSpacing: 2, fontFamily: 'monospace' }}>{wsl.text}</span>
            </div>
            <div style={{ color: '#bbb', fontSize: 13, fontFamily: 'monospace' }}>{formatDate(currentWeek.bowl_date)}</div>
          </div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <Stat label="Checked In"  value={`${stats.checkedIn}`}                     sub={`of ${stats.totalBowlers}`} />
            <Stat label="Pool"        value={`$${pool}`}                                sub="tonight" />
            <Stat label="Progressive" value={`$${stats.progressivePot.toFixed(2)}`}    sub="pot" />
            <Stat label="Charity"     value={`$${stats.charityFund.toFixed(2)}`}        sub="fund" />
            <Stat label="Games"       value={`${stats.gamesEntered}/3`}                 sub="entered" />
          </div>
        </div>
      )}

      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#444', fontFamily: 'monospace', marginBottom: 6, letterSpacing: 1 }}>
          <span>SEASON PROGRESS</span>
          <span>{stats.weeksComplete} / {stats.totalWeeks} WEEKS</span>
        </div>
        <div style={{ background: '#1e1e22', borderRadius: 3, height: 4, overflow: 'hidden' }}>
          <div style={{ background: '#3dffa0', width: `${(stats.weeksComplete / stats.totalWeeks) * 100}%`, height: '100%', borderRadius: 3, transition: 'width 0.4s ease' }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
        {navCards.map(card => (
          <Link key={card.href} href={card.href} style={{
            display: 'block', background: '#141417',
            border: `1px solid ${card.enabled ? '#222' : '#1a1a1e'}`,
            borderTop: card.enabled ? `2px solid ${card.accent}` : '2px solid #1e1e22',
            borderRadius: 6, padding: '14px 16px', textDecoration: 'none',
            opacity: card.enabled ? 1 : 0.4, pointerEvents: card.enabled ? 'auto' : 'none',
          }}
            onMouseEnter={e => { if (card.enabled) e.currentTarget.style.background = '#1a1a1e'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#141417'; }}
          >
            <div style={{ fontSize: 20, marginBottom: 8, color: card.enabled ? card.accent : '#333' }}>{card.icon}</div>
            <div style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: card.enabled ? '#fff' : '#444', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
              {card.label}
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 10, color: card.enabled ? '#555' : '#333', lineHeight: 1.4 }}>{card.desc}</div>
          </Link>
        ))}
      </div>

      {laneData && (
        <>
          <div style={{ marginTop: 32 }}>
            <LanePairSection label="Lane Assignments" {...laneData} />
          </div>
          {laneData.nextWeek && (
            <div style={{ marginTop: 28 }}>
              <LanePairSection label="Upcoming" {...laneData.nextWeek} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function formatDate(d) {
  if (!d) return '—';
  const date = new Date(d);
  const adjusted = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
  return adjusted.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function LanePairSection({ label, weekNumber, bowlDate, hasPairs, lanePairs }) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 10 }}>
        <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: 2, textTransform: 'uppercase', color: '#555', fontFamily: "'DM Mono', monospace" }}>{label}</span>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#e8ff47', background: '#1e2010', padding: '2px 8px', borderRadius: 4, letterSpacing: 1 }}>
          WK {String(weekNumber).padStart(2, '0')} · {formatDate(bowlDate)}
        </span>
      </div>
      {!hasPairs && (
        <div style={{ color: '#2a5555', fontFamily: "'DM Mono', monospace", fontSize: 11, padding: '1.5rem', background: '#0a1f1f', border: '1px solid #1a4040', borderRadius: 6, textAlign: 'center', letterSpacing: 1 }}>
          LANE ASSIGNMENTS NOT YET SET FOR THIS WEEK — TBD
        </div>
      )}
      {hasPairs && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
          {lanePairs.map((pair, i) => (
            <div key={i} style={{ background: '#0d2a2a', border: '1px solid #1a4040', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ background: '#0a1f1f', borderBottom: '1px solid #1a4040', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#c084fc', opacity: 0.8, flexShrink: 0 }} />
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, fontWeight: 500, color: '#e8ff47', letterSpacing: 1 }}>LANES {pair.laneA}–{pair.laneB}</span>
              </div>
              <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[pair.teamA, pair.teamB].map((team, ti) => (
                  <div key={ti}>
                    {ti === 1 && <div style={{ height: 1, background: '#2a5a5a', margin: '4px 0 6px' }} />}
                    <div style={{ fontSize: 8, letterSpacing: 1.5, textTransform: 'uppercase', color: '#3a7070', fontFamily: "'DM Mono', monospace", marginBottom: 2 }}>Team {ti === 0 ? 'A' : 'B'}</div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: '#c084fc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: 0.3, marginBottom: 2 }}>{team.teamName}</div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {team.bowlers.map((b, bi) => (
                        <span key={bi} style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: b.isVacant ? '#1e3f3f' : '#7ab8b8', fontStyle: b.isVacant ? 'italic' : 'normal', lineHeight: 1.55, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {b.displayName}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#555', letterSpacing: 1, marginBottom: 2 }}>{label.toUpperCase()}</div>
      <div style={{ fontFamily: 'monospace', fontSize: 16, color: '#fff', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#444', marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

const pageStyle = { padding: '28px 32px', fontFamily: 'monospace' };
const titleStyle = { fontFamily: 'var(--font-display, "Arial Black", sans-serif)', fontSize: 28, fontWeight: 900, color: '#fff', letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 4px' };
const emptyCardStyle = { background: '#141417', border: '1px solid #222', borderRadius: 6, padding: '24px', maxWidth: 480 };
const ctaButton = { display: 'inline-block', background: 'transparent', border: '1px solid #e8ff47', color: '#e8ff47', fontFamily: 'monospace', fontSize: 11, letterSpacing: 1, padding: '8px 16px', borderRadius: 4, textDecoration: 'none', textTransform: 'uppercase' };
