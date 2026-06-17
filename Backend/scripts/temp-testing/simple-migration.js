import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    statement_timeout: 30000, // 30 second timeout
    query_timeout: 30000,
    connectionTimeoutMillis: 10000,
  });

  try {
    console.log('Connecting...');
    await client.connect();
    console.log('Connected!\n');

    console.log('Creating SevaQuery table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "SevaQuery" (
        "id" TEXT NOT NULL,
        "tenantId" TEXT,
        "userId" TEXT,
        "conversationData" JSONB NOT NULL,
        "classificationAttempts" INTEGER NOT NULL DEFAULT 0,
        "finalCategory" TEXT NOT NULL,
        "finalConfidence" DOUBLE PRECISION NOT NULL,
        "createdComplaintId" TEXT,
        "sessionLanguage" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "SevaQuery_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('✅ Table created\n');

    console.log('Creating indexes...');
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS "SevaQuery_createdComplaintId_key" ON "SevaQuery"("createdComplaintId");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "SevaQuery_tenantId_idx" ON "SevaQuery"("tenantId");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "SevaQuery_userId_idx" ON "SevaQuery"("userId");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "SevaQuery_createdComplaintId_idx" ON "SevaQuery"("createdComplaintId");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "SevaQuery_createdAt_idx" ON "SevaQuery"("createdAt");`);
    console.log('✅ Indexes created\n');

    console.log('Adding foreign key constraints...');
    try {
      await client.query(`
        ALTER TABLE "SevaQuery" 
        ADD CONSTRAINT "SevaQuery_tenantId_fkey" 
        FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") 
        ON DELETE SET NULL ON UPDATE CASCADE;
      `);
    } catch (e) {
      if (!e.message.includes('already exists')) throw e;
      console.log('  - tenantId FK already exists');
    }

    try {
      await client.query(`
        ALTER TABLE "SevaQuery" 
        ADD CONSTRAINT "SevaQuery_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") 
        ON DELETE SET NULL ON UPDATE CASCADE;
      `);
    } catch (e) {
      if (!e.message.includes('already exists')) throw e;
      console.log('  - userId FK already exists');
    }

    try {
      await client.query(`
        ALTER TABLE "SevaQuery" 
        ADD CONSTRAINT "SevaQuery_createdComplaintId_fkey" 
        FOREIGN KEY ("createdComplaintId") REFERENCES "Complaint"("id") 
        ON DELETE SET NULL ON UPDATE CASCADE;
      `);
    } catch (e) {
      if (!e.message.includes('already exists')) throw e;
      console.log('  - createdComplaintId FK already exists');
    }

    console.log('✅ Foreign keys added\n');

    console.log('✅ Migration completed successfully!');
    console.log('\nNext step: Run `npx prisma generate` to update Prisma Client');

  } catch (error) {
    if (error.message.includes('relation "SevaQuery" already exists')) {
      console.log('\n⚠️  Table already exists - migration was previously applied');
    } else {
      console.error('\n❌ Error:', error.message);
      throw error;
    }
  } finally {
    await client.end();
  }
}

runMigration().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
