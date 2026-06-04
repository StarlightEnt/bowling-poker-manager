const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/DATABASE_URL=(.+)/)[1].trim();
console.log('URL:', url);
const sql = neon(url);
sql(['SELECT current_database(), table_name FROM information_schema.tables WHERE table_schema = \'public\' LIMIT 5']).then(r => console.log(r)).catch(e => console.error(e.message));
