require('dotenv').config();
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { createClient } = require('@supabase/supabase-js');
const cloudinary = require('cloudinary').v2;
let sharp = null;
try {
  sharp = require('sharp');
} catch (e) {
  console.warn('[Storage] sharp module not available for image compression');
}

// ─────────────────────────────────────────────────────────────
// Storage Providers Configuration
// ─────────────────────────────────────────────────────────────

// 1. Cloudflare R2 Storage Client (Primary Engine - Zero Egress Fees)
const r2AccountId = process.env.R2_ACCOUNT_ID || '';
const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID || '';
const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY || '';
const R2_BUCKET = process.env.R2_BUCKET_NAME || 'greeter-media';
const R2_PUBLIC_BASE_URL = (process.env.R2_PUBLIC_URL || '').replace(/\/+$/, '');

const r2Client = (r2AccountId && r2AccessKeyId && r2SecretAccessKey)
  ? new S3Client({
      region: 'auto',
      endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: r2AccessKeyId,
        secretAccessKey: r2SecretAccessKey
      }
    })
  : null;

if (r2Client) {
  console.log(`[Storage] Cloudflare R2 client initialized (Bucket: ${R2_BUCKET}, Public CDN: ${R2_PUBLIC_BASE_URL || 'Direct R2 URL'})`);
} else {
  console.log('[Storage] Cloudflare R2 credentials not detected in .env, falling back to Supabase / Cloudinary');
}

// 2. Legacy Cloudinary configuration (kept active for old links & emergency fallback)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 3. Project 1: Free Websites Supabase Client (Legacy fallback)
const supabaseFreeUrl = process.env.SUPABASE_FREE_URL || process.env.SUPABASE_URL_FREE || '';
const supabaseFreeKey = process.env.SUPABASE_FREE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_FREE_KEY || process.env.SUPABASE_KEY_FREE || '';
const supabaseFree = (supabaseFreeUrl && supabaseFreeKey)
  ? createClient(supabaseFreeUrl, supabaseFreeKey)
  : null;

// 4. Project 2: Premium Websites Supabase Client (Legacy fallback)
const supabasePremiumUrl = process.env.SUPABASE_PREMIUM_URL || process.env.SUPABASE_URL_PREMIUM || '';
const supabasePremiumKey = process.env.SUPABASE_PREMIUM_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PREMIUM_KEY || process.env.SUPABASE_KEY_PREMIUM || '';
const supabasePremium = (supabasePremiumUrl && supabasePremiumKey)
  ? createClient(supabasePremiumUrl, supabasePremiumKey)
  : null;

const BUCKET_NAME = 'media';
const verifiedBuckets = new WeakSet();

/**
 * Ensures bucket exists and is set to public access on Supabase (cached to avoid redundant network calls)
 */
async function ensureBucketPublic(client) {
  if (!client || verifiedBuckets.has(client)) return;
  try {
    const { data: buckets } = await client.storage.listBuckets();
    const exists = buckets && buckets.some(b => b.name === BUCKET_NAME);
    if (!exists) {
      await client.storage.createBucket(BUCKET_NAME, { public: true });
    }
    verifiedBuckets.add(client);
  } catch (e) {
    verifiedBuckets.add(client);
  }
}

/**
 * Helper to construct public URL for an R2 key
 */
function getR2PublicUrl(key) {
  if (R2_PUBLIC_BASE_URL) {
    return `${R2_PUBLIC_BASE_URL}/${key}`;
  }
  if (r2AccountId) {
    return `https://${r2AccountId}.r2.cloudflarestorage.com/${R2_BUCKET}/${key}`;
  }
  return `https://${R2_BUCKET}.r2.cloudflarestorage.com/${key}`;
}

/**
 * Safe stream to string converter for AWS S3 / R2 GetObject response bodies
 */
async function streamToString(stream) {
  if (!stream) return '';
  if (typeof stream.transformToString === 'function') {
    return await stream.transformToString('utf-8');
  }
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', chunk => chunks.push(Buffer.from(chunk)));
    stream.on('error', err => reject(err));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
  });
}

