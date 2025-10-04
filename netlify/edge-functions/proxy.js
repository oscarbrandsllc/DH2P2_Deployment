export default async (request, context) => {
  const url = new URL(request.url);
  // The path now directly corresponds to the API endpoint, e.g., /api/sleeper/v1/user/the_oracle -> sleeper/v1/user/the_oracle
  const path = url.pathname.substring(5); // Remove the leading '/api/'
  let targetUrl;
  let cacheControl;

  if (path.startsWith('sleeper/')) {
    targetUrl = `https://api.sleeper.app/${path.replace('sleeper/', 'v1/')}`;
    if (path.includes('state/nfl')) {
      // Live stats, very short cache
      cacheControl = 'public, max-age=60, s-maxage=60';
    } else {
      // Other Sleeper data (players, rosters, etc.), 15-minute cache
      cacheControl = 'public, max-age=900, s-maxage=900';
    }
  } else if (path.startsWith('gsheets/')) {
    const sheetPath = path.replace('gsheets/', '');
    targetUrl = `https://docs.google.com/spreadsheets/d/${sheetPath}`;
    // Google Sheets data (KTC, stats), 24-hour cache
    cacheControl = 'public, max-age=86400, s-maxage=86400';
  } else {
    return new Response('Invalid API proxy route', { status: 400 });
  }

  // Append query string if it exists
  if (url.search) {
    targetUrl += url.search;
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'Accept': request.headers.get('Accept'),
      },
    });

    const newHeaders = new Headers(response.headers);
    newHeaders.set('Cache-Control', cacheControl);
    newHeaders.set('Access-Control-Allow-Origin', '*');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  } catch (error) {
    return new Response(`Error fetching from origin: ${error.message}`, { status: 502 });
  }
};