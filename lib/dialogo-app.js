/* Ventanas propias de la app (en lugar de los cuadritos del navegador "…github.io dice"):
 *   preguntarApp({ titulo, texto, valor, placeholder, tipo:'codigo'|'numero'|'texto', icono, conQR }) → Promise<string|null>
 *   confirmarApp({ titulo, texto, si, no, icono }) → Promise<boolean> */
(function () {
  'use strict';
  function css() {
    if (document.getElementById('dlgCss')) return; const s = document.createElement('style'); s.id = 'dlgCss';
    s.textContent = '#dlgApp{position:fixed;inset:0;z-index:100080;background:rgba(4,12,24,.72);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);display:grid;place-items:center;padding:16px;font-family:"IBM Plex Sans","Segoe UI",system-ui,Arial,sans-serif;animation:dlgIn .18s ease}' +
      '@keyframes dlgIn{from{opacity:0}to{opacity:1}}@keyframes dlgUp{from{transform:translateY(14px) scale(.98);opacity:0}to{transform:none;opacity:1}}' +
      '#dlgApp .dB{position:relative;width:min(460px,100%);background:rgba(10,26,48,.92);color:#EAF2FB;border:1px solid rgba(63,193,201,.45);border-radius:22px;padding:22px 22px 18px;box-shadow:0 0 40px rgba(63,193,201,.25),0 24px 60px rgba(0,0,0,.55);animation:dlgUp .22s ease}' +
      '#dlgApp .dI{font-size:34px;line-height:1;margin-bottom:6px}#dlgApp h3{margin:0 0 4px;font-size:20px;color:#fff;text-shadow:0 0 16px rgba(63,193,201,.45)}#dlgApp p{margin:0 0 14px;color:#B8CBE0;font-size:14px}' +
      '#dlgApp input{width:100%;box-sizing:border-box;font:700 24px "IBM Plex Mono",Consolas,monospace;letter-spacing:.12em;text-align:center;text-transform:uppercase;padding:12px;border-radius:14px;border:1px solid rgba(159,227,231,.4);background:rgba(255,255,255,.07);color:#fff;caret-color:#3FC1C9;outline:none;transition:box-shadow .2s,border-color .2s}' +
      '#dlgApp input.num{text-transform:none}#dlgApp input:focus{border-color:#3FC1C9;box-shadow:0 0 0 4px rgba(63,193,201,.18),0 0 22px rgba(63,193,201,.35)}#dlgApp input::placeholder{color:rgba(184,203,224,.4);letter-spacing:.06em}' +
      '#dlgApp .dA{display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;margin-top:16px}#dlgApp button{border:0;border-radius:12px;padding:11px 18px;font-weight:800;font-size:15px;cursor:pointer;font-family:inherit}' +
      '#dlgApp .dOk{color:#fff;background:linear-gradient(120deg,#1F6FD1,#3FC1C9 55%,#1F6FD1);background-size:200% 100%;box-shadow:0 8px 22px rgba(31,111,209,.5),0 0 20px rgba(63,193,201,.4);animation:dlgFl 4s ease infinite}@keyframes dlgFl{0%,100%{background-position:0 0}50%{background-position:100% 0}}' +
      '#dlgApp .dNo{background:rgba(255,255,255,.1);color:#DCE7F3}#dlgApp .dQr{background:linear-gradient(135deg,#F5A623,#E08E0B);color:#14212E;margin-right:auto}#dlgApp .dX{position:absolute;top:12px;right:12px;width:34px;height:34px;padding:0;background:rgba(255,255,255,.1);color:#fff;border-radius:10px}';
    document.head.appendChild(s);
  }
  window._dlgCss = css;
  function abrir(html, alListo) { css(); const v = document.createElement('div'); v.id = 'dlgApp'; v.innerHTML = '<div class="dB">' + html + '</div>'; document.body.appendChild(v); alListo(v); return v; }
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  window.preguntarApp = function (o) {
    o = o || {}; return new Promise(ok => {
      const num = o.tipo === 'numero';
      abrir('<button type="button" class="dX" data-d="no">✕</button><div class="dI">' + (o.icono || (o.tipo === 'codigo' ? '🔢' : '✍️')) + '</div><h3>' + esc(o.titulo || '') + '</h3>' + (o.texto ? '<p>' + esc(o.texto) + '</p>' : '') +
        '<input id="dlgIn" ' + (num ? 'class="num" type="number" min="0" step="any" inputmode="decimal"' : 'autocomplete="off"') + ' value="' + esc(o.valor || '') + '" placeholder="' + esc(o.placeholder || '') + '">' +
        '<div class="dA">' + (o.conQR ? '<button type="button" class="dQr" data-d="qr">📷 Escanear QR</button>' : '') + '<button type="button" class="dNo" data-d="no">Cancelar</button><button type="button" class="dOk" data-d="ok">' + esc(o.si || 'Aceptar') + '</button></div>', v => {
        const inp = v.querySelector('#dlgIn'), fin = r => { v.remove(); ok(r); };
        setTimeout(() => { inp.focus(); inp.select(); }, 30);
        v.addEventListener('click', e => { const d = e.target.closest('[data-d]'); if (e.target === v) return fin(null); if (!d) return; if (d.dataset.d === 'ok') fin(inp.value.trim() || null); else if (d.dataset.d === 'qr') { fin(null); const b = document.getElementById('btnQR'); if (b) b.click(); } else fin(null); });
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); fin(inp.value.trim() || null); } if (e.key === 'Escape') fin(null); });
      });
    });
  };
  window.confirmarApp = function (o) {
    o = o || {}; return new Promise(ok => {
      abrir('<div class="dI">' + (o.icono || '❔') + '</div><h3>' + esc(o.titulo || '¿Confirmas?') + '</h3>' + (o.texto ? '<p>' + esc(o.texto) + '</p>' : '') + '<div class="dA"><button type="button" class="dNo" data-d="no">' + esc(o.no || 'Cancelar') + '</button><button type="button" class="dOk" data-d="ok">' + esc(o.si || 'Sí') + '</button></div>', v => {
        const fin = r => { v.remove(); ok(r); }; v.addEventListener('click', e => { const d = e.target.closest('[data-d]'); if (e.target === v) return fin(false); if (d) fin(d.dataset.d === 'ok'); });
        document.addEventListener('keydown', function k(e) { if (!document.body.contains(v)) return document.removeEventListener('keydown', k); if (e.key === 'Escape') { fin(false); document.removeEventListener('keydown', k); } if (e.key === 'Enter') { fin(true); document.removeEventListener('keydown', k); } });
      });
    });
  };
})();
/* Ampliación (18-nov-2026): ventanas de la app también para texto normal, avisos y formularios de varios datos.
 *   avisoApp({ titulo, texto, icono, si }) → Promise<void>
 *   formApp({ titulo, texto, icono, si, campos:[{ k, l, valor, placeholder, tipo:'texto'|'numero'|'fecha'|'area', opciones:[...] }] }) → Promise<{k:valor}|null>
 *   preguntarApp con tipo:'texto' (o sin tipo y sin "codigo") ya no pone mayúsculas ni letra de código. */
