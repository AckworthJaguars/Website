export const GD_HOST = 'websites.mygameday.app';
export const txt = h => String(h).replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#0?39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
export const rowsOf = html => [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(m => [...m[1].matchAll(/<t([hd])\b[^>]*>([\s\S]*?)<\/t\1>/gi)].map(c => txt(c[2])));
export const okUrl = u => { try { const x = new URL(u); return x.protocol === 'https:' && x.hostname === GD_HOST; } catch { return false; } };

export function parseLadder(html) {
  const i = html.search(/>\s*POS\s*</i);
  if (i < 0) return null;
  const j = html.indexOf('Last Uploaded', i);
  const rows = rowsOf(html.slice(Math.max(0, html.lastIndexOf('<tr', i)), j > 0 ? j : i + 40000));
  const head = rows.find(r => /^pos$/i.test(r[0]));
  if (!head) return null;
  const body = rows.filter(r => /^\d+$/.test(r[0]) && r.length >= head.length - 1 && r[1]).map(r => r.slice(0, head.length));
  const m = j > 0 ? txt(html.slice(j, j + 400)).match(/Last Uploaded:?\s*([A-Za-z]{3,9}\s+\d{1,2}-[A-Za-z]{3}-\d{4}\s+\d{1,2}:\d{2})/i) : null;
  return body.length ? { head, rows: body, uploaded: m ? m[1] : '' } : null;
}

export function parseFixtures(html) {
  const i = html.search(/>\s*OPPOSITION\s*</i);
  if (i < 0) return null;
  const rows = rowsOf(html.slice(Math.max(0, html.lastIndexOf('<tr', i)), i + 80000));
  const head = rows.find(r => r.some(c => /^opposition$/i.test(c)));
  if (!head) return null;
  const oi = head.findIndex(c => /^opposition$/i.test(c)), vi = head.findIndex(c => /^venue/i.test(c));
  if (vi < 0) return null;
  const pad = n => String(n).padStart(2, '0');
  const out = [];
  for (const r of rows) {
    const d = (r[1] || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (!d || !r[oi]) continue;
    const t = (r[2] || '').match(/^(\d{1,2}):(\d{2})/), y = d[3].length === 2 ? '20' + d[3] : d[3];
    out.push({ rnd: r[0] || '', date: `${y}-${pad(d[2])}-${pad(d[1])}T${t ? pad(t[1]) + ':' + t[2] : '00:00'}`, venue: r[vi] || '', home: /ackworth/i.test(r[vi] || ''), us: /^\d+$/.test(r[vi + 1] || '') ? r[vi + 1] : '', opp: r[oi], them: /^\d+$/.test(r[oi + 1] || '') ? r[oi + 1] : '' });
  }
  return out.length ? out : null;
}

export const okFeedUrl = u => { try { const x = new URL(u); return x.protocol === 'https:' && !/^(localhost$|\d+\.\d+\.\d+\.\d+$|\[)/.test(x.hostname); } catch { return false; } };

const london = d => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d).map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
};
const unesc = s => String(s || '').replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1').trim();

export function parseIcs(text, filter = '', now = Date.now()) {
  const lines = String(text).replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
  const evs = []; let cur = null;
  for (const ln of lines) {
    if (ln === 'BEGIN:VEVENT') cur = {};
    else if (ln === 'END:VEVENT') { if (cur) evs.push(cur); cur = null; }
    else if (cur) { const i = ln.indexOf(':'); if (i > 0) cur[ln.slice(0, i).split(';')[0].toUpperCase()] = ln.slice(i + 1); }
  }
  const f = String(filter || '').trim().toLowerCase(), out = [];
  for (const e of evs) {
    if (e.RRULE || /^cancel/i.test(e.STATUS || '') || !e.DTSTART) continue;
    const s = e.DTSTART.trim(), title = unesc(e.SUMMARY);
    if (f && !title.toLowerCase().includes(f)) continue;
    let date;
    if (/^\d{8}$/.test(s)) date = `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T00:00`;
    else if (/^\d{8}T\d{6}Z$/.test(s)) date = london(new Date(Date.UTC(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8), +s.slice(9, 11), +s.slice(11, 13))));
    else if (/^\d{8}T\d{4}/.test(s)) date = `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(9, 11)}:${s.slice(11, 13)}`;
    else continue;
    const t = new Date(date).getTime();
    if (t < now - 30 * 864e5 || t > now + 150 * 864e5) continue;
    out.push({ rnd: '', date, venue: unesc(e.LOCATION), us: '', opp: '', them: '', title, desc: unesc(e.DESCRIPTION) });
  }
  return out.sort((a, b) => a.date < b.date ? -1 : 1);
}

// Matches only: the title has two team names split by a dash, for example "Heworth U10 – Ackworth Jaguars U10s".
// Training and other events have no dash and are ignored. The end time is not used.
export function parseMatches(text, now = Date.now()) {
  const out = [];
  for (const e of parseIcs(text, '', now)) {
    const mm = e.title.match(/^(.*?)\s[–—-]\s(.*)$/);
    if (!mm) continue;
    const a = mm[1].trim(), b = mm[2].trim(), isUs = s => /ackworth|jaguar|jags/i.test(s), usA = isUs(a), usB = isUs(b);
    if (!usA && !usB) continue;
    let home = usA && !usB ? true : usB && !usA ? false : undefined, neutral;
    const d = e.desc || '', w = d.match(/\b(home|away|neutral)\s+(?:game|match|fixture)\b/i) || (d.length <= 40 ? d.match(/\b(home|away|neutral)\b/i) : null);
    if (w) { const k = w[1].toLowerCase(); if (k === 'neutral') { neutral = true; home = undefined; } else home = k === 'home'; }
    const ours = usB && !usA ? b : a, age = (ours.match(/\bu(?:nder)?\s*-?\s*(\d{1,2})/i) || [])[1] || '';
    out.push({ rnd: '', date: e.date, venue: e.venue, loc: e.venue, home, neutral, us: '', them: '', opp: (usB && !usA ? a : b), age });
  }
  return out;
}
