'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

function generateSeasonSlug(name) {
  const spanMap = {
    'winter/spring': 'WS', 'spring/summer': 'SS',
    'summer/fall': 'SF', 'fall/winter': 'FW',
  };
  const lower = name.toLowerCase();
  for (const [key, abbr] of Object.entries(spanMap)) {
    const [s1, s2] = key.split('/');
    if (lower.includes(s1) && lower.includes(s2)) {
      const years = name.match(/\d{2}/g) || [];
      return abbr + years.join('');
    }
  }
  const seasonMap = { summer: 'Sum', fall: 'Fal', winter: 'Win', spring: 'Spr' };
  for (const [key, abbr] of Object.entries(seasonMap)) {
    if (lower.includes(key)) {
      const year = (name.match(/\d{2}/) || [])[0] || '';
      return abbr + year;
    }
  }
  return name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);
}

const styles = {
  pageTitle: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: '48px',
    letterSpacing: '3px',
    color: 'var(--text)',
    marginBottom: '8px',
  },
  pageSub: {
    color: 'var(--muted)',
    marginBottom: '32px',
    fontSize: '12px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    marginBottom: '24px',
  },
  card: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '24px',
  },
  cardTitle: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: '20px',
    letterSpacing: '1px',
    color: 'var(--accent)',
    marginBottom: '6px',
  },
  cardSub: {
    color: 'var(--muted)',
    fontSize: '11px',
    marginBottom: '20px',
    lineHeight: '1.6',
  },
  uploadArea: {
    border: '2px dashed var(--border)',
    borderRadius: '6px',
    padding: '32px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'border-color 0.2s',
    marginBottom: '12px',
  },
  uploadAreaActive: {
    border: '2px dashed var(--accent)',
    borderRadius: '6px',
    padding: '32px',
    textAlign: 'center',
    cursor: 'pointer',
    marginBottom: '12px',
  },
  uploadIcon: { fontSize: '32px', marginBottom: '8px' },
  uploadText: { color: 'var(--muted)', fontSize: '12px', lineHeight: '1.6' },
  fileName: { color: 'var(--green)', fontSize: '11px', marginTop: '8px' },
  btn: {
    background: 'var(--accent)',
    color: 'var(--bg)',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '4px',
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: '16px',
    letterSpacing: '1px',
    cursor: 'pointer',
    width: '100%',
    marginTop: '8px',
  },
  btnDisabled: {
    background: 'var(--border)',
    color: 'var(--muted)',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '4px',
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: '16px',
    letterSpacing: '1px',
    cursor: 'not-allowed',
    width: '100%',
    marginTop: '8px',
  },
  input: {
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    color: 'var(--text)',
    padding: '10px 12px',
    fontSize: '13px',
    width: '100%',
    marginBottom: '12px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  label: {
    color: 'var(--muted)',
    fontSize: '10px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    display: 'block',
    marginBottom: '6px',
  },
  statusBox: {
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    padding: '12px',
    marginTop: '12px',
    fontSize: '11px',
    lineHeight: '1.8',
  },
  statusSuccess: { color: 'var(--green)' },
  statusError:   { color: 'var(--red)' },
  statusMuted:   { color: 'var(--muted)' },
  sectionTitle: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: '22px',
    letterSpacing: '1px',
    color: 'var(--text)',
    marginTop: '32px',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  chip: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '3px',
    fontSize: '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    background: 'rgba(232,255,71,0.12)',
    color: 'var(--accent)',
    marginLeft: '8px',
  },
  chipGreen: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '3px',
    fontSize: '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    background: 'rgba(61,255,160,0.12)',
    color: 'var(--green)',
    marginLeft: '8px',
  },
  chipBlue: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '3px',
    fontSize: '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    background: 'rgba(79,163,255,0.12)',
    color: 'var(--blue)',
    fontFamily: 'inherit',
  },
  teamCard: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    marginBottom: '10px',
    overflow: 'hidden',
  },
  teamHeader: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: '15px',
    letterSpacing: '1px',
    color: 'var(--accent2)',
    padding: '12px 16px 10px',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  teamLane: {
    fontSize: '10px',
    fontFamily: "'DM Mono', monospace",
    color: 'var(--muted)',
    letterSpacing: '0',
    textTransform: 'none',
  },
  rosterTable: {
    width: '100%',
    borderCollapse: 'collapse',
    tableLayout: 'fixed',
    fontSize: '12px',
  },
  colNum:        { width: '44px' },
  colFull:       { width: '42%' },
  colNormalized: { width: '30%' },
  colAvg:        { width: '80px' },
  th: {
    background: 'var(--surface2)',
    color: 'var(--muted)',
    padding: '7px 12px',
    textAlign: 'left',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    fontSize: '9px',
    borderBottom: '1px solid var(--border)',
    fontWeight: 'normal',
  },
  thRight: {
    background: 'var(--surface2)',
    color: 'var(--muted)',
    padding: '7px 12px',
    textAlign: 'right',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    fontSize: '9px',
    borderBottom: '1px solid var(--border)',
    fontWeight: 'normal',
  },
  tdNum: {
    padding: '7px 12px',
    color: 'var(--muted)',
    fontSize: '11px',
    fontFamily: "'DM Mono', monospace",
    verticalAlign: 'middle',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  },
  tdFull: {
    padding: '7px 12px',
    color: 'var(--text)',
    verticalAlign: 'middle',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  tdNorm: {
    padding: '7px 12px',
    color: 'var(--accent)',
    fontFamily: "'DM Mono', monospace",
    fontSize: '11px',
    verticalAlign: 'middle',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  },
  tdAvg: {
    padding: '7px 12px',
    color: 'var(--muted)',
    fontFamily: "'DM Mono', monospace",
    fontSize: '11px',
    textAlign: 'right',
    verticalAlign: 'middle',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  },
  rowEven: { background: 'rgba(255,255,255,0.018)' },
  rowOdd:  { background: 'transparent' },
  editInput: {
    background: 'var(--surface2)',
    border: '1px solid var(--accent)',
    borderRadius: '3px',
    color: 'var(--accent)',
    padding: '3px 7px',
    fontSize: '11px',
    fontFamily: "'DM Mono', monospace",
    width: '100%',
    outline: 'none',
    boxSizing: 'border-box',
  },
  editableSpan: {
    cursor: 'pointer',
    borderBottom: '1px dashed rgba(232,255,71,0.3)',
    paddingBottom: '1px',
  },
};

