const $ = s => document.querySelector(s);
const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const U = u => /^(https?:\/\/|\/|mailto:)/.test(u || '') ? E(u) : '#';
const fd = d => new Date(d).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const dd = d => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
const NAV = [['teams', 'Teams'], ['fixtures', 'Fixtures'], ['events', 'Events'], ['news', 'News'], ['matchday', 'Match day'], ['documents', 'Documents'], ['volunteers', 'Volunteers'], ['committee', 'Committee'], ['sponsors', 'Sponsors'], ['contact', 'Contact']];
const q = new URLSearchParams(location.search);

fetch('/api/public').then(r => { if (!r.ok) throw new Error('API ' + r.status); return r.json(); }).then(({ settings: S, items: I, gd: GD = {} }) => {
  const of = k => I.filter(x => x.kind === k), teams = of('team'), pages = of('page'), pg = document.body.dataset.page;
  const tname = t => t.name || 'U' + t.age, lvl = t => t.type && t.type !== 'Auto (by age)' ? t.type : (+t.age >= +(S.compAge || 12) ? 'Competitive' : 'Primary'), comp = t => lvl(t) === 'Competitive', play = t => lvl(t) !== 'Training only';
  const tn = s => { const t = teams.find(x => x.slug === s); return t ? tname(t) : s; };
  const compTeam = s => { const t = teams.find(x => x.slug === s); return !!t && comp(t); };
  const has = f => compTeam(f.team) && f.us !== '' && f.us != null && f.them !== '' && f.them != null;
  const gdFx = [];
  teams.forEach(t => { const g = GD[t.slug] || {}; (g.fixtures || []).forEach((f, i) => { const c = (g.events || []).find(e => e.date.slice(0, 10) === f.date.slice(0, 10)); gdFx.push({ kind: 'fixture', id: 'g' + t.slug + i, team: t.slug, opp: f.opp, date: f.date, venue: f.venue, home: f.home, neutral: f.neutral, loc: f.loc || (c && c.loc) || '', us: f.us, them: f.them, title: f.title }); }); });
  const fx = of('fixture').filter(f => !gdFx.some(g => g.team === f.team)).concat(gdFx);
  const t0 = new Date(); t0.setHours(0, 0, 0, 0);
  const past = f => { const d = new Date(f.date); return !isNaN(d) && d < t0; };
  const asc = (a, b) => a.date < b.date ? -1 : 1, desc = (a, b) => a.date < b.date ? 1 : -1;
  const up = fx.filter(f => !has(f) && !past(f)).sort(asc), res = fx.filter(f => has(f) || past(f)).sort(desc);
  const root = document.documentElement.style;
  ['blue', 'black', 'teal'].forEach(c => S[c] && root.setProperty('--' + c, S[c]));
  const club = S.club || 'Ackworth Jaguars';
  document.title = (pg === 'home' ? '' : pg[0].toUpperCase() + pg.slice(1) + ' | ') + club;
  const OUT = { W: 'Win', D: 'Draw', L: 'Loss' };
  const homeAddr = String(S.address || '').split('\n').filter(Boolean).join(', ');
  const fxRow = f => {
    const o = has(f) ? (+f.us > +f.them ? 'W' : +f.us < +f.them ? 'L' : 'D') : '', dest = f.home === true ? homeAddr : (f.loc || '');
    const tag = f.neutral ? '<span class="tag">Neutral</span>' : f.home === true ? '<span class="tag h">Home</span>' : f.home === false ? '<span class="tag">Away</span>' : '';
    const right = o ? `<div class="rs"><span class="res ${o}">${OUT[o]}</span><span class="sc ${o}">${E(f.us)} - ${E(f.them)}</span></div>` : (compTeam(f.team) && past(f) ? '<span class="muted">Result awaited</span>' : (!past(f) && dest ? `<a class="dir noprint" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}" target="_blank" rel="noopener">Directions</a>` : ''));
    return `<div class="fx"><div><b>${f.title ? E(f.title.toLowerCase().includes(tn(f.team).toLowerCase()) ? f.title : tn(f.team) + ': ' + f.title) : E(tn(f.team)) + ' v ' + E(f.opp)}</b><small>${tag}${f.date ? fd(f.date) : ''}${f.venue ? ' · ' + E(f.venue) : ''}</small></div>${right}</div>`;
  };
  const wrap = (cls, h) => `<section class="band ${cls}"><div class="wrap">${h}</div></section>`;
  const head = (t, p) => wrap('blue', `<h1>${t}</h1>${p ? `<p>${p}</p>` : ''}`);
  const lines = s => String(s || '').split('\n').filter(Boolean);
  const none = t => `<span class="muted">${t}</span>`;
  const soc = [['facebook', 'Facebook'], ['instagram', 'Instagram'], ['youtube', 'YouTube'], ['messenger', 'Messenger']].filter(([k]) => S[k]).map(([k, l]) => `<a href="${U(S[k])}">${l}</a>`).join('');

  const extra = pages.filter(x => x.menu !== 'Hide from menu').map(x => x.type === 'Page with text' ? ['/p/' + x.slug, x.title, 0] : [x.url, x.title, 1]);
  const xl = extra.map(([u, l, ext]) => `<a href="${U(u)}"${ext ? ' target="_blank" rel="noopener"' : ''} class="${!ext && location.pathname === u ? 'on' : ''}">${E(l)}</a>`).join('');
  const joinHref = S.joinUrl ? U(S.joinUrl) : '/join.html', joinExt = S.joinUrl ? ' target="_blank" rel="noopener"' : '';
  const lk = ([h, l]) => `<a href="/${h}.html" class="${pg === h ? 'on' : ''}">${l}</a>`;
  const paras = s => String(s || '').split(/\n{2,}/).filter(Boolean).map(x => `<p class="pre">${E(x).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>')}</p>`).join('');
  $('#hdr').innerHTML = `<div class="wrap nav"><a class="brand" href="/"><img src="${U(S.logo || '/assets/logo.png')}" alt=""><span>${E(club)}</span></a><nav id="nv">${NAV.map(lk).join('')}${xl}</nav><a class="join" href="${joinHref}"${joinExt}>Join the Jags</a><button id="tg" aria-label="Menu">☰</button></div>`;
  $('#tg').onclick = () => $('#nv').classList.toggle('open');
  const fit = () => { const hd = $('#hdr'); hd.classList.remove('burger', 'nobrand'); $('#nv').classList.remove('open'); if (hd.offsetHeight > 90) hd.classList.add('nobrand'); if (hd.offsetHeight > 90) hd.classList.add('burger'); };
  fit(); addEventListener('resize', fit); if (document.fonts) document.fonts.ready.then(fit);
  $('#ftr').innerHTML = `<div class="wrap"><div class="fg"><div><h3>${E(club)}</h3><p>${E(S.hero || '')}</p></div><div><h3>Find us</h3><p class="pre">${E(S.address)}</p></div><div><h3>Follow</h3>${soc}${S.email ? `<a href="mailto:${E(S.email)}">${E(S.email)}</a>` : ''}</div><div><h3>Club</h3><a href="/documents.html">Documents</a><a href="/matchday.html">Match day</a><a href="/contact.html">Contact</a>${xl}<a href="/admin/">Club login</a></div></div><small>© ${new Date().getFullYear()} ${E(club)} · ${E(S.season || '')}</small></div>`;

  const ladder = l => { const opt = l.head.map(x => /^(for|agst)$/i.test(x) ? ' class="opt"' : ''); return `<div class="lw"><table class="lt"><thead><tr>${l.head.map((x, i) => `<th${opt[i]}>${E(x)}</th>`).join('')}</tr></thead><tbody>${l.rows.map(r => `<tr class="${/ackworth/i.test(r[1]) ? 'us' : ''}">${r.map((c, i) => `<td${opt[i]}>${E(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`; };
  const stamp = g => `<p class="muted" style="margin-top:12px">Last updated ${new Date(g.checked).toLocaleString('en-GB', { timeZone: 'Europe/London', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}${g.ladder.uploaded ? ' · Game Day table last uploaded ' + E(g.ladder.uploaded) : ''} · Data from GameDay</p>`;
  const gdBlock = (t, title) => { const g = GD[t.slug]; return g && g.ladder ? `<h2>${title}</h2>${ladder(g.ladder)}${stamp(g)}` : ''; };
  const gdBand = t => { const b = gdBlock(t, 'League table'); return b ? wrap('', b) : ''; };
  const matchDay = docs => {
    const dv = (k, d) => S[k] === undefined ? d : S[k], tsel = q.get('t');
    const welcome = dv('visitorWelcome', 'Welcome to Jaguar Park. Everything visiting teams and families need for match day is on this page. Please share it with your team.');
    const park = lines(dv('parking', 'Visiting teams, please park in the away car park (see the what3words location below).')), nopark = lines(dv('noParking', ''));
    const doList = lines(dv('sidelineDo', '')), dontList = lines(dv('sidelineDont', 'No smoking\nNo vaping\nNo alcohol'));
    const tuck = dv('tuckShop', 'Hot and cold drinks and a large range of savoury and sweet snacks. We accept cash or card.');
    const ul = (a, c) => a.length ? `<ul class="tick ${c}">${a.map(x => `<li>${E(x)}</li>`).join('')}</ul>` : '';
    const vols = t => { const v = lines(t.volunteers).map(l => l.split('|')); if (comp(t) && !v.some(r => /water/i.test(r[0]))) v.push(['Water Carrier', '']); return v.map(([r, n]) => `<div class="fx"><div><b>${E(r)}</b><small>${E(n) || 'To be confirmed'}</small></div></div>`).join(''); };
    const sec = t => `<div class="card tm" id="${E(t.slug)}"><h3>${tname(t)}</h3><div class="two"><div><h4>After the match</h4><p>${E(t.afterMatch) || none('To be confirmed.')}</p>${t.afterMatchLink ? `<p class="noprint"><a class="btn k" href="${U(t.afterMatchLink)}">Map</a></p>` : ''}${t.playDay ? `<h4>Usual match day</h4><p>${E(t.playDay)}${t.playVenue ? ' · ' + E(t.playVenue) : ''}</p>` : ''}</div><div><h4>Coaches</h4><p class="pre">${E(t.coaches) || none('Not added yet.')}</p><h4>Volunteers</h4>${vols(t) || none('Not added yet.')}</div></div></div>`;
    const tl = teams.filter(play), shown = tl.filter(x => !tsel || x.slug === tsel);
    const mail = 'mailto:?subject=' + encodeURIComponent('Match day information: ' + club) + '&body=' + encodeURIComponent('Match day information for visiting teams and families: ' + location.href);
    const side = [doList.length ? `<h4>You can</h4>${ul(doList, 'yes')}` : '', dontList.length ? `<h4>Please do not</h4>${ul(dontList, 'no')}` : ''].filter(Boolean);
    return wrap('blue', `<h1>Match day</h1><p>${E(welcome)}</p><p class="noprint"><button class="btn w" id="cp" type="button">Copy link to share</button><a class="btn w" href="${mail}">Email this page</a><button class="btn w" id="pr" type="button">Print or save as PDF</button></p>`) +
      wrap('', `<div class="two"><div><h2>Find us</h2><p class="pre">${E(S.address)}</p>${S.map ? `<p class="noprint"><a class="btn" href="${U(S.map)}">Open in Google Maps</a></p>` : ''}${lines(S.w3w).map(l => { const [a, b] = l.split('|'); return `<a class="doc" href="https://what3words.com/${E(b)}">${E(a)}<small>///${E(b)}</small></a>`; }).join('')}</div><div><h2>Parking</h2>${park.length ? `<h4>Please park</h4>${ul(park, 'yes')}` : ''}${nopark.length ? `<h4>Please do not park</h4>${ul(nopark, 'no')}` : ''}${!park.length && !nopark.length ? '<p class="muted">Parking details coming soon.</p>' : ''}</div></div>`) +
      (side.length ? wrap('grey', `<h2>On the sideline</h2><div class="${side.length > 1 ? 'two' : ''}">${side.map(x => `<div>${x}</div>`).join('')}</div>`) : '') +
      (tuck ? wrap('', `<h2>Tuck shop</h2><p>${E(tuck)}</p>`) : '') +
      wrap('grey', `<h2>Your age group</h2><p class="noprint">${[['', 'All teams']].concat(tl.map(x => [x.slug, tname(x)])).map(([s, n]) => `<a class="btn ${s === (tsel || '') ? '' : 'w'}" style="${s === (tsel || '') ? '' : 'border:1px solid var(--line)'}" href="?t=${E(s)}">${E(n)}</a>`).join('')}</p>${shown.map(sec).join('') || '<p class="muted">No teams yet.</p>'}`) +
      wrap('', `${docs}<h2>Next matches</h2>${up.slice(0, 5).map(fxRow).join('') || '<p class="muted">Nothing scheduled.</p>'}<p class="noprint" style="margin-top:16px"><a class="btn k" href="/contact.html">Send us a message</a></p>`);
  };
  let h = '';
  if (pg === 'home') {
    const news = of('news').sort((a, b) => a.date < b.date ? 1 : -1).slice(0, 3), sp = of('sponsor');
    const wk0 = new Date(); wk0.setHours(0, 0, 0, 0); wk0.setDate(wk0.getDate() - ((wk0.getDay() + 6) % 7));
    const wk1 = new Date(wk0); wk1.setDate(wk1.getDate() + 7); const wend = new Date(wk1); wend.setDate(wend.getDate() - 1);
    const week = fx.filter(f => { const d = new Date(f.date); return d >= wk0 && d < wk1; }).sort(asc), wd = [];
    week.forEach(f => { const k = f.date.slice(0, 10); let g = wd.find(x => x.k === k); if (!g) wd.push(g = { k, items: [] }); g.items.push(f); });
    const wl = d => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
    const comps = teams.filter(comp).map(t => { const last = fx.filter(f => f.team === t.slug && has(f)).sort(asc).pop(); return (last ? `<h2>${tname(t)}: latest result</h2>${fxRow(last)}` : '') + gdBlock(t, tname(t) + ' league table'); }).filter(Boolean);
    let flip = 0; const band = x => wrap(flip++ % 2 ? 'grey' : '', x);
    const bg = S.heroImg || '', ov = Math.min(100, Math.max(0, +(S.heroOverlay === undefined || S.heroOverlay === '' ? 25 : S.heroOverlay)));
    h = `<section class="hero" ${bg ? `style="background-image:linear-gradient(color-mix(in srgb,var(--blue) ${ov}%,transparent),color-mix(in srgb,var(--blue) ${ov}%,transparent)),url('${U(bg)}')"` : ''}><div class="wrap"><h1>${E(S.hero || club)}</h1><p>${E(S.intro || '')}</p><a class="btn w" href="${joinHref}"${joinExt}>Join the Jags</a><a class="btn w" href="/fixtures.html">Fixtures and results</a></div></section>` +
      band(`<h2>This week</h2><p class="muted">Monday ${wl(wk0)} to Sunday ${wl(wend)}</p>${wd.map(g => `<h3>${new Date(g.k + 'T12:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>${g.items.map(fxRow).join('')}`).join('') || '<p class="muted">No fixtures this week.</p>'}<p style="margin-top:16px"><a class="btn" href="/fixtures.html">All fixtures and results</a></p>`) +
      (comps.length ? band(comps.join('')) : '') +
      band(`<h2>Our teams</h2><div class="grid">${teams.map(t => `<a class="card" href="/teams.html?t=${E(t.slug)}"><h3>${tname(t)}</h3><p>${lvl(t)}</p></a>`).join('')}</div>`) +
      (news.length ? band(`<h2>Latest news</h2><div class="grid">${news.map(x => `<a class="card" href="/news.html"><h3>${E(x.title)}</h3><p>${dd(x.date)}</p></a>`).join('')}</div>`) : '') +
      (sp.length ? band(`<h2>Our sponsors</h2><div class="logos">${sp.map(s => `<a href="${U(s.url)}"><img src="${U(s.logo)}" alt="${E(s.name)}"></a>`).join('')}</div>`) : '');
  } else if (pg === 'teams') {
    const t = teams.find(x => x.slug === q.get('t'));
    if (!t) h = head('Teams', `${E(S.season || '')} squads`) + wrap('', `<div class="grid">${teams.map(x => `<a class="card" href="?t=${E(x.slug)}"><h3>${tname(x)}</h3><p>${lvl(x)}</p></a>`).join('')}</div>`);
    else {
      const mine = fx.filter(f => f.team === t.slug), c = comp(t);
      h = head(tname(t) + (t.name ? '' : 's'), `${lvl(t)} · ${E(club)} · ${E(S.season || '')}`) + wrap('',
        `${t.img ? `<img class="tp" src="${U(t.img)}" alt="${tname(t)}">` : ''}${c && (t.gdFix || t.gdLadder) ? `<p>${t.gdFix ? `<a class="btn t" href="${U(t.gdFix)}">Fixtures and results on Game Day</a>` : ''}${t.gdLadder ? `<a class="btn k" href="${U(t.gdLadder)}">League table</a>` : ''}</p>` : ''}` +
        `<div class="two"><div><h2>Training</h2>${lines(t.sessions).map(l => { const [d, tm, loc] = l.split('|'); return `<div class="fx"><div><b>${E(d)} ${E(tm || '')}</b><small>${E(loc || '')}</small></div></div>`; }).join('') || `<p>${none('To be confirmed.')}</p>`}` +
        (play(t) ? `<h2>Match days</h2><div class="fx"><div><b>${E(t.playDay || 'To be confirmed')}</b><small>${E(t.playVenue || '')}</small></div></div><p class="muted">${E(S.defaultRule || '')}</p>` : `<p class="muted">${E(tname(t))} train only and do not play matches yet.</p>`) +
        `</div><div><h2>Coaches</h2><p class="pre">${E(t.coaches) || none('Not added yet.')}</p>${t.volunteers ? `<h2>Volunteers</h2>${lines(t.volunteers).map(l => { const [r, n] = l.split('|'); return `<div class="fx"><div><b>${E(r)}</b><small>${E(n || '')}</small></div></div>`; }).join('')}` : ''}<h2>About</h2><p class="pre">${E(t.info) || none('Not added yet.')}</p></div></div>`) +
        (play(t) ? wrap('grey', `<div class="two"><div><h2>Fixtures</h2>${mine.filter(f => !has(f) && !past(f)).sort(asc).map(fxRow).join('') || '<p class="muted">None scheduled.</p>'}</div><div><h2>${c ? 'Results' : 'Previous fixtures'}</h2>${mine.filter(f => has(f) || past(f)).sort(desc).map(fxRow).join('') || `<p class="muted">${c ? 'No results yet.' : 'None yet.'}</p>`}</div></div>`) : '') + gdBand(t);
    }
  } else if (pg === 'fixtures') {
    const t = q.get('t'), f = a => a.filter(x => !t || x.team === t);
    h = head('Fixtures and results', E(S.season || '')) + wrap('', `<p>${[['', 'All teams']].concat(teams.filter(play).map(x => [x.slug, tname(x)])).map(([s, n]) => `<a class="btn ${s === (t || '') ? '' : 'w'}" style="${s === (t || '') ? '' : 'border:1px solid var(--line)'}" href="?t=${E(s)}">${E(n)}</a>`).join('')}</p><div class="two"><div><h2>Upcoming</h2>${f(up).map(fxRow).join('') || '<p class="muted">Nothing scheduled.</p>'}</div><div><h2>Previous fixtures and results</h2>${f(res).map(fxRow).join('') || '<p class="muted">None yet.</p>'}</div></div>`);
  } else if (pg === 'events') {
    const tq = q.get('t'), evs = [];
    teams.forEach(t => { const g = GD[t.slug] || {}; if (g.events && g.events.length) g.events.forEach((e, i) => evs.push({ ...e, kind: 'event', id: 'e' + t.slug + i, team: t.slug, loc: e.loc || e.venue, us: '', them: '' })); else fx.filter(f => f.team === t.slug).forEach(f => evs.push(f)); });
    const shown = evs.filter(e => !past(e) && (!tq || e.team === tq)).sort(asc), months = [];
    shown.forEach(e => { const k = e.date.slice(0, 7); let m = months.find(x => x.k === k); if (!m) months.push(m = { k, items: [] }); m.items.push(e); });
    h = head('Events', 'Training, matches and club events coming up.') + wrap('', `<p>${[['', 'All teams']].concat(teams.map(x => [x.slug, tname(x)])).map(([s, n]) => `<a class="btn ${s === (tq || '') ? '' : 'w'}" style="${s === (tq || '') ? '' : 'border:1px solid var(--line)'}" href="?t=${E(s)}">${E(n)}</a>`).join('')}</p>${months.map(m => `<h2>${new Date(m.k + '-15T12:00').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</h2>${m.items.map(fxRow).join('')}`).join('') || '<p class="muted">Nothing coming up yet.</p>'}`);
  } else if (pg === 'news') {
    h = head('News') + wrap('', of('news').sort((a, b) => a.date < b.date ? 1 : -1).map(x => `<article style="margin-bottom:40px"><h2>${E(x.title)}</h2><p class="muted">${x.date ? dd(x.date) : ''}</p>${x.img ? `<img src="${U(x.img)}" alt="" style="margin-bottom:16px;border-radius:6px;max-height:420px">` : ''}<p class="pre">${E(x.body)}</p></article>`).join('') || '<p class="muted">No news yet.</p>');
  } else if (pg === 'documents' || pg === 'matchday') {
    const groups = pg === 'documents' ? ['Parents', 'Players', 'Coaches', 'Volunteers', 'Governance'] : ['Match day'];
    const docs = groups.map(g => { const d = of('doc').filter(x => x.group === g); return d.length ? `<h2>${g}</h2>${d.map(x => `<a class="doc" href="${U(x.url)}">${E(x.title)}${x.note ? `<small>${E(x.note)}</small>` : ''}</a>`).join('')}` : ''; }).join('');
    if (pg === 'documents') h = head('Documents', 'Codes of conduct, rules and governance for parents, players, coaches and volunteers.') + wrap('', docs || '<p class="muted">No documents yet.</p>');
    else h = matchDay(docs);
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
  if (pg === 'matchday') {
    $('#cp').onclick = async () => { try { await navigator.clipboard.writeText(location.href); $('#cp').textContent = 'Link copied'; } catch (e) { prompt('Copy this link', location.href); } };
    $('#pr').onclick = () => print();
  }
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
