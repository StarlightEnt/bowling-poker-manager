'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function DashboardPage() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

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

  // No active season
  if (!data?.season) return (
    <div style={pageStyle}>
      <h1 style={titleStyle}>Welcome</h1>
      <p style={{ color: '#555', fontSize: 12, marginBottom: 24 }}>
        LGBT Wednesday Community League — Poker Side Game Manager
      </p>
      <div style={emptyCardStyle}>
        <p style={{ color: '#666', fontFamily: 'monospace', fontSize: 13, marginBottom: 16 }}>
          NO ACTIVE SEASON
        </p>
        <p style={{ color: '#444', fontSize: 12, marginBottom: 20, lineHeight: 1.6 }}>
          Get started by setting up a season. Upload your League Standings PDF to import
          teams and bowlers, and your Schedule PDF to import the weekly lane assignments.
        </p>
        <Link href="/setup" style={ctaButton}>SET UP SEASON →</Link>
      </div>
    </div>
  );

  const { season, currentWeek, stats } = data;

  function formatDate(d) {
    if (!d) return '—';
    const date = new Date(d);
    const adjusted = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
    return adjusted.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function weekStatusLabel(status) {
    if (status === 'locked')   return { text: 'TONIGHT', color: '#e8ff47' };
    if (status === 'complete') return { text: 'COMPLETE', color: '#3dffa0' };
    return { text: 'UPCOMING', color: '#555' };
  }

  const wsl = weekStatusLabel(currentWeek?.status);
  const pool = stats.checkedIn * 5;

  // Quick-action nav cards
  const navCards = [
    {
      href: '/checkin',
      label: 'Check-In',
      icon: '✓',
      desc: currentWeek?.status === 'locked'
        ? `${stats.checkedIn} players checked in`
        : 'Mark players as paid',
      accent: '#e8ff47',
      enabled: true,
    },
    {
      href: '/gamenight',
      label: 'Game Night',
      icon: '♠',
      desc: stats.gamesEntered > 0
        ? `${stats.gamesEntered} of 3 games entered`
        : 'Record winners',
      accent: '#ff6b35',
      enabled: currentWeek?.status === 'locked',
    },
    {
      href: '/report',
      label: 'Report',
      icon: '⬇',
      desc: 'Download weekly PNG',
      accent: '#3dffa0',
      enabled: stats.weeksComplete > 0,
    },
    {
      href: '/schedule',
      label: 'Schedule',
      icon: '≡',
      desc: `${stats.weeksComplete} of ${stats.totalWeeks} weeks done`,
      accent: '#888',
      enabled: true,
    },
    {
      href: '/history',
      label: 'History',
      icon: '◷',
      desc: 'Leaderboard & past weeks',
      accent: '#888',
      enabled: stats.weeksComplete > 0,
    },
    {
      href: '/settings',
      label: 'Settings',
      icon: '⚙',
      desc: 'Buy-in, progressive, charity',
      accent: '#888',
      enabled: true,
    },
  ];

  return (
    <div style={pageStyle}>
      {/* Season header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={titleStyle}>{season.name}</h1>
        <p style={{ color: '#555', fontSize: 11, fontFamily: 'monospace' }}>
          LGBT Wednesday Community League &nbsp;·&nbsp; Classic Bowling Center, Daly City, CA
        </p>
      </div>

      {/* Current week banner */}
      {currentWeek && (
        <div style={{
          background: '#141417',
          border: '1px solid #222',
          borderLeft: `3px solid ${wsl.color}`,
          borderRadius: 6,
          padding: '14px 18px',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span style={{
                background: '#1e1e22', color: wsl.color,
                fontSize: 10, padding: '2px 8px', borderRadius: 3,
                letterSpacing: 1, fontFamily: 'monospace',
              }}>
                WK {String(currentWeek.week_number).padStart(2, '0')}
              </span>
              <span style={{ color: wsl.color, fontSize: 10, letterSpacing: 2, fontFamily: 'monospace' }}>
                {wsl.text}
              </span>
            </div>
            <div style={{ color: '#bbb', fontSize: 13, fontFamily: 'monospace' }}>
              {formatDate(currentWeek.bowl_date)}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <Stat label="Checked In"   value={`${stats.checkedIn}`}   sub={`of ${stats.totalBowlers}`} />
            <Stat label="Pool"         value={`$${pool}`}             sub="tonight" />
            <Stat label="Progressive"  value={`$${stats.progressivePot.toFixed(2)}`} sub="pot" />
            <Stat label="Charity"      value={`$${stats.charityFund.toFixed(2)}`}    sub="fund" />
            <Stat label="Games"        value={`${stats.gamesEntered}/3`}             sub="entered" />
          </div>
        </div>
      )}

      {/* Season progress bar */}
      <div style={{ marginBottom: 28 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontSize: 10, color: '#444', fontFamily: 'monospace',
          marginBottom: 6, letterSpacing: 1,
        }}>
          <span>SEASON PROGRESS</span>
          <span>{stats.weeksComplete} / {stats.totalWeeks} WEEKS</span>
        </div>
        <div style={{ background: '#1e1e22', borderRadius: 3, height: 4, overflow: 'hidden' }}>
          <div style={{
            background: '#3dffa0',
            width: `${(stats.weeksComplete / stats.totalWeeks) * 100}%`,
            height: '100%',
            borderRadius: 3,
            transition: 'width 0.4s ease',
          }} />
        </div>
      </div>

      {/* Nav cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: 12,
      }}>
        {navCards.map(card => (
          <Link
            key={card.href}
            href={card.href}
            style={{
              display: 'block',
              background: '#141417',
              border: `1px solid ${card.enabled ? '#222' : '#1a1a1e'}`,
              borderTop: card.enabled ? `2px solid ${card.accent}` : '2px solid #1e1e22',
              borderRadius: 6,
              padding: '14px 16px',
              textDecoration: 'none',
              opacity: card.enabled ? 1 : 0.4,
              pointerEvents: card.enabled ? 'auto' : 'none',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { if (card.enabled) e.currentTarget.style.background = '#1a1a1e'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#141417'; }}
          >
            <div style={{
              fontSize: 20,
              marginBottom: 8,
              color: card.enabled ? card.accent : '#333',
            }}>
              {card.icon}
            </div>
            <div style={{
              fontFamily: 'monospace',
              fontSize: 11,
              fontWeight: 700,
              color: card.enabled ? '#fff' : '#444',
              letterSpacing: 1,
              textTransform: 'uppercase',
              marginBottom: 4,
            }}>
              {card.label}
            </div>
            <div style={{
              fontFamily: 'monospace',
              fontSize: 10,
              color: card.enabled ? '#555' : '#333',
              lineHeight: 1.4,
            }}>
              {card.desc}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#555', letterSpacing: 1, marginBottom: 2 }}>
        {label.toUpperCase()}
      </div>
      <div style={{ fontFamily: 'monospace', fontSize: 16, color: '#fff', lineHeight: 1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#444', marginTop: 1 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

const pageStyle = { padding: '28px 32px', fontFamily: 'monospace' };

const titleStyle = {
  fontFamily: 'var(--font-display, "Arial Black", sans-serif)',
  fontSize: 28,
  fontWeight: 900,
  color: '#fff',
  letterSpacing: 2,
  textTransform: 'uppercase',
  margin: '0 0 4px',
};

const emptyCardStyle = {
  background: '#141417',
  border: '1px solid #222',
  borderRadius: 6,
  padding: '24px',
  maxWidth: 480,
};

const ctaButton = {
  display: 'inline-block',
  background: 'transparent',
  border: '1px solid #e8ff47',
  color: '#e8ff47',
  fontFamily: 'monospace',
  fontSize: 11,
  letterSpacing: 1,
  padding: '8px 16px',
  borderRadius: 4,
  textDecoration: 'none',
  textTransform: 'uppercase',
};
