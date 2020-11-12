/* attaching the event listener */
addEventListener('fetch', (event) => {
  event.respondWith(fetchAndApply(event.request));
});

async function fetchAndApply(request) {
  /* Get the GEO IP Location Country from Cloudflare headers and output it as JSON */
  //console.log(request.headers.get('CF-IPCountry'));
  const countryCode = request.headers.get('CF-IPCountry');
  const data = {
    ip: request.headers.get('CF-Connecting-IP'),
    country: request.headers.get('CF-IPCountry'),
  };

  /* *** ORIGINLESS RESPONSE *** */
  if (request.method === 'GET' || request.method === 'POST') {
    return new Response(JSON.stringify(data), {
      status: 200,
      statusText: 'Found',
      headers: {
        /* Adding cache-control and info */
        'Content-Type': 'application/json',
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: 0,
        'X-Generator': 'worker',
        Vary: 'Origin',
      },
    });
  }
}
