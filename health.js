/**
 * Server Health Monitoring Module
 * Collects and monitors system metrics: CPU, memory, disk, and MongoDB status
 */

let si = null;
try {
  si = require('systeminformation');
} catch (e) {
  console.warn('[Health] systeminformation not available in serverless');
}

let cron = null;
try {
  if (!process.env.VERCEL) {
    cron = require('node-cron');
  }
} catch (e) {}

const { HealthMetric } = require('./models');
const mongoose = require('mongoose');
require('dotenv').config();

// Configuration
const THRESHOLDS = {
  cpu: {
    warning: parseFloat(process.env.HEALTH_CPU_WARNING) || 70,
    critical: parseFloat(process.env.HEALTH_CPU_CRITICAL) || 90
  },
  memory: {
    warning: parseFloat(process.env.HEALTH_MEMORY_WARNING) || 80,
    critical: parseFloat(process.env.HEALTH_MEMORY_CRITICAL) || 95
  },
  disk: {
    warning: parseFloat(process.env.HEALTH_DISK_WARNING) || 80,
    critical: parseFloat(process.env.HEALTH_DISK_CRITICAL) || 95
  },
  mongo: {
    warning: 80, // 80% of pool
    critical: 95  // 95% of pool
  }
};

// Email configuration
let emailTransporter = null;

function initializeEmailTransporter() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    console.log('[Health] Email transporter initialized');
  } else {
    console.log('[Health] Email configuration incomplete, email alerts disabled');
  }
}

// Initialize email transporter
initializeEmailTransporter();

// Alert throttling
const lastAlertTimes = {
  critical: null,
  warning: null
};

/**
 * Timeout wrapper for systeminformation calls
 * Render's containerized environment can cause si calls to hang indefinitely
 */
function withTimeout(promise, ms = 8000, fallback = null) {
  return Promise.race([
    promise,
    new Promise(resolve => setTimeout(() => resolve(fallback), ms))
  ]);
}

/**
 * Get current system metrics
 */
async function getCurrentMetrics() {
  try {
    // Each metric is collected independently so one failure doesn't abort everything
    let cpuData = { cores: 0, model: 'Serverless', speed: 0 };
    let cpuLoad = { currentLoad: 0 };
    let memData = { used: 0, total: 1, free: 0 };
    let diskData = [];

    if (si) {
      [cpuData, cpuLoad, memData, diskData] = await Promise.all([
        withTimeout(si.cpu(), 8000, { cores: 0, model: 'Unknown', speed: 0 }),
        withTimeout(si.currentLoad(), 8000, { currentLoad: 0 }),
        withTimeout(si.mem(), 8000, { used: 0, total: 1, free: 0 }),
        withTimeout(si.fsSize(), 8000, [])
      ]);
    }

    const mainDisk = (diskData || []).find(d => d.mount === '/' || d.mount === 'C:') || (diskData || [])[0];

    // Get MongoDB connection info
    let mongoInfo = { connections: 0, poolSize: 100, dbSize: 0 };

    if (mongoose.connection.readyState === 1) {
      try {
        const db = mongoose.connection.db;
        const admin = db.admin();
        // Use serverStatus() — serverInfo() is not available in MongoDB driver v6+
        const serverStatus = await withTimeout(admin.serverStatus(), 5000, null);
        const stats = await withTimeout(db.stats(), 5000, null);

        mongoInfo.connections = mongoose.connection.client.topology?.s?.pool?.totalConnectionCount ||
                                (serverStatus?.connections?.current) || 0;
        mongoInfo.poolSize = mongoose.connection.client.topology?.s?.pool?.maxPoolSize || 100;
        mongoInfo.dbSize = stats ? (stats.dataSize / (1024 * 1024 * 1024)) : 0;
      } catch (mongoErr) {
        console.warn('[Health] MongoDB stats unavailable:', mongoErr.message);
      }
    }

    const metrics = {
      timestamp: new Date(),
      cpuUsage: (cpuLoad && cpuLoad.currentLoad) || 0,
      cpuCores: (cpuData && cpuData.cores) || 0,
      cpuModel: (cpuData && cpuData.model) || 'Unknown',
      memoryUsage: (memData && memData.total > 0) ? ((memData.used / memData.total) * 100) : 0,
      memoryTotal: (memData && memData.total) ? (memData.total / (1024 * 1024 * 1024)) : 0,
      memoryUsed: (memData && memData.used) ? (memData.used / (1024 * 1024 * 1024)) : 0,
      memoryFree: (memData && memData.free) ? (memData.free / (1024 * 1024 * 1024)) : 0,
      diskUsage: mainDisk ? (mainDisk.use || 0) : 0,
      diskTotal: mainDisk ? (mainDisk.size / (1024 * 1024 * 1024)) : 0,
      diskUsed: mainDisk ? (mainDisk.used / (1024 * 1024 * 1024)) : 0,
      diskFree: mainDisk ? (mainDisk.available / (1024 * 1024 * 1024)) : 0,
      diskMount: mainDisk ? mainDisk.mount : '/',
      mongoConnections: mongoInfo.connections,
      mongoPoolSize: mongoInfo.poolSize,
      mongoDbSize: mongoInfo.dbSize
    };

    // Check thresholds and determine alert level
    const alertCheck = checkThresholds(metrics);
    metrics.alertLevel = alertCheck.level;
    metrics.alertDetails = alertCheck.details;

    return metrics;
  } catch (error) {
    console.error('[Health] Error getting current metrics:', error);
    return null;
  }
}

