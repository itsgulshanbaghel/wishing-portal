// Cloudflare Pages Function to proxy requests to Render backend
// This handles custom URL slugs and API routes

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  // Backend URL - update this to your actual Render backend URL
  const BACKEND_URL = 'https://wishing-portal-05as.onrender.com';

  // Check if this is a slug request (single path segment, not a file)
  const pathSegments = path.split('/').filter(Boolean);
  const isSlugRequest = pathSegments.length === 1 && 
                        !pathSegments[0].includes('.') &&
                        !pathSegments[0].startsWith('api') &&
                        !pathSegments[0].startsWith('generated') &&
                        pathSegments[0] !== 'favicon.ico';

  // Check if this is an API request
  const isApiRequest = path.startsWith('/api/');

  // Only proxy slug requests and API requests to backend
  if (isSlugRequest || isApiRequest) {
    // Construct the backend URL
    const backendUrl = `${BACKEND_URL}${path}${url.search}`;

    // Proxy the request to backend
    const backendRequest = new Request(backendUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body,
      redirect: 'follow'
    });

    // Copy important headers from original request
    backendRequest.headers.set('X-Forwarded-Host', url.hostname);
    backendRequest.headers.set('X-Forwarded-Proto', url.protocol);
    backendRequest.headers.set('X-Real-IP', request.headers.get('CF-Connecting-IP') || 'unknown');

    try {
      const response = await fetch(backendRequest);
      
      // Copy response headers
      const newResponse = new Response(response.body, response);
      
      // Copy all headers from backend response
      response.headers.forEach((value, key) => {
        // Skip some headers that Cloudflare manages
        if (key !== 'transfer-encoding' && key !== 'connection') {
          newResponse.headers.set(key, value);
        }
      });

      return newResponse;
    } catch (error) {
      console.error('Proxy error:', error);
      // Return error response
      return new Response(JSON.stringify({ error: 'Backend unavailable' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // For all other requests, let Cloudflare Pages handle static files
  return context.next();
}
