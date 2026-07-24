const TARGET_ORIGIN = 'https://pepsiman.ol.mr';

export default {
  fetch(request) {
    const incoming = new URL(request.url);
    const target = new URL(`${incoming.pathname}${incoming.search}`, TARGET_ORIGIN);
    return new Response(null, {
      status: 301,
      headers: {
        Location: target.toString(),
        'Cache-Control': 'public, max-age=86400'
      }
    });
  }
};
