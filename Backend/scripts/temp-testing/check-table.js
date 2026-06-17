import { prisma } from './src/config/db.js';

async function checkTable() {
  try {
    console.log('Checking if SevaQuery table exists...');
    const result = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'SevaQuery'
      );
    `;
    
    console.log('Table exists:', result[0].exists);
    
    if (result[0].exists) {
      console.log('\nQuerying table structure...');
      const columns = await prisma.$queryRaw`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'SevaQuery'
        ORDER BY ordinal_position;
      `;
      console.log('Columns:', columns);
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTable();