/**
 * List objects from Cloudflare R2 bucket with prefix
 */
async function listR2Objects(prefix = '') {
  if (!r2Client) return [];
  const objects = [];
  let continuationToken = undefined;
  try {
    do {
      const cmd = new ListObjectsV2Command({
        Bucket: R2_BUCKET,
        Prefix: prefix,
        ContinuationToken: continuationToken,
        MaxKeys: 1000
      });
      const res = await r2Client.send(cmd);
      if (res.Contents && Array.isArray(res.Contents)) {
        objects.push(...res.Contents);
      }
      continuationToken = res.NextContinuationToken;
    } while (continuationToken && objects.length < 5000);
  } catch (e) {
    console.warn(`[Cloudflare R2] List error (prefix "${prefix}"):`, e.message);
  }
  return objects;
}

/**
 * Uploads media buffer or base64 string to Cloudflare R2 (with Supabase and Cloudinary fallback)
 * @param {Buffer|string} fileContent Buffer or base64 data URI
 * @param {string} fileName Target file name
 * @param {string} mimeType Content MIME type (e.g. 'image/jpeg', 'audio/mpeg', 'application/json')
 * @param {boolean} isPremium Whether website is paid premium
 * @returns {Promise<string>} Public URL of uploaded asset
 */
async function uploadMedia(fileContent, fileName, mimeType = 'image/jpeg', isPremium = false) {
  let buffer;
  if (Buffer.isBuffer(fileContent)) {
    buffer = fileContent;
  } else if (typeof fileContent === 'string' && fileContent.startsWith('data:')) {
    const base64Data = fileContent.replace(/^data:[^;]+;base64,/, '');
    buffer = Buffer.from(base64Data, 'base64');
  } else if (typeof fileContent === 'string') {
    buffer = Buffer.from(fileContent, 'base64');
  } else {
    throw new Error('Invalid file content provided for upload');
  }

  // Smart image compression using Sharp for all image uploads (max 1280px, auto-rotated WebP)
  if (sharp && mimeType && mimeType.startsWith('image/') && !mimeType.includes('svg')) {
    try {
      const compressed = await sharp(buffer)
        .rotate() // Auto-orient based on EXIF
        .resize({ width: 1280, height: 1280, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82, effort: 4 })
        .toBuffer();
      buffer = compressed;
      mimeType = 'image/webp';
      console.log(`[Storage] Compressed image "${fileName}" to WebP (1280px max, 82% quality)`);
    } catch (compressErr) {
      console.warn('[Storage] Sharp image compression warning:', compressErr.message);
    }
  }

  const folderPrefix = isPremium ? 'premium' : 'free';
  const cleanFileName = fileName.replace(/[^a-zA-Z0-9_.-]/g, '_');
  const isJsonConfig = cleanFileName.endsWith('.json');
  const path = isJsonConfig
    ? `${folderPrefix}/${cleanFileName}`
    : `${folderPrefix}/${Date.now()}_${cleanFileName}`;

  // 1. PRIMARY: Cloudflare R2 Storage (Zero egress bandwidth fees)
  if (r2Client) {
    try {
      const cacheControl = isJsonConfig
        ? 'public, max-age=60, s-maxage=60'
        : 'public, max-age=31536000, immutable';

      const putCmd = new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: path,
        Body: buffer,
        ContentType: mimeType,
        CacheControl: cacheControl
      });

      await r2Client.send(putCmd);
      const publicUrl = getR2PublicUrl(path);
      console.log(`[Cloudflare R2 Upload Success] (${isPremium ? 'Premium' : 'Free'}): ${publicUrl}`);
      return publicUrl;
    } catch (r2Err) {
      console.error('[Cloudflare R2 Upload Error]:', r2Err.message);
      console.warn('[Storage Fallback] Attempting fallback to secondary storage...');
    }
  }

  // 2. SECONDARY: Supabase Storage Projects (Legacy Fallback)
  const client = isPremium ? (supabasePremium || supabaseFree) : (supabaseFree || supabasePremium);
  if (client) {
    try {
      await ensureBucketPublic(client);
      const { data, error } = await client.storage
        .from(BUCKET_NAME)
        .upload(path, buffer, {
          contentType: mimeType,
          upsert: true
        });

      if (error) {
        console.error(`[Supabase Upload Error] (${isPremium ? 'Premium Project 2' : 'Free Project 1'}):`, error.message);
        throw error;
      }

      const { data: urlData } = client.storage
        .from(BUCKET_NAME)
        .getPublicUrl(path);

      console.log(`[Supabase Upload Success] (${isPremium ? 'Premium Project 2' : 'Free Project 1'}):`, urlData.publicUrl);
      return urlData.publicUrl;
    } catch (supaErr) {
      console.error('[Supabase Storage Upload Error]:', supaErr.message);
    }
  }

  // 3. TERTIARY: Cloudinary fallback
  console.log('[Storage Fallback] Uploading to Cloudinary fallback...');
  let uploadStr = fileContent;
  if (Buffer.isBuffer(fileContent)) {
    uploadStr = `data:${mimeType};base64,${fileContent.toString('base64')}`;
  }

  const isAudio = mimeType.startsWith('audio');
  const res = await cloudinary.uploader.upload(uploadStr, {
    resource_type: isAudio ? 'video' : 'auto',
    folder: isPremium ? 'premium_media' : 'free_media'
  });

  return res.secure_url;
}

