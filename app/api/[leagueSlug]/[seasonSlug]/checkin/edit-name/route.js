import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { normalizeName } from '@/lib/pdfParser';

export async function POST(request) {
  try {
    const { bowlerId, fullName } = await request.json();

    const normalizedName = normalizeName(fullName);

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
