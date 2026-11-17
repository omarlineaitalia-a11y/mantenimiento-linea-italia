/* Control de Paros · botón "📋 Pedir material al almacén" en el detalle de un paro y de una solicitud de Áreas generales / requerimiento.
 * Solo aparece en equipos de MANTENIMIENTO (área elegida "mtto"); además el apartado pide una nómina autorizada para retirar material.
 * No cambia la lógica de Paros: solo agrega el botón (usa ../lib/pedido-material.js). */
(function () {
  'use strict';
  const esMtto = () => { try { if (typeof devArea === 'function' && devArea() === 'mtto') return true; const s = (typeof S !== 'undefined' && S.sesion) || null; return !!(s && ((typeof esAdm === 'function' && esAdm(s)) || (typeof depDe === 'function' && depDe(s) === 'mtto'))); } catch (e) { return false; } };
  const fC = iso => { try { return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }); } catch (e) { return ''; } };
  function boton(datos) {
    const card = document.getElementById('mcard'); if (!card || card.querySelector('.pmBtnParos')) return;
    const box = card.querySelector('.box') || card; const d = document.createElement('div'); d.className = 'pmBtnParos'; d.style.cssText = 'margin-top:10px;display:flex;flex-wrap:wrap;gap:8px;align-items:center';
    d.innerHTML = '<button type="button" style="background:linear-gradient(135deg,#F5A623,#E08E0B);color:#14212E;border:0;border-radius:12px;padding:10px 16px;font-weight:800;cursor:pointer">📋 Pedir material al almacén</button><span class="foot">Arma la lista de refacciones y material (silicón, cinta…) y te da un código para recogerlo en el almacén.</span>';
    d.querySelector('button').addEventListener('click', () => { if (window.PedidoMaterial) PedidoMaterial.abrir(datos); });
    box.appendChild(d);
  }
  function envolver(nombre, armar) {
    const base = window[nombre]; if (typeof base !== 'function' || base._pm) return false;
    const nuevo = function (x) { const r = base.apply(this, arguments); try { if (esMtto()) { const dt = armar(x); if (dt) boton(dt); } } catch (e) {} return r; };
    nuevo._pm = true; window[nombre] = nuevo; return true;
  }
  function iniciar() {
    envolver('detalleEvento', ev => !ev || ev.prueba || ev.estado === 'liberada' ? null : { origen: { tipo: 'paro', id: ev.id, txt: 'Paro · ' + (ev.maqN || ev.maq || '') + ' · ' + (ev.falla || ev.tipo || '') + ' · ' + fC(ev.t0), maq: ev.maqN || ev.maq || '' }, nomina: (ev.tec && ev.tec.nom) || '', nombre: (ev.tec && ev.tec.n) || '', app: 'paros' });
    envolver('agDetalle', r => !r || r.estado === 'cerrada' ? null : { origen: { tipo: r.req ? 'req' : 'ag', id: r.id, txt: (r.req ? 'Requerimiento · ' : 'Áreas generales · ') + (r.eqN || r.maqN || '') + ' · ' + String(r.desc || '').slice(0, 60) + ' · ' + fC(r.t0), maq: r.maqN || r.eqN || '' }, area: r.ubic || '', nomina: (r.tec && r.tec.nom) || '', nombre: (r.tec && r.tec.n) || '', app: 'paros' });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
