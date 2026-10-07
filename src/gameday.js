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
