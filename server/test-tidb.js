import { PrismaClient } from '@prisma/client';

const url = "mysql://JY48rVgJgVGxZcx.root:wb7ARt2C7A176q8x@gateway01.ap-northeast-1.prod.aws.tidbcloud.com:4000/test?sslaccept=strict";
const prisma = new PrismaClient({
  datasources: {
    db: { url }
  }
});

async function createDb() {
  try {
    await prisma.$queryRawUnsafe('CREATE DATABASE IF NOT EXISTS true_clothing_db;');
    console.log('Database true_clothing_db created on TiDB!');
    const dbs = await prisma.$queryRawUnsafe('SHOW DATABASES;');
    console.log('Databases available:', dbs);
  } catch (err) {
    console.error('Failed to create db:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

createDb();
