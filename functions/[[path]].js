// Cloudflare Pages Function to proxy requests to Render backend
// This handles custom URL slugs (like /sana) and API routes

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  // Backend URL - configured via env variable or default to Vercel backend
  const BACKEND_URL = env.BACKEND_URL || 'https://wishing-portal-phi.vercel.app';

  // Check if this is an API request
  const isApiRequest = path.startsWith('/api/');

  // Check if this is a slug request (single path segment, not a file or static route)
  const pathSegments = path.split('/').filter(Boolean);
  const isSlugRequest = pathSegments.length === 1 && 
                        !pathSegments[0].includes('.') &&
                        !['api', 'generated', 'blog', 'assets', 'templates', 'maintenance', 'admin', 'create', 'privacy'].some(s => pathSegments[0].toLowerCase().startsWith(s)) &&
                        pathSegments[0] !== 'favicon.ico' &&
                        pathSegments[0] !== 'robots.txt' &&
                        pathSegments[0] !== 'sitemap.xml';

  // Only proxy slug requests and API requests to backend
  if (isSlugRequest || isApiRequest) {
    const backendUrl = `${BACKEND_URL}${path}${url.search}`;
    console.log(`[PagesFunction] Proxying request: ${path} to ${backendUrl}`);

    try {
      // Use redirect: 'manual' so HTTP 301/302 redirects from Render are passed back to browser
      const response = await fetch(backendUrl, {
        method: request.method,
        headers: request.headers,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
        redirect: 'manual'
      });
      
      // If backend returns a redirect (301, 302, 303, 307, 308)
      if (response.status >= 300 && response.status < 400) {
        const locationHeader = response.headers.get('location');
        if (locationHeader) {
          let targetLocation = locationHeader;
          try {
            const locUrl = new URL(locationHeader, BACKEND_URL);
            // If redirect points to backend host, convert to relative path for current domain
            if (locUrl.hostname === new URL(BACKEND_URL).hostname) {
              targetLocation = locUrl.pathname + locUrl.search + locUrl.hash;
            }
          } catch (e) {}

          console.log(`[PagesFunction] Forwarding redirect 302 to: ${targetLocation}`);
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

      // If backend server returns server error (502, 503, 504)
      if (response.status >= 502 && response.status <= 504) {
        if (!isApiRequest && env.ASSETS) {
          const maintenanceReq = new Request(new URL('/maintenance.html', request.url));
          return env.ASSETS.fetch(maintenanceReq);
        }
      }

      // Copy response headers for standard responses
      const responseHeaders = new Headers(response.headers);
      responseHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders
      });
    } catch (error) {
      console.error('[PagesFunction] Proxy error:', error);

      if (!isApiRequest && env.ASSETS) {
        try {
          const maintenanceReq = new Request(new URL('/maintenance.html', request.url));
          return await env.ASSETS.fetch(maintenanceReq);
        } catch (mErr) {
          console.error('[PagesFunction] Failed to fetch maintenance page asset:', mErr);
        }
      }

      return new Response(JSON.stringify({ 
        error: 'Backend unavailable', 
        message: 'The server is currently under maintenance. Please try again soon.',
        backendUrl: BACKEND_URL,
        requestedPath: path
      }), {
        status: 503,
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
    }
  }

  // For all other requests, let Cloudflare Pages handle static files
  return context.next();
}
