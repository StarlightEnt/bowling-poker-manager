// PATH: app/history/page.js
'use client';

import { useState, useEffect, useRef } from 'react';

const fmt = (n) => `$${parseFloat(n || 0).toFixed(2)}`;
const fmtDate = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
};

const HAND_COLORS = {
  'Royal Flush':    '#e8ff47',
  'Straight Flush': '#4fa3ff',
  'Four of a Kind': '#3dffa0',
  'Full House':     '#ff6b35',
  'Straight':       '#c084fc',
  'Unknown':        '#555',
};

function DonationTooltip({ donation }) {
  const [show, setShow] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setShow(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <span ref={ref} style={{ position: 'relative', display: 'inline-block', marginLeft: 4 }}>
      <span
        onClick={() => setShow(!show)}
        style={{ color: '#4fa3ff', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}
        title="Extra donation included"
      >
        *
      </span>
      {show && (
        <div style={{
          position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
          background: '#1a1a1e', border: '1px solid #333', borderRadius: 6,
          padding: '8px 12px', zIndex: 100, minWidth: 200, whiteSpace: 'nowrap',
        }}>
          <div style={{ color: '#3dffa0', fontSize: 12, fontWeight: 700 }}>
            +{fmt(donation.amount)} extra donation
          </div>
          {donation.notes && (
            <div style={{ color: '#777', fontSize: 11, marginTop: 4 }}>
              "{donation.notes}"
            </div>
          )}
        </div>
      )}
    </span>
  );
}

export default function HistoryPage() {
  const [data, setData]                   = useState(null);
  const [loading, setLoading]             = useState(true);
  const [season, setSeason]               = useState('all');
  const [expandWins, setExpandWins]       = useState(false);
  const [expandEarnings, setExpandEarnings] = useState(false);
  const [showLedger, setShowLedger]       = useState(false);

  useEffect(() => {
    setLoading(true);
    const url = season === 'all' ? '/api/history' : `/api/history?season=${encodeURIComponent(season)}`;
    fetch(url)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [season]);

  if (loading) return (
    <div style={{ padding: '40px 32px', fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>
      Loading history…
    </div>
  );
  if (!data) return (
    <div style={{ padding: '40px 32px', color: 'var(--accent2)' }}>Failed to load history.</div>
  );

  const { summary, topByWins, topByEarnings, leaderboard, handStats, gameLog, seasons, charity } = data;
  const winsData     = expandWins     ? leaderboard : topByWins;
  const earningsData = expandEarnings ? [...leaderboard].sort((a, b) => b.earnings - a.earnings) : topByEarnings;

  return (
    <div style={{ padding: '28px 32px', fontFamily: 'var(--font-mono, monospace)', maxWidth: 1100 }}>

      {/* ── Page Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 48, letterSpacing: 3, color: 'var(--text)', margin: 0, lineHeight: 1 }}>
            History
          </h1>
          <p style={{ color: '#555', fontSize: 11, margin: '4px 0 0' }}>
            Stats tracked from Fall/Winter '24-'25 &nbsp;·&nbsp; Check-in data from Summer '26, Week 7
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#555', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Season</span>
          <select
            value={season}
            onChange={e => { setSeason(e.target.value); setExpandWins(false); setExpandEarnings(false); }}
            style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 4, color: 'var(--text)', padding: '8px 12px',
              fontSize: 12, fontFamily: 'var(--font-mono)', outline: 'none', cursor: 'pointer',
            }}
          >
            <option value="all">Overall (All Seasons)</option>
            {seasons.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Summary Stats Card ── */}
      <div style={{ background: 'var(--surface)', border: '1px solid #222', borderRadius: 8, padding: '20px 24px', marginBottom: 24 }}>

        {/* Key numbers */}
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', marginBottom: 24 }}>
          {[
            { label: 'Weeks Played',    value: summary.weeksPlayed,              color: 'var(--accent)' },
            { label: 'Total Games',     value: summary.totalGames,               color: 'var(--accent)' },
            { label: 'Total Paid Out',  value: fmt(summary.totalEarnings),       color: '#3dffa0' },
            { label: 'Progressive Wins', value: summary.progressiveWins,         color: '#e8ff47' },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 36, letterSpacing: 2, color, lineHeight: 1 }}>{value}</div>
              <div style={{ color: '#555', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>{label}</div>
            </div>
          ))}

          {/* Charity block */}
          {charity && (
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 20, alignItems: 'flex-start' }}>
              <div>
                <div
                  onClick={() => setShowLedger(!showLedger)}
                  style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 36, letterSpacing: 2, color: '#3dffa0', lineHeight: 1, cursor: 'pointer', borderBottom: '1px dotted #3dffa066' }}
                  title="Click to view charity ledger"
                >
                  {fmt(charity.totalRaised)} ↗
                </div>
                <div style={{ color: '#555', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>
                  Charity Raised
                </div>
              </div>
              <div>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 36, letterSpacing: 2, color: '#ff6b35', lineHeight: 1 }}>
                  {fmt(charity.totalPaid)}
                </div>
                <div style={{ color: '#555', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>
                  Paid to Charity
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Charity ledger (expandable) */}
        {charity && showLedger && (
          <div style={{ marginBottom: 24, background: '#0d0d0f', border: '1px solid #222', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid #1a1a1e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 14, letterSpacing: 2, color: '#3dffa0' }}>
                Charity Ledger
              </div>
              <button
                onClick={() => setShowLedger(false)}
                style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 16 }}
              >
                ✕
              </button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: '#1a1a1e' }}>
                  {['Type', 'Season', 'Week', 'Date', 'Description', 'Amount', 'Balance'].map(h => (
                    <th key={h} style={{ padding: '7px 12px', textAlign: h === 'Amount' || h === 'Balance' ? 'right' : 'left', color: '#555', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 400, borderBottom: '1px solid #2a2a2e' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {charity.ledger.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #1a1a1e', background: row.type === 'opening' || row.type === 'season_total' ? '#141417' : 'transparent' }}>
                    <td style={{ padding: '7px 12px' }}>
                      {row.type === 'opening' && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, background: '#1a1a1e', color: '#555', border: '1px solid #333', textTransform: 'uppercase', letterSpacing: 1 }}>opening</span>}
                      {row.type === 'season_total' && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, background: '#1a1a1e', color: '#555', border: '1px solid #333', textTransform: 'uppercase', letterSpacing: 1 }}>season</span>}
                      {row.type === 'credit' && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, background: '#0a1a12', color: '#3dffa0', border: '1px solid #3dffa022', textTransform: 'uppercase', letterSpacing: 1 }}>credit</span>}
                      {row.type === 'debit' && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, background: '#1a0a0a', color: '#ff6b35', border: '1px solid #ff6b3522', textTransform: 'uppercase', letterSpacing: 1 }}>debit</span>}
                    </td>
                    <td style={{ padding: '7px 12px', color: '#777' }}>{row.season_name}</td>
                    <td style={{ padding: '7px 12px', color: '#555' }}>
                      {row.week_number ? `Wk ${row.week_number}` : '—'}
                    </td>
                    <td style={{ padding: '7px 12px', color: '#555', whiteSpace: 'nowrap' }}>
                      {fmtDate(row.bowl_date)}
                    </td>
                    <td style={{ padding: '7px 12px', color: '#777' }}>
                      {row.description}
                      {row.donation && (
                        <>
                          <DonationTooltip donation={row.donation} />
                          <div style={{ fontSize: 10, color: '#4fa3ff', marginTop: 2 }}>* includes extra donation</div>
                        </>
                      )}
                    </td>
                    <td style={{ padding: '7px 12px', textAlign: 'right', color: row.type === 'debit' ? '#ff6b35' : '#3dffa0', fontWeight: 500 }}>
                      {row.type === 'debit' ? '-' : '+'}{fmt(row.amount)}
                    </td>
                    <td style={{ padding: '7px 12px', textAlign: 'right', color: '#777' }}>
                      {fmt(row.balance)}
                    </td>
                  </tr>
                ))}
                <tr style={{ background: '#141417', borderTop: '1px solid #333' }}>
                  <td colSpan={5} style={{ padding: '8px 12px', textAlign: 'right', color: '#555', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Running total</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', color: '#3dffa0', fontWeight: 700, fontSize: 14, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 1 }}>{fmt(charity.balance)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Hand stats */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ color: '#555', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Winning Hand Breakdown</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {handStats.map(({ hand_type, count, pct }) => (
              <div key={hand_type} style={{
                background: '#0d0d0f', border: `1px solid ${HAND_COLORS[hand_type] || '#333'}22`,
                borderLeft: `3px solid ${HAND_COLORS[hand_type] || '#555'}`,
                borderRadius: 4, padding: '8px 12px', minWidth: 140,
              }}>
                <div style={{ color: HAND_COLORS[hand_type] || '#555', fontSize: 12, fontWeight: 700 }}>{hand_type}</div>
                <div style={{ color: '#aaa', fontSize: 11, marginTop: 2 }}>{count} wins &nbsp;·&nbsp; {pct}%</div>
                <div style={{ marginTop: 6, height: 3, background: '#222', borderRadius: 2 }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: HAND_COLORS[hand_type] || '#555', borderRadius: 2 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Leaderboards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ color: '#555', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>🏆 Top by Game Wins</div>
              <button onClick={() => setExpandWins(!expandWins)} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 11, cursor: 'pointer', padding: 0 }}>
                {expandWins ? '▲ show less' : `▼ all ${leaderboard.length}`}
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {winsData.map((p, i) => (
                <div key={p.name} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px',
                  background: i === 0 ? '#1a1f0a' : '#0d0d0f', borderRadius: 4,
                  border: i === 0 ? '1px solid #e8ff4722' : '1px solid #1a1a1e',
                }}>
                  <span style={{ color: i === 0 ? '#e8ff47' : '#555', fontSize: 11, width: 18, textAlign: 'right' }}>{i + 1}</span>
                  <span style={{ color: '#ccc', fontSize: 12, flex: 1 }}>{p.name}</span>
                  <span style={{ color: '#3dffa0', fontSize: 13, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 1 }}>{p.wins}</span>
                  <span style={{ color: '#555', fontSize: 10 }}>wins</span>
                  {p.progressive_wins > 0 && <span style={{ color: '#e8ff47', fontSize: 10 }} title="Progressive wins">★{p.progressive_wins}</span>}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ color: '#555', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>💰 Top by Prize Money</div>
              <button onClick={() => setExpandEarnings(!expandEarnings)} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 11, cursor: 'pointer', padding: 0 }}>
                {expandEarnings ? '▲ show less' : `▼ all ${leaderboard.length}`}
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {earningsData.map((p, i) => (
                <div key={p.name} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px',
                  background: i === 0 ? '#0a1a12' : '#0d0d0f', borderRadius: 4,
                  border: i === 0 ? '1px solid #3dffa022' : '1px solid #1a1a1e',
                }}>
                  <span style={{ color: i === 0 ? '#3dffa0' : '#555', fontSize: 11, width: 18, textAlign: 'right' }}>{i + 1}</span>
                  <span style={{ color: '#ccc', fontSize: 12, flex: 1 }}>{p.name}</span>
                  <span style={{ color: '#3dffa0', fontSize: 13, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 1 }}>{fmt(p.earnings)}</span>
                  {p.progressive_wins > 0 && <span style={{ color: '#e8ff47', fontSize: 10 }} title="Progressive wins">★{p.progressive_wins}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Game Log ── */}
      <div style={{ background: 'var(--surface)', border: '1px solid #222', borderRadius: 8, overflowX: 'auto' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #1a1a1e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: 2, color: '#fff' }}>Game Log</div>
          <div style={{ color: '#555', fontSize: 11 }}>{gameLog.length} results</div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ background: '#1a1a1e', borderBottom: '1px solid #2a2a2e' }}>
              {['Season', 'Date', 'Gm', 'Winner', 'Hand Type', 'Detail', 'Pot', 'Prog', 'Total'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#555', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 400, whiteSpace: 'nowrap' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {gameLog.map((row, i) => {
              const handColor = HAND_COLORS[row.hand_type] || '#555';
              const isProgWin = row.is_progressive_win;
              return (
                <tr key={i} style={{ borderBottom: '1px solid #1a1a1e', background: isProgWin ? '#1a1a0a' : 'transparent' }}>
                  <td style={td}><span style={{ color: '#555', fontSize: 10 }}>{row.season_name}</span></td>
                  <td style={td}><span style={{ color: '#777', whiteSpace: 'nowrap' }}>{fmtDate(row.bowl_date)}</span></td>
                  <td style={{ ...td, textAlign: 'center' }}><span style={{ color: '#555' }}>{row.game_number}</span></td>
                  <td style={td}><span style={{ color: '#ccc' }}>{row.winner_name}</span></td>
                  <td style={td}>
                    <span style={{ color: handColor, padding: '2px 6px', background: `${handColor}18`, borderRadius: 3, fontSize: 10, whiteSpace: 'nowrap' }}>
                      {row.hand_type}
                    </span>
                  </td>
                  <td style={td}><span style={{ color: '#666' }}>{row.hand_detail || '—'}</span></td>
                  <td style={td}><span style={{ color: '#777' }}>{fmt(row.pot_amount)}</span></td>
                  <td style={{ ...td, textAlign: 'center' }}>
                    {isProgWin
                      ? <span style={{ color: '#e8ff47', fontWeight: 700 }}>★ {fmt(row.progressive_payout)}</span>
                      : <span style={{ color: '#2a2a2e' }}>—</span>
                    }
                  </td>
                  <td style={td}>
                    <span style={{ color: isProgWin ? '#e8ff47' : '#3dffa0', fontWeight: isProgWin ? 700 : 400 }}>
                      {fmt(row.total_payout)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
}

const td = { padding: '7px 12px', verticalAlign: 'middle' };
