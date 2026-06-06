'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const ACCENT_PRESETS = ['#3dffa0', '#4fa3ff', '#e8ff47', '#ff6b35', '#c084fc', '#ff4444', '#3dffd6', '#ffb347'];

function generateLeagueSlug(name) {
  return name.split(/\s+/).filter(Boolean).map(w => w.slice(0, 3)).join('');
}

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

const label = {
  color: '#e8ff47', fontSize: 10, fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: 1,
  display: 'block', marginBottom: 6,
};

const input = {
  background: '#1a1a1e', border: '1px solid #333', borderRadius: 4,
  color: '#e8e8f0', padding: '8px 12px', fontSize: 13,
  width: '100%', outline: 'none', boxSizing: 'border-box', marginBottom: 14,
  fontFamily: "'DM Mono', monospace",
};

export default function NewLeaguePage() {
  const router = useRouter();

  const [leagueName,    setLeagueName]    = useState('');
  const [slug,          setSlug]          = useState('');
  const [venueName,     setVenueName]     = useState('');
  const [venueCity,     setVenueCity]     = useState('');
  const [venueState,    setVenueState]    = useState('');
  const [charityName,   setCharityName]   = useState('');
  const [accentColor,   setAccentColor]   = useState('#3dffa0');
  const [hexInput,      setHexInput]      = useState('#3dffa0');

  const [buyinAmount,         setBuyinAmount]         = useState(5);
  const [progressiveNightly,  setProgressiveNightly]  = useState(3);

  const [saving,    setSaving]    = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    if (leagueName) setSlug(generateLeagueSlug(leagueName));
  }, [leagueName]);

  useEffect(() => {
    setHexInput(accentColor);
  }, [accentColor]);

  const progValid = progressiveNightly % 3 === 0 && progressiveNightly > 0;
  const pool25    = 25 * buyinAmount;
  const progSet   = progressiveNightly;
  const payout25  = progValid ? Math.floor((pool25 - progSet) / 4) * 3 : 0;
  const charity25 = progValid ? pool25 - progSet - payout25 : 0;

  async function handleSave() {
    if (!leagueName.trim() || !slug.trim()) {
      setStatusMsg('League name and slug are required.');
      return;
    }
    if (!progValid) {
      setStatusMsg('Progressive nightly must divide evenly by 3.');
      return;
    }
    setSaving(true);
    setStatusMsg('');
    try {
      const res = await fetch('/api/leagues/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: leagueName.trim(),
          slug: slug.trim(),
          venue_name: venueName.trim(),
          venue_city: venueCity.trim(),
          venue_state: venueState.trim(),
          charity_name: charityName.trim(),
          accent_color: accentColor,
          buyin_amount: buyinAmount,
          progressive_nightly: progressiveNightly,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      router.push(`/${data.slug}`);
    } catch (e) {
      setStatusMsg('Error: ' + e.message);
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: '28px 32px', fontFamily: "'DM Mono', monospace" }}>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 36, letterSpacing: 3, color: '#fff', marginBottom: 4 }}>
        Set Up New League
      </div>
      <div style={{ color: '#555', fontSize: 12, marginBottom: 28 }}>
        Configure league identity, venue, and game rules.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

        {/* Card 1 — League Identity */}
        <div style={{ background: '#141417', border: '1px solid #222', borderRadius: 8, padding: 24 }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: 2, color: '#e8ff47', marginBottom: 18 }}>
            League Identity
          </div>

          <label style={label}>League Name</label>
          <input style={input} value={leagueName} onChange={e => setLeagueName(e.target.value)} placeholder="e.g. LGBT Wednesday Community League" />

          <label style={label}>Short Name / Slug</label>
          <input style={input} value={slug} onChange={e => setSlug(e.target.value)} placeholder="e.g. LGBTWedCom" />
          <div style={{ color: '#444', fontSize: 10, marginTop: -10, marginBottom: 14 }}>Used in URLs — letters and numbers only</div>

          <label style={label}>Venue Name</label>
          <input style={input} value={venueName} onChange={e => setVenueName(e.target.value)} placeholder="e.g. Classic Bowling Center" />

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
            <div>
              <label style={label}>City</label>
              <input style={input} value={venueCity} onChange={e => setVenueCity(e.target.value)} placeholder="e.g. Daly City" />
            </div>
            <div>
              <label style={label}>State</label>
              <input style={{ ...input, width: '100%' }} value={venueState} onChange={e => setVenueState(e.target.value)} placeholder="CA" maxLength={2} />
            </div>
          </div>

          <label style={label}>Charity Name</label>
          <input style={input} value={charityName} onChange={e => setCharityName(e.target.value)} placeholder="e.g. SF AIDS Foundation" />

          <label style={label}>League Accent Color</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            {ACCENT_PRESETS.map(color => (
              <div
                key={color}
                onClick={() => setAccentColor(color)}
                style={{
                  width: 28, height: 28, borderRadius: 4, background: color, cursor: 'pointer',
                  border: accentColor === color ? '2px solid #fff' : '2px solid transparent',
                }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
            <div style={{ width: 28, height: 28, borderRadius: 4, background: accentColor, border: '1px solid #444', flexShrink: 0 }} />
            <input
              style={{ ...input, marginBottom: 0, width: 110 }}
              value={hexInput}
              onChange={e => {
                setHexInput(e.target.value);
                if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) setAccentColor(e.target.value);
              }}
              placeholder="#3dffa0"
            />
          </div>

          {/* Live preview */}
          <div style={{
            background: '#0d0d0f', border: '1px solid #222',
            borderLeft: `3px solid ${accentColor}`,
            borderRadius: 6, padding: '12px 16px',
          }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: 2, color: '#fff', lineHeight: 1 }}>
              {leagueName || 'League Name'}
            </div>
            <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>
              {venueName || 'Venue'} · {venueCity || 'City'}, {venueState || 'ST'}
            </div>
          </div>
        </div>

        {/* Card 2 — Game Rules */}
        <div style={{ background: '#141417', border: '1px solid #222', borderRadius: 8, padding: 24 }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: 2, color: '#e8ff47', marginBottom: 18 }}>
            Game Rules
          </div>

          <label style={label}>Buy-In Amount</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ color: '#555' }}>$</span>
            <input
              type="number" min={1} step={1}
              style={{ ...input, width: 80, marginBottom: 0 }}
              value={buyinAmount}
              onChange={e => setBuyinAmount(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div style={{ color: '#555', fontSize: 10, marginBottom: 16 }}>
            ${buyinAmount}.00 collected per player per night
          </div>

          <label style={label}>Progressive Nightly</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ color: '#555' }}>$</span>
            <input
              type="number" min={3} step={3}
              style={{ ...input, width: 80, marginBottom: 0, borderColor: progValid ? '#333' : '#ff4444' }}
              value={progressiveNightly}
              onChange={e => setProgressiveNightly(parseFloat(e.target.value) || 0)}
            />
          </div>
          {progValid ? (
            <div style={{ color: '#555', fontSize: 10, marginBottom: 16 }}>
              ${progressiveNightly}.00 set aside · ${(progressiveNightly / 3).toFixed(2)} per game · divides evenly by 3
            </div>
          ) : (
            <div style={{ color: '#ff4444', fontSize: 10, marginBottom: 16 }}>Must divide evenly by 3</div>
          )}

          {/* Payout preview (25 players) */}
          <div style={{ background: '#0d0d0f', border: '1px solid #222', borderRadius: 6, padding: '16px', marginTop: 8 }}>
            <div style={{ color: '#555', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
              Payout Preview (25 players)
            </div>
            {[
              { label: 'Pool',              value: `$${pool25.toFixed(2)}`,    color: '#e8e8f0' },
              { label: 'Progressive set-aside', value: `$${progSet.toFixed(2)}`, color: '#ff6b35' },
              { label: 'Payout (3 games)',  value: progValid ? `$${payout25.toFixed(2)}` : '—', color: '#3dffa0' },
              { label: 'Charity',           value: progValid ? `$${charity25.toFixed(2)}` : '—', color: '#4fa3ff' },
            ].map(({ label: l, value, color }) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: '#555', fontSize: 11 }}>{l}</span>
                <span style={{ color, fontSize: 13, fontFamily: "'DM Mono', monospace" }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Save row */}
      <div style={{ background: '#141417', border: '1px solid #222', borderRadius: 8, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            background: saving ? '#333' : '#e8ff47',
            color: '#0d0d0f', border: 'none',
            borderRadius: 4, padding: '10px 28px',
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 16, letterSpacing: 1,
            cursor: saving ? 'default' : 'pointer',
            flexShrink: 0,
          }}
        >
          {saving ? 'Saving…' : 'Save League →'}
        </button>
        {statusMsg && (
          <div style={{ fontSize: 12, color: statusMsg.startsWith('Error') ? '#ff4444' : '#3dffa0' }}>
            {statusMsg}
          </div>
        )}
      </div>
    </div>
  );
}
