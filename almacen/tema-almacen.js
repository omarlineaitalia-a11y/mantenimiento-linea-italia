/* Almacén de refacciones · capa visual estilo Control de Paros (portada en vivo, íconos, indicadores con color). No cambia datos. */
(function () {
  const ICONOS = { exist: '📦', est: '🗄️', alert: '⚠️', movs: '🧾', gasto: '', valor: '', nueva: '', pers: '👥', maq: '⚙️' };
  const ilus = '<svg viewBox="0 0 340 220" aria-hidden="true">' +
    '<g opacity=".95"><rect x="20" y="18" width="190" height="186" rx="10" fill="none" stroke="#9FB9D6" stroke-width="5"/>' +
    '<line x1="20" y1="80" x2="210" y2="80" stroke="#9FB9D6" stroke-width="5"/><line x1="20" y1="142" x2="210" y2="142" stroke="#9FB9D6" stroke-width="5"/>' +
    '<g class="fl"><rect x="34" y="36" width="44" height="40" rx="5" fill="#F5A623"/><rect x="50" y="36" width="12" height="12" fill="#FFD27A"/>' +
    '<rect x="86" y="46" width="36" height="30" rx="5" fill="#2F86E8"/><rect x="130" y="40" width="64" height="36" rx="5" fill="#1E8E5A"/><text x="162" y="64" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="13" font-weight="700" fill="#fff">6205</text></g>' +
    '<g class="fl2"><rect x="34" y="100" width="58" height="38" rx="5" fill="#2F86E8"/><rect x="100" y="104" width="40" height="34" rx="5" fill="#F5A623"/><rect x="148" y="96" width="46" height="42" rx="5" fill="#C9D8E8"/><rect x="164" y="96" width="14" height="12" fill="#9FB9D6"/></g>' +
    '<g class="fl"><rect x="34" y="160" width="40" height="40" rx="5" fill="#1E8E5A"/><rect x="82" y="168" width="70" height="32" rx="5" fill="#F5A623"/><rect x="160" y="158" width="36" height="42" rx="5" fill="#2F86E8"/></g></g>' +
    '<g transform="translate(272 74)"><g class="gira"><path d="M0-34l6 0 3 9 8 4 9-4 4 5-4 9 3 8 9 3v7l-9 3-3 8 4 9-5 4-9-4-8 3-3 9h-7l-3-9-8-3-9 4-4-5 4-9-3-8-9-3v-7l9-3 3-8-4-9 5-4 9 4 8-4z" fill="#3FC1C9" opacity=".85" transform="translate(-3 0)"/><circle r="11" fill="#0E2A47"/></g></g>' +
    '<g transform="translate(236 150) rotate(-35)"><rect x="-6" y="-46" width="12" height="80" rx="6" fill="#C9D8E8"/><path d="M-20-58a20 20 0 1 0 40 0l-8 0 0 12-24 0 0-12z" fill="#C9D8E8"/></g>' +
    '<g transform="translate(300 170)"><rect x="-26" y="-22" width="44" height="30" rx="6" fill="#F5A623"/><rect x="-22" y="-40" width="22" height="20" rx="4" fill="none" stroke="#F5A623" stroke-width="4"/><line x1="22" y1="-44" x2="22" y2="16" stroke="#C9D8E8" stroke-width="5"/><line x1="22" y1="12" x2="40" y2="12" stroke="#C9D8E8" stroke-width="5"/><circle cx="-14" cy="12" r="8" fill="#0E2A47" stroke="#9FB9D6" stroke-width="3"/><circle cx="10" cy="12" r="8" fill="#0E2A47" stroke="#9FB9D6" stroke-width="3"/></g></svg>';
  function montar() {
    const hero = document.querySelector('header.hero'), kp = hero && hero.querySelector('section.kpis'); if (!hero) return;
    if (kp) hero.insertAdjacentElement('afterend', kp);
    if (!document.getElementById('aHero')) { const d = document.createElement('section'); d.id = 'aHero'; d.className = 'aHero'; d.innerHTML = '<div class="aDona" id="aDona"></div><div class="hc"><span class="eti" id="aEti"><i></i><span>Almacén en vivo</span></span><h2 id="aTit">Cargando el almacén…</h2><p class="sub" id="aSub">Conectando con la base de datos</p><div class="barra" id="aBar"></div><div class="ley" id="aLey"></div></div><div class="ilus">' + ilus + '</div>'; hero.insertAdjacentElement('afterend', d); }
    const tags = { kTot: ['#1F6FD1', '🔩'], kCon: ['#1E8E5A', '✅'], kEst: ['#7A3FC2', '🗄️'], kUb: ['#E0A100', '📍'] };
    Object.entries(tags).forEach(([id, [c, ic]]) => { const b = document.getElementById(id), k = b && b.closest('.kpi'); if (k && !k.querySelector('.ic')) { k.style.setProperty('--c', c); k.insertAdjacentHTML('beforeend', '<span class="ic">' + ic + '</span>'); } });
    const al = document.getElementById('kAl'); if (al && !al.querySelector('.ic')) al.insertAdjacentHTML('beforeend', '<span class="ic">🚨</span>');
    document.querySelectorAll('nav.tabs button[data-tab]').forEach(b => { const ic = ICONOS[b.dataset.tab]; if (ic && !b.dataset.ic) { b.dataset.ic = '1'; b.insertAdjacentHTML('afterbegin', ic + ' '); } });
  }
  function pintar() {
    if (typeof S === 'undefined' || !S.items) return; const L = Object.values(S.items); if (!L.length) return;
    const c = { ok: 0, bajo: 0, agot: 0, neg: 0, sin: 0 }; L.forEach(it => { const s = estado(it); c[s] = (c[s] || 0) + 1; });
    const conMin = c.ok + c.bajo + c.agot, surt = conMin ? Math.round((c.ok + c.bajo) / conMin * 100) : 0, al = c.bajo + c.agot + c.neg;
    const valor = L.reduce((a, it) => a + Math.max(0, ex(it)) * (Number(it.cu) || 0), 0);
    const e = document.getElementById('aEti'), t = document.getElementById('aTit'), s = document.getElementById('aSub'), b = document.getElementById('aBar'), l = document.getElementById('aLey'); if (!t) return;
    e.className = 'eti' + (c.agot ? ' mal' : ''); e.querySelector('span').textContent = c.agot ? 'Almacén en vivo · ' + c.agot + ' agotada(s)' : 'Almacén en vivo · sin faltantes';
    t.innerHTML = 'Almacén <span>' + surt + ' %</span> surtido';
    s.textContent = L.length.toLocaleString('es-MX') + ' refacciones · ' + (c.ok + c.bajo).toLocaleString('es-MX') + ' con existencia · ' + al + ' alerta(s)' + (valor ? ' · valor ' + valor.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }) : '');
    const tot = Math.max(1, c.ok + c.bajo + c.agot + c.neg + c.sin), seg = [['#2ECC71', c.ok, 'disponibles'], ['#F2B233', c.bajo, 'bajo mínimo'], ['#F2546A', c.agot + c.neg, 'agotadas / revisar'], ['#6B7F94', c.sin, 'sin existencia']];
    b.innerHTML = seg.map(([col, n]) => '<i style="width:' + (n / tot * 100) + '%;background:' + col + '"></i>').join('');
    const dh = document.getElementById('aDona'); if (dh) dh.innerHTML = dona(surt, surt >= 95 ? '#2ECC71' : surt >= 85 ? '#F2B233' : '#F2546A', 132, null, true) + '<small>surtido</small>'; donasKpi(c, L);
    l.innerHTML = seg.map(([col, n, tx]) => '<span><i style="background:' + col + '"></i><b>' + n.toLocaleString('es-MX') + '</b> ' + tx + '</span>').join('');
  }
  // "sin foto" → dibujo según el tipo de refacción
  const TIPOS = [[/balero|rodamiento|chumacera|carrito|rodillo/i, '⚙️', '#1F6FD1'], [/sello|ret[eé]n|o-?ring|empaque|junta/i, '⭕', '#7A3FC2'], [/banda|cadena|polea|engrane|catarina/i, '🔗', '#C77C0E'],
    [/filtro/i, '🧽', '#1E8E5A'], [/tornillo|tuerca|rondana|perno|birlo|esp[aá]rrago|remache/i, '🔩', '#5A6676'], [/cable|contactor|relevador|rel[eé]|fusible|breaker|interruptor|sensor|l[aá]mpara|foco|led|motor|variador|bobina|clavija|apagador|termomagn/i, '⚡', '#E0A100'],
    [/manguera|conexi[oó]n|v[aá]lvula|neum[aá]tic|cilindro|piston|pist[oó]n|codo|cople|niple|tubo|abrazadera/i, '🔧', '#2F86E8'], [/aceite|grasa|lubric|refrigerante|anticongelante/i, '🛢️', '#8E5A1F'],
    [/cuchilla|broca|fresa|sierra|disco|lija|navaja|buril/i, '🪚', '#C62828'], [/pintura|thinner|silic[oó]n|pegamento|cinta/i, '🎨', '#D35AA0']];
  function iconosLista() {
    document.querySelectorAll('span.thumb').forEach(sp => { if (sp.dataset.ic) return; const row = sp.closest('.row'); const tx = row ? row.textContent : ''; const t = TIPOS.find(([rx]) => rx.test(tx)) || [null, '📦', '#0E2A47'];
      sp.dataset.ic = '1'; sp.textContent = t[1]; sp.title = 'Sin foto todavía'; sp.style.cssText = 'display:grid;place-items:center;font-size:22px;background:linear-gradient(145deg,' + t[2] + '22,' + t[2] + '44);border:1px solid ' + t[2] + '55;color:inherit'; });
  }
  const obsLista = () => { const l = document.getElementById('lista'); if (l && !l._obsIc) { l._obsIc = true; new MutationObserver(iconosLista).observe(l, { childList: true }); iconosLista(); } };
  // ---------- gráficas circulares (promedio en medio)
  const PAL = ['#1F6FD1', '#1E8E5A', '#F5A623', '#7A3FC2', '#3FC1C9', '#C62828', '#D35AA0', '#8E5A1F', '#5A6676', '#2F86E8'];
  function dona(pct, col, tam, txt, osc) {
    const g = Math.max(7, Math.round(tam * .12)), r = (tam - g) / 2, c = 2 * Math.PI * r, p = Math.max(0, Math.min(100, pct || 0)), fg = osc ? '#fff' : '#0E2A47', bg = osc ? 'rgba(255,255,255,.14)' : '#E4E9EF';
    return '<svg width="' + tam + '" height="' + tam + '" viewBox="0 0 ' + tam + ' ' + tam + '" aria-hidden="true"><circle cx="' + tam / 2 + '" cy="' + tam / 2 + '" r="' + r + '" fill="none" stroke="' + bg + '" stroke-width="' + g + '"/>' +
      (p > 0 ? '<circle cx="' + tam / 2 + '" cy="' + tam / 2 + '" r="' + r + '" fill="none" stroke="' + col + '" stroke-width="' + g + '" stroke-linecap="round" stroke-dasharray="' + (c * p / 100).toFixed(1) + ' ' + c.toFixed(1) + '" transform="rotate(-90 ' + tam / 2 + ' ' + tam / 2 + ')"></circle>' : '') +
      '<text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" font-family="IBM Plex Sans,Arial" font-weight="700" font-size="' + Math.round(tam * .24) + '" fill="' + fg + '">' + (txt != null ? txt : Math.round(p) + '%') + '</text></svg>';
  }
  function donaMulti(segs, tam, centro, sub) {
    const tot = segs.reduce((a, s) => a + s.v, 0) || 1, g = Math.round(tam * .14), r = (tam - g) / 2, c = 2 * Math.PI * r; let acc = 0;
    return '<svg width="' + tam + '" height="' + tam + '" viewBox="0 0 ' + tam + ' ' + tam + '" aria-hidden="true"><circle cx="' + tam / 2 + '" cy="' + tam / 2 + '" r="' + r + '" fill="none" stroke="#E4E9EF" stroke-width="' + g + '"/>' +
      segs.map(s => { const l = c * s.v / tot, o = c * acc / tot; acc += s.v; return '<circle cx="' + tam / 2 + '" cy="' + tam / 2 + '" r="' + r + '" fill="none" style="stroke:' + s.c + '" stroke-width="' + g + '" stroke-dasharray="' + Math.max(0, l - 1.5).toFixed(1) + ' ' + c.toFixed(1) + '" stroke-dashoffset="' + (-o).toFixed(1) + '" transform="rotate(-90 ' + tam / 2 + ' ' + tam / 2 + ')"><title>' + s.l + '</title></circle>'; }).join('') +
      '<text x="50%" y="46%" text-anchor="middle" dominant-baseline="central" font-family="IBM Plex Sans,Arial" font-weight="800" font-size="' + Math.round(tam * .13) + '" fill="#0E2A47">' + centro + '</text><text x="50%" y="62%" text-anchor="middle" font-family="IBM Plex Sans,Arial" font-size="' + Math.round(tam * .07) + '" fill="#5A6676">' + (sub || '') + '</text></svg>';
  }
  const leyenda = (segs, fv) => { const tot = segs.reduce((a, s) => a + s.v, 0) || 1; return '<div class="dLeg">' + segs.map(s => '<span><i style="background:' + s.c + '"></i>' + s.l + ' <b>' + fv(s.v) + '</b> <small>' + Math.round(s.v / tot * 100) + '%</small></span>').join('') + '</div>'; };
  const sinCent = v => money(v).replace(/\.\d+$/, '');
  function donasKpi(c, L) {
    const tot = L.length || 1, ub = L.filter(it => it.niv && it.pos).length, con = c.ok + c.bajo;
    [['kCon', con / tot * 100, '#1E8E5A'], ['kUb', ub / tot * 100, '#E0A100']].forEach(([id, p, col]) => {
      const k = document.getElementById(id), box = k && k.closest('.kpi'); if (!box) return;
      const ic = box.querySelector('.ic'); if (ic) ic.style.display = 'none';
      let d = box.querySelector('.dk'); if (!d) { d = document.createElement('span'); d.className = 'dk'; box.appendChild(d); }
      d.innerHTML = dona(p, col, 58);
    });
  }
  function donaValor() {
    const st = document.getElementById('vStack'); if (!st || typeof valorDe !== 'function') return; const by = {};
    Object.values(S.items).forEach(it => { const v = valorDe(it); if (v > 0) { const k = it.cat || 'GEN'; by[k] = (by[k] || 0) + v; } });
    const segs = Object.keys(CATS).filter(k => by[k]).map((k, i) => ({ v: by[k], c: PAL[i % PAL.length], l: k + ' · ' + CATS[k] })), tot = segs.reduce((a, s) => a + s.v, 0);
    let w = document.getElementById('vDona'); if (!w) { w = document.createElement('div'); w.id = 'vDona'; w.className = 'dWrap'; st.before(w); }
    w.innerHTML = segs.length ? donaMulti(segs, 190, sinCent(tot), 'valor total') + leyenda(segs, sinCent) : (() => { const con = Object.values(S.items).filter(it => ex(it) > 0), cc = con.filter(it => Number(it.cu) > 0).length, p = con.length ? cc / con.length * 100 : 0; return dona(p, '#F5A623', 150) + '<div class="dLeg"><span><b style="font-size:16px">' + cc + ' de ' + con.length + '</b></span><span>refacciones con existencia ya tienen costo capturado.</span><span><small>En cuanto se capturen los costos, aquí sale el valor del almacén por categoría.</small></span></div>'; })();
  }
  function donaGasto() {
    const ga = document.getElementById('gArea'); if (!ga || typeof salidasCosteadas !== 'function') return; const met = S.g.met, y0 = new Date(new Date().getFullYear(), 0, 1), by = {};
    salidasCosteadas().filter(m => m.d >= y0).forEach(m => { const a = m.area || 'Sin área'; by[a] = (by[a] || 0) + (met === 'imp' ? m.imp : Number(m.q) || 0); });
    const L = Object.entries(by).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]), top = L.slice(0, 7), resto = L.slice(7).reduce((a, [, v]) => a + v, 0);
    const segs = top.map(([l, v], i) => ({ v, l, c: PAL[i % PAL.length] })); if (resto) segs.push({ v: resto, l: 'Otras áreas', c: '#9AA7B4' });
    const fv = met === 'imp' ? sinCent : (v => fmt(v) + ' pzas'), tot = segs.reduce((a, s) => a + s.v, 0);
    let w = document.getElementById('gDona'); if (!w) { w = document.createElement('div'); w.id = 'gDona'; w.className = 'dWrap'; ga.before(w); }
    w.innerHTML = segs.length ? donaMulti(segs, 170, fv(tot), met === 'imp' ? 'gasto del año' : 'piezas del año') + leyenda(segs, fv) : '';
  }
  function envolver(nombre, fn) { try { const base = window[nombre]; if (typeof base !== 'function' || base._tema) return; const nuevo = function () { const r = base.apply(this, arguments); try { fn(); } catch (e) {} return r; }; nuevo._tema = true; window[nombre] = nuevo; } catch (e) {} }

  // ---------- dibujos de máquinas (los mismos de la Base de Datos: iconos.js + iconos-maquinas.js)
  const CCOLM = { MTA: '#1F6FD1', MTB: '#EB6834', MTC: '#8E5A1F', EA: '#1BAF7A', AA: '#2BA9B3', AG: '#5A6676', EBT: '#E0A100', EMT: '#C62828', EM: '#1E8E5A', IL: '#F5A623', HM: '#7A3FC2', GEN: '#5A6676' }, CICO = { MTA: 'mta', MTB: 'mtb', MTC: 'mtc', EA: 'ea', AA: 'aa', AG: 'ag', EBT: 'ebt', EMT: 'emt', EM: 'em', IL: 'il', HM: 'mtc', GEN: 'ag' };
  const normT = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  function icMaq(nombre, cat) {
    const n = normT(nombre);
    if (/inversor|tablero|subestacion|transformador/.test(n)) return 'ebt';
    if (/compresor|extractor|secador|vaporizador|colector/.test(n)) return 'ea';
    if (/laser|gweike|g-weike|bimex/.test(n)) return 'laser';
    if (/dobladora|plegadora/.test(n)) return 'dobladora';
    if (/soldar|soldadora|punteadora/.test(n)) return 'soldadora';
    if (/enchapadora|canteadora|homag|stefani|cubrecanto/.test(n)) return 'enchapadora';
    if (/horno|tunel|curado/.test(n)) return 'horno';
    if (/prensa|troquel|cizalla|guillotina/.test(n)) return 'mtb';
    if (/taladro/.test(n)) return (cat === 'MTB' || /banco|pedestal|columna/.test(n)) ? 'taladroBanco' : 'mtc';
    if (/montacarga|patin|carrito/.test(n)) return 'em';
    return CICO[cat] || 'mta';
  }
  const dibujo = (k, col, cls) => (window.ICON_R && ICON_R[k]) ? '<svg class="' + (cls || 'shIl') + '" viewBox="0 0 120 100" style="color:' + col + '" aria-hidden="true">' + ICON_R[k] + '</svg>' : '';
  function decorar() {
    try { iconosLista(); } catch (e) {}
    if (!window.ICON_R) return;
    document.querySelectorAll('#estantes .shelf, #maqGrid .shelf').forEach(b => {
      if (b.dataset.il) return; const sec = b.closest('.catsec'), cat = sec ? (sec.querySelector('h2 .mono') || {}).textContent : 'GEN';
      const nom = (b.querySelector('.sh-name') || {}).textContent || b.textContent; const svg = b.closest('#estantes') ? anaquel(icMaq(nom, cat), CCOLM[cat] || '#1F6FD1') : dibujo(icMaq(nom, cat), CCOLM[cat] || '#1F6FD1'); if (!svg) return;
      b.dataset.il = '1'; b.insertAdjacentHTML('afterbegin', '<span class="shIlW">' + svg + '</span>');
    });
    const dh = document.querySelector('#maqDet .dhead'); if (dh && !dh.dataset.il) { const cat = ((dh.querySelector('.eyebrow') || {}).textContent || 'GEN').split('·')[0].trim(), nom = (dh.querySelector('h2') || {}).textContent || ''; const svg = dibujo(icMaq(nom, cat), CCOLM[cat] || '#1F6FD1', 'dIl'); if (svg) { dh.dataset.il = '1'; dh.insertAdjacentHTML('afterbegin', '<span class="dIlW">' + svg + '</span>'); } }
  }
  const obsMaq = () => ['estantes', 'maqGrid', 'maqDet'].forEach(id => { const el = document.getElementById(id); if (el && !el._obsMq) { el._obsMq = true; new MutationObserver(decorar).observe(el, { childList: true }); } });
  // ---------- estante = dibujo de un anaquel del color de su categoría, con la máquina que surte en la repisa de en medio
  function anaquel(icon, col) {
    const ic = (window.ICON_R && ICON_R[icon]) ? '<svg x="34" y="34" width="52" height="32" viewBox="0 0 120 100" style="color:' + col + '">' + ICON_R[icon] + '</svg>' : '';
    const caja = (x, y, w, h, c) => '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="2" fill="' + c + '"/><rect x="' + (x + w / 2 - 3) + '" y="' + y + '" width="6" height="' + Math.min(5, h) + '" fill="#fff" opacity=".45"/>';
    return '<svg class="shIl" viewBox="0 0 120 100" aria-hidden="true"><ellipse cx="60" cy="95" rx="50" ry="4" fill="url(#gPiso)"/>' +
      '<rect x="14" y="6" width="5" height="88" rx="1.5" fill="' + col + '"/><rect x="101" y="6" width="5" height="88" rx="1.5" fill="' + col + '"/>' +
      [30, 66, 90].map(y => '<rect x="12" y="' + y + '" width="96" height="4" rx="1" fill="url(#gMetal)" stroke="#8E98A3" stroke-width=".5"/>').join('') +
      '<rect x="12" y="6" width="96" height="3" rx="1" fill="' + col + '" opacity=".7"/>' +
      caja(22, 14, 18, 16, '#F5A623') + caja(43, 18, 14, 12, col) + caja(60, 12, 20, 18, '#C9D8E8') + caja(83, 17, 15, 13, '#1E8E5A') +
      ic + caja(22, 74, 24, 16, col) + caja(50, 76, 18, 14, '#F5A623') + caja(72, 72, 26, 18, '#C9D8E8') + '</svg>';
  }
  // ---------- 📷 lector de QR (cámara de la tablet o celular). El QR del estante guarda la ubicación: …/almacen/#ub=A1-N3-P02
  let qrStream = null, qrLoop = 0, qrDet = null;
  function cargarJsQR() { return window.jsQR ? Promise.resolve() : new Promise((ok, mal) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js'; s.onload = ok; s.onerror = mal; document.head.appendChild(s); }); }
  function textoQR(t) { t = String(t || '').trim(); const m = t.match(/[#&?]ub=([^&]+)/i); if (m) return { tipo: 'ub', v: decodeURIComponent(m[1]).toUpperCase() }; const c = t.match(/[#&?]c=([^&]+)/i); if (c) return { tipo: 'c', v: decodeURIComponent(c[1]).toUpperCase() }; return { tipo: 'txt', v: t.toUpperCase() }; }
  function aplicarQR(r) {
    if (window.esCodigoOrden && window.esCodigoOrden(r.v)) { window.abrirOrdenCodigo(r.v); return; }
    const b = document.querySelector('nav.tabs button[data-tab="exist"]'); if (b) b.click();
    const q = document.getElementById('q'); if (!q) return;
    q.value = r.v.replace(/-N(\d+)/, ' N$1').replace(/-P(\d+)/, ' P$1').replace(/-/g, ' ').trim(); q.dispatchEvent(new Event('input', { bubbles: true }));
    try { toast((r.tipo === 'ub' ? '📍 Ubicación ' : '🔎 ') + r.v); } catch (e) {}
    setTimeout(() => { const l = document.getElementById('lista'); if (l) l.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 200);
  }
  function cerrarQR() { cancelAnimationFrame(qrLoop); if (qrStream) qrStream.getTracks().forEach(t => t.stop()); qrStream = null; const m = document.getElementById('qrModal'); if (m) m.hidden = true; }
  async function abrirQR() {
    let m = document.getElementById('qrModal');
    if (!m) { m = document.createElement('div'); m.id = 'qrModal'; m.innerHTML = '<div class="qrBox"><div class="qrHead"><b>📷 Escanear QR</b><button type="button" id="qrCerrar">✕</button></div><div class="qrVid"><video id="qrVideo" playsinline muted></video><div class="qrMarco"><i></i></div></div><p id="qrMsg">Apunta la cámara al QR del estante o de la refacción.</p><div class="qrMan"><input id="qrTxt" placeholder="…o escribe la ubicación o el código (ej. A1-N3-P02)"><button type="button" class="primary" id="qrIr">Buscar</button></div></div>'; document.body.appendChild(m);
      m.addEventListener('click', e => { if (e.target === m || e.target.id === 'qrCerrar') cerrarQR(); if (e.target.id === 'qrIr') { const v = document.getElementById('qrTxt').value.trim(); if (v) { cerrarQR(); aplicarQR(textoQR(v.includes('ub=') ? v : '#ub=' + v)); } } }); }
    m.hidden = false; const msg = document.getElementById('qrMsg'), v = document.getElementById('qrVideo');
    try {
      qrStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      v.srcObject = qrStream; await v.play();
    } catch (e) { msg.textContent = '⚠️ No se pudo abrir la cámara (' + (e.name || e.message) + '). Da permiso de cámara al navegador, o escribe la ubicación abajo.'; return; }
    if ('BarcodeDetector' in window) { try { qrDet = new BarcodeDetector({ formats: ['qr_code'] }); } catch (e) { qrDet = null; } }
    if (!qrDet) { try { await cargarJsQR(); } catch (e) { msg.textContent = '⚠️ Sin internet para el lector. Escribe la ubicación abajo.'; return; } }
    const cv = document.createElement('canvas'), cx = cv.getContext('2d', { willReadFrequently: true });
    const paso = async () => {
      if (!qrStream) return;
      if (v.readyState >= 2) {
        let txt = '';
        try {
          if (qrDet) { const r = await qrDet.detect(v); if (r && r[0]) txt = r[0].rawValue; }
          else { cv.width = v.videoWidth; cv.height = v.videoHeight; cx.drawImage(v, 0, 0); const img = cx.getImageData(0, 0, cv.width, cv.height), r = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' }); if (r) txt = r.data; }
        } catch (e) {}
        if (txt) { if (navigator.vibrate) navigator.vibrate(80); cerrarQR(); aplicarQR(textoQR(txt)); return; }
      }
      qrLoop = requestAnimationFrame(paso);
    };
    qrLoop = requestAnimationFrame(paso);
  }
  function botonQR() {
    const acc = document.querySelector('header.hero .hero-actions'); if (!acc || document.getElementById('btnQR')) return;
    const b = document.createElement('button'); b.type = 'button'; b.id = 'btnQR'; b.className = 'qrBtn'; b.innerHTML = '📷 Escanear QR'; b.addEventListener('click', abrirQR); acc.insertBefore(b, acc.firstChild);
  }
  function qrDeLiga() { const r = textoQR(location.hash); if (r.tipo !== 'txt') { const espera = () => { if (typeof S !== 'undefined' && S.items && Object.keys(S.items).length) aplicarQR(r); else setTimeout(espera, 700); }; espera(); } }
  window.addEventListener('hashchange', qrDeLiga);
  // ---------- lista de Existencias: ordenar tocando la columna (ascendente / descendente)
  const COLS = [null, 'c', 'n', 'ub', 'ex', 'est'];
  function envolverLista() {
    if (typeof filtrados === 'function' && !filtrados._tema) {
      const base = filtrados; window.filtrados = function () { let r = base.apply(this, arguments); if (S.ordCol === 'est') { const rk = { neg: 0, agot: 1, bajo: 2, ok: 3, sin: 4 }; r = r.slice().sort((a, b) => (rk[estado(a)] ?? 5) - (rk[estado(b)] ?? 5)); } if (S.ordDesc) r = r.slice().reverse(); return r; }; window.filtrados._tema = true;
    }
    if (typeof renderLista === 'function' && !renderLista._tema) {
      const base = renderLista; window.renderLista = function () { const r = base.apply(this, arguments); try { flechas(); } catch (e) {} return r; }; window.renderLista._tema = true;
    }
  }
  function colActual() { const o = (document.getElementById('fOrd') || {}).value || 'ub'; return S.ordCol === 'est' ? 'est' : (o === 'exA' || o === 'exD') ? 'ex' : o; }
  function flechas() {
    const h = document.querySelector('#lista .row.head'); if (!h) return; const act = colActual(), desc = !!S.ordDesc ^ ((document.getElementById('fOrd') || {}).value === 'exD');
    [...h.children].forEach((s, i) => { const k = COLS[i]; if (!k) return; s.classList.add('ordCol'); s.dataset.ord = k; s.dataset.flecha = k === act ? (desc ? ' ▼' : ' ▲') : ' ⇅'; s.classList.toggle('on', k === act); });
  }
  document.addEventListener('click', e => {
    const s = e.target.closest('#lista .row.head [data-ord]'); if (!s) return; const k = s.dataset.ord, act = colActual(), sel = document.getElementById('fOrd'); if (!sel) return;
    if (k === act) S.ordDesc = !S.ordDesc; else S.ordDesc = false;
    S.ordCol = k === 'est' ? 'est' : '';
    sel.value = k === 'ex' ? 'exA' : k === 'est' ? 'ub' : k;
    sel.dispatchEvent(new Event('input', { bubbles: true }));
  });
  // ---------- portada de la pantalla de entrada: almacén ilustrado
  function escenaLogin() {
    let s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#16395F"/><stop offset=".65" stop-color="#0B1F35"/><stop offset="1" stop-color="#071629"/></linearGradient>' +
      '<radialGradient id="l" cx=".7" cy=".2" r=".7"><stop offset="0" stop-color="#3FC1C9" stop-opacity=".25"/><stop offset="1" stop-color="#3FC1C9" stop-opacity="0"/></radialGradient></defs><rect width="1600" height="900" fill="url(#c)"/><rect width="1600" height="900" fill="url(#l)"/>';
    s += '<g stroke="#2A4466" stroke-width="4" fill="none" opacity=".7">'; for (let x = 0; x <= 1600; x += 200) s += '<path d="M' + x + ' 40L' + (x + 100) + ' 120L' + (x + 200) + ' 40M' + x + ' 40H' + (x + 200) + 'M' + (x + 100) + ' 120V40"/>'; s += '<path d="M0 120H1600"/></g>';
    for (let x = 160; x < 1600; x += 320) s += '<path d="M' + (x - 26) + ' 160H' + (x + 26) + 'L' + (x + 16) + ' 146H' + (x - 16) + 'Z" fill="#2A4466"/><path d="M' + (x - 26) + ' 160L' + (x - 120) + ' 560H' + (x + 120) + 'L' + (x + 26) + ' 160Z" fill="#F5D88A" opacity=".06"/>';
    const col = ['#F5A623', '#2F86E8', '#1E8E5A', '#C9D8E8', '#E08E0B', '#3D9BFF'];
    const rack = (x, y, w, h, k) => { let r = '<g opacity="' + k + '"><rect x="' + x + '" y="' + y + '" width="10" height="' + h + '" fill="#9FB9D6"/><rect x="' + (x + w - 10) + '" y="' + y + '" width="10" height="' + h + '" fill="#9FB9D6"/>'; const n = 4, hh = h / n;
      for (let i = 0; i < n; i++) { const yy = y + i * hh; r += '<rect x="' + x + '" y="' + (yy + hh - 8) + '" width="' + w + '" height="8" fill="#C9D8E8"/>'; let cx = x + 16; let j = 0; while (cx < x + w - 50) { const bw = 34 + ((i * 7 + j * 13) % 4) * 12, bh = hh * (.45 + ((i + j) % 3) * .12); r += '<rect x="' + cx + '" y="' + (yy + hh - 8 - bh) + '" width="' + bw + '" height="' + bh + '" rx="4" fill="' + col[(i * 3 + j) % col.length] + '"/><rect x="' + (cx + bw / 2 - 5) + '" y="' + (yy + hh - 8 - bh) + '" width="10" height="9" fill="#fff" opacity=".4"/>'; cx += bw + 10; j++; } }
      return r + '</g>'; };
    s += rack(60, 300, 380, 420, .55) + rack(1160, 300, 380, 420, .55) + rack(470, 380, 300, 330, .35) + rack(830, 380, 300, 330, .35);
    s += '<g stroke="#1E3350" stroke-width="2" opacity=".7"><path d="M0 720H1600M0 800H1600"/>'; for (let x = -800; x <= 2400; x += 160) s += '<path d="M800 720L' + x + ' 900"/>'; s += '</g>';
    s += '<g transform="translate(1260 650)" opacity=".85"><rect x="-80" y="-40" width="130" height="70" rx="12" fill="#F5A623"/><rect x="-70" y="-110" width="70" height="72" rx="8" fill="none" stroke="#F5A623" stroke-width="8"/><path d="M60 -150V40H120" stroke="#C9D8E8" stroke-width="10" fill="none"/><rect x="66" y="-60" width="60" height="44" rx="4" fill="#2F86E8"/><circle cx="-50" cy="40" r="22" fill="#0B1F35" stroke="#9FB9D6" stroke-width="6"/><circle cx="20" cy="40" r="22" fill="#0B1F35" stroke="#9FB9D6" stroke-width="6"/></g>';
    return 'url("data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s + '</svg>') + '")';
  }
  function portada() { const l = document.getElementById('login'); if (!l) return; l.dataset.portada = '1'; l.style.setProperty('background-image', 'linear-gradient(180deg,rgba(7,22,41,.15),rgba(7,22,41,.45)),' + escenaLogin(), 'important'); l.style.setProperty('background-size', 'cover', 'important'); l.style.setProperty('background-position', 'center', 'important'); }
  function iniciar() {
    montar(); pintar(); obsLista(); envolver('renderValor', donaValor); envolver('renderGasto', donaGasto); obsMaq(); decorar(); botonQR(); qrDeLiga(); envolverLista(); portada(); setTimeout(portada, 1500); if (typeof applyCfg === 'function' && !applyCfg._tema) { const bc = applyCfg; window.applyCfg = function () { const r = bc.apply(this, arguments); try { portada(); } catch (x) {} return r; }; window.applyCfg._tema = true; }
    if (typeof renderAll === 'function' && !renderAll._tema) { const base = renderAll; renderAll = function () { const r = base.apply(this, arguments); try { montar(); pintar(); } catch (e) {} return r; }; renderAll._tema = true; }
    setInterval(() => { try { pintar(); } catch (e) {} }, 15000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
