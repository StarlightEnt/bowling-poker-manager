const { neon } = require('@neondatabase/serverless');
const sql = neon('postgresql://neondb_owner:npg_UzFa7I1EKvsS@ep-curly-queen-api9oapp-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');
sql(['SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\'']).then(r => console.log(r)).catch(e => console.error(e));
