'use client';

import { useEffect, useState, useCallback } from 'react';

export default function SchedulePage() {
  const [weeks, setWeeks]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [editing, setEditing]         = useState({});
  const [saving, setSaving]           = useState({});
  const [currentWeekNum, setCurrentWeekNum] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/schedule');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load schedule');
      setWeeks(data.weeks);
      setCurrentWeekNum(data.currentWeekNumber);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Use date-based week detection from API (same formula as check-in screen)
  const currentWeek = weeks.find(w => w.week_number === currentWeekNum)
    || weeks.find(w => w.status === 'upcoming');

  const activeStartingLane = currentWeek?.starting_lane ?? 1;
  const numPositions = currentWeek?.lane_positions?.length ?? 12;

  function startEdit(week) {
    setEditing(prev => ({
      ...prev,
      [week.id]: {
        starting_lane:    week.starting_lane ?? 1,
        lane_positions:   week.lane_positions ? [...week.lane_positions] : Array(12).fill(null),
        is_position_round: week.is_position_round ?? false,
      }
    }));
  }

  function cancelEdit(id) {
    setEditing(prev => { const n = { ...prev }; delete n[id]; return n; });
  }

  function setEditField(id, field, value) {
    setEditing(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }));
  }

  function setPosCell(id, idx, value) {
    setEditing(prev => {
      const positions = [...prev[id].lane_positions];
      positions[idx] = value === '' ? null : parseInt(value, 10) || null;
      return { ...prev, [id]: { ...prev[id], lane_positions: positions } };
    });
  }

  async function saveRow(week) {
    const edits = editing[week.id];
    setSaving(prev => ({ ...prev, [week.id]: true }));
    try {
      const res = await fetch('/api/schedule', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id:               week.id,
          starting_lane:    parseInt(edits.starting_lane, 10) || 1,
          lane_positions:   edits.lane_positions,
          is_position_round: edits.is_position_round,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      // Update local state
      setWeeks(prev => prev.map(w =>
        w.id === week.id
          ? { ...w, ...edits, starting_lane: parseInt(edits.starting_lane, 10) || 1 }
          : w
      ));
      cancelEdit(week.id);
    } catch (e) {
      alert('Save failed: ' + e.message);
    } finally {
      setSaving(prev => { const n = { ...prev }; delete n[week.id]; return n; });
    }
  }

  function statusColor(status) {
    if (status === 'complete') return '#3dffa0';
    if (status === 'locked')   return '#e8ff47';
    return '#2a2a2e';
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    // Adjust for timezone offset so we get the right day
    const adjusted = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
    return adjusted.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
  }

  if (loading) return (
    <div style={{ padding: '40px 32px', color: '#555', fontFamily: 'var(--font-mono, monospace)', fontSize: 13 }}>
      Loading schedule...
    </div>
  );

  if (error) return (
    <div style={{ padding: '40px 32px', color: '#ff6b35', fontFamily: 'var(--font-mono, monospace)', fontSize: 13 }}>
      Error: {error}
    </div>
  );

  if (!weeks.length) return (
    <div style={{ padding: '40px 32px', color: '#555', fontFamily: 'var(--font-mono, monospace)', fontSize: 13 }}>
      No schedule found. Upload a Schedule PDF in Setup.
    </div>
  );

  // Build POS header cells using current week's starting lane
  const posHeaders = Array.from({ length: numPositions }, (_, i) => ({
    pos: i + 1,
    lane: activeStartingLane + i,
  }));

  return (
    <div style={{ padding: '28px 32px', fontFamily: 'var(--font-mono, monospace)' }}>

      {/* Page header */}
      <h1 style={{
        fontFamily: 'var(--font-display, "Arial Black", sans-serif)',
        fontSize: 28,
        fontWeight: 900,
        color: '#fff',
        letterSpacing: 2,
        textTransform: 'uppercase',
        margin: '0 0 4px',
      }}>
        Schedule
      </h1>
      <p style={{ color: '#555', fontSize: 11, margin: '0 0 20px' }}>
        Summer 2026 &nbsp;·&nbsp; {weeks.length} weeks &nbsp;·&nbsp; Classic Bowling Center, San Francisco
      </p>

      {/* Table */}
      <div style={{
        background: '#141417',
        border: '1px solid #222',
        borderRadius: 6,
        overflowX: 'auto',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ background: '#1a1a1e', borderBottom: '1px solid #2a2a2e' }}>
              <th style={thLeft}>WK</th>
              <th style={thLeft}>Date</th>
              <th style={thCenter}>Start<br />Lane</th>
              {posHeaders.map(({ pos, lane }) => (
                <th key={pos} style={thCenter}>
                  <span style={{ color: '#555', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }}>
                    POS {pos}
                  </span>
                  <span style={{
                    display: 'block',
                    color: '#e8ff47',
                    fontSize: 9,
                    fontWeight: 700,
                    marginTop: 2,
                    letterSpacing: 0,
                  }}>
                    Lane {lane}
                  </span>
                </th>
              ))}
              {/* pencil column */}
              <th style={{ ...thCenter, width: 36 }} />
            </tr>
          </thead>
          <tbody>
            {weeks.map((week) => {
              const isComplete  = week.status === 'complete';
              const isCurrent   = week.id === currentWeek?.id;
              const isEditing   = !!editing[week.id];
              const isSaving    = !!saving[week.id];
              const edits       = editing[week.id];
              const positions   = isEditing
                ? edits.lane_positions
                : (week.lane_positions ?? Array(numPositions).fill(null));

              return (
                <tr
                  key={week.id}
                  style={{
                    borderBottom: '1px solid #1a1a1e',
                    background: isEditing ? '#16161a' : isCurrent ? '#161a0e' : 'transparent',
                    borderLeft: isCurrent ? '3px solid #e8ff47' : '3px solid transparent',
                    opacity: isComplete ? 0.65 : 1,
                  }}
                >
                  {/* WK + position round label */}
                  <td style={{ ...tdLeft, paddingLeft: isCurrent ? 9 : 12 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{
                        display: 'inline-block',
                        background: isCurrent ? '#2a2f18' : '#1e1e22',
                        color: isCurrent ? '#e8ff47' : '#666',
                        fontSize: 10,
                        padding: '2px 6px',
                        borderRadius: 3,
                        width: 'fit-content',
                        letterSpacing: 1,
                      }}>
                        {String(week.week_number).padStart(2, '0')}
                      </span>
                      {week.is_position_round && (
                        <span style={{ color: '#3dffa0', fontSize: 9, letterSpacing: 1, textTransform: 'uppercase' }}>
                          Position round
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Date */}
                  <td style={tdLeft}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
                      <span style={{
                        display: 'inline-block',
                        width: 6, height: 6,
                        borderRadius: '50%',
                        background: statusColor(week.status),
                        flexShrink: 0,
                      }} />
                      <span style={{ color: '#bbb', fontSize: 11 }}>{formatDate(week.bowl_date)}</span>
                    </span>
                  </td>

                  {/* Starting lane */}
                  <td style={tdCenter}>
                    {isEditing ? (
                      <input
                        type="number"
                        min="1"
                        max="24"
                        value={edits.starting_lane}
                        onChange={e => setEditField(week.id, 'starting_lane', e.target.value)}
                        style={laneInputStyle}
                      />
                    ) : (
                      <span style={{ color: '#555', fontSize: 11 }}>{week.starting_lane ?? 1}</span>
                    )}
                  </td>

                  {/* POS cells */}
                  {Array.from({ length: numPositions }, (_, i) => {
                    const val = positions[i];
                    return (
                      <td key={i} style={tdCenter}>
                        {isEditing ? (
                          <input
                            type="number"
                            min="1"
                            max="20"
                            value={val ?? ''}
                            placeholder="—"
                            onChange={e => setPosCell(week.id, i, e.target.value)}
                            style={posInputStyle}
                          />
                        ) : (
                          <span style={{
                            color: val == null ? '#2a2a2e' : isCurrent ? '#e8ff47' : '#777',
                            fontSize: 11,
                          }}>
                            {val != null ? val : '—'}
                          </span>
                        )}
                      </td>
                    );
                  })}

                  {/* Action button */}
                  <td style={tdCenter}>
                    {isComplete ? (
                      <span style={{ color: '#2a2a2e', fontSize: 12 }} title="Complete — locked">🔒</span>
                    ) : isEditing ? (
                      <button
                        onClick={() => saveRow(week)}
                        disabled={isSaving}
                        title="Save changes"
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: isSaving ? '#555' : '#3dffa0',
                          fontSize: 16, padding: '2px 5px', borderRadius: 3,
                          lineHeight: 1,
                        }}
                      >
                        {isSaving ? '…' : '✓'}
                      </button>
                    ) : (
                      <button
                        onClick={() => startEdit(week)}
                        title="Edit row"
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: '#333', fontSize: 13, padding: '2px 5px',
                          borderRadius: 3, lineHeight: 1,
                          transition: 'color 0.1s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = '#aaa'}
                        onMouseLeave={e => e.currentTarget.style.color = '#333'}
                      >
                        ✎
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 14 }}>
        {[
          { color: '#3dffa0', label: 'Complete' },
          { color: '#e8ff47', label: 'Tonight' },
          { color: '#2a2a2e', label: 'Upcoming' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#444' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
            {label}
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#3dffa066' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#3dffa0', opacity: 0.5 }} />
          Position round
        </div>
      </div>
    </div>
  );
}

// Shared cell styles
const thLeft = {
  color: '#555',
  fontSize: 10,
  letterSpacing: 1,
  textTransform: 'uppercase',
  padding: '8px 12px',
  textAlign: 'left',
  fontWeight: 400,
  whiteSpace: 'nowrap',
};
const thCenter = {
  ...thLeft,
  textAlign: 'center',
  padding: '8px 8px',
};
const tdLeft = {
  padding: '7px 12px',
  verticalAlign: 'middle',
  textAlign: 'left',
};
const tdCenter = {
  padding: '7px 8px',
  verticalAlign: 'middle',
  textAlign: 'center',
};
const laneInputStyle = {
  background: '#0d0d0f',
  border: '1px solid #333',
  color: '#e8ff47',
  fontFamily: 'monospace',
  fontSize: 11,
  width: 38,
  padding: '2px 4px',
  borderRadius: 3,
  textAlign: 'center',
};
const posInputStyle = {
  background: '#0d0d0f',
  border: '1px solid #2a2a2e',
  color: '#ccc',
  fontFamily: 'monospace',
  fontSize: 11,
  width: 32,
  padding: '2px 3px',
  borderRadius: 3,
  textAlign: 'center',
};
