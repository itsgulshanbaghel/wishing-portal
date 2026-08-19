// Cloudflare Worker script handling assets and custom slug redirects to Render backend

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    const BACKEND_URL = env.BACKEND_URL || 'https://wishing-portal-phi.vercel.app';

    const isApiRequest = path.startsWith('/api/');
    const pathSegments = path.split('/').filter(Boolean);
    const isSlugRequest = pathSegments.length === 1 && 
                          !pathSegments[0].includes('.') &&
                          !['api', 'generated', 'blog', 'assets', 'templates', 'maintenance', 'admin', 'create', 'privacy'].some(s => pathSegments[0].toLowerCase().startsWith(s)) &&
                          pathSegments[0] !== 'favicon.ico' &&
                          pathSegments[0] !== 'robots.txt' &&
                          pathSegments[0] !== 'sitemap.xml';

    if (isSlugRequest || isApiRequest) {
      const backendUrl = `${BACKEND_URL}${path}${url.search}`;
      console.log(`[Worker] Proxying request: ${path} to ${backendUrl}`);

      try {
        const response = await fetch(backendUrl, {
          method: request.method,
          headers: request.headers,
          body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
          redirect: 'manual'
        });

        if (response.status >= 300 && response.status < 400) {
          const locationHeader = response.headers.get('location');
          if (locationHeader) {
            let targetLocation = locationHeader;
            try {
              const locUrl = new URL(locationHeader, BACKEND_URL);
              if (locUrl.hostname === new URL(BACKEND_URL).hostname) {
                targetLocation = locUrl.pathname + locUrl.search + locUrl.hash;
              }
            } catch (e) {}

            console.log(`[Worker] Forwarding redirect to: ${targetLocation}`);
            return new Response(null, {
              status: response.status,
              statusText: response.statusText,
              headers: {
                'Location': targetLocation,
                'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0'
              }
            });
          }
        }

        if (response.status >= 502 && response.status <= 504) {
          if (!isApiRequest && env.ASSETS) {
            const maintenanceReq = new Request(new URL('/maintenance.html', request.url));
            return env.ASSETS.fetch(maintenanceReq);
          }
        }

        const responseHeaders = new Headers(response.headers);
        responseHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders
        });
      } catch (error) {
        console.error('[Worker] Proxy error:', error);

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
          message: 'The server is currently under maintenance. Please try again soon.' 
        }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Serve static assets from public folder via Workers Assets binding
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('Not found', { status: 404 });
  }
};
