import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  connectionString: 'postgresql://postgres.smxwhvdmucvctxzudtxg:OV5Tww59tXFsGywe@aws-1-eu-west-3.pooler.supabase.com:6543/postgres?pgbouncer=true'
});

async function main() {
  await client.connect();
  const res = await client.query(`
    SELECT * FROM users u 
    LEFT JOIN patient_conditions pc ON u.id = pc."patientId" 
    WHERE u.email = 'pat@aethea.me'
  `);
  console.log(res.rows);
  await client.end();
}

main().catch(console.error);
