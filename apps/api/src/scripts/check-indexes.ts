/**
 * Database Index Analysis Script
 * 
 * This script analyzes your database schema and suggests missing indexes
 * based on common query patterns.
 * 
 * Run with: tsx src/scripts/check-indexes.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface IndexSuggestion {
  table: string;
  columns: string[];
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

async function checkIndexes() {
  console.log('🔍 Analyzing database indexes...\n');

  try {
    // Get current indexes from database
    const currentIndexes = await prisma.$queryRaw<Array<{
      tablename: string;
      indexname: string;
      indexdef: string;
    }>>`
      SELECT 
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname;
    `;

    console.log('📊 Current Indexes:');
    const indexesByTable: Record<string, string[]> = {};
    currentIndexes.forEach((idx) => {
      if (!indexesByTable[idx.tablename]) {
        indexesByTable[idx.tablename] = [];
      }
      indexesByTable[idx.tablename].push(idx.indexname);
      console.log(`  ${idx.tablename}.${idx.indexname}`);
    });

    console.log('\n💡 Suggested Indexes:\n');

    const suggestions: IndexSuggestion[] = [
      // Events table - common query patterns
      {
        table: 'events',
        columns: ['category', 'status', 'saleStart', 'saleEnd'],
        reason: 'Filtering by category and status with date ranges',
        priority: 'high',
      },
      {
        table: 'events',
        columns: ['city', 'status'],
        reason: 'Filtering events by city and status',
        priority: 'high',
      },
      {
        table: 'events',
        columns: ['startDateTime', 'status'],
        reason: 'Date-based filtering with status',
        priority: 'high',
      },
      {
        table: 'events',
        columns: ['organizerId', 'status'],
        reason: 'Organizer dashboard queries',
        priority: 'medium',
      },
      {
        table: 'events',
        columns: ['slug'],
        reason: 'Unique lookups by slug (should be unique index)',
        priority: 'high',
      },
      
      // Orders table
      {
        table: 'orders',
        columns: ['eventId', 'status', 'createdAt'],
        reason: 'Analytics queries filtering by event, status, and date',
        priority: 'high',
      },
      {
        table: 'orders',
        columns: ['userId', 'status'],
        reason: 'User order history queries',
        priority: 'medium',
      },
      
      // Tickets table
      {
        table: 'tickets',
        columns: ['eventId', 'status'],
        reason: 'Event ticket queries',
        priority: 'high',
      },
      {
        table: 'tickets',
        columns: ['orderId', 'status'],
        reason: 'Order ticket lookups',
        priority: 'medium',
      },
      
      // TicketTypes table
      {
        table: 'ticket_types',
        columns: ['eventId', 'price'],
        reason: 'Event ticket type queries with price sorting',
        priority: 'medium',
      },
      
      // Seats table
      {
        table: 'seats',
        columns: ['eventId', 'status', 'section'],
        reason: 'Seat availability queries',
        priority: 'high',
      },
    ];

    // Check which suggestions are missing
    const missingIndexes: IndexSuggestion[] = [];

    for (const suggestion of suggestions) {
      const indexName = `idx_${suggestion.table}_${suggestion.columns.join('_')}`;
      const tableIndexes = indexesByTable[suggestion.table] || [];
      
      // Check if a similar index exists
      const exists = tableIndexes.some((idx) => 
        idx.includes(suggestion.columns[0]) && 
        suggestion.columns.every((col) => idx.includes(col) || idx.includes(col.replace(/([A-Z])/g, '_$1').toLowerCase()))
      );

      if (!exists) {
        missingIndexes.push(suggestion);
        const priorityEmoji = suggestion.priority === 'high' ? '🔴' : suggestion.priority === 'medium' ? '🟡' : '🟢';
        console.log(`${priorityEmoji} ${suggestion.priority.toUpperCase()}: ${suggestion.table}`);
        console.log(`   Columns: ${suggestion.columns.join(', ')}`);
        console.log(`   Reason: ${suggestion.reason}`);
        console.log(`   SQL: CREATE INDEX ${indexName} ON ${suggestion.table} (${suggestion.columns.join(', ')});\n`);
      }
    }

    if (missingIndexes.length === 0) {
      console.log('✅ All suggested indexes appear to be present!\n');
    }

    // Analyze query performance
    console.log('\n📈 Query Performance Analysis:\n');
    
    // Check for slow queries (if pg_stat_statements is enabled)
    try {
      const slowQueries = await prisma.$queryRaw<Array<{
        query: string;
        calls: bigint;
        total_time: number;
        mean_time: number;
      }>>`
        SELECT 
          LEFT(query, 100) as query,
          calls,
          total_exec_time as total_time,
          mean_exec_time as mean_time
        FROM pg_stat_statements
        WHERE mean_exec_time > 100
        ORDER BY mean_exec_time DESC
        LIMIT 10;
      `;

      if (slowQueries.length > 0) {
        console.log('⚠️  Slow Queries Detected (>100ms average):');
        slowQueries.forEach((q, i) => {
          console.log(`\n${i + 1}. Average: ${q.mean_time.toFixed(2)}ms | Calls: ${q.calls}`);
          console.log(`   ${q.query}...`);
        });
      } else {
        console.log('✅ No slow queries detected (pg_stat_statements may not be enabled)');
      }
    } catch (error) {
      console.log('ℹ️  pg_stat_statements extension not available (this is normal)');
      console.log('   To enable: CREATE EXTENSION IF NOT EXISTS pg_stat_statements;');
    }

    // Table statistics
    console.log('\n📊 Table Statistics:\n');
    const tableStats = await prisma.$queryRaw<Array<{
      schemaname: string;
      relname: string;
      n_tup_ins: bigint;
      n_tup_upd: bigint;
      n_tup_del: bigint;
      n_live_tup: bigint;
      n_dead_tup: bigint;
    }>>`
      SELECT 
        schemaname,
        relname,
        n_tup_ins,
        n_tup_upd,
        n_tup_del,
        n_live_tup,
        n_dead_tup
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      ORDER BY n_live_tup DESC
      LIMIT 10;
    `;

    tableStats.forEach((stat) => {
      const deadRatio = Number(stat.n_dead_tup) / (Number(stat.n_live_tup) + Number(stat.n_dead_tup) || 1);
      const deadEmoji = deadRatio > 0.2 ? '⚠️' : '✅';
      console.log(`${deadEmoji} ${stat.relname}:`);
      console.log(`   Rows: ${Number(stat.n_live_tup).toLocaleString()} live, ${Number(stat.n_dead_tup).toLocaleString()} dead`);
      if (deadRatio > 0.2) {
        console.log(`   ⚠️  High dead tuple ratio (${(deadRatio * 100).toFixed(1)}%) - consider VACUUM`);
      }
    });

    console.log('\n✅ Analysis complete!\n');

  } catch (error) {
    console.error('❌ Error analyzing indexes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkIndexes();
