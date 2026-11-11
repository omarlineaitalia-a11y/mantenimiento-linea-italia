/* Mantenimiento Preventivo LI · lógica de la aplicación
 * Pantallas: 1 Tablero (supervisor / jefe / gerencia + Configuración) · 2 Mi mes (técnico) · 3 Hojas de instrucciones · 4 Parámetros
 * Datos (Firebase apps/preventivo/ o, en modo prueba, este navegador):
 *   config/personal {p:{nómina:{n,r,a,puesto,pant,otorga,califica,tec}}} · config/ajustes {excelMod, excl, reglas}
 *   plan/<AAAA-MM> {t:[tareas], mod, fuente} · ordenes/<clave> (hoja llenada, calificación) · formatos/<id> (hojas editadas)
 *   param/refac · param/baleros · param/horometros · avisos/<nómina> · fotos/<id> */
'use strict';
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const deIso = s => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
const sumar = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const lunesDe = d => sumar(d, -((d.getDay() + 6) % 7));
const MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const fCorta = s => { const d = deIso(s); return d.getDate() + ' ' + MES[d.getMonth()].slice(0, 3); };
const fLarga = s => { const d = deIso(s); return DIAS[d.getDay()] + ' ' + d.getDate() + ' de ' + MES[d.getMonth()]; };
const nomMes = k => { const [y, m] = k.split('-').map(Number); return MES[m - 1][0].toUpperCase() + MES[m - 1].slice(1) + ' ' + y; };
const hhmm = t => t ? new Date(t).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '—';
const fechaHora = t => t ? new Date(t).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
const dinero = n => '$' + (Number(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const titulo = s => String(s || '').toLowerCase().replace(/(^|\s)\S/g, x => x.toUpperCase());
const HOY = iso(new Date());
const MES_HOY = HOY.slice(0, 7);
const FR = { S: 'Semanal', '1M': 'Mensual', '3M': 'Trimestral', '6M': 'Semestral', A: 'Anual', D: 'Diario' };
const CAT = { MTA: ['Maquinaria tipo A', '#1F6FD1', 'mta'], MTB: ['Maquinaria tipo B', '#7A4FD6', 'mtb'], MTC: ['Herramienta (tipo C)', '#0F9D8A', 'mtc'], EA: ['Equipo auxiliar', '#E0A100', 'ea'], AA: ['Aires acondicionados', '#00A3C4', 'aa'], AG: ['Áreas generales', '#6D7C8C', 'ag'], EBT: ['Eléctrico baja tensión', '#D9822B', 'ebt'], EMT: ['Eléctrico media tensión', '#C0392B', 'emt'], EM: ['Equipo móvil', '#2E8B57', 'em'], IL: ['Iluminación', '#F2B705', 'il'] };
const COLORES = ['#1F6FD1', '#E07B00', '#1E8E5A', '#7A4FD6', '#C2185B', '#00897B', '#5D6D7E', '#D32F2F', '#8D6E63', '#3949AB'];
const PANT = { 1: ['📊', 'Tablero'], 2: ['📅', 'Mi mes'], 3: ['📋', 'Hojas'], 4: ['📈', 'Parámetros'] };
const toast = t => { const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 2600); };

// ============================================================ base de datos
let DB = null, ASSETS = null;
function demoDB() {
  const CLAVE = 'pm_demo_v1';
  let store = {}; try { store = JSON.parse(localStorage.getItem(CLAVE)) || {}; } catch (e) {}
  if (!store['config/personal']) store['config/personal'] = { p: JSON.parse(JSON.stringify(window.LI_PERSONAL_INICIAL)) };
  const subs = [], copia = o => o === undefined ? undefined : JSON.parse(JSON.stringify(o));
  const grabar = () => { try { localStorage.setItem(CLAVE, JSON.stringify(store)); } catch (e) { toast('El navegador ya no tiene espacio para la prueba (fotos). Borra datos de prueba en Configuración.'); } };
  const avisar = () => { grabar(); setTimeout(() => subs.forEach(f => f()), 0); };
  const mezclar = (dst, src) => { Object.keys(src).forEach(k => { const v = src[k]; if (v && v.__delete__) { delete dst[k]; return; } if (v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length) { if (!dst[k] || typeof dst[k] !== 'object' || Array.isArray(dst[k])) dst[k] = {}; mezclar(dst[k], v); } else dst[k] = copia(v); }); };
  const snap = p => ({ id: p.split('/').pop(), exists: p in store, data: () => copia(store[p]) });
  const doc = p => ({ id: p.split('/').pop(), get: async () => snap(p), set: async d => { store[p] = copia(d); avisar(); },
    update: async d => { if (!(p in store)) store[p] = {}; mezclar(store[p], d); avisar(); }, delete: async () => { delete store[p]; avisar(); },
    onSnapshot: cb => { let u = null; const f = () => { const j = JSON.stringify(store[p]); if (j === u) return; u = j; cb(snap(p)); }; subs.push(f); f(); return () => {}; } });
  const docs = c => Object.keys(store).filter(k => k.startsWith(c + '/') && k.split('/').length === c.split('/').length + 1).map(snap);
  const collection = c => ({ doc: id => doc(c + '/' + id), onSnapshot: cb => { let u = null; const f = () => { const d = docs(c), j = JSON.stringify(d.map(x => [x.id, x.data()])); if (j === u) return; u = j; cb({ docs: d }); }; subs.push(f); f(); return () => {}; }, get: async () => ({ docs: docs(c) }) });
  window.PM_BORRAR_DEMO = () => { localStorage.removeItem(CLAVE); location.reload(); };
  return { doc, collection };
}
function comprimirFoto(file) {
  return new Promise((ok, mal) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => { const lado = 1000, sc = Math.min(1, lado / Math.max(img.width, img.height)), cv = document.createElement('canvas'); cv.width = Math.round(img.width * sc); cv.height = Math.round(img.height * sc); const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(img, 0, 0, cv.width, cv.height); URL.revokeObjectURL(url); ok(cv.toDataURL('image/jpeg', 0.7)); };
    img.onerror = () => { URL.revokeObjectURL(url); mal(new Error('imagen no válida')); }; img.src = url;
  });
}
const demoAssets = { upload: async blob => { const d = await comprimirFoto(blob); const id = Math.random().toString(16).slice(2) + Date.now().toString(16); await DB.doc('fotos/' + id).set({ data: d, t: new Date().toISOString() }); return { id, url: d }; } };
// actualizar creando el documento si aún no existe (Firestore no deja "update" sobre un documento nuevo)
const sinBorrar = o => { if (!o || typeof o !== 'object' || Array.isArray(o)) return o; const r = {}; Object.keys(o).forEach(k => { const v = o[k]; if (v && v.__delete__) return; r[k] = (v && typeof v === 'object' && !Array.isArray(v)) ? sinBorrar(v) : v; }); return r; };
async function upd(p, d) { try { await DB.doc(p).update(d); } catch (e) { const s = await DB.doc(p).get(); if (s.exists) throw e; await DB.doc(p).set(sinBorrar(d)); } }
const cacheFoto = {};
async function fotoData(id) { if (cacheFoto[id]) return cacheFoto[id]; const s = await DB.doc('fotos/' + id).get(); const d = s.exists ? s.data().data : ''; cacheFoto[id] = d; return d; }
const fotoSrc = id => window.DEMO ? (cacheFoto[id] || '') : '/_blob/' + id;

// ============================================================ estado
const S = { yo: null, nom: null, pant: 1, mes: MES_HOY, pers: {}, aj: {}, planes: {}, ords: {}, fmtEd: {}, param: { refac: {}, baleros: {}, horometros: {} }, avisos: {}, acc: {}, claves: {}, verClaves: {}, alm: null, sub1: 'general', sub4: 'refac', hojaCat: '', verPlanGeneral: false };
const P = () => S.pers;
const yoP = () => S.pers[S.nom] || {};
const puede = n => (yoP().pant || []).includes(n);
const otorga = () => !!yoP().otorga || yoP().r === 'general';
const califica = () => !!yoP().califica || otorga();
const tecDe = nom => (S.pers[nom] || {}).tec || '';
const nomDeTec = tec => Object.keys(S.pers).find(k => (S.pers[k].tec || '') === tec) || '';
const nombreTec = tec => { const k = nomDeTec(tec); return k ? titulo(S.pers[k].n) : titulo(tec); };
const corto = tec => titulo(tec);
const colorTec = tec => { const L = tecsMes(S.mes); return COLORES[Math.max(0, L.indexOf(tec)) % COLORES.length]; };

// ============================================================ plan: tareas con clave estable
function tareasMes(mes) {
  const doc = S.planes[mes]; let L = doc && doc.t ? doc.t : ((window.PM_PLAN || {})[mes] || []);
  const excl = (S.aj.excl || {}), cuenta = {};
  return L.slice().sort((a, b) => a.f.localeCompare(b.f) || a.eq.localeCompare(b.eq)).map(t => {
    const base = mes + '|' + (t.no || t.eq) + '|' + t.fr + '|' + t.tec; cuenta[base] = (cuenta[base] || 0) + 1;
    const k = (base + '|' + cuenta[base]).replace(/[\/.#$\[\]]/g, '_');
    // el avance arranca en cero: solo cuenta lo registrado en esta app (no se toman las calificaciones capturadas en el Excel)
    return Object.assign({}, t, { k, mes, ejExcel: t.ej, ej: 0 });
  }).filter(t => !excl[t.k]);
}
const tecsMes = mes => [...new Set(tareasMes(mes).map(t => t.tec))].sort();
const mesesPlan = () => [...new Set(Object.keys(window.PM_PLAN || {}).concat(Object.keys(S.planes)))].sort();
// estado de una tarea: pendiente / vencida / proceso / terminada (por calificar) / calificada
function estadoT(t) {
  const o = S.ords[t.k] || {};
  if (o.cal != null) return 'cal';
  if (o.estado === 'terminada') return 'term';
  if ((t.ej || 0) > 0) return 'cal';            // calificada en el Excel (0/50/100)
  if (o.estado === 'proceso') return 'proc';
  return semanaCerrada(t.f) ? 'venc' : 'pend';
}
const calDe = t => { const o = S.ords[t.k] || {}; return o.cal != null ? o.cal : ((t.ej || 0) > 0 ? t.ej : null); };
const hecha = t => ['term', 'cal'].includes(estadoT(t));
// la semana de la fecha programada ya terminó (sábado pasado): cuenta para el cumplimiento
const semanaCerrada = f => iso(sumar(lunesDe(deIso(f)), 5)) < HOY;
const EST = { pend: ['Pendiente', 'acc'], venc: ['Vencida', 'bad'], proc: ['En proceso', 'wa'], term: ['Por calificar', 'mo'], cal: ['Calificada', 'ok'] };
// indicadores de una lista de tareas
function indicadores(L) {
  const n = L.length, hechas = L.filter(hecha), cals = L.map(calDe).filter(v => v != null);
  const debidas = L.filter(t => semanaCerrada(t.f) || hecha(t));
  const cumpl = debidas.length ? Math.round(hechas.length / debidas.length * 100) : (n ? 100 : 0);
  const calidad = cals.length ? Math.round(cals.reduce((s, v) => s + v, 0) / cals.length) : null;
  const califTotal = calidad == null ? cumpl : Math.round((cumpl + calidad) / 2);
  const mins = hechas.map(t => (S.ords[t.k] || {}).min).filter(Boolean);
  return { n, hechas: hechas.length, pend: n - hechas.length, venc: L.filter(t => estadoT(t) === 'venc').length, porCal: L.filter(t => estadoT(t) === 'term').length,
    cals: cals.length, cumpl, calidad, calif: califTotal, avance: n ? Math.round(hechas.length / n * 100) : 0, minProm: mins.length ? Math.round(mins.reduce((s, v) => s + v, 0) / mins.length) : null };
}
const notaCls = v => v == null ? 'gr' : v >= 85 ? 'ok' : v >= 60 ? 'wa' : 'bad';

// ============================================================ hoja (formato) de cada equipo
function formatos() { const base = (window.PM_FORMATOS || []).map(f => S.fmtEd[f.id] ? Object.assign({}, f, S.fmtEd[f.id]) : f); return base; }
const fmtPorId = id => formatos().find(f => f.id === id);
function fmtDe(t) {
  const ov = (S.aj.fmtEq || {})[(t.no || t.eq)]; if (ov) return fmtPorId(ov);
  const n = norm(t.eq);
  for (const [re, cat, id] of (window.PM_REGLAS || [])) { if ((!re || new RegExp(re).test(n)) && (!cat || cat === t.cat)) return fmtPorId(id); }
  return null;
}
// secciones de la frecuencia pedida (si la hoja no la tiene, la más cercana)
function seccionesDe(fmt, fr) {
  if (!fmt) return { fr, secs: [] };
  const orden = ['S', '1M', '3M', '6M', 'A'], tiene = k => (fmt.frec[k] || []).length && (fmt.frec[k] || []).some(s => s.items.length);
  if (tiene(fr)) return { fr, secs: fmt.frec[fr] };
  const i = orden.indexOf(fr);
  for (let d = 1; d < 5; d++) { for (const j of [i - d, i + d]) { const k = orden[j]; if (k && tiene(k)) return { fr: k, secs: fmt.frec[k], aprox: true }; } }
  return { fr, secs: [] };
}
const DIB_QUIETO = {};
function dibujo(t, w) {
  const n = norm(t.eq || t.tipo || ''), c = CAT[t.cat] || ['', '#6D7C8C', 'ag']; let k = c[2];
  if (/compresor|extractor|colector|secador|vaporizador/.test(n)) k = 'ea';
  else if (/laser|gweike|bimex/.test(n)) k = 'laser';
  else if (/dobladora|plegadora/.test(n)) k = 'dobladora';
  else if (/soldar|soldadora|punteadora/.test(n)) k = 'soldadora';
  else if (/enchapadora|canteadora|homag/.test(n)) k = 'enchapadora';
  else if (/horno|tunel/.test(n)) k = 'horno';
  else if (/prensa|troquel/.test(n)) k = 'mtb';
  else if (/taladro/.test(n)) k = t.cat === 'MTB' ? 'taladroBanco' : 'mtc';
  const R = window.ICON_R || {};
  // dibujos QUIETOS (sin animación): en tablets sencillas decenas de dibujos animados a la vez rayan la pantalla
  if (!DIB_QUIETO[k]) DIB_QUIETO[k] = (R[k] || R.mta || '').replace(/<animate(Transform|Motion)?\b[^>]*\/>/g, '').replace(/<animate(Transform|Motion)?\b[^>]*>[\s\S]*?<\/animate(Transform|Motion)?>/g, '');
  return '<svg viewBox="0 0 120 100" style="color:' + c[1] + '" aria-hidden="true">' + DIB_QUIETO[k] + '</svg>';
}

// ============================================================ arranque
(async function iniciar() {
  if (window.DEMO) { DB = demoDB(); ASSETS = demoAssets; }
  else { DB = await window.claude.use('db'); ASSETS = await window.claude.use('assets'); }
  DB.doc('config/personal').onSnapshot(s => { S.pers = (s.exists && s.data().p) || {}; if (S.nom && (!S.pers[S.nom] || S.pers[S.nom].a === false)) salir(); else if (S.nom) render(); });
  DB.doc('config/ajustes').onSnapshot(s => { S.aj = (s.exists && s.data()) || {}; if (S.nom) render(); });
  DB.collection('plan').onSnapshot(q => { S.planes = {}; q.docs.forEach(d => S.planes[d.id] = d.data()); if (S.nom) render(); });
  DB.collection('ordenes').onSnapshot(q => { S.ords = {}; q.docs.forEach(d => S.ords[d.id] = d.data()); if (window.DEMO) precargarFotos(); if (S.nom && !(S.pant === 3 && S.hoja)) render(); });   // mientras se llena una hoja no se repinta (no se pierde lo que se toca)
  DB.collection('formatos').onSnapshot(q => { S.fmtEd = {}; q.docs.forEach(d => S.fmtEd[d.id] = d.data()); if (S.nom) render(); });
  ['refac', 'baleros', 'horometros'].forEach(k => DB.doc('param/' + k).onSnapshot(s => { S.param[k] = (s.exists && s.data()) || {}; if (S.nom && S.pant === 4) render(); }));
  DB.collection('avisos').onSnapshot(q => { S.avisos = {}; q.docs.forEach(d => S.avisos[d.id] = d.data()); if (S.nom) render(); });
  DB.collection('acceso').onSnapshot(q => { S.acc = {}; q.docs.forEach(d => S.acc[d.id] = d.data()); });
  DB.collection('claves').onSnapshot(q => { S.claves = {}; q.docs.forEach(d => S.claves[d.id] = d.data()); if (S.nom && S.pant === 1 && S.sub1 === 'config') render(); }, () => {});
  if (!window.DEMO) cargarAlmacen();
  let guardado = ''; try { guardado = sessionStorage.getItem('pm_nom') || ''; } catch (e) {}
  setTimeout(() => { if (guardado && S.pers[guardado]) entrar(guardado); else mostrarLogin(); }, 300);
})();
async function precargarFotos() { for (const o of Object.values(S.ords)) for (const f of (o.fotos || [])) if (!cacheFoto[f]) await fotoData(f); }
// almacén (otra app): catálogo con existencia y costo
async function cargarAlmacen() {
  try { const fs = firebase.firestore(); fs.collection('apps/almacen/catalogo').onSnapshot(q => { const it = []; q.docs.forEach(d => { const its = d.data().items || {}; for (const k in its) { const x = its[k]; it.push({ c: x.c, n: x.n, d: x.d, m: x.m, ex: (Number(x.ini) || 0) + (Number(x.ent) || 0) - (Number(x.sal) || 0), cu: Number(x.cu) || 0, ub: [x.niv, x.pos].filter(Boolean).join('-') }); } }); S.alm = it; if (S.pant === 4) render(); }, () => { S.alm = null; }); } catch (e) { S.alm = null; }
}

// ============================================================ entrada por nómina y contraseña
// Contraseña inicial de todos: 000000. Con la genérica se pide cambiarla; los técnicos la renuevan cada mes.
// acceso/<nómina> {h (huella), mes, t, gen} sirve para validar · claves/<nómina> {c, t} la ven solo el jefe y la gerencia.
const GEN = '000000';
const LG = { modo: 'login', campo: 'nom', nom: '', pas: '', pas2: '', ver: false };
async function huellaClave(nom, pwd) {
  const txt = 'li-pm|' + nom + '|' + pwd;
  try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt)); return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join(''); }
  catch (e) { let h = 5381; for (const c of txt) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0; return 'd' + h.toString(16); }
}
function mostrarLogin(msg) {
  $('#login').hidden = false; $('#bYo').hidden = true; $('#tabs').innerHTML = '';
  Object.assign(LG, { modo: 'login', campo: 'nom', nom: '', pas: '', pas2: '', ver: false });
  $('#tecl').innerHTML = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', 'C'].map(k => '<button type="button" data-k="' + k + '">' + k + '</button>').join('');
  $('#tecl').classList.remove('abierto'); $('#lDemo').hidden = true;   // pantalla limpia: el teclado aparece al tocar la nómina
  if (false) { $('#lDemoBt').innerHTML = Object.entries(S.pers).filter(([, p]) => p.a !== false).map(([k, p]) => '<button class="bt s" data-demo="' + k + '">' + esc(titulo(p.n).split(' ').slice(0, 2).join(' ')) + ' · ' + esc(p.puesto || '') + '</button>').join(''); }
  pintarLogin(msg || '');
}
function pintarLogin(err) {
  const p = S.pers[LG.nom], cambio = LG.modo === 'cambio', punto = s => LG.ver ? s : '●'.repeat(s.length);
  $('#lSub').textContent = cambio ? 'Crea tu nueva contraseña de 6 dígitos' : 'Número de nómina y contraseña';
  $('#lHola').hidden = !p; if (p) $('#lHola').innerHTML = '👋 Hola, <b>' + esc(titulo(p.n).split(' ').slice(0, 2).join(' ')) + '</b> · ' + esc(p.puesto || '');
  $('#cNom').hidden = cambio; $('#cPas2').hidden = !cambio;
  $('#lPasL').textContent = cambio ? 'NUEVA CONTRASEÑA' : 'CONTRASEÑA';
  const pon = (id, v, ph, oculto) => { const el = $(id); el.textContent = v ? (oculto ? punto(v) : v) : ph; el.classList.toggle('ph', !v); };
  pon('#lNom', LG.nom, 'Escribe tu nómina'); pon('#lPas', LG.pas, '6 dígitos', true); pon('#lPas2', LG.pas2, '6 dígitos', true);
  ['nom', 'pas', 'pas2'].forEach(c => $('[data-campo="' + c + '"]').classList.toggle('act', LG.campo === c));
  $('#lOk').textContent = cambio ? 'Guardar contraseña y entrar' : 'Entrar';
  $('#lErr').textContent = err || ''; $('#lErr').style.color = err && err.startsWith('✔') ? 'var(--ok)' : 'var(--bad)';
}
async function intentarEntrar() {
  const nom = LG.nom.trim(), p = S.pers[nom];
  if (LG.modo === 'cambio') {
    if (!/^\d{6}$/.test(LG.pas)) return pintarLogin('La contraseña debe tener 6 dígitos.');
    if (LG.pas === GEN) return pintarLogin('No puedes usar la contraseña genérica 000000.');
    if (LG.pas !== LG.pas2) { LG.pas2 = ''; LG.campo = 'pas2'; return pintarLogin('Las dos contraseñas no coinciden.'); }
    if ((S.acc[nom] || {}).h === await huellaClave(nom, LG.pas)) return pintarLogin('Usa una contraseña diferente a la anterior.');
    await DB.doc('acceso/' + nom).set({ h: await huellaClave(nom, LG.pas), mes: MES_HOY, t: new Date().toISOString(), gen: false });
    await DB.doc('claves/' + nom).set({ c: LG.pas, t: new Date().toISOString() });
    toast('Contraseña actualizada'); return entrar(nom);
  }
  if (!p || p.a === false) { LG.campo = 'nom'; return pintarLogin('La nómina ' + (nom || '—') + ' no está dada de alta o está desactivada.'); }
  if (!LG.pas) { LG.campo = 'pas'; return pintarLogin('Escribe tu contraseña.'); }
  const a = S.acc[nom], ok = a && a.h ? a.h === await huellaClave(nom, LG.pas) : LG.pas === GEN;
  if (!ok) { LG.pas = ''; LG.campo = 'pas'; return pintarLogin('Contraseña incorrecta.'); }
  const generica = !a || a.gen || LG.pas === GEN, vencida = !!p.tec && (!a || a.mes !== MES_HOY);
  if (generica || vencida) { Object.assign(LG, { modo: 'cambio', campo: 'pas', pas: '', pas2: '' }); return pintarLogin(generica ? 'Estás usando la contraseña genérica: crea la tuya.' : 'Nuevo mes: renueva tu contraseña.'); }
  entrar(nom);
}
function entrar(nom) {
  const p = S.pers[nom];
  if (!p || p.a === false) { mostrarLogin('La nómina ' + nom + ' no está dada de alta o está desactivada.'); return; }
  S.nom = nom; try { sessionStorage.setItem('pm_nom', nom); } catch (e) {}
  $('#login').hidden = true;
  S.pant = (p.pant || [2])[0];
  if (p.tec && (p.pant || []).includes(2)) S.pant = 2;
  render();
  if (otorga() && !window.DEMO) revisarExcel(true);   // el envío al Organigrama queda desactivado: no se tocan las apps instaladas
}
function salir() { S.nom = null; try { sessionStorage.removeItem('pm_nom'); } catch (e) {} mostrarLogin(); }
const campoAct = () => LG.campo === 'nom' ? 'nom' : LG.campo;
function teclear(v) {
  const c = campoAct(), max = c === 'nom' ? 6 : 6;
  if (v === '⌫') LG[c] = LG[c].slice(0, -1); else if (v === 'C') LG[c] = ''; else if (LG[c].length < max) LG[c] += v;
  if (c === 'nom' && LG.nom.length >= 4 && S.pers[LG.nom] && v !== '⌫' && v !== 'C' && LG.nom.length === 4) LG.campo = 'pas';
  if (c === 'pas' && LG.pas.length === 6 && LG.modo === 'cambio') LG.campo = 'pas2';
  pintarLogin('');
}
document.addEventListener('click', e => {
  if ($('#login').hidden) return;
  const k = e.target.closest('[data-k]'); if (k) return teclear(k.dataset.k);
  const c = e.target.closest('[data-campo]'); if (c && !e.target.closest('#lOjo')) { LG.campo = c.dataset.campo; $('#tecl').classList.add('abierto'); return pintarLogin(''); }
  if (e.target.closest('#lOjo')) { LG.ver = !LG.ver; return pintarLogin(''); }
  const d = e.target.closest('[data-demo]'); if (d) { Object.assign(LG, { modo: 'login', nom: d.dataset.demo, pas: '', pas2: '', campo: 'pas' }); return pintarLogin(''); }
  if (e.target.closest('#lOk')) return intentarEntrar();
});
document.addEventListener('keydown', e => {
  if ($('#login').hidden) return;
  if (/^\d$/.test(e.key)) teclear(e.key); else if (e.key === 'Backspace') teclear('⌫');
  else if (e.key === 'Tab') { e.preventDefault(); const orden = LG.modo === 'cambio' ? ['pas', 'pas2'] : ['nom', 'pas']; LG.campo = orden[(orden.indexOf(LG.campo) + 1) % orden.length]; pintarLogin(''); }
  else if (e.key === 'Enter') { if (LG.modo === 'login' && LG.campo === 'nom') { LG.campo = 'pas'; pintarLogin(''); } else intentarEntrar(); }
});

