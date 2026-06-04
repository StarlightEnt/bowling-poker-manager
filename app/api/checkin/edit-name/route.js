// PATH: app/api/checkin/edit-name/route.js
import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { normalizeName } from '@/lib/pdfParser';

export async function POST(request) {
  try {
    const { bowlerId, fullName } = await request.json();

    // Get existing bowler to check if sub (for Z- prefix)
    const [bowler] = await sql`SELECT is_sub FROM bowlers WHERE id = ${bowlerId}`;
    
    // Derive normalized name from full name
    let normalizedName = normalizeName(fullName);
    if (bowler?.is_sub) normalizedName = 'Z-' + normalizedName;

    await sql`
      UPDATE bowlers 
      SET full_name = ${fullName}, normalized_name = ${normalizedName}
      WHERE id = ${bowlerId}
    `;

    return NextResponse.json({ success: true, normalizedName });
  } catch (err) {
    console.error('Edit name error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
