# A selection of custom Cloudflare Workers

> **A WORD OF WARNING**: These scripts are provided as is. Don't use the worker scripts if you don't understand how they work. Deploying them in production without customization will certainly make you a very unpopular person.

> **Ask youself this question**: Should I really be handling this in a Cloudflare worker? How will it fit into the tech stack? Who has the responsibility? How do we/I manage versioning?

`geoip-api.js`: Serverless - Simple "API" returning IP and Country (provided by Cloudflare) as JSON. Add your own security, rate limiting or other features as necessary.

`normalize-and-redirect.js`: Quite tailor-made solution to handle URL normalization (canonicalization) + handling redirect mappings using Redirection.io API. Use it for inspiration.

`robots-disallow.js`: Serveless - Serve robots.txt with Disallow directive.

`robots-noindex.js`: Serveless - Serve robots.txt with Noindex directive.

`robots-sitemap.js`: Serveless - Serve robots.txt with Sitemap reference.

`serve-media-from-imageengine.js`: Fetch and serve media from ImageEngine.io.
