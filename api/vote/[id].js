// api/vote/[id].js
module.exports = async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "missing vote id" });

    const upstream = `https://api.mnetplus.world/vote/v1/public/guest/votes/${encodeURIComponent(id)}/options?sort=RANKED`;
    const r = await fetch(upstream, { headers: { Accept: "application/json" } });

    if (!r.ok) {
      const txt = await r.text();
      return res.status(r.status).json({ error: txt.slice(0, 400) });
    }

    const j = await r.json();
    const groups = Array.isArray(j?.groups) ? j.groups : [];

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

    res.setHeader("Cache-Control", "s-maxage=10, stale-while-revalidate=59");
    return res.status(200).json({ data, fetchedAt: new Date().toISOString() });
  } catch (err) {
    console.error(err);
    return res.status(502).json({ error: "bad_gateway" });
  }
};
