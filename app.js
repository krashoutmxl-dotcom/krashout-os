
{
'use strict';
const $ = s => document.querySelector(s);
const SVGNS = 'http://www.w3.org/2000/svg';
/* Builder seguro: todo texto entra como nodo de texto, nunca como HTML. */
function h(tag, attrs, ...kids){
  const e = document.createElement(tag);
  for(const [k, v] of Object.entries(attrs || {})){
    if(v == null || v === false) continue;
    if(k === 'class') e.className = v;
    else if(k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : String(v));
  }
  for(const c of kids.flat()){ if(c == null || c === false) continue; e.append(c instanceof Node ? c : document.createTextNode(String(c))); }
  return e;
}
function icon(d){ const s = document.createElementNS(SVGNS, 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '2'); s.setAttribute('aria-hidden', 'true'); for(const p of d){ const e = document.createElementNS(SVGNS, 'path'); e.setAttribute('d', p); s.append(e); } return s; }
const I_EDIT = ['M4 20h4L19 9l-4-4L4 16z'], I_X = ['M6 6l12 12M18 6 6 18'];

/* Límites y limpieza de todo lo que entra o sale de la base. */
const LIM = {obj: 40, sub: 60, mat: 60, txt: 120, name: 60};
const txt = (v, n = LIM.txt) => Array.from(String(v ?? '').slice(0, n * 4).replace(/[\u0000-\u001F\u007F-\u009F\u00AD\u061C\u180E\u200B-\u200F\u2028-\u202E\u2060-\u2069\uFEFF]/g, ' ').replace(/\s+/g, ' ').trim()).slice(0, n).join('');
const okId = v => typeof v === 'string' && /^[a-z0-9-]{1,48}$/.test(v);
const uid = () => { const a = new Uint8Array(6); crypto.getRandomValues(a); return Array.from(a, b => (b % 36).toString(36)).join(''); };
const slug = t => (t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 36) || 'obj') + '-' + uid().slice(0, 4);
const cleanSubs = (a, max) => (Array.isArray(a) ? a : []).slice(0, max).map(s => s && typeof s === 'object' ? {id: okId(s.id) ? s.id : uid(), t: txt(s.t), ok: s.ok === true} : null).filter(s => s && s.t);
const cleanObj = (id, d) => ({id, nombre: txt(d && d.nombre, LIM.name) || 'Sin nombre', orden: Number.isFinite(d && d.orden) ? d.orden : 999, subs: cleanSubs(d && d.subs, LIM.sub)});

const store = {get(k){ try { return localStorage.getItem(k); } catch(_) { return null; } }, set(k, v){ try { localStorage.setItem(k, v); } catch(_) {} }};

let sb = null, me = null, readOnly = false, DEMO = false;
const demoSave = () => store.set('kos-demo', JSON.stringify({objs, mat}));
const seedRows = () => ({o: SEED.map(([id, nombre, subs], k) => ({id, nombre, orden: k + 1, subs: subs.map(([t, ok], j) => ({id: id.slice(0, 2) + (j + 1), t, ok: !!ok}))})), m: SEED_MAT.map((t, k) => ({id: 'm' + (k + 1), t, ok: false, orden: k + 1}))});
let objs = [], mat = [];
const open = new Set();
let onlyPending = store.get('kos-pend') === '1';
let editing = null, held = false;
const queues = {}; let pending = 0;
let lastDel = null, toastT = 0;

