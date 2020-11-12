/* attaching the event listener */
addEventListener('fetch', (event) => {
  event.respondWith(fetchAndApply(event.request));
});

async function fetchAndApply(request) {
  // fetch the request
  //let response = await fetch(request)

  // Make the headers mutable by re-constructing the Response.
  //response = new Response(response.body, response)
  //response.headers.set('Set-Cookie', createCookieString(cookieName, countryCode, 1) )

  //return response

  /* *** ORIGINLESS RESPONSE *** */
  //  if (request.method === 'GET') {
  return new Response(
    'User-agent: *\nDisallow: \nSitemap: https://www.example.com/sitemap.xml',
    {
      status: 200,
      statusText: 'Found',
      headers: {
        /* Adding cache-control and info */
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: 0,
        'X-Generator': 'worker',
      },
    }
  );
  //  }
}

/**
 * Fetch and log a request
 * @param {Request} request
 */
async function handleRequest(request) {
  console.log('Got request', request);
  const response = await fetch(request);
  console.log('Got response', response);
  return response;
}
addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request));
});

/**
 * Fetch and log a request
 * @param {Request} request
 */
async function handleRequest(request) {
  console.log('Got request', request);
  const response = await fetch(request);
  console.log('Got response', response);
  return response;
}
