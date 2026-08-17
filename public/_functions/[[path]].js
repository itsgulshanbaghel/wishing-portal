// Cloudflare Pages Function to proxy requests to Render backend
// This handles custom URL slugs and API routes

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  // Backend URL - update this to your actual Render backend URL
  const BACKEND_URL = 'https://wishing-portal-05as.onrender.com';

  // Check if this is an API request
  const isApiRequest = path.startsWith('/api/');

  // Check if this is a slug request (single path segment, not a file)
  const pathSegments = path.split('/').filter(Boolean);
  const isSlugRequest = pathSegments.length === 1 && 
                        !pathSegments[0].includes('.') &&
                        !pathSegments[0].startsWith('api') &&
                        !pathSegments[0].startsWith('generated') &&
                        !pathSegments[0].startsWith('blog') &&
                        !pathSegments[0].startsWith('assets') &&
                        pathSegments[0] !== 'favicon.ico' &&
                        pathSegments[0] !== 'robots.txt' &&
                        pathSegments[0] !== 'sitemap.xml';

  // Only proxy slug requests and API requests to backend
  if (isSlugRequest || isApiRequest) {
    console.log(`[PagesFunction] Proxying request: ${path} to ${BACKEND_URL}${path}`);
    
    // Construct the backend URL
    const backendUrl = `${BACKEND_URL}${path}${url.search}`;

    try {
      // Proxy the request to backend
      const response = await fetch(backendUrl, {
        method: request.method,
        headers: request.headers,
        body: request.body,
        redirect: 'follow'
      });
      
      // Copy response headers
      const newResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });

      return newResponse;
    } catch (error) {
      console.error('[PagesFunction] Proxy error:', error);
      // Return error response with details
      return new Response(JSON.stringify({ 
        error: 'Backend unavailable', 
        message: error.message,
        backendUrl: BACKEND_URL,
        requestedPath: path
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // For all other requests, let Cloudflare Pages handle static files
  console.log(`[PagesFunction] Passing through to static: ${path}`);
  return context.next();
}
