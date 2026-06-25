import { PrismaClient } from '../src/generated/prisma/index.js';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

async function main() {
  try {
    const sqlPath = join(process.cwd(), 'scripts/supabase/2026-05-24_immutable_audit_logs.sql');
    console.log(`Reading SQL file from: ${sqlPath}`);
    const sqlContent = readFileSync(sqlPath, 'utf8');

    // Split SQL by semicolons, but keep the CREATE OR REPLACE FUNCTION body intact if it contains semicolons.
    // Since our function has one semicolon after RAISE EXCEPTION and one after END, 
    // let's split intelligently or split by a custom delimiter, or split by semicolons except inside $$ block.
    
    // A simple parser to split on semicolons unless they are inside dollar-quoted $$ blocks:
    const statements: string[] = [];
    let currentStatement = '';
    let inDollarQuote = false;
    
    const lines = sqlContent.split('\n');
    for (const line of lines) {
      // Check if line toggles $$
      if (line.includes('$$')) {
        inDollarQuote = !inDollarQuote;
      }
      
      if (!inDollarQuote && line.includes(';')) {
        // Split on semicolon
        const parts = line.split(';');
        for (let i = 0; i < parts.length - 1; i++) {
          currentStatement += parts[i];
          statements.push(currentStatement.trim());
          currentStatement = '';
        }
        currentStatement += parts[parts.length - 1] + '\n';
      } else {
        currentStatement += line + '\n';
      }
    }
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }

    console.log(`Parsed ${statements.length} SQL statements to execute.`);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i].trim();
      if (!stmt) continue;
      
      console.log(`\nExecuting statement ${i + 1}/${statements.length}:`);
      console.log(stmt.substring(0, 100) + (stmt.length > 100 ? '...' : ''));
      
      await prisma.$executeRawUnsafe(stmt);
    }
    
    console.log('\nSuccessfully applied all SQL changes for Fix 1!');
  } catch (error) {
    console.error('Error applying SQL migration:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
