// api/vote/[id].js
// Serverless function di Vercel untuk proxy data dari Mnet API.
// - Menyembunyikan origin API dari browser
// - Hanya mengirim field yang diperlukan (groupName, groupBadgeName, rank, title)
// - Sudah tertata dan di-sort berdasarkan rank

export default async function handler(req, res) {
  try {
    const { id } = req.query;
    if (!id) {
      res.status(400).json({ error: "missing vote id" });
      return;
    }

    const upstream = `https://api.mnetplus.world/vote/v1/public/guest/votes/${encodeURIComponent(id)}/options?sort=RANKED`;

    // Node 18+ di Vercel punya fetch bawaan (tidak perlu node-fetch)
    const r = await fetch(upstream, {
      headers: { "Accept": "application/json" },
      // timeout singkat via AbortController jika mau—optional
    });

    if (!r.ok) {
      const txt = await r.text();
      res.status(r.status).json({ error: txt.slice(0, 400) });
      return;
    }

    const j = await r.json();
    const groups = Array.isArray(j?.groups) ? j.groups : [];

    // ringkas & sort rank asc
    const data = groups.map(g => ({
      groupName: g.groupName || "",
      groupBadgeName: g.groupBadgeName || "",
      options: (Array.isArray(g.options) ? g.options : [])
        .map(o => ({ rank: o?.rank ?? null, title: o?.title ?? "" }))
        .sort((a, b) => {
          const ra = typeof a.rank === "number" && a.rank > 0 ? a.rank : 1e9;
          const rb = typeof b.rank === "number" && b.rank > 0 ? b.rank : 1e9;
          return ra - rb;
        })
    }));

    // Cache CDN singkat agar hemat request upstream
    res.setHeader("Cache-Control", "s-maxage=10, stale-while-revalidate=59");
    res.status(200).json({ data, fetchedAt: new Date().toISOString() });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "bad_gateway" });
  }
}
