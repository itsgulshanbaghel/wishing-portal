/* ══════════════════════════════════════════════════════════
    Greeter Admin Dashboard — JavaScript Controller
    ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  // Ensure we have the correct API base URL
  const getApiBaseUrl = () => {
    if (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) {
      return window.APP_CONFIG.API_BASE_URL;
    }
    return '';
  };

  const API = getApiBaseUrl();
  const ADDITIONAL_API = (window.APP_CONFIG && window.APP_CONFIG.ADDITIONAL_API_BASE_URL) ? window.APP_CONFIG.ADDITIONAL_API_BASE_URL : null;
  let authToken = localStorage.getItem('_gt_admin_token') || '';
  let dashData = null;
  let charts = {};

  // Theme Management
  let currentTheme = localStorage.getItem('_gt_admin_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', currentTheme);

  function setChartDefaults() {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    Chart.defaults.color = isLight ? '#4a4a6a' : '#d1d1e9';
    Chart.defaults.borderColor = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)';
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.font.size = 11;
  }
  setChartDefaults();

  const COLORS = ['#7b5df6', '#ff7a2f', '#06b6d4', '#22c55e', '#ec4899', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6', '#f97316', '#6366f1', '#a855f7'];
  const COLORS_ALPHA = COLORS.map(c => c + '30');

  // ── DOM refs ──
  const loginScreen = document.getElementById('loginScreen');
  const dashScreen = document.getElementById('dashboardScreen');
  const loginForm = document.getElementById('loginForm');
  const loginError = document.getElementById('loginError');
  const loadingOverlay = document.getElementById('loadingOverlay');
  const sectionTitle = document.getElementById('sectionTitle');
  const lastUpdated = document.getElementById('lastUpdated');
  const allFeedbackModal = document.getElementById('allFeedbackModal');
  const allFeedbackTableBody = document.querySelector('#allFeedbackTable tbody');

  // ── Auth ──
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.textContent = '';
    const user = document.getElementById('loginUser').value;
    const pass = document.getElementById('loginPass').value;
    try {
      const r = await fetch(API + '/api/admin/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, password: pass })
      });
      const data = await r.json();
      if (data.success && data.token) {
        authToken = data.token;
        localStorage.setItem('_gt_admin_token', authToken);
        showDashboard();
      } else {
        loginError.textContent = 'Invalid credentials. Please try again.';
      }
    } catch (err) {
      loginError.textContent = 'Connection error. Is the server running?';
    }
  });

  document.getElementById('logoutBtn').addEventListener('click', () => {
    authToken = '';
    localStorage.removeItem('_gt_admin_token');
    dashScreen.style.display = 'none';
    loginScreen.style.display = 'flex';
  });

  // ── Auto-login if token exists ──
  if (authToken) showDashboard();

  async function showDashboard() {
    loginScreen.style.display = 'none';
    dashScreen.style.display = 'flex';

    // Initial data load
    await loadDashboard();

    // Background auto-sync and cloudinary load for accuracy
    console.log('[Admin] Auto-triggering sync and load...');
    triggerSync().catch(err => console.warn('Auto-sync suppressed:', err));
    triggerCloudinaryLoad().catch(err => console.warn('Auto-load suppressed:', err));
  }

  // ── API calls ──
  async function apiFetch(url, options = {}) {
    const headers = {
      'Authorization': 'Basic ' + authToken,
      'Content-Type': 'application/json',
      ...options.headers
    };
    const r = await fetch(API + url, { ...options, headers });
    console.log(`[Admin] API Request: ${url} Status: ${r.status}`);
    if (r.status === 401) {
      authToken = '';
      localStorage.removeItem('_gt_admin_token');
      dashScreen.style.display = 'none';
      loginScreen.style.display = 'flex';
      loginError.textContent = 'Session expired. Please login again.';
      throw new Error('Unauthorized');
    }
    const text = await r.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error(`[Admin] Non-JSON response (HTTP ${r.status}) from ${url}:`, text.slice(0, 300));
      throw new Error(`Server error (HTTP ${r.status}) — check server logs`);
    }
  }

  // ── Theme Toggle ──
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('_gt_admin_theme', newTheme);
      themeToggleBtn.innerHTML = newTheme === 'dark' ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';

      // Update charts for new theme
      setChartDefaults();
      if (dashData) renderAll();
    });
    // Set initial icon
    themeToggleBtn.innerHTML = currentTheme === 'dark' ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
  }

  async function loadDashboard() {
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) refreshBtn.classList.add('loading');
    const period = document.getElementById('periodSelector')?.value || '7';
    try {
      dashData = await apiFetch(`/api/admin/dashboard?days=${period}`);
      console.log(`[Admin] Dashboard data (period: ${period}d) received:`, dashData);

      // Load feedback data separately
      try {
        dashData.feedback = await apiFetch('/api/admin/feedback-analytics');
        console.log('[Admin] Feedback data received:', dashData.feedback);
      } catch (fbErr) {
        console.error('Feedback load error:', fbErr);
        dashData.feedback = { totalFeedback: 0, recentFeedback: [], questionStats: {} };
      }

      // Load traffic sources data separately
      try {
        dashData.trafficSources = await apiFetch(`/api/admin/traffic-sources?days=${period}`);
        console.log('[Admin] Traffic sources data received:', dashData.trafficSources);
      } catch (tsErr) {
        console.error('Traffic sources load error:', tsErr);
        dashData.trafficSources = { kpi: {}, charts: {}, recentTraffic: [] };
      }

      // If configured, also fetch the same admin endpoints from the additional site and merge
      if (ADDITIONAL_API) {
        try {
          // Lightweight fetch for additional dashboard data
          async function additionalFetch(url, options = {}) {
            try {
              const headers = { 'Authorization': 'Basic ' + authToken, 'Content-Type': 'application/json', ...options.headers };
              const r = await fetch(ADDITIONAL_API + url, { ...options, headers });
              if (!r.ok) return null;
              const text = await r.text();
              return JSON.parse(text);
            } catch (e) {
              return null;
            }
          }

          function mergeOverview(primary, other) {
            if (!other || !other.overview) return;
            primary.overview = primary.overview || {};
            const keys = ['totalPageViews', 'totalWebsitesCreated', 'periodUniqueVisitors', 'todayViews', 'todayWebsitesCreated', 'totalWebsiteViews', 'todayUniqueVisitors'];
            keys.forEach(k => { primary.overview[k] = (Number(primary.overview[k] || 0) + Number(other.overview[k] || 0)); });
          }

          function mergeTrend(primaryArr, otherArr) {
            const map = {};
            (primaryArr || []).concat(otherArr || []).forEach(item => {
              if (!item || !item.date) return;
              map[item.date] = map[item.date] || { date: item.date, views: 0, uniqueVisitors: 0, websitesCreated: 0 };
              map[item.date].views += Number(item.views || 0);
              map[item.date].uniqueVisitors += Number(item.uniqueVisitors || 0);
              map[item.date].websitesCreated += Number(item.websitesCreated || 0);
            });
            return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
          }

          function mergeDistribution(primaryObj, otherObj) {
            const res = Object.assign({}, primaryObj || {});
            Object.keys(otherObj || {}).forEach(k => { res[k] = (Number(res[k] || 0) + Number(otherObj[k] || 0)); });
            return res;
          }

          function mergeHourly(primaryArr, otherArr) {
            const len = Math.max((primaryArr || []).length, (otherArr || []).length, 24);
            const out = new Array(len).fill(0);
            for (let i = 0; i < len; i++) out[i] = (Number(primaryArr?.[i] || 0) + Number(otherArr?.[i] || 0));
            return out;
          }

          function mergeArraysByDate(primary, other, keyDate = 'timestamp') {
            const merged = (primary || []).concat(other || []);
            merged.sort((a, b) => (b[keyDate] || '').localeCompare(a[keyDate] || ''));
            return merged.slice(0, 200);
          }

          function mergeWebsites(primaryList, otherList) {
            const map = {};
            (primaryList || []).concat(otherList || []).forEach(w => {
              if (!w || !w.id) return; const prev = map[w.id]; if (!prev) map[w.id] = w; else { // keep the one with latest createdAt or higher views
                if ((w.createdAt && prev.createdAt && new Date(w.createdAt) > new Date(prev.createdAt)) || (Number(w.views || 0) > Number(prev.views || 0))) map[w.id] = w;
              }
            });
            return Object.values(map);
          }

          // Fetch other dashboard
          const otherDash = await additionalFetch(`/api/admin/dashboard?days=${period}`);
          if (otherDash) {
            console.log('[Admin] Additional dashboard received from', ADDITIONAL_API, otherDash);

            // Ensure structures
            dashData.charts = dashData.charts || {};
            otherDash.charts = otherDash.charts || {};

            // Merge overviews
            mergeOverview(dashData, otherDash);

            // Merge trend data
            dashData.charts.trendData = mergeTrend(dashData.charts.trendData || [], otherDash.charts.trendData || []);

            // Merge simple distributions
            const distKeys = ['deviceDistribution', 'browserDistribution', 'osDistribution', 'eventTypeDistribution', 'refererDistribution', 'exitPages', 'geoDistribution', 'pageViewsByPage', 'websitesByEventType', 'featureStats'];
            distKeys.forEach(k => { dashData.charts[k] = mergeDistribution(dashData.charts[k] || {}, otherDash.charts[k] || {}); });

            // Merge hourly
            dashData.charts.hourlyDistribution = mergeHourly(dashData.charts.hourlyDistribution || [], otherDash.charts.hourlyDistribution || []);

            // Merge feature-related aggregates if present
            dashData.charts.featureStats = dashData.charts.featureStats || {};
            Object.keys(otherDash.charts.featureStats || {}).forEach(fk => {
              if (!dashData.charts.featureStats[fk]) dashData.charts.featureStats[fk] = otherDash.charts.featureStats[fk];
              else {
                const src = otherDash.charts.featureStats[fk];
                const tgt = dashData.charts.featureStats[fk];
                ['tried', 'used', 'triedEnabled', 'triedDisabled', 'triedVisitors', 'triedEnabledVisitors', 'usedVisitors', 'total'].forEach(nk => { tgt[nk] = (Number(tgt[nk] || 0) + Number(src[nk] || 0)); });
              }
            });

            // Merge recent activity and websites
            dashData.recentActivity = mergeArraysByDate(dashData.recentActivity, otherDash.recentActivity, 'timestamp');
            dashData.websites = mergeWebsites(dashData.websites || [], otherDash.websites || []);

            // Merge topWebsites by views
            const combinedTop = (dashData.topWebsites || []).concat(otherDash.topWebsites || []);
            dashData.topWebsites = combinedTop.sort((a, b) => (Number(b.views || 0) - Number(a.views || 0))).slice(0, 20);

            // Merge feedback
            if (otherDash.feedback) {
              dashData.feedback = dashData.feedback || { totalFeedback: 0, recentFeedback: [], questionStats: {} };
              dashData.feedback.totalFeedback = Number(dashData.feedback.totalFeedback || 0) + Number(otherDash.feedback.totalFeedback || 0);
              dashData.feedback.recentFeedback = (dashData.feedback.recentFeedback || []).concat(otherDash.feedback.recentFeedback || []).sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || '')).slice(0, 200);

              // Merge questionStats (assume object maps)
              Object.keys(otherDash.feedback.questionStats || {}).forEach(qk => {
                dashData.feedback.questionStats[qk] = mergeDistribution(dashData.feedback.questionStats[qk] || {}, otherDash.feedback.questionStats[qk] || {});
              });
            }
          }

          // Also attempt to fetch detailed feedback (all=true) from additional site to populate modal if available
          try {
            const otherFb = await additionalFetch('/api/admin/feedback-analytics?all=true');
            if (otherFb && otherFb.recentFeedback) {
              dashData.feedback = dashData.feedback || { totalFeedback: 0, recentFeedback: [], questionStats: {} };
              dashData.feedback.recentFeedback = (dashData.feedback.recentFeedback || []).concat(otherFb.recentFeedback || []).sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || '')).slice(0, 500);
            }
          } catch (inner) {
            console.warn('Additional feedback fetch failed:', inner);
          }

          // Also attempt to fetch traffic-sources from additional site and merge
          try {
            const otherTS = await additionalFetch(`/api/admin/traffic-sources?days=${period}`);
            if (otherTS && dashData.trafficSources) {
              const ts = dashData.trafficSources;
              ts.kpi = ts.kpi || {};
              otherTS.kpi = otherTS.kpi || {};
              ['totalSessions', 'organicSearch', 'directTraffic', 'socialMedia', 'referral', 'email', 'paidSearch'].forEach(k => {
                ts.kpi[k] = (Number(ts.kpi[k] || 0) + Number(otherTS.kpi[k] || 0));
              });
              ts.charts = ts.charts || {};
              otherTS.charts = otherTS.charts || {};
              ['trafficSourceDistribution', 'searchEngineDistribution', 'topKeywords', 'socialPlatforms', 'topReferrers'].forEach(k => {
                ts.charts[k] = mergeDistribution(ts.charts[k] || {}, otherTS.charts[k] || {});
              });
              ts.recentTraffic = mergeArraysByDate(ts.recentTraffic, otherTS.recentTraffic, 'timestamp');
            }
          } catch (innerTS) {
            console.warn('Additional traffic sources fetch failed:', innerTS);
          }
        } catch (errAdd) {
          console.warn('[Admin] Failed to fetch/merge additional API data from', ADDITIONAL_API, errAdd);
        }
      }

      // Show fallback mode indicator if applicable
      if (dashData.fallbackMode) {
        console.log('[Admin] Dashboard running in fallback mode:', dashData.message);
        const fallbackIndicator = document.getElementById('fallbackIndicator');
        if (fallbackIndicator) {
          const span = fallbackIndicator.querySelector('span');
          if (span) span.textContent = dashData.message;
          fallbackIndicator.style.display = 'block';
        }
      }
    } catch (err) {
      console.error('Dashboard load error:', err);
      dashData = {
        overview: {},
        charts: { trendData: [] },
        recentActivity: [],
        websites: [],
        topWebsites: [],
        feedback: { totalFeedback: 0, recentFeedback: [], questionStats: {} },
        fallbackMode: true,
        message: 'Failed to load dashboard data'
      };
    }
    renderAll();
    lastUpdated.textContent = 'Updated: ' + new Date().toLocaleTimeString();
    if (refreshBtn) refreshBtn.classList.remove('loading');
  }

  document.getElementById('refreshBtn').addEventListener('click', loadDashboard);

  // ── Navigation ──
  const navItems = document.querySelectorAll('.nav-item');
  const sections = document.querySelectorAll('.section');

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const sec = item.dataset.section;
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      sections.forEach(s => s.classList.remove('active'));
      document.getElementById('sec-' + sec)?.classList.add('active');
      sectionTitle.textContent = item.textContent.trim();
      // Close mobile sidebar
      document.getElementById('sidebar').classList.remove('open');

      // Force Chart.js to resize and re-render canvases when tab becomes visible
      setTimeout(() => {
        Object.values(charts).forEach(c => {
          try { if (c && typeof c.resize === 'function') c.resize(); } catch (err) { }
        });
        if (dashData) {
          if (sec === 'audience') {
            renderGeoChart();
            renderDeviceChart2();
            renderOSChart2();
          } else if (sec === 'overview') {
            renderTrendChart();
            renderDeviceChart();
            renderBrowserChart();
            renderOSChart();
            renderHourlyChart();
            renderEventTypeChart();
          } else if (sec === 'behavior') {
            renderFeatureChart();
          } else if (sec === 'realtime') {
            renderRealtime();
          }
        }
      }, 50);

      // Load system health when section is activated
      if (sec === 'system-health') {
        loadSystemHealth();
      }

      // Load custom URL analytics when section is activated
      if (sec === 'custom-url') {
        loadCustomUrlAnalytics();
      }
    });
  });

  // Mobile sidebar
  document.getElementById('hamburgerBtn').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });
  document.getElementById('sidebarClose').addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('open');
  });

  // ── Render All ──
  function renderAll() {
    if (!dashData) return;
    renderKPIs();
    renderTrendChart();
    renderDeviceChart();
    renderBrowserChart();
    renderOSChart();
    renderHourlyChart();
    renderEventTypeChart();
    renderActivityTable();
    renderPageViewsChart();
    renderRefererChart();
    renderExitChart();
    renderWebsitesCards();
    renderTopWebsitesChart();
    renderGeoChart();
    renderDeviceChart2();
    renderOSChart2();
    renderFeatureChart();
    renderFeatureTable();
    renderFeatureDeviceChart();
    renderFeatureBrowserChart();
    renderTrendingFeaturesChart();
    renderMostUsedFeaturesChart();
    renderCategoryChart();
    renderCreationTrendChart();
    renderFeedback();
    renderRealtime();
    renderTrafficSources();
    renderSystemHealth();
  }

  // ── KPIs ──
  function renderKPIs() {
    const o = dashData.overview || {};
    const period = document.getElementById('periodSelector')?.value || '7';
    const periodLabel = period === '-1' ? 'All Time' : (period === '0' ? 'Today' : `${period}d`);

    setText('kpiTotalViews', formatNum(o.totalPageViews || 0));
    setText('kpiTotalWebsites', formatNum(o.totalWebsitesCreated || 0));
    setText('kpiWeekVisitors', formatNum(o.periodUniqueVisitors || 0));
    setText('kpiTodayViews', formatNum(o.todayViews || 0));
    setText('kpiTodayWebsites', formatNum(o.todayWebsitesCreated || 0));
    setText('kpiTodayUnique', formatNum(o.todayUniqueVisitors || 0));
    setText('kpiWebsiteViews', formatNum(o.totalWebsiteViews || 0));

    // Render CockroachDB Serverless & Supabase Storage System Metrics
    const cr = dashData.cockroachStats || {};
    setText('kpiCockroachCount', formatNum(cr.totalRecordsCount || 0));
    setText('kpiCockroachFree', formatNum(cr.freeRecordsCount || 0));
    setText('kpiCockroachPrem', formatNum(cr.premiumRecordsCount || 0));

    const sb = dashData.supabaseStats || {};
    setText('kpiSupabaseCount', formatNum(sb.totalFilesCount || 0));
    setText('kpiSupaFree', formatNum(sb.freeFilesCount || 0));
    setText('kpiSupaPrem', formatNum(sb.premiumFilesCount || 0));

    // Update labels to reflect period
    const labels = {
      'kpiTotalViews': 'Page Views (' + periodLabel + ')',
      'kpiTotalWebsites': 'Websites Created (' + periodLabel + ')',
      'kpiWeekVisitors': 'Unique Visitors (' + periodLabel + ')',
      'kpiWebsiteViews': 'Website Views (' + periodLabel + ')'
    };
    Object.keys(labels).forEach(id => {
      const el = document.getElementById(id);
      if (el && el.nextElementSibling) el.nextElementSibling.textContent = labels[id];
    });
  }

  // Handle period change
  const periodSelector = document.getElementById('periodSelector');
  if (periodSelector) {
    periodSelector.addEventListener('change', () => {
      loadDashboard();
    });
  }

  // ── Charts ──
  function makeChart(id, config) {
    if (charts[id]) charts[id].destroy();
    const ctx = document.getElementById(id);
    if (!ctx) return null;
    charts[id] = new Chart(ctx, config);
    return charts[id];
  }

  function renderTrendChart() {
    const d = dashData.charts?.trendData || [];
    const period = document.getElementById('periodSelector')?.value || '7';
    const periodLabel = period === '-1' ? 'All Time' : (period === '0' ? 'Today' : `${period} Days`);

    // Update chart title in DOM
    const chartCard = document.querySelector('#trendChart')?.closest('.chart-card');
    if (chartCard && chartCard.querySelector('h3')) {
      chartCard.querySelector('h3').innerHTML = `<i class="fas fa-chart-area"></i> Traffic Trend (${periodLabel})`;
    }

    makeChart('trendChart', {
      type: 'line',
      data: {
        labels: d.map(x => x.date.slice(5)),
        datasets: [
          { label: 'Page Views', data: d.map(x => x.views), borderColor: '#7b5df6', backgroundColor: 'rgba(123,93,246,0.1)', fill: true, tension: 0.4, borderWidth: 2, pointRadius: 2 },
          { label: 'Unique Visitors', data: d.map(x => x.uniqueVisitors), borderColor: '#06b6d4', backgroundColor: 'rgba(6,182,212,0.08)', fill: true, tension: 0.4, borderWidth: 2, pointRadius: 2 },
          { label: 'Sites Created', data: d.map(x => x.websitesCreated), borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.08)', fill: true, tension: 0.4, borderWidth: 2, pointRadius: 2 }
        ]
      },
      options: { responsive: true, plugins: { legend: { position: 'top', labels: { boxWidth: 12, padding: 16 } } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.03)' } }, x: { grid: { display: false } } } }
    });
  }

  function renderDonut(id, dataObj, title) {
    let keys = Object.keys(dataObj || {}).slice(0, 8);
    let vals = keys.map(k => dataObj[k]);
    if (keys.length === 0) {
      keys = id.includes('device') ? ['Mobile', 'Desktop'] : (id.includes('os') ? ['Android', 'Windows', 'iOS'] : ['Direct']);
      vals = id.includes('device') ? [Math.round((dashData?.overview?.totalPageViews || 100) * 0.75), Math.round((dashData?.overview?.totalPageViews || 100) * 0.25)] : [60, 30, 10];
    }
    makeChart(id, {
      type: 'doughnut',
      data: { labels: keys, datasets: [{ data: vals, backgroundColor: COLORS.slice(0, keys.length), borderWidth: 0, hoverOffset: 8 }] },
      options: { responsive: true, cutout: '65%', plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, padding: 10, font: { size: 10 } } } } }
    });
  }

  function renderDeviceChart() { renderDonut('deviceChart', dashData.charts?.deviceDistribution || {}); }
  function renderBrowserChart() { renderDonut('browserChart', dashData.charts?.browserDistribution || {}); }
  function renderOSChart() { renderDonut('osChart', dashData.charts?.osDistribution || {}); }
  function renderDeviceChart2() { renderDonut('deviceChart2', dashData.charts?.deviceDistribution || {}); }
  function renderOSChart2() { renderDonut('osChart2', dashData.charts?.osDistribution || {}); }
  function renderEventTypeChart() { renderDonut('eventTypeChart', dashData.charts?.eventTypeDistribution || {}); }
  function renderCategoryChart() { renderDonut('categoryChart', dashData.charts?.websitesByEventType || {}); }

  function renderHourlyChart() {
    // Server returns sparse array of {hour, count} objects — convert to dense 24-slot array
    const raw = dashData.charts?.hourlyDistribution || [];
    const d = new Array(24).fill(0);
    raw.forEach(item => { if (item && item.hour != null) d[item.hour] = item.count || 0; });
    makeChart('hourlyChart', {
      type: 'bar',
      data: { labels: d.map((_, i) => i + ':00'), datasets: [{ label: 'Views', data: d, backgroundColor: COLORS_ALPHA[0], borderColor: COLORS[0], borderWidth: 1, borderRadius: 4 }] },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.03)' } }, x: { grid: { display: false } } } }
    });
  }

  function renderBarChart(id, dataObj, color) {
    const keys = Object.keys(dataObj).slice(0, 12);
    const vals = keys.map(k => dataObj[k]);
    makeChart(id, {
      type: 'bar',
      data: { labels: keys, datasets: [{ data: vals, backgroundColor: color + '40', borderColor: color, borderWidth: 1, borderRadius: 6 }] },
      options: { indexAxis: 'y', responsive: true, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.03)' } }, y: { grid: { display: false } } } }
    });
  }

  function renderPageViewsChart() { renderBarChart('pageViewsChart', dashData.charts?.pageViewsByPage || {}, '#7b5df6'); }
  function renderRefererChart() { renderBarChart('refererChart', dashData.charts?.refererDistribution || {}, '#06b6d4'); }
  function renderExitChart() { renderBarChart('exitChart', dashData.charts?.exitPages || {}, '#ef4444'); }
  function renderGeoChart() {
    const viewsData = dashData.charts?.geoDistribution || {};
    const uniqueData = dashData.charts?.geoUniqueVisitors || {};

    let countries = [...new Set([...Object.keys(viewsData), ...Object.keys(uniqueData)])].filter(c => c && c !== 'Unknown').slice(0, 15);
    if (Object.keys(viewsData).includes('Unknown') || Object.keys(uniqueData).includes('Unknown')) {
      countries.push('Unknown');
    }
    if (countries.length === 0) {
      countries = ['India'];
      viewsData['India'] = dashData?.overview?.totalPageViews || 120;
      uniqueData['India'] = dashData?.overview?.periodUniqueVisitors || 24;
    }

    makeChart('geoChart', {
      type: 'bar',
      data: {
        labels: countries,
        datasets: [
          {
            label: 'Unique Visitors',
            data: countries.map(c => uniqueData[c] || 0),
            backgroundColor: '#06b6d4'
          },
          {
            label: 'Repeat Views',
            data: countries.map(c => Math.max(0, (viewsData[c] || 0) - (uniqueData[c] || 0))),
            backgroundColor: '#7b5df6'
          }
        ]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        plugins: {
          legend: { display: true, position: 'top' },
          tooltip: {
            callbacks: {
              footer: (items) => {
                const country = items[0]?.label;
                const views = viewsData[country] || 0;
                const unique = uniqueData[country] || 0;
                return `Total Views: ${views.toLocaleString()}\nUnique Visitors: ${unique.toLocaleString()}`;
              }
            }
          }
        },
        scales: {
          x: { stacked: true, beginAtZero: true, grid: { color: 'rgba(255,255,255,0.03)' } },
          y: { stacked: true, grid: { display: false } }
        }
      }
    });

    // Populate Geo Breakdown Table
    const geoTable = document.querySelector('#geoTable tbody');
    if (geoTable) {
      geoTable.innerHTML = '';
      countries.forEach(country => {
        const views = viewsData[country] || 0;
        const unique = uniqueData[country] || 0;
        const ratio = unique > 0 ? (views / unique).toFixed(1) : '--';
        const tr = document.createElement('tr');
        tr.innerHTML = `<td><strong>${country}</strong></td><td>${formatNum(views)}</td><td>${formatNum(unique)}</td><td>${ratio}x</td>`;
        geoTable.appendChild(tr);
      });
    }
  }

  // Merge feature entries by normalized display to avoid duplicates
  const CLEAN_NAME_MAP = {
    'lock': 'Lock',
    'curtainreveal': 'Curtain Reveal',
    'welcometyping': 'Welcome Message',
    'welcomemessage': 'Welcome Message',
    'fireworkstext': 'Fireworks Text',
    'flowerrain': 'Flower Rain',
    'flyingswans': 'Flying Birds',
    'flyingbirds': 'Flying Birds',
    'balloonparty': 'Classic Balloons',
    'classicballoons': 'Classic Balloons',
    'floatingballoonsnamed': 'Named Balloons',
    'namedballoons': 'Named Balloons',
    'fireworksclick': 'Click Fireworks',
    'clickfireworks': 'Click Fireworks',
    'bombexplosion': 'Bomb',
    'bomb': 'Bomb',
    'giftboxopen': 'Gift Box',
    'giftbox': 'Gift Box',
    'imageexplosion': 'Magic Photo',
    'magicphoto': 'Magic Photo',
    'scratchreveal': 'Scratch Card',
    'scratchcard': 'Scratch Card',
    'textformation': 'Typing Card',
    'typingcard': 'Typing Card',
    'memorytimeline': 'Timeline',
    'timeline': 'Timeline',
    'heartsonscroll': 'Hearts Scroll',
    'heartsscroll': 'Hearts Scroll',
    'oldpaperletter': 'Secret Letter',
    'secretletter': 'Secret Letter',
    'hugskyletter': 'Hug + Sky Letter',
    'hugsky': 'Hug + Sky Letter',
    'floatingpolaroids': 'Floating Memories',
    'floatingmemories': 'Floating Memories',
    'finalsurprise': 'Final Message',
    'finalmessage': 'Final Message',
    'magicmusic': 'Add Music',
    'addmusic': 'Add Music',
    'addmusicsection': 'Embed Music Section'
  };

  function getCleanName(rawKey) {
    if (!rawKey) return 'Unknown';
    const clean = rawKey.toString()
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/[^\p{L}\p{N}]/gu, '')
      .trim();
    return CLEAN_NAME_MAP[clean] || rawKey;
  }

  // Merge feature entries by clean display name to avoid duplicates
  function _buildFeatureSummary(rawFs) {
    const merged = {};

    Object.keys(rawFs || {}).forEach(key => {
      const entry = rawFs[key] || {};
      const cleanDisplay = getCleanName(entry.display || key || '');

      if (!merged[cleanDisplay]) {
        merged[cleanDisplay] = {
          display: cleanDisplay,
          tried: 0, used: 0, triedEnabled: 0, triedDisabled: 0,
          triedVisitors: 0, triedEnabledVisitors: 0, usedVisitors: 0
        };
      }

      merged[cleanDisplay].tried += Number(entry.tried || 0);
      merged[cleanDisplay].used += Number(entry.used || 0);
      merged[cleanDisplay].triedEnabled += Number(entry.triedEnabled || 0);
      merged[cleanDisplay].triedDisabled += Number(entry.triedDisabled || 0);
      merged[cleanDisplay].triedVisitors += Number(entry.triedVisitors || 0);
      merged[cleanDisplay].triedEnabledVisitors += Number(entry.triedEnabledVisitors || 0);
      merged[cleanDisplay].usedVisitors += Number(entry.usedVisitors || 0);
    });
    return merged;
  }

  function renderFeatureChart() {
    const rawFs = dashData.charts?.featureStats || {};
    const fs = _buildFeatureSummary(rawFs);

    const features = Object.values(fs).sort((a, b) => (b.used - a.used) || (b.tried - a.tried));

    const labels = features.map(f => f.display);
    const usedData = features.map(f => f.used);
    const triedData = features.map(f => f.tried);

    const wrapper = document.getElementById('wrap-featureChart');
    if (wrapper) wrapper.style.minWidth = Math.max(100, labels.length * 50) + 'px';

    makeChart('featureChart', {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          { label: 'Used (Final)', data: usedData, backgroundColor: 'rgba(34,197,94,0.6)', borderColor: '#22c55e', borderWidth: 1, borderRadius: 4 },
          { label: 'Tried', data: triedData, backgroundColor: 'rgba(59,130,246,0.4)', borderColor: '#3b82f6', borderWidth: 1, borderRadius: 4 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'top', labels: { boxWidth: 10 } } },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.03)' } },
          x: { grid: { display: false }, ticks: { autoSkip: false, maxRotation: 45, minRotation: 45 } }
        }
      }
    });
  }

  function renderFeatureTable() {
    const tbody = document.querySelector('#featureTable tbody');
    tbody.innerHTML = '';
    const rawFs = dashData.charts?.featureStats || {};
    const fs = _buildFeatureSummary(rawFs);

    const features = Object.values(fs).sort((a, b) => (b.used - a.used) || (b.tried - a.tried));

    features.forEach(stats => {
      // Calculate conversion rate based on Unique Visitors where available, cap at 100%
      const triedCount = stats.triedVisitors > 0 ? stats.triedVisitors : stats.triedEnabled;
      const usedCount = stats.usedVisitors > 0 ? stats.usedVisitors : stats.used;

      let conversionRate = null;
      if (triedCount > 0) {
        conversionRate = Math.min((usedCount / triedCount) * 100, 100);
        conversionRate = Math.round(conversionRate * 10) / 10;
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${stats.display}</td>
        <td>${formatNum(stats.tried)}</td>
        <td>${formatNum(stats.used)}</td>
        <td>${formatNum(stats.triedEnabled)}</td>
        <td>${formatNum(stats.triedDisabled)}</td>
        <td>${conversionRate !== null ? conversionRate + '%' : '--'}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  function renderFeatureDeviceChart() {
    const fd = dashData.charts?.featureByDevice || {};
    const devices = Object.keys(fd);

    const rawFs = dashData.charts?.featureStats || {};
    const fs = _buildFeatureSummary(rawFs);
    const features = Object.values(fs).sort((a, b) => (b.used - a.used) || (b.tried - a.tried));

    if (devices.length === 0 || features.length === 0) {
      makeChart('featureDeviceChart', {
        type: 'bar',
        data: { labels: ['No data'], datasets: [{ label: 'No device data', data: [0] }] },
        options: { responsive: true, plugins: { legend: { display: false } } }
      });
      return;
    }

    const datasets = devices.map((device, i) => {
      const counts = features.map(feat => {
        let sum = 0;
        Object.keys(fd[device] || {}).forEach(rawFeat => {
          if (getCleanName(rawFeat) === feat.display) {
            sum += Number(fd[device][rawFeat] || 0);
          }
        });
        return sum;
      });

      return {
        label: device,
        data: counts,
        backgroundColor: COLORS[i % COLORS.length] + '60',
        borderColor: COLORS[i % COLORS.length],
        borderWidth: 1, borderRadius: 4
      };
    });

    const wrapper = document.getElementById('wrap-featureDeviceChart');
    if (wrapper) wrapper.style.minWidth = Math.max(100, features.length * 40) + 'px';

    makeChart('featureDeviceChart', {
      type: 'bar',
      data: { labels: features.map(f => f.display.length > 15 ? f.display.slice(0, 15) + '…' : f.display), datasets: datasets },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' }, title: { display: true, text: 'Feature Interactions by Device (Tried)', font: { size: 12 } } }, scales: { y: { beginAtZero: true }, x: { grid: { display: false }, ticks: { maxRotation: 45, minRotation: 45 } } } }
    });
  }

  function renderFeatureBrowserChart() {
    const fb = dashData.charts?.featureByBrowser || {};
    const browsers = Object.keys(fb);

    const rawFs = dashData.charts?.featureStats || {};
    const fs = _buildFeatureSummary(rawFs);
    const features = Object.values(fs).sort((a, b) => (b.used - a.used) || (b.tried - a.tried));

    if (browsers.length === 0 || features.length === 0) {
      makeChart('featureBrowserChart', {
        type: 'bar',
        data: { labels: ['No data'], datasets: [{ label: 'No browser data', data: [0] }] },
        options: { responsive: true, plugins: { legend: { display: false } } }
      });
      return;
    }

    const datasets = browsers.map((browser, i) => {
      const counts = features.map(feat => {
        let sum = 0;
        Object.keys(fb[browser] || {}).forEach(rawFeat => {
          if (getCleanName(rawFeat) === feat.display) {
            sum += Number(fb[browser][rawFeat] || 0);
          }
        });
        return sum;
      });

      return {
        label: browser,
        data: counts,
        backgroundColor: COLORS[i % COLORS.length] + '60',
        borderColor: COLORS[i % COLORS.length],
        borderWidth: 1, borderRadius: 4
      };
    });

    const wrapper = document.getElementById('wrap-featureBrowserChart');
    if (wrapper) wrapper.style.minWidth = Math.max(100, features.length * 40) + 'px';

    makeChart('featureBrowserChart', {
      type: 'bar',
      data: { labels: features.map(f => f.display.length > 15 ? f.display.slice(0, 15) + '…' : f.display), datasets: datasets },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' }, title: { display: true, text: 'Feature Interactions by Browser (Tried)', font: { size: 12 } } }, scales: { y: { beginAtZero: true }, x: { grid: { display: false }, ticks: { maxRotation: 45, minRotation: 45 } } } }
    });
  }

  function renderTrendingFeaturesChart() {
    const tf = dashData.charts?.trendingFeatures || {};

    // Group trending features by clean name
    const groupedTf = {};
    Object.keys(tf).forEach(key => {
      const cleanName = getCleanName(key);
      const entry = tf[key] || {};
      if (!groupedTf[cleanName]) {
        groupedTf[cleanName] = { growth: 0, recent: 0, total: 0, count: 0 };
      }
      groupedTf[cleanName].growth += Number(entry.growth || 0);
      groupedTf[cleanName].recent += Number(entry.recent || 0);
      groupedTf[cleanName].total += Number(entry.total || 0);
      groupedTf[cleanName].count += 1;
    });

    // Average the growth rates for grouped items
    Object.keys(groupedTf).forEach(name => {
      if (groupedTf[name].count > 0) {
        groupedTf[name].growth = groupedTf[name].growth / groupedTf[name].count;
      }
    });

    const features = Object.keys(groupedTf)
      .filter(f => groupedTf[f].total > 0)
      .sort((a, b) => (groupedTf[b].growth || 0) - (groupedTf[a].growth || 0));

    const data = features.map(feature => ({
      feature: feature,
      growth: groupedTf[feature].growth || 0,
      recent: groupedTf[feature].recent || 0,
      total: groupedTf[feature].total || 0
    }));

    const wrapper = document.getElementById('wrap-trendingFeaturesChart');
    if (wrapper) wrapper.style.minWidth = Math.max(100, data.length * 50) + 'px';

    makeChart('trendingFeaturesChart', {
      type: 'bar',
      data: {
        labels: data.map(d => d.feature.length > 15 ? d.feature.slice(0, 15) + '…' : d.feature),
        datasets: [{ label: 'Growth %', data: data.map(d => d.growth), backgroundColor: data.map(d => d.growth >= 0 ? 'rgba(34,197,94,0.6)' : 'rgba(239,68,68,0.6)'), borderColor: data.map(d => d.growth >= 0 ? '#22c55e' : '#ef4444'), borderWidth: 1, borderRadius: 4 }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: function (context) { const d = data[context.dataIndex]; return [`Growth: ${d.growth.toFixed(1)}%`, `Recent: ${d.recent}`, `Total: ${d.total}`]; } } } }, scales: { y: { beginAtZero: true, title: { display: true, text: 'Growth Rate (%)' } }, x: { grid: { display: false }, ticks: { maxRotation: 45, minRotation: 45 } } } }
    });
  }

  function renderMostUsedFeaturesChart() {
    const rawFs = dashData.charts?.featureStats || {};
    const merged = _buildFeatureSummary(rawFs);
    const features = Object.keys(merged)
      .filter(f => (merged[f].used || 0) > 0)
      .sort((a, b) => (merged[b].used || 0) - (merged[a].used || 0));

    if (features.length === 0) {
      makeChart('mostUsedFeaturesChart', {
        type: 'bar',
        data: {
          labels: ['No data'],
          datasets: [{
            label: 'No used features',
            data: [0],
            backgroundColor: 'rgba(102,102,102,0.3)',
            borderColor: '#666',
            borderWidth: 1,
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.03)' } },
            x: { grid: { display: false } }
          }
        }
      });
      return;
    }

    const wrapper = document.getElementById('wrap-mostUsedFeaturesChart');
    if (wrapper) wrapper.style.minWidth = Math.max(100, features.length * 40) + 'px';

    makeChart('mostUsedFeaturesChart', {
      type: 'bar',
      data: {
        labels: features.map(f => (merged[f].display || f).length > 15 ? (merged[f].display || f).slice(0, 15) + '…' : (merged[f].display || f)),
        datasets: [{
          label: 'Final Usage',
          data: features.map(f => merged[f].used || 0),
          backgroundColor: 'rgba(34,197,94,0.6)',
          borderColor: '#22c55e',
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.03)' } },
          x: { grid: { display: false }, ticks: { maxRotation: 45, minRotation: 45 } }
        }
      }
    });
  }

  function renderTopWebsitesChart() {
    const tw = dashData.topWebsites || [];
    makeChart('topWebsitesChart', {
      type: 'bar',
      data: {
        labels: tw.map(w => w.id.slice(0, 8)),
        datasets: [{ label: 'Views', data: tw.map(w => w.views), backgroundColor: COLORS_ALPHA.slice(0, tw.length), borderColor: COLORS.slice(0, tw.length), borderWidth: 1, borderRadius: 6 }]
      },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.03)' } }, x: { grid: { display: false } } } }
    });
  }

  function renderCreationTrendChart() {
    const d = dashData.charts?.trendData || [];
    makeChart('creationTrendChart', {
      type: 'line',
      data: { labels: d.map(x => x.date.slice(5)), datasets: [{ label: 'Websites', data: d.map(x => x.websitesCreated), borderColor: '#ec4899', backgroundColor: 'rgba(236,72,153,0.1)', fill: true, tension: 0.4, borderWidth: 2, pointRadius: 2 }] },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.03)' } }, x: { grid: { display: false } } } }
    });
  }

  // ── Tables ──
  function renderActivityTable() {
    const tbody = document.querySelector('#activityTable tbody');
    tbody.innerHTML = '';
    (dashData.recentActivity || []).slice(0, 30).forEach(a => {
      const tr = document.createElement('tr');
      const time = a.timestamp ? new Date(a.timestamp).toLocaleString() : '--';
      const badge = getBadge(a.type);
      let details = a.page || '';
      if (a.type === 'website_created' || a.type === 'websiteCreated') {
        const name = a.details?.recipientName || a.recipientName || '';
        const ev = a.details?.eventType || a.eventType || 'site';
        details = `Created ${name ? `"${name}"` : 'Website'} (${ev}) [${a.websiteId || a.id || ''}]`;
      } else if (a.type === 'website-view' || a.type === 'website_view') {
        details = `Website Viewed: ${a.websiteId || 'Unknown'}`;
      } else if (a.type === 'feature') {
        details = `Feature: ${a.details?.feature || 'unknown'} (${a.details?.action || 'used'})`;
      } else if (a.details && typeof a.details === 'object' && Object.keys(a.details).length > 0) {
        details = `${a.page || ''} ${JSON.stringify(a.details).slice(0, 60)}`;
      }
      const loc = a.geo ? `${a.geo.city || ''}, ${a.geo.country || ''}` : '--';
      tr.innerHTML = `<td>${time}</td><td>${badge}</td><td>${details}</td><td>${loc}</td>`;
      tbody.appendChild(tr);
    });
  }

  let selectedWebsiteIds = new Set();
  let pendingBulkAction = null;
  let currentlyFilteredWebsites = [];

  function updateSelectionUI() {
    const countSpan = document.getElementById('selectedCount');
    const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
    const selectAllCb = document.getElementById('selectAllWebsites');

    if (countSpan) {
      countSpan.textContent = selectedWebsiteIds.size;
    }
    if (deleteSelectedBtn) {
      const hasSelected = selectedWebsiteIds.size > 0;
      deleteSelectedBtn.disabled = !hasSelected;
      deleteSelectedBtn.style.opacity = hasSelected ? '1' : '0.5';
      deleteSelectedBtn.style.cursor = hasSelected ? 'pointer' : 'not-allowed';
    }
    if (selectAllCb) {
      const count = currentlyFilteredWebsites.length;
      const selectedCount = currentlyFilteredWebsites.filter(w => selectedWebsiteIds.has(w.id)).length;
      selectAllCb.checked = count > 0 && selectedCount >= count;
      selectAllCb.indeterminate = selectedCount > 0 && selectedCount < count;
    }
  }

  function renderWebsitesCards() {
    const grid = document.getElementById('websiteGrid');
    if (!grid) return;

    const search = document.getElementById('websiteSearch');
    const sort = document.getElementById('websiteSort');
    const ageFilter = document.getElementById('websiteAgeFilter');
    const tierFilter = document.getElementById('websiteTierFilter');

    function getAgeCutoff() {
      const val = ageFilter?.value || 'all';
      if (val === 'all') return null;
      const days = parseInt(val, 10);
      return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    }

    grid.innerHTML = '';
    const filter = (search?.value || '').toLowerCase();
    const sortType = sort?.value || 'date_desc';
    const cutoff = getAgeCutoff();
    const ageVal = ageFilter?.value || 'all';
    const tierVal = tierFilter?.value || 'all';

    const list = dashData?.websites || [];
    currentlyFilteredWebsites = list.filter(w => {
      if (filter) {
        const match = (w.id || '').toLowerCase().includes(filter) ||
          (w.eventType || '').toLowerCase().includes(filter) ||
          (w.recipientName || '').toLowerCase().includes(filter) ||
          (w.planName || '').toLowerCase().includes(filter) ||
          (w.customSlug || '').toLowerCase().includes(filter);
        if (!match) return false;
      }
      if (cutoff) {
        const createdAt = w.createdAt ? new Date(w.createdAt) : null;
        if (!createdAt || createdAt >= cutoff) return false;
      }
      if (tierVal === 'premium' && !w.isPremium) return false;
      if (tierVal === 'free' && w.isPremium) return false;
      if (tierVal === 'starter' && !(w.plan === 'starter' || (w.planName && (w.planName.includes('Starter') || w.planName.includes('30'))))) return false;
      if (tierVal === 'pro' && !(w.plan === 'pro' || (w.planName && (w.planName.includes('Pro') && !w.planName.includes('Pro+') && w.planName.includes('100'))))) return false;
      if (tierVal === 'pro_plus' && !(w.plan === 'pro_plus' || w.plan === 'proplus' || (w.planName && (w.planName.includes('Pro+') || w.planName.includes('1 Year'))))) return false;
      if (tierVal === 'forever' && !(w.plan === 'forever' || w.plan === 'infinity' || (w.planName && (w.planName.includes('Forever') || w.planName.includes('Lifetime') || w.planName.includes('Infinity'))))) return false;
      if (tierVal === 'custom_url' && !(w.plan === 'custom_url' || !!w.customSlug)) return false;
      return true;
    });

    // Apply Sort
    currentlyFilteredWebsites.sort((a, b) => {
      if (sortType === 'date_desc') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      if (sortType === 'date_asc') return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      if (sortType === 'views_desc') return (b.views || 0) - (a.views || 0);
      if (sortType === 'name_asc') return (a.recipientName || '').localeCompare(b.recipientName || '');
      return 0;
    });

    updateSelectionUI();

    if (currentlyFilteredWebsites.length === 0) {
      let msg = 'No websites found matching criteria.';
      if (tierVal === 'premium') {
        msg = 'No premium websites found.';
      } else if (tierVal === 'free') {
        msg = 'No standard/free websites found.';
      } else if (tierVal === 'starter') {
        msg = 'No websites found with Starter (30+ Days) plan.';
      } else if (tierVal === 'pro') {
        msg = 'No websites found with Pro (100+ Days) plan.';
      } else if (tierVal === 'pro_plus') {
        msg = 'No websites found with Pro+ (1 Year) plan.';
      } else if (tierVal === 'forever') {
        msg = 'No websites found with Infinity (Lifetime) plan.';
      } else if (tierVal === 'custom_url') {
        msg = 'No websites found with Custom URL.';
      } else if (cutoff) {
        msg = `No websites found older than ${ageVal} days${filter ? ' matching your search' : ''}.`;
      } else {
        msg = 'No websites found. Try syncing with Supabase.';
      }
      grid.innerHTML = `<div class="empty-state" style="grid-column: 1/-1;"><i class="fas fa-search"></i><p>${msg}</p></div>`;
      return;
    }

    // Plan counters
    const premiumCount = currentlyFilteredWebsites.filter(w => w.isPremium).length;
    const starterCount = currentlyFilteredWebsites.filter(w => w.plan === 'starter' || (w.planName && (w.planName.includes('Starter') || w.planName.includes('30')))).length;
    const proCount = currentlyFilteredWebsites.filter(w => w.plan === 'pro' || (w.planName && (w.planName.includes('Pro') && !w.planName.includes('Pro+') && w.planName.includes('100')))).length;
    const proPlusCount = currentlyFilteredWebsites.filter(w => w.plan === 'pro_plus' || w.plan === 'proplus' || (w.planName && (w.planName.includes('Pro+') || w.planName.includes('1 Year')))).length;
    const foreverCount = currentlyFilteredWebsites.filter(w => w.plan === 'forever' || w.plan === 'infinity' || (w.planName && (w.planName.includes('Forever') || w.planName.includes('Lifetime') || w.planName.includes('Infinity')))).length;
    const customUrlCount = currentlyFilteredWebsites.filter(w => w.plan === 'custom_url' || !!w.customSlug).length;

    // Summary bar
    const summaryBar = document.createElement('div');
    summaryBar.style.cssText = 'grid-column:1/-1; display:flex; align-items:center; gap:10px; font-size:0.82rem; color:var(--text-muted); padding:4px; flex-wrap:wrap;';
    summaryBar.innerHTML = `
      <i class="fas fa-globe" style="color:var(--accent);"></i>
      <strong style="color:var(--text)">${currentlyFilteredWebsites.length}</strong> website${currentlyFilteredWebsites.length !== 1 ? 's' : ''} shown
      ${cutoff ? `<span style="background:rgba(239,68,68,0.12); color:var(--red); padding:2px 10px; border-radius:20px; font-weight:600; font-size:0.75rem; border:1px solid rgba(239,68,68,0.2);"><i class="fas fa-clock"></i> Age filter active</span>` : ''}
      ${tierVal === 'premium' ? `<span style="background:rgba(255,184,0,0.18); color:var(--gold); padding:2px 10px; border-radius:20px; font-weight:600; font-size:0.75rem; border:1px solid rgba(255,184,0,0.4);"><i class="fas fa-crown"></i> Premium Only</span>` : ''}
      ${tierVal === 'free' ? `<span style="background:rgba(123,93,246,0.12); color:var(--accent); padding:2px 10px; border-radius:20px; font-weight:600; font-size:0.75rem; border:1px solid rgba(123,93,246,0.2);"><i class="fas fa-globe"></i> Standard Only</span>` : ''}
      ${tierVal === 'all' && premiumCount > 0 ? `
        <span style="background:rgba(255,159,67,0.12); color:var(--gold); padding:2px 10px; border-radius:20px; font-weight:600; font-size:0.75rem; border:1px solid rgba(255,159,67,0.2);"><i class="fas fa-crown"></i> ${premiumCount} Premium</span>
        ${starterCount > 0 ? `<span style="background:rgba(0,194,255,0.1); color:#00c2ff; padding:2px 8px; border-radius:20px; font-size:0.73rem;"><i class="fas fa-bolt"></i> ${starterCount} (Starter 30d)</span>` : ''}
        ${proCount > 0 ? `<span style="background:rgba(232,58,89,0.12); color:#ff6b81; padding:2px 8px; border-radius:20px; font-size:0.73rem;"><i class="fas fa-fire"></i> ${proCount} (Pro 100d)</span>` : ''}
        ${proPlusCount > 0 ? `<span style="background:rgba(16,185,129,0.12); color:#10b981; padding:2px 8px; border-radius:20px; font-size:0.73rem;"><i class="fas fa-gem"></i> ${proPlusCount} (Pro+ 1 Yr)</span>` : ''}
        ${foreverCount > 0 ? `<span style="background:rgba(255,184,0,0.15); color:var(--gold); padding:2px 8px; border-radius:20px; font-size:0.73rem;"><i class="fas fa-crown"></i> ${foreverCount} (Infinity)</span>` : ''}
        ${customUrlCount > 0 ? `<span style="background:rgba(46,213,115,0.12); color:#2ed573; padding:2px 8px; border-radius:20px; font-size:0.73rem;"><i class="fas fa-link"></i> ${customUrlCount} (Slug)</span>` : ''}
      ` : ''}
      <span style="margin-left:auto; font-size:0.75rem;">${selectedWebsiteIds.size > 0 ? `<strong style="color:var(--accent)">${selectedWebsiteIds.size} selected</strong>` : ''}</span>
    `;
    grid.appendChild(summaryBar);

    currentlyFilteredWebsites.forEach(w => {
      const card = document.createElement('div');
      const ageInDays = w.createdAt ? Math.floor((Date.now() - new Date(w.createdAt)) / 86400000) : 0;

      card.className = 'website-card' + (w.isPremium ? ' premium-card' : '');

      const created = w.createdAt ? new Date(w.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '--';
      const city = w.creatorGeo?.city || 'New Delhi';
      const country = w.creatorGeo?.country || 'India';
      const loc = `${city}, ${country}`;
      const viewUrl = window.location.origin + '/generated/customize.html?view=' + w.id;
      const isChecked = selectedWebsiteIds.has(w.id);

      // Determine specific plan badge HTML
      let planBadgeHtml = '';
      if (w.isPremium) {
        const pKey = (w.plan || '').toLowerCase();
        const pName = w.planName || 'Premium';

        if (pKey === 'starter' || pName.includes('Starter') || pName.includes('30')) {
          planBadgeHtml = `<span class="badge" style="background:rgba(0,194,255,0.18); color:#00c2ff; border:1px solid rgba(0,194,255,0.35); font-size:0.7rem; padding:3px 10px;" title="Starter Plan (30+ Days)"><i class="fas fa-bolt"></i> Starter (30d)</span>`;
        } else if (pKey === 'pro' || (pName.includes('Pro') && !pName.includes('Pro+') && pName.includes('100'))) {
          planBadgeHtml = `<span class="badge" style="background:rgba(232,58,89,0.18); color:#ff6b81; border:1px solid rgba(232,58,89,0.35); font-size:0.7rem; padding:3px 10px;" title="Pro Plan (100+ Days)"><i class="fas fa-fire"></i> Pro (100d)</span>`;
        } else if (pKey === 'pro_plus' || pKey === 'proplus' || pName.includes('Pro+') || pName.includes('1 Year')) {
          planBadgeHtml = `<span class="badge" style="background:rgba(16,185,129,0.2); color:#10b981; border:1px solid rgba(16,185,129,0.4); font-size:0.7rem; padding:3px 10px;" title="Pro+ Plan (1 Year)"><i class="fas fa-gem"></i> Pro+ (1 Yr)</span>`;
        } else if (pKey === 'forever' || pKey === 'infinity' || pName.includes('Forever') || pName.includes('Lifetime') || pName.includes('Infinity')) {
          planBadgeHtml = `<span class="badge" style="background:rgba(255,184,0,0.22); color:var(--gold); border:1px solid rgba(255,184,0,0.45); font-size:0.7rem; padding:3px 10px;" title="Infinity Plan (Lifetime)"><i class="fas fa-crown"></i> Infinity</span>`;
        } else {
          planBadgeHtml = `<span class="badge" style="background:rgba(46,213,115,0.2); color:#2ed573; border:1px solid rgba(46,213,115,0.4); font-size:0.7rem; padding:3px 10px;" title="Custom URL / Premium"><i class="fas fa-link"></i> ${pName}</span>`;
        }
      }

      const ageBadgeHtml = `<span class="badge" style="background:rgba(123,93,246,0.1); color:var(--text-muted); border:1px solid var(--border); font-size:0.67rem; padding:2px 7px;"><i class="fas fa-clock"></i> ${ageInDays}d</span>`;

      // Paid details row
      const paidInfoRow = w.isPremium
        ? `<div class="info-row" style="color:var(--gold); font-size:0.78rem;"><i class="fas fa-receipt"></i> Plan: <strong>${w.planName || 'Premium'}</strong> ${w.paidAmount ? `(${w.currency === 'USD' ? '$' : '₹'}${w.paidAmount})` : ''} ${w.customSlug ? `· /${w.customSlug}` : ''}</div>`
        : '';

      card.innerHTML = `
        ${w.isPremium ? '<div class="premium-card-glow"></div>' : ''}
        <div class="card-header" style="display:flex; align-items:flex-start; gap:10px;">
          <input type="checkbox" class="website-select-cb" data-id="${w.id}" ${isChecked ? 'checked' : ''} style="cursor:pointer; width:17px; height:17px; accent-color:var(--accent); margin-top:3px; flex-shrink:0;">
          <div class="card-id-box" style="flex:1; min-width:0;">
            <span class="card-id" style="max-width:100%; display:block; overflow:hidden; text-overflow:ellipsis;">${w.id}</span>
            <h4 class="card-title" style="margin-top:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${w.recipientName || 'Untitled Site'}</h4>
          </div>
          <div style="display:flex; flex-direction:column; align-items:flex-end; gap:4px; flex-shrink:0;">
            <span class="badge badge-purple">${w.eventType || 'unknown'}</span>
            ${planBadgeHtml}
            ${ageBadgeHtml}
          </div>
        </div>
        <div class="card-body">
          <div class="info-row"><i class="fas fa-calendar-alt"></i> Created: ${created}</div>
          <div class="info-row"><i class="fas fa-map-marker-alt"></i> ${loc}</div>
          <div class="info-row"><i class="fas fa-layer-group"></i> Template: ${w.templateName || 'default'}</div>
          ${paidInfoRow}
        </div>
        <div class="card-footer" style="display:flex; justify-content:space-between; align-items:center;">
          <div class="card-stats">
            <div class="stat-item">
              <span class="stat-val">${formatNum(w.views || 0)}</span>
              <span class="stat-label">Views</span>
            </div>
            <div class="stat-item">
              <span class="stat-val">${(w.uniqueViewers || []).length}</span>
              <span class="stat-label">Unique</span>
            </div>
            <div class="stat-item">
              <span class="stat-val">${ageInDays}d</span>
              <span class="stat-label">Age</span>
            </div>
          </div>
          <div style="display:flex; gap:8px; align-items:center;">
            <a href="${viewUrl}" target="_blank" class="action-btn" style="display:flex; align-items:center; gap:5px;"><i class="fas fa-external-link-alt"></i> Open</a>
            <button type="button" class="action-btn danger single-delete-btn" data-id="${w.id}" data-premium="${w.isPremium ? 'true' : 'false'}" title="Delete Website" style="display:flex; align-items:center; gap:5px; padding:5px 10px;"><i class="fas fa-trash-alt"></i></button>
          </div>
        </div>
      `;

      // Single delete listener
      const deleteBtn = card.querySelector('.single-delete-btn');
      deleteBtn.addEventListener('click', async () => {
        const siteId = w.id;
        const isPrem = w.isPremium;

        let confirmMsg = `Are you sure you want to permanently delete website "${siteId}"?\n\nThis action will delete tracking events, feedback, custom slugs, and stored Cloudinary JSON configuration.`;
        if (isPrem) {
          confirmMsg = `⚠️ WARNING: Website "${siteId}" is a PREMIUM / PAID website!\n\nDeleting it will destroy paid records, custom URL mappings, and all analytics.\n\nAre you ABSOLUTELY sure you want to FORCE delete this site?`;
        }

        if (confirm(confirmMsg)) {
          try {
            deleteBtn.disabled = true;
            deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            const res = await apiFetch(`/api/admin/website/${siteId}${isPrem ? '?force=true' : ''}`, { method: 'DELETE' });
            if (res && res.success) {
              card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
              card.style.opacity = '0';
              card.style.transform = 'scale(0.92) translateY(-4px)';
              setTimeout(async () => {
                selectedWebsiteIds.delete(siteId);
                await loadDashboard();
              }, 320);
            } else {
              alert(`Failed to delete: ${res?.message || res?.error || 'Unknown error'}`);
              deleteBtn.disabled = false;
              deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
            }
          } catch (err) {
            alert(`Error: ${err.message}`);
            deleteBtn.disabled = false;
            deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
          }
        }
      });

      grid.appendChild(card);
    });
  }

  function setupWebsiteControls() {
    const search = document.getElementById('websiteSearch');
    const sort = document.getElementById('websiteSort');
    const ageFilter = document.getElementById('websiteAgeFilter');
    const tierFilter = document.getElementById('websiteTierFilter');

    if (search) search.addEventListener('input', renderWebsitesCards);
    if (sort) sort.addEventListener('change', renderWebsitesCards);

    if (ageFilter) {
      ageFilter.addEventListener('change', () => {
        selectedWebsiteIds.clear();
        renderWebsitesCards();
      });
    }

    if (tierFilter) {
      tierFilter.addEventListener('change', () => {
        selectedWebsiteIds.clear();
        renderWebsitesCards();
      });
    }
  }

  // Setup control listeners unconditionally
  setupWebsiteControls();

  // Global event delegation for website controls to prevent stale closures and detached listeners
  document.addEventListener('change', (e) => {
    // Individual website checkboxes
    if (e.target && e.target.classList.contains('website-select-cb')) {
      const websiteId = e.target.getAttribute('data-id');
      if (websiteId) {
        if (e.target.checked) {
          selectedWebsiteIds.add(websiteId);
        } else {
          selectedWebsiteIds.delete(websiteId);
        }
        updateSelectionUI();
      }
    }

    // Select All Checkbox
    if (e.target && e.target.id === 'selectAllWebsites') {
      if (e.target.checked) {
        currentlyFilteredWebsites.forEach(w => selectedWebsiteIds.add(w.id));
      } else {
        currentlyFilteredWebsites.forEach(w => selectedWebsiteIds.delete(w.id));
      }
      renderWebsitesCards();
    }

    // Protect Premium Toggle
    if (e.target && e.target.id === 'protectPremiumToggle') {
      if (e.target.checked) {
        const currentList = dashData?.websites || [];
        currentList.filter(w => w.isPremium).forEach(w => selectedWebsiteIds.delete(w.id));
      }
      renderWebsitesCards();
    }
  });

  document.addEventListener('click', (e) => {
    // Select Premium Button
    const selPremBtn = e.target.closest('#selectPremiumBtn');
    if (selPremBtn) {
      e.preventDefault();
      currentlyFilteredWebsites.forEach(w => {
        if (w.isPremium) selectedWebsiteIds.add(w.id);
      });
      renderWebsitesCards();
      return;
    }

    // Select Free Button
    const selFreeBtn = e.target.closest('#selectFreeBtn');
    if (selFreeBtn) {
      e.preventDefault();
      currentlyFilteredWebsites.forEach(w => {
        if (!w.isPremium) selectedWebsiteIds.add(w.id);
      });
      renderWebsitesCards();
      return;
    }

    // Deselect All Button
    const deselectBtn = e.target.closest('#deselectAllBtn');
    if (deselectBtn) {
      e.preventDefault();
      selectedWebsiteIds.clear();
      renderWebsitesCards();
      return;
    }

    // Delete Selected Button
    const deleteBtn = e.target.closest('#deleteSelectedBtn');
    if (deleteBtn) {
      e.preventDefault();
      if (deleteBtn.disabled) return;
      if (selectedWebsiteIds.size === 0) return;

      const ids = Array.from(selectedWebsiteIds);
      const protectToggle = document.getElementById('protectPremiumToggle');
      const globalProtect = protectToggle?.checked ?? true;
      const overrideCb = document.getElementById('modalOverrideProtectCb');
      if (overrideCb) overrideCb.checked = !globalProtect;

      function updateModalCounts() {
        const allowPremiumDelete = overrideCb ? overrideCb.checked : !globalProtect;
        const protectPremium = globalProtect && !allowPremiumDelete;

        const selectedList = (dashData?.websites || []).filter(w => selectedWebsiteIds.has(w.id));
        const premiumCount = selectedList.filter(w => w.isPremium).length;
        const nonPremiumCount = selectedList.length - premiumCount;

        let deleteCount = selectedList.length;
        let protectedCount = 0;

        if (protectPremium) {
          deleteCount = nonPremiumCount;
          protectedCount = premiumCount;
        }

        const totalEl = document.getElementById('modalTotalSelectedCount');
        if (totalEl) totalEl.textContent = selectedList.length;

        const deleteEl = document.getElementById('modalDeleteCount');
        if (deleteEl) deleteEl.textContent = deleteCount;

        const protectedEl = document.getElementById('modalProtectedCount');
        if (protectedEl) protectedEl.textContent = protectedCount;

        const warnEl = document.getElementById('modalProtectedWarning');
        const warnText = document.getElementById('modalWarningText');
        if (warnEl) {
          if (premiumCount > 0) {
            warnEl.style.display = 'block';
            if (warnText) {
              if (protectPremium) {
                warnText.textContent = `${premiumCount} Premium website${premiumCount > 1 ? 's are' : ' is'} currently protected from bulk deletion.`;
              } else {
                warnText.textContent = `⚠️ Warning: Premium websites WILL be deleted because premium protection is allowed for this batch.`;
              }
            }
          } else {
            warnEl.style.display = 'none';
          }
        }

        pendingBulkAction = { websiteIds: ids, protectPremium };
      }

      updateModalCounts();

      if (overrideCb) {
        overrideCb.onchange = updateModalCounts;
      }

      const bulkDeleteModal = document.getElementById('bulkDeleteModal');
      if (bulkDeleteModal) bulkDeleteModal.style.display = 'block';
    }

    // Modal Close logic
    const bulkDeleteModal = document.getElementById('bulkDeleteModal');
    if (e.target.closest('#closeBulkDeleteModal') || e.target.closest('#cancelBulkDeleteBtn') || e.target === bulkDeleteModal) {
      if (bulkDeleteModal) bulkDeleteModal.style.display = 'none';
      pendingBulkAction = null;
    }

    // Modal Confirm Button
    const confirmBtn = e.target.closest('#confirmBulkDeleteBtn');
    if (confirmBtn) {
      (async () => {
        if (!pendingBulkAction) return;
        confirmBtn.disabled = true;
        const originalHtml = confirmBtn.innerHTML;
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';

        try {
          const res = await apiFetch('/api/admin/websites/bulk-delete', {
            method: 'POST',
            body: JSON.stringify(pendingBulkAction)
          });

          if (res && res.success) {
            alert(`Bulk deletion complete!\n\n• Deleted: ${res.deletedCount} website(s)\n• Skipped Protected: ${res.protectedCount ?? res.skippedProtectedCount ?? 0} website(s)`);
            if (bulkDeleteModal) bulkDeleteModal.style.display = 'none';
            selectedWebsiteIds.clear();
            pendingBulkAction = null;
            await loadDashboard();
          } else {
            alert(`Bulk deletion failed: ${res?.message || res?.error || 'Unknown error'}`);
          }
        } catch (err) {
          alert(`Error running bulk deletion: ${err.message}`);
        } finally {
          confirmBtn.disabled = false;
          confirmBtn.innerHTML = originalHtml;
        }
      })();
    }
  });

  let currentCloudinaryData = [];

  function renderCloudinaryTable(list) {
    if (list) currentCloudinaryData = list;
    const tbody = document.querySelector('#cloudinaryTable tbody');
    const sort = document.getElementById('cloudinarySort');
    if (!tbody) return;

    tbody.innerHTML = '';
    const sortType = sort.value;

    const sorted = [...currentCloudinaryData].sort((a, b) => {
      if (sortType === 'date_desc') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortType === 'date_asc') return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortType === 'size_desc') return b.bytes - a.bytes;
      if (sortType === 'id_asc') return a.publicId.localeCompare(b.publicId);
      return 0;
    });

    if (sorted.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;opacity:0.5;">No files found or not loaded yet.</td></tr>`;
      return;
    }

    sorted.forEach(r => {
      const tr = document.createElement('tr');
      const filename = r.name || r.publicId || '';
      const cleanId = filename.replace(/^.*\//, '').replace('.json', '');
      const created = new Date(r.createdAt).toLocaleString();
      const size = (r.bytes / 1024).toFixed(1) + ' KB';
      const isJsonConfig = filename.endsWith('.json');
      const customizeUrl = window.location.origin + '/generated/customize.html?view=' + cleanId;
      const fileUrl = r.url || '#';

      tr.innerHTML = `
        <td>
          <code style="color:var(--accent)">${r.publicId || filename}</code>
          ${r.project ? `<span style="font-size:0.7rem; margin-left:6px; opacity:0.7;">(${r.project})</span>` : ''}
        </td>
        <td>${created}</td>
        <td>${size}</td>
        <td style="white-space:nowrap;">
          ${isJsonConfig ? `<a href="${customizeUrl}" target="_blank" class="action-btn small"><i class="fas fa-eye"></i> View Site</a>` : ''}
          ${fileUrl !== '#' ? `<a href="${fileUrl}" target="_blank" class="action-btn small" style="margin-left:4px;"><i class="fas fa-external-link-alt"></i> Raw File</a>` : ''}
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Attach cloudinary sort listener once
  document.getElementById('cloudinarySort').addEventListener('change', () => renderCloudinaryTable());

  async function triggerCloudinaryLoad() {
    const btn = document.getElementById('loadCloudinaryBtn');
    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    try {
      const res = await apiFetch('/api/admin/cloudinary-list');
      renderCloudinaryTable(res.files || res.websites || []);
      return res;
    } catch (err) {
      console.error('File fetch error:', err);
      throw err;
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalHtml;
    }
  }

  async function triggerSync() {
    const btn = document.getElementById('syncWebsitesBtn');
    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Syncing...';
    try {
      const res = await apiFetch('/api/admin/sync-websites', { method: 'POST' });
      if (res.success) {
        if (res.fallbackMode) {
          console.log('[Admin] Sync completed in fallback mode:', res.message);
          // Show a more user-friendly message for fallback mode
          const message = res.message || 'Sync completed in fallback mode';
          console.log(message);
        } else {
          console.log('[Admin] Sync completed successfully:', res.message);
        }
        await loadDashboard();
      }
      return res;
    } catch (err) {
      console.error('Sync error:', err);
      throw err;
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalHtml;
    }
  }

  document.getElementById('loadCloudinaryBtn').addEventListener('click', async () => {
    try {
      await triggerCloudinaryLoad();
    } catch (err) {
      alert('Failed to load Cloudinary data');
    }
  });

  document.getElementById('syncWebsitesBtn').addEventListener('click', async () => {
    try {
      const res = await triggerSync();
      if (res && res.success) {
        if (res.fallbackMode) {
          alert(`Sync completed in fallback mode.\n${res.message}\n\nAnalytics will be available once MongoDB connection is restored.`);
        } else {
          alert(`Sync complete! ${res.synced} new websites added to analytics.`);
        }
      }
    } catch (err) {
      alert('Sync failed. Check console for details.');
    }
  });

  // View All Feedback
  document.getElementById('viewAllFeedbackBtn').addEventListener('click', async () => {
    try {
      const fbData = await apiFetch('/api/admin/feedback-analytics?all=true');
      renderAllFeedbackModal(fbData.recentFeedback || []);
      allFeedbackModal.style.display = 'block';
    } catch (err) {
      console.error('Failed to load all feedback:', err);
      alert('Failed to load all feedback data.');
    }
  });

  document.getElementById('closeAllFeedbackModal').addEventListener('click', () => {
    allFeedbackModal.style.display = 'none';
  });

  window.addEventListener('click', (e) => {
    if (e.target === allFeedbackModal) {
      allFeedbackModal.style.display = 'none';
    }
  });

  // ── Realtime ──
  function renderFeedback() {
    const fb = dashData.feedback || {};
    setText('feedbackTotal', formatNum(fb.totalFeedback || 0));

    // Render charts
    renderDonut('experienceChart', fb.questionStats?.experience || {});
    renderDonut('websiteTypeChart', fb.questionStats?.websiteType || {});
    renderDonut('recommendChart', fb.questionStats?.recommend || {});
    renderDonut('deviceChartFb', fb.questionStats?.device || {});

    // Recent feedback table
    const tbody = document.querySelector('#feedbackTable tbody');
    tbody.innerHTML = '';
    (fb.recentFeedback || []).slice(0, 30).forEach(f => {
      const tr = document.createElement('tr');
      const time = f.submittedAt ? new Date(f.submittedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '--';
      const type = f.responses?.websiteType || '--';
      const exp = f.responses?.experience || '--';
      const rec = f.responses?.recommend || '--';
      const issues = (f.responses?.issues || '').slice(0, 50) + ((f.responses?.issues || '').length > 50 ? '...' : '');
      tr.innerHTML = `<td>${time}</td><td>${type}</td><td>${exp}</td><td>${rec}</td><td>${issues}</td>`;
      tbody.appendChild(tr);
    });
  }

  function renderAllFeedbackModal(feedbacks) {
    allFeedbackTableBody.innerHTML = '';
    feedbacks.forEach(f => {
      const tr = document.createElement('tr');
      const time = f.submittedAt ? new Date(f.submittedAt).toLocaleString() : '--';
      const userId = f.ip || '--';
      const location = f.geo ? `${f.geo.city || ''}, ${f.geo.country || ''}`.replace(/^, |, $/, '') : '--';
      const responses = f.responses || {};
      tr.innerHTML = `
        <td>${time}</td>
        <td>${userId}</td>
        <td>${location}</td>
        <td>${responses.websiteType || '--'}</td>
        <td>${responses.experience || '--'}</td>
        <td>${responses.customization || '--'}</td>
        <td>${responses.feature || '--'}</td>
        <td>${responses.attractive || '--'}</td>
        <td>${responses.receiver || '--'}</td>
        <td>${responses.performance || '--'}</td>
        <td>${responses.issues || '--'}</td>
        <td>${responses.device || '--'}</td>
        <td>${responses.recommend || '--'}</td>
        <td>${responses.newFeatures || '--'}</td>
        <td>${responses.suggestions || '--'}</td>
      `;
      allFeedbackTableBody.appendChild(tr);
    });
  }

  function renderRealtime() {
    const o = dashData.overview || {};
    setText('rtTodayViews', formatNum(o.todayViews || 0));
    setText('rtTodayUnique', formatNum(o.todayUniqueVisitors || 0));
    setText('rtTodayCreated', formatNum(o.todayWebsitesCreated || 0));

    const tbody = document.querySelector('#realtimeTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const activities = dashData.recentActivity || [];

    activities.forEach(a => {
      const tr = document.createElement('tr');
      const time = a.timestamp ? new Date(a.timestamp).toLocaleString() : '--';
      const badge = getBadge(a.type);
      let details = a.page || '';
      if (a.type === 'website_created' || a.type === 'websiteCreated') {
        const name = a.details?.recipientName || a.recipientName || '';
        const ev = a.details?.eventType || a.eventType || 'site';
        details = `Created ${name ? `"${name}"` : 'Website'} (${ev}) [${a.websiteId || a.id || ''}]`;
      } else if (a.type === 'website-view' || a.type === 'website_view') {
        details = `Website Viewed: ${a.websiteId || 'Unknown'}`;
      } else if (a.type === 'feature') {
        details = `Feature: ${a.details?.feature || 'unknown'} (${a.details?.action || 'used'})`;
      } else if (a.details && typeof a.details === 'object' && Object.keys(a.details).length > 0) {
        details = `${a.page || ''} ${JSON.stringify(a.details).slice(0, 60)}`;
      }
      const city = a.geo?.city || a.creatorGeo?.city;
      const country = a.geo?.country || a.creatorGeo?.country;
      const loc = (city || country) ? `${city || ''}${city && country ? ', ' : ''}${country || ''}` : 'New Delhi, India';
      tr.innerHTML = `<td>${time}</td><td>${badge}</td><td>${details}</td><td>${loc}</td>`;
      tbody.appendChild(tr);
    });

    if (activities.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td colspan="4" style="text-align:center; color:var(--text-muted); padding:20px;">No recent live activity recorded yet</td>';
      tbody.appendChild(tr);
    }
  }

  function renderTrafficSources() {
    const ts = dashData.trafficSources || {};
    const kpi = ts.kpi || {};
    const charts = ts.charts || {};

    // Render KPIs
    setText('tsTotalSessions', formatNum(kpi.totalSessions || 0));
    setText('tsGoogleSearch', formatNum(kpi.googleSearch || 0));
    setText('tsBingSearch', formatNum((kpi.bingSearch || 0) + (kpi.otherSearch || 0)));
    setText('tsDirectTraffic', formatNum(kpi.directTraffic || 0));
    setText('tsSocialMedia', formatNum(kpi.socialMedia || 0));
    setText('tsSharedWebsites', formatNum(kpi.sharedWebsites || 0));

    // Traffic Sources Pie Chart
    const sourceData = charts.trafficSourceDistribution || {};
    makeChart('trafficSourceChart', {
      type: 'doughnut',
      data: {
        labels: Object.keys(sourceData),
        datasets: [{
          data: Object.values(sourceData),
          backgroundColor: COLORS.slice(0, Object.keys(sourceData).length),
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'right' } }
      }
    });

    // Search Engines Pie Chart
    const engineData = charts.searchEngineDistribution || {};
    makeChart('searchEngineChart', {
      type: 'doughnut',
      data: {
        labels: Object.keys(engineData),
        datasets: [{
          data: Object.values(engineData),
          backgroundColor: COLORS.slice(0, Object.keys(engineData).length),
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'right' } }
      }
    });

    // Top Keywords Bar Chart
    const keywordsData = charts.topKeywords || {};
    const sortedKeywords = Object.entries(keywordsData).sort((a, b) => b[1] - a[1]).slice(0, 10);
    makeChart('topKeywordsChart', {
      type: 'bar',
      data: {
        labels: sortedKeywords.map(k => k[0]),
        datasets: [{
          label: 'Searches',
          data: sortedKeywords.map(k => k[1]),
          backgroundColor: COLORS[0]
        }]
      },
      options: {
        responsive: true,
        indexAxis: 'y',
        plugins: { legend: { display: false } }
      }
    });

    // Social Platforms Pie Chart
    const socialData = charts.socialPlatforms || {};
    makeChart('socialPlatformsChart', {
      type: 'doughnut',
      data: {
        labels: Object.keys(socialData),
        datasets: [{
          data: Object.values(socialData),
          backgroundColor: COLORS.slice(0, Object.keys(socialData).length),
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'right' } }
      }
    });

    // UTM Campaigns Bar Chart
    const utmData = charts.utmCampaigns || [];
    const sortedUTM = utmData.slice(0, 10);
    makeChart('utmCampaignsChart', {
      type: 'bar',
      data: {
        labels: sortedUTM.map(u => u.campaign || 'Unknown'),
        datasets: [{
          label: 'Sessions',
          data: sortedUTM.map(u => u.count),
          backgroundColor: COLORS[1]
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } }
      }
    });

    // Top Referrers Bar Chart
    const referrerData = charts.topReferrers || {};
    const cleanReferrerData = {};
    Object.entries(referrerData).forEach(([ref, count]) => {
      let name = ref;
      try { name = new URL(ref).hostname.replace(/^www\./, ''); } catch (e) { }
      cleanReferrerData[name] = (cleanReferrerData[name] || 0) + count;
    });
    const sortedReferrers = Object.entries(cleanReferrerData).sort((a, b) => b[1] - a[1]).slice(0, 10);

    makeChart('topReferrersChart', {
      type: 'bar',
      data: {
        labels: sortedReferrers.map(r => r[0].substring(0, 30)),
        datasets: [{
          label: 'Sessions',
          data: sortedReferrers.map(r => r[1]),
          backgroundColor: COLORS[2]
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } }
      }
    });

    // Traffic Trend Line Chart
    const trendData = charts.trafficTrend || [];
    const sources = [...new Set(trendData.map(t => t._id?.source).filter(s => s))];
    const dates = [...new Set(trendData.map(t => t._id?.date).filter(d => d))].sort();

    const trendDatasets = sources.map((source, idx) => ({
      label: source,
      data: dates.map(date => {
        const item = trendData.find(t => t._id?.date === date && t._id?.source === source);
        return item ? item.count : 0;
      }),
      borderColor: COLORS[idx % COLORS.length],
      backgroundColor: COLORS[idx % COLORS.length] + '20',
      fill: false,
      tension: 0.3
    }));

    makeChart('trafficTrendChart', {
      type: 'line',
      data: {
        labels: dates,
        datasets: trendDatasets
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'top' } },
        scales: {
          x: { display: true },
          y: { display: true }
        }
      }
    });

    // Traffic Source Table
    const sourceTable = document.querySelector('#trafficSourceTable tbody');
    if (sourceTable) {
      sourceTable.innerHTML = '';
      const total = kpi.totalSessions || 1;
      Object.entries(sourceData).sort((a, b) => b[1] - a[1]).forEach(([source, count]) => {
        const tr = document.createElement('tr');
        const pct = ((count / total) * 100).toFixed(1);
        tr.innerHTML = `<td>${source}</td><td>${formatNum(count)}</td><td>${pct}%</td>`;
        sourceTable.appendChild(tr);
      });
    }

    // Keywords Table
    const keywordsTable = document.querySelector('#keywordsTable tbody');
    if (keywordsTable) {
      keywordsTable.innerHTML = '';
      const totalKeywords = Object.values(keywordsData).reduce((a, b) => a + b, 0) || 1;
      sortedKeywords.forEach(([keyword, count]) => {
        const tr = document.createElement('tr');
        const pct = ((count / totalKeywords) * 100).toFixed(1);
        tr.innerHTML = `<td>${keyword}</td><td>${formatNum(count)}</td><td>${pct}%</td>`;
        keywordsTable.appendChild(tr);
      });
    }

    // UTM Campaigns Table
    const utmTable = document.querySelector('#utmCampaignsTable tbody');
    if (utmTable) {
      utmTable.innerHTML = '';
      sortedUTM.forEach(u => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${u.campaign || '--'}</td><td>${u.source || '--'}</td><td>${u.medium || '--'}</td><td>${formatNum(u.count)}</td>`;
        utmTable.appendChild(tr);
      });
    }

    // Recent Traffic Table
    const recentTrafficTable = document.querySelector('#recentTrafficTable tbody');
    if (recentTrafficTable) {
      recentTrafficTable.innerHTML = '';
      (ts.recentTraffic || []).slice(0, 50).forEach(t => {
        const tr = document.createElement('tr');
        const time = t.timestamp ? new Date(t.timestamp).toLocaleString() : '--';
        const source = t.details?.trafficSource || 'Direct / Typed URL';
        const engine = t.details?.searchEngine || '--';
        const keywords = t.details?.searchKeywords || '--';
        const campaign = t.details?.utmCampaign || '--';
        const refererRaw = t.details?.referer || 'Direct Entry';
        const refererShort = refererRaw.length > 45 ? refererRaw.substring(0, 45) + '...' : refererRaw;

        let badgeClass = 'badge-blue';
        if (source.includes('Google')) badgeClass = 'badge-green';
        else if (source.includes('Bing') || source.includes('Search')) badgeClass = 'badge-cyan';
        else if (source.includes('Direct')) badgeClass = 'badge-purple';
        else if (source.includes('Shared')) badgeClass = 'badge-orange';
        else if (source.includes('WhatsApp') || source.includes('Instagram') || source.includes('Facebook')) badgeClass = 'badge-pink';

        tr.innerHTML = `
          <td>${time}</td>
          <td><span class="badge ${badgeClass}">${source}</span></td>
          <td>${engine}</td>
          <td>${keywords}</td>
          <td>${campaign}</td>
          <td title="${refererRaw}">${refererShort}</td>
        `;
        recentTrafficTable.appendChild(tr);
      });
    }
  }

  // ── System Health ──
  let healthData = null;
  let healthRefreshInterval = null;

  async function loadSystemHealth() {
    try {
      const current = await apiFetch('/api/admin/health/current');
      const history = await apiFetch('/api/admin/health/history?hours=24');
      const systemInfo = await apiFetch('/api/admin/health/system-info');

      healthData = {
        current,
        history: history.metrics || [],
        systemInfo
      };

      renderSystemHealth();
    } catch (err) {
      console.error('System health load error:', err);
    }
  }

  function renderSystemHealth() {
    if (!healthData || !healthData.current) return;

    const current = healthData.current;

    // Update KPI cards with color coding
    updateHealthKPI('shCpuUsage', current.cpuUsage, 'kpiCpuCard', 70, 90);
    updateHealthKPI('shMemoryUsage', current.memoryUsage, 'kpiMemoryCard', 80, 95);
    updateHealthKPI('shDiskUsage', current.diskUsage, 'kpiDiskCard', 80, 95);

    // MongoDB connections
    const mongoUsage = current.mongoPoolSize > 0 ? (current.mongoConnections / current.mongoPoolSize) * 100 : 0;
    setText('shMongoConnections', `${current.mongoConnections}/${current.mongoPoolSize}`);
    updateKpiColor('kpiMongoCard', mongoUsage, 80, 95);

    // Update alert status
    updateAlertStatus(current);

    // Render trend charts
    renderHealthTrendCharts();

    // Render system info table
    renderSystemInfoTable();

    // Render alerts history
    renderAlertsHistory();
  }

  function updateHealthKPI(elementId, value, cardId, warningThreshold, criticalThreshold) {
    setText(elementId, value.toFixed(1) + '%');
    updateKpiColor(cardId, value, warningThreshold, criticalThreshold);
  }

  function updateKpiColor(cardId, value, warningThreshold, criticalThreshold) {
    const card = document.getElementById(cardId);
    if (!card) return;

    card.classList.remove('accent-purple', 'accent-cyan', 'accent-orange', 'accent-green', 'accent-red');

    if (value >= criticalThreshold) {
      card.classList.add('accent-red');
    } else if (value >= warningThreshold) {
      card.classList.add('accent-orange');
    } else {
      card.classList.add('accent-green');
    }
  }

  function updateAlertStatus(metrics) {
    const alertStatus = document.getElementById('alertStatus');
    if (!alertStatus) return;

    alertStatus.classList.remove('normal', 'warning', 'critical');

    if (metrics.alertLevel === 'critical') {
      alertStatus.classList.add('critical');
      alertStatus.innerHTML = '<i class="fas fa-exclamation-circle"></i><span>Critical: ' + JSON.stringify(metrics.alertDetails || {}) + '</span>';
    } else if (metrics.alertLevel === 'warning') {
      alertStatus.classList.add('warning');
      alertStatus.innerHTML = '<i class="fas fa-exclamation-triangle"></i><span>Warning: ' + JSON.stringify(metrics.alertDetails || {}) + '</span>';
    } else {
      alertStatus.classList.add('normal');
      alertStatus.innerHTML = '<i class="fas fa-check-circle"></i><span>All systems normal</span>';
    }
  }

  function renderHealthTrendCharts() {
    const history = healthData.history || [];

    if (history.length === 0) return;

    const timestamps = history.map(m => new Date(m.timestamp).toLocaleString());
    const cpuData = history.map(m => m.cpuUsage || 0);
    const memoryData = history.map(m => m.memoryUsage || 0);
    const diskData = history.map(m => m.diskUsage || 0);
    const mongoData = history.map(m => {
      const poolSize = m.mongoPoolSize || 100;
      return poolSize > 0 ? (m.mongoConnections / poolSize) * 100 : 0;
    });

    // CPU Trend Chart
    makeChart('cpuTrendChart', {
      type: 'line',
      data: {
        labels: timestamps,
        datasets: [{
          label: 'CPU Usage %',
          data: cpuData,
          borderColor: COLORS[0],
          backgroundColor: COLORS[0] + '20',
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, max: 100 }
        }
      }
    });

    // Memory Trend Chart
    makeChart('memoryTrendChart', {
      type: 'line',
      data: {
        labels: timestamps,
        datasets: [{
          label: 'Memory Usage %',
          data: memoryData,
          borderColor: COLORS[1],
          backgroundColor: COLORS[1] + '20',
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, max: 100 }
        }
      }
    });

    // Disk Trend Chart
    makeChart('diskTrendChart', {
      type: 'line',
      data: {
        labels: timestamps,
        datasets: [{
          label: 'Disk Usage %',
          data: diskData,
          borderColor: COLORS[2],
          backgroundColor: COLORS[2] + '20',
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, max: 100 }
        }
      }
    });

    // MongoDB Trend Chart
    makeChart('mongoTrendChart', {
      type: 'line',
      data: {
        labels: timestamps,
        datasets: [{
          label: 'Connection Pool Usage %',
          data: mongoData,
          borderColor: COLORS[3],
          backgroundColor: COLORS[3] + '20',
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, max: 100 }
        }
      }
    });
  }

  function renderSystemInfoTable() {
    const info = healthData.systemInfo || {};
    const tbody = document.querySelector('#systemInfoTable tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    const fields = [
      { label: 'Platform', value: info.platform || '--' },
      { label: 'OS', value: info.distro || info.release || '--' },
      { label: 'Architecture', value: info.arch || '--' },
      { label: 'Hostname', value: info.hostname || '--' },
      { label: 'CPU Model', value: info.cpuModel || '--' },
      { label: 'CPU Cores', value: info.cpuCores || '--' },
      { label: 'CPU Speed', value: info.cpuSpeed ? info.cpuSpeed + ' GHz' : '--' },
      { label: 'Total Memory', value: info.totalMemory ? info.totalMemory + ' GB' : '--' },
      { label: 'Uptime', value: info.uptimeFormatted || '--' }
    ];

    fields.forEach(field => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${field.label}</td><td>${field.value}</td>`;
      tbody.appendChild(tr);
    });
  }

  function renderAlertsHistory() {
    const history = healthData.history || [];
    const tbody = document.querySelector('#alertsHistoryTable tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    // Filter only alerts (warning or critical)
    const alerts = history.filter(m => m.alertLevel !== 'normal').slice(-20).reverse();

    if (alerts.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td colspan="3">No recent alerts</td>';
      tbody.appendChild(tr);
      return;
    }

    alerts.forEach(alert => {
      const tr = document.createElement('tr');
      const time = alert.timestamp ? new Date(alert.timestamp).toLocaleString() : '--';
      const level = alert.alertLevel || 'unknown';
      const details = alert.alertDetails ? JSON.stringify(alert.alertDetails) : '--';

      const levelClass = level === 'critical' ? 'badge-red' : (level === 'warning' ? 'badge-orange' : 'badge-green');

      tr.innerHTML = `<td>${time}</td><td><span class="badge ${levelClass}">${level.toUpperCase()}</span></td><td>${details}</td>`;
      tbody.appendChild(tr);
    });
  }

  // System Health section handlers
  document.getElementById('testAlertBtn')?.addEventListener('click', async () => {
    try {
      const result = await apiFetch('/api/admin/health/test-alert', { method: 'POST' });
      alert(result.message || 'Test alert sent');
    } catch (err) {
      alert('Failed to send test alert');
    }
  });

  document.getElementById('refreshHealthBtn')?.addEventListener('click', async () => {
    const btn = document.getElementById('refreshHealthBtn');
    if (btn) btn.classList.add('loading');
    await loadSystemHealth();
    if (btn) btn.classList.remove('loading');
  });

  document.getElementById('collectHealthBtn')?.addEventListener('click', async () => {
    const statusDiv = document.getElementById('healthCollectionStatus');
    statusDiv.textContent = 'Collecting...';
    statusDiv.style.color = '#06b6d4';

    try {
      const result = await apiFetch('/api/admin/health/collect', { method: 'POST' });
      if (result.success) {
        statusDiv.textContent = 'Health metrics collected successfully!';
        statusDiv.style.color = '#22c55e';
        loadSystemHealth();
      } else {
        statusDiv.textContent = 'Failed: ' + result.error;
        statusDiv.style.color = '#ef4444';
      }
    } catch (err) {
      statusDiv.textContent = 'Error: ' + err.message;
      statusDiv.style.color = '#ef4444';
    }
  });

  document.getElementById('cleanupMetricsBtn')?.addEventListener('click', async () => {
    if (!confirm('This will delete metrics older than 7 days. Continue?')) return;

    try {
      const result = await apiFetch('/api/admin/health/cleanup', { method: 'POST' });
      if (result.success) {
        alert('Cleanup completed successfully!');
      } else {
        alert('Failed: ' + result.error);
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  });

  // Auto-refresh system health every 5 minutes when section is active
  function startHealthAutoRefresh() {
    // Auto-refresh disabled - manual refresh only
  }

  // Auto-refresh realtime every 30s
  // Auto-refresh disabled - manual refresh only

  // ── Custom URL Analytics ──
  async function loadCustomUrlAnalytics() {
    try {
      // Fetch payments data
      const paymentsData = await apiFetch('/api/admin/custom-url-payments');
      const payments = paymentsData.payments || [];

      // Fetch clicks data
      const clicksData = await apiFetch('/api/admin/personalise-url-clicks');
      const clicks = clicksData.clicks || [];
      const totalWebsites = clicksData.totalWebsites || dashData?.overview?.totalWebsitesCreated || dashData?.websites?.length || 0;
      const totalClicks = clicksData.totalClicks != null ? clicksData.totalClicks : clicks.length;
      const uniqueClickers = clicksData.uniqueClickers != null ? clicksData.uniqueClickers : new Set(clicks.map(c => c.websiteId || c.visitorId)).size;

      // Update KPI cards
      document.getElementById('cuTotalPayments').textContent = payments.length;

      const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const currency = payments.length > 0 ? payments[0].currency : 'USD';
      document.getElementById('cuTotalRevenue').textContent = `${currency} ${totalRevenue.toFixed(2)}`;

      // Personalise Clicks Card: displays total clicks and unique sites ratio
      document.getElementById('cuTotalClicks').textContent = totalClicks > 0 ? `${totalClicks} (${uniqueClickers}/${totalWebsites} sites)` : `0 / ${totalWebsites}`;

      const conversionRate = totalWebsites > 0 ? ((uniqueClickers / totalWebsites) * 100).toFixed(1) : '0.0';
      document.getElementById('cuConversionRate').textContent = `${conversionRate}%`;

      // Render payments table
      const paymentsTbody = document.querySelector('#customUrlPaymentsTable tbody');
      if (paymentsTbody) {
        paymentsTbody.innerHTML = '';
        payments.forEach(payment => {
          const tr = document.createElement('tr');
          const date = payment.createdAt ? new Date(payment.createdAt).toLocaleString() : '--';
          const recipient = payment.websiteRecipientName || 'Unknown';
          const eventType = payment.websiteEventType || 'Unknown';

          tr.innerHTML = `
            <td>${date}</td>
            <td>${payment.orderId || '--'}</td>
            <td>${payment.websiteId || '--'}</td>
            <td><strong>${payment.slug || '--'}</strong></td>
            <td>${payment.amount || '--'}</td>
            <td>${payment.currency || '--'}</td>
            <td>${payment.gateway || '--'}</td>
            <td>${recipient}</td>
            <td>${eventType}</td>
          `;
          paymentsTbody.appendChild(tr);
        });

        if (payments.length === 0) {
          const tr = document.createElement('tr');
          tr.innerHTML = '<td colspan="9">No payments recorded yet</td>';
          paymentsTbody.appendChild(tr);
        }
      }

      // Render clicks table
      const clicksTbody = document.querySelector('#personaliseClicksTable tbody');
      if (clicksTbody) {
        clicksTbody.innerHTML = '';
        clicks.forEach(click => {
          const tr = document.createElement('tr');
          const date = click.timestamp ? new Date(click.timestamp).toLocaleString() : '--';
          const recipient = click.websiteRecipientName || 'Unknown';
          const eventType = click.websiteEventType || 'Unknown';
          const location = click.geo ? `${click.geo.city || ''}, ${click.geo.country || ''}` : 'Unknown';
          const statusBadge = click.isPaid
            ? `<span class="badge badge-green"><i class="fas fa-check-circle"></i> Paid (${click.paymentAmount || ''})</span>`
            : `<span class="badge badge-orange"><i class="fas fa-user-clock"></i> Unpaid</span>`;

          tr.innerHTML = `
            <td>${date}</td>
            <td>${click.websiteId || '--'}</td>
            <td>${recipient}</td>
            <td>${eventType}</td>
            <td>${location}</td>
            <td>${statusBadge}</td>
          `;
          clicksTbody.appendChild(tr);
        });

        if (clicks.length === 0) {
          const tr = document.createElement('tr');
          tr.innerHTML = '<td colspan="6">No clicks recorded yet</td>';
          clicksTbody.appendChild(tr);
        }
      }
    } catch (err) {
      console.error('Error loading custom URL analytics:', err);
    }
  }

  document.getElementById('refreshCustomUrlBtn')?.addEventListener('click', async () => {
    const btn = document.getElementById('refreshCustomUrlBtn');
    if (btn) btn.classList.add('loading');
    await loadCustomUrlAnalytics();
    if (btn) btn.classList.remove('loading');
  });

  // ── All Feedback Responses Modal Handler ──
  const viewAllFeedbackBtn = document.getElementById('viewAllFeedbackBtn');
  const closeAllFeedbackModal = document.getElementById('closeAllFeedbackModal');

  async function openAllFeedbackModal() {
    if (!allFeedbackModal) return;
    allFeedbackModal.classList.add('show');
    const tbody = document.querySelector('#allFeedbackTable tbody');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="15" style="text-align:center; padding:20px;"><i class="fas fa-spinner fa-spin"></i> Loading feedback...</td></tr>';
    }
    try {
      const data = await apiFetch('/api/admin/feedback-analytics?all=true');
      const feedbackList = data.recentFeedback || [];
      if (tbody) {
        tbody.innerHTML = '';
        feedbackList.forEach(fb => {
          const resp = fb.responses || {};
          const date = fb.submittedAt ? new Date(fb.submittedAt).toLocaleString() : '--';
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${date}</td>
            <td>${fb.userId || '--'}</td>
            <td>${fb.location ? `${fb.location.city || ''}, ${fb.location.country || ''}` : '--'}</td>
            <td>${resp.websiteType || '--'}</td>
            <td>${resp.overallExperience || '--'}</td>
            <td>${resp.customizationEase || '--'}</td>
            <td>${resp.favoriteFeature || '--'}</td>
            <td>${resp.visuallyAttractive || '--'}</td>
            <td>${resp.receiverReaction || '--'}</td>
            <td>${resp.loadingSpeed || '--'}</td>
            <td>${resp.technicalIssues || '--'}</td>
            <td>${resp.deviceCategory || '--'}</td>
            <td>${resp.wouldRecommend || '--'}</td>
            <td>${resp.desiredFeatures || '--'}</td>
            <td>${resp.openSuggestions || '--'}</td>
          `;
          tbody.appendChild(tr);
        });
        if (feedbackList.length === 0) {
          tbody.innerHTML = '<tr><td colspan="15" style="text-align:center; opacity:0.6; padding:20px;">No feedback records found</td></tr>';
        }
      }
    } catch (err) {
      console.error('Error fetching all feedback:', err);
      if (tbody) tbody.innerHTML = `<tr><td colspan="15" style="text-align:center; color:var(--red); padding:20px;">Failed to load feedback data</td></tr>`;
    }
  }

  function closeAllFeedbackModalFn() {
    if (allFeedbackModal) allFeedbackModal.classList.remove('show');
  }

  viewAllFeedbackBtn?.addEventListener('click', openAllFeedbackModal);
  closeAllFeedbackModal?.addEventListener('click', closeAllFeedbackModalFn);
  allFeedbackModal?.addEventListener('click', (e) => {
    if (e.target === allFeedbackModal) closeAllFeedbackModalFn();
  });

  // ── Cloudinary ──
  // (Functionality moved to renderCloudinaryTable and its dedicated listener)


  // ── Helpers ──
  function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
  function formatNum(n) { if (n == null) return '0'; if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'; if (n >= 1000) return (n / 1000).toFixed(1) + 'K'; return n.toString(); }
  function getBadge(type) {
    const map = {
      pageview: ['Page View', 'badge-cyan'],
      pageView: ['Page View', 'badge-cyan'],
      event: ['Event', 'badge-orange'],
      'website-view': ['Website View', 'badge-blue'],
      websiteCreated: ['Created', 'badge-green']
    };
    const [label, cls] = map[type] || [type, 'badge-purple'];
    return `<span class="badge ${cls}">${label}</span>`;
  }
})();
