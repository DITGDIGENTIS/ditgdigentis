const statusMap = {};

export default function handler(req, res) {
  if (req.method === "POST") {
    const id = req.body?.id || req.query?.id || "unknown";
    statusMap[id] = {
      timestamp: Date.now(),
      ip: req.body?.ip || req.query?.ip || "",
    };
    return res.status(200).json({ ok: true });
  }

  if (req.method === "GET") {
    return res.status(200).json(statusMap);
  }

  res.status(405).end();
}
