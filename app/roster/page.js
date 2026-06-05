// PATH: app/roster/page.js
'use client';

import { useState, useEffect, useRef } from 'react';

const S = {
  pageTitle: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: '48px',
    letterSpacing: '3px',
    color: 'var(--text)',
    marginBottom: '8px',
  },
  pageSub: {
    color: 'var(--muted)',
    marginBottom: '24px',
    fontSize: '12px',
  },
  summaryRow: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },
  chip: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: '3px',
    fontSize: '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    background: 'rgba(232,255,71,0.12)',
    color: 'var(--accent)',
  },
  chipGreen: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: '3px',
    fontSize: '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    background: 'rgba(61,255,160,0.12)',
    color: 'var(--green)',
  },
  chipBlue: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: '3px',
    fontSize: '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    background: 'rgba(79,163,255,0.12)',
    color: '#4fa3ff',
  },
  chipMuted: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: '3px',
    fontSize: '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    background: 'rgba(255,255,255,0.06)',
    color: 'var(--muted)',
  },
  chipOrange: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: '3px',
    fontSize: '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    background: 'rgba(255,107,53,0.12)',
    color: 'var(--accent2)',
  },

  // Import card
  importCard: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    marginBottom: '24px',
    overflow: 'hidden',
  },
  importHeader: {
    padding: '12px 16px',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    userSelect: 'none',
  },
  importHeaderTitle: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: '15px',
    letterSpacing: '1px',
    color: 'var(--accent)',
  },
  importBody: {
    padding: '20px',
  },
  uploadArea: {
    border: '2px dashed var(--border)',
    borderRadius: '6px',
    padding: '24px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'border-color 0.2s',
    marginBottom: '12px',
  },
  uploadAreaActive: {
    border: '2px dashed var(--accent)',
    borderRadius: '6px',
    padding: '24px',
    textAlign: 'center',
    cursor: 'pointer',
    marginBottom: '12px',
  },
  uploadText: { color: 'var(--muted)', fontSize: '12px', lineHeight: '1.6' },
  fileName: { color: 'var(--green)', fontSize: '11px', marginTop: '8px' },
  btn: {
    background: 'var(--accent)',
    color: 'var(--bg)',
    border: 'none',
    padding: '10px 24px',
    borderRadius: '4px',
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: '15px',
    letterSpacing: '1px',
    cursor: 'pointer',
  },
  btnDisabled: {
    background: 'var(--border)',
    color: 'var(--muted)',
    border: 'none',
    padding: '10px 24px',
    borderRadius: '4px',
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: '15px',
    letterSpacing: '1px',
    cursor: 'not-allowed',
  },
  btnOutline: {
    background: 'transparent',
    color: 'var(--accent)',
    border: '1px solid var(--accent)',
    padding: '10px 24px',
    borderRadius: '4px',
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: '15px',
    letterSpacing: '1px',
    cursor: 'pointer',
  },
  btnDanger: {
    background: 'transparent',
    color: 'var(--accent2)',
    border: '1px solid var(--accent2)',
    padding: '10px 24px',
    borderRadius: '4px',
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: '15px',
    letterSpacing: '1px',
    cursor: 'pointer',
  },

  // Diff table
  diffTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '12px',
    marginBottom: '16px',
  },
  diffTh: {
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
  diffTd: {
    padding: '9px 12px',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    verticalAlign: 'middle',
    color: 'var(--text)',
    fontSize: '12px',
  },
  diffTdMuted: {
    padding: '9px 12px',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    verticalAlign: 'middle',
    color: 'var(--muted)',
    fontSize: '11px',
    fontFamily: "'DM Mono', monospace",
  },

  // Roster table
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
  teamHeaderInput: {
    background: 'var(--surface2)',
    border: '1px solid var(--accent2)',
    borderRadius: '3px',
    color: 'var(--accent2)',
    padding: '3px 8px',
    fontSize: '15px',
    fontFamily: "'Bebas Neue', sans-serif",
    letterSpacing: '1px',
    outline: 'none',
    width: '260px',
  },
  rosterTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '12px',
  },
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
    whiteSpace: 'nowrap',
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
    width: '36px',
  },
  tdFull: {
    padding: '7px 12px',
    color: 'var(--text)',
    verticalAlign: 'middle',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    width: '22%',
  },
  tdNorm: {
    padding: '7px 12px',
    color: 'var(--accent)',
    fontFamily: "'DM Mono', monospace",
    fontSize: '11px',
    verticalAlign: 'middle',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    width: '16%',
  },
  tdAvg: {
    padding: '7px 12px',
    color: 'var(--muted)',
    fontFamily: "'DM Mono', monospace",
    fontSize: '11px',
    textAlign: 'right',
    verticalAlign: 'middle',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    width: '56px',
  },
  tdEmail: {
    padding: '7px 12px',
    color: 'var(--muted)',
    fontFamily: "'DM Mono', monospace",
    fontSize: '11px',
    verticalAlign: 'middle',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  },
  tdStatus: {
    padding: '7px 8px',
    verticalAlign: 'middle',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    width: '28px',
    textAlign: 'center',
  },
  rowEven: { background: 'rgba(255,255,255,0.018)' },
  rowOdd:  { background: 'transparent' },
  editableSpan: {
    cursor: 'pointer',
    borderBottom: '1px dashed rgba(232,255,71,0.3)',
    paddingBottom: '1px',
  },
  editableSpanMuted: {
    cursor: 'pointer',
    borderBottom: '1px dashed rgba(255,255,255,0.15)',
    paddingBottom: '1px',
    color: 'var(--muted)',
    fontStyle: 'italic',
  },
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
  editInputFull: {
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: '3px',
    color: 'var(--text)',
    padding: '3px 7px',
    fontSize: '12px',
    width: '100%',
    outline: 'none',
    boxSizing: 'border-box',
  },
  editInputEmail: {
    background: 'var(--surface2)',
    border: '1px solid #4fa3ff',
    borderRadius: '3px',
    color: '#4fa3ff',
    padding: '3px 7px',
    fontSize: '11px',
    fontFamily: "'DM Mono', monospace",
    width: '100%',
    outline: 'none',
    boxSizing: 'border-box',
  },
  loading: { color: 'var(--muted)', padding: '40px', textAlign: 'center', fontFamily: 'monospace' },
};

