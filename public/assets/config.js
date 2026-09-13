/**
 * Global Configuration for Deployment
 * 
 * LOCAL TESTING: Set API_BASE_URL to window.location.origin (if on same server) or http://localhost:3000
 * DEPLOYMENT: Set API_BASE_URL to your Render URL (e.g., https://your-app.onrender.com)
 */

const CONFIG = {
  // Production Backend URL: Uses current origin (thegreeter.in) so Cloudflare Worker proxies and load-balances
  API_BASE_URL: (typeof window !== 'undefined' && window.location) ? window.location.origin : '',
  ADDITIONAL_API_BASE_URL: null,

  // Google Analytics 4 Measurement ID
  GA_MEASUREMENT_ID: 'G-XXXXXXXXXX'
};

if (typeof window !== 'undefined' && window.location) {
  CONFIG.API_BASE_URL = window.location.origin;
}

window.APP_CONFIG = CONFIG;

// ── Google Analytics 4 (GA4) Automatic Loader ──
(function() {
  const gaId = CONFIG.GA_MEASUREMENT_ID;
  window.dataLayer = window.dataLayer || [];
  function gtag(){ window.dataLayer.push(arguments); }
  window.gtag = gtag;

  // Only load GA4 if a real measurement ID is provided
  if (gaId && gaId.startsWith('G-') && gaId !== 'G-XXXXXXXXXX') {
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(gaId);
    document.head.appendChild(script);

    gtag('js', new Date());
    gtag('config', gaId, {
      send_page_view: true
    });
    console.log('[Analytics] Google Analytics 4 initialized with ID:', gaId);
  }
})();
