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
      const today = new Date(now.setUTCHours(0,0,0,0));
      const cutoff = new Date(today);
      if (days > 0) cutoff.setDate(cutoff.getDate() - days);

      // Basic totals
      const totalPageViews = await Event.countDocuments({ type: 'pageview', timestamp: { $gte: cutoff } });
      const totalWebsites = await Website.countDocuments({ createdAt: { $gte: cutoff } });
      const uniqueVisitors = await Event.distinct('visitorId', { timestamp: { $gte: cutoff } });
      
      const todayViews = await Event.countDocuments({ type: 'pageview', timestamp: { $gte: today } });
      const todayWebsites = await Website.countDocuments({ createdAt: { $gte: today } });
      const todayUnique = await Event.distinct('visitorId', { timestamp: { $gte: today } });

      // Recent Activity
      const recentEvents = await Event.find({ timestamp: { $gte: cutoff } })
        .sort({ timestamp: -1 })
        .limit(50);

      // Websites List
      const websites = await Website.find()
        .sort({ createdAt: -1 })
        .limit(500);

      // Top Websites
      const topWebsites = await Website.find()
        .sort({ views: -1 })
        .limit(20);

      // Daily Stats for charts
      const dailyStats = await Event.aggregate([
        { $match: { timestamp: { $gte: cutoff } } },
        { $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
          views: { $sum: { $cond: [{ $eq: ["$type", "pageview"] }, 1, 0] } },
          uniqueVisitors: { $addToSet: "$visitorId" }
        }},
        { $sort: { _id: 1 } }
      ]);

      const websiteStats = await Website.aggregate([
        { $match: { createdAt: { $gte: cutoff } } },
        { $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }},
        { $sort: { _id: 1 } }
      ]);

      // Merge stats for trend chart
      const trendData = dailyStats.map(stat => {
        const wStat = websiteStats.find(w => w._id === stat._id);
        return {
          date: stat._id,
          views: stat.views,
          uniqueVisitors: stat.uniqueVisitors.length,
          websitesCreated: wStat ? wStat.count : 0
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
          todayWebsitesCreated: todayWebsites
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
