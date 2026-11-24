/* Misión Enfoque · ilustraciones SVG propias (ligeras, sin imágenes externas) */
(function () {
  'use strict';
  var n = 0;
  // Logo CECyTEA (tomado del archivo original "Mision Enfoque - tamizaje TDAH.html")
  function logo() {
    var id = 'chev' + (++n);
    return '<svg viewBox="0 0 640 190" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="CECyTEA"><defs><pattern id="' + id + '" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="#fff"/><path d="M-2 -8 L20 12 L42 -8 M-2 12 L20 32 L42 12 M-2 32 L20 52 L42 32" fill="none" stroke-width="8" stroke="#b7d335"/><path d="M-2 2 L20 22 L42 2 M-2 22 L20 42 L42 22" fill="none" stroke-width="6" stroke="#2c5aa8"/></pattern></defs><rect x="5" y="5" width="630" height="180" fill="#fff" stroke="#2b2d7c" stroke-width="10"/><rect x="10" y="10" width="196" height="170" fill="url(#' + id + ')"/><text x="108" y="165" text-anchor="middle" font-family="Arial Black,Arial,Helvetica,sans-serif" font-weight="900" font-size="175" fill="#fff" stroke="#2b2d7c" stroke-width="3" paint-order="stroke">A</text><text x="232" y="126" font-family="Arial Black,Arial,Helvetica,sans-serif" font-weight="900" font-size="84" fill="#2b2d7c" textLength="380" lengthAdjust="spacingAndGlyphs">CECYTEA</text></svg>';
  }
  function estrella(x, y, r, color, cls) {
    var p = [];
    for (var i = 0; i < 10; i++) { var a = Math.PI / 5 * i - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; p.push((x + rr * Math.cos(a)).toFixed(1) + ',' + (y + rr * Math.sin(a)).toFixed(1)); }
    return '<polygon points="' + p.join(' ') + '" fill="' + color + '"' + (cls ? ' class="' + cls + '"' : '') + '/>';
  }
  // Mascota: "Enfo", astronauta con audífonos y casco
  function astronauta() {
    return '<svg class="ilus" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<defs><linearGradient id="vis" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7FB0FF"/><stop offset="1" stop-color="#1B2F6B"/></linearGradient>' +
      '<radialGradient id="planeta" cx=".35" cy=".35" r=".7"><stop offset="0" stop-color="#E8F1FF"/><stop offset="1" stop-color="#B9D2FB"/></radialGradient></defs>' +
      '<circle cx="100" cy="104" r="84" fill="url(#planeta)"/>' +
      '<ellipse cx="100" cy="104" rx="98" ry="22" fill="none" stroke="#B7D335" stroke-width="5" opacity=".9" transform="rotate(-14 100 104)"/>' +
      estrella(28, 34, 9, '#B7D335', 'brilla') + estrella(172, 46, 7, '#2F6FDB', 'brilla') + estrella(162, 168, 6, '#B7D335', 'brilla') + estrella(36, 160, 5, '#2F6FDB') +
      '<g class="flota">' +
      // cuerpo
      '<rect x="68" y="108" width="64" height="54" rx="22" fill="#fff" stroke="#1B2F6B" stroke-width="4"/>' +
      '<rect x="86" y="122" width="28" height="18" rx="6" fill="#E8F1FF" stroke="#1B2F6B" stroke-width="3"/>' +
      '<circle cx="94" cy="131" r="3" fill="#D93A3F"/><circle cx="106" cy="131" r="3" fill="#B7D335"/>' +
      // brazo saludando
      '<path d="M132 120 q22 -6 26 -30" fill="none" stroke="#1B2F6B" stroke-width="14" stroke-linecap="round"/>' +
      '<path d="M132 120 q22 -6 26 -30" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round"/>' +
      '<circle cx="158" cy="86" r="9" fill="#2F6FDB" stroke="#1B2F6B" stroke-width="3"/>' +
      '<path d="M68 122 q-16 8 -16 26" fill="none" stroke="#1B2F6B" stroke-width="14" stroke-linecap="round"/>' +
      '<path d="M68 122 q-16 8 -16 26" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round"/>' +
      // casco
      '<circle cx="100" cy="76" r="42" fill="#fff" stroke="#1B2F6B" stroke-width="4"/>' +
      '<rect x="68" y="56" width="64" height="44" rx="22" fill="url(#vis)"/>' +
      '<path d="M78 66 q8 -8 20 -8" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity=".8"/>' +
      // ojos y sonrisa en el visor
      '<circle cx="88" cy="78" r="5" fill="#fff"/><circle cx="112" cy="78" r="5" fill="#fff"/>' +
      '<path d="M90 89 q10 8 20 0" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/>' +
      // audífonos
      '<path d="M58 72 q0 -40 42 -40 q42 0 42 40" fill="none" stroke="#2F6FDB" stroke-width="7" stroke-linecap="round"/>' +
      '<rect x="49" y="64" width="16" height="26" rx="8" fill="#2F6FDB" stroke="#1B2F6B" stroke-width="3"/>' +
      '<rect x="135" y="64" width="16" height="26" rx="8" fill="#2F6FDB" stroke="#1B2F6B" stroke-width="3"/>' +
      // antena con estrella
      '<line x1="100" y1="34" x2="100" y2="18" stroke="#1B2F6B" stroke-width="4"/>' + estrella(100, 14, 9, '#B7D335') +
      '</g></svg>';
  }
  function cohete(tam) {
    tam = tam || 96;
    return '<svg width="' + tam + '" height="' + tam + '" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<circle cx="50" cy="50" r="46" fill="rgba(255,255,255,.18)"/>' +
      '<g class="flota"><path d="M50 12 c16 12 20 34 14 52 h-28 c-6 -18 -2 -40 14 -52z" fill="#fff"/>' +
      '<circle cx="50" cy="38" r="8" fill="#2F6FDB" stroke="#1B2F6B" stroke-width="3"/>' +
      '<path d="M36 52 l-10 14 h12z M64 52 l10 14 h-12z" fill="#B7D335"/>' +
      '<path d="M42 66 q8 18 8 22 q0 -4 8 -22z" fill="#FFC531"/></g></svg>';
  }
  function cerebro(tam) {
    tam = tam || 72;
    return '<svg width="' + tam + '" height="' + tam + '" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<path d="M50 22 c-8 -8 -24 -6 -26 6 c-12 2 -14 18 -6 24 c-6 10 2 22 14 20 c4 8 14 8 18 2 c4 6 14 6 18 -2 c12 2 20 -10 14 -20 c8 -6 6 -22 -6 -24 c-2 -12 -18 -14 -26 -6z" fill="#E8F1FF" stroke="#2F6FDB" stroke-width="4"/>' +
      '<path d="M50 24 v52 M36 40 q8 4 4 12 M64 40 q-8 4 -4 12" stroke="#2F6FDB" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '<path d="M14 50 q0 -40 36 -40 q36 0 36 40" fill="none" stroke="#1B2F6B" stroke-width="5"/>' +
      '<rect x="6" y="44" width="12" height="22" rx="6" fill="#1B2F6B"/><rect x="82" y="44" width="12" height="22" rx="6" fill="#1B2F6B"/>' +
      '<path d="M70 6 l-6 12 h8 l-6 12" stroke="#B7D335" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  function trofeo() {
    return '<svg class="ilus" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<circle cx="100" cy="100" r="84" fill="#E8F1FF"/>' +
      estrella(40, 46, 10, '#B7D335', 'brilla') + estrella(164, 58, 8, '#2F6FDB', 'brilla') + estrella(150, 160, 7, '#B7D335', 'brilla') +
      '<g class="late"><path d="M64 48 h72 v20 c0 26 -16 44 -36 44 c-20 0 -36 -18 -36 -44z" fill="#2F6FDB" stroke="#1B2F6B" stroke-width="4"/>' +
      '<path d="M64 58 h-16 c0 22 10 30 22 30 M136 58 h16 c0 22 -10 30 -22 30" fill="none" stroke="#1B2F6B" stroke-width="5"/>' +
      '<rect x="90" y="112" width="20" height="22" fill="#1B2F6B"/><rect x="70" y="134" width="60" height="16" rx="6" fill="#1B2F6B"/>' +
      estrella(100, 76, 16, '#fff') + '</g></svg>';
  }
  function marca() {
    return '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="64" height="64" rx="16" fill="#2F6FDB"/><circle cx="32" cy="32" r="17" fill="none" stroke="#fff" stroke-width="5"/><circle cx="32" cy="32" r="7" fill="#B7D335"/><path d="M32 6v9M32 49v9M6 32h9M49 32h9" stroke="#fff" stroke-width="4" stroke-linecap="round"/></svg>';
  }
  window.ARTE = { logo: logo, astronauta: astronauta, cohete: cohete, cerebro: cerebro, trofeo: trofeo, marca: marca };
})();