/**
 * Check metrics against thresholds
 */
function checkThresholds(metrics) {
  const details = {};
  let level = 'normal';
  
  // CPU check
  if (metrics.cpuUsage >= THRESHOLDS.cpu.critical) {
    details.cpu = 'critical';
    level = 'critical';
  } else if (metrics.cpuUsage >= THRESHOLDS.cpu.warning) {
    details.cpu = 'warning';
    if (level !== 'critical') level = 'warning';
  }
  
  // Memory check
  if (metrics.memoryUsage >= THRESHOLDS.memory.critical) {
    details.memory = 'critical';
    level = 'critical';
  } else if (metrics.memoryUsage >= THRESHOLDS.memory.warning) {
    details.memory = 'warning';
    if (level !== 'critical') level = 'warning';
  }
  
  // Disk check
  if (metrics.diskUsage >= THRESHOLDS.disk.critical) {
    details.disk = 'critical';
    level = 'critical';
  } else if (metrics.diskUsage >= THRESHOLDS.disk.warning) {
    details.disk = 'warning';
    if (level !== 'critical') level = 'warning';
  }
  
  // MongoDB connection check
  const mongoUsage = metrics.mongoPoolSize > 0 ? (metrics.mongoConnections / metrics.mongoPoolSize) * 100 : 0;
  if (mongoUsage >= THRESHOLDS.mongo.critical) {
    details.mongo = 'critical';
    level = 'critical';
  } else if (mongoUsage >= THRESHOLDS.mongo.warning) {
    details.mongo = 'warning';
    if (level !== 'critical') level = 'warning';
  }
  
  return { level, details };
}

/**
 * Store metrics to database
 */
async function storeMetrics(metrics) {
  try {
    if (!metrics) return;
    
    const healthMetric = new HealthMetric(metrics);
    await healthMetric.save();
    
    console.log('[Health] Metrics stored successfully');
    
    // Send alert if needed
    if (metrics.alertLevel !== 'normal') {
      await sendAlertIfNeeded(metrics);
    }
  } catch (error) {
    console.error('[Health] Error storing metrics:', error);
  }
}

/**
 * Get historical metrics
 */
async function getHistoricalMetrics(hours = 24) {
  try {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - hours);
    
    const metrics = await HealthMetric.find({
      timestamp: { $gte: cutoff }
    }).sort({ timestamp: 1 });
    
    return metrics;
  } catch (error) {
    console.error('[Health] Error getting historical metrics:', error);
    return [];
  }
}

/**
 * Check if alert should be sent (throttling)
 */
async function sendAlertIfNeeded(metrics) {
  const now = new Date();
  const level = metrics.alertLevel;
  
  // Check throttling
  if (level === 'critical') {
    if (lastAlertTimes.critical) {
      const hoursSinceLastAlert = (now - lastAlertTimes.critical) / (1000 * 60 * 60);
      if (hoursSinceLastAlert < 1) {
        console.log('[Health] Critical alert throttled (sent within last hour)');
        return;
      }
    }
    lastAlertTimes.critical = now;
  } else if (level === 'warning') {
    if (lastAlertTimes.warning) {
      const hoursSinceLastAlert = (now - lastAlertTimes.warning) / (1000 * 60 * 60);
      if (hoursSinceLastAlert < 24) {
        console.log('[Health] Warning alert throttled (sent within last day)');
        return;
      }
    }
    lastAlertTimes.warning = now;
  }
  
  await sendAlertEmail(metrics);
}

