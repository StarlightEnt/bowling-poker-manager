// PATH: app/api/gamenight/donation/route.js
import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const seasonId  = parseInt(searchParams.get('seasonId'));
    const weekNumber = parseInt(searchParams.get('weekNumber'));

    if (!seasonId || !weekNumber) {
      return NextResponse.json({ error: 'seasonId and weekNumber are required' }, { status: 400 });
    }

    const [row] = await sql`
      SELECT id, amount, notes
      FROM charitable_donations
      WHERE season_id = ${seasonId} AND week_number = ${weekNumber}
    `;

    return NextResponse.json({ donation: row ? { id: row.id, amount: parseFloat(row.amount), notes: row.notes || '' } : null });
  } catch (err) {
    console.error('Donation GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { seasonId, weekNumber, amount, notes } = await request.json();
    const parsedAmount = parseFloat(amount) || 0;

    const [existing] = await sql`
      SELECT id FROM charitable_donations
      WHERE season_id = ${seasonId} AND week_number = ${weekNumber}
    `;

    if (parsedAmount <= 0) {
      // Clear: delete row if it exists
      if (existing) {
        await sql`
          DELETE FROM charitable_donations
          WHERE season_id = ${seasonId} AND week_number = ${weekNumber}
        `;
      }
    } else if (existing) {
      // Update
      await sql`
        UPDATE charitable_donations
        SET amount = ${parsedAmount}, notes = ${notes || null}
        WHERE season_id = ${seasonId} AND week_number = ${weekNumber}
      `;
    } else {
      // Insert
      await sql`
        INSERT INTO charitable_donations (season_id, week_number, amount, notes)
        VALUES (${seasonId}, ${weekNumber}, ${parsedAmount}, ${notes || null})
      `;
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Donation POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