// ============================================================ render general
function render() {
  if (!S.nom) return;
  const p = yoP();
  if (!puede(S.pant)) S.pant = (p.pant || [2])[0];
  $('#bYo').hidden = false;
  $('#bYo').innerHTML = '<span class="av" style="background:' + (p.tec ? colorTec(p.tec) : '#1F6FD1') + '">' + esc((p.n || '?')[0]) + '</span><span style="text-align:left;line-height:1.1"><b style="font-size:13px">' + esc(titulo(p.n).split(' ').slice(0, 2).join(' ')) + '</b><br><small>' + esc(p.puesto || '') + ' · Salir</small></span>';
  $('#subt').textContent = (window.DEMO ? '🧪 MODO PRUEBA (datos en este navegador) · ' : '') + 'Línea Italia · ' + nomMes(S.mes);
  $('#tabs').innerHTML = (p.pant || []).slice().sort().map(n => '<button class="tab" data-pant="' + n + '" aria-current="' + (S.pant === n) + '"><span class="i">' + PANT[n][0] + '</span>' + (n === 2 && !p.tec ? 'Plan del mes' : PANT[n][1]) + '</button>').join('');
  const vista = { 1: vTablero, 2: vMiMes, 3: vHojas, 4: vParam }[S.pant];
  vista();
}
document.addEventListener('click', e => {
  const t = e.target.closest('[data-pant]'); if (t) { S.pant = Number(t.dataset.pant); S.hoja = null; scrollTo(0, 0); return render(); }
  if (e.target.closest('#bYo')) { if (confirm('¿Salir de ' + titulo(yoP().n) + '?')) salir(); }
});
function selMes() {
  return '<select class="in" id="selMes" style="width:auto;min-width:170px">' + mesesPlan().map(m => '<option value="' + m + '"' + (m === S.mes ? ' selected' : '') + '>' + nomMes(m) + (m === MES_HOY ? ' (en curso)' : '') + '</option>').join('') + '</select>';
}
document.addEventListener('change', e => { if (e.target.id === 'selMes') { S.mes = e.target.value; render(); } });
function anillo(v, color, lbl, sub) {
  const r = 40, c = 2 * Math.PI * r, val = v == null ? 0 : Math.max(0, Math.min(100, v));
  return '<div class="anillo"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="' + r + '" fill="none" stroke="#E4E9EF" stroke-width="10"/><circle class="v" cx="50" cy="50" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="10" stroke-linecap="round" stroke-dasharray="' + c + '" stroke-dashoffset="' + c + '" data-off="' + (c * (1 - val / 100)) + '" transform="rotate(-90 50 50)"/><text x="50" y="56" text-anchor="middle" font-size="22" font-weight="800" fill="#0B2545">' + (v == null ? '—' : v + '%') + '</text></svg><b>' + lbl + '</b><span>' + sub + '</span></div>';
}
const animar = () => requestAnimationFrame(() => requestAnimationFrame(() => { document.querySelectorAll('circle.v[data-off]').forEach(c => c.style.strokeDashoffset = c.dataset.off); document.querySelectorAll('[data-w]').forEach(i => i.style.width = i.dataset.w + '%'); }));

// ============================================================ PANTALLA 1 · TABLERO
function vTablero() {
  const L = tareasMes(S.mes), I = indicadores(L), tecs = tecsMes(S.mes);
  const subs = [['general', '📊 Vista general'], ['calificar', '⭐ Por calificar' + (I.porCal ? ' (' + I.porCal + ')' : '')], ['faltantes', '⏳ Faltantes'], ['plan', '🗓️ Plan del mes']];
  if (califica()) subs.splice(2, 0, ['na', '❔ No aplica']);
  if (otorga()) subs.push(['firmas', '✍️ Firmas'], ['jasso', '🧑‍💼 Supervisión'], ['config', '⚙️ Configuración']);
  let h = '<div class="fila" style="margin-bottom:14px;justify-content:space-between"><div class="seg" id="sub1">' + subs.map(([k, l]) => '<button data-sub1="' + k + '" aria-pressed="' + (S.sub1 === k) + '">' + l + '</button>').join('') + '</div>' + selMes() + '</div>';
  if (S.sub1 === 'config' && otorga()) { $('#app').innerHTML = h + vConfig(); return animar(); }
  if (S.sub1 === 'jasso' && otorga()) { $('#app').innerHTML = h + vJasso(L); return animar(); }
  h += '<div class="kpis"><div class="kpi"><b>' + I.n + '</b><span>preventivos del mes</span></div><div class="kpi ok"><b>' + I.hechas + '</b><span>terminados (' + I.avance + ' %)</span></div><div class="kpi mo"><b>' + I.porCal + '</b><span>por calificar</span></div><div class="kpi ' + (I.venc ? 'bad' : 'wa') + '"><b>' + I.pend + '</b><span>faltantes · ' + I.venc + ' vencidos</span></div><div class="kpi ' + notaCls(I.cumpl) + '"><b>' + I.cumpl + '%</b><span>cumplimiento al día</span></div><div class="kpi ' + notaCls(I.calidad) + '"><b>' + (I.calidad == null ? '—' : I.calidad + '%') + '</b><span>calidad promedio</span></div></div>';
  if (S.sub1 === 'firmas' && otorga()) { $('#app').innerHTML = h + vFirmas(); return; }
  if (S.sub1 === 'na' && califica()) h += vNA();
  else if (S.sub1 === 'calificar') h += vPorCalificar(L);
  else if (S.sub1 === 'faltantes') h += vFaltantes(L);
  else if (S.sub1 === 'plan') h += vPlanGeneral(L);
  else {
    h += vDia();
    const filas = tecs.map(tec => { const T = L.filter(t => t.tec === tec); return Object.assign({ tec }, indicadores(T)); }).sort((a, b) => b.calif - a.calif);
    h += '<div class="grid3"><div class="caja"><h2>👷 Avance por técnico <span class="r">' + nomMes(S.mes) + '</span></h2><div class="bars">' + filas.map(f => {
      const w = x => f.n ? (x / f.n * 100).toFixed(1) : 0, cal = L.filter(t => t.tec === f.tec && estadoT(t) === 'cal').length;
      return '<div class="b"><div class="n"><span class="av" style="width:30px;height:30px;font-size:13px;background:' + colorTec(f.tec) + '">' + f.tec[0] + '</span><span>' + esc(corto(f.tec)) + '</span></div><div class="t" title="' + f.hechas + ' de ' + f.n + '"><i data-w="' + w(cal) + '" style="width:0;background:#1E8E5A"></i><i data-w="' + w(f.porCal) + '" style="width:0;background:#6A4BC4"></i><i data-w="' + w(L.filter(t => t.tec === f.tec && estadoT(t) === 'proc').length) + '" style="width:0;background:#E0A100"></i><i data-w="' + w(f.venc) + '" style="width:0;background:#F1A3A3"></i></div><div class="v"><b>' + f.hechas + '</b>/' + f.n + ' · <span class="nota ' + notaCls(f.calif) + '" style="height:24px;min-width:40px">' + f.calif + '</span></div></div>';
    }).join('') + '</div><div class="ley"><span><i style="background:#1E8E5A"></i>Calificado</span><span><i style="background:#6A4BC4"></i>Por calificar</span><span><i style="background:#E0A100"></i>En proceso</span><span><i style="background:#F1A3A3"></i>Vencido</span><span><i style="background:#EEF1F4"></i>Pendiente</span></div></div>';
    h += '<div class="caja"><h2>🎯 Total del preventivo</h2><div class="anillos" style="grid-template-columns:1fr 1fr">' + anillo(I.cumpl, '#1F6FD1', 'Cumplimiento', 'terminados vs. vencidos') + anillo(I.calidad, '#1E8E5A', 'Calidad', 'promedio 0 / 50 / 100') + anillo(I.avance, '#6A4BC4', 'Avance del mes', I.hechas + ' de ' + I.n) + anillo(I.calif, '#E07B00', 'Calificación', 'promedio cumpl. y calidad') + '</div></div></div>';
    h += '<div class="caja"><h2>📋 Promedios y calificación por técnico</h2><div class="scroll"><table class="tbl"><tr><th>Técnico</th><th class="n">Asignados</th><th class="n">Terminados</th><th class="n">Faltantes</th><th class="n">Vencidos</th><th class="n">Por calificar</th><th class="n">Tiempo prom.</th><th class="n">Cumplimiento</th><th class="n">Calidad</th><th class="n">Calificación</th></tr>' +
      filas.map(f => '<tr class="click" data-vertec="' + f.tec + '"><td><b>' + esc(nombreTec(f.tec)) + '</b></td><td class="n">' + f.n + '</td><td class="n">' + f.hechas + '</td><td class="n">' + f.pend + '</td><td class="n">' + (f.venc ? '<span class="chip bad">' + f.venc + '</span>' : '0') + '</td><td class="n">' + f.porCal + '</td><td class="n">' + (f.minProm ? f.minProm + ' min' : '—') + '</td><td class="n"><span class="nota ' + notaCls(f.cumpl) + '">' + f.cumpl + '%</span></td><td class="n"><span class="nota ' + notaCls(f.calidad) + '">' + (f.calidad == null ? '—' : f.calidad + '%') + '</span></td><td class="n"><span class="nota ' + notaCls(f.calif) + '">' + f.calif + '</span></td></tr>').join('') + '</table></div><p class="peq mu" style="margin:10px 0 0">Cumplimiento = terminados ÷ (los de semanas ya cerradas + los terminados de la semana en curso). Calidad = promedio de las calificaciones de Jasso (0, 50 o 100; incluye las capturadas en el Excel). Calificación = promedio de los dos.</p></div>';
    if (I.porCal) h += '<div class="aviso wa"><span class="i">⭐</span><div><b>' + I.porCal + ' preventivo' + (I.porCal > 1 ? 's' : '') + ' esperando calificación.</b> <button class="bt s" data-sub1="calificar">Calificar ahora</button></div></div>';
  }
  $('#app').innerHTML = h; animar();
}
document.addEventListener('click', e => {
  const s = e.target.closest('[data-sub1]'); if (s) { S.sub1 = s.dataset.sub1; return render(); }
  const v = e.target.closest('[data-vertec]'); if (v) { S.sub1 = 'faltantes'; S.filtroTec = v.dataset.vertec; return render(); }
});
function vPorCalificar(L) {
  const T = L.filter(t => estadoT(t) === 'term').sort((a, b) => ((S.ords[a.k] || {}).fin || '').localeCompare((S.ords[b.k] || {}).fin || ''));
  if (!T.length) return '<div class="caja vacio"><span class="i">🎉</span>No hay preventivos por calificar.</div>';
  return '<div class="caja"><h2>⭐ Por calificar <span class="r">0 = mal hecho · 50 = incompleto · 100 = bien hecho</span></h2>' + T.map(t => {
    const o = S.ords[t.k] || {}, hrs = o.fin ? Math.round((Date.now() - new Date(o.fin)) / 36e5) : 0, malos = contarMal(o), fot = (o.fotos || []).length;
    return '<div class="pc"><div class="dib">' + dibujo(t) + '</div><div><b>' + esc(t.eq) + '</b> <span class="chip">' + esc(FR[t.fr] || t.fr) + '</span><br><span class="peq mu">' + esc(nombreTec(t.tec)) + ' · programado ' + fCorta(t.f) + ' · terminó ' + fechaHora(o.fin) + ' · ' + (o.min || '?') + ' min</span><div class="fila" style="margin-top:6px">' + (hrs > 48 ? '<span class="chip bad">⏰ esperando ' + hrs + ' h</span>' : '<span class="chip">hace ' + hrs + ' h</span>') + '<span class="chip ' + (fot ? 'ok' : 'bad') + '">📷 ' + fot + ' foto' + (fot === 1 ? '' : 's') + '</span>' + (malos ? '<span class="chip wa">⚠️ ' + malos + ' punto' + (malos > 1 ? 's' : '') + ' en MAL</span>' : '') + ((o.hall || []).length ? '<span class="chip acc">🔧 ' + o.hall.length + ' hallazgo(s)</span>' : '') + '<button class="bt s" data-abrir="' + t.k + '">Ver hoja</button></div></div>' +
      (califica() ? '<div class="cal"><button class="c0" data-cal="' + t.k + '|0">0</button><button class="c50" data-cal="' + t.k + '|50">50</button><button class="c100" data-cal="' + t.k + '|100">100</button></div>' : '<span class="chip mo">Por calificar</span>') + '</div>';
  }).join('') + '</div>';
}
const contarMal = o => Object.values(o.resp || {}).filter(r => r && (r.e === 'M' || r.c === 'N')).length;
document.addEventListener('click', async e => {
  const c = e.target.closest('[data-cal]'); if (!c) return;
  const s = c.dataset.cal, i = s.lastIndexOf('|'), k = s.slice(0, i), v = s.slice(i + 1); const t = tareasMes(S.mes).find(x => x.k === k) || {};
  let nota = ''; if (v !== '100') { nota = prompt('Calificación ' + v + ': ¿qué faltó o qué estuvo mal? (opcional)') || ''; }
  const firmaS = await firmaGuardada('Firma del supervisor'); if (!firmaS) return toast('Sin firma no se registra la calificación.');
  await upd('ordenes/' + k, { cal: Number(v), calPor: S.nom, calN: yoP().n, calT: new Date().toISOString(), calNota: nota, estado: 'calificada', firmaS });
  toast('Calificado con ' + v + ' · ' + (t.eq || ''));
});
function vFaltantes(L) {
  const f = S.filtroTec || '', T = L.filter(t => !hecha(t) && (!f || t.tec === f));
  let h = '<div class="caja"><h2>⏳ Preventivos faltantes <span class="r"><select class="in" id="fTec" style="width:auto"><option value="">Todos los técnicos</option>' + tecsMes(S.mes).map(x => '<option value="' + x + '"' + (x === f ? ' selected' : '') + '>' + esc(nombreTec(x)) + '</option>').join('') + '</select></span></h2>';
  if (!T.length) return h + '<div class="vacio"><span class="i">🎉</span>Sin faltantes.</div></div>';
  const porTec = {}; T.forEach(t => (porTec[t.tec] = porTec[t.tec] || []).push(t));
  Object.keys(porTec).sort().forEach(tec => {
    const A = porTec[tec], v = A.filter(t => estadoT(t) === 'venc').length;
    h += '<div class="semana"><span class="av" style="width:28px;height:28px;font-size:12px;background:' + colorTec(tec) + '">' + tec[0] + '</span>' + esc(nombreTec(tec)) + ' <span class="chip">' + A.length + ' faltantes</span>' + (v ? '<span class="chip bad">' + v + ' vencidos</span>' : '') + (califica() ? '<button class="bt s" data-recordar="' + tec + '">📣 Enviar recordatorio</button>' : '') + '</div>';
    h += A.map(t => filaOrden(t, true)).join('');
  });
  return h + '</div>';
}
document.addEventListener('change', e => { if (e.target.id === 'fTec') { S.filtroTec = e.target.value; render(); } });
document.addEventListener('click', async e => {
  const r = e.target.closest('[data-recordar]'); if (!r) return;
  const tec = r.dataset.recordar, nom = nomDeTec(tec); if (!nom) return toast('Ese técnico no tiene nómina dada de alta.');
  const faltan = tareasMes(S.mes).filter(t => t.tec === tec && !hecha(t)).length;
  const txt = prompt('Mensaje para ' + nombreTec(tec) + ':', 'Te faltan ' + faltan + ' preventivos del mes. Apóyame a terminarlos esta semana (el sábado es para faltantes).'); if (!txt) return;
  const prev = (S.avisos[nom] || {}).m || [];
  await DB.doc('avisos/' + nom).set({ m: prev.concat([{ t: new Date().toISOString(), de: yoP().n, txt }]).slice(-10) });
  toast('Recordatorio enviado a ' + nombreTec(tec));
});
function filaOrden(t, conTec) {
  const e = estadoT(t), o = S.ords[t.k] || {}, cal = calDe(t), fmt = fmtDe(t);
  return '<div class="ord ' + e + '"><div class="dib">' + dibujo(t) + '</div><div><h3>' + esc(t.eq) + '</h3><div class="fila"><span class="chip ' + EST[e][1] + '">' + EST[e][0] + '</span><span class="chip">' + esc(FR[t.fr] || t.fr) + '</span><span class="chip">📅 ' + fCorta(t.f) + '</span><span class="chip">⏱ ' + (o.min ? o.min + ' min reales' : t.min + ' min') + '</span>' + (conTec ? '<span class="chip">👷 ' + esc(corto(t.tec)) + '</span>' : '') + (cal != null ? '<span class="nota ' + notaCls(cal) + '" style="height:24px">' + cal + '</span>' : '') + (o.fin && o.fin.slice(0, 10) !== t.f ? '<span class="chip acc">Hecho el ' + fCorta(o.fin.slice(0, 10)) + '</span>' : '') + '</div>' + alertasEq(t).map(a => ' <span class="chip ' + a.cls + '">' + esc(a.txt) + '</span>').join('') + (fmt ? '' : '<span class="peq" style="color:var(--bad)">Sin hoja de instrucciones asignada</span>') + '</div><div class="fila"><button class="bt ' + (['pend', 'venc', 'proc'].includes(e) && t.tec === tecDe(S.nom) ? 'p' : '') + '" data-abrir="' + t.k + '">' + (['pend', 'venc'].includes(e) && t.tec === tecDe(S.nom) ? '▶ Iniciar hoja' : e === 'proc' && t.tec === tecDe(S.nom) ? '✏️ Continuar' : '📄 Ver hoja') + '</button></div></div>';
}
// ---------- supervisión del supervisor (solo jefe / gerencia)
function vJasso(L) {
  const I = indicadores(L), term = L.map(t => S.ords[t.k]).filter(o => o && o.fin);
  const calif = term.filter(o => o.cal != null && o.calT), espera = calif.map(o => (new Date(o.calT) - new Date(o.fin)) / 36e5);
  const aTiempo = espera.filter(h => h <= 48).length, prom = espera.length ? espera.reduce((s, v) => s + v, 0) / espera.length : null;
  const pendientes = term.filter(o => o.cal == null), atrasadas = pendientes.filter(o => (Date.now() - new Date(o.fin)) / 36e5 > 48);
  // coherencia: 100 con puntos en MAL o sin fotos, o 0 con hoja limpia y con fotos
  const raras = calif.filter(o => (o.cal === 100 && (contarMal(o) > 0 || !(o.fotos || []).length)) || (o.cal === 0 && contarMal(o) === 0 && (o.fotos || []).length));
  const coh = calif.length ? Math.round((calif.length - raras.length) / calif.length * 100) : null;
  const dist = [0, 50, 100].map(v => calif.filter(o => o.cal === v).length);
  const CJ = califJassoSemanas(S.mes), califJ = CJ.prom;
  const sup = Object.entries(S.pers).find(([, p]) => p.califica);
  let h = '<div class="grid3"><div class="caja"><h2>🧑‍💼 ' + esc(sup ? titulo(sup[1].n) : 'Supervisor') + ' · ' + nomMes(S.mes) + '</h2><div class="anillos">' + anillo(califJ, '#1F6FD1', 'Su calificación', 'promedio de sus semanas') + anillo(calif.length ? Math.round(aTiempo / calif.length * 100) : null, '#1E8E5A', 'Evalúa a tiempo', 'calificadas en ≤ 48 h') + anillo(coh, '#E07B00', 'Coherencia', 'calificación vs. lo que dice la hoja') + '</div>' +
    '<div class="kpis" style="grid-template-columns:repeat(4,1fr);margin-top:14px"><div class="kpi"><b>' + calif.length + '</b><span>calificadas</span></div><div class="kpi ' + (atrasadas.length ? 'bad' : 'ok') + '"><b>' + pendientes.length + '</b><span>sin calificar · ' + atrasadas.length + ' con más de 48 h</span></div><div class="kpi"><b>' + (prom == null ? '—' : prom.toFixed(1) + ' h') + '</b><span>tiempo promedio para calificar</span></div><div class="kpi mo"><b>' + dist[0] + ' / ' + dist[1] + ' / ' + dist[2] + '</b><span>calificaciones 0 / 50 / 100 · promedio que asigna ' + (calif.length ? Math.round(calif.reduce((s, o) => s + o.cal, 0) / calif.length) + ' %' : '—') + '</span></div></div></div>' +
    '<div class="caja"><h2>📌 Cómo se evalúa</h2><ul class="peq" style="padding-left:18px;margin:0;line-height:1.6"><li><b>Su calificación</b> = promedio de sus semanas. Cada semana arranca en <b>100</b> y baja ' + PESO_J.noReal + ' puntos por cada preventivo que un técnico no realizó en su semana, ' + PESO_J.noEval + ' por cada uno que él no evaluó y firmó a tiempo (48 h) y ' + PESO_J.arrastre + ' por cada atraso que viene de semanas anteriores.</li><li><b>A tiempo</b>: calificar a más tardar 48 h después de que el técnico termina.</li><li><b>Coherencia</b>: alerta si pone 100 con puntos en MAL o sin fotos, o 0 a una hoja limpia y con evidencia.</li></ul></div></div>';
  h += tablaSemanasJasso(CJ) + vOrganigrama();
  h += '<div class="caja"><h2>⚠️ Calificaciones a revisar <span class="r">' + raras.length + '</span></h2>' + (raras.length ? '<table class="tbl"><tr><th>Equipo</th><th>Técnico</th><th class="n">Calificación</th><th>Por qué revisar</th><th></th></tr>' + raras.map(o => '<tr><td>' + esc(o.eq) + '</td><td>' + esc(corto(o.tec)) + '</td><td class="n"><span class="nota ' + notaCls(o.cal) + '">' + o.cal + '</span></td><td>' + (o.cal === 100 ? (contarMal(o) ? contarMal(o) + ' punto(s) en MAL' : '') + (!(o.fotos || []).length ? ' sin fotos' : '') : 'hoja limpia con evidencia y calificó 0') + '</td><td><button class="bt s" data-abrir="' + o.k + '">Ver hoja</button></td></tr>').join('') + '</table>' : '<div class="vacio"><span class="i">✅</span>Sin calificaciones raras.</div>') + '</div>';
  h += '<div class="caja"><h2>⏰ Esperando calificación <span class="r">' + pendientes.length + '</span></h2>' + (pendientes.length ? '<table class="tbl"><tr><th>Equipo</th><th>Técnico</th><th>Terminó</th><th class="n">Horas esperando</th></tr>' + pendientes.sort((a, b) => a.fin.localeCompare(b.fin)).map(o => { const hr = Math.round((Date.now() - new Date(o.fin)) / 36e5); return '<tr><td>' + esc(o.eq) + '</td><td>' + esc(corto(o.tec)) + '</td><td>' + fechaHora(o.fin) + '</td><td class="n">' + (hr > 48 ? '<span class="chip bad">' + hr + ' h</span>' : hr + ' h') + '</td></tr>'; }).join('') + '</table>' : '<div class="vacio"><span class="i">👍</span>Todo calificado.</div>') + '</div>';
  return h;
}

// ============================================================ PANTALLA 2 · MI MES (técnico) / PLAN DEL MES
function vMiMes() {
  const p = yoP(), tec = p.tec, L = tareasMes(S.mes);
  if (!tec || S.verPlanGeneral) {
    const I = indicadores(L);
    $('#app').innerHTML = '<div class="fila" style="justify-content:space-between;margin-bottom:14px">' + (tec ? '<button class="bt" data-plangen="0">‹ Mis órdenes</button>' : '<span></span>') + selMes() + '</div><div class="caja"><h2>📅 Avance general del mes</h2><div class="anillos">' + anillo(I.avance, '#6A4BC4', 'Avance', I.hechas + ' de ' + I.n) + anillo(I.cumpl, '#1F6FD1', 'Cumplimiento', 'al día') + anillo(I.calidad, '#1E8E5A', 'Calidad', 'promedio') + '</div></div>' + vPlanGeneral(L);
    return animar();
  }
  const T = L.filter(t => t.tec === tec), I = indicadores(T), G = indicadores(L);
  const lun = iso(lunesDe(new Date())), sab = iso(sumar(lunesDe(new Date()), 5));
  const semana = T.filter(t => t.f >= lun && t.f <= sab), faltanSem = semana.filter(t => !hecha(t)).length, venc = T.filter(t => estadoT(t) === 'venc').length;
  const dow = new Date().getDay();
  let h = '<div class="fila" style="justify-content:space-between;margin-bottom:14px"><div class="fila"><span class="av" style="width:52px;height:52px;font-size:22px;background:' + colorTec(tec) + '">' + tec[0] + '</span><div><b style="font-size:18px;color:var(--tit)">Hola, ' + esc(titulo(p.n).split(' ')[0]) + '</b><br><span class="mu peq">' + esc(p.puesto || 'Técnico') + ' · nómina ' + S.nom + '</span></div></div>' + selMes() + '</div>';
  ((S.avisos[S.nom] || {}).m || []).forEach((a, i) => { h += '<div class="aviso inf"><span class="i">📣</span><div style="flex:1"><b>Mensaje de ' + esc(titulo(a.de).split(' ').slice(0, 2).join(' ')) + '</b> · ' + fechaHora(a.t) + '<br>' + esc(a.txt) + '</div><button class="bt s" data-enterado="' + i + '">Enterado</button></div>'; });
  if (S.mes === MES_HOY && faltanSem && dow >= 4) h += '<div class="aviso wa"><span class="i">⏰</span><div><b>Te faltan ' + faltanSem + ' preventivo' + (faltanSem > 1 ? 's' : '') + ' de esta semana.</b> Termínalos antes del sábado; el sábado es para faltantes.</div></div>';
  if (venc) h += '<div class="aviso bad"><span class="i">⚠️</span><div><b>' + venc + ' preventivo' + (venc > 1 ? 's' : '') + ' vencido' + (venc > 1 ? 's' : '') + '.</b> La fecha programada no cambia; hazlos lo antes posible.</div></div>';
  h += '<div class="caja"><h2>⭐ Mi calificación al día <span class="r">' + nomMes(S.mes) + '</span></h2><div class="anillos">' + anillo(I.cumpl, '#1F6FD1', 'Cumplimiento', I.hechas + ' de ' + I.n + ' terminados') + anillo(I.calidad, '#1E8E5A', 'Calidad del trabajo', I.cals + ' calificados') + anillo(I.calif, '#E07B00', 'Mi calificación', 'promedio de los dos') + '</div>' +
    '<div class="fila" style="margin-top:12px;justify-content:space-between"><span class="peq mu">Avance general del mes: <b>' + G.hechas + ' de ' + G.n + '</b> (' + G.avance + ' %)</span><button class="bt s" data-plangen="1">🗓️ Ver plan general del mes</button></div></div>';
  const sems = {}; T.forEach(t => { const l = iso(lunesDe(deIso(t.f))); (sems[l] = sems[l] || []).push(t); });
  h += '<div class="caja"><h2>🧰 Mis órdenes asignadas <span class="r">' + T.length + '</span></h2>';
  if (!T.length) h += '<div class="vacio"><span class="i">📭</span>No tienes preventivos asignados este mes.</div>';
  Object.keys(sems).sort().forEach(l => {
    const A = sems[l].sort((a, b) => (hecha(a) - hecha(b)) || a.f.localeCompare(b.f)), II = indicadores(A);
    h += '<div class="semana">Semana del ' + fCorta(l) + (l === lun ? ' <span class="chip acc">ESTA SEMANA</span>' : '') + ' <span class="chip ' + notaCls(II.avance) + '">' + II.hechas + '/' + II.n + '</span></div>' + A.map(t => filaOrden(t, false)).join('');
  });
  $('#app').innerHTML = h + '</div>'; animar();
}
document.addEventListener('click', async e => {
  const g = e.target.closest('[data-plangen]'); if (g) { S.verPlanGeneral = g.dataset.plangen === '1'; return render(); }
  const en = e.target.closest('[data-enterado]'); if (en) { const m = ((S.avisos[S.nom] || {}).m || []).slice(); m.splice(Number(en.dataset.enterado), 1); await DB.doc('avisos/' + S.nom).set({ m }); }
});

