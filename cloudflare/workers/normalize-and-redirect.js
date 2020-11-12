/* attaching the event listener */
addEventListener('fetch', (event) => {
  try {
    // if you want to bypass a specific path and need to make sure that this worker doesn't execute.
    if (event.request.url.includes('example.com/PathToExclude')) {
      console.log('URL bypassed');
    } else {
      // redirect handler
      event.respondWith(redirectAndLog(event.request));
    }
  } catch (e) {
    console.log('something went wrong');
    event.respondWith(handleRequest(event.request));
  }
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

/* custom rewrite logic based on old URL issues */
function normalize(urlObj) {
  if (
    urlObj.pathname.match(
      /(\.|css|js|sitecore|api|soap|wffm|\_|\/media\/|\/form\/|\/clientevent\/|\/index|\/shop|\/login)/gi
    ) === null
  ) {
    // lowercases pathname
    urlObj.pathname = urlObj.pathname.toLowerCase();

    // replaces plus with minus in pathname
    urlObj.pathname = urlObj.pathname.replace(/\+/gi, '-');

    // replaces %20 with minus in pathname
    urlObj.pathname = urlObj.pathname.replace(/\%20/gi, '-');

    // replaces repeated forward slashes except as part of scheme, e.g. https://
    urlObj.pathname = urlObj.pathname.replace(/(?<!\:)\/+/gi, '/');

    // enforce no trailing slash
    urlObj.pathname = urlObj.pathname.replace(/\/$/gi, '');
  }

  return urlObj;
}

/* Cache Control variable */
//let permanentCacheControl = 'max-age=3600, must-revalidate' // 1 hour
let permanentCacheControl = 'max-age=300, must-revalidate'; // 5 minutes

/* ******************** Redirection.io logic ******************** */
/* declare constants */
const options = {
  token: 'you-better-add-your-own-redirection-io-token-here-or-it-wont-work',
  timeout: 2000,
};

/* adjusting redirection.io logic to cater for more hostnames */
/*
const hostnameOptions = { 
  'www.example.com': { token: 'you-better-add-your-own-redirection-io-token-here-or-it-wont-work', timeout: 2000 },
  'ww1.example.com': { token: 'if-you-have-a-second-api-token-please-add-it-here', timeout: 2000 },
  'ww2.example.com': { token: 'add-your-third-redirection-api-token-here', timeout: 2000 }
}

// function to return the correct options object
function getOptions( optionsObj, hostname ){
	return optionsObj[hostname]
}
*/

async function redirectAndLog(request) {
  const [response, ruleId] = await redirectOrPass(request);
  log(request, response, ruleId);

  return response;
}

async function redirectOrPass(request) {
  const urlObject = new URL(request.url);
  const normalizedURL = normalize(new URL(request.url));

  if (urlObject.href != normalizedURL.href) {
    return [
      new Response('', {
        status: 301,
        headers: {
          Location: normalizedURL.href,
          /* Adding cache-control and info */
          'Cache-Control': permanentCacheControl,
          'X-RedirectHandler': 'worker/rewrite',
        },
      }),
      null,
    ];
  }

  const context = {
    host: urlObject.host,
    request_uri: urlObject.pathname,
    user_agent: request.headers.get('user-agent'),
    referer: request.headers.get('referer'),
    scheme: urlObject.protocol.includes('https') ? 'https' : 'http',
    use_json: true,
  };

  let response;

  /* custom options placement */
  //let options = getOptions( hostnameOptions, urlObject.host )

  try {
    response = await Promise.race([
      fetch('https://proxy.redirection.io/' + options.token + '/get', {
        method: 'POST',
        body: JSON.stringify(context),
        headers: {
          'User-Agent': 'cloudflare-service-worker/0.0.1',
        },
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), options.timeout)
      ),
    ]);
  } catch (error) {
    return [await fetch(request), null];
  }

  const data = await response.text();

  try {
    response = JSON.parse(data);
  } catch (error) {
    // If some errors play regular request, anyway request will be in error when no redirection (404)
    return [await fetch(request), null];
  }

  // Send gone response
  if (response.status_code === 410) {
    return [new Response('', { status: 410 }), response.matched_rule.id];
  }

  /* CUSTOM conditional to set correct Cache-Control value */
  let cacheControl = 'private, no-cache';
  if (response.status_code === 301 || response.status_code === 308) {
    let cacheControl = permanentCacheControl;
  }

  // Send redirection response
  return [
    new Response('', {
      status: Number(response.status_code),
      headers: {
        Location: response.location,
        /* Adding cache-control and info */
        'Cache-Control': cacheControl,
        'X-RedirectHandler': 'worker/redirection',
      },
    }),
    response.matched_rule.id,
  ];
}

async function log(request, response, ruleId) {
  const urlObject = new URL(request.url);
  const context = {
    status_code: response.status,
    host: urlObject.host,
    method: request.method,
    request_uri: urlObject.pathname,
    user_agent: request.headers.get('user-agent'),
    referer: request.headers.get('referer'),
    scheme: urlObject.protocol.includes('https') ? 'https' : 'http',
    use_json: true,
  };

  if (response.headers.get('Location')) {
    context.target = response.headers.get('Location');
  }

  if (ruleId) {
    context.rule_id = ruleId;
  }

  /* custom options placement */
  //let options = getOptions( hostnameOptions, urlObject.host )

  try {
    return await fetch(
      'https://proxy.redirection.io/' + options.token + '/log',
      {
        method: 'POST',
        body: JSON.stringify(context),
        headers: {
          'User-Agent': 'cloudflare-service-worker/0.0.1',
        },
      }
    );
  } catch (error) {
    // Do nothing, do not matters if some logs are in errors
    console.log('could not log');
    console.log(error);
  }
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
