const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres.smxwhvdmucvctxzudtxg:OV5Tww59tXFsGywe@aws-1-eu-west-3.pooler.supabase.com:6543/postgres?pgbouncer=true' });
pool.query('SELECT "brandNameEn", "photoUrl" FROM public.medicines WHERE "brandNameEn" ILIKE \'%atacand%\'').then(res => { console.log(res.rows); pool.end(); }).catch(e => { console.error(e.message); pool.end(); });