/**
 * Purge ALL files older than 36h from Free Storage (R2 and Supabase Project 1)
 * Deletes JSON configs, images, audio in the free/ folder.
 */
async function purgeExpiredFreeFiles() {
  const now = Date.now();
  const maxAgeMs = 36 * 60 * 60 * 1000; // 36 hours

  // 1. Purge expired files from Cloudflare R2
  if (r2Client) {
    try {
      const freeObjects = await listR2Objects('free/');
      const expiredR2 = freeObjects.filter(obj => {
        if (!obj.Key || obj.Key === 'free/' || obj.Key.endsWith('/')) return false;
        if (obj.LastModified) {
          return (now - new Date(obj.LastModified).getTime()) > maxAgeMs;
        }
        const fname = obj.Key.replace(/^free\//, '');
        const timestamp = parseInt(fname.split('_')[0], 10);
        return timestamp && (now - timestamp > maxAgeMs);
      });

      if (expiredR2.length > 0) {
        for (const item of expiredR2) {
          try {
            await r2Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: item.Key }));
          } catch (_) {}
        }
        console.log(`[Cloudflare R2 Free Purge] Purged ${expiredR2.length} expired files (>36h) from free/`);
      }
    } catch (e) {
      console.error('[Cloudflare R2 Free Purge Error]:', e.message);
    }
  }

  // 2. Purge expired files from Supabase Free Project 1
  if (supabaseFree) {
    try {
      const { data, error } = await supabaseFree.storage.from(BUCKET_NAME).list('free', { limit: 1000 });
      if (!error && data) {
        const expiredFiles = data.filter(f => {
          if (f.name.startsWith('.')) return false;
          if (f.created_at) {
            return (now - new Date(f.created_at).getTime()) > maxAgeMs;
          }
          const timestamp = parseInt(f.name.split('_')[0], 10);
          return timestamp && (now - timestamp > maxAgeMs);
        });

        if (expiredFiles.length > 0) {
          const filePaths = expiredFiles.map(f => `free/${f.name}`);
          try {
            await supabaseFree.storage.from(BUCKET_NAME).remove(filePaths);
          } catch (_) {}
          console.log(`[Supabase Free Purge] Successfully purged ${expiredFiles.length} expired files (>36h) from Project 1 (free/)`);
        }
      }
    } catch (e) {
      console.error('[Supabase Free Purge Error]:', e.message);
    }
  }
}

/**
 * Get Storage statistics (Cloudflare R2 + Supabase Free/Premium) for Admin Panel
 */
