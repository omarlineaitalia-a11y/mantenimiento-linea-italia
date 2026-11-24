/* Misión Enfoque · ventanas propias (sin alert/confirm/prompt del navegador)
 * Dialogo.aviso(texto, {titulo, icono})              -> Promise<void>
 * Dialogo.confirmar(texto, {titulo, si, no, peligro}) -> Promise<boolean>
 * Dialogo.form({titulo, texto, campos:[{id,label,tipo,valor,opciones,ayuda,min}], ok, validar}) -> Promise<obj|null>
 *   tipo: text | password | select | check | info
 *   validar(valores) puede regresar un texto de error o una Promise (se muestra "Guardando…").
 */
(function () {
  'use strict';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var pila = [];
  function abrir(html, alCerrar) {
    var f = document.createElement('div');
    f.className = 'dlg-fondo';
    f.innerHTML = '<div class="dlg" role="dialog" aria-modal="true">' + html + '</div>';
    document.body.appendChild(f);
    var prev = document.activeElement;
    function cerrar(v) { f.remove(); pila.pop(); if (prev && prev.focus) try { prev.focus(); } catch (e) {} alCerrar(v); }
    pila.push({ f: f, cerrar: cerrar });
    setTimeout(function () { var i = f.querySelector('input,select,button.btn'); if (i) i.focus(); }, 60);
    return { f: f, cerrar: cerrar };
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && pila.length) { var top = pila[pila.length - 1]; var c = top.f.querySelector('[data-cancel]'); if (c) c.click(); }
  });

  function aviso(texto, o) {
    o = o || {};
    return new Promise(function (res) {
      var d = abrir((o.icono ? '<div class="ico">' + o.icono + '</div>' : '') + '<h2>' + esc(o.titulo || 'Aviso') + '</h2><div>' + (o.html ? texto : '<p>' + esc(texto) + '</p>') +
        '</div><div class="botones"><button class="btn" data-ok data-cancel>' + esc(o.ok || 'Entendido') + '</button></div>', res);
      d.f.querySelector('[data-ok]').onclick = function () { d.cerrar(); };
    });
  }
  function confirmar(texto, o) {
    o = o || {};
    return new Promise(function (res) {
      var d = abrir((o.icono ? '<div class="ico">' + o.icono + '</div>' : '') + '<h2>' + esc(o.titulo || '¿Confirmas?') + '</h2><div>' + (o.html ? texto : '<p>' + esc(texto) + '</p>') +
        '</div><div class="botones"><button class="btn sec" data-no data-cancel>' + esc(o.no || 'Cancelar') + '</button><button class="btn ' + (o.peligro ? 'peligro' : '') + '" data-si>' + esc(o.si || 'Sí') + '</button></div>', res);
      d.f.querySelector('[data-si]').onclick = function () { d.cerrar(true); };
      d.f.querySelector('[data-no]').onclick = function () { d.cerrar(false); };
    });
  }
  function campoHtml(c) {
    var id = 'dlg_' + c.id;
    if (c.tipo === 'info') return '<p class="muted">' + c.label + '</p>';
    if (c.tipo === 'check') return '<label class="chk"><input type="checkbox" id="' + id + '"' + (c.valor ? ' checked' : '') + '> ' + esc(c.label) + '</label>';
    var h = '<label class="campo" for="' + id + '">' + esc(c.label) + (c.ayuda ? ' <small>' + esc(c.ayuda) + '</small>' : '') + '</label>';
    if (c.tipo === 'select') return h + '<select id="' + id + '">' + c.opciones.map(function (op) { var v = typeof op === 'object' ? op.v : op, t = typeof op === 'object' ? op.t : op; return '<option value="' + esc(v) + '"' + (String(v) === String(c.valor == null ? '' : c.valor) ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('') + '</select>';
    return h + '<input id="' + id + '" type="' + (c.tipo || 'text') + '" value="' + esc(c.valor || '') + '" autocomplete="' + (c.tipo === 'password' ? 'new-password' : 'off') + '" autocapitalize="none" spellcheck="false">';
  }
  function form(o) {
    return new Promise(function (res) {
      var d = abrir('<h2>' + esc(o.titulo || '') + '</h2>' + (o.texto ? '<p class="muted">' + o.texto + '</p>' : '') + '<form novalidate>' + o.campos.map(campoHtml).join('') +
        '<p class="err" data-err></p><div class="botones"><button type="button" class="btn sec" data-cancel>' + esc(o.cancelar || 'Cancelar') + '</button><button type="submit" class="btn" data-ok>' + esc(o.ok || 'Guardar') + '</button></div></form>', res);
      var f = d.f.querySelector('form'), err = d.f.querySelector('[data-err]'), bOk = d.f.querySelector('[data-ok]');
      d.f.querySelector('[data-cancel]').onclick = function () { d.cerrar(null); };
      f.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var v = {};
        o.campos.forEach(function (c) {
          if (c.tipo === 'info') return;
          var el = document.getElementById('dlg_' + c.id);
          v[c.id] = c.tipo === 'check' ? el.checked : el.value;
        });
        var r = o.validar ? o.validar(v) : null;
        if (typeof r === 'string' && r) { err.textContent = r; return; }
        if (r && typeof r.then === 'function') {
          bOk.disabled = true; err.style.color = 'var(--gris)'; err.innerHTML = '<span class="cargando"></span> Un momento…';
          r.then(function (x) {
            if (typeof x === 'string' && x) { err.style.color = ''; err.textContent = x; bOk.disabled = false; return; }
            d.cerrar(v);
          }).catch(function (e) { err.style.color = ''; err.textContent = (e && e.message) || String(e); bOk.disabled = false; });
          return;
        }
        d.cerrar(v);
      });
    });
  }
  window.Dialogo = { aviso: aviso, confirmar: confirmar, form: form, esc: esc };
})();
