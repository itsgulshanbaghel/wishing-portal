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

      // Update or create visitor
      await Visitor.findOneAndUpdate(
        { visitorId },
        { $set: { lastVisit: new Date(), ip, geo }, $setOnInsert: { firstVisit: new Date() } },
        { upsert: true }
      );

      // Create event
      const event = await Event.create({
        visitorId,
        type: 'pageview',
        page,
        geo,
        details: {
          userAgent: ua,
          referer: req.headers['referer'] || 'Direct',
          device: _parseDevice(ua),
          browser: _parseBrowser(ua),
          os: _parseOS(ua)
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

      // Recent Activity - handle All Time case, include all relevant event types
      const recentEventsFilter = days === -1 ? {} : { timestamp: timeFilter };
      const recentEvents = await Event.find(recentEventsFilter)
        .sort({ timestamp: -1 })
        .limit(50);

      // Websites List - respect time period filter
      const websitesListFilter = days === -1 ? {} : { createdAt: timeFilter };
      const websites = await Website.find(websitesListFilter)
        .sort({ createdAt: -1 })
        .limit(500);

      // Top Websites - respect time period filter
      const topWebsitesFilter = days === -1 ? {} : { createdAt: timeFilter };
      const topWebsites = await Website.find(topWebsitesFilter)
        .sort({ views: -1 })
        .limit(20);

      // Daily Stats for charts - handle All Time case
      const dailyStatsFilter = days === -1 ? {} : { timestamp: timeFilter };
      const dailyStats = await Event.aggregate([
        { $match: dailyStatsFilter },
        { $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp", timezone: "UTC" } },
          views: { $sum: { $cond: [{ $eq: ["$type", "pageview"] }, 1, 0] } },
          uniqueVisitors: { $addToSet: "$visitorId" }
        }},
        { $project: {
          _id: 1,
          views: 1,
          uniqueVisitors: { $size: "$uniqueVisitors" }
        }},
        { $sort: { _id: 1 } }
      ]);

      const websiteStatsFilter = days === -1 ? {} : { createdAt: timeFilter };
      const websiteStats = await Website.aggregate([
        { $match: websiteStatsFilter },
        { $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" } },
          count: { $sum: 1 }
        }},
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
        { $group: {
          _id: { $hour: '$timestamp' },
          count: { $sum: 1 }
        }},
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

      const featureStatsAgg = await Event.aggregate([
        { $match: { ...eventFilter, type: 'feature' } },
        { $group: {
          _id: { feature: '$details.feature', action: '$details.action' },
          count: { $sum: 1 }
        }},
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
        { $group: {
          _id: { date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp", timezone: "UTC" } }, feature: '$details.feature' },
          count: { $sum: 1 }
        }},
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
         { $group: {
           _id: { device: '$details.device', feature: '$details.feature' },
           count: { $sum: 1 }
         }},
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
         { $group: {
           _id: { browser: '$details.browser', feature: '$details.feature' },
           count: { $sum: 1 }
         }},
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
         { $group: {
           _id: { hour: { $hour: '$timestamp' }, feature: '$details.feature' },
           count: { $sum: 1 }
         }},
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
        { $match: { ...eventFilter, type: 'feature', $or: [ { 'details.action': 'tried_enable' }, { 'details.action': 'tried_disable' }, { 'details.action': 'enable' }, { 'details.action': 'disable' } ] } },
        { $group: { _id: '$details.feature', visitors: { $addToSet: '$visitorId' } } }
      ]);

      const triedEnableVisitorAgg = await Event.aggregate([
        { $match: { ...eventFilter, type: 'feature', $or: [ { 'details.action': 'tried_enable' }, { 'details.action': 'enable' }, { 'details.action': 'enabled' } ] } },
        { $group: { _id: '$details.feature', visitors: { $addToSet: '$visitorId' } } }
      ]);

      const usedVisitorAgg = await Event.aggregate([
        { $match: { ...eventFilter, type: 'feature', $or: [ { 'details.action': 'used' }, { 'details.action': 'use' } ] } },
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
        { $group: {
          _id: { feature: '$details.feature' },
          recentCount: { $sum: 1 }
        }}
      ]);

      const olderCutoff = new Date(recentCutoff);
      olderCutoff.setDate(olderCutoff.getDate() - recentDays);

      const olderFeatureAgg = await Event.aggregate([
        { $match: { timestamp: { $gte: olderCutoff, $lt: recentCutoff }, type: 'feature' } },
        { $group: {
          _id: { feature: '$details.feature' },
          olderCount: { $sum: 1 }
        }}
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

  // Stub for compatibility with previous logic
  trackFeatureUsage(req, data) { return this.trackEvent(req, { type: 'feature', details: data }); }
  trackExit(req, data) { return this.trackEvent(req, { type: 'exit', details: data }); }
  trackSession(req, data) { return this.trackEvent(req, { type: 'session', details: data }); }
}

module.exports = new AnalyticsStore();
