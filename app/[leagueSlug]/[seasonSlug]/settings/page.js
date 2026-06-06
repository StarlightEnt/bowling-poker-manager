'use client';
// PATH: app/[leagueSlug]/[seasonSlug]/settings/page.js

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const S = {
  bg:       '#0d0d0f',
  surface:  '#141417',
  surface2: '#1a1a1e',
  border:   '#222',
  accent:   '#e8ff47',
  accent2:  '#ff6b35',
  green:    '#3dffa0',
  red:      '#ff4444',
  blue:     '#4fa3ff',
  muted:    '#555',
  text:     '#e8e8f0',
};

function Card({ children, redBorder }) {
  return (
    <div style={{
      background: S.surface,
      border: `1px solid ${redBorder ? S.red : S.border}`,
      borderRadius: 8,
      padding: '24px',
      marginBottom: 20,
    }}>
      {children}
    </div>
  );
}

function CardTitle({ children, color }) {
  return (
    <h2 style={{
      fontFamily: "'Bebas Neue', sans-serif",
      fontSize: 20,
      letterSpacing: 2,
      color: color || S.text,
      margin: '0 0 4px',
    }}>
      {children}
    </h2>
  );
}

function CardSubtitle({ children }) {
  return (
    <p style={{ color: S.muted, fontSize: 11, margin: '0 0 20px' }}>{children}</p>
  );
}

function FieldRow({ label, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
      <label style={{ color: S.muted, fontSize: 11, width: 200, flexShrink: 0 }}>{label}</label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, maxLength, style }) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      maxLength={maxLength}
      style={{
        background: S.surface2,
        border: `1px solid ${S.border}`,
        borderRadius: 4,
        color: S.text,
        fontFamily: 'DM Mono, monospace',
        fontSize: 12,
        padding: '6px 10px',
        width: 240,
        ...style,
      }}
    />
  );
}

function DollarInput({ value, onChange, min, style }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ color: S.muted, fontSize: 12 }}>$</span>
      <input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        min={min ?? 0}
        step="1"
        style={{
          background: S.surface2,
          border: `1px solid ${S.border}`,
          borderRadius: 4,
          color: S.text,
          fontFamily: 'DM Mono, monospace',
          fontSize: 12,
          padding: '6px 10px',
          width: 100,
          ...style,
        }}
      />
    </div>
  );
}

function SaveButton({ onClick, saving, label }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      style={{
        background: saving ? S.surface2 : S.accent,
        color: saving ? S.muted : '#000',
        border: 'none',
        borderRadius: 4,
        padding: '8px 20px',
        fontFamily: 'DM Mono, monospace',
        fontSize: 12,
        fontWeight: 600,
        cursor: saving ? 'default' : 'pointer',
        marginTop: 8,
      }}
    >
      {saving ? 'Saving…' : (label || 'Save')}
    </button>
  );
}

function StatusMsg({ msg }) {
  if (!msg) return null;
  const isError = msg.startsWith('Error') || msg.startsWith('error') || msg.startsWith('✗');
  return (
    <p style={{
      fontSize: 11,
      color: isError ? S.red : S.green,
      marginTop: 8,
    }}>
      {msg}
    </p>
  );
}

