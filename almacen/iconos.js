/* Ilustraciones animadas (SVG) de cada categoría · Base de Datos LI.
 * viewBox 0 0 120 100. El color de la categoría llega por currentColor; el volumen, con los degradados de abajo. */
(function () {
  'use strict';
  var DEFS = '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>' +
    '<linearGradient id="gSombra" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></linearGradient>' +
    '<linearGradient id="gSombraH" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".25"/><stop offset=".35" stop-color="#fff" stop-opacity=".45"/><stop offset="1" stop-color="#000" stop-opacity=".3"/></linearGradient>' +
    '<linearGradient id="gMetal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F4F6F8"/><stop offset=".45" stop-color="#C4CBD3"/><stop offset=".55" stop-color="#E3E7EB"/><stop offset="1" stop-color="#8E98A3"/></linearGradient>' +
    '<linearGradient id="gMetalH" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7D8792"/><stop offset=".3" stop-color="#EEF1F4"/><stop offset=".6" stop-color="#B9C1CA"/><stop offset="1" stop-color="#6F7984"/></linearGradient>' +
    '<linearGradient id="gAcero" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5E6873"/><stop offset=".5" stop-color="#3A434C"/><stop offset="1" stop-color="#22282E"/></linearGradient>' +
    '<linearGradient id="gBlanco" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".7" stop-color="#EEF2F5"/><stop offset="1" stop-color="#C9D1D9"/></linearGradient>' +
    '<linearGradient id="gTanque" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".35"/><stop offset=".22" stop-color="#fff" stop-opacity=".55"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></linearGradient>' +
    '<linearGradient id="gMadera" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EBD3A6"/><stop offset="1" stop-color="#C79E62"/></linearGradient>' +
    '<linearGradient id="gHule" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4A4F55"/><stop offset="1" stop-color="#15181B"/></linearGradient>' +
    '<linearGradient id="gCobre" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9C5A2E"/><stop offset=".5" stop-color="#F0B27A"/><stop offset="1" stop-color="#9C5A2E"/></linearGradient>' +
    '<linearGradient id="gPorcelana" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6B3A1F"/><stop offset=".45" stop-color="#C77B45"/><stop offset="1" stop-color="#5A2F18"/></linearGradient>' +
    '<linearGradient id="gHaz" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF6C8" stop-opacity=".95"/><stop offset="1" stop-color="#FFE27A" stop-opacity="0"/></linearGradient>' +
    '<linearGradient id="gCielo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#CFE6FA"/><stop offset="1" stop-color="#F4FAFF"/></linearGradient>' +
    '<linearGradient id="gVidrio" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9FD3F5"/><stop offset=".5" stop-color="#5DA9DC"/><stop offset="1" stop-color="#2F6E9E"/></linearGradient>' +
    '<radialGradient id="gPiso" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#000" stop-opacity=".28"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>' +
    '<radialGradient id="gLuz" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFF7C2"/><stop offset=".6" stop-color="#FFD84D" stop-opacity=".6"/><stop offset="1" stop-color="#FFD84D" stop-opacity="0"/></radialGradient>' +
    '<radialGradient id="gLed" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="currentColor"/></radialGradient>' +
    '</defs></svg>';
  function montar() { if (!document.getElementById('li-defs')) { var d = document.createElement('div'); d.id = 'li-defs'; d.innerHTML = DEFS; document.body.insertBefore(d, document.body.firstChild); } }
  if (document.body) montar(); else document.addEventListener('DOMContentLoaded', montar);

  var piso = function (cx, w) { return '<ellipse cx="' + cx + '" cy="93" rx="' + w + '" ry="5" fill="url(#gPiso)"/>'; };
  var A = 'repeatCount="indefinite"';

  window.ICON_R = {
    // ---- Maquinaria tipo A: router CNC con cabezal que recorre la mesa, husillo girando y viruta
    mta: piso(60, 54) +
      '<rect x="12" y="62" width="96" height="24" rx="3" fill="currentColor"/><rect x="12" y="62" width="96" height="24" rx="3" fill="url(#gSombra)"/>' +
      '<rect x="18" y="86" width="8" height="6" fill="#2B3036"/><rect x="94" y="86" width="8" height="6" fill="#2B3036"/>' +
      '<rect x="14" y="55" width="92" height="8" rx="1.5" fill="url(#gMadera)"/><rect x="34" y="51" width="48" height="4.5" fill="#F3E4C4" stroke="#C9A876" stroke-width=".6"/>' +
      '<rect x="10" y="14" width="9" height="49" rx="1.5" fill="url(#gMetalH)"/><rect x="101" y="14" width="9" height="49" rx="1.5" fill="url(#gMetalH)"/>' +
      '<rect x="8" y="12" width="104" height="9" rx="2" fill="url(#gMetal)" stroke="#7D8792" stroke-width=".6"/>' +
      '<path d="M14 11q20-7 40 0t40 0" fill="none" stroke="#2B3036" stroke-width="2.4" stroke-dasharray="2.4 1.4"/>' +
      '<g><animateTransform attributeName="transform" type="translate" values="-26 0;24 0;-26 0" dur="7s" ' + A + ' calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1"/>' +
        '<rect x="50" y="17" width="20" height="18" rx="2" fill="currentColor"/><rect x="50" y="17" width="20" height="18" rx="2" fill="url(#gSombraH)"/>' +
        '<rect x="54" y="33" width="12" height="13" rx="2" fill="url(#gMetalH)"/><rect x="55" y="36" width="10" height="1" fill="#7D8792"/><rect x="55" y="39" width="10" height="1" fill="#7D8792"/>' +
        '<path d="M57.5 46h5l-1 3h-3z" fill="#5E6873"/><rect x="59.2" y="49" width="1.6" height="3" fill="#D9DEE3"><animate attributeName="fill" values="#F6F8FA;#8E98A3;#F6F8FA" dur=".18s" ' + A + '/></rect>' +
        '<g fill="#D8B477"><circle cx="56" cy="51" r=".9"><animate attributeName="cx" values="58;50" dur=".7s" ' + A + '/><animate attributeName="cy" values="51;44" dur=".7s" ' + A + '/><animate attributeName="opacity" values="1;0" dur=".7s" ' + A + '/></circle>' +
        '<circle cx="64" cy="51" r=".8"><animate attributeName="cx" values="62;71" dur=".9s" ' + A + '/><animate attributeName="cy" values="51;45" dur=".9s" ' + A + '/><animate attributeName="opacity" values="1;0" dur=".9s" ' + A + '/></circle>' +
        '<circle cx="60" cy="51" r=".7"><animate attributeName="cx" values="61;66" dur=".55s" ' + A + '/><animate attributeName="cy" values="51;42" dur=".55s" ' + A + '/><animate attributeName="opacity" values="1;0" dur=".55s" ' + A + '/></circle></g></g>' +
      '<rect x="88" y="66" width="16" height="12" rx="1.5" fill="#1D2329"/><rect x="90" y="68" width="12" height="6" rx="1" fill="#2D8CFF"><animate attributeName="opacity" values="1;.75;1" dur="2s" ' + A + '/></rect>' +
      '<circle cx="92" cy="76.5" r="1.2" fill="#3BD16F"><animate attributeName="opacity" values="1;.2;1" dur="1.2s" ' + A + '/></circle><circle cx="97" cy="76.5" r="1.2" fill="#E04848"/>',

    // ---- Maquinaria tipo B: prensa de bastidor en C con volante girando y carro que golpea
    mtb: piso(58, 44) +
      '<path d="M24 10h52v14H44v30h32v10H24z" fill="currentColor"/><path d="M24 10h52v14H44v30h32v10H24z" fill="url(#gSombraH)"/>' +
      '<rect x="18" y="64" width="64" height="12" rx="2" fill="currentColor"/><rect x="18" y="64" width="64" height="12" rx="2" fill="url(#gSombra)"/>' +
      '<rect x="22" y="76" width="56" height="12" rx="1" fill="#2B3036"/><rect x="22" y="76" width="56" height="3" fill="#4A535C"/>' +
      '<g><animateTransform attributeName="transform" type="translate" values="0 0;0 0;0 11;0 0" keyTimes="0;.45;.6;1" dur="1.8s" ' + A + '/>' +
        '<rect x="54" y="22" width="16" height="16" rx="1.5" fill="url(#gMetalH)"/><rect x="52" y="37" width="20" height="5" fill="url(#gAcero)"/>' +
        '<path d="M52 24h20" stroke="#F5C400" stroke-width="3" stroke-dasharray="3 3"/></g>' +
      '<rect x="50" y="58" width="24" height="6" fill="url(#gAcero)"/><rect x="55" y="55" width="14" height="3" fill="#A9B2BC"/>' +
      '<g transform="translate(88 22)"><circle r="17" fill="url(#gAcero)"/><circle r="14" fill="none" stroke="#8E98A3" stroke-width="2"/>' +
        '<g stroke="#B9C1CA" stroke-width="2.4"><animateTransform attributeName="transform" type="rotate" values="0;360" dur="1.8s" ' + A + '/><path d="M0-13V13M-13 0H13M-9-9L9 9M9-9L-9 9"/></g><circle r="3.5" fill="#E3E7EB"/></g>' +
      '<rect x="30" y="40" width="8" height="10" rx="1" fill="#1D2329"/><circle cx="34" cy="43" r="1.6" fill="#3BD16F"/><circle cx="34" cy="47.5" r="1.6" fill="#E04848"><animate attributeName="opacity" values="1;.3;1" dur="1.8s" ' + A + '/></circle>',

    // ---- Maquinaria tipo C: taladro inalámbrico con broca girando y luz LED
    mtc: piso(52, 38) +
      '<g><animateTransform attributeName="transform" type="translate" values="0 0;.6 -.4;-.5 .3;0 0" dur=".16s" ' + A + '/>' +
      '<path d="M18 26h48a12 12 0 0 1 12 12v2a10 10 0 0 1-10 10H48l-6 26H26l4-26h-8a8 8 0 0 1-8-8V30a4 4 0 0 1 4-4z" fill="currentColor"/>' +
      '<path d="M18 26h48a12 12 0 0 1 12 12v2a10 10 0 0 1-10 10H48l-6 26H26l4-26h-8a8 8 0 0 1-8-8V30a4 4 0 0 1 4-4z" fill="url(#gSombra)"/>' +
      '<path d="M31 50h16l-5 24H27z" fill="url(#gHule)"/><rect x="20" y="74" width="30" height="12" rx="3" fill="#2B3036"/><rect x="20" y="74" width="30" height="4" rx="2" fill="#4A535C"/>' +
      '<rect x="24" y="80" width="5" height="2.2" rx="1" fill="#3BD16F"/><rect x="31" y="80" width="5" height="2.2" rx="1" fill="#3BD16F"/><rect x="38" y="80" width="5" height="2.2" rx="1" fill="#3BD16F" opacity=".35"/>' +
      '<path d="M44 52q4 5 0 10" fill="none" stroke="#1D2329" stroke-width="3.2" stroke-linecap="round"/>' +
      '<rect x="77" y="31" width="13" height="14" rx="2" fill="url(#gMetal)"/><path d="M90 33l8 2v6l-8 2z" fill="url(#gMetal)" stroke="#8E98A3" stroke-width=".5"/>' +
      '<rect x="98" y="36.6" width="16" height="2.8" rx="1.4" fill="#C4CBD3"/>' +
      '<path d="M99 36.6l2 2.8M103 36.6l2 2.8M107 36.6l2 2.8M111 36.6l2 2.8" stroke="#6F7984" stroke-width="1.1"><animateTransform attributeName="transform" type="translate" values="0 0;4 0" dur=".14s" ' + A + '/></path>' +
      '<rect x="66" y="47" width="4" height="3" rx="1" fill="#FFF3B0"><animate attributeName="opacity" values="1;.6;1" dur="1s" ' + A + '/></rect>' +
      '<path d="M70 48l26 10v-12z" fill="url(#gHaz)" opacity=".55"/></g>',

    // ---- Aires acondicionados: minisplit con aleta que oscila, aire frío y condensador con ventilador
    aa: '<rect x="6" y="8" width="88" height="34" rx="9" fill="url(#gBlanco)" stroke="#AEB8C2" stroke-width="1"/>' +
      '<path d="M10 17h80" stroke="#DCE2E8" stroke-width="1"/><rect x="66" y="13" width="18" height="7" rx="2" fill="#0F1A26"/>' +
      '<text x="75" y="19" text-anchor="middle" font-family="Consolas,monospace" font-size="6" font-weight="700" fill="#54C8FF">24°<animate attributeName="opacity" values="1;.55;1" dur="3s" ' + A + '/></text>' +
      '<circle cx="14" cy="16" r="1.3" fill="#3BD16F"/>' +
      '<g><animateTransform attributeName="transform" type="rotate" values="-6 50 38;22 50 38;-6 50 38" dur="4s" ' + A + ' calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1"/><rect x="12" y="36" width="76" height="4" rx="2" fill="#E4E9EE" stroke="#AEB8C2" stroke-width=".6"/></g>' +
      '<g fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">' +
        '<path d="M22 46q-4 6 0 12t0 12"><animate attributeName="opacity" values="0;.9;0" dur="2.4s" ' + A + '/><animateTransform attributeName="transform" type="translate" values="0 -4;0 6" dur="2.4s" ' + A + '/></path>' +
        '<path d="M40 46q-4 6 0 12t0 12"><animate attributeName="opacity" values="0;.9;0" dur="2.4s" begin=".6s" ' + A + '/><animateTransform attributeName="transform" type="translate" values="0 -4;0 6" dur="2.4s" begin=".6s" ' + A + '/></path>' +
        '<path d="M58 46q-4 6 0 12t0 12"><animate attributeName="opacity" values="0;.9;0" dur="2.4s" begin="1.2s" ' + A + '/><animateTransform attributeName="transform" type="translate" values="0 -4;0 6" dur="2.4s" begin="1.2s" ' + A + '/></path></g>' +
      '<g transform="translate(30 80)" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" values="0;360" dur="8s" additive="sum" ' + A + '/><path d="M0-6V6M-5.2-3L5.2 3M-5.2 3L5.2-3"/></g>' +
      piso(94, 22) + '<rect x="72" y="54" width="44" height="36" rx="3" fill="url(#gBlanco)" stroke="#AEB8C2"/><circle cx="90" cy="72" r="14" fill="#2B3036"/><circle cx="90" cy="72" r="14" fill="none" stroke="#8E98A3" stroke-width="1.2" stroke-dasharray="1.5 1.5"/>' +
      '<g transform="translate(90 72)"><g fill="#8E98A3"><animateTransform attributeName="transform" type="rotate" values="0;360" dur=".7s" ' + A + '/><path d="M0 0C3-6 8-7 10-4C8 0 3 1 0 0zM0 0C6 3 7 8 4 10C0 8-1 3 0 0zM0 0C-3 6-8 7-10 4C-8 0-3-1 0 0zM0 0C-6-3-7-8-4-10C0-8 1-3 0 0z"/></g><circle r="2.4" fill="#C4CBD3"/></g>' +
      '<g stroke="#C4CBD3" stroke-width="1"><path d="M107 58v28M110 58v28M113 58v28"/></g>',

    // ---- Equipo auxiliar: compresor con tanque, volante girando, manómetro y purga de aire
    ea: piso(56, 50) +
      '<rect x="10" y="50" width="92" height="30" rx="15" fill="currentColor"/><rect x="10" y="50" width="92" height="30" rx="15" fill="url(#gTanque)"/>' +
      '<path d="M22 80l-4 10h10l2-10M82 80l-2 10h10l-2-10" fill="#2B3036"/>' +
      '<rect x="24" y="30" width="34" height="20" rx="4" fill="url(#gAcero)"/><g stroke="#5E6873" stroke-width="1.2"><path d="M28 32v16M32 32v16M36 32v16M40 32v16M44 32v16M48 32v16M52 32v16"/></g>' +
      '<rect x="60" y="26" width="22" height="24" rx="3" fill="url(#gMetalH)"/><rect x="62" y="22" width="18" height="6" rx="1.5" fill="url(#gMetal)"/>' +
      '<g transform="translate(92 36)"><circle r="12" fill="currentColor"/><circle r="12" fill="url(#gSombra)"/><circle r="8.5" fill="#2B3036"/>' +
        '<g stroke="#B9C1CA" stroke-width="2"><animateTransform attributeName="transform" type="rotate" values="0;360" dur=".5s" ' + A + '/><path d="M0-8V8M-8 0H8"/></g><circle r="2" fill="#E3E7EB"/></g>' +
      '<g transform="translate(18 40)"><circle r="8" fill="url(#gMetal)" stroke="#5E6873" stroke-width="1.2"/><circle r="6" fill="#fff"/>' +
        '<path d="M-4 3A5 5 0 1 1 4 3" fill="none" stroke="#E04848" stroke-width="1.2" stroke-dasharray="2 .8"/>' +
        '<path d="M0 0L0-5" stroke="#1D2329" stroke-width="1.3" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" values="-60;35;20;45;-60" dur="5s" ' + A + '/></path><circle r="1" fill="#1D2329"/></g>' +
      '<path d="M18 48v4" stroke="#5E6873" stroke-width="2"/>' +
      '<g fill="#CFE6FA"><circle cx="104" cy="74" r="2"><animate attributeName="r" values="1;6" dur="1.6s" ' + A + '/><animate attributeName="opacity" values=".9;0" dur="1.6s" ' + A + '/></circle>' +
        '<circle cx="106" cy="72" r="2"><animate attributeName="r" values="1;5" dur="1.6s" begin=".5s" ' + A + '/><animate attributeName="opacity" values=".8;0" dur="1.6s" begin=".5s" ' + A + '/></circle></g>',

    // ---- Eléctrico baja tensión: tablero con puerta abierta, interruptores, barras de cobre y pilotos
    ebt: piso(60, 40) +
      '<rect x="22" y="6" width="56" height="84" rx="3" fill="url(#gMetalH)" stroke="#6F7984"/><rect x="26" y="10" width="48" height="76" rx="2" fill="#2B3036"/>' +
      '<rect x="31" y="14" width="3" height="68" fill="url(#gCobre)"/><rect x="36" y="14" width="3" height="68" fill="url(#gCobre)"/><rect x="41" y="14" width="3" height="68" fill="url(#gCobre)"/>' +
      '<g><rect x="47" y="16" width="22" height="9" rx="1" fill="#E8ECEF"/><rect x="47" y="29" width="22" height="9" rx="1" fill="#E8ECEF"/><rect x="47" y="42" width="22" height="9" rx="1" fill="#E8ECEF"/><rect x="47" y="55" width="22" height="9" rx="1" fill="#E8ECEF"/>' +
        '<rect x="55" y="17.5" width="6" height="6" rx="1" fill="#1D2329"/><rect x="55" y="30.5" width="6" height="6" rx="1" fill="#1D2329"/><rect x="55" y="43.5" width="6" height="6" rx="1" fill="#1D2329"/><rect x="55" y="56.5" width="6" height="6" rx="1" fill="#C62828"/></g>' +
      '<rect x="47" y="69" width="22" height="12" rx="1" fill="#0F1A26"/><rect x="49" y="72" width="2" height="6" fill="#3BD16F"><animate attributeName="height" values="6;3;5;6" dur="1.3s" ' + A + '/></rect><rect x="53" y="72" width="2" height="6" fill="#3BD16F"><animate attributeName="height" values="4;6;3;4" dur="1.1s" ' + A + '/></rect><rect x="57" y="72" width="2" height="6" fill="#F5C400"><animate attributeName="height" values="5;2;6;5" dur="1.5s" ' + A + '/></rect>' +
      '<path d="M78 8l20 10v68l-20 4z" fill="currentColor"/><path d="M78 8l20 10v68l-20 4z" fill="url(#gSombraH)" opacity=".7"/>' +
      '<path d="M88 34l-7 13h8l-4 12 10-15h-8l4-10z" fill="#F5C400" stroke="#1D2329" stroke-width=".8"><animate attributeName="opacity" values="1;.35;1;1" dur="1.6s" ' + A + '/></path>' +
      '<circle cx="84" cy="70" r="2.4" fill="#3BD16F"/><circle cx="91" cy="70" r="2.4" fill="#E04848"><animate attributeName="opacity" values="1;.15;1" dur=".9s" ' + A + '/></circle>',

    // ---- Eléctrico media tensión: transformador en aceite con radiadores, boquillas y zumbido
    emt: piso(60, 50) +
      '<rect x="22" y="38" width="62" height="48" rx="3" fill="currentColor"/><rect x="22" y="38" width="62" height="48" rx="3" fill="url(#gSombraH)"/>' +
      '<g fill="url(#gMetalH)"><rect x="10" y="44" width="4" height="38"/><rect x="15" y="44" width="4" height="38"/><rect x="87" y="44" width="4" height="38"/><rect x="92" y="44" width="4" height="38"/><rect x="97" y="44" width="4" height="38"/></g>' +
      '<rect x="20" y="34" width="66" height="6" rx="1.5" fill="url(#gAcero)"/><rect x="58" y="16" width="34" height="12" rx="6" fill="currentColor"/><rect x="58" y="16" width="34" height="12" rx="6" fill="url(#gTanque)"/><path d="M70 28v6" stroke="#5E6873" stroke-width="2.5"/>' +
      '<g fill="url(#gPorcelana)"><path d="M30 34v-20h6v20z"/><path d="M43 34v-20h6v20z"/><path d="M56 34v-16h6v16z"/></g>' +
      '<g fill="#8A4A24"><rect x="28" y="16" width="10" height="2" rx="1"/><rect x="28" y="21" width="10" height="2" rx="1"/><rect x="28" y="26" width="10" height="2" rx="1"/><rect x="41" y="16" width="10" height="2" rx="1"/><rect x="41" y="21" width="10" height="2" rx="1"/><rect x="41" y="26" width="10" height="2" rx="1"/><rect x="54" y="22" width="10" height="2" rx="1"/><rect x="54" y="27" width="10" height="2" rx="1"/></g>' +
      '<g fill="#FFE27A"><circle cx="33" cy="12" r="2.2"><animate attributeName="opacity" values=".2;1;.2" dur="1.1s" ' + A + '/></circle><circle cx="46" cy="12" r="2.2"><animate attributeName="opacity" values="1;.2;1" dur="1.1s" ' + A + '/></circle><circle cx="59" cy="16" r="2.2"><animate attributeName="opacity" values=".5;1;.2;.5" dur="1.1s" ' + A + '/></circle></g>' +
      '<rect x="38" y="54" width="28" height="18" rx="1.5" fill="#F5C400" stroke="#1D2329" stroke-width=".8"/><path d="M52 57l-4 7h4l-2 6 6-8h-4l2-5z" fill="#1D2329"/>' +
      '<g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M104 50q4 6 0 12"><animate attributeName="opacity" values="0;1;0" dur="1.4s" ' + A + '/></path><path d="M109 46q6 10 0 20"><animate attributeName="opacity" values="0;1;0" dur="1.4s" begin=".35s" ' + A + '/></path></g>',

    // ---- Equipo móvil: montacargas levantando una tarima, torreta encendida
    em: piso(58, 52) +
      '<rect x="80" y="8" width="5" height="78" fill="url(#gMetalH)"/><rect x="87" y="8" width="5" height="78" fill="url(#gMetalH)"/>' +
      '<g><animateTransform attributeName="transform" type="translate" values="0 0;0 -30;0 -30;0 0;0 0" keyTimes="0;.35;.55;.9;1" dur="5s" ' + A + ' calcMode="spline" keySplines=".45 0 .55 1;0 0 1 1;.45 0 .55 1;0 0 1 1"/>' +
        '<rect x="90" y="66" width="4" height="20" fill="#2B3036"/><rect x="90" y="83" width="26" height="3" fill="#2B3036"/>' +
        '<rect x="94" y="77" width="22" height="5" fill="url(#gMadera)"/><rect x="96" y="58" width="18" height="19" rx="1" fill="#C79E62"/><path d="M96 66h18M105 58v19" stroke="#A97F47" stroke-width="1"/></g>' +
      '<path d="M14 56h50l8 10v16H14z" fill="currentColor"/><path d="M14 56h50l8 10v16H14z" fill="url(#gSombra)"/>' +
      '<path d="M8 50h20v32H8z" fill="url(#gAcero)"/>' +
      '<path d="M30 56V22h34l8 34" fill="none" stroke="#2B3036" stroke-width="3.5" stroke-linejoin="round"/><path d="M28 22h40" stroke="#2B3036" stroke-width="4"/>' +
      '<path d="M38 56v-14h12l2 14" fill="#1D2329"/><path d="M58 38l6 6" stroke="#1D2329" stroke-width="3" stroke-linecap="round"/>' +
      '<rect x="44" y="15" width="8" height="6" rx="2" fill="#FF9F1C"><animate attributeName="fill" values="#FF9F1C;#FFE0A3;#FF9F1C" dur=".8s" ' + A + '/></rect>' +
      '<circle cx="48" cy="18" r="9" fill="url(#gLuz)" opacity=".7"><animate attributeName="opacity" values=".1;.8;.1" dur=".8s" ' + A + '/></circle>' +
      '<g transform="translate(26 84)"><circle r="9" fill="url(#gHule)"/><circle r="4" fill="#B9C1CA"/></g><g transform="translate(64 84)"><circle r="9" fill="url(#gHule)"/><circle r="4" fill="#B9C1CA"/></g>',

    // ---- Iluminación: luminaria industrial LED con haz de luz
    il: '<path d="M60 0v14" stroke="#5E6873" stroke-width="1.6"/><path d="M52 14h16l4 6H48z" fill="url(#gAcero)"/>' +
      '<path d="M30 20h60l10 16H20z" fill="url(#gAcero)"/><g stroke="#5E6873" stroke-width="1.2"><path d="M36 22l-4 12M44 22l-2 12M52 22v12M60 22v12M68 22v12M76 22l2 12M84 22l4 12"/></g>' +
      '<rect x="20" y="36" width="80" height="5" rx="2" fill="#FFF7D6"><animate attributeName="fill" values="#FFF7D6;#FFFFFF;#FFF7D6" dur="2.5s" ' + A + '/></rect>' +
      '<path d="M22 41h76l20 50H2z" fill="url(#gHaz)"><animate attributeName="opacity" values=".55;.85;.55" dur="2.5s" ' + A + '/></path>' +
      '<ellipse cx="60" cy="93" rx="56" ry="6" fill="#FFE27A" opacity=".45"><animate attributeName="opacity" values=".3;.55;.3" dur="2.5s" ' + A + '/></ellipse>' +
      '<g fill="#FFF3B0"><circle cx="40" cy="60" r="1"><animate attributeName="cy" values="50;88" dur="3s" ' + A + '/><animate attributeName="opacity" values="0;1;0" dur="3s" ' + A + '/></circle><circle cx="78" cy="60" r="1"><animate attributeName="cy" values="48;86" dur="3.6s" begin="1s" ' + A + '/><animate attributeName="opacity" values="0;1;0" dur="3.6s" begin="1s" ' + A + '/></circle></g>' +
      '<rect x="56" y="24" width="8" height="4" rx="1" fill="currentColor"/>',

    // ---- Áreas generales: nave con techo de dientes de sierra, oficinas con luces que se encienden y árbol
    ag: '<rect x="0" y="0" width="120" height="92" rx="6" fill="url(#gCielo)"/><rect x="0" y="86" width="120" height="8" fill="#9CC28A"/>' +
      '<path d="M8 86V40l14-12v12l14-12v12l14-12v12l14-12v58z" fill="#D6DCE2" stroke="#8E98A3" stroke-width="1"/>' +
      '<path d="M22 28v12M36 28v12M50 28v12" stroke="#8E98A3" stroke-width="1"/><g fill="url(#gVidrio)"><path d="M10 39l11-9v9z"/><path d="M24 39l11-9v9z"/><path d="M38 39l11-9v9z"/><path d="M52 39l11-9v9z"/></g>' +
      '<rect x="18" y="58" width="22" height="28" fill="url(#gAcero)"/><g stroke="#8E98A3" stroke-width=".8"><path d="M18 62h22M18 66h22M18 70h22M18 74h22M18 78h22M18 82h22"/></g>' +
      '<rect x="64" y="22" width="44" height="64" fill="currentColor"/><rect x="64" y="22" width="44" height="64" fill="url(#gSombraH)" opacity=".6"/><rect x="62" y="19" width="48" height="4" fill="#5E6873"/>' +
      '<g>' + [[68, 28, 0], [80, 28, .4], [92, 28, .8], [68, 42, 1.2], [80, 42, 1.6], [92, 42, 2], [68, 56, 2.4], [92, 56, 2.8]].map(function (w) {
        return '<rect x="' + w[0] + '" y="' + w[1] + '" width="9" height="9" rx="1" fill="#2F6E9E"><animate attributeName="fill" values="#2F6E9E;#FFE27A;#FFE27A;#2F6E9E" keyTimes="0;.1;.7;1" dur="5s" begin="' + w[2] + 's" ' + A + '/></rect>'; }).join('') + '</g>' +
      '<rect x="80" y="68" width="12" height="18" fill="#1D2329"/><rect x="81" y="69" width="10" height="16" fill="url(#gVidrio)" opacity=".8"/>' +
      '<g><animateTransform attributeName="transform" type="rotate" values="-3 6 86;3 6 86;-3 6 86" dur="3s" ' + A + '/><rect x="4.5" y="66" width="3" height="20" fill="#7A5230"/><circle cx="6" cy="60" r="9" fill="#3E8E4E"/><circle cx="2" cy="64" r="6" fill="#4FA35F"/><circle cx="10" cy="63" r="6" fill="#357A43"/></g>'
  };
})();
