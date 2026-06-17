import { prisma } from './src/config/db.js';

async function applyMigration() {
  try {
    console.log('Creating SevaQuery table...');
    
    await prisma.$executeRawUnsafe(`
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
    
    console.log('Table created successfully!');
    
    console.log('Creating unique index on createdComplaintId...');
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "SevaQuery_createdComplaintId_key" ON "SevaQuery"("createdComplaintId");
    `);
    
    console.log('Creating index on tenantId...');
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "SevaQuery_tenantId_idx" ON "SevaQuery"("tenantId");
    `);
    
    console.log('Creating index on userId...');
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "SevaQuery_userId_idx" ON "SevaQuery"("userId");
    `);
    
    console.log('Creating index on createdComplaintId...');
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "SevaQuery_createdComplaintId_idx" ON "SevaQuery"("createdComplaintId");
    `);
    
    console.log('Creating index on createdAt...');
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "SevaQuery_createdAt_idx" ON "SevaQuery"("createdAt");
    `);
    
    console.log('Adding foreign key constraints...');
    
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'SevaQuery_tenantId_fkey'
        ) THEN
          ALTER TABLE "SevaQuery" ADD CONSTRAINT "SevaQuery_tenantId_fkey" 
          FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") 
          ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
      END $$;
    `);
    
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'SevaQuery_userId_fkey'
        ) THEN
          ALTER TABLE "SevaQuery" ADD CONSTRAINT "SevaQuery_userId_fkey" 
          FOREIGN KEY ("userId") REFERENCES "User"("id") 
          ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
      END $$;
    `);
    
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'SevaQuery_createdComplaintId_fkey'
        ) THEN
          ALTER TABLE "SevaQuery" ADD CONSTRAINT "SevaQuery_createdComplaintId_fkey" 
          FOREIGN KEY ("createdComplaintId") REFERENCES "Complaint"("id") 
          ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
      END $$;
    `);
    
    console.log('\n✅ Migration applied successfully!');
    console.log('\nNext steps:');
    console.log('1. Run: npx prisma generate');
    console.log('2. The SevaQuery table is now ready to use');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('Details:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration();
