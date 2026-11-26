/* Travel – die Lieblingsorte der Familie DJNP.
   Eine Datei, ohne Build-Schritt. Daten in Supabase (Tabellen travel_*), Fotos im Speicher "travel". */
(function () {
'use strict';

const CFG = window.TRAVEL_CONFIG || {};
const COUNTRIES = window.COUNTRIES || {};
const BUCKET = 'travel';
const NOM = 'https://nominatim.openstreetmap.org';
const PIX = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

/* ---------- Kleine Helfer ---------- */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const uid = () => (window.crypto && crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '').slice(0, 20) : Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
const pad = n => String(n).padStart(2, '0');
const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const fmt = d => { if (!d) return ''; try { return new Date(d + 'T12:00:00').toLocaleDateString('de-AT', {day: 'numeric', month: 'short', year: 'numeric'}); } catch (e) { return d; } };
const join = a => a.length > 1 ? a.slice(0, -1).join(', ') + ' und ' + a[a.length - 1] : (a[0] || '');
const asUrl = u => /^https?:\/\//i.test(u) ? u : 'https://' + u;
const dist = (a1, o1, a2, o2) => { const r = Math.PI / 180, x = (o2 - o1) * r * Math.cos((a1 + a2) / 2 * r), y = (a2 - a1) * r; return Math.sqrt(x * x + y * y) * 6371; };
const km = d => d < 1 ? `${Math.round(d * 1000 / 50) * 50} m` : d < 10 ? `${d.toFixed(1).replace('.', ',')} km` : `${Math.round(d)} km`;

const PEOPLE = [{k: 'D', n: 'Dagmar', c: '#D45C84'}, {k: 'J', n: 'Jürgen', c: '#515455'}, {k: 'N', n: 'Nina', c: '#8A6FC4'}, {k: 'P', n: 'Philip', c: '#3E8E9A'}];
const DOGS = [{k: 'Ivie', n: 'Ivie'}, {k: 'Frida', n: 'Frida'}];
const PK = PEOPLE.map(p => p.k);
const GROUPS = {essen: 'Essen & Trinken', schlafen: 'Schlafen', erleben: 'Erleben', event: 'Events', kontakt: 'Kontakte'};
const GSHORT = {essen: 'Essen', schlafen: 'Schlafen', erleben: 'Erleben', event: 'Events', kontakt: 'Kontakte'};
const emptyF = () => ({people: [], dog: false, stamm: false, group: '', trip: '', country: ''});
const CATS = {restaurant: ['Restaurant', 'essen'], bar: ['Bar', 'essen'], cafe: ['Café', 'essen'], heuriger: ['Heuriger / Weinbar', 'essen'],
  hotel: ['Hotel', 'schlafen'], fewo: ['Ferienwohnung', 'schlafen'], strand: ['Strand', 'erleben'], aussicht: ['Aussicht', 'erleben'],
  wanderung: ['Wanderung', 'erleben'], sehenswert: ['Sehenswürdigkeit', 'erleben'], konzert: ['Konzert', 'event'], fussball: ['Fußball', 'event'], kontakt: ['Guter Kontakt', 'kontakt']};
const DOG = {willkommen: ['Hunde willkommen', 2], erlaubt: ['Hunde erlaubt', 1], draussen: ['Nur draußen / Terrasse', 1], ohne: ['Ohne Hund', 0], '': ['Noch nicht getestet', 0]};
const NOTIF = [['eintraege', 'Neue Lieblingsorte', 'Wenn jemand aus der Familie etwas einträgt'], ['besuche', 'Neue Besuche und Fotos', 'Wenn jemand einen Besuch oder Fotos ergänzt'], ['erinnerungen', 'Erinnerungen', '„Heute vor … Jahren wart ihr in …“']];

const I = {
  essen: '<path d="M7 3v8m-2-8v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-2.2 2-2.2 6 0 8v10"/>',
  schlafen: '<path d="M3 19V6m0 9h18v4m0-4v-3a3 3 0 0 0-3-3h-7v6"/><circle cx="7" cy="11" r="1.8"/>',
  erleben: '<path d="m3 19 6-9 4 6 3-4 5 7Z"/><circle cx="17" cy="6" r="2"/>',
  event: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
  kontakt: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
  paw: '<g fill="currentColor" stroke="none"><ellipse cx="12" cy="16.3" rx="4.6" ry="3.7"/><circle cx="5.8" cy="10.8" r="2"/><circle cx="9.6" cy="6.8" r="2"/><circle cx="14.4" cy="6.8" r="2"/><circle cx="18.2" cy="10.8" r="2"/></g>',
  heart: '<path d="M12 20.5 4.6 13.1a4.8 4.8 0 0 1 6.8-6.8l.6.6.6-.6a4.8 4.8 0 0 1 6.8 6.8Z"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4Z"/><circle cx="12" cy="13.5" r="3.5"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  back: '<path d="m15 18-6-6 6-6"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3Z"/>',
  chat: '<path d="M4 20l1.3-4A8 8 0 1 1 8 19.3Z"/>', copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>', plus: '<path d="M12 5v14M5 12h14"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3Z"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2Zm0 0v16M8 7h7"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4Zm4 4h4"/>',
  gps: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16Z"/>', all: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>', star: '<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.9Z"/>', search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  download: '<path d="M12 4v11m-5-5 5 5 5-5M5 20h14"/>', print: '<path d="M7 9V4h10v5M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M7 14h10v6H7Z"/>'
};
const ic = (n, s = 20) => `<svg class="i" width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true">${I[n] || ''}</svg>`;
const person = k => PEOPLE.find(p => p.k === k);
const av = (k, cls = '') => { const p = person(k); return p ? `<span class="av ${cls}" style="background:${p.c}" title="${esc(p.n)}">${p.k}</span>` : `<span class="av dog ${cls}" title="${esc(k)}">${ic('paw', 14)}</span>`; };
const avs = list => `<span class="avs">${list.map(k => av(k)).join('')}</span>`;
const grp = e => e.cat === 'custom' ? (e.catGroup || 'erleben') : (CATS[e.cat] || ['', 'erleben'])[1];
const catLabel = e => e.cat === 'custom' ? (e.catText || 'Ort') : (CATS[e.cat] || ['Ort'])[0];
const cName = c => (COUNTRIES[c] || [c || ''])[0];
const flag = c => /^[A-Z]{2}$/.test(c || '') ? String.fromCodePoint(...[...c].map(x => 127397 + x.charCodeAt(0))) : '';
const whoAll = e => { const s = new Set(); e.visits.forEach(v => (v.who || []).forEach(k => s.add(k))); return [...PK, ...DOGS.map(d => d.k)].filter(k => s.has(k)); };
const lastDate = e => e.visits.map(v => v.date).sort().pop() || '';
const dogOk = e => ['willkommen', 'erlaubt', 'draussen'].includes(e.dog);
/* Stammort: automatisch ab STAMM_AB Besuchen, sonst mit einem Tipp; e.stamm: null = automatisch, true = ja, false = nein */
const STAMM_AB = 3;
const STAMM = {restaurant: 'Stammlokal', bar: 'Stammbar', cafe: 'Stammcafé', heuriger: 'Stammheuriger', hotel: 'Stammhotel', fewo: 'Stammquartier', strand: 'Stammstrand'};
const STAMM_GRP = {essen: 'Stammlokal', schlafen: 'Stammquartier'};
const stammLabel = e => STAMM[e.cat] || STAMM_GRP[grp(e)] || 'Stammplatz';
const stammFem = e => e.cat === 'bar';
const unser = (e, cap) => (cap ? 'U' : 'u') + (stammFem(e) ? 'nsere' : 'nser');
const isStamm = e => e.stamm === true || (e.stamm !== false && e.visits.length >= STAMM_AB);
const stammNext = e => { const auto = e.visits.length >= STAMM_AB; return isStamm(e) ? (auto ? false : null) : (auto ? null : true); };
const hasPos = e => typeof e.lat === 'number' && typeof e.lng === 'number';
const placeQuery = e => [e.name, e.address || e.city, cName(e.country)].filter(Boolean).join(', ');
const mapsUrl = e => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(placeQuery(e));
const routeUrl = e => 'https://www.google.com/maps/dir/?api=1&destination=' + (hasPos(e) ? `${e.lat},${e.lng}` : encodeURIComponent(placeQuery(e)));
const customCats = () => { const m = new Map(); S.places.filter(e => e.cat === 'custom' && e.catText).forEach(e => m.set(e.catText, e.catGroup || 'erleben')); return [...m].sort((a, b) => a[0].localeCompare(b[0], 'de')); };
const countryOpts = sel => {
  const used = [...new Set(S.places.map(e => e.country))].filter(c => COUNTRIES[c]).sort((a, b) => cName(a).localeCompare(cName(b), 'de'));
  const all = Object.keys(COUNTRIES).sort((a, b) => cName(a).localeCompare(cName(b), 'de'));
  const o = c => `<option value="${c}" ${c === sel ? 'selected' : ''}>${esc(cName(c))}</option>`;
  return `<option value="">Bitte wählen</option>${used.length ? `<optgroup label="Schon bereist">${used.map(o).join('')}</optgroup>` : ''}<optgroup label="Alle Länder (${all.length})">${all.map(c => `<option value="${c}" ${c === sel && !used.includes(c) ? 'selected' : ''}>${esc(cName(c))}</option>`).join('')}</optgroup>`;
};

/* ---------- Zustand ---------- */
const S = {me: null, places: [], trips: [], notif: null, view: 'karte', detail: null, f: emptyF(), q: '',
  draft: null, share: null, prevView: 'karte', buch: null, mapMode: 'strassen', urls: {}, near: null, sortNear: false, loaded: false};
let sb = null, session = null, channel = null;

let tt; const toast = (msg, ms = 2600) => { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), ms); };
const setSync = st => { const d = $('#sync'); if (!d) return; d.className = 'sync' + (st === 'ok' ? '' : st === 'offline' ? ' off' : ' err'); d.title = st === 'ok' ? 'Verbunden' : st === 'offline' ? 'Offline – zeigt den letzten Stand' : 'Verbindungsproblem'; };
const byId = id => S.places.find(e => e.id === id);
const trip = id => S.trips.find(t => t.id === id);
const fail = (what, err) => { if (window.console) console.error(what, err); toast(`${what} hat nicht geklappt. Bitte prüf das Internet und versuch es nochmal.`, 4200); };

/* ---------- Datenbank ---------- */
const fromRow = r => ({id: r.id, name: r.name, cat: r.cat, catText: r.cat_text || '', catGroup: r.cat_group || '', city: r.city || '', country: r.country || '', address: r.address || '',
  lat: r.lat, lng: r.lng, price: r.price || 0, trip: r.trip_id || '', dog: r.dog || '', dogNote: r.dog_note || '', loves: r.loves || [], highlight: r.highlight || '',
  tip: r.tip || '', priv: r.priv || '', tel: r.tel || '', res: r.res || '', web: r.web || '', dishes: Array.isArray(r.dishes) ? r.dishes : [],
  stamm: typeof r.stamm === 'boolean' ? r.stamm : null,
  createdBy: r.created_by || '', updatedBy: r.updated_by || '', updatedAt: r.updated_at || '', visits: [], photos: []});
const toRow = e => ({name: e.name, cat: e.cat, cat_text: e.catText || null, cat_group: e.catGroup || null, city: e.city || null, country: e.country || null,
  address: e.address || null, lat: hasPos(e) ? e.lat : null, lng: hasPos(e) ? e.lng : null, price: e.price || 0, trip_id: e.trip || null, dog: e.dog || '',
  dog_note: e.dogNote || null, loves: e.loves || [], highlight: e.highlight || null, tip: e.tip || null, priv: e.priv || null, tel: e.tel || null,
  res: e.res || null, web: e.web || null, dishes: e.dishes || []});

const cacheKey = () => 'travel-cache-' + (session && session.user ? session.user.id : 'x');
const cacheWrite = () => { try { localStorage.setItem(cacheKey(), JSON.stringify({places: S.places, trips: S.trips})); } catch (e) {} };
const cacheRead = () => { try { const c = JSON.parse(localStorage.getItem(cacheKey()) || 'null'); if (c && Array.isArray(c.places)) { S.places = c.places; S.trips = c.trips || []; return true; } } catch (e) {} return false; };

