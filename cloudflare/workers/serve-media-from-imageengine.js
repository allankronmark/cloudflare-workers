/*  only enable for (gif|png|jpg|jpeg|webp|bmp|ico) 
    on sitecore 8.2 or similar sites which 
    isn't using media.example.com
*/
/* attaching the event listener */
addEventListener('fetch', (event) => {
  try {
    // if you want to bypass a specific path and need to make sure that this worker doesn't execute.
    if (event.request.url.includes('example.com/PathToExclude')) {
      console.log('URL bypassed');
    } else if (
      event.request.url.search(/\.(gif|png|jpg|jpeg|webp|bmp|ico)/) > -1
    ) {
      event.respondWith(fetchFromImageEngine(event.request));
    } else event.respondWith(handleRequest(event.request));
  } catch (e) {
    console.log('something went wrong');
    event.respondWith(handleRequest(event.request));
  }
});

async function fetchFromImageEngine(request) {
  /* ***** create new URL object from request.url in order to modify it ***** */
  let url = new URL(request.url);

  /* ***** override origin ***** */
  url.host = 'www.example.com';
  //url.hostname = 'www.example.com.imgeng.in'
  url.hostname = url.host + '.imgeng.in';
  url.protocol = 'http:';

  //console.log( 'fetch from ' + url.href )

  // handling timeouts
  try {
    let newRequestHeaders = new Headers(request.headers);
    response = await fetch(url, {
      cf: {
        cacheTtl: 0,
        polish: 'off',
        mirage: false,
      },
      headers: newRequestHeaders,
    });
  } catch (error) {
    //console.log( 'image request timeout' )
    return await fetch(request.url, {
      cf: {
        cacheTtl: 0,
        polish: 'off',
        mirage: false,
      },
    });
  }

  // handling 404
  if (response.status_code === 404) {
    console.log('image request 404');
    return [await fetch(request), null];
  }

  return response;
}

/**
 * FALLBACK: Fetch and log a request
 * @param {Request} request
 */
async function handleRequest(request) {
  console.log('Got request', request);
  const response = await fetch(request);
  console.log('Got response', response);
  return response;
}
