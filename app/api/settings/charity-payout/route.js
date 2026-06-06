// PATH: app/api/settings/charity-payout/route.js
import sql from '@/lib/db';

export async function POST(request) {
  try {
    const body = await request.json();
    const { charity_name, payout_date, amount } = body;

    if (!charity_name?.trim()) {
      return Response.json({ error: 'Charity name is required' }, { status: 400 });
    }
    if (!payout_date) {
      return Response.json({ error: 'Payout date is required' }, { status: 400 });
    }

    const [season] = await sql`
      SELECT id FROM seasons WHERE is_active = true AND league_id = 1 LIMIT 1
    `;

    // Get current charity balance
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