export default function SetupPage({ params }) {
  const { leagueSlug, seasonSlug: urlSeasonSlug } = params;
  const router = useRouter();

  const [rosterFile, setRosterFile] = useState(null);
  const [scheduleFile, setScheduleFile] = useState(null);
  const [rosterData, setRosterData] = useState(null);
  const [scheduleData, setScheduleData] = useState(null);
  const [seasonName, setSeasonName] = useState('');
  const [seasonSlug, setSeasonSlug] = useState('');
  const [startYear, setStartYear] = useState(new Date().getFullYear());
  const [rosterStatus, setRosterStatus] = useState(null);
  const [scheduleStatus, setScheduleStatus] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);
  const [saving, setSaving] = useState(false);
  const [rosterDragOver, setRosterDragOver] = useState(false);
  const [scheduleDragOver, setScheduleDragOver] = useState(false);
  const [editingBowler, setEditingBowler] = useState(null);

  useEffect(() => {
    if (seasonName) setSeasonSlug(generateSeasonSlug(seasonName));
  }, [seasonName]);

  async function handleRosterUpload(file) {
    if (!file || file.type !== 'application/pdf') {
      setRosterStatus({ type: 'error', message: 'Please upload a PDF file.' });
      return;
    }
    setRosterFile(file);
    setRosterStatus({ type: 'loading', message: 'Parsing roster PDF...' });
    const formData = new FormData();
    formData.append('pdf', file);
    try {
      const res = await fetch(`/api/${leagueSlug}/${urlSeasonSlug}/setup/parse-roster`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.error) { setRosterStatus({ type: 'error', message: data.error }); return; }
      setRosterData(data);
      setSeasonName(data.seasonName || '');
      setRosterStatus({
        type: 'success',
        message: `Found ${data.teams.length} teams, ${data.teams.reduce((s, t) => s + t.bowlers.length, 0)} bowlers, ${data.subs.length} substitutes.`,
      });
    } catch {
      setRosterStatus({ type: 'error', message: 'Failed to parse PDF. Please try again.' });
    }
  }

  async function handleScheduleUpload(file) {
    if (!file || file.type !== 'application/pdf') {
      setScheduleStatus({ type: 'error', message: 'Please upload a PDF file.' });
      return;
    }
    setScheduleFile(file);
    setScheduleStatus({ type: 'loading', message: 'Parsing schedule PDF...' });
    const formData = new FormData();
    formData.append('pdf', file);
    try {
      const res = await fetch(`/api/${leagueSlug}/${urlSeasonSlug}/setup/parse-schedule`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.error) { setScheduleStatus({ type: 'error', message: data.error }); return; }
      setScheduleData(data);
      setScheduleStatus({ type: 'success', message: `Found ${data.weeks.length} weeks in schedule.` });
    } catch {
      setScheduleStatus({ type: 'error', message: 'Failed to parse PDF. Please try again.' });
    }
  }

  function handleNameEdit(teamIndex, bowlerIndex, newName) {
    const updated = { ...rosterData };
    updated.teams[teamIndex].bowlers[bowlerIndex].normalized_name = newName;
    setRosterData(updated);
  }

  function handleSubNameEdit(subIndex, newName) {
    const updated = { ...rosterData };
    updated.subs[subIndex].normalized_name = newName;
    setRosterData(updated);
  }

  async function handleSave() {
    if (!rosterData || !seasonName || !seasonSlug) return;
    setSaving(true);
    setSaveStatus({ type: 'loading', message: 'Saving season data...' });
    try {
      const res = await fetch(`/api/${leagueSlug}/${urlSeasonSlug}/setup/save-season`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonName,
          seasonSlug,
          startYear,
          teams: rosterData.teams,
          subs: rosterData.subs,
          weeks: scheduleData?.weeks || [],
        }),
      });
      const data = await res.json();
      if (data.error) { setSaveStatus({ type: 'error', message: data.error }); return; }
      setSaveStatus({ type: 'success', message: 'Season saved successfully! Redirecting...' });
      setTimeout(() => {
        router.push(`/${leagueSlug}/${data.seasonSlug || seasonSlug}`);
      }, 800);
    } catch {
      setSaveStatus({ type: 'error', message: 'Failed to save. Please try again.' });
    } finally {
      setSaving(false);
    }
  }

  const totalBowlers = rosterData ? rosterData.teams.reduce((s, t) => s + t.bowlers.length, 0) : 0;

  function RosterTable({ rows, keyPrefix, onEditChange }) {
    return (
      <table style={styles.rosterTable}>
        <colgroup>
          <col style={styles.colNum} />
          <col style={styles.colFull} />
          <col style={styles.colNormalized} />
          <col style={styles.colAvg} />
        </colgroup>
        <thead>
          <tr>
            <th style={styles.th}>#</th>
            <th style={styles.th}>Full Name</th>
            <th style={styles.th}>Display Name</th>
            <th style={styles.thRight}>Avg</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const key = `${keyPrefix}-${i}`;
            const isEditing = editingBowler === key;
            return (
              <tr key={i} style={i % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                <td style={styles.tdNum}>{i + 1}</td>
                <td style={styles.tdFull}>{row.full_name}</td>
                <td style={styles.tdNorm}>
                  {isEditing ? (
                    <input
                      style={styles.editInput}
                      value={row.normalized_name}
                      onChange={e => onEditChange(i, e.target.value)}
                      onBlur={() => setEditingBowler(null)}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setEditingBowler(null); }}
                      autoFocus
                    />
                  ) : (
                    <span style={styles.editableSpan} onClick={() => setEditingBowler(key)} title="Click to edit">
                      {row.normalized_name}
                    </span>
                  )}
                </td>
                <td style={styles.tdAvg}>{row.book_average || '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  }

  function StatusMsg({ status }) {
    if (!status) return null;
    const color = status.type === 'success' ? styles.statusSuccess : status.type === 'error' ? styles.statusError : styles.statusMuted;
    const icon = status.type === 'success' ? '✓ ' : status.type === 'error' ? '✗ ' : '⟳ ';
    return (
      <div style={styles.statusBox}>
        <span style={color}>{icon}{status.message}</span>
      </div>
    );
  }

  return (
    <div>
      <div style={styles.pageTitle}>Season Setup</div>
      <div style={styles.pageSub}>
        Upload your League Standings PDF to import teams and bowlers, and your Schedule PDF to import weekly lane assignments.
      </div>

      <div style={styles.grid}>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Step 1 — League Standings PDF</div>
          <div style={styles.cardSub}>
            Upload the current week's League Standings sheet from BLS software. This imports all teams, bowlers, and substitutes.
          </div>
          <div
            style={rosterDragOver ? styles.uploadAreaActive : styles.uploadArea}
            onDragOver={e => { e.preventDefault(); setRosterDragOver(true); }}
            onDragLeave={() => setRosterDragOver(false)}
            onDrop={e => { e.preventDefault(); setRosterDragOver(false); handleRosterUpload(e.dataTransfer.files[0]); }}
            onClick={() => document.getElementById('roster-input').click()}
          >
            <div style={styles.uploadIcon}>📄</div>
            <div style={styles.uploadText}>Drag & drop your League Standings PDF here<br />or click to browse</div>
            {rosterFile && <div style={styles.fileName}>✓ {rosterFile.name}</div>}
          </div>
          <input id="roster-input" type="file" accept=".pdf" style={{ display: 'none' }} onChange={e => handleRosterUpload(e.target.files[0])} />
          <StatusMsg status={rosterStatus} />
        </div>

        <div style={styles.card}>
          <div style={styles.cardTitle}>Step 2 — Schedule PDF</div>
          <div style={styles.cardSub}>
            Upload the Season Schedule PDF (from Bylaws handout) to import all weekly lane assignments for the season.
          </div>
          <div
            style={scheduleDragOver ? styles.uploadAreaActive : styles.uploadArea}
            onDragOver={e => { e.preventDefault(); setScheduleDragOver(true); }}
            onDragLeave={() => setScheduleDragOver(false)}
            onDrop={e => { e.preventDefault(); setScheduleDragOver(false); handleScheduleUpload(e.dataTransfer.files[0]); }}
            onClick={() => document.getElementById('schedule-input').click()}
          >
            <div style={styles.uploadIcon}>📅</div>
            <div style={styles.uploadText}>Drag & drop your Schedule PDF here<br />or click to browse</div>
            {scheduleFile && <div style={styles.fileName}>✓ {scheduleFile.name}</div>}
          </div>
          <input id="schedule-input" type="file" accept=".pdf" style={{ display: 'none' }} onChange={e => handleScheduleUpload(e.target.files[0])} />
          <StatusMsg status={scheduleStatus} />
        </div>
      </div>

      {true && (
        <div style={styles.card}>
          <div style={styles.cardTitle}>Step 3 — Confirm & Save</div>
          <div style={styles.cardSub}>Confirm the season name and review imported data before saving.</div>
          <label style={styles.label}>Season Name</label>
          <input style={styles.input} value={seasonName} onChange={e => setSeasonName(e.target.value)} placeholder="e.g. LGBT Wednesday Community Summer 2026" />
          <label style={styles.label}>Short Name</label>
          <input style={styles.input} value={seasonSlug}
            onChange={e => setSeasonSlug(e.target.value)}
            placeholder="e.g. Sum26" />
          <div style={{ color: '#555', fontSize: 10, marginTop: -8, marginBottom: 12 }}>
            Used in the URL — letters and numbers only, no spaces
          </div>
          <label style={styles.label}>Season Start Year</label>
          <input
            style={styles.input}
            type="number"
            min="2020"
            max="2050"
            value={startYear}
            onChange={e => setStartYear(parseInt(e.target.value))}
            placeholder="2026"
          />
          <div style={{ color: '#555', fontSize: 10, marginTop: -8, marginBottom: 12 }}>
            The calendar year the season begins — used for schedule date calculations
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '4px' }}>
            <div style={{ color: 'var(--muted)', fontSize: '11px' }}>
              Ready to save:
              <span style={styles.chip}>{rosterData ? rosterData.teams.length : 0} Teams</span>
              <span style={styles.chip}>{totalBowlers} Bowlers</span>
              <span style={styles.chip}>{rosterData ? rosterData.subs.length : 0} Subs</span>
              {scheduleData && <span style={styles.chipGreen}>{scheduleData.weeks.length} Weeks</span>}
            </div>
          </div>
          <button
            style={saving || !seasonName || !seasonSlug || !scheduleData ? styles.btnDisabled : styles.btn}
            onClick={handleSave}
            disabled={saving || !seasonName || !seasonSlug || !scheduleData}
          >
            {saving ? 'Saving...' : !rosterData ? 'Upload League Standings PDF first' : !scheduleData ? 'Upload Schedule PDF first' : !seasonName ? 'Enter a season name' : 'Save Season →'}
          </button>
          <StatusMsg status={saveStatus} />
        </div>
      )}

      {rosterData && (
        <>
          <div style={styles.sectionTitle}>
            Imported Roster Preview
            <span style={styles.chipBlue}>Click any display name to edit</span>
          </div>

          {rosterData.teams.map((team, ti) => (
            <div key={ti} style={styles.teamCard}>
              <div style={styles.teamHeader}>
                <span>Team {team.team_number} — {team.name}</span>
                {team.lane && <span style={styles.teamLane}>Lane {team.lane}</span>}
                <span style={{ ...styles.chipBlue, marginLeft: 'auto', fontFamily: "'DM Mono', monospace" }}>
                  {team.bowlers.length} bowlers
                </span>
              </div>
              <RosterTable
                rows={team.bowlers}
                keyPrefix={`t${ti}`}
                onEditChange={(bi, val) => handleNameEdit(ti, bi, val)}
              />
            </div>
          ))}

          {rosterData.subs.length > 0 && (
            <div style={styles.teamCard}>
              <div style={{ ...styles.teamHeader, color: 'var(--muted)' }}>
                <span>Temporary Substitutes</span>
                <span style={{ ...styles.chipBlue, marginLeft: 'auto', fontFamily: "'DM Mono', monospace" }}>
                  {rosterData.subs.length} subs
                </span>
              </div>
              <RosterTable
                rows={rosterData.subs}
                keyPrefix="sub"
                onEditChange={(si, val) => handleSubNameEdit(si, val)}
              />
            </div>
          )}
        </>
      )}

      {scheduleData && (() => {
        const maxPositions = scheduleData.weeks.reduce((max, w) => {
          const count = w.lane_pairs ? w.lane_pairs.flatMap(p => [p.home, p.away]).length : 0;
          return Math.max(max, count);
        }, 0);
        const posHeaders = Array.from({ length: maxPositions }, (_, i) => `Pos ${i + 1}`);

        return (
          <>
            <div style={styles.sectionTitle}>Imported Schedule Preview</div>
            <div style={styles.teamCard}>
              <table style={{ ...styles.rosterTable, tableLayout: 'auto' }}>
                <thead>
                  <tr>
                    <th style={styles.th}>Wk</th>
                    <th style={styles.th}>Date</th>
                    {posHeaders.map(h => (
                      <th key={h} style={styles.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {scheduleData.weeks.map((week, wi) => {
                    const positions = week.lane_pairs
                      ? week.lane_pairs.flatMap(p => [p.home, p.away])
                      : [];
                    return (
                      <tr key={wi} style={wi % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                        <td style={{ ...styles.tdNum, color: 'var(--accent)', fontWeight: 'bold' }}>{week.week_number}</td>
                        <td style={styles.tdFull}>{week.bowl_date_str}</td>
                        {week.is_position_round ? (
                          <td colSpan={maxPositions} style={{ ...styles.tdNorm, fontStyle: 'italic', color: 'var(--muted)' }}>
                            Position Round — TBD
                          </td>
                        ) : (
                          posHeaders.map((_, pi) => (
                            <td key={pi} style={{ ...styles.tdNum, color: positions[pi] ? 'var(--text)' : 'var(--muted)' }}>
                              {positions[pi] || '—'}
                            </td>
                          ))
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        );
      })()}
    </div>
  );
}
