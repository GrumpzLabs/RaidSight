const API_URL = 'https://www.warcraftlogs.com/api/v2/client';
const TOKEN_URL = 'https://www.warcraftlogs.com/oauth/token';

let cachedToken;
async function getToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;
  if (!process.env.WCL_CLIENT_ID || !process.env.WCL_CLIENT_SECRET) throw new Error('Warcraft Logs credentials are not configured. Add WCL_CLIENT_ID and WCL_CLIENT_SECRET to your environment.');
  const auth = Buffer.from(`${process.env.WCL_CLIENT_ID}:${process.env.WCL_CLIENT_SECRET}`).toString('base64');
  const response = await fetch(TOKEN_URL, { method: 'POST', headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=client_credentials' });
  if (!response.ok) throw new Error(`Warcraft Logs token request failed (${response.status}).`);
  const token = await response.json();
  cachedToken = { value: token.access_token, expiresAt: Date.now() + ((token.expires_in || 3600) - 60) * 1000 };
  return cachedToken.value;
}

function reportCodeFromUrl(value) {
  try {
    const url = new URL(value);
    const match = url.pathname.match(/\/reports\/([^/]+)/i);
    return match?.[1] || null;
  } catch { return null; }
}

async function fetchReport(url) {
  const code = reportCodeFromUrl(url);
  if (!code) throw new Error('That does not look like a Warcraft Logs report URL.');
  const query = `query($code: String!) { reportData { report(code: $code) { code title startTime endTime fights { id name kill startTime endTime difficulty bossPercentage } } } }`;
  const response = await fetch(API_URL, { method: 'POST', headers: { Authorization: `Bearer ${await getToken()}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query, variables: { code } }) });
  if (!response.ok) throw new Error(`Warcraft Logs request failed (${response.status}).`);
  const result = await response.json();
  if (result.errors?.length) throw new Error(result.errors[0].message || 'Warcraft Logs rejected the report request.');
  const report = result.data?.reportData?.report;
  if (!report) throw new Error('The report could not be found or is private.');
  return report;
}

function buildReport(log) {
  const fights = (log.fights || []).filter(fight => fight.name);
  return {
    source: 'Warcraft Logs', reportCode: log.code, encounter: log.title || 'Warcraft Logs report',
    duration: log.startTime && log.endTime ? formatDuration(log.endTime - log.startTime) : '—',
    highImpactMoments: 0, findings: [], fights: fights.map(fight => ({ name: fight.name, kill: fight.kill, difficulty: fight.difficulty, bossPercentage: fight.bossPercentage }))
  };
}
function formatDuration(milliseconds) {
  const seconds = Math.max(0, Math.round(milliseconds / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
module.exports = { fetchReport, buildReport };
