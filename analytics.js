/**
 * Analytics Engine for Wishing Portal (Greeter)
 * Collects user behavior, page views, geolocation, feature usage, etc.
 * Stores all analytics data in a JSON file (could be swapped for a DB later).
 */

const fs = require('fs');
const path = require('path');
const geoip = require('geoip-lite');

const DATA_DIR = path.join(__dirname, 'data');
const ANALYTICS_FILE = path.join(DATA_DIR, 'analytics.json');
const WEBSITES_FILE = path.join(DATA_DIR, 'websites.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readJSON(filePath, fallback = []) {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error(`Error reading ${filePath}:`, e.message);
  }
  return fallback;
}

function writeJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error(`Error writing ${filePath}:`, e.message);
  }
}

function getClientIP(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.connection?.remoteAddress || req.socket?.remoteAddress || req.ip || 'unknown';
}

function getGeoFromIP(ip) {
  // Clean up IPv6 localhost representations
  const cleanIP = ip.replace('::ffff:', '').replace('::1', '127.0.0.1');
  
  if (cleanIP === '127.0.0.1' || cleanIP === 'localhost' || cleanIP === 'unknown') {
    return { country: 'Local', region: 'Development', city: 'Localhost', ll: [0, 0], timezone: 'N/A' };
  }

  const geo = geoip.lookup(cleanIP);
  if (geo) {
    return {
      country: geo.country || 'Unknown',
      region: geo.region || 'Unknown',
      city: geo.city || 'Unknown',
      ll: geo.ll || [0, 0],
      timezone: geo.timezone || 'Unknown'
    };
  }
  return { country: 'Unknown', region: 'Unknown', city: 'Unknown', ll: [0, 0], timezone: 'Unknown' };
}

function generateSessionId() {
  return 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
}

// ─── Analytics Data Store ────────────────────────────────────────────────────

class AnalyticsStore {
  constructor() {
    this.data = readJSON(ANALYTICS_FILE, {
      pageViews: [],
      sessions: [],
      events: [],
      featureUsage: [],
      exitEvents: [],
      dailyStats: {}
    });
    this.websites = readJSON(WEBSITES_FILE, []);
    this._saveInterval = setInterval(() => this.persist(), 30000); // Auto-save every 30s
  }

  persist() {
    writeJSON(ANALYTICS_FILE, this.data);
    writeJSON(WEBSITES_FILE, this.websites);
  }

  // ── Page Views ──

  trackPageView(req, page) {
    const ip = getClientIP(req);
    const geo = getGeoFromIP(ip);
    const ua = req.headers['user-agent'] || 'Unknown';
    const referer = req.headers['referer'] || 'Direct';
    const timestamp = new Date().toISOString();
    const today = timestamp.split('T')[0];

    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      timestamp,
      page,
      ip: this._hashIP(ip), // Store hashed IP for privacy
      rawIP: ip, // Keep raw for geo lookup (admin only)
      geo,
      userAgent: ua,
      referer,
      device: this._parseDevice(ua),
      browser: this._parseBrowser(ua),
      os: this._parseOS(ua)
    };

    this.data.pageViews.push(entry);

    // Daily stats
    if (!this.data.dailyStats[today]) {
      this.data.dailyStats[today] = { views: 0, uniqueIPs: [], websitesCreated: 0, events: {} };
    }
    this.data.dailyStats[today].views++;
    if (!this.data.dailyStats[today].uniqueIPs.includes(this._hashIP(ip))) {
      this.data.dailyStats[today].uniqueIPs.push(this._hashIP(ip));
    }

    // Trim old data (keep last 10000 entries)
    if (this.data.pageViews.length > 10000) {
      this.data.pageViews = this.data.pageViews.slice(-10000);
    }

