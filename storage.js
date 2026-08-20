const { createClient } = require('@supabase/supabase-js');
const cloudinary = require('cloudinary').v2;

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

    await ensureBucketPublic(client);

    const folderPrefix = isPremium ? 'premium' : 'free';
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const path = `${folderPrefix}/${Date.now()}_${cleanFileName}`;

    // Upload to Supabase Storage Bucket
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
 * Purge files older than 24h from Free Supabase Bucket (Project 1)
 */
async function purgeExpiredFreeFiles() {
  if (!supabaseFree) return;
  try {
    const { data, error } = await supabaseFree.storage.from(BUCKET_NAME).list('free');
    if (error || !data) return;

    const now = Date.now();
    const maxAgeInMs = 36 * 60 * 60 * 1000; // 36 hours buffer
    const expiredFiles = data.filter(f => {
      const timestamp = parseInt(f.name.split('_')[0], 10);
      return timestamp && (now - timestamp > maxAgeInMs);
    }).map(f => `free/${f.name}`);

    if (expiredFiles.length > 0) {
      const { error: delErr } = await supabaseFree.storage.from(BUCKET_NAME).remove(expiredFiles);
      if (!delErr) console.log(`[Supabase Free Purge] Deleted ${expiredFiles.length} expired 36h files from Project 1`);
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
      const { data } = await supabaseFree.storage.from(BUCKET_NAME).list('free');
      if (data) freeFileCount = data.length;
    } catch (e) {}
  }

  if (supabasePremium) {
    try {
      const { data } = await supabasePremium.storage.from(BUCKET_NAME).list('premium');
      if (data) premiumFileCount = data.length;
    } catch (e) {}
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

// Automatically run free storage purge every 6 hours (only in long-running container mode)
if (!process.env.VERCEL && typeof setInterval !== 'undefined') {
  setInterval(purgeExpiredFreeFiles, 6 * 60 * 60 * 1000);
}

module.exports = {
  uploadMedia,
  purgeExpiredFreeFiles,
  getSupabaseStats,
  cloudinary
};
