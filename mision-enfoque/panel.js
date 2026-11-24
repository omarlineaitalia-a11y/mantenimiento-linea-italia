/* Misión Enfoque · ARRANQUE, ACCESO y PANEL DE ADMINISTRACIÓN */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var M = window.Mision, D = window.Dialogo, I = window.INSTRUMENTO, C = window.CATALOGOS, E = window.Estadistica, G = window.Graficas;
  var esc = D.esc, NMIN = window.N_MINIMO || 10;
  var filas = null, vista = 'inicio', charts = [], pdfActual = null, reducido = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- arranque */
  function inicio() {
    window.Kiosco.enlazar(); window.UI.arte();
    if (M.modo === 'demo') { $('aDemo').classList.remove('oculto'); }
    M.iniciar().then(function () { return M.sesion(); }).then(function (p) {
      if (!p) return acceso();
      if (window.Kiosco.activo()) return window.Kiosco.portada();
      abrir();
    }).catch(function (e) { acceso(e.message); });
    if ('serviceWorker' in navigator && location.protocol === 'https:') { navigator.serviceWorker.register('sw.js').catch(function () {}); }
  }
  function acceso(msg) {
    window.UI.mostrar('vAcceso');
    $('aErr').textContent = msg || '';
    $('aEntrar').disabled = false;
  }
  $('fAcceso').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var u = $('aUsuario').value, c = $('aClave').value;
    $('aErr').textContent = ''; $('aEntrar').disabled = true; $('aEntrar').innerHTML = '<span class="cargando"></span> Entrando…';
    M.entrar(u, c).then(function (p) {
      $('aClave').value = '';
      abrir();
      if (c === '000000') {
        D.confirmar('Entraste con la contraseña inicial 000000. Te sugerimos cambiarla por una propia (mínimo 6 caracteres; mejor 10 o más con letras y números).', { titulo: '🔑 Cambia tu contraseña', si: 'Cambiar ahora', no: 'Después', icono: '🛡️' })
          .then(function (si) { if (si) ir('cuenta'); });
      } else if (p.bovedaError) {
        D.aviso('No se pudieron abrir las contraseñas guardadas con tu contraseña actual (¿se restableció tu cuenta?). En "Personas" puedes regenerar la bóveda.', { titulo: 'Bóveda de contraseñas', icono: '🔐' });
      }
    }).catch(function (e) { $('aErr').textContent = e.message; })
      .then(function () { $('aEntrar').disabled = false; $('aEntrar').innerHTML = 'Entrar 🚀'; });
  });
  document.querySelectorAll('[data-acerca]').forEach(function (b) { b.onclick = function () { D.aviso(acercaHtml(), { titulo: 'Acerca de Misión Enfoque', html: true }); }; });

  /* ---------------- panel */
  function abrir() {
    var p = M.perfil();
    window.UI.mostrar('vPanel');
    $('pNombre').textContent = p.nombre;
    $('pRol').textContent = (p.general ? 'Administradora general' : (p.cargo || 'Administrador')) + (M.modo === 'demo' ? ' · DEMO' : '');
    $('pDemo').classList.toggle('oculto', M.modo !== 'demo');
    document.querySelectorAll('[data-perm]').forEach(function (b) { b.classList.toggle('oculto', !M.puede(b.getAttribute('data-perm'))); });
    document.querySelectorAll('[data-gen]').forEach(function (b) { b.classList.toggle('oculto', !p.general); });
    filas = null;
    M.reintentarPendientes().then(function (n) { if (n) cargarDatos(true); pintarPendientes(); });
    var h = (location.hash || '').replace('#', '');
    ir(h && h !== 'admin' ? h : 'inicio');
    cargarDatos(false);
  }
  $('pSalir').onclick = function () {
    D.confirmar('¿Cerrar sesión en este teléfono?', { titulo: 'Salir', si: 'Salir' }).then(function (s) {
      if (!s) return; M.salir().then(function () { filas = null; destruir(); location.hash = ''; acceso(); });
    });
  };
  document.querySelectorAll('#pTabs button').forEach(function (b) { b.onclick = function () { ir(b.getAttribute('data-v')); }; });
  window.addEventListener('hashchange', function () { var h = location.hash.replace('#', ''); if (M.perfil() && !$('vPanel').classList.contains('oculto') && h && h !== vista) ir(h); });

  function permitida(v) {
    var p = M.perfil(); if (!p) return false;
    if (v === 'tablero' || v === 'participantes') return M.puede('verEstadisticas');
    if (v === 'informe') return M.puede('descargarInformes') && M.puede('verEstadisticas');
    if (v === 'personas') return p.general;
    return ['inicio', 'cuenta', 'acerca'].indexOf(v) >= 0;
  }
  function ir(v) {
    if (!permitida(v)) v = 'inicio';
    vista = v;
    if (location.hash !== '#' + v) history.replaceState(null, '', '#' + v);
    document.querySelectorAll('#pTabs button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-v') === v); });
    document.querySelectorAll('.vista').forEach(function (s) { s.classList.toggle('on', s.id === 'v-' + v); });
    $('filtros').classList.toggle('oculto', ['tablero', 'participantes', 'informe'].indexOf(v) < 0);
    pintar();
  }
  function pintar() {
    if (vista === 'inicio') pintarInicio();
    else if (vista === 'tablero') pintarTablero();
    else if (vista === 'participantes') pintarTabla();
    else if (vista === 'informe') pintarInforme();
    else if (vista === 'personas') pintarPersonas();
    else if (vista === 'cuenta') pintarCuenta();
    else if (vista === 'acerca') $('acercaTxt').innerHTML = '<h2>Acerca de Misión Enfoque</h2>' + acercaHtml();
  }

  /* ---------------- datos y filtros */
  function cargarDatos(forzar) {
    if (!M.puede('verEstadisticas')) { filas = []; return Promise.resolve(); }
    if (filas && !forzar) return Promise.resolve();
    return M.listarRespuestas().then(function (r) { filas = r; pintar(); }).catch(function (e) { filas = []; D.aviso(e.message, { titulo: 'No se pudieron leer los resultados' }); });
  }
  function opciones(sel, lista, fmt) { $(sel).innerHTML = '<option value="">Todos</option>' + lista.map(function (v) { return '<option value="' + v + '">' + (fmt ? fmt(v) : v) + '</option>'; }).join(''); }
  opciones('fSem', C.semestres, function (v) { return v + '.º'; }); opciones('fGru', C.grupos); opciones('fTur', C.turnos); opciones('fSex', C.sexos); opciones('fEda', C.edades);
  ['fDesde', 'fHasta', 'fSem', 'fGru', 'fTur', 'fSex', 'fEda'].forEach(function (id) { $(id).addEventListener('change', function () { pdfActual = null; pintar(); }); });
  $('fLimpiar').onclick = function () { ['fDesde', 'fHasta', 'fSem', 'fGru', 'fTur', 'fSex', 'fEda'].forEach(function (id) { $(id).value = ''; }); pdfActual = null; pintar(); };
  $('fRecargar').onclick = function () { cargarDatos(true); };
  function filtradas() {
    var f = { d: $('fDesde').value, h: $('fHasta').value, s: $('fSem').value, g: $('fGru').value, t: $('fTur').value, x: $('fSex').value, e: $('fEda').value };
    var out = (filas || []).filter(function (r) {
      var dia = String(r.fecha).slice(0, 10);
      var local = new Date(r.fecha); dia = local.getFullYear() + '-' + ('0' + (local.getMonth() + 1)).slice(-2) + '-' + ('0' + local.getDate()).slice(-2);
      return (!f.d || dia >= f.d) && (!f.h || dia <= f.h) && (!f.s || String(r.semestre) === f.s) && (!f.g || r.grupo === f.g) && (!f.t || r.turno === f.t) && (!f.x || r.sexo === f.x) && (!f.e || String(r.edad) === f.e);
    });
    $('fCuenta').textContent = out.length + ' de ' + (filas || []).length + ' encuestas';
    return out;
  }
  function filtrosTxt() {
    var t = [];
    if ($('fDesde').value) t.push('desde ' + $('fDesde').value); if ($('fHasta').value) t.push('hasta ' + $('fHasta').value);
    if ($('fSem').value) t.push('semestre ' + $('fSem').value); if ($('fGru').value) t.push('grupo ' + $('fGru').value);
    if ($('fTur').value) t.push('turno ' + $('fTur').value); if ($('fSex').value) t.push('sexo ' + $('fSex').value); if ($('fEda').value) t.push('edad ' + $('fEda').value);
    return t.join(', ');
  }

  /* ---------------- inicio */
  function pintarPendientes() {
    var n = M.pendientes();
    $('iPend').innerHTML = n ? '📶 Hay <b>' + n + '</b> encuesta(s) guardadas en este teléfono pendientes de enviar. Se envían solas al haber internet. <button class="btn mini sec" id="bReint">Reintentar ahora</button>' : '✅ No hay encuestas pendientes de enviar en este teléfono.';
    var b = $('bReint'); if (b) b.onclick = function () { M.reintentarPendientes().then(function () { pintarPendientes(); cargarDatos(true); }); };
  }
  function pintarInicio() {
    pintarPendientes();
    if (!M.puede('verEstadisticas')) { $('iKpis').innerHTML = ''; return; }
    if (!filas) { $('iKpis').innerHTML = '<div class="muted"><span class="cargando"></span> Cargando…</div>'; return; }
    var hoy = new Date().toDateString(), st = E.calcular(filas);
    var deHoy = filas.filter(function (r) { return new Date(r.fecha).toDateString() === hoy; }).length;
    $('iKpis').innerHTML = kpi('Encuestas hoy', deHoy, '📝') + kpi('Total de encuestas', st.n, '📊') + kpi('Requieren valoración', st.pct == null ? (st.n ? 'n<' + NMIN : 0) : st.pos, '🔴', 'rojo', st.pct == null ? '' : E.fmtPct(st.pct)) + kpi('Anónimas', st.anon, '🕶️', '', 'identificadas: ' + st.ident);
    animarKpis($('iKpis'));
  }
  $('bKiosco').onclick = function () {
    D.form({
      titulo: '▶ Iniciar encuesta', texto: 'Opcional: preselecciona el grupo que vas a encuestar (el alumno puede cambiarlo).',
      campos: [
        { id: 'semestre', label: 'Semestre', tipo: 'select', opciones: [{ v: '', t: 'Sin preseleccionar' }].concat(C.semestres.map(function (s) { return { v: s, t: s + '.º' }; })) },
        { id: 'grupo', label: 'Grupo', tipo: 'select', opciones: [{ v: '', t: 'Sin preseleccionar' }].concat(C.grupos) },
        { id: 'turno', label: 'Turno', tipo: 'select', opciones: [{ v: '', t: 'Sin preseleccionar' }].concat(C.turnos) },
        { id: 'i', tipo: 'info', label: '🔒 Para salir del modo encuesta toca el candado de la portada y escribe tu contraseña.' }
      ], ok: 'Iniciar'
    }).then(function (v) { if (v) { filas = null; window.Kiosco.iniciar(v); } });
  };

  /* ---------------- KPIs */
  function kpi(t, v, ic, cls, s) { return '<div class="kpi ' + (cls || '') + '"><span class="ic">' + ic + '</span><div class="t">' + esc(t) + '</div><div class="v" data-n="' + (typeof v === 'number' ? v : '') + '">' + esc(v) + '</div>' + (s ? '<div class="s">' + esc(s) + '</div>' : '') + '</div>'; }
  function animarKpis(box) {
    if (reducido) return;
    box.querySelectorAll('.v[data-n]').forEach(function (el) {
      var fin = parseFloat(el.getAttribute('data-n')); if (isNaN(fin) || fin === 0) return;
      var t0 = performance.now(), dur = 700;
      (function paso() { var k = Math.min(1, (performance.now() - t0) / dur); el.textContent = Math.round(fin * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(paso); else el.textContent = fin; })();
    });
  }

  /* ---------------- tablero */
  function destruir() { charts.forEach(function (c) { try { c.destroy(); } catch (e) {} }); charts = []; }
  function pintarTablero() {
    if (!filas) { $('tKpis').innerHTML = '<div class="muted"><span class="cargando"></span> Cargando resultados…</div>'; $('tGraficas').innerHTML = ''; return; }
    var rows = filtradas(), st = E.calcular(rows);
    $('tKpis').innerHTML = kpi('Encuestas', st.n, '📊', '', st.desde ? new Date(st.desde).toLocaleDateString('es-MX') + ' – ' + new Date(st.hasta).toLocaleDateString('es-MX') : '') +
      kpi('Requieren valoración', st.pct == null ? (st.n ? 'n<' + NMIN : '—') : E.r1(st.pct) + ' %', '🔴', 'rojo', st.pct == null ? 'menos de ' + NMIN + ' encuestas' : st.pos + ' alumnos · 14 o más de 24') +
      kpi('Anónimos / identificados', st.anon + ' / ' + st.ident, '🕶️', '', st.n ? E.r1(st.anon / st.n * 100) + ' % anónimos' : '') +
      kpi('Puntaje promedio', st.promTotal == null ? '—' : E.r1(st.promTotal), '🎯', '', 'de 24 · corte 14');
    animarKpis($('tKpis'));
    destruir();
    if (!st.n) { $('tGraficas').innerHTML = '<div class="graf ancha vacio"><div class="e">🛰️</div><p>No hay encuestas con estos filtros.' + (M.modo === 'demo' ? ' Usa "Cargar 60 encuestas de ejemplo".' : '') + '</p></div>'; return; }
    $('tGraficas').innerHTML = G.LISTA.map(function (g) { return '<div class="graf' + (g.ancha ? ' ancha' : '') + '"><h3>' + esc(g.t) + '</h3><p class="muted">' + esc(g.nota) + '</p><div class="lienzo"><canvas id="g-' + g.k + '"></canvas></div></div>'; }).join('');
    G.cargar('chart').then(function () {
      G.fuentes();
      if (vista !== 'tablero') return;
      G.LISTA.forEach(function (g) {
        var cv = $('g-' + g.k); if (!cv) return;
        var cfg = G.config(g.k, st); if (reducido) cfg.options.animation = false;
        charts.push(new Chart(cv, cfg));
      });
      document.body.setAttribute('data-tablero', 'listo');
    }).catch(function (e) { $('tGraficas').insertAdjacentHTML('afterbegin', '<div class="graf ancha"><p class="err">' + esc(e.message) + '</p></div>'); });
  }

  /* ---------------- participantes */
  function etiquetaNombre(r) {
    if (r.identificado && r.nombre) return esc(r.nombre);
    if (r.identificado) return '<span class="muted">Folio #' + esc(r.folio) + '</span> <span class="badge gris" title="Sin permiso para ver nombres">nombre oculto</span>';
    return '<span class="muted">Anónimo #' + esc(r.folio) + '</span>';
  }
  function pintarTabla() {
    if (!filas) { $('pTabla').innerHTML = '<tr><td class="muted"><span class="cargando"></span> Cargando…</td></tr>'; return; }
    var q = $('pBuscar').value.trim().toLowerCase(), solo = $('pSolo').value, gen = M.perfil().general;
    var rows = filtradas().filter(function (r) {
      return (!q || String(r.folio).toLowerCase().indexOf(q) >= 0 || String(r.nombre || '').toLowerCase().indexOf(q) >= 0) && (!solo || (solo === 'pos') === !!r.positivo);
    });
    $('pTabla').innerHTML = '<thead><tr><th>Fecha</th><th>Participante</th><th>Edad</th><th>Sexo</th><th>Sem/Gpo</th><th>Turno</th><th>Puntaje</th><th>Inat. (0–16)</th><th>Hiper. (0–8)</th><th>Resultado</th>' + (gen ? '<th></th>' : '') + '</tr></thead><tbody>' +
      (rows.length ? rows.map(function (r) {
        var d = new Date(r.fecha);
        return '<tr class="fila-click' + (r.positivo ? ' positivo' : '') + '" data-id="' + esc(r.folio) + '"><td>' + d.toLocaleDateString('es-MX') + '<br><span class="chico">' + d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) + '</span></td><td>' + etiquetaNombre(r) + '</td><td>' + r.edad + '</td><td>' + esc(r.sexo) + '</td><td>' + r.semestre + esc(r.grupo) + '</td><td>' + esc(r.turno) + '</td>' +
          '<td class="puntos">' + r.total + '/24</td><td>' + r.inat + '</td><td>' + r.hiper + '</td><td>' + (r.positivo ? '<span class="badge rojo">Requiere valoración</span>' : '<span class="badge verde">Sin indicios</span>') + '</td>' +
          (gen ? '<td><button class="btn mini sec" data-borrar="' + esc(r.folio) + '" title="Borrar registro">🗑</button></td>' : '') + '</tr>';
      }).join('') : '<tr><td colspan="11" class="vacio">No hay encuestas con estos filtros.</td></tr>') + '</tbody>';
    $('pTabla').querySelectorAll('tr[data-id]').forEach(function (tr) {
      tr.onclick = function (ev) {
        var b = ev.target.closest('[data-borrar]');
        var r = filas.filter(function (x) { return x.folio === tr.getAttribute('data-id'); })[0];
        if (b) { ev.stopPropagation(); return borrar(r); }
        detalle(r);
      };
    });
  }
  $('pBuscar').addEventListener('input', pintarTabla); $('pSolo').addEventListener('change', pintarTabla);
  function borrar(r) {
    D.confirmar('Se borrará el registro con folio ' + r.folio + '. No se puede deshacer.', { titulo: '🗑 Borrar registro', si: 'Borrar', peligro: true }).then(function (s) {
      if (!s) return; M.borrarRespuesta(r.id || r.folio).then(function () { return cargarDatos(true); }).catch(function (e) { D.aviso(e.message); });
    });
  }
  function detalle(r) {
    var b = I.banda(r.total), j = r.juegos || {}, na = '<span class="muted">no jugó</span>';
    var sombras = r.sombreadas != null ? r.sombreadas : I.calificar(r.resp || []).sombreadas;
    var h = '<p><b>' + (r.identificado && r.nombre ? esc(r.nombre) : (r.identificado ? 'Folio #' + esc(r.folio) + ' (nombre oculto)' : 'Anónimo #' + esc(r.folio))) + '</b><br><span class="muted">' +
      new Date(r.fecha).toLocaleString('es-MX') + ' · ' + r.edad + ' años · ' + esc(r.sexo) + ' · ' + r.semestre + '.º ' + esc(r.grupo) + ' · ' + esc(r.turno) + '</span></p>' +
      '<p>' + (r.positivo ? '<span class="badge rojo">Requiere valoración</span>' : '<span class="badge verde">Sin indicios</span>') + ' <span class="badge azul">' + esc(b.nombre) + '</span></p>' +
      '<p style="font-size:28px;font-weight:900;color:var(--marino);margin:4px 0">' + r.total + ' / 24</p>' +
      '<p class="muted">Inatención (P1–P4): <b>' + r.inat + '/16</b> · Hiperactividad (P5–P6): <b>' + r.hiper + '/8</b> · Casillas sombreadas (método antiguo, secundario): ' + sombras + '/6</p>' +
      '<p class="chico">' + esc(b.texto) + '</p>' +
      '<table class="t">' + I.preguntas.map(function (p, k) { var v = (r.resp || [])[k]; return '<tr><td>' + (k + 1) + '</td><td class="chico">' + esc(p.texto) + '</td><td><b>' + (v == null ? '—' : esc(I.opciones[v].t)) + '</b></td></tr>'; }).join('') + '</table>' +
      '<h3 style="margin-top:12px">Misiones <span class="chico">(actividad didáctica, no cuenta en el puntaje)</span></h3><table class="t">' +
      '<tr><td>⚡ Reflejos</td><td>' + (j.gng ? 'Aciertos ' + j.gng.hits + '/' + j.gng.go + ' · omisiones ' + j.gng.om + ' · tocó rojo ' + j.gng.com + '/' + j.gng.nogo + ' · TR ' + j.gng.tr + ' ms (±' + j.gng.var + ')' : na) + '</td></tr>' +
      '<tr><td>🧠 Memoria</td><td>' + (j.mem ? 'Secuencia máxima ' + (j.mem.span || '—') + ' luces' : na) + '</td></tr>' +
      '<tr><td>⭐ Cazador</td><td>' + (j.hunt ? 'Estrellas ' + j.hunt.hits + '/' + j.hunt.total + ' · errores ' + j.hunt.err + ' · ' + j.hunt.seg + ' s' : na) + '</td></tr>' +
      '<tr><td>🚦 Semáforo</td><td>' + (j.sem ? 'Se adelantó ' + j.sem.ant + '/' + j.sem.n + ' · tarde ' + j.sem.om + ' · TR ' + j.sem.tr + ' ms' : na) + '</td></tr></table>' +
      '<p class="chico" style="margin-top:10px">Capturó: ' + esc(r.capturadoPor || '—') + ' · ' + esc((r.disp && (r.disp.tipo + ' ' + r.disp.so)) || '') + ' · duración ' + Math.round((r.duracionSeg || 0) / 60) + ' min · instrumento ' + esc(r.instrumento || '') + '</p>';
    D.aviso(h, { titulo: 'Detalle del participante', html: true, ok: 'Cerrar' });
  }

  /* ---------------- exportar CSV (Excel) */
  $('bCsv').onclick = function () {
    if (!M.puede('exportarExcel')) return;
    var rows = filtradas(), nom = M.puede('verNombres');
    var enc = ['folio', 'fecha', 'hora', 'participante', 'nombre', 'anonimo', 'edad', 'sexo', 'semestre', 'grupo', 'turno']
      .concat(I.preguntas.map(function (p, k) { return 'P' + (k + 1); }))
      .concat(['puntaje_total', 'inatencion_0_16', 'hiperactividad_0_8', 'banda', 'requiere_valoracion', 'casillas_sombreadas_secundario',
        'reflejos_aciertos', 'reflejos_go', 'reflejos_omisiones', 'reflejos_toco_rojo', 'reflejos_tr_ms', 'reflejos_var_ms', 'memoria_secuencia', 'cazador_estrellas', 'cazador_errores', 'cazador_seg',
        'semaforo_adelantos', 'semaforo_tarde', 'semaforo_tr_ms', 'duracion_seg', 'dispositivo', 'capturo', 'instrumento']);
    function v(o, k) { return o ? (o[k] == null ? '' : o[k]) : ''; }
    var lineas = rows.map(function (r) {
      var d = new Date(r.fecha), j = r.juegos || {};
      return [r.folio, d.toLocaleDateString('es-MX'), d.toLocaleTimeString('es-MX'), window.Informe.nombreParticipante(r, nom), nom ? (r.nombre || '') : (r.identificado ? '(oculto)' : ''), r.identificado ? 'no' : 'sí',
        r.edad, r.sexo, r.semestre, r.grupo, r.turno]
        .concat((r.resp || []).map(function (x) { return x + ' (' + I.opciones[x].t + ')'; }))
        .concat([r.total, r.inat, r.hiper, I.banda(r.total).nombre, r.positivo ? 'SÍ' : 'no', r.sombreadas != null ? r.sombreadas : '',
          v(j.gng, 'hits'), v(j.gng, 'go'), v(j.gng, 'om'), v(j.gng, 'com'), v(j.gng, 'tr'), v(j.gng, 'var'), v(j.mem, 'span'), v(j.hunt, 'hits'), v(j.hunt, 'err'), v(j.hunt, 'seg'),
          v(j.sem, 'ant'), v(j.sem, 'om'), v(j.sem, 'tr'), r.duracionSeg || '', r.disp ? r.disp.tipo + ' ' + r.disp.so : '', r.capturadoPor || '', r.instrumento || ''])
        .map(function (x) { return '"' + String(x).replace(/"/g, '""') + '"'; }).join(',');
    });
    var blob = new Blob(['﻿' + enc.join(',') + '\r\n' + lineas.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    bajar(blob, 'mision_enfoque_' + new Date().toISOString().slice(0, 10) + '.csv');
  };
  function bajar(blob, nombre) {
    var u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
  }

  /* ---------------- informe PDF */
  function pintarInforme() {
    filtradas();
    $('bPdfBajar').disabled = !pdfActual;
    if (!pdfActual) $('pdfZona').innerHTML = '';
  }
  $('bPdfPrev').onclick = function () {
    if (!filas) return;
    var rows = filtradas();
    $('pdfMsg').innerHTML = '<span class="cargando"></span> Generando informe…'; $('bPdfPrev').disabled = true;
    window.Informe.generar({ filas: rows, filtrosTxt: filtrosTxt(), perfil: M.perfil(), conNombres: M.puede('verNombres') }).then(function (res) {
      pdfActual = res.doc;
      var url = res.doc.output('bloburl');
      var pags = res.doc.getNumberOfPages();
      document.body.setAttribute('data-pdf', 'ok:' + pags + ':' + res.doc.output('arraybuffer').byteLength);
      $('pdfMsg').textContent = '✔ Informe listo: ' + pags + ' páginas. Revísalo y descárgalo.';
      $('pdfZona').innerHTML = '<p class="muted">Si la vista previa no aparece (celulares Android), <a href="' + url + '" target="_blank" rel="noopener">ábrelo en otra pestaña</a> o descárgalo.</p><iframe class="pdf-prev" title="Vista previa del informe" src="' + url + '"></iframe>';
      $('bPdfBajar').disabled = false;
    }).catch(function (e) { $('pdfMsg').textContent = '⚠ ' + e.message; document.body.setAttribute('data-pdf', 'error:' + e.message); })
      .then(function () { $('bPdfPrev').disabled = false; });
  };
  $('bPdfBajar').onclick = function () { if (pdfActual) pdfActual.save('Informe_Mision_Enfoque_' + new Date().toISOString().slice(0, 10) + '.pdf'); };

  /* ---------------- personas (solo general) */
  var verClave = {};
  function pintarPersonas() {
    var box = $('lPersonas');
    box.innerHTML = '<div class="muted"><span class="cargando"></span> Cargando…</div>';
    var p = M.perfil();
    Promise.all([M.listarPersonal(), M.bovedaAbierta() ? M.verClaves().catch(function () { return {}; }) : Promise.resolve(null)]).then(function (x) {
      var lst = x[0], claves = x[1];
      var aviso = p.bovedaError ? '<div class="card" style="border-color:var(--rojo)"><b>🔐 La bóveda no se pudo abrir con tu contraseña.</b><p class="muted">Pasa si tu cuenta fue restablecida. Al regenerarla, las contraseñas guardadas de los demás dejan de verse hasta que cada quien la cambie (o la vuelvas a dar de alta).</p><button class="btn mini" id="bRegen">Regenerar bóveda</button></div>' : '';
      box.innerHTML = aviso + lst.map(function (a) {
        var c = claves ? claves[a.usuario] : undefined;
        var claveHtml = claves === null ? '<button class="btn mini sec" data-abrir>👁 Ver contraseña</button>' :
          c == null ? '<span class="muted">no disponible · pídele que la cambie en "Mi cuenta"</span>' :
            '<span class="clave" data-clave="' + esc(a.usuario) + '">' + (verClave[a.usuario] ? esc(c) : '••••••') + '</span> <button class="btn mini sec" data-ojo="' + esc(a.usuario) + '" aria-label="Mostrar u ocultar contraseña">' + (verClave[a.usuario] ? '🙈' : '👁') + '</button>';
        var perms = a.rol === 'general' ? '<span class="badge azul">Todos los permisos</span>' : M.PERMISOS.map(function (k) { return '<span class="badge ' + (a.perm[k] ? 'verde' : 'gris') + '">' + (a.perm[k] ? '✔ ' : '✕ ') + M.PERM_TXT[k] + '</span>'; }).join(' ');
        return '<div class="persona" data-u="' + esc(a.usuario) + '"><div class="cab"><div class="av">' + esc((a.nombre || a.usuario).charAt(0).toUpperCase()) + '</div><div style="flex:1;min-width:0"><b>' + esc(a.nombre) + '</b><div class="chico">@' + esc(a.usuario) + (a.cargo ? ' · ' + esc(a.cargo) : '') + '</div></div>' +
          (a.rol === 'general' ? '<span class="badge azul">General</span>' : a.activo ? '<span class="badge verde">Activo</span>' : '<span class="badge gris">Inactivo</span>') + '</div>' +
          '<div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:5px">' + perms + '</div>' +
          '<div style="margin-top:10px">🔑 Contraseña: ' + claveHtml + '</div>' +
          '<div class="acc"><button class="btn mini sec" data-editar>✏️ Editar</button>' +
          (a.rol !== 'general' ? '<button class="btn mini sec" data-activo>' + (a.activo ? '⏸ Desactivar' : '▶ Activar') + '</button><button class="btn mini sec" data-pass>🔁 Contraseña</button><button class="btn mini peligro" data-eliminar>🗑 Eliminar</button>' : '') + '</div></div>';
      }).join('');
      var rg = $('bRegen'); if (rg) rg.onclick = regenerar;
      box.querySelectorAll('.persona').forEach(function (el) {
        var u = el.getAttribute('data-u'), a = lst.filter(function (x) { return x.usuario === u; })[0];
        var q = function (s) { return el.querySelector(s); };
        if (q('[data-ojo]')) q('[data-ojo]').onclick = function () { verClave[u] = !verClave[u]; pintarPersonas(); };
        if (q('[data-abrir]')) q('[data-abrir]').onclick = desbloquear;
        q('[data-editar]').onclick = function () { editar(a); };
        if (q('[data-activo]')) q('[data-activo]').onclick = function () { M.editarAdmin(u, { activo: !a.activo }).then(pintarPersonas).catch(function (e) { D.aviso(e.message); }); };
        if (q('[data-pass]')) q('[data-pass]').onclick = function () {
          D.aviso('<p>Firebase no permite cambiar la contraseña de otra persona sin un servidor. Por eso:</p><ul><li><b>' + esc(a.nombre) + '</b> cambia la suya en <b>"Mi cuenta"</b> cuando quiera; tú verás siempre la vigente aquí con el 👁.</li><li>Si la olvidó, <b>dísela tú</b> (la ves aquí).</li><li>Si la cuenta quedó inservible: el dueño del proyecto Firebase (Ing. Omar) la borra en <b>Firebase Console → Authentication</b>; luego tú la eliminas aquí y la vuelves a dar de alta con <b>＋ Agregar</b> y una contraseña nueva.</li></ul>', { titulo: '🔁 Contraseña de ' + a.nombre, html: true });
        };
        if (q('[data-eliminar]')) q('[data-eliminar]').onclick = function () {
          D.confirmar('Se quitará el acceso de ' + a.nombre + ' (@' + u + ') a Misión Enfoque. Su cuenta de Firebase queda creada pero ya no sirve para entrar.', { titulo: '🗑 Eliminar administrador', si: 'Eliminar', peligro: true })
            .then(function (s) { if (s) M.eliminarAdmin(u).then(pintarPersonas).catch(function (e) { D.aviso(e.message); }); });
        };
      });
    }).catch(function (e) { box.innerHTML = '<p class="err">' + esc(e.message) + '</p>'; });
  }
  function desbloquear() {
    D.form({ titulo: '🔐 Ver contraseñas', texto: 'Escribe tu contraseña para abrir la bóveda (solo en este teléfono y solo mientras tengas la sesión abierta).', campos: [{ id: 'c', label: 'Tu contraseña', tipo: 'password' }], ok: 'Abrir',
      validar: function (v) { if (!v.c) return 'Escribe tu contraseña.'; return M.desbloquearBoveda(v.c).then(function () { return ''; }); } })
      .then(function (r) { if (r) pintarPersonas(); });
  }
  function regenerar() {
    D.form({ titulo: '🔐 Regenerar bóveda', texto: 'Se creará una bóveda nueva cifrada con tu contraseña actual. Las contraseñas guardadas de los demás se borran de la bóveda (no de sus cuentas): cada quien deberá cambiar la suya en "Mi cuenta" para que vuelvas a verla.', campos: [{ id: 'c', label: 'Tu contraseña actual', tipo: 'password' }], ok: 'Regenerar',
      validar: function (v) { if (!v.c) return 'Escribe tu contraseña.'; return M.regenerarBoveda(v.c).then(function () { return ''; }); } })
      .then(function (r) { if (r) pintarPersonas(); });
  }
  function camposPerm(a) { return M.PERMISOS.map(function (k) { return { id: 'perm_' + k, label: M.PERM_TXT[k], tipo: 'check', valor: a ? !!a.perm[k] : k === 'verEstadisticas' }; }); }
  function sugerida() { var c = 'abcdefghjkmnpqrstuvwxyz23456789', s = ''; var r = crypto.getRandomValues(new Uint32Array(8)); for (var i = 0; i < 8; i++) s += c[r[i] % c.length]; return s; }
  $('bAgregar').onclick = function () {
    var clave = sugerida();
    D.form({
      titulo: '＋ Agregar administrador', texto: 'Se crea su cuenta de acceso. Entrégale su usuario y contraseña en persona.',
      campos: [
        { id: 'usuario', label: 'Usuario', ayuda: '(minúsculas, sin espacios ni puntos; empieza con letra)' },
        { id: 'nombre', label: 'Nombre completo' },
        { id: 'cargo', label: 'Cargo', ayuda: '(p. ej. Orientadora, Tutor 5J)' },
        { id: 'clave', label: 'Contraseña', ayuda: '(mínimo 6; puedes usar la sugerida)', valor: clave },
        { id: 'i', tipo: 'info', label: '<b>Permisos de pantalla</b> (lo que verá en la app):' }
      ].concat(camposPerm(null)),
      ok: 'Crear cuenta',
      validar: function (v) {
        var perm = {}; M.PERMISOS.forEach(function (k) { perm[k] = v['perm_' + k]; });
        if (!M.usuarioValido(String(v.usuario).trim().toLowerCase())) return 'Usuario no válido: 3 a 20 caracteres (a-z, 0-9, _), empezando con letra.';
        return M.agregarAdmin({ usuario: v.usuario, nombre: v.nombre, cargo: v.cargo, clave: v.clave, perm: perm }).then(function () { return ''; });
      }
    }).then(function (v) {
      if (!v) return;
      pintarPersonas();
      D.aviso('<p>Cuenta creada. Entrégale estos datos en persona:</p><p style="font-size:18px">Usuario: <span class="clave">' + esc(String(v.usuario).trim().toLowerCase()) + '</span><br>Contraseña: <span class="clave">' + esc(v.clave) + '</span></p><p class="muted">Puede cambiarla en "Mi cuenta"; tú siempre verás la vigente aquí.</p>', { titulo: '✅ Listo', html: true });
    });
  };
  function editar(a) {
    var gen = a.rol === 'general';
    D.form({
      titulo: '✏️ Editar · @' + a.usuario,
      campos: [{ id: 'nombre', label: 'Nombre', valor: a.nombre }, { id: 'cargo', label: 'Cargo', valor: a.cargo }].concat(gen ? [] : [{ id: 'i', tipo: 'info', label: '<b>Permisos de pantalla</b>:' }].concat(camposPerm(a))),
      ok: 'Guardar',
      validar: function (v) {
        var c = { nombre: v.nombre, cargo: v.cargo };
        if (!gen) { c.perm = {}; M.PERMISOS.forEach(function (k) { c.perm[k] = v['perm_' + k]; }); }
        return M.editarAdmin(a.usuario, c).then(function () { return ''; });
      }
    }).then(function (v) { if (v) pintarPersonas(); });
  }

  /* ---------------- mi cuenta */
  function pintarCuenta() {
    var p = M.perfil();
    $('cDatos').innerHTML = '<h2>' + esc(p.nombre) + '</h2><p class="muted">@' + esc(p.usuario) + ' · ' + (p.general ? 'Administradora general' : esc(p.cargo || 'Administrador')) + '</p>' +
      '<div style="display:flex;flex-wrap:wrap;gap:5px">' + (p.general ? '<span class="badge azul">Todos los permisos</span>' : M.PERMISOS.map(function (k) { return '<span class="badge ' + (p.perm[k] ? 'verde' : 'gris') + '">' + (p.perm[k] ? '✔ ' : '✕ ') + M.PERM_TXT[k] + '</span>'; }).join(' ')) + '</div>' +
      '<p class="chico" style="margin-top:10px">Modo: ' + (M.modo === 'demo' ? 'DEMO (datos solo en este navegador)' : 'Firebase') + '</p>';
    $('cMsg').textContent = '';
  }
  $('bCambiar').onclick = function () {
    var a = $('cActual').value, n = $('cNueva').value, n2 = $('cNueva2').value, m = $('cMsg');
    m.style.color = '';
    if (!a || !n) { m.textContent = 'Llena los campos.'; return; }
    if (n !== n2) { m.textContent = 'Las contraseñas nuevas no coinciden.'; return; }
    if (n.length < 6) { m.textContent = 'Mínimo 6 caracteres.'; return; }
    if (n === '000000') { m.textContent = 'Elige una contraseña distinta a la inicial.'; return; }
    $('bCambiar').disabled = true; m.style.color = 'var(--gris)'; m.innerHTML = '<span class="cargando"></span> Guardando…';
    M.cambiarMiClave(a, n).then(function () {
      m.style.color = 'var(--verde)'; m.textContent = '✔ Contraseña cambiada.' + (M.perfil().general ? '' : ' La administradora general podrá verla si la olvidas.');
      $('cActual').value = $('cNueva').value = $('cNueva2').value = '';
    }).catch(function (e) { m.style.color = ''; m.textContent = e.message; }).then(function () { $('bCambiar').disabled = false; });
  };

  /* ---------------- acerca de */
  function acercaHtml() {
    return '<p><b>Misión Enfoque</b> es una herramienta de <b>tamizaje</b> de atención (TDAH) para el CECyTEA Plantel Cd. Satélite Morelos. <b>No diagnostica</b>: un resultado de 14 o más solo indica que conviene una entrevista con Orientación y, si procede, una valoración profesional.</p>' +
      '<h3>Cuestionario</h3><p>' + esc(I.nombre) + '.<br><span class="muted">' + esc(I.version) + '</span></p>' +
      '<p class="chico">' + esc(I.cita) + '<br><b>' + esc(I.copyright) + '</b><br>Calificación: ' + esc(I.citaCalificacion) + '</p>' +
      '<p class="chico">Las preguntas se muestran con el texto oficial sin modificaciones. Los ejemplos escolares (💡) son una ayuda opcional propia para adolescentes. Las misiones son una actividad didáctica y no cuentan en el puntaje.</p>' +
      '<h3>Advertencias</h3><ul class="chico">' + I.advertencias.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul>' +
      '<h3>¿Necesitas ayuda?</h3>' + window.RUTA_ATENCION.telefonos.map(function (t) { return '<p style="margin:4px 0"><b><a href="tel:' + t.t.replace(/\s/g, '') + '">' + esc(t.t) + '</a></b> · <span class="chico">' + esc(t.n) + '</span></p>'; }).join('') +
      '<p class="chico" style="margin-top:12px">Proyecto del Grupo 5J · CECyTEA Plantel Cd. Satélite Morelos, Aguascalientes.</p>';
  }

  /* ---------------- demo */
  $('bEjemplos').onclick = function () {
    $('bEjemplos').disabled = true;
    M.cargarEjemplos(60).then(function () { return cargarDatos(true); })
      .then(function () { D.aviso('Se cargaron 60 encuestas de ejemplo (datos ficticios de las últimas 3 semanas).', { titulo: '🧪 Listo', icono: '✅' }); })
      .catch(function (e) { D.aviso(e.message); }).then(function () { $('bEjemplos').disabled = false; });
  };
  $('bBorrarDemo').onclick = function () {
    D.confirmar('Se borrarán TODOS los datos de demostración de este navegador (encuestas, cuentas y bóveda).', { titulo: 'Borrar demo', si: 'Borrar todo', peligro: true })
      .then(function (s) { if (s) M.borrarTodoDemo().then(function () { location.hash = ''; location.reload(); }); });
  };

  window.Panel = { abrir: abrir, ir: ir, recargar: function () { return cargarDatos(true); } };
  inicio();
})();
