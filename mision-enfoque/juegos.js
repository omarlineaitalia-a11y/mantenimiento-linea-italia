/* Misión Enfoque · MISIONES (mini-juegos). Lógica tomada del archivo original "Mision Enfoque - tamizaje TDAH.html".
 * Son una actividad didáctica: sus métricas se guardan, pero NO cuentan en el puntaje del tamizaje.
 * Juegos.iniciar(clave, alTerminar(metricas, estrellas, mensaje))   clave: gng | mem | hunt | sem
 * Juegos.detener()
 * Usa en index.html: #jTitulo #jInfo #jBarra #arena #jCaja #flash #jPista
 */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var timers = [], tapH = null, cfgDe = function (k) { return window.JUEGOS_CFG.filter(function (j) { return j.k === k; })[0]; };
  function T(f, ms) { var t = setTimeout(f, ms); timers.push(t); return t; }
  function limpiar() { timers.forEach(function (t) { clearTimeout(t); clearInterval(t); }); timers = []; }
  function fb(col) { var f = $('flash'); f.style.background = col; f.style.opacity = 0.22; setTimeout(function () { f.style.opacity = 0; }, 150); }
  function preparar(titulo, pista) { $('jTitulo').textContent = titulo; $('jPista').textContent = pista; $('jInfo').textContent = ''; $('jBarra').style.width = '0'; $('jCaja').innerHTML = ''; $('jCaja').style.width = ''; }
  var enlazado = false;
  function enlazar() {
    if (enlazado) return; enlazado = true;
    $('arena').addEventListener('pointerdown', function (e) { if (tapH) { e.preventDefault(); tapH(e); } });
  }

  /* ---------- 1 REFLEJOS (go/no-go) */
  function gng(fin) {
    var c = cfgDe('gng'), N = c.ensayos || 30, tr = [];
    preparar('Reflejos', 'Toca en cualquier parte del recuadro');
    for (var i = 0; i < N; i++) tr.push(i % 4 === 3 ? 0 : 1);
    for (var j = N - 1; j > 0; j--) { var r = Math.floor(Math.random() * (j + 1)); var t = tr[j]; tr[j] = tr[r]; tr[r] = t; }
    var G = { i: -1, hits: 0, om: 0, com: 0, rts: [], on: false, resp: false, t0: 0 }, cnt = 3;
    $('jCaja').innerHTML = '<div class="cuenta">3</div>';
    var iv = setInterval(function () { cnt--; if (cnt > 0) $('jCaja').innerHTML = '<div class="cuenta">' + cnt + '</div>'; else { clearInterval(iv); sig(); } }, 800); timers.push(iv);
    function sig() {
      G.i++; $('jInfo').textContent = Math.min(G.i, N) + ' / ' + N; $('jBarra').style.width = (G.i / N * 100) + '%';
      if (G.i >= N) return fin2();
      var go = tr[G.i]; $('jCaja').innerHTML = '<div class="estim ' + (go ? 'go' : 'nogo') + '">' + (go ? '' : '✕') + '</div>';
      G.on = true; G.resp = false; G.t0 = performance.now();
      T(function () { if (!G.resp && go) G.om++; G.on = false; $('jCaja').innerHTML = ''; T(sig, 550 + Math.random() * 450); }, 850);
    }
    tapH = function () {
      if (!G.on || G.resp) return; G.resp = true;
      if (tr[G.i]) { G.hits++; G.rts.push(performance.now() - G.t0); fb('#2F6FDB'); } else { G.com++; fb('#D93A3F'); }
    };
    function fin2() {
      tapH = null;
      var goN = tr.filter(function (x) { return x; }).length, rt = G.rts;
      var m = rt.length ? rt.reduce(function (a, b) { return a + b; }) / rt.length : 0;
      var sd = rt.length > 1 ? Math.sqrt(rt.reduce(function (a, b) { return a + Math.pow(b - m, 2); }, 0) / (rt.length - 1)) : 0;
      var s = G.hits >= goN - 2 && G.com <= 1 ? 3 : G.hits >= goN - 6 && G.com <= 4 ? 2 : 1;
      fin({ go: goN, hits: G.hits, om: G.om, com: G.com, nogo: N - goN, tr: Math.round(m), var: Math.round(sd) }, s, 'Atrapaste ' + G.hits + ' de ' + goN + ' círculos azules.');
    }
  }

  /* ---------- 2 MEMORIA (secuencia espacial tipo Corsi) */
  function mem(fin) {
    preparar('Memoria', 'Mira la secuencia y repítela');
    var caja = $('jCaja');
    caja.innerHTML = '<div class="aviso" id="mMsg"></div><div class="rejilla">' + Array.from({ length: 9 }, function (_, i) { return '<div class="celda" data-c="' + i + '"></div>'; }).join('') + '</div>';
    var celdas = [].slice.call(caja.querySelectorAll('.celda')), len = 3, fallos = 0, mejor = 0, seq = [], pos = 0, acepta = false, intentos = 0;
    function ronda() {
      intentos++; seq = [];
      while (seq.length < len) { var r = Math.floor(Math.random() * 9); if (seq[seq.length - 1] !== r) seq.push(r); }
      $('jInfo').textContent = 'Nivel ' + (len - 2); $('jBarra').style.width = Math.min((len - 2) / 6 * 100, 100) + '%';
      $('mMsg').textContent = 'Observa…'; acepta = false; pos = 0;
      seq.forEach(function (c, k) { T(function () { celdas[c].classList.add('luz'); }, 700 + k * 850); T(function () { celdas[c].classList.remove('luz'); }, 700 + k * 850 + 550); });
      T(function () { $('mMsg').textContent = '¡Tu turno! Toca en el mismo orden'; acepta = true; }, 700 + len * 850);
    }
    tapH = function (e) {
      if (!acepta) return;
      var c = e.target.closest && e.target.closest('.celda'); if (!c) return;
      var v = +c.dataset.c; c.classList.add('toque'); setTimeout(function () { c.classList.remove('toque'); }, 180);
      if (v === seq[pos]) {
        pos++;
        if (pos === seq.length) { acepta = false; mejor = Math.max(mejor, len); fallos = 0; fb('#1E9E6A'); $('mMsg').textContent = '¡Correcto!'; if (len >= 9) return fin2(); len++; T(ronda, 900); }
      } else { acepta = false; fb('#D93A3F'); fallos++; $('mMsg').textContent = 'Ups, esa no era'; if (fallos >= 2) return T(fin2, 700); T(ronda, 1000); }
    };
    T(ronda, 300);
    function fin2() { tapH = null; var s = mejor >= 6 ? 3 : mejor >= 5 ? 2 : 1; fin({ span: mejor, intentos: intentos }, s, mejor ? 'Recordaste secuencias de hasta ' + mejor + ' luces.' : '¡Buen intento!'); }
  }

  /* ---------- 3 CAZADOR DE ESTRELLAS (cancelación) */
  function hunt(fin) {
    var c = cfgDe('hunt'), SEG = c.segundos || 30, N = 48, T0 = 12, dis = ['☆', '✦', '✧', '◆', '●', '☆'], arr = [];
    preparar('Cazador de estrellas', 'Toca solo las ★ rellenas');
    for (var i = 0; i < N; i++) arr.push(i < T0 ? '★' : dis[i % dis.length]);
    for (var j = N - 1; j > 0; j--) { var r = Math.floor(Math.random() * (j + 1)); var t = arr[j]; arr[j] = arr[r]; arr[r] = t; }
    $('jCaja').innerHTML = '<div class="caza">' + arr.map(function (s, i) { return '<button class="sim" data-i="' + i + '">' + s + '</button>'; }).join('') + '</div>';
    $('jCaja').style.width = '100%';
    var hits = 0, err = 0, left = SEG, t0 = performance.now(), tfin = null, usados = {};
    $('jInfo').textContent = SEG + ' s';
    var iv = setInterval(function () { left--; $('jInfo').textContent = left + ' s'; $('jBarra').style.width = ((SEG - left) / SEG * 100) + '%'; if (left <= 0) { clearInterval(iv); fin2(); } }, 1000); timers.push(iv);
    tapH = function (e) {
      var b = e.target.closest && e.target.closest('.sim'); if (!b || usados[b.dataset.i]) return; usados[b.dataset.i] = 1;
      if (b.textContent === '★') { hits++; b.classList.add('ok'); } else { err++; b.classList.add('mal'); }
      if (hits === T0) { tfin = Math.round((performance.now() - t0) / 1000); clearInterval(iv); T(fin2, 400); }
    };
    var hecho = false;
    function fin2() {
      if (hecho) return; hecho = true; tapH = null; $('jCaja').style.width = '';
      var s = hits === T0 && err <= 1 ? 3 : hits >= 9 && err <= 3 ? 2 : 1;
      fin({ hits: hits, total: T0, err: err, om: T0 - hits, seg: tfin !== null ? Math.max(1, tfin) : SEG }, s, 'Encontraste ' + hits + ' de ' + T0 + ' estrellas.');
    }
  }

  /* ---------- 4 SEMÁFORO (espera / anticipación) */
  function sem(fin) {
    var c = cfgDe('sem'), N = c.rondas || 8, i = 0, estado = 'off', t0 = 0, ant = 0, om = 0, rts = [];
    preparar('Semáforo', 'Toca solo cuando esté en verde');
    $('jCaja').innerHTML = '<div class="semaf" id="semaf"></div>'; var sf = $('semaf');
    function ronda() {
      if (i >= N) return fin2(); i++;
      $('jInfo').textContent = i + ' / ' + N; $('jBarra').style.width = ((i - 1) / N * 100) + '%';
      estado = 'rojo'; sf.style.background = '#D93A3F'; sf.textContent = 'Espera…';
      T(function () {
        if (estado !== 'rojo') return; estado = 'verde'; sf.style.background = '#1E9E6A'; sf.textContent = '¡AHORA!'; t0 = performance.now();
        T(function () { if (estado === 'verde') { om++; estado = 'off'; sf.style.background = '#9AA6C2'; sf.textContent = 'Muy tarde'; T(ronda, 900); } }, 1500);
      }, 1400 + Math.random() * 2600);
    }
    tapH = function () {
      if (estado === 'rojo') { ant++; estado = 'off'; limpiar(); fb('#D93A3F'); sf.style.background = '#E9A100'; sf.textContent = '¡Muy pronto!'; T(ronda, 1100); }
      else if (estado === 'verde') { var x = performance.now() - t0; rts.push(x); estado = 'off'; limpiar(); fb('#1E9E6A'); sf.textContent = Math.round(x) + ' ms'; T(ronda, 900); }
    };
    T(ronda, 500);
    function fin2() {
      tapH = null; var m = rts.length ? Math.round(rts.reduce(function (a, b) { return a + b; }) / rts.length) : 0;
      var s = ant === 0 && om <= 1 ? 3 : ant <= 2 ? 2 : 1;
      fin({ ant: ant, om: om, n: N, tr: m }, s, ant ? 'Te adelantaste ' + ant + ' ' + (ant === 1 ? 'vez' : 'veces') + '. ¡La paciencia también se entrena!' : '¡Excelente control! No te adelantaste ninguna vez.');
    }
  }

  window.Juegos = {
    iniciar: function (k, alTerminar) {
      enlazar(); limpiar(); tapH = null;
      var fin = function (m, s, msg) { limpiar(); tapH = null; alTerminar(m, s, msg); };
      ({ gng: gng, mem: mem, hunt: hunt, sem: sem })[k](fin);
    },
    detener: function () { limpiar(); tapH = null; }
  };
})();
