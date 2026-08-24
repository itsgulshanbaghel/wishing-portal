require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const cloudinary = require('cloudinary').v2;
let sharp = null;
try {
  sharp = require('sharp');
} catch (e) {
  console.warn('[Storage] sharp module not available for image compression');
}

// Legacy Cloudinary configuration (kept active for old links & fallback)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Project 1: Free Websites Supabase Client (24h auto-purged storage)
const supabaseFreeUrl = process.env.SUPABASE_FREE_URL || process.env.SUPABASE_URL_FREE || '';
const supabaseFreeKey = process.env.SUPABASE_FREE_KEY || process.env.SUPABASE_KEY_FREE || '';
const supabaseFree = (supabaseFreeUrl && supabaseFreeKey)
  ? createClient(supabaseFreeUrl, supabaseFreeKey)
  : null;

// Project 2: Premium Websites Supabase Client (Permanent storage)
const supabasePremiumUrl = process.env.SUPABASE_PREMIUM_URL || process.env.SUPABASE_URL_PREMIUM || '';
const supabasePremiumKey = process.env.SUPABASE_PREMIUM_KEY || process.env.SUPABASE_KEY_PREMIUM || '';
const supabasePremium = (supabasePremiumUrl && supabasePremiumKey)
  ? createClient(supabasePremiumUrl, supabasePremiumKey)
  : null;

const BUCKET_NAME = 'media';

/**
 * Ensures bucket exists and is set to public access on Supabase
 */
async function ensureBucketPublic(client) {
  if (!client) return;
  try {
    const { data: buckets } = await client.storage.listBuckets();
    const exists = buckets && buckets.some(b => b.name === BUCKET_NAME);
    if (!exists) {
      await client.storage.createBucket(BUCKET_NAME, { public: true });
    }
  } catch (e) {
    // Bucket likely exists or permission granted
  }
}

/**
 * Uploads media buffer or base64 string to Supabase (or Cloudinary fallback)
 * @param {Buffer|string} fileContent Buffer or base64 data URI
 * @param {string} fileName Target file name
 * @param {string} mimeType Content MIME type (e.g. 'image/jpeg', 'audio/mpeg')
 * @param {boolean} isPremium Whether website is paid premium
 * @returns {Promise<string>} Public URL of uploaded asset
 */
