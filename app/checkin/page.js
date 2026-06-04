// PATH: app/checkin/page.js
'use client';

import { useState, useEffect, useRef } from 'react';

const S = {
  pageTitle: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: '48px', letterSpacing: '3px',
    color: 'var(--text)', marginBottom: '8px',
  },
  pageSub: { color: 'var(--muted)', marginBottom: '24px', fontSize: '12px' },
  topBar: {
    display: 'flex', alignItems: 'center', gap: '16px',
    marginBottom: '24px', flexWrap: 'wrap',
  },
  weekSelect: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: '4px', color: 'var(--text)', padding: '8px 12px',
    fontSize: '13px', fontFamily: "'DM Mono', monospace", outline: 'none', cursor: 'pointer',
  },
  statBox: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: '6px', padding: '12px 20px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '100px',
  },
  statNum: {
    fontFamily: "'Bebas Neue', sans-serif", fontSize: '32px',
    letterSpacing: '2px', color: 'var(--accent)', lineHeight: 1,
  },
  statLabel: {
    color: 'var(--muted)', fontSize: '10px', textTransform: 'uppercase',
    letterSpacing: '1px', marginTop: '4px',
  },
  totalBox: {
    background: 'var(--surface)', border: '1px solid var(--accent)',
    borderRadius: '6px', padding: '12px 20px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '120px',
  },
  totalNum: {
    fontFamily: "'Bebas Neue', sans-serif", fontSize: '32px',
    letterSpacing: '2px', color: 'var(--accent)', lineHeight: 1,
  },
  // Lock button
  btnLock: {
    background: 'var(--accent)', color: 'var(--bg)', border: 'none',
    padding: '10px 24px', borderRadius: '4px',
    fontFamily: "'Bebas Neue', sans-serif", fontSize: '16px',
    letterSpacing: '1px', cursor: 'pointer', marginLeft: 'auto',
  },
  btnUnlock: {
    background: 'transparent', color: 'var(--accent2)',
    border: '1px solid var(--accent2)', padding: '10px 24px',
    borderRadius: '4px', fontFamily: "'Bebas Neue', sans-serif",
    fontSize: '16px', letterSpacing: '1px', cursor: 'pointer', marginLeft: 'auto',
  },
  lockedBanner: {
    background: 'rgba(255,107,53,0.1)', border: '1px solid var(--accent2)',
    borderRadius: '6px', padding: '12px 16px', marginBottom: '16px',
    color: 'var(--accent2)', fontSize: '12px', display: 'flex',
    alignItems: 'center', gap: '8px',
  },
  bowlerCard: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: '6px', padding: '12px 16px',
    display: 'flex', alignItems: 'center', gap: '12px',
    cursor: 'pointer', userSelect: 'none',
  },
  bowlerCardChecked: {
    background: 'rgba(232,255,71,0.08)', border: '1px solid var(--accent)',
    borderRadius: '6px', padding: '12px 16px',
    display: 'flex', alignItems: 'center', gap: '12px',
    cursor: 'pointer', userSelect: 'none',
  },
  checkCircle: {
    width: '28px', height: '28px', borderRadius: '50%',
    border: '2px solid var(--border)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, fontSize: '14px', color: 'transparent',
  },
  checkCircleChecked: {
    width: '28px', height: '28px', borderRadius: '50%',
    border: '2px solid var(--accent)', background: 'var(--accent)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, fontSize: '14px', color: 'var(--bg)',
  },
  bowlerName: {
    fontFamily: "'DM Mono', monospace", fontSize: '13px',
    color: 'var(--text)', fontWeight: '500',
  },
  bowlerNameChecked: {
    fontFamily: "'DM Mono', monospace", fontSize: '13px',
    color: 'var(--accent)', fontWeight: '500',
  },
  bowlerSub: { fontSize: '10px', color: 'var(--muted)', marginTop: '2px' },
  editBtn: {
    marginLeft: 'auto', background: 'transparent', border: 'none',
    color: 'var(--muted)', cursor: 'pointer', fontSize: '12px',
    padding: '2px 6px', borderRadius: '3px', flexShrink: 0,
  },
  sectionLabel: {
    fontFamily: "'Bebas Neue', sans-serif", fontSize: '14px',
    letterSpacing: '2px', color: 'var(--muted)',
    marginBottom: '8px', marginTop: '16px',
  },
  loading: { color: 'var(--muted)', padding: '40px', textAlign: 'center' },
  error: { color: 'var(--red)', padding: '20px' },
  modalOverlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.7)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  },
  modalBox: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: '8px', padding: '24px', width: '360px', maxWidth: '90vw',
  },
  modalTitle: {
    fontFamily: "'Bebas Neue', sans-serif", fontSize: '18px',
    letterSpacing: '1px', color: 'var(--text)', marginBottom: '4px',
  },
  modalSub: { fontSize: '11px', color: 'var(--muted)', marginBottom: '16px' },
  modalInput: {
    background: 'var(--surface2)', border: '1px solid var(--accent)',
    borderRadius: '4px', color: 'var(--text)', padding: '10px 12px',
    fontSize: '14px', width: '100%', outline: 'none',
    boxSizing: 'border-box', marginBottom: '12px',
  },
  modalButtons: { display: 'flex', gap: '8px', justifyContent: 'flex-end' },
  btnSave: {
    background: 'var(--accent)', color: 'var(--bg)', border: 'none',
    padding: '8px 20px', borderRadius: '4px',
    fontFamily: "'Bebas Neue', sans-serif", fontSize: '14px',
    letterSpacing: '1px', cursor: 'pointer',
  },
  btnCancel: {
    background: 'transparent', color: 'var(--muted)',
    border: '1px solid var(--border)', padding: '8px 16px',
    borderRadius: '4px', fontFamily: "'Bebas Neue', sans-serif",
    fontSize: '14px', letterSpacing: '1px', cursor: 'pointer',
  },
};

