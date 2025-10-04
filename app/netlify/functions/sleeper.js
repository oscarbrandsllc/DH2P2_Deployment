const SLEEPER_API_ROOT = 'https://api.sleeper.app';
const API_VERSION = 'v1';
const GAME_WINDOW_DAYS = new Set([0, 1, 2, 4, 6]); // Sun, Mon, Tue, Thu, Sat (late season)

function getEasternComponents(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const partMap = parts.reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});

  const dayLookup = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    day: dayLookup[partMap.weekday] ?? date.getUTCDay(),
    hour: Number(partMap.hour ?? date.getUTCHours()),
    minute: Number(partMap.minute ?? date.getUTCMinutes()),
  };
}

function isLiveWindow(easternComponents) {
  if (!easternComponents) return false;
  const { day, hour } = easternComponents;

  if (!GAME_WINDOW_DAYS.has(day)) {
    return false;
  }

  if (day === 2) {
    return hour < 18; // Tuesday clean-up window
  }

  if (day === 6) {
    return hour >= 12; // Saturday slate (late season)
  }

  return true;
}

function resolveCachePolicy(pathname, now = new Date()) {
  const eastern = getEasternComponents(now);
  const liveWindow = isLiveWindow(eastern);
  const normalized = pathname.toLowerCase();

  if (normalized.includes('/state/') || normalized.includes('/matchups/')) {
    return {
      edgeTtl: liveWindow ? 30 : 120,
      staleWhileRevalidate: liveWindow ? 30 : 120,
    };
  }

  if (normalized.includes('/stats/')) {
    return {
      edgeTtl: liveWindow ? 90 : 300,
      staleWhileRevalidate: liveWindow ? 60 : 300,
    };
  }

  if (normalized.includes('/players/')) {
    return {
      edgeTtl: 60 * 60 * 12,
      staleWhileRevalidate: 60 * 60 * 6,
    };
  }

  if (normalized.includes('/projections/') || normalized.includes('/trending/')) {
    return {
      edgeTtl: liveWindow ? 300 : 1800,
      staleWhileRevalidate: liveWindow ? 120 : 600,
    };
  }

  const edgeTtl = liveWindow ? 900 : 60 * 60 * 6; // 15 minutes vs 6 hours
  return {
    edgeTtl,
    staleWhileRevalidate: liveWindow ? 300 : 60 * 60,
  };
}

function sanitizeBasePath(pathname = '') {
  if (!pathname || pathname === '/') {
    return `/${API_VERSION}`;
  }

  const trimmed = pathname.replace(/^\/+/, '/');
  return trimmed.startsWith(`/${API_VERSION}`)
    ? trimmed
    : `/${API_VERSION}${trimmed}`;
}

export default async function handler(event, context) {
  const requestUrl = event.rawUrl ? new URL(event.rawUrl) : null;
  const pathname = requestUrl ? requestUrl.pathname : event.path || '';
  const bypassCache = event.queryStringParameters?.fresh === '1';
  const method = (event.httpMethod || 'GET').toUpperCase();

  if (!['GET', 'HEAD'].includes(method)) {
    return {
      statusCode: 405,
      headers: {
        Allow: 'GET, HEAD',
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ message: 'Method not allowed' }),
    };
  }

  const strippedPath = pathname
    .replace(/^\/\.netlify\/functions\/sleeper/i, '')
    .replace(/^\/api\/sleeper/i, '');

  const proxiedPath = sanitizeBasePath(strippedPath);

  const targetUrl = new URL(`${SLEEPER_API_ROOT}${proxiedPath}`);

  const forwardedParams = event.queryStringParameters || {};
  Object.entries(forwardedParams).forEach(([key, value]) => {
    if (key === 'fresh' || typeof value === 'undefined') {
      return;
    }
    targetUrl.searchParams.set(key, value);
  });

  if (typeof context.setCacheControl === 'function') {
    if (bypassCache) {
      context.setCacheControl({ bypassCache: true });
    } else {
      const policy = resolveCachePolicy(targetUrl.pathname);
      context.setCacheControl({
        ...policy,
        browserTtl: 0,
        serveStaleOnError: true,
      });
    }
  }

  try {
    const upstream = await fetch(targetUrl.href, {
      headers: {
        'user-agent': 'DynastyHub Netlify Proxy/1.0 (+https://www.dynastyhub.app)',
      },
      method,
    });

    const body = await upstream.text();
    const headers = Object.fromEntries(upstream.headers);
    const responseHeaders = {
      'Content-Type': headers['content-type'] || 'application/json',
      'Cache-Control': bypassCache ? 'no-store' : 'public, max-age=0, must-revalidate',
      'Access-Control-Allow-Origin': '*',
    };

    if (headers['content-encoding']) {
      responseHeaders['Content-Encoding'] = headers['content-encoding'];
    }

    return {
      statusCode: upstream.status,
      headers: responseHeaders,
      body,
    };
  } catch (error) {
    console.error('Sleeper proxy error:', error);
    return {
      statusCode: 502,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: 'Failed to reach Sleeper API',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
}
