/* Krashout OS v3
   Riel con 3 bolitas → cajón → pantalla. Todo funciona dentro del software.
   Datos cifrados en el aparato (AES-GCM con llave sacada de la contraseña de Panini).
   Seguridad: nada de innerHTML; todo texto entra como nodo de texto. */
{
'use strict';
const $ = s => document.querySelector(s);
const SVGNS = 'http://www.w3.org/2000/svg';

/* ---------- Constructor seguro de elementos ---------- */
function h(tag, attrs, ...kids){
  const e = document.createElement(tag);
  for(const [k, v] of Object.entries(attrs || {})){
    if(v == null || v === false) continue;
    if(k === 'class') e.className = v;
    else if(k === 'style') for(const [p, val] of Object.entries(v)) e.style.setProperty(p, val);
    else if(k === 'value') e.value = v;
    else if(k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : String(v));
  }
  for(const c of kids.flat(9)){ if(c == null || c === false || c === '') continue; e.append(c instanceof Node ? c : document.createTextNode(String(c))); }
  return e;
}
function icon(paths){ const s = document.createElementNS(SVGNS, 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '2'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('aria-hidden', 'true'); for(const d of paths){ const p = document.createElementNS(SVGNS, 'path'); p.setAttribute('d', d); s.append(p); } return s; }
const I = {edit: ['M4 20h4L19 9l-4-4L4 16z'], x: ['M6 6l12 12M18 6 6 18'], plus: ['M12 5v14M5 12h14'], minus: ['M5 12h14'], go: ['M9 6l6 6-6 6'],
  plan: ['M5 6h14M5 12h14M5 18h9'], box: ['M4 8l8-4 8 4v8l-8 4-8-4z', 'M4 8l8 4 8-4M12 12v8'], cash: ['M3 7h18v10H3z', 'M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4'],
  alert: ['M12 3 2 20h20z', 'M12 10v4M12 17v.5'], cart: ['M3 4h3l2 11h11l2-8H7', 'M10 19h.01M17 19h.01'], plug: ['M9 3v5M15 3v5M6 8h12v3a6 6 0 0 1-12 0z', 'M12 17v4'], shield: ['M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z', 'M9 12l2 2 4-4']};

/* ---------- Limpieza de todo lo que entra ---------- */
const LIM = {plan: 20, obj: 40, sub: 80, inv: 500, ventas: 2000, mat: 80, txt: 120, name: 60};
const BAD = new RegExp('[' + [[0x00,0x1F],[0x7F,0x9F],[0xAD,0xAD],[0x61C,0x61C],[0x180E,0x180E],[0x200B,0x200F],[0x2028,0x202E],[0x2060,0x2069],[0xFEFF,0xFEFF]].map(([x, y]) => String.fromCharCode(x) + '-' + String.fromCharCode(y)).join('').replace(/[\]\\^-]/g, m => m === '-' ? '-' : '\\' + m) + ']', 'g');
const txt = (v, n = LIM.txt) => Array.from(String(v ?? '').slice(0, n * 4).replace(BAD, ' ').replace(/\s+/g, ' ').trim()).slice(0, n).join('');
const num = (v, max = 1e7) => { const n = Number(String(v ?? '').replace(/[^0-9.]/g, '')); return Number.isFinite(n) ? Math.min(Math.max(n, 0), max) : 0; };
const int = (v, max = 1e5) => Math.round(num(v, max));
const okId = v => typeof v === 'string' && /^[a-z0-9-]{1,48}$/.test(v);
const uid = () => { const a = new Uint8Array(8); crypto.getRandomValues(a); return Array.from(a, b => (b % 36).toString(36)).join(''); };
const money = n => new Intl.NumberFormat('es-MX', {style: 'currency', currency: 'MXN', maximumFractionDigits: 2}).format(n || 0);
const dayKey = d => new Intl.DateTimeFormat('en-CA', {timeZone: 'America/Tijuana', year: 'numeric', month: '2-digit', day: '2-digit'}).format(d);

/* ---------- Datos ---------- */
const SEED = [
  ['shopify', 'Shopify', [['Cuenta y plan Basic activos', 1], ['Tienda renombrada a Krashout con krashoutmxl@gmail.com', 1], ['Conector de Shopify en Claude funcionando', 1], ['Tema de prueba con estilo urbano (negro, fotos grandes)'], ['Colecciones: por marca, Bolsas Longchamp, Mayoreo'], ['Fichas con fotos reales y prueba de autenticidad'], ['Pagos (Shopify Payments)'], ['Envíos (Mexicali local + paquetería)'], ['Políticas (cambios, envíos, "no somos distribuidor oficial")'], ['Canal Facebook & Instagram y Google conectados']]],
  ['bolsas', 'Bolsas Longchamp (Navidad)', [['Inventario actual contado y en Shopify'], ['Fotos reales de etiquetas por bolsa'], ['Pedido de más stock'], ['Campaña de regalo 1–20 dic']]],
  ['tiktok', 'TikTok', [['Cuenta de negocio creada'], ['Link a Shopify en la bio'], ['Primeros 10 videos publicados']]],
  ['instagram', 'Instagram', [['Cuenta de negocio @krashoutco en el portafolio de Meta', 1], ['Vinculada a Shopify (etiquetas de producto)'], ['Historias diarias']]],
  ['facebook', 'Facebook (comercio local)', [['Página Krashout en el portafolio', 1], ['Respuestas automáticas de Messenger'], ['Piezas publicadas en Marketplace']]],
  ['colectivos', 'Colectivos', [['Lista de colectivos de Mexicali con renta y comisión'], ['Visitar 3 y escoger 1'], ['Exhibidor + QR listos']]],
  ['software', 'Software Krashout OS', [['Prototipo visual', 1], ['Bitácora por objetivos funcionando', 1], ['Menú de 3 bolitas: plan → objetivos → pasos', 1], ['Inventario y Venta rápida dentro del software', 1], ['Usuario Panini con contraseña y datos cifrados', 1], ['Link propio fuera de GitHub'], ['Sincronizar compu y cel (Supabase)'], ['Urgencias conectadas a Shopify y Gmail'], ['Resumen cada hora (tarea programada)']]]
];
const SEED_MAT = ['Exhibidor de pared para 15–30 gorras', 'Etiquetas con precio y QR a Shopify', 'Empaques para envíos y entregas'];
const mkObjs = list => list.map(([id, nombre, subs]) => ({id, nombre, subs: subs.map(([t, ok], j) => ({id: id.slice(0, 2) + (j + 1), t, ok: !!ok}))}));
const fresh = () => ({v: 3, planes: [{id: 'plan-krashout', nombre: 'El plan Krashout', objs: mkObjs(SEED)}], inv: [], ventas: [], mat: SEED_MAT.map((t, k) => ({id: 'm' + (k + 1), t, ok: false})), cfg: {mayoreoMin: 0, stockMin: 2}});

function clean(d){
  const o = fresh(); if(!d || typeof d !== 'object') return o;
  const subs = a => (Array.isArray(a) ? a : []).slice(0, LIM.sub).map(s => s && {id: okId(s.id) ? s.id : uid(), t: txt(s.t), ok: s.ok === true}).filter(s => s && s.t);
  const objs = a => (Array.isArray(a) ? a : []).slice(0, LIM.obj).map(x => x && {id: okId(x.id) ? x.id : uid(), nombre: txt(x.nombre, LIM.name) || 'Sin nombre', subs: subs(x.subs)}).filter(Boolean);
  if(Array.isArray(d.planes)) o.planes = d.planes.slice(0, LIM.plan).map(p => p && {id: okId(p.id) ? p.id : uid(), nombre: txt(p.nombre, LIM.name) || 'Plan', objs: objs(p.objs)}).filter(Boolean);
  if(Array.isArray(d.inv)) o.inv = d.inv.slice(0, LIM.inv).map(p => p && {id: okId(p.id) ? p.id : uid(), tipo: p.tipo === 'bolsa' ? 'bolsa' : p.tipo === 'otro' ? 'otro' : 'gorra', marca: txt(p.marca, 40), modelo: txt(p.modelo, 60), detalle: txt(p.detalle, 60), precio: num(p.precio), mayoreo: num(p.mayoreo), stock: int(p.stock), min: p.min == null ? null : int(p.min, 999)}).filter(p => p && (p.marca || p.modelo));
  if(Array.isArray(d.ventas)) o.ventas = d.ventas.slice(-LIM.ventas).map(v => v && {id: okId(v.id) ? v.id : uid(), ts: Number.isFinite(v.ts) ? v.ts : Date.now(), tipo: v.tipo === 'mayoreo' ? 'mayoreo' : 'menudeo', items: (Array.isArray(v.items) ? v.items : []).slice(0, 100).map(i => i && {pid: okId(i.pid) ? i.pid : '', n: txt(i.n, 100), c: int(i.c, 9999), p: num(i.p)}).filter(Boolean), total: num(v.total, 1e8)}).filter(Boolean);
  if(Array.isArray(d.mat)) o.mat = d.mat.slice(0, LIM.mat).map(i => i && {id: okId(i.id) ? i.id : uid(), t: txt(i.t, 80), ok: i.ok === true}).filter(i => i && i.t);
  if(d.cfg && typeof d.cfg === 'object') o.cfg = {mayoreoMin: int(d.cfg.mayoreoMin, 999), stockMin: int(d.cfg.stockMin ?? 2, 999)};
  return o;
}

/* ---------- Cifrado (WebCrypto) ---------- */
const enc = new TextEncoder(), dec = new TextDecoder();
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const ITER = 310000, USER = 'panini';
const store = {get(k){ try { return localStorage.getItem(k); } catch(_) { return null; } }, set(k, v){ try { localStorage.setItem(k, v); return true; } catch(_) { return false; } }, del(k){ try { localStorage.removeItem(k); } catch(_) {} }};
const sess = {get(k){ try { return sessionStorage.getItem(k); } catch(_) { return null; } }, set(k, v){ try { sessionStorage.setItem(k, v); } catch(_) {} }, del(k){ try { sessionStorage.removeItem(k); } catch(_) {} }};
async function deriveRaw(pass, salt, iter){ const base = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveBits']); return crypto.subtle.deriveBits({name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter}, base, 256); }
const aesKey = raw => crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
async function seal(key, obj){ const iv = crypto.getRandomValues(new Uint8Array(12)); const ct = await crypto.subtle.encrypt({name: 'AES-GCM', iv}, key, enc.encode(JSON.stringify(obj))); return {iv: b64(iv), ct: b64(ct)}; }
async function open_(key, box){ const pt = await crypto.subtle.decrypt({name: 'AES-GCM', iv: unb64(box.iv)}, key, unb64(box.ct)); return JSON.parse(dec.decode(pt)); }

let KEY = null, D = null, saveT = 0;
async function flushNow(){
  clearTimeout(saveT); saveT = 0; if(!KEY || !D) return;
  try { const box = await seal(KEY, D); if(!store.set('kos-data', JSON.stringify(box))) toast('No se pudo guardar: el aparato no tiene espacio.', false); } catch(_) { toast('No se pudo guardar el cambio.', false); }
}
function save(){ clearTimeout(saveT); saveT = setTimeout(flushNow, 200); }

/* ---------- Entrada ---------- */
const auth = (() => { try { return JSON.parse(store.get('kos-auth') || 'null'); } catch(_) { return null; } })();
let AUTH = auth && auth.v === 1 && auth.salt && auth.check ? auth : null;
function loginMode(){
  const first = !AUTH;
  $('#ltitle').textContent = first ? 'Crea tu contraseña' : 'Entrar';
  $('#lsub').textContent = first ? 'Primera vez en este aparato. Usuario: Panini. La contraseña la pones tú (mínimo 8 letras o números).' : 'Usuario y contraseña.';
  $('#lpass2w').hidden = !first; $('#lpass2').required = first;
  $('#lpass').autocomplete = first ? 'new-password' : 'current-password';
  $('#lbtn').textContent = first ? 'Crear y entrar' : 'Entrar';
  $('#lforgot').hidden = first;
}
function lmsg(t, bad){ const m = $('#lmsg'); m.textContent = t || ''; m.className = 'lmsg ' + (bad ? 'bad' : 'ok'); }
function lockedFor(){ const l = Number(store.get('kos-lock') || 0); return Math.max(0, l - Date.now()); }

$('#flogin').addEventListener('submit', async e => {
  e.preventDefault();
  const user = $('#luser').value.trim().toLowerCase(), pass = $('#lpass').value;
  if(user !== USER){ lmsg('Ese usuario no existe.', true); return; }
  const wait = lockedFor(); if(wait){ lmsg('Demasiados intentos. Espera ' + Math.ceil(wait / 1000) + ' segundos.', true); return; }
  $('#lbtn').disabled = true; lmsg('Revisando…');
  try {
    if(!AUTH){
      if(pass.length < 8){ lmsg('Mínimo 8 caracteres.', true); return; }
      if(pass !== $('#lpass2').value){ lmsg('Las contraseñas no son iguales.', true); return; }
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const raw = await deriveRaw(pass, salt, ITER); KEY = await aesKey(raw);
      AUTH = {v: 1, user: 'Panini', salt: b64(salt), iter: ITER, check: await seal(KEY, {ok: 'krashout'})};
      store.set('kos-auth', JSON.stringify(AUTH));
      D = migrateOld() || fresh(); save();
      sess.set('kos-k', b64(raw)); enter(); return;
    }
    const raw = await deriveRaw(pass, unb64(AUTH.salt), AUTH.iter || ITER); const k = await aesKey(raw);
    let ok = false; try { ok = (await open_(k, AUTH.check)).ok === 'krashout'; } catch(_) {}
    if(!ok){
      const n = Number(store.get('kos-fails') || 0) + 1; store.set('kos-fails', String(n));
      if(n >= 5){ store.set('kos-lock', String(Date.now() + 60000 * Math.min(2 ** (n - 5), 30))); lmsg('Contraseña incorrecta. Bloqueado un rato por seguridad.', true); }
      else lmsg('Contraseña incorrecta. Te quedan ' + (5 - n) + ' intentos.', true);
      return;
    }
    store.del('kos-fails'); store.del('kos-lock');
    KEY = k; await loadData(); sess.set('kos-k', b64(raw)); enter();
  } catch(_) { lmsg('Algo falló al entrar. Recarga la página.', true); }
  finally { $('#lbtn').disabled = false; $('#lpass').value = ''; $('#lpass2').value = ''; }
});
$('#lforgot').addEventListener('click', () => ask('¿Empezar de cero?', 'Tus datos están cifrados con tu contraseña: sin ella no se pueden abrir. Si sigues, se borra todo lo de este aparato (bitácora, inventario y ventas) y creas una contraseña nueva.', 'Borrar y empezar', () => {
  for(const k of ['kos-auth', 'kos-data', 'kos-fails', 'kos-lock']) store.del(k); AUTH = null; loginMode(); lmsg('Listo. Crea tu contraseña nueva.');
}));

async function loadData(){
  let box = null; try { box = JSON.parse(store.get('kos-data') || 'null'); } catch(_) {}
  D = box ? clean(await open_(KEY, box)) : (migrateOld() || fresh());
  save();
}
/* Trae la bitácora de la versión anterior (modo prueba) y quita la copia sin cifrar. */
function migrateOld(){
  let d = null; try { d = JSON.parse(store.get('kos-demo') || 'null'); } catch(_) {}
  if(!d || !Array.isArray(d.objs) || !d.objs.length) return null;
  const n = fresh();
  n.planes[0].objs = d.objs.map(o => ({id: o.id, nombre: o.nombre, subs: o.subs}));
  const sw = n.planes[0].objs.find(o => o.id === 'software');
  if(sw) for(const [t, ok] of SEED[6][2]) if(!sw.subs.some(s => s.t === t)) sw.subs.push({id: uid(), t, ok: !!ok});
  if(Array.isArray(d.mat)) n.mat = d.mat;
  store.del('kos-demo'); store.del('kos-pend');
  return clean(n);
}

let idleT = 0;
const IDLE = 30 * 60 * 1000;
function bumpIdle(){ clearTimeout(idleT); idleT = setTimeout(() => lock('Se cerró la sesión por inactividad.'), IDLE); }
async function lock(t){ if(saveT) await flushNow(); KEY = null; D = null; sess.del('kos-k'); clearTimeout(idleT); $('#app').hidden = true; $('#login').hidden = false; closeDrawer(); loginMode(); lmsg(t || ''); $('#lpass').focus(); }
$('#lock').addEventListener('click', () => lock('Sesión cerrada.'));
for(const ev of ['pointerdown', 'keydown']) document.addEventListener(ev, () => { if(KEY) bumpIdle(); }, {passive: true});
function enter(){ $('#login').hidden = true; $('#app').hidden = false; bumpIdle(); route(); }

/* ---------- Navegación: bolitas, cajón y pantallas ---------- */
let bolita = null;
const routeTo = h_ => { if(location.hash === h_) route(); else location.hash = h_; };
window.addEventListener('hashchange', () => { if(KEY) route(); });
function parse(){ const p = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent); return {v: p[0] || '', a: p[1] || '', b: p[2] || ''}; }
const BOL = {plan: ['plan', 'objs'], tienda: ['inventario', 'venta', 'ventas'], centro: ['urgencias', 'comprar', 'conectores', 'seguridad']};
const bolitaOf = v => Object.keys(BOL).find(k => BOL[k].includes(v)) || null;

for(const b of document.querySelectorAll('.bolita')) b.addEventListener('click', () => {
  const k = b.dataset.b;
  if(bolita === k && !$('#drawer').hidden){ closeDrawer(); return; }
  openDrawer(k);
});
$('#scrim').addEventListener('click', closeDrawer);
document.addEventListener('keydown', e => { if(e.key === 'Escape'){ if(!$('#modal').hidden) closeModal(); else closeDrawer(); } });
const small = () => matchMedia('(max-width:760px)').matches;
function openDrawer(k){ bolita = k; renderDrawer(); $('#drawer').hidden = false; $('#scrim').hidden = !small(); markRail(); }
function closeDrawer(){ $('#drawer').hidden = true; $('#scrim').hidden = true; bolita = bolitaOf(parse().v); markRail(); }
function markRail(){ const cur = $('#drawer').hidden ? bolitaOf(parse().v) : bolita; for(const b of document.querySelectorAll('.bolita')){ const on = b.dataset.b === cur; b.classList.toggle('on', on); b.setAttribute('aria-expanded', String(on && !$('#drawer').hidden)); } }

const prog = objs => { let n = 0, d = 0; for(const o of objs) for(const s of o.subs){ n++; if(s.ok) d++; } return {n, d, pct: n ? Math.round(d / n * 100) : 0}; };
const bar = (pct, full) => h('div', {class: 'bar'}, h('b', {class: full ? 'g' : '', style: {width: pct + '%'}}));
const lowStock = () => D.inv.filter(p => p.stock <= (p.min ?? D.cfg.stockMin)).sort((a, b) => (a.tipo === 'bolsa' ? 0 : 1) - (b.tipo === 'bolsa' ? 0 : 1) || a.stock - b.stock);
const todaySales = () => { const k = dayKey(new Date()); return D.ventas.filter(v => dayKey(new Date(v.ts)) === k); };

function ditem(href, ico, title, sub, extra){
  const on = location.hash === href || (href !== '#/' && location.hash.startsWith(href + '/'));
  return h('a', {class: 'ditem' + (on ? ' on' : ''), href, onclick: () => { if(small()) setTimeout(closeDrawer, 0); }}, ico ? icon(ico) : '', h('span', {class: 'dt'}, h('b', null, title), sub ? h('small', null, sub) : '', extra || ''), icon(I.go));
}
function renderDrawer(){
  const dr = $('#drawer');
  if(bolita === 'plan'){
    let inp;
    dr.replaceChildren(h('h2', null, 'Plan'), h('p', {class: 'dsub'}, 'Pica el plan para ver sus objetivos.'),
      ...D.planes.map(p => { const g = prog(p.objs); return ditem('#/plan/' + p.id, I.plan, p.nombre, g.d + '/' + g.n + ' pasos · ' + g.pct + '%', bar(g.pct, g.n && g.d === g.n)); }),
      h('form', {class: 'add', onsubmit: e => { e.preventDefault(); const t = txt(inp.value, LIM.name); if(!t) return; if(D.planes.length >= LIM.plan) return toast('Máximo ' + LIM.plan + ' planes.', false); const p = {id: uid(), nombre: t, objs: []}; D.planes.push(p); save(); inp.value = ''; routeTo('#/plan/' + p.id); }},
        inp = h('input', {placeholder: 'Nuevo plan', 'aria-label': 'Nuevo plan', maxlength: LIM.name, autocomplete: 'off'}), h('button', {class: 'btn', type: 'submit'}, '+')));
  } else if(bolita === 'tienda'){
    const tv = todaySales(), tt = tv.reduce((a, v) => a + v.total, 0), pz = D.inv.reduce((a, p) => a + p.stock, 0);
    dr.replaceChildren(h('h2', null, 'Tienda'), h('p', {class: 'dsub'}, 'Inventario y ventas.'),
      ditem('#/inventario', I.box, 'Inventario', D.inv.length + ' productos · ' + pz + ' piezas'),
      ditem('#/venta', I.cash, 'Venta rápida', 'Menudeo y mayoreo'),
      ditem('#/ventas', I.plan, 'Ventas', 'Hoy: ' + tv.length + ' · ' + money(tt)));
  } else if(bolita === 'centro'){
    const low = lowStock().length;
    dr.replaceChildren(h('h2', null, 'Centro'), h('p', {class: 'dsub'}, 'Lo urgente, lo que hay que comprar y las conexiones.'),
      ditem('#/urgencias', I.alert, 'Urgencias', urgencias().filter(u => u.lvl !== 'n').length + ' cosas'),
      ditem('#/comprar', I.cart, 'Por comprar', low + ' con stock bajo · ' + D.mat.filter(m => !m.ok).length + ' material'),
      ditem('#/conectores', I.plug, 'Conectores', 'Shopify, Gmail, Meta, TikTok'),
      ditem('#/seguridad', I.shield, 'Seguridad', 'Usuario Panini, contraseña y respaldo'));
  }
}

function route(){
  const {v, a, b} = parse();
  const m = $('#main');
  let view;
  if(v === 'plan' && a && b) view = vObj(a, b);
  else if(v === 'plan' && a) view = vPlan(a);
  else if(v === 'inventario') view = vInv();
  else if(v === 'venta') view = vVenta();
  else if(v === 'ventas') view = vVentas();
  else if(v === 'urgencias') view = vUrg();
  else if(v === 'comprar') view = vComprar();
  else if(v === 'conectores') view = vCon();
  else if(v === 'seguridad') view = vSeg();
  else view = vInicio();
  m.replaceChildren(view);
  if(!$('#drawer').hidden) renderDrawer();
  markRail();
  if(!small() && !$('#drawer').hidden && bolitaOf(v) && bolita !== bolitaOf(v)) openDrawer(bolitaOf(v));
  window.scrollTo(0, 0);
}
const rerender = () => { const y = window.scrollY; route(); window.scrollTo(0, y); };
const crumbs = (...parts) => h('nav', {class: 'crumbs', 'aria-label': 'Ruta'}, ...parts.flatMap((p, i) => [i ? h('span', {'aria-hidden': 'true'}, '›') : '', p[1] ? h('a', {href: p[1]}, p[0]) : h('span', null, p[0])]));
const head = (title, sub, ...actions) => h('div', {class: 'ph'}, h('div', null, h('h1', null, title), sub ? h('p', null, sub) : ''), actions.length ? h('div', {class: 'row'}, ...actions) : '');

/* ---------- Inicio ---------- */
function nextStep(){ for(const p of D.planes) for(const o of p.objs){ const s = o.subs.find(x => !x.ok); if(s) return {p, o, s}; } return null; }
function vInicio(){
  const all = D.planes.flatMap(p => p.objs), g = prog(all), nx = nextStep();
  const ring = document.createElementNS(SVGNS, 'svg'); ring.setAttribute('viewBox', '0 0 104 104'); ring.setAttribute('aria-hidden', 'true');
  const c1 = document.createElementNS(SVGNS, 'circle'), c2 = document.createElementNS(SVGNS, 'circle');
  for(const [c, col] of [[c1, '#26262b'], [c2, '#D7FF3D']]){ c.setAttribute('cx', '52'); c.setAttribute('cy', '52'); c.setAttribute('r', '44'); c.setAttribute('fill', 'none'); c.setAttribute('stroke', col); c.setAttribute('stroke-width', '10'); }
  c2.setAttribute('stroke-linecap', 'round'); c2.setAttribute('transform', 'rotate(-90 52 52)'); c2.setAttribute('stroke-dasharray', (g.n ? g.d / g.n * 276.5 : 0).toFixed(1) + ' 276.5'); ring.append(c1, c2);
  const t = new Date(dayKey(new Date()) + 'T00:00:00'), y = t.getFullYear(), days = (mo, dd) => Math.round((new Date(y, mo, dd) - t) / 864e5);
  const cd = (n, lbl, done) => h('div', null, h('b', {class: n >= 0 && n <= 7 ? 'hot' : ''}, n < 0 ? '✓' : String(n)), h('span', null, n < 0 ? done : lbl));
  const tv = todaySales(), low = lowStock();
  return h('div', null,
    h('p', {class: 'mut', style: {margin: '0 0 4px'}}, new Date().toLocaleDateString('es-MX', {weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Tijuana'})),
    head('Qué onda, Panini', 'Pica una bolita a la izquierda: Plan, Tienda o Centro.'),
    h('section', {class: 'hero'},
      h('a', {class: 'card ring tile', href: D.planes[0] ? '#/plan/' + D.planes[0].id : '#/'}, ring, h('div', null, h('div', {class: 'n'}, String(g.d), h('small', null, '/' + g.n)), h('div', {class: 'mut'}, g.pct + '% del plan cumplido'))),
      h('div', {class: 'card nx'}, h('div', {class: 'k'}, 'Siguiente paso'),
        nx ? [h('div', {class: 't'}, nx.s.t), h('div', {class: 'o'}, nx.p.nombre + ' › ' + nx.o.nombre),
          h('div', {class: 'row'}, h('button', {class: 'btn lime', type: 'button', onclick: () => { nx.s.ok = true; save(); toast('Hecho: ' + nx.s.t, true, () => { nx.s.ok = false; save(); rerender(); }); rerender(); }}, 'Marcar como hecho'), h('a', {class: 'btn', href: '#/plan/' + nx.p.id + '/' + nx.o.id}, 'Abrir objetivo'))]
          : h('div', {class: 't'}, 'Todo en verde. Agrega el siguiente objetivo.')),
      h('div', {class: 'card'}, h('div', {class: 'k'}, 'Navidad · bolsas Longchamp'), h('div', {class: 'cd'},
        cd(days(11, 1), 'días para tener bolsas en Shopify (1 dic)', 'Ya pasó el 1 de dic'), cd(days(11, 20), 'días de campaña de regalo (hasta 20 dic)', 'Campaña terminada')))),
    h('div', {class: 'grid g3'},
      h('a', {class: 'card tile', href: '#/ventas'}, h('span', {class: 'v'}, money(tv.reduce((a, v) => a + v.total, 0))), h('span', {class: 'l'}, 'Vendido hoy · ' + tv.length + ' ventas')),
      h('a', {class: 'card tile', href: '#/inventario'}, h('span', {class: 'v'}, String(D.inv.reduce((a, p) => a + p.stock, 0))), h('span', {class: 'l'}, 'Piezas en inventario · ' + D.inv.length + ' productos')),
      h('a', {class: 'card tile', href: '#/comprar'}, h('span', {class: 'v'}, String(low.length)), h('span', {class: 'l'}, 'Productos con stock bajo'))));
}

/* ---------- Plan → objetivos ---------- */
const findPlan = id => D.planes.find(p => p.id === id);
function vPlan(pid){
  const p = findPlan(pid); if(!p) return notFound();
  const g = prog(p.objs); let inp;
  return h('div', null, crumbs(['Inicio', '#/'], ['Plan'], [p.nombre]),
    head(p.nombre, g.d + ' de ' + g.n + ' pasos cumplidos · ' + g.pct + '%',
      h('button', {class: 'btn sm', type: 'button', onclick: () => rename('Nombre del plan', p.nombre, LIM.name, v => { p.nombre = v; save(); rerender(); })}, 'Renombrar'),
      D.planes.length > 1 ? h('button', {class: 'btn sm red', type: 'button', onclick: () => ask('¿Quitar el plan "' + p.nombre + '"?', 'Se quitan sus ' + p.objs.length + ' objetivos y ' + g.n + ' pasos.', 'Quitar plan', () => { D.planes = D.planes.filter(x => x !== p); save(); routeTo('#/'); })}, 'Quitar plan') : ''),
    bar(g.pct, g.n && g.d === g.n), h('div', {style: {height: '18px'}}),
    h('div', {class: 'grid gobj'},
      ...p.objs.map(o => { const n = o.subs.length, d = o.subs.filter(s => s.ok).length, full = n > 0 && d === n, nx = o.subs.find(s => !s.ok);
        return h('a', {class: 'card ocard', href: '#/plan/' + p.id + '/' + o.id},
          h('div', {class: 'oh'}, h('span', {class: 'dot' + (full ? ' g' : '')}), h('span', {class: 'on'}, o.nombre), h('span', {class: 'oc' + (full ? ' full' : '')}, d + '/' + n)),
          bar(n ? Math.round(d / n * 100) : 0, full), h('span', {class: 'of'}, full ? 'Cumplido' : nx ? 'Sigue: ' + nx.t : 'Sin pasos todavía')); }),
      h('form', {class: 'card ocard new', onsubmit: e => { e.preventDefault(); const t = txt(inp.value, LIM.name); if(!t) return; if(p.objs.length >= LIM.obj) return toast('Máximo ' + LIM.obj + ' objetivos.', false); const o = {id: uid(), nombre: t, subs: []}; p.objs.push(o); save(); routeTo('#/plan/' + p.id + '/' + o.id); }},
        h('b', null, 'Nuevo objetivo'), inp = h('input', {placeholder: 'Ej. WhatsApp Business', 'aria-label': 'Nuevo objetivo', maxlength: LIM.name, autocomplete: 'off'}), h('button', {class: 'btn lime', type: 'submit'}, '+ Objetivo'))));
}

let onlyPending = false, editing = null;
function vObj(pid, oid){
  const p = findPlan(pid), o = p && p.objs.find(x => x.id === oid); if(!o) return notFound();
  const n = o.subs.length, d = o.subs.filter(s => s.ok).length, full = n > 0 && d === n;
  const list = o.subs.filter(s => !onlyPending || !s.ok), hidden = n - list.length;
  let inp;
  const row = s => {
    if(editing === s.id){
      const e = h('input', {class: 'ed', value: s.t, maxlength: LIM.txt, 'aria-label': 'Editar paso', autocomplete: 'off'}); let done = false;
      const fin = keep => { if(done) return; done = true; editing = null; const v = txt(e.value); if(keep && v) { s.t = v; save(); } rerender(); };
      e.addEventListener('keydown', ev => { if(ev.key === 'Enter'){ ev.preventDefault(); fin(true); } if(ev.key === 'Escape'){ ev.stopPropagation(); fin(false); } });
      e.addEventListener('blur', () => fin(true)); requestAnimationFrame(() => { e.focus(); e.select(); });
      return h('div', {class: 'si'}, e);
    }
    return h('div', {class: 'si'},
      h('button', {class: 'st' + (s.ok ? ' done' : ''), type: 'button', 'aria-pressed': String(s.ok), onclick: () => { s.ok = !s.ok; save(); rerender(); }}, h('span', {class: 'dot' + (s.ok ? ' g' : '')}), h('span', {class: 'tx'}, s.t)),
      h('button', {class: 'ic', type: 'button', title: 'Editar', 'aria-label': 'Editar paso', onclick: () => { editing = s.id; rerender(); }}, icon(I.edit)),
      h('button', {class: 'ic x', type: 'button', title: 'Quitar', 'aria-label': 'Quitar paso', onclick: () => { const k = o.subs.indexOf(s); o.subs.splice(k, 1); save(); rerender(); toast('Paso quitado', true, () => { o.subs.splice(k, 0, s); save(); rerender(); }); }}, icon(I.x)));
  };
  return h('div', null, crumbs(['Inicio', '#/'], [p.nombre, '#/plan/' + p.id], [o.nombre]),
    head(o.nombre, d + ' de ' + n + ' pasos · pica un paso para pasarlo de rojo a verde',
      h('div', {class: 'seg', role: 'group', 'aria-label': 'Filtro'},
        h('button', {type: 'button', 'aria-pressed': String(!onlyPending), onclick: () => { onlyPending = false; rerender(); }}, 'Todo (' + n + ')'),
        h('button', {type: 'button', 'aria-pressed': String(onlyPending), onclick: () => { onlyPending = true; rerender(); }}, 'Lo que falta (' + (n - d) + ')')),
      h('button', {class: 'btn sm', type: 'button', onclick: () => rename('Nombre del objetivo', o.nombre, LIM.name, v => { o.nombre = v; save(); rerender(); })}, 'Renombrar'),
      h('button', {class: 'btn sm red', type: 'button', onclick: () => ask('¿Quitar "' + o.nombre + '"?', 'Se quitan sus ' + n + ' pasos.', 'Quitar objetivo', () => { p.objs = p.objs.filter(x => x !== o); save(); routeTo('#/plan/' + p.id); })}, 'Quitar')),
    bar(n ? Math.round(d / n * 100) : 0, full), h('div', {style: {height: '14px'}}),
    h('section', {class: 'card'},
      list.length ? h('div', {class: 'steps'}, ...list.map(row)) : h('div', {class: 'empty'}, onlyPending ? 'Nada pendiente aquí. ¡Todo en verde!' : 'Sin pasos todavía. Agrega el primero abajo.'),
      hidden && onlyPending ? h('p', {class: 'note'}, hidden + ' pasos cumplidos escondidos. Pica "Todo" para verlos.') : '',
      h('form', {class: 'add', onsubmit: e => { e.preventDefault(); const t = txt(inp.value); if(!t) return; if(o.subs.length >= LIM.sub) return toast('Máximo ' + LIM.sub + ' pasos.', false); o.subs.push({id: uid(), t, ok: false}); save(); rerender(); const ni = document.querySelector('#addsub'); if(ni) ni.focus(); }},
        inp = h('input', {id: 'addsub', placeholder: 'Agregar paso', 'aria-label': 'Agregar paso', maxlength: LIM.txt, autocomplete: 'off'}), h('button', {class: 'btn lime', type: 'submit'}, 'Agregar'))),
    h('div', {class: 'row', style: {'margin-top': '16px'}}, h('a', {class: 'btn', href: '#/plan/' + p.id}, '‹ Volver a los objetivos')));
}

/* ---------- Inventario ---------- */
let invQ = '', invF = 'todo', invEdit = null;
const pName = p => [p.marca, p.modelo].filter(Boolean).join(' ');
function vInv(){
  const q = invQ.toLowerCase();
  const list = D.inv.filter(p => (invF === 'todo' || (invF === 'low' ? p.stock <= (p.min ?? D.cfg.stockMin) : p.tipo === invF)) && (!q || (pName(p) + ' ' + p.detalle).toLowerCase().includes(q)));
  const ed = invEdit && invEdit !== 'new' ? D.inv.find(p => p.id === invEdit) : null;
  const f = {};
  const field = (k, label, attrs) => h('label', {class: 'fl' + (attrs && attrs.full ? ' full' : '')}, label, f[k] = h('input', Object.assign({autocomplete: 'off'}, attrs, {full: null})));
  const form = invEdit ? h('form', {class: 'card', style: {'margin-bottom': '14px'}, onsubmit: e => {
      e.preventDefault();
      const p = {id: ed ? ed.id : uid(), tipo: f.tipo.value, marca: txt(f.marca.value, 40), modelo: txt(f.modelo.value, 60), detalle: txt(f.detalle.value, 60), precio: num(f.precio.value), mayoreo: num(f.mayoreo.value), stock: int(f.stock.value), min: f.min.value === '' ? null : int(f.min.value, 999)};
      if(!p.marca && !p.modelo) return toast('Ponle marca o modelo.', false);
      if(ed) Object.assign(ed, p); else { if(D.inv.length >= LIM.inv) return toast('Máximo ' + LIM.inv + ' productos.', false); D.inv.unshift(p); }
      save(); invEdit = null; rerender(); toast(ed ? 'Producto actualizado' : 'Producto agregado', false);
    }},
    h('h2', {style: {'margin-bottom': '14px'}}, ed ? 'Editar producto' : 'Nuevo producto'),
    h('div', {class: 'form'},
      h('label', {class: 'fl'}, 'Tipo', f.tipo = h('select', null, h('option', {value: 'gorra'}, 'Gorra'), h('option', {value: 'bolsa'}, 'Bolsa Longchamp'), h('option', {value: 'otro'}, 'Otro'))),
      field('marca', 'Marca', {placeholder: 'Barbas Hats, Longchamp…', maxlength: 40, value: ed ? ed.marca : ''}),
      field('modelo', 'Modelo', {placeholder: 'Modelo o nombre', maxlength: 60, value: ed ? ed.modelo : ''}),
      field('detalle', 'Color / medida', {placeholder: 'Negro, M…', maxlength: 60, value: ed ? ed.detalle : ''}),
      field('precio', 'Precio menudeo (MXN)', {inputmode: 'decimal', placeholder: '0', value: ed ? String(ed.precio || '') : ''}),
      field('mayoreo', 'Precio mayoreo (MXN)', {inputmode: 'decimal', placeholder: 'opcional', value: ed && ed.mayoreo ? String(ed.mayoreo) : ''}),
      field('stock', 'Piezas', {inputmode: 'numeric', placeholder: '0', value: ed ? String(ed.stock) : ''}),
      field('min', 'Avisar cuando queden', {inputmode: 'numeric', placeholder: String(D.cfg.stockMin), value: ed && ed.min != null ? String(ed.min) : ''})),
    h('div', {class: 'row', style: {'margin-top': '14px'}}, h('button', {class: 'btn lime', type: 'submit'}, ed ? 'Guardar' : 'Agregar producto'), h('button', {class: 'btn', type: 'button', onclick: () => { invEdit = null; rerender(); }}, 'Cancelar'))) : '';
  if(ed && f.tipo) f.tipo.value = ed.tipo;
  const step = (p, dlt) => { p.stock = Math.max(0, p.stock + dlt); save(); rerender(); };
  let qi;
  const tbl = list.length ? h('div', {class: 'card', style: {padding: '6px 10px', 'overflow-x': 'auto'}}, h('table', {class: 'tbl'},
    h('thead', null, h('tr', null, h('th', null, 'Producto'), h('th', {class: 'hide-sm'}, 'Tipo'), h('th', {class: 'num'}, 'Precio'), h('th', {class: 'num hide-sm'}, 'Mayoreo'), h('th', {class: 'num'}, 'Piezas'), h('th', null, ''))),
    h('tbody', null, ...list.map(p => { const low = p.stock <= (p.min ?? D.cfg.stockMin);
      return h('tr', null,
        h('td', {class: 'pname'}, h('b', null, pName(p)), p.detalle ? h('small', null, p.detalle) : '', low ? h('span', {class: 'tag low'}, p.stock ? 'Stock bajo' : 'Agotado') : ''),
        h('td', {class: 'hide-sm'}, h('span', {class: 'tag ' + p.tipo}, p.tipo === 'bolsa' ? 'Bolsa' : p.tipo === 'gorra' ? 'Gorra' : 'Otro')),
        h('td', {class: 'num'}, p.precio ? money(p.precio) : '—'), h('td', {class: 'num hide-sm'}, p.mayoreo ? money(p.mayoreo) : '—'),
        h('td', {class: 'num'}, h('span', {class: 'stk'}, h('button', {class: 'ic', type: 'button', 'aria-label': 'Quitar una pieza', onclick: () => step(p, -1)}, icon(I.minus)), h('b', null, String(p.stock)), h('button', {class: 'ic', type: 'button', 'aria-label': 'Sumar una pieza', onclick: () => step(p, 1)}, icon(I.plus)))),
        h('td', {class: 'num'}, h('button', {class: 'ic', type: 'button', title: 'Editar', 'aria-label': 'Editar producto', onclick: () => { invEdit = p.id; rerender(); }}, icon(I.edit)),
          h('button', {class: 'ic x', type: 'button', title: 'Quitar', 'aria-label': 'Quitar producto', onclick: () => ask('¿Quitar "' + pName(p) + '"?', 'Tiene ' + p.stock + ' piezas registradas. Las ventas pasadas se quedan.', 'Quitar', () => { const k = D.inv.indexOf(p); D.inv.splice(k, 1); save(); rerender(); toast('Producto quitado', true, () => { D.inv.splice(k, 0, p); save(); rerender(); }); })}, icon(I.x))));
    })))) : h('div', {class: 'empty'}, D.inv.length ? 'Nada con ese filtro.' : 'Todavía no hay productos. Pica "+ Producto" y captura tus gorras y bolsas con sus precios reales.');
  const segB = (k, l) => h('button', {type: 'button', 'aria-pressed': String(invF === k), onclick: () => { invF = k; rerender(); }}, l);
  return h('div', null, crumbs(['Inicio', '#/'], ['Tienda'], ['Inventario']),
    head('Inventario', D.inv.length + ' productos · ' + D.inv.reduce((a, p) => a + p.stock, 0) + ' piezas', h('button', {class: 'btn lime', type: 'button', onclick: () => { invEdit = 'new'; rerender(); }}, '+ Producto'), h('a', {class: 'btn', href: '#/venta'}, 'Ir a vender')),
    h('div', {class: 'banner'}, 'Mientras conectamos Shopify, aquí capturas tú tus piezas y precios. Cuando Shopify quede conectado, él manda.'),
    form,
    h('div', {class: 'toolbar'}, qi = h('input', {type: 'search', placeholder: 'Buscar marca, modelo, color…', 'aria-label': 'Buscar', value: invQ, oninput: e => { invQ = e.target.value.slice(0, 60); const pos = e.target.selectionStart; rerender(); const n = document.querySelector('.toolbar input'); if(n){ n.focus(); n.setSelectionRange(pos, pos); } }}),
      h('div', {class: 'seg', role: 'group', 'aria-label': 'Filtro'}, segB('todo', 'Todo'), segB('gorra', 'Gorras'), segB('bolsa', 'Bolsas'), segB('low', 'Stock bajo'))),
    tbl);
}

/* ---------- Venta rápida ---------- */
let cart = [], vTipo = 'menudeo', vQ = '';
const unitPrice = p => vTipo === 'mayoreo' && p.mayoreo ? p.mayoreo : p.precio;
function vVenta(){
  cart = cart.filter(c => D.inv.some(p => p.id === c.pid));
  const q = vQ.toLowerCase();
  const prods = D.inv.filter(p => !q || (pName(p) + ' ' + p.detalle).toLowerCase().includes(q)).sort((a, b) => (b.stock > 0) - (a.stock > 0));
  const inCart = pid => (cart.find(c => c.pid === pid) || {c: 0}).c;
  const add = (p, dlt) => { let c = cart.find(x => x.pid === p.id); if(!c){ if(dlt < 0) return; c = {pid: p.id, c: 0}; cart.push(c); } c.c = Math.min(p.stock, Math.max(0, c.c + dlt)); if(!c.c) cart = cart.filter(x => x !== c); rerender(); };
  const lines = cart.map(c => ({c, p: D.inv.find(p => p.id === c.pid)})).filter(x => x.p);
  const pcs = lines.reduce((a, x) => a + x.c.c, 0), total = lines.reduce((a, x) => a + x.c.c * unitPrice(x.p), 0);
  const noMay = vTipo === 'mayoreo' && lines.some(x => !x.p.mayoreo);
  const minWarn = vTipo === 'mayoreo' && D.cfg.mayoreoMin && pcs < D.cfg.mayoreoMin;
  const sell = () => {
    if(!lines.length) return;
    const v = {id: uid(), ts: Date.now(), tipo: vTipo, items: lines.map(x => ({pid: x.p.id, n: pName(x.p) + (x.p.detalle ? ' · ' + x.p.detalle : ''), c: x.c.c, p: unitPrice(x.p)})), total};
    for(const x of lines) x.p.stock = Math.max(0, x.p.stock - x.c.c);
    D.ventas.push(v); if(D.ventas.length > LIM.ventas) D.ventas.shift(); cart = []; save(); rerender();
    toast('Venta registrada: ' + money(v.total), true, () => undoSale(v));
  };
  const segB = (k, l) => h('button', {type: 'button', 'aria-pressed': String(vTipo === k), onclick: () => { vTipo = k; rerender(); }}, l);
  return h('div', null, crumbs(['Inicio', '#/'], ['Tienda'], ['Venta rápida']),
    head('Venta rápida', 'Pica las piezas, escoge menudeo o mayoreo y registra. El stock se descuenta solo.', h('div', {class: 'seg', role: 'group', 'aria-label': 'Tipo de venta'}, segB('menudeo', 'Menudeo'), segB('mayoreo', 'Mayoreo'))),
    D.inv.length ? h('div', {class: 'pos'},
      h('div', null,
        h('div', {class: 'toolbar'}, h('input', {type: 'search', placeholder: 'Buscar pieza…', 'aria-label': 'Buscar pieza', value: vQ, oninput: e => { vQ = e.target.value.slice(0, 60); const pos = e.target.selectionStart; rerender(); const n = document.querySelector('.toolbar input'); if(n){ n.focus(); n.setSelectionRange(pos, pos); } }})),
        h('div', {class: 'plist'}, ...prods.map(p => { const left = p.stock - inCart(p.id);
          return h('button', {class: 'pbtn', type: 'button', disabled: left <= 0, onclick: () => add(p, 1)}, h('span', {class: 'tag ' + p.tipo}, p.tipo === 'bolsa' ? 'Bolsa' : p.tipo === 'gorra' ? 'Gorra' : 'Otro'), h('b', null, pName(p)), p.detalle ? h('small', null, p.detalle) : '', h('span', {class: 'pr'}, unitPrice(p) ? money(unitPrice(p)) : 'Sin precio'), h('small', null, left > 0 ? 'Quedan ' + left : 'Agotado')); }))),
      h('aside', {class: 'card cart'}, h('h2', null, 'Venta (' + vTipo + ')'),
        lines.length ? lines.map(x => h('div', {class: 'cl'}, h('div', {class: 'cn'}, pName(x.p), h('small', null, money(unitPrice(x.p)) + ' c/u')),
          h('span', {class: 'stk'}, h('button', {class: 'ic', type: 'button', 'aria-label': 'Una menos', onclick: () => add(x.p, -1)}, icon(I.minus)), h('b', null, String(x.c.c)), h('button', {class: 'ic', type: 'button', 'aria-label': 'Una más', disabled: x.c.c >= x.p.stock, onclick: () => add(x.p, 1)}, icon(I.plus)))))
          : h('p', {class: 'mut'}, 'Pica una pieza para agregarla.'),
        noMay ? h('p', {class: 'warn'}, 'Algunas piezas no tienen precio de mayoreo: se cobran a precio de menudeo.') : '',
        minWarn ? h('p', {class: 'warn'}, 'Tu mayoreo es desde ' + D.cfg.mayoreoMin + ' piezas; llevas ' + pcs + '.') : '',
        h('div', {class: 'tot'}, h('span', null, pcs + ' piezas'), money(total)),
        h('button', {class: 'btn lime big', type: 'button', disabled: !lines.length, onclick: sell}, 'Registrar venta'),
        lines.length ? h('button', {class: 'linkbtn', type: 'button', onclick: () => { cart = []; rerender(); }}, 'Vaciar') : '',
        h('p', {class: 'note'}, 'Mayoreo desde ', h('input', {inputmode: 'numeric', 'aria-label': 'Piezas mínimas de mayoreo', style: {width: '70px', display: 'inline-block', 'min-height': '34px'}, value: D.cfg.mayoreoMin ? String(D.cfg.mayoreoMin) : '', placeholder: '—', onchange: e => { D.cfg.mayoreoMin = int(e.target.value, 999); save(); rerender(); }}), ' piezas.')))
      : h('div', {class: 'empty'}, 'Primero agrega tus productos en ', h('a', {href: '#/inventario'}, 'Inventario'), '.'));
}
function undoSale(v){ const k = D.ventas.indexOf(v); if(k < 0) return; for(const i of v.items){ const p = D.inv.find(x => x.id === i.pid); if(p) p.stock += i.c; } D.ventas.splice(k, 1); save(); rerender(); }

function vVentas(){
  const groups = new Map();
  for(const v of [...D.ventas].reverse()){ const k = dayKey(new Date(v.ts)); if(!groups.has(k)) groups.set(k, []); groups.get(k).push(v); }
  const dayLbl = k => new Date(k + 'T12:00:00').toLocaleDateString('es-MX', {weekday: 'long', day: 'numeric', month: 'long'});
  return h('div', null, crumbs(['Inicio', '#/'], ['Tienda'], ['Ventas']),
    head('Ventas', D.ventas.length + ' registradas', h('a', {class: 'btn lime', href: '#/venta'}, '+ Venta')),
    groups.size ? [...groups].slice(0, 60).map(([k, vs]) => h('section', {class: 'card', style: {'margin-bottom': '14px'}},
      h('div', {class: 'ph', style: {'margin-bottom': '6px'}}, h('h2', null, dayLbl(k)), h('b', null, money(vs.reduce((a, v) => a + v.total, 0)))),
      ...vs.map(v => h('div', {class: 'cl'}, h('div', {class: 'cn'}, v.items.map(i => i.c + '× ' + i.n).join(', '), h('small', null, new Date(v.ts).toLocaleTimeString('es-MX', {hour: '2-digit', minute: '2-digit'}) + ' · ' + v.tipo)),
        h('b', null, money(v.total)),
        h('button', {class: 'ic x', type: 'button', title: 'Cancelar venta', 'aria-label': 'Cancelar venta', onclick: () => ask('¿Cancelar esta venta?', 'Las piezas regresan al inventario.', 'Cancelar venta', () => { undoSale(v); toast('Venta cancelada', false); })}, icon(I.x))))))
      : h('div', {class: 'empty'}, 'Todavía no hay ventas. Registra la primera en ', h('a', {href: '#/venta'}, 'Venta rápida'), '.'));
}

/* ---------- Centro ---------- */
function urgencias(){
  const u = [];
  const t = new Date(dayKey(new Date()) + 'T00:00:00'), dd = Math.round((new Date(t.getFullYear(), 11, 1) - t) / 864e5);
  const bolsas = D.planes.flatMap(p => p.objs).find(o => o.id === 'bolsas');
  if(bolsas && dd >= 0 && bolsas.subs.some(s => !s.ok)) u.push({lvl: dd <= 7 ? 'r' : 'a', t: 'Bolsas Longchamp en Shopify antes del 1 de diciembre', d: 'Faltan ' + dd + ' días y ' + bolsas.subs.filter(s => !s.ok).length + ' pasos de Bolsas.', href: '#/plan/' + D.planes[0].id + '/bolsas'});
  for(const p of D.inv.filter(p => p.stock === 0)) u.push({lvl: 'r', t: 'Agotado: ' + pName(p), d: p.tipo === 'bolsa' ? 'Bolsa sin piezas en temporada de Navidad.' : 'Sin piezas.', href: '#/comprar'});
  const nx = nextStep(); if(nx) u.push({lvl: 'a', t: 'Siguiente paso: ' + nx.s.t, d: nx.o.nombre, href: '#/plan/' + nx.p.id + '/' + nx.o.id});
  u.push({lvl: 'n', t: 'Pedidos de Shopify', d: 'Sin conectar: falta volver a iniciar sesión en el conector de Shopify.', href: '#/conectores'});
  u.push({lvl: 'n', t: 'Mensajes de Messenger, Instagram y Marketplace', d: 'Sin conectar: Meta Business Suite.', href: '#/conectores'});
  u.push({lvl: 'n', t: 'Correos importantes de krashoutmxl@gmail.com', d: 'Gmail ya está conectado a Claude; falta pasarlo al software.', href: '#/conectores'});
  return u;
}
function vUrg(){
  return h('div', null, crumbs(['Inicio', '#/'], ['Centro'], ['Urgencias']), head('Urgencias', 'De lo más urgente a lo menos. Pica una para ir.'),
    h('section', {class: 'card'}, ...urgencias().map(x => h('a', {class: 'urg', href: x.href, style: {'text-decoration': 'none', color: 'inherit'}}, h('span', {class: 'ub ' + x.lvl}), h('div', null, h('h3', null, x.t), h('p', null, x.d))))));
}
function vComprar(){
  const low = lowStock(); let inp;
  return h('div', null, crumbs(['Inicio', '#/'], ['Centro'], ['Por comprar']), head('Por comprar', 'Stock bajo primero (bolsas antes que gorras), luego material.'),
    h('div', {class: 'grid g2'},
      h('section', {class: 'card'}, h('h2', {style: {'margin-bottom': '8px'}}, 'Stock bajo'),
        low.length ? low.map(p => h('div', {class: 'cl'}, h('div', {class: 'cn'}, pName(p), h('small', null, (p.detalle ? p.detalle + ' · ' : '') + (p.stock ? 'Quedan ' + p.stock : 'Agotado'))), h('span', {class: 'tag ' + p.tipo}, p.tipo === 'bolsa' ? 'Bolsa' : 'Gorra')))
          : h('div', {class: 'empty'}, D.inv.length ? 'Nada con stock bajo.' : 'Se llena solo con tu inventario.'),
        h('p', {class: 'note'}, 'Avisa cuando quedan ', h('input', {inputmode: 'numeric', 'aria-label': 'Piezas para avisar stock bajo', style: {width: '64px', display: 'inline-block', 'min-height': '34px'}, value: String(D.cfg.stockMin), onchange: e => { D.cfg.stockMin = int(e.target.value, 999); save(); rerender(); }}), ' piezas o menos (cada producto puede tener el suyo).')),
      h('section', {class: 'card'}, h('h2', {style: {'margin-bottom': '8px'}}, 'Material para operar'),
        D.mat.length ? D.mat.map(i => { const cb = h('input', {type: 'checkbox'}); cb.checked = i.ok; cb.addEventListener('change', () => { i.ok = cb.checked; save(); rerender(); });
          return h('div', {class: 'li' + (i.ok ? ' done' : '')}, h('label', null, cb, h('span', null, i.t)), h('button', {class: 'ic x', type: 'button', 'aria-label': 'Quitar material', onclick: () => { const k = D.mat.indexOf(i); D.mat.splice(k, 1); save(); rerender(); toast('Material quitado', true, () => { D.mat.splice(k, 0, i); save(); rerender(); }); }}, icon(I.x))); })
          : h('div', {class: 'empty'}, 'Nada pendiente.'),
        h('form', {class: 'add', onsubmit: e => { e.preventDefault(); const t = txt(inp.value, 80); if(!t) return; if(D.mat.length >= LIM.mat) return; D.mat.push({id: uid(), t, ok: false}); save(); rerender(); }}, inp = h('input', {placeholder: 'Agregar material', 'aria-label': 'Agregar material', maxlength: 80, autocomplete: 'off'}), h('button', {class: 'btn', type: 'submit'}, 'Agregar')),
        h('p', {class: 'note'}, 'Esta lista es tuya. Antes de comprar algo en tu nombre te enseño qué y cuánto y espero tu "sí".'))));
}
function vCon(){
  const C = [['Shopify', 'no', 'Pedidos, productos y stock real. Falta volver a iniciar sesión en el conector de Shopify en Claude.'], ['Gmail (krashoutmxl@gmail.com)', 'ok', 'Conectado a Claude. Siguiente: mostrar aquí los correos importantes.'], ['Meta: Facebook + Instagram @krashoutco', 'a', 'Portafolio, Página e Instagram listos. Falta conectar el canal de Shopify y las respuestas automáticas.'], ['TikTok', 'no', 'Falta crear la cuenta de negocio.'], ['Supabase (sincronizar compu y cel)', 'no', 'Falta crear la cuenta gratis. Mientras, todo se guarda cifrado en este aparato.']];
  const lbl = {ok: ['Conectado', 'chip ok'], a: ['A medias', 'chip'], no: ['Sin conectar', 'chip no']};
  return h('div', null, crumbs(['Inicio', '#/'], ['Centro'], ['Conectores']), head('Conectores', 'Qué está enlazado y qué falta.'),
    h('section', {class: 'card'}, ...C.map(([n, s, d]) => h('div', {class: 'urg'}, h('span', {class: 'ub ' + (s === 'ok' ? 'g' : s === 'a' ? '' : 'n')}), h('div', null, h('h3', null, n, h('span', {class: lbl[s][1]}, lbl[s][0])), h('p', null, d))))));
}
function vSeg(){
  let o1, n1, n2;
  const exportar = () => { const blob = new Blob([JSON.stringify(D, null, 1)], {type: 'application/json'}); const a = h('a', {href: URL.createObjectURL(blob), download: 'krashout-respaldo-' + dayKey(new Date()) + '.json'}); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); toast('Respaldo descargado. Guárdalo en un lugar seguro: no va cifrado.', false); };
  const importar = e => { const file = e.target.files && e.target.files[0]; if(!file) return; if(file.size > 5e6) return toast('Archivo muy grande.', false);
    file.text().then(t => { let d; try { d = JSON.parse(t); } catch(_) { return toast('Ese archivo no es un respaldo válido.', false); } ask('¿Cargar este respaldo?', 'Reemplaza lo que hay ahorita en este aparato.', 'Cargar', () => { D = clean(d); save(); routeTo('#/'); toast('Respaldo cargado', false); }); }); };
  return h('div', null, crumbs(['Inicio', '#/'], ['Centro'], ['Seguridad']), head('Seguridad', 'Usuario: Panini.'),
    h('div', {class: 'grid g2'},
      h('form', {class: 'card', onsubmit: async e => { e.preventDefault();
          if(n1.value.length < 8) return toast('La nueva necesita mínimo 8 caracteres.', false);
          if(n1.value !== n2.value) return toast('Las nuevas no son iguales.', false);
          const rawOld = await deriveRaw(o1.value, unb64(AUTH.salt), AUTH.iter || ITER); let ok = false; try { ok = (await open_(await aesKey(rawOld), AUTH.check)).ok === 'krashout'; } catch(_) {}
          if(!ok) return toast('La contraseña actual no es correcta.', false);
          const salt = crypto.getRandomValues(new Uint8Array(16)), raw = await deriveRaw(n1.value, salt, ITER); KEY = await aesKey(raw);
          AUTH = {v: 1, user: 'Panini', salt: b64(salt), iter: ITER, check: await seal(KEY, {ok: 'krashout'})}; store.set('kos-auth', JSON.stringify(AUTH)); sess.set('kos-k', b64(raw));
          store.set('kos-data', JSON.stringify(await seal(KEY, D))); o1.value = n1.value = n2.value = ''; toast('Contraseña cambiada', false); }},
        h('h2', {style: {'margin-bottom': '12px'}}, 'Cambiar contraseña'),
        h('div', {class: 'grid'}, h('label', {class: 'fl'}, 'Actual', o1 = h('input', {type: 'password', autocomplete: 'current-password', maxlength: 128, required: true})),
          h('label', {class: 'fl'}, 'Nueva', n1 = h('input', {type: 'password', autocomplete: 'new-password', maxlength: 128, required: true})),
          h('label', {class: 'fl'}, 'Repite la nueva', n2 = h('input', {type: 'password', autocomplete: 'new-password', maxlength: 128, required: true})),
          h('button', {class: 'btn lime', type: 'submit'}, 'Cambiar'))),
      h('section', {class: 'card'}, h('h2', null, 'Cómo está protegido'),
        h('ul', {class: 'clean'},
          h('li', null, 'Entra solo el usuario Panini con su contraseña. 5 intentos mal y se bloquea un rato.'),
          h('li', null, 'Tus datos se guardan cifrados (AES-256) con una llave que sale de tu contraseña. Sin ella no se pueden leer.'),
          h('li', null, 'La contraseña no se guarda en ningún lado, ni en GitHub.'),
          h('li', null, 'Se cierra sola tras 30 minutos sin usarla, y al cerrar la pestaña.'),
          h('li', null, 'La página no se conecta a ningún servidor ajeno y bloquea scripts de fuera (CSP).'),
          h('li', null, 'Revisado con los agentes de seguridad de GitHub: security-auditor, frontend-security-coder, threat-modeling-expert (wshobson/agents) y security-auditor, penetration-tester (VoltAgent).')),
        h('h2', {style: {margin: '18px 0 8px'}}, 'Respaldo'),
        h('p', {class: 'mut', style: {'margin-top': 0}}, 'Por ahora todo vive en este aparato. Baja un respaldo de vez en cuando.'),
        h('div', {class: 'row'}, h('button', {class: 'btn', type: 'button', onclick: exportar}, 'Descargar respaldo'), h('label', {class: 'btn'}, 'Cargar respaldo', h('input', {type: 'file', accept: 'application/json,.json', hidden: true, onchange: importar}))))));
}
const notFound = () => h('div', null, head('No encontré eso', 'Puede que lo hayas quitado.'), h('a', {class: 'btn lime', href: '#/'}, 'Ir al inicio'));

/* ---------- Avisos y confirmaciones ---------- */
let toastT = 0, undoFn = null;
function toast(t, canUndo, fn){ $('#tmsg').textContent = t; undoFn = canUndo && fn ? fn : null; $('#undo').hidden = !undoFn; $('#toast').classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => { $('#toast').classList.remove('show'); undoFn = null; }, 6000); }
$('#undo').addEventListener('click', () => { const f = undoFn; undoFn = null; $('#toast').classList.remove('show'); if(f) f(); });
let modalYes = null, lastFocus = null;
function ask(title, body, yes, fn){ lastFocus = document.activeElement; $('#mt').textContent = title; $('#mp').textContent = body; $('#myes').textContent = yes; modalYes = fn; $('#modal').hidden = false; $('#mno').focus(); }
function closeModal(){ $('#modal').hidden = true; modalYes = null; if(lastFocus && lastFocus.focus) lastFocus.focus(); }
$('#mno').addEventListener('click', closeModal);
$('#myes').addEventListener('click', () => { const f = modalYes; closeModal(); if(f) f(); });
$('#modal').addEventListener('click', e => { if(e.target === $('#modal')) closeModal(); });
function rename(title, cur, max, fn){
  lastFocus = document.activeElement;
  const inp = h('input', {value: cur, maxlength: max, 'aria-label': title, autocomplete: 'off'});
  $('#mt').textContent = title; $('#mp').replaceChildren(inp); $('#myes').textContent = 'Guardar'; $('#modal').hidden = false;
  modalYes = () => { const v = txt(inp.value, max); if(v) fn(v); };
  inp.addEventListener('keydown', e => { if(e.key === 'Enter'){ e.preventDefault(); $('#myes').click(); } });
  requestAnimationFrame(() => { inp.focus(); inp.select(); });
}

/* ---------- Arranque ---------- */
(async () => {
  loginMode();
  const raw = sess.get('kos-k');
  if(raw && AUTH){ try { const k = await aesKey(unb64(raw)); if((await open_(k, AUTH.check)).ok === 'krashout'){ KEY = k; await loadData(); enter(); return; } } catch(_) {} sess.del('kos-k'); }
  $('#login').hidden = false; $('#app').hidden = true;
  requestAnimationFrame(() => $('#lpass').focus());
})();
}
