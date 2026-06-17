import { prisma } from './src/config/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    console.log('Reading migration file...');
    const migrationPath = path.join(__dirname, 'prisma', 'migrations', '20260326120000_add_seva_queries_table', 'migration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    console.log('Applying migration...');
    await prisma.$executeRawUnsafe(migrationSQL);
    
    console.log('Migration applied successfully!');
    
    // Regenerate Prisma Client
    console.log('Please run: npx prisma generate');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();
