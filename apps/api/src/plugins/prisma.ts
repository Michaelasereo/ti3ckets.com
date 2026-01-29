import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

async function prismaPlugin(fastify: FastifyInstance) {
  const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'info', 'warn', 'error']
      : ['warn', 'error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  // Helper function to ensure connection
  const ensureConnection = async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (error: any) {
      if (error.message?.includes("Can't reach database server") || error.code === 'P1001') {
        fastify.log.warn('Database connection lost, reconnecting...');
        try {
          await prisma.$disconnect();
          await prisma.$connect();
          fastify.log.info('✅ Database reconnected');
        } catch (reconnectError) {
          fastify.log.error('❌ Database reconnection failed:', reconnectError);
          throw reconnectError;
        }
      } else {
        throw error;
      }
    }
  };

  // Explicitly connect to database on startup
  try {
    await prisma.$connect();
    fastify.log.info('✅ Prisma connected to database');
    
    // Verify connection with a test query
    try {
      const result = await prisma.$queryRaw<Array<{ version: string }>>`SELECT version()`;
      fastify.log.info(`📊 Database version: ${result[0]?.version || 'unknown'}`);
    } catch (versionError) {
      // Version query might fail, but connection is still valid
      fastify.log.warn('Could not query database version, but connection is established');
    }
  } catch (error) {
    fastify.log.error('❌ Prisma connection failed:', error);
    throw error; // Fail fast on startup
  }
  
  // Add connection check helper
  fastify.decorate('ensureDbConnection', ensureConnection);

  // Make Prisma available throughout Fastify
  fastify.decorate('prisma', prisma);
  
  // Add database health check helper
  fastify.decorate('checkDb', async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  });

  // Handle graceful shutdown
  fastify.addHook('onClose', async (instance: FastifyInstance) => {
    fastify.log.info('🔌 Disconnecting Prisma...');
    await instance.prisma.$disconnect();
  });
}

export default fp(prismaPlugin, {
  name: 'prisma',
  dependencies: [],
});
