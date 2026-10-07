const $ = s => document.querySelector(s);
const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const U = u => /^(https?:\/\/|\/|mailto:)/.test(u || '') ? E(u) : '#';
const fd = d => new Date(d).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const dd = d => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
const NAV = [['teams', 'Teams'], ['fixtures', 'Fixtures'], ['news', 'News'], ['matchday', 'Match day'], ['documents', 'Documents'], ['contact', 'Contact']];
const MORE = [['volunteers', 'Volunteers'], ['committee', 'Committee'], ['sponsors', 'Sponsors']];
const q = new URLSearchParams(location.search);

fetch('/api/public').then(r => { if (!r.ok) throw new Error('API ' + r.status); return r.json(); }).then(({ settings: S, items: I, gd: GD = {} }) => {
  const of = k => I.filter(x => x.kind === k), teams = of('team'), pages = of('page'), pg = document.body.dataset.page;
  const tname = t => t.name || 'U' + t.age, lvl = t => t.type && t.type !== 'Auto (by age)' ? t.type : (+t.age >= +(S.compAge || 12) ? 'Competitive' : 'Primary'), comp = t => lvl(t) === 'Competitive', play = t => lvl(t) !== 'Training only';
  const tn = s => { const t = teams.find(x => x.slug === s); return t ? tname(t) : s; };
  const has = f => f.us !== '' && f.us != null && f.them !== '' && f.them != null;
  const gdFx = [];
  teams.forEach(t => ((GD[t.slug] || {}).fixtures || []).forEach((f, i) => gdFx.push({ kind: 'fixture', id: 'g' + t.slug + i, team: t.slug, opp: f.opp, date: f.date, venue: f.venue, home: f.home, us: f.us, them: f.them })));
  const fx = of('fixture').filter(f => !gdFx.some(g => g.team === f.team)).concat(gdFx);
  const up = fx.filter(f => !has(f)).sort((a, b) => a.date < b.date ? -1 : 1), res = fx.filter(has).sort((a, b) => a.date < b.date ? -1 : 1);
  const root = document.documentElement.style;
  ['blue', 'black', 'teal'].forEach(c => S[c] && root.setProperty('--' + c, S[c]));
  const club = S.club || 'Ackworth Jaguars';
  document.title = (pg === 'home' ? '' : pg[0].toUpperCase() + pg.slice(1) + ' | ') + club;
  const OUT = { W: 'Win', D: 'Draw', L: 'Loss' };
  const fxRow = f => { const o = has(f) ? (+f.us > +f.them ? 'W' : +f.us < +f.them ? 'L' : 'D') : ''; return `<div class="fx"><div><b>${E(tn(f.team))} v ${E(f.opp)}</b><small>${f.home === true ? '<span class="tag h">Home</span>' : f.home === false ? '<span class="tag">Away</span>' : ''}${f.date ? fd(f.date) : ''}${f.venue ? ' · ' + E(f.venue) : ''}</small></div>${o ? `<div class="rs"><span class="res ${o}">${OUT[o]}</span><span class="sc ${o}">${E(f.us)} - ${E(f.them)}</span></div>` : ''}</div>`; };
  const wrap = (cls, h) => `<section class="band ${cls}"><div class="wrap">${h}</div></section>`;
  const head = (t, p) => wrap('blue', `<h1>${t}</h1>${p ? `<p>${p}</p>` : ''}`);
  const lines = s => String(s || '').split('\n').filter(Boolean);
  const none = t => `<span class="muted">${t}</span>`;
  const soc = [['facebook', 'Facebook'], ['instagram', 'Instagram'], ['youtube', 'YouTube'], ['messenger', 'Messenger']].filter(([k]) => S[k]).map(([k, l]) => `<a href="${U(S[k])}">${l}</a>`).join('');

  const extra = pages.filter(x => x.menu !== 'Hide from menu').map(x => x.type === 'Page with text' ? ['/p/' + x.slug, x.title, 0] : [x.url, x.title, 1]);
  const xl = extra.map(([u, l, ext]) => `<a href="${U(u)}"${ext ? ' target="_blank" rel="noopener"' : ''} class="${!ext && location.pathname === u ? 'on' : ''}">${E(l)}</a>`).join('');
  const lk = ([h, l]) => `<a href="/${h}.html" class="${pg === h ? 'on' : ''}">${l}</a>`;
  const paras = s => String(s || '').split(/\n{2,}/).filter(Boolean).map(x => `<p class="pre">${E(x).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>')}</p>`).join('');
  $('#hdr').innerHTML = `<div class="wrap nav"><a class="brand" href="/"><img src="${U(S.logo || '/assets/logo.png')}" alt=""><span>${E(club)}</span></a><nav id="nv">${NAV.map(lk).join('')}${xl}<div class="dd${MORE.some(([h]) => h === pg) ? ' on' : ''}"><button type="button" id="mr">More ▾</button><div class="ddm">${MORE.map(lk).join('')}</div></div></nav><a class="join" href="/join.html">Join the Jags</a><button id="tg" aria-label="Menu">☰</button></div>`;
  $('#mr').onclick = e => { e.stopPropagation(); $('.dd').classList.toggle('open'); };
  document.addEventListener('click', () => $('.dd').classList.remove('open'));
  $('#tg').onclick = () => $('#nv').classList.toggle('open');
  const fit = () => { const hd = $('#hdr'); hd.classList.remove('burger'); $('#nv').classList.remove('open'); if (hd.offsetHeight > 90) hd.classList.add('burger'); };
  fit(); addEventListener('resize', fit); if (document.fonts) document.fonts.ready.then(fit);
  $('#ftr').innerHTML = `<div class="wrap"><div class="fg"><div><h3>${E(club)}</h3><p>${E(S.hero || '')}</p></div><div><h3>Find us</h3><p class="pre">${E(S.address)}</p></div><div><h3>Follow</h3>${soc}${S.email ? `<a href="mailto:${E(S.email)}">${E(S.email)}</a>` : ''}</div><div><h3>Club</h3><a href="/documents.html">Documents</a><a href="/matchday.html">Match day</a><a href="/contact.html">Contact</a>${xl}<a href="/admin/">Club login</a></div></div><small>© ${new Date().getFullYear()} ${E(club)} · ${E(S.season || '')}</small></div>`;

  const ladder = l => { const opt = l.head.map(x => /^(for|agst)$/i.test(x) ? ' class="opt"' : ''); return `<div class="lw"><table class="lt"><thead><tr>${l.head.map((x, i) => `<th${opt[i]}>${E(x)}</th>`).join('')}</tr></thead><tbody>${l.rows.map(r => `<tr class="${/ackworth/i.test(r[1]) ? 'us' : ''}">${r.map((c, i) => `<td${opt[i]}>${E(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`; };
  const gdBand = t => { const g = GD[t.slug]; if (!g || !g.ladder) return ''; return wrap('grey', `<h2>League table</h2>${ladder(g.ladder)}<p class="muted" style="margin-top:12px">Last updated ${new Date(g.checked).toLocaleString('en-GB', { timeZone: 'Europe/London', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}${g.ladder.uploaded ? ' · Game Day table last uploaded ' + E(g.ladder.uploaded) : ''} · Data from GameDay</p>`); };
  let h = '';
  if (pg === 'home') {
    const n = up[0], l = res[res.length - 1], news = of('news').sort((a, b) => a.date < b.date ? 1 : -1).slice(0, 3), sp = of('sponsor');
    const bg = S.heroImg || '/images/hero.jpg';
    h = `<section class="hero" style="background-image:linear-gradient(90deg,var(--blue) 55%,color-mix(in srgb,var(--blue) 55%,transparent)),url('${U(bg)}')"><div class="wrap"><h1>${E(S.hero || club)}</h1><p>${E(S.intro || '')}</p><a class="btn w" href="/join.html">Join the Jags</a><a class="btn w" href="/fixtures.html">Fixtures and results</a></div></section>` +
      wrap('', `<div class="two"><div><h2>Next match</h2>${n ? fxRow(n) : '<p class="muted">No fixtures added yet.</p>'}</div><div><h2>Latest result</h2>${l ? fxRow(l) : '<p class="muted">No results yet.</p>'}</div></div>`) +
      wrap('grey', `<h2>Our teams</h2><div class="grid">${teams.map(t => `<a class="card" href="/teams.html?t=${E(t.slug)}"><h3>${tname(t)}</h3><p>${lvl(t)}</p></a>`).join('')}</div>`) +
      (news.length ? wrap('', `<h2>Latest news</h2><div class="grid">${news.map(x => `<a class="card" href="/news.html"><h3>${E(x.title)}</h3><p>${dd(x.date)}</p></a>`).join('')}</div>`) : '') +
      (sp.length ? wrap('grey', `<h2>Our sponsors</h2><div class="logos">${sp.map(s => `<a href="${U(s.url)}"><img src="${U(s.logo)}" alt="${E(s.name)}"></a>`).join('')}</div>`) : '');
  } else if (pg === 'teams') {
    const t = teams.find(x => x.slug === q.get('t'));
    if (!t) h = head('Teams', `${E(S.season || '')} squads`) + wrap('', `<div class="grid">${teams.map(x => `<a class="card" href="?t=${E(x.slug)}"><h3>${tname(x)}</h3><p>${lvl(x)}</p></a>`).join('')}</div>`);
    else {
      const mine = fx.filter(f => f.team === t.slug), c = comp(t);
      h = head(tname(t) + (t.name ? '' : 's'), `${lvl(t)} · ${E(club)} · ${E(S.season || '')}`) + wrap('',
        `${t.img ? `<img class="tp" src="${U(t.img)}" alt="${tname(t)}">` : ''}${c && (t.gdFix || t.gdLadder) ? `<p>${t.gdFix ? `<a class="btn t" href="${U(t.gdFix)}">Fixtures and results on Game Day</a>` : ''}${t.gdLadder ? `<a class="btn k" href="${U(t.gdLadder)}">League table</a>` : ''}</p>` : ''}` +
        `<div class="two"><div><h2>Training</h2>${lines(t.sessions).map(l => { const [d, tm, loc] = l.split('|'); return `<div class="fx"><div><b>${E(d)} ${E(tm || '')}</b><small>${E(loc || '')}</small></div></div>`; }).join('') || `<p>${none('To be confirmed.')}</p>`}` +
        (play(t) ? `<h2>Match days</h2><div class="fx"><div><b>${E(t.playDay || 'To be confirmed')}</b><small>${E(t.playVenue || '')}</small></div></div><p class="muted">${E(S.defaultRule || '')}</p>` : `<p class="muted">${E(tname(t))} train only and do not play matches yet.</p>`) +
        `<h2>Coaches</h2><p class="pre">${E(t.coaches) || none('Not added yet.')}</p><h2>About</h2><p class="pre">${E(t.info) || none('Not added yet.')}</p></div>` +
        (play(t) ? `<div><h2>Fixtures</h2>${mine.filter(f => !has(f)).sort((a, b) => a.date < b.date ? -1 : 1).map(fxRow).join('') || '<p class="muted">None scheduled.</p>'}<h2>Results</h2>${mine.filter(has).sort((a, b) => a.date < b.date ? -1 : 1).map(fxRow).join('') || '<p class="muted">No results yet.</p>'}</div></div>` : '</div>')) + gdBand(t);
    }
  } else if (pg === 'fixtures') {
    const t = q.get('t'), f = a => a.filter(x => !t || x.team === t);
    h = head('Fixtures and results', E(S.season || '')) + wrap('', `<p>${[['', 'All teams']].concat(teams.filter(play).map(x => [x.slug, tname(x)])).map(([s, n]) => `<a class="btn ${s === (t || '') ? '' : 'w'}" style="${s === (t || '') ? '' : 'border:1px solid var(--line)'}" href="?t=${E(s)}">${E(n)}</a>`).join('')}</p><div class="two"><div><h2>Upcoming</h2>${f(up).map(fxRow).join('') || '<p class="muted">Nothing scheduled.</p>'}</div><div><h2>Results</h2>${f(res).map(fxRow).join('') || '<p class="muted">No results yet.</p>'}</div></div>`);
  } else if (pg === 'news') {
    h = head('News') + wrap('', of('news').sort((a, b) => a.date < b.date ? 1 : -1).map(x => `<article style="margin-bottom:40px"><h2>${E(x.title)}</h2><p class="muted">${x.date ? dd(x.date) : ''}</p>${x.img ? `<img src="${U(x.img)}" alt="" style="margin-bottom:16px;border-radius:6px;max-height:420px">` : ''}<p class="pre">${E(x.body)}</p></article>`).join('') || '<p class="muted">No news yet.</p>');
  } else if (pg === 'documents' || pg === 'matchday') {
    const groups = pg === 'documents' ? ['Parents', 'Players', 'Coaches', 'Volunteers', 'Governance'] : ['Match day'];
    const docs = groups.map(g => { const d = of('doc').filter(x => x.group === g); return d.length ? `<h2>${g}</h2>${d.map(x => `<a class="doc" href="${U(x.url)}">${E(x.title)}${x.note ? `<small>${E(x.note)}</small>` : ''}</a>`).join('')}` : ''; }).join('');
    if (pg === 'documents') h = head('Documents', 'Codes of conduct, rules and governance for parents, players, coaches and volunteers.') + wrap('', docs || '<p class="muted">No documents yet.</p>');
    else h = head('Match day', 'Where to go and what to know on match days.') + wrap('', `<div class="two"><div><h2>Address</h2><p class="pre">${E(S.address)}</p>${S.map ? `<a class="btn" href="${U(S.map)}">Open in Google Maps</a>` : ''}<h2>what3words</h2>${lines(S.w3w).map(l => { const [a, b] = l.split('|'); return `<a class="doc" href="https://what3words.com/${E(b)}">${E(a)}<small>///${E(b)}</small></a>`; }).join('')}</div><div><h2>Next matches</h2>${up.slice(0, 5).map(fxRow).join('') || '<p class="muted">Nothing scheduled.</p>'}${docs}<h2>Contact</h2><a class="btn k" href="/contact.html">Send us a message</a></div></div>`);
  } else if (pg === 'committee') {
    const ms = of('member');
    h = head('Committee', 'The volunteers who run the club.') + wrap('', `<div class="grid">${ms.map(m => `<div class="card mem">${m.img ? `<img src="${U(m.img)}" alt="${E(m.name)}">` : ''}<h3>${E(m.name)}</h3><b>${E(m.role)}</b><p class="pre">${E(m.desc)}</p></div>`).join('') || '<p class="muted">No committee members added yet.</p>'}</div>`);
  } else if (pg === 'volunteers') {
    const rs = of('role');
    h = head('Volunteers', 'The people who make training and match days happen, and how to get involved.') + wrap('', rs.length ? `<p>${rs.map(r => `<a class="btn w" style="border:1px solid var(--line)" href="#r${r.id}">${E(r.title)}</a>`).join('')}</p>` + rs.map(r => `<section id="r${r.id}" style="margin:36px 0"><h2>${E(r.title)}</h2>${r.renew ? `<p><b>${E(r.renew)}</b></p>` : ''}<p class="pre">${E(r.summary) || none('Details coming soon.')}</p>${r.how ? `<h3>How to register</h3><p class="pre">${E(r.how)}</p>` : ''}${lines(r.links).map(l => { const [a, b] = l.split('|'); return `<a class="doc" href="${U(b)}">${E(a)}</a>`; }).join('')}</section>`).join('') : '<p class="muted">No roles added yet.</p>');
  } else if (pg === 'sponsors') {
    h = head('Sponsors', 'Thank you to the businesses who support the Jaguars.') + wrap('', `<div class="logos">${of('sponsor').map(s => `<a href="${U(s.url)}"><img src="${U(s.logo)}" alt="${E(s.name)}"></a>`).join('') || '<p class="muted">No sponsors added yet.</p>'}</div>`);
  } else if (pg === 'join') {
    h = head('Join the Jags', 'New to the club? Here is how to get started.') + wrap('', `<div class="grid">${lines(S.joinText).map((l, i) => `<div class="card"><h3>${i + 1}</h3><p>${E(l)}</p></div>`).join('')}</div><p style="margin-top:24px">${S.joinUrl ? `<a class="btn" href="${U(S.joinUrl)}">Become a Jaguar</a>` : ''}</p>`);
  } else if (pg === 'page') {
    const slug = decodeURIComponent(location.pathname.split('/')[2] || ''), x = pages.find(y => y.slug === slug);
    if (!x) h = head('Page not found') + wrap('', '<p>Sorry, we could not find that page.</p>');
    else if (x.type !== 'Page with text') { h = head(E(x.title)) + wrap('', `<p><a class="btn" href="${U(x.url)}">Continue to ${E(x.title)}</a></p>`); if (/^https?:\/\//.test(x.url || '')) location.replace(x.url); }
    else { document.title = x.title + ' | ' + club; h = head(E(x.title)) + wrap('', `${x.img ? `<img class="tp" src="${U(x.img)}" alt="">` : ''}${paras(x.body)}`); }
  } else if (pg === 'contact') {
    h = head('Contact us', E(S.contactIntro || 'Send us a message and we will get back to you.')) + wrap('', `<div class="two"><form class="cf" id="cf"><label>Your name<input name="name" required maxlength="100"></label><label>Your email<input name="email" type="email" required></label><label>Message<textarea name="message" rows="6" required maxlength="4000"></textarea></label><div class="hp" aria-hidden="true"><input name="website" tabindex="-1" autocomplete="off"></div>${S.turnstile ? `<div class="cf-turnstile" data-sitekey="${E(S.turnstile)}"></div>` : ''}<p id="cm" style="font-weight:600"></p><button class="btn" type="submit">Send message</button></form><div><h2>Find us</h2><p class="pre">${E(S.address)}</p>${S.map ? `<a class="btn" href="${U(S.map)}">Open in Google Maps</a>` : ''}</div></div>`);
  }
  $('#main').innerHTML = h;
  if (pg === 'contact') {
    if (S.turnstile) { const s = document.createElement('script'); s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'; s.async = true; document.head.appendChild(s); }
    $('#cf').onsubmit = async e => {
      e.preventDefault();
      const f = new FormData(e.target), m = $('#cm'); m.textContent = 'Sending…';
      try {
        const r = await fetch('/api/contact', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: f.get('name'), email: f.get('email'), message: f.get('message'), website: f.get('website'), token: f.get('cf-turnstile-response') }) });
        const j = await r.json(); if (!r.ok) throw new Error(j.error);
        e.target.reset(); m.textContent = 'Thank you. Your message has been sent.'; if (window.turnstile) turnstile.reset();
      } catch (x) { m.textContent = x.message; }
    };
  }
}).catch(e => { console.error(e); $('#main').innerHTML = '<section class="band"><div class="wrap"><h2>Site data could not load</h2><p>This site needs its Cloudflare Worker running. Open it from the deployed address or from <b>npx wrangler dev</b>, not by double-clicking the file.</p></div></section>'; });
