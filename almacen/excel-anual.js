/* 📊 EXCEL ANUAL DE MOVIMIENTOS (Ing. Omar, 16-nov-2026): un archivo por año, "Almacén · Movimientos AAAA.xlsx",
 * con el concentrado de todos los movimientos (fechas, costos, quién saca, máquina, orden y origen) DIVIDIDO POR SEMANA.
 * Se guarda en una carpeta de OneDrive elegida una vez (se recuerda en este equipo) y se ACTUALIZA el mismo archivo
 * cada vez que entra un administrador y con el botón. Al cambiar de año se crea el archivo del año nuevo. */
(function () {
  'use strict';
  const IDB = 'almExcelAnual', ST = 'h';
  const anioHoy = () => new Date().getFullYear();
  const nombreArchivo = a => 'Almacén · Movimientos ' + a + '.xlsx';
  function idb() { return new Promise((ok, mal) => { const r = indexedDB.open(IDB, 1); r.onupgradeneeded = () => r.result.createObjectStore(ST); r.onsuccess = () => ok(r.result); r.onerror = () => mal(r.error); }); }
  async function guardarHandle(h) { const d = await idb(); return new Promise(ok => { const t = d.transaction(ST, 'readwrite'); t.objectStore(ST).put(h, 'carpeta'); t.oncomplete = ok; }); }
  async function leerHandle() { try { const d = await idb(); return await new Promise(ok => { const t = d.transaction(ST).objectStore(ST).get('carpeta'); t.onsuccess = () => ok(t.result || null); t.onerror = () => ok(null); }); } catch (e) { return null; } }
  // semana ISO
  function semanaISO(d) { const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const dia = x.getUTCDay() || 7; x.setUTCDate(x.getUTCDate() + 4 - dia); const a0 = new Date(Date.UTC(x.getUTCFullYear(), 0, 1)); return Math.ceil(((x - a0) / 864e5 + 1) / 7); }
  function lunesDe(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }
  const dmy = d => String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
  const r2 = v => Math.round((Number(v) || 0) * 100) / 100;
  const TIPO_OR = { paro: 'Paro / falla', req: 'Requerimiento', ag: 'Áreas generales', prev: 'Preventivo', orden: 'Orden de material' };
  async function movimientosDelAnio(a) {
    const q = await db.collection('movimientos').where('t', '>=', a + '-01-01').get();
    return q.docs.map(d => Object.assign({ id: d.id }, d.data())).filter(m => String(m.t || m.f || '').slice(0, 4) === String(a)).sort((x, y) => String(x.t).localeCompare(String(y.t)));
  }
  function fila(m) {
    const d = new Date(m.t || (m.f + 'T12:00:00')), lun = lunesDe(d), dom = new Date(lun); dom.setDate(dom.getDate() + 6);
    const it = (S.items || {})[m.doc + '/' + m.k] || {}, cu = Number(m.cu) || Number(it.cu) || 0, q = Number(m.q) || 0, tipo = m.dev ? 'DEVOLUCIÓN' : m.tipo === 'E' ? 'ENTRADA' : 'SALIDA', og = m.origen || {};
    return { _sem: semanaISO(d), _lun: lun, _dom: dom, _tipo: tipo, _imp: r2(q * cu), _q: q,
      row: { 'Semana': semanaISO(d), 'Del': dmy(lun), 'Al': dmy(dom), 'Fecha': dmy(d), 'Hora': d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }), 'Movimiento': tipo, 'Código': m.c || '', 'Refacción': m.n || '', 'Cantidad': q, 'Costo unitario': r2(cu), 'Importe': r2(q * cu),
        'Quién (saca / recibe)': m.nom || '', 'Nómina': m.nomina || '', 'Área': m.area || '', 'Máquina': m.maq || '', 'Orden': m.orden || '', 'Origen': TIPO_OR[og.tipo] || '', 'Detalle del origen': og.txt || '', 'Proveedor / factura': [m.prov, m.fac].filter(Boolean).join(' · '), 'Nota': m.nota || '' } };
  }
  async function armarLibro(a) {
    const F = (await movimientosDelAnio(a)).map(fila), wb = XLSX.utils.book_new(), cols = [8, 11, 11, 11, 7, 12, 12, 34, 9, 12, 12, 26, 9, 18, 22, 10, 16, 40, 18, 30];
    const hoja = (rows, nombre, w) => { const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ 'Sin movimientos': '' }]); ws['!cols'] = (w || cols).map(x => ({ wch: x })); if (rows.length) ws['!autofilter'] = { ref: ws['!ref'] }; XLSX.utils.book_append_sheet(wb, ws, nombre.slice(0, 31)); };
    // resumen semanal
    const S1 = {}; F.forEach(f => { const s = S1[f._sem] = S1[f._sem] || { lun: f._lun, dom: f._dom, eQ: 0, eI: 0, sQ: 0, sI: 0, dQ: 0, dI: 0, n: 0 }; s.n++; if (f._tipo === 'SALIDA') { s.sQ += f._q; s.sI += f._imp; } else if (f._tipo === 'DEVOLUCIÓN') { s.dQ += f._q; s.dI += f._imp; } else { s.eQ += f._q; s.eI += f._imp; } });
    const res = Object.keys(S1).map(Number).sort((x, y) => x - y).map(k => { const s = S1[k]; return { 'Semana': k, 'Del': dmy(s.lun), 'Al': dmy(s.dom), 'Movimientos': s.n, 'Salidas (pzas)': s.sQ, 'Salidas ($)': r2(s.sI), 'Devoluciones (pzas)': s.dQ, 'Devoluciones ($)': r2(s.dI), 'Entradas (pzas)': s.eQ, 'Entradas ($)': r2(s.eI), 'Gasto neto ($)': r2(s.sI - s.dI) }; });
    const tot = res.reduce((t, r) => { Object.keys(r).forEach(k => { if (typeof r[k] === 'number' && k !== 'Semana') t[k] = r2((t[k] || 0) + r[k]); }); return t; }, { 'Semana': 'TOTAL ' + a, 'Del': '', 'Al': '' });
    hoja(res.length ? res.concat([tot]) : [], 'RESUMEN SEMANAL', [10, 11, 11, 12, 13, 13, 16, 15, 14, 13, 14]);
    // concentrado completo (con la semana en cada renglón)
    hoja(F.map(f => f.row), 'CONCENTRADO ' + a);
    // por persona, por máquina, por origen (salidas netas)
    const agr = key => { const o = {}; F.forEach(f => { if (f._tipo === 'ENTRADA') return; const k = key(f) || 'Sin dato'; const x = o[k] = o[k] || { q: 0, imp: 0, n: 0 }; const sg = f._tipo === 'DEVOLUCIÓN' ? -1 : 1; x.q += sg * f._q; x.imp += sg * f._imp; x.n++; }); return Object.entries(o).sort((p, q) => q[1].imp - p[1].imp || q[1].q - p[1].q); };
    hoja(agr(f => (f.row['Nómina'] ? f.row['Nómina'] + ' · ' : '') + f.row['Quién (saca / recibe)']).map(([k, x]) => ({ 'Quién': k, 'Movimientos': x.n, 'Piezas netas': x.q, 'Importe neto ($)': r2(x.imp) })), 'POR PERSONA', [36, 12, 13, 15]);
    hoja(agr(f => f.row['Máquina']).map(([k, x]) => ({ 'Máquina': k, 'Movimientos': x.n, 'Piezas netas': x.q, 'Importe neto ($)': r2(x.imp) })), 'POR MÁQUINA', [34, 12, 13, 15]);
    hoja(agr(f => f.row['Origen']).map(([k, x]) => ({ 'Origen': k, 'Movimientos': x.n, 'Piezas netas': x.q, 'Importe neto ($)': r2(x.imp) })), 'POR ORIGEN', [22, 12, 13, 15]);
    // una hoja por semana
    Object.keys(S1).map(Number).sort((x, y) => x - y).forEach(k => { const s = S1[k]; hoja(F.filter(f => f._sem === k).map(f => f.row), 'S' + String(k).padStart(2, '0') + ' ' + dmy(s.lun).slice(0, 5).replace('/', '-') + ' al ' + dmy(s.dom).slice(0, 5).replace('/', '-')); });
    return { buf: XLSX.write(wb, { bookType: 'xlsx', type: 'array' }), n: F.length };
  }
  async function escribirEnCarpeta(h, a, buf) { const fh = await h.getFileHandle(nombreArchivo(a), { create: true }); const w = await fh.createWritable(); await w.write(new Blob([buf])); await w.close(); }
  async function actualizar(conGesto) {
    if (typeof XLSX === 'undefined' || typeof db === 'undefined' || !db) return toast('Todavía no carga el almacén.');
    const a = anioHoy(); let h = await leerHandle();
    try {
      if (h) { let p = await h.queryPermission({ mode: 'readwrite' }); if (p !== 'granted' && conGesto) p = await h.requestPermission({ mode: 'readwrite' }); if (p !== 'granted') { if (!conGesto) return; h = null; } }
      if (!h && conGesto && window.showDirectoryPicker && window.self === window.top) { h = await window.showDirectoryPicker({ id: 'almExcel', mode: 'readwrite' }); await guardarHandle(h); }
      const { buf, n } = await armarLibro(a);
      if (h) { await escribirEnCarpeta(h, a, buf); localStorage.setItem('almExcelUlt', new Date().toISOString()); pintarEstado(); if (conGesto) toast('📊 Excel actualizado: ' + nombreArchivo(a) + ' · ' + n + ' movimientos · carpeta "' + h.name + '"'); }
      else if (conGesto) { const bl = new Blob([buf]), u = URL.createObjectURL(bl), l = document.createElement('a'); l.href = u; l.download = nombreArchivo(a); document.body.appendChild(l); l.click(); setTimeout(() => { URL.revokeObjectURL(u); l.remove(); }, 2000); toast('📊 Excel descargado (este navegador no deja elegir carpeta): ' + nombreArchivo(a)); }
    } catch (e) { if (conGesto && e && e.name !== 'AbortError') toast('No se pudo generar el Excel (' + (e.code || e.message) + ').'); }
  }
  function pintarEstado() { const b = document.getElementById('btnExcelAnio'); if (!b) return; const u = localStorage.getItem('almExcelUlt'); b.title = u ? 'Última actualización: ' + new Date(u).toLocaleString('es-MX') : 'Elige una vez la carpeta de OneDrive donde se guardará el Excel del año'; }
  function boton() {
    const acc = document.querySelector('header.hero .hero-actions'); if (!acc) return setTimeout(boton, 600); if (document.getElementById('btnExcelAnio')) return;
    const b = document.createElement('button'); b.type = 'button'; b.id = 'btnExcelAnio'; b.className = 'xlsBtn'; b.hidden = true; b.innerHTML = '📊 Excel ' + anioHoy() + ' (semanal)';
    b.addEventListener('click', () => actualizar(true)); const x = document.getElementById('btnXlsx'); acc.insertBefore(b, x || null); pintarEstado();
  }
  // solo administradores; se actualiza solo al entrar (si la carpeta ya tiene permiso) y luego cada 30 min
  let auto = false;
  setInterval(() => { const b = document.getElementById('btnExcelAnio'); if (!b || typeof S === 'undefined') return; b.hidden = !S.isAdmin; if (S.isAdmin && !auto && S.items && Object.keys(S.items).length) { auto = true; actualizar(false); setInterval(() => actualizar(false), 30 * 60000); } }, 2000);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boton); else boton();
})();
