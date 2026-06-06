// PATH: app/gamenight/page.js
'use client';

import { useState, useEffect, useRef } from 'react';

const HAND_TYPES = [
  'Royal Flush', 'Straight Flush', 'Four of a Kind', 'Full House',
  'Flush', 'Straight', 'Three of a Kind', 'Two Pair', 'One Pair', 'High Card'
];

const S = {
  pageTitle: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: '48px',
    letterSpacing: '3px',
    color: 'var(--text)',
    marginBottom: '8px',
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

  // Payout card
  payoutCard: {
    background: 'var(--surface)',
    border: '1px solid rgba(232,255,71,0.3)',
    borderRadius: '8px',
    padding: '20px 24px',
    marginBottom: '24px',
  },
  payoutTitle: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: '20px', letterSpacing: '2px',
    color: 'var(--text)', marginBottom: '16px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  payoutTable: {
    width: '100%', borderCollapse: 'collapse', fontSize: '12px',
  },
  payoutTh: {
    color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px',
    fontSize: '10px', padding: '6px 10px', textAlign: 'right',
    borderBottom: '1px solid var(--border)',
    fontWeight: 'normal', width: '90px',
  },
  payoutThLeft: {
    color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px',
    fontSize: '10px', padding: '6px 10px', textAlign: 'left',
    borderBottom: '1px solid var(--border)',
    fontWeight: 'normal', width: '70px',
  },
  payoutThWide: {
    color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px',
    fontSize: '10px', padding: '6px 10px', textAlign: 'left',
    borderBottom: '1px solid var(--border)',
    fontWeight: 'normal',
  },
  payoutTd: {
    padding: '10px 10px', textAlign: 'right', color: 'var(--text)',
    fontFamily: "'DM Mono', monospace", fontSize: '13px',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    width: '90px',
  },
  payoutTdLeft: {
    padding: '10px 10px', textAlign: 'left', color: 'var(--accent2)',
    fontFamily: "'Bebas Neue', sans-serif", fontSize: '15px', letterSpacing: '1px',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    width: '70px',
  },
  payoutTdWinner: {
    padding: '10px 10px', color: 'var(--text)',
    fontSize: '14px', fontFamily: "'DM Mono', monospace", fontWeight: 'bold',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    paddingLeft: '20px',
  },
  payoutTdHand: {
    padding: '10px 10px', color: 'var(--accent)',
    fontSize: '13px', fontWeight: 'bold',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  },
  payoutTotalRow: {
    background: 'rgba(255,255,255,0.03)',
  },
  payoutTotalTd: {
    padding: '10px 10px', textAlign: 'right',
    fontFamily: "'Bebas Neue', sans-serif", fontSize: '15px',
    letterSpacing: '1px', color: 'var(--text)',
  },
  payoutTotalTdLeft: {
    padding: '10px 10px', textAlign: 'left',
    fontFamily: "'Bebas Neue', sans-serif", fontSize: '15px',
    letterSpacing: '1px', color: 'var(--muted)',
  },

  // Running totals
  totalsRow: {
    display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap',
  },
  totalChip: {
    background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: '6px', padding: '10px 16px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '130px',
  },
  totalChipVal: {
    fontFamily: "'Bebas Neue', sans-serif", fontSize: '24px',
    letterSpacing: '1px', color: 'var(--accent)', lineHeight: 1,
  },
  totalChipLabel: {
    fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase',
    letterSpacing: '1px', marginTop: '3px',
  },

  // Game entry cards
  gameCard: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: '8px', padding: '20px 24px', marginBottom: '12px',
  },
  gameCardSaved: {
    background: 'var(--surface)', border: '1px solid rgba(232,255,71,0.25)',
    borderRadius: '8px', padding: '20px 24px', marginBottom: '12px',
  },
  gameTitle: {
    fontFamily: "'Bebas Neue', sans-serif", fontSize: '20px',
    letterSpacing: '2px', color: 'var(--accent2)', marginBottom: '16px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  formRow: {
    display: 'flex', gap: '12px', alignItems: 'flex-start',
    flexWrap: 'wrap', marginBottom: '12px',
  },
  label: {
    color: 'var(--muted)', fontSize: '10px', textTransform: 'uppercase',
    letterSpacing: '1px', display: 'block', marginBottom: '5px',
  },
  select: {
    background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: '4px', color: 'var(--text)', padding: '9px 12px',
    fontSize: '12px', outline: 'none', cursor: 'pointer', minWidth: '180px',
  },
  input: {
    background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: '4px', color: 'var(--text)', padding: '9px 12px',
    fontSize: '12px', outline: 'none', width: '200px', boxSizing: 'border-box',
  },
  btnSave: {
    background: 'var(--accent)', color: 'var(--bg)', border: 'none',
    padding: '9px 24px', borderRadius: '4px',
    fontFamily: "'Bebas Neue', sans-serif", fontSize: '15px',
    letterSpacing: '1px', cursor: 'pointer',
  },
  btnEdit: {
    background: 'transparent', color: 'var(--accent)',
    border: '1px solid var(--accent)', padding: '6px 16px',
    borderRadius: '4px', fontFamily: "'Bebas Neue', sans-serif",
    fontSize: '13px', letterSpacing: '1px', cursor: 'pointer',
  },
  btnAddWinner: {
    background: 'transparent', color: 'var(--muted)',
    border: '1px dashed var(--border)', padding: '6px 14px',
    borderRadius: '4px', fontSize: '11px', cursor: 'pointer',
    marginTop: '4px',
  },
  btnRemove: {
    background: 'transparent', color: 'var(--muted)',
    border: 'none', fontSize: '16px', cursor: 'pointer', padding: '0 4px',
  },

  // Autocomplete
  autocompleteWrap: { position: 'relative', width: '200px' },
  autocompleteInput: {
    background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: '4px', color: 'var(--text)', padding: '9px 12px',
    fontSize: '12px', outline: 'none', width: '100%', boxSizing: 'border-box',
  },
  autocompleteInputActive: {
    background: 'var(--surface2)', border: '1px solid var(--accent)',
    borderRadius: '4px', color: 'var(--text)', padding: '9px 12px',
    fontSize: '12px', outline: 'none', width: '100%', boxSizing: 'border-box',
  },
  dropdown: {
    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
    background: 'var(--surface)', border: '1px solid var(--accent)',
    borderRadius: '4px', maxHeight: '200px', overflowY: 'auto',
    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
  },
  dropdownItem: {
    padding: '8px 12px', cursor: 'pointer', fontSize: '12px',
    fontFamily: "'DM Mono', monospace", color: 'var(--text)',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  },
  dropdownItemHighlight: {
    padding: '8px 12px', cursor: 'pointer', fontSize: '12px',
    fontFamily: "'DM Mono', monospace", color: 'var(--bg)',
    background: 'var(--accent)',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  },

  // Checked-in list
  sectionLabel: {
    fontFamily: "'Bebas Neue', sans-serif", fontSize: '14px',
    letterSpacing: '2px', color: 'var(--muted)',
    marginBottom: '8px', marginTop: '24px',
  },
  bowlerCard: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: '6px', padding: '10px 14px',
    fontSize: '12px', fontFamily: "'DM Mono', monospace",
    color: 'var(--text)',
  },
  loading: { color: 'var(--muted)', padding: '40px', textAlign: 'center' },
  error: { color: 'var(--red)', padding: '20px' },
};

