const EDGE_PRICING = {
  IN: {
    currency: 'INR', symbol: '₹', gateway: 'cashfree', paypalCurrency: 'INR', countryName: 'India', country: 'IN',
    plans: { custom_url: { amount: 29 }, starter: { amount: 49 }, pro: { amount: 79 }, pro_plus: { amount: 149 }, forever: { amount: 299 } }
  },
  GB: {
    currency: 'GBP', symbol: '£', gateway: 'paypal', paypalCurrency: 'GBP', countryName: 'United Kingdom', country: 'GB',
    plans: { custom_url: { amount: 0.99 }, starter: { amount: 0.99 }, pro: { amount: 1.99 }, pro_plus: { amount: 3.49 }, forever: { amount: 6.99 } }
  },
  CA: {
    currency: 'CAD', symbol: 'CA$', gateway: 'paypal', paypalCurrency: 'CAD', countryName: 'Canada', country: 'CA',
    plans: { custom_url: { amount: 1.49 }, starter: { amount: 1.49 }, pro: { amount: 2.99 }, pro_plus: { amount: 4.99 }, forever: { amount: 9.99 } }
  },
  AU: {
    currency: 'AUD', symbol: 'A$', gateway: 'paypal', paypalCurrency: 'AUD', countryName: 'Australia', country: 'AU',
    plans: { custom_url: { amount: 1.49 }, starter: { amount: 1.49 }, pro: { amount: 2.99 }, pro_plus: { amount: 4.99 }, forever: { amount: 9.99 } }
  },
  AE: {
    currency: 'AED', symbol: 'AED ', gateway: 'paypal', paypalCurrency: 'USD', countryName: 'UAE', country: 'AE',
    plans: { custom_url: { amount: 3.99 }, starter: { amount: 3.99 }, pro: { amount: 6.99 }, pro_plus: { amount: 12.99 }, forever: { amount: 29.99 } }
  },
  PK: {
    currency: 'PKR', symbol: 'PKR ', gateway: 'paypal', paypalCurrency: 'USD', countryName: 'Pakistan', country: 'PK',
    plans: { custom_url: { amount: 99 }, starter: { amount: 99 }, pro: { amount: 149 }, pro_plus: { amount: 299 }, forever: { amount: 799 } }
  },
  US: {
    currency: 'USD', symbol: '$', gateway: 'paypal', paypalCurrency: 'USD', countryName: 'United States', country: 'US',
    plans: { custom_url: { amount: 0.99 }, starter: { amount: 0.99 }, pro: { amount: 1.99 }, pro_plus: { amount: 3.49 }, forever: { amount: 6.99 } }
  }
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Instant Cloudflare Edge Geo-Pricing (<5ms direct from edge)
    if (path === '/api/geo-pricing' || path === '/api/payment/detect-price') {
      const country = (request.cf?.country || request.headers.get('cf-ipcountry') || 'IN').toUpperCase();
      const pricing = EDGE_PRICING[country] || (country === 'IN' ? EDGE_PRICING.IN : EDGE_PRICING.US);
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
    const isSlugRequest = pathSegments.length === 1 && 
                          !pathSegments[0].includes('.') &&
                          !['api', 'generated', 'blog', 'assets', 'templates', 'maintenance', 'admin', 'create', 'privacy', 'pricing', 'about', 'contact', 'why', 'whygreeter', 'edit', 'terms'].some(s => pathSegments[0].toLowerCase().startsWith(s)) &&
                          pathSegments[0] !== 'favicon.ico' &&
                          pathSegments[0] !== 'robots.txt' &&
                          pathSegments[0] !== 'sitemap.xml';

    // ⚡ 1. Cloudflare Edge Caching for Read/Slug/Config Requests (<10ms global delivery)
    const isEdgeCacheable = request.method === 'GET' && (
      isSlugRequest || 
      path.startsWith('/api/config/') || 
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
        if (request.cf?.country) reqHeaders.set('cf-ipcountry', request.cf.country);
        if (request.cf?.city) reqHeaders.set('cf-ipcity', encodeURIComponent(request.cf.city));
        const clientIp = request.headers.get('cf-connecting-ip') || '';
        if (clientIp) reqHeaders.set('x-forwarded-for', clientIp);

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

            // If backend returned 502/503/504 (cold start crash/sleeping), try next backend in pool
            if (res.status >= 502 && res.status <= 504 && orderedBackends.length > 1) {
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
                'X-Backend-Origin': winningBackend
              }
            });

            if (isEdgeCacheable && ctx && ctx.waitUntil) {
              ctx.waitUntil(edgeCache.put(request, redirectResp.clone()));
            }
            return redirectResp;
          }
        }

        // 2. Handle maintenance fallback on backend error
        if (response.status >= 502 && response.status <= 504) {
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

    // Clean static routes resolution (serves HTML directly without redirect loops)
    const cleanRoutes = {
      '/edit': '/edit.html',
      '/Pricing': '/Pricing.html',
      '/AboutUs': '/AboutUs.html',
      '/WhyGreeter': '/WhyGreeter.html',
      '/ContactUs': '/ContactUs.html',
      '/privacy': '/privacy.html',
      '/terms': '/terms.html',
      '/terms&cond': '/terms&cond.html'
    };

    if (cleanRoutes[path] && env.ASSETS) {
      const assetUrl = new URL(cleanRoutes[path], request.url);
      return env.ASSETS.fetch(new Request(assetUrl, request));
    }

    // Serve static assets from public folder via Cloudflare Workers Assets binding (0 CPU, 100% free unlimited global CDN)
    if (env.ASSETS) {
      const assetRes = await env.ASSETS.fetch(request);
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

    return new Response('Not found', { status: 404 });
  }
};
