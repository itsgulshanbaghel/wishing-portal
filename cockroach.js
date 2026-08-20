/**
 * CockroachDB Serverless Dual-Storage Manager Module
 * Manages dual records storage for Free Users (free_records) and Paid Users (premium_records)
 * Compatible with CockroachDB Serverless (10 GB Free Tier) & PostgreSQL
 */

let pg = null;
try {
  pg = require('pg');
} catch (e) {
  console.warn('[CockroachDB] pg module not installed yet. Operating in fallback mode.');
}

const { Pool } = pg || {};

// Connection URLs for CockroachDB clusters / databases
const cockroachFreeUrl = process.env.COCKROACH_FREE_URL || process.env.COCKROACH_URL || '';
const cockroachPremiumUrl = process.env.COCKROACH_PREMIUM_URL || process.env.COCKROACH_URL || '';

// Connection Pools
let poolFree = null;
let poolPremium = null;

if (Pool && cockroachFreeUrl) {
  try {
    poolFree = new Pool({
      connectionString: cockroachFreeUrl,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    });
  } catch (e) {
    console.error('[CockroachDB] Free pool init error:', e.message);
  }
}

if (Pool && cockroachPremiumUrl) {
  try {
    if (cockroachPremiumUrl === cockroachFreeUrl && poolFree) {
      poolPremium = poolFree;
    } else {
      poolPremium = new Pool({
        connectionString: cockroachPremiumUrl,
        ssl: { rejectUnauthorized: false },
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000
      });
    }
  } catch (e) {
    console.error('[CockroachDB] Premium pool init error:', e.message);
  }
}

let tablesInitialized = false;

/**
 * Auto-creates free_records and premium_records tables if they do not exist
 */
async function ensureTablesExist() {
  if (tablesInitialized) return true;
  const pFree = poolFree;
  const pPrem = poolPremium || poolFree;
  if (!pFree && !pPrem) return false;

  try {
    const createTableQuery = (tableName) => `
      CREATE TABLE IF NOT EXISTS ${tableName} (
        id VARCHAR(64) PRIMARY KEY,
        recipient_name TEXT,
        event_type VARCHAR(64),
        template_name VARCHAR(64),
        is_premium BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB
      );
    `;

    if (pFree) {
      await pFree.query(createTableQuery('free_records'));
    }
    if (pPrem) {
      await pPrem.query(createTableQuery('premium_records'));
    }
    tablesInitialized = true;
    console.log('[CockroachDB] Dual records tables initialized successfully (free_records & premium_records)');
    return true;
  } catch (err) {
    console.error('[CockroachDB] Table initialization error:', err.message);
    return false;
  }
}

/**
 * Saves a website record to CockroachDB Serverless
 * Free users -> free_records table
 * Premium users -> premium_records table
 */
async function saveRecord(websiteId, metadata, isPremium = false) {
  const pool = isPremium ? (poolPremium || poolFree) : (poolFree || poolPremium);
  if (!pool) return false;

  try {
    await ensureTablesExist();
    const tableName = isPremium ? 'premium_records' : 'free_records';
    const query = `
      INSERT INTO ${tableName} (id, recipient_name, event_type, template_name, is_premium, created_at, metadata)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6)
      ON CONFLICT (id) DO UPDATE SET
        recipient_name = EXCLUDED.recipient_name,
        event_type = EXCLUDED.event_type,
        template_name = EXCLUDED.template_name,
        is_premium = EXCLUDED.is_premium,
        metadata = EXCLUDED.metadata;
    `;

    const recipient = metadata?.recipientName || metadata?.name || 'Unknown';
    const eventType = metadata?.eventType || metadata?.category || 'unknown';
    const templateName = metadata?.templateName || metadata?.template || 'unknown';
    const jsonMeta = JSON.stringify(metadata || {});

    await pool.query(query, [websiteId, recipient, eventType, templateName, !!isPremium, jsonMeta]);
    console.log(`[CockroachDB] Saved record "${websiteId}" to ${tableName}`);
    return true;
  } catch (err) {
    console.error(`[CockroachDB] Save record error for ${websiteId}:`, err.message);
    return false;
  }
}

/**
 * Retrieves a website record from CockroachDB
 */
async function getRecord(websiteId) {
  const pools = [poolPremium, poolFree].filter(Boolean);
  if (pools.length === 0) return null;

  try {
    await ensureTablesExist();
    for (const pool of pools) {
      for (const tableName of ['premium_records', 'free_records']) {
        try {
          const res = await pool.query(`SELECT * FROM ${tableName} WHERE id = $1 LIMIT 1`, [websiteId]);
          if (res.rows && res.rows.length > 0) {
            const row = res.rows[0];
            return {
              id: row.id,
              recipientName: row.recipient_name,
              eventType: row.event_type,
              templateName: row.template_name,
              isPremium: row.is_premium,
              createdAt: row.created_at,
              metadata: row.metadata
            };
          }
        } catch (e) {}
      }
    }
  } catch (err) {
    console.error(`[CockroachDB] Fetch record error for ${websiteId}:`, err.message);
  }
  return null;
}

/**
 * Get CockroachDB Storage & Record Statistics for Admin Panel
 */
async function getCockroachStats() {
  const isConfigured = !!(poolFree || poolPremium);
  if (!isConfigured) {
    return {
      configured: false,
      status: 'Not Configured',
      freeRecordsCount: 0,
      premiumRecordsCount: 0,
      totalRecordsCount: 0,
      freeTierLimit: '10 GB Free'
    };
  }

  try {
    await ensureTablesExist();
    let freeCount = 0;
    let premiumCount = 0;

    if (poolFree) {
      const resF = await poolFree.query('SELECT COUNT(*) FROM free_records');
      freeCount = parseInt(resF.rows[0]?.count || 0, 10);
    }
    if (poolPremium) {
      const resP = await poolPremium.query('SELECT COUNT(*) FROM premium_records');
      premiumCount = parseInt(resP.rows[0]?.count || 0, 10);
    }

    return {
      configured: true,
      status: 'Connected',
      freeRecordsCount: freeCount,
      premiumRecordsCount: premiumCount,
      totalRecordsCount: freeCount + premiumCount,
      freeTierLimit: '10 GB Free'
    };
  } catch (err) {
    return {
      configured: true,
      status: 'Error',
      errorMessage: err.message,
      freeRecordsCount: 0,
      premiumRecordsCount: 0,
      totalRecordsCount: 0,
      freeTierLimit: '10 GB Free'
    };
  }
}

/**
 * Purge expired free user records older than 36h from free_records table
 */
async function purgeExpiredFreeRecords() {
  if (!poolFree) return 0;
  try {
    await ensureTablesExist();
    const res = await poolFree.query(
      "DELETE FROM free_records WHERE created_at < NOW() - INTERVAL '36 hours'"
    );
    const deleted = res.rowCount || 0;
    if (deleted > 0) {
      console.log(`[CockroachDB] Purged ${deleted} expired free user records (>36h) from free_records table`);
    }
    return deleted;
  } catch (err) {
    console.error('[CockroachDB] Purge error:', err.message);
    return 0;
  }
}

module.exports = {
  saveRecord,
  getRecord,
  getCockroachStats,
  purgeExpiredFreeRecords,
  ensureTablesExist
};
