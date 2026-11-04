/* PRUEBA MASTER · presentación animada estilo "Base de Datos LI".
 * Solo decora lo que ya pinta Control de Paros (portada, ilustraciones de cada máquina, contadores animados);
 * envuelve renderTablero / renderOp sin cambiar su lógica. Las ilustraciones salen de iconos.js (las mismas de Base de Datos). */
(function () {
  'use strict';
  if (typeof renderTablero !== 'function' || !window.ICON_R) return;

  const COL = { MTA:'#1F4FBF', MTB:'#E07B1A', MTC:'#7B4BC4', EA:'#0E9F96', AA:'#1597D3', EBT:'#D2453C', EMT:'#8E2A2A', EM:'#8A5A2B', IL:'#D9A400', AG:'#2E9E5B' };
  const svgIc = (k, cls) => '<svg class="' + cls + '" viewBox="0 0 120 100" aria-hidden="true">' + (ICON_R[k] || ICON_R.mta) + '</svg>';
  // ilustración según el nombre de la máquina y, si no, según su categoría
  function icDe(k) {
    const m = S.maq[k] || {}, n = (m.n || k).toLowerCase(), c = (m.cat || '').toUpperCase();
    if (/compresor|extractor|secador|vaporizador/.test(n)) return 'ea';
    if (/prensa|troquel|dobladora|cizalla/.test(n)) return 'mtb';
    if (/taladro|pulidora|sierra|soldar|esmeril|caladora/.test(n)) return 'mtc';
    if (/montacargas|patin/.test(n)) return 'em';
    return ({ MTA:'mta', MTB:'mtb', MTC:'mtc', EA:'ea', AA:'aa', EBT:'ebt', EMT:'emt', EM:'em', IL:'il', AG:'ag' })[c] || 'mta';
  }
  const colorDe = k => COL[((S.maq[k] || {}).cat || '').toUpperCase()] || COL.MTA;
  const keyPorNombre = () => { const o = {}; Object.keys(S.maq).forEach(k => { o[maqName(k)] = k; }); return o; };

  // ---------- contador animado (sube del valor anterior al nuevo)
  function cuenta(el) {
    if (!el) return; const fin = Number(el.textContent); if (!isFinite(fin)) return;
    const ini = Number(el.dataset.mAnt || 0); el.dataset.mAnt = fin; if (ini === fin) return;
    const t0 = performance.now(), d = 700;
    const paso = t => { const p = Math.min(1, (t - t0) / d), v = Math.round(ini + (fin - ini) * (1 - Math.pow(1 - p, 3))); el.textContent = v; if (p < 1) requestAnimationFrame(paso); };
    requestAnimationFrame(paso);
  }

  // ---------- portada del tablero
  function hero() {
    let h = document.getElementById('mHero');
    if (!h) {
      const sec = document.getElementById('v-tab'); if (!sec) return;
      h = document.createElement('section'); h.id = 'mHero'; h.className = 'mHero';
      h.innerHTML = '<div class="hc"><span class="eti" id="mEti"><i></i><span></span></span><h2 id="mTit"></h2><p class="sub" id="mSub"></p><div class="barra" id="mBarra"></div><div class="ley" id="mLey"></div></div>' +
        '<div class="maqs" aria-hidden="true">' + ['mta', 'mtb', 'ea', 'mtc', 'mta', 'ea'].map(k => '<div>' + svgIc(k, '') + '</div>').join('') + '</div>';
      sec.insertBefore(h, sec.firstChild);
    }
    const ok = +document.getElementById('kOk').textContent || 0, fa = +document.getElementById('kFalla').textContent || 0, sp = +document.getElementById('kSin').textContent || 0, tot = ok + fa + sp;
    const eti = document.getElementById('mEti');
    eti.className = 'eti' + (fa ? ' mal' : '');
    eti.lastChild.textContent = fa ? fa + (fa === 1 ? ' máquina en falla' : ' máquinas en falla') : 'Planta en vivo · sin fallas';
    const disp = tot ? Math.round(ok / tot * 100) : 0;
    document.getElementById('mTit').innerHTML = fa ? '¡Atención! <span>' + fa + ' en falla</span> ahora' : 'Planta <span>' + disp + ' %</span> en función';
    document.getElementById('mSub').textContent = tot + ' máquinas vigiladas · paros hoy: ' + (document.getElementById('kParos').textContent || 0) + ' · tiempo de paro hoy: ' + (document.getElementById('kHoras').textContent || '0');
    const pc = x => tot ? (x / tot * 100) + '%' : '0';
    document.getElementById('mBarra').innerHTML = '<i style="width:' + pc(ok) + ';background:var(--ok)"></i><i style="width:' + pc(sp) + ';background:var(--warn)"></i><i style="width:' + pc(fa) + ';background:var(--bad)"></i>';
    document.getElementById('mLey').innerHTML = '<span>🟢 <b>' + ok + '</b> en función</span><span>🟡 <b>' + sp + '</b> sin producción</span><span>🔴 <b>' + fa + '</b> en falla</span>';
  }

  // ---------- ilustración en cada tarjeta de máquina
  let primera = true;
  function decorarTiles() {
    const T = document.getElementById('tiles'); if (!T) return;
    const porN = keyPorNombre();
    [...T.querySelectorAll('.tile')].forEach((t, i) => {
      const k = t.dataset.goop || porN[(t.querySelector('.tn') || {}).textContent];
      if (!k || t.querySelector('.mIc')) return;
      t.style.setProperty('--c', colorDe(k)); t.style.setProperty('--i', i);
      t.insertAdjacentHTML('afterbegin', svgIc(icDe(k), 'mIc') + '<span class="mCat">' + ((S.maq[k] || {}).cat || '') + '</span>');
    });
    if (primera && T.querySelector('.tile')) { primera = false; T.classList.add('mEntra'); setTimeout(() => T.classList.remove('mEntra'), 2500); }
  }

  const _rt = renderTablero;
  renderTablero = function () {
    _rt.apply(this, arguments);
    try {
      decorarTiles(); hero();
      ['kOk', 'kFalla', 'kSin', 'kParos'].forEach(id => cuenta(document.getElementById(id)));
      const kf = document.getElementById('kFalla'); if (kf) kf.parentNode.classList.toggle('hay', +kf.dataset.mAnt > 0);
    } catch (e) { console.warn('tema-master', e); }
  };

  // ---------- pantalla de máquina: ilustración grande
  if (typeof renderOp === 'function') {
    const _ro = renderOp;
    renderOp = function () {
      _ro.apply(this, arguments);
      try { const c = document.querySelector('#opCard .opcard'); if (c && S.opMaq && !c.querySelector('.mIcG')) c.insertAdjacentHTML('afterbegin', svgIc(icDe(S.opMaq), 'mIcG')); } catch (e) {}
    };
  }

  // ---------- inicio sin sesión: tres máquinas flotando
  const home = document.querySelector('#v-home .box');
  if (home) home.insertAdjacentHTML('afterbegin', '<div class="mIcs" aria-hidden="true">' + svgIc('mta', '') + svgIc('mtb', '') + svgIc('ea', '') + '</div>');

  // ---------- menú principal: ícono grande arriba y nombre corto y claro
  const MENU = { tab:['🛠', 'Mantenimiento'], graf:['📊', 'Gráficas'], op:['🏭', 'Producción'], ag:['🏢', 'Áreas generales'], kb:['📚', 'Soluciones'], rep:['📄', 'Reportes'], cfg:['⚙️', 'Configuración'] };
  document.querySelectorAll('nav.nav button').forEach(b => {
    const m = MENU[b.dataset.v]; if (!m) return;
    b.title = b.textContent.trim(); b.style.borderColor = '';
    b.innerHTML = '<span class="mNi" aria-hidden="true">' + m[0] + '</span><span>' + m[1] + '</span>';
  });
  // pestañas de Configuración con ícono
  const ICT = { per:'👥', maq:'🏭', pan:'🖥️', apa:'🎨' };
  document.querySelectorAll('#v-cfg .ctabs [data-ct]').forEach(b => { if (ICT[b.dataset.ct]) b.textContent = ICT[b.dataset.ct] + ' ' + b.textContent.trim(); });

  // ---------- cintillo ilustrado en cada pantalla: para qué sirve y cómo se usa, en palabras sencillas
  const GUIAS = {
    op:   { ic:'mta', t:'Pantalla de la máquina', p:'Aquí el operador avisa lo que le pasa a su máquina. Todo queda registrado con la nómina de quien lo hace.', s:['Elige tu máquina', 'Mira su estado', 'Toca el botón de lo que está pasando'] },
    graf: { emo:'📊', t:'Gráficas de paros', p:'Cuánto tiempo estuvieron paradas las máquinas y qué tan rápido llegó mantenimiento.', s:['Elige día, semana o semestre', 'Elige una máquina o todas', 'Barra más alta = más tiempo parada'] },
    kb:   { emo:'📚', t:'Fallas y soluciones', p:'La biblioteca de reparaciones: cada falla que se arregla queda aquí con su solución.', s:['Escribe qué le pasa a la máquina', 'Filtra por máquina o tipo', 'Mira cómo se arregló antes'] },
    rep:  { emo:'📄', t:'Reportes', p:'El resumen de paros de un periodo, listo para descargar en Excel o PDF.', s:['Elige las fechas', 'Revisa las gráficas y el detalle', 'Descarga Excel o Resumen PDF'] },
    ag:   { ic:'ag', t:'Áreas generales', p:'Para pedir arreglos que NO son de máquina: oficinas, baños, luz, aire acondicionado, puertas…', s:['Di qué falla y dónde', 'Mantenimiento lo atiende', 'Tú confirmas que quedó bien'] },
    cfg:  { emo:'⚙️', t:'Configuración', p:'Solo administradores: personal y permisos, máquinas, pantallas de cada equipo y colores de la app.', s:['Entra con tu nómina de administrador', 'Elige la pestaña', 'Guarda los cambios'] }
  };
  const guiaVista = () => { try { return JSON.parse(localStorage.getItem('m_guias_min') || '{}'); } catch (e) { return {}; } };
  Object.keys(GUIAS).forEach(v => {
    const sec = document.getElementById('v-' + v), g = GUIAS[v]; if (!sec) return;
    const d = document.createElement('div'); d.className = 'mGuiaV' + (guiaVista()[v] ? ' mini' : ''); d.dataset.mg = v;
    d.innerHTML = '<div class="ilu" aria-hidden="true">' + (g.ic ? svgIc(g.ic, '') : '<span class="emo">' + g.emo + '</span>') + '</div>' +
      '<div><h2>' + g.t + '</h2><p>' + g.p + '</p><ol>' + g.s.map((x, i) => '<li><b>' + (i + 1) + '</b>' + x + '</li>').join('') + '</ol></div>' +
      '<button type="button" class="x" title="Hacer chico / grande">' + (guiaVista()[v] ? '＋' : '－') + '</button>';
    d.querySelector('.x').onclick = () => {
      const o = guiaVista(), mini = !d.classList.contains('mini'); o[v] = mini; d.classList.toggle('mini', mini);
      d.querySelector('.x').textContent = mini ? '＋' : '－'; try { localStorage.setItem('m_guias_min', JSON.stringify(o)); } catch (e) {}
    };
    sec.insertBefore(d, sec.firstChild);
  });

  // ---------- tablero de producción: tira de máquinas arriba, estado a la izquierda y botones a la derecha
  const opSec = document.getElementById('v-op'), opCard = document.getElementById('opCard'), opBtns = document.getElementById('opBtns');
  if (opSec && opCard && opBtns) {
    const chips = document.createElement('div'); chips.className = 'mChips'; chips.id = 'mOpChips';
    const grid = document.createElement('div'); grid.id = 'mOpGrid';
    const izq = document.createElement('div'), der = document.createElement('div');
    izq.style.cssText = der.style.cssText = 'display:flex;flex-direction:column;gap:10px;min-width:0';
    izq.innerHTML = '<p class="mPaso">Estado de la máquina</p>'; der.innerHTML = '<p class="mPaso">¿Qué está pasando? Toca un botón</p>';
    opCard.parentNode.insertBefore(chips, opCard); chips.after(grid);
    izq.appendChild(opCard); der.appendChild(opBtns); grid.append(izq, der);
    chips.addEventListener('click', e => {
      const c = e.target.closest('[data-mchip]'); if (!c) return;
      const s = document.getElementById('opMaq'); s.value = c.dataset.mchip; s.dispatchEvent(new Event('change'));
    });
  }
  // qué hacer ahora, según el estado (texto grande y claro dentro de la tarjeta)
  function guiaOp(st, ev) {
    if (st === 'falla' && ev) return ev.estado === 'espera' ? ['📣', 'Mantenimiento ya fue avisado. Cuando llegue el técnico, toca <b>🧰 TÉCNICO EN SITIO</b>.']
      : ev.estado === 'reparando' ? ['🔧', 'El técnico está reparando. Al terminar toca <b>✅ MÁQUINA REPARADA</b>.']
      : ev.estado === 'reparada' ? ['👀', 'Revisa que quedó bien y toca <b>🟢 LIBERAR MÁQUINA</b>. Si sigue fallando, <b>🔁 LA FALLA CONTINÚA</b>.'] : null;
    if (st === 'falla') return ['📣', 'La máquina está en falla y mantenimiento ya fue avisado. Espera al técnico.'];
    if (st === 'sinprod') return ['⏸', 'Cuando la máquina vuelva a trabajar toca <b>🟢 EN FUNCIÓN</b>.'];
    return ['👍', 'Todo bien. Si la máquina falla toca <b>🔴 MÁQUINA EN FALLA</b> y mantenimiento recibe la alarma.'];
  }
  function pintaChips() {
    const C = document.getElementById('mOpChips'); if (!C) return;
    const sel = document.getElementById('opMaq'), ks = lista();
    if (sel.disabled || ks.length < 2) { C.hidden = true; return; }
    C.hidden = false;
    C.innerHTML = ks.map(k => { const st = (S.est[k] || {}).st || 'ok'; return '<button type="button" class="mChip m-' + st + (k === S.opMaq ? ' on' : '') + '" data-mchip="' + esc(k) + '" style="--c:' + colorDe(k) + '">' + svgIc(icDe(k), '') + '<span>' + esc(maqName(k)) + '</span><i></i></button>'; }).join('');
    const on = C.querySelector('.on'); if (on && on.scrollIntoView && !C.dataset.mVisto) { C.dataset.mVisto = 1; on.scrollIntoView({ block:'nearest', inline:'center' }); }
  }
  if (typeof renderOp === 'function') {
    const _ro2 = renderOp;
    renderOp = function () {
      _ro2.apply(this, arguments);
      try {
        const c = document.querySelector('#opCard .opcard'), k = S.opMaq; if (!c || !k) return;
        const { e, ev } = estadoDe(k), g = guiaOp(e.st || 'ok', ev);
        if (g && !c.querySelector('.mGuia')) c.insertAdjacentHTML('beforeend', '<div class="mGuia"><span>' + g[0] + '</span><span>' + g[1] + '</span></div>');
        pintaChips();
      } catch (er) { console.warn('tema-master', er); }
    };
  }


  // ---------- paleta profesional (azul marino como Base de Datos). Si Apariencia trae los colores de fábrica
  // de la versión anterior (verdes), se usan los nuevos; si alguien escogió otros colores en ⚙ Apariencia, se respetan.
  if (typeof applyApa === 'function') {
    const VIEJA = { bg:'#c9cdcb', acc:'#2e7d32', hero:'#1e4a2a', ok:'#2e7d32', bad:'#c62828', warn:'#c99700' };
    const NUEVA = { bg:'#EEF2F6', acc:'#1F6FD1', hero:'#0E2A47', ok:'#1E8E5A', bad:'#D32F2F', warn:'#E09B00' };
    const _aa = applyApa;
    applyApa = function (c) {
      const x = Object.assign({}, c);
      Object.keys(VIEJA).forEach(k => { if (String(x[k] || '').toLowerCase() === VIEJA[k]) x[k] = NUEVA[k]; });
      return _aa.call(this, x);
    };
    try { applyApa(S.apaDraft || S.apa); } catch (e) {}
  }
  if (typeof render === 'function') try { render(); } catch (e) {}
})();
