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

  // ---------- íconos en el menú
  const IC = { tab:'🛠', op:'🏭', kb:'📚', rep:'📄' };
  document.querySelectorAll('nav.nav button').forEach(b => { if (IC[b.dataset.v] && !/^\p{Extended_Pictographic}/u.test(b.textContent.trim())) b.textContent = IC[b.dataset.v] + ' ' + b.textContent.trim(); });

  if (typeof render === 'function') try { render(); } catch (e) {}
})();
