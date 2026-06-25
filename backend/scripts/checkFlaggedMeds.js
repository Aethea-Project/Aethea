import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  connectionString: 'postgresql://postgres.smxwhvdmucvctxzudtxg:OV5Tww59tXFsGywe@aws-1-eu-west-3.pooler.supabase.com:6543/postgres?pgbouncer=true'
});

async function main() {
  await client.connect();
  const res = await client.query(`
    SELECT "brandNameEn", "brandNameAr", "activeIngredient"
    FROM medicines
    WHERE 
      LOWER("activeIngredient") LIKE '%pseudoephedrine%'
      OR LOWER("activeIngredient") LIKE '%phenylephrine%'
      OR LOWER("activeIngredient") LIKE '%prednisone%'
      OR LOWER("activeIngredient") LIKE '%dexamethasone%'
      OR 'Hyperglycemia-Associated Agents' = ANY("drugClasses")
      OR 'Corticosteroids' = ANY("drugClasses")
      OR 'Thiazide Diuretics' = ANY("drugClasses")
      OR 'Blood Glucose Lowering Agents' = ANY("drugClasses")
  `);
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}

main().catch(console.error);
