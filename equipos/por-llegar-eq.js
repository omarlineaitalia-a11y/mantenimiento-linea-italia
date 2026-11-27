/* Base de Datos · equipos POR LLEGAR (Ing. Omar, 27-nov-2026)
 * 1) Alta (una sola vez, al entrar un administrador) de la enchapadora KDT KB-399R y su mesa de retorno KHF-530A, tipo A, por llegar.
 *    No se duplica: si ya existe un equipo con esa serie o esa clave, no se vuelve a crear.
 * 2) Etiqueta "🚚 POR LLEGAR" en la tarjeta del equipo.
 * 3) ⚙ Configuración → "🚚 Equipos por llegar" con el botón "▶ Poner en función" (activa en Base de Datos, Paros y Preventivo). */
(function () {
  'use strict';
  const NUEVOS = [
    { clave: 'MTA-17', serie: '1399260700602', o: {
      nombre: 'Enchapadora KDT KB-399R', corto: 'Enchapadora KDT', fab: 'Guangzhou KDT Machinery Group (Hongya CNC)', marca: 'KDT', modelo: 'KB-399R · Soft Forming Edge Bander',
      kw: '48.89', amp: '≈151 (calculada a 220 V, FP 0.85; confirmar con la placa)', vo: '220', periodo: 'Semanal / Mensual / Trimestral / Semestral / Anual', hdia: '9',
      ubic: 'Carpintería', prov: 'KDT · distribuidor MAQ / Trimaq', tel: 'info@trimaq.mx · www.trimaq.mx · www.kdtmac.com',
      obs: 'POR LLEGAR. Origen China. Pedimento aduanal 26 16 3737 6004386 (28-09-2026). Con todas sus partes. ' +
        'Canto recto 0.4–3 mm / perfilado (biselado recto, biselado arco, pico de pato, arco completo) 0.5–0.8 mm; tablero recto 9–60 mm; ' +
        'avance recto 10/15/18/24 m/min, perfilado 10 m/min; pieza mínima recta 120×90 mm, perfilada 300×150 mm. ' +
        'Extracción 10 bocas Ø126 + 1 Ø50 · 11,000 m³/h. Aire 0.6 MPa. Medidas 10,292 × 990 × 1,822 mm. Trabaja con la mesa de retorno KHF-530A (MTA-18). ' +
        'Pendiente de KDT: peso, consumo de aire, tipo de cola y crisol, manual de mantenimiento en español.' } },
    { clave: 'MTA-18', serie: '4530260702180', o: {
      nombre: 'Mesa de retorno KDT KHF-530A', corto: 'Mesa de retorno KDT', fab: 'Guangzhou KDT Machinery Group (Hongya CNC)', marca: 'KDT', modelo: 'KHF-530A 12M · transportador de retorno',
      kw: '2.75', amp: '≈8.5 (calculada a 220 V; confirmar con la placa)', vo: '220', periodo: 'Mensual / Semestral / Anual', hdia: '9',
      ubic: 'Carpintería', prov: 'KDT · distribuidor MAQ / Trimaq', tel: 'info@trimaq.mx · www.trimaq.mx · www.kdtmac.com',
      obs: 'POR LLEGAR. Origen China. Pedimento aduanal 26 16 3737 6004808 (25-09-2026). Con todas sus partes. ' +
        'Retorno de la enchapadora KB-399R (MTA-17): gira la pieza 90° y la regresa al operador (una persona hace los 4 cantos). ' +
        'Medidas 7,150–13,800 × 2,860 × 930 mm (mesa a 930 mm); hasta 23 m/min; tablero 350–2,400 × 100–1,200 × 10–60 mm; aire 0.6 MPa; 2.35–2.75 kW.' } }
  ];
  let sembrado = false;
  async function sembrar() {
    if (sembrado || typeof esAdmin !== 'function' || !esAdmin() || !D || D.cargado.MTA !== 'ok') return; sembrado = true;
    const todos = Object.values(D.eq), maxNo = Math.max(0, ...todos.map(x => +x.no || 0)); let n = 0;
    for (const x of NUEVOS) {
      if (todos.some(e => compacto(e.clave) === compacto(x.clave) || String(e.serie || '').replace(/\D/g, '') === x.serie)) continue;
      const o = Object.assign({ no: maxNo + (++n), catN: 'Maquinaria tipo A', cat: 'MTA', clave: x.clave, serie: x.serie, grupo: 'KB399R', parosCod: 'KB399R' }, x.o);
      o.id = nuevoId('n'); o.alta = sello(); o.porLlegar = Object.assign(sello(), { motivo: 'Comprada; en camino' }); o.pk = llavePlan(o.corto, o.no);
      try { await DB.doc('cat/MTA').update({ items: { [o.id]: o } }); D.eq[o.id] = o; registrarCambio('Alta', o, 'Equipo nuevo · por llegar'); toast('🚚 ' + o.clave + ' dada de alta (por llegar)'); }
      catch (e) { sembrado = false; return; }
    }
    if (n) try { pintar(); } catch (e) {}
  }
  setInterval(sembrar, 3000);
  // etiqueta en la tarjeta
  if (typeof tarjeta === 'function' && !tarjeta._pl) { const base = tarjeta; window.tarjeta = function (e) { let h = base.apply(this, arguments); if (e && e.porLlegar) h = h.replace('<span class="clave">', '<span style="position:absolute;left:6px;top:6px;background:#E0A100;color:#14212E;font:800 11px/1 \'Segoe UI\',sans-serif;padding:4px 7px;border-radius:8px;z-index:2">🚚 POR LLEGAR</span><span class="clave">'); return h; }; window.tarjeta._pl = true; }
  // caja en Configuración
  if (typeof vConfig === 'function' && !vConfig._pl) { const base = vConfig; window.vConfig = function (m) { const r = base.apply(this, arguments); try { if (m && esAdmin()) { const c = document.createElement('div'); c.className = 'card'; c.style.marginTop = '14px'; c.innerHTML = '<h2>🚚 Equipos por llegar</h2><p class="muted small" style="margin-top:-6px">Máquinas compradas que todavía no llegan. Cuando ya estén instaladas y empiecen a operar, dale <b>▶ Poner en función</b>: se activan aquí, en Control de Paros y en Mantenimiento Preventivo.</p><div id="plCaja"></div>'; const h2 = m.querySelector('h2'); if (h2 && h2.nextSibling) m.insertBefore(c, h2.nextSibling); else m.appendChild(c); if (window.PorLlegar) PorLlegar.pintarEn(c.querySelector('#plCaja'), () => setTimeout(() => { try { pintar(); } catch (x) {} }, 800)); } } catch (x) {} return r; }; window.vConfig._pl = true; }
})();
