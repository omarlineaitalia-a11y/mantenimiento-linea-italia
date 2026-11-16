/* Almacén · lista de Existencias EN MOVIMIENTO (Ing. Omar): la lista se desplaza sola hacia arriba (ascendente) y vuelve a empezar.
 * Se pausa al pasar el mouse, al tocarla, al buscar o al abrir una refacción; botón para encenderla o apagarla (se recuerda en este equipo). */
(function () {
  'use strict';
  const M = { on: true, pausa: 0, fin: 0, ult: 0 };
  try { M.on = localStorage.getItem('almListaMov') !== '0'; } catch (e) {}
  function boton() {
    const ch = document.querySelector('#v-exist .chips'); if (!ch || document.getElementById('btnMov')) return;
    const b = document.createElement('button'); b.type = 'button'; b.id = 'btnMov'; b.className = 'chip movBtn'; ch.appendChild(b); pintar();
    b.addEventListener('click', () => { M.on = !M.on; try { localStorage.setItem('almListaMov', M.on ? '1' : '0'); } catch (e) {} pintar(); if (!M.on) { const l = document.getElementById('lista'); if (l) l.scrollTop = 0; } });
  }
  function pintar() { const b = document.getElementById('btnMov'); if (b) b.innerHTML = M.on ? '⏸ Detener movimiento' : '▶ Lista en movimiento'; const l = document.getElementById('lista'); if (l) l.classList.toggle('enMov', M.on); }
  const pausar = ms => { M.pausa = Date.now() + (ms || 5000); };
  function paso() {
    const t = performance.now();
    const l = document.getElementById('lista'), v = document.getElementById('v-exist'); if (!l || !v || v.hidden || !M.on) { M.ult = t; return; }
    const q = (document.getElementById('q') || {}).value || '', drawer = document.querySelector('.drawer.open, #dr.open, #dr:not([hidden])');
    if (q || Date.now() < M.pausa || l.scrollHeight <= l.clientHeight + 4) { M.ult = t; return; }
    const dt = Math.min(64, t - (M.ult || t)); M.ult = t;
    if (l.scrollTop + l.clientHeight >= l.scrollHeight - 2) { if (!M.fin) M.fin = Date.now(); if (Date.now() - M.fin > 2500) { l.scrollTop = 0; M.fin = 0; pausar(2500); } return; }
    M.acc = (M.acc || 0) + dt * 0.035; if (M.acc >= 1) { const px = Math.floor(M.acc); M.acc -= px; l.scrollTop += px; }   // ~35 px por segundo, hacia arriba
  }
  function iniciar() {
    boton(); const l = document.getElementById('lista');
    if (l) { ['mouseenter', 'touchstart', 'wheel', 'pointerdown', 'focusin'].forEach(ev => l.addEventListener(ev, () => pausar(6000), { passive: true })); l.addEventListener('mousemove', () => pausar(4000), { passive: true }); }
    ['q', 'fCat', 'fEstante', 'fEst', 'fOrd'].forEach(id => { const el = document.getElementById(id); if (el) el.addEventListener('input', () => { if (l) l.scrollTop = 0; pausar(4000); }); });
    setInterval(paso, 40);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