export default function SettingsPage({ params }) {
  const { leagueSlug, seasonSlug } = params;
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  const [leagueName,     setLeagueName]     = useState('');
  const [venueName,      setVenueName]      = useState('');
  const [venueCity,      setVenueCity]      = useState('');
  const [venueState,     setVenueState]     = useState('');
  const [charityName,    setCharityName]    = useState('');
  const [leagueSaving,   setLeagueSaving]   = useState(false);
  const [leagueMsg,      setLeagueMsg]      = useState('');

  const [buyinAmount,       setBuyinAmount]       = useState('');
  const [progressiveNightly, setProgressiveNightly] = useState('');
  const [rulesSaving,       setRulesSaving]       = useState(false);
  const [rulesMsg,          setRulesMsg]          = useState('');

  const [seasonName,       setSeasonName]       = useState('');
  const [charitySeed,      setCharitySeed]      = useState('');
  const [progressiveSeed,  setProgressiveSeed]  = useState('');
  const [charityBalance,   setCharityBalance]   = useState(null);
  const [progressiveBalance, setProgressiveBalance] = useState(null);
  const [seedsSaving,      setSeedsSaving]      = useState(false);
  const [seedsMsg,         setSeedsMsg]         = useState('');

  const [isDark, setIsDark] = useState(true);

  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutCharity,   setPayoutCharity]   = useState('');
  const [payoutDate,      setPayoutDate]       = useState('');
  const [payoutSaving,    setPayoutSaving]     = useState(false);
  const [payoutMsg,       setPayoutMsg]        = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/${leagueSlug}/${seasonSlug}/settings`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load settings');

      setLeagueName(data.league.name || '');
      setVenueName(data.league.venue_name || '');
      setVenueCity(data.league.venue_city || '');
      setVenueState(data.league.venue_state || '');
      setCharityName(data.league.charity_name || '');

      setBuyinAmount(String(data.settings.buyin_amount));
      setProgressiveNightly(String(data.settings.progressive_nightly));

      setSeasonName(data.season.name);
      setCharitySeed(String(data.season.charity_seed));
      setProgressiveSeed(String(data.season.progressive_seed));
      setCharityBalance(data.balances.charity);
      setProgressiveBalance(data.balances.progressive);
    } catch (e) {
      setFetchError(e.message);
    } finally {
      setLoading(false);
    }
  }, [leagueSlug, seasonSlug]);

  useEffect(() => {
    load();
    try {
      const saved = localStorage.getItem('theme');
      setIsDark(saved !== 'light');
    } catch {}
  }, [load]);

  useEffect(() => {
    if (showPayoutModal) {
      setPayoutDate(new Date().toISOString().split('T')[0]);
      setPayoutMsg('');
    }
  }, [showPayoutModal]);

  async function saveLeague() {
    setLeagueSaving(true);
    setLeagueMsg('');
    try {
      const res = await fetch(`/api/${leagueSlug}/${seasonSlug}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ league: { name: leagueName, venue_name: venueName, venue_city: venueCity, venue_state: venueState, charity_name: charityName } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setLeagueMsg('✓ Saved');
    } catch (e) {
      setLeagueMsg('✗ ' + e.message);
    } finally {
      setLeagueSaving(false);
    }
  }

  function validateProgressive(val) {
    const n = parseFloat(val);
    if (isNaN(n) || n < 3) return 'Must be at least $3';
    if (n % 3 !== 0) return 'Must be divisible by 3';
    return null;
  }

  async function saveRules() {
    const err = validateProgressive(progressiveNightly);
    if (err) { setRulesMsg('✗ ' + err); return; }
    setRulesSaving(true);
    setRulesMsg('');
    try {
      const res = await fetch(`/api/${leagueSlug}/${seasonSlug}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { buyin_amount: parseFloat(buyinAmount), progressive_nightly: parseFloat(progressiveNightly) } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setRulesMsg('✓ Saved');
    } catch (e) {
      setRulesMsg('✗ ' + e.message);
    } finally {
      setRulesSaving(false);
    }
  }

  async function saveSeeds() {
    setSeedsSaving(true);
    setSeedsMsg('');
    try {
      const res = await fetch(`/api/${leagueSlug}/${seasonSlug}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seeds: { charity_seed: parseFloat(charitySeed), progressive_seed: parseFloat(progressiveSeed) } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setSeedsMsg('✓ Saved');
    } catch (e) {
      setSeedsMsg('✗ ' + e.message);
    } finally {
      setSeedsSaving(false);
    }
  }

  function toggleTheme() {
    const next = isDark ? 'light' : 'dark';
    setIsDark(!isDark);
    try {
      localStorage.setItem('theme', next);
      if (next === 'light') document.documentElement.classList.add('light-mode');
      else document.documentElement.classList.remove('light-mode');
    } catch {}
  }

  async function confirmPayout() {
    if (!payoutCharity.trim()) { setPayoutMsg('✗ Charity name is required'); return; }
    setPayoutSaving(true);
    setPayoutMsg('');
    try {
      const res = await fetch(`/api/${leagueSlug}/${seasonSlug}/settings/charity-payout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ charity_name: payoutCharity, payout_date: payoutDate, amount: charityBalance }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payout failed');
      setCharityBalance(0);
      setShowPayoutModal(false);
      setPayoutCharity('');
    } catch (e) {
      setPayoutMsg('✗ ' + e.message);
    } finally {
      setPayoutSaving(false);
    }
  }

  const perGame = parseFloat(progressiveNightly || 0) / 3;
  const progressiveErr = progressiveNightly ? validateProgressive(progressiveNightly) : null;

  if (loading) return (
    <div style={{ padding: '40px 32px', color: S.muted, fontFamily: 'DM Mono, monospace', fontSize: 13 }}>
      Loading settings…
    </div>
  );

  if (fetchError) return (
    <div style={{ padding: '40px 32px', color: S.accent2, fontFamily: 'DM Mono, monospace', fontSize: 13 }}>
      Error: {fetchError}
    </div>
  );

  return (
    <div style={{ padding: '28px 32px', fontFamily: 'DM Mono, monospace', maxWidth: 720 }}>
      <h1 style={{
        fontFamily: "'Bebas Neue', sans-serif",
        fontSize: 32,
        letterSpacing: 3,
        color: S.text,
        textTransform: 'uppercase',
        margin: '0 0 4px',
      }}>
        Settings
      </h1>
      <p style={{ color: S.muted, fontSize: 11, margin: '0 0 28px' }}>
        {leagueName}
      </p>

      <Card>
        <CardTitle>League Identity</CardTitle>
        <CardSubtitle> </CardSubtitle>
        <FieldRow label="League Name">
          <TextInput value={leagueName} onChange={setLeagueName} />
        </FieldRow>
        <FieldRow label="Venue Name">
          <TextInput value={venueName} onChange={setVenueName} />
        </FieldRow>
        <FieldRow label="Charity Name">
          <TextInput value={charityName} onChange={setCharityName} style={{ width: 200 }} />
        </FieldRow>
        <FieldRow label="City">
          <TextInput value={venueCity} onChange={setVenueCity} />
        </FieldRow>
        <FieldRow label="State">
          <TextInput value={venueState} onChange={setVenueState} maxLength={2} style={{ width: 60 }} />
        </FieldRow>
        <SaveButton onClick={saveLeague} saving={leagueSaving} label="Save League Info" />
        <StatusMsg msg={leagueMsg} />
      </Card>

      <Card>
        <CardTitle>Game Rules</CardTitle>
        <CardSubtitle>These values affect all financial calculations. Changes take effect next week.</CardSubtitle>
        <FieldRow label="Buy-in per player">
          <DollarInput value={buyinAmount} onChange={setBuyinAmount} min={1} />
        </FieldRow>
        <FieldRow label="Progressive (nightly)">
          <div>
            <DollarInput
              value={progressiveNightly}
              onChange={setProgressiveNightly}
              min={3}
              style={{ borderColor: progressiveErr ? S.red : S.border }}
            />
            {progressiveErr ? (
              <p style={{ color: S.red, fontSize: 10, marginTop: 4 }}>{progressiveErr}</p>
            ) : (
              <p style={{ color: S.muted, fontSize: 10, marginTop: 4 }}>
                Per game: ${perGame % 1 === 0 ? perGame.toFixed(2) : perGame.toFixed(2)}
              </p>
            )}
          </div>
        </FieldRow>
        <SaveButton onClick={saveRules} saving={rulesSaving} label="Save Game Rules" />
        <StatusMsg msg={rulesMsg} />
      </Card>

      <Card>
        <CardTitle>Season Seeds</CardTitle>
        <CardSubtitle>Opening balances rolled over from prior seasons. Changing these affects all cumulative season totals.</CardSubtitle>

        <div style={{
          background: S.surface2,
          border: `1px solid ${S.border}`,
          borderRadius: 4,
          padding: '6px 12px',
          display: 'inline-block',
          marginBottom: 18,
          fontSize: 11,
          color: S.muted,
        }}>
          Active Season: <span style={{ color: S.accent }}>{seasonName}</span>
        </div>

        <FieldRow label="Charity Opening Balance">
          <DollarInput value={charitySeed} onChange={setCharitySeed} min={0} />
        </FieldRow>
        <FieldRow label="Progressive Opening Balance">
          <DollarInput value={progressiveSeed} onChange={setProgressiveSeed} min={0} />
        </FieldRow>

        <div style={{
          background: S.surface2,
          border: `1px solid ${S.border}`,
          borderRadius: 4,
          padding: '12px 16px',
          margin: '12px 0',
        }}>
          <p style={{ color: S.muted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            Current Running Totals
          </p>
          <div style={{ display: 'flex', gap: 32 }}>
            <div>
              <span style={{ color: S.muted, fontSize: 11 }}>Charity Fund </span>
              <span style={{ color: S.green, fontSize: 13, fontWeight: 600 }}>
                ${charityBalance != null ? charityBalance.toFixed(2) : '—'}
              </span>
            </div>
            <div>
              <span style={{ color: S.muted, fontSize: 11 }}>Progressive Pot </span>
              <span style={{ color: S.accent, fontSize: 13, fontWeight: 600 }}>
                ${progressiveBalance != null ? progressiveBalance.toFixed(2) : '—'}
              </span>
            </div>
          </div>
        </div>

        <p style={{ color: S.accent2, fontSize: 11, marginBottom: 8 }}>
          ⚠ Changing these values affects all season totals in History
        </p>
        <SaveButton onClick={saveSeeds} saving={seedsSaving} label="Save Season Seeds" />
        <StatusMsg msg={seedsMsg} />
      </Card>

      <Card>
        <CardTitle>Appearance</CardTitle>
        <CardSubtitle> </CardSubtitle>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ color: S.muted, fontSize: 11, width: 200 }}>Theme</span>
          <button
            onClick={toggleTheme}
            style={{
              background: S.surface2,
              border: `1px solid ${S.border}`,
              borderRadius: 20,
              padding: '6px 16px',
              color: isDark ? S.accent : S.accent2,
              fontFamily: 'DM Mono, monospace',
              fontSize: 12,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span>{isDark ? '🌙' : '☀️'}</span>
            <span>{isDark ? 'Dark Mode' : 'Light Mode'}</span>
          </button>
          <span style={{ color: S.muted, fontSize: 10 }}>Saved to this device only</span>
        </div>
      </Card>

      <Card redBorder>
        <CardTitle color={S.red}>Danger Zone</CardTitle>

        <div style={{ marginBottom: 28 }}>
          <p style={{ color: S.text, fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
            Charity Payout
          </p>
          <p style={{ color: S.muted, fontSize: 11, marginBottom: 12, lineHeight: 1.6, maxWidth: 520 }}>
            Record a full charity payout when the collected funds are donated to a charity.
            This creates an audit entry in the charity ledger and zeros the running balance.
            The full donation history is always preserved.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button
              onClick={() => setShowPayoutModal(true)}
              style={{
                background: 'none',
                border: `1px solid ${S.red}`,
                borderRadius: 4,
                color: S.red,
                fontFamily: 'DM Mono, monospace',
                fontSize: 12,
                padding: '7px 16px',
                cursor: 'pointer',
              }}
            >
              Record Charity Payout
            </button>
            <span style={{ color: S.muted, fontSize: 11 }}>
              Current balance: <span style={{ color: S.green }}>
                ${charityBalance != null ? charityBalance.toFixed(2) : '—'}
              </span>
            </span>
          </div>
        </div>

        <div>
          <p style={{ color: S.text, fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
            Season Setup
          </p>
          <p style={{ color: S.muted, fontSize: 11, marginBottom: 12, lineHeight: 1.6, maxWidth: 520 }}>
            Season Setup imports a new season from PDF. This is a destructive operation —
            it will overwrite the current season&apos;s roster and schedule.
          </p>
          <button
            onClick={() => router.push(`/${leagueSlug}/${seasonSlug}/setup`)}
            style={{
              background: 'none',
              border: `1px solid ${S.border}`,
              borderRadius: 4,
              color: S.muted,
              fontFamily: 'DM Mono, monospace',
              fontSize: 12,
              padding: '7px 16px',
              cursor: 'pointer',
            }}
          >
            Go to Season Setup →
          </button>
        </div>
      </Card>

      {showPayoutModal && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: S.surface,
            border: `1px solid ${S.border}`,
            borderRadius: 8,
            padding: 32,
            width: 400,
            maxWidth: '90vw',
          }}>
            <h3 style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 20,
              letterSpacing: 2,
              color: S.red,
              margin: '0 0 20px',
            }}>
              Record Charity Payout
            </h3>

            <div style={{ marginBottom: 14 }}>
              <label style={{ color: S.muted, fontSize: 11, display: 'block', marginBottom: 5 }}>
                Charity Name *
              </label>
              <input
                type="text"
                value={payoutCharity}
                onChange={e => setPayoutCharity(e.target.value)}
                placeholder="e.g. SF AIDS Foundation"
                style={{
                  background: S.surface2,
                  border: `1px solid ${S.border}`,
                  borderRadius: 4,
                  color: S.text,
                  fontFamily: 'DM Mono, monospace',
                  fontSize: 12,
                  padding: '7px 10px',
                  width: '100%',
                }}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ color: S.muted, fontSize: 11, display: 'block', marginBottom: 5 }}>
                Payout Date
              </label>
              <input
                type="date"
                value={payoutDate}
                onChange={e => setPayoutDate(e.target.value)}
                style={{
                  background: S.surface2,
                  border: `1px solid ${S.border}`,
                  borderRadius: 4,
                  color: S.text,
                  fontFamily: 'DM Mono, monospace',
                  fontSize: 12,
                  padding: '7px 10px',
                  width: '100%',
                  colorScheme: 'dark',
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ color: S.muted, fontSize: 11, display: 'block', marginBottom: 5 }}>
                Amount (full balance — read only)
              </label>
              <div style={{
                background: S.surface2,
                border: `1px solid ${S.border}`,
                borderRadius: 4,
                color: S.green,
                fontFamily: 'DM Mono, monospace',
                fontSize: 13,
                fontWeight: 600,
                padding: '7px 10px',
              }}>
                ${charityBalance != null ? charityBalance.toFixed(2) : '0.00'}
              </div>
            </div>

            <StatusMsg msg={payoutMsg} />

            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button
                onClick={confirmPayout}
                disabled={payoutSaving}
                style={{
                  background: payoutSaving ? S.surface2 : S.red,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  padding: '8px 20px',
                  fontFamily: 'DM Mono, monospace',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: payoutSaving ? 'default' : 'pointer',
                  flex: 1,
                }}
              >
                {payoutSaving ? 'Recording…' : 'Confirm Payout'}
              </button>
              <button
                onClick={() => setShowPayoutModal(false)}
                style={{
                  background: 'none',
                  border: `1px solid ${S.border}`,
                  borderRadius: 4,
                  color: S.muted,
                  fontFamily: 'DM Mono, monospace',
                  fontSize: 12,
                  padding: '8px 20px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