/**
 * Send alert email
 */
async function sendAlertEmail(metrics) {
  if (!emailTransporter) {
    console.log('[Health] Email not configured, skipping alert');
    return;
  }
  
  const alertEmail = process.env.ALERT_EMAIL;
  if (!alertEmail) {
    console.log('[Health] No alert email configured');
    return;
  }
  
  try {
    const subject = `[${metrics.alertLevel.toUpperCase()}] Server Health Alert`;
    
    let body = `
Server Health Alert - ${new Date().toLocaleString()}
Alert Level: ${metrics.alertLevel.toUpperCase()}

Current Metrics:
- CPU Usage: ${metrics.cpuUsage.toFixed(1)}% (Cores: ${metrics.cpuCores})
- Memory Usage: ${metrics.memoryUsage.toFixed(1)}% (${metrics.memoryUsed.toFixed(2)}GB / ${metrics.memoryTotal.toFixed(2)}GB)
- Disk Usage: ${metrics.diskUsage.toFixed(1)}% (${metrics.diskUsed.toFixed(2)}GB / ${metrics.diskTotal.toFixed(2)}GB)
- MongoDB Connections: ${metrics.mongoConnections} / ${metrics.mongoPoolSize}
- Database Size: ${metrics.mongoDbSize.toFixed(2)}GB

Alert Details:
`;
    
    Object.entries(metrics.alertDetails || {}).forEach(([key, value]) => {
      body += `- ${key}: ${value.toUpperCase()}\n`;
    });
    
    body += `
Please check the admin panel for more details.
`;
    
    await emailTransporter.sendMail({
      from: process.env.SMTP_USER,
      to: alertEmail,
      subject: subject,
      text: body
    });
    
    console.log('[Health] Alert email sent successfully');
  } catch (error) {
    console.error('[Health] Error sending alert email:', error);
  }
}

/**
 * Start scheduled metrics collection
 */
function startMetricsCollection() {
  console.log('[Health] Starting metrics collection (every 5 minutes)');
  
  // Collect immediately on start
  collectAndStore();
  
  // Schedule every 5 minutes
  cron.schedule('*/5 * * * *', () => {
    collectAndStore();
  });
}

/**
 * Collect and store metrics (internal function)
 */
async function collectAndStore() {
  try {
    const metrics = await getCurrentMetrics();
    if (metrics) {
      await storeMetrics(metrics);
    }
  } catch (error) {
    console.error('[Health] Error in scheduled collection:', error);
  }
}

/**
 * Clean up old metrics (data retention)
 */
async function cleanupOldMetrics() {
  try {
    const now = new Date();
    
    // Delete detailed metrics older than 7 days
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const deleted = await HealthMetric.deleteMany({
      timestamp: { $lt: sevenDaysAgo }
    });
    
    console.log(`[Health] Cleaned up ${deleted.deletedCount} old metric records`);
  } catch (error) {
    console.error('[Health] Error cleaning up old metrics:', error);
  }
}

/**
 * Get system info for display
 */
async function getSystemInfo() {
  try {
    if (!si) {
      return { platform: 'serverless', hostname: 'vercel' };
    }
    const osInfo = await si.osInfo();
    const cpuInfo = await si.cpu();
    const memInfo = await si.mem();
    const uptime = await si.time();
    
    return {
      platform: osInfo.platform,
      distro: osInfo.distro,
      release: osInfo.release,
      arch: osInfo.arch,
      hostname: osInfo.hostname,
      cpuModel: cpuInfo.model,
      cpuCores: cpuInfo.cores,
      cpuSpeed: cpuInfo.speed,
      totalMemory: (memInfo.total / (1024 * 1024 * 1024)).toFixed(2),
      uptime: uptime.uptime,
      uptimeFormatted: formatUptime(uptime.uptime)
    };
  } catch (error) {
    console.error('[Health] Error getting system info:', error);
    return {};
  }
}

/**
 * Format uptime in human-readable format
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

module.exports = {
  getCurrentMetrics,
  storeMetrics,
  getHistoricalMetrics,
  checkThresholds,
  sendAlertEmail,
  startMetricsCollection,
  cleanupOldMetrics,
  getSystemInfo,
  THRESHOLDS
};