async function loadAll() {
  const [p, v, ph, t] = await Promise.all([sb.from('travel_places').select('*'), sb.from('travel_visits').select('*'),
    sb.from('travel_photos').select('*').order('sort').order('created_at'), sb.from('travel_trips').select('*')]);
  for (const r of [p, v, ph, t]) if (r.error) throw r.error;
  const m = new Map(); p.data.forEach(r => m.set(r.id, fromRow(r)));
  v.data.forEach(r => { const e = m.get(r.place_id); if (e) e.visits.push({id: r.id, date: r.date, who: r.who || [], note: r.note || '', by: r.by || ''}); });
  ph.data.forEach(r => { const e = m.get(r.place_id); if (e) e.photos.push({id: r.id, path: r.path, by: r.by || ''}); });
  S.places = [...m.values()];
  S.trips = t.data.map(r => ({id: r.id, name: r.name, from: r.date_from || '', to: r.date_to || ''}));
  S.loaded = true; cacheWrite();
}
let rt = null;
async function refresh() {
  try { await loadAll(); setSync('ok'); } catch (e) { setSync(navigator.onLine === false ? 'offline' : 'err'); if (window.console) console.error('Laden', e); return; }
  rerender();
}
const refreshSoon = () => { clearTimeout(rt); rt = setTimeout(refresh, 500); };
function rerender() {
  if (S.view === 'neu') return;            // ein offenes Formular nicht überschreiben
  if (S.view === 'detail' && !byId(S.detail)) { go(S.prevView || 'karte'); return; }
  ({karte: renderKarte, liste: renderListe, reisen: renderReisen, rueckblick: renderRueckblick, detail: renderDetail, buch: renderBuch})[S.view]?.();
}
function subscribe() {
  if (channel) sb.removeChannel(channel);
  channel = sb.channel('travel-live');
  ['travel_places', 'travel_visits', 'travel_photos', 'travel_trips'].forEach(t => channel.on('postgres_changes', {event: '*', schema: 'public', table: t}, refreshSoon));
  channel.subscribe();
}

