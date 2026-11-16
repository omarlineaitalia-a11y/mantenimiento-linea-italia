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
    if (!document.getElementById('aHero')) { const d = document.createElement('section'); d.id = 'aHero'; d.className = 'aHero'; d.innerHTML = '<div class="hc"><span class="eti" id="aEti"><i></i><span>Almacén en vivo</span></span><h2 id="aTit">Cargando el almacén…</h2><p class="sub" id="aSub">Conectando con la base de datos</p><div class="barra" id="aBar"></div><div class="ley" id="aLey"></div></div><div class="ilus">' + ilus + '</div>'; hero.insertAdjacentElement('afterend', d); }
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
    l.innerHTML = seg.map(([col, n, tx]) => '<span><i style="background:' + col + '"></i><b>' + n.toLocaleString('es-MX') + '</b> ' + tx + '</span>').join('');
  }
  // "sin foto" → dibujo según el tipo de refacción
  const TIPOS = [[/balero|rodamiento|chumacera|carrito|rodillo/i, '⚙️', '#1F6FD1'], [/sello|ret[eé]n|o-?ring|empaque|junta/i, '⭕', '#7A3FC2'], [/banda|cadena|polea|engrane|catarina/i, '🔗', '#C77C0E'],
    [/filtro/i, '🧽', '#1E8E5A'], [/tornillo|tuerca|rondana|perno|birlo|esp[aá]rrago|remache/i, '🔩', '#5A6676'], [/cable|contactor|relevador|rel[eé]|fusible|breaker|interruptor|sensor|l[aá]mpara|foco|led|motor|variador|bobina|clavija|apagador|termomagn/i, '⚡', '#E0A100'],
    [/manguera|conexi[oó]n|v[aá]lvula|neum[aá]tic|cilindro|piston|pist[oó]n|codo|cople|niple|tubo|abrazadera/i, '🔧', '#2F86E8'], [/aceite|grasa|lubric|refrigerante|anticongelante/i, '🛢️', '#8E5A1F'],
    [/cuchilla|broca|fresa|sierra|disco|lija|navaja|buril/i, '🪚', '#C62828'], [/pintura|thinner|silic[oó]n|pegamento|cinta/i, '🎨', '#D35AA0']];
  function iconosLista() {
    document.querySelectorAll('#lista span.thumb').forEach(sp => { if (sp.dataset.ic) return; const row = sp.closest('.row'); const tx = row ? row.textContent : ''; const t = TIPOS.find(([rx]) => rx.test(tx)) || [null, '📦', '#0E2A47'];
      sp.dataset.ic = '1'; sp.textContent = t[1]; sp.title = 'Sin foto todavía'; sp.style.cssText = 'display:grid;place-items:center;font-size:22px;background:linear-gradient(145deg,' + t[2] + '22,' + t[2] + '44);border:1px solid ' + t[2] + '55;color:inherit'; });
  }
  const obsLista = () => { const l = document.getElementById('lista'); if (l && !l._obsIc) { l._obsIc = true; new MutationObserver(iconosLista).observe(l, { childList: true }); iconosLista(); } };  function iniciar() {
    montar(); pintar(); obsLista();
    if (typeof renderAll === 'function' && !renderAll._tema) { const base = renderAll; renderAll = function () { const r = base.apply(this, arguments); try { montar(); pintar(); } catch (e) {} return r; }; renderAll._tema = true; }
    setInterval(() => { try { pintar(); } catch (e) {} }, 15000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
