import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Client } = pg;

async function run() {
  const envFile = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
  const dbUrlLine = envFile.split('\n').find(line => line.startsWith('DATABASE_URL='));
  const dbUrl = dbUrlLine.split('=')[1].trim();

  const client = new Client({
    connectionString: dbUrl
  });
  await client.connect();
  console.log('Connected to DB. Dropping view...');
  await client.query('DROP VIEW IF EXISTS profile_statistics CASCADE;');
  console.log('View dropped.');
  await client.end();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
