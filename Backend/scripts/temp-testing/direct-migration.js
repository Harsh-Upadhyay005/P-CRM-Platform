import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const { Client } = pg;

async function applyMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected!');

    console.log('\nReading migration file...');
    const migrationPath = path.join(__dirname, 'prisma', 'migrations', '20260326120000_add_seva_queries_table', 'migration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('\nApplying migration...');
    await client.query(migrationSQL);

    console.log('\n✅ Migration applied successfully!');
    console.log('\nNext step: Run `npx prisma generate` to update Prisma Client');

  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error('Error:', error.message);
    
    if (error.message.includes('already exists')) {
      console.log('\n⚠️  Table already exists. Migration may have been applied previously.');
    }
    
  } finally {
    await client.end();
    console.log('\nDatabase connection closed.');
  }
}

applyMigration();
