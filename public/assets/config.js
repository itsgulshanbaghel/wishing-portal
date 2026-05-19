/**
 * Global Configuration for Deployment
 * 
 * LOCAL TESTING: Set API_BASE_URL to window.location.origin (if on same server) or http://localhost:3000
 * DEPLOYMENT: Set API_BASE_URL to your Render URL (e.g., https://your-app.onrender.com)
 */

const CONFIG = {
  API_BASE_URL: 'https://wishing-portal.onrender.com',
  ADDITIONAL_API_BASE_URL: 'https://thegreeter.in'
};

// Auto-detect if we are on Localhost (for development)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  CONFIG.API_BASE_URL = window.location.origin;
}

window.APP_CONFIG = CONFIG;
