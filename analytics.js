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
        { new: true }
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
          // Other distributions would go here...
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
