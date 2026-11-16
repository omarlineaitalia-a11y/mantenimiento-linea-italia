/* Almacén · REGLA DE SALIDAS (Ing. Omar, 16-nov-2026): ninguna refacción sale sin estar ligada a
 *   🛑 un paro / falla de Control de Paros · 📐 un requerimiento (producción o áreas generales) · 🏢 una solicitud de áreas generales
 *   🛠️ un preventivo · 📋 una orden de material.
 * Órdenes de material (apps/almacen/ordenes): el técnico arma la lista de material ligada a su paro, requerimiento o preventivo y se surte desde aquí.
 * Solo LEE Control de Paros y Mantenimiento Preventivo; no los modifica. */
(function () {
  'use strict';
  const FU = { t: 0, lista: [], err: [], cargando: null }, ORD = { L: [], sub: false, borr: null };
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
  function envolverDrawer() { if (typeof renderDrawer !== 'function' || renderDrawer._ord) return; const base = renderDrawer; window.renderDrawer = function () { const r = base.apply(this, arguments); try { inyectarOrigen(); } catch (e) {} return r; }; window.renderDrawer._ord = true; }
  function envolverGuardar() {
    if (typeof guardarMov !== 'function' || guardarMov._ord) return; const base = guardarMov;
    window.guardarMov = async function () {
      if (S.tipo === 'S') {
        const v = (document.getElementById('mvOrigen') || {}).value, o = ORIG_MAP[v], msg = document.getElementById('mMov');
        if (!o) { if (msg) { msg.className = 'msg err'; msg.textContent = '⛔ Elige para qué es la refacción: un paro, requerimiento, área general, preventivo u orden de material. Sin eso no se puede sacar material del almacén.'; } return; }
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
    let h = '<div class="oHero"><div><b>📋 Órdenes de material</b><span>Ninguna refacción sale sin estar ligada a un <b>paro</b>, <b>requerimiento</b>, <b>área general</b> o <b>preventivo</b>. Arma aquí la lista de material y se surte desde la orden.</span></div><button type="button" class="primary" id="oNueva">➕ Nueva orden de material</button></div>';
    h += '<div id="oForm"></div>';
    h += '<h3 class="oTit">Por surtir <span>' + ab.length + '</span></h3><div class="oGrid">' + (ab.length ? ab.map(tarjeta).join('') : '<div class="empty">No hay órdenes por surtir.</div>') + '</div>';
    if (resto.length) h += '<h3 class="oTit">Recientes</h3><div class="oGrid">' + resto.map(tarjeta).join('') + '</div>';
    sec.innerHTML = h; if (ORD.borr) pintarForm();
  }
  function tarjeta(o) {
    const st = EST_O[o.estado] || EST_O.abierta, og = o.origen || {}, tp = TIPOS[og.tipo] || TIPOS.orden, A = S.isAdmin, puede = (A || String(o.tec) === String((S.yo || {}).nomina)) && ['abierta', 'parcial'].includes(o.estado);
    return '<div class="oCard" style="--c:' + tp[2] + '"><div class="oH"><b class="mono">' + esc(o.folio) + '</b><span class="oEst" style="background:' + st[1] + '">' + st[0] + '</span></div>' +
      '<div class="oOr">' + tp[0] + ' ' + esc(og.txt || '') + '</div><div class="oMeta">👷 ' + esc(o.tecN || o.tec || '') + ' · ' + fCorta(o.t) + (o.nota ? ' · ' + esc(o.nota) : '') + '</div>' +
      '<table class="oT"><tr><th>Refacción</th><th>Pide</th><th>Salió</th><th>Hay</th><th></th></tr>' + (o.lineas || []).map((l, i) => { const it = itemDe(l), hay = it ? ex(it) : 0, falta = (+l.q || 0) - (+l.qs || 0);
        return '<tr><td><b class="mono">' + esc(l.c) + '</b> ' + esc(l.n) + (it ? '<br><small>' + esc(ubTxt(it)) + '</small>' : '') + '</td><td class="mono">' + fmt(l.q) + '</td><td class="mono">' + fmt(l.qs || 0) + '</td><td class="mono" style="color:' + (hay >= falta ? '#1E8E5A' : '#C62828') + '">' + fmt(hay) + '</td><td>' + (puede && falta > 0 ? '<button type="button" class="oSurt" data-osurt="' + o.id + '|' + i + '"' + (hay > 0 ? '' : ' disabled title="Sin existencia"') + '>📤 Sacar</button>' : (falta <= 0 ? '✅' : '')) + '</td></tr>'; }).join('') + '</table>' +
      (puede ? '<div class="oAcc"><button type="button" data-otodo="' + o.id + '">📤 Sacar todo lo que hay</button>' + (A ? '<button type="button" data-ocanc="' + o.id + '">Cancelar orden</button>' : '') + '</div>' : '') + '</div>';
  }
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
      '<table class="oT"><tr><th>Refacción</th><th>Cantidad</th><th>Hay</th><th></th></tr>' + (B.lineas.length ? B.lineas.map((l, i) => { const it = itemDe(l); return '<tr><td><b class="mono">' + esc(l.c) + '</b> ' + esc(l.n) + '</td><td class="mono">' + fmt(l.q) + '</td><td class="mono">' + fmt(it ? ex(it) : 0) + '</td><td><button type="button" data-oquit="' + i + '">✕</button></td></tr>'; }).join('') : '<tr><td colspan="4" class="foot">Agrega el material que vas a necesitar.</td></tr>') + '</table>' +
      '<label class="f">Nota (opcional)<input id="oNota" placeholder="Ej. cambio de rodamientos del husillo"></label>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap"><button type="submit" class="primary">Guardar orden</button><button type="button" id="oCanc">Cancelar</button></div><p class="msg" id="oMsg"></p></form>';
    cargarFuentes().then(() => { const s = document.getElementById('oOrigen'); if (!s) return; s.innerHTML = opcionesOrigen(B.origen || '', false); const m = document.getElementById('oOrMsg'); if (m) m.textContent = FU.err.length ? '⚠️ No se pudo leer: ' + FU.err.join(', ') + '.' : (FU.lista.length ? '' : 'No hay paros, requerimientos ni preventivos abiertos: primero se levanta en Control de Paros o se inicia el preventivo.'); });
  }
  function buscarItem(txt) { const c = String(txt || '').split(' · ')[0].trim().toUpperCase(); return Object.entries(S.items).find(([, it]) => String(it.c).toUpperCase() === c) || null; }
  async function surtir(o, i, qPed) {
    const l = o.lineas[i], it = itemDe(l); if (!it) return toast('La refacción ya no está en el catálogo.');
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
    const folio = 'OM-' + String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '-' + Math.random().toString(36).slice(2, 5).toUpperCase();
    try { await db.collection('ordenes').add({ folio, origen: { tipo: og.tipo, id: og.id, txt: og.txt, maq: og.maq || '' }, area: og.area || '', tec, tecN: p.n || (S.yo || {}).n || '', lineas: B.lineas, nota: (document.getElementById('oNota') || {}).value || '', estado: 'abierta', t: d.toISOString(), por: (S.yo || {}).nomina || '' });
      ORD.borr = null; toast('📋 Orden ' + folio + ' creada. Ya puedes sacar el material.'); } catch (x) { msg.className = 'msg err'; msg.textContent = 'No se pudo guardar (' + (x.code || x.message) + ').'; }
  });
  // ---------- arranque
  function iniciar() {
    montarTab(); envolverDrawer(); envolverGuardar();
    const espera = () => { if (typeof db !== 'undefined' && db) { envolverDB(); suscribirOrdenes(); } else setTimeout(espera, 600); }; espera();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