async function getSupabaseStats() {
  const r2Configured = !!r2Client;
  const freeConfigured = !!supabaseFree;
  const premiumConfigured = !!supabasePremium;

  let r2FreeCount = 0;
  let r2PremCount = 0;
  let supaFreeCount = 0;
  let supaPremCount = 0;

  if (r2Client) {
    try {
      const freeObjs = await listR2Objects('free/');
      const premObjs = await listR2Objects('premium/');
      r2FreeCount = freeObjs.length;
      r2PremCount = premObjs.length;
    } catch (e) {
      console.warn('[Storage] R2 stats error:', e.message);
    }
  }

  if (supabaseFree) {
    try {
      const { data } = await supabaseFree.storage.from(BUCKET_NAME).list('free', { limit: 5000 });
      if (data) supaFreeCount = data.length;
    } catch (e) { }
  }

  if (supabasePremium) {
    try {
      const { data } = await supabasePremium.storage.from(BUCKET_NAME).list('premium', { limit: 5000 });
      if (data) supaPremCount = data.length;
    } catch (e) { }
  }

  const totalFree = r2FreeCount + supaFreeCount;
  const totalPrem = r2PremCount + supaPremCount;
  const totalAll = totalFree + totalPrem;

  return {
    configured: r2Configured || freeConfigured || premiumConfigured,
    storageEngine: r2Configured ? 'Cloudflare R2 (S3 API)' : (premiumConfigured || freeConfigured ? 'Supabase' : 'Cloudinary'),
    r2Configured,
    r2Bucket: R2_BUCKET,
    freeProject: r2Configured ? `Cloudflare R2 (${R2_BUCKET}/free)` : (freeConfigured ? 'Project 1 (greeter-free)' : 'Not Configured'),
    premiumProject: r2Configured ? `Cloudflare R2 (${R2_BUCKET}/premium)` : (premiumConfigured ? 'Project 2 (greeter-premium)' : 'Not Configured'),
    freeFilesCount: totalFree,
    premiumFilesCount: totalPrem,
    totalFilesCount: totalAll,
    r2FilesCount: r2FreeCount + r2PremCount,
    supabaseFilesCount: supaFreeCount + supaPremCount
  };
}

/**
 * List all website JSON configs stored across Cloudflare R2 and Supabase
 */
