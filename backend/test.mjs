import 'dotenv/config';
import pg from 'pg';

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  await client.connect();
  try {
    const res = await client.query(`
      SELECT 
        auth.users.id as auth_id, 
        auth.users.email, 
        ua.account_type as ua_type, 
        pu."accountType" as pu_type 
      FROM auth.users 
      LEFT JOIN public.user_accounts ua ON auth.users.id = ua.id 
      LEFT JOIN public.users pu ON auth.users.id = pu.id 
      WHERE auth.users.id IN (
        '1c8e4f56-8af4-452a-ae6f-7b20a6d3d9b7', 
        'db2417ae-914d-468f-9db1-0503fb556b24', 
        'c58b6c74-f6d3-4fe8-90fd-ed1ad15840c9', 
        'ae0b9899-7075-4b2d-bfaa-93e3aed947bc'
      )
    `);
    console.table(res.rows);
  } catch (e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

main();