async function uploadMedia(fileContent, fileName, mimeType = 'image/jpeg', isPremium = false) {
  const client = isPremium ? (supabasePremium || supabaseFree) : (supabaseFree || supabasePremium);

  // If Supabase client is available, upload to Supabase Project
  if (client) {
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

    // Compress image using Sharp ONLY for Free Plan users (isPremium === false)
    if (!isPremium && sharp && mimeType && mimeType.startsWith('image/') && !mimeType.includes('svg')) {
      try {
        const compressed = await sharp(buffer)
          .resize({ width: 1200, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();
        buffer = compressed;
        mimeType = 'image/webp';
        console.log(`[Storage] Compressed free plan image "${fileName}" to WebP (80% quality)`);
      } catch (compressErr) {
        console.warn('[Storage] Sharp image compression warning:', compressErr.message);
      }
    } else if (isPremium) {
      console.log(`[Storage] Uploading uncompressed original file for Premium user: "${fileName}"`);
    }

    await ensureBucketPublic(client);

    const folderPrefix = isPremium ? 'premium' : 'free';
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9_.-]/g, '_');
    // JSON configs use stable paths (no timestamp) so they can be retrieved by ID
    // Media files (images, audio) use timestamp prefix for uniqueness
    const isJsonConfig = cleanFileName.endsWith('.json');
    const path = isJsonConfig
      ? `${folderPrefix}/${cleanFileName}`
      : `${folderPrefix}/${Date.now()}_${cleanFileName}`;

    // Upload to Supabase Storage Bucket
    const { data, error } = await client.storage
      .from(BUCKET_NAME)
      .upload(path, buffer, {
        contentType: mimeType,
        upsert: true
      });

    if (error) {
      if (error.message && error.message.includes('row-level security policy')) {
        console.warn(`[Supabase RLS Notice] (${isPremium ? 'Premium Project 2' : 'Free Project 1'}): Upload blocked by Supabase RLS policy. To allow uploads, add an INSERT policy on Supabase Dashboard -> Storage -> Policies for bucket '${BUCKET_NAME}'`);
      } else {
        console.error(`[Supabase Upload Error] (${isPremium ? 'Premium Project 2' : 'Free Project 1'}):`, error.message);
      }
      throw error;
    }

    // Get public URL
    const { data: urlData } = client.storage
      .from(BUCKET_NAME)
      .getPublicUrl(path);

    console.log(`[Supabase Upload Success] (${isPremium ? 'Premium Project 2' : 'Free Project 1'}):`, urlData.publicUrl);
    return urlData.publicUrl;
  }

  // Fallback to Cloudinary if Supabase credentials are not configured yet
  console.log('[Storage Fallback] Supabase credentials not configured, uploading to Cloudinary...');
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
 * Purge ALL files older than 36h from Free Supabase Bucket (Project 1)
 * Deletes JSON configs, images, audio — every file type in the free/ folder.
 * Uses Supabase file metadata (created_at) rather than filename timestamps.
 */
async function purgeExpiredFreeFiles() {
  if (!supabaseFree) return;
  try {
    const { data, error } = await supabaseFree.storage.from(BUCKET_NAME).list('free', { limit: 1000 });
    if (error || !data) return;

    const now = Date.now();
    const maxAgeMs = 36 * 60 * 60 * 1000; // 36 hours

    const expiredFiles = data.filter(f => {
      // Use Supabase created_at metadata (ISO string) if available
      if (f.created_at) {
        const fileAge = now - new Date(f.created_at).getTime();
        return fileAge > maxAgeMs;
      }
      // Fallback: try to parse timestamp prefix from filename (legacy)
      const timestamp = parseInt(f.name.split('_')[0], 10);
      return timestamp && (now - timestamp > maxAgeMs);
    }).map(f => `free/${f.name}`);

    if (expiredFiles.length > 0) {
      const { error: delErr } = await supabaseFree.storage.from(BUCKET_NAME).remove(expiredFiles);
      if (!delErr) {
        console.log(`[Supabase Free Purge] Deleted ${expiredFiles.length} expired files (>36h) from Project 1 (free/)`);
      } else {
        console.error('[Supabase Free Purge Error]:', delErr.message);
      }
    } else {
      console.log('[Supabase Free Purge] No expired files found in free/ folder');
    }
  } catch (e) {
    console.error('[Supabase Free Purge Error]:', e.message);
  }
}

/**
 * Get Supabase Storage statistics (Project 1 Free vs Project 2 Premium) for Admin Panel
 */
async function getSupabaseStats() {
  const freeConfigured = !!supabaseFree;
  const premiumConfigured = !!supabasePremium;

  let freeFileCount = 0;
  let premiumFileCount = 0;

  if (supabaseFree) {
    try {
      const { data } = await supabaseFree.storage.from(BUCKET_NAME).list('free', { limit: 5000 });
      if (data) freeFileCount = data.length;
    } catch (e) { }
  }

  if (supabasePremium) {
    try {
      const { data } = await supabasePremium.storage.from(BUCKET_NAME).list('premium', { limit: 5000 });
      if (data) premiumFileCount = data.length;
    } catch (e) { }
  }

  return {
    configured: freeConfigured || premiumConfigured,
    freeProject: freeConfigured ? 'Project 1 (greeter-free)' : 'Not Configured',
    premiumProject: premiumConfigured ? 'Project 2 (greeter-premium)' : 'Not Configured',
    freeFilesCount: freeFileCount,
    premiumFilesCount: premiumFileCount,
    totalFilesCount: freeFileCount + premiumFileCount
  };
}

/**
 * List all website JSON configs stored in Supabase Project 1 (Free) and Project 2 (Premium)
 */
async function listSupabaseWebsites() {
  const websites = [];
  if (supabaseFree) {
    try {
      const { data } = await supabaseFree.storage.from(BUCKET_NAME).list('free', { limit: 5000, sortBy: { column: 'created_at', order: 'desc' } });
      if (data) {
        data.filter(f => f.name.endsWith('.json')).forEach(f => {
          websites.push({
            id: f.name.replace('.json', ''),
            isPremium: false,
            createdAt: f.created_at || f.updated_at || new Date().toISOString()
          });
        });
      }
    } catch (e) { }
  }

  if (supabasePremium) {
    try {
      const { data } = await supabasePremium.storage.from(BUCKET_NAME).list('premium', { limit: 5000, sortBy: { column: 'created_at', order: 'desc' } });
      if (data) {
        data.filter(f => f.name.endsWith('.json')).forEach(f => {
          websites.push({
            id: f.name.replace('.json', ''),
            isPremium: true,
            createdAt: f.created_at || f.updated_at || new Date().toISOString()
          });
        });
      }
    } catch (e) { }
  }
  return websites;
}

/**
 * Reads website JSON config directly from Supabase Storage (Project 1 or Project 2)
 */
async function readWebsiteConfig(id) {
  const fileName = id.endsWith('.json') ? id : `${id}.json`;

  // Try Supabase Premium first
  if (supabasePremium) {
    try {
      const { data, error } = await supabasePremium.storage.from(BUCKET_NAME).download(`premium/${fileName}`);
      if (data && !error) {
        const text = await data.text();
        return JSON.parse(text);
      }
    } catch (e) { }
  }

  // Try Supabase Free
  if (supabaseFree) {
    try {
      const { data, error } = await supabaseFree.storage.from(BUCKET_NAME).download(`free/${fileName}`);
      if (data && !error) {
        const text = await data.text();
        return JSON.parse(text);
      }
    } catch (e) { }
  }

  return null;
}

/**
 * List all Supabase files (configs, photos, audio) in Free and Premium buckets with detailed metadata
 */
async function listSupabaseFilesDetailed() {
  const files = [];
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
            project: 'Free (Project 1)',
            isPremium: false
          });
        });
      }
    } catch (e) {
      console.warn('[Storage] listSupabaseFilesDetailed free error:', e.message);
    }
  }

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
            project: 'Premium (Project 2)',
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
 * Delete a website JSON config and associated media from Supabase Storage
 */
async function deleteWebsiteConfig(id) {
  if (!id) return { freeDeleted: false, premiumDeleted: false };
  const rawId = id.replace(/\.json$/, '');
  const fileName = `${rawId}.json`;
  const results = { freeDeleted: false, premiumDeleted: false };

  const pathsToRemove = [
    `free/${fileName}`,
    `premium/${fileName}`,
    fileName,
    `free/${rawId}`,
    `premium/${rawId}`,
    rawId
  ];

  if (supabaseFree) {
    try {
      const { error } = await supabaseFree.storage.from(BUCKET_NAME).remove(pathsToRemove);
      if (!error) results.freeDeleted = true;
    } catch (e) {}
  }

  if (supabasePremium) {
    try {
      const { error } = await supabasePremium.storage.from(BUCKET_NAME).remove(pathsToRemove);
      if (!error) results.premiumDeleted = true;
    } catch (e) {}
  }

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
  cloudinary
};