// Change type display config
const CHANGE_TYPE_CONFIG = {
  team_name:      { label: 'Team Name',        color: 'var(--accent2)' },
  bowler_average: { label: 'Avg Update',        color: 'var(--muted)'   },
  new_bowler:     { label: 'New Bowler',         color: 'var(--green)'   },
  delete_vacant:  { label: 'Remove Vacant',      color: 'var(--muted)'   },
  promote_sub:    { label: 'Promoted to Team',   color: 'var(--accent)'  },
  move_to_subs:   { label: 'Moved to Subs',      color: '#4fa3ff'        },
  new_sub:        { label: 'New Sub',            color: 'var(--green)'   },
};

// Inline editable cell
function EditableCell({ value, inputStyle, spanStyle, placeholder, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');
  const inputRef = useRef(null);

  useEffect(() => { setDraft(value || ''); }, [value]);
  useEffect(() => { if (editing && inputRef.current) inputRef.current.select(); }, [editing]);

  function commit() {
    setEditing(false);
    if (draft.trim() !== (value || '').trim()) onSave(draft.trim());
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        style={inputStyle}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') { setDraft(value || ''); setEditing(false); }
        }}
      />
    );
  }

  return (
    <span
      style={value ? spanStyle : { ...spanStyle, ...S.editableSpanMuted }}
      onClick={() => setEditing(true)}
      title="Click to edit"
    >
      {value || placeholder}
    </span>
  );
}

