/**
 * Analytics Engine for Wishing Portal (Greeter) - MongoDB Version
 * Collects user behavior, page views, geolocation, feature usage, etc.
 * Stores all data in MongoDB Atlas for persistence and scalability.
 */

const geoip = require('geoip-lite');
const { Visitor, Event, Website } = require('./models');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getClientIP(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.connection?.remoteAddress || req.socket?.remoteAddress || req.ip || 'unknown';
}

function getGeoFromIP(ip) {
  const cleanIP = ip.replace('::ffff:', '').replace('::1', '127.0.0.1');
  if (cleanIP === '127.0.0.1' || cleanIP === 'localhost' || cleanIP === 'unknown') {
    return { country: 'Local', region: 'Development', city: 'Localhost' };
  }
  const geo = geoip.lookup(cleanIP);
  if (geo) {
    return {
      country: geo.country || 'Unknown',
      region: geo.region || 'Unknown',
      city: geo.city || 'Unknown'
    };
  }
  return { country: 'Unknown', region: 'Unknown', city: 'Unknown' };
}

function _hashIP(ip) {
  let hash = 0;
  const str = ip + '_greeter_salt';
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'ip_' + Math.abs(hash).toString(36);
}

function _parseDevice(ua) {
  if (!ua) return 'Unknown';
  if (/Mobile|Android|iPhone|iPad|iPod/i.test(ua)) {
    if (/iPad|Tablet/i.test(ua)) return 'Tablet';
    return 'Mobile';
  }
  return 'Desktop';
}

function _parseBrowser(ua) {
  if (!ua) return 'Unknown';
  if (/Edg/i.test(ua)) return 'Edge';
  if (/Chrome/i.test(ua)) return 'Chrome';
  if (/Firefox/i.test(ua)) return 'Firefox';
  if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return 'Safari';
  return 'Other';
}

function _parseOS(ua) {
  if (!ua) return 'Unknown';
  if (/Windows NT 10/i.test(ua)) return 'Windows 10/11';
  if (/Windows/i.test(ua)) return 'Windows';
  if (/Mac OS X/i.test(ua)) return 'macOS';
  if (/Android/i.test(ua)) return 'Android';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'Other';
}

// ─── Traffic Source Analysis ─────────────────────────────────────────────────

function parseUTMParameters(url) {
  try {
    if (!url) return {};
    const urlObj = new URL(url);
    return {
      utmSource: urlObj.searchParams.get('utm_source') || null,
      utmMedium: urlObj.searchParams.get('utm_medium') || null,
      utmCampaign: urlObj.searchParams.get('utm_campaign') || null,
      utmContent: urlObj.searchParams.get('utm_content') || null,
      utmTerm: urlObj.searchParams.get('utm_term') || null
    };
  } catch (e) {
    return {};
  }
}