(function () {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function css() {
    if (window._dlgCss) window._dlgCss(); if (document.getElementById('dlgCss2')) return; const s = document.createElement('style'); s.id = 'dlgCss2';
    s.textContent = '#dlgApp input.txt,#dlgApp .dF input,#dlgApp .dF select,#dlgApp .dF textarea{font:600 16px "IBM Plex Sans","Segoe UI",system-ui,sans-serif;letter-spacing:normal;text-transform:none;text-align:left;padding:11px 12px}' +
      '#dlgApp .dF{display:flex;flex-direction:column;gap:10px;max-height:60vh;overflow:auto;padding:2px}#dlgApp .dF label{display:flex;flex-direction:column;gap:5px;font-size:13px;color:#B8CBE0;font-weight:700}' +
      '#dlgApp .dF select,#dlgApp .dF textarea{width:100%;box-sizing:border-box;border-radius:14px;border:1px solid rgba(159,227,231,.4);background:rgba(255,255,255,.07);color:#fff;outline:none}#dlgApp .dF select option{color:#14212E}#dlgApp .dF textarea{min-height:70px;resize:vertical}' +
      '#dlgApp .dF input[type=date]{color-scheme:dark}#dlgApp p{white-space:pre-line}';
    document.head.appendChild(s);
  }
  // preguntarApp: texto normal cuando no es código ni número
  const base = window.preguntarApp;
  window.preguntarApp = function (o) {
    o = o || {}; const p = base(o);
    if (o.tipo !== 'codigo' && o.tipo !== 'numero') { css(); setTimeout(() => { const i = document.getElementById('dlgIn'); if (i) i.classList.add('txt'); }, 0); }
    return p;
  };
  function abrir(html, alListo) { css(); const v = document.createElement('div'); v.id = 'dlgApp'; v.innerHTML = '<div class="dB">' + html + '</div>'; document.body.appendChild(v); alListo(v); return v; }
  window.avisoApp = function (o) {
    o = typeof o === 'string' ? { texto: o } : (o || {});
    return new Promise(ok => abrir('<div class="dI">' + (o.icono || 'ℹ️') + '</div><h3>' + esc(o.titulo || 'Aviso') + '</h3>' + (o.texto ? '<p>' + esc(o.texto) + '</p>' : '') + '<div class="dA"><button type="button" class="dOk" data-d="ok">' + esc(o.si || 'Entendido') + '</button></div>', v => {
      const fin = () => { v.remove(); ok(); }; v.addEventListener('click', e => { if (e.target === v || e.target.closest('[data-d]')) fin(); });
      setTimeout(() => { const b = v.querySelector('.dOk'); if (b) b.focus(); }, 30);
    }));
  };
  window.formApp = function (o) {
    o = o || {}; const C = o.campos || [];
    return new Promise(ok => abrir('<button type="button" class="dX" data-d="no">✕</button><div class="dI">' + (o.icono || '✍️') + '</div><h3>' + esc(o.titulo || '') + '</h3>' + (o.texto ? '<p>' + esc(o.texto) + '</p>' : '') +
      '<form class="dF" onsubmit="return false">' + C.map((c, i) => '<label>' + esc(c.l || '') + (c.opciones ? '<select data-fi="' + i + '">' + c.opciones.map(x => { const [v, t] = Array.isArray(x) ? x : [x, x]; return '<option value="' + esc(v) + '"' + (String(v) === String(c.valor) ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('') + '</select>'
        : c.tipo === 'area' ? '<textarea data-fi="' + i + '" placeholder="' + esc(c.placeholder || '') + '">' + esc(c.valor || '') + '</textarea>'
        : '<input data-fi="' + i + '" ' + (c.tipo === 'numero' ? 'type="number" step="any" inputmode="decimal"' : c.tipo === 'fecha' ? 'type="date"' : 'type="text" autocomplete="off"') + ' value="' + esc(c.valor == null ? '' : c.valor) + '" placeholder="' + esc(c.placeholder || '') + '">') + '</label>').join('') + '</form>' +
      '<div class="dA"><button type="button" class="dNo" data-d="no">Cancelar</button><button type="button" class="dOk" data-d="ok">' + esc(o.si || 'Guardar') + '</button></div>', v => {
      const leer = () => { const r = {}; C.forEach((c, i) => { const el = v.querySelector('[data-fi="' + i + '"]'); r[c.k] = el ? String(el.value).trim() : ''; }); return r; };
      const fin = r => { v.remove(); ok(r); };
      v.addEventListener('click', e => { const d = e.target.closest('[data-d]'); if (e.target === v) return fin(null); if (d) fin(d.dataset.d === 'ok' ? leer() : null); });
      v.addEventListener('keydown', e => { if (e.key === 'Escape') fin(null); if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); const L = [...v.querySelectorAll('[data-fi]')], i = L.indexOf(e.target); if (i < L.length - 1) L[i + 1].focus(); else fin(leer()); } });
      setTimeout(() => { const f = v.querySelector('[data-fi]'); if (f) f.focus(); }, 30);
    }));
  };
})();
