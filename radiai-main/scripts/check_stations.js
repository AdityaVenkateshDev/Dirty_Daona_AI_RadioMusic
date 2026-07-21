(async () => {
  try {
    const res = await fetch('http://localhost:4321/api/live');
    const data = await res.json();
    console.log('stations from /api/live:');
    console.log(Object.keys(data));
    for (const k of Object.keys(data)) {
      const song = data[k].song;
      const proxy = 'http://localhost:4321/api/proxy?url=' + encodeURIComponent(song.url);
      try {
        const h = await fetch(proxy, { method: 'HEAD' });
        console.log(k, song.station, h.status, h.headers.get('content-type'));
      } catch (e) {
        console.error(k, 'proxy HEAD failed', e.message);
      }
    }
  } catch (e) {
    console.error('failed', e);
    process.exit(1);
  }
})();
