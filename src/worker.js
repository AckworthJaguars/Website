import { EmailMessage } from 'cloudflare:email';
import { okUrl, okFeedUrl, parseLadder, parseFixtures, parseIcs } from './gameday.js';
const E = new TextEncoder();
const J = (o, s = 200, h = {}) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json', ...h } });
const fail = (s, m) => { const e = new Error(m); e.s = s; throw e; };
const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
const rnd = n => hex(crypto.getRandomValues(new Uint8Array(n)));
const R = { fixture: 'admin editor coach', news: 'admin editor coach', team: 'admin editor', doc: 'admin editor', sponsor: 'admin editor', member: 'admin editor', role: 'admin editor', page: 'admin editor' };
const OK = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const need = (me, roles) => { if (!me) fail(401, 'Please log in'); if (!roles || !roles.split(' ').includes(me.role)) fail(403, 'Your account cannot do that'); };

async function hash(p, salt) {
  const k = await crypto.subtle.importKey('raw', E.encode(p), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: E.encode(salt), iterations: 100000 }, k, 256));
}
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function b32d(s) { let b = 0, v = 0; const o = []; for (const c of s) { v = (v << 5) | B32.indexOf(c); b += 5; if (b >= 8) { o.push((v >>> (b - 8)) & 255); b -= 8; } } return new Uint8Array(o); }
function newSecret() { const r = crypto.getRandomValues(new Uint8Array(20)); let b = 0, v = 0, o = ''; for (const x of r) { v = (v << 8) | x; b += 8; while (b >= 5) { o += B32[(v >>> (b - 5)) & 31]; b -= 5; } } return o; }
async function totp(sec) {
  const k = await crypto.subtle.importKey('raw', b32d(sec), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const out = [];
  for (const d of [-1, 0, 1]) {
    const m = new Uint8Array(8); new DataView(m.buffer).setUint32(4, Math.floor(Date.now() / 30000) + d);
    const h = new Uint8Array(await crypto.subtle.sign('HMAC', k, m)), o = h[19] & 15;
    out.push(String((((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]) % 1e6).padStart(6, '0'));
  }
  return out;
}
async function mk(db, username, password, role) {
  username = String(username || '').toLowerCase();
  if (!/^[a-z0-9._-]{3,30}$/.test(username)) fail(400, 'Username must be 3 to 30 letters, numbers, dots or dashes');
  if (String(password || '').length < 10) fail(400, 'Password must be at least 10 characters');
  if (!['admin', 'editor', 'coach'].includes(role)) fail(400, 'Choose a role');
  const salt = rnd(16), secret = newSecret();
  try { await db.prepare('INSERT INTO users(username,pass,salt,totp,role) VALUES(?,?,?,?,?)').bind(username, await hash(password, salt), salt, secret, role).run(); }
  catch { fail(409, 'That username is taken'); }
  return { username, secret };
}
const b64 = s => btoa(String.fromCharCode(...new TextEncoder().encode(s)));
async function mail(env, S, name, email, msg) {
  if (!env.EMAIL || !S.email || !S.mailFrom) return false;
  try {
    const c = s => String(s).replace(/[\r\n<>]/g, ' ');
    const raw = [`From: Jaguars website <${c(S.mailFrom)}>`, `To: ${c(S.email)}`, `Reply-To: ${c(email)}`, `Subject: =?UTF-8?B?${b64('Website message from ' + c(name))}?=`, `Message-ID: <${rnd(8)}@${c(S.mailFrom).split('@')[1]}>`, `Date: ${new Date().toUTCString()}`, 'MIME-Version: 1.0', 'Content-Type: text/plain; charset=utf-8', 'Content-Transfer-Encoding: base64', '', b64(`From: ${name} <${email}>\n\n${msg}`).replace(/.{76}/g, '$&\r\n')].join('\r\n');
    await env.EMAIL.send(new EmailMessage(c(S.mailFrom), c(S.email), raw));
    return true;
  } catch (e) { return false; }
}
async function getHtml(u) {
  const r = await fetch(u, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; AckworthJaguarsWebsite/1.0)', accept: 'text/html,text/calendar,*/*' } });
  if (!r.ok) throw new Error('Game Day answered ' + r.status);
  return r.text();
}
async function refreshGD(env) {
  const db = env.DB, out = [];
  const teams = (await db.prepare("SELECT data FROM items WHERE kind='team'").all()).results.map(r => JSON.parse(r.data));
  for (const t of teams) {
    if (!t.slug || (!t.gdFix && !t.gdLadder && !t.icalUrl)) continue;
    const name = t.name || 'U' + t.age, rec = { checked: Date.now() };
    try {
      if (t.gdLadder) { if (!okUrl(t.gdLadder)) throw new Error('table link must be a https://websites.mygameday.app link'); rec.ladder = parseLadder(await getHtml(t.gdLadder)); if (!rec.ladder) throw new Error('could not find the league table on that page'); }
      if (t.gdFix) { if (!okUrl(t.gdFix)) throw new Error('fixtures link must be a https://websites.mygameday.app link'); rec.fixtures = parseFixtures(await getHtml(t.gdFix)); if (!rec.fixtures) throw new Error('could not find the fixtures on that page'); }
      if (!t.gdFix && t.icalUrl) {
        const u = t.icalUrl.trim().replace(/^webcal:/i, 'https:');
        if (!okFeedUrl(u)) throw new Error('calendar link must start with https:// or webcal://');
        const all = parseIcs(await getHtml(u), '').slice(0, 150), fl = String(t.icalFilter || '').trim().toLowerCase();
        rec.events = all;
        rec.fixtures = fl ? all.filter(e => e.title.toLowerCase().includes(fl)) : all;
        if (!all.length) throw new Error('no upcoming events found in that calendar');
      }
      await db.prepare('INSERT OR REPLACE INTO kv VALUES(?,?)').bind('gd:' + t.slug, JSON.stringify(rec)).run();
      out.push(`${name}: OK (${rec.ladder ? rec.ladder.rows.length + ' table rows, ' : ''}${rec.fixtures ? rec.fixtures.length + ' fixtures' : 'no fixtures'}${rec.events ? ', ' + rec.events.length + ' calendar events' : ''})`);
    } catch (e) { out.push(`${name}: not updated, ${e.message}`); }
  }
  return out.length ? out : ['No team has Game Day links yet'];
}
async function who(req, env) {
  const c = (req.headers.get('cookie') || '').match(/sid=([a-f0-9]{64})/);
  if (!c) return null;
  return env.DB.prepare('SELECT u.id,u.username,u.role FROM sessions s JOIN users u ON u.id=s.uid WHERE s.id=? AND s.exp>? AND u.active=1').bind(c[1], Date.now()).first();
}

async function route(req, env, p, m) {
  const db = env.DB;
  if (p.startsWith('/p/')) return env.ASSETS.fetch(new Request(new URL('/page', req.url)));
  if (p.startsWith('/go/')) {
    const slug = decodeURIComponent(p.slice(4)), rows = (await db.prepare("SELECT data FROM items WHERE kind='page'").all()).results.map(r => JSON.parse(r.data));
    const pg = rows.find(x => x.slug === slug);
    if (pg && pg.type !== 'Page with text' && /^https?:\/\//.test(pg.url || '')) return Response.redirect(pg.url, 302);
    return new Response('Not found', { status: 404 });
  }
  if (p.startsWith('/media/')) {
    const id = decodeURIComponent(p.slice(7)), ck = new Request(req.url);
    const hit = await caches.default.match(ck); if (hit) return hit;
    const f = await db.prepare('SELECT type FROM files WHERE id=?').bind(id).first();
    if (!f) return new Response('Not found', { status: 404 });
    const rows = (await db.prepare('SELECT data FROM chunks WHERE fid=? ORDER BY n').bind(id).all()).results;
    const parts = rows.map(r => r.data instanceof ArrayBuffer ? new Uint8Array(r.data) : Uint8Array.from(r.data));
    const out = new Uint8Array(parts.reduce((a, b) => a + b.length, 0)); let o = 0;
    for (const x of parts) { out.set(x, o); o += x.length; }
    const res = new Response(out, { headers: { 'content-type': f.type, 'cache-control': 'public,max-age=31536000,immutable', 'x-content-type-options': 'nosniff' } });
    try { await caches.default.put(ck, res.clone()); } catch (e) {}
    return res;
  }
  if (p === '/api/public') {
    const [s, r, g] = await Promise.all([db.prepare("SELECT v FROM kv WHERE k='settings'").first(), db.prepare('SELECT id,kind,sort,data FROM items ORDER BY sort').all(), db.prepare("SELECT k,v FROM kv WHERE k LIKE 'gd:%'").all()]);
    return J({ settings: s ? JSON.parse(s.v) : {}, gd: Object.fromEntries(g.results.map(x => [x.k.slice(3), JSON.parse(x.v)])), items: r.results.map(x => ({ ...JSON.parse(x.data), id: x.id, kind: x.kind, sort: x.sort })) }, 200, { 'cache-control': 'public,max-age=30' });
  }
  const me = await who(req, env);
  if (p === '/api/me') { const c = await db.prepare('SELECT COUNT(*) c FROM users').first(); return J(c.c ? { user: me } : { setup: true }); }
  if (p === '/api/upload' && m === 'POST') {
    need(me, 'admin editor coach');
    const t = req.headers.get('content-type') || '';
    if (!OK.includes(t)) fail(400, 'Use a PNG, JPG, WebP, GIF, PDF or Word file');
    const buf = await req.arrayBuffer();
    if (buf.byteLength > 5e6) fail(400, 'File is over 5MB. Photos are shrunk automatically; compress large PDFs first.');
    const key = rnd(6) + '-' + decodeURIComponent(req.headers.get('x-name') || 'file').replace(/[^\w.-]/g, '_').slice(-60);
    const CH = 1.5e6, st = [db.prepare('INSERT INTO files(id,type) VALUES(?,?)').bind(key, t)];
    for (let i = 0, n = 0; i < buf.byteLength; i += CH, n++) st.push(db.prepare('INSERT INTO chunks(fid,n,data) VALUES(?,?,?)').bind(key, n, buf.slice(i, i + CH)));
    await db.batch(st);
    return J({ url: '/media/' + key });
  }
  const b = ['GET', 'DELETE'].includes(m) ? {} : await req.json().catch(() => ({}));

  if (p === '/api/contact' && m === 'POST') {
    if (b.website) return J({ ok: 1 });
    const name = String(b.name || '').trim().slice(0, 100), email = String(b.email || '').trim().slice(0, 200), message = String(b.message || '').trim().slice(0, 4000);
    if (!name || !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(email) || message.length < 5) fail(400, 'Please give your name, a valid email and a message');
    const ip = req.headers.get('cf-connecting-ip') || 'x', rk = 'c:' + ip + ':' + Math.floor(Date.now() / 36e5);
    const rc = await db.prepare('SELECT v FROM kv WHERE k=?').bind(rk).first();
    if (rc && +rc.v >= 5) fail(429, 'Too many messages from your connection. Please try again later.');
    const sr = await db.prepare("SELECT v FROM kv WHERE k='settings'").first(), S = sr ? JSON.parse(sr.v) : {};
    if (S.turnstile && env.TURNSTILE_SECRET) {
      const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: String(b.token || ''), remoteip: ip }) });
      if (!(await r.json()).success) fail(400, 'Please complete the human check and try again');
    }
    await db.prepare('INSERT OR REPLACE INTO kv VALUES(?,?)').bind(rk, String((rc ? +rc.v : 0) + 1)).run();
    const sent = await mail(env, S, name, email, message);
    await db.prepare('INSERT INTO messages(ts,name,email,msg,sent) VALUES(?,?,?,?,?)').bind(Date.now(), name, email, message, sent ? 1 : 0).run();
    return J({ ok: 1 });
  }
  if (p === '/api/setup' && m === 'POST') {
    const c = await db.prepare('SELECT COUNT(*) c FROM users').first();
    if (c.c) fail(403, 'Already set up');
    return J(await mk(db, b.username, b.password, 'admin'));
  }
  if (p === '/api/login' && m === 'POST') {
    const un = String(b.username || '').toLowerCase(), fk = 'f:' + un, now = Date.now();
    const f = await db.prepare('SELECT v FROM kv WHERE k=?').bind(fk).first(), fv = f ? JSON.parse(f.v) : { n: 0, t: 0 };
    if (fv.n >= 5 && now - fv.t < 9e5) fail(429, 'Too many attempts. Try again in 15 minutes.');
    const n = await db.prepare('SELECT * FROM users WHERE username=? AND active=1').bind(un).first();
    const ok = n && (await hash(String(b.password || ''), n.salt)) === n.pass && (await totp(n.totp)).includes(String(b.code || '').trim());
    if (!ok) {
      await db.prepare('INSERT OR REPLACE INTO kv VALUES(?,?)').bind(fk, JSON.stringify({ n: (now - fv.t < 9e5 ? fv.n : 0) + 1, t: now })).run();
      fail(401, 'Wrong username, password or code');
    }
    await db.prepare('DELETE FROM kv WHERE k=?').bind(fk).run();
    const sid = rnd(32);
    await db.prepare('INSERT INTO sessions VALUES(?,?,?)').bind(sid, n.id, now + 432e5).run();
    return J({ user: { username: n.username, role: n.role } }, 200, { 'set-cookie': `sid=${sid}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=43200` });
  }
  if (p === '/api/logout') {
    const c = (req.headers.get('cookie') || '').match(/sid=([a-f0-9]{64})/);
    if (c) await db.prepare('DELETE FROM sessions WHERE id=?').bind(c[1]).run();
    return J({ ok: 1 }, 200, { 'set-cookie': 'sid=; Path=/; Max-Age=0' });
  }

  if (p === '/api/items' && m === 'POST') {
    need(me, R[b.kind]);
    const d = JSON.stringify(b.data || {}); if (d.length > 30000) fail(400, 'Too much text');
    await db.prepare('INSERT INTO items(kind,sort,data) VALUES(?,?,?)').bind(b.kind, String(b.sort || ''), d).run();
    return J({ ok: 1 });
  }
  let x = p.match(/^\/api\/items\/(\d+)$/);
  if (x) {
    const row = await db.prepare('SELECT kind FROM items WHERE id=?').bind(x[1]).first();
    if (!row) fail(404, 'Not found');
    need(me, R[row.kind]);
    if (m === 'DELETE') await db.prepare('DELETE FROM items WHERE id=?').bind(x[1]).run();
    else { const d = JSON.stringify(b.data || {}); if (d.length > 30000) fail(400, 'Too much text'); await db.prepare('UPDATE items SET sort=?,data=? WHERE id=?').bind(String(b.sort || ''), d, x[1]).run(); }
    return J({ ok: 1 });
  }
  if (p === '/api/messages' && m === 'GET') { need(me, 'admin editor'); return J((await db.prepare('SELECT * FROM messages ORDER BY ts DESC LIMIT 100').all()).results); }
  x = p.match(/^\/api\/messages\/(\d+)$/);
  if (x && m === 'DELETE') { need(me, 'admin editor'); await db.prepare('DELETE FROM messages WHERE id=?').bind(x[1]).run(); return J({ ok: 1 }); }
  if (p === '/api/gameday/refresh' && m === 'POST') { need(me, 'admin editor'); return J({ results: await refreshGD(env) }); }
  if (p === '/api/invites' && m === 'POST') {
    need(me, 'admin');
    const un = String(b.username || '').toLowerCase();
    if (!/^[a-z0-9._-]{3,30}$/.test(un)) fail(400, 'Username must be 3 to 30 letters, numbers, dots or dashes');
    if (!['admin', 'editor', 'coach'].includes(b.role)) fail(400, 'Choose a level');
    if (await db.prepare('SELECT 1 FROM users WHERE username=?').bind(un).first()) fail(409, 'That username is taken');
    const token = rnd(24);
    await db.prepare('INSERT INTO invites VALUES(?,?,?,?,?)').bind(token, un, b.role, null, Date.now() + 6048e5).run();
    return J({ token });
  }
  x = p.match(/^\/api\/users\/(\d+)\/invite$/);
  if (x && m === 'POST') {
    need(me, 'admin');
    const u = await db.prepare('SELECT id,username,role FROM users WHERE id=?').bind(x[1]).first();
    if (!u) fail(404, 'Not found');
    const token = rnd(24);
    await db.prepare('INSERT INTO invites VALUES(?,?,?,?,?)').bind(token, u.username, u.role, u.id, Date.now() + 6048e5).run();
    return J({ token });
  }
  x = p.match(/^\/api\/invite\/([a-f0-9]{48})$/);
  if (x) {
    const inv = await db.prepare('SELECT * FROM invites WHERE token=? AND exp>?').bind(x[1], Date.now()).first();
    if (!inv) fail(404, 'This invite link has expired or was already used. Ask for a new one.');
    if (m === 'GET') return J({ username: inv.username, reset: !!inv.uid });
    if (m === 'POST') {
      let r;
      if (inv.uid) {
        if (String(b.password || '').length < 10) fail(400, 'Password must be at least 10 characters');
        const salt = rnd(16), secret = newSecret();
        await db.prepare('UPDATE users SET pass=?,salt=?,totp=? WHERE id=?').bind(await hash(b.password, salt), salt, secret, inv.uid).run();
        await db.prepare('DELETE FROM sessions WHERE uid=?').bind(inv.uid).run();
        r = { username: inv.username, secret };
      } else r = await mk(db, inv.username, b.password, inv.role);
      await db.prepare('DELETE FROM invites WHERE token=?').bind(x[1]).run();
      return J(r);
    }
  }
  if (p === '/api/settings' && m === 'PUT') {
    need(me, 'admin');
    await db.prepare("INSERT OR REPLACE INTO kv VALUES('settings',?)").bind(JSON.stringify(b)).run();
    return J({ ok: 1 });
  }
  if (p === '/api/users' && m === 'GET') { need(me, 'admin'); return J((await db.prepare('SELECT id,username,role,active FROM users ORDER BY username').all()).results); }
  if (p === '/api/users' && m === 'POST') { need(me, 'admin'); return J(await mk(db, b.username, b.password, b.role)); }
  x = p.match(/^\/api\/users\/(\d+)(\/reset)?$/);
  if (x) {
    need(me, 'admin');
    if (x[2]) {
      if (String(b.password || '').length < 10) fail(400, 'Password must be at least 10 characters');
      const salt = rnd(16), secret = newSecret();
      await db.prepare('UPDATE users SET pass=?,salt=?,totp=? WHERE id=?').bind(await hash(b.password, salt), salt, secret, x[1]).run();
      await db.prepare('DELETE FROM sessions WHERE uid=?').bind(x[1]).run();
      return J({ secret });
    }
    if (m === 'DELETE') { if (+x[1] === me.id) fail(400, 'You cannot delete yourself'); await db.prepare('DELETE FROM users WHERE id=?').bind(x[1]).run(); await db.prepare('DELETE FROM sessions WHERE uid=?').bind(x[1]).run(); return J({ ok: 1 }); }
    if (m === 'PUT') { if (+x[1] === me.id) fail(400, 'You cannot change your own role'); if (!['admin', 'editor', 'coach'].includes(b.role)) fail(400, 'Choose a role'); await db.prepare('UPDATE users SET role=? WHERE id=?').bind(b.role, x[1]).run(); return J({ ok: 1 }); }
  }
  fail(404, 'Not found');
}

export default {
  async fetch(req, env) {
    try { return await route(req, env, new URL(req.url).pathname, req.method); }
    catch (e) { return J({ error: e.s ? e.message : 'Server error' }, e.s || 500); }
  },
  async scheduled(ev, env, ctx) {
    const h = +new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Europe/London' }).format(new Date(ev.scheduledTime));
    if (h === 13 || h === 20) ctx.waitUntil(refreshGD(env));
  }
};
