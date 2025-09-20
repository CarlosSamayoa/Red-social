const buckets = new Map(); // key -> { count, reset }
export function rateLimit({ windowMs = 15000, max = 30 } = {}){
  return (req, res, next) => {
    const key = req.ip + '|' + (req.baseUrl + req.path);
    const now = Date.now();
    const slot = buckets.get(key) || { count: 0, reset: now + windowMs };
    if (now > slot.reset) { slot.count = 0; slot.reset = now + windowMs; }
    slot.count += 1;
    buckets.set(key, slot);
    if (slot.count > max) {
      res.status(429).json({ error: 'rate_limited', retry_in_ms: slot.reset - now });
    } else next();
  };
}
