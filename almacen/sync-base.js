/* Almacén · SINCRONÍA CON LA BASE DE DATOS DE PLANTA (Ing. Omar, 16-nov-2026)
 * Cada vez que entra un administrador, lee la app Base de Datos (apps/equipos/cat/*) y:
 *   1) VINCULA cada equipo de la base con su máquina del almacén (idBase), sin duplicar: por nombre igual, por los empates
 *      revisados a mano (SELEXX 1 = SELEX, LÁSER GWEIKE 1 = LASER WEIKE 1…) o por las que ya se dieron de alta desde la base;
 *   2) ACTUALIZA ubicación, marca/modelo/serie y categoría de las vinculadas cuando cambian en la base;
 *   3) los equipos NUEVOS de la base que no se pueden empatar con seguridad quedan en "🆕 Nuevos en la Base de Datos"
 *      (pestaña Máquinas) para agregarlos o vincularlos con un toque. Así nunca se repite una máquina. */
(function () {
  'use strict';
  const MAPA = { 'SELEXX 1': 'SELEX', 'LÁSER GWEIKE 1': 'LASER WEIKE 1', 'LÁSER GWEIKE 2': 'LASER G-WEIKE 2', 'LÁSER GWEIKE CAMA': 'LASER G-WEIKE CAMA', 'CABINA NORDSON': 'CABINA',
    'DRIVE CONVEYOR': 'DRIVE', 'FLEJADORA 1': 'FLEJADORA', 'HORNO DE SECADO': 'HORNO', 'TÚNEL DE LAVADO': 'TUNEL DE LAVADO', 'MÁQUINA DE CAJAS': 'MAQUINA DE CAJAS',
    'PRENSA 60 T 1': 'PRENSA DE 60', 'PRENSA 90 T 2': 'PRENSA DE 90', 'DOBLADORA NEWTON 2': 'DOBLADORA NEWTON #2', 'TALADRO DE PEDESTAL': 'TALADRO DE PEDESTAL  #' };
  const SB = { pend: [], hecho: false, base: [] };
  const limpio = s => String(s || '').toUpperCase().replace(/[^A-Z0-9_\-]/g, '').slice(0, 8);
  const notaDe = e => [[e.marca || e.fab, e.modelo].filter(Boolean).join(' '), e.serie ? 'Serie ' + e.serie : '', 'Clave Base de Datos ' + (e.clave || e.eco || '')].filter(Boolean).join(' · ');
  function nombreDe(e, cuenta) { let n = String(e.nombre).trim().toUpperCase(); if (cuenta[n] > 1 || /^\d+$/.test(n)) n = (/^\d+$/.test(n) ? (e.corto || e.catN || e.cat) + ' ' + n : n) + (cuenta[String(e.nombre).trim().toUpperCase()] > 1 ? ' ' + (e.eco || e.clave || e.no) : ''); return n.toUpperCase().trim(); }
  async function sincronizar() {
    if (SB.hecho || typeof firebase === 'undefined' || typeof db === 'undefined' || !db || !S.isAdmin || !S.items || !Object.keys(S.items).length) return; SB.hecho = true;
    try {
      const q = await firebase.firestore().collection('apps/equipos/cat').get(), B = [];
      q.docs.forEach(d => Object.values((d.data() || {}).items || {}).forEach(e => { if (e && e.nombre && !e.baja && e.id) B.push(e); }));
      if (B.length < 50) return; SB.base = B;
      const cuenta = {}; B.forEach(e => { const n = String(e.nombre).trim().toUpperCase(); cuenta[n] = (cuenta[n] || 0) + 1; });
      const M = maquinas(), reg = S.maqs || {}, porNombre = {}, ligado = {}, cambios = {}, pend = [];
      Object.entries(M).forEach(([k, o]) => { porNombre[String(o.n || '').trim().toUpperCase()] = k; });
      Object.entries(reg).forEach(([k, r]) => { if (r.idBase) ligado[r.idBase] = k; });
      const fijar = (k, e) => { const r = reg[k] || {}, o = M[k] || {}, nota = notaDe(e), area = e.ubic || '', cat = e.cat || r.cat || o.cat || 'GEN';
        if (r.idBase === e.id && r.nota === nota && (r.area || '') === area && r.cat === cat) return;
        cambios[k] = Object.assign({}, r, { n: r.n || o.n, cod: r.cod || o.cod || limpio(e.clave || e.eco), cat, area, nota, idBase: e.id, fuente: r.fuente || 'Vínculo Base de Datos', tMod: new Date().toISOString() }); };
      B.forEach(e => {
        if (ligado[e.id]) return fijar(ligado[e.id], e);
        const n = nombreDe(e, cuenta), k = mkey(n);
        if (reg[k] && reg[k].fuente === 'Base de Datos') return fijar(k, e);
        if (MAPA[n] && porNombre[MAPA[n]]) return fijar(porNombre[MAPA[n]], e);
        if (porNombre[n]) return fijar(porNombre[n], e);
        pend.push(Object.assign({ _n: n }, e));
      });
      SB.pend = pend; pintarPend();
      const c = Object.keys(cambios).length; if (!c) return;
      if (S.maqsExiste) await db.doc('maquinas/lista').update({ m: cambios }); else await db.doc('maquinas/lista').set({ m: cambios });
      toast('🔄 Base de Datos: ' + c + ' máquina(s) vinculadas o actualizadas' + (pend.length ? ' · ' + pend.length + ' nuevas por revisar en Máquinas' : ''));
    } catch (e) { /* sin acceso a Base de Datos desde este equipo */ }
  }
  function pintarPend() {
    const g = document.getElementById('maqLista'); if (!g || !S.isAdmin) return; let b = document.getElementById('sbPend');
    if (!SB.pend.length) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement('div'); b.id = 'sbPend'; b.className = 'box'; g.insertBefore(b, g.querySelector('#maqGrid')); }
    const opts = Object.values(maquinas()).sort((x, y) => String(x.n).localeCompare(String(y.n), 'es', { numeric: true })).map(o => '<option value="' + esc(o.k) + '">' + esc(o.n) + '</option>').join('');
    b.innerHTML = '<h3>🆕 Nuevos en la Base de Datos (' + SB.pend.length + ')</h3><p class="foot">Equipos que se dieron de alta en la Base de Datos y no se pudieron empatar con seguridad. Agrégalos como máquina nueva o vincúlalos con la que ya existe (así no se repiten).</p>' +
      '<div class="sbL">' + SB.pend.map((e, i) => '<div class="sbI"><div><b>' + esc(e._n) + '</b><small>' + esc([e.cat, e.ubic, e.marca, e.modelo].filter(Boolean).join(' · ')) + '</small></div><button type="button" class="primary" data-sbadd="' + i + '">➕ Agregar</button><select data-sblink="' + i + '"><option value="">🔗 Es la misma que…</option>' + opts + '</select></div>').join('') + '</div>';
  }
  async function guardar(k, d, msg) { try { if (S.maqsExiste) await db.doc('maquinas/lista').update({ m: { [k]: d } }); else await db.doc('maquinas/lista').set({ m: { [k]: d } }); toast(msg); } catch (x) { toast('No se pudo guardar (' + (x.code || x.message) + ').'); } }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-sbadd]'); if (!b) return; const i = +b.dataset.sbadd, x = SB.pend[i]; if (!x) return;
    const k = mkey(x._n); SB.pend.splice(i, 1); pintarPend();
    guardar(k, { n: x._n, cod: limpio(x.clave || x.eco), cat: x.cat || 'GEN', area: x.ubic || '', nota: notaDe(x), idBase: x.id, fuente: 'Base de Datos', alta: new Date().toISOString(), pn: (S.yo && S.yo.nomina) || '' }, '➕ Máquina agregada: ' + x._n);
  });
  document.addEventListener('change', e => {
    const s = e.target.closest('[data-sblink]'); if (!s || !s.value) return; const i = +s.dataset.sblink, x = SB.pend[i], k = s.value; if (!x) return;
    const M = maquinas(), o = M[k] || {}, r = (S.maqs || {})[k] || {}; SB.pend.splice(i, 1); pintarPend();
    guardar(k, Object.assign({}, r, { n: r.n || o.n, cod: r.cod || o.cod || limpio(x.clave || x.eco), cat: x.cat || r.cat || o.cat || 'GEN', area: x.ubic || r.area || '', nota: notaDe(x), idBase: x.id, fuente: r.fuente || 'Vínculo Base de Datos', tMod: new Date().toISOString() }), '🔗 Vinculada: ' + x._n + ' = ' + (r.n || o.n));
  });
  if (typeof renderMaq === 'function' && !renderMaq._sb) { const base = renderMaq; window.renderMaq = function () { const r = base.apply(this, arguments); try { pintarPend(); } catch (x) {} return r; }; window.renderMaq._sb = true; }
  setInterval(sincronizar, 4000);
})();
