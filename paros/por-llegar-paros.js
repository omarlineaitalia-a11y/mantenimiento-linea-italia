/* Control de Paros · máquinas POR LLEGAR (Ing. Omar, 27-nov-2026)
 * - Alta de la ENCHAPADORA KDT KB-399R (tipo A) INACTIVA y "por llegar": no sale en tablero ni pantallas hasta ponerla en función.
 *   Se da de alta sola la primera vez que abre Paros un equipo con cuenta de administrador (las reglas no dejan a otros).
 * - ⚙ Configuración → Máquinas: etiqueta 🚚 POR LLEGAR y botón "▶ Poner en función" (activa también en Base de Datos y Preventivo). */
(function () {
  'use strict';
  const COD = 'KB399R', NUEVA = { n: 'ENCHAPADORA KDT KB-399R', cod: COD, cat: 'MTA', area: 'Carpintería', a: false, porLlegar: true, serie: '1399260700602', alta: new Date().toISOString() };
  let intento = false;
  function sembrar() {
    if (intento || typeof S === 'undefined' || !S.maq || Object.keys(S.maq).length < 5 || typeof db === 'undefined' || !db) return;
    intento = true; if (S.maq[COD]) return;
    db.doc('config/maquinas').update({ m: { [COD]: NUEVA } }).catch(() => { intento = false; setTimeout(() => { intento = false; }, 600000); });
  }
  setInterval(sembrar, 3000);
  // lista de Máquinas en Configuración: etiqueta y botón
  function marcar() {
    const L = document.getElementById('maqList'); if (!L || typeof S === 'undefined') return;
    L.querySelectorAll('[data-mact]').forEach(b => { const k = b.dataset.mact, m = S.maq[k]; if (!m || !m.porLlegar || m.a !== false || b.dataset.pl) return;
      b.dataset.pl = '1'; b.textContent = '▶ Poner en función'; b.style.cssText = 'background:#1E8E5A;border-color:#1E8E5A;color:#fff;font-weight:800';
      const tr = b.closest('tr'); if (tr && tr.cells[1]) tr.cells[1].insertAdjacentHTML('beforeend', ' <span class="tag warn">🚚 POR LLEGAR</span>'); });
  }
  new MutationObserver(marcar).observe(document.documentElement, { childList: true, subtree: true });
  // al activar una máquina por llegar: activa en las 3 apps (Paros + Base de Datos + Preventivo)
  document.addEventListener('click', async e => {
    const b = e.target.closest('[data-mact]'); if (!b || typeof S === 'undefined') return; const k = b.dataset.mact, m = S.maq[k];
    if (!m || !m.porLlegar || m.a !== false) return;
    e.preventDefault(); e.stopImmediatePropagation(); if (!S.admin) return;
    let grupo = []; try { grupo = (await PorLlegar.pendientes()).filter(x => x.parosCod === k); } catch (x) {}
    if (!grupo.length) grupo = [{ clave: k, nombre: m.n, parosCod: k, soloParos: true }];
    if (grupo[0].soloParos) { const si = await confirmarApp({ titulo: '▶ Poner en función', texto: m.n + ': se activa en el tablero y las pantallas de Paros.', si: 'Poner en función', icono: '🚀' }); if (si) await upd('config/maquinas', { m: { [k]: { a: true, porLlegar: false } } }, '🚀 En función: ' + m.n); return; }
    await PorLlegar.ponerEnFuncion(grupo);
  }, true);
})();
