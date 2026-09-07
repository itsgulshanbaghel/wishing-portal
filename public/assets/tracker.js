/**
 * Greeter Analytics Tracker - Streamlined for Google Analytics 4 (GA4)
 * 
 * BACKEND-LOAD FREE:
 * - All heavy click/scroll/session tracking is removed.
 * - Zero network requests or beacons are sent to the backend server.
 * - Global helper functions (_gtTrackFeature, _gtTrackEvent) seamlessly
 *   route events to Google Analytics 4 (gtag) without touching your database.
 */
(function () {
  'use strict';

  // Helper to safely send events to GA4
  function sendToGA(eventName, params) {
    if (typeof window.gtag === 'function') {
      try {
        window.gtag('event', eventName, params || {});
      } catch (e) {
        // Silent fallback
      }
    }
  }

  // ── Global Helper Functions for Backwards Compatibility ──

  window._gtTrackFeature = function (feature, action, details) {
    sendToGA('feature_usage', {
      feature_name: feature,
      feature_action: action || 'use',
      ...(details || {})
    });
  };

  window._gtTrackEvent = function (type, details) {
    sendToGA(type || 'custom_event', details || {});
  };

  console.log('[Analytics] Greeter Tracker active in lightweight GA4 mode (zero backend load).');
})();
