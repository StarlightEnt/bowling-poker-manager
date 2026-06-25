// PATH: lib/db.js
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL, { fetchOptions: { cache: 'no-store' } });
export default sql;
