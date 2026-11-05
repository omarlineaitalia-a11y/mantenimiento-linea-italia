/* PRUEBA MASTER · ilustraciones por TIPO DE MÁQUINA (se suman a iconos.js, mismo estilo: viewBox 0 0 120 100,
 * color de la categoría en currentColor y volumen con los degradados gSombra, gMetal, gAcero, gMadera, gVidrio, gPiso…).
 * taladroBanco (taladro industrial de banco), dobladora, soldadora, laser, enchapadora, horno. */
(function () {
  'use strict';
  if (!window.ICON_R) return;
  var A = 'repeatCount="indefinite"';
  var piso = function (cx, w) { return '<ellipse cx="' + cx + '" cy="93" rx="' + w + '" ry="5" fill="url(#gPiso)"/>'; };

  Object.assign(window.ICON_R, {
    // ---- taladro industrial de banco (de columna): cabezal con motor, poleas, palanca de avance y broca que baja
    taladroBanco: piso(56, 40) +
      '<rect x="20" y="84" width="60" height="7" rx="1.5" fill="url(#gAcero)"/>' +
      '<rect x="28" y="12" width="7" height="74" fill="url(#gMetalH)"/>' +
      '<rect x="34" y="57" width="52" height="5" rx="1" fill="url(#gMetal)" stroke="#7D8792" stroke-width=".5"/><rect x="34" y="62" width="10" height="6" fill="url(#gAcero)"/>' +
      '<rect x="54" y="50" width="22" height="7" fill="url(#gMadera)"/>' +
      '<rect x="20" y="14" width="66" height="24" rx="4" fill="currentColor"/><rect x="20" y="14" width="66" height="24" rx="4" fill="url(#gSombra)"/>' +
      '<rect x="16" y="9" width="40" height="8" rx="3" fill="currentColor"/><rect x="16" y="9" width="40" height="8" rx="3" fill="url(#gSombraH)" opacity=".7"/>' +
      '<circle cx="18" cy="26" r="9" fill="url(#gAcero)"/><g stroke="#8E98A3" stroke-width="1"><path d="M12 22h12M12 26h12M12 30h12"/></g>' +
      '<rect x="72" y="20" width="10" height="6" rx="1" fill="#1D2329"/><circle cx="75" cy="23" r="1.4" fill="#3BD16F"/><circle cx="79" cy="23" r="1.4" fill="#E04848"/>' +
      '<g><animateTransform attributeName="transform" type="translate" values="0 0;0 0;0 9;0 9;0 0" keyTimes="0;.3;.55;.7;1" dur="2.4s" ' + A + '/>' +
        '<rect x="61" y="36" width="8" height="8" fill="url(#gMetalH)"/><path d="M60 44h10l-2 4h-6z" fill="url(#gAcero)"/>' +
        '<g><animateTransform attributeName="transform" type="rotate" values="0 65 52;360 65 52" dur=".4s" ' + A + '/><path d="M64 48h2l-.2 7-.8 1.6-.8-1.6z" fill="#C4CBD3"/><path d="M64 50l2 1M64 52.5l2 1" stroke="#6F7984" stroke-width=".6"/></g></g>' +
      '<g transform="translate(90 30)"><animateTransform attributeName="transform" type="rotate" values="0;0;-35;-35;0" keyTimes="0;.3;.55;.7;1" dur="2.4s" additive="sum" ' + A + '/>' +
        '<circle r="3.5" fill="url(#gAcero)"/><g stroke="#B9C1CA" stroke-width="2" stroke-linecap="round"><path d="M0 0L14 -4M0 0L-4 14M0 0L-10 -10"/></g><g fill="#1D2329"><circle cx="14" cy="-4" r="2.3"/><circle cx="-4" cy="14" r="2.3"/><circle cx="-10" cy="-10" r="2.3"/></g></g>' +
      '<g fill="#E9D7B0"><circle cx="58" cy="49" r="1"><animate attributeName="opacity" values="0;1;0" dur="1.2s" ' + A + '/></circle><circle cx="72" cy="48" r="1"><animate attributeName="opacity" values="0;1;0" dur="1.2s" begin=".6s" ' + A + '/></circle></g>',

    // ---- dobladora (prensa plegadora): el carro baja con el punzón y dobla la lámina
    dobladora: piso(60, 54) +
      '<rect x="8" y="14" width="16" height="74" rx="2" fill="currentColor"/><rect x="8" y="14" width="16" height="74" rx="2" fill="url(#gSombraH)"/>' +
      '<rect x="96" y="14" width="16" height="74" rx="2" fill="currentColor"/><rect x="96" y="14" width="16" height="74" rx="2" fill="url(#gSombraH)"/>' +
      '<rect x="14" y="62" width="92" height="12" fill="url(#gAcero)"/><path d="M52 62l8 6 8-6z" fill="#1D2329"/>' +
      '<rect x="18" y="74" width="84" height="14" fill="currentColor"/><rect x="18" y="74" width="84" height="14" fill="url(#gSombra)"/>' +
      '<g><animateTransform attributeName="transform" type="translate" values="0 0;0 0;0 9;0 9;0 0" keyTimes="0;.35;.55;.7;1" dur="2.4s" ' + A + '/>' +
        '<rect x="14" y="20" width="92" height="16" rx="1.5" fill="currentColor"/><rect x="14" y="20" width="92" height="16" rx="1.5" fill="url(#gSombra)"/>' +
        '<path d="M14 26h92" stroke="#F5C400" stroke-width="2.4" stroke-dasharray="4 4"/>' +
        '<rect x="54" y="36" width="12" height="8" fill="url(#gMetalH)"/><path d="M54 44h12l-6 6z" fill="url(#gAcero)"/></g>' +
      '<path fill="url(#gMetal)" stroke="#7D8792" stroke-width=".5"><animate attributeName="d" values="M2 58l58 0 58 0v3l-58 0-58 0z;M2 58l58 0 58 0v3l-58 0-58 0z;M2 52l58 8 58-8v3l-58 8-58-8z;M2 52l58 8 58-8v3l-58 8-58-8z;M2 58l58 0 58 0v3l-58 0-58 0z" keyTimes="0;.4;.55;.7;1" dur="2.4s" ' + A + '/></path>' +
      '<rect x="100" y="40" width="9" height="14" rx="1.5" fill="#1D2329"/><circle cx="104.5" cy="44" r="1.6" fill="#3BD16F"/><circle cx="104.5" cy="49.5" r="1.8" fill="#E04848"/>',

    // ---- soldadora: máquina con perilla, cable y antorcha con arco y chispas
    soldadora: piso(56, 46) +
      '<rect x="12" y="42" width="48" height="44" rx="4" fill="currentColor"/><rect x="12" y="42" width="48" height="44" rx="4" fill="url(#gSombra)"/>' +
      '<path d="M22 42v-8h28v8" fill="none" stroke="url(#gAcero)" stroke-width="4"/>' +
      '<rect x="18" y="48" width="22" height="12" rx="1.5" fill="#1D2329"/><text x="29" y="57" text-anchor="middle" font-family="Consolas,monospace" font-size="8" fill="#FFB020">160A</text>' +
      '<circle cx="50" cy="54" r="6" fill="url(#gAcero)"/><path d="M50 54l3-4" stroke="#E3E7EB" stroke-width="1.6"/>' +
      '<g fill="#2B3036"><circle cx="22" cy="76" r="3"/><circle cx="32" cy="76" r="3"/></g><path d="M16 64h40M16 68h40" stroke="rgba(0,0,0,.18)" stroke-width="1"/>' +
      '<path d="M32 76c10 10 30 6 44-10" fill="none" stroke="#1D2329" stroke-width="3" stroke-linecap="round"/>' +
      '<rect x="74" y="58" width="16" height="6" rx="2" transform="rotate(-35 82 61)" fill="url(#gAcero)"/>' +
      '<rect x="74" y="80" width="40" height="5" fill="url(#gMetal)" stroke="#7D8792" stroke-width=".5"/><rect x="92" y="74" width="5" height="6" fill="url(#gMetalH)"/>' +
      '<g><circle cx="92" cy="76" r="7" fill="url(#gLuz)"><animate attributeName="r" values="5;8;4;7;5" dur=".5s" ' + A + '/></circle>' +
        '<path d="M92 70l1.5 5 5 1-5 1.5-1.5 5-1.5-5-5-1.5 5-1z" fill="#fff"><animate attributeName="opacity" values="1;.4;1;.7;1" dur=".3s" ' + A + '/></path></g>' +
      '<g fill="#FFB020">' + [[100, 66, 0], [86, 64, .2], [104, 72, .4], [96, 62, .6]].map(function (s) { return '<circle cx="' + s[0] + '" cy="' + s[1] + '" r="1.2"><animate attributeName="opacity" values="0;1;0" dur=".8s" begin="' + s[2] + 's" ' + A + '/></circle>'; }).join('') + '</g>',

    // ---- láser de fibra: cama con lámina, puente y cabezal que corta con el haz
    laser: piso(60, 54) +
      '<rect x="6" y="56" width="108" height="28" rx="3" fill="currentColor"/><rect x="6" y="56" width="108" height="28" rx="3" fill="url(#gSombra)"/>' +
      '<rect x="12" y="84" width="8" height="6" fill="#2B3036"/><rect x="100" y="84" width="8" height="6" fill="#2B3036"/>' +
      '<rect x="12" y="50" width="96" height="7" fill="url(#gMetal)" stroke="#7D8792" stroke-width=".5"/>' +
      '<path d="M30 53.5h40" stroke="#1D2329" stroke-width="1" stroke-dasharray="2 1.5"/>' +
      '<rect x="4" y="18" width="112" height="9" rx="2" fill="url(#gMetal)" stroke="#7D8792" stroke-width=".6"/><rect x="4" y="18" width="6" height="36" fill="url(#gMetalH)"/><rect x="110" y="18" width="6" height="36" fill="url(#gMetalH)"/>' +
      '<g><animateTransform attributeName="transform" type="translate" values="-28 0;30 0;-28 0" dur="4s" ' + A + ' calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1"/>' +
        '<rect x="52" y="14" width="16" height="20" rx="2" fill="currentColor"/><rect x="52" y="14" width="16" height="20" rx="2" fill="url(#gSombraH)"/>' +
        '<path d="M56 34h8l-2 8h-4z" fill="url(#gAcero)"/>' +
        '<path d="M60 42v8" stroke="#FF3B3B" stroke-width="2"><animate attributeName="opacity" values="1;.5;1" dur=".25s" ' + A + '/></path>' +
        '<circle cx="60" cy="50" r="3" fill="url(#gLuz)"><animate attributeName="r" values="2.5;4;2.5" dur=".3s" ' + A + '/></circle></g>' +
      '<rect x="88" y="62" width="18" height="12" rx="1.5" fill="#1D2329"/><rect x="90" y="64" width="14" height="6" fill="url(#gVidrio)"/>',

    // ---- enchapadora (canteadora): el tablero avanza y el rollo de canto gira
    enchapadora: piso(60, 54) +
      '<rect x="6" y="50" width="108" height="34" rx="3" fill="currentColor"/><rect x="6" y="50" width="108" height="34" rx="3" fill="url(#gSombra)"/>' +
      '<rect x="12" y="84" width="8" height="6" fill="#2B3036"/><rect x="100" y="84" width="8" height="6" fill="#2B3036"/>' +
      '<rect x="10" y="40" width="100" height="10" rx="1" fill="url(#gVidrio)" opacity=".85"/>' +
      '<g><animateTransform attributeName="transform" type="translate" values="-50 0;40 0" dur="3.5s" ' + A + '/>' +
        '<rect x="30" y="31" width="38" height="9" fill="url(#gMadera)"/><rect x="30" y="38" width="38" height="2" fill="#F3E4C4"/></g>' +
      '<g transform="translate(24 22)"><circle r="12" fill="#E9D7B0" stroke="#C9A876" stroke-width="1.2"/><circle r="4" fill="url(#gAcero)"/>' +
        '<g stroke="#C9A876" stroke-width="1"><animateTransform attributeName="transform" type="rotate" values="0;360" dur="2s" ' + A + '/><path d="M0-11V11M-11 0H11"/></g></g>' +
      '<path d="M34 24c6 0 8 8 8 14" fill="none" stroke="#E9D7B0" stroke-width="1.6"/>' +
      '<rect x="80" y="58" width="22" height="14" rx="1.5" fill="#1D2329"/><rect x="82" y="60" width="18" height="8" fill="url(#gVidrio)"/>' +
      '<g fill="#3BD16F"><circle cx="16" cy="62" r="2"/></g><circle cx="22" cy="62" r="2" fill="#F5C400"><animate attributeName="opacity" values="1;.3;1" dur="1.6s" ' + A + '/></circle>',

    // ---- horno (curado / secado): ventana con calor y ondas que suben por la chimenea
    horno: piso(60, 50) +
      '<rect x="74" y="4" width="10" height="16" fill="url(#gAcero)"/>' +
      '<g fill="none" stroke="#FF9A3C" stroke-width="1.6" stroke-linecap="round" opacity=".8">' + [0, .7].map(function (b) { return '<path d="M79 2c-3-3 3-5 0-8"><animateTransform attributeName="transform" type="translate" values="0 6;0 -2" dur="1.4s" begin="' + b + 's" ' + A + '/><animate attributeName="opacity" values="0;1;0" dur="1.4s" begin="' + b + 's" ' + A + '/></path>'; }).join('') + '</g>' +
      '<rect x="12" y="18" width="96" height="70" rx="4" fill="currentColor"/><rect x="12" y="18" width="96" height="70" rx="4" fill="url(#gSombra)"/>' +
      '<rect x="20" y="28" width="56" height="48" rx="3" fill="#1D2329"/>' +
      '<rect x="24" y="32" width="48" height="40" rx="2" fill="#FF7A1A"><animate attributeName="fill" values="#FF7A1A;#FFB020;#FF7A1A" dur="2s" ' + A + '/></rect>' +
      '<rect x="24" y="32" width="48" height="40" rx="2" fill="url(#gVidrio)" opacity=".55"/>' +
      '<g stroke="#5E2A0A" stroke-width="1.2"><path d="M28 46h40M28 58h40"/></g>' +
      '<circle cx="92" cy="38" r="8" fill="#E3E7EB" stroke="#5E6873" stroke-width="1.4"/><path d="M92 38l4-4" stroke="#D32F2F" stroke-width="1.6"><animateTransform attributeName="transform" type="rotate" values="-40 92 38;40 92 38;-40 92 38" dur="4s" ' + A + '/></path>' +
      '<rect x="84" y="54" width="16" height="10" rx="1.5" fill="#1D2329"/><text x="92" y="61.5" text-anchor="middle" font-family="Consolas,monospace" font-size="6.5" fill="#FF9A3C">180°</text>' +
      '<rect x="80" y="70" width="4" height="12" rx="1" fill="url(#gMetalH)"/>'
  });
})();
