/**
 * CockroachDB Serverless Primary Database Manager Module
 * Manages dual records storage for Free Users (free_records) and Paid Users (premium_records)
 * 100% Free 10 GB Storage Cluster Primary DB
 */

let pg = null;
try {
  pg = require('pg');
} catch (e) {
  console.warn('[CockroachDB] pg module not installed yet. Operating in fallback mode.');
}

const { Pool } = pg || {};

const cockroachFreeUrl = process.env.COCKROACH_FREE_URL || process.env.COCKROACH_URL || '';
const cockroachPremiumUrl = process.env.COCKROACH_PREMIUM_URL || process.env.COCKROACH_URL || '';

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
 * Auto-creates free_records, premium_records, custom_slugs, and payments tables
 */
async function ensureTablesExist() {
  if (tablesInitialized) return true;
  const pFree = poolFree;
  const pPrem = poolPremium || poolFree;
  if (!pFree && !pPrem) return false;

  try {
    const createWebsitesTable = (tableName) => `
      CREATE TABLE IF NOT EXISTS ${tableName} (
        id VARCHAR(64) PRIMARY KEY,
        recipient_name TEXT,
        event_type VARCHAR(64),
        template_name VARCHAR(64),
        is_premium BOOLEAN DEFAULT FALSE,
        views INT DEFAULT 0,
        slug VARCHAR(64),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB
      );
    `;

    const createSlugsTable = `
      CREATE TABLE IF NOT EXISTS custom_slugs (
        slug VARCHAR(64) PRIMARY KEY,
        website_id VARCHAR(64) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const createPaymentsTable = `
      CREATE TABLE IF NOT EXISTS payments (
        order_id VARCHAR(128) PRIMARY KEY,
        website_id VARCHAR(64),
        slug VARCHAR(64),
        plan VARCHAR(64),
        plan_name VARCHAR(64),
        amount NUMERIC,
        currency VARCHAR(16),
        status VARCHAR(32),
        payment_method VARCHAR(64),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB
      );
    `;

    if (pFree) {
      await pFree.query(createWebsitesTable('free_records'));
      await pFree.query(createSlugsTable);
      await pFree.query(createPaymentsTable);
    }
    if (pPrem) {
      await pPrem.query(createWebsitesTable('premium_records'));
      await pPrem.query(createSlugsTable);
      await pPrem.query(createPaymentsTable);
    }
    tablesInitialized = true;
    console.log('[CockroachDB] Primary DB tables initialized (free_records, premium_records, custom_slugs, payments)');
    return true;
  } catch (err) {
    console.error('[CockroachDB] Table initialization error:', err.message);
    return false;
  }
}

/**
 * Saves a website record to CockroachDB Primary DB
 * Free users -> free_records
 * Premium users -> premium_records
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
 * Retrieves a website record from CockroachDB Primary DB
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
              views: row.views || 0,
              slug: row.slug,
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
 * Increments view count for a website in CockroachDB
 */
async function incrementView(websiteId) {
  const pools = [poolPremium, poolFree].filter(Boolean);
  if (pools.length === 0) return false;

  try {
    await ensureTablesExist();
    for (const pool of pools) {
      for (const tableName of ['premium_records', 'free_records']) {
        try {
          const res = await pool.query(`UPDATE ${tableName} SET views = views + 1 WHERE id = $1 RETURNING views`, [websiteId]);
          if (res.rows && res.rows.length > 0) {
            return res.rows[0].views;
          }
        } catch (e) {}
      }
    }
  } catch (err) {
    console.error(`[CockroachDB] Increment view error for ${websiteId}:`, err.message);
  }
  return false;
}

/**
 * Fetch all websites across free_records and premium_records for Admin Dashboard
 */
async function getAllWebsites() {
  const pool = poolFree || poolPremium;
  if (!pool) return [];

  try {
    await ensureTablesExist();
    const list = [];
    
    for (const tableName of ['premium_records', 'free_records']) {
      try {
        const res = await pool.query(`SELECT * FROM ${tableName} ORDER BY created_at DESC LIMIT 5000`);
        if (res.rows) {
          res.rows.forEach(row => {
            list.push({
              id: row.id,
              recipientName: row.recipient_name,
              eventType: row.event_type,
              templateName: row.template_name,
              isPremium: row.is_premium,
              views: row.views || 0,
              slug: row.slug,
              createdAt: row.created_at,
              metadata: row.metadata
            });
          });
        }
      } catch (e) {}
    }
    return list;
  } catch (err) {
    console.error('[CockroachDB] getAllWebsites error:', err.message);
    return [];
  }
}

/**
 * Custom Slug Management in CockroachDB
 */
async function saveCustomSlug(slug, websiteId) {
  const pool = poolFree || poolPremium;
  if (!pool) return false;

  try {
    await ensureTablesExist();
    const sanitized = slug.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
    await pool.query(
      `INSERT INTO custom_slugs (slug, website_id, created_at) VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (slug) DO UPDATE SET website_id = EXCLUDED.website_id;`,
      [sanitized, websiteId]
    );

    // Also update slug in records table
    for (const tableName of ['premium_records', 'free_records']) {
      await pool.query(`UPDATE ${tableName} SET slug = $1 WHERE id = $2`, [sanitized, websiteId]);
    }
    return true;
  } catch (err) {
    console.error(`[CockroachDB] saveCustomSlug error (${slug}):`, err.message);
    return false;
  }
}

async function getCustomSlug(slug) {
  const pool = poolFree || poolPremium;
  if (!pool) return null;

  try {
    await ensureTablesExist();
    const sanitized = slug.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
    const res = await pool.query(`SELECT * FROM custom_slugs WHERE slug = $1 LIMIT 1`, [sanitized]);
    if (res.rows && res.rows.length > 0) {
      return {
        slug: res.rows[0].slug,
        websiteId: res.rows[0].website_id,
        createdAt: res.rows[0].created_at
      };
    }
  } catch (err) {
    console.error(`[CockroachDB] getCustomSlug error (${slug}):`, err.message);
  }
  return null;
}

/**
 * Payments Logging in CockroachDB
 */
async function savePayment(paymentData) {
  const pool = poolFree || poolPremium;
  if (!pool) return false;

  try {
    await ensureTablesExist();
    const query = `
      INSERT INTO payments (order_id, website_id, slug, plan, plan_name, amount, currency, status, payment_method, created_at, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, $10)
      ON CONFLICT (order_id) DO UPDATE SET
        status = EXCLUDED.status,
        metadata = EXCLUDED.metadata;
    `;
    await pool.query(query, [
      paymentData.orderId || `order_${Date.now()}`,
      paymentData.websiteId || '',
      paymentData.slug || '',
      paymentData.plan || 'starter',
      paymentData.planName || 'Starter Plan',
      paymentData.amount || 0,
      paymentData.currency || 'INR',
      paymentData.status || 'PAID',
      paymentData.paymentMethod || 'cashfree',
      JSON.stringify(paymentData || {})
    ]);

    // Upgrade record to premium_records if paid
    if (paymentData.websiteId && paymentData.status === 'PAID') {
      const record = await getRecord(paymentData.websiteId);
      if (record) {
        await saveRecord(paymentData.websiteId, record.metadata, true);
      }
    }
    return true;
  } catch (err) {
    console.error('[CockroachDB] savePayment error:', err.message);
    return false;
  }
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
  incrementView,
  getAllWebsites,
  saveCustomSlug,
  getCustomSlug,
  savePayment,
  getCockroachStats,
  purgeExpiredFreeRecords,
  ensureTablesExist
};