async function listSupabaseWebsites() {
  const websitesMap = new Map();

  // 1. List from Cloudflare R2
  if (r2Client) {
    try {
      const freeObjs = await listR2Objects('free/');
      freeObjs.filter(f => f.Key && f.Key.endsWith('.json')).forEach(f => {
        const id = f.Key.replace(/^free\//, '').replace('.json', '');
        websitesMap.set(id, {
          id,
          isPremium: false,
          createdAt: f.LastModified ? new Date(f.LastModified).toISOString() : new Date().toISOString(),
          source: 'Cloudflare R2 (Free)'
        });
      });

      const premObjs = await listR2Objects('premium/');
      premObjs.filter(f => f.Key && f.Key.endsWith('.json')).forEach(f => {
        const id = f.Key.replace(/^premium\//, '').replace('.json', '');
        websitesMap.set(id, {
          id,
          isPremium: true,
          createdAt: f.LastModified ? new Date(f.LastModified).toISOString() : new Date().toISOString(),
          source: 'Cloudflare R2 (Premium)'
        });
      });
    } catch (e) {
      console.warn('[Storage] list websites from R2 error:', e.message);
    }
  }

  // 2. List from Supabase Free
  if (supabaseFree) {
    try {
      const { data } = await supabaseFree.storage.from(BUCKET_NAME).list('free', { limit: 5000, sortBy: { column: 'created_at', order: 'desc' } });
      if (data) {
        data.filter(f => f.name.endsWith('.json') && !f.name.startsWith('.')).forEach(f => {
          const id = f.name.replace('.json', '');
          if (!websitesMap.has(id)) {
            websitesMap.set(id, {
              id,
              isPremium: false,
              createdAt: f.created_at || f.updated_at || new Date().toISOString(),
              source: 'Supabase Free (Project 1)'
            });
          }
        });
      }
    } catch (e) { }
  }

  // 3. List from Supabase Premium
  if (supabasePremium) {
    try {
      const { data } = await supabasePremium.storage.from(BUCKET_NAME).list('premium', { limit: 5000, sortBy: { column: 'created_at', order: 'desc' } });
      if (data) {
        data.filter(f => f.name.endsWith('.json') && !f.name.startsWith('.')).forEach(f => {
          const id = f.name.replace('.json', '');
          if (!websitesMap.has(id)) {
            websitesMap.set(id, {
              id,
              isPremium: true,
              createdAt: f.created_at || f.updated_at || new Date().toISOString(),
              source: 'Supabase Premium (Project 2)'
            });
          }
        });
      }
    } catch (e) { }
  }

  return Array.from(websitesMap.values());
}

/**
 * Reads website JSON config: tries Cloudflare R2 first, then falls back to Supabase Premium & Free
 */
async function readWebsiteConfig(id) {
  if (!id) return null;
  const cleanId = String(id).replace(/\.json$/i, '').trim();
  const fileName = `${cleanId}.json`;

  // 1. Check Cloudflare R2 (Premium folder first, then Free folder)
  if (r2Client) {
    for (const folder of ['premium', 'free']) {
      try {
        const cmd = new GetObjectCommand({
          Bucket: R2_BUCKET,
          Key: `${folder}/${fileName}`
        });
        const res = await r2Client.send(cmd);
        if (res.Body) {
          const text = await streamToString(res.Body);
          const parsed = JSON.parse(text);
          if (parsed && !parsed.deleted && !parsed.isDeleted) {
            return parsed;
          }
        }
      } catch (e) {
        // Not found in this folder or NoSuchKey, proceed
      }
    }
  }

  // 2. Check Supabase Premium (Project 2)
  if (supabasePremium) {
    try {
      const { data, error } = await supabasePremium.storage.from(BUCKET_NAME).download(`premium/${fileName}`);
      if (data && !error) {
        const text = await data.text();
        const parsed = JSON.parse(text);
        if (parsed && !parsed.deleted && !parsed.isDeleted) {
          return parsed;
        }
      }
    } catch (e) { }
  }

  // 3. Check Supabase Free (Project 1)
  if (supabaseFree) {
    try {
      const { data, error } = await supabaseFree.storage.from(BUCKET_NAME).download(`free/${fileName}`);
      if (data && !error) {
        const text = await data.text();
        const parsed = JSON.parse(text);
        if (parsed && !parsed.deleted && !parsed.isDeleted) {
          return parsed;
        }
      }
    } catch (e) { }
  }

  return null;
}

/**
 * List all files (configs, photos, audio) across Cloudflare R2 and Supabase with detailed metadata
 */
async function listSupabaseFilesDetailed() {
  const files = [];

  // 1. Files from Cloudflare R2
  if (r2Client) {
    try {
      const freeObjs = await listR2Objects('free/');
      freeObjs.forEach(f => {
        if (!f.Key || f.Key.endsWith('/')) return;
        const name = f.Key.replace(/^free\//, '');
        files.push({
          publicId: f.Key,
          name: name,
          url: getR2PublicUrl(f.Key),
          createdAt: f.LastModified ? new Date(f.LastModified).toISOString() : new Date().toISOString(),
          bytes: f.Size || 0,
          project: 'Cloudflare R2 (Free)',
          isPremium: false
        });
      });

      const premObjs = await listR2Objects('premium/');
      premObjs.forEach(f => {
        if (!f.Key || f.Key.endsWith('/')) return;
        const name = f.Key.replace(/^premium\//, '');
        files.push({
          publicId: f.Key,
          name: name,
          url: getR2PublicUrl(f.Key),
          createdAt: f.LastModified ? new Date(f.LastModified).toISOString() : new Date().toISOString(),
          bytes: f.Size || 0,
          project: 'Cloudflare R2 (Premium)',
          isPremium: true
        });
      });
    } catch (e) {
      console.warn('[Storage] listSupabaseFilesDetailed R2 error:', e.message);
    }
  }

  // 2. Files from Supabase Free
  if (supabaseFree) {
    try {
      const { data } = await supabaseFree.storage.from(BUCKET_NAME).list('free', { limit: 5000, sortBy: { column: 'created_at', order: 'desc' } });
      if (data) {
        data.forEach(f => {
          const { data: urlData } = supabaseFree.storage.from(BUCKET_NAME).getPublicUrl(`free/${f.name}`);
          files.push({
            publicId: `free/${f.name}`,
            name: f.name,
            url: urlData?.publicUrl || '',
            createdAt: f.created_at || f.updated_at || new Date().toISOString(),
            bytes: f.metadata?.size || f.size || 0,
            project: 'Supabase Free (Project 1)',
            isPremium: false
          });
        });
      }
    } catch (e) {
      console.warn('[Storage] listSupabaseFilesDetailed free error:', e.message);
    }
  }

  // 3. Files from Supabase Premium
  if (supabasePremium) {
    try {
      const { data } = await supabasePremium.storage.from(BUCKET_NAME).list('premium', { limit: 5000, sortBy: { column: 'created_at', order: 'desc' } });
      if (data) {
        data.forEach(f => {
          const { data: urlData } = supabasePremium.storage.from(BUCKET_NAME).getPublicUrl(`premium/${f.name}`);
          files.push({
            publicId: `premium/${f.name}`,
            name: f.name,
            url: urlData?.publicUrl || '',
            createdAt: f.created_at || f.updated_at || new Date().toISOString(),
            bytes: f.metadata?.size || f.size || 0,
            project: 'Supabase Premium (Project 2)',
            isPremium: true
          });
        });
      }
    } catch (e) {
      console.warn('[Storage] listSupabaseFilesDetailed premium error:', e.message);
    }
  }

  return files.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * Delete a website JSON config and all associated media (images, audio, QR codes, OG images)
 * from Cloudflare R2 and Supabase Storage
 */
async function deleteWebsiteConfig(id) {
  if (!id) return { r2Deleted: false, freeDeleted: false, premiumDeleted: false, deleted: false, mediaFilesPurged: 0 };
  const rawId = String(id).replace(/\.json$/i, '').trim();
  const fileName = `${rawId}.json`;
  const results = { r2Deleted: false, freeDeleted: false, premiumDeleted: false, deleted: false, mediaFilesPurged: 0 };

  // 1. Inspect the website config to discover any uploaded photos, images, or audio files
  const referencedMediaFiles = new Set();
  try {
    const config = await readWebsiteConfig(rawId);
    if (config) {
      const configStr = typeof config === 'string' ? config : JSON.stringify(config);
      // Regex to find media paths in URLs or relative paths: free/<file> or premium/<file>
      const mediaMatches = configStr.matchAll(/(?:storage\/v1\/object\/public\/media\/|media\/|https?:\/\/[^\/]+\/)?(free|premium)\/([a-zA-Z0-9_.-]+\.(?:png|jpg|jpeg|webp|gif|svg|mp3|wav|ogg|m4a|mp4|webm|json))/gi);
      for (const m of mediaMatches) {
        const folder = m[1].toLowerCase();
        const fname = m[2];
        if (fname !== fileName && fname !== `${rawId}.json`) {
          referencedMediaFiles.add(`${folder}/${fname}`);
        }
      }
    }
  } catch (readErr) {
    console.warn(`[Storage] Could not pre-read config for media extraction (${rawId}):`, readErr.message);
  }

  // 2. Delete from Cloudflare R2
  if (r2Client) {
    for (const folder of ['free', 'premium']) {
      // Delete JSON config
      try {
        await r2Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: `${folder}/${fileName}` }));
        results.r2Deleted = true;
      } catch (_) {}
      try {
        await r2Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: `${folder}/${rawId}` }));
      } catch (_) {}

      // Search & purge associated assets (e.g. qr_*, og_*) matching rawId
      try {
        const objs = await listR2Objects(`${folder}/`);
        const matchingAssets = objs.filter(o => o.Key && o.Key.includes(rawId) && o.Key !== `${folder}/${fileName}`);
        for (const asset of matchingAssets) {
          try {
            await r2Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: asset.Key }));
            results.mediaFilesPurged++;
          } catch (_) {}
        }
      } catch (_) {}
    }

    // Delete any directly referenced media files on R2
    for (const mediaPath of referencedMediaFiles) {
      try {
        await r2Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: mediaPath }));
        results.mediaFilesPurged++;
      } catch (_) {}
    }
  }

  // 3. Helper to remove or move a specific file from a Supabase client
  async function purgeSingleFile(client, filePath) {
    if (!client || !filePath) return false;
    let purged = false;
    try {
      const { data, error } = await client.storage.from(BUCKET_NAME).remove([filePath]);
      if (!error && Array.isArray(data) && data.length > 0) {
        purged = true;
      }
    } catch (_) {}

    if (!purged) {
      try {
        const parts = filePath.split('/');
        const fname = parts[parts.length - 1];
        const destPath = `deleted/${Date.now()}_${fname}`;
        const { error: moveErr } = await client.storage.from(BUCKET_NAME).move(filePath, destPath);
        if (!moveErr) {
          purged = true;
          try { await client.storage.from(BUCKET_NAME).remove([destPath]); } catch (_) {}
        }
      } catch (_) {}
    }
    return purged;
  }

  // 4. Helper to purge all config files and assets in a specific Supabase bucket folder
  async function purgeFromSupabase(client, folder) {
    if (!client) return false;
    let deleted = false;
    const sourcePath = `${folder}/${fileName}`;
    const destPath = `deleted/${Date.now()}_${rawId}.json`;

    try {
      const { data, error } = await client.storage.from(BUCKET_NAME).remove([
        sourcePath,
        `${folder}/${rawId}`,
        fileName,
        rawId
      ]);
      if (!error && Array.isArray(data) && data.length > 0) {
        deleted = true;
      }
    } catch (e) {}

    if (!deleted) {
      try {
        const { error: moveErr } = await client.storage.from(BUCKET_NAME).move(sourcePath, destPath);
        if (!moveErr) {
          deleted = true;
          try { await client.storage.from(BUCKET_NAME).remove([destPath]); } catch (_) {}
        }
      } catch (moveErr) {}
    }

    try {
      const { data: assetFiles } = await client.storage.from(BUCKET_NAME).list(folder, { search: rawId });
      if (assetFiles && Array.isArray(assetFiles) && assetFiles.length > 0) {
        for (const asset of assetFiles) {
          const assetPath = `${folder}/${asset.name}`;
          const didPurge = await purgeSingleFile(client, assetPath);
          if (didPurge) results.mediaFilesPurged++;
        }
      }
    } catch (_) {}

    return deleted;
  }

  // Purge referenced media files in Supabase
  for (const mediaPath of referencedMediaFiles) {
    const isPremFolder = mediaPath.startsWith('premium/');
    const targetClient = isPremFolder ? (supabasePremium || supabaseFree) : (supabaseFree || supabasePremium);
    const didPurge = await purgeSingleFile(targetClient, mediaPath);
    if (didPurge) results.mediaFilesPurged++;
  }

  const [freeDel, premDel] = await Promise.all([
    purgeFromSupabase(supabaseFree, 'free'),
    purgeFromSupabase(supabasePremium, 'premium')
  ]);

  results.freeDeleted = freeDel;
  results.premiumDeleted = premDel;
  results.deleted = results.r2Deleted || freeDel || premDel;
  return results;
}

// Automatically run free storage purge every 6 hours (only in long-running container mode)
if (!process.env.VERCEL && typeof setInterval !== 'undefined') {
  setInterval(purgeExpiredFreeFiles, 6 * 60 * 60 * 1000);
}

module.exports = {
  uploadMedia,
  purgeExpiredFreeFiles,
  getSupabaseStats,
  listSupabaseWebsites,
  listSupabaseFilesDetailed,
  readWebsiteConfig,
  deleteWebsiteConfig,
  cloudinary,
  r2Client
};