// ============================================================ PANTALLA 3 · HOJAS (biblioteca y llenado)
function vHojas() {
  if (S.hoja) return vLlenar();
  const F = formatos(), cats = Object.keys(CAT).filter(c => F.some(f => f.cat === c));
  let h = '<div class="caja"><h2>📋 Hojas de instrucciones por categoría <span class="r">' + F.length + ' hojas digitalizadas</span></h2><div class="cats">' + cats.map(c => '<button class="cat" data-hcat="' + c + '" aria-pressed="' + (S.hojaCat === c) + '">' + dibujo({ cat: c, eq: '' }) + '<b>' + c + '</b><span>' + esc(CAT[c][0]) + ' · ' + F.filter(f => f.cat === c).length + ' hoja(s)</span></button>').join('') + '</div></div>';
  if (S.hojaCat) {
    h += '<div class="caja"><h2>' + esc(CAT[S.hojaCat][0]) + '</h2><div class="fmts">' + F.filter(f => f.cat === S.hojaCat).map(f => '<button class="fmt" data-vfmt="' + esc(f.id) + '"><div class="dib">' + dibujo({ cat: f.cat, eq: f.id + ' ' + f.tipo }) + '</div><div><b>' + esc(titulo(f.id.replace(/^[A-Z]+-/, ''))) + '</b><span>' + esc(Object.keys(f.frec).filter(k => (f.frec[k] || []).some(s => s.items.length)).map(k => FR[k] || k).join(' · ')) + '</span></div></button>').join('') + '</div></div>';
  }
  $('#app').innerHTML = h;
}
document.addEventListener('click', e => {
  const c = e.target.closest('[data-hcat]'); if (c) { S.hojaCat = S.hojaCat === c.dataset.hcat ? '' : c.dataset.hcat; return render(); }
  const f = e.target.closest('[data-vfmt]'); if (f) return verFormato(f.dataset.vfmt);
  const a = e.target.closest('[data-abrir]'); if (a) { const t = buscarTarea(a.dataset.abrir); if (t) { S.hoja = t.k; S.hojaT = t; S.pant = 3; scrollTo(0, 0); render(); } }
});
const buscarTarea = k => { for (const m of mesesPlan()) { const t = tareasMes(m).find(x => x.k === k); if (t) return t; } return null; };
document.addEventListener('click', e => {
  if (e.target.closest('[data-cerrar]') || e.target.id === 'modal') { $('#modal').classList.remove('on'); return; }
  const v = e.target.closest('[data-vfr]'); if (v) { const [id, fr] = v.dataset.vfr.split('|'); return verFormato(id, fr); }
  const p = e.target.closest('[data-pdfblanco]'); if (p) { const [id, fr] = p.dataset.pdfblanco.split('|'); $('#modal').classList.remove('on'); return abrirVista(null, fmtPorId(id), fr); }
  const ed = e.target.closest('[data-editfmt]'); if (ed) { const [id, fr] = ed.dataset.editfmt.split('|'); window._ed = null; return editarFormato(id, fr); }
});

