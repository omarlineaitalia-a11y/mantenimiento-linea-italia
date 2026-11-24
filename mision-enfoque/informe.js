/* Misión Enfoque · ESTADÍSTICA, GRÁFICAS (Chart.js) e INFORME PDF (jsPDF + autotable)
 * Regla de anonimato: no se muestran desgloses de subgrupos con menos de N_MINIMO (10) alumnos ("n<10").
 */
(function () {
  'use strict';
  var I = window.INSTRUMENTO, NMIN = window.N_MINIMO || 10;
  var COL = { azul: '#2F6FDB', marino: '#1B2F6B', celeste: '#9DBEF5', celeste2: '#D3E4FF', rojo: '#D93A3F', rojoC: '#F08A8D', lima: '#B7D335', gris: '#C9D3E6', tinta: '#14204A' };
  var LIBS = {
    chart: ['https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js'],
    pdf: ['https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js']
  };
  var cargadas = {};
  function cargar(nombre) {
    if (cargadas[nombre]) return cargadas[nombre];
    cargadas[nombre] = LIBS[nombre].reduce(function (p, src) {
      return p.then(function () {
        return new Promise(function (res, rej) {
          var s = document.createElement('script'); s.src = src; s.onload = res;
          s.onerror = function () { delete cargadas[nombre]; rej(new Error('No se pudo cargar una librería (' + src.split('/').pop() + '). Revisa tu conexión a internet.')); };
          document.head.appendChild(s);
        });
      });
    }, Promise.resolve());
    return cargadas[nombre];
  }

  /* =================== ESTADÍSTICA =================== */
  function pct(a, b) { return b ? a / b * 100 : 0; }
  function r1(x) { return Math.round(x * 10) / 10; }
  function prom(a) { return a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : null; }
  function fechaCorta(iso) { var d = new Date(iso); return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2); }
  function diaKey(iso) { var d = new Date(iso); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function lunes(iso) { var d = new Date(iso); d.setHours(0, 0, 0, 0); var w = (d.getDay() + 6) % 7; d.setDate(d.getDate() - w); return diaKey(d.toISOString()); }
  function agrupar(rows, fn, orden) {
    var m = {};
    rows.forEach(function (r) { var k = fn(r); if (k == null || k === '') return; (m[k] = m[k] || { n: 0, pos: 0 }); m[k].n++; if (r.positivo) m[k].pos++; });
    var ks = orden ? orden.filter(function (k) { return m[k]; }) : Object.keys(m).sort();
    return ks.map(function (k) { var x = m[k]; return { k: String(k), n: x.n, pos: x.pos, pct: x.n >= NMIN ? pct(x.pos, x.n) : null }; });
  }
  function indices(r) {
    var j = r.juegos || {}, o = {};
    if (j.gng && j.gng.go) { o.reflejos = pct(j.gng.hits, j.gng.go); o.control = j.gng.nogo ? 100 - pct(j.gng.com, j.gng.nogo) : null; }
    if (j.mem) o.memoria = Math.min(100, (j.mem.span || 0) / 9 * 100);
    if (j.hunt && j.hunt.total) o.cazador = Math.max(0, pct(j.hunt.hits, j.hunt.total) - (j.hunt.err || 0) * 5);
    if (j.sem && j.sem.n) o.semaforo = 100 - pct(j.sem.ant || 0, j.sem.n);
    return o;
  }
  var MIS = [['reflejos', 'Reflejos (aciertos)'], ['control', 'Autocontrol (no tocar rojo)'], ['memoria', 'Memoria (secuencia)'], ['cazador', 'Cazador de estrellas'], ['semaforo', 'Semáforo (espera)']];

  function calcular(rows) {
    var C = window.CATALOGOS, n = rows.length, pos = rows.filter(function (r) { return r.positivo; }).length;
    var st = { n: n, pos: pos, pct: n >= NMIN ? pct(pos, n) : null, pctBruto: pct(pos, n) };
    st.ident = rows.filter(function (r) { return r.identificado; }).length; st.anon = n - st.ident;
    st.promTotal = prom(rows.map(function (r) { return r.total; }));
    st.fechas = rows.map(function (r) { return r.fecha; }).sort();
    st.desde = st.fechas[0] || null; st.hasta = st.fechas[st.fechas.length - 1] || null;
    st.bandas = I.bandas.map(function (b) { var c = rows.filter(function (r) { return r.total >= b.min && r.total <= b.max; }).length; return { b: b, n: c, pct: pct(c, n) }; });
    st.hist = []; for (var i = 0; i <= I.max; i++) st.hist.push(0); rows.forEach(function (r) { st.hist[Math.max(0, Math.min(I.max, r.total))]++; });
    st.sexo = agrupar(rows, function (r) { return r.sexo; }, C.sexos);
    st.edad = agrupar(rows, function (r) { return r.edad; }, C.edades.map(String));
    st.grupo = agrupar(rows, function (r) { return r.semestre + '' + r.grupo; });
    st.turno = agrupar(rows, function (r) { return r.turno; }, C.turnos);
    st.semestre = agrupar(rows, function (r) { return r.semestre; }, C.semestres.map(String));
    var dias = {}; rows.forEach(function (r) { var k = diaKey(r.fecha); dias[k] = (dias[k] || 0) + 1; });
    st.dias = Object.keys(dias).sort().map(function (k) { return { k: k, n: dias[k] }; });
    st.semanas = agrupar(rows, function (r) { return lunes(r.fecha); });
    function perfil(sub) {
      return { n: sub.length, inat: sub.length >= NMIN ? prom(sub.map(function (r) { return pct(r.inat, I.subescalas.inatencion.max); })) : null,
        hiper: sub.length >= NMIN ? prom(sub.map(function (r) { return pct(r.hiper, I.subescalas.hiperactividad.max); })) : null };
    }
    var P = rows.filter(function (r) { return r.positivo; }), N = rows.filter(function (r) { return !r.positivo; });
    st.perfil = { todos: perfil(rows), pos: perfil(P), neg: perfil(N) };
    st.predomina = { inat: 0, hiper: 0, mixto: 0 };
    P.forEach(function (r) { var a = pct(r.inat, 16), h = pct(r.hiper, 8); if (a - h >= 15) st.predomina.inat++; else if (h - a >= 15) st.predomina.hiper++; else st.predomina.mixto++; });
    function mis(sub) {
      var o = { n: 0 }; var con = sub.filter(function (r) { return r.juegos && Object.keys(r.juegos).length; }); o.n = con.length;
      MIS.forEach(function (m) { var v = con.map(function (r) { return indices(r)[m[0]]; }).filter(function (x) { return x != null && !isNaN(x); }); o[m[0]] = v.length >= NMIN ? prom(v) : null; o[m[0] + 'N'] = v.length; });
      return o;
    }
    st.misiones = { todos: mis(rows), pos: mis(P), neg: mis(N) };
    st.jugaron = st.misiones.todos.n;
    st.sombreadas = rows.filter(function (r) { var s = r.sombreadas != null ? r.sombreadas : I.calificar(r.resp || []).sombreadas; return s >= 4; }).length;
    // tendencia: primera vs segunda mitad del periodo (por fecha)
    var ord = rows.slice().sort(function (a, b) { return String(a.fecha).localeCompare(String(b.fecha)); }), mitad = Math.floor(ord.length / 2);
    var A = ord.slice(0, mitad), Bm = ord.slice(mitad);
    st.tendencia = { a: A.length, b: Bm.length, pa: A.length >= NMIN ? pct(A.filter(function (r) { return r.positivo; }).length, A.length) : null, pb: Bm.length >= NMIN ? pct(Bm.filter(function (r) { return r.positivo; }).length, Bm.length) : null };
    return st;
  }

  function fmtPct(x) { return x == null ? 'n<' + NMIN : r1(x).toFixed(1) + ' %'; }
  function fechaLarga(iso) { if (!iso) return '—'; return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }); }

  function analisis(st) {
    var t = [];
    if (!st.n) return ['No hay encuestas con los filtros elegidos.'];
    t.push('Se analizaron ' + st.n + ' encuestas aplicadas entre el ' + fechaLarga(st.desde) + ' y el ' + fechaLarga(st.hasta) + '. ' +
      (st.pct == null ? 'Como son menos de ' + NMIN + ' encuestas, no se reportan porcentajes para proteger la confidencialidad.' :
        st.pos + ' alumnos (' + fmtPct(st.pct) + ') obtuvieron 14 o más puntos de 24, es decir, un resultado que sugiere valoración. El puntaje promedio fue de ' + r1(st.promTotal) + ' de 24.'));
    if (st.pct != null) {
      t.push('Como referencia, la prevalencia de TDAH esperada en adolescentes es de 5 a 8 %, y el tamizaje siempre identifica más casos posibles que los diagnósticos reales. ' +
        (st.pct > 20 ? 'El porcentaje observado es alto frente a esa referencia; puede reflejar falsos positivos, estrés escolar o el uso del instrumento en menores de 18 años, por lo que la entrevista con Orientación es indispensable antes de cualquier canalización.' :
          st.pct >= 5 ? 'El porcentaje observado está dentro de lo que se reporta en tamizajes con estudiantes (p. ej., 15.9 % en la iniciativa OMS WMH-ICS).' :
            'El porcentaje observado es bajo frente a la referencia; recuerde que un resultado negativo no descarta dificultades.'));
      var b = st.bandas; t.push('Distribución por bandas oficiales: ' + b.map(function (x) { return x.b.nombre.toLowerCase() + ' ' + x.n + ' (' + r1(x.pct) + ' %)'; }).join('; ') + '. Los ' + b[1].n + ' alumnos en "negativo alto" (10–13) pueden recibir tips y entrevista voluntaria si la piden.');
    }
    function comparar(lista, nombre) {
      var ok = lista.filter(function (x) { return x.pct != null; });
      var chicos = lista.filter(function (x) { return x.pct == null; }).length;
      if (ok.length < 2) return 'Por ' + nombre + ': no hay suficientes alumnos en cada subgrupo (n<' + NMIN + ') para comparar.';
      ok.sort(function (a, b) { return b.pct - a.pct; });
      var hi = ok[0], lo = ok[ok.length - 1];
      return 'Por ' + nombre + ': el porcentaje más alto se observa en ' + hi.k + ' (' + fmtPct(hi.pct) + ', n=' + hi.n + ') y el más bajo en ' + lo.k + ' (' + fmtPct(lo.pct) + ', n=' + lo.n + ')' +
        (Math.abs(hi.pct - lo.pct) < 8 ? '; la diferencia es pequeña y probablemente no es relevante.' : '; con estos tamaños de muestra la diferencia debe tomarse con cautela.') +
        (chicos ? ' ' + chicos + ' subgrupo(s) no se reportan por tener menos de ' + NMIN + ' alumnos.' : '');
    }
    t.push(comparar(st.sexo, 'sexo'));
    t.push(comparar(st.edad, 'edad'));
    t.push(comparar(st.grupo, 'grupo'));
    t.push(comparar(st.turno, 'turno'));
    if (st.tendencia.pa != null && st.tendencia.pb != null) {
      var d = st.tendencia.pb - st.tendencia.pa;
      t.push('Tendencia en el periodo: en la primera mitad de las encuestas ' + fmtPct(st.tendencia.pa) + ' requirió valoración y en la segunda mitad ' + fmtPct(st.tendencia.pb) + (Math.abs(d) < 5 ? ' (estable).' : d > 0 ? ' (aumento; revisar si cambió el grupo o el momento de aplicación).' : ' (disminución).'));
    }
    if (st.pos) {
      t.push('Subperfiles (descriptivos, sin punto de corte): entre quienes requieren valoración, ' + st.predomina.inat + ' muestran predominio de inatención/organización, ' + st.predomina.hiper + ' de hiperactividad/inquietud y ' + st.predomina.mixto + ' un perfil mixto. ' +
        (st.perfil.pos.inat != null ? 'En promedio, la subescala de inatención llega a ' + r1(st.perfil.pos.inat) + ' % de su máximo y la de hiperactividad a ' + r1(st.perfil.pos.hiper) + ' %.' : '') +
        ' Esto ayuda a Orientación a saber por dónde empezar la entrevista.');
    }
    var mp = st.misiones.pos, mn = st.misiones.neg;
    if (st.jugaron) {
      var comp = MIS.filter(function (m) { return mp[m[0]] != null && mn[m[0]] != null; });
      t.push(st.jugaron + ' alumnos jugaron al menos una misión. ' + (comp.length ?
        'Comparando índices (0–100): ' + comp.map(function (m) { return m[1].toLowerCase() + ' ' + Math.round(mp[m[0]]) + ' vs ' + Math.round(mn[m[0]]); }).join('; ') + ' (requieren valoración vs sin indicios). ' :
        'No hay suficientes alumnos en cada grupo para comparar el desempeño. ') +
        'Las misiones son una actividad didáctica: no cuentan en el puntaje ni en la decisión de canalizar, y dependen del celular, el cansancio y la práctica.');
    }
    t.push('Dato secundario (método antiguo de casillas sombreadas, 4 o más de 6): ' + st.sombreadas + ' de ' + st.n + ' (' + r1(pct(st.sombreadas, st.n)) + ' %). Este método da prevalencias más altas (p. ej., 35.5 % en UNAM FES Iztacala con ASRS sola, frente a 16.2 % combinando instrumentos) y solo se muestra para comparar con estudios anteriores.');
    t.push(st.anon + ' encuestas fueron anónimas y ' + st.ident + ' identificadas. Para los casos anónimos que requieren valoración, Orientación puede ofrecer pláticas grupales y difundir la ruta de atención, ya que no es posible contactarlos individualmente.');
    return t;
  }

  /* =================== GRÁFICAS =================== */
  var LISTA = [
    { k: 'dias', t: 'Encuestas por día', nota: 'Número de encuestas capturadas', ancha: true },
    { k: 'positivos', t: 'Resultado del tamizaje', nota: 'Requiere valoración = 14 o más de 24' },
    { k: 'anonimos', t: 'Anónimos vs identificados', nota: 'El nombre es opcional' },
    { k: 'bandas', t: 'Bandas de puntaje (calificación oficial 2024)', nota: '0–9 negativo bajo · 10–13 negativo alto · 14–17 positivo bajo · 18–24 positivo alto' },
    { k: 'puntajes', t: 'Distribución de puntajes (0–24)', nota: 'En rojo: 14 o más (requiere valoración)' },
    { k: 'sexo', t: '% que requiere valoración por sexo', nota: 'Subgrupos con menos de 10 alumnos no se muestran (n<10)' },
    { k: 'edad', t: '% que requiere valoración por edad', nota: 'Subgrupos con menos de 10 alumnos no se muestran (n<10)' },
    { k: 'grupo', t: '% que requiere valoración por grupo', nota: 'Semestre y grupo · subgrupos con menos de 10 alumnos: n<10', ancha: true },
    { k: 'turno', t: '% que requiere valoración por turno', nota: 'Subgrupos con menos de 10 alumnos: n<10' },
    { k: 'semana', t: 'Tendencia semanal', nota: '% que requiere valoración por semana (semanas con n<10 sin punto)' },
    { k: 'perfil', t: 'Perfil: inatención vs hiperactividad', nota: 'Promedio en % del máximo de cada subescala (descriptivo, sin punto de corte)' },
    { k: 'misiones', t: 'Desempeño en misiones', nota: 'Índice 0–100 (más es mejor). Actividad didáctica: NO cuenta en el puntaje', ancha: true }
  ];
  function etiq(lista, suf) { return lista.map(function (x) { return (suf || '') + x.k + (x.pct == null ? ' (n<' + NMIN + ')' : ' (n=' + x.n + ')'); }); }
  function barPct(lista, color, suf) {
    return { type: 'bar', data: { labels: etiq(lista, suf), datasets: [{ label: '% requiere valoración', data: lista.map(function (x) { return x.pct == null ? null : r1(x.pct); }), backgroundColor: color || COL.azul, borderRadius: 8, maxBarThickness: 48 }] },
      options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, suggestedMax: 40, ticks: { callback: function (v) { return v + ' %'; } } } } } };
  }
  function config(k, st) {
    var c;
    switch (k) {
      case 'dias': c = { type: 'bar', data: { labels: st.dias.map(function (d) { return fechaCorta(d.k + 'T12:00:00'); }), datasets: [{ label: 'Encuestas', data: st.dias.map(function (d) { return d.n; }), backgroundColor: COL.azul, borderRadius: 6, maxBarThickness: 40 }] }, options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } } }; break;
      case 'positivos': c = { type: 'doughnut', data: { labels: ['Requiere valoración', 'Sin indicios'], datasets: [{ data: [st.pos, st.n - st.pos], backgroundColor: [COL.rojo, COL.celeste], borderWidth: 0 }] }, options: { cutout: '62%' } }; break;
      case 'anonimos': c = { type: 'doughnut', data: { labels: ['Anónimos', 'Identificados'], datasets: [{ data: [st.anon, st.ident], backgroundColor: [COL.gris, COL.azul], borderWidth: 0 }] }, options: { cutout: '62%' } }; break;
      case 'bandas': c = { type: 'bar', data: { labels: st.bandas.map(function (b) { return b.b.nombre + ' (' + b.b.min + '–' + b.b.max + ')'; }), datasets: [{ label: 'Alumnos', data: st.bandas.map(function (b) { return b.n; }), backgroundColor: st.bandas.map(function (b) { return b.b.color; }), borderRadius: 8, maxBarThickness: 60 }] }, options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } } }; break;
      case 'puntajes': c = { type: 'bar', data: { labels: st.hist.map(function (_, i) { return String(i); }), datasets: [{ label: 'Alumnos', data: st.hist, backgroundColor: st.hist.map(function (_, i) { return i >= I.corte ? COL.rojo : COL.azul; }), borderRadius: 4 }] }, options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { title: { display: true, text: 'Puntaje total' } } } } }; break;
      case 'sexo': c = barPct(st.sexo, COL.azul); break;
      case 'edad': c = barPct(st.edad, COL.marino, ''); break;
      case 'grupo': c = barPct(st.grupo, COL.azul); break;
      case 'turno': c = barPct(st.turno, COL.marino); break;
      case 'semana': c = { type: 'line', data: { labels: st.semanas.map(function (s) { return 'Sem. ' + fechaCorta(s.k + 'T12:00:00') + (s.pct == null ? ' (n<' + NMIN + ')' : ''); }), datasets: [{ label: '% requiere valoración', data: st.semanas.map(function (s) { return s.pct == null ? null : r1(s.pct); }), borderColor: COL.azul, backgroundColor: 'rgba(47,111,219,.12)', fill: true, tension: 0.3, pointRadius: 5, pointBackgroundColor: COL.marino, spanGaps: false }] }, options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, suggestedMax: 40, ticks: { callback: function (v) { return v + ' %'; } } } } } }; break;
      case 'perfil':
        var g = [['Todos', st.perfil.todos], ['Sin indicios', st.perfil.neg], ['Requiere valoración', st.perfil.pos]];
        c = { type: 'bar', data: { labels: g.map(function (x) { return x[0] + (x[1].inat == null ? ' (n<' + NMIN + ')' : ' (n=' + x[1].n + ')'); }), datasets: [
          { label: 'Inatención (P1–P4)', data: g.map(function (x) { return x[1].inat == null ? null : r1(x[1].inat); }), backgroundColor: COL.azul, borderRadius: 6, maxBarThickness: 42 },
          { label: 'Hiperactividad (P5–P6)', data: g.map(function (x) { return x[1].hiper == null ? null : r1(x[1].hiper); }), backgroundColor: COL.lima, borderRadius: 6, maxBarThickness: 42 }] },
          options: { scales: { y: { beginAtZero: true, max: 100, ticks: { callback: function (v) { return v + ' %'; } } } } } }; break;
      case 'misiones':
        c = { type: 'bar', data: { labels: MIS.map(function (m) { return m[1]; }), datasets: [
          { label: 'Sin indicios', data: MIS.map(function (m) { var v = st.misiones.neg[m[0]]; return v == null ? null : Math.round(v); }), backgroundColor: COL.celeste, borderRadius: 6, maxBarThickness: 36 },
          { label: 'Requiere valoración', data: MIS.map(function (m) { var v = st.misiones.pos[m[0]]; return v == null ? null : Math.round(v); }), backgroundColor: COL.rojoC, borderRadius: 6, maxBarThickness: 36 }] },
          options: { scales: { y: { beginAtZero: true, max: 100 } } } }; break;
    }
    c.options = c.options || {};
    c.options.maintainAspectRatio = false;
    c.options.plugins = Object.assign({ legend: { position: 'bottom', labels: { boxWidth: 12, font: { family: 'Nunito, system-ui, sans-serif', weight: '700' } } } }, c.options.plugins || {});
    return c;
  }
  function fuentes() {
    if (!window.Chart) return;
    Chart.defaults.font.family = 'Nunito, system-ui, "Segoe UI", Roboto, Arial, sans-serif';
    Chart.defaults.color = '#5E6B8C';
    Chart.defaults.borderColor = '#E6EDF8';
  }
  // imagen PNG de una gráfica (fuera de pantalla, sin animación) para el PDF
  function imagen(k, st, w, h) {
    var div = document.createElement('div'); div.style.cssText = 'position:fixed;left:-10000px;top:0;width:' + w + 'px;height:' + h + 'px;background:#fff';
    var cv = document.createElement('canvas'); cv.width = w; cv.height = h; div.appendChild(cv); document.body.appendChild(div);
    var c = config(k, st); c.options.animation = false; c.options.responsive = false; c.options.devicePixelRatio = 1.6;
    c.plugins = [{ id: 'fondo', beforeDraw: function (ch) { var x = ch.ctx; x.save(); x.fillStyle = '#fff'; x.fillRect(0, 0, ch.width, ch.height); x.restore(); } }];
    var ch = new Chart(cv, c); var url = ch.toBase64Image('image/jpeg', 0.88); ch.destroy(); div.remove();
    return url;
  }

  /* =================== INFORME PDF =================== */
  function svgPng(svg, w, h) {
    return new Promise(function (res) {
      try {
        var s = svg.replace('<svg ', '<svg width="' + w + '" height="' + h + '" ');
        var img = new Image();
        img.onload = function () { try { var c = document.createElement('canvas'); c.width = w; c.height = h; var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.drawImage(img, 0, 0, w, h); res(c.toDataURL('image/png')); } catch (e) { res(null); } };
        img.onerror = function () { res(null); };
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
      } catch (e) { res(null); }
    });
  }
  function rgb(hex) { hex = hex.replace('#', ''); return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)]; }
  function limpio(s) { return String(s == null ? '' : s).replace(/[≥]/g, '>=').replace(/[≤]/g, '<=').replace(/[–—]/g, '-').replace(/[“”]/g, '"').replace(/[^\x00-\xFF•]/g, ''); }
  function nombreParticipante(r, conNombres) {
    if (r.identificado && conNombres && r.nombre) return r.nombre;
    return (r.identificado ? 'Folio #' : 'Anónimo #') + r.folio;
  }

  function generar(o) {
    // o: { filas, filtrosTxt, perfil, conNombres }
    return Promise.all([cargar('pdf'), cargar('chart')]).then(function () {
      fuentes();
      var st = calcular(o.filas);
      return svgPng(window.ARTE.logo(), 640, 190).then(function (logo) { return construir(o, st, logo); });
    });
  }

  function construir(o, st, logo) {
    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF({ unit: 'mm', format: 'letter' });
    var W = 215.9, H = 279.4, M = 16, y = 0, ancho = W - 2 * M;
    var AZ = rgb(COL.azul), MA = rgb(COL.marino), RO = rgb(COL.rojo), GR = [94, 107, 140];
    function nuevaPagina() { doc.addPage(); y = 22; }
    function espacio(h) { if (y + h > H - 20) nuevaPagina(); }
    function titulo(t) { espacio(18); doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor.apply(doc, MA); doc.text(limpio(t), M, y); doc.setDrawColor.apply(doc, AZ); doc.setLineWidth(0.8); doc.line(M, y + 2, M + 30, y + 2); y += 9; }
    function subt(t) { espacio(10); doc.setFont('helvetica', 'bold'); doc.setFontSize(11.5); doc.setTextColor.apply(doc, MA); doc.text(limpio(t), M, y); y += 6; }
    function parrafo(t, tam, color) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(tam || 10); doc.setTextColor.apply(doc, color || [20, 32, 74]);
      var ls = doc.splitTextToSize(limpio(t), ancho); var lh = (tam || 10) * 0.45;
      ls.forEach(function (l) { espacio(lh + 1); doc.text(l, M, y); y += lh; }); y += 2.5;
    }
    function vinetas(lst, tam) { lst.forEach(function (t) { doc.setFont('helvetica', 'normal'); doc.setFontSize(tam || 10); doc.setTextColor(20, 32, 74); var ls = doc.splitTextToSize(limpio(t), ancho - 6); var lh = (tam || 10) * 0.45; espacio(lh * ls.length + 2); doc.text('•', M + 1, y); ls.forEach(function (l) { doc.text(l, M + 6, y); y += lh; }); y += 1.5; }); y += 1.5; }
    function grafica(k, w, h) {
      var meta = LISTA.filter(function (x) { return x.k === k; })[0];
      var alto = w * h / 1000 * 0.9;
      espacio(alto + 14);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor.apply(doc, MA); doc.text(limpio(meta.t), M, y); y += 4;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor.apply(doc, GR); doc.text(limpio(meta.nota), M, y); y += 2;
      var img = imagen(k, st, 1000, Math.round(1000 * h / w));
      var wmm = ancho, hmm = ancho * h / w;
      doc.addImage(img, 'JPEG', M, y, wmm, hmm, undefined, 'FAST'); y += hmm + 6;
    }
    function tablaSub(lista, nombre) {
      doc.autoTable({ startY: y, margin: { left: M, right: M }, head: [[nombre, 'Alumnos', 'Requieren valoración', '%']],
        body: lista.map(function (x) { return [x.k, x.n, x.pct == null ? 'n<' + NMIN : x.pos, fmtPct(x.pct)]; }),
        styles: { fontSize: 9, cellPadding: 1.8 }, headStyles: { fillColor: AZ, textColor: 255 }, alternateRowStyles: { fillColor: [244, 248, 255] }, theme: 'grid' });
      y = doc.lastAutoTable.finalY + 6;
    }

    /* ---- portada */
    doc.setFillColor(232, 241, 255); doc.rect(0, 0, W, H, 'F');
    doc.setFillColor.apply(doc, AZ); doc.rect(0, 0, W, 92, 'F');
    doc.setFillColor(183, 211, 53); doc.rect(0, 92, W, 3, 'F');
    if (logo) { doc.setFillColor(255, 255, 255); doc.roundedRect(M, 16, 92, 30, 4, 4, 'F'); doc.addImage(logo, 'PNG', M + 3, 18, 86, 25.7); }
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(26); doc.text('Misión Enfoque', M, 64);
    doc.setFontSize(13); doc.setFont('helvetica', 'normal'); doc.text(limpio('Informe de tamizaje de atención (TDAH) — no es un diagnóstico'), M, 74);
    doc.setFontSize(11); doc.text('CECyTEA · Plantel Cd. Satélite Morelos · Aguascalientes', M, 83);
    y = 112; doc.setTextColor.apply(doc, MA); doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text('Periodo', M, y);
    doc.setFont('helvetica', 'normal'); doc.text(limpio(st.desde ? fechaLarga(st.desde) + ' al ' + fechaLarga(st.hasta) : 'Sin encuestas'), M + 40, y); y += 8;
    doc.setFont('helvetica', 'bold'); doc.text('Filtros', M, y); doc.setFont('helvetica', 'normal');
    var fl = doc.splitTextToSize(limpio(o.filtrosTxt || 'Ninguno (todas las encuestas)'), ancho - 40); doc.text(fl, M + 40, y); y += 6 * fl.length + 2;
    doc.setFont('helvetica', 'bold'); doc.text('Encuestas', M, y); doc.setFont('helvetica', 'normal'); doc.text(String(st.n), M + 40, y); y += 8;
    doc.setFont('helvetica', 'bold'); doc.text('Instrumento', M, y); doc.setFont('helvetica', 'normal'); doc.text(doc.splitTextToSize(limpio(I.nombreCorto + ' · ' + I.version), ancho - 40), M + 40, y); y += 14;
    doc.setFont('helvetica', 'bold'); doc.text('Generado', M, y); doc.setFont('helvetica', 'normal'); doc.text(limpio(new Date().toLocaleString('es-MX') + ' por ' + (o.perfil ? o.perfil.nombre + ' (' + o.perfil.usuario + ')' : '')), M + 40, y); y += 8;
    doc.setFont('helvetica', 'bold'); doc.text('Nombres', M, y); doc.setFont('helvetica', 'normal'); doc.text(o.conNombres ? 'Incluidos (usuario con permiso)' : 'Ocultos: se muestra el folio', M + 40, y); y += 16;
    doc.setFillColor(255, 255, 255); doc.roundedRect(M, y, ancho, 34, 4, 4, 'F'); doc.setDrawColor.apply(doc, RO); doc.setLineWidth(0.6); doc.roundedRect(M, y, ancho, 34, 4, 4, 'S');
    doc.setTextColor.apply(doc, RO); doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text('DOCUMENTO CONFIDENCIAL', M + 6, y + 9);
    doc.setTextColor(20, 32, 74); doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5);
    doc.text(doc.splitTextToSize(limpio('Contiene datos sensibles de salud de alumnos, en su mayoría menores de edad. Uso exclusivo del área de Orientación del plantel. No compartir con compañeros ni publicar. El tamizaje no diagnostica: un resultado positivo solo indica que conviene una entrevista y, si procede, una valoración profesional.'), ancho - 12), M + 6, y + 16);
    doc.setFontSize(8.5); doc.setTextColor.apply(doc, GR); doc.text('Proyecto del Grupo 5J · Misión Enfoque', M, H - 14);

    /* ---- resumen ejecutivo */
    nuevaPagina(); titulo('1. Resumen ejecutivo');
    var kp = [['Encuestas', String(st.n), MA], ['Requieren valoración', st.pct == null ? 'n<' + NMIN : st.pos + ' (' + r1(st.pct) + '%)', RO], ['Anónimas / identificadas', st.anon + ' / ' + st.ident, MA], ['Puntaje promedio', st.promTotal == null ? '—' : r1(st.promTotal) + ' / 24', MA]];
    var bw = (ancho - 9) / 4;
    kp.forEach(function (k, i) {
      var x = M + i * (bw + 3); doc.setFillColor(232, 241, 255); doc.roundedRect(x, y, bw, 24, 3, 3, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor.apply(doc, k[2]); doc.text(limpio(k[1]), x + 4, y + 11);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor.apply(doc, GR); doc.text(doc.splitTextToSize(limpio(k[0]), bw - 8), x + 4, y + 18);
    });
    y += 32;
    var an = analisis(st);
    vinetas(an.slice(0, 3));
    parrafo('Recomendación principal: entrevistar en privado (en 2 semanas o menos) a los alumnos identificados que requieren valoración, avisar a sus familias con información clara y seguir la ruta de referencia de la sección 7. Ningún alumno debe ser etiquetado ni canalizado solo por este resultado.', 10, MA);

    /* ---- metodología */
    titulo('2. Metodología');
    parrafo('Instrumento: ' + I.nombre + '. ' + I.version + '. Seis preguntas sobre los últimos 6 meses, con respuestas Nunca (0), Raramente (1), A veces (2), Frecuentemente (3) y Muy frecuentemente (4). Se usa el texto oficial en español para EE. UU. y México, sin modificaciones; los ejemplos escolares que se muestran debajo de cada pregunta son una ayuda opcional propia.');
    parrafo('Calificación: puntaje total de 0 a 24. Resultado "requiere valoración" con 14 o más. Bandas: 0-9 negativo bajo, 10-13 negativo alto, 14-17 positivo bajo, 18-24 positivo alto. Subescalas descriptivas: inatención/organización (preguntas 1 a 4, 0-16) e hiperactividad/inquietud (preguntas 5 y 6, 0-8), sin punto de corte.');
    parrafo('Aplicación: en el teléfono de Orientación, en modo encuesta, con datos de edad, sexo, semestre, grupo y turno; el nombre es opcional. El alumno no ve su resultado. Después contesta, si quiere, cuatro misiones breves (reflejos tipo go/no-go, memoria tipo Corsi, cazador de estrellas y semáforo), que son una actividad didáctica y NO cuentan en el puntaje.');
    subt('Advertencias');
    vinetas(I.advertencias, 9.5);
    subt('Antecedentes (contexto)');
    vinetas(I.antecedentes, 9.5);
    parrafo('Cita: ' + I.cita + ' ' + I.copyright + ' Calificación: ' + I.citaCalificacion, 8.5, GR);

    /* ---- resultados */
    nuevaPagina(); titulo('3. Resultados');
    if (st.n) {
      grafica('positivos', 1000, 420); grafica('bandas', 1000, 420); grafica('puntajes', 1000, 420);
      grafica('dias', 1000, 380); grafica('semana', 1000, 380);
      titulo('4. Comparación por subgrupos');
      parrafo('Por confidencialidad, los subgrupos con menos de ' + NMIN + ' alumnos se muestran como "n<' + NMIN + '".', 9, GR);
      grafica('sexo', 1000, 400); tablaSub(st.sexo, 'Sexo');
      grafica('edad', 1000, 400); tablaSub(st.edad, 'Edad');
      grafica('grupo', 1000, 420); tablaSub(st.grupo, 'Grupo');
      grafica('turno', 1000, 380); tablaSub(st.turno, 'Turno');
      titulo('5. Perfil y misiones');
      grafica('perfil', 1000, 420);
      grafica('misiones', 1000, 420);
      var mt = st.misiones;
      doc.autoTable({ startY: y, margin: { left: M, right: M }, head: [['Misión (índice 0-100)', 'Todos', 'Sin indicios', 'Requiere valoración']],
        body: MIS.map(function (m) { function f(v) { return v == null ? 'n<' + NMIN : String(Math.round(v)); } return [m[1], f(mt.todos[m[0]]), f(mt.neg[m[0]]), f(mt.pos[m[0]])]; }),
        styles: { fontSize: 9, cellPadding: 1.8 }, headStyles: { fillColor: AZ, textColor: 255 }, theme: 'grid' });
      y = doc.lastAutoTable.finalY + 4;
      parrafo('Las misiones son una actividad didáctica: no forman parte del puntaje ni de la decisión de canalizar. Pruebas como go/no-go o Corsi discriminan de forma modesta y en celular dependen del equipo, el entorno y el cansancio.', 9, GR);
    } else parrafo('No hay encuestas con los filtros elegidos.');

    /* ---- análisis */
    titulo('6. Análisis automático');
    vinetas(an, 10);

    /* ---- participantes */
    nuevaPagina(); titulo('Lista de participantes');
    parrafo('Los alumnos que requieren valoración aparecen en ROJO y subrayados. ' + (o.conNombres ? '' : 'Los nombres están ocultos (el usuario no tiene permiso para verlos); se muestra el folio.'), 9, GR);
    var filas = o.filas.slice().sort(function (a, b) { return (b.positivo - a.positivo) || String(a.fecha).localeCompare(String(b.fecha)); });
    doc.autoTable({
      startY: y, margin: { left: M, right: M },
      head: [['Folio', 'Fecha', 'Participante', 'Edad', 'Sexo', 'Sem/Gpo', 'Turno', 'Puntaje', 'Banda', 'Resultado']],
      body: filas.map(function (r) {
        return [r.folio, new Date(r.fecha).toLocaleDateString('es-MX'), limpio(nombreParticipante(r, o.conNombres)), r.edad, r.sexo === 'Prefiero no decir' ? 'N/D' : r.sexo, r.semestre + '' + r.grupo, r.turno.slice(0, 3) + '.', r.total + '/24', limpio(I.banda(r.total).nombre), r.positivo ? 'Requiere valoración' : 'Sin indicios'];
      }),
      styles: { fontSize: 7.8, cellPadding: 1.5 }, headStyles: { fillColor: MA, textColor: 255, fontSize: 8 }, theme: 'grid',
      didParseCell: function (d) { if (d.section === 'body' && filas[d.row.index].positivo) { d.cell.styles.textColor = RO; d.cell.styles.fillColor = [253, 236, 236]; d.cell.styles.fontStyle = 'bold'; } },
      didDrawCell: function (d) {
        if (d.section === 'body' && filas[d.row.index].positivo && (d.column.index === 2 || d.column.index === 9)) {
          doc.setDrawColor.apply(doc, RO); doc.setLineWidth(0.35);
          var tw = doc.getTextWidth(String(d.cell.text[0] || '')); var x0 = d.cell.x + d.cell.padding('left');
          doc.line(x0, d.cell.y + d.cell.height - 1.3, Math.min(x0 + tw, d.cell.x + d.cell.width - 1), d.cell.y + d.cell.height - 1.3);
        }
      }
    });
    y = doc.lastAutoTable.finalY + 6;

    /* ---- recomendaciones y ruta */
    titulo('7. Recomendaciones y ruta de referencia');
    vinetas([
      'Positivo (14 o más): entrevista privada con Orientación en 2 semanas o menos; no canalizar automáticamente.',
      'Negativo alto (10-13): ofrecer tips de organización y entrevista voluntaria si el alumno la pide.',
      'A todo el grupo: estrategias de aula que ayudan a todos (instrucciones cortas, agenda visible, pausas activas), sin señalar a nadie.',
      'Complementar en menores de 18 con la opinión de padres y maestros (SNAP-IV o Vanderbilt) antes de sugerir valoración.',
      'No sugerir ni condicionar medicación; la decisión de tratamiento es de la familia y el médico.',
      'Registrar el seguimiento: entrevistas realizadas, canalizaciones y asistencia a consulta (a 1 y 3 meses).'
    ], 9.5);
    subt('Ruta');
    window.RUTA_ATENCION.pasos.forEach(function (p, i) { parrafo((i + 1) + '. ' + p, 9.5); });
    subt('Teléfonos');
    doc.autoTable({ startY: y, margin: { left: M, right: M }, head: [['Servicio', 'Teléfono']], body: window.RUTA_ATENCION.telefonos.map(function (t) { return [limpio(t.n), t.t]; }),
      styles: { fontSize: 9, cellPadding: 2 }, headStyles: { fillColor: AZ, textColor: 255 }, columnStyles: { 1: { fontStyle: 'bold', cellWidth: 36 } }, theme: 'grid' });
    y = doc.lastAutoTable.finalY + 6;
    parrafo('Antes de difundir la ruta, llamar a cada número y anotar la fecha de verificación.', 8.5, GR);

    /* ---- pie en todas las páginas */
    var tot = doc.getNumberOfPages();
    for (var p = 2; p <= tot; p++) {
      doc.setPage(p);
      doc.setFillColor.apply(doc, AZ); doc.rect(0, 0, W, 9, 'F');
      doc.setFontSize(8); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.text('Misión Enfoque · CECyTEA Plantel Cd. Satélite Morelos', M, 6);
      doc.setFont('helvetica', 'normal'); doc.text(limpio(st.desde ? fechaCorta(st.desde) + ' - ' + fechaCorta(st.hasta) : ''), W - M, 6, { align: 'right' });
      doc.setDrawColor(220, 230, 247); doc.setLineWidth(0.3); doc.line(M, H - 12, W - M, H - 12);
      doc.setFontSize(7.5); doc.setTextColor.apply(doc, GR);
      doc.text('CONFIDENCIAL · Uso exclusivo de Orientación · Tamizaje, no diagnóstico · Línea de la Vida 800 911 2000', M, H - 8);
      doc.text('Página ' + p + ' de ' + tot, W - M, H - 8, { align: 'right' });
    }
    return { doc: doc, stats: st };
  }

  window.Estadistica = { calcular: calcular, analisis: analisis, fmtPct: fmtPct, MIS: MIS, indices: indices, r1: r1 };
  window.Graficas = { LISTA: LISTA, config: config, fuentes: fuentes, cargar: cargar };
  window.Informe = { generar: generar, nombreParticipante: nombreParticipante };
})();
