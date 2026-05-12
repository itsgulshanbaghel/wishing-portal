/* ══════════════════════════════════════════════════════════
   Greeter Admin Dashboard — JavaScript Controller
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const API = (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) ? window.APP_CONFIG.API_BASE_URL : window.location.origin;
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
    } catch (err) {
      console.error('Dashboard load error:', err);
      dashData = {
        overview: {},
        charts: { trendData: [] },
        recentActivity: [],
        websites: [],
        topWebsites: []
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
    renderCategoryChart();
    renderCreationTrendChart();
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

  function renderFeatureChart() {
    const fs = dashData.charts?.featureStats || {};
    const keys = Object.keys(fs).slice(0, 15);
    makeChart('featureChart', {
      type: 'bar',
      data: {
        labels: keys.map(k => k.length > 20 ? k.slice(0, 20) + '…' : k),
        datasets: [
          { label: 'Enabled', data: keys.map(k => fs[k].enabled), backgroundColor: 'rgba(34,197,94,0.4)', borderColor: '#22c55e', borderWidth: 1, borderRadius: 4 },
          { label: 'Disabled', data: keys.map(k => fs[k].disabled), backgroundColor: 'rgba(239,68,68,0.4)', borderColor: '#ef4444', borderWidth: 1, borderRadius: 4 }
        ]
      },
      options: { responsive: true, plugins: { legend: { position: 'top', labels: { boxWidth: 10 } } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.03)' } }, x: { grid: { display: false } } } }
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
      if (a.type === 'pageView') details = a.page || '';
      else if (a.type === 'event') details = (a.eventType || '') + ' ' + (a.details ? JSON.stringify(a.details).slice(0, 60) : '');
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
        alert(`Sync complete! ${res.synced} new websites added to analytics.`);
      }
    } catch (err) {
      alert('Sync failed. Check console for details.');
    }
  });

  // ── Realtime ──
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
    const map = { pageView: ['Page View', 'badge-cyan'], event: ['Event', 'badge-orange'], websiteCreated: ['Created', 'badge-green'] };
    const [label, cls] = map[type] || [type, 'badge-purple'];
    return `<span class="badge ${cls}">${label}</span>`;
  }
})();
