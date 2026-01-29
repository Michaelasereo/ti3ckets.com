import 'dotenv/config';
import app from './app';
import { prismaService } from './services/prisma';
import { RedisService } from './services/redis';

const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';

async function start() {
  try {
    // Initialize Prisma connection
    await prismaService.connect();
    
    // Start Express server
    app.listen(Number(PORT), HOST, () => {
      console.log(`🚀 Express API running on http://${HOST}:${PORT}`);
      console.log(`📊 Database: ${process.env.DATABASE_URL ? 'Configured' : '⚠️  Missing!'}`);
      console.log(`🔗 API: http://localhost:${PORT}/api/v1/events`);
      console.log(`🏥 Health: http://localhost:${PORT}/health`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
