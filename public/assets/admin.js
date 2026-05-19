/* ══════════════════════════════════════════════════════════
   Greeter Admin Dashboard — JavaScript Controller
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const API = (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) ? window.APP_CONFIG.API_BASE_URL : window.location.origin;
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

  const COLORS = ['#7b5df6','#ff7a2f','#06b6d4','#22c55e','#ec4899','#f59e0b','#8b5cf6','#ef4444','#14b8a6','#f97316','#6366f1','#a855f7'];
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
      console.error('API Response was not JSON:', text.slice(0, 500));
      throw new Error('Invalid JSON response');
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
    loadingOverlay.classList.remove('hidden');
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

      // If configured, also fetch the same admin endpoints from the additional site and merge
      if (ADDITIONAL_API) {
        try {
          // Lightweight fetch for additional dashboard data
          async function additionalFetch(url, options = {}) {
            const headers = { 'Authorization': 'Basic ' + authToken, 'Content-Type': 'application/json', ...options.headers };
            const r = await fetch(ADDITIONAL_API + url, { ...options, headers });
            const text = await r.text();
            try { return JSON.parse(text); } catch (e) { console.warn('[Admin] Additional API returned non-JSON', text.slice(0,200)); return null; }
          }

          function mergeOverview(primary, other) {
            if (!other || !other.overview) return;
            primary.overview = primary.overview || {};
            const keys = ['totalPageViews','totalWebsitesCreated','periodUniqueVisitors','todayViews','todayWebsitesCreated','totalWebsiteViews','todayUniqueVisitors'];
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
            return Object.values(map).sort((a,b) => a.date.localeCompare(b.date));
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
            merged.sort((a,b) => (b[keyDate] || '').localeCompare(a[keyDate] || ''));
            return merged.slice(0, 200);
          }

          function mergeWebsites(primaryList, otherList) {
            const map = {};
            (primaryList || []).concat(otherList || []).forEach(w => { if (!w || !w.id) return; const prev = map[w.id]; if (!prev) map[w.id] = w; else { // keep the one with latest createdAt or higher views
                if ((w.createdAt && prev.createdAt && new Date(w.createdAt) > new Date(prev.createdAt)) || (Number(w.views || 0) > Number(prev.views || 0))) map[w.id] = w; }
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
            const distKeys = ['deviceDistribution','browserDistribution','osDistribution','eventTypeDistribution','refererDistribution','exitPages','geoDistribution','pageViewsByPage','websitesByEventType','featureStats'];
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
                ['tried','used','triedEnabled','triedDisabled','triedVisitors','triedEnabledVisitors','usedVisitors','total'].forEach(nk => { tgt[nk] = (Number(tgt[nk]||0) + Number(src[nk]||0)); });
              }
            });

            // Merge recent activity and websites
            dashData.recentActivity = mergeArraysByDate(dashData.recentActivity, otherDash.recentActivity, 'timestamp');
            dashData.websites = mergeWebsites(dashData.websites || [], otherDash.websites || []);

            // Merge topWebsites by views
            const combinedTop = (dashData.topWebsites || []).concat(otherDash.topWebsites || []);
            dashData.topWebsites = combinedTop.sort((a,b) => (Number(b.views||0) - Number(a.views||0))).slice(0,20);

            // Merge feedback
            if (otherDash.feedback) {
              dashData.feedback = dashData.feedback || { totalFeedback:0, recentFeedback:[], questionStats:{} };
              dashData.feedback.totalFeedback = Number(dashData.feedback.totalFeedback || 0) + Number(otherDash.feedback.totalFeedback || 0);
              dashData.feedback.recentFeedback = (dashData.feedback.recentFeedback || []).concat(otherDash.feedback.recentFeedback || []).sort((a,b) => (b.submittedAt||'').localeCompare(a.submittedAt||'')).slice(0,200);

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
              dashData.feedback = dashData.feedback || { totalFeedback:0, recentFeedback:[], questionStats:{} };
              dashData.feedback.recentFeedback = (dashData.feedback.recentFeedback || []).concat(otherFb.recentFeedback || []).sort((a,b) => (b.submittedAt||'').localeCompare(a.submittedAt||'')).slice(0,500);
            }
          } catch (inner) {
            console.warn('Additional feedback fetch failed:', inner);
          }
        } catch (errAdd) {
          console.warn('[Admin] Failed to fetch/merge additional API data from', ADDITIONAL_API, errAdd);
        }
      }

      // Show fallback mode indicator if applicable
      if (dashData.fallbackMode) {
        console.log('[Admin] Dashboard running in fallback mode:', dashData.message);
        // You could add a visual indicator here if needed
        const fallbackIndicator = document.getElementById('fallbackIndicator');
        if (fallbackIndicator) {
          fallbackIndicator.textContent = dashData.message;
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
    loadingOverlay.classList.add('hidden');
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
    setText('kpiWebsiteViews', formatNum(o.totalWebsiteViews || 0));

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
    const keys = Object.keys(dataObj).slice(0, 8);
    const vals = keys.map(k => dataObj[k]);
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
    const d = dashData.charts?.hourlyDistribution || [];
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
  function renderGeoChart() { renderBarChart('geoChart', dashData.charts?.geoDistribution || {}, '#22c55e'); }

  // Merge feature entries by normalized display to avoid duplicates
  const CLEAN_NAME_MAP = {
    'lock': 'Lock',
    'curtainreveal': 'Curtain Reveal',
    'welcometyping': 'Welcome Message',
    'welcomemessage': 'Welcome Message',
    'fireworkstext': 'Fireworks Text',
    'flowerrain': 'Flower Rain',
    'canvasstarfall': 'Stardust',
    'stardust': 'Stardust',
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
    'addimages': 'Add Images',
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
    'addtextbox': 'Add Text Box',
    'finalsurprise': 'Final Message',
    'finalmessage': 'Final Message',
    'magicmusic': 'Add Music',
    'addmusic': 'Add Music'
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
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: function(context) { const d = data[context.dataIndex]; return [`Growth: ${d.growth.toFixed(1)}%`, `Recent: ${d.recent}`, `Total: ${d.total}`]; } } } }, scales: { y: { beginAtZero: true, title: { display: true, text: 'Growth Rate (%)' } }, x: { grid: { display: false }, ticks: { maxRotation: 45, minRotation: 45 } } } }
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
      let details = '';
      if (a.type === 'pageview' || a.type === 'pageView') details = a.page || '';
      else if (a.type === 'event') details = (a.eventType || '') + ' ' + (a.details ? JSON.stringify(a.details).slice(0, 60) : '');
      else if (a.type === 'website-view') details = `Website: ${a.websiteId || 'Unknown'} | View`;
      else if (a.type === 'websiteCreated') details = `ID: ${a.websiteId || ''} | ${a.recipientName || ''}`;
      const loc = a.geo ? `${a.geo.city || ''}, ${a.geo.country || ''}` : '--';
      tr.innerHTML = `<td>${time}</td><td>${badge}</td><td>${details}</td><td>${loc}</td>`;
      tbody.appendChild(tr);
    });
  }

  function renderWebsitesCards() {
    const grid = document.getElementById('websiteGrid');
    const search = document.getElementById('websiteSearch');
    const sort = document.getElementById('websiteSort');
    const list = dashData.websites || [];

    function render() {
      grid.innerHTML = '';
      const filter = search.value.toLowerCase();
      const sortType = sort.value;

      let filtered = list.filter(w => {
        if (!filter) return true;
        return (w.id || '').toLowerCase().includes(filter) || 
               (w.eventType || '').toLowerCase().includes(filter) || 
               (w.recipientName || '').toLowerCase().includes(filter);
      });

      // Apply Sort
      filtered.sort((a, b) => {
        if (sortType === 'date_desc') return new Date(b.createdAt) - new Date(a.createdAt);
        if (sortType === 'date_asc') return new Date(a.createdAt) - new Date(b.createdAt);
        if (sortType === 'views_desc') return (b.views || 0) - (a.views || 0);
        if (sortType === 'name_asc') return (a.recipientName || '').localeCompare(b.recipientName || '');
        return 0;
      });

      if (filtered.length === 0) {
        grid.innerHTML = `<div class="empty-state"><i class="fas fa-search"></i><p>No websites found.</p></div>`;
        return;
      }

      filtered.forEach(w => {
        const card = document.createElement('div');
        card.className = 'website-card';
        const created = w.createdAt ? new Date(w.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '--';
        const loc = w.creatorGeo ? `${w.creatorGeo.city || 'Local'}, ${w.creatorGeo.country || 'Host'}` : 'Unknown Location';
        const viewUrl = window.location.origin + '/generated/customize.html?view=' + w.id;
        
        card.innerHTML = `
          <div class="card-header">
            <div class="card-id-box">
              <span class="card-id">${w.id}</span>
              <h4 class="card-title">${w.recipientName || 'Untitled Site'}</h4>
            </div>
            <span class="badge badge-purple">${w.eventType || 'unknown'}</span>
          </div>
          <div class="card-body">
            <div class="info-row"><i class="fas fa-calendar-alt"></i> Created: ${created}</div>
            <div class="info-row"><i class="fas fa-map-marker-alt"></i> ${loc}</div>
            <div class="info-row"><i class="fas fa-layer-group"></i> Template: ${w.templateName || 'default'}</div>
          </div>
          <div class="card-footer">
            <div class="card-stats">
              <div class="stat-item">
                <span class="stat-val">${formatNum(w.views || 0)}</span>
                <span class="stat-label">Views</span>
              </div>
              <div class="stat-item">
                <span class="stat-val">${(w.uniqueViewers || []).length}</span>
                <span class="stat-label">Unique</span>
              </div>
            </div>
            <a href="${viewUrl}" target="_blank" class="action-btn"><i class="fas fa-external-link-alt"></i> Open</a>
          </div>
        `;
        grid.appendChild(card);
      });
    }

    render();
    search.addEventListener('input', render);
    sort.addEventListener('change', render);
  }

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
      const id = r.publicId.replace('configs/', '');
      const created = new Date(r.createdAt).toLocaleString();
      const size = (r.bytes / 1024).toFixed(1) + ' KB';
      const viewUrl = window.location.origin + '/generated/customize.html?view=' + id;
      tr.innerHTML = `
        <td><code style="color:var(--accent)">${id}</code></td>
        <td>${created}</td>
        <td>${size}</td>
        <td>
          <a href="${viewUrl}" target="_blank" class="action-btn"><i class="fas fa-eye"></i> View</a>
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
      renderCloudinaryTable(res.websites || []);
      return res;
    } catch (err) {
      console.error('Cloudinary fetch error:', err);
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

  document.getElementById('viewAllFeedbackBtn').addEventListener('click', () => {
    allFeedbackModal.style.display = 'block';
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
    tbody.innerHTML = '';
    (dashData.recentActivity || []).slice(0, 20).forEach(a => {
      const tr = document.createElement('tr');
      const time = a.timestamp ? new Date(a.timestamp).toLocaleString() : '--';
      const badge = getBadge(a.type);
      let details = a.page || a.eventType || a.websiteId || '';
      const loc = a.geo ? `${a.geo.city || ''}, ${a.geo.country || ''}` : '--';
      tr.innerHTML = `<td>${time}</td><td>${badge}</td><td>${details}</td><td>${loc}</td>`;
      tbody.appendChild(tr);
    });
  }

  // Auto-refresh realtime every 30s
  setInterval(() => {
    const rtSection = document.getElementById('sec-realtime');
    if (rtSection && rtSection.classList.contains('active')) loadDashboard();
  }, 30000);

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
