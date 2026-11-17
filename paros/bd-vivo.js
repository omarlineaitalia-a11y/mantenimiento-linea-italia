/* Control de Paros · BASE DE DATOS EN VIVO (Ing. Omar, 16-nov-2026): el recuadro "📥 Base de datos de planta" de Áreas generales
 * (⚙ Equipos) ya no usa solo la copia fija (equipos-bd.js) sino los equipos actuales de la app Base de Datos (apps/equipos/cat/*).
 * Sin duplicar: los equipos que ya estaban conservan su nombre de siempre (se empatan por número de la base); solo los nuevos
 * llegan con nombre armado. Sin maquinaria tipo A y B (el tablero de máquinas no se toca). Sin acceso a la base, se queda la copia. */
(function () {
  'use strict';
  function nombreNuevo(e) {
    let n = String(e.nombre).trim(); const cod = String(e.clave || e.eco || '').trim();
    if (/^\d+$/.test(n)) { n = (e.cat === 'AA' ? 'Aire acondicionado' : (e.corto || e.catN || e.cat)) + ' ' + n; return e.marca ? n + ' · ' + e.marca : n; }
    if (cod && n.toUpperCase() === cod.toUpperCase() && e.corto) return e.corto + ' ' + n;
    if (cod && !n.toUpperCase().includes(cod.toUpperCase())) return n + ' ' + cod;
    return n;
  }
  async function cargar() {
    if (typeof firebase === 'undefined' || typeof LI_EQUIPOS_BD === 'undefined') return;
    for (let i = 0; i < 40 && !(firebase.apps && firebase.apps.length && firebase.auth().currentUser); i++) await new Promise(r => setTimeout(r, 500));
    try {
      const porNo = {}; LI_EQUIPOS_BD.forEach(x => { porNo[x.no] = x; });
      const q = await firebase.firestore().collection('apps/equipos/cat').get(), L = [];
      q.docs.forEach(d => Object.values((d.data() || {}).items || {}).forEach(e => { if (!e || !e.nombre || e.baja || ['MTA', 'MTB'].includes(e.cat)) return;
        const o = porNo[e.no], cod = e.eco || e.clave || '';
        L.push({ no: e.no, n: o ? o.n : nombreNuevo(e), cat: e.cat, ubic: e.ubic || (o && o.ubic) || '', cod: cod || (o && o.cod) || '', clave: e.clave || '', marca: e.marca || '', modelo: e.modelo || '' }); }));
      if (L.length < 50) return;
      L.sort((a, b) => (Number(a.no) || 0) - (Number(b.no) || 0));
      LI_EQUIPOS_BD.length = 0; L.forEach(x => LI_EQUIPOS_BD.push(x)); window.LI_EQUIPOS_BD_VIVO = new Date().toISOString();
      if (typeof agBdCaja === 'function') try { agBdCaja(); } catch (x) {}
    } catch (e) { /* sin acceso a la Base de Datos: se usa la copia */ }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', cargar); else cargar();
})();
