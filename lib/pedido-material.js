/* 📋 PEDIR MATERIAL AL ALMACÉN · apartado compartido (Control de Paros, Áreas generales, Mantenimiento Preventivo)
 * El técnico busca por código, nombre, modelo / número de parte o por MÁQUINA, ve la existencia real y la ubicación,
 * agrega lo que necesita (y material fuera de catálogo, p. ej. silicón) y genera una ORDEN con código PA/RQ/AG/PV-0000.
 * En la computadora del almacén se teclea o escanea ese código y se retira el material (almacen/ordenes-almacen.js).
 * Regla: la orden siempre va ligada a un paro, requerimiento, área general o preventivo; solo nóminas autorizadas a retirar.
 * Datos: lee apps/almacen/catalogo y apps/almacen/config/retiro; escribe apps/almacen/ordenes. No cambia la app que lo usa. */
(function () {
  'use strict';
  if (window.PedidoMaterial) return;
  const RET_DEF = ['1162', '4237', '4573', '4643', '4647', '4695', '4698', '4767', '4768', '4781', '3626', '2000'];
  const PREF = { paro: 'PA', req: 'RQ', ag: 'AG', prev: 'PV' };
  const st = { items: [], ret: null, t: 0, borr: null, opts: null };
  const e = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const nrm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const num = n => (Number(n) || 0).toLocaleString('es-MX', { maximumFractionDigits: 2 });
  const exi = it => (Number(it.ini) || 0) + (Number(it.ent) || 0) - (Number(it.sal) || 0);
  const ubi = it => [String(it.est || it.doc || '').toUpperCase(), it.niv ? 'N' + it.niv : '', it.pos ? 'P' + it.pos : ''].filter(Boolean).join(' · ');
  const fs = () => firebase.firestore();
  function css() {
    if (document.getElementById('pmCss')) return; const s = document.createElement('style'); s.id = 'pmCss';
    s.textContent = '#pmModal{position:fixed;inset:0;z-index:100060;background:rgba(5,12,22,.72);display:grid;place-items:center;padding:12px;font-family:"IBM Plex Sans","Segoe UI",system-ui,Arial,sans-serif}' +
      '#pmModal .pmB{width:min(860px,100%);max-height:94vh;overflow:auto;background:#EEF2F6;color:#14212E;border-radius:20px;box-shadow:0 20px 50px rgba(0,0,0,.45)}' +
      '#pmModal .pmH{position:sticky;top:0;z-index:2;display:flex;justify-content:space-between;align-items:center;gap:10px;padding:14px 18px;color:#fff;background:linear-gradient(120deg,#071629,#0E2A47 60%,#2A5C93);border-bottom:3px solid #F5A623}' +
      '#pmModal .pmH b{font-size:18px}#pmModal .pmH small{display:block;color:#B8CBE0;font-size:12.5px}#pmModal .pmH button{background:rgba(255,255,255,.14);color:#fff;border:0;border-radius:10px;width:38px;height:38px;font-size:17px;cursor:pointer}' +
      '#pmModal .pmC{padding:14px 18px;display:flex;flex-direction:column;gap:10px}#pmModal .pmBox{background:#fff;border:1px solid #D6DDE4;border-radius:14px;padding:10px 12px}' +
      '#pmModal label{display:flex;flex-direction:column;gap:4px;font-size:13px;font-weight:600;color:#0E2A47}#pmModal input,#pmModal select{font:inherit;font-size:15px;padding:9px 10px;border:1px solid #C9D3DD;border-radius:10px;background:#fff;color:#14212E}' +
      '#pmModal .pmRow{display:grid;grid-template-columns:1fr 1fr;gap:10px}#pmModal .pmRes{display:flex;flex-direction:column;gap:6px;max-height:280px;overflow:auto}' +
      '#pmModal .pmIt{display:grid;grid-template-columns:1fr auto auto;gap:10px;align-items:center;border:1px solid #E1E7EE;border-radius:12px;padding:7px 10px;background:#fff}' +
      '#pmModal .pmIt b{font-family:"IBM Plex Mono",Consolas,monospace;color:#0E2A47}#pmModal .pmIt small{display:block;color:#5A6676}#pmModal .pmEx{font-weight:700;font-size:13px;white-space:nowrap}' +
      '#pmModal button.pmAdd,#pmModal .pmPrim{background:linear-gradient(135deg,#2F86E8,#1F6FD1);color:#fff;border:0;border-radius:10px;padding:8px 14px;font-weight:700;cursor:pointer}#pmModal button:disabled{opacity:.45;cursor:not-allowed}' +
      '#pmModal .pmSec{background:#fff;color:#0E2A47;border:1px solid #C9D3DD;border-radius:10px;padding:8px 12px;cursor:pointer;font-weight:600}' +
      '#pmModal table{width:100%;border-collapse:collapse;font-size:13.5px}#pmModal th{background:#0E2A47;color:#fff;text-align:left;padding:6px}#pmModal td{border-bottom:1px solid #E4E9EF;padding:6px}' +
      '#pmModal .pmMsg{font-size:13.5px;font-weight:600}#pmModal .pmMsg.err{color:#C62828}#pmModal .pmAv{background:#FFF7E6;border:1px solid #F5C46B;border-radius:12px;padding:8px 10px;font-size:13px}' +
      '#pmModal .pmCod{text-align:center;padding:18px}#pmModal .pmCod .c{font:800 54px "IBM Plex Mono",Consolas,monospace;letter-spacing:.08em;color:#0E2A47}#pmModal .pmCod img{width:170px;height:170px;image-rendering:pixelated;margin:8px auto;display:block}' +
      '@media (max-width:600px){#pmModal .pmRow{grid-template-columns:1fr}#pmModal .pmCod .c{font-size:42px}}';
    document.head.appendChild(s);
  }
  async function cargar() {
    if (Date.now() - st.t < 90000 && st.items.length) return;
    const [cat, ret] = await Promise.all([fs().collection('apps/almacen/catalogo').get(), fs().doc('apps/almacen/config/retiro').get().catch(() => null)]);
    const L = []; cat.docs.forEach(d => { const its = (d.data() || {}).items || {}; for (const k in its) L.push(Object.assign({}, its[k], { k, doc: d.id })); });
    st.items = L; st.ret = (ret && ret.exists && (ret.data() || {}).n) || null; st.t = Date.now();
  }
  const autorizado = n => { n = String(n || '').trim(); if (!n) return false; return st.ret ? !!st.ret[n] : RET_DEF.includes(n); };
  function maquinas() { const M = {}; st.items.forEach(it => { const m = String(it.m || '').trim().toUpperCase(); if (m) M[m] = (M[m] || 0) + 1; }); return Object.keys(M).sort((a, b) => a.localeCompare(b, 'es', { numeric: true })).map(m => [m, M[m]]); }
  function maqSugerida(txt) { const w = nrm(txt).split(/[^a-z0-9]+/).filter(x => x.length > 2); let best = '', sc = 0; maquinas().forEach(([m]) => { const s = w.filter(x => nrm(m).includes(x.slice(0, 5))).length; if (s > sc) { sc = s; best = m; } }); return best; }
  function buscar(q, maq) {
    const ws = nrm(q).split(/\s+/).filter(Boolean);
    return st.items.filter(it => (!maq || String(it.m || '').toUpperCase() === maq) && (!ws.length || ws.every(w => nrm(Object.values(it).filter(v => typeof v === 'string' || typeof v === 'number').join(' ')).includes(w))))
      .sort((a, b) => (exi(b) > 0) - (exi(a) > 0) || String(a.c).localeCompare(String(b.c), 'es', { numeric: true })).slice(0, 60);
  }
  function pintar() {
    const B = st.borr, o = st.opts, m = document.getElementById('pmModal'); if (!m) return;
    const ok = autorizado(B.nomina), res = buscar(B.q, B.maq);
    m.querySelector('.pmC').innerHTML =
      (B.previas && B.previas.length ? '<div class="pmAv">📋 Este ' + (o.origen.tipo === 'prev' ? 'preventivo' : 'trabajo') + ' ya tiene orden(es): <b>' + B.previas.map(e).join(', ') + '</b>. Puedes generar otra si falta material.</div>' : '') +
      '<div class="pmBox"><label>👷 Nómina de quien saca el material *<input id="pmNom" inputmode="numeric" value="' + e(B.nomina || '') + '" placeholder="Ej. 4643"></label><div class="pmMsg ' + (B.nomina && !ok ? 'err' : '') + '">' + (!B.nomina ? 'Escribe tu nómina.' : ok ? '✅ Autorizado para retirar material' : '⛔ Esa nómina no está autorizada para retirar material del almacén.') + '</div></div>' +
      '<div class="pmBox"><div class="pmRow"><label>🔎 Buscar por código, nombre, modelo o No. de parte<input id="pmQ" value="' + e(B.q || '') + '" placeholder="Ej. 6205, contactor LC1, banda A42"></label>' +
      '<label>🏭 Por máquina<select id="pmMaq"><option value="">Todas las máquinas</option>' + maquinas().map(([mq, n]) => '<option' + (mq === B.maq ? ' selected' : '') + ' value="' + e(mq) + '">' + e(mq) + ' (' + n + ')</option>').join('') + '</select></label></div>' +
      '<div class="pmRes" style="margin-top:8px">' + (res.length ? res.map(it => { const x = exi(it); return '<div class="pmIt"><div><b>' + e(it.c) + '</b> ' + e(it.n) + '<small>' + e([it.m, ubi(it)].filter(Boolean).join(' · ')) + '</small></div><span class="pmEx" style="color:' + (x > 0 ? '#1E8E5A' : '#C62828') + '">' + (x > 0 ? 'Hay ' + num(x) : 'Agotado') + '</span><button type="button" class="pmAdd" data-pmadd="' + e(it.doc + '/' + it.k) + '"' + (x > 0 ? '' : ' disabled') + '>＋</button></div>'; }).join('') : '<p style="margin:4px;color:#5A6676">Sin resultados en el almacén. Si no existe, agrégalo abajo como material fuera de catálogo.</p>') + '</div></div>' +
      '<div class="pmBox"><div class="pmRow"><label>🧴 Material fuera de catálogo (silicón, cinta, tornillería…)<input id="pmOtro" placeholder="Ej. silicón rojo alta temperatura"></label><label>Cantidad<input id="pmOtroQ" type="number" min="1" step="any" value="1"></label></div><button type="button" class="pmSec" id="pmAddO" style="margin-top:8px">Agregar a la lista</button></div>' +
      '<div class="pmBox"><b style="color:#0E2A47">🧾 Material de la orden (' + B.lineas.length + ')</b><table style="margin-top:6px"><tr><th>Material</th><th>Cantidad</th><th>Hay</th><th></th></tr>' + (B.lineas.length ? B.lineas.map((l, i) => { const it = l.otro ? null : st.items.find(x => x.doc === l.doc && x.k === l.k); return '<tr><td>' + (l.otro ? '🧴 ' + e(l.n) + ' <small>(fuera de catálogo)</small>' : '<b>' + e(l.c) + '</b> ' + e(l.n)) + '</td><td>' + num(l.q) + '</td><td>' + (l.otro ? '—' : num(it ? exi(it) : 0)) + '</td><td><button type="button" class="pmSec" data-pmquit="' + i + '">✕</button></td></tr>'; }).join('') : '<tr><td colspan="4" style="color:#5A6676">Agrega lo que necesitas para esta reparación.</td></tr>') + '</table></div>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><button type="button" class="pmPrim" id="pmGen"' + (ok && B.lineas.length ? '' : ' disabled') + '>📋 Generar orden y código</button><span class="pmMsg err" id="pmErr"></span></div>';
  }
  async function generar() {
    const B = st.borr, o = st.opts, er = document.getElementById('pmErr'), btn = document.getElementById('pmGen'); if (!autorizado(B.nomina) || !B.lineas.length) return;
    btn.disabled = true; btn.textContent = 'Generando…';
    try {
      const pref = PREF[o.origen.tipo] || 'OM'; let folio = '';
      for (let i = 0; i < 8; i++) { const c = pref + '-' + String(Math.floor(1000 + Math.random() * 9000)); const q = await fs().collection('apps/almacen/ordenes').where('folio', '==', c).limit(1).get(); if (q.empty) { folio = c; break; } }
      if (!folio) throw new Error('no se pudo generar un código libre');
      await fs().collection('apps/almacen/ordenes').add({ folio, origen: { tipo: o.origen.tipo, id: o.origen.id, txt: o.origen.txt, maq: o.origen.maq || '' }, area: o.area || '', tec: String(B.nomina), tecN: B.nombre || o.nombre || '', lineas: B.lineas.map(l => Object.assign({ qs: 0 }, l)), nota: o.nota || '', estado: 'abierta', t: new Date().toISOString(), por: String(B.nomina), app: o.app || '' });
      mostrarCodigo(folio);
      if (typeof o.alGenerar === 'function') try { o.alGenerar(folio); } catch (x) {}
    } catch (x) { er.textContent = 'No se pudo generar la orden (' + (x.code || x.message) + '). La cuenta de este equipo debe estar dada de alta en el Almacén.'; btn.disabled = false; btn.textContent = '📋 Generar orden y código'; }
  }
  function mostrarCodigo(folio) {
    const m = document.getElementById('pmModal'); m.querySelector('.pmC').innerHTML = '<div class="pmBox pmCod"><div style="color:#5A6676;font-weight:700">CÓDIGO DE TU ORDEN DE MATERIAL</div><div class="c">' + e(folio) + '</div><div id="pmQr"></div><p style="margin:6px 0 0">Anótalo y ve al <b>almacén</b>: allá teclean este código o escanean el QR y te entregan tu material.</p></div><button type="button" class="pmPrim" id="pmFin">Listo</button>';
    const url = 'https://omarlineaitalia-a11y.github.io/mantenimiento-linea-italia/almacen/#c=' + folio;
    const pintarQR = () => { try { const q = qrcode(0, 'M'); q.addData(url); q.make(); document.getElementById('pmQr').innerHTML = '<img alt="QR" src="' + q.createDataURL(6, 2) + '">'; } catch (x) {} };
    if (window.qrcode) pintarQR(); else { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js'; s.onload = pintarQR; document.head.appendChild(s); }
  }
  function cerrar() { const m = document.getElementById('pmModal'); if (m) m.remove(); st.borr = null; }
  async function abrir(opts) {
    css(); st.opts = opts || {}; if (!st.opts.origen || !st.opts.origen.id) { alert('La orden de material debe ir ligada a un paro, requerimiento, área general o preventivo.'); return; }
    cerrar(); const m = document.createElement('div'); m.id = 'pmModal'; const tp = { paro: '🛑', req: '📐', ag: '🏢', prev: '🛠️' }[st.opts.origen.tipo] || '📋';
    m.innerHTML = '<div class="pmB"><div class="pmH"><div><b>📋 Pedir material al almacén</b><small>' + tp + ' · ' + e(st.opts.origen.txt) + '</small></div><button type="button" id="pmX">✕</button></div><div class="pmC"><p>Cargando el almacén…</p></div></div>';
    document.body.appendChild(m);
    st.borr = { nomina: st.opts.nomina || '', nombre: st.opts.nombre || '', q: '', maq: '', lineas: [], previas: [] };
    try { await cargar(); } catch (x) { m.querySelector('.pmC').innerHTML = '<p class="pmMsg err">No se pudo leer el almacén (' + e(x.code || x.message) + '). La cuenta de este equipo debe estar dada de alta en el Almacén.</p>'; return; }
    st.borr.maq = maqSugerida(st.opts.origen.maq || '');
    try { const q = await fs().collection('apps/almacen/ordenes').where('origen.id', '==', st.opts.origen.id).get(); st.borr.previas = q.docs.map(d => d.data()).filter(x => x.estado !== 'cancelada').map(x => x.folio); } catch (x) {}
    pintar();
  }
  document.addEventListener('click', ev => {
    const t = ev.target; if (!document.getElementById('pmModal')) return; let b; const B = st.borr;
    if (t.id === 'pmX' || t.id === 'pmFin' || t.id === 'pmModal') { cerrar(); return; }
    if ((b = t.closest('[data-pmadd]'))) { const [doc, k] = b.dataset.pmadd.split('/'), it = st.items.find(x => x.doc === doc && x.k === k); if (!it) return; const q = Number(prompt('¿Cuántas piezas de ' + it.c + ' · ' + it.n + '? (hay ' + num(exi(it)) + ')', '1')) || 0; if (!(q > 0)) return; const ya = B.lineas.find(l => l.doc === doc && l.k === k); if (ya) ya.q += q; else B.lineas.push({ doc, k, c: it.c, n: it.n, q }); pintar(); return; }
    if (t.id === 'pmAddO') { const n = String((document.getElementById('pmOtro') || {}).value || '').trim().toUpperCase(), q = Number((document.getElementById('pmOtroQ') || {}).value) || 0; if (!n || !(q > 0)) return; B.lineas.push({ otro: true, c: 'OTRO', n, q }); pintar(); return; }
    if ((b = t.closest('[data-pmquit]'))) { B.lineas.splice(+b.dataset.pmquit, 1); pintar(); return; }
    if (t.id === 'pmGen') { generar(); return; }
  });
  let tq = 0;
  document.addEventListener('input', ev => {
    if (!st.borr) return; const t = ev.target;
    if (t.id === 'pmQ') { st.borr.q = t.value; clearTimeout(tq); tq = setTimeout(() => { const pos = t.selectionStart; pintar(); const n = document.getElementById('pmQ'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (x) {} } }, 250); }
    if (t.id === 'pmNom') { st.borr.nomina = t.value.trim(); clearTimeout(tq); tq = setTimeout(() => { pintar(); const n = document.getElementById('pmNom'); if (n) { n.focus(); const v = n.value; n.setSelectionRange(v.length, v.length); } }, 350); }
  });
  document.addEventListener('change', ev => { if (st.borr && ev.target.id === 'pmMaq') { st.borr.maq = ev.target.value; pintar(); } });
  window.PedidoMaterial = { abrir, cerrar };
})();