const today = () => { const p = new Intl.DateTimeFormat('en-CA', {timeZone: 'America/Tijuana', year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date()).split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
$('#hoy').textContent = new Date().toLocaleDateString('es-MX', {weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Tijuana'});

function sync(kind, t){ const el = $('#sync'); el.className = 'sync ' + kind; el.lastElementChild.textContent = t; }
function msg(t, info){ const m = $('#msg'); m.textContent = t || ''; m.classList.toggle('show', !!t); m.classList.toggle('info', !!info); }

const applyRows = (o, m) => {
  if(o) objs = o.filter(r => r && okId(r.id)).map(r => cleanObj(r.id, r)).sort((a, b) => a.orden - b.orden).slice(0, LIM.obj);
  if(m) mat = m.filter(r => r && okId(r.id)).map(r => ({id: r.id, t: txt(r.t, 80), ok: r.ok === true, orden: Number.isFinite(r.orden) ? r.orden : 999})).filter(i => i.t).sort((a, b) => a.orden - b.orden).slice(0, LIM.mat);
};

/* Una escritura a la vez por fila; los errores no rompen la fila de espera. */
function run(key, fn){
  if(DEMO){ demoSave(); sync('ok', 'Guardado en este aparato'); return Promise.resolve(); }
  if(!sb || !me || readOnly) return Promise.resolve();
  pending++; sync('busy', 'Guardando…');
  const p = (queues[key] || Promise.resolve()).then(async () => { const {error} = await fn(); if(error) throw error; }).then(() => {
    pending--; if(!pending) sync('ok', 'Guardado');
  }).catch(e => {
    pending--; sync('err', 'No se guardó');
    const c = e && String(e.code || '');
    if(c === '42501' || c === 'PGRST301'){ readOnly = true; document.body.classList.add('ro'); msg('Esta cuenta no tiene permiso para cambiar Krashout OS.'); renderAll(); }
    else if(/límite/.test((e && e.message) || '')) msg('Llegaste al límite de filas: quita cosas viejas.');
    else msg('No se pudo guardar el último cambio. Revisa tu conexión.');
  });
  queues[key] = p; return p;
}
const saveObj = o => run('o:' + o.id, () => sb.from('objetivos').upsert({user_id: me, id: o.id, nombre: o.nombre, orden: o.orden, subs: o.subs.map(s => ({id: s.id, t: s.t, ok: s.ok}))}, {onConflict: 'user_id,id'}));
const saveItem = i => run('m:' + i.id, () => sb.from('material').upsert({user_id: me, id: i.id, t: i.t, ok: i.ok, orden: i.orden}, {onConflict: 'user_id,id'}));
const dropItem = i => run('m:' + i.id, () => sb.from('material').delete().eq('id', i.id));

async function reload(){
  if(DEMO){ let d = null; try { d = JSON.parse(store.get('kos-demo') || 'null'); } catch(_) {} if(!d){ const s = seedRows(); d = {objs: s.o, mat: s.m}; } applyRows(Array.isArray(d.objs) ? d.objs : [], Array.isArray(d.mat) ? d.mat : []); renderAll(); return; }
  if(!sb || !me) return;
  const [a, b] = await Promise.all([
    sb.from('objetivos').select('id,nombre,orden,subs').order('orden').limit(LIM.obj),
    sb.from('material').select('id,t,ok,orden').order('orden').limit(LIM.mat)
  ]);
  if(a.error || b.error){ sync('err', 'Sin conexión'); msg('No se pudo cargar la bitácora. Revisa tu conexión.'); return; }
  msg(''); applyRows(a.data, b.data); if(!pending) sync('ok', 'Al día'); renderAll();
}
let rt = 0;
function scheduleReload(){
  clearTimeout(rt);
  rt = setTimeout(() => { if(editing){ held = true; return; } if(pending){ scheduleReload(); return; } reload(); }, 400);
}

const SEED = [
  ['shopify', 'Shopify', [['Cuenta y plan Basic activos', 1], ['Tienda renombrada a Krashout con krashoutmxl@gmail.com', 1], ['Conector de Shopify en Claude funcionando'], ['Tema de prueba con estilo urbano (negro, fotos grandes)'], ['Colecciones: por marca, Bolsas Longchamp, Mayoreo'], ['Fichas con fotos reales y prueba de autenticidad'], ['Pagos (Shopify Payments)'], ['Envíos (Mexicali local + paquetería)'], ['Políticas (cambios, envíos, "no somos distribuidor oficial")'], ['Canal Facebook & Instagram y Google conectados']]],
  ['bolsas', 'Bolsas Longchamp (Navidad)', [['Inventario actual contado y en Shopify'], ['Fotos reales de etiquetas por bolsa'], ['Pedido de más stock'], ['Campaña de regalo 1–20 dic']]],
  ['tiktok', 'TikTok', [['Cuenta de negocio creada'], ['Link a Shopify en la bio'], ['Primeros 10 videos publicados']]],
  ['instagram', 'Instagram', [['Cuenta de negocio @krashoutco en el portafolio de Meta', 1], ['Vinculada a Shopify (etiquetas de producto)'], ['Historias diarias']]],
  ['facebook', 'Facebook (comercio local)', [['Página Krashout en el portafolio', 1], ['Respuestas automáticas de Messenger'], ['Piezas publicadas en Marketplace']]],
  ['colectivos', 'Colectivos', [['Lista de colectivos de Mexicali con renta y comisión'], ['Visitar 3 y escoger 1'], ['Exhibidor + QR listos']]],
  ['software', 'Software Krashout OS', [['Prototipo visual', 1], ['Bitácora por objetivos funcionando', 1], ['Krashout OS en su propio link (GitHub + Supabase)', 1], ['Urgencias conectadas a Shopify y Gmail'], ['Resumen cada hora (tarea programada)']]]
];
const SEED_MAT = ['Exhibidor de pared para 15–30 gorras', 'Etiquetas con precio y QR a Shopify', 'Empaques para envíos y entregas'];
async function loadSeed(){
  if(DEMO){ const s = seedRows(); applyRows(s.o, s.m); demoSave(); renderAll(); return; }
  if(!sb || !me || readOnly) return;
  sync('busy', 'Cargando el plan…');
  const o = SEED.map(([id, nombre, subs], k) => ({user_id: me, id, nombre, orden: k + 1, subs: subs.map(([t, ok], j) => ({id: id.slice(0, 2) + (j + 1), t, ok: !!ok}))}));
  const m = SEED_MAT.map((t, k) => ({user_id: me, id: 'm' + (k + 1), t, ok: false, orden: k + 1}));
  const a = await sb.from('objetivos').upsert(o, {onConflict: 'user_id,id'});
  const b = await sb.from('material').upsert(m, {onConflict: 'user_id,id'});
  if(a.error || b.error){ sync('err', 'No se guardó'); msg('No se pudo cargar el plan. Revisa que corriste schema.sql en Supabase.'); return; }
  await reload();
}

function toast(t){ $('#tmsg').textContent = t; $('#toast').classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => { $('#toast').classList.remove('show'); lastDel = null; }, 6000); }

function stats(){ let n = 0, d = 0; for(const o of objs){ n += o.subs.length; d += o.subs.filter(s => s.ok).length; } return {n, d}; }

function renderHero(){
  const {n, d} = stats();
  $('#tot').replaceChildren(n ? String(d) : '–', n ? h('small', null, '/' + n) : '');
  $('#totl').textContent = n ? Math.round(d / n * 100) + '% del plan cumplido' : 'pasos cumplidos';
  $('#arc').setAttribute('stroke-dasharray', (n ? d / n * 276.5 : 0).toFixed(1) + ' 276.5');
  const bd = $('#bdg'); bd.hidden = !(n - d); bd.textContent = String(n - d);
  let nx = null;
  for(const o of objs){ const s = o.subs.find(x => !x.ok); if(s){ nx = {o, s}; break; } }
  const box = $('#next');
  if(!nx){ box.replaceChildren(h('div', {class: 'k'}, 'Siguiente paso'), h('div', {class: 't'}, objs.length ? 'Todo cumplido. Agrega el próximo objetivo.' : 'Agrega tu primer objetivo.')); return; }
  box.replaceChildren(
    h('div', {class: 'k'}, 'Siguiente paso'),
    h('div', {class: 't'}, nx.s.t),
    h('div', {class: 'o'}, nx.o.nombre),
    readOnly ? '' : h('button', {class: 'btn lime', type: 'button', onclick: () => toggleSub(nx.o, nx.s.id)}, 'Marcar como hecho')
  );
}

function renderCountdown(){
  const t = today(), y = t.getFullYear();
  const days = (m, dd) => Math.round((new Date(y, m, dd) - t) / 864e5);
  const a = days(11, 1), b = days(11, 20);
  const cell = (v, lbl, done) => h('div', null, h('b', {class: v <= 7 && v >= 0 ? 'hot' : ''}, v < 0 ? '✓' : String(v)), h('span', null, v < 0 ? done : lbl));
  $('#cd').replaceChildren(
    cell(a, a === 1 ? 'día para tener bolsas en Shopify (1 dic)' : 'días para tener bolsas en Shopify (1 dic)', 'Ya pasó el 1 de dic'),
    cell(b, b === 1 ? 'día de campaña de regalo (hasta 20 dic)' : 'días de campaña de regalo (hasta 20 dic)', 'Campaña terminada')
  );
}

function subRow(o, s){
  if(editing && editing.oid === o.id && editing.sid === s.id){
    const inp = h('input', {class: 'ed', value: s.t, maxlength: LIM.txt, 'aria-label': 'Editar paso', autocomplete: 'off'});
    let done = false;
    const fin = async keep => { if(done) return; done = true; editing = null; const v = txt(inp.value);
      if(held){ held = false; await reload(); }
      const fo = objs.find(x => x.id === o.id), fs = fo && fo.subs.find(x => x.id === s.id);
      if(keep && v && fs && v !== fs.t){ fs.t = v; saveObj(fo); } renderObjs(); };
    inp.addEventListener('keydown', e => { if(e.key === 'Enter'){ e.preventDefault(); fin(true); } if(e.key === 'Escape') fin(false); });
    inp.addEventListener('blur', () => fin(true));
    requestAnimationFrame(() => { inp.focus(); inp.select(); });
    return h('div', {class: 'si'}, inp);
  }
  return h('div', {class: 'si'},
    h('button', {class: 'st' + (s.ok ? ' done' : ''), type: 'button', 'aria-pressed': String(s.ok), disabled: readOnly, onclick: () => toggleSub(o, s.id)}, h('span', {class: 'dot' + (s.ok ? ' g' : ''), 'aria-hidden': 'true'}), h('span', {class: 'tx'}, s.t)),
    h('button', {class: 'ic', type: 'button', 'aria-label': 'Editar paso', title: 'Editar', onclick: () => { editing = {oid: o.id, sid: s.id}; renderObjs(); }}, icon(I_EDIT)),
    h('button', {class: 'ic x', type: 'button', 'aria-label': 'Quitar paso', title: 'Quitar', onclick: () => delSub(o, s.id)}, icon(I_X))
  );
}

function renderObjs(){
  const box = $('#objs');
  if(!objs.length){ box.replaceChildren(h('div', {class: 'empty'}, 'La bitácora está vacía. ', readOnly ? '' : h('button', {class: 'btn lime seed', type: 'button', onclick: loadSeed}, 'Cargar la bitácora del plan'))); renderHero(); return; }
  const list = objs.filter(o => !onlyPending || o.subs.some(s => !s.ok));
  box.replaceChildren(...(list.length ? list.map(o => {
    const n = o.subs.length, d = o.subs.filter(s => s.ok).length, full = n > 0 && d === n, isOpen = open.has(o.id);
    const subs = o.subs.filter(s => !onlyPending || !s.ok);
    let inp;
    const form = h('form', {class: 'add', onsubmit: e => { e.preventDefault(); addSub(o, inp.value); }},
      inp = h('input', {name: 't', placeholder: 'Agregar sub-objetivo', 'aria-label': 'Agregar sub-objetivo a ' + o.nombre, maxlength: LIM.txt, autocomplete: 'off', 'data-add': o.id}),
      h('button', {class: 'btn lime', type: 'submit'}, 'Agregar'));
    return h('div', {class: 'obj' + (isOpen ? ' open' : '')},
      h('button', {class: 'ob', type: 'button', 'aria-expanded': String(isOpen), onclick: () => { isOpen ? open.delete(o.id) : open.add(o.id); renderObjs(); }},
        h('span', {class: 'dot' + (full ? ' g' : ''), 'aria-hidden': 'true'}),
        h('span', {class: 'on'}, o.nombre),
        h('span', {class: 'cnt' + (full ? ' full' : '')}, d + '/' + n),
        h('span', {class: 'chev', 'aria-hidden': 'true'}, '▶'),
        h('span', {class: 'bar'}, h('b', {class: full ? 'g' : '', style: 'width:' + (n ? Math.round(d / n * 100) : 0) + '%'}))),
      isOpen ? h('div', {class: 'subs'}, subs.length ? subs.map(s => subRow(o, s)) : h('div', {class: 'empty'}, onlyPending ? 'Nada pendiente aquí.' : 'Sin pasos todavía.'), form) : '');
  }) : [h('div', {class: 'empty'}, 'No hay nada pendiente. ¡Todo en verde!')]));
  renderHero();
}

function renderMat(){
  const done = mat.filter(i => i.ok).length;
  $('#matc').textContent = mat.length ? done + '/' + mat.length + ' comprado' : '';
  $('#mat').replaceChildren(...(mat.length ? mat.map(i => {
    const cb = h('input', {type: 'checkbox', disabled: readOnly}); cb.checked = i.ok;
    cb.addEventListener('change', () => { i.ok = cb.checked; renderMat(); saveItem(i); });
    return h('div', {class: 'li' + (i.ok ? ' done' : '')}, h('label', null, cb, h('span', {class: 'tx'}, i.t)),
      h('button', {class: 'ic x', type: 'button', 'aria-label': 'Quitar material', onclick: () => { if(readOnly) return; const k = mat.indexOf(i); lastDel = {kind: 'mat', i: k, item: i}; mat.splice(k, 1); toast('Material quitado'); renderMat(); dropItem(i); }}, icon(I_X)));
  }) : [h('div', {class: 'empty'}, 'Nada pendiente por comprar.')]));
}
const renderAll = () => { renderObjs(); renderMat(); };

function toggleSub(o, sid){ if(readOnly) return; const s = o.subs.find(x => x.id === sid); if(!s) return; s.ok = !s.ok; renderObjs(); saveObj(o); }
function delSub(o, sid){ if(readOnly) return; const k = o.subs.findIndex(x => x.id === sid); if(k < 0) return; lastDel = {kind: 'sub', oid: o.id, i: k, item: o.subs[k]}; o.subs.splice(k, 1); toast('Paso quitado'); renderObjs(); saveObj(o); }
function addSub(o, raw){
  const t = txt(raw); if(!t || readOnly) return;
  if(o.subs.length >= LIM.sub){ msg('Máximo ' + LIM.sub + ' pasos por objetivo.'); return; }
  o.subs.push({id: uid(), t, ok: false}); renderObjs(); saveObj(o);
  const inp = document.querySelector('[data-add="' + o.id + '"]'); if(inp) inp.focus();
}

$('#fobj').addEventListener('submit', e => {
  e.preventDefault(); const t = txt($('#iobj').value, LIM.name); if(!t || readOnly) return;
  if(objs.length >= LIM.obj){ msg('Máximo ' + LIM.obj + ' objetivos.'); return; }
  let id; do id = slug(t); while(objs.some(x => x.id === id));
  const o = {id, nombre: t, orden: objs.reduce((m, x) => Math.max(m, x.orden), 0) + 1, subs: []};
  objs.push(o); open.add(o.id); $('#iobj').value = ''; renderObjs(); saveObj(o);
});
$('#fmat').addEventListener('submit', e => {
  e.preventDefault(); const t = txt($('#imat').value, 80); if(!t || readOnly) return;
  if(mat.length >= LIM.mat){ msg('Máximo ' + LIM.mat + ' cosas en la lista.'); return; }
  const it = {id: uid(), t, ok: false, orden: mat.reduce((m, x) => Math.max(m, x.orden), 0) + 1}; mat.push(it); $('#imat').value = ''; renderMat(); saveItem(it);
});
$('#undo').addEventListener('click', () => {
  if(!lastDel) return;
  if(lastDel.kind === 'sub'){ const o = objs.find(x => x.id === lastDel.oid); if(o){ o.subs.splice(lastDel.i, 0, lastDel.item); renderObjs(); saveObj(o); } }
  else { mat.splice(lastDel.i, 0, lastDel.item); renderMat(); saveItem(lastDel.item); }
  lastDel = null; $('#toast').classList.remove('show');
});
const setFilter = v => { onlyPending = v; store.set('kos-pend', v ? '1' : '0'); $('#fAll').setAttribute('aria-pressed', String(!v)); $('#fPen').setAttribute('aria-pressed', String(v)); renderObjs(); };
$('#fAll').addEventListener('click', () => setFilter(false));
$('#fPen').addEventListener('click', () => setFilter(true));

/* Pestañas del cel (solo cambian la vista; en compu se ve todo junto). */
const TABS = ['bitacora', 'urgencias', 'comprar', 'mas'];
function showTab(t){
  if(!TABS.includes(t)) t = 'bitacora';
  for(const x of TABS){ const p = $('#p-' + x); if(p) p.classList.toggle('act', x === t); }
  $('#hero').classList.toggle('act', t === 'bitacora');
  for(const b of document.querySelectorAll('#tabs button')){ if(b.dataset.t === t) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); }
}
$('#tabs').addEventListener('click', e => { const b = e.target.closest('button[data-t]'); if(!b) return; if(location.hash !== '#' + b.dataset.t) location.hash = b.dataset.t; else showTab(b.dataset.t); window.scrollTo(0, 0); });
window.addEventListener('hashchange', () => showTab(location.hash.slice(1)));
showTab(location.hash.slice(1));

setFilter(onlyPending);
renderCountdown();
renderMat();


/* Sesión: entra solo quien ya tiene usuario creado en Supabase (registro público apagado). */
function showLogin(t, bad){ $('#app').hidden = true; $('#login').hidden = false; const m = $('#lmsg'); m.textContent = t || ''; m.className = bad ? 'bad' : 'ok'; }
function showApp(){ $('#login').hidden = true; $('#app').hidden = false; }
let started = false;
async function start(session){
  me = session.user.id; showApp();
  if(started) return; started = true;
  await reload();
  sb.channel('kos-' + me.slice(0, 8))
    .on('postgres_changes', {event: '*', schema: 'public', table: 'objetivos', filter: 'user_id=eq.' + me}, scheduleReload)
    .on('postgres_changes', {event: '*', schema: 'public', table: 'material', filter: 'user_id=eq.' + me}, scheduleReload)
    .subscribe();
  document.addEventListener('visibilitychange', () => { if(!document.hidden) scheduleReload(); });
}
$('#flogin').addEventListener('submit', async e => {
  e.preventDefault();
  const email = $('#email').value.trim().toLowerCase().slice(0, 120);
  if(!sb || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
  $('#lbtn').disabled = true;
  const {error} = await sb.auth.signInWithOtp({email, options: {shouldCreateUser: false, emailRedirectTo: location.origin + location.pathname}});
  $('#lbtn').disabled = false;
  if(error) showLogin(/sign.?ups?|not allowed|not found/i.test(error.message) ? 'Ese correo no tiene acceso a Krashout OS.' : 'No se pudo mandar el link. Espera un minuto y vuelve a intentar.', true);
  else showLogin('Listo. Revisa ' + email + ' y abre el link en este mismo aparato.');
});
$('#logout').addEventListener('click', async () => { if(sb) await sb.auth.signOut(); location.replace(location.pathname); });

(async () => {
  const C = window.KRASHOUT_CONFIG || {};
  const okUrl = typeof C.supabaseUrl === 'string' && /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(C.supabaseUrl);
  if(!okUrl || !C.supabaseAnonKey || !window.supabase){ DEMO = true; me = 'demo'; $('#logout').hidden = true; showApp(); await reload(); msg('Modo prueba: lo que marques se guarda solo en este aparato. Al conectar Supabase se sincroniza compu y cel.', true); sync('ok', 'Modo prueba'); return; }
  sb = window.supabase.createClient(C.supabaseUrl, C.supabaseAnonKey, {auth: {persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce'}});
  sb.auth.onAuthStateChange((ev, session) => {
    if(session) setTimeout(() => start(session), 0);
    else { started = false; me = null; showLogin(''); }
  });
  const {data} = await sb.auth.getSession();
  if(data.session) start(data.session); else showLogin('');
  if(location.search) history.replaceState(null, '', location.pathname + location.hash);
})();
}
