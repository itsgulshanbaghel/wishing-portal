/**
 * Global Configuration for Deployment
 * 
 * LOCAL TESTING: Set API_BASE_URL to window.location.origin (if on same server) or http://localhost:3000
 * DEPLOYMENT: Set API_BASE_URL to your Render URL (e.g., https://your-app.onrender.com)
 */

const CONFIG = {
  // Production Backend URL (Render Web Service)
  API_BASE_URL: 'https://wishing-portal-05as.onrender.com',
  ADDITIONAL_API_BASE_URL: null,

  // Google Analytics 4 Measurement ID
  // Replace 'G-XXXXXXXXXX' with your actual GA4 Measurement ID from https://analytics.google.com
  GA_MEASUREMENT_ID: 'G-XXXXXXXXXX'
};

// Auto-detect if we are on Localhost (for development)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  CONFIG.API_BASE_URL = window.location.origin;
}

// If accessing directly from backend URL itself, use same origin
if (window.location.hostname.includes('onrender.com') || window.location.hostname.includes('vercel.app')) {
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
