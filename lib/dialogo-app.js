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