// ── Import Panel ─────────────────────────────────────────────────────────────
function ImportPanel({ onImportComplete }) {
  const [open, setOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [parseError, setParseError] = useState(null);
  const [changes, setChanges] = useState(null);
  const [accepted, setAccepted] = useState({});
  const [commitResult, setCommitResult] = useState(null);

  function reset() {
    setFile(null);
    setChanges(null);
    setAccepted({});
    setParseError(null);
    setCommitResult(null);
  }

  async function handleFile(f) {
    if (!f || f.type !== 'application/pdf') {
      setParseError('Please upload a PDF file.');
      return;
    }
    setFile(f);
    setChanges(null);
    setAccepted({});
    setParseError(null);
    setCommitResult(null);
    setParsing(true);
    try {
      const formData = new FormData();
      formData.append('pdf', f);
      const res = await fetch('/api/roster/import?preview=true', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.error) { setParseError(data.error); return; }
      setChanges(data.changes);
      // Default all to accepted
      const acc = {};
      data.changes.forEach((_, i) => { acc[i] = true; });
      setAccepted(acc);
    } catch (e) {
      setParseError(e.message);
    } finally {
      setParsing(false);
    }
  }

  async function handleCommit() {
    const acceptedChanges = changes.filter((_, i) => accepted[i]);
    if (!acceptedChanges.length) return;
    setCommitting(true);
    try {
      const res = await fetch('/api/roster/import?preview=false', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accepted: acceptedChanges }),
      });
      const data = await res.json();
      if (data.error) { setParseError(data.error); return; }
      setCommitResult(data.applied);
      onImportComplete();
      reset();
      setOpen(false);
    } catch (e) {
      setParseError(e.message);
    } finally {
      setCommitting(false);
    }
  }

  const acceptedCount = Object.values(accepted).filter(Boolean).length;

  return (
    <div style={S.importCard}>
      <div style={S.importHeader} onClick={() => { setOpen(o => !o); if (open) reset(); }}>
        <span style={S.importHeaderTitle}>↑ Re-import Roster from PDF</span>
        <span style={{ color: 'var(--muted)', fontSize: '11px' }}>
          {open ? '▲ collapse' : '▼ expand'}
        </span>
      </div>

      {open && (
        <div style={S.importBody}>
          <p style={{ color: 'var(--muted)', fontSize: '12px', marginBottom: '16px', lineHeight: 1.6 }}>
            Upload the latest League Standings PDF to update team names, bowler averages, and roster changes.
            Existing game history and check-in data is never affected.
          </p>

          {/* Upload area */}
          {!changes && (
            <>
              <div
                style={dragOver ? S.uploadAreaActive : S.uploadArea}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
                onClick={() => document.getElementById('roster-reimport-input').click()}
              >
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>📄</div>
                <div style={S.uploadText}>
                  Drag & drop League Standings PDF here<br />or click to browse
                </div>
                {file && <div style={S.fileName}>✓ {file.name}</div>}
              </div>
              <input
                id="roster-reimport-input"
                type="file"
                accept=".pdf"
                style={{ display: 'none' }}
                onChange={e => handleFile(e.target.files[0])}
              />
              {parsing && <p style={{ color: 'var(--muted)', fontSize: '12px', marginTop: '8px' }}>⟳ Parsing PDF...</p>}
              {parseError && <p style={{ color: 'var(--accent2)', fontSize: '12px', marginTop: '8px' }}>✗ {parseError}</p>}
            </>
          )}

          {/* Diff preview */}
          {changes && (
            <>
              {changes.length === 0 ? (
                <div style={{ color: 'var(--green)', fontSize: '13px', padding: '16px 0' }}>
                  ✓ No changes detected — roster is already up to date.
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                    <span style={S.chip}>{changes.length} proposed changes</span>
                    <span style={S.chipGreen}>{acceptedCount} selected</span>
                    <button
                      style={{ ...S.btnOutline, padding: '4px 12px', fontSize: '11px', marginLeft: 'auto' }}
                      onClick={() => { const a = {}; changes.forEach((_, i) => { a[i] = true; }); setAccepted(a); }}
                    >Select All</button>
                    <button
                      style={{ ...S.btnOutline, padding: '4px 12px', fontSize: '11px' }}
                      onClick={() => setAccepted({})}
                    >Deselect All</button>
                  </div>

                  <table style={S.diffTable}>
                    <thead>
                      <tr>
                        <th style={{ ...S.diffTh, width: '32px' }}></th>
                        <th style={S.diffTh}>Type</th>
                        <th style={S.diffTh}>What</th>
                        <th style={S.diffTh}>Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {changes.map((change, i) => {
                        const cfg = CHANGE_TYPE_CONFIG[change.type] || { label: change.type, color: 'var(--muted)' };
                        return (
                          <tr
                            key={i}
                            style={{
                              ...(i % 2 === 0 ? S.rowEven : S.rowOdd),
                              opacity: accepted[i] ? 1 : 0.4,
                            }}
                          >
                            <td style={{ ...S.diffTd, textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={!!accepted[i]}
                                onChange={e => setAccepted(prev => ({ ...prev, [i]: e.target.checked }))}
                                style={{ cursor: 'pointer', accentColor: 'var(--accent)' }}
                              />
                            </td>
                            <td style={S.diffTd}>
                              <span style={{
                                fontSize: '10px',
                                color: cfg.color,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                fontFamily: "'DM Mono', monospace",
                              }}>
                                {cfg.label}
                              </span>
                            </td>
                            <td style={S.diffTd}>{change.label}</td>
                            <td style={S.diffTdMuted}>{change.description}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button
                      style={acceptedCount === 0 ? S.btnDisabled : S.btn}
                      disabled={acceptedCount === 0 || committing}
                      onClick={handleCommit}
                    >
                      {committing ? 'Applying...' : `Apply ${acceptedCount} Change${acceptedCount !== 1 ? 's' : ''} →`}
                    </button>
                    <button style={S.btnDanger} onClick={reset}>Cancel</button>
                    {parseError && <span style={{ color: 'var(--accent2)', fontSize: '11px' }}>✗ {parseError}</span>}
                  </div>
                </>
              )}
            </>
          )}

          {commitResult != null && (
            <p style={{ color: 'var(--green)', fontSize: '12px', marginTop: '12px' }}>
              ✓ {commitResult} change{commitResult !== 1 ? 's' : ''} applied successfully.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function RosterPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [saveError, setSaveError] = useState(null);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch('/api/roster');
      const d = await res.json();
      if (d.error) setError(d.error);
      else setData(d);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  async function saveBowler(bowlerId, fields) {
    setSavingId({ id: bowlerId, field: Object.keys(fields)[0] });
    setSaveError(null);
    try {
      const res = await fetch('/api/roster', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'bowler', id: bowlerId, ...fields }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Save failed');
      setData(prev => {
        const updatedTeams = prev.teams.map(team => ({
          ...team,
          bowlers: team.bowlers.map(b => {
            if (b.id !== bowlerId) return b;
            const updated = { ...b, ...fields };
            if (fields.full_name && result.normalizedName) updated.normalized_name = result.normalizedName;
            return updated;
          }),
        }));
        const updatedSubs = prev.subs.map(b => {
          if (b.id !== bowlerId) return b;
          const updated = { ...b, ...fields };
          if (fields.full_name && result.normalizedName) updated.normalized_name = result.normalizedName;
          return updated;
        });
        return { ...prev, teams: updatedTeams, subs: updatedSubs };
      });
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSavingId(null);
    }
  }

  async function saveTeam(teamId, fields) {
    setSavingId({ id: teamId, field: 'team' });
    setSaveError(null);
    try {
      const res = await fetch('/api/roster', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'team', id: teamId, ...fields }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Save failed');
      setData(prev => ({
        ...prev,
        teams: prev.teams.map(t => t.id === teamId ? { ...t, ...fields } : t),
      }));
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSavingId(null);
    }
  }

  function BowlerRow({ bowler, index }) {
    const isVacant = bowler.normalized_name === 'VACANT';
    const isSaving = savingId?.id === bowler.id;

    function handleFullNameSave(val) {
      if (!val) return;
      saveBowler(bowler.id, { full_name: val, email: bowler.email || null });
    }

    function handleEmailSave(val) {
      saveBowler(bowler.id, { full_name: bowler.full_name, email: val || null });
    }

    return (
      <tr style={{ ...(index % 2 === 0 ? S.rowEven : S.rowOdd), opacity: isVacant ? 0.5 : 1 }}>
        <td style={S.tdNum}>{index + 1}</td>
        <td style={S.tdFull}>
          <EditableCell
            value={bowler.full_name}
            inputStyle={S.editInputFull}
            spanStyle={{ cursor: 'pointer', borderBottom: '1px dashed rgba(255,255,255,0.2)', paddingBottom: '1px' }}
            placeholder="—"
            onSave={handleFullNameSave}
          />
        </td>
        <td style={S.tdNorm}>
          <span style={{ color: isVacant ? 'var(--muted)' : 'var(--accent)', fontFamily: "'DM Mono', monospace", fontSize: '11px' }}>
            {bowler.normalized_name}
          </span>
        </td>
        <td style={S.tdAvg}>{bowler.book_average || '—'}</td>
        <td style={S.tdEmail}>
          <EditableCell
            value={bowler.email || ''}
            inputStyle={S.editInputEmail}
            spanStyle={{ ...S.editableSpan, color: '#4fa3ff', fontSize: '11px', fontFamily: "'DM Mono', monospace" }}
            placeholder="add email…"
            onSave={handleEmailSave}
          />
        </td>
        <td style={S.tdStatus}>
          {isSaving && <span style={{ color: '#3dffa0', fontSize: '11px' }}>…</span>}
        </td>
      </tr>
    );
  }

  function TeamCard({ team }) {
    const [editingTeamName, setEditingTeamName] = useState(false);
    const [teamNameDraft, setTeamNameDraft] = useState(team.name);
    const nameInputRef = useRef(null);
    const isSavingTeam = savingId?.id === team.id && savingId?.field === 'team';

    useEffect(() => { setTeamNameDraft(team.name); }, [team.name]);
    useEffect(() => { if (editingTeamName && nameInputRef.current) nameInputRef.current.select(); }, [editingTeamName]);

    function commitTeamName() {
      setEditingTeamName(false);
      if (teamNameDraft.trim() && teamNameDraft.trim() !== team.name) {
        saveTeam(team.id, { name: teamNameDraft.trim() });
      }
    }

    return (
      <div style={S.teamCard}>
        <div style={S.teamHeader}>
          <span style={{ color: 'var(--muted)', fontSize: '13px', fontFamily: "'DM Mono', monospace", flexShrink: 0 }}>
            Team {team.team_number} —
          </span>
          {editingTeamName ? (
            <input
              ref={nameInputRef}
              style={S.teamHeaderInput}
              value={teamNameDraft}
              onChange={e => setTeamNameDraft(e.target.value)}
              onBlur={commitTeamName}
              onKeyDown={e => {
                if (e.key === 'Enter') commitTeamName();
                if (e.key === 'Escape') { setTeamNameDraft(team.name); setEditingTeamName(false); }
              }}
            />
          ) : (
            <span
              style={{ ...S.editableSpan, color: 'var(--accent2)', fontFamily: "'Bebas Neue', sans-serif" }}
              onClick={() => setEditingTeamName(true)}
              title="Click to edit team name"
            >
              {team.name}
            </span>
          )}
          {isSavingTeam && <span style={{ color: '#3dffa0', fontSize: '11px', marginLeft: 4 }}>…</span>}
          <span style={{ ...S.chipMuted, marginLeft: 'auto' }}>{team.bowlers.length} bowlers</span>
        </div>
        <table style={S.rosterTable}>
          <colgroup>
            <col style={{ width: '36px' }} />
            <col style={{ width: '22%' }} />
            <col style={{ width: '16%' }} />
            <col style={{ width: '56px' }} />
            <col />
            <col style={{ width: '28px' }} />
          </colgroup>
          <thead>
            <tr>
              <th style={S.th}>#</th>
              <th style={S.th}>Full Name</th>
              <th style={S.th}>Display Name</th>
              <th style={S.thRight}>Avg</th>
              <th style={S.th}>Email</th>
              <th style={S.th}></th>
            </tr>
          </thead>
          <tbody>
            {team.bowlers.map((b, i) => <BowlerRow key={b.id} bowler={b} index={i} />)}
          </tbody>
        </table>
      </div>
    );
  }

  if (loading) return <div style={S.loading}>Loading roster...</div>;
  if (error)   return <div style={{ ...S.loading, color: '#ff6b35' }}>Error: {error}</div>;
  if (!data)   return null;

  const totalBowlers = data.teams.reduce((s, t) => s + t.bowlers.length, 0);

  return (
    <div>
      <div style={S.pageTitle}>Roster</div>
      <div style={S.pageSub}>{data.seasonName} · Click any field to edit. Changes save instantly.</div>

      {/* Summary chips */}
      <div style={S.summaryRow}>
        <span style={S.chip}>{data.teams.length} Teams</span>
        <span style={S.chip}>{totalBowlers} Bowlers</span>
        <span style={S.chipGreen}>{data.subs.length} Subs</span>
        <span style={S.chipBlue}>Click any name or email to edit</span>
        {saveError && <span style={{ color: '#ff6b35', fontSize: '11px', marginLeft: 8 }}>⚠ {saveError}</span>}
      </div>

      {/* Re-import panel */}
      <ImportPanel onImportComplete={loadData} />

      {/* Team cards */}
      {data.teams.map(team => <TeamCard key={team.id} team={team} />)}

      {/* Substitutes */}
      {data.subs.length > 0 && (
        <div style={S.teamCard}>
          <div style={{ ...S.teamHeader, color: 'var(--muted)' }}>
            <span>Temporary Substitutes</span>
            <span style={{ ...S.chipMuted, marginLeft: 'auto' }}>{data.subs.length} subs</span>
          </div>
          <table style={S.rosterTable}>
            <colgroup>
              <col style={{ width: '36px' }} />
              <col style={{ width: '22%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '56px' }} />
              <col />
              <col style={{ width: '28px' }} />
            </colgroup>
            <thead>
              <tr>
                <th style={S.th}>#</th>
                <th style={S.th}>Full Name</th>
                <th style={S.th}>Display Name</th>
                <th style={S.thRight}>Avg</th>
                <th style={S.th}>Email</th>
                <th style={S.th}></th>
              </tr>
            </thead>
            <tbody>
              {data.subs.map((b, i) => <BowlerRow key={b.id} bowler={b} index={i} />)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
