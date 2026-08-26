/**
 * DNS A 76.76.21.21 (Vercel) for 3d.grudge.studio (+ 3d.grudge-studio.com).
 * DNS-only (not proxied) so Vercel can issue certs, same as casting/worge.
 */
import fs from 'fs';

function loadSecrets(path) {
  let raw = '';
  try {
    raw = fs.readFileSync(path, 'utf8');
  } catch {
    return {};
  }
  raw = raw.replace(/^\uFEFF/, '');
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i < 1) continue;
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

const secrets = {
  ...loadSecrets('C:/Users/nugye/Desktop/secretnow.txt'),
  ...loadSecrets('F:/GitHub/ObjectStore/.env'),
};

const tokenPairs = [
  ['CF_DNS_API_TOKEN', process.env.CF_DNS_API_TOKEN || secrets.CF_DNS_API_TOKEN],
  ['CF_AIWORKER_API', process.env.CF_AIWORKER_API || secrets.CF_AIWORKER_API],
  ['CLOUDFLARE_API_TOKEN', process.env.CLOUDFLARE_API_TOKEN || secrets.CLOUDFLARE_API_TOKEN],
  ['CLOUDFLARE_USER_API', process.env.CLOUDFLARE_USER_API || secrets.CLOUDFLARE_USER_API],
  ['CF_ZERO_TRUST_TOKEN', process.env.CF_ZERO_TRUST_TOKEN || secrets.CF_ZERO_TRUST_TOKEN],
  ['CF_AI_WORKERS_API', process.env.CF_AI_WORKERS_API || secrets.CF_AI_WORKERS_API],
  ['CF_WORKER_R2_API', process.env.CF_WORKER_R2_API || secrets.CF_WORKER_R2_API],
].filter(([, t]) => t && t.length > 10);

const HOSTS = [
  { fqdn: '3d.grudge.studio', zoneName: 'grudge.studio' },
  { fqdn: '3d.grudge-studio.com', zoneName: 'grudge-studio.com' },
];

async function api(token, path, opts = {}) {
  const r = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  const j = await r.json();
  return { http: r.status, ...j };
}

async function upsertA(token, zoneId, fqdn) {
  const body = {
    type: 'A',
    name: fqdn,
    content: '76.76.21.21',
    ttl: 1,
    proxied: false,
    comment: 'Vercel sketches-3d · 3d.grudge.studio/nexus TPS lobby',
  };
  const q = await api(token, `/zones/${zoneId}/dns_records?name=${encodeURIComponent(fqdn)}`);
  const recs = q.result || [];
  const rec = recs.find(r => r.type === 'A' || r.type === 'CNAME');
  if (rec && rec.type === 'CNAME') {
    await api(token, `/zones/${zoneId}/dns_records/${rec.id}`, { method: 'DELETE' });
  } else if (rec && rec.type === 'A') {
    return api(token, `/zones/${zoneId}/dns_records/${rec.id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }
  return api(token, `/zones/${zoneId}/dns_records`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

async function verify(token) {
  const r = await fetch('https://api.cloudflare.com/client/v4/user/tokens/verify', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const j = await r.json();
  return { ok: j.success, status: j.result?.status, err: j.errors?.[0]?.message, http: r.status };
}

const verified = [];
for (const [name, t] of tokenPairs) {
  const v = await verify(t);
  console.log(name, 'verify', v.http, v.ok, v.status || v.err || '');
  if (v.ok) verified.push([name, t]);
}
if (!verified.length) {
  console.error('No valid CF token');
  process.exit(2);
}

let byName = {};
let token = null;
for (const [name, t] of verified) {
  const zones = await api(t, '/zones?per_page=50');
  if (!zones.success) {
    console.log(name, 'zones fail', zones.errors?.[0]?.message || zones.http);
    continue;
  }
  byName = Object.fromEntries((zones.result || []).map(z => [z.name, z.id]));
  token = t;
  console.log('zones via', name, Object.keys(byName));
  break;
}
if (!token) {
  console.error('no token can list zones');
  process.exit(1);
}

let wrote = 0;
for (const host of HOSTS) {
  const zoneId = byName[host.zoneName];
  if (!zoneId) {
    console.warn('skip, no zone for', host.fqdn);
    continue;
  }
  let ok = false;
  for (const [name, t] of verified) {
    const out = await upsertA(t, zoneId, host.fqdn);
    console.log(host.fqdn, name, out.success, out.result?.type, out.result?.content, out.errors?.[0]?.message || '');
    if (out.success) {
      ok = true;
      wrote += 1;
      break;
    }
  }
  if (!ok) console.error('FAILED', host.fqdn);
}
console.log('wrote', wrote);