/* ---------- Fotos ---------- */
const thumbOf = p => p.replace(/\.jpg$/, '_t.jpg');
async function ensureUrls(paths) {
  const now = Date.now();
  const need = [...new Set(paths)].filter(p => p && (!S.urls[p] || S.urls[p].exp < now + 120000));
  for (let i = 0; i < need.length; i += 100) {
    const chunk = need.slice(i, i + 100);
    try {
      const {data, error} = await sb.storage.from(BUCKET).createSignedUrls(chunk, 6 * 3600);
      if (error) throw error;
      (data || []).forEach(d => { if (d.signedUrl && d.path) S.urls[d.path] = {url: d.signedUrl, exp: now + 6 * 3600 * 1000}; });
    } catch (e) { if (window.console) console.error('Fotos', e); }
  }
}
const img = (path, cls = '', alt = '') => `<img class="${cls}" data-path="${esc(path)}" src="${S.urls[path] ? esc(S.urls[path].url) : PIX}" alt="${esc(alt)}" loading="lazy">`;
async function hydrate(root = document) {
  const imgs = [...root.querySelectorAll('img[data-path]')].filter(i => i.dataset.ok !== '1');
  if (!imgs.length) return;
  await ensureUrls(imgs.map(i => i.dataset.path));
  imgs.forEach(i => { const u = S.urls[i.dataset.path]; if (u) { if (i.src !== u.url) i.src = u.url; i.dataset.ok = '1'; } });
}
document.addEventListener('error', ev => {
  const t = ev.target;
  if (t && t.tagName === 'IMG' && t.dataset.path && /_t\.jpg$/.test(t.dataset.path) && !t.dataset.fb) {
    t.dataset.fb = '1'; t.dataset.path = t.dataset.path.replace(/_t\.jpg$/, '.jpg'); t.dataset.ok = ''; hydrate(t.parentNode || document);
  }
}, true);
const shrink = (file, max, q) => new Promise(res => {
  const url = URL.createObjectURL(file); const im = new Image();
  im.onload = () => { const k = Math.min(1, max / Math.max(im.width, im.height)); const c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(url); c.toBlob(b => res(b), 'image/jpeg', q); };
  im.onerror = () => { URL.revokeObjectURL(url); res(null); };
  im.src = url;
});
async function prepPhotos(files) {
  const out = [];
  for (const f of files) {
    if (!/^image\//.test(f.type) && !/\.(jpe?g|png|webp|heic)$/i.test(f.name)) continue;
    const full = await shrink(f, 1600, 0.82); const thumb = await shrink(f, 420, 0.72);
    if (full && thumb) out.push({full, thumb, url: URL.createObjectURL(thumb)});
  }
  return out;
}
async function uploadPhotos(placeId, list, startSort = 0) {
  let n = 0;
  for (const p of list) {
    n++; toast(`Foto ${n} von ${list.length} wird hochgeladen …`, 60000);
    const id = uid(); const path = `places/${placeId}/${id}.jpg`;
    const a = await sb.storage.from(BUCKET).upload(path, p.full, {contentType: 'image/jpeg', upsert: false});
    if (a.error) throw a.error;
    await sb.storage.from(BUCKET).upload(thumbOf(path), p.thumb, {contentType: 'image/jpeg', upsert: false});
    const r = await sb.from('travel_photos').insert({id, place_id: placeId, path, sort: startSort + n, by: S.me});
    if (r.error) throw r.error;
  }
}
async function removePhotos(photos) {
  if (!photos.length) return;
  await sb.storage.from(BUCKET).remove(photos.flatMap(p => [p.path, thumbOf(p.path)]));
  const r = await sb.from('travel_photos').delete().in('id', photos.map(p => p.id));
  if (r.error) throw r.error;
}

/* ---------- Ortssuche (OpenStreetMap / Nominatim) ---------- */
const fromNom = x => {
  const a = x.address || {}, t = x.extratags || {};
  const city = a.city || a.town || a.village || a.municipality || a.hamlet || a.suburb || a.county || '';
  const street = [a.road || a.pedestrian || a.footway || '', a.house_number || ''].filter(Boolean).join(' ');
  return {name: x.name || (x.namedetails && x.namedetails.name) || '', lat: +x.lat, lng: +x.lon, city, country: (a.country_code || '').toUpperCase(),
    address: [street, [a.postcode, city].filter(Boolean).join(' ')].filter(Boolean).join(', '), tel: t.phone || t['contact:phone'] || '', web: t.website || t['contact:website'] || '',
    label: x.display_name || ''};
};
async function nomSearch(q, near) {
  let u = `${NOM}/search?format=jsonv2&addressdetails=1&extratags=1&namedetails=1&limit=6&accept-language=de&q=${encodeURIComponent(q)}`;
  if (near) u += `&viewbox=${near.lng - 0.02},${near.lat + 0.02},${near.lng + 0.02},${near.lat - 0.02}&bounded=1`;
  const r = await fetch(u); if (!r.ok) throw new Error('Suche ' + r.status); return (await r.json()).map(fromNom);
}
async function nomReverse(lat, lng) {
  const r = await fetch(`${NOM}/reverse?format=jsonv2&addressdetails=1&extratags=1&namedetails=1&zoom=18&accept-language=de&lat=${lat}&lon=${lng}`);
  if (!r.ok) throw new Error('Rückwärtssuche ' + r.status); const j = await r.json(); return j && !j.error ? fromNom(j) : null;
}
const getPos = () => new Promise((res, rej) => {
  if (!navigator.geolocation) return rej(new Error('kein GPS'));
  navigator.geolocation.getCurrentPosition(p => res({lat: p.coords.latitude, lng: p.coords.longitude}), rej, {enableHighAccuracy: true, timeout: 15000, maximumAge: 60000});
});

/* ---------- Anmeldung ---------- */
const gate = html => { const g = $('#gate'); g.innerHTML = `<div class="brand"><img src="logo.png" alt="DJNP"><span class="ttl">Travel</span></div>${html}`; g.hidden = false; $('#app').hidden = true; };
function showLogin(msg) {
  gate(`<p>Eure Lieblingsorte. Melde dich mit deinem DJNP-Zugang an.</p>
    <form id="loginForm" novalidate><label>E-Mail<input type="email" id="lEmail" autocomplete="username" inputmode="email"></label>
    <label>Passwort<input type="password" id="lPw" autocomplete="current-password"></label>
    <p class="err" id="lErr" ${msg ? '' : 'hidden'}>${esc(msg || '')}</p><button class="btn main" type="submit" style="width:100%">Anmelden</button></form>`);
}
async function login() {
  const email = $('#lEmail').value.trim(), pw = $('#lPw').value; const er = $('#lErr');
  const no = m => { er.textContent = m; er.hidden = false; };
  if (!email || !pw) return no('Bitte E-Mail und Passwort eintragen.');
  const btn = $('#loginForm button'); btn.classList.add('busy');
  try {
    const r = await sb.auth.signInWithPassword({email, password: pw});
    btn.classList.remove('busy');
    if (r.error) return no(/invalid/i.test(r.error.message) ? 'E-Mail oder Passwort stimmt nicht.' : 'Anmelden hat nicht geklappt: ' + r.error.message);
    session = r.data.session; enter();
  } catch (e) { btn.classList.remove('busy'); no('Keine Verbindung. Bitte prüf dein Internet.'); }
}
async function enter() {
  gate('<p>Lade eure Lieblingsorte …</p>');
  try {
    const res = await sb.from('members').select('user_id,person');
    if (res.error) throw res.error;
    const mine = res.data.find(m => m.user_id === session.user.id);
    if (!mine) { gate('<p>Dieses Konto ist noch keiner Person in der Familie zugeordnet. Bitte sag Jürgen Bescheid.</p><button class="btn" data-act="logout">Abmelden</button>'); return; }
    try { localStorage.setItem('travel-me', mine.person); } catch (e) {}
    start(mine.person.toUpperCase(), false);
  } catch (e) {
    let me = null; try { me = localStorage.getItem('travel-me'); } catch (x) {}
    if (me && cacheRead()) { start(me.toUpperCase(), true); setSync('offline'); }
    else gate('<p>Keine Verbindung. Beim ersten Start braucht die App Internet.</p><button class="btn main" data-act="reload">Nochmal versuchen</button>');
  }
}
async function start(me, offline) {
  S.me = me;
  $('#gate').hidden = true; $('#app').hidden = false;
  const had = cacheRead();
  go('karte');
  if (offline) return;
  if (!had) toast('Lade eure Lieblingsorte …');
  await refresh();
  subscribe();
  loadNotif();
}
async function signOut() {
  try { localStorage.removeItem(cacheKey()); localStorage.removeItem('travel-me'); } catch (e) {}
  try { await sb.auth.signOut(); } catch (e) {}
  location.reload();
}
function boot() {
  if (!CFG.url || !CFG.key) { gate('<p>Die App ist noch nicht mit der Datenbank verbunden.</p>'); return; }
  if (!window.supabase || !window.supabase.createClient) { gate('<p>Keine Verbindung. Bitte prüf dein Internet und öffne die App noch einmal.</p><button class="btn main" data-act="reload">Nochmal versuchen</button>'); return; }
  sb = window.supabase.createClient(CFG.url, CFG.key);
  sb.auth.getSession().then(r => { session = r.data ? r.data.session : null; if (session) enter(); else showLogin(); }, () => showLogin());
  sb.auth.onAuthStateChange((ev, s) => { if (s) session = s; if (ev === 'SIGNED_OUT' && S.me) { S.me = null; showLogin(); } });
}

/* ---------- Filter, Suche, Zeilen ---------- */
const matches = (e, q) => {
  if (!q) return true;
  const hay = norm([e.name, catLabel(e), e.city, e.address, cName(e.country), e.tip, e.priv, e.dogNote, e.highlight, (trip(e.trip) || {}).name,
    ...e.dishes.map(d => d.n), ...e.visits.map(v => v.note), DOG[e.dog || ''][0], GROUPS[grp(e)], isStamm(e) ? stammLabel(e) + ' Stammort' : ''].join(' '));
  return norm(q).split(/\s+/).filter(Boolean).every(w => hay.includes(w));
};
const anyFilter = () => S.f.people.length || S.f.dog || S.f.stamm || S.f.group || S.f.trip || S.f.country;
const filtered = (useQ = false) => S.places.filter(e => {
  const f = S.f, w = whoAll(e);
  if (f.people.length && !f.people.some(k => w.includes(k))) return false;
  if (f.dog && !dogOk(e)) return false;
  if (f.stamm && !isStamm(e)) return false;
  if (f.group && grp(e) !== f.group) return false;
  if (f.trip && e.trip !== f.trip) return false;
  if (f.country && e.country !== f.country) return false;
  return useQ ? matches(e, S.q) : true;
}).sort((a, b) => lastDate(b).localeCompare(lastDate(a)));
const thumb = e => e.photos && e.photos[0] ? img(thumbOf(e.photos[0].path), 'thumb') : `<span class="thumb">${ic(grp(e), 26)}</span>`;
const row = e => {
  const d = S.near && hasPos(e) ? dist(S.near.lat, S.near.lng, e.lat, e.lng) : null;
  return `<button class="row" data-act="open" data-id="${esc(e.id)}">${thumb(e)}<span><span class="t">${esc(e.name)}</span>${isStamm(e) ? ` <span class="st">${ic('star', 12)}${esc(stammLabel(e))}</span>` : ''}<br><span class="m">${esc(catLabel(e))} · ${esc(e.city || cName(e.country))}${e.city ? ', ' + esc(cName(e.country)) : ''}</span><br><span class="m">${esc(fmt(lastDate(e)))}${e.visits.length > 1 ? ' · ' + e.visits.length + ' Besuche' : ''}</span></span><span class="r">${d !== null && S.sortNear ? `<span class="dist">${km(d)}</span>` : ''}${avs(whoAll(e).filter(k => PK.includes(k)))}${dogOk(e) ? `<span class="paw" title="${esc(DOG[e.dog][0])}">${ic('paw', 18)}</span>` : ''}</span></button>`;
};
const filterChips = () => {
  const f = S.f, t = f.trip && trip(f.trip);
  const active = [t ? `<button class="chip on" data-act="ftrip">${ic('x', 16)}Reise: ${esc(t.name)}</button>` : '',
    f.country ? `<button class="chip on" data-act="fcountryoff">${ic('x', 16)}${flag(f.country)} ${esc(cName(f.country))}</button>` : ''].join('');
  return `<div class="fgrid" role="group" aria-label="Wer war dabei">${PEOPLE.map(p => `<button class="ft ${f.people.includes(p.k) ? 'on' : ''}" data-act="fperson" data-k="${p.k}" aria-pressed="${f.people.includes(p.k)}">${av(p.k)}<span>${esc(p.n)}</span></button>`).join('')}
    <button class="ft ${f.dog ? 'on' : ''}" data-act="fdog" aria-pressed="${f.dog}" aria-label="Hundetauglich"><span class="av dog">${ic('paw', 14)}</span><span>Hund</span></button>
    <button class="ft ${f.stamm ? 'on' : ''}" data-act="fstamm" aria-pressed="${f.stamm}" aria-label="Stammorte"><span class="av star">${ic('star', 14)}</span><span>Stamm</span></button></div>
  <div class="fgrid" role="group" aria-label="Bereich"><button class="ft ${!f.group ? 'on' : ''}" data-act="fgroup" data-g="" aria-pressed="${!f.group}">${ic('all', 22)}<span>Alles</span></button>${Object.entries(GROUPS).map(([g, l]) => `<button class="ft ${f.group === g ? 'on' : ''}" data-act="fgroup" data-g="${g}" aria-pressed="${f.group === g}" aria-label="${esc(l)}">${ic(g, 22)}<span>${esc(GSHORT[g])}</span></button>`).join('')}</div>
  ${active ? `<div class="chips wrap">${active}</div>` : ''}`;
};
const emptyHint = () => `<div class="empty"><p>Noch keine Lieblingsorte eingetragen.</p><div class="btns" style="max-width:360px;margin:0 auto"><button class="btn main" data-act="go" data-v="neu">${ic('plus', 18)}Ersten Ort eintragen</button><button class="btn" data-act="go" data-v="reisen">Alte Reise nachtragen</button></div></div>`;

/* ---------- Karte: Straßenkarte (Leaflet) und Länder (jsVectorMap) ---------- */
let lmap = null, cluster = null, lmapEl = null, meMarker = null, photoZoom = false, vmap = null;
const darkMode = () => { const t = document.documentElement.dataset.theme; return t === 'dark' || (t !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches); };
/* Kartenbild von OpenStreetMap (frei nutzbar mit Quellenangabe). Im dunklen Modus per Filter abgedunkelt. */
const tiles = () => L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom: 19,
  attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende'});
const probe = v => { const p = document.createElement('span'); p.style.color = `var(${v})`; document.body.appendChild(p); const c = getComputedStyle(p).color; p.remove(); return c; };
const statBtn = (n, label, k) => `<button class="stat" data-act="stat" data-k="${k}"><div class="n">${n}</div><div class="l">${esc(label)}${ic('back', 14)}</div></button>`;
function openCountries() {
  const cnt = {}; S.places.forEach(e => { if (e.country) cnt[e.country] = (cnt[e.country] || 0) + 1; });
  const list = Object.entries(cnt).sort((a, b) => b[1] - a[1] || cName(a[0]).localeCompare(cName(b[0]), 'de'));
  $('#sheetIn').innerHTML = `<div class="toprow"><h2 style="font-size:22px">${list.length} ${list.length === 1 ? 'Land' : 'Länder'}</h2><button class="back" data-act="closeSheet" aria-label="Schließen">${ic('x', 22)}</button></div>
    <p class="hint" style="margin:2px 0 8px">Tippe auf ein Land, um seine Lieblingsorte zu sehen.</p>
    ${list.map(([c, n]) => `<button class="crow" data-act="fcountry" data-c="${esc(c)}"><span class="fl" aria-hidden="true">${flag(c)}</span><span>${esc(cName(c))}</span><b>${n}</b>${ic('back', 16)}</button>`).join('')}
    <button class="btn" style="width:100%;margin-top:14px" data-act="showLaender">${ic('globe', 18)}Auf der Weltkarte zeigen</button>`;
  $('#sheet').hidden = false;
}
const showList = f => { S.f = {...emptyF(), ...f}; S.q = ''; S.sortNear = false; $('#sheet').hidden = true; go('liste'); };
function renderKarte() {
  const v = $('#v-karte');
  if (v.dataset.mode !== S.mapMode) {
    if (lmap) { lmap.remove(); lmap = null; lmapEl = null; }
    if (vmap) { try { vmap.destroy(); } catch (e) {} vmap = null; }
    v.dataset.mode = S.mapMode;
    v.innerHTML = `<div id="kf"></div>
      <div class="mapwrap" style="height:${S.mapMode === 'strassen' ? 380 : 330}px"><div class="mapmode" role="group" aria-label="Kartenart"><button class="${S.mapMode === 'strassen' ? 'on' : ''}" data-act="mapmode" data-m="strassen" aria-pressed="${S.mapMode === 'strassen'}">${ic('pin', 16)}Karte</button><button class="${S.mapMode === 'laender' ? 'on' : ''}" data-act="mapmode" data-m="laender" aria-pressed="${S.mapMode === 'laender'}">${ic('globe', 16)}Länder</button></div>${S.mapMode === 'strassen' ? `<div id="lmap" role="application" aria-label="Straßenkarte mit unseren Lieblingsorten"></div><button class="locate" data-act="locate" aria-label="Mein Standort">${ic('gps', 22)}</button>` : '<div id="vmap" role="img" aria-label="Weltkarte mit den Ländern, in denen wir waren"></div><div class="maptools"><button data-act="vfocus" data-w="alle">Unsere Länder</button><button data-act="vfocus" data-w="welt">Welt</button></div>'}</div>
      <p class="legend">${S.mapMode === 'strassen' ? '<span>Zahl = mehrere Orte, reinzoomen teilt sie auf</span><span>Buchstaben = wer dabei war</span>' : '<span><b style="background:var(--visited)"></b>Hier waren wir</span>'}</p>
      <div id="kstats"></div><div id="inview"></div>`;
  }
  $('#kf').innerHTML = filterChips();
  const countries = new Set(S.places.map(e => e.country).filter(Boolean)).size;
  $('#kstats').innerHTML = `<div class="stats">${statBtn(countries, 'Länder', 'laender')}${statBtn(S.places.length, 'Lieblingsorte', 'orte')}${statBtn(S.places.filter(e => grp(e) === 'event').length, 'Konzerte & Spiele', 'events')}</div>`;
  if (S.mapMode === 'strassen') requestAnimationFrame(drawLeaflet);
  else { requestAnimationFrame(drawVmap); renderInView(); }
}
function drawLeaflet() {
  const el = $('#lmap'); if (!el) return;
  if (!window.L || !L.markerClusterGroup) { el.innerHTML = '<div class="mapnote">Die Karte konnte nicht geladen werden. Bitte prüf das Internet.</div>'; renderInView(); return; }
  if (lmap && lmapEl === el) { lmap.invalidateSize(); updateMarkers(false); return; }
  lmapEl = el;
  lmap = L.map(el, {zoomControl: true, worldCopyJump: true, tap: true}).setView([47.6, 14.1], 5);
  tiles().addTo(lmap); el.classList.toggle('darktiles', darkMode());
  cluster = L.markerClusterGroup({showCoverageOnHover: false, maxClusterRadius: 46, spiderfyOnMaxZoom: true,
    iconCreateFunction: c => L.divIcon({html: `<div class="cl">${c.getChildCount()}</div>`, className: '', iconSize: [42, 42]})});
  lmap.addLayer(cluster);
  lmap.on('moveend', renderInView);
  lmap.on('zoomend', () => { const z = lmap.getZoom() >= 15; if (z !== photoZoom) { photoZoom = z; updateMarkers(false); } });
  lmap.on('popupopen', ev => hydrate(ev.popup.getElement()));
  photoZoom = false;
  updateMarkers(true);
}
async function updateMarkers(fit) {
  if (!lmap || !cluster) return;
  const list = filtered().filter(hasPos);
  if (photoZoom) await ensureUrls(list.filter(e => e.photos[0]).map(e => thumbOf(e.photos[0].path)));
  cluster.clearLayers();
  list.forEach(e => {
    const who = whoAll(e).filter(k => PK.includes(k)).join('');
    const ph = photoZoom && e.photos[0] && S.urls[thumbOf(e.photos[0].path)];
    const st = isStamm(e);
    const html = ph ? `<div class="mk${st ? ' st' : ''}"><img src="${esc(ph.url)}" alt="">${st ? `<s>${ic('star', 12)}</s>` : ''}<b>${esc(who)}</b></div>` : `<div class="mk${st ? ' st' : ''}"><i>${st ? ic('star', 12) : ''}</i>${who ? `<b>${esc(who)}</b>` : ''}</div>`;
    const sz = ph ? 46 : st ? 22 : 16;
    const m = L.marker([e.lat, e.lng], {icon: L.divIcon({className: '', html, iconSize: [sz, sz], iconAnchor: [sz / 2, sz / 2]}), title: e.name + (st ? ' – ' + stammLabel(e) : ''), zIndexOffset: st ? 500 : 0});
    m.bindPopup(() => `<div class="pop">${thumb(e)}<div><b>${esc(e.name)}</b><small>${esc(catLabel(e))} · ${esc(e.city)}${isStamm(e) ? ' · ' + esc(stammLabel(e)) : ''}</small><br><button data-act="open" data-id="${esc(e.id)}">Ansehen</button></div></div>`);
    cluster.addLayer(m);
  });
  if (fit) {
    if (list.length === 1) lmap.setView([list[0].lat, list[0].lng], 14);
    else if (list.length) lmap.fitBounds(L.latLngBounds(list.map(e => [e.lat, e.lng])).pad(0.15), {maxZoom: 13});
  }
  renderInView();
}
function renderInView() {
  const box = $('#inview'); if (!box) return;
  if (!S.places.length) { box.innerHTML = emptyHint(); return; }
  let list = filtered(), title = anyFilter() ? `Gefiltert: ${list.length} ${list.length === 1 ? 'Ort' : 'Orte'}` : 'Zuletzt eingetragen';
  if (S.mapMode === 'strassen' && lmap) {
    const b = lmap.getBounds();
    list = list.filter(e => hasPos(e) && b.contains([e.lat, e.lng]));
    title = `Im Kartenausschnitt: ${list.length} ${list.length === 1 ? 'Ort' : 'Orte'}`;
  } else if (!anyFilter()) list = list.slice(0, 5);
  box.innerHTML = `<h3>${title}</h3>${list.length ? list.slice(0, 40).map(row).join('') + (list.length > 40 ? `<p class="count">… und ${list.length - 40} weitere. Zoom rein oder nutze die Suche.</p>` : '') : '<p class="empty">Hier ist noch nichts eingetragen. Verschieb die Karte oder zoom raus.</p>'}`;
  hydrate(box);
}
async function locate() {
  try {
    toast('Suche deinen Standort …');
    const p = await getPos(); S.near = p;
    if (lmap) {
      if (meMarker) meMarker.remove();
      meMarker = L.marker([p.lat, p.lng], {icon: L.divIcon({className: '', html: '<div class="me-dot"></div>', iconSize: [16, 16], iconAnchor: [8, 8]}), interactive: false}).addTo(lmap);
      lmap.setView([p.lat, p.lng], 15);
    }
    toast('Das bist du – darunter eure Orte im Ausschnitt');
  } catch (e) { toast('Standort nicht verfügbar. Bitte erlaube den Zugriff auf den Standort.', 4000); }
}
function drawVmap() {
  const el = $('#vmap'); if (!el || el.clientWidth < 50) return;
  if (vmap) { try { vmap.destroy(); } catch (e) {} vmap = null; }
  $$('.jvm-tooltip').forEach(t => t.remove());
  el.innerHTML = '';
  if (typeof window.jsVectorMap !== 'function') { el.innerHTML = '<div class="mapnote">Die Weltkarte konnte nicht geladen werden.</div>'; return; }
  const list = filtered().filter(hasPos);
  const visited = [...new Set(S.places.map(e => e.country))].filter(Boolean);
  const counts = {}; S.places.forEach(e => counts[e.country] = (counts[e.country] || 0) + 1);
  try {
    vmap = new jsVectorMap({selector: '#vmap', map: 'world', backgroundColor: 'transparent', zoomButtons: true, zoomOnScroll: true, zoomMax: 60, zoomStep: 1.8,
      regionsSelectable: false, markersSelectable: false, selectedRegions: visited,
      regionStyle: {initial: {fill: probe('--land'), stroke: probe('--app'), strokeWidth: 0.5, fillOpacity: 1}, hover: {fillOpacity: 0.85, cursor: 'default'}, selected: {fill: probe('--visited')}},
      markers: list.map(e => ({name: e.name, coords: [e.lat, e.lng]})),
      markerStyle: {initial: {r: 5, fill: probe('--pin'), stroke: probe('--app'), strokeWidth: 2, fillOpacity: 1}, hover: {r: 7, cursor: 'pointer'}},
      onMarkerClick: (ev, i) => { const e = list[parseInt(i, 10)]; if (e) open(e.id); },
      onMarkerTooltipShow: (ev, tip, i) => { const e = list[parseInt(i, 10)]; if (e) tip.text(`${e.name} · ${e.city}`); },
      onRegionTooltipShow: (ev, tip, code) => { if (counts[code]) tip.text(`${cName(code)} · ${counts[code]} ${counts[code] === 1 ? 'Lieblingsort' : 'Lieblingsorte'}`); }});
    if (visited.length) { try { vmap.setFocus({regions: visited, animate: false}); } catch (e) {} }
  } catch (e) { el.innerHTML = '<div class="mapnote">Die Weltkarte konnte nicht geladen werden.</div>'; }
}
const vmapRO = window.ResizeObserver ? new ResizeObserver(() => { if (S.view === 'karte' && S.mapMode === 'laender' && $('#vmap') && !vmap) drawVmap(); else if (vmap) { try { vmap.updateSize(); } catch (e) {} } }) : null;

/* ---------- Suche / Liste ---------- */
function renderListe() {
  const v = $('#v-liste');
  if (!v.dataset.built) {
    v.dataset.built = '1';
    v.innerHTML = `<div class="search"><label>${ic('search', 20)}<input class="bare" type="search" id="q" placeholder="Paella, Wien, Hund, Konzert …" aria-label="Suchen" autocomplete="off"></label></div><div id="lf"></div><div id="results"></div>`;
  }
  if ($('#q').value !== S.q) $('#q').value = S.q;
  $('#lf').innerHTML = filterChips() + `<div class="chips"><button class="chip plain ${S.sortNear ? 'on' : ''}" data-act="sortnear">${ic('gps', 16)}In der Nähe zuerst</button></div>`;
  renderResults();
}
function renderResults() {
  let list = filtered(true);
  if (S.sortNear && S.near) list = list.slice().sort((a, b) => (hasPos(a) ? dist(S.near.lat, S.near.lng, a.lat, a.lng) : 1e9) - (hasPos(b) ? dist(S.near.lat, S.near.lng, b.lat, b.lng) : 1e9));
  $('#results').innerHTML = !S.places.length ? emptyHint() : `<p class="count">${list.length} ${list.length === 1 ? 'Eintrag' : 'Einträge'}${S.q ? ` für „${esc(S.q)}“` : ''}</p>` +
    (list.length ? list.map(row).join('') : `<div class="empty"><p>Nichts gefunden.</p><button class="btn small" data-act="go" data-v="neu">${ic('plus', 18)}Neuen Ort eintragen</button></div>`);
  hydrate($('#results'));
}

/* ---------- Detail ---------- */
function renderDetail() {
  const e = byId(S.detail); if (!e) { go('liste'); return; }
  const visits = [...e.visits].sort((a, b) => b.date.localeCompare(a.date));
  const d = DOG[e.dog || ''];
  const gal = e.photos.length ? e.photos.map((p, i) => img(p.path, '', `Foto ${i + 1} von ${e.name}`)).join('')
    : `<div>${ic(grp(e), 54)}<span>Noch keine Fotos</span></div>`;
  $('#v-detail').innerHTML = `<div class="toprow"><button class="back" data-act="back">${ic('back', 20)}Zurück</button><button class="btn small" data-act="edit" data-id="${esc(e.id)}">${ic('edit', 16)}Bearbeiten</button></div>
    <div class="gallery" tabindex="0" aria-label="Fotos">${gal}</div>
    <div class="btns" style="margin:-4px 0 12px"><button class="btn small" data-act="addphotos">${ic('camera', 16)}Fotos hinzufügen</button></div>
    <h1 style="font-size:30px">${esc(e.name)}</h1>
    <div class="meta">${isStamm(e) ? `<span class="tag stamm">${ic('star', 14)}${unser(e, true)} ${esc(stammLabel(e))}</span>` : ''}<span class="tag">${esc(catLabel(e))}</span><span class="tag">${esc([e.city, cName(e.country)].filter(Boolean).join(', '))}</span>${e.price ? `<span class="tag">${'€'.repeat(e.price)}</span>` : ''}${e.trip && trip(e.trip) ? `<span class="tag">${esc(trip(e.trip).name)}</span>` : ''}</div>
    ${e.address ? `<p class="addr" style="margin:-6px 0 12px">${ic('pin', 16)} ${esc(e.address)}</p>` : ''}
    <div class="loves"><span class="lbl" style="margin:0 4px 0 0">Lieben wir</span>${PEOPLE.map(p => `<button data-act="love" data-k="${p.k}" aria-pressed="${e.loves.includes(p.k)}" aria-label="${esc(p.n)} liebt es">${av(p.k, e.loves.includes(p.k) ? '' : 'off')}</button>`).join('')}</div>
    <div class="stammrow"><button class="btn small ${isStamm(e) ? 'acc' : ''}" data-act="stamm" aria-pressed="${isStamm(e)}">${ic('star', 16)}${isStamm(e) ? `${unser(e, true)} ${esc(stammLabel(e))}` : `${stammFem(e) ? 'Zur' : 'Zum'} ${esc(stammLabel(e))} machen`}</button><span class="hint">${isStamm(e) && e.stamm === null ? `Automatisch – ${e.visits.length} Besuche` : isStamm(e) ? 'Nochmal tippen zum Entfernen' : `Automatisch ab ${STAMM_AB} Besuchen`}</span></div>
    ${e.highlight ? `<div class="box"><h4>${ic('event', 18)}Highlight</h4><p>${esc(e.highlight)}</p></div>` : ''}
    ${e.tel || e.res || e.web ? `<div class="btns" style="margin-bottom:8px">${e.tel ? `<a class="btn main" href="tel:${esc(e.tel.replace(/[^\d+]/g, ''))}">${ic('kontakt', 18)}Anrufen</a>` : ''}${e.res ? `<a class="btn" href="${esc(asUrl(e.res))}" target="_blank" rel="noopener">${ic('cal', 18)}Reservieren</a>` : ''}${e.web ? `<a class="btn" href="${esc(asUrl(e.web))}" target="_blank" rel="noopener">${ic('globe', 18)}Website</a>` : ''}</div>${e.tel ? `<p class="num">${esc(e.tel)}</p>` : ''}` : ''}
    <div class="btns" style="margin-bottom:14px"><a class="btn" href="${esc(routeUrl(e))}" target="_blank" rel="noopener">${ic('pin', 18)}Route</a><button class="btn acc" data-act="share" data-id="${esc(e.id)}">${ic('share', 18)}Teilen</button></div>
    ${e.dishes.length ? `<div class="box"><h4>${ic('heart', 18)}Unbedingt probieren</h4>${e.dishes.map(x => `<div class="dish"><span>${esc(x.n)}</span>${avs(x.w || [])}</div>`).join('')}</div>` : ''}
    <div class="box dog"><h4>${ic('paw', 18)}${esc(d[0])}</h4>${e.dogNote || e.dog === 'ohne' || !e.dog ? `<p>${esc(e.dogNote || (e.dog === 'ohne' ? 'Schöner Ort – die Hunde bleiben aber besser zu Hause.' : 'Noch nicht mit Hund ausprobiert.'))}</p>` : ''}</div>
    ${e.tip ? `<div class="box"><h4>${ic('bulb', 18)}Gut zu wissen</h4><p>${esc(e.tip)}</p></div>` : ''}
    ${e.priv ? `<div class="box priv"><h4>${ic('lock', 18)}Nur für uns</h4><p>${esc(e.priv)}</p></div>` : ''}
    <div class="box"><h4>${ic('cal', 18)}Besuche</h4>${visits.map(v => `<div class="visit"><span class="d">${esc(fmt(v.date))}</span>${avs(v.who)}${v.note ? `<span class="note">„${esc(v.note)}“${v.by && person(v.by) ? ' – ' + esc(person(v.by).n) : ''}</span>` : ''}</div>`).join('') || '<p class="hint">Noch kein Besuch eingetragen.</p>'}
      <details style="margin-top:6px"><summary>${ic('plus', 18)}Besuch eintragen</summary>
        <form id="visitForm" novalidate><div class="f"><label class="l" for="vd">Datum</label><input type="date" id="vd" value="${today()}"></div>
        <div class="f"><span class="lbl">Wer war dabei?</span><div class="chips" id="vwho">${whoChips([S.me])}</div></div>
        <div class="f"><label class="l" for="vn">Notiz <span class="hint">(optional)</span></label><input type="text" id="vn" placeholder="Wieder genauso gut wie letztes Mal"></div>
        <div class="err" id="verr" hidden></div><button class="btn main" type="submit">Besuch speichern</button></form></details></div>
    <details class="box"><summary>${ic('kontakt', 18)}${e.tel || e.res || e.web ? 'Telefon, Website, Reservierung ändern' : 'Telefon, Website, Reservierung ergänzen'}</summary>
      <form id="contactForm" novalidate><div class="f"><label class="l" for="cTel">Telefon</label><input type="tel" id="cTel" value="${esc(e.tel)}" placeholder="+43 1 …"></div>
      <div class="f"><label class="l" for="cRes">Reservierungslink</label><input type="text" inputmode="url" id="cRes" value="${esc(e.res)}" placeholder="z. B. Link von TheFork oder der eigenen Seite"></div>
      <div class="f"><label class="l" for="cWeb">Website</label><input type="text" inputmode="url" id="cWeb" value="${esc(e.web)}" placeholder="www.…"></div>
      <button class="btn main" type="submit">Speichern</button></form></details>
    <p class="hint" style="margin:6px 0 10px">${e.createdBy && person(e.createdBy) ? `Eingetragen von ${esc(person(e.createdBy).n)}` : ''}${e.updatedBy && person(e.updatedBy) && e.updatedBy !== e.createdBy ? ` · zuletzt geändert von ${esc(person(e.updatedBy).n)}` : ''}</p>
    <button class="btn small warn" data-act="del" data-id="${esc(e.id)}">Eintrag löschen</button>`;
  hydrate($('#v-detail'));
}
const whoChips = sel => [...PEOPLE.map(p => [p.k, p.n]), ...DOGS.map(d => [d.k, d.n])].map(([k, n]) => `<button type="button" class="chip ${sel.includes(k) ? 'on' : ''}" data-act="tog" data-k="${esc(k)}" aria-pressed="${sel.includes(k)}">${av(k)}${esc(n)}</button>`).join('');
const picked = sel => $$(sel + ' .chip.on').map(b => b.dataset.k);
async function updatePlace(e, fields, okMsg) {
  try { const r = await sb.from('travel_places').update(fields).eq('id', e.id); if (r.error) throw r.error; if (okMsg) toast(okMsg); await refresh(); }
  catch (x) { fail('Speichern', x); }
}
async function deletePlace(e) {
  try {
    if (e.photos.length) await sb.storage.from(BUCKET).remove(e.photos.flatMap(p => [p.path, thumbOf(p.path)]));
    const r = await sb.from('travel_places').delete().eq('id', e.id); if (r.error) throw r.error;
    S.places = S.places.filter(x => x.id !== e.id); cacheWrite(); toast('Eintrag gelöscht'); go(S.prevView === 'detail' ? 'karte' : S.prevView || 'karte'); refresh();
  } catch (x) { fail('Löschen', x); }
}

/* ---------- Neu / Bearbeiten ---------- */
let mini = null, miniMarker = null;
function renderForm(opt = {}) {
  const ed = opt.edit ? byId(opt.edit) : null;
  const t = opt.trip ? trip(opt.trip) : null;
  S.draft = {edit: ed ? ed.id : null, photos: [], keep: ed ? ed.photos.slice() : [], remove: [], dishes: ed ? ed.dishes.map(d => ({n: d.n, w: d.w || []})) : [],
    price: ed ? ed.price : 0, lat: ed && hasPos(ed) ? ed.lat : null, lng: ed && hasPos(ed) ? ed.lng : null, address: ed ? ed.address : ''};
  const cv = !ed ? '' : ed.cat === 'custom' ? 'c:' + ed.catText : ed.cat;
  const val = (k, d = '') => esc(ed ? (ed[k] ?? d) : d);
  if (mini) { mini.remove(); mini = null; }
  $('#v-neu').innerHTML = `${ed ? `<button class="back" data-act="back">${ic('back', 20)}Abbrechen</button>` : ''}
  <h1 style="font-size:28px;margin-bottom:4px">${ed ? 'Bearbeiten' : 'Neuer Lieblingsort'}</h1><p class="hint" style="margin:0 0 16px">${ed ? esc(ed.name) : 'Schnell das Wichtigste eintragen, Details gehen auch später.'}</p>
  <form id="placeForm" novalidate>
    <div class="f"><span class="lbl">Fotos <span class="hint">– das erste wird das Titelbild</span></span><div class="photos" id="phs"></div><input type="file" id="nFile" accept="image/*" multiple hidden></div>
    <div class="f"><label class="l" for="nName">Name</label><input type="text" id="nName" value="${val('name')}" placeholder="Casa Marisol" autocomplete="off"></div>
    <div class="f"><label class="l" for="nCat">Was ist es?</label><select id="nCat">${Object.entries(GROUPS).map(([g, l]) => `<optgroup label="${esc(l)}">${Object.entries(CATS).filter(([, c]) => c[1] === g).map(([k, c]) => `<option value="${k}" ${cv === k ? 'selected' : ''}>${esc(c[0])}</option>`).join('')}${customCats().filter(([, cg]) => cg === g).map(([x]) => `<option value="c:${esc(x)}" ${cv === 'c:' + x ? 'selected' : ''}>${esc(x)}</option>`).join('')}</optgroup>`).join('')}<option value="__new">Etwas anderes – selbst eintragen …</option></select>
      <div id="customF" hidden style="margin-top:8px"><input type="text" id="nCatText" placeholder="Weingut, Therme, Bootsverleih, Markt …" aria-label="Was ist es? (eigener Text)"><label class="l" for="nCatGroup" style="margin-top:8px">Gehört zu</label><select id="nCatGroup">${Object.entries(GROUPS).map(([g, l]) => `<option value="${g}" ${g === 'erleben' ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div></div>
    <div class="f" id="evF" ${ed && grp(ed) === 'event' ? '' : 'hidden'}><label class="l" for="nHi">Highlight <span class="hint">– Song des Abends, Ergebnis …</span></label><input type="text" id="nHi" value="${val('highlight')}" placeholder="Song des Abends: …"></div>
    <div class="f box"><span class="lbl">${ic('pin', 16)} Wo ist es?</span>
      <div class="locbtns"><button type="button" class="btn small" data-act="gpshere">${ic('gps', 16)}Mein Standort</button></div>
      <div class="paste" style="margin-top:8px"><input type="search" id="nSearch" placeholder="Name oder Adresse suchen" autocomplete="off"><button type="button" class="btn small" data-act="nomsearch" style="min-height:46px">Suchen</button></div>
      <div id="nomRes"></div>
      <div class="paste" style="margin-top:8px"><input type="text" inputmode="url" id="nLink" placeholder="Google-Maps-Link einfügen" autocomplete="off"><button type="button" class="btn small" data-act="parseLink" style="min-height:46px">${ic('link', 16)}</button></div>
      <div id="linkMsg" class="hint" style="margin-top:6px"></div>
      <div id="minimap" ${S.draft.lat !== null ? '' : 'hidden'}></div><p class="hint" id="miniHint" style="margin:6px 0 0" ${S.draft.lat !== null ? '' : 'hidden'}>Pin passt nicht genau? Einfach verschieben.</p>
      <p class="addr" id="nAddr">${esc(S.draft.address)}</p>
      <div class="two" style="margin-top:10px"><div><label class="l" for="nCity">Ort</label><input type="text" id="nCity" value="${val('city')}" placeholder="Wien" autocomplete="off"></div>
        <div><label class="l" for="nCountry">Land</label><select id="nCountry">${countryOpts(ed ? ed.country : '')}</select></div></div></div>
    ${ed ? '' : `<div class="two f"><div><label class="l" for="nDate">Datum</label><input type="date" id="nDate" value="${t ? t.from : today()}"></div>
      <div><label class="l" for="nTrip">Reise</label><select id="nTrip"><option value="">Keine</option>${S.trips.map(x => `<option value="${esc(x.id)}" ${t && x.id === t.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div></div>
    <div class="f"><span class="lbl">Wer war dabei?</span><div class="chips" id="nWho">${whoChips([S.me])}</div></div>`}
    ${ed ? `<div class="f"><label class="l" for="nTrip">Reise</label><select id="nTrip"><option value="">Keine</option>${S.trips.map(x => `<option value="${esc(x.id)}" ${x.id === ed.trip ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>` : ''}
    <div class="f"><span class="lbl">Wer liebt es?</span><div class="chips" id="nLove">${PEOPLE.map(p => { const on = ed ? ed.loves.includes(p.k) : p.k === S.me; return `<button type="button" class="chip ${on ? 'on' : ''}" data-act="tog" data-k="${p.k}" aria-pressed="${on}">${av(p.k)}${esc(p.n)}</button>`; }).join('')}</div></div>
    <div class="f"><label class="l" for="nDog">${ic('paw', 16)} Hunde</label><select id="nDog">${['willkommen', 'erlaubt', 'draussen', 'ohne', ''].map(k => `<option value="${k}" ${(ed ? ed.dog : '') === k ? 'selected' : ''}>${esc(DOG[k][0])}</option>`).join('')}</select>
      <input type="text" id="nDogNote" value="${val('dogNote')}" placeholder="Napf vorhanden, Aufpreis, Leinenpflicht …" style="margin-top:6px"></div>
    <div class="f"><span class="lbl">Preis <span class="hint">(optional)</span></span><div class="seg" id="nPrice">${[1, 2, 3, 4].map(n => `<button type="button" data-act="price" data-n="${n}" class="${S.draft.price === n ? 'on' : ''}">${'€'.repeat(n)}</button>`).join('')}</div></div>
    <div class="f"><span class="lbl">${ic('kontakt', 16)} Kontakt <span class="hint">(optional)</span></span><input type="tel" id="nTel" value="${val('tel')}" placeholder="Telefonnummer" autocomplete="off"><input type="text" inputmode="url" id="nRes" value="${val('res')}" placeholder="Reservierungslink" style="margin-top:6px"><input type="text" inputmode="url" id="nWeb" value="${val('web')}" placeholder="Website" style="margin-top:6px"></div>
    <div class="f"><span class="lbl">Unbedingt probieren</span><div id="dishList"></div><div style="display:flex;gap:8px"><input type="text" id="nDish" placeholder="Arroz a banda"><button type="button" class="btn small" data-act="addDish" style="min-height:46px">Dazu</button></div></div>
    <div class="f"><label class="l" for="nTip">${ic('bulb', 16)} Gut zu wissen <span class="hint">– geht beim Teilen mit</span></label><textarea id="nTip" placeholder="Am Wochenende reservieren …">${val('tip')}</textarea></div>
    <div class="f"><label class="l" for="nPriv">${ic('lock', 16)} Nur für uns <span class="hint">– bleibt in der Familie</span></label><textarea id="nPriv" placeholder="Kellner Pepe ist super …">${val('priv')}</textarea></div>
    <div class="err" id="nErr" hidden></div>
    <button class="btn main" type="submit" style="width:100%">${ed ? 'Änderungen speichern' : 'Lieblingsort speichern'}</button>
  </form>`;
  renderPhotos(); renderDishes();
  if (S.draft.lat !== null) requestAnimationFrame(showMini);
  hydrate($('#v-neu'));
}
const renderPhotos = () => {
  const d = S.draft;
  $('#phs').innerHTML = d.keep.map((p, i) => `<div class="ph">${img(thumbOf(p.path), '', 'Foto')}<button type="button" data-act="rmKeep" data-i="${i}" aria-label="Foto entfernen">${ic('x', 14)}</button></div>`).join('') +
    d.photos.map((p, i) => `<div class="ph"><img src="${esc(p.url)}" alt="Neues Foto"><button type="button" data-act="rmPhoto" data-i="${i}" aria-label="Foto entfernen">${ic('x', 14)}</button><span class="keep">neu</span></div>`).join('') +
    `<button type="button" class="addph" data-act="addPhoto">${ic('camera', 22)}<span>Fotos</span></button>`;
  hydrate($('#phs'));
};
const renderDishes = () => { $('#dishList').innerHTML = S.draft.dishes.map((d, i) => `<div class="dish"><span>${esc(d.n)}</span><button type="button" class="back" data-act="rmDish" data-i="${i}" aria-label="Entfernen">${ic('x', 18)}</button></div>`).join(''); };
function showMini() {
  const el = $('#minimap'); if (!el || !window.L || S.draft.lat === null) return;
  el.hidden = false; $('#miniHint').hidden = false;
  if (!mini) {
    mini = L.map(el, {zoomControl: true, attributionControl: false}).setView([S.draft.lat, S.draft.lng], 16);
    tiles().addTo(mini); el.classList.toggle('darktiles', darkMode());
    miniMarker = L.marker([S.draft.lat, S.draft.lng], {draggable: true, icon: L.divIcon({className: '', html: '<div class="mk"><i></i></div>', iconSize: [16, 16], iconAnchor: [8, 8]})}).addTo(mini);
    miniMarker.on('dragend', () => { const p = miniMarker.getLatLng(); S.draft.lat = p.lat; S.draft.lng = p.lng; });
  } else { mini.invalidateSize(); mini.setView([S.draft.lat, S.draft.lng], Math.max(mini.getZoom(), 15)); miniMarker.setLatLng([S.draft.lat, S.draft.lng]); }
}
function applyPlace(r, opts = {}) {
  if (!r) return;
  if (r.name && (opts.forceName || !$('#nName').value.trim())) $('#nName').value = r.name;
  if (typeof r.lat === 'number' && !isNaN(r.lat)) { S.draft.lat = r.lat; S.draft.lng = r.lng; showMini(); }
  if (r.city) $('#nCity').value = r.city;
  if (r.country && COUNTRIES[r.country]) $('#nCountry').value = r.country;
  if (r.address) { S.draft.address = r.address; $('#nAddr').textContent = r.address; }
  if (r.tel && !$('#nTel').value.trim()) $('#nTel').value = r.tel;
  if (r.web && !$('#nWeb').value.trim()) $('#nWeb').value = r.web;
}
async function gpsHere() {
  const msg = $('#linkMsg');
  try {
    msg.textContent = 'Suche deinen Standort …';
    const p = await getPos(); S.near = p;
    applyPlace({lat: p.lat, lng: p.lng});
    msg.textContent = 'Standort übernommen. Suche die Adresse …';
    const r = await nomReverse(p.lat, p.lng);
    if (r) applyPlace({...r, lat: p.lat, lng: p.lng});
    msg.textContent = 'Standort übernommen.' + (r && r.name ? ` Ist es „${r.name}“? Dann passt der Name schon.` : '');
  } catch (e) { msg.textContent = 'Standort nicht verfügbar. Bitte erlaube den Zugriff auf den Standort – oder such den Ort per Name.'; }
}
let nomResults = [];
async function nomSearchUi() {
  const q = $('#nSearch').value.trim(); const box = $('#nomRes');
  if (q.length < 3) { box.innerHTML = '<p class="hint" style="margin:6px 0 0">Bitte mindestens 3 Buchstaben eingeben.</p>'; return; }
  box.innerHTML = '<p class="hint" style="margin:6px 0 0">Suche …</p>';
  try {
    nomResults = await nomSearch(q);
    box.innerHTML = nomResults.length ? `<div class="results">${nomResults.map((r, i) => `<button type="button" data-act="pickNom" data-i="${i}"><b>${esc(r.name || r.address || r.city)}</b><small>${esc(r.label)}</small></button>`).join('')}</div>` : '<p class="hint" style="margin:6px 0 0">Nichts gefunden. Probier es mit Ort dazu, z. B. „Casa Marisol Dénia“.</p>';
  } catch (e) { box.innerHTML = '<p class="hint" style="margin:6px 0 0">Die Suche ist gerade nicht erreichbar.</p>'; }
}
async function parseLink() {
  const raw = $('#nLink').value.trim(), msg = $('#linkMsg');
  if (!raw) { msg.textContent = 'Füge zuerst einen Link ein.'; return; }
  if (/goo\.gl|maps\.app/i.test(raw)) { msg.textContent = 'Kurzlinks aus der Google-Maps-App kann die App noch nicht öffnen. Tipp: den Link im Browser öffnen und den langen Link aus der Adresszeile kopieren – oder den Ort hier oben per Name suchen.'; return; }
  let name = '', lat = null, lng = null;
  try {
    const u = new URL(raw); const path = decodeURIComponent(u.pathname.replace(/\+/g, ' '));
    const m = path.match(/\/place\/([^/]+)/); if (m) name = m[1].trim();
    const d = raw.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/) || raw.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    if (d) { lat = +d[1]; lng = +d[2]; }
    const q = u.searchParams.get('q') || u.searchParams.get('query') || u.searchParams.get('ll') || u.searchParams.get('destination') || '';
    const c = q.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (c && lat === null) { lat = +c[1]; lng = +c[2]; } else if (q && !c && !name) name = q;
  } catch (e) { msg.textContent = 'Das sieht nicht wie ein Link aus.'; return; }
  if (!name && lat === null) { msg.textContent = 'In diesem Link stehen weder Name noch Standort.'; return; }
  name = name.split(',')[0].trim();
  if (name) $('#nName').value = name;
  msg.textContent = 'Übernehme den Ort …';
  try {
    if (lat !== null) {
      applyPlace({lat, lng});
      const r = await nomReverse(lat, lng); if (r) applyPlace({...r, name: '', lat, lng});
      if (name) { const hit = (await nomSearch(name, {lat, lng}))[0]; if (hit) applyPlace({...hit, name: '', lat, lng, address: hit.address || (r && r.address)}); }
    } else if (name) { const hit = (await nomSearch(name))[0]; if (hit) applyPlace({...hit, name: ''}); }
    msg.textContent = `Übernommen: ${[name && 'Name', S.draft.lat !== null && 'Standort', $('#nTel').value && 'Telefon', $('#nWeb').value && 'Website'].filter(Boolean).join(', ')}. Bitte kurz prüfen.`;
  } catch (e) { msg.textContent = 'Name und Standort übernommen. Adresse konnte gerade nicht ergänzt werden.'; }
}
async function savePlace() {
  const d = S.draft, ed = d.edit ? byId(d.edit) : null;
  const err = $('#nErr'); const no = m => { err.textContent = m; err.hidden = false; err.scrollIntoView({block: 'center'}); };
  const name = $('#nName').value.trim(); const city = $('#nCity').value.trim(); let country = $('#nCountry').value;
  if (!name) return no('Gib dem Ort einen Namen.');
  if (!city && d.lat === null) return no('Wo ist es? Trag den Ort ein, such ihn oder nimm deinen Standort.');
  if (!country) return no('Wähle noch das Land aus.');
  const cv = $('#nCat').value; let cat = cv, catText = '', catGroup = '';
  if (cv === '__new') { catText = $('#nCatText').value.trim(); if (!catText) return no('Schreib noch dazu, was es ist – z. B. Weingut.'); cat = 'custom'; catGroup = $('#nCatGroup').value; }
  else if (cv.startsWith('c:')) { cat = 'custom'; catText = cv.slice(2); catGroup = (customCats().find(x => x[0] === catText) || ['', 'erleben'])[1]; }
  const who = ed ? [] : picked('#nWho'); if (!ed && !who.length) return no('Wähle aus, wer dabei war.');
  const btn = $('#placeForm button[type=submit]'); btn.classList.add('busy');
  try {
    let lat = d.lat, lng = d.lng;
    if (lat === null) {
      try { const hit = (await nomSearch(`${city}, ${cName(country)}`))[0]; if (hit && hit.country === country) { lat = hit.lat; lng = hit.lng; } } catch (e) {}
      if (lat === null && COUNTRIES[country]) { lat = COUNTRIES[country][1]; lng = COUNTRIES[country][2]; }
    }
    const loves = picked('#nLove');
    const e = {name, cat, catText, catGroup, city, country, address: d.address || '', lat, lng, price: d.price, trip: $('#nTrip').value,
      dog: $('#nDog').value, dogNote: $('#nDogNote').value.trim(), loves, highlight: $('#evF').hidden ? '' : $('#nHi').value.trim(),
      tip: $('#nTip').value.trim(), priv: $('#nPriv').value.trim(), tel: $('#nTel').value.trim(), res: $('#nRes').value.trim(), web: $('#nWeb').value.trim(),
      dishes: d.dishes.map(x => ({n: x.n, w: x.w && x.w.length ? x.w : (loves.length ? loves : [S.me])}))};
    let id;
    if (ed) {
      id = ed.id;
      const r = await sb.from('travel_places').update(toRow(e)).eq('id', id); if (r.error) throw r.error;
      if (d.remove.length) await removePhotos(d.remove);
    } else {
      id = uid();
      const r = await sb.from('travel_places').insert({id, ...toRow(e), created_by: S.me, updated_by: S.me}); if (r.error) throw r.error;
      const v = await sb.from('travel_visits').insert({id: uid(), place_id: id, date: $('#nDate').value || today(), who, note: null, by: S.me}); if (v.error) throw v.error;
    }
    if (d.photos.length) await uploadPhotos(id, d.photos, (ed ? ed.photos.length : 0));
    toast(ed ? 'Änderungen gespeichert' : 'Gespeichert');
    await refresh();
    S.prevView = ed ? S.prevView : 'karte';
    open(id);
  } catch (x) { btn.classList.remove('busy'); fail('Speichern', x); }
}

/* ---------- Reisen, Reisebuch, Rückblick ---------- */
function renderReisen() {
  const trips = [...S.trips].sort((a, b) => (b.from || '').localeCompare(a.from || ''));
  $('#v-reisen').innerHTML = `<h1 style="font-size:28px;margin-bottom:12px">Reisen</h1>
    ${trips.length ? '' : '<p class="hint" style="margin:0 0 12px">Leg eine Reise an und trag die Orte ein, die euch dort gefallen haben – auch Reisen von früher.</p>'}
    ${trips.map(t => { const list = S.places.filter(e => e.trip === t.id); const who = [...new Set(list.flatMap(e => whoAll(e)))].filter(k => PK.includes(k));
      return `<div class="trip"><div class="h"><div><h2 style="font-size:20px">${esc(t.name)}</h2><div class="m">${esc(fmt(t.from))}${t.to ? ' – ' + esc(fmt(t.to)) : ''} · ${list.length} ${list.length === 1 ? 'Ort' : 'Orte'}</div></div>${avs(PK.filter(k => who.includes(k)))}</div>
      <div class="btns"><button class="btn small" data-act="tripList" data-id="${esc(t.id)}">Orte</button><button class="btn small" data-act="tripAdd" data-id="${esc(t.id)}">${ic('plus', 16)}Ort</button>${list.length ? `<button class="btn small" data-act="tripShare" data-id="${esc(t.id)}">${ic('share', 16)}Teilen</button><button class="btn small" data-act="book" data-id="${esc(t.id)}">${ic('book', 16)}Reisebuch</button>` : ''}</div></div>`; }).join('')}
    <details class="trip" ${S.trips.length ? '' : 'open'}><summary>${ic('plus', 18)}Reise anlegen oder nachtragen</summary>
      <form id="tripForm" novalidate style="margin-top:10px"><div class="f"><label class="l" for="tName">Name</label><input type="text" id="tName" placeholder="Kroatien 2019"></div>
      <div class="two f"><div><label class="l" for="tFrom">Von</label><input type="date" id="tFrom"></div><div><label class="l" for="tTo">Bis</label><input type="date" id="tTo"></div></div>
      <div class="err" id="tErr" hidden></div><button class="btn main" type="submit">Reise anlegen und Orte eintragen</button></form></details>`;
}
function renderBuch() {
  const t = trip(S.buch); if (!t) { go('reisen'); return; }
  const first = e => e.visits.map(v => v.date).sort()[0] || '';
  const list = S.places.filter(e => e.trip === t.id).sort((a, b) => first(a).localeCompare(first(b)));
  const all = list.flatMap(e => whoAll(e));
  const ppl = PEOPLE.filter(p => all.includes(p.k)).map(p => p.n);
  const dogs = DOGS.filter(x => all.includes(x.k)).map(x => x.n);
  const countries = [...new Set(list.map(e => cName(e.country)).filter(Boolean))];
  const dishes = list.flatMap(e => e.dishes.map(x => ({d: x, e}))).sort((a, b) => (b.d.w || []).length - (a.d.w || []).length).slice(0, 8);
  const inTrip = v => (!t.from || v.date >= t.from) && (!t.to || v.date <= t.to);
  const vis = e => e.visits.some(inTrip) ? e.visits.filter(inTrip) : e.visits;
  let pno = 1;
  const page = e => { pno++; const notes = vis(e).filter(v => v.note).map(v => `„${esc(v.note)}“${v.by && person(v.by) ? ' – ' + esc(person(v.by).n) : ''}`);
    return `<article class="page"><div class="pimg">${e.photos[0] ? img(e.photos[0].path) : ic(grp(e), 56)}</div>
      <h2>${esc(e.name)}</h2><p class="pm">${esc(catLabel(e))}${isStamm(e) ? ' · ' + esc(stammLabel(e)) : ''} · ${esc(e.city)} · ${vis(e).map(v => esc(fmt(v.date))).join(', ')}</p>
      <p>${avs(whoAll(e))}</p>
      ${e.highlight ? `<h4>Highlight</h4><p>${esc(e.highlight)}</p>` : ''}
      ${e.dishes.length ? `<h4>Unbedingt probieren</h4><p>${e.dishes.map(x => esc(x.n)).join(' · ')}</p>` : ''}
      ${notes.length ? `<h4>Erinnerung</h4><p>${notes.join('<br>')}</p>` : ''}
      ${e.priv ? `<h4>Nur für uns</h4><p>${esc(e.priv)}</p>` : ''}
      ${e.tip ? `<h4>Gut zu wissen</h4><p>${esc(e.tip)}</p>` : ''}
      <div class="pno">${pno}</div></article>`; };
  $('#v-buch').innerHTML = `<div class="noprint"><button class="back" data-act="go" data-v="reisen">${ic('back', 20)}Reisen</button>
    <h1 style="font-size:28px;margin:6px 0 4px">Reisebuch</h1>
    <p class="hint" style="margin:0 0 10px">Tippe auf „Als PDF speichern“ und wähle im Druckfenster „Als PDF sichern“ bzw. „PDF speichern“ – oder drucke es direkt aus.</p>
    <button class="btn main" data-act="print" style="width:100%">${ic('print', 18)}Als PDF speichern oder drucken</button></div>
    ${list.length ? `<div class="book">
      <article class="page cover"><img src="logo.png" alt=""><div class="big">${esc(t.name)}</div><p>${esc(fmt(t.from))}${t.to ? ' – ' + esc(fmt(t.to)) : ''}</p><p>${esc(join(ppl))}${dogs.length ? ' mit ' + esc(join(dogs)) : ''}</p><p>${list.length} ${list.length === 1 ? 'Lieblingsort' : 'Lieblingsorte'}${countries.length ? ' · ' + esc(countries.join(', ')) : ''}</p></article>
      ${list.map(page).join('')}
      <article class="page"><h2>Das hat uns am besten geschmeckt</h2>${dishes.length ? dishes.map(x => `<p style="display:flex;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid #E1E6E9"><span>${esc(x.d.n)}<br><span class="pm">${esc(x.e.name)}</span></span>${avs(x.d.w || [])}</p>`).join('') : '<p class="pm">Keine Spezialitäten eingetragen.</p>'}<p style="margin-top:auto;font:600 22px Outfit,sans-serif">Bis zum nächsten Mal.</p><div class="pno">${pno + 1}</div></article>
    </div>` : '<p class="empty">Für diese Reise gibt es noch keine Einträge.</p>'}`;
  hydrate($('#v-buch'));
}
async function printBook() {
  toast('Bereite das Reisebuch vor …');
  await hydrate($('#v-buch'));
  await Promise.all($$('#v-buch img').map(i => i.complete ? null : new Promise(r => { i.onload = i.onerror = r; setTimeout(r, 8000); })));
  try { window.print(); } catch (e) { toast('Drucken geht in diesem Browser leider nicht.'); }
}
function renderRueckblick() {
  const E = S.places; const countries = {}; E.forEach(e => { if (e.country) countries[e.country] = (countries[e.country] || 0) + 1; });
  const per = PEOPLE.map(p => [p, E.filter(e => whoAll(e).includes(p.k)).length]);
  const maxP = Math.max(1, ...per.map(x => x[1])); const maxC = Math.max(1, ...Object.values(countries));
  const dishes = E.flatMap(e => e.dishes.map(d => ({d, e}))).sort((a, b) => (b.d.w || []).length - (a.d.w || []).length).slice(0, 5);
  const now = new Date(); const md = d => { const x = new Date(d + 'T12:00:00'); return Math.abs(new Date(now.getFullYear(), x.getMonth(), x.getDate()) - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 864e5; };
  const mem = E.flatMap(e => e.visits.map(v => ({e, v}))).filter(x => md(x.v.date) <= 10 && x.v.date.slice(0, 4) < String(now.getFullYear())).sort((a, b) => b.v.date.localeCompare(a.v.date))[0];
  const yrs = mem ? now.getFullYear() - +mem.v.date.slice(0, 4) : 0;
  $('#v-rueckblick').innerHTML = `<h1 style="font-size:28px;margin-bottom:12px">Rückblick</h1>
    ${!E.length ? emptyHint() : `
    ${mem ? `<button class="memory" data-act="open" data-id="${esc(mem.e.id)}"><small>${yrs === 1 ? 'Vor einem Jahr' : `Vor ${yrs} Jahren`} · ${esc(fmt(mem.v.date))}</small><div class="ttl" style="font-size:22px;margin:4px 0">${esc(mem.e.name)}, ${esc(mem.e.city)}</div>${mem.v.note ? `<span>„${esc(mem.v.note)}“</span>` : ''}</button>` : ''}
    <div class="stats">${statBtn(Object.keys(countries).length, 'Länder', 'laender')}${statBtn(E.length, 'Lieblingsorte', 'orte')}${statBtn(E.reduce((s, e) => s + e.dishes.length, 0), 'Spezialitäten', 'dishes')}</div>
    ${E.some(isStamm) ? `<h3>Unsere Stammorte</h3>${E.filter(isStamm).sort((a, b) => b.visits.length - a.visits.length).map(row).join('')}<div style="height:18px"></div>` : ''}
    <h3>Wer war wo dabei</h3>${per.map(([p, n]) => `<button class="bar" data-act="showperson" data-k="${p.k}"><span>${av(p.k)} ${esc(p.n)}</span><i style="width:${Math.round(n / maxP * 100)}%;background:${p.c}"></i><span>${n}</span></button>`).join('')}
    <h3 style="margin-top:18px">Länder</h3>${Object.entries(countries).sort((a, b) => b[1] - a[1]).map(([c, n]) => `<button class="bar" data-act="fcountry" data-c="${esc(c)}"><span>${flag(c)} ${esc(cName(c))}</span><i style="width:${Math.round(n / maxC * 100)}%"></i><span>${n}</span></button>`).join('')}
    <h3 style="margin-top:18px" id="rbDishes">Die meistgeliebten Spezialitäten</h3>${dishes.map(x => `<div class="dish"><span>${esc(x.d.n)}<br><span class="hint">${esc(x.e.name)}, ${esc(x.e.city)}</span></span>${avs(x.d.w || [])}</div>`).join('') || '<p class="empty">Noch keine Spezialitäten eingetragen.</p>'}`}`;
  hydrate($('#v-rueckblick'));
}

/* ---------- Teilen ---------- */
function shareText() {
  const sh = S.share; const from = sh.from === 'uns' ? 'uns' : (person(sh.from) || {n: 'uns'}).n;
  const one = (e, short) => {
    const L = [short ? `• ${e.name}, ${e.city}` : `🧡 Tipp von ${from}: ${e.name}, ${e.city}`];
    L.push(`${catLabel(e)}${e.price ? ' · ' + '€'.repeat(e.price) : ''}${isStamm(e) ? ` · ${unser(e, true)} ${stammLabel(e)}` : ''}`);
    if (e.highlight) L.push(`🎵 ${e.highlight}`);
    if (sh.dishes && e.dishes.length) L.push(`😋 Unbedingt probieren: ${e.dishes.map(d => d.n).join(', ')}`);
    if (sh.tip && e.tip) L.push(`💡 Gut zu wissen: ${e.tip}`);
    if (sh.dog && e.dog) L.push(`🐾 ${DOG[e.dog][0]}${e.dogNote ? ': ' + e.dogNote : ''}`);
    if (sh.contact && e.tel) L.push(`📞 ${e.tel}`);
    if (sh.contact && e.res) L.push(`📅 Reservieren: ${asUrl(e.res)}`);
    L.push(`📍 ${mapsUrl(e)}`);
    return L.join('\n');
  };
  if (sh.kind === 'trip') { const t = trip(sh.id); const list = S.places.filter(e => e.trip === sh.id); return `🧡 Unsere Tipps: ${t ? t.name : ''} (von ${from})\n\n` + list.map(e => one(e, true)).join('\n\n'); }
  return one(byId(sh.id), false);
}
function renderShare() {
  const sh = S.share; const text = shareText();
  const title = sh.kind === 'trip' ? (trip(sh.id) || {}).name : (byId(sh.id) || {}).name;
  $('#sheetIn').innerHTML = `<div class="toprow"><h2 style="font-size:22px">Als Tipp teilen</h2><button class="back" data-act="closeSheet" aria-label="Schließen">${ic('x', 22)}</button></div>
    <p class="hint" style="margin:4px 0 0">${esc(title || '')} – so kommt es bei Freunden an:</p>
    <div class="wa"><div class="bubble">${esc(text)}</div></div>
    <div class="f"><label class="l" for="from">Tipp von</label><select id="from"><option value="uns">uns (Familie)</option>${PEOPLE.map(p => `<option value="${p.k}" ${sh.from === p.k ? 'selected' : ''}>${esc(p.n)}</option>`).join('')}</select></div>
    <label class="opt"><input type="checkbox" data-opt="dishes" ${sh.dishes ? 'checked' : ''}>Spezialitäten mitschicken</label>
    <label class="opt"><input type="checkbox" data-opt="tip" ${sh.tip ? 'checked' : ''}>„Gut zu wissen“ mitschicken</label>
    <label class="opt"><input type="checkbox" data-opt="dog" ${sh.dog ? 'checked' : ''}>Hunde-Info mitschicken</label>
    <label class="opt"><input type="checkbox" data-opt="contact" ${sh.contact ? 'checked' : ''}>Telefon und Reservierung mitschicken</label>
    <p class="hint" style="margin:6px 0 14px">${ic('lock', 16)} Notizen „Nur für uns“ werden nie mitgeschickt.</p>
    <div class="btns">${navigator.share ? `<button class="btn main" data-act="nativeShare">${ic('share', 18)}Teilen …</button>` : ''}<a class="btn ${navigator.share ? '' : 'main'}" href="https://wa.me/?text=${encodeURIComponent(text)}" target="_blank" rel="noopener">${ic('chat', 18)}WhatsApp</a><button class="btn" data-act="copy">${ic('copy', 18)}Kopieren</button></div>`;
}
function openShare(kind, id) { S.share = {kind, id, dishes: true, tip: true, dog: true, contact: true, from: 'uns'}; renderShare(); $('#sheet').hidden = false; }

/* ---------- Einstellungen, Sicherung ---------- */
async function loadNotif() {
  try { const r = await sb.from('travel_notif').select('*').eq('person', S.me.toLowerCase()).maybeSingle(); if (!r.error) S.notif = r.data || {eintraege: true, besuche: true, erinnerungen: true}; } catch (e) {}
}
async function saveNotif(k, v) {
  S.notif = Object.assign({eintraege: true, besuche: true, erinnerungen: true}, S.notif || {}, {[k]: v});
  try {
    const r = await sb.from('travel_notif').upsert({person: S.me.toLowerCase(), eintraege: S.notif.eintraege, besuche: S.notif.besuche, erinnerungen: S.notif.erinnerungen, updated_at: new Date().toISOString()});
    if (r.error) throw r.error; toast(v ? 'Eingeschaltet' : 'Ausgeschaltet');
  } catch (e) { fail('Speichern', e); }
}
function renderSettings() {
  const n = Object.assign({eintraege: true, besuche: true, erinnerungen: true}, S.notif || {});
  $('#sheetIn').innerHTML = `<div class="toprow"><h2 style="font-size:22px">Einstellungen</h2><button class="back" data-act="closeSheet" aria-label="Schließen">${ic('x', 22)}</button></div>
    <p style="margin:10px 0 0;display:flex;align-items:center;gap:8px">${av(S.me)} Angemeldet als <b>${esc((person(S.me) || {}).n || '')}</b></p>
    <h3 style="margin-top:20px;display:flex;align-items:center;gap:6px">${ic('bell', 18)}Mitteilungen</h3>
    ${NOTIF.map(([k, l, h]) => `<label class="switch"><span>${esc(l)}<br><span class="hint">${esc(h)}</span></span><input type="checkbox" data-notif="${k}" ${n[k] ? 'checked' : ''} aria-label="${esc(l)}"></label>`).join('')}
    <p class="hint" style="margin:10px 0 0">Deine Auswahl ist gespeichert. Die Mitteilungen aufs Handy schalten wir im nächsten Schritt frei – dann kommen sie nur an, wenn du sie hier eingeschaltet hast.</p>
    <h3 style="margin-top:22px">Sicherung</h3>
    <div class="box"><p>Jede Woche kommt automatisch eine komplette Kopie aller Einträge und Fotos auf OneDrive (Ordner „Travel-Sicherung“) – wird im nächsten Schritt eingerichtet.</p>
    <button class="btn small" data-act="backup" style="margin-top:10px">${ic('download', 16)}Einträge jetzt als Datei sichern</button></div>
    <h3 style="margin-top:22px">Abmelden</h3>
    <p class="hint" style="margin:0 0 8px">Meldet dich auf diesem Gerät auch bei DJNP ab, weil beide Apps denselben Zugang nutzen.</p>
    <button class="btn small warn" data-act="logout">Abmelden</button>`;
}
function backup() {
  const data = {app: 'Travel', exportiert: new Date().toISOString(), von: (person(S.me) || {}).n, reisen: S.trips, orte: S.places.map(e => ({...e, photos: e.photos.map(p => p.path)}))};
  const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `travel-sicherung-${today()}.json`;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  toast('Sicherung gespeichert (ohne Fotos – die kommen mit der OneDrive-Sicherung)', 4200);
}

/* ---------- Navigation und Bedienung ---------- */
function go(v, opt) {
  if (v !== 'detail' && v !== 'neu') S.prevView = v;
  if (v === 'neu' && S.view !== 'neu' && S.view !== 'detail') S.prevView = S.view;
  S.view = v;
  $$('.view').forEach(x => x.hidden = x.id !== 'v-' + v);
  $$('nav button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
  ({karte: renderKarte, liste: renderListe, neu: () => renderForm(opt || {}), reisen: renderReisen, rueckblick: renderRueckblick, detail: renderDetail, buch: renderBuch})[v]();
  window.scrollTo(0, 0);
  if (v === 'karte' && vmapRO && $('#v-karte .mapwrap')) vmapRO.observe($('#v-karte .mapwrap'));
}
function open(id) { if (S.view !== 'detail') S.prevView = S.view === 'neu' ? 'karte' : S.view; S.detail = id; go('detail'); }
const rerenderFilters = () => { if (S.view === 'karte') renderKarte(); else if (S.view === 'liste') renderListe(); };

document.addEventListener('click', async ev => {
  const b = ev.target.closest('[data-act]');
  if (!b) { if (ev.target.id === 'sheet') $('#sheet').hidden = true; return; }
  const a = b.dataset.act, e = S.detail ? byId(S.detail) : null;
  if (a === 'reload') location.reload();
  else if (a === 'logout') { if (b.dataset.sure || !S.me) signOut(); else { b.dataset.sure = '1'; b.textContent = 'Wirklich abmelden? Nochmal tippen'; } }
  else if (a === 'go') go(b.dataset.v);
  else if (a === 'open') { if (lmap) lmap.closePopup(); open(b.dataset.id); }
  else if (a === 'back') go(S.prevView || 'karte');
  else if (a === 'fperson') { const k = b.dataset.k, p = S.f.people; S.f.people = p.includes(k) ? p.filter(x => x !== k) : [...p, k]; rerenderFilters(); }
  else if (a === 'fdog') { S.f.dog = !S.f.dog; rerenderFilters(); }
  else if (a === 'fstamm') { S.f.stamm = !S.f.stamm; rerenderFilters(); }
  else if (a === 'fcountryoff') { S.f.country = ''; rerenderFilters(); }
  else if (a === 'fcountry') showList({country: b.dataset.c});
  else if (a === 'showperson') showList({people: [b.dataset.k]});
  else if (a === 'showLaender') { $('#sheet').hidden = true; S.mapMode = 'laender'; go('karte'); }
  else if (a === 'stat') { const k = b.dataset.k;
    if (k === 'laender') openCountries();
    else if (k === 'orte') showList({});
    else if (k === 'events') showList({group: 'event'});
    else if (k === 'dishes') { const h = $('#rbDishes'); if (h) h.scrollIntoView({behavior: 'smooth', block: 'start'}); } }
  else if (a === 'fgroup') { S.f.group = b.dataset.g; rerenderFilters(); }
  else if (a === 'ftrip') { S.f.trip = ''; rerenderFilters(); }
  else if (a === 'mapmode') { S.mapMode = b.dataset.m; renderKarte(); }
  else if (a === 'locate') locate();
  else if (a === 'vfocus' && vmap) { try { if (b.dataset.w === 'welt') vmap.setFocus({coords: [25, 10], scale: 1, animate: true}); else vmap.setFocus({regions: [...new Set(S.places.map(x => x.country))].filter(Boolean), animate: true}); } catch (x) {} }
  else if (a === 'sortnear') { if (S.sortNear) { S.sortNear = false; renderListe(); } else { try { toast('Suche deinen Standort …'); S.near = await getPos(); S.sortNear = true; renderListe(); } catch (x) { toast('Standort nicht verfügbar. Bitte erlaube den Zugriff auf den Standort.', 4000); } } }
  else if (a === 'stamm' && e) { const will = !isStamm(e); updatePlace(e, {stamm: stammNext(e)}, will ? `Gemerkt: ${unser(e)} ${stammLabel(e)}` : `${stammFem(e) ? 'Keine' : 'Kein'} ${stammLabel(e)} mehr`); }
  else if (a === 'love' && e) { const k = b.dataset.k; updatePlace(e, {loves: e.loves.includes(k) ? e.loves.filter(x => x !== k) : [...e.loves, k]}); }
  else if (a === 'tog') { b.classList.toggle('on'); b.setAttribute('aria-pressed', b.classList.contains('on')); }
  else if (a === 'edit') go('neu', {edit: b.dataset.id});
  else if (a === 'addphotos') $('#addPhotos').click();
  else if (a === 'share') openShare('entry', b.dataset.id);
  else if (a === 'tripShare') openShare('trip', b.dataset.id);
  else if (a === 'closeSheet') $('#sheet').hidden = true;
  else if (a === 'nativeShare') { try { await navigator.share({text: shareText()}); } catch (x) {} }
  else if (a === 'copy') { const txt = shareText(); try { await navigator.clipboard.writeText(txt); toast('Text kopiert'); } catch (x) { toast('Kopieren ging nicht – bitte den Text markieren.'); } }
  else if (a === 'tripList') { S.f = {...emptyF(), trip: b.dataset.id}; S.q = ''; go('liste'); }
  else if (a === 'tripAdd') go('neu', {trip: b.dataset.id});
  else if (a === 'book') { S.buch = b.dataset.id; go('buch'); }
  else if (a === 'print') printBook();
  else if (a === 'settings') { renderSettings(); $('#sheet').hidden = false; }
  else if (a === 'backup') backup();
  else if (a === 'addPhoto') $('#nFile').click();
  else if (a === 'rmPhoto') { S.draft.photos.splice(+b.dataset.i, 1); renderPhotos(); }
  else if (a === 'rmKeep') { S.draft.remove.push(S.draft.keep.splice(+b.dataset.i, 1)[0]); renderPhotos(); }
  else if (a === 'price') { const n = +b.dataset.n; S.draft.price = S.draft.price === n ? 0 : n; $$('#nPrice button').forEach(x => x.classList.toggle('on', +x.dataset.n === S.draft.price)); }
  else if (a === 'addDish') { const i = $('#nDish'); if (i.value.trim()) { S.draft.dishes.push({n: i.value.trim(), w: []}); i.value = ''; renderDishes(); } i.focus(); }
  else if (a === 'rmDish') { S.draft.dishes.splice(+b.dataset.i, 1); renderDishes(); }
  else if (a === 'gpshere') gpsHere();
  else if (a === 'nomsearch') nomSearchUi();
  else if (a === 'pickNom') { applyPlace(nomResults[+b.dataset.i], {forceName: !$('#nName').value.trim()}); $('#nomRes').innerHTML = ''; $('#linkMsg').textContent = 'Ort übernommen. Bitte kurz prüfen.'; }
  else if (a === 'parseLink') parseLink();
  else if (a === 'unzoom') $('#zoom').hidden = true;
  else if (a === 'del') { if (b.dataset.sure) { const x = byId(b.dataset.id); if (x) deletePlace(x); } else { b.dataset.sure = '1'; b.textContent = 'Wirklich löschen? Fotos und Besuche gehen mit. Nochmal tippen'; } }
});
document.addEventListener('click', ev => { const g = ev.target.closest('.gallery img'); if (g && g.src && g.src !== PIX) { $('#zoom img').src = g.src; $('#zoom').hidden = false; } });
document.addEventListener('input', ev => {
  const t = ev.target;
  if (t.id === 'q') { S.q = t.value; renderResults(); }
  if (t.closest && t.closest('#placeForm')) { const er = $('#nErr'); if (er) er.hidden = true; }
  if (t.id === 'nLink' && /^https?:\/\/\S+$/i.test(t.value.trim()) && ev.inputType === 'insertFromPaste') parseLink();
});
document.addEventListener('change', async ev => {
  const t = ev.target;
  if (t.dataset.notif) saveNotif(t.dataset.notif, t.checked);
  else if (t.dataset.opt) { S.share[t.dataset.opt] = t.checked; renderShare(); }
  else if (t.id === 'from') { S.share.from = t.value; renderShare(); }
  else if (t.id === 'nCat' || t.id === 'nCatGroup') {
    const v = $('#nCat').value; $('#customF').hidden = v !== '__new'; if (v === '__new' && t.id === 'nCat') $('#nCatText').focus();
    const g = v === '__new' ? $('#nCatGroup').value : v.startsWith('c:') ? (customCats().find(x => x[0] === v.slice(2)) || ['', 'erleben'])[1] : (CATS[v] || [])[1];
    $('#evF').hidden = g !== 'event';
  }
  else if (t.id === 'nFile') { toast('Fotos werden vorbereitet …'); S.draft.photos.push(...await prepPhotos([...t.files].slice(0, 12))); t.value = ''; renderPhotos(); }
  else if (t.id === 'addPhotos') {
    const e = byId(S.detail); const files = [...t.files].slice(0, 12); t.value = '';
    if (!e || !files.length) return;
    try { toast('Fotos werden vorbereitet …'); const list = await prepPhotos(files); await uploadPhotos(e.id, list, e.photos.length); toast(list.length === 1 ? 'Foto gespeichert' : `${list.length} Fotos gespeichert`); await refresh(); }
    catch (x) { fail('Hochladen', x); }
  }
});
document.addEventListener('submit', async ev => {
  ev.preventDefault();
  const id = ev.target.id;
  if (id === 'loginForm') login();
  else if (id === 'placeForm') savePlace();
  else if (id === 'contactForm') { const e = byId(S.detail); if (e) updatePlace(e, {tel: $('#cTel').value.trim() || null, res: $('#cRes').value.trim() || null, web: $('#cWeb').value.trim() || null}, 'Kontakt gespeichert'); }
  else if (id === 'visitForm') {
    const e = byId(S.detail); const who = picked('#vwho'); const er = $('#verr');
    if (!who.length) { er.textContent = 'Wähle aus, wer dabei war.'; er.hidden = false; return; }
    try { const r = await sb.from('travel_visits').insert({id: uid(), place_id: e.id, date: $('#vd').value || today(), who, note: $('#vn').value.trim() || null, by: S.me}); if (r.error) throw r.error; toast(e.stamm == null && e.visits.length + 1 === STAMM_AB ? `${STAMM_AB}. Besuch – ab jetzt ${stammFem(e) ? 'eure' : 'euer'} ${stammLabel(e)}!` : 'Besuch gespeichert', 3600); await refresh(); }
    catch (x) { fail('Speichern', x); }
  } else if (id === 'tripForm') {
    const n = $('#tName').value.trim(), fr = $('#tFrom').value, to = $('#tTo').value, er = $('#tErr');
    if (!n || !fr) { er.textContent = 'Name und Startdatum fehlen noch.'; er.hidden = false; return; }
    if (to && to < fr) { er.textContent = 'Das Enddatum liegt vor dem Start.'; er.hidden = false; return; }
    try { const tid = uid(); const r = await sb.from('travel_trips').insert({id: tid, name: n, date_from: fr, date_to: to || null, created_by: S.me}); if (r.error) throw r.error; S.trips.push({id: tid, name: n, from: fr, to}); toast('Reise angelegt'); go('neu', {trip: tid}); refresh(); }
    catch (x) { fail('Speichern', x); }
  }
});
document.addEventListener('keydown', ev => {
  if (ev.key === 'Escape') { $('#sheet').hidden = true; $('#zoom').hidden = true; }
  if (ev.key === 'Enter' && ev.target.id === 'nDish') { ev.preventDefault(); $('[data-act=addDish]').click(); }
  if (ev.key === 'Enter' && ev.target.id === 'nSearch') { ev.preventDefault(); nomSearchUi(); }
});
let rz; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (lmap) lmap.invalidateSize(); if (vmap) { try { vmap.updateSize(); } catch (e) {} } }, 150); });
window.addEventListener('online', () => { if (S.me) refresh(); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.me) refresh(); });

if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
boot();
})();
