/* PRUEBA MASTER · presentación animada estilo "Base de Datos LI".
 * Solo decora lo que ya pinta Control de Paros (portada, ilustraciones de cada máquina, contadores animados);
 * envuelve renderTablero / renderOp sin cambiar su lógica. Las ilustraciones salen de iconos.js (las mismas de Base de Datos). */
(function () {
  'use strict';
  if (typeof renderTablero !== 'function' || !window.ICON_R) return;

  const COL = { MTA:'#1F4FBF', MTB:'#E07B1A', MTC:'#7B4BC4', EA:'#0E9F96', AA:'#1597D3', EBT:'#D2453C', EMT:'#8E2A2A', EM:'#8A5A2B', IL:'#D9A400', AG:'#2E9E5B' };
  const svgIc = (k, cls) => '<svg class="' + cls + '" viewBox="0 0 120 100" aria-hidden="true">' + (ICON_R[k] || ICON_R.mta) + '</svg>';
  // ilustración según el nombre de la máquina y, si no, según su categoría
  // dibujo según el NOMBRE de la máquina (iconos-maquinas.js) y, si no coincide, según su categoría
  function icDe(k) {
    const m = S.maq[k] || {}, n = (m.n || k).toLowerCase(), c = (m.cat || '').toUpperCase();
    if (/compresor|extractor|secador|vaporizador/.test(n)) return 'ea';
    if (/l[aá]ser|gweike|g-weike|bimex/.test(n)) return 'laser';
    if (/dobladora|plegadora/.test(n)) return 'dobladora';
    if (/soldar|soldadora/.test(n)) return 'soldadora';
    if (/enchapadora|canteadora|homag|stefani/.test(n)) return 'enchapadora';
    if (/horno|t[uú]nel/.test(n)) return 'horno';
    if (/prensa|troquel|cizalla/.test(n)) return 'mtb';
    // taladro de banco / pedestal (tipo B) = industrial de columna; los de mano (tipo C) = inalámbrico
    if (/taladro/.test(n)) return (c === 'MTB' || /banco|pedestal|columna/.test(n)) ? 'taladroBanco' : 'mtc';
    if (/pulidora|sierra|esmeril|caladora/.test(n)) return 'mtc';
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
      // 📐 requerimientos de máquinas (pedidos desde producción) debajo del tablero
      if (typeof agReqMaqHTML === 'function' && S.agReq) {
        let rq = document.getElementById('mReqMaqBox');
        if (!rq) { rq = document.createElement('div'); rq.id = 'mReqMaqBox'; const b = document.querySelector('#v-tab .board'); if (b) b.after(rq); }
        rq.innerHTML = agReqMaqHTML();
      }
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
    // 📐 requerimiento para la máquina elegida (va al tablero de mantenimiento de máquinas)
    const bReq = document.createElement('button'); bReq.type = 'button'; bReq.className = 'mReqBtn';
    bReq.innerHTML = '<span class="mBi">📐</span><span class="mBt"><b>PEDIR UN REQUERIMIENTO</b><small>mejora o trabajo en esta máquina que necesita material</small></span><span class="mBa">›</span>';
    der.appendChild(bReq);
    const cajaReq = document.createElement('div'); cajaReq.id = 'mOpReq'; cajaReq.hidden = true; grid.after(cajaReq);
    bReq.addEventListener('click', () => {
      if (!cajaReq.hidden && cajaReq.dataset.maq === S.opMaq) { cajaReq.hidden = true; return; }
      if (typeof agFormReq !== 'function' || !S.opMaq) return;
      cajaReq.hidden = false; cajaReq.dataset.maq = S.opMaq;
      agFormReq(cajaReq, { maq:S.opMaq, onOk:() => { cajaReq.hidden = true; cajaReq.innerHTML = ''; } });
      cajaReq.scrollIntoView({ behavior:'smooth', block:'start' });
    });
    chips.addEventListener('click', e => {
      if (e.target.closest('#mSelBtn')) { abrirLista(!chips.classList.contains('abierta')); return; }
      const c = e.target.closest('[data-mchip]'); if (!c) return;
      const s = document.getElementById('opMaq'); s.value = c.dataset.mchip; s.dispatchEvent(new Event('change'));
      abrirLista(false);
    });
    // la casilla "Selecciona tu máquina" sustituye al menú desplegable original
    const cajaSel = document.getElementById('opMaq').closest('.box'); if (cajaSel) cajaSel.classList.add('mOculta');
  }
  function abrirLista(si) {
    const C = document.getElementById('mOpChips'); if (!C) return;
    C.classList.toggle('abierta', si);
    if (si) { const b = document.getElementById('mOpBus'); if (b) { b.value = ''; filtra(); setTimeout(() => b.focus(), 50); } }
  }
  document.addEventListener('click', e => { const C = document.getElementById('mOpChips'); if (C && C.classList.contains('abierta') && !C.contains(e.target)) abrirLista(false); });
  // qué hacer ahora, según el estado (texto grande y claro dentro de la tarjeta)
  function guiaOp(st, ev) {
    if (st === 'falla' && ev) return ev.estado === 'espera' ? ['📣', 'Mantenimiento ya fue avisado. Cuando llegue el técnico, toca <b>🧰 TÉCNICO EN SITIO</b>.']
      : ev.estado === 'reparando' ? ['🔧', 'El técnico está reparando. Al terminar toca <b>✅ MÁQUINA REPARADA</b>.']
      : ev.estado === 'reparada' ? ['👀', 'Revisa que quedó bien y toca <b>🟢 LIBERAR MÁQUINA</b>. Si sigue fallando, <b>🔁 LA FALLA CONTINÚA</b>.'] : null;
    if (st === 'falla') return ['📣', 'La máquina está en falla y mantenimiento ya fue avisado. Espera al técnico.'];
    if (st === 'sinprod') return ['⏸', 'Cuando la máquina vuelva a trabajar toca <b>🟢 EN FUNCIÓN</b>.'];
    return ['👍', 'Todo bien. Si la máquina falla toca <b>🔴 MÁQUINA EN FALLA</b> y mantenimiento recibe la alarma.'];
  }
  // casilla "Selecciona tu máquina": muestra la elegida; al tocarla se despliega la lista con buscador
  function pintaChips() {
    const C = document.getElementById('mOpChips'); if (!C) return;
    const sel = document.getElementById('opMaq'), ks = lista();
    if (sel.disabled || ks.length < 2) { C.hidden = true; return; }
    C.hidden = false;
    if (!C.querySelector('#mOpBus')) {
      C.innerHTML = '<button type="button" class="mSelBtn" id="mSelBtn"></button>' +
        '<div class="mSelPanel"><div class="mBusca"><span>🔎</span><input id="mOpBus" type="search" placeholder="Escribe el nombre o la clave (ej. selexx, prensa, MTA-01)" autocomplete="off"></div><div class="mChipL" id="mOpLista"></div></div>';
      C.querySelector('#mOpBus').addEventListener('input', filtra);
    }
    const k0 = S.opMaq, st0 = (S.est[k0] || {}).st || 'ok';
    document.getElementById('mSelBtn').innerHTML = (k0 ? svgIc(icDe(k0), '') : '') + '<span class="mSelT"><small>MÁQUINA · toca para cambiar</small><b>' + esc(k0 ? maqName(k0) : 'Selecciona tu máquina') + '</b></span>' +
      '<span class="mSelE m-' + st0 + '">' + ({ ok:'🟢 En función', sinprod:'🟡 Sin producción', falla:'🔴 En falla' }[st0] || '') + '</span><span class="mSelF">▾</span>';
    document.getElementById('mOpLista').innerHTML = ks.map(k => { const st = (S.est[k] || {}).st || 'ok', cod = S.maq[k].cod || k; return '<button type="button" class="mChip m-' + st + (k === S.opMaq ? ' on' : '') + '" data-mchip="' + esc(k) + '" data-q="' + esc(norm(maqName(k) + ' ' + cod)) + '" style="--c:' + colorDe(k) + '">' + svgIc(icDe(k), '') + '<span>' + esc(maqName(k)) + '<small>' + esc(cod) + '</small></span><i></i></button>'; }).join('') + '<p class="foot" id="mOpNada" hidden>No hay máquinas con ese nombre.</p>';
    filtra();
  }
  function filtra() {
    const b = document.getElementById('mOpBus'); if (!b) return;
    const q = norm(b.value.trim()); let n = 0;
    document.querySelectorAll('#mOpLista .mChip').forEach(c => { const v = !q || c.dataset.q.includes(q); c.hidden = !v; if (v) n++; });
    const nada = document.getElementById('mOpNada'); if (nada) nada.hidden = n > 0;
  }
  if (typeof renderOp === 'function') {
    const _ro2 = renderOp;
    renderOp = function () {
      _ro2.apply(this, arguments);
      try {
        const c = document.querySelector('#opCard .opcard'), k = S.opMaq; if (!c || !k) return;
        const { e, ev } = estadoDe(k), g = guiaOp(e.st || 'ok', ev);
        if (g && !c.querySelector('.mGuia')) c.insertAdjacentHTML('beforeend', '<div class="mGuia"><span>' + g[0] + '</span><span>' + g[1] + '</span></div>');
        pintaChips(); botonesModernos(document.getElementById('opBtns'));
      } catch (er) { console.warn('tema-master', er); }
    };
  }
  // ---------- botones modernos: el emoji pasa a una ficha de ícono, el texto a título + subtítulo y una flecha a la derecha
  function botonesModernos(cont) {
    if (!cont) return;
    cont.querySelectorAll('button').forEach(b => {
      if (b.classList.contains('mBtn')) return;
      const sm = b.querySelector('small'); if (sm) sm.remove();
      const t = b.textContent.trim(), m = t.match(/^(\p{Extended_Pictographic}️?)\s*(.*)$/u);
      b.classList.add('mBtn');
      if (b.dataset.tpm) b.classList.add('mTpm');
      if (b.dataset.a === 'prueba' || b.dataset.a === 'sitioPrueba') b.classList.add('mPru');
      b.innerHTML = '<span class="mBi">' + (m ? m[1] : '▶') + '</span><span class="mBt"><b></b></span><span class="mBa" aria-hidden="true">›</span>';
      b.querySelector('.mBt b').textContent = m ? m[2] : t;
      if (sm) b.querySelector('.mBt').appendChild(sm);
    });
  }


  // ---------- paleta fija: azul fuerte como Base de Datos (elegida por Ing. Omar)
  if (typeof applyApa === 'function') {
    const NUEVA = { bg:'#EEF2F6', acc:'#1F6FD1', hero:'#0E2A47', ok:'#1E8E5A', bad:'#D32F2F', warn:'#E0A100' };
    const _aa = applyApa;
    // Ing. Omar quiere el azul de Base de Datos SIEMPRE: los colores guardados en ⚙ Apariencia (copiados de la oficial)
    // ya no lo tapan; se respeta solo lo de "descarga" (nombre y carpeta del Excel).
    applyApa = function (c) { return _aa.call(this, Object.assign({}, c, NUEVA)); };
    try { applyApa(S.apaDraft || S.apa); } catch (e) {}
  }

  // ---------- producción: la máquina que elige el operador se queda en esa pantalla (también al recargar o tras inactividad),
  // salvo en tabletas fijas a una máquina (⚙ Pantallas), que siguen mandando.
  const MAQ_LS = 'm_op_maq';
  const fija = () => { const d = devScreen(); return !!(d && d.v === 'op' && d.maq); };
  const recordada = () => { try { const k = localStorage.getItem(MAQ_LS); return k && S.maq[k] ? k : ''; } catch (e) { return ''; } };
  const recordar = k => { try { if (k && !fija()) localStorage.setItem(MAQ_LS, k); } catch (e) {} };
  const selOp = document.getElementById('opMaq');
  if (selOp) selOp.addEventListener('change', () => recordar(selOp.value));
  if (typeof pantallaDestino === 'function') {
    const _pd = pantallaDestino;
    pantallaDestino = function () {
      const d = _pd.apply(this, arguments);
      const r = recordada(); if (d && d.v === 'op' && r && !fija()) d.maq = r;
      return d;
    };
  }
  const _ro3 = renderOp;
  renderOp = function () { if (!S.opMaq && !fija()) { const r = recordada(); if (r) S.opMaq = r; } return _ro3.apply(this, arguments); };
  // ---------- 📚 FALLAS Y SOLUCIONES: búsqueda sencilla, agrupada por máquina y con consejos para el técnico
  const TIPO_IC = { 'Mecánica':'⚙️', 'Eléctrica':'⚡', 'Neumática':'💨', 'Hidráulica':'💧', 'Electrónica / control':'🖥️', 'Seguridad':'🦺', 'Herramental / ajuste':'🔧', 'Otra':'❔' };
  // medidas de seguridad por tipo de falla (normas IMSS / NOM-004 y NOM-029-STPS: bloqueo y etiquetado, EPP)
  const SEGURIDAD = {
    'Eléctrica':'⚡ Bloquea y etiqueta (LOTO) el interruptor, <b>verifica ausencia de tensión</b> con multímetro y usa EPP dieléctrico (guantes clase 0, careta).',
    'Mecánica':'⚙️ LOTO antes de meter manos: espera a que <b>paren todas las partes en movimiento</b> y vuelve a poner las guardas al terminar.',
    'Neumática':'💨 Cierra la válvula, <b>purga el aire</b> de la línea antes de desconectar y usa lentes de seguridad.',
    'Hidráulica':'💧 <b>Libera la presión</b> y baja o calza cargas antes de aflojar mangueras; cuidado con el aceite caliente.',
    'Electrónica / control':'🖥️ Respalda parámetros antes de cambiar tarjetas, desenergiza y usa pulsera antiestática.',
    'Seguridad':'🦺 Nunca puentees guardas, sensores ni paros de emergencia: deja la máquina bloqueada hasta corregir.',
    'Herramental / ajuste':'🔧 Asegura y calza el herramental, usa guantes anticorte y prueba en vacío antes de liberar.',
    'Otra':'🦺 LOTO y EPP según el riesgo de la máquina antes de intervenir.'
  };
  const KB = { q:'', tipo:'', abierta:{} };
  const marca = (txt, ws) => { let h = esc(txt || ''); ws.forEach(w => { if (w.length > 1) h = h.replace(new RegExp('(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'), '<mark>$1</mark>'); }); return h; };
  const normF = t => norm(String(t || '')).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  function consejos(L) {
    const C = [], tipos = {}, fallas = {}, refs = {};
    L.forEach(e => { tipos[e.tipo || 'Otra'] = (tipos[e.tipo || 'Otra'] || 0) + 1; const f = normF(e.falla).split(' ').slice(0, 4).join(' '); if (f) (fallas[f] = fallas[f] || []).push(e); String(e.refac || '').split(/[,;\n]/).map(x => x.trim()).filter(Boolean).forEach(r => { refs[r] = (refs[r] || 0) + 1; }); });
    const tTop = Object.entries(tipos).sort((a, b) => b[1] - a[1])[0];
    if (tTop) C.push('Lo que más falla aquí es <b>' + esc(tTop[0]) + '</b> (' + tTop[1] + ' de ' + L.length + '). ' + (SEGURIDAD[tTop[0]] || SEGURIDAD.Otra));
    Object.values(fallas).filter(x => x.length > 1).sort((a, b) => b.length - a.length).slice(0, 2).forEach(x => C.push('🔁 <b>“' + esc(x[0].falla) + '”</b> ya se repitió <b>' + x.length + ' veces</b>: no solo repares; busca la causa raíz (5 porqués) y deja la solución bien escrita.'));
    const rTop = Object.entries(refs).sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => x[0]);
    if (rTop.length) C.push('🧰 Ten a la mano: <b>' + rTop.map(esc).join(', ') + '</b>.');
    const tr = L.map(e => tiempos(e).rep).filter(x => x > 0);
    if (tr.length) C.push('⏱ Reparación promedio: <b>' + dur(tr.reduce((s, x) => s + x, 0) / tr.length) + '</b>.');
    return C;
  }
  function kbUI() {
    const sec = document.getElementById('v-kb'); if (!sec || document.getElementById('mKb')) return;
    const caja = document.getElementById('kbQ').closest('.box'); if (caja) caja.classList.add('mOculta');
    ['kbCuenta', 'kbList'].forEach(id => document.getElementById(id).classList.add('mOculta'));
    const d = document.createElement('div'); d.id = 'mKb'; d.className = 'mKb';
    d.innerHTML = '<div class="mKbBus"><span>🔎</span><input id="mKbQ" type="search" placeholder="¿Qué le pasa a la máquina? ej. no succiona, banda, sensor, no prende" autocomplete="off"></div>' +
      '<div class="mKbTipos"><button type="button" class="mKbT on" data-kbt="">Todas</button>' + TIPOS.map(t => '<button type="button" class="mKbT" data-kbt="' + esc(t) + '">' + (TIPO_IC[t] || '') + ' ' + esc(t) + '</button>').join('') + '</div>' +
      '<p class="mKbCta" id="mKbCta"></p><div id="mKbRes" class="mKbRes"></div>';
    document.getElementById('kbList').before(d);
    d.querySelector('#mKbQ').addEventListener('input', ev => { KB.q = ev.target.value; renderKb(); });
    d.addEventListener('click', ev => {
      const t = ev.target.closest('[data-kbt]'); if (t) { KB.tipo = t.dataset.kbt; d.querySelectorAll('[data-kbt]').forEach(b => b.classList.toggle('on', b === t)); renderKb(); return; }
      const h = ev.target.closest('[data-kbm]'); if (h) { const k = h.dataset.kbm; KB.abierta[k] = !h.parentNode.classList.contains('abierta'); h.parentNode.classList.toggle('abierta', KB.abierta[k]); }
    });
  }
  renderKb = function () {
    kbUI();
    const ws = normF(KB.q).split(' ').filter(Boolean);
    const L = S.evs.filter(e => e.solucion && (!KB.tipo || e.tipo === KB.tipo) && ws.every(w => normF(e.maqN + ' ' + e.falla + ' ' + e.causa + ' ' + e.solucion + ' ' + (e.refac || '') + ' ' + (e.tec?.n || '')).includes(w)));
    const G = {}; L.forEach(e => { (G[e.maq || e.maqN] = G[e.maq || e.maqN] || []).push(e); });
    const gs = Object.entries(G).sort((a, b) => b[1].length - a[1].length);
    document.getElementById('mKbCta').innerHTML = L.length ? '<b>' + L.length + '</b> soluciones en <b>' + gs.length + '</b> máquina' + (gs.length > 1 ? 's' : '') + (ws.length || KB.tipo ? ' · toca una máquina para ver sus soluciones' : '') : '';
    const busca = ws.length > 0 || !!KB.tipo;
    document.getElementById('mKbRes').innerHTML = gs.length ? gs.map(([k, E]) => {
      const nom = E[0].maqN || maqName(k), ic = S.maq[k] ? icDe(k) : 'mta', ab = KB.abierta[k] != null ? KB.abierta[k] : (busca || gs.length === 1);
      const rep = {}; E.forEach(e => { const f = normF(e.falla); rep[f] = (rep[f] || 0) + 1; });
      return '<div class="mKbM' + (ab ? ' abierta' : '') + '"><button type="button" class="mKbH" data-kbm="' + esc(k) + '" style="--c:' + (S.maq[k] ? colorDe(k) : COL.MTA) + '">' + svgIc(ic, '') +
          '<span class="mKbHt"><b>' + esc(nom) + '</b><small>' + E.length + ' solucion' + (E.length > 1 ? 'es' : '') + ' registrada' + (E.length > 1 ? 's' : '') + ' · última ' + fdt(E[0].t0) + '</small></span><span class="mKbF">▾</span></button>' +
        '<div class="mKbB"><div class="mKbTip"><b>💡 Consejos para el técnico</b><ul>' + consejos(E).map(c => '<li>' + c + '</li>').join('') + '</ul></div>' +
        E.map(e => { const n = rep[normF(e.falla)], t = tiempos(e); return '<div class="mKbS"><div class="mKbSh"><span class="mKbChip">' + (TIPO_IC[e.tipo] || '❔') + ' ' + esc(e.tipo || 'Otra') + '</span>' + (n > 1 ? '<span class="mKbChip warn">🔁 se repitió ' + n + ' veces</span>' : '') + '<span class="foot">' + fdt(e.t0) + '</span></div>' +
          '<div class="mKbP"><span>❗ Falla</span><p>' + marca(e.falla, ws) + '</p></div>' +
          '<div class="mKbP"><span>🔍 Causa</span><p>' + marca(e.causa || '—', ws) + '</p></div>' +
          '<div class="mKbP ok"><span>✅ Solución</span><p>' + marca(e.solucion, ws) + '</p></div>' +
          (e.refac ? '<div class="mKbP"><span>🧰 Refacciones</span><p>' + marca(e.refac, ws) + '</p></div>' : '') +
          '<div class="foot">👷 ' + esc((e.tecRep || e.tec)?.n || '—') + ' · llegó en ' + dur(t.lleg) + ' · reparó en ' + dur(t.rep) + ' · paro total ' + dur(t.total) + '</div></div>'; }).join('') + '</div></div>';
    }).join('') : '<div class="mKbVacio">' + svgIc('mta', '') + '<b>' + (busca ? 'No encontré soluciones con esa búsqueda' : 'Todavía no hay soluciones registradas') + '</b><p class="foot">' + (busca ? 'Prueba con otra palabra (ej. “banda”, “sensor”, “aire”) o quita el filtro de tipo.' : 'Cada vez que un técnico marque “máquina reparada” con su causa y solución, aparece aquí agrupada por máquina.') + '</p></div>';
  };

  // ---------- Reportes: un solo Excel de respaldo de requerimientos (concentrado por mes; producción y Áreas generales en hojas separadas; cerrados)
  const bX = document.getElementById('btnXlsx');
  if (bX && typeof agExcelReq === 'function') {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'primary'; b.id = 'btnXlsxReq';
    b.textContent = '📐 Excel de requerimientos (respaldo por mes)';
    b.addEventListener('click', () => agExcelReq(''));
    bX.after(b);
  }

  if (typeof render === 'function') try { render(); } catch (e) {}
})();
