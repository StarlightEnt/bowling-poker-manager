const { neon } = require('@neondatabase/serverless');
const sql = neon('postgresql://neondb_owner:npg_UzFa7I1EKvsS@ep-curly-queen-api9oapp-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');
sql(['UPDATE seasons SET is_active = false WHERE is_active = true']).then(r => console.log('UPDATE ok:', r)).catch(e => console.error('UPDATE failed:', e.message));
