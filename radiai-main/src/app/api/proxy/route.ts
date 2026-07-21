export async function GET(request: Request) {
  try {
    const url = new URL(request.url).searchParams.get('url');
    if (!url) {
      return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Basic host whitelist to avoid open proxy abuse
    const allowedHosts = new Set([
      'www.soundhelix.com',
      'soundhelix.com',
      'nyc.cloud.appwrite.io',
    ]);

    let parsed;
    try {
      parsed = new URL(url);
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid url' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!allowedHosts.has(parsed.hostname)) {
      return new Response(JSON.stringify({ error: 'Host not allowed' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const upstream = await fetch(url);
    if (!upstream.ok) {
      return new Response(JSON.stringify({ error: 'Upstream fetch failed' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';

    // Stream the upstream response, adding CORS headers so browser can play it
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