export default function CheckinPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(new Set());
  const [lockLoading, setLockLoading] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [editValue, setEditValue] = useState('');
  const editInputRef = useRef(null);

  async function loadData(week = null) {
    setLoading(true);
    try {
      const url = week ? `/api/checkin?week=${week}` : '/api/checkin';
      const res = await fetch(url);
      const json = await res.json();
      if (json.error) { setError(json.error); return; }
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (editModal && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editModal]);

  async function toggleCheckin(bowler) {
    if (data.isLocked) return; // locked — no changes
    if (saving.has(bowler.id)) return;
    setSaving(prev => new Set([...prev, bowler.id]));
    const action = bowler.checked_in ? 'uncheckout' : 'checkin';
    try {
      await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonId: data.seasonId,
          weekNumber: data.week,
          bowlerId: bowler.id,
          action,
          buyinAmount: data.buyinAmount,
        }),
      });
      setData(prev => {
        const updated = { ...prev };
        updated.bowlers = prev.bowlers.map(b =>
          b.id === bowler.id ? { ...b, checked_in: !b.checked_in } : b
        );
        const checkedIn = updated.bowlers.filter(b => b.checked_in);
        updated.checkedInCount = checkedIn.length;
        updated.totalCollected = checkedIn.length * prev.buyinAmount;
        return updated;
      });
    } finally {
      setSaving(prev => { const n = new Set(prev); n.delete(bowler.id); return n; });
    }
  }

  async function toggleLock() {
    setLockLoading(true);
    try {
      const action = data.isLocked ? 'unlock' : 'lock';
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonId: data.seasonId,
          weekNumber: data.week,
          action,
          buyinAmount: data.buyinAmount,
        }),
      });
      const result = await res.json();
      if (result.success) await loadData(data.week);
    } finally {
      setLockLoading(false);
    }
  }

  function openEditModal(bowler) {
    setEditModal({ bowlerId: bowler.id, fullName: bowler.full_name });
    setEditValue(bowler.full_name);
  }

  async function saveEdit() {
    if (!editValue.trim() || !editModal) return;
    try {
      const res = await fetch('/api/checkin/edit-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bowlerId: editModal.bowlerId, fullName: editValue.trim() }),
      });
      const { normalizedName } = await res.json();
      setData(prev => ({
        ...prev,
        bowlers: prev.bowlers.map(b =>
          b.id === editModal.bowlerId
            ? { ...b, full_name: editValue.trim(), normalized_name: normalizedName }
            : b
        ).sort((a, b) => a.normalized_name.localeCompare(b.normalized_name)),
      }));
    } finally {
      setEditModal(null);
    }
  }

  function columnSort(arr) {
    const cols = 4;
    const rows = Math.ceil(arr.length / cols);
    const result = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const idx = col * rows + row;
        result.push(idx < arr.length ? arr[idx] : null);
      }
    }
    return result;
  }

  function RosterGrid({ bowlers }) {
    const rows = Math.ceil(bowlers.length / 4);
    const sorted = columnSort(bowlers);
    return (
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gridTemplateRows: `repeat(${rows}, auto)`,
        gap: '8px', marginBottom: '24px',
      }}>
        {sorted.map((b, i) => b
          ? <BowlerCard key={b.id} bowler={b} />
          : <div key={`empty-${i}`} />
        )}
      </div>
    );
  }

  function BowlerCard({ bowler }) {
    const checked = bowler.checked_in;
    const isVacant = bowler.normalized_name === 'VACANT';
    const locked = data?.isLocked;
    return (
      <div
        style={isVacant
          ? { ...S.bowlerCard, opacity: 0.4, cursor: 'default' }
          : locked
            ? { ...(checked ? S.bowlerCardChecked : S.bowlerCard), cursor: 'default', opacity: 0.8 }
            : checked ? S.bowlerCardChecked : S.bowlerCard}
        onClick={() => { if (!isVacant && !locked) toggleCheckin(bowler); }}
      >
        <div style={checked ? S.checkCircleChecked : S.checkCircle}>
          {checked && '✓'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={checked ? S.bowlerNameChecked : S.bowlerName}>
            {bowler.normalized_name}
          </div>
          <div style={S.bowlerSub}>
            {bowler.is_sub ? 'Sub' : bowler.team_name}
            {bowler.book_average ? ` · avg ${bowler.book_average}` : ''}
          </div>
        </div>
        {!isVacant && !locked && (
          <button
            style={S.editBtn}
            title={`Edit: ${bowler.full_name}`}
            onClick={e => { e.stopPropagation(); openEditModal(bowler); }}
          >✎</button>
        )}
      </div>
    );
  }

  if (loading) return <div style={S.loading}>Loading check-in data...</div>;
  if (error) return <div style={S.error}>Error: {error}</div>;
  if (!data) return null;

  const regularBowlers = data.bowlers.filter(b => !b.is_sub);
  const subBowlers = data.bowlers.filter(b => b.is_sub);
  const bowlDate = data.scheduleRow?.bowl_date
    ? new Date(data.scheduleRow.bowl_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
    : '';

  return (
    <div>
      <div style={S.pageTitle}>Check-In</div>
      <div style={S.pageSub}>Mark bowlers as paid for the night. Click a name to toggle. Click ✎ to edit.</div>

      {/* Top bar */}
      <div style={S.topBar}>
        <div>
          <div style={{ color: 'var(--muted)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Week</div>
          <select style={S.weekSelect} value={data.week} onChange={e => loadData(parseInt(e.target.value))}>
            {data.weeks.map(w => (
              <option key={w.week_number} value={w.week_number}>
                Week {w.week_number} — {w.bowl_date ? new Date(w.bowl_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }) : ''}
              </option>
            ))}
          </select>
        </div>
        <div style={S.statBox}>
          <div style={S.statNum}>{data.checkedInCount}</div>
          <div style={S.statLabel}>Checked In</div>
        </div>
        <div style={S.statBox}>
          <div style={S.statNum}>{data.bowlers.length}</div>
          <div style={S.statLabel}>Total Roster</div>
        </div>
        <div style={S.totalBox}>
          <div style={S.totalNum}>${data.totalCollected.toFixed(2)}</div>
          <div style={S.statLabel}>Collected</div>
        </div>
        {bowlDate && (
          <div style={{ color: 'var(--muted)', fontSize: '12px' }}>📅 {bowlDate}</div>
        )}
        <button
          style={data.isLocked ? S.btnUnlock : S.btnLock}
          onClick={toggleLock}
          disabled={lockLoading}
        >
          {lockLoading ? '...' : data.isLocked ? '🔓 Unlock Night' : '🔒 Lock Night'}
        </button>
      </div>

      {/* Locked banner */}
      {data.isLocked && (
        <div style={S.lockedBanner}>
          🔒 <strong>Night is locked.</strong> Progressive (+${data.progressiveNightly?.toFixed(2)}) and charity contributions recorded.
          Pool: ${data.pool?.toFixed(2)} · Payout: ${data.payoutTotal?.toFixed(2)} · Progressive balance: ${data.progressiveBalance?.toFixed(2)}
        </div>
      )}

      {/* League Bowlers */}
      <div style={S.sectionLabel}>League Bowlers</div>
      <RosterGrid bowlers={regularBowlers} />

      {/* Substitutes */}
      {subBowlers.length > 0 && (
        <>
          <div style={S.sectionLabel}>Substitutes</div>
          <RosterGrid bowlers={subBowlers} />
        </>
      )}

      {/* Edit Name Modal */}
      {editModal && (
        <div style={S.modalOverlay} onClick={() => setEditModal(null)}>
          <div style={S.modalBox} onClick={e => e.stopPropagation()}>
            <div style={S.modalTitle}>Edit Bowler Name</div>
            <div style={S.modalSub}>Enter the bowler's preferred full name. The display name will be derived automatically.</div>
            <input
              ref={editInputRef}
              style={S.modalInput}
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') saveEdit();
                if (e.key === 'Escape') setEditModal(null);
              }}
              placeholder="First Last"
            />
            <div style={S.modalButtons}>
              <button style={S.btnCancel} onClick={() => setEditModal(null)}>Cancel</button>
              <button style={S.btnSave} onClick={saveEdit}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
