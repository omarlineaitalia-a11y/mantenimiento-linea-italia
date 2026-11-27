/* Mantenimiento Preventivo · equipos POR LLEGAR (Ing. Omar, 27-nov-2026)
 * ⚙ Configuración: caja "🚚 Equipos por llegar" (salen de la Base de Datos) con "▶ Poner en función" (activa en las 3 apps).
 * Mientras están por llegar no tienen preventivos: en el calendario anual aparecen sin actividades; al llegar se programan en el
 * PLAN MAESTRO MENSUAL y se les asigna su hoja (Configuración → Hojas por equipo). */
(function () {
  'use strict';
  function envolver() {
    if (typeof vConfig !== 'function' || vConfig._pl) return false;
    const base = vConfig;
    window.vConfig = function () {
      const h = base.apply(this, arguments);
      setTimeout(() => { const el = document.getElementById('plCajaPM'); if (el && window.PorLlegar && !el.dataset.ok) { el.dataset.ok = '1'; PorLlegar.pintarEn(el); } }, 0);
      return h + '<div class="caja"><h2>🚚 Equipos por llegar</h2><p class="peq mu" style="margin:-6px 0 10px">Máquinas compradas que todavía no llegan (de la Base de Datos). No tienen preventivos programados. Cuando ya estén instaladas y empiecen a operar, dale <b>▶ Poner en función</b>: se activan aquí, en la Base de Datos y en Control de Paros. Después se programan en el <b>PLAN MAESTRO MENSUAL</b> (técnicos de la tarde, por ser tipo A) y se les asigna su hoja en <b>Hojas por equipo</b>.</p><div id="plCajaPM"></div></div>';
    };
    window.vConfig._pl = true; return true;
  }
  if (!envolver()) { const t = setInterval(() => { if (envolver()) clearInterval(t); }, 300); }
})();