function WinnerAutocomplete({ checkedIn, value, onChange, onSelect, placeholder }) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const ref = useRef(null);

  const filtered = value.length > 0
    ? checkedIn.filter(b => b.normalized_name.toLowerCase().includes(value.toLowerCase()))
    : [];

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div style={S.autocompleteWrap} ref={ref}>
      <input
        style={open && filtered.length > 0 ? S.autocompleteInputActive : S.autocompleteInput}
        value={value}
        placeholder={placeholder || 'Type name...'}
        onChange={e => { onChange(e.target.value); setOpen(true); setHighlighted(0); }}
        onFocus={() => setOpen(true)}
        onKeyDown={e => {
          if (e.key === 'ArrowDown') setHighlighted(h => Math.min(h + 1, filtered.length - 1));
          if (e.key === 'ArrowUp') setHighlighted(h => Math.max(h - 1, 0));
          if (e.key === 'Enter' && filtered[highlighted]) { onSelect(filtered[highlighted]); setOpen(false); }
          if (e.key === 'Escape') setOpen(false);
        }}
      />
      {open && filtered.length > 0 && (
        <div style={S.dropdown}>
          {filtered.map((b, i) => (
            <div
              key={b.id}
              style={i === highlighted ? S.dropdownItemHighlight : S.dropdownItem}
              onMouseDown={() => { onSelect(b); setOpen(false); }}
              onMouseEnter={() => setHighlighted(i)}
            >
              {b.normalized_name}
              <span style={{ color: i === highlighted ? 'rgba(0,0,0,0.5)' : 'var(--muted)', marginLeft: '8px', fontSize: '10px' }}>
                {b.team_name || 'Sub'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DonationCard({ seasonId, weekNumber, initialDonation, isLocked, onRelockSuccess }) {
  const [amount, setAmount]   = useState(initialDonation ? String(initialDonation.amount) : '');
  const [notes, setNotes]     = useState(initialDonation ? initialDonation.notes : '');
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState('');

  // Sync if parent reloads (week change)
  useEffect(() => {
    setAmount(initialDonation ? String(initialDonation.amount) : '');
    setNotes(initialDonation ? initialDonation.notes : '');
    setMsg('');
  }, [weekNumber, initialDonation]);

  function flashMsg(text) {
    setMsg(text);
    setTimeout(() => setMsg(''), 2000);
  }

  async function handleSave() {
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setMsg('Enter an amount greater than $0');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/gamenight/donation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seasonId, weekNumber, amount: parsedAmount, notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');

      if (isLocked) {
        const relock = await fetch('/api/gamenight/donation/relock-charity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ seasonId, weekNumber }),
        }).then(r => r.json());
        if (relock.success) onRelockSuccess(relock.charityBalance);
      }

      flashMsg('Saved ✓');
    } catch (e) {
      setMsg('Error: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    setSaving(true);
    try {
      const res = await fetch('/api/gamenight/donation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seasonId, weekNumber, amount: 0, notes: '' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Clear failed');
      setAmount('');
      setNotes('');

      if (isLocked) {
        const relock = await fetch('/api/gamenight/donation/relock-charity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ seasonId, weekNumber }),
        }).then(r => r.json());
        if (relock.success) onRelockSuccess(relock.charityBalance);
      }

      flashMsg('Cleared');
    } catch (e) {
      setMsg('Error: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  const msgIsError = msg.startsWith('Error') || msg.startsWith('Enter');
  const msgIsSuccess = msg === 'Saved ✓';

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      padding: '20px 24px',
      marginBottom: '12px',
    }}>
      <div style={{
        fontFamily: "'Bebas Neue', sans-serif",
        fontSize: '20px', letterSpacing: '2px',
        color: 'var(--accent2)', marginBottom: '14px',
      }}>
        Additional Donation
      </div>

      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Dollar amount */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ color: 'var(--muted)', fontSize: '13px' }}>$</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            style={{
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: '4px', color: 'var(--text)', padding: '9px 10px',
              fontSize: '13px', outline: 'none', width: '110px',
              fontFamily: "'DM Mono', monospace",
            }}
          />
        </div>

        {/* Notes */}
        <input
          type="text"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="e.g. Joe K donated from winnings"
          style={{
            background: 'var(--surface2)', border: '1px solid var(--border)',
            borderRadius: '4px', color: 'var(--text)', padding: '9px 12px',
            fontSize: '12px', outline: 'none', flex: '1', minWidth: '200px',
            fontFamily: "'DM Mono', monospace",
          }}
        />

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            background: saving ? 'var(--border)' : 'var(--accent)',
            color: saving ? 'var(--muted)' : 'var(--bg)',
            border: 'none', padding: '9px 20px', borderRadius: '4px',
            fontFamily: "'Bebas Neue', sans-serif", fontSize: '15px',
            letterSpacing: '1px', cursor: saving ? 'default' : 'pointer',
          }}
        >
          {saving ? '…' : 'Save'}
        </button>

        {/* Clear */}
        <button
          onClick={handleClear}
          disabled={saving}
          style={{
            background: 'transparent', color: 'var(--muted)',
            border: '1px solid var(--border)', padding: '9px 16px', borderRadius: '4px',
            fontFamily: "'Bebas Neue', sans-serif", fontSize: '15px',
            letterSpacing: '1px', cursor: saving ? 'default' : 'pointer',
          }}
        >
          Clear
        </button>
      </div>

      {/* Status message */}
      {msg && (
        <div style={{
          marginTop: '8px', fontSize: '11px',
          color: msgIsError ? 'var(--red)' : msgIsSuccess ? 'var(--green)' : 'var(--muted)',
        }}>
          {msg}
        </div>
      )}

      <div style={{ marginTop: '8px', fontSize: '10px', color: 'var(--muted)' }}>
        {isLocked
          ? 'Night is locked — charity total updated immediately.'
          : 'This amount will be included in the charity total when the night is locked.'}
      </div>
    </div>
  );
}

function GameEntry({ gameNum, checkedIn, perGame, progressiveBalance, onSave, existingResults }) {
  const [winners, setWinners] = useState([{ bowlerId: null, name: '', query: '' }]);
  const [handType, setHandType] = useState('');
  const [handDetail, setHandDetail] = useState('');
  const [isProgressiveWin, setIsProgressiveWin] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const gameResults = existingResults.filter(r => r.game_number === gameNum);
    if (gameResults.length > 0) {
      setWinners(gameResults.map(r => ({ bowlerId: r.bowler_id, name: r.normalized_name, query: r.normalized_name })));
      setHandType(gameResults[0].hand_type);
      setHandDetail(gameResults[0].hand_detail || '');
      setIsProgressiveWin(gameResults[0].is_progressive_win);
      setSaved(true);
    }
  }, [existingResults]);

  const winnerCount = winners.filter(w => w.bowlerId).length;
  const splitPayout = winnerCount > 1 ? perGame.payout / winnerCount : perGame.payout;
  const progPayout = isProgressiveWin ? progressiveBalance : 0;
  const totalPayout = splitPayout + (isProgressiveWin ? progPayout / winnerCount : 0);

  function addWinner() {
    setWinners(prev => [...prev, { bowlerId: null, name: '', query: '' }]);
  }

  function removeWinner(i) {
    setWinners(prev => prev.filter((_, idx) => idx !== i));
  }

  function setWinnerSelected(i, bowler) {
    setWinners(prev => prev.map((w, idx) =>
      idx === i ? { bowlerId: bowler.id, name: bowler.normalized_name, query: bowler.normalized_name } : w
    ));
  }

  function setWinnerQuery(i, query) {
    setWinners(prev => prev.map((w, idx) =>
      idx === i ? { ...w, query, bowlerId: null, name: '' } : w
    ));
  }

  const canSave = winners.some(w => w.bowlerId) && handType;

  if (saved) {
    const gameResults = existingResults.filter(r => r.game_number === gameNum);
    const winnerNames = gameResults.map(r => r.normalized_name).join(' / ');
    return (
      <div style={S.gameCardSaved}>
        <div style={S.gameTitle}>
          <span>Game {gameNum}</span>
          <button style={S.btnEdit} onClick={() => setSaved(false)}>Edit</button>
        </div>
        <div style={{ display: 'flex', gap: '24px', fontSize: '12px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ color: 'var(--muted)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '3px' }}>Winner{gameResults.length > 1 ? 's' : ''}</div>
            <div style={{ fontFamily: "'DM Mono', monospace", color: 'var(--accent)' }}>{winnerNames}</div>
          </div>
          <div>
            <div style={{ color: 'var(--muted)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '3px' }}>Hand</div>
            <div style={{ color: 'var(--text)' }}>{gameResults[0].hand_type}{gameResults[0].hand_detail ? ` — ${gameResults[0].hand_detail}` : ''}</div>
          </div>
          <div>
            <div style={{ color: 'var(--muted)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '3px' }}>Payout</div>
            <div style={{ fontFamily: "'DM Mono', monospace", color: 'var(--accent)' }}>
              ${gameResults.length > 1
                ? parseFloat(gameResults[0].total_payout).toFixed(2) + ' each'
                : parseFloat(gameResults[0].total_payout).toFixed(2)}
              {gameResults[0].is_progressive_win && <span style={{ color: 'var(--accent2)', marginLeft: '8px' }}>🏆 Progressive!</span>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={S.gameCard}>
      <div style={S.gameTitle}>
        <span>Game {gameNum}</span>
        <div style={{ fontSize: '12px', color: 'var(--muted)', fontFamily: "'DM Mono', monospace" }}>
          Pool: <span style={{ color: 'var(--accent)' }}>${perGame.pool.toFixed(2)}</span>
          {' · '}Charity: <span style={{ color: 'var(--green)' }}>${perGame.charity.toFixed(2)}</span>
          {' · '}Prog: <span style={{ color: 'var(--accent2)' }}>${perGame.progressive.toFixed(2)}</span>
          {' · '}Payout: <span style={{ color: 'var(--accent)' }}>${perGame.payout.toFixed(2)}</span>
        </div>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={S.label}>Winner{winners.length > 1 ? 's' : ''} {winnerCount > 1 && <span style={{ color: 'var(--accent2)' }}>(split: ${splitPayout.toFixed(2)} each)</span>}</label>
        {winners.map((w, i) => (
          <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
            <WinnerAutocomplete
              checkedIn={checkedIn}
              value={w.query}
              onChange={q => setWinnerQuery(i, q)}
              onSelect={b => setWinnerSelected(i, b)}
              placeholder={`Winner ${i + 1}...`}
            />
            {winners.length > 1 && (
              <button style={S.btnRemove} onClick={() => removeWinner(i)} title="Remove">×</button>
            )}
          </div>
        ))}
        <button style={S.btnAddWinner} onClick={addWinner}>+ Add another winner (tie)</button>
      </div>

      <div style={S.formRow}>
        <div>
          <label style={S.label}>Poker Hand</label>
          <select style={S.select} value={handType} onChange={e => {
            const val = e.target.value;
            setHandType(val);
            if (val === 'Royal Flush') setIsProgressiveWin(true);
            else setIsProgressiveWin(false);
          }}>
            <option value="">Select hand...</option>
            {HAND_TYPES.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
        <div>
          <label style={S.label}>Detail (optional)</label>
          <input
            style={S.input}
            value={handDetail}
            onChange={e => setHandDetail(e.target.value)}
            placeholder="e.g. Aces full of Kings"
          />
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        {handType === 'Royal Flush' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent2)', fontSize: '13px', fontWeight: 'bold' }}>
            <span style={{
              width: '18px', height: '18px', borderRadius: '3px',
              border: '2px solid var(--accent2)', background: 'var(--accent2)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--bg)', fontSize: '12px', flexShrink: 0,
            }}>✓</span>
            🏆 Royal Flush! Progressive pot wins: ${progressiveBalance.toFixed(2)} + regular payout
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--muted)', fontSize: '12px' }}>
            <span style={{
              width: '18px', height: '18px', borderRadius: '3px',
              border: '2px solid var(--border)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}></span>
            Progressive pot (auto-awarded on Royal Flush only)
          </div>
        )}
      </div>

      <button
        style={canSave ? S.btnSave : { ...S.btnSave, background: 'var(--border)', color: 'var(--muted)', cursor: 'not-allowed' }}
        disabled={!canSave || saving}
        onClick={async () => {
          setSaving(true);
          await onSave({
            gameNumber: gameNum,
            winners: winners.filter(w => w.bowlerId).map(w => w.bowlerId),
            handType,
            handDetail,
            isProgressiveWin,
          });
          setSaved(true);
          setSaving(false);
        }}
      >
        {saving ? 'Saving...' : 'Save Game ' + gameNum}
      </button>
    </div>
  );
}

export default function GameNightPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [progressiveBalance, setProgressiveBalance] = useState(0);
  const [charityBalance, setCharityBalance] = useState(0);

  async function loadData(week = null) {
    setLoading(true);
    try {
      const url = week ? `/api/gamenight?week=${week}` : '/api/gamenight';
      const res = await fetch(url);
      const json = await res.json();
      if (json.error) { setError(json.error); return; }
      setData(json);
      setProgressiveBalance(json.progressiveBalance);
      setCharityBalance(json.charityBalance);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  async function handleSaveGame(gameData) {
    const res = await fetch('/api/gamenight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seasonId: data.seasonId,
        weekNumber: data.week,
        perGame: data.perGame,
        ...gameData,
      }),
    });
    const result = await res.json();
    if (result.success) {
      const url = `/api/gamenight?week=${data.week}`;
      const updated = await fetch(url).then(r => r.json());
      setData(updated);
      setProgressiveBalance(updated.progressiveBalance);
      setCharityBalance(updated.charityBalance);
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

  if (loading) return <div style={S.loading}>Loading game night data...</div>;
  if (error) return <div style={S.error}>Error: {error}</div>;
  if (!data) return null;

  const bowlDate = data.scheduleRow?.bowl_date
    ? new Date(data.scheduleRow.bowl_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
    : '';

  const gameRows = [1, 2, 3].map(g => {
    const results = data.results.filter(r => r.game_number === g);
    return {
      game: g,
      pool: data.perGame.pool,
      charity: data.perGame.charity,
      progressive: data.perGame.progressive,
      payout: data.perGame.payout,
      winners: results.map(r => r.normalized_name).join(' / '),
      hand: results[0]?.hand_type || '',
      handDetail: results[0]?.hand_detail || '',
      isProgressiveWin: results[0]?.is_progressive_win || false,
      progressivePayout: results[0] ? parseFloat(results[0].progressive_payout || 0) : 0,
    };
  });

  return (
    <div>
      <div style={S.pageTitle}>Game Night</div>
      <div style={S.pageSub}>Enter winners for each game. Payouts are calculated automatically.</div>

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
        {bowlDate && <div style={{ color: 'var(--muted)', fontSize: '12px' }}>📅 {bowlDate}</div>}
        <div style={{ color: 'var(--muted)', fontSize: '12px', fontFamily: "'DM Mono', monospace" }}>
          {data.playerCount} players · Pool: <span style={{ color: 'var(--accent)' }}>${data.pool.toFixed(2)}</span>
        </div>
      </div>

      {/* Payout Summary Card */}
      <div style={S.payoutCard}>
        <div style={S.payoutTitle}>
          <span>Payout Summary — Week {data.week}</span>
          <span style={{ fontSize: '12px', fontFamily: "'DM Mono', monospace", color: 'var(--muted)' }}>
            {data.playerCount} players × ${data.cfg.buyinAmount}
          </span>
        </div>
        <table style={S.payoutTable}>
          <thead>
            <tr>
              <th style={S.payoutThLeft}></th>
              <th style={S.payoutTh}>Pool/Game</th>
              <th style={S.payoutTh}>Charity</th>
              <th style={S.payoutTh}>Progressive</th>
              <th style={S.payoutTh}>Payout</th>
              <th style={{ ...S.payoutThWide, paddingLeft: '20px' }}>Winner</th>
              <th style={S.payoutThWide}>Hand</th>
              <th style={S.payoutThWide}></th>
            </tr>
          </thead>
          <tbody>
            {gameRows.map(row => (
              <tr key={row.game}>
                <td style={S.payoutTdLeft}>Game {row.game}</td>
                <td style={S.payoutTd}>${row.pool.toFixed(2)}</td>
                <td style={{ ...S.payoutTd, color: 'var(--green)' }}>${row.charity.toFixed(2)}</td>
                <td style={{ ...S.payoutTd, color: 'var(--accent2)' }}>${row.progressive.toFixed(2)}</td>
                <td style={{ ...S.payoutTd, color: 'var(--accent)', fontWeight: 'bold' }}>
                  ${row.payout.toFixed(2)}
                </td>
                <td style={{ ...S.payoutTdWinner, paddingLeft: '20px' }}>
                  {row.winners || <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>—</span>}
                </td>
                <td style={S.payoutTdHand}>
                  {row.hand}{row.handDetail ? ` — ${row.handDetail}` : ''}
                </td>
                <td style={{ padding: '10px 10px', whiteSpace: 'nowrap' }}>
                  {row.isProgressiveWin && (
                    <span style={{ color: 'var(--accent2)', fontSize: '12px', fontWeight: 'bold' }}>
                      🏆 +${row.progressivePayout.toFixed(2)}
                    </span>
                  )}
                </td>
              </tr>
            ))}
            <tr style={S.payoutTotalRow}>
              <td style={S.payoutTotalTdLeft}>Totals</td>
              <td style={S.payoutTotalTd}>${data.pool.toFixed(2)}</td>
              <td style={{ ...S.payoutTotalTd, color: 'var(--green)' }}>${data.charityTotal.toFixed(2)}</td>
              <td style={{ ...S.payoutTotalTd, color: 'var(--accent2)' }}>${data.progressiveTotal.toFixed(2)}</td>
              <td style={S.payoutTotalTd}>${data.payoutTotal.toFixed(2)}</td>
              <td></td><td></td><td></td>
            </tr>
          </tbody>
        </table>

        {/* Running totals */}
        <div style={S.totalsRow}>
          <div style={S.totalChip}>
            <div style={{ ...S.totalChipVal, color: 'var(--accent2)' }}>${progressiveBalance.toFixed(2)}</div>
            <div style={S.totalChipLabel}>Progressive Pot</div>
          </div>
          <div style={S.totalChip}>
            <div style={{ ...S.totalChipVal, color: 'var(--green)' }}>${charityBalance.toFixed(2)}</div>
            <div style={S.totalChipLabel}>Charity Fund</div>
          </div>
        </div>
      </div>

      {/* Additional Donation Card */}
      <DonationCard
        seasonId={data.seasonId}
        weekNumber={data.week}
        initialDonation={data.donation}
        isLocked={data.isLocked}
        onRelockSuccess={newBal => setCharityBalance(newBal)}
      />

      {/* Game entry slots */}
      {[1, 2, 3].map(g => (
        <GameEntry
          key={g}
          gameNum={g}
          checkedIn={data.checkedIn}
          perGame={data.perGame}
          progressiveBalance={progressiveBalance}
          onSave={handleSaveGame}
          existingResults={data.results}
        />
      ))}

      {/* Checked-in players */}
      <div style={S.sectionLabel}>Checked-In Players Tonight ({data.playerCount})</div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gridTemplateRows: `repeat(${Math.ceil(data.checkedIn.length / 4)}, auto)`,
        gap: '6px',
        marginBottom: '24px',
      }}>
        {columnSort(data.checkedIn).map((b, i) => b ? (
          <div key={b.id} style={S.bowlerCard}>
            <span style={{ color: 'var(--accent)' }}>{b.normalized_name}</span>
            <span style={{ color: 'var(--muted)', fontSize: '10px', marginLeft: '6px' }}>
              {b.team_name || 'Sub'}
            </span>
          </div>
        ) : <div key={`e-${i}`} />)}
      </div>
    </div>
  );
}