// ---------- llenado de la hoja (tableta) · mismo acomodo que el Excel original
// Reglas: BIEN → conservación NO · MAL → conservación SÍ (se aplica la contramedida del Excel) + foto ·
// N/A → escribir por qué no aplica (Jasso decide si se retira la pregunta) · limpiezas, mediciones y cambios de refacción → foto obligatoria.
// Las fotos se toman en el momento con la cámara de la tableta (se rechazan fotos viejas de la galería) y llevan fecha, hora y equipo impresos.
let relojT = null;
const itemId = it => it.k || ('r' + it.r);
const pideFotoLimpieza = it => /\blimpi(ar|eza|ando)\b/i.test(it.v || '');   // limpieza de máquina y limpieza general
const TIPOS_HALL = ['Se cambió refacción', 'Modificación', 'Encontrado dañado', 'Requiere material', 'Requiere servicio externo'];
const hallPideFoto = x => /cambi|modific/i.test(x.t || '');
function faltantesItem(it, x) {
  const f = [];
  if (it.med) { const n = (it.campos || []).length + (it.campos2 || []).length, v = (x.v || []).filter(s => String(s || '').trim()).length; if (v < n) f.push('faltan lecturas'); if (!(x.fotos || []).length) f.push('falta la foto de la lectura'); return f; }
  if (!x.e) { f.push('sin contestar'); return f; }
  if (x.e === 'NA' && !String(x.why || '').trim()) f.push('escribe por qué no aplica');
  if ((x.e === 'B' || x.e === 'M') && !x.c) f.push('marca SI o NO en la conservación');
  if (x.e === 'M' && x.c === 'N') f.push('salió MAL: realiza la contramedida y marca SI');
  if (x.e === 'B' && x.c === 'S') f.push('salió BIEN: la conservación va en NO');
  if (x.e === 'M' && !(x.fotos || []).length) f.push('falta la foto de la contramedida');
  if (x.e === 'B' && pideFotoLimpieza(it) && !(x.fotos || []).length) f.push('falta la foto de la limpieza');
  return f;
}
function faltantesHoja(t) {
  const o = S.ords[t.k] || {}, { secs } = seccionesDe(fmtDe(t), t.fr), r = o.resp || {}, L = [];
  secs.forEach(s => s.items.forEach(it => { const f = faltantesItem(it, r[itemId(it)] || {}); if (f.length) L.push('#' + it.n + ' ' + (it.v || it.l || '').slice(0, 50) + ': ' + f.join(', ')); }));
  (o.hall || []).forEach((x, i) => { if (!String(x.d || '').trim()) L.push('Hallazgo ' + (i + 1) + ': falta la descripción'); if (hallPideFoto(x) && !(x.fotos || []).length) L.push('Hallazgo ' + (i + 1) + ' (' + x.t + '): falta la foto'); });
  if (!(o.fotos || []).length && !secs.some(s => s.items.some(it => ((r[itemId(it)] || {}).fotos || []).length))) L.push('Agrega al menos una foto de evidencia del equipo');
  return L;
}
const tiraFotos = (ids, dis, destino) => '<div class="fotos">' + (ids || []).map(id => '<div class="f" style="background-image:url(\'' + fotoSrc(id) + '\')" data-verfoto="' + id + '">' + (dis ? '' : '<button data-delfoto="' + destino + '|' + id + '">✕</button>') + '</div>').join('') + (dis ? '' : '<label class="add">📷<br>Tomar foto<input type="file" accept="image/*" capture="environment" data-foto="' + destino + '" hidden></label>') + '</div>';
function vLlenar() {
  const t = S.hojaT, o = S.ords[t.k] || {}, fmt = fmtDe(t), { fr, secs, aprox } = seccionesDe(fmt, t.fr);
  const mio = t.tec === tecDe(S.nom), editable = mio && !['terminada', 'calificada'].includes(o.estado) && o.cal == null && !((t.ej || 0) > 0);
  const resp = o.resp || {}, dis = editable && o.ini ? '' : ' disabled', alertas = alertasEq(t);
  let h = '<div class="fila" style="margin-bottom:12px;justify-content:space-between"><button class="bt" data-volver>‹ Regresar</button><div class="fila">' + (o.estado ? '<span class="chip ' + EST[estadoT(t)][1] + '">' + EST[estadoT(t)][0] + '</span>' : '') + (calDe(t) != null ? '<span class="nota ' + notaCls(calDe(t)) + '">Calificación ' + calDe(t) + '</span>' : '') + '<button class="bt s" data-pdforden="' + t.k + '">⬇️ PDF</button></div></div>';
  // encabezado como el Excel
  h += '<div class="caja xlcab"><div class="xltit"><div><b>BITÁCORA DE MANTENIMIENTO PREVENTIVO</b><span>' + esc(fmt ? fmt.tipo : t.eq) + '</span></div><div class="xllogo">LÍNEA ITALIA</div></div>' +
    '<table class="xlh"><tr><td><small>NOMBRE DEL TÉCNICO</small>' + esc(nombreTec(t.tec)) + '</td><td><small>FRECUENCIA</small>' + esc((FR[fr] || fr).toUpperCase()) + (aprox ? ' <span class="chip wa">plan: ' + esc(FR[t.fr] || t.fr) + '</span>' : '') + '</td><td><small>No. ORDEN DE TRABAJO</small>' + esc(t.ot || '—') + '</td></tr>' +
    '<tr><td><small>FECHA PROGRAMADA</small>' + fLarga(t.f) + '</td><td><small>HORA DE INICIO</small>' + (o.ini ? fechaHora(o.ini) : '—') + '</td><td><small>HORA DE TERMINACIÓN</small>' + (o.fin ? fechaHora(o.fin) : (o.ini ? '<span class="reloj" id="reloj">—</span>' : '—')) + '</td></tr>' +
    '<tr><td colspan="2"><small>EQUIPO</small><span class="fila" style="gap:8px"><span style="width:54px;height:44px;display:inline-grid;place-items:center">' + dibujo(t) + '</span><b>' + esc(t.eq) + '</b></span></td><td><small>CATEGORÍA</small>' + esc((CAT[t.cat] || [t.cat])[0]) + '</td></tr></table>' +
    '<div class="loto">🦺 <b>ANTES DE INICIAR: BLOQUEO Y ETIQUETADO (LOTO)</b> de energía eléctrica, aire y partes en movimiento; EPP completo.</div>' +
    (alertas.length ? '<div class="fila" style="margin-top:8px">' + alertas.map(a => '<span class="chip ' + a.cls + '">' + esc(a.txt) + '</span>').join('') + '</div>' : '') +
    (editable && !o.ini ? '<div class="aviso inf" style="margin:12px 0 0"><span class="i">▶️</span><div style="flex:1"><b>Toca "Iniciar" cuando empieces.</b> Se guarda la hora de inicio y el tiempo real.</div><button class="bt p" data-iniciar>▶ Iniciar</button></div>' : '') + '</div>';
  if (!fmt) h += '<div class="aviso bad"><span class="i">⚠️</span><div>Este equipo no tiene hoja de instrucciones asignada. El jefe la asigna en Configuración → Hojas por equipo.</div></div>';
  h += '<div class="caja" style="padding:10px"><div class="scroll"><table class="xls"><tr class="h"><th style="width:34px">#</th><th>ACTIVIDADES DE VERIFICACIÓN</th><th class="o">BIEN</th><th class="o">MAL</th><th class="o">NA</th><th>ACTIVIDADES DE CONSERVACIÓN<br><small>(contramedida)</small></th><th class="o">SI</th><th class="o">NO</th></tr>';
  secs.forEach(s => {
    h += '<tr class="s"><td colspan="8">' + esc(s.t) + '</td></tr>';
    s.items.forEach(it => {
      const id = itemId(it), x = resp[id] || {}, fal = (editable && o.ini) ? faltantesItem(it, x) : [];
      if (it.med) {
        const g1 = it.campos || [], g2 = it.campos2 || [];
        const inp = (lbl, ci) => '<label class="mi">' + esc(lbl) + '<input class="in" inputmode="decimal" data-med="' + id + '|' + ci + '" value="' + esc((x.v || [])[ci] || '') + '"' + dis + '></label>';
        h += '<tr class="i md"><td class="n">' + it.n + '</td><td colspan="7"><div class="medf"><div><b>' + esc(it.l) + '</b>' + g1.map((c, ci) => inp(c, ci)).join('') + '</div>' + (g2.length ? '<div><b>' + esc(it.l2 || '') + '</b>' + g2.map((c, ci) => inp(c, g1.length + ci)).join('') + '</div>' : '') + '</div><div class="xreq">📷 Foto del instrumento con la lectura (obligatoria)</div>' + tiraFotos(x.fotos, dis, 'i:' + id) + (fal.length ? '<div class="xfal">' + fal.join(' · ') + '</div>' : '') + '</td></tr>';
        return;
      }
      const sel = v => x.e === v ? ' on' : '', cs = x.c || '', puedeC = !dis && (x.e === 'B' || x.e === 'M');
      h += '<tr class="i' + (x.e ? ' r' + x.e : '') + '"><td class="n">' + it.n + '</td><td class="v">' + esc(it.v) + (pideFotoLimpieza(it) ? ' <span class="chip acc">📷 foto</span>' : '') + '</td>' +
        ['B', 'M', 'NA'].map(v => '<td class="o op ' + v + sel(v) + '"><button type="button" data-r="' + id + '|' + v + '"' + dis + '>' + (v === 'B' ? 'B' : v === 'M' ? 'M' : 'NA') + '</button></td>').join('') +
        '<td class="c' + (x.e === 'M' ? ' aplica' : '') + '">' + esc(it.c || '') + '</td>' + ['S', 'N'].map(c => '<td class="o op sn ' + c + (cs === c ? ' on' : '') + '"><button type="button" data-c="' + id + '|' + c + '"' + (puedeC ? '' : ' disabled') + '>' + (c === 'S' ? 'SI' : 'NO') + '</button></td>').join('') + '</tr>';
      if (x.e === 'M' || x.e === 'NA' || (x.e === 'B' && pideFotoLimpieza(it)) || (x.fotos || []).length) {
        h += '<tr class="x"><td></td><td colspan="7">' + (x.e === 'M' ? '<div class="xreq bad">✖ Salió MAL → realiza la contramedida: <b>' + esc(it.c || 'anotar qué se hizo') + '</b>. Cuando la hayas hecho marca <b>SI</b> y toma la foto de cómo quedó.</div>' : '') +
          (x.e === 'NA' ? '<label class="l">¿Por qué no aplica? (el supervisor decide si se retira la pregunta de la hoja)</label><input class="in" data-why="' + id + '" value="' + esc(x.why || '') + '"' + dis + ' placeholder="Ej. el equipo no tiene esta parte">' + (x.rev ? '<div class="peq mu">Supervisor: ' + (x.rev === 'retirada' ? 'pregunta retirada de la hoja' : 'la pregunta se mantiene') + '</div>' : '') : '') +
          (x.e !== 'NA' ? (x.e === 'B' && pideFotoLimpieza(it) ? '<div class="xreq">📷 Foto de la limpieza (obligatoria)</div>' : '') + tiraFotos(x.fotos, dis, 'i:' + id) : '') + (fal.length ? '<div class="xfal">' + fal.join(' · ') + '</div>' : '') + '</td></tr>';
      }
    });
  });
  h += '<tr class="s"><td colspan="8">ACTIVIDADES ADICIONALES</td></tr>' + (o.adic || []).map((a, i) => '<tr class="i"><td class="n">+' + (i + 1) + '</td><td colspan="7"><input class="in" data-adic="' + i + '" value="' + esc(a.v) + '" placeholder="Qué se hizo"' + dis + '></td></tr>').join('') + (dis ? '' : '<tr><td></td><td colspan="7"><button class="bt s" data-addadic>＋ Agregar actividad</button></td></tr>');
  h += '</table></div><p class="peq mu" style="margin:8px 4px 0">BIEN → conservación NO · MAL → realiza la contramedida y marca SI, con foto · NA → escribe por qué. El técnico marca SI o NO según lo que realmente hizo.</p></div>';
  // servicios a resolver (hallazgos, cambios de refacción y modificaciones)
  h += '<div class="caja"><h2>🔧 Servicios a resolver · cambios de refacción · modificaciones</h2><p class="peq mu" style="margin:-6px 0 10px">Si cambiaste una refacción o hiciste una modificación, la foto es obligatoria.</p>' + (o.hall || []).map((x, i) => '<div class="hall"><div class="fila"><select class="in" style="width:200px" data-hall="' + i + '|t"' + dis + '>' + TIPOS_HALL.map(v => '<option' + (x.t === v ? ' selected' : '') + '>' + v + '</option>').join('') + '</select><input class="in" style="flex:2;min-width:180px" data-hall="' + i + '|d" value="' + esc(x.d) + '" placeholder="Descripción de la falla o del trabajo"' + dis + '>' + (dis ? '' : '<button class="bt s" data-delhall="' + i + '">🗑</button>') + '</div><div class="fila" style="margin-top:6px"><input class="in" style="flex:2;min-width:160px" data-hall="' + i + '|ref" value="' + esc(x.ref || '') + '" placeholder="Refacción / material (código o nombre)"' + dis + '><input class="in" style="width:90px" data-hall="' + i + '|q" value="' + esc(x.q || '') + '" placeholder="Cant." inputmode="decimal"' + dis + '><input class="in" style="width:120px" data-hall="' + i + '|costo" value="' + esc(x.costo || '') + '" placeholder="Costo unit. $" inputmode="decimal"' + dis + '></div>' + (hallPideFoto(x) || (x.fotos || []).length ? '<div class="xreq" style="margin-top:6px">📷 Foto ' + (hallPideFoto(x) ? '(obligatoria)' : '') + '</div>' + tiraFotos(x.fotos, dis, 'h:' + i) : '') + '</div>').join('') + (dis ? ((o.hall || []).length ? '' : '<p class="mu peq">Sin hallazgos.</p>') : '<button class="bt s" data-addhall>＋ Agregar servicio / cambio</button>') + '</div>';
  h += '<div class="caja"><h2>📷 Evidencia general del equipo</h2>' + tiraFotos(o.fotos, dis, 'g') + (!dis || o.obs ? '<label class="l" style="margin-top:12px">Observaciones</label><textarea class="in" id="obs"' + dis + '>' + esc(o.obs || '') + '</textarea>' : '') + '</div>';
  if (editable && o.ini) h += '<div class="caja"><div class="fila" style="justify-content:space-between"><span class="peq" id="faltan"></span><button class="bt ok" data-terminar style="min-height:52px;font-size:16px">✅ Terminar preventivo</button></div></div>';
  if (o.cal != null || o.calNota) h += '<div class="caja"><h2>⭐ Calificación del supervisor</h2><p><span class="nota ' + notaCls(o.cal) + '">' + o.cal + '</span> por ' + esc(titulo(o.calN || '')) + ' · ' + fechaHora(o.calT) + (o.calNota ? '<br>' + esc(o.calNota) : '') + '</p></div>';
  else if (o.estado === 'terminada' && califica()) h += '<div class="caja"><h2>⭐ Calificar este preventivo</h2><p class="peq mu">Revisa que las fotos correspondan a la lectura y a la fecha.</p><div class="cal"><button class="c0" data-cal="' + t.k + '|0">0</button><button class="c50" data-cal="' + t.k + '|50">50</button><button class="c100" data-cal="' + t.k + '|100">100</button></div></div>';
  $('#app').innerHTML = h;
  if (editable && o.ini) { contarFaltan(); clearInterval(relojT); relojT = setInterval(() => { const r = $('#reloj'); if (!r) return clearInterval(relojT); const m = Math.floor((Date.now() - new Date(o.ini)) / 60000); r.textContent = 'en curso · ' + Math.floor(m / 60) + ' h ' + (m % 60) + ' min'; }, 1000); }
}
function contarFaltan() { const L = faltantesHoja(S.hojaT), el = $('#faltan'); if (el) { el.textContent = L.length ? '⚠️ Faltan ' + L.length + ' cosa(s) para poder terminar' : '✅ Todo listo para terminar'; el.style.color = L.length ? 'var(--bad)' : 'var(--ok)'; } return L; }
async function guardarOrden(cambio) {
  const t = S.hojaT, o = S.ords[t.k] || {};
  const base = o.k ? {} : { k: t.k, mes: t.mes, eq: t.eq, no: t.no, fr: t.fr, cat: t.cat, tec: t.tec, f: t.f, ot: t.ot || '' };
  const d = Object.assign(base, cambio, { mod: new Date().toISOString() });
  const local = JSON.parse(JSON.stringify(o)); Object.keys(d).forEach(k => { const v = d[k]; local[k] = (v && typeof v === 'object' && !Array.isArray(v) && local[k] && typeof local[k] === 'object') ? Object.assign({}, local[k], v) : v; });
  S.ords[t.k] = local; // vista inmediata (las respuestas se mezclan, no se reemplazan)
  await upd('ordenes/' + t.k, d);
}
const respDe = id => Object.assign({}, ((S.ords[S.hojaT.k] || {}).resp || {})[id]);
// foto en el momento: rechaza fotos viejas de la galería e imprime fecha, hora, equipo y técnico
async function fotoMomento(file) {
  if (Date.now() - file.lastModified > 10 * 60 * 1000) throw new Error('La foto debe tomarse en este momento con la cámara de la tableta (no de la galería).');
  const url = URL.createObjectURL(file), img = await new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = url; });
  const lado = 1000, sc = Math.min(1, lado / Math.max(img.width, img.height)), cv = document.createElement('canvas'); cv.width = Math.round(img.width * sc); cv.height = Math.round(img.height * sc);
  const g = cv.getContext('2d'); g.drawImage(img, 0, 0, cv.width, cv.height); URL.revokeObjectURL(url);
  const txt = new Date().toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) + ' · ' + S.hojaT.eq + ' · ' + titulo(yoP().n).split(' ').slice(0, 2).join(' '), fs = Math.max(14, Math.round(cv.width / 42));
  g.fillStyle = 'rgba(11,31,53,.78)'; g.fillRect(0, cv.height - fs * 1.9, cv.width, fs * 1.9); g.fillStyle = '#fff'; g.font = 'bold ' + fs + 'px Segoe UI, Arial'; g.fillText('LI · ' + txt, fs * 0.6, cv.height - fs * 0.6);
  return new Promise(ok => cv.toBlob(ok, 'image/jpeg', 0.8));
}
async function agregarFotoA(destino, ids) {
  const o = S.ords[S.hojaT.k] || {};
  if (destino === 'g') return guardarOrden({ fotos: (o.fotos || []).concat(ids) });
  if (destino.startsWith('i:')) { const id = destino.slice(2), x = respDe(id); x.fotos = (x.fotos || []).concat(ids); return guardarOrden({ resp: { [id]: x } }); }
  if (destino.startsWith('h:')) { const i = Number(destino.slice(2)), L = (o.hall || []).map(z => Object.assign({}, z)); L[i].fotos = (L[i].fotos || []).concat(ids); return guardarOrden({ hall: L }); }
}
async function quitarFotoDe(destino, id) {
  const o = S.ords[S.hojaT.k] || {};
  if (destino === 'g') return guardarOrden({ fotos: (o.fotos || []).filter(x => x !== id) });
  if (destino.startsWith('i:')) { const k = destino.slice(2), x = respDe(k); x.fotos = (x.fotos || []).filter(z => z !== id); return guardarOrden({ resp: { [k]: x } }); }
  if (destino.startsWith('h:')) { const i = Number(destino.slice(2)), L = (o.hall || []).map(z => Object.assign({}, z)); L[i].fotos = (L[i].fotos || []).filter(z => z !== id); return guardarOrden({ hall: L }); }
}
document.addEventListener('click', async e => {
  if (!S.hoja || S.pant !== 3) return;
  if (e.target.closest('[data-volver]')) { S.hoja = null; S.pant = puede(2) ? 2 : 1; clearInterval(relojT); return render(); }
  if (e.target.closest('[data-iniciar]')) { await guardarOrden({ estado: 'proceso', ini: new Date().toISOString(), por: S.nom, fmt: (fmtDe(S.hojaT) || {}).id || '' }); return render(); }
  const cb = e.target.closest('[data-c]'); if (cb && !cb.disabled) { const [id, v] = cb.dataset.c.split('|'), x = respDe(id); x.c = v; await guardarOrden({ resp: { [id]: x } }); const y = scrollY; render(); scrollTo(0, y); return; }
  const r = e.target.closest('[data-r]'); if (r && !r.disabled) { const [id, v] = r.dataset.r.split('|'), x = respDe(id); if (x.e !== v) x.c = ''; x.e = v; /* la conservación la marca el técnico (no se llena sola) */ await guardarOrden({ resp: { [id]: x } }); const y = scrollY; render(); scrollTo(0, y); return; }
  if (e.target.closest('[data-addadic]')) { const o = S.ords[S.hojaT.k] || {}; await guardarOrden({ adic: (o.adic || []).concat([{ v: '' }]) }); return render(); }
  if (e.target.closest('[data-addhall]')) { const o = S.ords[S.hojaT.k] || {}; await guardarOrden({ hall: (o.hall || []).concat([{ t: TIPOS_HALL[0], d: '', ref: '', q: '', costo: '' }]) }); const y = scrollY; render(); scrollTo(0, y); return; }
  const dh = e.target.closest('[data-delhall]'); if (dh) { const o = S.ords[S.hojaT.k] || {}; const L = (o.hall || []).slice(); L.splice(Number(dh.dataset.delhall), 1); await guardarOrden({ hall: L }); return render(); }
  const df = e.target.closest('[data-delfoto]'); if (df) { e.stopPropagation(); const s = df.dataset.delfoto, i = s.lastIndexOf('|'); await quitarFotoDe(s.slice(0, i), s.slice(i + 1)); const y = scrollY; render(); scrollTo(0, y); return; }
  const vf = e.target.closest('[data-verfoto]'); if (vf) { const src = await fotoData(vf.dataset.verfoto); $('#hoja').innerHTML = '<div class="fila" style="justify-content:flex-end"><button class="bt s" data-cerrar>✕</button></div><img src="' + src + '" style="width:100%;border-radius:12px">'; $('#modal').classList.add('on'); return; }
  if (e.target.closest('[data-terminar]')) {
    const L = contarFaltan();
    if (L.length) { $('#hoja').innerHTML = '<div class="fila" style="justify-content:space-between"><h2 style="margin:0;color:var(--bad)">⚠️ Todavía no se puede terminar</h2><button class="bt s" data-cerrar>✕</button></div><ul style="line-height:1.6">' + L.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul><button class="bt p" data-cerrar style="width:100%">Entendido</button>'; $('#modal').classList.add('on'); return; }
    const o = S.ords[S.hojaT.k] || {}, fin = new Date(), min = Math.max(1, Math.round((fin - new Date(o.ini)) / 60000));
    const ajuste = prompt('Tiempo real del mantenimiento en minutos (puedes corregirlo):', String(min)); if (ajuste === null) return;
    const firmaT = await pedirFirma('Firma del técnico', yoP().n); if (!firmaT) return toast('Sin firma no se puede terminar la orden.');
    await guardarOrden({ estado: 'terminada', fin: fin.toISOString(), min: Math.max(1, Number(ajuste) || min), firmaN: yoP().n, firmaT, firmaTT: new Date().toISOString() });
    toast('¡Preventivo terminado! El supervisor lo va a calificar.'); S.hoja = null; S.pant = 2; return render();
  }
  const po = e.target.closest('[data-pdforden]'); if (po) { const t = buscarTarea(po.dataset.pdforden); return abrirVista(t, fmtDe(t), seccionesDe(fmtDe(t), t.fr).fr); }
});
document.addEventListener('change', async e => {
  if (!S.hoja) return;
  const m = e.target.closest('[data-med]'); if (m) { const [id, ci] = m.dataset.med.split('|'), x = respDe(id), v = (x.v || []).slice(); v[Number(ci)] = m.value; x.v = v; await guardarOrden({ resp: { [id]: x } }); return contarFaltan(); }
  const w = e.target.closest('[data-why]'); if (w) { const id = w.dataset.why, x = respDe(id); x.why = w.value.trim(); await guardarOrden({ resp: { [id]: x } }); return contarFaltan(); }
  const a = e.target.closest('[data-adic]'); if (a) { const o = S.ords[S.hojaT.k] || {}; const L = (o.adic || []).slice(); L[Number(a.dataset.adic)] = { v: a.value }; return guardarOrden({ adic: L }); }
  const hl = e.target.closest('[data-hall]'); if (hl) { const [i, c] = hl.dataset.hall.split('|'); const o = S.ords[S.hojaT.k] || {}; const L = (o.hall || []).map(x => Object.assign({}, x)); L[Number(i)][c] = hl.value; await guardarOrden({ hall: L }); if (c === 't') { const y = scrollY; render(); scrollTo(0, y); } return contarFaltan(); }
  if (e.target.id === 'obs') return guardarOrden({ obs: e.target.value });
  const fi = e.target.closest('[data-foto]');
  if (fi) {
    const files = [...fi.files]; if (!files.length) return;
    const ids = [];
    for (const f of files) { try { const b = await fotoMomento(f); const r = await ASSETS.upload(b); cacheFoto[r.id] = r.url; ids.push(r.id); } catch (x) { toast(x.message || 'No se pudo subir la foto.'); } }
    if (ids.length) { await agregarFotoA(fi.dataset.foto, ids); const y = scrollY; render(); scrollTo(0, y); }
  }
});
// alertas por máquina: refacciones con cambio próximo (según compras/cambios) y cambio de aceite de montacargas
function alertasEq(t) {
  const A = [], n = norm(t.eq).split(/[\s·]+/).filter(w => w.length > 3 && !/^\d+$/.test(w));
  (window.PM_REFAC || []).forEach(x => { const en = norm(x.eq); if (!n.some(w => en.includes(w))) return; const ed = (S.param.refac || {})[x.k] || {}, hist = ed.hist || [], ult = (hist.length ? hist[hist.length - 1].f : '') || ed.real || x.real || x.ult; if (!ult || !x.dias) return; const rest = diasEntre(HOY, iso(sumar(deIso(ult), x.dias))); if (rest <= 30) A.push({ txt: '🧩 ' + x.n.split('(')[0].trim() + (rest < 0 ? ': cambio vencido' : ': cambio en ' + rest + ' días'), cls: rest < 0 ? 'bad' : 'wa' }); });
  if (/montacargas/i.test(t.eq)) { const x = (S.param.horometros || {})[t.eq.replace(/[\/.#$\[\]]/g, '_')] || {}, ls = x.lect || [], u = ls[ls.length - 1]; if (u) { const falt = (Number(x.serv) || 0) + 250 - u.h; if (falt <= 25) A.push({ txt: '🛢️ Aceite y filtro ' + (falt <= 0 ? 'vencido (' + (-falt) + ' h pasado)' : 'en ' + falt + ' h'), cls: falt <= 0 ? 'bad' : 'wa' }); } else A.push({ txt: '⏲️ Captura la lectura del horómetro', cls: 'acc' }); }
  return A;
}

// ============================================================ PDF de la hoja (vacía para imprimir o llenada con evidencia) · mismo acomodo que el Excel
async function pdfHoja(t, fmt, fr, soloBlob) {
  if (!window.jspdf) return toast('No se cargó el generador de PDF.');
  const { jsPDF } = window.jspdf, d = new jsPDF({ unit: 'mm', format: 'letter' }), W = 216, M = 10, AZ = [14, 42, 71];
  const o = t ? (S.ords[t.k] || {}) : {}, secs = fmt ? (fmt.frec[fr] || []) : [], r = o.resp || {};
  d.setDrawColor(150); d.setLineWidth(0.3);
  d.setFont('helvetica', 'bold'); d.setFontSize(12); d.text('BITÁCORA DE MANTENIMIENTO PREVENTIVO', M, 15); d.setFontSize(11); d.setTextColor(...AZ); d.text('LÍNEA ITALIA', W - M, 15, { align: 'right' }); d.setTextColor(23, 33, 46);
  d.autoTable({ startY: 18, margin: { left: M, right: M }, theme: 'grid', styles: { fontSize: 7.8, cellPadding: 1.4, lineColor: [150, 150, 150] }, body: [
    ['NOMBRE DEL TÉCNICO:', t ? nombreTec(t.tec) : '', 'FRECUENCIA:', (FR[fr] || fr || '').toUpperCase()],
    ['CATEGORÍA:', fmt ? fmt.tipo : '', 'PLANTA:', 'LÍNEA ITALIA'],
    ['FECHA PROGRAMADA:', t ? fLarga(t.f) : '', 'No. ORDEN DE TRABAJO:', t ? (t.ot || '') : ''],
    ['HORA DE INICIO:', o.ini ? fechaHora(o.ini) : '', 'HORA DE TERMINACIÓN:', o.fin ? fechaHora(o.fin) : ''],
    ['EQUIPO:', t ? t.eq : (fmt ? fmt.aplica : ''), 'TIEMPO REAL / CALIF.:', (o.min ? o.min + ' min' : '') + (o.cal != null ? ' · ' + o.cal : '')]
  ], columnStyles: { 0: { fontStyle: 'bold', cellWidth: 36 }, 2: { fontStyle: 'bold', cellWidth: 40 } } });
  let y = d.lastAutoTable.finalY + 1;
  d.setFillColor(255, 244, 214); d.rect(M, y, W - 2 * M, 6, 'FD'); d.setFontSize(7.8); d.setFont('helvetica', 'bold'); d.text('ANTES DE INICIAR: BLOQUEO Y ETIQUETADO (LOTO)', M + 2, y + 4.1); y += 7;
  const X = (on) => on ? 'X' : '';
  const body = [];
  secs.forEach(s => {
    body.push([{ content: s.t, colSpan: 8, styles: { fillColor: AZ, textColor: 255, fontStyle: 'bold' } }]);
    s.items.forEach(it => {
      const x = r[itemId(it)] || {};
      if (it.med) { const g1 = it.campos || [], g2 = it.campos2 || []; body.push([it.n, { content: it.l + ':  ' + g1.map((c, ci) => c + ' ' + ((x.v || [])[ci] || '_____')).join('   ') + (g2.length ? '      |  ' + (it.l2 || '') + ':  ' + g2.map((c, ci) => c + ' ' + ((x.v || [])[g1.length + ci] || '_____')).join('   ') : ''), colSpan: 7 }]); return; }
      body.push([it.n, it.v, X(x.e === 'B'), X(x.e === 'M'), X(x.e === 'NA'), (it.c || '') + (x.e === 'NA' && x.why ? '\nN/A: ' + x.why : ''), X(x.c === 'S'), X(x.c === 'N')]);
    });
  });
  body.push([{ content: 'ACTIVIDADES ADICIONALES', colSpan: 8, styles: { fillColor: AZ, textColor: 255, fontStyle: 'bold' } }]);
  const adic = (o.adic || []).filter(a => a.v); (adic.length ? adic : (t ? [] : [{ v: '' }, { v: '' }, { v: '' }])).forEach((a, i) => body.push(['+' + (i + 1), { content: a.v, colSpan: 7, styles: { minCellHeight: t ? 0 : 6 } }]));
  d.autoTable({ startY: y, margin: { left: M, right: M }, theme: 'grid', head: [['#', 'ACTIVIDADES DE VERIFICACIÓN', 'BIEN', 'MAL', 'NA', 'ACTIVIDADES DE CONSERVACIÓN', 'SI', 'NO']], body,
    styles: { fontSize: 7.2, cellPadding: 1.2, valign: 'middle', lineColor: [150, 150, 150] }, headStyles: { fillColor: [220, 228, 238], textColor: [23, 33, 46], fontStyle: 'bold', halign: 'center' },
    columnStyles: { 0: { cellWidth: 7, halign: 'center' }, 1: { cellWidth: 76 }, 2: { cellWidth: 9, halign: 'center', fontStyle: 'bold' }, 3: { cellWidth: 9, halign: 'center', fontStyle: 'bold' }, 4: { cellWidth: 9, halign: 'center', fontStyle: 'bold' }, 6: { cellWidth: 8, halign: 'center', fontStyle: 'bold' }, 7: { cellWidth: 8, halign: 'center', fontStyle: 'bold' } } });
  y = d.lastAutoTable.finalY + 2;
  const srv = (o.hall || []).map((x, i) => [i + 1, x.t + ': ' + (x.d || '') + (x.ref ? ' · Refacción: ' + x.ref : '') + (x.q ? ' · Cant. ' + x.q : '') + (x.costo ? ' · ' + dinero(x.costo) + ' c/u' : '')]);
  d.autoTable({ startY: y, margin: { left: M, right: M }, theme: 'grid', head: [[{ content: 'SERVICIOS A RESOLVER', colSpan: 2 }], ['REF', 'DESCRIPCIÓN DE LA FALLA Y/O MATERIALES REQUERIDOS']], body: srv.length ? srv : (t ? [['', 'Sin servicios a resolver']] : [['', ''], ['', ''], ['', '']]), styles: { fontSize: 7.4, minCellHeight: t ? 0 : 6, lineColor: [150, 150, 150] }, headStyles: { fillColor: [220, 228, 238], textColor: [23, 33, 46] }, columnStyles: { 0: { cellWidth: 12, halign: 'center' } } });
  y = d.lastAutoTable.finalY + 2;
  if (o.obs) { d.setFont('helvetica', 'normal'); d.setFontSize(7.6); const l = d.splitTextToSize('Observaciones: ' + o.obs, W - 2 * M); d.text(l, M, y + 3); y += l.length * 3.4 + 3; }
  // evidencia fotográfica: de cada pregunta, de los servicios y general
  const fotos = []; secs.forEach(s => s.items.forEach(it => ((r[itemId(it)] || {}).fotos || []).forEach(id => fotos.push([id, '#' + it.n + ' ' + (it.v || it.l || '').slice(0, 40)]))));
  (o.hall || []).forEach((x, i) => (x.fotos || []).forEach(id => fotos.push([id, 'Servicio ' + (i + 1) + ': ' + (x.t || '')])));
  (o.fotos || []).forEach(id => fotos.push([id, 'Evidencia general']));
  if (fotos.length) { d.addPage(); y = 14; d.setFillColor(51, 51, 51); d.rect(M, y, W - 2 * M, 8, 'F'); d.setTextColor(255); d.setFont('helvetica', 'bold'); d.setFontSize(10); d.text('ANEXO 1 · EVIDENCIA FOTOGRÁFICA', W / 2, y + 5.5, { align: 'center' }); d.setTextColor(23, 33, 46); d.setFontSize(8.5); d.setFont('helvetica', 'normal'); if (t) d.text(t.eq + ' · ' + nombreTec(t.tec) + ' · programado ' + fLarga(t.f), M, y + 13); y += 18; }
  let col = 0;
  for (const [id, cap] of fotos) {
    try { const src = await fotoData(id); if (!src) continue; const ip = d.getImageProperties(src), h = 52, w = Math.min(62, ip.width / ip.height * h); if (y + h + 6 > 262) { d.addPage(); y = 14; col = 0; } d.addImage(src, 'JPEG', M + col * 66, y, w, h); d.setFont('helvetica', 'normal'); d.setFontSize(6.5); d.text(d.splitTextToSize(cap, 62)[0], M + col * 66, y + h + 3); col++; if (col === 3) { col = 0; y += h + 7; } } catch (x) {}
  }
  if (col) y += 59;
  if (y > 244) { d.addPage(); y = 20; }
  y = Math.max(y + 8, 250); d.line(M, y, M + 60, y); d.line(M + 68, y, M + 128, y); d.line(M + 136, y, W - M, y); d.setFontSize(7); d.setFont('helvetica', 'normal');
  d.text('NOMBRE Y FIRMA DEL TÉCNICO', M, y + 3.5); d.text('NOMBRE Y FIRMA DE ENCARGADO DE MTTO.', M + 68, y + 3.5); d.text('NOMBRE Y FIRMA DE COORDINADOR DE MTTO.', M + 136, y + 3.5);
  if (o.firmaN) d.text(titulo(o.firmaN), M, y - 1.5); if (o.calN) d.text(titulo(o.calN), M + 68, y - 1.5); if (o.firmaJN) d.text(titulo(o.firmaJN), M + 136, y - 1.5);
  try { if (o.firmaT) d.addImage(o.firmaT, 'PNG', M + 8, y - 17, 44, 14); if (o.firmaS) d.addImage(o.firmaS, 'PNG', M + 76, y - 17, 44, 14); if (o.firmaJ) d.addImage(o.firmaJ, 'PNG', M + 144, y - 17, 44, 14); } catch (e) {}
  const np = d.getNumberOfPages(); for (let i = 1; i <= np; i++) { d.setPage(i); d.setFontSize(6.5); d.setTextColor(120); d.text('Mantenimiento Preventivo LI · ' + (fmt ? fmt.id : '') + ' · Hoja ' + i + ' de ' + np, M, 274); d.setTextColor(23, 33, 46); }
  const nombre = (t ? t.f + ' ' + t.eq + ' ' + (FR[fr] || fr) : (fmt ? fmt.id : 'hoja') + ' ' + (FR[fr] || fr) + ' (en blanco)').replace(/[\\/:*?"<>|·]/g, ' ').replace(/\s+/g, ' ').trim() + '.pdf';
  if (soloBlob) return { blob: d.output('blob'), nombre };
  d.save(nombre);
}

// ============================================================ PANTALLA 4 · PARÁMETROS
function vParam() {
  const subs = [['refac', '🧩 Refacciones (vida por compras)'], ['baleros', '🔩 Baleros'], ['horo', '⏲️ Horómetros montacargas'], ['mat', '💲 Refacciones y costos del mes'], ['hist', '🧾 Historial por máquina']];
  let h = '<div class="seg" style="margin-bottom:14px">' + subs.map(([k, l]) => '<button data-sub4="' + k + '" aria-pressed="' + (S.sub4 === k) + '">' + l + '</button>').join('') + '</div>';
  h += ({ refac: pRefac, baleros: pBaleros, horo: pHoro, mat: pMaterial, hist: pHistorial }[S.sub4])();
  $('#app').innerHTML = h; animar();
}
document.addEventListener('click', e => { const s = e.target.closest('[data-sub4]'); if (s) { S.sub4 = s.dataset.sub4; render(); } });
const diasEntre = (a, b) => Math.round((deIso(b) - deIso(a)) / 864e5);
function semaforo(dias) { return dias == null ? 'gr' : dias < 0 ? 'bad' : dias <= 15 ? 'wa' : 'ok'; }
// encabezado de categoría para las tablas de parámetros
const catFila = (c, cols, extra) => '<tr class="catf"><td colspan="' + cols + '"><span class="chip" style="background:' + ((CAT[c] || [])[1] || '#888') + '22;color:' + ((CAT[c] || [])[1] || '#333') + '">' + esc(c) + '</span> <b>' + esc((CAT[c] || [c || 'Sin categoría'])[0]) + '</b>' + (extra ? ' <span class="peq mu">' + extra + '</span>' : '') + '</td></tr>';
const catDeEq = eq => { const n = norm(eq); for (const L of Object.values(window.PM_PLAN || {})) { const t = L.find(x => norm(x.eq) === n); if (t) return t.cat; } return ''; };
function pRefac() {
  const R = (window.PM_REFAC || []).map(x => { const ed = (S.param.refac || {})[x.k] || {}; const hist = ed.hist || []; const ult = (hist.length ? hist[hist.length - 1].f : '') || ed.real || x.real || x.ult;
    let dias = x.dias; if (hist.length >= 2) { const iv = []; for (let i = 1; i < hist.length; i++) iv.push(diasEntre(hist[i - 1].f, hist[i].f)); dias = Math.round(iv.reduce((s, v) => s + v, 0) / iv.length); }
    const prox = ult && dias ? iso(sumar(deIso(ult), dias)) : ''; return Object.assign({}, x, { ult, dias, prox, rest: prox ? diasEntre(HOY, prox) : null, hist }); });
  const venc = R.filter(x => x.rest != null && x.rest < 0).length, prox = R.filter(x => x.rest != null && x.rest >= 0 && x.rest <= 15).length;
  const cats = [...new Set(R.map(x => x.cat))].sort((a, b) => Object.keys(CAT).indexOf(a) - Object.keys(CAT).indexOf(b));
  return '<div class="kpis" style="grid-template-columns:repeat(4,1fr)"><div class="kpi bad"><b>' + venc + '</b><span>cambio vencido</span></div><div class="kpi wa"><b>' + prox + '</b><span>cambio en ≤ 15 días</span></div><div class="kpi"><b>' + R.length + '</b><span>refacciones vigiladas</span></div><div class="kpi mo"><b>' + dinero(R.reduce((s, x) => s + (x.anual || 0), 0)) + '</b><span>gasto anual estimado</span></div></div>' +
    '<div class="caja"><h2>🧩 Vida de refacciones por categoría <span class="r">según compras y cambios registrados</span></h2><div class="scroll"><table class="tbl"><tr><th></th><th>Refacción</th><th>Equipo</th><th class="n">Cada cuánto</th><th>Último cambio</th><th>Próximo</th><th class="n">Días</th><th class="n">Gasto anual</th><th></th></tr>' +
    cats.map(c => { const A = R.filter(x => x.cat === c).sort((a, b) => (a.rest == null) - (b.rest == null) || (a.rest || 0) - (b.rest || 0)); return catFila(c, 9, A.length + ' refacción(es) · ' + dinero(A.reduce((s, x) => s + (x.anual || 0), 0)) + ' al año') +
      A.map(x => '<tr><td><span class="sem ' + semaforo(x.rest) + '"></span></td><td><b>' + esc(x.n) + '</b>' + (x.hist.length ? '<br><span class="peq mu">' + x.hist.length + ' cambio(s) registrados</span>' : '') + '</td><td>' + esc(x.eq) + '</td><td class="n">' + (x.dias ? x.dias + ' días' : '—') + '</td><td>' + (x.ult ? fCorta(x.ult) : '—') + '</td><td>' + (x.prox ? fCorta(x.prox) : '—') + '</td><td class="n">' + (x.rest == null ? '—' : x.rest < 0 ? '<span class="chip bad">' + x.rest + '</span>' : x.rest) + '</td><td class="n">' + dinero(x.anual) + '</td><td>' + (califica() ? '<button class="bt s" data-cambio="refac|' + x.k + '">Registrar cambio</button>' : '') + '</td></tr>').join(''); }).join('') + '</table></div>' +
    '<p class="peq mu" style="margin:10px 0 0">Con 2 o más cambios registrados, "cada cuánto" se recalcula con los cambios reales. Si sale muy distinto a la frecuencia del preventivo, ajusta la frecuencia en el plan para no cambiar piezas antes de tiempo ni dejarlas fallar.</p></div>';
}
function pBaleros() {
  const B = Object.entries(S.param.baleros || {}).map(([id, b]) => { const dias = b.inst ? diasEntre(b.inst, HOY) : 0, usadas = dias * (Number(b.hDia) || 8) * (6 / 7), vida = Number(b.vidaH) || 0, pct = vida ? Math.min(100, Math.round(usadas / vida * 100)) : 0, rest = vida ? Math.round((vida - usadas) / ((Number(b.hDia) || 8) * 6 / 7)) : null; return Object.assign({ id, pct, rest, prox: rest != null ? iso(sumar(new Date(), rest)) : '', cat: b.cat || catDeEq(b.eq) }, b); });
  const cats = [...new Set(B.map(b => b.cat))].sort((a, b) => Object.keys(CAT).indexOf(a) - Object.keys(CAT).indexOf(b));
  return '<div class="caja"><h2>🔩 Baleros por categoría <span class="r">' + (califica() ? '<button class="bt s p" data-nbal>＋ Agregar balero</button>' : '') + '</span></h2>' + (B.length ? '<div class="scroll"><table class="tbl"><tr><th></th><th>Equipo</th><th>Posición / referencia</th><th class="n">Vida (h)</th><th class="n">h/día</th><th>Instalado</th><th>Vida usada</th><th>Cambio estimado</th><th></th></tr>' +
    cats.map(c => catFila(c, 9, B.filter(b => b.cat === c).length + ' balero(s)') + B.filter(b => b.cat === c).sort((a, b) => b.pct - a.pct).map(b => '<tr><td><span class="sem ' + (b.pct >= 100 ? 'bad' : b.pct >= 85 ? 'wa' : 'ok') + '"></span></td><td><b>' + esc(b.eq) + '</b></td><td>' + esc(b.pos) + (b.ref ? '<br><span class="peq mu">' + esc(b.ref) + '</span>' : '') + '</td><td class="n">' + Number(b.vidaH || 0).toLocaleString('es-MX') + '</td><td class="n">' + (b.hDia || 8) + '</td><td>' + (b.inst ? fCorta(b.inst) : '—') + '</td><td><div class="vida"><i data-w="' + b.pct + '" style="width:0;background:' + (b.pct >= 100 ? '#D32F2F' : b.pct >= 85 ? '#E0A100' : '#1E8E5A') + '"></i></div><span class="peq">' + b.pct + ' %</span></td><td>' + (b.prox ? fCorta(b.prox) + (b.rest < 30 ? ' <span class="chip bad">' + b.rest + ' días</span>' : '') : '—') + '</td><td>' + (califica() ? '<button class="bt s" data-cambio="bal|' + b.id + '">Cambiado</button>' : '') + '</td></tr>').join('')).join('') + '</table></div>' : '<div class="vacio"><span class="i">🔩</span>Todavía no hay baleros registrados. Agrega los de las máquinas tipo A con la vida que indica el proveedor.</div>') +
    '<p class="peq mu" style="margin:10px 0 0">Vida usada = días desde la instalación × horas de trabajo al día (6 días por semana) ÷ vida del proveedor. Vidas típicas: ' + (window.PM_VIDA_BALEROS || []).map(v => v[0] + ' ' + v[1].toLocaleString('es-MX') + ' h').join(' · ') + '.</p></div>' +
    vHist('baleros');
}
function pHoro() {
  const eqs = [...new Set(Object.values(window.PM_PLAN || {}).flat().filter(t => /montacargas/i.test(t.eq)).map(t => t.eq))].sort();
  const H = S.param.horometros || {};
  return '<div class="caja"><h2>⏲️ Horómetros de montacargas <span class="r">cambio de aceite y filtro cada 250 h</span></h2><div class="scroll"><table class="tbl"><tr><th></th><th>Montacargas</th><th class="n">Última lectura</th><th>Fecha</th><th class="n">Último servicio</th><th class="n">Próximo servicio</th><th class="n">Faltan</th><th>Fecha estimada</th><th></th></tr>' +
    eqs.map(eq => { const x = H[eq.replace(/[\/.#$\[\]]/g, '_')] || {}, ls = x.lect || [], u = ls[ls.length - 1], serv = Number(x.serv) || 0, prox = serv + 250, falt = u ? prox - u.h : null;
      let fEst = ''; if (ls.length >= 2 && falt != null) { const a = ls[ls.length - 2], dd = Math.max(1, diasEntre(a.f, u.f)), ritmo = (u.h - a.h) / dd; if (ritmo > 0) fEst = iso(sumar(new Date(), Math.round(falt / ritmo))); }
      return '<tr><td><span class="sem ' + (falt == null ? 'gr' : falt <= 0 ? 'bad' : falt <= 25 ? 'wa' : 'ok') + '"></span></td><td><b>' + esc(eq) + '</b></td><td class="n">' + (u ? u.h.toLocaleString('es-MX') + ' h' : '—') + '</td><td>' + (u ? fCorta(u.f) : '—') + '</td><td class="n">' + (serv ? serv + ' h' : '—') + '</td><td class="n">' + (u || serv ? prox + ' h' : '—') + '</td><td class="n">' + (falt == null ? '—' : falt <= 0 ? '<span class="chip bad">' + falt + ' h</span>' : falt + ' h') + '</td><td>' + (fEst ? fCorta(fEst) : '—') + '</td><td class="fila"><button class="bt s" data-horo="lect|' + esc(eq) + '">Lectura</button>' + (califica() ? '<button class="bt s" data-horo="serv|' + esc(eq) + '">Servicio hecho</button>' : '') + '</td></tr>'; }).join('') + '</table></div><p class="peq mu" style="margin:10px 0 0">Captura la lectura del horómetro en cada preventivo semanal. Con dos lecturas se calcula el ritmo de uso y la fecha estimada del próximo cambio de aceite y filtro.</p></div>' + vHist('horometros');
}
function vHist(k) {
  const L = []; Object.entries(S.param[k] || {}).forEach(([id, x]) => (x.hist || []).forEach(h => L.push(Object.assign({ eq: x.eq || id }, h))));
  if (!L.length) return '';
  return '<div class="caja"><h2>🕘 Historial de cambios</h2><table class="tbl"><tr><th>Fecha</th><th>Equipo</th><th>Detalle</th><th>Quién</th><th class="n">Costo</th></tr>' + L.sort((a, b) => b.f.localeCompare(a.f)).slice(0, 60).map(h => '<tr><td>' + fCorta(h.f) + '</td><td>' + esc(h.eq) + '</td><td>' + esc(h.nota || '') + '</td><td>' + esc(titulo(h.por || '')) + '</td><td class="n">' + (h.costo ? dinero(h.costo) : '—') + '</td></tr>').join('') + '</table></div>';
}
document.addEventListener('click', async e => {
  const c = e.target.closest('[data-cambio]');
  if (c) {
    const [tipo, id] = c.dataset.cambio.split('|'), f = prompt('Fecha del cambio (AAAA-MM-DD):', HOY); if (!f) return;
    const nota = prompt('¿Qué se cambió? (marca, referencia, motivo)', '') || '', costo = Number(prompt('Costo de la refacción (opcional):', '') || 0);
    const doc = tipo === 'refac' ? 'refac' : 'baleros', x = (S.param[doc] || {})[id] || {};
    const h = { f, nota, costo, por: yoP().n };
    const up = { [id]: { hist: (x.hist || []).concat([h]) } }; if (tipo === 'bal') up[id].inst = f; else up[id].real = f;
    await upd('param/' + doc, up); return toast('Cambio registrado.');
  }
  if (e.target.closest('[data-nbal]')) {
    const eq = prompt('Equipo (ej. Selexx · 1):'); if (!eq) return; const pos = prompt('Posición del balero (ej. husillo delantero, motor del ventilador):') || '';
    const ref = prompt('Referencia del balero (ej. SKF 6205-2RS):') || ''; const tipos = (window.PM_VIDA_BALEROS || []).map((v, i) => (i + 1) + ') ' + v[0] + ' ' + v[1] + ' h').join('\n');
    const sel = prompt('Vida en horas según el proveedor. Escribe las horas o el número de la lista:\n' + tipos, '1'); let vida = Number(sel); if (vida > 0 && vida <= (window.PM_VIDA_BALEROS || []).length) vida = window.PM_VIDA_BALEROS[vida - 1][1];
    const hDia = Number(prompt('Horas de trabajo al día:', '8') || 8), inst = prompt('Fecha de instalación (AAAA-MM-DD):', HOY) || HOY;
    const id = 'b' + Date.now().toString(36); await upd('param/baleros', { [id]: { eq, pos, ref, vidaH: vida, hDia, inst, hist: [] } }); return toast('Balero agregado.');
  }
  const hr = e.target.closest('[data-horo]');
  if (hr) {
    const [tipo, eq] = hr.dataset.horo.split('|'), id = eq.replace(/[\/.#$\[\]]/g, '_'), x = (S.param.horometros || {})[id] || {};
    const h = Number(prompt((tipo === 'lect' ? 'Lectura del horómetro de ' : 'Horómetro al hacer el cambio de aceite y filtro de ') + eq + ':', '')); if (!h) return;
    const up = { eq, lect: (x.lect || []).concat([{ h, f: HOY, por: yoP().n }]).slice(-30) };
    if (tipo === 'serv') { up.serv = h; up.hist = (x.hist || []).concat([{ f: HOY, nota: 'Cambio de aceite y filtro a las ' + h + ' h', por: yoP().n, costo: Number(prompt('Costo del servicio (opcional):', '') || 0) }]); }
    await upd('param/horometros', { [id]: up }); return toast('Guardado.');
  }
});
// ============================================================ CONFIGURACIÓN (jefe / gerencia)
function vConfig() {
  const cs = S.subC || 'personal', subs = [['personal', '👥 Personal y accesos'], ['mant', '🗓️ Mantenimientos'], ['hojas', '📋 Hojas por equipo'], ['excel', '📗 Excel y cierre de mes']];
  let h = '<div class="seg" style="margin-bottom:14px">' + subs.map(([k, l]) => '<button data-subc="' + k + '" aria-pressed="' + (cs === k) + '">' + l + '</button>').join('') + '</div>';
  if (cs === 'personal') {
    h += '<div class="caja"><h2>👥 Personal y accesos <span class="r"><button class="bt s p" data-nper>＋ Agregar persona</button></span></h2><div class="scroll"><table class="tbl"><tr><th>Nómina</th><th>Nombre</th><th>Puesto</th><th>Nombre en el Excel</th>' + [1, 2, 3, 4].map(n => '<th class="n">' + PANT[n][0] + ' ' + PANT[n][1] + '</th>').join('') + '<th>Contraseña</th><th class="n">Califica</th><th class="n">Da accesos</th><th class="n">Activo</th></tr>' +
      Object.entries(S.pers).sort((a, b) => a[1].n.localeCompare(b[1].n)).map(([k, p]) => '<tr><td>' + k + '</td><td><b>' + esc(titulo(p.n)) + '</b></td><td><input class="in" data-per="' + k + '|puesto" value="' + esc(p.puesto || '') + '" style="min-width:140px"></td><td><input class="in" data-per="' + k + '|tec" value="' + esc(p.tec || '') + '" style="width:120px" placeholder="(no es técnico)"></td>' +
        [1, 2, 3, 4].map(n => '<td class="n"><input type="checkbox" data-perp="' + k + '|' + n + '"' + ((p.pant || []).includes(n) ? ' checked' : '') + '></td>').join('') + celdaClave(k) + '<td class="n"><input type="checkbox" data-perb="' + k + '|califica"' + (p.califica ? ' checked' : '') + '></td><td class="n"><input type="checkbox" data-perb="' + k + '|otorga"' + (p.otorga ? ' checked' : '') + (p.r === 'general' ? ' disabled' : '') + '></td><td class="n"><input type="checkbox" data-perb="' + k + '|a"' + (p.a !== false ? ' checked' : '') + (k === S.nom ? ' disabled' : '') + '></td></tr>').join('') + '</table></div><p class="peq mu" style="margin:10px 0 0">Los técnicos ven 📅 Mi mes y 📋 Hojas. "Nombre en el Excel" debe ser igual al de la columna EM del plan maestro (OSCAR, JORGE…). Solo quien "Da accesos" puede entrar a Configuración.</p></div>';
  } else if (cs === 'mant') {
    const L = tareasMes(S.mes);
    h += '<div class="caja"><h2>🗓️ Mantenimientos de ' + nomMes(S.mes) + ' <span class="r">' + selMes() + '</span></h2><p class="peq mu">Quitar un mantenimiento lo saca del mes (aunque el Excel se vuelva a leer). Para cambiar fechas o técnicos lo mejor es cambiarlo en el Excel: la app lo toma solo.</p><div class="scroll"><table class="tbl"><tr><th>Fecha</th><th>Equipo</th><th>Frecuencia</th><th>Técnico</th><th>Hoja</th><th></th></tr>' + L.map(t => '<tr><td>' + fCorta(t.f) + '</td><td>' + esc(t.eq) + '</td><td>' + esc(FR[t.fr] || t.fr) + '</td><td>' + esc(corto(t.tec)) + '</td><td class="peq">' + esc((fmtDe(t) || {}).id || '— sin hoja —') + '</td><td><button class="bt s" data-quitar="' + t.k + '">Quitar</button></td></tr>').join('') + '</table></div>' +
      (Object.keys(S.aj.excl || {}).length ? '<p class="peq">Quitados: ' + Object.keys(S.aj.excl).length + ' <button class="bt s" data-restaurar>Restaurar todos</button></p>' : '') + '</div>';
  } else if (cs === 'hojas') {
    const eqs = {}; tareasMes(S.mes).forEach(t => { eqs[t.no || t.eq] = t; });
    const F = formatos();
    h += '<div class="caja"><h2>📋 Qué hoja usa cada equipo <span class="r">' + selMes() + '</span></h2><p class="peq mu">La app la elige sola por el nombre del equipo; aquí la puedes cambiar. Para editar el contenido de una hoja ve a 📋 Hojas → elige la hoja → ✏️ Editar hoja.</p><div class="scroll"><table class="tbl"><tr><th>Equipo</th><th>Cat.</th><th>Hoja de instrucciones</th></tr>' +
      Object.values(eqs).sort((a, b) => a.cat.localeCompare(b.cat) || a.eq.localeCompare(b.eq)).map(t => { const sel = (S.aj.fmtEq || {})[t.no || t.eq] || '', auto = (fmtDe(Object.assign({}, t)) || {}).id || ''; return '<tr><td>' + esc(t.eq) + '</td><td><span class="chip">' + esc(t.cat) + '</span></td><td><select class="in" data-fmteq="' + esc(t.no || t.eq) + '"><option value="">Automática (' + esc(auto || 'ninguna') + ')</option>' + F.map(f => '<option value="' + esc(f.id) + '"' + (sel === f.id ? ' selected' : '') + '>' + esc(f.id) + '</option>').join('') + '</select></td></tr>'; }).join('') + '</table></div></div>';
  } else {
    h += vLiberar() + '<div class="caja"><h2>📗 Plan maestro en Excel</h2><p>La app toma la programación del <b>PLAN MAESTRO MENSUAL 2027.xlsx</b>. Conecta el archivo una vez en esta computadora; cada vez que entres revisa si el Excel cambió y actualiza los meses (las hojas llenadas y calificaciones no se pierden). Cuando empieza un mes nuevo, sus preventivos ya están cargados.</p>' +
      '<p class="peq mu">Última lectura: ' + (S.aj.excelLeido ? fechaHora(S.aj.excelLeido) + ' · Excel modificado ' + fechaHora(S.aj.excelMod) : (window.PM_PLAN_MOD ? 'semilla de prueba del ' + fechaHora(window.PM_PLAN_MOD) : 'nunca')) + '</p><div class="fila"><button class="bt p" data-conexcel>📗 Conectar / leer Excel ahora</button></div></div>' +
      '<div class="caja"><h2>📘 Hojas de instrucciones (Excel originales)</h2><p>Los cambios a las hojas (preguntas retiradas por el supervisor, textos editados, actividades nuevas) se aplican <b>directo al Excel original</b> de la carpeta HOJAS DE INSTRUCCIONES POR CATEGORIA, sin copias. Conecta la carpeta una vez en esta PC.</p><p class="peq mu">Cambios pendientes: <b>' + (S.aj.colaExcel || []).filter(o => !o.ok).length + '</b> · aplicados: ' + (S.aj.colaExcel || []).filter(o => o.ok).length + '</p><div class="fila"><button class="bt p" data-aplexcel>📘 Conectar carpeta y aplicar cambios</button></div></div>' +
      '<div class="caja"><h2>📁 Cierre de mes</h2><p>Genera una subcarpeta con el nombre del mes dentro de <b>MANTENIMIENTO MENSUAL</b>: por técnico, cada hoja en <b>Excel llenado</b> con el mismo acomodo del original, su PDF y la carpeta de fotos de evidencia (quién la hizo, tiempo real, fecha programada y real), más el resumen del mes.</p><div class="fila">' + selMes() + '<button class="bt p" data-cierre>📁 Generar carpeta del mes</button></div></div>' +
      (window.DEMO ? '<div class="caja"><h2>🧪 Datos de prueba</h2><p class="peq mu">Todo lo que se captura en modo prueba vive en este navegador.</p><button class="bt bad" data-borrardemo>Borrar datos de prueba</button></div>' : '');
  }
  return h;
}
document.addEventListener('click', async e => {
  const s = e.target.closest('[data-subc]'); if (s) { S.subC = s.dataset.subc; return render(); }
  if (e.target.closest('[data-nper]')) { const k = (prompt('Número de nómina:') || '').trim(); if (!/^\d+$/.test(k)) return; const n = (prompt('Nombre completo:') || '').trim().toUpperCase(); if (!n) return; const tec = (prompt('Si es técnico, nombre como aparece en el Excel (columna EM). Si no, deja vacío:') || '').trim().toUpperCase(); await upd('config/personal', { p: { [k]: { n, r: 'usuario', a: true, puesto: tec ? 'Técnico' : '', pant: tec ? [2, 3] : [1, 3], tec } } }); return toast('Persona agregada.'); }
  const q = e.target.closest('[data-quitar]'); if (q) { if (!confirm('¿Quitar este mantenimiento del mes?')) return; await upd('config/ajustes', { excl: { [q.dataset.quitar]: true } }); return toast('Quitado.'); }
  if (e.target.closest('[data-restaurar]')) { const ex = {}; Object.keys(S.aj.excl || {}).forEach(k => ex[k] = { __delete__: true }); await upd('config/ajustes', { excl: ex }); return; }
  if (e.target.closest('[data-conexcel]')) return revisarExcel(false);
  if (e.target.closest('[data-aplexcel]')) return aplicarCambiosExcel(false);
  if (e.target.closest('[data-cierre]')) return cierreMes(S.mes);
  if (e.target.closest('[data-borrardemo]')) { if (confirm('¿Borrar todo lo capturado en la prueba?')) window.PM_BORRAR_DEMO(); }
});
document.addEventListener('change', async e => {
  const pe = e.target.closest('[data-per]'); if (pe) { const [k, c] = pe.dataset.per.split('|'); await upd('config/personal', { p: { [k]: { [c]: c === 'tec' ? pe.value.trim().toUpperCase() : pe.value.trim() } } }); return toast('Guardado.'); }
  const pp = e.target.closest('[data-perp]'); if (pp) { const [k, n] = pp.dataset.perp.split('|'); const cur = new Set(S.pers[k].pant || []); pp.checked ? cur.add(Number(n)) : cur.delete(Number(n)); await upd('config/personal', { p: { [k]: { pant: [...cur].sort() } } }); return toast('Accesos actualizados.'); }
  const pb = e.target.closest('[data-perb]'); if (pb) { const [k, c] = pb.dataset.perb.split('|'); await upd('config/personal', { p: { [k]: { [c]: pb.checked } } }); return toast('Guardado.'); }
  const fe = e.target.closest('[data-fmteq]'); if (fe) { await upd('config/ajustes', { fmtEq: { [fe.dataset.fmteq]: fe.value || { __delete__: true } } }); return toast('Hoja asignada.'); }
});
// ---------- Excel: leer el plan maestro directo del archivo (ExcelJS) y cierre de mes en carpeta
function idb() { return new Promise((ok, mal) => { const r = indexedDB.open('pm-preventivo', 1); r.onupgradeneeded = () => r.result.createObjectStore('h'); r.onsuccess = () => ok(r.result); r.onerror = () => mal(r.error); }); }
async function idbGet(k) { const d = await idb(); return new Promise(ok => { const r = d.transaction('h').objectStore('h').get(k); r.onsuccess = () => ok(r.result); r.onerror = () => ok(null); }); }
async function idbSet(k, v) { const d = await idb(); return new Promise(ok => { const t = d.transaction('h', 'readwrite'); t.objectStore('h').put(v, k); t.oncomplete = () => ok(); }); }
function cargarScript(src) { return new Promise((ok, mal) => { if (document.querySelector('script[src="' + src + '"]')) return ok(); const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = mal; document.head.appendChild(s); }); }
async function revisarExcel(silencioso) {
  try {
    let h = await idbGet('excel');
    if (!h) { if (silencioso) return; if (!window.showOpenFilePicker) return toast('Este navegador no deja abrir archivos; usa Edge o Chrome en la PC.'); [h] = await showOpenFilePicker({ types: [{ description: 'Excel', accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] } }] }); await idbSet('excel', h); }
    if ((await h.queryPermission({ mode: 'read' })) !== 'granted') { if (silencioso) return; if ((await h.requestPermission({ mode: 'read' })) !== 'granted') return; }
    const file = await h.getFile(), mod = new Date(file.lastModified).toISOString();
    if (silencioso && S.aj.excelMod && mod <= S.aj.excelMod) return;
    toast('Leyendo el plan maestro…');
    await cargarScript('https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js');
    const wb = new ExcelJS.Workbook(); await wb.xlsx.load(await file.arrayBuffer());
    const planes = leerPlanExcel(wb), meses = Object.keys(planes);
    for (const m of meses) await DB.doc('plan/' + m).set({ t: planes[m], mod, fuente: file.name, leido: new Date().toISOString() });
    await upd('config/ajustes', { excelMod: mod, excelLeido: new Date().toISOString(), excelNombre: file.name });
    toast('Plan actualizado desde el Excel: ' + meses.length + ' meses.');
  } catch (x) { if (!silencioso) toast('No se pudo leer el Excel: ' + (x.message || x)); }
}
function leerPlanExcel(wb) {
  const MESES = { ENE: 1, FEB: 2, MAR: 3, ABR: 4, MAY: 5, JUN: 6, JUL: 7, AGO: 8, SEP: 9, OCT: 10, NOV: 11, DIC: 12 }, out = {};
  const val = c => { let v = c && c.value; if (v && typeof v === 'object') { if (v instanceof Date) return v; if ('result' in v) v = v.result; else if (v.richText) v = v.richText.map(x => x.text).join(''); else if ('text' in v) v = v.text; } return v; };
  const fecha = v => v instanceof Date ? new Date(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate()) : (typeof v === 'number' && v > 40000 ? new Date(Math.round((v - 25569) * 864e5) + new Date().getTimezoneOffset() * 6e4) : null);
  const listas = wb.getWorksheet('LISTAS'), TECS = []; if (listas) for (let r = 2; r <= 30; r++) { const v = String(val(listas.getCell(r, 1)) || '').trim().toUpperCase(); if (v) TECS.push(v); }
  const EQMIN = window.PM_EQMIN || {}, EST = { S: 30, '1M': 60, '3M': 90, '6M': 120, A: 240 };
  wb.eachSheet(ws => {
    const m = ws.name.match(/^(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC) (\d{4})$/); if (!m) return;
    const clave = m[2] + '-' + String(MESES[m[1]]).padStart(2, '0'), L = []; let fechas = null;
    for (let r = 1; r <= ws.rowCount; r++) {
      const f3 = fecha(val(ws.getCell(r, 3))); if (f3) { fechas = [0, 1, 2, 3, 4, 5, 6].map(i => fecha(val(ws.getCell(r, 3 + 7 * i)))); continue; }
      if (!fechas) continue;
      for (let d = 0; d < 7; d++) {
        const b = 3 + 7 * d, eq = String(val(ws.getCell(r, b)) || '').trim(); if (!eq || eq === 'EQUIPOS' || /^(Domingo|SEMANA)/.test(eq)) continue;
        const tec = String(val(ws.getCell(r, b + 3)) || '').trim().toUpperCase(); if (TECS.length && !TECS.includes(tec)) continue; if (!fechas[d]) continue;
        const f = iso(fechas[d]); if (f.slice(0, 7) !== clave) continue;
        const partes = eq.split(' · '), no = partes.length > 1 ? partes[partes.length - 1].trim() : '', fr = String(val(ws.getCell(r, b + 5)) || '').trim(), ej = Number(val(ws.getCell(r, b + 4))) || 0;
        L.push({ f, eq, no, ot: String(val(ws.getCell(r, b + 1)) || '').trim(), tec, ej, fr, cat: String(val(ws.getCell(r, b + 6)) || '').trim(), min: EQMIN[no + '|' + fr] || EST[fr] || 60 });
      }
    }
    out[clave] = L;
  });
  return out;
}


// ============================================================ PLAN DEL MES · mes completo de un vistazo; al tocar un día se despliegan sus mantenimientos
function vPlanGeneral(L) {
  const mio = tecDe(S.nom), f = S.fPlan == null ? (mio ? mio : '') : S.fPlan, fc = S.fCat || '';
  const T = L.filter(t => (!f || t.tec === f) && (!fc || t.cat === fc)), I = indicadores(T);
  const [y, m] = S.mes.split('-').map(Number), ini = lunesDe(new Date(y, m - 1, 1)), fin = new Date(y, m, 0);
  if (!S.diaSel || S.diaSel.slice(0, 7) !== S.mes) S.diaSel = HOY.slice(0, 7) === S.mes ? HOY : S.mes + '-01';
  let h = '<div class="caja"><div class="fila" style="justify-content:space-between"><h2 style="margin:0">🗓️ Plan de ' + nomMes(S.mes) + ' <span class="chip ' + notaCls(I.avance) + '">' + I.hechas + ' de ' + I.n + ' terminados</span></h2><div class="fila">' +
    '<div class="seg">' + (mio ? '<button data-fplan="' + mio + '" aria-pressed="' + (f === mio) + '">👷 Solo los míos</button>' : '') + '<button data-fplan="" aria-pressed="' + (!f) + '">👥 Todos</button></div>' +
    '<select class="in" id="fPlanTec" style="width:auto"><option value="">Técnico…</option>' + tecsMes(S.mes).map(x => '<option value="' + x + '"' + (x === f ? ' selected' : '') + '>' + esc(corto(x)) + '</option>').join('') + '</select>' +
    '<select class="in" id="fPlanCat" style="width:auto"><option value="">Todas las categorías</option>' + Object.keys(CAT).map(c => '<option value="' + c + '"' + (c === fc ? ' selected' : '') + '>' + c + ' · ' + esc(CAT[c][0]) + '</option>').join('') + '</select></div></div>' +
    '<div class="ley"><span><i style="background:#1E8E5A"></i>Terminado</span><span><i style="background:#6A4BC4"></i>Por calificar</span><span><i style="background:#E0A100"></i>En proceso</span><span><i style="background:#D32F2F"></i>Vencido</span><span><i style="background:#C9D3DE"></i>Pendiente</span><span>· Toca un día para ver sus mantenimientos</span></div></div>';
  h += '<div class="cal-m"><div class="cal-h">' + ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].map(d => '<div>' + d + '</div>').join('') + '</div>';
  for (let w = new Date(ini); w <= fin; w = sumar(w, 7)) {
    h += '<div class="cal-s">';
    for (let i = 0; i < 6; i++) {
      const d = sumar(w, i), k = iso(d), fuera = d.getMonth() !== m - 1, D = T.filter(t => t.f === k);
      const cnt = { cal: 0, term: 0, proc: 0, venc: 0, pend: 0 }; D.forEach(t => cnt[estadoT(t)]++); const hechas = cnt.cal + cnt.term;
      const porTec = {}; D.forEach(t => porTec[t.tec] = (porTec[t.tec] || 0) + 1);
      const al = D.some(t => alertasEq(t).some(a => a.cls === 'bad'));
      h += '<button class="cal-d' + (fuera ? ' fuera' : '') + (k === HOY ? ' hoy' : '') + (k === S.diaSel ? ' sel' : '') + (D.length ? '' : ' vacio') + '" data-dia="' + k + '"' + (fuera ? ' disabled' : '') + '>' +
        '<div class="cal-n"><b>' + d.getDate() + '</b>' + (D.length ? '<span class="cnt' + (hechas === D.length ? ' ok' : cnt.venc ? ' bad' : '') + '">' + hechas + '/' + D.length + '</span>' : '') + '</div>' +
        (D.length ? '<div class="cal-bar">' + ['cal', 'term', 'proc', 'venc', 'pend'].map(s => cnt[s] ? '<i class="b-' + s + '" style="flex:' + cnt[s] + '"></i>' : '').join('') + '</div>' +
          '<div class="cal-ics">' + D.slice(0, 4).map(t => '<span>' + dibujo(t) + '</span>').join('') + (D.length > 4 ? '<em>+' + (D.length - 4) + '</em>' : '') + '</div>' +
          '<div class="cal-tecs">' + Object.entries(porTec).map(([tc, n]) => '<span style="background:' + colorTec(tc) + '" title="' + esc(corto(tc)) + '">' + tc[0] + (n > 1 ? '<small>' + n + '</small>' : '') + '</span>').join('') + (al ? '<span class="alr" title="Alerta de refacción o aceite">!</span>' : '') + '</div>'
          : (d.getDay() === 6 ? '<div class="cal-sab">Faltantes</div>' : '')) + '</button>';
    }
    h += '</div>';
  }
  h += '</div>';
  // detalle del día elegido
  const D = T.filter(t => t.f === S.diaSel).sort((a, b) => a.tec.localeCompare(b.tec) || a.eq.localeCompare(b.eq));
  h += '<div class="caja dia-det" id="diaDet"><h2>📌 ' + fLarga(S.diaSel)[0].toUpperCase() + fLarga(S.diaSel).slice(1) + ' <span class="r">' + D.length + ' mantenimiento' + (D.length === 1 ? '' : 's') + '</span></h2>';
  if (!D.length) h += '<div class="vacio"><span class="i">' + (deIso(S.diaSel).getDay() === 6 ? '🛠️' : '☕') + '</span>' + (deIso(S.diaSel).getDay() === 6 ? 'Sábado: día para hacer los faltantes de la semana.' : 'Sin mantenimientos programados este día.') + '</div>';
  const grupos = {}; D.forEach(t => (grupos[t.tec] = grupos[t.tec] || []).push(t));
  Object.keys(grupos).forEach(tc => { h += '<div class="semana"><span class="av" style="width:28px;height:28px;font-size:12px;background:' + colorTec(tc) + '">' + tc[0] + '</span>' + esc(nombreTec(tc)) + ' <span class="chip">' + grupos[tc].length + '</span></div>' + grupos[tc].map(t => filaOrden(t, false)).join(''); });
  return h + '</div>';
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-fplan]'); if (b) { S.fPlan = b.dataset.fplan; return render(); }
  const d = e.target.closest('[data-dia]'); if (d && !d.disabled) { S.diaSel = d.dataset.dia; render(); const el = $('#diaDet'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
});
document.addEventListener('change', e => { if (e.target.id === 'fPlanTec') { S.fPlan = e.target.value; render(); } if (e.target.id === 'fPlanCat') { S.fCat = e.target.value; render(); } });

// ============================================================ N/A por revisar (supervisor): retirar la pregunta de la hoja y del Excel original
function vNA() {
  const L = [];
  Object.values(S.ords).forEach(o => { if (o.mes !== S.mes) return; const t = buscarTarea(o.k); if (!t) return; const fmt = fmtDe(t); if (!fmt) return; const { fr, secs } = seccionesDe(fmt, t.fr);
    secs.forEach(s => s.items.forEach(it => { const x = (o.resp || {})[itemId(it)]; if (x && x.e === 'NA' && !x.rev) L.push({ o, t, fmt, fr, it, x }); })); });
  if (!L.length) return '<div class="caja vacio"><span class="i">✅</span>No hay preguntas marcadas como "No aplica" pendientes de revisar.</div>';
  return '<div class="caja"><h2>❔ Preguntas marcadas "No aplica" <span class="r">' + L.length + '</span></h2><p class="peq mu">Si la pregunta no aplica a ese equipo, retírala: se quita de la hoja digital y del Excel original de la hoja de instrucciones (sin copias) para que no se repita.</p>' +
    L.map(z => '<div class="pc" style="grid-template-columns:64px 1fr auto"><div class="dib">' + dibujo(z.t) + '</div><div><b>' + esc(z.t.eq) + '</b> <span class="chip">' + esc(z.fmt.id) + ' · ' + esc(FR[z.fr] || z.fr) + '</span><br><span class="peq">#' + z.it.n + ' ' + esc(z.it.v) + '</span><br><span class="peq mu">' + esc(corto(z.t.tec)) + ': “' + esc(z.x.why || 'sin motivo') + '”</span></div><div class="fila"><button class="bt s bad" data-narev="' + esc(z.o.k) + '|' + esc(itemId(z.it)) + '|retirada">Retirar pregunta</button><button class="bt s" data-narev="' + esc(z.o.k) + '|' + esc(itemId(z.it)) + '|mantener">Mantener</button></div></div>').join('') + '</div>';
}
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-narev]'); if (!b) return;
  const p = b.dataset.narev.split('|'), dec = p.pop(), id = p.pop(), k = p.join('|'), o = S.ords[k], t = buscarTarea(k), fmt = fmtDe(t), { fr } = seccionesDe(fmt, t.fr);
  const x = Object.assign({}, (o.resp || {})[id], { rev: dec, revPor: yoP().n, revT: new Date().toISOString() });
  await upd('ordenes/' + k, { resp: { [id]: x } });
  if (dec === 'retirada') {
    const f = JSON.parse(JSON.stringify(fmt)); let quitado = null;
    // el renglón (r) solo es único dentro de su pestaña: se retira de esa frecuencia (semestral y anual comparten pestaña)
    ((fr === '6M' || fr === 'A') ? ['6M', 'A'] : [fr]).forEach(q => (f.frec[q] || []).forEach(s => { const i = s.items.findIndex(it => itemId(it) === id); if (i >= 0) { quitado = quitado || s.items[i]; s.items.splice(i, 1); } }));
    await DB.doc('formatos/' + f.id).set({ frec: f.frec, editado: new Date().toISOString(), por: yoP().n });
    if (quitado && quitado.r) await encolarExcel([{ fmt: f.id, fr, op: 'quitar', r: quitado.r, v: quitado.v }]);
    toast('Pregunta retirada de la hoja. Se quitará también del Excel original.');
  } else toast('La pregunta se mantiene.');
});
// cola de cambios para el Excel original de las hojas de instrucciones (se aplican en la PC con la carpeta conectada)
async function encolarExcel(ops) { const L = (S.aj.colaExcel || []).concat(ops.map(o => Object.assign({ t: new Date().toISOString(), por: yoP().n }, o))); await upd('config/ajustes', { colaExcel: L }); if (otorga() || califica()) aplicarCambiosExcel(true); }

// ---------- ver hoja (biblioteca): mismo acomodo que el Excel, sin información de compras
function verFormato(id, frSel) {
  const f = fmtPorId(id); if (!f) return;
  const frs = Object.keys(f.frec).filter(k => (f.frec[k] || []).some(s => s.items.length)), fr = frSel || frs[0];
  $('#hoja').innerHTML = '<div class="fila" style="justify-content:space-between"><h2 style="margin:0;color:var(--tit)">' + esc(f.tipo || f.id) + '</h2><button class="bt s" data-cerrar>✕</button></div><p class="peq mu">' + esc(f.aplica) + '</p><div class="seg">' + frs.map(k => '<button data-vfr="' + esc(id) + '|' + k + '" aria-pressed="' + (k === fr) + '">' + (FR[k] || k) + '</button>').join('') + '</div>' +
    '<div class="scroll" style="margin-top:10px"><table class="xls"><tr class="h"><th>#</th><th>ACTIVIDADES DE VERIFICACIÓN</th><th class="o">BIEN</th><th class="o">MAL</th><th class="o">NA</th><th>ACTIVIDADES DE CONSERVACIÓN</th><th class="o">SI</th><th class="o">NO</th></tr>' +
    (f.frec[fr] || []).map(s => '<tr class="s"><td colspan="8">' + esc(s.t) + '</td></tr>' + s.items.map(it => it.med ? '<tr class="i"><td class="n">' + it.n + '</td><td colspan="7">' + esc(it.l) + ': ' + esc((it.campos || []).join(' · ')) + (it.l2 ? ' | ' + esc(it.l2) + ': ' + esc((it.campos2 || []).join(' · ')) : '') + ' <span class="chip acc">📷 foto</span></td></tr>' : '<tr class="i"><td class="n">' + it.n + '</td><td class="v">' + esc(it.v) + (pideFotoLimpieza(it) ? ' <span class="chip acc">📷</span>' : '') + '</td><td class="o">B</td><td class="o">M</td><td class="o">NA</td><td class="c">' + esc(it.c || '') + '</td><td class="o">S</td><td class="o">N</td></tr>').join('')).join('') + '</table></div>' +
    '<div class="fila" style="margin-top:14px;justify-content:flex-end"><button class="bt" data-pdfblanco="' + esc(id) + '|' + fr + '">⬇️ Descargar PDF para imprimir</button>' + (otorga() || califica() ? '<button class="bt" data-editfmt="' + esc(id) + '|' + fr + '">✏️ Editar hoja</button>' : '') + '</div>';
  $('#modal').classList.add('on');
}
// ---------- editar hoja: textos, agregar o quitar actividades (también se aplica al Excel original)
function editarFormato(id, fr) {
  const f = window._ed && window._ed.id === id ? window._ed : JSON.parse(JSON.stringify(fmtPorId(id))), secs = f.frec[fr] || [];
  window._ed = f; window._edFr = fr;
  $('#hoja').innerHTML = '<div class="fila" style="justify-content:space-between"><h2 style="margin:0;color:var(--tit)">✏️ ' + esc(f.id) + ' · ' + (FR[fr] || fr) + '</h2><button class="bt s" data-edcancel>✕</button></div><p class="peq mu">Cambia el texto de la verificación o de la contramedida (conservación), agrega o quita actividades. Se guarda para todos y se pasa al Excel original de la hoja.</p>' +
    secs.map((s, si) => '<div class="sec">' + esc(s.t) + '</div>' + s.items.map((it, ii) => it.med ? '<p class="peq mu">' + it.n + '. ' + esc(it.l) + ' (medición con foto)</p>' : '<div class="it"><span class="num">' + it.n + '</span><div><label class="l">Verificación</label><textarea class="in" data-edv="' + si + '|' + ii + '" style="min-height:44px">' + esc(it.v) + '</textarea><label class="l" style="margin-top:4px">Conservación / contramedida (si sale MAL)</label><input class="in" data-edc="' + si + '|' + ii + '" value="' + esc(it.c || '') + '"><label class="peq"><input type="checkbox" data-edx="' + si + '|' + ii + '"> quitar esta actividad</label></div></div>').join('') + '<button class="bt s" data-edadd="' + si + '">＋ Actividad en esta sección</button>').join('') +
    '<div class="fila" style="justify-content:flex-end;margin-top:14px"><button class="bt p" data-edsave>💾 Guardar hoja</button></div>';
  $('#modal').classList.add('on');
}
function leerEdicion(f, fr) {
  const secs = f.frec[fr];
  document.querySelectorAll('[data-edv]').forEach(el => { const [si, ii] = el.dataset.edv.split('|').map(Number); secs[si].items[ii].v = el.value.trim(); });
  document.querySelectorAll('[data-edc]').forEach(el => { const [si, ii] = el.dataset.edc.split('|').map(Number); secs[si].items[ii].c = el.value.trim(); });
  document.querySelectorAll('[data-edx]:checked').forEach(el => { const [si, ii] = el.dataset.edx.split('|').map(Number); secs[si].items[ii]._quitar = true; });
}
document.addEventListener('click', async e => {
  if (e.target.closest('[data-edcancel]')) { window._ed = null; $('#modal').classList.remove('on'); return; }
  const a = e.target.closest('[data-edadd]'); if (a) { const f = window._ed, fr = window._edFr; leerEdicion(f, fr); const s = f.frec[fr][Number(a.dataset.edadd)]; s.items.push({ k: 'n' + Date.now().toString(36), n: 0, v: 'Nueva actividad', c: '', nuevo: true }); return editarFormato(f.id, fr); }
  if (e.target.closest('[data-edsave]')) {
    const f = window._ed, fr = window._edFr; leerEdicion(f, fr);
    const orig = fmtPorId(f.id), viejos = {}; (orig.frec[fr] || []).forEach(s => s.items.forEach(it => viejos[itemId(it)] = it));
    const ops = [];
    f.frec[fr].forEach(s => { s.items.forEach(it => { const v = viejos[itemId(it)];
      if (it._quitar) { if (it.r) ops.push({ fmt: f.id, fr, op: 'quitar', r: it.r, v: it.v }); }
      else if (it.nuevo) ops.push({ fmt: f.id, fr, op: 'agregar', k: it.k, v: it.v, c: it.c, sec: s.t });
      else if (v && it.r && (v.v !== it.v || (v.c || '') !== (it.c || ''))) ops.push({ fmt: f.id, fr, op: 'editar', r: it.r, v: it.v, c: it.c }); });
      s.items = s.items.filter(it => !it._quitar).map(it => { const c = Object.assign({}, it); delete c.nuevo; return c; }); });
    let n = 0; f.frec[fr].forEach(s => s.items.forEach(it => it.n = ++n));
    if (fr === '6M' || fr === 'A') { const otro = fr === '6M' ? 'A' : '6M'; if (f.frec[otro]) f.frec[otro] = f.frec[otro].map(s => { const igual = f.frec[fr].find(x => x.t === s.t); return igual ? JSON.parse(JSON.stringify(igual)) : s; }); }
    await DB.doc('formatos/' + f.id).set({ frec: f.frec, editado: new Date().toISOString(), por: yoP().n });
    if (ops.length) await encolarExcel(ops);
    window._ed = null; $('#modal').classList.remove('on'); toast('Hoja actualizada' + (ops.length ? ' · ' + ops.length + ' cambio(s) para el Excel original' : '') + '.');
  }
});

// ---------- carpeta de las HOJAS DE INSTRUCCIONES (Excel originales): conectar una vez en la PC y aplicar los cambios ahí mismo, sin copias
async function carpetaHojas(silencioso) {
  let h = await idbGet('hojas');
  if (!h) { if (silencioso) return null; if (!window.showDirectoryPicker) { toast('Usa Edge o Chrome en la PC.'); return null; } toast('Elige la carpeta "HOJAS DE INSTRUCCIONES POR CATEGORIA"'); h = await showDirectoryPicker({ id: 'hojas-instr', mode: 'readwrite' }); await idbSet('hojas', h); }
  const p = await h.queryPermission({ mode: 'readwrite' }); if (p !== 'granted') { if (silencioso) return null; if ((await h.requestPermission({ mode: 'readwrite' })) !== 'granted') return null; }
  return h;
}
async function archivoHoja(dir, ruta) { const partes = ruta.split(/[\\/]/); let d = dir; for (let i = 0; i < partes.length - 1; i++) d = await d.getDirectoryHandle(partes[i]); return d.getFileHandle(partes[partes.length - 1]); }
async function aplicarCambiosExcel(silencioso) {
  const cola = (S.aj.colaExcel || []).filter(o => !o.ok); if (!cola.length) { if (!silencioso) toast('No hay cambios pendientes para el Excel.'); return; }
  try {
    const dir = await carpetaHojas(silencioso); if (!dir) return;
    await cargarScript('https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js');
    const porFmt = {}; cola.forEach(o => (porFmt[o.fmt] = porFmt[o.fmt] || []).push(o));
    const hechos = new Set();
    for (const id of Object.keys(porFmt)) {
      const fmt = (window.PM_FORMATOS || []).find(f => f.id === id); if (!fmt) continue;
      const fh = await archivoHoja(dir, fmt.archivo), wb = new ExcelJS.Workbook(); await wb.xlsx.load(await (await fh.getFile()).arrayBuffer());
      for (const o of porFmt[id]) {
        const info = (fmt.hoja || {})[o.fr]; if (!info) continue; const ws = wb.getWorksheet(info.tab); if (!ws) continue;
        if (o.op === 'quitar') { ws.getCell(o.r, 2).value = null; ws.getCell(o.r, 9).value = null; }
        else if (o.op === 'editar') { ws.getCell(o.r, 2).value = o.v; ws.getCell(o.r, 9).value = o.c || null; }
        else if (o.op === 'agregar') { const r = (info.libres || []).find(rr => !String(ws.getCell(rr, 2).value || '').trim()); if (!r) continue; ws.getCell(r, 2).value = o.v; ws.getCell(r, 9).value = o.c || null; }
        hechos.add(o.t + o.op + (o.r || o.k));
      }
      const w = await fh.createWritable(); await w.write(await wb.xlsx.writeBuffer()); await w.close();
    }
    const nueva = (S.aj.colaExcel || []).map(o => hechos.has(o.t + o.op + (o.r || o.k)) ? Object.assign({}, o, { ok: new Date().toISOString() }) : o);
    await upd('config/ajustes', { colaExcel: nueva });
    toast(hechos.size + ' cambio(s) aplicados al Excel original de las hojas.');
  } catch (x) { if (!silencioso) toast('No se pudo modificar el Excel: ' + (x.message || x) + ' (¿está abierto en Excel?)'); }
}

// ============================================================ REFACCIONES Y COSTOS DEL MES (por categoría y por máquina)
function pMaterial() {
  const L = tareasMes(S.mes), items = [];
  // reales: lo que el técnico anotó en las hojas (cambios de refacción, material requerido) con su costo
  L.forEach(t => (((S.ords[t.k] || {}).hall) || []).filter(x => (x.ref || x.d) && /cambi|material|modific/i.test(x.t)).forEach(x => items.push({ tipo: 'real', desc: x.ref || x.d, det: x.d, q: Number(x.q) || 1, cu: Number(x.costo) || 0, eq: t.eq, cat: t.cat, tec: t.tec, origen: x.t + ' · ' + fCorta(t.f), fotos: (x.fotos || []).length })));
  // pronóstico: refacciones con cambio estimado en el mes (según compras y cambios registrados)
  (window.PM_REFAC || []).forEach(x => { const ed = (S.param.refac || {})[x.k] || {}, hist = ed.hist || [], ult = (hist.length ? hist[hist.length - 1].f : '') || ed.real || x.real || x.ult; if (!ult || !x.dias) return; const prox = iso(sumar(deIso(ult), x.dias)); if (prox.slice(0, 7) === S.mes || (S.mes === MES_HOY && prox < HOY)) items.push({ tipo: 'pron', desc: x.n, det: '', q: 1, cu: x.veces ? Math.round(x.gasto / x.veces) : 0, eq: x.eq, cat: x.cat, tec: '', origen: 'Cambio estimado ' + fCorta(prox) }); });
  const alm = S.alm, buscar = d => { if (!alm) return null; const n = norm(d).split(/\s+/).filter(w => w.length > 3); let best = null, sc = 0; alm.forEach(a => { const h = norm(a.c + ' ' + a.n + ' ' + a.d); const s = n.filter(w => h.includes(w)).length; if (s > sc) { sc = s; best = a; } }); return sc >= Math.min(2, n.length) ? best : null; };
  const F = items.map(x => { const a = buscar(x.desc), cu = x.cu || (a && a.cu) || 0; return Object.assign({}, x, { a, cu, tot: cu * x.q, hay: !!(a && a.ex >= x.q) }); });
  const tot = a => a.reduce((s, f) => s + f.tot, 0), real = F.filter(f => f.tipo === 'real'), pron = F.filter(f => f.tipo === 'pron');
  let h = '<div class="fila" style="margin-bottom:14px;justify-content:flex-end">' + selMes() + '</div>';
  h += '<div class="kpis" style="grid-template-columns:repeat(4,1fr)"><div class="kpi mo"><b>' + dinero(tot(F)) + '</b><span>costo total de refacciones del mes</span></div><div class="kpi"><b>' + dinero(tot(real)) + '</b><span>real (anotado en las hojas) · ' + real.length + '</span></div><div class="kpi wa"><b>' + dinero(tot(pron)) + '</b><span>pronóstico de cambios · ' + pron.length + '</span></div><div class="kpi ' + (F.filter(f => !f.hay).length ? 'bad' : 'ok') + '"><b>' + F.filter(f => !f.hay).length + '</b><span>por comprar · ' + dinero(tot(F.filter(f => !f.hay))) + '</span></div></div>';
  if (!alm) h += '<div class="aviso inf"><span class="i">📦</span><div>' + (window.DEMO ? 'En modo prueba no hay conexión con el Almacén LI: todo aparece como "por comprar". En línea se compara contra la existencia y el costo del almacén.' : 'No se pudo leer el Almacén LI (la cuenta de este equipo debe estar dada de alta en el Almacén).') + '</div></div>';
  // concentrado por categoría → máquina
  const porCat = {}; F.forEach(f => { const c = f.cat || 'Otro'; (porCat[c] = porCat[c] || {}); (porCat[c][f.eq] = porCat[c][f.eq] || []).push(f); });
  h += '<div class="caja"><h2>💲 Concentrado de costo por categoría y máquina <span class="r">' + nomMes(S.mes) + '</span></h2>' + (F.length ? Object.keys(porCat).sort().map(c => { const maqs = porCat[c], tc = tot(Object.values(maqs).flat());
    return '<div class="semana" style="justify-content:space-between"><span><span class="chip" style="background:' + ((CAT[c] || [])[1] || '#888') + '22;color:' + ((CAT[c] || [])[1] || '#333') + '">' + esc(c) + '</span> ' + esc((CAT[c] || [c])[0]) + '</span><b>' + dinero(tc) + '</b></div><div class="scroll"><table class="tbl"><tr><th>Máquina</th><th>Refacción / material</th><th class="n">Cant.</th><th class="n">Costo unit.</th><th class="n">Total</th><th>Tipo</th><th>Almacén</th></tr>' +
      Object.keys(maqs).sort().map(eq => maqs[eq].map((f, i) => '<tr>' + (i ? '<td></td>' : '<td rowspan="1"><b>' + esc(eq) + '</b><br><span class="peq mu">' + dinero(tot(maqs[eq])) + '</span></td>') + '<td>' + esc(f.desc) + (f.det && f.det !== f.desc ? '<br><span class="peq mu">' + esc(f.det) + '</span>' : '') + (f.fotos ? ' <span class="chip">📷 ' + f.fotos + '</span>' : '') + '</td><td class="n">' + f.q + '</td><td class="n">' + (f.cu ? dinero(f.cu) : '—') + '</td><td class="n">' + (f.tot ? dinero(f.tot) : '—') + '</td><td><span class="chip ' + (f.tipo === 'real' ? 'acc' : 'wa') + '">' + (f.tipo === 'real' ? 'Real · ' + esc(f.origen) : 'Pronóstico · ' + esc(f.origen)) + '</span></td><td>' + (f.a ? (f.hay ? '<span class="chip ok">Hay ' + f.a.ex + (f.a.ub ? ' · ' + esc(f.a.ub) : '') + '</span>' : '<span class="chip bad">Existencia ' + f.a.ex + '</span>') : '<span class="chip bad">Comprar</span>') + '</td></tr>').join('')).join('') + '</table></div>'; }).join('') : '<div class="vacio">Sin refacciones en el mes.</div>') + '</div>';
  const hay = F.filter(f => f.hay), comprar = F.filter(f => !f.hay);
  h += '<div class="grid2"><div class="caja"><h2>✅ Pasar a almacén por el material</h2>' + (hay.length ? '<table class="tbl"><tr><th>Técnico</th><th>Material</th><th class="n">Cant.</th><th>Ubicación</th></tr>' + hay.map(f => '<tr><td>' + esc(f.tec ? corto(f.tec) : '—') + '</td><td>' + esc(f.desc) + '</td><td class="n">' + f.q + '</td><td>' + esc(f.a.ub || '') + '</td></tr>').join('') + '</table>' : '<div class="vacio">Nada por surtir.</div>') + '</div>' +
    '<div class="caja"><h2>🛒 Lista de compras del mes <span class="r">' + dinero(tot(comprar)) + '</span></h2>' + (comprar.length ? '<table class="tbl"><tr><th>Material</th><th>Para</th><th class="n">Cant.</th><th class="n">Total</th></tr>' + comprar.map(f => '<tr><td>' + esc(f.desc) + '</td><td>' + esc(f.eq) + '</td><td class="n">' + f.q + '</td><td class="n">' + (f.tot ? dinero(f.tot) : '—') + '</td></tr>').join('') + '</table>' : '<div class="vacio">Nada por comprar.</div>') + '</div></div>';
  // alertas por máquina
  const eqs = {}; L.forEach(t => { if (!eqs[t.eq]) eqs[t.eq] = t; }); const al = Object.values(eqs).map(t => ({ t, a: alertasEq(t) })).filter(z => z.a.length);
  h += '<div class="caja"><h2>🔔 Alertas por máquina</h2>' + (al.length ? al.map(z => '<div class="fila" style="padding:6px 0;border-bottom:1px solid #EEF1F4"><span style="width:40px;height:34px;display:inline-grid;place-items:center">' + dibujo(z.t) + '</span><b style="min-width:200px">' + esc(z.t.eq) + '</b>' + z.a.map(a => '<span class="chip ' + a.cls + '">' + esc(a.txt) + '</span>').join('') + '</div>').join('') : '<div class="vacio">Sin alertas.</div>') + '</div>';
  return h;
}

// ============================================================ CIERRE DE MES: subcarpeta con el Excel llenado (como el original), PDF y fotos de evidencia
async function llenarExcel(dirHojas, t, fr, cacheWb) {
  const fmt = fmtDe(t); if (!fmt || !dirHojas) return null;
  const base = (window.PM_FORMATOS || []).find(f => f.id === fmt.id), info = (base.hoja || {})[fr]; if (!info) return null;
  if (!cacheWb[fmt.id]) { const fh = await archivoHoja(dirHojas, base.archivo); cacheWb[fmt.id] = await (await fh.getFile()).arrayBuffer(); }
  const wb = new ExcelJS.Workbook(); await wb.xlsx.load(cacheWb[fmt.id].slice(0));
  wb.worksheets.slice().forEach(ws => { if (ws.name !== info.tab) wb.removeWorksheet(ws.id); });
  const ws = wb.getWorksheet(info.tab), o = S.ords[t.k] || {}, r = o.resp || {};
  const pon = (row, col, txt) => { const c = ws.getCell(row, col); c.value = txt; };
  const marca = (row, col, color) => { const c = ws.getCell(row, col); c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } }; c.font = Object.assign({}, c.font || {}, { bold: true, color: { argb: 'FFFFFFFF' } }); };
  pon(2, 1, 'NOMBRE DEL TECNICO: ' + nombreTec(t.tec)); pon(4, 1, 'FECHA: ' + (o.fin ? new Date(o.fin).toLocaleDateString('es-MX') : '') + ' (prog. ' + deIso(t.f).toLocaleDateString('es-MX') + ')');
  pon(4, 3, 'HORA DE INICIO : ' + hhmm(o.ini)); pon(4, 6, 'HORA DE TERMINACION : ' + hhmm(o.fin)); pon(5, 9, 'No. ORDEN DE TRABAJO: ' + (t.ot || '')); pon(5, 3, t.eq);
  (fmt.frec[fr] || []).forEach(s => s.items.forEach(it => {
    if (!it.r) return; const x = r[itemId(it)] || {};
    if (it.med) { const c1 = [3, 4, 6], c2 = [10, 11, 12]; (it.campos || []).forEach((c, i) => pon(it.r, c1[i], c + ' ' + ((x.v || [])[i] || ''))); (it.campos2 || []).forEach((c, i) => pon(it.r, c2[i], c + ' ' + ((x.v || [])[(it.campos || []).length + i] || ''))); return; }
    if (x.e === 'B') marca(it.r, 6, 'FF1E8E5A'); if (x.e === 'M') marca(it.r, 7, 'FFD32F2F'); if (x.e === 'NA') { marca(it.r, 8, 'FF8A96A3'); if (x.why) pon(it.r, 9, (it.c ? it.c + ' · ' : '') + 'N/A: ' + x.why); }
    if (x.c === 'S') marca(it.r, 13, 'FF1E8E5A'); if (x.c === 'N') marca(it.r, 14, 'FF5A6676');
  }));
  (o.adic || []).filter(a => a.v).forEach((a, i) => { const rr = (info.libres || [])[i]; if (rr) pon(rr, 2, a.v); });
  (o.hall || []).forEach((x, i) => { if (!info.srv) return; pon(info.srv + 2 + i, 1, i + 1); pon(info.srv + 2 + i, 2, x.t + ': ' + (x.d || '') + (x.ref ? ' · ' + x.ref : '') + (x.q ? ' · cant. ' + x.q : '') + (x.costo ? ' · $' + x.costo : '')); });
  if (o.obs && info.srv) pon(info.srv + 2 + (o.hall || []).length, 2, 'Observaciones: ' + o.obs);
  return wb.xlsx.writeBuffer();
}
async function cierreMes(mes) {
  if (!window.showDirectoryPicker) return toast('Usa Edge o Chrome en la PC para generar la carpeta.');
  toast('Elige la carpeta MANTENIMIENTO MENSUAL'); let dir; try { dir = await showDirectoryPicker({ id: 'mtto-mensual', mode: 'readwrite' }); } catch (x) { return; }
  const dirHojas = await carpetaHojas(false).catch(() => null);
  if (dirHojas) await cargarScript('https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js');
  const nombre = nomMes(mes).toUpperCase() + ' - Hojas de preventivo', sub = await dir.getDirectoryHandle(nombre, { create: true });
  const L = tareasMes(mes).filter(t => S.ords[t.k] && S.ords[t.k].fin), cache = {}, guardadas = new Set();
  toast('Generando ' + L.length + ' hojas con su evidencia…');
  const escribir = async (d, n, data) => { const fh = await d.getFileHandle(n.replace(/[\\/:*?"<>|]/g, ' '), { create: true }), w = await fh.createWritable(); await w.write(data); await w.close(); };
  for (const t of L) {
    const tec = await sub.getDirectoryHandle(nombreTec(t.tec).replace(/[\\/:*?"<>|]/g, ' '), { create: true }), fr = seccionesDe(fmtDe(t), t.fr).fr;
    const r = await pdfVista(t, fmtDe(t), fr); if (r) await escribir(tec, r.nombre, r.blob);
    try { const x = await llenarExcel(dirHojas, t, fr, cache); if (x) await escribir(tec, r.nombre.replace(/\.pdf$/, '.xlsx'), x); } catch (e) {}
    const o = S.ords[t.k], ids = (o.fotos || []).concat((o.hall || []).flatMap(h => h.fotos || []), Object.values(o.resp || {}).flatMap(x => x.fotos || []));
    if (ids.length) { const ev = await tec.getDirectoryHandle('Evidencias ' + r.nombre.replace(/\.pdf$/, ''), { create: true }); let i = 0; for (const id of ids) { const d = await fotoData(id); if (d) { await escribir(ev, 'foto ' + (++i) + '.jpg', await (await fetch(d)).blob()); guardadas.add(id); } } }
  }
  const { jsPDF } = window.jspdf, d = new jsPDF({ unit: 'mm', format: 'letter' }), T = tareasMes(mes);
  d.setFont('helvetica', 'bold'); d.setFontSize(15); d.text('Resumen del preventivo · ' + nomMes(mes), 12, 18); d.setFontSize(9); d.setFont('helvetica', 'normal'); d.text('Generado ' + new Date().toLocaleString('es-MX') + ' por ' + titulo(yoP().n), 12, 24);
  const I = indicadores(T);
  d.autoTable({ startY: 30, head: [['Técnico', 'Asignados', 'Terminados', 'Faltantes', 'Cumplimiento', 'Calidad', 'Calificación']], body: tecsMes(mes).map(tec => { const x = indicadores(T.filter(t => t.tec === tec)); return [nombreTec(tec), x.n, x.hechas, x.pend, x.cumpl + '%', x.calidad == null ? '—' : x.calidad + '%', x.calif]; }).concat([['TOTAL', I.n, I.hechas, I.pend, I.cumpl + '%', I.calidad == null ? '—' : I.calidad + '%', I.calif]]), styles: { fontSize: 8.5 }, headStyles: { fillColor: [14, 42, 71] } });
  d.autoTable({ startY: d.lastAutoTable.finalY + 8, head: [['Programado', 'Realizado', 'Equipo', 'Frec.', 'Técnico', 'Min', 'Calif.']], body: T.map(t => { const o = S.ords[t.k] || {}; return [fCorta(t.f), o.fin ? fCorta(o.fin.slice(0, 10)) : 'NO REALIZADO', t.eq, t.fr, corto(t.tec), o.min || '', calDe(t) == null ? '' : calDe(t)]; }), styles: { fontSize: 7.2 }, headStyles: { fillColor: [14, 42, 71] } });
  await escribir(sub, 'Resumen ' + nomMes(mes) + '.pdf', d.output('blob'));
  toast('Carpeta "' + nombre + '" lista: ' + L.length + ' hojas' + (dirHojas ? ' (Excel + PDF + fotos)' : ' (PDF + fotos; conecta la carpeta de hojas para el Excel)') + '.');
  return { guardadas, carpeta: nombre };
}

// contraseñas en Configuración: el jefe y la gerencia las ven y pueden regresarlas a la genérica
function celdaClave(k) {
  const a = S.acc[k], c = (S.claves[k] || {}).c || GEN, ver = S.verClaves[k], gen = !a || a.gen;
  return '<td style="white-space:nowrap"><span style="font-family:monospace;font-weight:800;letter-spacing:2px">' + (ver ? esc(c) : '••••••') + '</span> <button class="bt s" data-verclave="' + k + '" title="Ver">' + (ver ? '🙈' : '👁') + '</button> <button class="bt s" data-resetclave="' + k + '" title="Regresar a 000000">↺</button><br><span class="peq ' + (gen ? 'mu' : '') + '">' + (gen ? 'genérica (000000)' : 'cambió ' + fCorta(a.t.slice(0, 10)) + ((S.pers[k] || {}).tec && a.mes !== MES_HOY ? ' · <b style="color:var(--wa)">renovar este mes</b>' : '')) + '</span></td>';
}
document.addEventListener('click', async e => {
  const v = e.target.closest('[data-verclave]'); if (v) { S.verClaves[v.dataset.verclave] = !S.verClaves[v.dataset.verclave]; return render(); }
  const r = e.target.closest('[data-resetclave]'); if (r) { const k = r.dataset.resetclave; if (!confirm('¿Regresar la contraseña de ' + titulo(S.pers[k].n) + ' a 000000? Al entrar se le pedirá crear una nueva.')) return; await DB.doc('acceso/' + k).set({ h: await huellaClave(k, GEN), gen: true, mes: '', t: new Date().toISOString() }); await DB.doc('claves/' + k).set({ c: GEN, t: new Date().toISOString(), por: yoP().n }); toast('Contraseña regresada a 000000'); }
});
// ============================================================ LO DEL DÍA (vista general): qué toca hoy y quién lo hace
function vDia() {
  if (!S.diaTab) S.diaTab = HOY;
  const f = S.diaTab, d = deIso(f), T = tareasMes(f.slice(0, 7)).filter(t => t.f === f);
  const lun = iso(lunesDe(d)), atras = tareasMes(f.slice(0, 7)).filter(t => t.f >= lun && t.f < f && !hecha(t));
  const cnt = { cal: 0, term: 0, proc: 0, venc: 0, pend: 0 }; T.forEach(t => cnt[estadoT(t)]++);
  const tecs = [...new Set(T.map(t => t.tec).concat(atras.map(t => t.tec)))].sort();
  let h = '<div class="caja hoyc"><div class="fila" style="justify-content:space-between"><h2 style="margin:0">📌 ' + (f === HOY ? 'Hoy · ' : '') + fLarga(f)[0].toUpperCase() + fLarga(f).slice(1) + '</h2>' +
    '<div class="fila"><button class="bt s" data-diatab="-1" aria-label="Día anterior">‹</button>' + (f !== HOY ? '<button class="bt s" data-diatab="hoy">Hoy</button>' : '') + '<button class="bt s" data-diatab="1" aria-label="Día siguiente">›</button></div></div>';
  h += '<div class="fila" style="margin:10px 0 12px"><span class="chip">' + T.length + ' mantenimiento' + (T.length === 1 ? '' : 's') + '</span><span class="chip ok">✔ ' + (cnt.cal + cnt.term) + ' terminados</span><span class="chip wa">⏳ ' + cnt.proc + ' en proceso</span><span class="chip acc">' + (cnt.pend + cnt.venc) + ' por hacer</span><span class="chip">👷 ' + tecs.length + ' técnico' + (tecs.length === 1 ? '' : 's') + '</span>' + (atras.length ? '<span class="chip bad">' + atras.length + ' pendientes de días anteriores de la semana</span>' : '') + '</div>';
  if (!tecs.length) return h + '<div class="vacio"><span class="i">' + (d.getDay() === 6 ? '🛠️' : d.getDay() === 0 ? '😴' : '☕') + '</span>' + (d.getDay() === 6 ? 'Sábado: día para terminar los faltantes de la semana.' : 'Sin mantenimientos programados.') + '</div></div>';
  h += '<div class="hoy-g">' + tecs.map(tc => {
    const A = T.filter(t => t.tec === tc).sort((a, b) => hecha(a) - hecha(b) || a.eq.localeCompare(b.eq)), B = atras.filter(t => t.tec === tc), hh = A.filter(hecha).length, pct = A.length ? Math.round(hh / A.length * 100) : 0;
    const fila = t => { const e = estadoT(t); return '<button class="hoy-t e-' + e + '" data-abrir="' + t.k + '"><span class="mini">' + dibujo(t) + '</span><span class="nm">' + esc(t.eq) + '<small>' + esc(FR[t.fr] || t.fr) + ' · ' + (t.f !== f ? 'programado ' + fCorta(t.f) : t.min + ' min') + '</small></span><span class="chip ' + EST[e][1] + '">' + EST[e][0] + '</span></button>'; };
    return '<div class="hoy-c"><div class="hoy-h"><span class="av" style="background:' + colorTec(tc) + '">' + tc[0] + '</span><div style="flex:1;min-width:0"><b>' + esc(nombreTec(tc)) + '</b><div class="vida" style="margin-top:4px"><i data-w="' + pct + '" style="width:0;background:#1E8E5A"></i></div></div><span class="cnt">' + hh + '/' + A.length + '</span></div>' +
      A.map(fila).join('') + (B.length ? '<div class="peq" style="color:var(--bad);font-weight:700;margin:6px 2px 4px">Pendientes de días anteriores:</div>' + B.map(fila).join('') : '') + '</div>';
  }).join('') + '</div></div>';
  return h;
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-diatab]'); if (!b) return;
  if (b.dataset.diatab === 'hoy') S.diaTab = HOY;
  else { let d = sumar(deIso(S.diaTab || HOY), Number(b.dataset.diatab)); if (d.getDay() === 0) d = sumar(d, Number(b.dataset.diatab)); S.diaTab = iso(d); }
  render();
});

// ============================================================ VISTA PREVIA E IMPRESIÓN · hoja con el acomodo del Excel (sin cuadrícula) + Anexo 1 con las fotos
const CSS_HOJA = [
  '.pg{width:816px;min-height:1056px;padding:34px 32px 44px;background:#fff;color:#111;font:9.5px Arial,Helvetica,sans-serif;position:relative;box-sizing:border-box;margin:0 auto 18px;box-shadow:0 4px 18px rgba(0,0,0,.18)}',
  '.pg *{box-sizing:border-box}',
  '.pg .t1{display:grid;grid-template-columns:1fr 90px;border:1.4px solid #222}',
  '.pg .t1 div{background:#333;color:#fff;font-weight:bold;text-align:center;padding:5px 4px;font-size:12px;letter-spacing:.3px}',
  '.pg .t1 div+div{font-size:9px;display:grid;place-items:center;border-left:1px solid #777}',
  '.pg .inf{display:grid;grid-template-columns:repeat(12,1fr);border:1.4px solid #222;border-top:0}',
  '.pg .inf>div{padding:4px 5px;border-top:1px solid #DADADA;min-height:21px}',
  '.pg .inf b{font-size:8px;margin-right:4px}',
  '.pg .lt{background:#D9D9D9;border:1.4px solid #222;border-top:0;font-weight:bold;font-size:7.5px;text-align:center;padding:4px 6px}',
  '.pg .apl{background:#FFFFCC;border:1.4px solid #222;border-top:0;font-size:8px;padding:3px 6px}',
  '.pg table{width:100%;border-collapse:collapse;margin-top:6px}',
  '.pg th{background:#D9D9D9;font-size:8.5px;padding:4px 3px;border:1px solid #444}',
  '.pg td{border:1px solid #9A9A9A;padding:3px 4px;font-size:9px;vertical-align:middle}',
  '.pg td.n{text-align:center;width:22px;font-weight:bold}',
  '.pg td.o{width:28px;text-align:center;font-weight:bold;color:#777;font-size:8.5px}',
  '.pg td.o.on{color:#fff}.pg td.o.B{background:#1E8E5A}.pg td.o.M{background:#D32F2F}.pg td.o.NA{background:#7A8694}.pg td.o.S{background:#1E8E5A}.pg td.o.N{background:#5A6676}',
  '.pg tr.sc td{background:#EFEFEF;font-weight:bold;font-size:8.5px;border-color:#444}',
  '.pg td.cv{width:32%;font-size:8.5px;color:#333}',
  '.pg .why{font-style:italic;color:#8E1C1C}',
  '.pg .val{font-weight:bold;color:#0B3D91}',
  '.pg .nt{font-size:7.5px;margin-top:6px;color:#333}',
  '.pg .firmas{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;margin-top:30px;text-align:center;font-size:7.5px;font-weight:bold}',
  '.pg .firmas div{border-top:1px solid #222;padding-top:3px}.pg .firmas span{display:block;font-weight:normal;font-size:9px;margin-bottom:2px;min-height:12px}',
  '.pg .pie{position:absolute;left:32px;right:32px;bottom:16px;display:flex;justify-content:space-between;font-size:7px;color:#555}',
  '.pg .anx h1{font-size:15px;margin:10px 0 4px}.pg .anx p{margin:0 0 10px;font-size:9.5px;color:#333}',
  '.pg .fot{display:grid;grid-template-columns:1fr 1fr;gap:12px}',
  '.pg .fot figure{margin:0;border:1px solid #BBB;padding:6px}.pg .fot img{width:100%;height:270px;object-fit:contain;background:#F3F3F3}',
  '.pg .fot figcaption{font-size:8.5px;margin-top:4px}'
].join('\n');
function datosHoja(t, fmt, fr) {
  const o = t ? (S.ords[t.k] || {}) : {}, secs = fmt ? (fmt.frec[fr] || []) : [], r = o.resp || {};
  const fotos = []; secs.forEach(s => s.items.forEach(it => ((r[itemId(it)] || {}).fotos || []).forEach(id => fotos.push([id, '#' + it.n + ' · ' + (it.v || it.l || '')]))));
  (o.hall || []).forEach((x, i) => (x.fotos || []).forEach(id => fotos.push([id, 'Servicio ' + (i + 1) + ' · ' + x.t + (x.d ? ': ' + x.d : '')])));
  (o.fotos || []).forEach(id => fotos.push([id, 'Evidencia general del equipo']));
  return { o, secs, r, fotos };
}
const fImg = src => src ? '<img src="' + src + '" style="height:44px;display:block;margin:0 auto -6px">' : '<div style="height:38px"></div>';
function paginaHoja(t, fmt, fr) {
  const { o, secs, r } = datosHoja(t, fmt, fr), v = s => s ? '<span class="val">' + esc(s) + '</span>' : '';
  const marca = (on, cls, l) => '<td class="o' + (on ? ' on ' + cls : '') + '">' + l + '</td>';
  let h = '<div class="pg"><div class="t1"><div>BITÁCORA DE MANTENIMIENTO PREVENTIVO</div><div>LÍNEA ITALIA</div></div>' +
    '<div class="inf"><div style="grid-column:span 7"><b>NOMBRE DEL TÉCNICO:</b>' + v(t ? nombreTec(t.tec) : '') + '</div><div style="grid-column:span 5"><b>FRECUENCIA:</b><span style="font-weight:bold">' + esc((FR[fr] || fr || '').toUpperCase()) + '</span></div>' +
    '<div style="grid-column:span 9"><b>CATEGORÍA:</b><span style="font-weight:bold">' + esc(fmt ? fmt.tipo : '') + '</span></div><div style="grid-column:span 3"><b>PLANTA:</b>LÍNEA ITALIA</div>' +
    '<div style="grid-column:span 3"><b>FECHA:</b>' + v(o.fin ? new Date(o.fin).toLocaleDateString('es-MX') : '') + (t ? '<br><b>PROGRAMADA:</b>' + v(deIso(t.f).toLocaleDateString('es-MX')) : '') + '</div><div style="grid-column:span 3"><b>HORA DE INICIO:</b>' + v(o.ini ? hhmm(o.ini) : '') + '</div><div style="grid-column:span 3"><b>HORA DE TERMINACIÓN:</b>' + v(o.fin ? hhmm(o.fin) : '') + '</div><div style="grid-column:span 3"><b>TIEMPO REAL:</b>' + v(o.min ? o.min + ' min' : '') + '</div>' +
    '<div style="grid-column:span 6"><b>EQUIPO:</b>' + v(t ? t.eq : '') + '</div><div style="grid-column:span 3"><b>No. ORDEN DE TRABAJO:</b>' + v(t ? t.ot : '') + '</div><div style="grid-column:span 3"><b>CALIFICACIÓN:</b>' + v(o.cal != null ? String(o.cal) : '') + '</div></div>' +
    '<div class="lt">ANTES DE INICIAR: BLOQUEO Y ETIQUETADO (LOTO) DEL INTERRUPTOR PRINCIPAL, PURGAR EL AIRE DE LA MÁQUINA Y USAR EPP. CUMPLIR LAS NORMAS Y POLÍTICAS DE SEGURIDAD Y SALUD APLICABLES A LA ACTIVIDAD</div>' +
    (fmt && fmt.aplica ? '<div class="apl">APLICA A: ' + esc(fmt.aplica) + '</div>' : '');
  h += '<table><tr><th colspan="5">ACTIVIDADES DE VERIFICACIÓN</th><th colspan="3">ACTIVIDADES DE CONSERVACIÓN</th></tr>';
  secs.forEach(s => {
    h += '<tr class="sc"><td></td><td>' + esc(s.t) + '</td><td class="o">BIEN</td><td class="o">MAL</td><td class="o"></td><td></td><td class="o">SI</td><td class="o">NO</td></tr>';
    s.items.forEach(it => {
      const x = r[itemId(it)] || {};
      if (it.med) { const g1 = it.campos || [], g2 = it.campos2 || []; h += '<tr><td class="n">' + it.n + '</td><td colspan="4">' + esc(it.l) + ': ' + g1.map((c, i) => c + ' ' + (x.v && x.v[i] ? v(x.v[i]) : '______')).join('&nbsp;&nbsp; ') + '</td><td colspan="3">' + (g2.length ? esc(it.l2 || '') + ': ' + g2.map((c, i) => c + ' ' + (x.v && x.v[g1.length + i] ? v(x.v[g1.length + i]) : '______')).join('&nbsp;&nbsp; ') : '') + '</td></tr>'; return; }
      h += '<tr><td class="n">' + it.n + '</td><td>' + esc(it.v) + '</td>' + marca(x.e === 'B', 'B', 'B') + marca(x.e === 'M', 'M', 'M') + marca(x.e === 'NA', 'NA', 'NA') + '<td class="cv">' + esc(it.c || '') + (x.e === 'NA' && x.why ? '<div class="why">No aplica: ' + esc(x.why) + '</div>' : '') + '</td>' + marca(x.c === 'S', 'S', 'S') + marca(x.c === 'N', 'N', 'N') + '</tr>';
    });
  });
  const adic = (o.adic || []).filter(a => a.v), nAd = Math.max(t ? adic.length : 3, adic.length);
  h += '<tr class="sc"><td></td><td>ACTIVIDADES ADICIONALES</td><td class="o">BIEN</td><td class="o">MAL</td><td class="o"></td><td></td><td class="o">SI</td><td class="o">NO</td></tr>';
  for (let i = 0; i < nAd; i++) h += '<tr><td class="n">+' + (i + 1) + '</td><td>' + (adic[i] ? v(adic[i].v) : '&nbsp;') + '</td><td class="o">B</td><td class="o">M</td><td class="o">NA</td><td class="cv"></td><td class="o">S</td><td class="o">N</td></tr>';
  h += '</table>';
  const srv = o.hall || [], nS = Math.max(t ? srv.length : 4, srv.length, t ? 1 : 0);
  h += '<table><tr><th colspan="2">SERVICIOS A RESOLVER</th></tr><tr><th style="width:40px">REF</th><th>DESCRIPCIÓN DE LA FALLA Y/O MATERIALES REQUERIDOS</th></tr>';
  for (let i = 0; i < nS; i++) { const x = srv[i]; h += '<tr><td class="n">' + (x ? i + 1 : '') + '</td><td>' + (x ? v(x.t + ': ' + (x.d || '') + (x.ref ? ' · Refacción: ' + x.ref : '') + (x.q ? ' · Cant. ' + x.q : '') + (x.costo ? ' · $' + x.costo + ' c/u' : '')) + ((x.fotos || []).length ? ' <span style="color:#555">(ver Anexo 1)</span>' : '') : (t && !srv.length ? 'Sin servicios a resolver' : '&nbsp;')) + '</td></tr>'; }
  h += '</table>' + (o.obs ? '<div class="nt"><b>Observaciones:</b> ' + esc(o.obs) + '</div>' : '') +
    '<div class="nt">Nota: Se debe asegurar el almacenamiento y disposición responsable de los residuos generados en la actividad de acuerdo a las políticas del área de sostenibilidad.</div>' +
    '<div class="firmas"><div>' + fImg(o.firmaT) + '<span>' + esc(o.firmaN ? titulo(o.firmaN) : '') + '</span>NOMBRE Y FIRMA DEL TÉCNICO</div><div>' + fImg(o.firmaS) + '<span>' + esc(o.calN ? titulo(o.calN) : '') + '</span>NOMBRE Y FIRMA DE ENCARGADO DE MANTENIMIENTO</div><div>' + fImg(o.firmaJ) + '<span>' + esc(o.firmaJN ? titulo(o.firmaJN) : '') + '</span>NOMBRE Y FIRMA DE COORDINADOR DE MANTENIMIENTO</div></div>' +
    '<div class="pie"><span>' + esc(fmt ? fmt.id : '') + ' · ' + esc(FR[fr] || fr || '') + '</span><span>Línea Italia | Uso Interno</span><span>' + (t ? esc(t.eq) + ' · ' + fCorta(t.f) : 'Formato en blanco') + '</span></div></div>';
  return h;
}
async function paginasAnexo(t, fmt, fr) {
  const { fotos, o } = datosHoja(t, fmt, fr); if (!fotos.length) return '';
  if (o.archivado) return '<div class="pg" style="min-height:auto"><div class="t1"><div>ANEXO 1 · EVIDENCIA FOTOGRÁFICA</div><div>LÍNEA ITALIA</div></div><p style="font-size:11px;margin:14px 2px">Las ' + fotos.length + ' fotos de este preventivo se archivaron al liberar el mes en la carpeta <b>' + esc(o.archivado.carpeta || '') + '</b> (MANTENIMIENTO MENSUAL), junto con su PDF y su Excel.</p></div>';
  let h = ''; const porPag = 4;
  for (let i = 0; i < fotos.length; i += porPag) {
    const imgs = [];
    for (const [id, cap] of fotos.slice(i, i + porPag)) imgs.push('<figure><img src="' + (await fotoData(id)) + '"><figcaption>' + esc(cap) + '</figcaption></figure>');
    h += '<div class="pg"><div class="t1"><div>ANEXO 1 · EVIDENCIA FOTOGRÁFICA' + (fotos.length > porPag ? ' (' + (i / porPag + 1) + ' de ' + Math.ceil(fotos.length / porPag) + ')' : '') + '</div><div>LÍNEA ITALIA</div></div><div class="anx"><h1>' + esc(t.eq) + '</h1><p>' + esc(FR[fr] || fr) + ' · ' + esc(nombreTec(t.tec)) + ' · programado ' + fLarga(t.f) + (S.ords[t.k] && S.ords[t.k].fin ? ' · realizado ' + fechaHora(S.ords[t.k].fin) : '') + '</p></div><div class="fot">' + imgs.join('') + '</div><div class="pie"><span>' + esc(fmt ? fmt.id : '') + '</span><span>Línea Italia | Uso Interno</span><span>Anexo 1</span></div></div>';
  }
  return h;
}
async function htmlCompleto(t, fmt, fr) { return paginaHoja(t, fmt, fr) + (t ? await paginasAnexo(t, fmt, fr) : ''); }
const nombrePdf = (t, fmt, fr) => (t ? t.f + ' ' + t.eq + ' ' + (FR[fr] || fr) : (fmt ? fmt.id : 'hoja') + ' ' + (FR[fr] || fr) + ' (en blanco)').replace(/[\\/:*?"<>|·]/g, ' ').replace(/\s+/g, ' ').trim() + '.pdf';
async function abrirVista(t, fmt, fr) {
  if (!fmt) return toast('Este equipo no tiene hoja de instrucciones asignada.');
  toast('Preparando vista previa…');
  const html = await htmlCompleto(t, fmt, fr);
  $('#hoja').style.maxWidth = '900px';
  $('#hoja').innerHTML = '<style>' + CSS_HOJA + '</style><div class="fila" style="justify-content:space-between;position:sticky;top:-18px;background:#fff;z-index:2;padding:6px 0 10px"><h2 style="margin:0;color:var(--tit)">👁 Vista previa' + (t ? ' · ' + esc(t.eq) : '') + '</h2><div class="fila"><button class="bt" id="vImp">🖨 Imprimir</button><button class="bt p" id="vPdf">⬇️ Descargar PDF</button><button class="bt s" data-cerrar>✕</button></div></div><div id="vPags" style="background:#E9EDF2;padding:14px;border-radius:12px;overflow:auto">' + html + '</div>';
  $('#modal').classList.add('on');
  const c = $('#vPags'), z = Math.min(1, (c.clientWidth - 28) / 816); c.querySelectorAll('.pg').forEach(p => p.style.zoom = z);
  $('#vImp').onclick = () => imprimirHTML(html, nombrePdf(t, fmt, fr));
  $('#vPdf').onclick = async () => { toast('Generando PDF…'); const b = await pdfDeHTML(html); if (!b) return pdfHoja(t, fmt, fr); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = nombrePdf(t, fmt, fr); document.body.appendChild(a); a.click(); setTimeout(() => a.remove(), 500); };
}
function imprimirHTML(html, tit) {
  const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'; document.body.appendChild(f);
  const d = f.contentDocument; d.open(); d.write('<!doctype html><html><head><meta charset="utf-8"><title>' + esc(tit) + '</title><style>@page{size:letter;margin:0}body{margin:0}' + CSS_HOJA + '.pg{box-shadow:none;margin:0;page-break-after:always;break-after:page}</style></head><body>' + html + '</body></html>'); d.close();
  setTimeout(() => { f.contentWindow.focus(); f.contentWindow.print(); setTimeout(() => f.remove(), 2000); }, 400);
}
// PDF descargable: cada hoja se fotografía (html2canvas) en tamaño carta; si una hoja es más larga, se parte en varias páginas
async function pdfDeHTML(html) {
  try { await Promise.race([cargarScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'), new Promise((ok, mal) => setTimeout(() => mal(new Error('tiempo')), 8000))]); if (!window.html2canvas) throw new Error('sin html2canvas'); } catch (e) { return null; }   // sin internet: se usa el generador interno (pdfHoja)
  const caja = document.createElement('div'); caja.style.cssText = 'position:fixed;left:-10000px;top:0;width:816px;background:#fff'; caja.innerHTML = '<style>' + CSS_HOJA + '.pg{box-shadow:none;margin:0}</style>' + html; document.body.appendChild(caja);
  const { jsPDF } = window.jspdf, doc = new jsPDF({ unit: 'pt', format: 'letter' }), W = 612, H = 792; let primera = true;
  try {
    for (const pg of caja.querySelectorAll('.pg')) {
      const cv = await html2canvas(pg, { scale: 2, backgroundColor: '#fff' }), altoPag = Math.round(cv.width * H / W);
      for (let y = 0; y < cv.height; y += altoPag) {
        const trozo = document.createElement('canvas'); trozo.width = cv.width; trozo.height = Math.min(altoPag, cv.height - y); trozo.getContext('2d').drawImage(cv, 0, -y);
        if (!primera) doc.addPage(); primera = false;
        doc.addImage(trozo.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, W, trozo.height * W / cv.width);
      }
    }
  } finally { caja.remove(); }
  return doc.output('blob');
}
async function pdfVista(t, fmt, fr) { const b = await pdfDeHTML(await htmlCompleto(t, fmt, fr)); return b ? { blob: b, nombre: nombrePdf(t, fmt, fr) } : pdfHoja(t, fmt, fr, true); }

// ============================================================ FIRMAS: técnico (en cada orden) → supervisor → jefe de mantenimiento
// La firma del supervisor y la del jefe se guardan una vez (firmas/<nómina>) y se ponen solas al calificar o al palomear.
function pedirFirma(tit, nombre) {
  return new Promise(ok => {
    $('#hoja').style.maxWidth = '640px';
    $('#hoja').innerHTML = '<div class="fila" style="justify-content:space-between"><h2 style="margin:0;color:var(--tit)">✍️ ' + esc(tit) + '</h2><button class="bt s" id="fCan">✕</button></div><p class="peq mu" style="margin:6px 0 10px">' + esc(titulo(nombre || '')) + ' · firma con el dedo dentro del recuadro</p>' +
      '<canvas id="fCv" width="600" height="220" style="width:100%;height:auto;border:2px dashed var(--bo);border-radius:14px;background:#FAFBFD;touch-action:none;cursor:crosshair"></canvas>' +
      '<div class="fila" style="justify-content:space-between;margin-top:10px"><button class="bt" id="fBor">🧽 Borrar</button><button class="bt ok" id="fOk" style="min-height:50px">✔ Firmar</button></div>';
    $('#modal').classList.add('on');
    const cv = $('#fCv'), g = cv.getContext('2d'); let dib = false, trazos = 0, ult = null;
    g.lineWidth = 2.6; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#0B2545';
    const pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; };
    cv.onpointerdown = e => { dib = true; ult = pos(e); cv.setPointerCapture(e.pointerId); };
    cv.onpointermove = e => { if (!dib) return; const p = pos(e); g.beginPath(); g.moveTo(ult[0], ult[1]); g.lineTo(p[0], p[1]); g.stroke(); ult = p; trazos++; };
    cv.onpointerup = () => { dib = false; };
    const fin = v => { $('#modal').classList.remove('on'); $('#hoja').style.maxWidth = ''; ok(v); };
    $('#fBor').onclick = () => { g.clearRect(0, 0, cv.width, cv.height); trazos = 0; };
    $('#fCan').onclick = () => fin(null);
    $('#fOk').onclick = () => { if (trazos < 8) return toast('Haz tu firma dentro del recuadro.'); fin(cv.toDataURL('image/png')); };
  });
}
async function firmaGuardada(titulo, forzar) {
  const s = await DB.doc('firmas/' + S.nom).get(); if (s.exists && s.data().img && !forzar) return s.data().img;
  if (!forzar) { const img = firmaAuto(yoP()); await DB.doc('firmas/' + S.nom).set({ img, t: new Date().toISOString(), n: yoP().n, auto: true }); toast('Se generó tu firma y quedó guardada.'); return img; }
  const img = await pedirFirma(titulo + (forzar ? '' : ' (se guarda para las siguientes)'), yoP().n); if (!img) return null;
  await DB.doc('firmas/' + S.nom).set({ img, t: new Date().toISOString(), n: yoP().n }); return img;
}
const firmado = o => !!(o && o.firmaT && o.firmaS && o.firmaJ);
// pestaña del jefe: lista sencilla (sin animaciones) para revisar y firmar
function vFirmas() {
  const L = tareasMes(S.mes).map(t => ({ t, o: S.ords[t.k] })).filter(z => z.o && z.o.firmaT);
  const porFirmar = L.filter(z => z.o.firmaS && !z.o.firmaJ), firmados = L.filter(z => firmado(z.o)), espera = L.filter(z => !z.o.firmaS);
  let h = '<div class="caja simple"><h2>✍️ Preventivos para firma del jefe de mantenimiento <span class="r">' + nomMes(S.mes) + '</span></h2>' +
    '<p class="peq mu" style="margin:-4px 0 10px">Ya firmados por el técnico y el supervisor. Palomea los que revisaste y firma; tu firma guardada se coloca sola. <button class="bt s" id="fMia">Cambiar mi firma</button></p>' +
    (porFirmar.length ? '<div class="fila" style="margin-bottom:8px"><label class="peq"><input type="checkbox" id="fTodos"> Seleccionar todos (' + porFirmar.length + ')</label><button class="bt p" id="fFirmar">✍️ Firmar seleccionados</button></div>' +
      '<table class="tbl"><tr><th></th><th>Programado</th><th>Realizado</th><th>Equipo</th><th>Ejecutó</th><th>Revisó</th><th class="n">Calif.</th><th></th></tr>' +
      porFirmar.map(z => '<tr><td><input type="checkbox" class="fSel" value="' + esc(z.t.k) + '"></td><td>' + fCorta(z.t.f) + '</td><td>' + (z.o.fin ? fCorta(z.o.fin.slice(0, 10)) : '') + '</td><td><b>' + esc(z.t.eq) + '</b><br><span class="peq mu">' + esc(FR[z.t.fr] || z.t.fr) + '</span></td><td>' + esc(nombreTec(z.t.tec)) + '</td><td>' + esc(titulo(z.o.calN || '')) + '</td><td class="n">' + (z.o.cal != null ? z.o.cal : '') + '</td><td><button class="bt s" data-pdforden2="' + esc(z.t.k) + '">Ver</button></td></tr>').join('') + '</table>' : '<p class="mu">No hay preventivos pendientes de tu firma.</p>') + '</div>';
  h += '<div class="caja simple"><h2>⏳ Esperando firma del supervisor <span class="r">' + espera.length + '</span></h2>' + (espera.length ? '<table class="tbl"><tr><th>Equipo</th><th>Ejecutó</th><th>Terminó</th></tr>' + espera.map(z => '<tr><td>' + esc(z.t.eq) + '</td><td>' + esc(nombreTec(z.t.tec)) + '</td><td>' + fechaHora(z.o.fin) + '</td></tr>').join('') + '</table>' : '<p class="mu">Nada pendiente.</p>') + '</div>';
  h += '<div class="caja simple"><h2>✅ Firmados por los tres <span class="r">' + firmados.length + '</span></h2>' + (firmados.length ? '<table class="tbl"><tr><th>Equipo</th><th>Ejecutó</th><th>Revisó</th><th>Firmado</th></tr>' + firmados.map(z => '<tr><td>' + esc(z.t.eq) + '</td><td>' + esc(nombreTec(z.t.tec)) + '</td><td>' + esc(titulo(z.o.calN || '')) + '</td><td>' + fechaHora(z.o.firmaJT) + '</td></tr>').join('') + '</table>' : '<p class="mu">Todavía ninguno.</p>') + '</div>';
  return h;
}
document.addEventListener('click', async e => {
  if (e.target.id === 'fTodos') { document.querySelectorAll('.fSel').forEach(c => c.checked = e.target.checked); return; }
  if (e.target.id === 'fMia') return cambiarMiFirma();
  const v = e.target.closest('[data-pdforden2]'); if (v) { const t = buscarTarea(v.dataset.pdforden2); return abrirVista(t, fmtDe(t), seccionesDe(fmtDe(t), t.fr).fr); }
  if (e.target.id === 'fFirmar') {
    const sel = [...document.querySelectorAll('.fSel:checked')].map(c => c.value); if (!sel.length) return toast('Palomea los preventivos que vas a firmar.');
    const img = await firmaGuardada('Firma del jefe de mantenimiento'); if (!img) return;
    for (const k of sel) await upd('ordenes/' + k, { firmaJ: img, firmaJN: yoP().n, firmaJT: new Date().toISOString() });
    toast(sel.length + ' preventivo(s) firmados.'); render();
  }
});

// ============================================================ LIBERAR EL MES: todo terminado y firmado → se archiva y se llenan los parámetros de cada máquina
function estadoLiberacion(mes) {
  const L = tareasMes(mes), hechas = L.filter(t => S.ords[t.k] && S.ords[t.k].fin);
  return { L, hechas, sinFirma: hechas.filter(t => !firmado(S.ords[t.k])), noHechas: L.filter(t => !hecha(t)), liberado: (S.aj.liberados || {})[mes] };
}
function vLiberar() {
  const E = estadoLiberacion(S.mes), listo = !E.sinFirma.length;
  return '<div class="caja"><h2>🔓 Liberar el mes · ' + nomMes(S.mes) + (E.liberado ? ' <span class="chip ok">liberado el ' + fCorta(E.liberado.slice(0, 10)) + '</span>' : '') + '</h2>' +
    '<p>Al liberar, se genera la carpeta del mes con cada preventivo <b>llenado y firmado por el técnico, el supervisor y el jefe de mantenimiento</b> (PDF con Anexo 1 de fotos y Excel), y los datos de las hojas pasan a los <b>parámetros de cada máquina</b> (refacciones cambiadas y su duración, voltajes y corrientes).</p>' +
    '<div class="kpis" style="grid-template-columns:repeat(3,1fr)"><div class="kpi ok"><b>' + E.hechas.length + '</b><span>preventivos realizados</span></div><div class="kpi ' + (E.sinFirma.length ? 'bad' : 'ok') + '"><b>' + E.sinFirma.length + '</b><span>sin las tres firmas</span></div><div class="kpi ' + (E.noHechas.length ? 'wa' : 'ok') + '"><b>' + E.noHechas.length + '</b><span>no realizados (quedan registrados)</span></div></div>' +
    (E.sinFirma.length ? '<p class="peq" style="color:var(--bad)">Faltan firmas en: ' + E.sinFirma.slice(0, 12).map(t => esc(t.eq) + ' (' + (S.ords[t.k].firmaS ? 'jefe' : 'supervisor') + ')').join(', ') + (E.sinFirma.length > 12 ? '…' : '') + '</p>' : '') +
    '<div class="fila"><button class="bt p" data-liberar' + (listo ? '' : ' disabled') + '>🔓 Liberar y archivar el mes</button>' + selMes() + '</div></div>';
}
document.addEventListener('click', async e => {
  if (!e.target.closest('[data-liberar]')) return;
  const E = estadoLiberacion(S.mes); if (E.sinFirma.length) return toast('Todavía hay preventivos sin las tres firmas.');
  if (!confirm('¿Liberar ' + nomMes(S.mes) + '? Se genera la carpeta del mes y se actualizan los parámetros de las máquinas.')) return;
  const res = await cierreMes(S.mes); if (!res) return toast('No se generó la carpeta del mes; no se liberó.');
  await archivarFotos(S.mes, res);
  await upd('config/ajustes', { liberados: { [S.mes]: new Date().toISOString() } });
  toast(nomMes(S.mes) + ' liberado y archivado.'); render();
});

// ============================================================ HISTORIAL POR MÁQUINA (se llena solo con las hojas de los técnicos)
function historialMaquinas() {
  const M = {};
  Object.values(S.ords).forEach(o => {
    if (!o.fin) return; const t = buscarTarea(o.k); if (!t) return; const fmt = fmtDe(t), { secs } = seccionesDe(fmt, t.fr), f = o.fin.slice(0, 10);
    const m = M[t.eq] = M[t.eq] || { eq: t.eq, cat: t.cat, ref: [], med: [] };
    (o.hall || []).filter(x => /cambi/i.test(x.t)).forEach(x => m.ref.push({ f, ref: x.ref || x.d, d: x.d, q: x.q, costo: Number(x.costo) || 0, tec: t.tec, fotos: (x.fotos || []).length }));
    secs.forEach(s => s.items.forEach(it => { if (!it.med) return; const x = (o.resp || {})[itemId(it)]; if (!x || !(x.v || []).some(v => v)) return; const cams = (it.campos || []).map(c => it.l + ' ' + c).concat((it.campos2 || []).map(c => (it.l2 || '') + ' ' + c)); m.med.push({ f, sec: s.t, l: it.l, cams, v: x.v, tec: t.tec }); }));
  });
  Object.values(M).forEach(m => {
    m.ref.sort((a, b) => a.f.localeCompare(b.f));
    const ult = {}; m.ref.forEach(r => { const k = norm(r.ref); r.dur = ult[k] ? diasEntre(ult[k], r.f) : null; ult[k] = r.f; });
    m.med.sort((a, b) => a.f.localeCompare(b.f));
  });
  return Object.values(M).filter(m => m.ref.length || m.med.length).sort((a, b) => (a.cat || '').localeCompare(b.cat || '') || a.eq.localeCompare(b.eq));
}
function pHistorial() {
  const H = historialMaquinas();
  if (!H.length) return '<div class="caja vacio"><span class="i">🧾</span>Todavía no hay historial: se llena solo cuando los técnicos anotan refacciones cambiadas y lecturas de voltaje y corriente en sus hojas.</div>';
  const cats = [...new Set(H.map(m => m.cat))];
  return cats.map(c => '<div class="caja"><h2><span class="chip" style="background:' + ((CAT[c] || [])[1] || '#888') + '22;color:' + ((CAT[c] || [])[1] || '#333') + '">' + esc(c) + '</span> ' + esc((CAT[c] || [c])[0]) + '</h2>' + H.filter(m => m.cat === c).map(m =>
    '<div class="semana"><span style="width:44px;height:36px;display:inline-grid;place-items:center">' + dibujo(m) + '</span>' + esc(m.eq) + ' <span class="chip">' + m.ref.length + ' refacción(es)</span><span class="chip acc">' + m.med.length + ' lectura(s)</span></div>' +
    (m.ref.length ? '<div class="scroll"><table class="tbl"><tr><th>Fecha</th><th>Refacción cambiada</th><th class="n">Cant.</th><th class="n">Costo</th><th class="n">Duró</th><th>Técnico</th></tr>' + m.ref.map(r => '<tr><td>' + fCorta(r.f) + '</td><td>' + esc(r.ref) + (r.d && r.d !== r.ref ? '<br><span class="peq mu">' + esc(r.d) + '</span>' : '') + (r.fotos ? ' <span class="chip">📷</span>' : '') + '</td><td class="n">' + esc(r.q || '') + '</td><td class="n">' + (r.costo ? dinero(r.costo * (Number(r.q) || 1)) : '—') + '</td><td class="n">' + (r.dur != null ? r.dur + ' días' : 'primer cambio') + '</td><td>' + esc(corto(r.tec)) + '</td></tr>').join('') + '</table></div>' : '') +
    (m.med.length ? '<div class="scroll"><table class="tbl"><tr><th>Fecha</th><th>Lectura</th>' + m.med[0].cams.map(c => '<th class="n">' + esc(c) + '</th>').join('') + '<th>Técnico</th></tr>' + m.med.map(x => '<tr><td>' + fCorta(x.f) + '</td><td class="peq">' + esc(x.sec) + '</td>' + x.cams.map((c, i) => '<td class="n">' + esc((x.v || [])[i] || '—') + '</td>').join('') + '<td>' + esc(corto(x.tec)) + '</td></tr>').join('') + '</table></div>' : '')).join('') + '</div>').join('');
}

// ============================================================ ARCHIVO DE FOTOS: al liberar el mes, las fotos ya guardadas en la carpeta del mes se borran de la app
const fotosDeOrden = o => [...new Set((o.fotos || []).concat((o.hall || []).flatMap(h => h.fotos || []), Object.values(o.resp || {}).flatMap(x => (x && x.fotos) || [])))];
async function archivarFotos(mes, res) {
  let borradas = 0, quedan = 0;
  for (const t of tareasMes(mes)) {
    const o = S.ords[t.k]; if (!o || !o.fin || o.archivado) continue;
    const ids = fotosDeOrden(o), ok = ids.filter(id => res.guardadas.has(id)); quedan += ids.length - ok.length;
    for (const id of ok) { try { await DB.doc('fotos/' + id).delete(); delete cacheFoto[id]; borradas++; } catch (e) { quedan++; } }
    if (ids.length && ok.length === ids.length) await upd('ordenes/' + t.k, { archivado: { t: new Date().toISOString(), carpeta: res.carpeta, n: ids.length } });
  }
  toast(borradas + ' foto(s) archivadas en la carpeta y borradas de la app' + (quedan ? ' · ' + quedan + ' no se pudieron guardar y se quedan en la app' : '') + '.');
  return { borradas, quedan };
}
// ============================================================ CALIFICACIÓN SEMANAL DEL SUPERVISOR (la ve el jefe)
// Cada semana (lunes a sábado) empieza en 100. Baja por: preventivo que el técnico no realizó en su semana, preventivo realizado
// que el supervisor no evaluó y firmó a tiempo (48 h), y atrasos de semanas anteriores que siguen abiertos al cierre de la semana.
const PESO_J = { noReal: 2, noEval: 2, arrastre: 1 };
function evaluadoATiempo(t, o, limite) {
  if ((t.ej || 0) > 0 && (!o || o.cal == null)) return true;                    // calificado en el Excel
  if (!o || o.cal == null || !o.calT || !o.fin) return false;
  return (new Date(o.calT) - new Date(o.fin)) <= 48 * 36e5 && o.calT <= limite;
}
function califJassoSemanas(mes) {
  const L = tareasMes(mes), [y, m] = mes.split('-').map(Number), ini = lunesDe(new Date(y, m - 1, 1)), fin = new Date(y, m, 0), sem = [];
  for (let w = new Date(ini); w <= fin; w = sumar(w, 7)) {
    const lun = iso(w), sab = iso(sumar(w, 5)), cierre = iso(sumar(w, 7)) + 'T23:59', cerrada = sab < HOY, limEval = new Date(new Date(sab + 'T23:59').getTime() + 48 * 36e5).toISOString();
    const T = L.filter(t => t.f >= lun && t.f <= sab); if (!T.length) continue;
    const real = T.filter(t => { const o = S.ords[t.k]; return (o && o.fin && o.fin.slice(0, 10) <= sab) || (t.ej || 0) > 0; });
    const noReal = cerrada ? T.length - real.length : 0;
    const aTiempo = real.filter(t => evaluadoATiempo(t, S.ords[t.k], limEval));
    const evalVencida = new Date().toISOString() > limEval;
    const noEval = evalVencida ? real.length - aTiempo.length : real.filter(t => { const o = S.ords[t.k]; return o && o.fin && Date.now() - new Date(o.fin) > 48 * 36e5 && !evaluadoATiempo(t, o, new Date().toISOString()); }).length;
    const previas = L.filter(t => t.f < lun), arrastre = !cerrada ? 0 : previas.filter(t => { const o = S.ords[t.k]; if ((t.ej || 0) > 0) return false; if (!o || !o.fin || o.fin.slice(0, 10) > sab) return true; return o.cal == null || (o.calT && o.calT.slice(0, 10) > sab); }).length;
    const puntos = Math.max(0, 100 - PESO_J.noReal * noReal - PESO_J.noEval * noEval - PESO_J.arrastre * arrastre);
    sem.push({ lun, sab, cerrada, futura: lun > HOY, prog: T.length, real: real.length, aTiempo: aTiempo.length, noReal, noEval, arrastre, puntos: lun > HOY ? null : puntos });
  }
  const val = sem.filter(s => !s.futura);
  return { sem, prom: val.length ? Math.round(val.reduce((s, x) => s + x.puntos, 0) / val.length) : null };
}
function tablaSemanasJasso(CJ) {
  return '<div class="caja simple"><h2>📅 Calificación semana por semana <span class="r">promedio del mes: <span class="nota ' + notaCls(CJ.prom) + '">' + (CJ.prom == null ? '—' : CJ.prom) + '</span></span></h2><div class="scroll"><table class="tbl"><tr><th>Semana</th><th class="n">Programados</th><th class="n">Realizados en su semana</th><th class="n">Evaluados y firmados a tiempo</th><th class="n">No realizados (−' + PESO_J.noReal + ')</th><th class="n">Sin evaluar a tiempo (−' + PESO_J.noEval + ')</th><th class="n">Atraso de semanas anteriores (−' + PESO_J.arrastre + ')</th><th class="n">Calificación</th></tr>' +
    CJ.sem.map(s => '<tr><td>' + fCorta(s.lun) + ' al ' + fCorta(s.sab) + (s.futura ? ' <span class="chip">por venir</span>' : s.cerrada ? '' : ' <span class="chip acc">en curso</span>') + '</td><td class="n">' + s.prog + '</td><td class="n">' + s.real + '</td><td class="n">' + s.aTiempo + '</td><td class="n">' + (s.noReal ? '<span class="chip bad">' + s.noReal + '</span>' : '0') + '</td><td class="n">' + (s.noEval ? '<span class="chip bad">' + s.noEval + '</span>' : '0') + '</td><td class="n">' + (s.arrastre ? '<span class="chip wa">' + s.arrastre + '</span>' : '0') + '</td><td class="n">' + (s.futura ? '—' : '<span class="nota ' + notaCls(s.puntos) + '">' + s.puntos + '</span>') + '</td></tr>').join('') + '</table></div><p class="peq mu" style="margin:8px 0 0">Se recalcula sola cada vez que se abre. La semana en curso solo descuenta lo que ya se venció.</p></div>';
}

// ============================================================ FIRMA GENERADA: nombre manuscrito + trazo grande de la inicial del apellido
function firmaAuto(p) {
  const partes = titulo(p.firmaTxt || ((window.LI_PERSONAL_INICIAL || {})[S.nom] || {}).firmaTxt || '').split(' ').filter(Boolean), tok = titulo(p.n || '').split(' ').filter(Boolean);
  const nombre = partes.length ? partes[0] : (tok.length > 2 ? tok[0] : tok[0] || ''), apellido = partes.length > 1 ? partes[1] : (tok.length > 2 ? tok[tok.length - 2] : tok[1] || '');
  const cv = document.createElement('canvas'); cv.width = 600; cv.height = 200; const g = cv.getContext('2d');
  g.strokeStyle = g.fillStyle = '#0B2545'; g.lineCap = 'round'; g.lineJoin = 'round';
  const letra = 'italic 600 64px "Segoe Script", "Brush Script MT", "Lucida Handwriting", cursive';
  g.font = '700 150px "Segoe Script", "Brush Script MT", "Lucida Handwriting", cursive'; g.globalAlpha = .9; g.fillText((apellido[0] || '').toUpperCase(), 330, 150); g.globalAlpha = 1;
  g.font = letra; g.fillText(nombre, 40, 120);
  const w = g.measureText(nombre).width;
  g.lineWidth = 3.2; g.beginPath(); g.moveTo(30, 150); g.bezierCurveTo(140, 132, 260, 168, 330 + 40, 140); g.bezierCurveTo(420, 118, 470, 160, 560, 128); g.stroke();
  g.lineWidth = 2.2; g.beginPath(); g.moveTo(40 + w * 0.15, 96); g.quadraticCurveTo(40 + w * 0.6, 60, 40 + w + 30, 84); g.stroke();
  return cv.toDataURL('image/png');
}
async function cambiarMiFirma() {
  const auto = firmaAuto(yoP());
  $('#hoja').innerHTML = '<div class="fila" style="justify-content:space-between"><h2 style="margin:0;color:var(--tit)">✍️ Tu firma</h2><button class="bt s" data-cerrar>✕</button></div><p class="peq mu">Firma generada con tu nombre y la inicial de tu apellido. Puedes usarla o dibujar la tuya.</p><img src="' + auto + '" style="width:100%;max-width:520px;border:1px solid var(--bo);border-radius:12px;background:#fff;display:block;margin:0 auto"><div class="fila" style="justify-content:flex-end;margin-top:12px"><button class="bt" id="fDib">✏️ Dibujar mi firma</button><button class="bt p" id="fUsar">✔ Usar esta firma</button></div>';
  $('#modal').classList.add('on');
  $('#fUsar').onclick = async () => { await DB.doc('firmas/' + S.nom).set({ img: auto, t: new Date().toISOString(), n: yoP().n, auto: true }); $('#modal').classList.remove('on'); toast('Firma guardada.'); };
  $('#fDib').onclick = async () => { const f = await firmaGuardada('Tu firma', true); if (f) toast('Firma guardada.'); };
}
// ============================================================ ENLACE CON EL ORGANIGRAMA (calificación de preventivo)
// apps/organigrama/meses/<AAAA-MM>.ord[<id de la persona>] = { prog, cump, cal, cumpl, calidad, fuente:'preventivo' }
// El Organigrama usa "cal" como % de preventivo (60 % de la calificación integral junto con 40 % de paros).
function datosOrganigrama(mes) {
  const L = tareasMes(mes), filas = [];
  Object.entries(S.pers).forEach(([nom, p]) => {
    if (p.a === false) return;
    if (p.tec) { const T = L.filter(t => t.tec === p.tec); if (!T.length) return; const I = indicadores(T), debidas = T.filter(t => semanaCerrada(t.f) || hecha(t)).length;
      filas.push({ nom, n: p.n, rol: 'Técnico', prog: debidas, cump: I.hechas, cumpl: I.cumpl, calidad: I.calidad, cal: I.calif }); }
    else if (p.califica && !p.otorga) { const CJ = califJassoSemanas(mes), I = indicadores(L), debidas = L.filter(t => semanaCerrada(t.f) || hecha(t)).length;
      filas.push({ nom, n: p.n, rol: 'Supervisor', prog: debidas, cump: I.hechas, cumpl: I.cumpl, calidad: I.calidad, cal: CJ.prom }); }
  });
  return filas;
}
function vOrganigrama() {
  const F = datosOrganigrama(S.mes), env = (S.aj.organigrama || {})[S.mes];
  return '<div class="caja simple"><h2>🔗 Calificación de preventivo → Organigrama <span class="r">' + (env ? 'enviado ' + fechaHora(env) : 'sin enviar') + '</span></h2>' +
    '<p class="peq mu" style="margin:-4px 0 10px">Esta calificación pasa al Organigrama (Calificación y paros) como el % de preventivo de cada persona: 60 % de su calificación integral, junto con el 40 % de paros. Técnicos: promedio de cumplimiento y calidad. Supervisor: promedio de su calificación semanal.' + '' + '</p>' +
    '<table class="tbl"><tr><th>Nómina</th><th>Nombre</th><th>Puesto</th><th class="n">Programadas</th><th class="n">Cumplidas</th><th class="n">Cumplimiento</th><th class="n">Calidad</th><th class="n">Calificación → Organigrama</th></tr>' +
    F.map(f => '<tr><td>' + f.nom + '</td><td>' + esc(titulo(f.n)) + '</td><td>' + f.rol + '</td><td class="n">' + f.prog + '</td><td class="n">' + f.cump + '</td><td class="n">' + f.cumpl + '%</td><td class="n">' + (f.calidad == null ? '—' : f.calidad + '%') + '</td><td class="n"><span class="nota ' + notaCls(f.cal) + '">' + (f.cal == null ? '—' : f.cal) + '</span></td></tr>').join('') + '</table>' +
    '<p class="peq" style="margin:8px 0 0;color:#9A6B00">Vista previa: el envío al Organigrama está desactivado para no modificar esa app; se conecta solo cuando el Ing. Omar lo indique.</p></div>';
}
async function enviarOrganigrama(mes, silencioso) {
  if (window.DEMO || typeof firebase === 'undefined') { if (!silencioso) toast('En modo prueba no se envía al Organigrama.'); return; }
  try {
    const fs = firebase.firestore(), g = await fs.doc('apps/organigrama/config/general').get(), gente = (g.exists && g.data().personal) || [];
    const idDe = nom => (gente.find(p => String(p.nomina || '').trim() === String(nom)) || {}).id, ord = {};
    datosOrganigrama(mes).forEach(f => { const id = idDe(f.nom); if (id && f.cal != null) ord[id] = { prog: f.prog, cump: f.cump, cal: f.cal, cumpl: f.cumpl, calidad: f.calidad, fuente: 'preventivo', t: new Date().toISOString() }; });
    if (!Object.keys(ord).length) { if (!silencioso) toast('No hubo coincidencias de nómina con el Organigrama.'); return; }
    await fs.doc('apps/organigrama/meses/' + mes).set({ ord }, { merge: true });
    await upd('config/ajustes', { organigrama: { [mes]: new Date().toISOString() } });
    if (!silencioso) toast('Calificaciones enviadas al Organigrama (' + Object.keys(ord).length + ' personas).');
  } catch (e) { if (!silencioso) toast('No se pudo enviar al Organigrama: ' + (e.code || e.message) + ' (la cuenta de este equipo debe estar dada de alta en el Organigrama).'); }
}
document.addEventListener('click', e => { if (e.target.id === 'bOrg') enviarOrganigrama(S.mes, false); });
