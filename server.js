const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = __dirname;
const UPLOADS = path.join(ROOT, 'uploads');
const jobs = new Map();
fs.mkdirSync(UPLOADS, { recursive: true });

const report = {
  encounter: 'Heroic Nerub-ar Palace · Anub’arash', duration: '08:42', highImpactMoments: 3,
  findings: [
    { timestamp: '02:14', category: 'SURVIVABILITY', tone: 'amber', title: 'Defensive came one GCD late', explanation: 'Use Feint just before the web volley. You had it available and avoided 18% less damage than your previous pull.', recommendation: 'Pre-cast your defensive when the cast begins.' },
    { timestamp: '04:51', category: 'UPTIME', tone: 'red', title: 'Lost uptime during the add wave', explanation: 'There was a 4.6s gap between attacks while the boss was in range. Pre-position, then keep your next builder rolling.', recommendation: 'Keep your next builder queued before moving.' },
    { timestamp: '07:33', category: 'GOOD HABIT', tone: 'blue', title: 'Clean response to the frontal', explanation: 'Great step-out and immediate return. This is exactly the movement pattern to repeat.', recommendation: 'Repeat this movement timing on the next pull.' }
  ]
};

function send(res, status, body, type = 'application/json') {
  res.writeHead(status, { 'Content-Type': type, 'Access-Control-Allow-Origin': '*' });
  res.end(type === 'application/json' ? JSON.stringify(body) : body);
}
function parseMultipart(buffer, boundary) {
  const marker = Buffer.from(`--${boundary}`);
  const parts = [];
  let start = buffer.indexOf(marker);
  while (start !== -1) {
    const next = buffer.indexOf(marker, start + marker.length);
    if (next === -1) break;
    const chunk = buffer.subarray(start + marker.length + 2, next - 2);
    const separator = chunk.indexOf(Buffer.from('\r\n\r\n'));
    if (separator !== -1) {
      const headers = chunk.subarray(0, separator).toString();
      const content = chunk.subarray(separator + 4);
      const name = /name="([^"]+)"/.exec(headers)?.[1];
      const filename = /filename="([^"]*)"/.exec(headers)?.[1];
      parts.push({ name, filename, content });
    }
    start = next;
  }
  return parts;
}
function serveStatic(req, res) {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const file = pathname === '/' ? 'index.html' : pathname.slice(1);
  const safe = path.normalize(file).replace(/^\.\.(\/|\\|$)/, '');
  const target = path.join(ROOT, safe);
  if (!target.startsWith(ROOT) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) return send(res, 404, 'Not found', 'text/plain');
  const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json' };
  send(res, 200, fs.readFileSync(target), types[path.extname(target)] || 'application/octet-stream');
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, '');
  if (req.method === 'POST' && req.url === '/api/reviews') {
    const chunks = []; let size = 0;
    req.on('data', chunk => { size += chunk.length; if (size < 2_200_000_000) chunks.push(chunk); });
    req.on('end', () => {
      const contentType = req.headers['content-type'] || '';
      const boundary = /boundary=(.+)$/.exec(contentType)?.[1];
      if (!boundary) return send(res, 400, { error: 'Expected a multipart video upload.' });
      const parts = parseMultipart(Buffer.concat(chunks), boundary);
      const video = parts.find(p => p.name === 'video');
      const logUrl = parts.find(p => p.name === 'logUrl')?.content.toString() || '';
      if (!video?.filename || !video.content.length) return send(res, 400, { error: 'A video file is required.' });
      const id = crypto.randomUUID();
      const extension = path.extname(video.filename) || '.video';
      fs.writeFileSync(path.join(UPLOADS, `${id}${extension}`), video.content);
      jobs.set(id, { id, status: 'processing', filename: video.filename, logUrl, createdAt: Date.now() });
      setTimeout(() => jobs.set(id, { ...jobs.get(id), status: 'complete', report }), 1800);
      return send(res, 202, { id, status: 'processing' });
    });
    return;
  }
  const match = req.method === 'GET' && req.url.match(/^\/api\/reviews\/([^/?]+)/);
  if (match) {
    const job = jobs.get(match[1]);
    return job ? send(res, 200, job) : send(res, 404, { error: 'Review not found.' });
  }
  return serveStatic(req, res);
});
const port = Number(process.env.PORT || 3000);
server.listen(port, () => console.log(`RaidSight running at http://localhost:${port}`));
