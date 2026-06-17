import { prisma } from './src/config/db.js';

async function testConnection() {
  try {
    console.log('Testing database connection...');
    await prisma.$connect();
    console.log('Connected successfully!');
    
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('Query result:', result);
    
  } catch (error) {
    console.error('Connection error:', error);
  } finally {
    await prisma.$disconnect();
    console.log('Disconnected');
  }
}

testConnection();
