// PATH: app/[leagueSlug]/[seasonSlug]/report/page.js
'use client';

import { useState, useEffect, useRef } from 'react';
import { toPng } from 'html-to-image';

export default function ReportPage({ params }) {
  const { leagueSlug, seasonSlug } = params;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [theme, setTheme] = useState('dark');
  const [downloading, setDownloading] = useState(false);
  const reportRef = useRef(null);

  async function loadReport(week = null) {
    setLoading(true);
    try {
      const url = week
        ? `/api/${leagueSlug}/${seasonSlug}/report?week=${week}`
        : `/api/${leagueSlug}/${seasonSlug}/report`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.error) { setError(json.error); return; }
      setData(json);
      setSelectedWeek(json.weekNumber);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadReport(); }, [leagueSlug, seasonSlug]);

  async function handleDownload() {
    if (!reportRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(reportRef.current, { pixelRatio: 2 });
      const a = document.createElement('a');
      a.download = `bowling-poker-week${selectedWeek}-${theme}.png`;
      a.href = dataUrl;
      a.click();
    } finally {
      setDownloading(false);
    }
  }

  const T = theme === 'dark' ? {
    card: { background: '#1a1a1f' },
    titleColor: '#e8ff47',
    mainColor: '#fff',
    subColor: '#888',
    payoutColor: '#e8ff47',
    statBg: '#22222a',
    resultsBg: '#22222a',
    resultsTableBg: '#22222a',
    divider: '#2a2a35',
    redLabel: '#FF0018', redBg: '#22222a',
    orangeLabel: '#FFA52C', orangeBg: '#22222a',
    greenLabel: '#00b022', greenBg: '#22222a',
    purpleLabel: '#cc44cc', purpleBg: '#22222a', purpleBorder: '#86007D',
    tealLabel: '#3dffa0', tealBg: '#22222a', tealBorder: '#3dffa0',
    footerColor: '#555',
  } : {
    card: { background: '#ffffff', border: '1px solid #e0e0e0' },
    titleColor: '#111',
    mainColor: '#111',
    subColor: '#999',
    payoutColor: '#111',
    statBg: '#f9f9f9',
    resultsBg: '#f5f5ff',
    resultsTableBg: '#f8f8ff',
    divider: '#e0e0ee',
    redLabel: '#CC0010', redBg: '#fff5f5',
    orangeLabel: '#c07000', orangeBg: '#fff8f0',
    greenLabel: '#006815', greenBg: '#f0fff4',
    purpleLabel: '#86007D', purpleBg: '#fdf0ff', purpleBorder: '#86007D',
    tealLabel: '#007050', tealBg: '#f0fff8', tealBorder: '#008060',
    footerColor: '#aaa',
  };

  if (loading) return <div style={{ color: 'var(--muted)', padding: '40px', textAlign: 'center' }}>Loading report...</div>;
  if (error) return <div style={{ color: 'var(--red)', padding: '20px' }}>{error}</div>;
  if (!data) return null;

  const bowlDate = data.scheduleRow?.bowl_date
    ? new Date(data.scheduleRow.bowl_date).toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
      })
    : '';

  const gameRows = [1, 2, 3].map(g => {
    const results = data.results.filter(r => r.game_number === g);
    return {
      game: g,
      winners: results.map(r => r.normalized_name).join(' / '),
      hand: results[0]?.hand_type || '—',
      handDetail: results[0]?.hand_detail || '',
      isProgressiveWin: results[0]?.is_progressive_win || false,
      progressivePayout: results[0] ? parseFloat(results[0].progressive_payout || 0) : 0,
      totalPayout: results[0] ? parseFloat(results[0].total_payout || 0) : data.perGame.payout,
    };
  });

  const gameColors = [T.redLabel, T.orangeLabel, T.greenLabel];

  return (
    <div>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '48px', letterSpacing: '3px', color: 'var(--text)', marginBottom: '8px' }}>
        Weekly Report
      </div>
      <div style={{ color: 'var(--muted)', marginBottom: '24px', fontSize: '12px' }}>
        Shareable summary card for the league secretary.
      </div>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ color: 'var(--muted)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Week</div>
          <select
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text)', padding: '8px 12px', fontSize: '13px', fontFamily: "'DM Mono', monospace", outline: 'none', cursor: 'pointer' }}
            value={selectedWeek || ''}
            onChange={e => loadReport(parseInt(e.target.value))}
          >
            {data.completedWeeks.map(w => (
              <option key={w.week_number} value={w.week_number}>
                Week {w.week_number} — {w.bowl_date ? new Date(w.bowl_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }) : ''}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => setTheme('dark')}
            style={{ padding: '8px 16px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', background: theme === 'dark' ? '#1a1a1f' : 'transparent', color: theme === 'dark' ? '#e8ff47' : 'var(--muted)', border: theme === 'dark' ? '1.5px solid #e8ff47' : '1px solid var(--border)', fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '1px' }}
          >Dark</button>
          <button
            onClick={() => setTheme('light')}
            style={{ padding: '8px 16px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', background: theme === 'light' ? '#fff' : 'transparent', color: theme === 'light' ? '#111' : 'var(--muted)', border: theme === 'light' ? '1.5px solid #0000F9' : '1px solid var(--border)', fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '1px' }}
          >Light</button>
        </div>
      </div>

      <div ref={reportRef} style={{ ...T.card, borderRadius: '16px', padding: '28px 32px', maxWidth: '640px', position: 'relative', overflow: 'hidden' }}>

        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '6px', background: 'linear-gradient(90deg, #FF0018 0%, #FFA52C 16.6%, #FFFF41 33.2%, #008018 49.8%, #0000F9 66.4%, #86007D 83%, #FF0018 100%)' }}></div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '2px', color: T.subColor, marginBottom: '4px' }}>LGBT Wednesday Community League</div>
            <div style={{ fontSize: '22px', fontWeight: 500, color: T.titleColor, letterSpacing: '1px', fontFamily: "'Bebas Neue', sans-serif" }}>Poker Night Results</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '22px', fontWeight: 500, color: T.mainColor, fontFamily: "'Bebas Neue', sans-serif" }}>Week {data.weekNumber}</div>
            <div style={{ fontSize: '12px', color: T.subColor, marginTop: '2px' }}>{bowlDate}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          {[
            { label: 'Players', value: data.playerCount, bg: T.redBg, border: '#FF0018', labelColor: T.redLabel },
            { label: 'Pool', value: `$${data.pool.toFixed(2)}`, bg: T.orangeBg, border: '#FFA52C', labelColor: T.orangeLabel },
            { label: 'Per Game', value: `$${data.perGame.payout.toFixed(2)}`, bg: T.greenBg, border: '#008018', labelColor: T.greenLabel },
          ].map((s, i) => (
            <div key={i} style={{ background: s.bg, borderRadius: '8px', padding: '10px 16px', flex: 1, border: `1.5px solid ${s.border}` }}>
              <div style={{ fontSize: '10px', color: s.labelColor, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '3px' }}>{s.label}</div>
              <div style={{ fontSize: '22px', fontWeight: 500, color: T.mainColor, fontFamily: "'DM Mono', monospace" }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div style={{ background: T.resultsBg, borderRadius: '10px', overflow: 'hidden', border: '1.5px solid #0000F9', marginBottom: '20px' }}>
          <div style={{ padding: '8px 14px', background: '#0000F9' }}>
            <span style={{ fontSize: '10px', color: '#ccd', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 500 }}>Game Results</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', tableLayout: 'fixed', background: T.resultsTableBg }}>
            <colgroup>
              <col style={{ width: '70px' }} />
              <col style={{ width: '70px' }} />
              <col style={{ width: '130px' }} />
              <col />
            </colgroup>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.divider}` }}>
                <th style={{ padding: '8px 14px', textAlign: 'left', color: T.subColor, fontWeight: 400, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '10px' }}></th>
                <th style={{ padding: '8px 14px', textAlign: 'right', color: T.subColor, fontWeight: 400, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '10px' }}>Payout</th>
                <th style={{ padding: '8px 14px', textAlign: 'left', color: T.subColor, fontWeight: 400, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '10px', paddingLeft: '16px' }}>Winner</th>
                <th style={{ padding: '8px 14px', textAlign: 'left', color: T.subColor, fontWeight: 400, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '10px' }}>Hand</th>
              </tr>
            </thead>
            <tbody>
              {gameRows.map((row, i) => (
                <tr key={row.game} style={{ borderBottom: i < 2 ? `1px solid ${T.divider}` : 'none' }}>
                  <td style={{ padding: '12px 14px', color: gameColors[i], fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap', fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '1px' }}>Game {row.game}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', color: T.payoutColor, fontSize: '14px', fontWeight: 500, whiteSpace: 'nowrap', fontFamily: "'DM Mono', monospace' " }}>
                    ${row.totalPayout.toFixed(2)}
                  </td>
                  <td style={{ padding: '12px 14px', color: T.mainColor, fontSize: '14px', fontWeight: 500, paddingLeft: '16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {row.winners || '—'}
                  </td>
                  <td style={{ padding: '12px 14px', color: T.subColor, fontSize: '12px' }}>
                    {row.hand}{row.handDetail ? ` — ${row.handDetail}` : ''}
                    {row.isProgressiveWin && <span style={{ color: T.orangeLabel, marginLeft: '6px' }}>🏆 +${row.progressivePayout.toFixed(2)}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <div style={{ background: T.purpleBg, borderRadius: '8px', padding: '12px 16px', flex: 1, border: `1.5px solid ${T.purpleBorder}` }}>
            <div style={{ fontSize: '10px', color: T.purpleLabel, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Charity Fund (Season)</div>
            <div style={{ fontSize: '20px', fontWeight: 500, color: T.mainColor, fontFamily: "'DM Mono', monospace" }}>${data.charityBalance.toFixed(2)}</div>
            <div style={{ fontSize: '10px', color: T.subColor, marginTop: '2px' }}>{data.charityName || ''}</div>
          </div>
          <div style={{ background: T.tealBg, borderRadius: '8px', padding: '12px 16px', flex: 1, border: `1.5px solid ${T.tealBorder}` }}>
            <div style={{ fontSize: '10px', color: T.tealLabel, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Progressive Pot</div>
            <div style={{ fontSize: '20px', fontWeight: 500, color: T.mainColor, fontFamily: "'DM Mono', monospace" }}>${data.progressiveBalance.toFixed(2)}</div>
            <div style={{ fontSize: '10px', color: T.subColor, marginTop: '2px' }}>
              {data.progressiveBalance === 0 ? 'Won tonight!' : 'Running total'}
            </div>
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${T.divider}`, paddingTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '10px', color: T.footerColor, textTransform: 'uppercase', letterSpacing: '1px' }}>Classic Bowling Center · Daly City, CA</div>
          <div style={{ fontSize: '10px', color: T.footerColor }}>bowling-poker-manager.vercel.app</div>
        </div>

      </div>

      <div style={{ maxWidth: '640px', marginTop: '16px' }}>
        <button
          onClick={handleDownload}
          disabled={downloading}
          style={{ padding: '12px 32px', borderRadius: '4px', fontSize: '16px', cursor: 'pointer', background: 'var(--accent)', color: 'var(--bg)', border: 'none', fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '1px', width: '100%' }}
        >
          {downloading ? 'Saving...' : '📥 Download PNG'}
        </button>
      </div>
    </div>
  );
}
