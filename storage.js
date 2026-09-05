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
const supabaseFreeKey = process.env.SUPABASE_FREE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_FREE_KEY || process.env.SUPABASE_KEY_FREE || '';
const supabaseFree = (supabaseFreeUrl && supabaseFreeKey)
  ? createClient(supabaseFreeUrl, supabaseFreeKey)
  : null;

// Project 2: Premium Websites Supabase Client (Permanent storage)
const supabasePremiumUrl = process.env.SUPABASE_PREMIUM_URL || process.env.SUPABASE_URL_PREMIUM || '';
const supabasePremiumKey = process.env.SUPABASE_PREMIUM_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PREMIUM_KEY || process.env.SUPABASE_KEY_PREMIUM || '';
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

    // Smart image compression using Sharp for all image uploads (max 1920px, high quality WebP)
    if (sharp && mimeType && mimeType.startsWith('image/') && !mimeType.includes('svg')) {
      try {
        const compressed = await sharp(buffer)
          .resize({ width: 1920, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 85 })
          .toBuffer();
        buffer = compressed;
        mimeType = 'image/webp';
        console.log(`[Storage] Compressed image "${fileName}" to WebP (1920px max, 85% quality)`);
      } catch (compressErr) {
        console.warn('[Storage] Sharp image compression warning:', compressErr.message);
      }
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
      // Ignore hidden or dot files
      if (f.name.startsWith('.')) return false;
      // Use Supabase created_at metadata (ISO string) if available
      if (f.created_at) {
        const fileAge = now - new Date(f.created_at).getTime();
        return fileAge > maxAgeMs;
      }
      // Fallback: try to parse timestamp prefix from filename (legacy)
      const timestamp = parseInt(f.name.split('_')[0], 10);
      return timestamp && (now - timestamp > maxAgeMs);
    });

    if (expiredFiles.length > 0) {
      const filePaths = expiredFiles.map(f => `free/${f.name}`);
      let removedCount = 0;
      try {
        const { data: rmData, error: delErr } = await supabaseFree.storage.from(BUCKET_NAME).remove(filePaths);
        if (!delErr && Array.isArray(rmData) && rmData.length > 0) {
          removedCount = rmData.length;
        }
      } catch (rmEx) {}

      // If remove was blocked by RLS or incomplete, move remaining expired files to deleted/
      if (removedCount < expiredFiles.length) {
        for (const file of expiredFiles) {
          try {
            await supabaseFree.storage.from(BUCKET_NAME).move(`free/${file.name}`, `deleted/${Date.now()}_${file.name}`);
          } catch (_) {}
        }
      }
      console.log(`[Supabase Free Purge] Successfully purged/moved ${expiredFiles.length} expired files (>36h) from Project 1 (free/)`);
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
        data.filter(f => f.name.endsWith('.json') && !f.name.startsWith('.')).forEach(f => {
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
        data.filter(f => f.name.endsWith('.json') && !f.name.startsWith('.')).forEach(f => {
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
  if (!id) return null;
  const cleanId = String(id).replace(/\.json$/i, '').trim();
  const fileName = `${cleanId}.json`;

  // Try Supabase Premium first
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

  // Try Supabase Free
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
 * Delete a website JSON config and all associated media (images, audio, QR codes, OG images) from Supabase Storage
 */
async function deleteWebsiteConfig(id) {
  if (!id) return { freeDeleted: false, premiumDeleted: false, deleted: false, mediaFilesPurged: 0 };
  const rawId = String(id).replace(/\.json$/i, '').trim();
  const fileName = `${rawId}.json`;
  const results = { freeDeleted: false, premiumDeleted: false, deleted: false, mediaFilesPurged: 0 };

  // 1. Inspect the website config to discover any uploaded photos, images, or audio files
  const referencedMediaFiles = new Set();
  try {
    const config = await readWebsiteConfig(rawId);
    if (config) {
      const configStr = typeof config === 'string' ? config : JSON.stringify(config);
      // Regex to find media paths in Supabase Storage URLs or relative paths: free/<file> or premium/<file>
      const mediaMatches = configStr.matchAll(/(?:storage\/v1\/object\/public\/media\/|media\/)?(free|premium)\/([a-zA-Z0-9_.-]+\.(?:png|jpg|jpeg|webp|gif|svg|mp3|wav|ogg|m4a|mp4|webm|json))/gi);
      for (const m of mediaMatches) {
        const folder = m[1].toLowerCase();
        const fname = m[2];
        // Do not re-add the config file itself
        if (fname !== fileName && fname !== `${rawId}.json`) {
          referencedMediaFiles.add(`${folder}/${fname}`);
        }
      }
    }
  } catch (readErr) {
    console.warn(`[Storage] Could not pre-read config for media extraction (${rawId}):`, readErr.message);
  }

  // Helper to remove or move a specific file from a client
  async function purgeSingleFile(client, filePath) {
    if (!client || !filePath) return false;
    let purged = false;
    // Standard remove
    try {
      const { data, error } = await client.storage.from(BUCKET_NAME).remove([filePath]);
      if (!error && Array.isArray(data) && data.length > 0) {
        purged = true;
      }
    } catch (_) {}

    // Move fallback for publishable key RLS
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

  // Helper to purge all config files and assets in a specific bucket folder
  async function purgeFromClient(client, folder) {
    if (!client) return false;
    let deleted = false;
    const sourcePath = `${folder}/${fileName}`;
    const destPath = `deleted/${Date.now()}_${rawId}.json`;

    // 1. Try standard Supabase Storage remove() first (works if service role key is configured or delete RLS policy exists)
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

    // 2. If remove() did not delete the file (e.g. publishable key RLS policy), move it to deleted/
    if (!deleted) {
      try {
        const { error: moveErr } = await client.storage.from(BUCKET_NAME).move(sourcePath, destPath);
        if (!moveErr) {
          deleted = true;
          // Attempt removal from deleted/ location
          try { await client.storage.from(BUCKET_NAME).remove([destPath]); } catch (_) {}
        }
      } catch (moveErr) {}

      // Also handle rawId without .json if present
      if (!deleted) {
        try {
          const { error: moveRawErr } = await client.storage.from(BUCKET_NAME).move(`${folder}/${rawId}`, `deleted/${Date.now()}_${rawId}`);
          if (!moveRawErr) {
            deleted = true;
          }
        } catch (_) {}
      }
    }

    // 3. Search and purge any associated assets (e.g. qr_{rawId}.png, og_{rawId}.png)
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

  // Purge any referenced media files discovered inside the config
  for (const mediaPath of referencedMediaFiles) {
    const isPremFolder = mediaPath.startsWith('premium/');
    const targetClient = isPremFolder ? (supabasePremium || supabaseFree) : (supabaseFree || supabasePremium);
    const didPurge = await purgeSingleFile(targetClient, mediaPath);
    if (didPurge) results.mediaFilesPurged++;
  }

  const [freeDel, premDel] = await Promise.all([
    purgeFromClient(supabaseFree, 'free'),
    purgeFromClient(supabasePremium, 'premium')
  ]);

  results.freeDeleted = freeDel;
  results.premiumDeleted = premDel;
  results.deleted = freeDel || premDel;
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
