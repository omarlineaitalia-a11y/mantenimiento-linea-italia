/* Equipos "POR LLEGAR" · común a Base de Datos, Control de Paros y Mantenimiento Preventivo (Ing. Omar, 27-nov-2026)
 * Un equipo nuevo se da de alta antes de que llegue con porLlegar (Base de Datos) y, si va al tablero de Paros, inactivo (a:false).
 * El botón "▶ Poner en función" (en Configuración de cualquiera de las 3 apps) lo activa EN TODAS a la vez:
 *   - Base de Datos: quita porLlegar y pone la fecha de llegada/instalación (finst) en todos los equipos del mismo grupo;
 *   - Control de Paros: activa la máquina (a:true) para que salga en el tablero y pantallas.
 * Necesita que la cuenta del equipo sea administrador en cada app (reglas de Firebase); si en una no lo es, avisa. */
(function () {
  'use strict';
  const hoy = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  let cache = null, cacheT = 0;
  async function pendientes(fresco) {
    if (!fresco && cache && Date.now() - cacheT < 30000) return cache;
    const fs = firebase.firestore(), q = await fs.collection('apps/equipos/cat').get(), L = [];
    q.docs.forEach(d => Object.values((d.data() || {}).items || {}).forEach(e => { if (e && e.porLlegar && !e.baja) L.push(Object.assign({ cat: d.id }, e)); }));
    cache = L.sort((a, b) => String(a.clave).localeCompare(String(b.clave), 'es', { numeric: true })); cacheT = Date.now(); return cache;
  }
  // grupos: equipos que se ponen en función juntos (ej. enchapadora + su mesa de retorno)
  function grupos(L) { const G = {}; L.forEach(e => { const k = e.grupo || e.id; (G[k] = G[k] || []).push(e); }); return Object.values(G); }
  async function activar(items, parosCod) {
    const fs = firebase.firestore(), FV = firebase.firestore.FieldValue, f = hoy(), ok = [], mal = [];
    for (const it of items) {
      try { await fs.doc('apps/equipos/cat/' + it.cat).update({ ['items.' + it.id + '.porLlegar']: FV.delete(), ['items.' + it.id + '.finst']: it.finst || f }); ok.push('Base de Datos · ' + (it.clave || it.nombre)); }
      catch (e) { mal.push('Base de Datos · ' + (it.clave || it.nombre) + ' (' + (e.code || e.message) + ')'); }
    }
    if (parosCod) {
      try { await fs.doc('apps/paros/config/maquinas').update({ ['m.' + parosCod + '.a']: true, ['m.' + parosCod + '.porLlegar']: FV.delete() }); ok.push('Control de Paros · ' + parosCod); }
      catch (e) { mal.push('Control de Paros · ' + parosCod + ' (' + (e.code || e.message) + ')'); }
    }
    return { ok, mal };
  }
  // botón común: confirma con ventana de la app y activa el grupo completo
  async function ponerEnFuncion(grupo) {
    const nom = grupo.map(e => e.clave + ' ' + e.nombre).join(' + '), cod = (grupo.find(e => e.parosCod) || {}).parosCod || '';
    const si = window.confirmarApp ? await confirmarApp({ titulo: '▶ Poner en función', texto: nom + '\n\nSe activa en Base de Datos (fecha de llegada hoy)' + (cod ? ', en Control de Paros (tablero y pantallas)' : '') + ' y en Mantenimiento Preventivo. Hazlo cuando la máquina ya esté instalada y empiece a operar.', si: 'Poner en función', icono: '🚀' }) : false;
    if (!si) return null;
    const r = await activar(grupo, cod);
    if (window.avisoApp) avisoApp({ titulo: r.mal.length ? 'Activada con avisos' : '✅ Máquina en función', texto: (r.ok.length ? 'Listo:\n· ' + r.ok.join('\n· ') : '') + (r.mal.length ? '\n\nNo se pudo (hazlo desde esa app con un administrador):\n· ' + r.mal.join('\n· ') : ''), icono: r.mal.length ? '⚠️' : '🚀' });
    return r;
  }
  function htmlCaja(L) {
    const G = grupos(L), esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    if (!G.length) return '<p style="margin:4px 0;color:#5A6676">No hay equipos por llegar.</p>';
    return G.map((g, i) => '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;border:1px dashed #E0A100;background:rgba(224,161,0,.08);border-radius:12px;padding:10px 12px;margin:6px 0">' +
      '<div style="flex:1;min-width:220px">' + g.map(e => '<div><b>🚚 ' + esc(e.clave) + ' · ' + esc(e.nombre) + '</b> <small style="color:#5A6676">' + esc([e.marca, e.modelo, e.serie ? 'Serie ' + e.serie : ''].filter(Boolean).join(' · ')) + '</small></div>').join('') +
      '<small style="color:#8A6100">Por llegar desde ' + esc(String((g[0].porLlegar && g[0].porLlegar.t) || '').slice(0, 10)) + '</small></div>' +
      '<button type="button" data-plfun="' + i + '" style="background:linear-gradient(135deg,#1E8E5A,#2EB67D);color:#fff;border:0;border-radius:12px;padding:10px 16px;font-weight:800;cursor:pointer">▶ Poner en función</button></div>').join('');
  }
  // caja lista para pegar en cualquier Configuración: <div id="..."> que se llena sola
  async function pintarEn(el, alTerminar) {
    if (!el) return; el.innerHTML = '<p style="color:#5A6676">Revisando equipos por llegar…</p>';
    let L = []; try { L = await pendientes(); } catch (e) { el.innerHTML = '<p style="color:#5A6676">No se pudo leer la Base de Datos (' + (e.code || e.message) + ').</p>'; return; }
    const G = grupos(L); el.innerHTML = htmlCaja(L);
    el.querySelectorAll('[data-plfun]').forEach(b => b.onclick = async () => { b.disabled = true; const r = await ponerEnFuncion(G[+b.dataset.plfun]); b.disabled = false; if (r) { cache = null; pintarEn(el, alTerminar); if (alTerminar) alTerminar(); } });
  }
  window.PorLlegar = { pendientes, grupos, activar, ponerEnFuncion, htmlCaja, pintarEn };
})();