    return entry;
  }

  // ── Sessions ──

  trackSession(req, sessionData) {
    const ip = getClientIP(req);
    const geo = getGeoFromIP(ip);
    const ua = req.headers['user-agent'] || 'Unknown';

    const session = {
      id: generateSessionId(),
      timestamp: new Date().toISOString(),
      ip: this._hashIP(ip),
      rawIP: ip,
      geo,
      device: this._parseDevice(ua),
      browser: this._parseBrowser(ua),
      os: this._parseOS(ua),
      ...sessionData
    };

    this.data.sessions.push(session);

    // Trim
    if (this.data.sessions.length > 5000) {
      this.data.sessions = this.data.sessions.slice(-5000);
    }

    return session;
  }

  // ── Events (clicks, feature toggles, etc.) ──

  trackEvent(req, eventData) {
    const ip = getClientIP(req);
    const geo = getGeoFromIP(ip);
    const timestamp = new Date().toISOString();
    const today = timestamp.split('T')[0];

    const event = {
      id: Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      timestamp,
      ip: this._hashIP(ip),
      geo,
      ...eventData
    };

    this.data.events.push(event);

    // Track daily event counts
    if (!this.data.dailyStats[today]) {
      this.data.dailyStats[today] = { views: 0, uniqueIPs: [], websitesCreated: 0, events: {} };
    }
    const evtType = eventData.type || 'unknown';
    this.data.dailyStats[today].events[evtType] = (this.data.dailyStats[today].events[evtType] || 0) + 1;

    // Trim
    if (this.data.events.length > 10000) {
      this.data.events = this.data.events.slice(-10000);
    }

    return event;
  }

  // ── Feature Usage ──

  trackFeatureUsage(req, featureData) {
    const ip = getClientIP(req);
    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      ip: this._hashIP(ip),
      ...featureData
    };

    this.data.featureUsage.push(entry);

    if (this.data.featureUsage.length > 10000) {
      this.data.featureUsage = this.data.featureUsage.slice(-10000);
    }

    return entry;
  }

  // ── Exit Tracking ──

  trackExit(req, exitData) {
    const ip = getClientIP(req);
    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      ip: this._hashIP(ip),
      ...exitData
    };

    this.data.exitEvents.push(entry);

    if (this.data.exitEvents.length > 5000) {
      this.data.exitEvents = this.data.exitEvents.slice(-5000);
    }

    return entry;
  }

  // ── Website Registry (generated websites) ──

  registerWebsite(req, websiteData) {
    const ip = getClientIP(req);
    const geo = getGeoFromIP(ip);
    const timestamp = new Date().toISOString();
    const today = timestamp.split('T')[0];

    const website = {
      id: websiteData.id,
      createdAt: websiteData.createdAt || timestamp,
      creatorIP: this._hashIP(ip),
      rawCreatorIP: ip,
      creatorGeo: geo,
      creatorDevice: this._parseDevice(req.headers['user-agent'] || ''),
      creatorBrowser: this._parseBrowser(req.headers['user-agent'] || ''),
      creatorOS: this._parseOS(req.headers['user-agent'] || ''),
      eventType: websiteData.eventType || 'unknown',
      templateName: websiteData.templateName || 'unknown',
      recipientName: websiteData.recipientName || 'Unknown',
      features: websiteData.features || [],
      views: 0,
      uniqueViewers: [],
      referralCreations: 0,
      lastViewedAt: null
    };

    this.websites.push(website);
    console.log(`[Analytics] Registered website: ${website.id}`);
    this.persist(); // Force persist for testing

    // Daily stat - use the website's actual creation date
    const statDay = website.createdAt.split('T')[0];
    if (!this.data.dailyStats[statDay]) {
      this.data.dailyStats[statDay] = { views: 0, uniqueIPs: [], websitesCreated: 0, events: {} };
    }
    this.data.dailyStats[statDay].websitesCreated++;

    return website;
  }

  // ── Track website view ──

  trackWebsiteView(req, websiteId) {
    const ip = getClientIP(req);
    const geo = getGeoFromIP(ip);
    const hashedIP = this._hashIP(ip);

    const website = this.websites.find(w => w.id === websiteId);
    if (website) {
      website.views = (website.views || 0) + 1;
      website.lastViewedAt = new Date().toISOString();
      if (!website.uniqueViewers) website.uniqueViewers = [];
      if (!website.uniqueViewers.includes(hashedIP)) {
        website.uniqueViewers.push(hashedIP);
      }
    }

    return { websiteId, views: website?.views || 0, geo };
  }

  // ── Dashboard Data ──

  getDashboardData(days = 7) {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    // Calculate cutoff date in UTC
    let cutoffDate = null;
    if (days >= 0) {
      cutoffDate = new Date(now);
      // If days = 0, we want since beginning of today (UTC)
      // If days = 7, we want since beginning of 7 days ago (UTC)
      cutoffDate.setUTCDate(cutoffDate.getUTCDate() - (days === 0 ? 0 : days));
      cutoffDate.setUTCHours(0, 0, 0, 0);
    }

    const isWithinPeriod = (timestamp) => {
      if (!cutoffDate || !timestamp) return true;
      return new Date(timestamp) >= cutoffDate;
    };

    // Filter data based on period
    const filteredPVs = this.data.pageViews.filter(pv => isWithinPeriod(pv.timestamp));
    const filteredEvents = this.data.events.filter(ev => isWithinPeriod(ev.timestamp));
    const filteredWebsites = this.websites.filter(w => isWithinPeriod(w.createdAt));

    // Page views aggregation
    const pageViewsByPage = {};
    const geoDistribution = {};
    const deviceDistribution = {};
    const browserDistribution = {};
    const osDistribution = {};
    const hourlyDistribution = new Array(24).fill(0);
    const refererDistribution = {};
    const periodUniqueIPs = new Set();

    filteredPVs.forEach(pv => {
      pageViewsByPage[pv.page] = (pageViewsByPage[pv.page] || 0) + 1;
      geoDistribution[pv.geo?.country || 'Unknown'] = (geoDistribution[pv.geo?.country || 'Unknown'] || 0) + 1;
      deviceDistribution[pv.device || 'Unknown'] = (deviceDistribution[pv.device || 'Unknown'] || 0) + 1;
      browserDistribution[pv.browser || 'Unknown'] = (browserDistribution[pv.browser || 'Unknown'] || 0) + 1;
      osDistribution[pv.os || 'Unknown'] = (osDistribution[pv.os || 'Unknown'] || 0) + 1;
      const hour = new Date(pv.timestamp).getHours();
      if (!isNaN(hour)) hourlyDistribution[hour]++;
      const ref = pv.referer || 'Direct';
      const refDomain = ref === 'Direct' ? 'Direct' : (() => { try { return new URL(ref).hostname; } catch { return ref; } })();
      refererDistribution[refDomain] = (refererDistribution[refDomain] || 0) + 1;
      
      // Track unique IPs in period
      if (pv.ip) periodUniqueIPs.add(pv.ip);
    });

    // Website stats (within period)
    const websitesByEventType = {};
    let periodWebsiteViews = 0;
    filteredWebsites.forEach(w => {
      const et = w.eventType || 'unknown';
      websitesByEventType[et] = (websitesByEventType[et] || 0) + 1;
      periodWebsiteViews += (w.views || 0);
    });

    // Chart trend data
    const chartDays = days > 0 ? days : 30;
    const lastNDays = [];
    for (let i = 0; i < chartDays; i++) {
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() - i);
      lastNDays.push(d.toISOString().split('T')[0]);
    }
    const trendData = lastNDays.reverse().map(day => {
      const ds = this.data.dailyStats[day];
      // Dynamic count from website registry for accuracy
      const sitesOnDay = this.websites.filter(w => w.createdAt && w.createdAt.startsWith(day)).length;
      return {
        date: day,
        views: ds?.views || 0,
        uniqueVisitors: ds?.uniqueIPs?.length || 0,
        websitesCreated: sitesOnDay
      };
    });

    // Recent activity
    const recentActivity = [
      ...filteredPVs.slice(-20).map(pv => ({ type: 'pageView', timestamp: pv.timestamp, page: pv.page, geo: pv.geo, device: pv.device, browser: pv.browser })),
      ...filteredEvents.slice(-20).map(ev => ({ type: 'event', timestamp: ev.timestamp, eventType: ev.type, details: ev.details, geo: ev.geo })),
      ...filteredWebsites.slice(-10).map(w => ({ type: 'websiteCreated', timestamp: w.createdAt, websiteId: w.id, eventType: w.eventType, recipientName: w.recipientName }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 50);

    // Calculate event distribution from websites
    const eventTypeDistribution = {};
    filteredWebsites.forEach(w => {
      const type = w.eventType || 'unknown';
      eventTypeDistribution[type] = (eventTypeDistribution[type] || 0) + 1;
    });

    // Feature usage stats
    const featureStats = {};
    const filteredFeatures = this.data.featureUsage.filter(fu => isWithinPeriod(fu.timestamp));
    filteredFeatures.forEach(fu => {
      const name = fu.feature || 'unknown';
      if (!featureStats[name]) featureStats[name] = { count: 0, enabled: 0, disabled: 0 };
      featureStats[name].count++;
      if (fu.action === 'enable') featureStats[name].enabled++;
      if (fu.action === 'disable') featureStats[name].disabled++;
    });

    // Exit pages
    const exitPages = {};
    const filteredExits = this.data.exitEvents.filter(ex => isWithinPeriod(ex.timestamp));
    filteredExits.forEach(ex => {
      const page = ex.page || 'unknown';
      exitPages[page] = (exitPages[page] || 0) + 1;
    });

    return {
      period: days,
      overview: {
        totalPageViews: filteredPVs.length,
        totalWebsitesCreated: filteredWebsites.length, 
        periodUniqueVisitors: periodUniqueIPs.size,
        totalWebsiteViews: periodWebsiteViews,
        todayViews: (this.data.dailyStats[today]?.views || 0),
        todayUniqueVisitors: (this.data.dailyStats[today]?.uniqueIPs?.length || 0),
        todayWebsitesCreated: this.websites.filter(w => w.createdAt && w.createdAt.startsWith(today)).length
      },
      charts: {
        trendData,
        pageViewsByPage,
        geoDistribution,
        deviceDistribution,
        browserDistribution,
        osDistribution,
        hourlyDistribution,
        refererDistribution,
        eventTypeDistribution,
        websitesByEventType,
        exitPages,
        featureStats
      },
      recentActivity,
      websites: this.websites.slice(-500).reverse().map(w => ({
        ...w,
        rawCreatorIP: undefined // Hide raw IP in dashboard
      })),
      topWebsites: [...this.websites].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 20).map(w => ({
        id: w.id,
        eventType: w.eventType,
        recipientName: w.recipientName,
        views: w.views || 0,
        uniqueViewers: w.uniqueViewers?.length || 0,
        createdAt: w.createdAt,
        creatorGeo: w.creatorGeo
      })),
      allTime: {
        totalPageViews: this.data.pageViews.length,
        totalWebsitesCreated: this.websites.length
      }
    };
  }

  // ── Private helpers ──

  _hashIP(ip) {
    // Simple hash for privacy - not cryptographic, just obfuscation
    let hash = 0;
    const str = ip + '_greeter_salt';
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return 'ip_' + Math.abs(hash).toString(36);
  }

  _parseDevice(ua) {
    if (!ua) return 'Unknown';
    if (/Mobile|Android|iPhone|iPad|iPod/i.test(ua)) {
      if (/iPad|Tablet/i.test(ua)) return 'Tablet';
      return 'Mobile';
    }
    return 'Desktop';
  }

  _parseBrowser(ua) {
    if (!ua) return 'Unknown';
    if (/Edg/i.test(ua)) return 'Edge';
    if (/Chrome/i.test(ua)) return 'Chrome';
    if (/Firefox/i.test(ua)) return 'Firefox';
    if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return 'Safari';
    if (/Opera|OPR/i.test(ua)) return 'Opera';
    if (/MSIE|Trident/i.test(ua)) return 'IE';
    return 'Other';
  }

  _parseOS(ua) {
    if (!ua) return 'Unknown';
    if (/Windows NT 10/i.test(ua)) return 'Windows 10/11';
    if (/Windows/i.test(ua)) return 'Windows';
    if (/Mac OS X/i.test(ua)) return 'macOS';
    if (/Android/i.test(ua)) return 'Android';
    if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
    if (/Linux/i.test(ua)) return 'Linux';
    return 'Other';
  }

  // Cleanup on shutdown
  shutdown() {
    clearInterval(this._saveInterval);
    this.persist();
  }
}

// Singleton
const analyticsStore = new AnalyticsStore();

// Graceful shutdown
process.on('SIGINT', () => { analyticsStore.shutdown(); process.exit(0); });
process.on('SIGTERM', () => { analyticsStore.shutdown(); process.exit(0); });

module.exports = analyticsStore;
