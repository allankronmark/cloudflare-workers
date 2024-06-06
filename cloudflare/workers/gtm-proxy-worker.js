/**
 * gtm_proxy - Proxies the Google Tag Manager container files
 *
 * The proxy:
 * - guards: methods, missing parameters, permitted GTM IDs
 * - sanitizes: non GTM related parameters
 * - overrides: caching for cacheable requests (excluding gtm_debug, ns.html)
 *
 * GET - /gtm.js -> should fail
 * GET - /gtm.js?gtm_auth=Mh2Ezuc9FYazyLszQpIrrg&gtm_preview=env-1&gtm_cookies_win=x -> should fail
 * GET - /gtm.js?id=GTM-XXXXXX -> should work
 * GET - /gtm.js?id=GTM-XXXXXX1 -> should fail
 * GET - /gtm.js?id=GTM-XXXXXX&gtm_auth=Mh2Ezuc9FYazyLszQpIrrg&gtm_preview=env-1&gtm_cookies_win=x -> should work
 * HEAD - /gtm.js?id=GTM-XXXXXX&gtm_auth=Mh2Ezuc9FYazyLszQpIrrg&gtm_preview=env-1&gtm_cookies_win=x -> should work
 * POST - /gtm.js?id=GTM-XXXXXX&gtm_auth=Mh2Ezuc9FYazyLszQpIrrg&gtm_preview=env-1&gtm_cookies_win=x -> should fail
 * GET - /gtm.js?id=GTM-XXXXXX&gtm_auth=Mh2Ezuc9FYazyLszQpIrrg&gtm_preview=env-1&gtm_cookies_win=x&gtm_debug=true -> should work + disable cache
 * GET - /tag.js?id=GTM-XXXXXX&gtm_auth=Mh2Ezuc9FYazyLszQpIrrg&gtm_preview=env-1&gtm_cookies_win=x -> should work
 * GET - /?id=GTM-XXXXXX&gtm_auth=Mh2Ezuc9FYazyLszQpIrrg&gtm_preview=env-1&gtm_cookies_win=x -> should work
 * GET - /ns.html?id=GTM-XXXXXX&gtm_auth=Mh2Ezuc9FYazyLszQpIrrg&gtm_preview=env-1&gtm_cookies_win=x -> should work
 * GET - /tag.html?id=GTM-XXXXXX&gtm_auth=Mh2Ezuc9FYazyLszQpIrrg&gtm_preview=env-1&gtm_cookies_win=x -> should work
 */
const ALLOWED_METHODS = ['GET', 'HEAD'];
const GTM_ID_WHITELIST = ['GTM-XXXXXX'];
const CACHE_EXPIRY = 60 * 5; // Cache timeout in seconds

export default {
  async fetch(request) {
    // Use the following when the request method is not allowed
    async function MethodNotAllowed(request) {
      return new Response(`Method ${request.method} not allowed.`, {
        status: 405,
        headers: {
          Allow: ALLOWED_METHODS.join(', '),
        },
      });
    }

    // GUARD STATEMENT
    // Only allowed request methods work with this proxy
    if (!ALLOWED_METHODS.includes(request.method))
      return MethodNotAllowed(request);

    const url = new URL(request.url);

    // GUARD STATEMENT
    // If there are no search parameters, return error
    if (!url.search)
      return new Response('Missing URL query parameters', { status: 403 });

    const urlParams = new URLSearchParams(url.search);

    // GUARD STATEMENT
    // Only whitelisted GTM IDs allowed
    const is_id_in_whitelist = GTM_ID_WHITELIST.includes(urlParams.get('id'));
    if (!is_id_in_whitelist) {
      return new Response('Missing whitelisted ID as URL query parameter: id', {
        status: 403,
      });
    }

    // Boolean true if the request contains an .html extension
    const is_html_extension = /^\/[\w-]+\.html$/im.test(url.pathname);

    // Overwrite cache-control
    const enableCache =
      is_html_extension || urlParams.get('gtm_debug') ? false : true; //we don't cache ns.html or gtm_debug requests

    // Sanitize parameters
    //First, find all non GTM related keys
    const keysForDeletion = [];
    urlParams.forEach((value, key) => {
      //if the key doesn't include gtm_ or id, delete it
      if (!/^gtm_|^id$/im.test(key)) {
        keysForDeletion.push(key);
      }
    });

    // Then, delete all non GTM related keys before sending it to www.googletagmanager.com
    keysForDeletion.forEach((key) => {
      urlParams.delete(key);
    });

    // Clone the request.headers so we can delete headers that are irrelevant to www.googletagmanager.com
    // the alternative to this is to create a new header and only setting the headers we want to forward
    const headers = new Headers(request.headers);
    if (headers.get('cookie')) headers.delete('cookie');
    if (headers.get('referer')) headers.delete('referer');

    const gtmUrl = new URL('https://www.googletagmanager.com');
    gtmUrl.pathname = is_html_extension ? `/ns.html` : `/gtm.js`;

    // Cache bust the request URL
    if (!enableCache)
      urlParams.set('rand', Math.random().toString(36).slice(2));

    //assi
    gtmUrl.search = urlParams.toString();

    // For debug, pipe it to debugging endpoint, e.g. webhook.site
    //gtmUrl.href = 'https://webhook.site/...';
    let response = await fetch(gtmUrl.href, {
      cf: {
        // for a max of X seconds before revalidating the resource
        cacheTtl: enableCache ? CACHE_EXPIRY : 0,
        // Always cache this fetch regardless of content type
        cacheEverything: false,
        //Enterprise only feature, see Cache API for other plans
        //cacheKey: gtmUrl.href,
      },
      headers,
    });

    // Must use Response constructor to inherit all of response's fields
    response = new Response(response.body, response);

    // Overwriting and removing response headers from www.googletagmanager.com
    // Set the correct javascript content type
    if (/application\/javascript/i.test(response.headers.get('content-type'))) {
      //the correct js content type as per RFC 9239
      response.headers.set('content-type', 'text/javascript; charset=utf-8');
    }
    // remove CORS
    response.headers.delete('alt-svc');
    response.headers.delete('access-control-allow-credentials');
    response.headers.delete('access-control-allow-headers');
    response.headers.delete('access-control-allow-origin');
    response.headers.delete('cross-origin-resource-policy');
    if (is_html_extension)
      response.headers.set('cross-origin-resource-policy', 'same-site');

    // it's not for us to set
    response.headers.delete('strict-transport-security');

    // remove non-standard
    response.headers.delete('x-xss-protection');

    // overwrite cache-control
    if (enableCache) {
      response.headers.set(
        'cache-control',
        `max-age=${CACHE_EXPIRY}, must-revalidate`
      ); //default
      response.headers.set('vary', 'Accept-Encoding');
      response.headers.delete('expires');
      response.headers.delete('pragma');
    }

    return response;
  },
};
