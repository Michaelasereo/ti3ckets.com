/**
 * Database connectivity diagnostic.
 * Run from apps/api: npm run test-db-connection
 */
import dotenv from 'dotenv';
import path from 'path';
import net from 'net';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const DIRECT_URL = process.env.DIRECT_URL ?? '';
const DATABASE_URL = process.env.DATABASE_URL ?? '';

function parseHostPort(url: string): { host: string; port: number } | null {
  const m = url.match(/@([^/]+)\//) || url.match(/@([^/]+)$/);
  if (!m) return null;
  const part = m[1];
  const lastColon = part.lastIndexOf(':');
  if (lastColon === -1) return null;
  const host = part.slice(0, lastColon);
  const port = parseInt(part.slice(lastColon + 1), 10);
  if (!host || !Number.isFinite(port)) return null;
  return { host, port };
}

function tcpConnect(host: string, port: number, timeoutMs = 10_000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const done = (ok: boolean) => {
      try { socket.destroy(); } catch { /* ignore */ }
      resolve(ok);
    };
    socket.setTimeout(timeoutMs, () => done(false));
    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
    socket.connect(port, host);
  });
}

async function main() {
  console.log('🔍 Database connection diagnostic\n');

  if (!DIRECT_URL && !DATABASE_URL) {
    console.error('❌ Neither DIRECT_URL nor DATABASE_URL is set in .env');
    console.log('   Add them from Supabase Dashboard → Project Settings → Database');
    process.exit(1);
  }

  const direct = DIRECT_URL ? parseHostPort(DIRECT_URL) : null;
  const pooler = DATABASE_URL ? parseHostPort(DATABASE_URL) : null;

  if (direct) {
    process.stdout.write(`   Direct (${direct.host}:${direct.port})... `);
    const ok = await tcpConnect(direct.host, direct.port);
    console.log(ok ? '✅ reachable' : '❌ unreachable');
    if (!ok) {
      console.log('\n   Common causes:');
      console.log('   • IP banned: Supabase → Project Settings → Database → Network Bans');
      console.log('   • Firewall/VPN blocking outbound 5432');
      console.log('   • Wrong DIRECT_URL (check Project → Connect)');
    }
  }

  if (pooler && (!direct || pooler.host !== direct.host || pooler.port !== direct.port)) {
    process.stdout.write(`   Pooler (${pooler.host}:${pooler.port})... `);
    const ok = await tcpConnect(pooler.host, pooler.port);
    console.log(ok ? '✅ reachable' : '❌ unreachable');
    if (!ok) {
      console.log('\n   Pooler unreachable. API falls back to DIRECT_URL automatically.');
    }
  }

  console.log('\n   Next: Check Network Bans; add ?connect_timeout=30 to DB URLs if needed.');
  console.log('   Test with psql: psql "<DIRECT_URL>" -c "SELECT 1"\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
