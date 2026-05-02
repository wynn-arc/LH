export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ error: 'Missing authorization token' });

  const path = req.query.path;
  if (!path) return res.status(400).json({ error: 'Missing path parameter' });

  // Special route: proxy an image URL to avoid CORS
  if (path === '__image_proxy') {
    const imageUrl = req.query.url;
    if (!imageUrl) return res.status(400).json({ error: 'Missing url' });
    try {
      const r = await fetch(imageUrl);
      if (!r.ok) return res.status(r.status).end();
      const contentType = r.headers.get('content-type') || 'image/jpeg';
      const buffer = await r.arrayBuffer();
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.status(200).send(Buffer.from(buffer));
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // Build query string (exclude 'path')
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query)) {
    if (key !== 'path') params.append(key, value);
  }
  const queryString = params.toString();
  const loyverseUrl = `https://api.loyverse.com/v1.0/${path}${queryString ? '?' + queryString : ''}`;

  try {
    const fetchOptions = {
      method: req.method,
      headers: { 'Authorization': token, 'Content-Type': 'application/json' },
    };
    if (req.method === 'POST' && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }
    const response = await fetch(loyverseUrl, fetchOptions);
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}