function extractSearchEngine(referer) {
  if (!referer || referer === 'Direct') return null;
  try {
    const hostname = new URL(referer).hostname.toLowerCase();

    const searchEngines = {
      'google': 'Google',
      'bing': 'Bing',
      'duckduckgo': 'DuckDuckGo',
      'yahoo': 'Yahoo',
      'baidu': 'Baidu',
      'yandex': 'Yandex',
      'ask': 'Ask',
      'aol': 'AOL',
      'ecosia': 'Ecosia',
      'startpage': 'StartPage'
    };

    for (const [key, name] of Object.entries(searchEngines)) {
      if (hostname.includes(key)) {
        return name;
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}

function extractSearchKeywords(referer) {
  if (!referer || referer === 'Direct') return null;
  try {
    const urlObj = new URL(referer);
    const hostname = urlObj.hostname.toLowerCase();

    // Check if it's a search engine
    const isSearchEngine = ['google', 'bing', 'duckduckgo', 'yahoo', 'baidu', 'yandex', 'ask', 'aol'].some(se => hostname.includes(se));
    if (!isSearchEngine) return null;

    // Extract query parameter based on search engine
    const queryParam = hostname.includes('google') ? 'q' :
      hostname.includes('bing') ? 'q' :
        hostname.includes('duckduckgo') ? 'q' :
          hostname.includes('yahoo') ? 'p' :
            hostname.includes('baidu') ? 'wd' :
              hostname.includes('yandex') ? 'text' :
                hostname.includes('ask') ? 'q' :
                  'q';

    const query = urlObj.searchParams.get(queryParam);
    if (query) {
      return decodeURIComponent(query).replace(/\+/g, ' ');
    }
    return null;
  } catch (e) {
    return null;
  }
}

function categorizeTrafficSource(referer, utmParams, ownHost = '', pageUrl = '') {
  // Check UTM parameters first (highest priority)
  if (utmParams && utmParams.utmMedium) {
    const medium = utmParams.utmMedium.toLowerCase();
    if (medium === 'cpc' || medium === 'ppc') return 'Paid Search';
    if (medium === 'email' || medium === 'mail') return 'Email';
    if (medium === 'social') return 'Social Media';
    if (medium === 'referral') return 'External Referral';
    if (medium === 'organic') return 'Google Search';
  }

  // No referrer = Direct entry in browser address bar or bookmark
  if (!referer || referer === 'Direct') {
    if (pageUrl && (pageUrl.includes('/generated/') || pageUrl.includes('share.html') || pageUrl.includes('preview.html'))) {
      return 'Shared Generated Website';
    }
    return 'Direct / Typed URL';
  }

  try {
    const urlObj = new URL(referer);
    const hostname = urlObj.hostname.toLowerCase();
    const pathname = urlObj.pathname.toLowerCase();

    // ── Search Engines ───────────────────────────────────────────────────────
    if (hostname.includes('google.')) return 'Google Search';
    if (hostname.includes('bing.com')) return 'Bing Search';
    if (hostname.includes('yahoo.')) return 'Yahoo Search';
    if (hostname.includes('duckduckgo.')) return 'DuckDuckGo Search';
    if (['baidu', 'yandex', 'ask', 'aol', 'ecosia', 'brave', 'startpage'].some(se => hostname.includes(se))) {
      return 'Other Search Engine';
    }

    // ── Social Media & Messaging Platforms ──────────────────────────────────
    if (hostname.includes('whatsapp') || hostname.includes('wa.me')) return 'WhatsApp Share';
    if (hostname.includes('instagram') || hostname.includes('instagr.am')) return 'Instagram';
    if (hostname.includes('facebook') || hostname.includes('fb.me') || hostname.includes('fb.com')) return 'Facebook';
    if (hostname.includes('twitter') || hostname.includes('x.com') || hostname.includes('t.co')) return 'Twitter (X)';
    if (hostname.includes('telegram') || hostname.includes('t.me')) return 'Telegram';
    if (['linkedin', 'tiktok', 'pinterest', 'reddit', 'snapchat', 'youtube', 'threads'].some(s => hostname.includes(s))) {
      return 'Social Media';
    }

    // ── Own Site / Internal / Generated Surprise Link ─────────────────────────
    const knownOwnDomains = ['thegreeter.in', 'www.thegreeter.in', 'localhost'];
    if (ownHost) knownOwnDomains.push(ownHost.replace(/:\d+$/, '').toLowerCase());
    if (knownOwnDomains.some(d => hostname === d || hostname.endsWith('.' + d))) {
      if (pathname.includes('/generated/') || pathname.includes('share.html') || pathname.includes('preview.html')) {
        return 'Shared Generated Website';
      }
      return 'Direct / Typed URL';
    }

    // ── Email Clients ────────────────────────────────────────────────────────
    if (['mail.google', 'outlook', 'mail.yahoo', 'hotmail', 'protonmail', 'webmail'].some(c => hostname.includes(c))) {
      return 'Email';
    }

    // Everything else is an External Referral
    return 'External Referral';
  } catch (e) {
    return 'Direct / Typed URL';
  }
}

// ─── Analytics Data Store ────────────────────────────────────────────────────

class AnalyticsStore {
  // Normalize feature identifiers to a canonical key and preserve display name
  _normalizeFeature(raw) {
    const s = (raw || 'Unknown').toString().trim();
    // keep a readable display name and a safe canonical key
    const display = s;
    let key = s.toLowerCase();
    key = key.replace(/\s+/g, ' ');
    key = key.replace(/[^a-z0-9 \-_/]/g, '');
    key = key.replace(/\s+/g, '_');
    return { key, display };
  }
  // ── Track Page View ──
  async trackPageView(req, page) {
    try {
      const ip = getClientIP(req);
      const geo = getGeoFromIP(ip);
      const ua = req.headers['user-agent'] || 'Unknown';
      const visitorId = _hashIP(ip);
      const rawReferer = req.headers['referer'] || 'Direct';

      // Parse UTM parameters from referer URL
      const utmParams = parseUTMParameters(rawReferer);

      // Categorize traffic source (pass own host for internal-nav detection)
      const ownHost = req.headers.host || '';
      const trafficSource = categorizeTrafficSource(rawReferer, utmParams, ownHost);

      // Extract search engine and keywords
      const searchEngine = extractSearchEngine(rawReferer);
      const searchKeywords = extractSearchKeywords(rawReferer);

      // Update or create visitor
      await Visitor.findOneAndUpdate(
        { visitorId },
        { $set: { lastVisit: new Date(), ip, geo }, $setOnInsert: { firstVisit: new Date() } },
        { upsert: true }
      );

      // Create event with enhanced traffic data
      const event = await Event.create({
        visitorId,
        type: 'pageview',
        page,
        geo,
        details: {
          userAgent: ua,
          referer: rawReferer,
          device: _parseDevice(ua),
          browser: _parseBrowser(ua),
          os: _parseOS(ua),
          trafficSource,
          searchEngine,
          searchKeywords,
          utmSource: utmParams.utmSource,
          utmMedium: utmParams.utmMedium,
          utmCampaign: utmParams.utmCampaign,
          utmContent: utmParams.utmContent,
          utmTerm: utmParams.utmTerm
        }
      });

      return event;
    } catch (err) {
      console.error('[Analytics] Error tracking pageview:', err.message);
    }
  }

  // ── Track Event ──
  async trackEvent(req, eventData) {
    try {
      const ip = getClientIP(req);
      const geo = getGeoFromIP(ip);
      const visitorId = _hashIP(ip);

      const event = await Event.create({
        visitorId,
        type: eventData.type || 'event',
        page: eventData.page,
        websiteId: eventData.websiteId,
        details: eventData.details || {},
        geo
      });

      return event;
    } catch (err) {
      console.error('[Analytics] Error tracking event:', err.message);
    }
  }

  // ── Website Registry ──
  async registerWebsite(req, websiteData) {
    try {
      const ip = getClientIP(req);
      const geo = getGeoFromIP(ip);

      const website = await Website.create({
        id: websiteData.id,
        recipientName: websiteData.recipientName,
        eventType: websiteData.eventType,
        templateName: websiteData.templateName,
        creatorGeo: geo,
        metadata: websiteData.metadata || {}
      });

      // Track the creation as an event
      await this.trackEvent(req, {
        type: 'websiteCreated',
        websiteId: websiteData.id,
        details: { recipientName: websiteData.recipientName }
      });

      return website;
    } catch (err) {
      console.error('[Analytics] Error registering website:', err.message);
    }
  }

  // ── Track Website View ──
  async trackWebsiteView(req, websiteId) {
    try {
      const ip = getClientIP(req);
      const visitorId = _hashIP(ip);
      const geo = getGeoFromIP(ip);

      const website = await Website.findOneAndUpdate(
        { id: websiteId },
        {
          $inc: { views: 1 },
          $addToSet: { uniqueViewers: visitorId }
        },
        { returnDocument: 'after' }
      );

      if (website) {
        await this.trackEvent(req, {
          type: 'website-view',
          websiteId,
          geo
        });
      }

      return website;
    } catch (err) {
      console.error('[Analytics] Error tracking website view:', err.message);
    }
  }

  // ── Dashboard Data ──
  async getDashboardData(days = 7) {
    try {
      const now = new Date();
      // Create today at midnight UTC to match MongoDB timestamps
      const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

      // Handle different time periods correctly
      let cutoff;
      let timeFilter;

      if (days === -1) {
        // All Time - no date filter
        cutoff = null;
        timeFilter = {}; // No date filter for all time
      } else if (days === 0) {
        // Today
        cutoff = today;
        timeFilter = { $gte: today };
      } else {
        // Last X days
        cutoff = new Date(today);
        cutoff.setDate(cutoff.getDate() - days);
        timeFilter = { $gte: cutoff };
      }

      // Basic totals - handle All Time case
      const pageViewFilter = days === -1 ? { type: 'pageview' } : { type: 'pageview', timestamp: timeFilter };
      const websiteFilter = days === -1 ? {} : { createdAt: timeFilter };
      const eventFilter = days === -1 ? {} : { timestamp: timeFilter };

      const totalPageViews = await Event.countDocuments(pageViewFilter);
      const totalWebsites = await Website.countDocuments(websiteFilter);
      const uniqueVisitors = await Event.distinct('visitorId', eventFilter);

      const todayViews = await Event.countDocuments({ type: 'pageview', timestamp: { $gte: today } });
      const todayWebsites = await Website.countDocuments({ createdAt: { $gte: today } });
      const todayUnique = await Event.distinct('visitorId', { timestamp: { $gte: today } });

      // Calculate total website views for the period (sum of views in period)
      const websiteViewsFilter = days === -1 ? {} : { createdAt: timeFilter };
      const websiteViewsAgg = await Website.aggregate([
        { $match: websiteViewsFilter },
        { $group: { _id: null, totalViews: { $sum: '$views' } } }
      ]);
      const totalWebsiteViews = websiteViewsAgg && websiteViewsAgg.length > 0 ? websiteViewsAgg[0].totalViews : 0;

      // Recent Activity — always limit to avoid massive payloads on All Time
      const recentEventsFilter = days === -1 ? {} : { timestamp: timeFilter };
      const recentEvents = await Event.find(recentEventsFilter)
        .sort({ timestamp: -1 })
        .limit(200);

      // Websites List - respect time period filter
      const websitesListFilter = days === -1 ? {} : { createdAt: timeFilter };
      const rawWebsites = await Website.find(websitesListFilter)
        .sort({ createdAt: -1 })
        .limit(10000)
        .lean();

      const { CustomSlug, Payment } = require('./models');
      const paidWebsiteIds = new Set(await Payment.distinct('websiteId', { status: 'PAID' }));
      const slugWebsiteIds = new Set(await CustomSlug.distinct('websiteId'));

      const websites = rawWebsites.map(w => ({
        ...w,
        isPremium: paidWebsiteIds.has(w.id) || slugWebsiteIds.has(w.id)
      }));

      // Top Websites - respect time period filter
      const topWebsitesFilter = days === -1 ? {} : { createdAt: timeFilter };
      const topWebsites = await Website.find(topWebsitesFilter)
        .sort({ views: -1 })
        .limit(20)
        .lean();

      // Daily Stats for charts - handle All Time case
      const dailyStatsFilter = days === -1 ? {} : { timestamp: timeFilter };
      const dailyStats = await Event.aggregate([
        { $match: dailyStatsFilter },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp", timezone: "UTC" } },
            views: { $sum: { $cond: [{ $eq: ["$type", "pageview"] }, 1, 0] } },
            uniqueVisitors: { $addToSet: "$visitorId" }
          }
        },
        {
          $project: {
            _id: 1,
            views: 1,
            uniqueVisitors: { $size: "$uniqueVisitors" }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      const websiteStatsFilter = days === -1 ? {} : { createdAt: timeFilter };
      const websiteStats = await Website.aggregate([
        { $match: websiteStatsFilter },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      // Merge stats for trend chart - include all dates from both datasets
      const allDates = new Set([
        ...dailyStats.map(s => s._id),
        ...websiteStats.map(w => w._id)
      ]);

      const trendData = Array.from(allDates).sort().map(date => {
        const eventStat = dailyStats.find(s => s._id === date);
        const websiteStat = websiteStats.find(w => w._id === date);

        return {
          date: date,
          views: eventStat ? eventStat.views : 0,
          uniqueVisitors: eventStat ? eventStat.uniqueVisitors : 0,
          websitesCreated: websiteStat ? websiteStat.count : 0
        };
      });

      // Distribution charts
      const pageviewFilter = days === -1 ? { type: 'pageview' } : { type: 'pageview', timestamp: timeFilter };

      const deviceDistribution = await Event.aggregate([
        { $match: pageviewFilter },
        { $group: { _id: '$details.device', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);

      const browserDistribution = await Event.aggregate([
        { $match: pageviewFilter },
        { $group: { _id: '$details.browser', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);

      const osDistribution = await Event.aggregate([
        { $match: pageviewFilter },
        { $group: { _id: '$details.os', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);

      const eventTypeDistribution = await Event.aggregate([
        { $match: eventFilter },
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);

      const websitesByEventType = await Website.aggregate([
        { $match: websiteFilter },
        { $group: { _id: '$eventType', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);

      const hourlyDistribution = await Event.aggregate([
        { $match: pageviewFilter },
        {
          $group: {
            _id: { $hour: '$timestamp' },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id': 1 } }
      ]);

      // Additional distributions
      const pageViewsByPage = await Event.aggregate([
        { $match: pageviewFilter },
        { $group: { _id: '$page', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 }
      ]);

      const refererDistribution = await Event.aggregate([
        { $match: pageviewFilter },
        { $group: { _id: '$details.referer', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 }
      ]);

      const exitPages = await Event.aggregate([
        { $match: { ...eventFilter, type: 'exit' } },
        { $group: { _id: '$page', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 }
      ]);

      const geoDistribution = await Event.aggregate([
        { $match: pageviewFilter },
        { $group: { _id: '$geo.country', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 }
      ]);

      const geoUniqueVisitorsAgg = await Event.aggregate([
        { $match: pageviewFilter },
        { $group: { _id: { country: '$geo.country', visitorId: '$visitorId' } } },
        { $group: { _id: '$_id.country', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 }
      ]);

      const featureStatsAgg = await Event.aggregate([
        { $match: { ...eventFilter, type: 'feature' } },
        {
          $group: {
            _id: { feature: '$details.feature', action: '$details.action' },
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]);

      const featureStats = {};
      featureStatsAgg.forEach(item => {
        const rawFeature = item._id.feature || 'Unknown';
        const { key: featureKey, display: featureDisplay } = this._normalizeFeature(rawFeature);
        const action = (item._id.action || '').toString().trim();
        if (!featureStats[featureKey]) featureStats[featureKey] = {
          display: featureDisplay,
          enabled: 0, disabled: 0, total: 0,
          tried: 0, used: 0, triedEnabled: 0, triedDisabled: 0
        };

        // Legacy logic and mapping for backward compatibility
        if (action === 'enable' || action === 'enabled') {
          featureStats[featureKey].enabled += item.count;
          // Treat legacy immediate enable as a 'tried' interaction
          featureStats[featureKey].triedEnabled += item.count;
          featureStats[featureKey].tried += item.count;
        } else if (action === 'disable' || action === 'disabled') {
          featureStats[featureKey].disabled += item.count;
          featureStats[featureKey].triedDisabled += item.count;
          featureStats[featureKey].tried += item.count;
        }

        // New logic for tried vs used
        if (action === 'tried_enable') {
          featureStats[featureKey].triedEnabled += item.count;
          featureStats[featureKey].tried += item.count;
        } else if (action === 'tried_disable') {
          featureStats[featureKey].triedDisabled += item.count;
          featureStats[featureKey].tried += item.count;
        } else if (action === 'used' || action === 'use') {
          // Accept both 'used' and legacy 'use'
          featureStats[featureKey].used += item.count;
        }

        // Also accept plain 'use' as a tried interaction if needed
        if (action === 'use') {
          featureStats[featureKey].tried += item.count;
        }

        featureStats[featureKey].total += item.count;
      });

      // Feature usage over time
      const featureTrendAgg = await Event.aggregate([
        { $match: { ...eventFilter, type: 'feature' } },
        {
          $group: {
            _id: { date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp", timezone: "UTC" } }, feature: '$details.feature' },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.date': 1 } }
      ]);

      // Build featureTrend, featureByDevice, featureByBrowser, featureByHour using normalized keys
      const featureTrendRaw = {};
      featureTrendAgg.forEach(item => {
        const date = item._id.date;
        const feature = item._id.feature || 'Unknown';
        if (!featureTrendRaw[date]) featureTrendRaw[date] = {};
        featureTrendRaw[date][feature] = item.count;
      });

      // Normalize feature keys across trend/device/browser/hour datasets
      const featureTrend = {};
      Object.keys(featureTrendRaw).forEach(date => {
        featureTrend[date] = {};
        Object.keys(featureTrendRaw[date]).forEach(rawF => {
          const { key } = this._normalizeFeature(rawF);
          featureTrend[date][key] = (featureTrend[date][key] || 0) + featureTrendRaw[date][rawF];
        });
      });

      // Feature usage by device
      const featureDeviceAgg = await Event.aggregate([
        { $match: { ...eventFilter, type: 'feature' } },
        {
          $group: {
            _id: { device: '$details.device', feature: '$details.feature' },
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]);

      const featureByDeviceRaw = {};
      featureDeviceAgg.forEach(item => {
        const device = item._id.device || 'Unknown';
        const feature = item._id.feature || 'Unknown';
        if (!featureByDeviceRaw[device]) featureByDeviceRaw[device] = {};
        featureByDeviceRaw[device][feature] = item.count;
      });

      const featureByDevice = {};
      Object.keys(featureByDeviceRaw).forEach(device => {
        featureByDevice[device] = {};
        Object.keys(featureByDeviceRaw[device]).forEach(rawF => {
          const { key } = this._normalizeFeature(rawF);
          featureByDevice[device][key] = (featureByDevice[device][key] || 0) + featureByDeviceRaw[device][rawF];
        });
      });

      const featureBrowserAgg = await Event.aggregate([
        { $match: { ...eventFilter, type: 'feature' } },
        {
          $group: {
            _id: { browser: '$details.browser', feature: '$details.feature' },
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]);

      const featureByBrowserRaw = {};
      featureBrowserAgg.forEach(item => {
        const browser = item._id.browser || 'Unknown';
        const feature = item._id.feature || 'Unknown';
        if (!featureByBrowserRaw[browser]) featureByBrowserRaw[browser] = {};
        featureByBrowserRaw[browser][feature] = item.count;
      });

      const featureByBrowser = {};
      Object.keys(featureByBrowserRaw).forEach(browser => {
        featureByBrowser[browser] = {};
        Object.keys(featureByBrowserRaw[browser]).forEach(rawF => {
          const { key } = this._normalizeFeature(rawF);
          featureByBrowser[browser][key] = (featureByBrowser[browser][key] || 0) + featureByBrowserRaw[browser][rawF];
        });
      });

      // Feature usage by hour
      const featureHourAgg = await Event.aggregate([
        { $match: { ...eventFilter, type: 'feature' } },
        {
          $group: {
            _id: { hour: { $hour: '$timestamp' }, feature: '$details.feature' },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.hour': 1 } }
      ]);

      const featureByHourRaw = {};
      featureHourAgg.forEach(item => {
        const hour = item._id.hour;
        const feature = item._id.feature || 'Unknown';
        if (!featureByHourRaw[hour]) featureByHourRaw[hour] = {};
        featureByHourRaw[hour][feature] = item.count;
      });

      const featureByHour = {};
      Object.keys(featureByHourRaw).forEach(hour => {
        featureByHour[hour] = {};
        Object.keys(featureByHourRaw[hour]).forEach(rawF => {
          const { key } = this._normalizeFeature(rawF);
          featureByHour[hour][key] = (featureByHour[hour][key] || 0) + featureByHourRaw[hour][rawF];
        });
      });


      // Unique visitor counts for tried vs used (better conversion metric)
      const triedVisitorAgg = await Event.aggregate([
        { $match: { ...eventFilter, type: 'feature', $or: [{ 'details.action': 'tried_enable' }, { 'details.action': 'tried_disable' }, { 'details.action': 'enable' }, { 'details.action': 'disable' }] } },
        { $group: { _id: '$details.feature', visitors: { $addToSet: '$visitorId' } } }
      ]);

      const triedEnableVisitorAgg = await Event.aggregate([
        { $match: { ...eventFilter, type: 'feature', $or: [{ 'details.action': 'tried_enable' }, { 'details.action': 'enable' }, { 'details.action': 'enabled' }] } },
        { $group: { _id: '$details.feature', visitors: { $addToSet: '$visitorId' } } }
      ]);

      const usedVisitorAgg = await Event.aggregate([
        { $match: { ...eventFilter, type: 'feature', $or: [{ 'details.action': 'used' }, { 'details.action': 'use' }] } },
        { $group: { _id: '$details.feature', visitors: { $addToSet: '$visitorId' } } }
      ]);

      const triedVisitorsMap = {};
      triedVisitorAgg.forEach(item => { triedVisitorsMap[item._id || 'Unknown'] = (item.visitors || []).length; });
      const triedEnabledVisitorsMap = {};
      triedEnableVisitorAgg.forEach(item => { triedEnabledVisitorsMap[item._id || 'Unknown'] = (item.visitors || []).length; });
      const usedVisitorsMap = {};
      usedVisitorAgg.forEach(item => { usedVisitorsMap[item._id || 'Unknown'] = (item.visitors || []).length; });

      // Attach unique visitor counts to featureStats
      Object.keys(featureStats).forEach(f => {
        featureStats[f].triedVisitors = triedVisitorsMap[featureStats[f].display] || triedVisitorsMap[f] || 0;
        featureStats[f].triedEnabledVisitors = triedEnabledVisitorsMap[featureStats[f].display] || triedEnabledVisitorsMap[f] || 0;
        featureStats[f].usedVisitors = usedVisitorsMap[featureStats[f].display] || usedVisitorsMap[f] || 0;
      });

      // Calculate trending features (recent growth)
      const currentTime = new Date();
      const recentDays = 3;
      const recentCutoff = new Date(currentTime);
      recentCutoff.setDate(recentCutoff.getDate() - recentDays);

      const recentFeatureAgg = await Event.aggregate([
        { $match: { timestamp: { $gte: recentCutoff }, type: 'feature' } },
        {
          $group: {
            _id: { feature: '$details.feature' },
            recentCount: { $sum: 1 }
          }
        }
      ]);

      const olderCutoff = new Date(recentCutoff);
      olderCutoff.setDate(olderCutoff.getDate() - recentDays);

      const olderFeatureAgg = await Event.aggregate([
        { $match: { timestamp: { $gte: olderCutoff, $lt: recentCutoff }, type: 'feature' } },
        {
          $group: {
            _id: { feature: '$details.feature' },
            olderCount: { $sum: 1 }
          }
        }
      ]);

      const trendingFeatures = {};
      recentFeatureAgg.forEach(item => {
        const feature = item._id.feature || 'Unknown';
        trendingFeatures[feature] = { recent: item.recentCount, older: 0 };
      });

      olderFeatureAgg.forEach(item => {
        const feature = item._id.feature || 'Unknown';
        if (!trendingFeatures[feature]) trendingFeatures[feature] = { recent: 0, older: 0 };
        trendingFeatures[feature].older = item.olderCount;
      });

      // Calculate growth rate
      Object.keys(trendingFeatures).forEach(feature => {
        const data = trendingFeatures[feature];
        const growth = data.older > 0 ? ((data.recent - data.older) / data.older) * 100 : (data.recent > 0 ? 100 : 0);
        data.growth = growth;
        data.total = data.recent + data.older;
      });

      return {
        period: days,
        overview: {
          totalPageViews,
          totalWebsitesCreated: totalWebsites,
          periodUniqueVisitors: uniqueVisitors.length,
          todayViews,
          todayUniqueVisitors: todayUnique.length,
          todayWebsitesCreated: todayWebsites,
          totalWebsiteViews
        },
        charts: {
          trendData,
          deviceDistribution: deviceDistribution.reduce((acc, item) => { acc[item._id || 'Unknown'] = item.count; return acc; }, {}),
          browserDistribution: browserDistribution.reduce((acc, item) => { acc[item._id || 'Unknown'] = item.count; return acc; }, {}),
          osDistribution: osDistribution.reduce((acc, item) => { acc[item._id || 'Unknown'] = item.count; return acc; }, {}),
          eventTypeDistribution: eventTypeDistribution.reduce((acc, item) => { acc[item._id || 'Unknown'] = item.count; return acc; }, {}),
          websitesByEventType: websitesByEventType.reduce((acc, item) => { acc[item._id || 'Unknown'] = item.count; return acc; }, {}),
          hourlyDistribution: hourlyDistribution.map(item => ({ hour: item._id, count: item.count })),
          pageViewsByPage: pageViewsByPage.reduce((acc, item) => { acc[item._id || 'Unknown'] = item.count; return acc; }, {}),
          refererDistribution: refererDistribution.reduce((acc, item) => { acc[item._id || 'Direct'] = item.count; return acc; }, {}),
          exitPages: exitPages.reduce((acc, item) => { acc[item._id || 'Unknown'] = item.count; return acc; }, {}),
          geoDistribution: geoDistribution.reduce((acc, item) => { acc[item._id || 'Unknown'] = item.count; return acc; }, {}),
          geoUniqueVisitors: geoUniqueVisitorsAgg.reduce((acc, item) => { acc[item._id || 'Unknown'] = item.count; return acc; }, {}),
          featureStats: featureStats,
          featureTrend: featureTrend,
          featureByDevice: featureByDevice,
          featureByBrowser: featureByBrowser,
          featureByHour: featureByHour,
          trendingFeatures: trendingFeatures
        },
        recentActivity: recentEvents,
        websites: websites,
        topWebsites: topWebsites
      };
    } catch (err) {
      console.error('[Analytics] Error getting dashboard data:', err);
      return {};
    }
  }

  // ── Historical Data Migration ──
  async migrateHistoricalTrafficData() {
    try {
      console.log('[Analytics] Starting historical traffic data migration...');

      // Find all pageview events to migrate
      const eventsToMigrate = await Event.find({ type: 'pageview' });

      console.log(`[Analytics] Found ${eventsToMigrate.length} events to migrate`);

      let migrated = 0;
      let errors = 0;

      for (const event of eventsToMigrate) {
        try {
          const rawReferer = (event.details && event.details.referer) ? event.details.referer : 'Direct';
          const utmParams = parseUTMParameters(rawReferer);
          const pageUrl = event.page || (event.details && event.details.url) || '';
          const trafficSource = categorizeTrafficSource(rawReferer, utmParams, '', pageUrl);
          const searchEngine = extractSearchEngine(rawReferer) || (trafficSource.includes('Search') ? trafficSource : null);
          const searchKeywords = extractSearchKeywords(rawReferer);

          await Event.updateOne(
            { _id: event._id },
            {
              $set: {
                'details.trafficSource': trafficSource,
                'details.searchEngine': searchEngine,
                'details.searchKeywords': searchKeywords,
                'details.utmSource': utmParams.utmSource,
                'details.utmMedium': utmParams.utmMedium,
                'details.utmCampaign': utmParams.utmCampaign,
                'details.utmContent': utmParams.utmContent,
                'details.utmTerm': utmParams.utmTerm
              }
            }
          );

          migrated++;
          if (migrated % 100 === 0) {
            console.log(`[Analytics] Migrated ${migrated}/${eventsToMigrate.length} events...`);
          }
        } catch (err) {
          console.error(`[Analytics] Error migrating event ${event._id}:`, err.message);
          errors++;
        }
      }

      console.log(`[Analytics] Migration complete: ${migrated} migrated, ${errors} errors`);
      return { migrated, errors, total: eventsToMigrate.length };
    } catch (err) {
      console.error('[Analytics] Error in historical migration:', err);
      return { migrated: 0, errors: 1, total: 0 };
    }
  }

  // ── Traffic Sources Analytics ──
  async getTrafficSourcesData(days = 7) {
    try {
      const now = new Date();
      const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

      let timeFilter;
      if (days === -1) {
        timeFilter = {};
      } else if (days === 0) {
        timeFilter = { $gte: today };
      } else {
        const cutoff = new Date(today);
        cutoff.setDate(cutoff.getDate() - days);
        timeFilter = { $gte: cutoff };
      }

      const pageviewFilter = days === -1 ? { type: 'pageview' } : { type: 'pageview', timestamp: timeFilter };

      // Traffic source distribution
      const trafficSourceDistribution = await Event.aggregate([
        { $match: pageviewFilter },
        { $group: { _id: '$details.trafficSource', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);

      // Search engine distribution
      const searchEngineDistribution = await Event.aggregate([
        { $match: { ...pageviewFilter, 'details.trafficSource': { $regex: /Search/i } } },
        { $group: { _id: '$details.trafficSource', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);

      // Top search keywords
      const topKeywords = await Event.aggregate([
        { $match: { ...pageviewFilter, 'details.searchKeywords': { $nin: [null, '', undefined] } } },
        { $group: { _id: '$details.searchKeywords', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 50 }
      ]);

      // Social media & messaging platforms
      const socialPlatforms = await Event.aggregate([
        {
          $match: {
            ...pageviewFilter,
            'details.trafficSource': { $in: ['WhatsApp Share', 'Instagram', 'Facebook', 'Twitter (X)', 'Telegram', 'Social Media'] }
          }
        },
        { $group: { _id: '$details.trafficSource', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 }
      ]);

      // UTM campaign performance
      const utmCampaigns = await Event.aggregate([
        { $match: { ...pageviewFilter, 'details.utmCampaign': { $nin: [null, '', undefined] } } },
        {
          $group: {
            _id: {
              campaign: '$details.utmCampaign',
              source: '$details.utmSource',
              medium: '$details.utmMedium'
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 50 }
      ]);

      // Top referring domains
      const topReferrers = await Event.aggregate([
        { $match: { ...pageviewFilter, 'details.trafficSource': { $in: ['External Referral', 'Referral'] } } },
        { $group: { _id: '$details.referer', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 30 }
      ]);

      // Traffic sources trend over time
      const trafficTrend = await Event.aggregate([
        { $match: pageviewFilter },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp", timezone: "UTC" } },
              source: '$details.trafficSource'
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.date': 1 } }
      ]);

      // KPI calculations
      const totalSessions = await Event.countDocuments(pageviewFilter);
      const googleSearch = await Event.countDocuments({ ...pageviewFilter, 'details.trafficSource': 'Google Search' });
      const bingSearch = await Event.countDocuments({ ...pageviewFilter, 'details.trafficSource': 'Bing Search' });
      const otherSearch = await Event.countDocuments({ ...pageviewFilter, 'details.trafficSource': { $in: ['Other Search Engine', 'DuckDuckGo Search', 'Yahoo Search'] } });
      const directTraffic = await Event.countDocuments({ ...pageviewFilter, 'details.trafficSource': { $in: ['Direct / Typed URL', 'Direct'] } });
      const sharedWebsites = await Event.countDocuments({ ...pageviewFilter, 'details.trafficSource': 'Shared Generated Website' });
      const socialMedia = await Event.countDocuments({ ...pageviewFilter, 'details.trafficSource': { $in: ['WhatsApp Share', 'Instagram', 'Facebook', 'Twitter (X)', 'Telegram', 'Social Media'] } });
      const referral = await Event.countDocuments({ ...pageviewFilter, 'details.trafficSource': { $in: ['External Referral', 'Referral'] } });

      // Recent traffic sessions with full details
      const recentTraffic = await Event.find(pageviewFilter)
        .sort({ timestamp: -1 })
        .limit(100);

      return {
        period: days,
        kpi: {
          totalSessions,
          googleSearch,
          bingSearch,
          otherSearch,
          organicSearch: googleSearch + bingSearch + otherSearch,
          directTraffic,
          sharedWebsites,
          socialMedia,
          referral
        },
        charts: {
          trafficSourceDistribution: trafficSourceDistribution.reduce((acc, item) => { acc[item._id || 'Direct / Typed URL'] = item.count; return acc; }, {}),
          searchEngineDistribution: searchEngineDistribution.reduce((acc, item) => { acc[item._id || 'Google Search'] = item.count; return acc; }, {}),
          topKeywords: topKeywords.reduce((acc, item) => { acc[item._id || 'Unknown'] = item.count; return acc; }, {}),
          socialPlatforms: socialPlatforms.reduce((acc, item) => { acc[item._id || 'Social'] = item.count; return acc; }, {}),
          utmCampaigns: utmCampaigns.map(item => ({
            campaign: item._id.campaign,
            source: item._id.source,
            medium: item._id.medium,
            count: item.count
          })),
          topReferrers: topReferrers.reduce((acc, item) => { acc[item._id || 'Unknown'] = item.count; return acc; }, {}),
          trafficTrend
        },
        recentTraffic
      };
    } catch (err) {
      console.error('[Analytics] Error getting traffic sources data:', err);
      return {};
    }
  }

  // Stub for compatibility with previous logic
  trackFeatureUsage(req, data) { return this.trackEvent(req, { type: 'feature', details: data }); }
  trackExit(req, data) { return this.trackEvent(req, { type: 'exit', details: data }); }
  trackSession(req, data) { return this.trackEvent(req, { type: 'session', details: data }); }

  // ── Delete Single Website & All Related Resources ──
  async deleteWebsite(websiteId, force = false, cloudinaryRef = null) {
    try {
      const { Website, Event, Feedback, CustomSlug, Payment } = require('./models');
      const cloud = cloudinaryRef || require('cloudinary').v2;

      // 1. Check if website is Premium / Paid
      const paidPayment = await Payment.findOne({ websiteId, status: 'PAID' }).lean();
      const customSlug = await CustomSlug.findOne({ websiteId }).lean();
      const isPremium = Boolean(paidPayment || customSlug);

      if (isPremium && !force) {
        return {
          success: false,
          isPremium: true,
          message: `Website "${websiteId}" is a Premium / Paid website. Set force=true to override and delete.`
        };
      }

      // 2. Delete Cloudinary Raw Config
      let cloudinaryDeleted = false;
      try {
        const destroyRes = await cloud.uploader.destroy(`configs/${websiteId}`, { resource_type: 'raw' });
        cloudinaryDeleted = destroyRes.result === 'ok' || destroyRes.result === 'not found';
      } catch (cErr) {
        console.warn(`[Analytics] Cloudinary destroy warning for website ${websiteId}:`, cErr.message);
      }

      // 3. Delete MongoDB documents across collections
      const websiteRes = await Website.deleteOne({ id: websiteId });
      const eventsRes = await Event.deleteMany({ websiteId });
      const feedbackRes = await Feedback.deleteMany({ websiteId });
      const customSlugRes = await CustomSlug.deleteMany({ websiteId });
      const paymentRes = await Payment.deleteMany({ websiteId });

      console.log(`[Analytics] Deleted website ${websiteId}: website=${websiteRes.deletedCount}, events=${eventsRes.deletedCount}, feedback=${feedbackRes.deletedCount}, slugs=${customSlugRes.deletedCount}, payments=${paymentRes.deletedCount}`);

      return {
        success: true,
        websiteId,
        isPremium,
        cloudinaryDeleted,
        deleted: {
          website: websiteRes.deletedCount,
          events: eventsRes.deletedCount,
          feedback: feedbackRes.deletedCount,
          customSlugs: customSlugRes.deletedCount,
          payments: paymentRes.deletedCount
        }
      };
    } catch (err) {
      console.error(`[Analytics] Error deleting website ${websiteId}:`, err);
      throw err;
    }
  }

  // ── Bulk Delete Websites (With Age Filtering & Premium Protection) ──
  async bulkDeleteWebsites({ websiteIds = null, olderThanDays = null, protectPremium = true } = {}, cloudinaryRef = null) {
    try {
      const { Website, Event, Feedback, CustomSlug, Payment } = require('./models');

      // 1. Determine candidate website IDs
      let candidateIds = new Set();

      if (Array.isArray(websiteIds) && websiteIds.length > 0) {
        websiteIds.forEach(id => {
          if (id && typeof id === 'string') candidateIds.add(id.trim());
        });
      }

      if (olderThanDays !== null && olderThanDays !== undefined && !isNaN(olderThanDays)) {
        const daysNum = parseInt(olderThanDays);
        if (daysNum >= 0) {
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - daysNum);

          const oldSites = await Website.find({ createdAt: { $lt: cutoffDate } }, { id: 1 }).lean();
          oldSites.forEach(s => candidateIds.add(s.id));
        }
      }

      const allCandidates = Array.from(candidateIds);
      if (allCandidates.length === 0) {
        return { success: true, deletedCount: 0, protectedCount: 0, message: 'No candidate websites matched the deletion criteria.' };
      }

      // 2. Identify Premium / Paid Websites
      const paidWebsiteIds = new Set(await Payment.distinct('websiteId', { status: 'PAID' }));
      const slugWebsiteIds = new Set(await CustomSlug.distinct('websiteId'));

      const toDelete = [];
      const protectedList = [];

      for (const id of allCandidates) {
        const isPremium = paidWebsiteIds.has(id) || slugWebsiteIds.has(id);
        if (isPremium && protectPremium) {
          protectedList.push(id);
        } else {
          toDelete.push({ id, force: isPremium });
        }
      }

      // 3. Execute High-Performance Bulk Deletion
      const idsToDelete = toDelete.map(item => item.id);
      let totalDeletedCount = 0;

      if (idsToDelete.length > 0) {
        // Bulk delete MongoDB records across all collections simultaneously
        const [websiteRes] = await Promise.all([
          Website.deleteMany({ id: { $in: idsToDelete } }),
          Event.deleteMany({ websiteId: { $in: idsToDelete } }),
          Feedback.deleteMany({ websiteId: { $in: idsToDelete } }),
          CustomSlug.deleteMany({ websiteId: { $in: idsToDelete } }),
          Payment.deleteMany({ websiteId: { $in: idsToDelete } })
        ]);

        totalDeletedCount = websiteRes.deletedCount || idsToDelete.length;

        // Destroy Cloudinary configs concurrently in batches of 25 to prevent request timeouts
        const cloud = cloudinaryRef || require('cloudinary').v2;
        const chunkSize = 25;
        for (let i = 0; i < idsToDelete.length; i += chunkSize) {
          const chunk = idsToDelete.slice(i, i + chunkSize);
          await Promise.allSettled(chunk.map(id =>
            cloud.uploader.destroy(`configs/${id}`, { resource_type: 'raw' }).catch(() => {})
          ));
        }
      }

      return {
        success: true,
        deletedCount: totalDeletedCount,
        protectedCount: protectedList.length,
        protectedIds: protectedList
      };
    } catch (err) {
      console.error('[Analytics] Error in bulk website deletion:', err);
      throw err;
    }
  }
}

module.exports = new AnalyticsStore();
