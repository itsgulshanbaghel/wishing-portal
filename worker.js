const EUROZONE = ['AT', 'BE', 'CY', 'EE', 'FI', 'FR', 'DE', 'GR', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PT', 'SK', 'SI', 'ES', 'HR'];

const STATIC_PREFIXES = [
  'api', 'generated', 'blog', 'assets', 'templates', 'maintenance', 'admin', 
  'create', 'clear', 'privacy', 'pricing', 'about', 'contact', 'why', 'whygreeter', 
  'edit', 'terms', 'birthday', 'romantic', 'anniversary', '1st', 'diwali', 
  'festival', 'valentines', 'wedding', 'online', 'digital'
];

const CLEAN_STATIC_ROUTES = {
  '/edit': '/edit.html',
  '/create': '/create.html',
  '/templates': '/templates/index.html',
  '/Pricing': '/Pricing.html',
  '/AboutUs': '/AboutUs.html',
  '/WhyGreeter': '/WhyGreeter.html',
  '/ContactUs': '/ContactUs.html',
  '/privacy': '/privacy.html',
  '/clear': '/clear.html',
  '/terms': '/terms.html',
  '/terms&cond': '/terms&cond.html',
  '/birthday-wishes-website': '/birthday-wishes-website.html',
  '/online-birthday-card': '/online-birthday-card.html',
  '/birthday-card-with-music': '/birthday-card-with-music.html',
  '/birthday-card-with-photos': '/birthday-card-with-photos.html',
  '/digital-birthday-card': '/digital-birthday-card.html',
  '/birthday-card-with-password': '/birthday-card-with-password.html',
  '/birthday-wishes-for-girlfriend': '/birthday-wishes-for-girlfriend.html',
  '/birthday-wishes-for-boyfriend': '/birthday-wishes-for-boyfriend.html',
  '/birthday-wishes-for-wife': '/birthday-wishes-for-wife.html',
  '/birthday-wishes-for-husband': '/birthday-wishes-for-husband.html',
  '/birthday-wishes-for-best-friend': '/birthday-wishes-for-best-friend.html',
  '/birthday-wishes-for-mom': '/birthday-wishes-for-mom.html',
  '/birthday-wishes-for-dad': '/birthday-wishes-for-dad.html',
  '/birthday-wishes-for-sister': '/birthday-wishes-for-sister.html',
  '/birthday-wishes-for-brother': '/birthday-wishes-for-brother.html',
  '/birthday-wishes-for-crush': '/birthday-wishes-for-crush.html',
  '/30th-birthday-wishes-website': '/30th-birthday-wishes-website.html',
  '/hindi-birthday-wishes-website': '/hindi-birthday-wishes-website.html',
  '/romantic-proposal-website': '/romantic-proposal-website.html',
  '/will-you-be-my-girlfriend-website': '/will-you-be-my-girlfriend-website.html',
  '/anniversary-wishes-website': '/anniversary-wishes-website.html',
  '/1st-anniversary-wishes-website': '/1st-anniversary-wishes-website.html',
  '/long-distance-surprise-website': '/long-distance-surprise-website.html',
  '/diwali-wishing-website-maker': '/diwali-wishing-website-maker.html',
  '/christmas-wishing-website-maker': '/christmas-wishing-website-maker.html',
  '/new-year-wishing-website-maker': '/new-year-wishing-website-maker.html',
  '/festival-greetings-website': '/festival-greetings-website.html',
  '/valentines-day-website': '/valentines-day-website.html',
  '/sorry-message-website': '/sorry-message-website.html',
  '/thank-you-message-website': '/thank-you-message-website.html',
  '/blog': '/blog/index.html',
  '/blog/': '/blog/index.html'
};

const EDGE_PRICING = {
  IN: {
    currency: 'INR', symbol: '₹', gateway: 'cashfree', paypalCurrency: 'INR', countryName: 'India', country: 'IN',
    plans: { custom_url: { amount: 29 }, starter: { amount: 59 }, pro: { amount: 99 }, pro_plus: { amount: 149 }, forever: { amount: 299 } }
  },
  GB: {
    currency: 'GBP', symbol: '£', gateway: 'paypal', paypalCurrency: 'GBP', countryName: 'United Kingdom', country: 'GB',
    plans: { custom_url: { amount: 1.29 }, starter: { amount: 2.49 }, pro: { amount: 5.99 }, pro_plus: { amount: 8.49 }, forever: { amount: 16.99 } }
  },
  CA: {
    currency: 'CAD', symbol: 'CA$', gateway: 'paypal', paypalCurrency: 'CAD', countryName: 'Canada', country: 'CA',
    plans: { custom_url: { amount: 1.99 }, starter: { amount: 3.99 }, pro: { amount: 8.99 }, pro_plus: { amount: 13.99 }, forever: { amount: 24.99 } }
  },
  AU: {
    currency: 'AUD', symbol: 'A$', gateway: 'paypal', paypalCurrency: 'AUD', countryName: 'Australia', country: 'AU',
    plans: { custom_url: { amount: 1.99 }, starter: { amount: 3.99 }, pro: { amount: 8.99 }, pro_plus: { amount: 13.99 }, forever: { amount: 24.99 } }
  },
  AE: {
    currency: 'AED', symbol: 'AED ', gateway: 'paypal', paypalCurrency: 'USD', countryName: 'UAE', country: 'AE',
    plans: { custom_url: { amount: 4.99 }, starter: { amount: 9.99 }, pro: { amount: 19.99 }, pro_plus: { amount: 39.99 }, forever: { amount: 79.99 } }
  },
  PK: {
    currency: 'USD', symbol: '$', gateway: 'paypal', paypalCurrency: 'USD', countryName: 'Pakistan', country: 'PK',
    plans: { custom_url: { amount: 1.49 }, starter: { amount: 2.99 }, pro: { amount: 6.99 }, pro_plus: { amount: 9.99 }, forever: { amount: 19.99 } }
  },
  EU: {
    currency: 'EUR', symbol: '€', gateway: 'paypal', paypalCurrency: 'EUR', countryName: 'Eurozone', country: 'EU',
    plans: { custom_url: { amount: 1.49 }, starter: { amount: 2.99 }, pro: { amount: 6.99 }, pro_plus: { amount: 9.99 }, forever: { amount: 19.99 } }
  },
  US: {
    currency: 'USD', symbol: '$', gateway: 'paypal', paypalCurrency: 'USD', countryName: 'United States', country: 'US',
    plans: { custom_url: { amount: 1.49 }, starter: { amount: 2.99 }, pro: { amount: 6.99 }, pro_plus: { amount: 9.99 }, forever: { amount: 19.99 } }
  }
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Instant Cloudflare Edge Geo-Pricing (<5ms direct from edge)
    if (path === '/api/geo-pricing' || path === '/api/payment/detect-price') {
      const country = (request.cf?.country || request.headers.get('cf-ipcountry') || 'IN').toUpperCase();
      let pricing = EDGE_PRICING[country];
      if (!pricing) {
        if (EUROZONE.includes(country)) pricing = { ...EDGE_PRICING.EU, country };
        else if (country === 'IN') pricing = EDGE_PRICING.IN;
        else pricing = { ...EDGE_PRICING.US, country };
      }
      return new Response(JSON.stringify({ success: true, ...pricing, country }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // 🚀 Multi-Backend Pool (Distributes load & auto-fails over if one is sleeping/down)
    const configuredBackends = env.BACKEND_URLS 
      ? env.BACKEND_URLS.split(',').map(u => u.trim()).filter(Boolean)
      : (env.BACKEND_URL ? [env.BACKEND_URL] : [
          'https://wishing-portal-4aui.onrender.com',
          'https://wishing-portal-backup.onrender.com'
        ]);

    const isApiRequest = path.startsWith('/api/');
    const pathSegments = path.split('/').filter(Boolean);
    const isStaticPath = Boolean(
      CLEAN_STATIC_ROUTES[path] || 
      CLEAN_STATIC_ROUTES[`/${pathSegments[0]}`] ||
      STATIC_PREFIXES.some(s => (pathSegments[0] || '').toLowerCase().startsWith(s)) ||
      pathSegments[0] === 'favicon.ico' ||
      pathSegments[0] === 'robots.txt' ||
      pathSegments[0] === 'sitemap.xml' ||
      pathSegments[0] === 'llms.txt' ||
      pathSegments[0] === 'llms-full.txt'
    );
    const isSlugRequest = pathSegments.length === 1 && 
                          !pathSegments[0].includes('.') &&
                          !isStaticPath;

    // ⚡ 1. Cloudflare Edge Caching for Read/Slug/Template Requests (<10ms global delivery)
    const hasNoCache = request.headers.get('cache-control')?.includes('no-cache') || 
                       request.headers.get('pragma') === 'no-cache' || 
                       url.searchParams.has('_t');
    const isEdgeCacheable = !hasNoCache && request.method === 'GET' && (
      isSlugRequest || 
      path.startsWith('/api/templates') ||
      path.startsWith('/api/custom-url/check/')
    );

    const edgeCache = caches.default;
    if (isEdgeCacheable) {
      const cachedResponse = await edgeCache.match(request);
      if (cachedResponse) {
        const responseWithHeader = new Response(cachedResponse.body, cachedResponse);
        responseWithHeader.headers.set('X-Edge-Cache', 'HIT');
        return responseWithHeader;
      }
    }

    if (isSlugRequest || isApiRequest) {
      try {
        const reqHeaders = new Headers(request.headers);
        const cfCountry = (request.cf?.country || request.headers.get('cf-ipcountry') || '').toUpperCase();
        const clientIp = request.headers.get('cf-connecting-ip') || '';
        if (cfCountry) {
          reqHeaders.set('cf-ipcountry', cfCountry);
          reqHeaders.set('x-user-country', cfCountry);
        }
        if (request.cf?.city) reqHeaders.set('cf-ipcity', encodeURIComponent(request.cf.city));
        if (clientIp) {
          reqHeaders.set('x-forwarded-for', clientIp);
          reqHeaders.set('x-real-ip', clientIp);
        }

        // Pre-buffer request body if not GET/HEAD so we can retry on backup backend if needed
        let reqBody = null;
        if (request.method !== 'GET' && request.method !== 'HEAD') {
          reqBody = await request.arrayBuffer();
        }

        // Shuffle / start at random backend for load balancing
        const startIdx = Math.floor(Math.random() * configuredBackends.length);
        const orderedBackends = [
          ...configuredBackends.slice(startIdx),
          ...configuredBackends.slice(0, startIdx)
        ];

        let response = null;
        let lastError = null;
        let winningBackend = configuredBackends[0];

        for (const currentOrigin of orderedBackends) {
          try {
            const backendUrl = `${currentOrigin}${path}${url.search}`;
            console.log(`[Worker] Attempting proxy to: ${backendUrl}`);

            const controller = new AbortController();
            // 8.5s timeout per backend attempt to quickly failover if sleeping/cold-starting
            const timeoutId = setTimeout(() => controller.abort(), 8500);

            const res = await fetch(backendUrl, {
              method: request.method,
              headers: reqHeaders,
              body: reqBody ? reqBody.slice(0) : undefined,
              redirect: 'manual',
              signal: controller.signal
            });
            clearTimeout(timeoutId);

            // If backend returned 502/503/504 or 429 (cold start crash/sleeping/Render hibernate rate-limit), try next backend in pool
            const isBackendUnavailable = (res.status >= 502 && res.status <= 504) || res.status === 429;
            if (isBackendUnavailable && orderedBackends.length > 1) {
              console.warn(`[Worker] Backend ${currentOrigin} returned ${res.status}. Auto-failing over to next backend...`);
              continue;
            }

            response = res;
            winningBackend = currentOrigin;
            break;
          } catch (fetchErr) {
            console.warn(`[Worker] Failed contacting ${currentOrigin} (${fetchErr.name}):`, fetchErr.message);
            lastError = fetchErr;
          }
        }

        if (!response) {
          throw lastError || new Error('All backend servers unreachable');
        }

        // 1. Handle dynamic slug redirects with Edge Caching
        if (response.status >= 300 && response.status < 400) {
          const locationHeader = response.headers.get('location');
          if (locationHeader) {
            let targetLocation = locationHeader;
            try {
              const locUrl = new URL(locationHeader, winningBackend);
              if (locUrl.hostname === new URL(winningBackend).hostname) {
                targetLocation = locUrl.pathname + locUrl.search + locUrl.hash;
              }
            } catch (e) {}

            console.log(`[Worker] Forwarding redirect to: ${targetLocation}`);
            const redirectResp = new Response(null, {
              status: response.status,
              statusText: response.statusText,
              headers: {
                'Location': targetLocation,
                'Cache-Control': isSlugRequest
                  ? 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400'
                  : 'no-cache, no-store, must-revalidate, max-age=0',
                'X-Backend-Origin': winningBackend,
                ...(isSlugRequest ? { 'X-Robots-Tag': 'noindex, nofollow' } : {})
              }
            });

            if (isEdgeCacheable && ctx && ctx.waitUntil) {
              ctx.waitUntil(edgeCache.put(request, redirectResp.clone()));
            }
            return redirectResp;
          }
        }

        // 2. Handle maintenance fallback on backend error or rate limit
        if (((response.status >= 502 && response.status <= 504) || response.status === 429)) {
          if (!isApiRequest && env.ASSETS) {
            const maintenanceReq = new Request(new URL('/maintenance.html', request.url));
            return env.ASSETS.fetch(maintenanceReq);
          }
        }

        // 3. Forward response respecting backend Cache-Control headers
        const responseHeaders = new Headers(response.headers);
        const originCacheControl = response.headers.get('Cache-Control');

        if (!originCacheControl) {
          if (path.startsWith('/api/payment') || path.startsWith('/api/admin') || path.startsWith('/api/upload') || request.method !== 'GET') {
            responseHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');
          } else {
            responseHeaders.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
          }
        }

        responseHeaders.set('X-Backend-Origin', winningBackend);

        const finalResponse = new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders
        });

        // Invalidate edge cache if website was updated
        if (request.method === 'POST' && path === '/api/config' && response.status === 200 && reqBody && ctx && ctx.waitUntil) {
          try {
            const bodyStr = new TextDecoder().decode(reqBody);
            const parsed = JSON.parse(bodyStr);
            const targetId = parsed.websiteId || parsed.id;
            if (targetId) {
              const cacheUrl = new URL(`/api/config/${encodeURIComponent(targetId)}`, request.url);
              ctx.waitUntil(edgeCache.delete(new Request(cacheUrl)));
            }
          } catch (e) {}
        }

        // Store successful GET responses in Cloudflare Edge Cache
        if (isEdgeCacheable && response.status === 200 && ctx && ctx.waitUntil) {
          finalResponse.headers.set('X-Edge-Cache', 'MISS');
          ctx.waitUntil(edgeCache.put(request, finalResponse.clone()));
        }

        return finalResponse;
      } catch (error) {
        console.error('[Worker] Proxy error across all origins:', error);

        if (!isApiRequest && env.ASSETS) {
          try {
            const maintenanceReq = new Request(new URL('/maintenance.html', request.url));
            return await env.ASSETS.fetch(maintenanceReq);
          } catch (mErr) {
            console.error('[Worker] Failed to fetch maintenance asset:', mErr);
          }
        }

        return new Response(JSON.stringify({ 
          error: 'Backend unavailable', 
          message: 'The server is currently waking up or under maintenance. Please retry in a few seconds.' 
        }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // 301 Permanent Redirect: Consolidate /birthday to authoritative pillar /birthday-wishes-website
    if (path === '/birthday' || path === '/birthday/') {
      return Response.redirect(`${url.origin}/birthday-wishes-website${url.search}`, 301);
    }
    if (path === '/birthday-wishes-website/') {
      return Response.redirect(`${url.origin}/birthday-wishes-website${url.search}`, 301);
    }

    // Canonical case redirects for SEO & asset consistency
    const canonicalRedirects = {
      '/pricing': '/Pricing',
      '/about-us': '/AboutUs',
      '/aboutus': '/AboutUs',
      '/why-greeter': '/WhyGreeter',
      '/whygreeter': '/WhyGreeter',
      '/contact-us': '/ContactUs',
      '/contactus': '/ContactUs'
    };

    if (canonicalRedirects[path]) {
      return Response.redirect(`${url.origin}${canonicalRedirects[path]}${url.search}`, 301);
    }

    // 301 Canonical normalization for .html extensions and trailing slashes (excluding /generated/, /templates/, /assets/, /admin)
    if (path === '/index.html') {
      return Response.redirect(`${url.origin}/${url.search}`, 301);
    }
    if (path === '/blog/' || path === '/blog/index.html') {
      return Response.redirect(`${url.origin}/blog${url.search}`, 301);
    }
    if (path.endsWith('.html') && !path.startsWith('/generated/') && !path.startsWith('/templates/') && path !== '/admin.html') {
      const stem = path.slice(0, -5);
      const stemLower = stem.toLowerCase();
      if (stemLower === '/terms' || stemLower === '/terms&cond') {
        return Response.redirect(`${url.origin}/terms&cond${url.search}`, 301);
      }
      const routeMatch = Object.keys(CLEAN_STATIC_ROUTES).find(k => k.toLowerCase() === stemLower) || canonicalRedirects[stemLower];
      if (routeMatch) {
        return Response.redirect(`${url.origin}${routeMatch}${url.search}`, 301);
      }
      if (stem.startsWith('/blog/') && !stem.includes('.')) {
        return Response.redirect(`${url.origin}${stem}${url.search}`, 301);
      }
    }
    if (path.length > 1 && path.endsWith('/') && !path.startsWith('/generated/') && !path.startsWith('/templates/') && !path.startsWith('/assets/')) {
      const trimmed = path.slice(0, -1);
      const trimmedLower = trimmed.toLowerCase();
      const routeMatch = Object.keys(CLEAN_STATIC_ROUTES).find(k => k.toLowerCase() === trimmedLower) || canonicalRedirects[trimmedLower];
      if (routeMatch) {
        return Response.redirect(`${url.origin}${routeMatch}${url.search}`, 301);
      }
      if (trimmed.startsWith('/blog/') && !trimmed.includes('.')) {
        return Response.redirect(`${url.origin}${trimmed}${url.search}`, 301);
      }
    }

    // Clean static routes resolution (serves HTML directly without redirect loops)
    if (CLEAN_STATIC_ROUTES[path] && env.ASSETS) {
      const assetUrl = new URL(CLEAN_STATIC_ROUTES[path], request.url);
      return env.ASSETS.fetch(new Request(assetUrl, request));
    }

    // Dynamic resolution for blog articles without .html extension
    if (path.startsWith('/blog/') && !path.includes('.') && !path.endsWith('/') && env.ASSETS) {
      const blogAssetUrl = new URL(`${path}.html`, request.url);
      const blogRes = await env.ASSETS.fetch(new Request(blogAssetUrl, request));
      if (blogRes.status === 200) {
        return blogRes;
      }
    }

    // Serve static assets from public folder via Cloudflare Workers Assets binding (0 CPU, 100% free unlimited global CDN)
    if (env.ASSETS) {
      const assetRes = await env.ASSETS.fetch(request);
      if (assetRes.status === 200 && (path === '/llms.txt' || path === '/llms-full.txt' || path === '/robots.txt')) {
        const headers = new Headers(assetRes.headers);
        headers.set('Content-Type', 'text/plain; charset=utf-8');
        headers.set('Cache-Control', 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400');
        headers.set('Access-Control-Allow-Origin', '*');
        return new Response(assetRes.body, {
          status: assetRes.status,
          statusText: assetRes.statusText,
          headers
        });
      }
      if (assetRes.status === 200 && path === '/sitemap.xml') {
        const headers = new Headers(assetRes.headers);
        headers.set('Content-Type', 'application/xml; charset=utf-8');
        headers.set('Cache-Control', 'public, max-age=3600, s-maxage=3600');
        return new Response(assetRes.body, {
          status: assetRes.status,
          statusText: assetRes.statusText,
          headers
        });
      }
      // For media, fonts, images, scripts, add edge & browser caching headers
      if (assetRes.status === 200 && path.match(/\.(webm|mp4|mov|webp|png|jpg|jpeg|gif|svg|woff2|woff|ttf|mp3|css|js|ico|avif)$/i)) {
        const headers = new Headers(assetRes.headers);
        headers.set('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable');
        headers.set('CDN-Cache-Control', 'max-age=31536000');
        headers.set('X-Served-By', 'Cloudflare-Edge-Assets');
        return new Response(assetRes.body, {
          status: assetRes.status,
          statusText: assetRes.statusText,
          headers
        });
      }
      return assetRes;
    }

    // Branded 404 Error Page for unmatched routes
    if (env.ASSETS) {
      try {
        const notFoundReq = new Request(new URL('/404.html', request.url));
        const notFoundRes = await env.ASSETS.fetch(notFoundReq);
        if (notFoundRes.status === 200) {
          return new Response(notFoundRes.body, {
            status: 404,
            statusText: 'Not Found',
            headers: notFoundRes.headers
          });
        }
      } catch (e) {}
    }

    return new Response('Not found', { status: 404 });
  }
};
