import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function POST(request) {
  try {
    const { seasonId, weekNumber } = await request.json();

    if (!seasonId || !weekNumber) {
      return NextResponse.json({ error: 'seasonId and weekNumber are required' }, { status: 400 });
    }

    const [season] = await sql`
      SELECT id, name, charity_seed, league_id FROM seasons WHERE id = ${seasonId}
    `;
    if (!season) return NextResponse.json({ error: 'Season not found' }, { status: 404 });

    const settingsRows = await sql`SELECT key, value FROM settings WHERE league_id = ${season.league_id}`;
    const cfg = Object.fromEntries(settingsRows.map(s => [s.key, parseFloat(s.value)]));
    const buyinAmount = cfg.buyin_amount || 5;
    const progressiveNightly = cfg.progressive_nightly || 3;

    const [checkinRow] = await sql`
      SELECT COUNT(*)::int AS cnt FROM checkins
      WHERE season_id = ${seasonId} AND week_number = ${weekNumber}
    `;
    const checkinCount = parseInt(checkinRow.cnt);
    const pool = checkinCount * buyinAmount;
    const payoutTotal = Math.floor((pool - progressiveNightly) / 4) * 3;
    const charityFromPool = pool - progressiveNightly - payoutTotal;

    const [donationRow] = await sql`
      SELECT amount FROM charitable_donations
      WHERE season_id = ${seasonId} AND week_number = ${weekNumber}
    `;
    const donationAmount = donationRow ? parseFloat(donationRow.amount) : 0;
    const totalCharity = charityFromPool + donationAmount;

    const [histCharityRow] = await sql`
      SELECT COALESCE(SUM(charity_amount), 0) AS total
      FROM historical_checkins
      WHERE season_name = ${season.name}
    `;
    const [priorLiveRow] = await sql`
      SELECT balance_after FROM charity_fund
      WHERE season_id = ${seasonId} AND week_number < ${weekNumber}
      ORDER BY id DESC LIMIT 1
    `;
    const priorBalance =
      parseFloat(season.charity_seed) +
      parseFloat(histCharityRow.total) +
      (priorLiveRow ? parseFloat(priorLiveRow.balance_after) : 0);

    const newBalanceAfter = priorBalance + totalCharity;

    await sql`
      DELETE FROM charity_fund
      WHERE season_id = ${seasonId} AND week_number = ${weekNumber} AND transaction_type = 'lock'
    `;

    const notes = donationAmount > 0 ? 'Night locked + donation' : 'Night locked';
    await sql`
      INSERT INTO charity_fund (season_id, week_number, transaction_type, amount, balance_after, notes)
      VALUES (${seasonId}, ${weekNumber}, 'lock', ${totalCharity}, ${newBalanceAfter}, ${notes})
    `;

    return NextResponse.json({ success: true, charityBalance: newBalanceAfter });
  } catch (err) {
    console.error('Relock charity POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
