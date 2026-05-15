(function () {
  'use strict';

  const API_BASE = (function () {
    if (typeof window !== 'undefined' && window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) {
      return window.APP_CONFIG.API_BASE_URL;
    }
    // Explicit fallback to Render backend to avoid relative /api on static hosts
    const FALLBACK = 'https://wishing-portal.onrender.com';
    try {
      const loc = window.location;
      if (loc.hostname === 'localhost' || loc.hostname === '127.0.0.1') return loc.origin;
    } catch (e) { }
    return FALLBACK;
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
    const url = API_BASE + endpoint;
    let isCrossOrigin = true;    try {      isCrossOrigin = new URL(url).origin !== window.location.origin;    } catch (e) {      isCrossOrigin = true;    }    // Use sendBeacon only for same-origin unload pings where it's reliable        if (!isCrossOrigin && navigator.sendBeacon) {      navigator.sendBeacon(url, new Blob([payload], { type: 'application/json' }));      return;    }    // For cross-origin and general cases use fetch with keepalive and CORS    try {      fetch(url, {        method: 'POST',        headers: { 'Content-Type': 'application/json' },        body: payload,        keepalive: true,        mode: 'cors'      }).catch(() => { });    } catch (e) { }  }

  // ── Page View Tracking ──

  function trackPageView() {
    sendBeacon('/api/analytics/pageview', {      page: getPageName(),      referrer: document.referrer || 'Direct',      screenWidth: screen.width,      screenHeight: screen.height,      viewportWidth: window.innerWidth,      viewportHeight: window.innerHeight,      language: navigator.language || 'unknown'    });  }
  // rest of the file unchanged — append original tracker implementation below