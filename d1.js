/**
 * Cloudflare D1 Database Manager Module for Wishing Portal
 * Drop-in replacement for CockroachDB / PostgreSQL
 * Zero telemetry bloat - stores only cards, custom slugs, and payments.
 */

require('dotenv').config();

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || process.env.CF_ACCOUNT_ID || '';
const CLOUDFLARE_DATABASE_ID = process.env.CLOUDFLARE_D1_DATABASE_ID || process.env.D1_DATABASE_ID || '';
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN || '';

const isD1Configured = !!(CLOUDFLARE_ACCOUNT_ID && CLOUDFLARE_DATABASE_ID && CLOUDFLARE_API_TOKEN);

if (isD1Configured) {
  console.log(`[D1] Cloudflare D1 REST client initialized (Database ID: ${CLOUDFLARE_DATABASE_ID.slice(0, 8)}...)`);
} else {
  console.warn('[D1] Cloudflare D1 credentials missing in .env (CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID, CLOUDFLARE_API_TOKEN)');
}

/**
 * Executes a SQL query against Cloudflare D1 via the REST API
 */
async function executeQuery(sql, params = []) {
  if (!isD1Configured) {
    return { success: false, results: [], error: 'D1 not configured' };
  }

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/d1/database/${CLOUDFLARE_DATABASE_ID}/query`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sql,
        params
      })
    });

    const data = await response.json();
    if (!data.success) {
      console.error('[D1 Query Error]', data.errors);
      return { success: false, results: [], error: data.errors?.[0]?.message || 'Query failed' };
    }

    const firstResult = data.result?.[0] || {};
    return {
      success: true,
      results: firstResult.results || [],
      meta: firstResult.meta || {}
    };
  } catch (err) {
    console.error('[D1 Network Error]', err.message);
    return { success: false, results: [], error: err.message };
  }
}

/**
 * Saves a website record to D1
 * Free users -> free_records
 * Premium users -> premium_records
 */
async function saveRecord(websiteId, metadata, isPremium = false) {
  const tableName = isPremium ? 'premium_records' : 'free_records';
  
  let createdAtDate = null;
  if (metadata?.createdAt) {
    const d = new Date(metadata.createdAt);
    if (!isNaN(d.getTime())) createdAtDate = d.toISOString();
  }
  if (!createdAtDate && typeof websiteId === 'string') {
    const match = websiteId.match(/^(\d{13})/);
    if (match) {
      const d = new Date(parseInt(match[1], 10));
      if (!isNaN(d.getTime())) createdAtDate = d.toISOString();
    }
  }
  if (!createdAtDate) createdAtDate = new Date().toISOString();

  const recipient = metadata?.recipientName || metadata?.name || 'Special Recipient';
  const eventType = metadata?.eventType || metadata?.category || 'birthday';
  const templateName = metadata?.templateName || metadata?.template || 'birthday1';
  const jsonMeta = typeof metadata === 'object' ? JSON.stringify(metadata || {}) : String(metadata || '{}');

  const sql = `
    INSERT INTO ${tableName} (id, recipient_name, event_type, template_name, is_premium, created_at, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (id) DO UPDATE SET
      recipient_name = excluded.recipient_name,
      event_type = excluded.event_type,
      template_name = excluded.template_name,
      is_premium = excluded.is_premium,
      metadata = excluded.metadata;
  `;

  const res = await executeQuery(sql, [websiteId, recipient, eventType, templateName, isPremium ? 1 : 0, createdAtDate, jsonMeta]);
  
  // If upgrading to premium, purge from free_records
  if (isPremium) {
    await executeQuery(`DELETE FROM free_records WHERE id = ?`, [websiteId]);
  }

  return res.success;
}

/**
 * Retrieves a website record from D1
 */
async function getRecord(websiteId) {
  for (const tableName of ['premium_records', 'free_records']) {
    const res = await executeQuery(`SELECT * FROM ${tableName} WHERE id = ? LIMIT 1`, [websiteId]);
    if (res.success && res.results.length > 0) {
      const row = res.results[0];
      let meta = row.metadata;
      if (typeof meta === 'string') {
        try { meta = JSON.parse(meta); } catch (_) {}
      }
      return {
        id: row.id,
        recipientName: row.recipient_name,
        eventType: row.event_type,
        templateName: row.template_name,
        isPremium: Boolean(row.is_premium),
        views: row.views || 0,
        slug: row.slug,
        createdAt: row.created_at,
        metadata: meta
      };
    }
  }
  return null;
}

/**
 * Increments view count for a website in D1
 */
async function incrementView(websiteId) {
  for (const tableName of ['premium_records', 'free_records']) {
    const res = await executeQuery(`UPDATE ${tableName} SET views = views + 1 WHERE id = ?`, [websiteId]);
    if (res.success && res.meta?.changes > 0) {
      return true;
    }
  }
  return false;
}

/**
 * Custom Slug Management
 */
async function saveCustomSlug(slug, websiteId) {
  const sanitized = slug.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
  const sql = `
    INSERT INTO custom_slugs (slug, website_id, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT (slug) DO UPDATE SET website_id = excluded.website_id;
  `;
  const res = await executeQuery(sql, [sanitized, websiteId]);

  // Update slug reference in record tables
  await executeQuery(`UPDATE premium_records SET slug = ? WHERE id = ?`, [sanitized, websiteId]);
  await executeQuery(`UPDATE free_records SET slug = ? WHERE id = ?`, [sanitized, websiteId]);

  return res.success;
}

async function getCustomSlug(slug) {
  const sanitized = slug.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
  const res = await executeQuery(`SELECT * FROM custom_slugs WHERE slug = ? LIMIT 1`, [sanitized]);
  if (res.success && res.results.length > 0) {
    return {
      slug: res.results[0].slug,
      websiteId: res.results[0].website_id,
      createdAt: res.results[0].created_at
    };
  }
  return null;
}

async function getCustomSlugByWebsiteId(websiteId) {
  const res = await executeQuery(`SELECT * FROM custom_slugs WHERE website_id = ? LIMIT 1`, [websiteId]);
  if (res.success && res.results.length > 0) {
    return {
      slug: res.results[0].slug,
      websiteId: res.results[0].website_id,
      createdAt: res.results[0].created_at
    };
  }
  return null;
}

async function getAllCustomSlugs() {
  const res = await executeQuery(`SELECT * FROM custom_slugs`);
  return res.results || [];
}

/**
 * Payments Logging
 */
async function savePayment(paymentData) {
  const sql = `
    INSERT INTO payments (order_id, website_id, slug, plan, plan_name, amount, currency, status, payment_method, created_at, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
    ON CONFLICT (order_id) DO UPDATE SET
      status = excluded.status,
      website_id = COALESCE(NULLIF(excluded.website_id, ''), payments.website_id),
      slug = COALESCE(NULLIF(excluded.slug, ''), payments.slug),
      payment_method = COALESCE(NULLIF(excluded.payment_method, ''), payments.payment_method),
      metadata = excluded.metadata;
  `;

  const orderId = paymentData.orderId || `order_${Date.now()}`;
  const metaStr = typeof paymentData === 'object' ? JSON.stringify(paymentData || {}) : String(paymentData || '{}');

  const res = await executeQuery(sql, [
    orderId,
    paymentData.websiteId || '',
    paymentData.slug || '',
    paymentData.plan || 'starter',
    paymentData.planName || 'Starter Plan',
    paymentData.amount || 0,
    paymentData.currency || 'INR',
    paymentData.status || 'PAID',
    paymentData.paymentMethod || 'cashfree',
    metaStr
  ]);

  // Upgrade website to premium if paid
  if (paymentData.websiteId && paymentData.status === 'PAID') {
    const record = await getRecord(paymentData.websiteId);
    if (record) {
      await saveRecord(paymentData.websiteId, record.metadata, true);
    }
  }

  return res.success;
}

async function getPaymentByWebsiteId(websiteId) {
  const res = await executeQuery(`SELECT * FROM payments WHERE website_id = ? AND status = 'PAID' LIMIT 1`, [websiteId]);
  if (res.success && res.results.length > 0) {
    return res.results[0];
  }
  return null;
}

async function getPaymentByOrderId(orderId) {
  const res = await executeQuery(`SELECT * FROM payments WHERE order_id = ? LIMIT 1`, [orderId]);
  if (res.success && res.results.length > 0) {
    return res.results[0];
  }
  return null;
}

async function getAllPayments(limit = 500) {
  const res = await executeQuery(`SELECT * FROM payments ORDER BY created_at DESC LIMIT ?`, [limit]);
  return res.results || [];
}

/**
 * Fetch all websites for Admin Dashboard
 */
async function getAllWebsites() {
  const websites = [];
  for (const tableName of ['premium_records', 'free_records']) {
    const res = await executeQuery(`SELECT * FROM ${tableName} ORDER BY created_at DESC LIMIT 2000`);
    if (res.success && res.results) {
      res.results.forEach(row => {
        let meta = row.metadata;
        if (typeof meta === 'string') {
          try { meta = JSON.parse(meta); } catch (_) {}
        }
        websites.push({
          id: row.id,
          recipientName: row.recipient_name || meta?.recipientName || 'Special Recipient',
          eventType: row.event_type || meta?.eventType || 'birthday',
          templateName: row.template_name || meta?.templateName || 'birthday1',
          isPremium: Boolean(row.is_premium),
          views: row.views || 0,
          slug: row.slug,
          createdAt: row.created_at,
          metadata: meta
        });
      });
    }
  }
  return websites;
}

/**
 * Delete website records
 */
async function deleteWebsiteRecords(websiteId) {
  await executeQuery(`DELETE FROM premium_records WHERE id = ?`, [websiteId]);
  await executeQuery(`DELETE FROM free_records WHERE id = ?`, [websiteId]);
  await executeQuery(`DELETE FROM custom_slugs WHERE website_id = ?`, [websiteId]);
  await executeQuery(`DELETE FROM payments WHERE website_id = ?`, [websiteId]);
  return { success: true, websiteId };
}

async function bulkDeleteWebsiteRecords(websiteIds = []) {
  for (const id of websiteIds) {
    await deleteWebsiteRecords(id);
  }
  return { success: true, deletedCount: websiteIds.length };
}

/**
 * Telemetry no-ops (Zero-DB telemetry)
 */
async function saveEvent() { return true; }
async function saveFeedback() { return true; }
async function saveVisitor() { return true; }
async function incrementGlobalCounter() { return true; }
async function getGlobalCounters() { return {}; }
async function purgeExpiredFreeRecords() {
  const res = await executeQuery(`DELETE FROM free_records WHERE created_at < datetime('now', '-36 hours')`);
  return res.meta?.changes || 0;
}

module.exports = {
  isD1Configured,
  executeQuery,
  saveRecord,
  getRecord,
  incrementView,
  saveCustomSlug,
  getCustomSlug,
  getCustomSlugByWebsiteId,
  getAllCustomSlugs,
  savePayment,
  getPaymentByWebsiteId,
  getPaymentByOrderId,
  getAllPayments,
  getAllWebsites,
  deleteWebsiteRecords,
  bulkDeleteWebsiteRecords,
  saveEvent,
  saveFeedback,
  saveVisitor,
  incrementGlobalCounter,
  getGlobalCounters,
  purgeExpiredFreeRecords
};
