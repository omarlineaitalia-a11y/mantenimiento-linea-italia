/* Áreas generales · Tablero de mantenimiento · HISTORIAL POR SEMANA Y POR MES + PDF DE AVANCES Y FALLAS (Ing. Omar, 17-nov-2026)
 * Abajo del tablero de mantenimiento agrega:
 *   - selector Semana / Mes con flechas ‹ › para moverse entre periodos;
 *   - indicadores del periodo (recibidas, terminadas, abiertas, tiempo promedio, calidad);
 *   - en pantalla, las tarjetas de los trabajos YA TERMINADOS en el periodo (con solución, técnico, tiempo y calidad);
 *   - resumen por semana (cuando se ve el mes);
 *   - botón 📄 PDF de avances y fallas del periodo (mismo estilo que el resumen de paros de mantenimiento).
 * Solo lee datos (S.agReq); no cambia la lógica de Áreas generales. */
(function () {
  'use strict';
  S.agH = S.agH || { per: 'mes', off: 0 };
  const DIA = 86400000;
  const lunes = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
  const semNum = d => { const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const n = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - n); const a = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return Math.ceil(((t - a) / DIA + 1) / 7); };
  const fC = d => d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }).replace('.', '');
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  function periodo(per, off) {
    if (per === 'sem') { const a = lunes(new Date()); a.setDate(a.getDate() + 7 * off); const b = new Date(a); b.setDate(b.getDate() + 7);
      const fin = new Date(b - 1); return { a, b, t: 'Semana ' + semNum(a) + ' · ' + fC(a) + ' al ' + fC(fin) + ' ' + fin.getFullYear(), corto: 'Semana ' + semNum(a) + ' ' + a.getFullYear() }; }
    const h = new Date(), a = new Date(h.getFullYear(), h.getMonth() + off, 1), b = new Date(a.getFullYear(), a.getMonth() + 1, 1);
    const t = MESES[a.getMonth()].replace(/^./, c => c.toUpperCase()) + ' ' + a.getFullYear(); return { a, b, t, corto: t };
  }
  const en = (iso, P) => { if (!iso) return false; const d = new Date(iso); return d >= P.a && d < P.b; };
  const tLib = r => (r.lib && r.lib.t) || r.tCierre || '';
  const base = () => (S.agReq || []).filter(r => !r.maq && !r.prueba);   // sin requerimientos de máquinas de producción (van a Paros de máquinas)
  const avg = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : null;
  const AVANCE = { espera: 0, proceso: 40, pendiente: 60, terminada: 85, cerrada: 100 };
  const catN = r => r.req ? 'Requerimiento' : ((typeof AG_TCAT !== 'undefined' && (AG_TCAT[r.cat] || AG_TCAT.AG)[1]) || r.cat || '');
  function datos(P) {
    const R = base();
    const rec = R.filter(r => en(r.t0, P)), recF = rec.filter(r => !r.req), recQ = rec.filter(r => r.req);
    const ter = R.filter(r => en(r.tFin, P)).sort((x, y) => String(y.tFin).localeCompare(String(x.tFin)));
    const lib = R.filter(r => r.estado === 'cerrada' && en(tLib(r), P));
    const abiertas = R.filter(r => r.estado !== 'cerrada' && new Date(r.t0) < P.b).sort((x, y) => (AVANCE[y.estado] || 0) - (AVANCE[x.estado] || 0) || String(x.t0).localeCompare(String(y.t0)));
    const tiempos = ter.map(agMin).filter(x => x != null), cal = lib.filter(r => r.enc && r.enc.cal).map(r => r.enc.cal);
    return { R, rec, recF, recQ, ter, lib, abiertas, tProm: avg(tiempos), calProm: avg(cal), limpias: lib.filter(r => r.enc).length ? Math.round(lib.filter(r => r.enc && r.enc.limpia).length / lib.filter(r => r.enc).length * 100) : null,
      reinc: rec.filter(r => r.reab).length };
  }
  function semanasDelMes(P) {
    const L = []; let a = lunes(P.a);
    while (a < P.b) { const b = new Date(a); b.setDate(b.getDate() + 7); const s = { a: a < P.a ? P.a : a, b: b > P.b ? P.b : b }; L.push({ t: 'Sem ' + semNum(a) + ' · ' + fC(s.a) + '–' + fC(new Date(s.b - 1)), P: s }); a = b; }
    return L;
  }
  // ---------- pantalla
  function tarjetaTer(r) {
    const t = agMin(r), tec = (r.tecFin || r.tec || {}).n || '';
    const est = r.estado === 'cerrada' ? (r.enc ? '<span class="agHok">✅ Liberada · ' + agEstrellas(r.enc.cal) + '</span>' : '<span class="agHok">✅ Cerrada' + (r.cierreAdm ? ' por admin.' : '') + '</span>') : r.estado === 'terminada' ? '<span class="agHfal">⏳ falta que ' + esc((r.sol || {}).n || 'quien pidió') + ' libere</span>' : '<span class="agHfal">🔁 se reabrió</span>';
    return '<button type="button" class="agHt" data-agver="' + r.id + '"><div class="agHth"><b>' + esc(r.eqN || '') + '</b><small>' + esc(catN(r)) + '</small></div>' +
      '<p class="agHf">📝 ' + esc(r.desc || '') + '</p><p class="agHs">🔧 <b>Solución:</b> ' + esc(r.solucion || '—') + '</p>' +
      '<div class="agHp">📍 ' + esc(r.ubic || '—') + ' · 🧰 ' + esc(tec || '—') + ' · ⏱ ' + (t != null ? dur(t) : '—') + ' · ' + fdt(r.tFin) + '</div>' + est + '</button>';
  }
  function panel() {
    const H = S.agH, P = periodo(H.per, H.off), D = datos(P);
    const kp = [[D.recF.length, 'fallas recibidas', '#D32F2F'], [D.recQ.length, 'requerimientos recibidos', '#0E2A47'], [D.ter.length, 'trabajos terminados', '#1E8E5A'], [D.lib.length, 'liberados por quien pidió', '#2E7D32'],
      [D.abiertas.length, 'abiertos al cierre', '#E0A100'], [D.tProm != null ? dur(D.tProm) : '—', 'tiempo promedio de reparación', '#1F6FD1'], [D.calProm != null ? D.calProm.toFixed(1) + ' / 5' : '—', 'calidad promedio', '#C99700']];
    let semanas = '';
    if (H.per === 'mes') {
      const S2 = semanasDelMes(P).map(s => { const d = datos(s.P); return '<tr><td>' + esc(s.t) + '</td><td class="num">' + d.recF.length + '</td><td class="num">' + d.recQ.length + '</td><td class="num">' + d.ter.length + '</td><td class="num">' + d.lib.length + '</td><td class="num">' + (d.tProm != null ? dur(d.tProm) : '—') + '</td><td class="num">' + (d.calProm != null ? d.calProm.toFixed(1) : '—') + '</td></tr>'; }).join('');
      semanas = '<div class="box"><h3>📅 Resumen por semana · ' + esc(P.t) + '</h3><div class="scroll"><table class="tbl"><tr><th>Semana</th><th>Fallas</th><th>Requer.</th><th>Terminadas</th><th>Liberadas</th><th>Tiempo prom.</th><th>Calidad</th></tr>' + S2 + '</table></div></div>';
    }
    const cats = {}; D.rec.forEach(r => { const c = catN(r); cats[c] = (cats[c] || 0) + 1; });
    const maxC = Math.max(1, ...Object.values(cats));
    return '<section class="agHist" id="agHist">' +
      '<div class="box agHbar"><h3 style="margin:0">📚 Historial de áreas generales</h3>' +
        '<div class="seg">' + [['sem', 'Por semana'], ['mes', 'Por mes']].map(([k, t]) => '<button type="button" data-aghper="' + k + '" aria-pressed="' + (H.per === k) + '">' + t + '</button>').join('') + '</div>' +
        '<div class="agHnav"><button type="button" data-aghoff="-1" title="Anterior">‹</button><b>' + esc(P.t) + '</b><button type="button" data-aghoff="1" title="Siguiente"' + (H.off >= 0 ? ' disabled' : '') + '>›</button>' + (H.off ? '<button type="button" data-aghoff="0">Hoy</button>' : '') + '</div>' +
        '<button type="button" class="primary" data-aghpdf style="margin-left:auto">📄 PDF de avances y fallas · ' + esc(P.corto) + '</button></div>' +
      '<div class="agHk">' + kp.map(([v, l, c]) => '<div class="agHki" style="--c:' + c + '"><b>' + v + '</b><span>' + l + '</span></div>').join('') + '</div>' +
      (Object.keys(cats).length ? '<div class="box"><h3>Solicitudes del periodo por tipo</h3>' + Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([c, n]) => '<div class="agHcat"><span>' + esc(c) + '</span><i><em style="width:' + Math.round(n / maxC * 100) + '%"></em></i><b>' + n + '</b></div>').join('') + '</div>' : '') +
      '<div class="box"><h3>✅ Ya terminadas · ' + esc(P.t) + ' · ' + D.ter.length + '</h3>' +
        (D.ter.length ? '<div class="agHg">' + D.ter.map(tarjetaTer).join('') + '</div>' : '<p class="foot">Todavía no hay trabajos terminados en este periodo.</p>') + '</div>' +
      semanas + '</section>';
  }
  function pintar() {
    const body = document.getElementById('agBody'); if (!body || S.agt !== 'tab') return;
    const v = document.getElementById('agHist'); if (v) v.remove();
    body.insertAdjacentHTML('beforeend', panel());
  }
  function envolver() {
    if (typeof agTablero !== 'function' || agTablero._hist) return false;
    const b = agTablero; window.agTablero = function () { const r = b.apply(this, arguments); try { pintar(); } catch (e) { console.error(e); } return r; }; window.agTablero._hist = true; return true;
  }
  document.addEventListener('click', e => {
    const p = e.target.closest('[data-aghper]'); if (p) { S.agH.per = p.dataset.aghper; S.agH.off = 0; pintar(); return; }
    const o = e.target.closest('[data-aghoff]'); if (o) { const n = +o.dataset.aghoff; S.agH.off = n === 0 ? 0 : Math.min(0, S.agH.off + n); pintar(); return; }
    if (e.target.closest('[data-aghpdf]')) pdf().catch(x => { console.error(x); toast('No se pudo generar el PDF: ' + (x && x.message || x)); });
  });
  // ---------- PDF de avances y fallas
  async function pdf() {
    try { await cargarScript('../lib/jspdf.umd.min.js'); await cargarScript('../lib/jspdf.plugin.autotable.min.js'); }
    catch (e) { toast('No se pudo cargar el generador de PDF. Revisa la conexión.'); return; }
    toast('Generando PDF de áreas generales…');
    const H = S.agH, P = periodo(H.per, H.off), D = datos(P);
    const lim = s => String(s == null || s === '' ? '—' : s).replace(/[^\u0000-ÿ]/g, '').trim() || '—';
    const nom = n => n ? String(n).toLowerCase().replace(/(^|\s)\S/g, x => x.toUpperCase()) : '—';
    const fh = iso => { if (!iso) return '—'; const d = new Date(iso); return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }).replace('.', '') + ' ' + d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false }); };
    const { jsPDF } = window.jspdf, d = new jsPDF({ unit: 'mm', format: 'letter' });
    const VE = [31, 107, 58], AZ = [31, 79, 191], AM = [169, 109, 0], RO = [178, 58, 43], MA = [14, 42, 71], GR = [90, 102, 118], W = 216, M = 12;
    d.setFillColor(...MA); d.roundedRect(M, 10, W - 2 * M, 22, 2, 2, 'F'); d.setTextColor(255);
    d.setFont('helvetica', 'normal'); d.setFontSize(8); d.text('LÍNEA ITALIA · MANTENIMIENTO · ÁREAS GENERALES', M + 5, 16);
    d.setFont('helvetica', 'bold'); d.setFontSize(15); d.text('Avances y fallas · ' + P.t, M + 5, 24);
    d.setFont('helvetica', 'normal'); d.setFontSize(8); d.text('Generado ' + new Date().toLocaleString('es-MX') + (S.sesion ? ' · ' + nom(S.sesion.n) : ''), M + 5, 29);
    const kp = [[String(D.recF.length), 'fallas recibidas', RO], [String(D.recQ.length), 'requerimientos recibidos', MA], [String(D.ter.length), 'trabajos terminados', VE], [String(D.lib.length), 'liberados por quien pidió', VE],
      [String(D.abiertas.length), 'abiertos al cierre del periodo', AM], [D.tProm != null ? dur(D.tProm) : '—', 'tiempo prom. de reparación', AZ], [D.calProm != null ? D.calProm.toFixed(1) + '/5' : '—', 'calidad promedio' + (D.limpias != null ? ' · ' + D.limpias + '% limpias' : ''), AM]];
    const kw = (W - 2 * M - (kp.length - 1) * 2.5) / kp.length;
    kp.forEach(([v, l, col], i) => { const x = M + i * (kw + 2.5); d.setDrawColor(214, 221, 228); d.setFillColor(255); d.roundedRect(x, 36, kw, 17, 1.5, 1.5, 'FD'); d.setFillColor(...col); d.rect(x, 36, kw, 1.4, 'F'); d.setTextColor(23, 33, 46); d.setFont('helvetica', 'bold'); d.setFontSize(12.5); d.text(lim(v), x + 2.5, 44); d.setFont('helvetica', 'normal'); d.setFontSize(6.6); d.setTextColor(...GR); d.text(d.splitTextToSize(l, kw - 4), x + 2.5, 48.3); });
    d.setFontSize(7.5); d.setTextColor(...GR);
    const nota = d.splitTextToSize('Tiempo de reparación = de que el técnico acepta a que la marca terminada. Liberada = quien solicitó confirmó con su nómina y calificó. Avance: esperando técnico 0 %, en proceso 40 %, pendiente 60 %, terminada por liberar 85 %, liberada 100 %. Reincidencias en el periodo: ' + D.reinc + '.', W - 2 * M);
    d.text(nota, M, 58); let y = 58 + nota.length * 3.3 + 8;
    const titulo = (t, col) => { if (y > 248) { d.addPage(); y = 16; } d.setFillColor(col[0] + (255 - col[0]) * 0.85, col[1] + (255 - col[1]) * 0.85, col[2] + (255 - col[2]) * 0.85); d.roundedRect(M, y - 5, W - 2 * M, 7.5, 1.5, 1.5, 'F'); d.setTextColor(...col); d.setFont('helvetica', 'bold'); d.setFontSize(10.5); d.text(t, M + 3, y); y += 5; };
    const tabla = (head, body, opts) => { d.autoTable(Object.assign({ head: [head], body: body.length ? body : [[{ content: 'Sin registros en este periodo.', colSpan: head.length }]], startY: y, margin: { left: M, right: M }, theme: 'grid', styles: { font: 'helvetica', fontSize: 7.5, cellPadding: 1.4, lineColor: [214, 221, 228], lineWidth: 0.15, textColor: [23, 33, 46], valign: 'top' }, headStyles: { fillColor: [243, 245, 247], textColor: GR, fontStyle: 'bold', fontSize: 7 }, alternateRowStyles: { fillColor: [250, 251, 252] } }, opts || {})); y = d.lastAutoTable.finalY + 8; };
    // 1 · avances: lo que sigue abierto
    titulo('1 · Avances: trabajos abiertos al cierre del periodo (' + D.abiertas.length + ')', AM);
    tabla(['Recibida', 'Equipo / lugar', 'Falla o requerimiento', 'Estatus', 'Avance', 'Técnico', 'Compromiso / nota'],
      D.abiertas.map(r => [fh(r.t0), { content: lim(r.eqN) + '\n' + lim(r.ubic), styles: { fontStyle: 'bold' } }, (r.req ? '[Req.] ' : '') + lim(r.desc), lim(AG_EST[r.estado] || r.estado), (AVANCE[r.estado] || 0) + ' %', nom((r.tec || {}).n),
        r.estado === 'pendiente' && r.pend ? lim('Para el ' + (r.pend.fecha || 'sin fecha') + (r.pend.motivo ? ' · ' + r.pend.motivo : '')) : r.req && r.fechaReq ? 'Para el ' + r.fechaReq : r.est ? 'Estimado ' + lim(agFmtEst(r.est)) : '—']),
      { columnStyles: { 0: { cellWidth: 19 }, 1: { cellWidth: 32 }, 3: { cellWidth: 22 }, 4: { halign: 'right', cellWidth: 13 }, 5: { cellWidth: 24 } } });
    // 2 · fallas del periodo
    titulo('2 · Fallas reportadas en el periodo (' + D.recF.length + ')', RO);
    tabla(['Fecha', 'Equipo', 'Tipo', 'Lugar', 'Falla (lo que reportó el usuario)', 'Solicitó', 'Estatus hoy'],
      D.recF.slice().sort((a, b) => String(a.t0).localeCompare(String(b.t0))).map(r => [fh(r.t0), { content: lim(r.eqN), styles: { fontStyle: 'bold' } }, lim(catN(r)), lim(r.ubic), lim(r.desc) + (r.reab ? ' (REINCIDENCIA x' + (r.reab + 1) + ')' : ''), nom((r.sol || {}).n), lim(AG_EST[r.estado] || r.estado)]),
      { columnStyles: { 0: { cellWidth: 19 }, 1: { cellWidth: 30 }, 2: { cellWidth: 20 }, 3: { cellWidth: 18 }, 5: { cellWidth: 24 }, 6: { cellWidth: 22 } } });
    // 3 · fallas ya realizadas
    titulo('3 · Trabajos ya realizados en el periodo (' + D.ter.length + ')', VE);
    tabla(['Terminada', 'Equipo', 'Falla', 'Qué se hizo (solución)', 'Técnico', 'Tiempo', 'Calidad'],
      D.ter.slice().sort((a, b) => String(a.tFin).localeCompare(String(b.tFin))).map(r => { const t = agMin(r); return [fh(r.tFin), { content: lim(r.eqN), styles: { fontStyle: 'bold' } }, lim(r.desc), lim(r.solucion) + (r.usados ? ' · Material: ' + lim(r.usados) : ''), nom((r.tecFin || r.tec || {}).n), t != null ? lim(dur(t)) : '—', r.enc && r.enc.cal ? r.enc.cal + '/5' + (r.enc.limpia ? '' : ' sucia') : r.estado === 'terminada' ? 'por liberar' : r.cierreAdm ? 'cierre adm.' : '—']; }),
      { columnStyles: { 0: { cellWidth: 19 }, 1: { cellWidth: 28 }, 4: { cellWidth: 22 }, 5: { halign: 'right', cellWidth: 15 }, 6: { cellWidth: 16 } } });
    // 4 · requerimientos
    titulo('4 · Requerimientos y proyectos recibidos (' + D.recQ.length + ')', MA);
    tabla(['Recibido', 'Proyecto', 'Lugar', 'Qué se tiene que realizar', 'Para el', 'Material', 'Estatus'],
      D.recQ.map(r => { const m = r.mats || [], ok = m.filter(x => /recib/i.test(x.est || '')).length; return [fh(r.t0), { content: lim(r.eqN), styles: { fontStyle: 'bold' } }, lim(r.ubic), lim(r.desc), lim(r.fechaReq), m.length ? ok + ' de ' + m.length : '—', lim(AG_EST[r.estado] || r.estado)]; }),
      { columnStyles: { 0: { cellWidth: 19 }, 1: { cellWidth: 30 }, 2: { cellWidth: 18 }, 4: { cellWidth: 17 }, 5: { cellWidth: 15 }, 6: { cellWidth: 22 } } });
    // 5 · por semana (solo mes)
    if (H.per === 'mes') {
      titulo('5 · Resumen por semana', AZ);
      tabla(['Semana', 'Fallas', 'Requer.', 'Terminadas', 'Liberadas', 'Tiempo prom.', 'Calidad'],
        semanasDelMes(P).map(s => { const x = datos(s.P); return [s.t, String(x.recF.length), String(x.recQ.length), String(x.ter.length), String(x.lib.length), x.tProm != null ? lim(dur(x.tProm)) : '—', x.calProm != null ? x.calProm.toFixed(1) : '—']; }),
        { columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' } } });
    }
    // por técnico
    titulo((H.per === 'mes' ? '6' : '5') + ' · Por técnico', [60, 70, 82]);
    const T = {}; D.ter.forEach(r => { const n = nom((r.tecFin || r.tec || {}).n); const o = T[n] = T[n] || { n: 0, t: [], c: [] }; o.n++; const m = agMin(r); if (m != null) o.t.push(m); if (r.enc && r.enc.cal) o.c.push(r.enc.cal); });
    D.abiertas.forEach(r => { if (!r.tec) return; const n = nom(r.tec.n); T[n] = T[n] || { n: 0, t: [], c: [] }; T[n].ab = (T[n].ab || 0) + 1; });
    tabla(['Técnico', 'Terminados', 'Abiertos a su cargo', 'Tiempo promedio', 'Calidad promedio'],
      Object.entries(T).sort((a, b) => b[1].n - a[1].n).map(([n, o]) => [n, String(o.n), String(o.ab || 0), o.t.length ? lim(dur(avg(o.t))) : '—', o.c.length ? avg(o.c).toFixed(1) + '/5' : '—']),
      { tableWidth: 150, columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } } });
    const np = d.getNumberOfPages();
    for (let i = 1; i <= np; i++) { d.setPage(i); d.setDrawColor(214, 221, 228); d.line(M, 268, W - M, 268); d.setFontSize(7); d.setTextColor(...GR); d.text('Control de Paros · Áreas generales · Línea Italia · Departamento de Mantenimiento', M, 272); d.text('Hoja ' + i + ' de ' + np, W - M, 272, { align: 'right' }); }
    entregarPdf(d.output('blob'), 'Areas generales - avances y fallas ' + P.corto + '.pdf');
  }
  window.agHistPdf = pdf;
  // estilos
  const css = document.createElement('style');
  css.textContent = '.agHist{display:flex;flex-direction:column;gap:14px;margin-top:6px}' +
    '.agHbar{flex-direction:row!important;flex-wrap:wrap;align-items:center;gap:12px}' +
    '.agHnav{display:flex;align-items:center;gap:6px}.agHnav b{min-width:150px;text-align:center}.agHnav button{min-width:38px;font-weight:800}' +
    '.agHk{display:grid;grid-template-columns:repeat(auto-fit,minmax(105px,1fr));gap:10px}' +
    '.agHki{background:var(--card,#fff);border:1px solid var(--line,#d6dde4);border-top:4px solid var(--c);border-radius:14px;padding:10px 12px;display:flex;flex-direction:column;gap:2px}' +
    '.agHki b{font-size:22px;color:var(--fg)}.agHki span{font-size:12px;color:var(--muted)}' +
    '.agHcat{display:grid;grid-template-columns:130px 1fr 34px;align-items:center;gap:8px;font-size:13px;margin:3px 0}.agHcat i{height:10px;background:rgba(127,127,127,.15);border-radius:6px;overflow:hidden}.agHcat em{display:block;height:100%;background:linear-gradient(90deg,#1F6FD1,#1E8E5A);border-radius:6px}.agHcat b{text-align:right}' +
    '.agHg{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px}' +
    '.agHt{text-align:left!important;align-items:stretch!important;justify-content:flex-start!important;font-weight:400;display:flex;flex-direction:column;gap:5px;padding:12px;border-radius:14px;border:1px solid var(--line,#d6dde4);border-left:5px solid #1E8E5A;background:var(--card,#fff);cursor:pointer;color:var(--fg)}' +
    '.agHt:hover{box-shadow:0 6px 18px rgba(0,0,0,.12);transform:translateY(-1px)}' +
    '.agHth{display:flex;justify-content:space-between;gap:8px;align-items:baseline}.agHth b{font-size:15px}.agHth small{color:var(--muted);white-space:nowrap}' +
    '.agHf,.agHs{margin:0;font-size:13px}.agHp{font-size:12px;color:var(--muted)}' +
    '.agHok{align-self:flex-start;font-size:12px;font-weight:700;color:#1E8E5A;background:rgba(30,142,90,.12);border-radius:20px;padding:3px 10px}' +
    '.agHfal{align-self:flex-start;font-size:12px;font-weight:700;color:#A86F00;background:rgba(224,161,0,.15);border-radius:20px;padding:3px 10px}';
  document.head.appendChild(css);
  function iniciar() { if (!envolver()) return setTimeout(iniciar, 300); if (S.view === 'ag' && S.agt === 'tab') try { pintar(); } catch (e) {} }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
