const fs = require('fs');
const pdfParse = require('pdf-parse/lib/pdf-parse.js');
const buf = fs.readFileSync('D:/Users/allis/OneDrive/Downloads/LGBT 2026 Summer Bylaws w-Sked PDF.pdf');
pdfParse(buf).then(d => fs.writeFileSync('D:/Users/allis/OneDrive/Downloads/sked_raw.txt', d.text));
