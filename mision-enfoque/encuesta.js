/* Misión Enfoque · MODO ENCUESTA (kiosco) — flujo del alumno en el teléfono de un administrador con sesión.
 * Al terminar guarda en apps/misionenfoque/respuestas y regresa a la portada para el siguiente alumno.
 * Para salir del kiosco se pide la contraseña del administrador (reautenticación).
 */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var I = window.INSTRUMENTO, C = window.CATALOGOS, JC = window.JUEGOS_CFG, D = window.Dialogo;
  var KEY = 'me_kiosco';
  var R = null, qi = 0, actual = null;
  var reducido = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- utilidades compartidas */
  function mostrar(id) {
    document.querySelectorAll('.pant').forEach(function (s) { s.classList.remove('on'); });
    $('vPanel').classList.add('oculto');
    if (id === 'vPanel') $('vPanel').classList.remove('oculto'); else $(id).classList.add('on');
    var k = id.charAt(0) === 'k';
    $('kCandado').classList.toggle('oculto', !(k && (id === 'kPortada' || id === 'kFinal')));
    window.scrollTo(0, 0);
  }
  function confeti() {
    if (reducido) return;
    var c = document.createElement('div'); c.className = 'confeti';
    var col = ['#2F6FDB', '#1B2F6B', '#B7D335', '#7FB0FF', '#F2B705'];
    for (var i = 0; i < 36; i++) { var e = document.createElement('i'); e.style.left = Math.random() * 100 + '%'; e.style.background = col[i % 5]; e.style.animationDelay = Math.random() * 0.5 + 's'; c.appendChild(e); }
    document.body.appendChild(c); setTimeout(function () { c.remove(); }, 2600);
  }
  function estrellasHtml(n, max) { max = max || 3; return '★'.repeat(n) + '<span class="v">' + '★'.repeat(max - n) + '</span>'; }
  function arte() {
    document.querySelectorAll('[data-logo]').forEach(function (e) { if (!e.innerHTML) e.innerHTML = window.ARTE.logo(); });
    document.querySelectorAll('[data-arte]').forEach(function (e) { if (!e.innerHTML) e.innerHTML = window.ARTE[e.getAttribute('data-arte')](); });
  }
  function dispositivo() {
    var ua = navigator.userAgent || '';
    var so = /Android/i.test(ua) ? 'Android' : /iPhone|iPad|iPod/i.test(ua) ? 'iOS' : /Windows/i.test(ua) ? 'Windows' : /Mac/i.test(ua) ? 'Mac' : 'Otro';
    var tipo = /iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua)) ? 'Tableta' : /Mobi|iPhone|Android/i.test(ua) ? 'Celular' : 'Computadora';
    return { tipo: tipo, so: so };
  }

  /* ---------- estado del kiosco */
  function estado() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
  function activo() { var e = estado(); return !!(e && e.activo); }
  function iniciar(def) {
    try { localStorage.setItem(KEY, JSON.stringify({ activo: true, def: def || {} })); } catch (e) {}
    portada();
  }
  function portada() { R = null; window.Juegos.detener(); mostrar('kPortada'); }
  function salir() {
    return D.form({
      titulo: '🔒 Salir del modo encuesta', texto: 'Escribe la contraseña del administrador que inició sesión.',
      campos: [{ id: 'clave', label: 'Contraseña', tipo: 'password' }], ok: 'Salir',
      validar: function (v) { if (!v.clave) return 'Escribe la contraseña.'; return window.Mision.verificarClave(v.clave).then(function () { return ''; }); }
    }).then(function (r) {
      if (!r) return false;
      try { localStorage.removeItem(KEY); } catch (e) {}
      window.Juegos.detener();
      return true;
    });
  }

  /* ---------- datos del alumno */
  var CAMPOS = { edad: C.edades, sexo: C.sexos, semestre: C.semestres, grupo: C.grupos, turno: C.turnos };
  function pintarChips() {
    document.querySelectorAll('#kDatos .chips').forEach(function (box) {
      var campo = box.getAttribute('data-campo');
      box.innerHTML = CAMPOS[campo].map(function (v) {
        var t = campo === 'semestre' ? v + '.º' : v;
        return '<button type="button" class="chip' + (String(R.datos[campo]) === String(v) ? ' on' : '') + '" data-v="' + v + '">' + t + '</button>';
      }).join('');
      box.querySelectorAll('.chip').forEach(function (b) {
        b.onclick = function () {
          box.querySelectorAll('.chip').forEach(function (x) { x.classList.remove('on'); });
          b.classList.add('on'); R.datos[campo] = b.getAttribute('data-v'); $('dErr').textContent = '';
        };
      });
    });
  }
  function comenzar() {
    var e = estado() || {}, def = e.def || {};
    R = { inicio: Date.now(), datos: { semestre: def.semestre || '', grupo: def.grupo || '', turno: def.turno || '' }, resp: [], juegos: {}, estrellas: {} };
    $('dNombre').value = ''; $('dErr').textContent = '';
    pintarChips(); mostrar('kDatos');
  }
  function validarDatos() {
    var d = R.datos, falta = [];
    ['edad', 'sexo', 'semestre', 'grupo', 'turno'].forEach(function (k) { if (!d[k]) falta.push(k); });
    if (falta.length) { $('dErr').textContent = 'Falta elegir: ' + falta.join(', ') + '.'; return; }
    R.nombre = $('dNombre').value.trim().slice(0, 80);
    $('iIntro').textContent = I.introPropia; $('iInstr').textContent = I.instruccion;
    mostrar('kInstr');
  }

  /* ---------- preguntas (una por pantalla) */
  function pregunta() {
    var p = I.preguntas[qi], n = I.preguntas.length;
    $('qNum').textContent = (qi + 1) + ' / ' + n;
    $('qBarra').style.width = (qi / n * 100) + '%';
    $('qCaja').className = 'preg anim-preg'; void $('qCaja').offsetWidth;
    $('qCaja').innerHTML = '<span class="emo">' + p.emoji + '</span><div class="txt">' + D.esc(p.texto) + '</div><div class="per">En los últimos 6 meses</div>' +
      (p.ayuda ? '<button type="button" class="enlace" id="qAyudaB">💡 Ver ejemplo</button><div class="chico oculto" id="qAyuda" style="font-style:italic">' + D.esc(p.ayuda) + '</div>' : '');
    if (p.ayuda) $('qAyudaB').onclick = function () { $('qAyuda').classList.toggle('oculto'); };
    $('qOpc').innerHTML = I.opciones.map(function (o) {
      return '<button class="opc' + (R.resp[qi] === o.v ? ' on' : '') + '" data-v="' + o.v + '"><span class="e">' + o.e + '</span>' + o.t +
        '<span class="n">' + [0, 1, 2, 3].map(function (j) { return '<b class="' + (j < o.v ? 'f' : '') + '"></b>'; }).join('') + '</span></button>';
    }).join('');
    var bloqueado = false;
    $('qOpc').querySelectorAll('.opc').forEach(function (b) {
      b.onclick = function () {
        if (bloqueado) return; bloqueado = true;
        $('qOpc').querySelectorAll('.opc').forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on');
        R.resp[qi] = +b.getAttribute('data-v');
        setTimeout(function () {
          qi++;
          if (qi < n) pregunta();
          else { $('qBarra').style.width = '100%'; R.cal = I.calificar(R.resp); mapa(); confeti(); }
        }, reducido ? 60 : 260);
      };
    });
  }

  /* ---------- misiones */
  function mapa() {
    var sig = JC.findIndex(function (j) { return !(j.k in R.estrellas); });
    $('mMapa').innerHTML = JC.map(function (j, i) {
      var hecho = j.k in R.estrellas, st = R.estrellas[j.k];
      return '<button class="mis ' + (hecho ? 'hecha' : '') + (i === sig ? ' sig' : '') + '" data-k="' + j.k + '"><span class="ic">' + (hecho ? '✅' : j.e) + '</span>' +
        '<span class="tt"><b>' + (i + 1) + '. ' + j.t + '</b><span>' + j.d + '</span></span><span class="estrellas">' + (hecho ? (st < 0 ? '<span class="v">saltada</span>' : estrellasHtml(st)) : '') + '</span></button>';
    }).join('');
    $('mMapa').querySelectorAll('.mis').forEach(function (b) {
      b.onclick = function () { var k = b.getAttribute('data-k'); if (k in R.estrellas) return; introMision(k); };
    });
    var tot = 0; Object.keys(R.estrellas).forEach(function (k) { if (R.estrellas[k] > 0) tot += R.estrellas[k]; });
    $('mSub').innerHTML = sig < 0 ? '¡Completaste todas las misiones! ⭐ ' + tot + ' de 12' : 'Opcionales · llevas <b>' + tot + '</b> ⭐ de 12';
    $('mTerminar').textContent = sig < 0 ? 'Enviar mis respuestas ✔' : 'Terminar y enviar ✔';
    mostrar('kMisiones');
  }
  function introMision(k) {
    actual = JC.filter(function (j) { return j.k === k; })[0];
    $('miEmoji').textContent = actual.e; $('miTitulo').textContent = actual.t; $('miHab').textContent = actual.hab;
    $('miTexto').innerHTML = actual.intro; mostrar('kMisionIntro');
  }
  function jugar() {
    mostrar('kJuego');
    window.Juegos.iniciar(actual.k, function (m, s, msg) {
      R.juegos[actual.k] = m; R.estrellas[actual.k] = s;
      $('okTitulo').textContent = '¡' + actual.t + ' completada!'; $('okEstrellas').innerHTML = estrellasHtml(s); $('okMsg').textContent = msg;
      mostrar('kMisionOk'); confeti();
    });
  }

  /* ---------- enviar */
  function terminar() {
    var c = R.cal || I.calificar(R.resp), d = R.datos;
    var reg = {
      folio: window.Mision.nuevoFolio(), fecha: new Date().toISOString(), instrumento: I.id,
      edad: +d.edad, sexo: d.sexo, semestre: +d.semestre, grupo: d.grupo, turno: d.turno,
      nombre: R.nombre || '', identificado: !!R.nombre,
      resp: R.resp.slice(), total: c.total, inat: c.inat, hiper: c.hiper, positivo: c.positivo, banda: c.banda, sombreadas: c.sombreadas,
      juegos: R.juegos, disp: dispositivo(), duracionSeg: Math.round((Date.now() - R.inicio) / 1000)
    };
    $('mTerminar').disabled = true;
    var tot = 0; Object.keys(R.estrellas).forEach(function (k) { if (R.estrellas[k] > 0) tot += R.estrellas[k]; });
    $('fEstrellas').textContent = tot ? '⭐ ' + tot + ' estrellas en tus misiones' : 'Misión cumplida';
    $('fEstado').textContent = 'Guardando…';
    mostrar('kFinal'); confeti();
    window.Mision.guardarRespuesta(reg).then(function (st) {
      $('fEstado').textContent = st === 'enviada' ? '✔ Respuestas guardadas (folio ' + reg.folio + ')' : '📶 Guardada en este teléfono; se enviará cuando haya internet (folio ' + reg.folio + ')';
      $('mTerminar').disabled = false;
      window.__ultimoRegistro = reg;
    });
  }

  /* ---------- eventos */
  function enlazar() {
    arte();
    $('kComenzar').onclick = comenzar;
    $('dSig').onclick = validarDatos;
    $('dAtras').onclick = portada;
    $('iEmpezar').onclick = function () { qi = 0; R.resp = []; pregunta(); mostrar('kPregunta'); };
    $('qAtras').onclick = function () { if (qi > 0) { qi--; pregunta(); } else mostrar('kInstr'); };
    $('mTerminar').onclick = terminar;
    $('miListo').onclick = jugar;
    $('miSaltar').onclick = function () { R.estrellas[actual.k] = -1; mapa(); };
    $('okMapa').onclick = mapa;
    $('fOtro').onclick = portada;
    $('kCandado').onclick = function () { salir().then(function (ok) { if (ok && window.Panel) window.Panel.abrir(); }); };
  }

  window.UI = { mostrar: mostrar, confeti: confeti, arte: arte };
  window.Kiosco = { iniciar: iniciar, activo: activo, portada: portada, salir: salir, enlazar: enlazar };
})();
