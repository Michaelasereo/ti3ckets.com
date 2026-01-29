import { PrismaClient } from '@prisma/client';

function isUnreachableDbError(err: unknown): boolean {
  const e = err as { code?: string; message?: string };
  return e?.code === 'P1001' || (typeof e?.message === 'string' && /can't reach database server|connection refused|ECONNREFUSED|ETIMEDOUT/i.test(e.message));
}

/** Append connect_timeout=30 if missing (Supabase often needs longer to establish). */
function appendConnectTimeout(url: string, sec = 30): string {
  if (!url || /[?&]connect_timeout=/.test(url)) return url;
  return url + (url.includes('?') ? '&' : '?') + `connect_timeout=${sec}`;
}

function createClient(url: string): PrismaClient {
  const u = appendConnectTimeout(url);
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'info', 'warn', 'error']
      : ['warn', 'error'],
    datasources: { db: { url: u } },
  });
}

/**
 * Prisma service singleton. Tries DATABASE_URL (pooler) first; on unreachable,
 * falls back to DIRECT_URL (direct Postgres) when set.
 */
class PrismaService {
  private static instance: PrismaService;
  public client: PrismaClient;

  private constructor() {
    this.client = createClient(process.env.DATABASE_URL ?? '');
  }

  public static getInstance(): PrismaService {
    if (!PrismaService.instance) {
      PrismaService.instance = new PrismaService();
    }
    return PrismaService.instance;
  }

  /**
   * Initialize Prisma connection. Falls back to DIRECT_URL if pooler unreachable.
   */
  public async connect(): Promise<void> {
    try {
      await this.client.$connect();
      console.log('✅ Prisma connected to database');
      await this.logVersion();
      return;
    } catch (error) {
      console.error('❌ Prisma connection failed:', error);
      if (!isUnreachableDbError(error) || !process.env.DIRECT_URL) {
        throw error;
      }
      console.warn('🔄 Pooler unreachable; trying direct connection (DIRECT_URL)...');
      try {
        await this.client.$disconnect();
      } catch {
        /* ignore */
      }
      try {
        const direct = createClient(process.env.DIRECT_URL);
        await direct.$connect();
        (this as { client: PrismaClient }).client = direct;
        console.log('✅ Prisma connected via direct URL (fallback)');
        await this.logVersion();
      } catch (directError) {
        console.error('❌ Direct connection also failed:', directError);
        console.warn(
          '💡 If both fail: run `npm run test-db-connection` (apps/api). Check Supabase → Project Settings → Database → Network Bans; ' +
            'ensure connect_timeout=30 in DB URLs; verify project is not paused.'
        );
        throw directError;
      }
    }
  }

  private async logVersion(): Promise<void> {
    try {
      const rows = await this.client.$queryRaw<Array<{ version: string }>>`SELECT version()`;
      console.log(`📊 Database version: ${rows[0]?.version ?? 'unknown'}`);
    } catch {
      console.warn('Could not query database version, but connection is established');
    }
  }

  /**
   * Ensure database connection is active
   */
  public async ensureConnection(): Promise<void> {
    try {
      await this.client.$queryRaw`SELECT 1`;
    } catch (error: unknown) {
      if (isUnreachableDbError(error)) {
        console.warn('Database connection lost, reconnecting...');
        try {
          await this.client.$disconnect();
          await this.client.$connect();
          console.log('✅ Database reconnected');
        } catch (reconnectError) {
          console.error('❌ Database reconnection failed:', reconnectError);
          throw reconnectError;
        }
      } else {
        throw error;
      }
    }
  }

  /**
   * Check database connection health
   */
  public async checkDb(): Promise<boolean> {
    try {
      await this.client.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Disconnect Prisma
   */
  public async disconnect(): Promise<void> {
    console.log('🔌 Disconnecting Prisma...');
    await this.client.$disconnect();
  }
}

export const prismaService = PrismaService.getInstance();
export const prisma = prismaService.client;
