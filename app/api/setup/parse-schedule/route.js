// PATH: app/api/setup/parse-schedule/route.js
import { NextResponse } from 'next/server';
import { parseSchedulePDF } from '@/lib/pdfParser';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('pdf');
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const pdfParse = require('pdf-parse/lib/pdf-parse.js');
    const data = await pdfParse(buffer);
    const text = data.text;
    const weeks = parseSchedulePDF(text);
    if (!weeks || weeks.length === 0) {
      return NextResponse.json({
        error: 'Could not parse schedule from PDF. Please make sure this is the Season Schedule/Bylaws PDF.'
      }, { status: 400 });
    }
    return NextResponse.json({ weeks });
  } catch (err) {
    console.error('Schedule parse error:', err);
    return NextResponse.json({ error: 'Failed to parse PDF: ' + err.message }, { status: 500 });
  }
}
