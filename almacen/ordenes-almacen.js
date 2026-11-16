/* Almacén · REGLA DE SALIDAS (Ing. Omar, 16-nov-2026): ninguna refacción sale sin estar ligada a
 *   🛑 un paro / falla de Control de Paros · 📐 un requerimiento (producción o áreas generales) · 🏢 una solicitud de áreas generales
 *   🛠️ un preventivo · 📋 una orden de material.
 * Órdenes de material (apps/almacen/ordenes): el técnico arma la lista de material ligada a su paro, requerimiento o preventivo y se surte desde aquí.
 * Solo LEE Control de Paros y Mantenimiento Preventivo; no los modifica. */
(function () {
  'use strict';
  const FU = { t: 0, lista: [], err: [], cargando: null }, ORD = { L: [], sub: false, borr: null, ver: '' };
  // ---------- quién puede RETIRAR material (Ing. Omar): técnicos de mantenimiento, jefe, gerente, Humberto y su auxiliar, director
  const RET_DEF = ['1162', '4237', '4573', '4643', '4647', '4695', '4698', '4767', '4768', '4781', '3626', '2000'];   // 2000 = Marisela Martínez (mantenimiento)
  const RET = { n: null };
  const puedeRetirar = nom => { nom = String(nom || '').trim(); const L = RET.n || RET_DEF.reduce((a, k) => (a[k] = true, a), {}); return !!L[nom]; };
  const codigoRx = /^(PA|RQ|AG|PV|OM)-?\d{4}$/i;
  const normCod = s => { const m = String(s || '').trim().toUpperCase().match(/^([A-Z]{2})-?(\d{4})$/); return m ? m[1] + '-' + m[2] : String(s || '').trim().toUpperCase(); };
  let ORIGEN_ACTUAL = null;
  const TIPOS = { paro: ['🛑', 'Paro / falla de máquina', '#C62828'], req: ['📐', 'Requerimiento', '#1F6FD1'], ag: ['🏢', 'Áreas generales', '#D35AA0'], prev: ['🛠️', 'Preventivo', '#1E8E5A'], orden: ['📋', 'Orden de material', '#E0A100'] };
  const fCorta = iso => { if (!iso) return ''; const d = new Date(iso); return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }); };
  const mesHoy = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
  // ---------- fuentes: paros, requerimientos, áreas generales, preventivos y órdenes abiertas
  function cargarFuentes(forzar) {
    if (FU.cargando) return FU.cargando; if (!forzar && Date.now() - FU.t < 120000 && FU.lista.length) return Promise.resolve(FU.lista);
    const fs = (typeof firebase !== 'undefined') ? firebase.firestore() : null; if (!fs) return Promise.resolve([]);
    const hace = d => new Date(Date.now() - d * 864e5).toISOString(), L = [], err = [];
    const p1 = fs.collection('apps/paros/eventos').orderBy('t0', 'desc').limit(80).get().then(q => q.docs.forEach(d => { const e = d.data(); if (e.prueba || !e.t0 || e.t0 < hace(20)) return;
      L.push({ tipo: 'paro', id: d.id, maq: e.maqN || e.maq || '', txt: 'Paro · ' + (e.maqN || e.maq || '') + ' · ' + (e.falla || e.tipo || '') + ' · ' + fCorta(e.t0) + (e.estado === 'liberada' ? ' (liberada)' : ''), t: e.t0, abierto: e.estado !== 'liberada' }); })).catch(e => err.push('Control de Paros'));
    const p2 = fs.collection('apps/paros/ag').where('t0', '>=', hace(60)).get().then(q => q.docs.forEach(d => { const r = d.data(); if (r.estado === 'cerrada') return; const req = !!r.req;
      L.push({ tipo: req ? 'req' : 'ag', id: d.id, maq: r.maqN || r.eqN || '', area: r.ubic || '', txt: (req ? 'Requerimiento · ' : 'Áreas generales · ') + (r.eqN || r.maqN || '') + ' · ' + String(r.desc || '').slice(0, 60) + ' · ' + fCorta(r.t0), t: r.t0, abierto: true }); })).catch(e => err.push('Áreas generales / requerimientos'));
    const p3 = fs.collection('apps/preventivo/ordenes').where('mes', '==', mesHoy()).get().then(q => q.docs.forEach(d => { const o = d.data(); if (!o.ini || (o.fin && Date.now() - new Date(o.fin) > 2 * 864e5)) return;
      L.push({ tipo: 'prev', id: d.id, maq: o.eq || '', txt: 'Preventivo · ' + (o.eq || '') + ' · ' + (o.tec || '') + (o.fin ? ' (terminado)' : ' (en proceso)'), t: o.ini, abierto: !o.fin }); })).catch(e => err.push('Mantenimiento Preventivo'));
    FU.cargando = Promise.all([p1, p2, p3]).then(() => { L.sort((a, b) => (b.abierto - a.abierto) || String(b.t).localeCompare(String(a.t))); FU.lista = L; FU.err = err; FU.t = Date.now(); FU.cargando = null; return L; });
    return FU.cargando;
  }
  function opcionesOrigen(sel, conOrdenes) {
    const grupos = ['orden', 'paro', 'req', 'ag', 'prev'], L = FU.lista.slice();
    if (conOrdenes) ORD.L.filter(o => o.estado === 'abierta' || o.estado === 'parcial').forEach(o => L.unshift({ tipo: 'orden', id: o.id, maq: (o.origen || {}).maq || '', txt: o.folio + ' · ' + ((o.origen || {}).txt || '') + ' · ' + (o.tecN || ''), t: o.t, abierto: true }));
    ORIG_MAP = {}; let h = '<option value="">— ¿Para qué es? (obligatorio) —</option>';
    grupos.forEach(g => { const G = L.filter(x => x.tipo === g); if (!G.length) return; h += '<optgroup label="' + TIPOS[g][0] + ' ' + TIPOS[g][1] + '">' + G.map(x => { const v = x.tipo + ':' + x.id; ORIG_MAP[v] = x; return '<option value="' + esc(v) + '"' + (v === sel ? ' selected' : '') + '>' + esc(x.txt) + '</option>'; }).join('') + '</optgroup>'; });
    return h;
  }
  let ORIG_MAP = {};
  // ---------- 1) salida desde la ficha: origen obligatorio
  function inyectarOrigen() {
    const f = document.getElementById('fMov'); if (!f || S.tipo !== 'S' || document.getElementById('mvOrigen')) return;
    const w = document.createElement('label'); w.className = 'f origenF'; w.innerHTML = '¿Para qué es? * <span class="foot">(sin paro, requerimiento, preventivo u orden no sale material)</span><select id="mvOrigen" required><option>Cargando paros, requerimientos y preventivos…</option></select><span class="foot" id="mvOrigenMsg"></span>';
    const g = f.querySelector('.g2') || f.querySelector('#mvLim'); if (g) g.before(w); else f.prepend(w);
    cargarFuentes().then(() => { const s = document.getElementById('mvOrigen'); if (!s) return; s.innerHTML = opcionesOrigen('', true); const m = document.getElementById('mvOrigenMsg'); if (m) m.textContent = FU.err.length ? '⚠️ No se pudo leer: ' + FU.err.join(', ') + ' (la cuenta de este equipo debe estar dada de alta ahí).' : (FU.lista.length ? '' : 'No hay paros, requerimientos ni preventivos abiertos. Pide primero la orden en Control de Paros o en el preventivo.'); });
    w.addEventListener('change', () => { const o = ORIG_MAP[(document.getElementById('mvOrigen') || {}).value]; if (!o) return; const mq = document.getElementById('mvMaq'), ar = document.getElementById('mvArea'); if (mq && !mq.value && o.maq) mq.value = String(o.maq).toUpperCase(); if (ar && !ar.value && o.area) ar.value = o.area; });
  }
  // Opción 1 (Ing. Omar, 16-nov-2026): NO hay salida directa desde la ficha; todo material sale solo con código de orden (PA/RQ/AG/PV).
  function sinSalidaDirecta() {
    const f = document.getElementById('fMov'); if (!f || S.tipo !== 'S' || f.dataset.bloq) return; f.dataset.bloq = '1';
    const seg = f.querySelector('.seg'), segH = seg ? seg.outerHTML : '';   // el selector Salida / Entrada se conserva (las entradas siguen igual)
    f.innerHTML = '<h3>' + (segH ? 'Registrar movimiento' : '📤 Salida de material') + '</h3>' + segH + '<div class="soloOrden"><b>El material sale solo con código de orden</b><span>El técnico genera su orden en <b>Control de Paros</b> (paro, requerimiento o área general) o en el <b>Preventivo</b>, y aquí se teclea su código.</span>' +
      '<div class="soloOrdenB"><button type="button" class="codBtn" id="soCod">🔢 Código de orden</button></div></div>';
    f.querySelector('#soCod').addEventListener('click', () => { const v = prompt('Código de la orden de material (ej. PA-4821):', ''); if (v && v.trim()) { if (typeof closeItem === 'function') closeItem(); abrirOrdenCodigo(v); } });
  }
  function envolverDrawer() { if (typeof renderDrawer !== 'function' || renderDrawer._ord) return; const base = renderDrawer; window.renderDrawer = function () { const r = base.apply(this, arguments); try { sinSalidaDirecta(); } catch (e) {} return r; }; window.renderDrawer._ord = true; }
  function envolverGuardar() {
    if (typeof guardarMov !== 'function' || guardarMov._ord) return; const base = guardarMov;
    window.guardarMov = async function () {
      if (S.tipo === 'S') { const msg = document.getElementById('mMov'); if (msg) { msg.className = 'msg err'; msg.textContent = '⛔ El material sale solo con código de orden.'; } return; }
      if (false) {
        const v = (document.getElementById('mvOrigen') || {}).value, o = ORIG_MAP[v], msg = document.getElementById('mMov');
        if (!o) { if (msg) { msg.className = 'msg err'; msg.textContent = '⛔ Elige para qué es la refacción: un paro, requerimiento, área general, preventivo u orden de material. Sin eso no se puede sacar material del almacén.'; } return; }
        const quien = S.isAdmin ? ((document.getElementById('mvNomina') || {}).value || '') : ((S.yo || {}).nomina || '');
        if (!puedeRetirar(quien)) { if (msg) { msg.className = 'msg err'; msg.textContent = '⛔ La nómina ' + (quien || '—') + ' no está autorizada para retirar material. Solo técnicos de mantenimiento, jefe, gerente, nuevos proyectos y dirección (Personal y accesos → 🔐 Retira material).'; } return; }
        ORIGEN_ACTUAL = { tipo: o.tipo, id: o.id, txt: o.txt };
        const n = document.getElementById('mvN'); if (n && !n.value) n.value = o.txt.slice(0, 90);
      }
      try { return await base.apply(this, arguments); } finally { ORIGEN_ACTUAL = null; }
    }; window.guardarMov._ord = true;
  }
  function envolverDB() {   // cada movimiento de salida guarda su origen
    if (typeof db === 'undefined' || !db || db._ord) return; const col = db.collection.bind(db);
    db.collection = function (nombre) { const c = col(nombre); if (nombre === 'movimientos' && c && c.add) { const add = c.add.bind(c); c.add = d => add(Object.assign({}, d, (ORIGEN_ACTUAL && d && d.tipo === 'S') ? { origen: ORIGEN_ACTUAL } : {})); } return c; };
    db._ord = true;
  }
  // ---------- 2) pestaña Órdenes de material
  function montarTab() {
    const nav = document.querySelector('nav.tabs'); if (!nav || nav.querySelector('[data-tab="ord"]')) return;
    const b = document.createElement('button'); b.setAttribute('role', 'tab'); b.dataset.tab = 'ord'; b.setAttribute('aria-selected', 'false'); b.innerHTML = '📋 Órdenes de material <span class="badge-n" id="tabOrd" hidden>0</span>';
    const ref = nav.querySelector('[data-tab="est"]'); nav.insertBefore(b, ref ? ref.nextSibling : null);
    const sec = document.createElement('section'); sec.id = 'v-ord'; sec.hidden = true; sec.style.cssText = 'display:flex;flex-direction:column;gap:12px';
    const ex = document.getElementById('v-exist'); ex.parentNode.insertBefore(sec, ex.nextSibling);
    if (typeof setTab === 'function' && !setTab._ord) { const base = setTab; window.setTab = function (t) { const r = base.apply(this, arguments); const s = document.getElementById('v-ord'); if (s) s.hidden = t !== 'ord'; if (t === 'ord') renderOrd(); return r; }; window.setTab._ord = true; }
  }
  function suscribirOrdenes() {
    if (ORD.sub || typeof db === 'undefined' || !db) return; ORD.sub = true;
    db.collection('ordenes').onSnapshot(q => { ORD.L = q.docs.map(d => Object.assign({ id: d.id }, d.data())).sort((a, b) => String(b.t).localeCompare(String(a.t)));
      const ab = ORD.L.filter(o => o.estado === 'abierta' || o.estado === 'parcial').length, tb = document.getElementById('tabOrd'); if (tb) { tb.hidden = !ab; tb.textContent = ab; }
      if (S.tab === 'ord') renderOrd(); }, () => {});
  }
  const itemDe = l => S.items[l.doc + '/' + l.k];
  function estadoOrden(o) { const L = o.lineas || []; if (o.estado === 'cancelada') return 'cancelada'; const tot = L.reduce((a, l) => a + (+l.q || 0), 0), sal = L.reduce((a, l) => a + Math.min(+l.qs || 0, +l.q || 0), 0); return !sal ? 'abierta' : sal >= tot ? 'surtida' : 'parcial'; }
  const EST_O = { abierta: ['⏳ Por surtir', '#E0A100'], parcial: ['◐ Surtida en parte', '#1F6FD1'], surtida: ['✅ Surtida', '#1E8E5A'], cancelada: ['✕ Cancelada', '#5A6676'] };
  function renderOrd() {
    const sec = document.getElementById('v-ord'); if (!sec) return; const yo = S.yo || {}, A = S.isAdmin;
    const vis = ORD.L.filter(o => A || String(o.tec) === String(yo.nomina)), ab = vis.filter(o => ['abierta', 'parcial'].includes(o.estado)), resto = vis.filter(o => !['abierta', 'parcial'].includes(o.estado)).slice(0, 30);
    let h = '<div class="oHero"><div><b>📋 Órdenes de material</b><span>Ninguna refacción sale sin estar ligada a un <b>paro</b>, <b>requerimiento</b>, <b>área general</b> o <b>preventivo</b>. Las órdenes las genera el técnico en <b>Control de Paros</b> o en el <b>Preventivo</b>; aquí se teclea o escanea su código y se surte.</span></div></div>';
    h += '<div class="oCod"><label>🔢 Código de orden<input id="oCodIn" placeholder="Ej. PA-4821" value="' + esc(ORD.ver) + '" autocomplete="off" class="mono"></label><button type="button" class="primary" id="oCodIr">Buscar orden</button>' + (ORD.ver ? '<button type="button" id="oCodX">✕ Ver todas</button>' : '') + '<span class="foot">El técnico genera la orden en Control de Paros o en el Preventivo; teclea su código o escanea su QR.</span></div>';
    h += '<div id="oForm"></div>';
    if (ORD.ver) { const o = ORD.L.find(x => x.folio === ORD.ver); h += o ? '<h3 class="oTit">Orden ' + esc(o.folio) + '</h3><div class="oGrid">' + tarjeta(o) + '</div>' : '<div class="banner">No existe la orden ' + esc(ORD.ver) + '. Revisa el código.</div>'; sec.innerHTML = h; if (ORD.borr) pintarForm(); return; }
    h += '<h3 class="oTit">Por surtir <span>' + ab.length + '</span></h3><div class="oGrid">' + (ab.length ? ab.map(tarjeta).join('') : '<div class="empty">No hay órdenes por surtir.</div>') + '</div>';
    if (resto.length) h += '<h3 class="oTit">Recientes</h3><div class="oGrid">' + resto.map(tarjeta).join('') + '</div>';
    sec.innerHTML = h; if (ORD.borr) pintarForm();
  }
  function tarjeta(o) {
    const st = EST_O[o.estado] || EST_O.abierta, og = o.origen || {}, tp = TIPOS[og.tipo] || TIPOS.orden, A = S.isAdmin, puede = (A || String(o.tec) === String((S.yo || {}).nomina)) && ['abierta', 'parcial'].includes(o.estado);
    return '<div class="oCard" style="--c:' + tp[2] + '"><div class="oH"><b class="mono">' + esc(o.folio) + '</b><span class="oEst" style="background:' + st[1] + '">' + st[0] + '</span></div>' +
      '<div class="oOr">' + tp[0] + ' ' + esc(og.txt || '') + '</div><div class="oMeta">👷 ' + esc(o.tecN || o.tec || '') + ' · ' + fCorta(o.t) + (o.nota ? ' · ' + esc(o.nota) : '') + '</div>' +
      '<table class="oT"><tr><th>Refacción</th><th>Pide</th><th>Salió</th><th>Hay</th><th></th></tr>' + (o.lineas || []).map((l, i) => { const it = l.otro ? null : itemDe(l), hay = it ? ex(it) : 0, falta = (+l.q || 0) - (+l.qs || 0);
        if (l.otro) return '<tr><td>🧴 <b>' + esc(l.n) + '</b><br><small>fuera de catálogo</small></td><td class="mono">' + fmt(l.q) + '</td><td class="mono">' + fmt(l.qs || 0) + '</td><td>—</td><td>' + (puede && falta > 0 ? '<button type="button" class="oSurt" data-osurt="' + o.id + '|' + i + '">✔ Entregado</button>' : (falta <= 0 ? '✅' : '')) + '</td></tr>';
        return '<tr><td><b class="mono">' + esc(l.c) + '</b> ' + esc(l.n) + (it ? '<br><small>' + esc(ubTxt(it)) + '</small>' : '') + '</td><td class="mono">' + fmt(l.q) + '</td><td class="mono">' + fmt(l.qs || 0) + '</td><td class="mono" style="color:' + (hay >= falta ? '#1E8E5A' : '#C62828') + '">' + fmt(hay) + '</td><td>' + (puede && falta > 0 ? '<button type="button" class="oSurt" data-osurt="' + o.id + '|' + i + '"' + (hay > 0 ? '' : ' disabled title="Sin existencia"') + '>📤 Sacar</button>' : (falta <= 0 ? '✅' : '')) + '</td></tr>'; }).join('') + '</table>' +
      (puede ? '<div class="oAcc"><button type="button" data-otodo="' + o.id + '">📤 Sacar todo lo que hay</button>' + (A ? '<button type="button" data-ocanc="' + o.id + '">Cancelar orden</button>' : '') + '</div>' : '') +
      devolucionesHtml(o) + '</div>';
  }
  // ↩️ devoluciones: lo que salió con la orden y no se usó regresa al almacén (entrada ligada a la misma orden y origen)
  function devolucionesHtml(o) {
    if (o.estado === 'cancelada' || !(S.isAdmin || String(o.tec) === String((S.yo || {}).nomina))) return '';
    const L = (o.lineas || []).map((l, i) => ({ l, i, neto: (+l.qs || 0) - (+l.qd || 0) })).filter(x => !x.l.otro && x.neto > 0);
    const dev = (o.lineas || []).filter(l => +l.qd > 0);
    if (!L.length && !dev.length) return '';
    return '<div class="oDev"><b>↩️ Devolver lo que no se usó</b>' + (dev.length ? '<small>Devuelto: ' + dev.map(l => fmt(l.qd) + ' × ' + esc(l.c)).join(', ') + '</small>' : '') +
      '<div class="oDevB">' + L.map(x => '<button type="button" data-odev="' + o.id + '|' + x.i + '">↩️ ' + esc(x.l.c) + ' <small>(salieron ' + fmt(x.neto) + ')</small></button>').join('') + '</div></div>';
  }
  async function devolver(o, i, q) {
    const l = o.lineas[i], it = itemDe(l); if (!it) return toast('La refacción ya no está en el catálogo.');
    const neto = (+l.qs || 0) - (+l.qd || 0); q = Math.min(q, neto); if (!(q > 0)) return;
    await db.doc('catalogo/' + it.doc).update({ items: { [it.k]: { ent: (Number(it.ent) || 0) + q } } });
    await db.collection('movimientos').add({ t: new Date().toISOString(), f: hoy(), tipo: 'E', c: it.c, n: it.n, doc: it.doc, k: it.k, q, nom: String(o.tecN || '').toUpperCase(), nomina: o.tec, area: o.area || 'Mantenimiento', maq: String((o.origen || {}).maq || '').toUpperCase(), prov: '', fac: '', nota: 'Devolución · ' + o.folio + ' · no se usó', por: S.uid || '', pn: (S.yo && S.yo.nomina) || '', cu: Number(it.cu) || 0, origen: Object.assign({}, o.origen || {}), orden: o.folio, dev: true });
    const Ln = o.lineas.map((x, j) => j === i ? Object.assign({}, x, { qd: (+x.qd || 0) + q }) : x);
    await db.doc('ordenes/' + o.id).update({ lineas: Ln, tMod: new Date().toISOString() });
    return q;
  }
  document.addEventListener('click', async e => {
    const b = e.target.closest('[data-odev]'); if (!b) return; const [id, i] = b.dataset.odev.split('|'), o = ORD.L.find(x => x.id === id); if (!o) return;
    const l = o.lineas[+i], neto = (+l.qs || 0) - (+l.qd || 0), r = prompt('¿Cuántas piezas de ' + l.c + ' · ' + l.n + ' regresan al almacén? (salieron ' + neto + ')', String(neto)); if (r === null) return;
    const q = Number(r); if (!(q > 0)) return; b.disabled = true;
    try { const d = await devolver(o, +i, q); if (d) toast('↩️ Devolución registrada: ' + fmt(d) + ' × ' + l.c + ' regresan al almacén · ' + o.folio); } catch (x) { b.disabled = false; toast('No se pudo registrar (' + (x.code || x.message) + ').'); }
  });
  // ---- nueva orden
  function pintarForm() {
    const box = document.getElementById('oForm'); if (!box) return; const B = ORD.borr, A = S.isAdmin;
    if (!B) { box.innerHTML = ''; return; }
    const tecs = Object.entries(S.pers || {}).filter(([, p]) => p.a !== false).sort((a, b) => String(a[1].n).localeCompare(String(b[1].n)));
    box.innerHTML = '<form class="box oForm" id="oF"><h3>➕ Nueva orden de material</h3>' +
      '<label class="f">¿Para qué es? *<select id="oOrigen"><option>Cargando…</option></select><span class="foot" id="oOrMsg"></span></label>' +
      (A ? '<label class="f">Técnico que saca el material *<select id="oTec">' + tecs.map(([k, p]) => '<option value="' + esc(k) + '"' + (k === String((S.yo || {}).nomina) ? ' selected' : '') + '>' + esc(p.n) + ' · ' + esc(k) + '</option>').join('') + '</select></label>' : '<div class="ro">Saca: <b>' + esc((S.yo || {}).n || '') + '</b></div>') +
      '<div class="oAdd"><input id="oBus" list="oDl" placeholder="Busca la refacción por código o nombre (ej. 6205, banda)"><input id="oQ" type="number" min="1" step="any" value="1" class="mono"><button type="button" id="oAddL">Agregar</button></div><datalist id="oDl">' +
      Object.values(S.items).filter(it => ex(it) > 0).slice(0, 1500).map(it => '<option value="' + esc(it.c + ' · ' + it.n) + '">').join('') + '</datalist>' +
      '<div class="oAdd"><select id="oMaq"><option value="">🏭 …o busca por máquina</option>' + Object.values(maquinas()).filter(m => m.items && m.items.length).sort((a, b) => a.n.localeCompare(b.n, 'es', { numeric: true })).map(m => '<option value="' + esc(m.k) + '"' + (B.maq === m.k ? ' selected' : '') + '>' + esc(m.n) + ' (' + m.items.length + ')</option>').join('') + '</select></div>' +
      (B.maq && maquinas()[B.maq] ? '<div class="oMaqL">' + maquinas()[B.maq].items.slice().sort((a, b) => ex(b) - ex(a)).map(it => '<button type="button" class="oPick" data-opick="' + esc(it.doc + '/' + it.k) + '"' + (ex(it) > 0 ? '' : ' disabled') + '><b class="mono">' + esc(it.c) + '</b> ' + esc(it.n) + ' <small>hay ' + fmt(ex(it)) + '</small></button>').join('') + '</div>' : '') +
      '<div class="oAdd"><input id="oOtro" placeholder="🧴 Material fuera de catálogo (ej. silicón rojo, cinta de aislar)"><input id="oOtroQ" type="number" min="1" step="any" value="1" class="mono"><button type="button" id="oAddO">Agregar otro</button></div>' +
      '<table class="oT"><tr><th>Refacción</th><th>Cantidad</th><th>Hay</th><th></th></tr>' + (B.lineas.length ? B.lineas.map((l, i) => { const it = l.otro ? null : itemDe(l); return '<tr><td>' + (l.otro ? '🧴 <b>' + esc(l.n) + '</b> <small>fuera de catálogo</small>' : '<b class="mono">' + esc(l.c) + '</b> ' + esc(l.n)) + '</td><td class="mono">' + fmt(l.q) + '</td><td class="mono">' + (l.otro ? '—' : fmt(it ? ex(it) : 0)) + '</td><td><button type="button" data-oquit="' + i + '">✕</button></td></tr>'; }).join('') : '<tr><td colspan="4" class="foot">Agrega el material que vas a necesitar.</td></tr>') + '</table>' +
      '<label class="f">Nota (opcional)<input id="oNota" placeholder="Ej. cambio de rodamientos del husillo"></label>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap"><button type="submit" class="primary">Guardar orden</button><button type="button" id="oCanc">Cancelar</button></div><p class="msg" id="oMsg"></p></form>';
    cargarFuentes().then(() => { const s = document.getElementById('oOrigen'); if (!s) return; s.innerHTML = opcionesOrigen(B.origen || '', false); const m = document.getElementById('oOrMsg'); if (m) m.textContent = FU.err.length ? '⚠️ No se pudo leer: ' + FU.err.join(', ') + '.' : (FU.lista.length ? '' : 'No hay paros, requerimientos ni preventivos abiertos: primero se levanta en Control de Paros o se inicia el preventivo.'); });
  }
  function buscarItem(txt) { const c = String(txt || '').split(' · ')[0].trim().toUpperCase(); return Object.entries(S.items).find(([, it]) => String(it.c).toUpperCase() === c) || null; }
  async function surtir(o, i, qPed) {
    if (!puedeRetirar(o.tec)) return toast('⛔ ' + (o.tecN || o.tec) + ' no está autorizado para retirar material (Personal y accesos → 🔐 Retira material).');
    const l = o.lineas[i];
    if (l.otro) { const L0 = o.lineas.map((x, j) => j === i ? Object.assign({}, x, { qs: +x.q || 0, tEnt: new Date().toISOString(), porEnt: (S.yo || {}).nomina || '' }) : x); await db.doc('ordenes/' + o.id).update({ lineas: L0, estado: estadoOrden(Object.assign({}, o, { lineas: L0 })), tMod: new Date().toISOString() }); return +l.q || 0; }
    const it = itemDe(l); if (!it) return toast('La refacción ya no está en el catálogo.');
    const falta = (+l.q || 0) - (+l.qs || 0), hay = ex(it), q = Math.min(qPed == null ? falta : qPed, hay); if (!(q > 0)) return toast('Sin existencia de ' + l.c + '.');
    const e = typeof estadoLimite === 'function' ? estadoLimite(it, o.tec, q) : null; if (e && e.excede) return toast('⛔ Límite excedido de material: ' + (o.tecN || o.tec) + ' ya retiró ' + fmt(e.usado) + ' de ' + fmt(e.lim) + ' ' + e.per + '.');
    await db.doc('catalogo/' + it.doc).update({ items: { [it.k]: { sal: (Number(it.sal) || 0) + q } } });
    await db.collection('movimientos').add({ t: new Date().toISOString(), f: hoy(), tipo: 'S', c: it.c, n: it.n, doc: it.doc, k: it.k, q, nom: String(o.tecN || '').toUpperCase(), nomina: o.tec, area: o.area || 'Mantenimiento', maq: String((o.origen || {}).maq || '').toUpperCase(), prov: '', fac: '', nota: o.folio + ' · ' + ((o.origen || {}).txt || ''), por: S.uid || '', pn: (S.yo && S.yo.nomina) || '', cu: Number(it.cu) || 0, origen: Object.assign({}, o.origen || {}), orden: o.folio });
    const L = o.lineas.map((x, j) => j === i ? Object.assign({}, x, { qs: (+x.qs || 0) + q }) : x), nuevo = Object.assign({}, o, { lineas: L }), st = estadoOrden(nuevo);
    await db.doc('ordenes/' + o.id).update({ lineas: L, estado: st, tMod: new Date().toISOString() });
    return q;
  }
  document.addEventListener('click', async e => {
    const t = e.target; let b;
    if (t.id === 'oNueva') { ORD.borr = { origen: '', lineas: [] }; pintarForm(); return; }
    if (t.id === 'oCanc') { ORD.borr = null; pintarForm(); return; }
    if (t.id === 'oAddL') { const r = buscarItem(document.getElementById('oBus').value), q = Number(document.getElementById('oQ').value) || 0; if (!r) return toast('Elige la refacción de la lista.'); if (!(q > 0)) return toast('Escribe la cantidad.');
      const [id, it] = r, [doc, k] = id.split('/'); ORD.borr.origen = (document.getElementById('oOrigen') || {}).value || ORD.borr.origen; ORD.borr.nota = (document.getElementById('oNota') || {}).value || ''; ORD.borr.tec = (document.getElementById('oTec') || {}).value || ORD.borr.tec;
      const ya = ORD.borr.lineas.find(l => l.doc === doc && l.k === k); if (ya) ya.q += q; else ORD.borr.lineas.push({ doc, k, c: it.c, n: it.n, q, qs: 0 }); pintarForm(); setTimeout(() => { const n = document.getElementById('oNota'); if (n) n.value = ORD.borr.nota || ''; const tc = document.getElementById('oTec'); if (tc && ORD.borr.tec) tc.value = ORD.borr.tec; }, 0); return; }
    if ((b = t.closest('[data-oquit]'))) { ORD.borr.lineas.splice(+b.dataset.oquit, 1); pintarForm(); return; }
    if ((b = t.closest('[data-osurt]'))) { const [id, i] = b.dataset.osurt.split('|'), o = ORD.L.find(x => x.id === id); if (!o) return; const l = o.lineas[+i], falta = (+l.q || 0) - (+l.qs || 0);
      if (l.otro) { if (!confirm('¿Se entregó ' + fmt(falta) + ' de ' + l.n + '?')) return; b.disabled = true; try { await surtir(o, +i); toast('✔ Entregado: ' + l.n + ' · ' + o.folio); } catch (x) { b.disabled = false; toast('No se pudo guardar (' + (x.code || x.message) + ').'); } return; }
      const r = prompt('¿Cuántas piezas de ' + l.c + ' sacas? (faltan ' + falta + ')', String(falta)); if (r === null) return; const q = Number(r); if (!(q > 0)) return; b.disabled = true;
      try { const s = await surtir(o, +i, Math.min(q, falta)); if (s) toast('📤 Salida registrada: ' + fmt(s) + ' × ' + l.c + ' · ' + o.folio); } catch (x) { toast('No se pudo registrar (' + (x.code || x.message) + ').'); b.disabled = false; } return; }
    if ((b = t.closest('[data-otodo]'))) { const o = ORD.L.find(x => x.id === b.dataset.otodo); if (!o || !confirm('¿Sacar del almacén todo lo que hay de esta orden ' + o.folio + '?')) return; b.disabled = true; let n = 0;
      for (let i = 0; i < o.lineas.length; i++) { const cur = ORD.L.find(x => x.id === o.id) || o; const l = cur.lineas[i]; if ((+l.q || 0) - (+l.qs || 0) <= 0) continue; try { const s = await surtir(cur, i); if (s) { n++; cur.lineas[i] = Object.assign({}, l, { qs: (+l.qs || 0) + s }); } } catch (x) {} }
      toast(n ? '📤 ' + n + ' refacción(es) surtidas · ' + o.folio : 'No había existencia para surtir.'); return; }
    if ((b = t.closest('[data-ocanc]'))) { const o = ORD.L.find(x => x.id === b.dataset.ocanc); if (!o || !confirm('¿Cancelar la orden ' + o.folio + '? Lo que ya salió se queda registrado.')) return; await db.doc('ordenes/' + o.id).update({ estado: 'cancelada', tMod: new Date().toISOString() }); return; }
  });
  document.addEventListener('submit', async e => {
    if (e.target.id !== 'oF') return; e.preventDefault(); const B = ORD.borr, msg = document.getElementById('oMsg'), v = (document.getElementById('oOrigen') || {}).value, og = ORIG_MAP[v];
    if (!og) { msg.className = 'msg err'; msg.textContent = '⛔ Elige el paro, requerimiento, área general o preventivo al que va el material.'; return; }
    if (!B.lineas.length) { msg.className = 'msg err'; msg.textContent = 'Agrega al menos una refacción.'; return; }
    const tec = (document.getElementById('oTec') || {}).value || String((S.yo || {}).nomina || ''), p = (S.pers || {})[tec] || {}, d = new Date();
    const pref = { paro: 'PA', req: 'RQ', ag: 'AG', prev: 'PV' }[og.tipo] || 'OM'; let folio; do { folio = pref + '-' + String(Math.floor(1000 + Math.random() * 9000)); } while (ORD.L.some(x => x.folio === folio));
    if (!puedeRetirar(tec)) { msg.className = 'msg err'; msg.textContent = '⛔ La nómina ' + tec + ' no está autorizada para retirar material (Personal y accesos → 🔐 Retira material).'; return; }
    try { await db.collection('ordenes').add({ folio, origen: { tipo: og.tipo, id: og.id, txt: og.txt, maq: og.maq || '' }, area: og.area || '', tec, tecN: p.n || (S.yo || {}).n || '', lineas: B.lineas, nota: (document.getElementById('oNota') || {}).value || '', estado: 'abierta', t: d.toISOString(), por: (S.yo || {}).nomina || '' });
      ORD.borr = null; ORD.ver = folio; toast('📋 Orden ' + folio + ' creada. Ese es el código para retirar el material.'); renderOrd(); } catch (x) { msg.className = 'msg err'; msg.textContent = 'No se pudo guardar (' + (x.code || x.message) + ').'; }
  });
  // ---------- código de orden (tecleado o escaneado), búsqueda por máquina y material fuera de catálogo
  function abrirOrdenCodigo(c) { ORD.ver = normCod(c); const b = document.querySelector('nav.tabs button[data-tab="ord"]'); if (b) b.click(); else renderOrd(); setTimeout(() => { const s = document.getElementById('v-ord'); if (s) s.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 150); }
  window.abrirOrdenCodigo = abrirOrdenCodigo; window.esCodigoOrden = s => codigoRx.test(String(s || '').trim());
  function guardarBorrador() { const B = ORD.borr; if (!B) return; B.origen = (document.getElementById('oOrigen') || {}).value || B.origen; B.nota = (document.getElementById('oNota') || {}).value || B.nota || ''; B.tec = (document.getElementById('oTec') || {}).value || B.tec; }
  function repintarForm() { const B = ORD.borr; pintarForm(); setTimeout(() => { const n = document.getElementById('oNota'); if (n) n.value = B.nota || ''; const tc = document.getElementById('oTec'); if (tc && B.tec) tc.value = B.tec; }, 0); }
  document.addEventListener('click', e => {
    const t = e.target; let b;
    if (t.id === 'oCodIr') { const v = (document.getElementById('oCodIn') || {}).value; if (v) abrirOrdenCodigo(v); return; }
    if (t.id === 'oCodX') { ORD.ver = ''; renderOrd(); return; }
    if ((b = t.closest('[data-opick]'))) { guardarBorrador(); const id = b.dataset.opick, it = S.items[id]; if (!it) return; const [doc, k] = id.split('/'), q = Number(prompt('¿Cuántas piezas de ' + it.c + ' · ' + it.n + '? (hay ' + fmt(ex(it)) + ')', '1')) || 0; if (!(q > 0)) return; const ya = ORD.borr.lineas.find(l => l.doc === doc && l.k === k); if (ya) ya.q += q; else ORD.borr.lineas.push({ doc, k, c: it.c, n: it.n, q, qs: 0 }); repintarForm(); return; }
    if (t.id === 'oAddO') { guardarBorrador(); const n = String((document.getElementById('oOtro') || {}).value || '').trim().toUpperCase(), q = Number((document.getElementById('oOtroQ') || {}).value) || 0; if (!n) return toast('Escribe el material.'); if (!(q > 0)) return toast('Escribe la cantidad.'); ORD.borr.lineas.push({ otro: true, c: 'OTRO', n, q, qs: 0 }); repintarForm(); return; }
  }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'oCodIn') { e.preventDefault(); const v = e.target.value; if (v) abrirOrdenCodigo(v); } });
  document.addEventListener('change', e => { if (e.target.id === 'oMaq') { guardarBorrador(); ORD.borr.maq = e.target.value; repintarForm(); } });
  // ---------- 🔐 quién retira material (Personal y accesos, solo administradores)
  function suscribirRetiro() { db.doc('config/retiro').onSnapshot(s => { RET.n = (s.exists && (s.data() || {}).n) || null; if (S.tab === 'pers') pintarRetiro(); }, () => {}); }
  function pintarRetiro() {
    const sec = document.getElementById('v-pers'); if (!sec || !S.isAdmin) return; let box = document.getElementById('retBox');
    if (!box) { box = document.createElement('div'); box.id = 'retBox'; box.className = 'box'; sec.appendChild(box); }
    const P = Object.entries(S.pers || {}).filter(([, p]) => p.a !== false).sort((a, b) => String(a[1].n).localeCompare(String(b[1].n)));
    box.innerHTML = '<h3>🔐 Retira material</h3><p class="foot">Solo las personas marcadas pueden retirar refacciones del almacén (siempre ligadas a un paro, requerimiento, área general o preventivo): técnicos de mantenimiento, jefe, gerente, Humberto y su auxiliar, y dirección. Si alguien no aparece, dalo de alta arriba con su nómina.</p>' +
      '<div class="retGrid">' + P.map(([k, p]) => '<label class="retI"><input type="checkbox" data-ret="' + esc(k) + '"' + (puedeRetirar(k) ? ' checked' : '') + '><span><b>' + esc(p.n) + '</b><small>' + esc(k) + ' · ' + esc(p.puesto || '') + '</small></span></label>').join('') + '</div>' + (RET.n ? '' : '<p class="foot">Lista inicial: técnicos de mantenimiento, jefe y gerente. Se guarda al primer cambio.</p>');
  }
  document.addEventListener('change', async e => {
    const c = e.target.closest && e.target.closest('[data-ret]'); if (!c || !S.isAdmin) return;
    const L = Object.assign({}, RET.n || RET_DEF.reduce((a, k) => (a[k] = true, a), {})); if (c.checked) L[c.dataset.ret] = true; else delete L[c.dataset.ret];
    try { await db.doc('config/retiro').set({ n: L, t: new Date().toISOString(), por: (S.yo || {}).nomina || '' }); toast((c.checked ? '🔐 Puede retirar material: ' : 'Ya no retira material: ') + ((S.pers[c.dataset.ret] || {}).n || c.dataset.ret)); } catch (x) { toast('No se pudo guardar (' + (x.code || x.message) + ').'); c.checked = !c.checked; }
  });
  function envolverPers() { if (typeof renderPers !== 'function' || renderPers._ord) return; const base = renderPers; window.renderPers = function () { const r = base.apply(this, arguments); try { pintarRetiro(); } catch (e) {} return r; }; window.renderPers._ord = true; }
  // ---------- arranque
  function iniciar() {
    montarTab(); envolverDrawer(); envolverGuardar(); envolverPers();
    // botón grande en el encabezado: teclear el código que trae el técnico (PA-4821…)
    const ponerBoton = () => { const acc = document.querySelector('header.hero .hero-actions'); if (!acc) return setTimeout(ponerBoton, 500); if (document.getElementById('btnCodOrd')) return;
      const b = document.createElement('button'); b.type = 'button'; b.id = 'btnCodOrd'; b.className = 'codBtn'; b.innerHTML = '🔢 Código de orden';
      b.addEventListener('click', () => { const v = prompt('Código de la orden de material que trae el técnico (ej. PA-4821):', ''); if (v && v.trim()) abrirOrdenCodigo(v); });
      acc.insertBefore(b, acc.firstChild); };
    ponerBoton();
    const espera = () => { if (typeof db !== 'undefined' && db) { envolverDB(); suscribirOrdenes(); suscribirRetiro(); } else setTimeout(espera, 600); }; espera();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
