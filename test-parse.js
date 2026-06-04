const fs = require('fs');
const pdfParse = require('pdf-parse/lib/pdf-parse.js');
const buf = fs.readFileSync('D:/Users/allis/OneDrive/Downloads/LeagueStandings.pdf');
pdfParse(buf).then(d => {
  const lines = d.text.split('\n').filter(l => l.trim());
  const rosterStart = lines.findIndex(l => l.includes('Team Rosters'));
  console.log('Roster section start at line:', rosterStart);
  lines.slice(rosterStart, rosterStart + 10).forEach(l => console.log(JSON.stringify(l)));
});
