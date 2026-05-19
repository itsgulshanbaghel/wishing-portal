/**
 * Greeter Analytics Tracker (Silent)
 * Collects user behavior data without any user interaction.
 * Sends data to the server-side analytics engine.
 */
(function () {
  'use strict';

  const API_BASE = (function () {
    const loc = window.location;
    // Local development: use same origin
    if (loc.hostname === 'localhost' || loc.hostname === '127.0.0.1') {
      return loc.origin;
    }
    // Check if we have a global config from config.js
    if (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) {
      return window.APP_CONFIG.API_BASE_URL;
    }
    // Always point to the Render backend for analytics
    return 'https://wishing-portal.onrender.com';
  })();

  // ── Utilities ──

  function getPageName() {
    const path = window.location.pathname;
    const filename = path.split('/').pop() || 'index.html';
    return filename.replace('.html', '') || 'home';
  }

  function getSessionId() {
    let sid = sessionStorage.getItem('_gt_sid');
    if (!sid) {
      sid = 'cs_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
      sessionStorage.setItem('_gt_sid', sid);
    }
    return sid;
  }

  function getVisitorId() {
    let vid = localStorage.getItem('_gt_vid');
    if (!vid) {
      vid = 'cv_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem('_gt_vid', vid);
    }
    return vid;
  }

  function sendBeacon(endpoint, data) {
    const payload = JSON.stringify({
      ...data,
      sessionId: getSessionId(),
      visitorId: getVisitorId(),
      url: window.location.href,
      timestamp: new Date().toISOString()
    });

    // Use sendBeacon for reliability (works even on page unload)
    if (navigator.sendBeacon) {
      navigator.sendBeacon(API_BASE + endpoint, new Blob([payload], { type: 'application/json' }));
    } else {
      // Fallback to fetch
      fetch(API_BASE + endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true
      }).catch(() => { }); // Silent fail
    }
  }

  // ── Page View Tracking ──

  function trackPageView() {
    sendBeacon('/api/analytics/pageview', {
      page: getPageName(),
      referrer: document.referrer || 'Direct',
      screenWidth: screen.width,
      screenHeight: screen.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      language: navigator.language || 'unknown'
    });
  }

  // ── Session Tracking ──

  function trackSession() {
    // Only track new sessions
    if (sessionStorage.getItem('_gt_session_tracked')) return;
    sessionStorage.setItem('_gt_session_tracked', '1');

    sendBeacon('/api/analytics/session', {
      entryPage: getPageName(),
      screenResolution: screen.width + 'x' + screen.height,
      colorDepth: screen.colorDepth,
      language: navigator.language,
      platform: navigator.platform || 'unknown',
      cookiesEnabled: navigator.cookieEnabled,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown',
      connectionType: navigator.connection?.effectiveType || 'unknown'
    });
  }

  // ── Feature Usage Tracking ──

  // Expose globally for internal use
  window._gtTrackFeature = function (feature, action, details) {
    sendBeacon('/api/analytics/feature', {
      page: getPageName(),
      feature: feature,
      action: action || 'use',
      details: details || {}
    });
  };

  // ── Event Tracking ──

  window._gtTrackEvent = function (type, details) {
    sendBeacon('/api/analytics/event', {
      page: getPageName(),
      type: type,
      details: details || {}
    });
  };

  // ── Click Tracking (on interactive elements) ──

  function trackClicks() {
    document.addEventListener('click', function (e) {
      const target = e.target.closest('a, button, .event-chip, .template-card, .toggle-row, .mode-toggle, .lang-toggle, .nav-links a');
      if (!target) return;

      const data = {
        tag: target.tagName.toLowerCase(),
        id: target.id || '',
        classes: (target.className || '').toString().substring(0, 100),
        text: (target.textContent || '').substring(0, 60).trim(),
        href: target.href || ''
      };

      sendBeacon('/api/analytics/event', {
        page: getPageName(),
        type: 'click',
        details: data
      });
    }, { passive: true });
  }

  // ── Scroll Depth Tracking ──

  function trackScrollDepth() {
    let maxScroll = 0;
    let reported = { 25: false, 50: false, 75: false, 100: false };

    function onScroll() {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.offsetHeight
      );
      const winHeight = window.innerHeight;
      const scrollPercent = Math.min(Math.round((scrollTop / (docHeight - winHeight)) * 100), 100);

      if (scrollPercent > maxScroll) {
        maxScroll = scrollPercent;

        [25, 50, 75, 100].forEach(threshold => {
          if (maxScroll >= threshold && !reported[threshold]) {
            reported[threshold] = true;
            sendBeacon('/api/analytics/event', {
              page: getPageName(),
              type: 'scroll_depth',
              details: { depth: threshold }
            });
          }
        });
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // ── Time on Page Tracking ──

  function trackTimeOnPage() {
    const startTime = Date.now();
    let lastPing = startTime;

    // Send time-on-page every 30 seconds while user is active
    const pingInterval = setInterval(() => {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      if (elapsed > 0 && document.visibilityState === 'visible') {
        lastPing = Date.now();
      }
    }, 30000);

    // Send final time on page when leaving
    function sendTimeOnPage() {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      if (elapsed > 1) { // Only if they spent more than 1 second
        sendBeacon('/api/analytics/event', {
          page: getPageName(),
          type: 'time_on_page',
          details: { seconds: elapsed }
        });
      }
      clearInterval(pingInterval);
    }

    // Use both beforeunload and visibilitychange for reliability
    window.addEventListener('beforeunload', sendTimeOnPage);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') {
        sendTimeOnPage();
      }
    });
  }

  // ── Exit Intent Tracking ──

  function trackExitIntent() {
    // Track when user leaves the page
    window.addEventListener('beforeunload', function () {
      sendBeacon('/api/analytics/exit', {
        page: getPageName(),
        timeSpent: Math.round((Date.now() - performance.timing.navigationStart) / 1000)
      });
    });

    // Mouse leaves viewport (desktop exit intent)
    document.addEventListener('mouseout', function (e) {
      if (e.clientY <= 0) {
        sendBeacon('/api/analytics/event', {
          page: getPageName(),
          type: 'exit_intent',
          details: { method: 'mouse_leave_top' }
        });
      }
    }, { passive: true });
  }

  // ── Template/Event Selection Tracking ──

  function trackTemplateInteractions() {
    // Track event chip clicks
    document.addEventListener('click', function (e) {
      const chip = e.target.closest('.event-chip');
      if (chip) {
        window._gtTrackEvent('event_category_select', {
          category: chip.dataset.event || chip.textContent.trim()
        });
      }

      // Track template card selection
      const card = e.target.closest('.template-card');
      if (card) {
        window._gtTrackEvent('template_select', {
          templateIndex: Array.from(card.parentElement?.children || []).indexOf(card)
        });
      }

      // Track feature toggle (tried, not used yet) — use feature ID when available
      const toggle = e.target.closest('.toggle-row');
      if (toggle) {
        const label = toggle.querySelector('.toggle-label');
        const isActive = toggle.classList.contains('active');
        // toggle element id is 'toggle-<featureId>' in the customizer
        const fid = (toggle.id && toggle.id.startsWith('toggle-')) ? toggle.id.replace(/^toggle-/, '') : (label?.textContent?.trim() || 'unknown');
        window._gtTrackFeature(
          fid,
          isActive ? 'tried_enable' : 'tried_disable'
        );
      }

      // Track dark mode toggle
      const modeToggle = e.target.closest('.mode-toggle');
      if (modeToggle) {
        window._gtTrackEvent('theme_toggle', {
          theme: document.body.classList.contains('dark') ? 'light' : 'dark'
        });
      }

      // Track language toggle
      const langToggle = e.target.closest('.lang-toggle');
      if (langToggle) {
        window._gtTrackEvent('language_toggle', {
          language: langToggle.textContent.trim()
        });
      }
    }, { passive: true });
  }

  // ── Website View Tracking (for shared/generated sites) ──

  function trackWebsiteView() {
    const params = new URLSearchParams(window.location.search);
    const viewId = params.get('view');
    if (viewId) {
      sendBeacon('/api/analytics/website-view', {
        websiteId: viewId,
        referrer: document.referrer || 'Direct'
      });
    }
  }

  // ── Initialize All Tracking ──

  function init() {
    // Don't track admin page itself
    if (window.location.pathname.includes('admin')) return;

    trackPageView();
    trackSession();
    trackClicks();
    trackScrollDepth();
    trackTimeOnPage();
    trackExitIntent();
    trackTemplateInteractions();
    trackWebsiteView();
  }

  // Start tracking when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
