import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean);
    const leagueSlug = parts[1];
    const seasonSlug = parts[2];

    const body = await request.json();
    const { charity_name, payout_date, amount } = body;

    if (!charity_name?.trim()) {
      return Response.json({ error: 'Charity name is required' }, { status: 400 });
    }
    if (!payout_date) {
      return Response.json({ error: 'Payout date is required' }, { status: 400 });
    }

    const [season] = await sql`
      SELECT s.id FROM seasons s
      JOIN leagues l ON l.id = s.league_id
      WHERE l.slug = ${leagueSlug} AND s.slug = ${seasonSlug}
      LIMIT 1
    `;
    if (!season) return Response.json({ error: 'Season not found' }, { status: 404 });

    const [charRow] = await sql`
      SELECT balance_after FROM charity_fund
      WHERE season_id = ${season.id}
      ORDER BY id DESC LIMIT 1
    `;
    const [seedRow] = await sql`SELECT charity_seed FROM seasons WHERE id = ${season.id}`;
    const currentBalance = charRow
      ? parseFloat(charRow.balance_after)
      : parseFloat(seedRow.charity_seed);

    const payoutAmount = parseFloat(amount);
    if (Math.abs(payoutAmount - currentBalance) > 0.001) {
      return Response.json(
        { error: `Amount must equal the current charity balance of $${currentBalance.toFixed(2)}` },
        { status: 400 }
      );
    }

    const notes = `Donated to ${charity_name.trim()} on ${payout_date}`;

    await sql`
      INSERT INTO charity_fund
        (season_id, week_number, transaction_type, amount, balance_after, notes)
      VALUES
        (${season.id}, null, 'payout', ${payoutAmount}, 0, ${notes})
    `;

    return Response.json({ ok: true, new_balance: 0, notes });
  } catch (err) {
    console.error('Charity payout POST error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
