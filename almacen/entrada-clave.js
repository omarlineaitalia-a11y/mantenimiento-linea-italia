/* Almacén · ENTRADA CON NÓMINA Y CONTRASEÑA DE LA APP (misma dinámica que Mantenimiento Preventivo · Ing. Omar, 16-nov-2026)
 * - Contraseña inicial de todos: 000000. Con la genérica se pide crear la propia (6 dígitos). Los técnicos/usuarios la renuevan cada mes.
 * - acceso/<nómina> {h (huella), mes, t, gen} sirve para validar · claves/<nómina> {c, t} solo la VEN el jefe (4781) y la gerencia (3626).
 * - El equipo (tablet / PC) se queda con su cuenta; la persona se identifica con su nómina para saber quién saca material. */
(function () {
  'use strict';
  const GEN = '000000', VEN_CLAVES = ['4781', '3626'];
  const A = { acc: {}, claves: {}, ver: {}, cambio: null };
  const mesHoy = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
  const esAdm = p => p && ['admin', 'general'].includes(p.r);
  async function huella(nom, pwd) { const txt = 'li-alm|' + nom + '|' + pwd; try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt)); return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join(''); } catch (e) { let h = 5381; for (const c of txt) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0; return 'd' + h.toString(16); } }
  function msg(t, ok) { const m = document.getElementById('mLogin'); if (m) { m.className = 'msg' + (ok ? '' : ' err'); m.textContent = t || ''; } }
  function entrarApp(k) {
    const p = S.pers && S.pers[k]; if (!p || p.a === false) return false;
    S.yo = { nomina: k, n: p.n, r: p.r }; LS.set('alm_nomina', k); S.last = Date.now(); LS.set('alm_last', String(S.last));
    document.getElementById('login').hidden = true; applyRole(); salirCambio(); return true;
  }
  function envolverEntrar() { if (typeof entrar !== 'function' || entrar._clave) return; const base = entrar; window.entrar = function (k) { k = String(k || '').trim(); if (A.listo && S.pers && S.pers[k]) return entrarApp(k); return base.apply(this, arguments); }; window.entrar._clave = true; }
  // paso de cambio de contraseña (dentro del mismo recuadro)
  function pintarCambio(k, motivo) {
    A.cambio = k; const f = document.getElementById('fLogin'); if (!f) return; let c = document.getElementById('lCambio');
    if (!c) { c = document.createElement('div'); c.id = 'lCambio'; c.innerHTML = '<label class="f">Nueva contraseña (6 dígitos)<input id="lN1" type="password" inputmode="numeric" maxlength="6" class="big" placeholder="●●●●●●"></label><label class="f">Repite la nueva contraseña<input id="lN2" type="password" inputmode="numeric" maxlength="6" class="big" placeholder="●●●●●●"></label>'; const btn = f.querySelector('button[type="submit"]'); f.insertBefore(c, btn); }
    c.hidden = false; f.querySelector('#lPw').closest('label').hidden = true; f.querySelector('#lNom').readOnly = true;
    const btn = f.querySelector('button[type="submit"]'); btn.textContent = 'Guardar contraseña y entrar'; msg(motivo, true); setTimeout(() => document.getElementById('lN1').focus(), 50);
  }
  function salirCambio() { A.cambio = null; const c = document.getElementById('lCambio'); if (c) { c.hidden = true; c.querySelectorAll('input').forEach(i => i.value = ''); } const f = document.getElementById('fLogin'); if (!f) return; const pw = f.querySelector('#lPw'); pw.value = ''; pw.closest('label').hidden = false; f.querySelector('#lNom').readOnly = false; const b = f.querySelector('button[type="submit"]'); if (b) b.textContent = 'Entrar'; }
  document.addEventListener('submit', async e => {
    if (!e.target || e.target.id !== 'fLogin') return; e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    if (!A.listo) return msg('Cargando accesos… intenta en un momento.');
    const k = (document.getElementById('lNom') || {}).value.trim(), p = S.pers && S.pers[k];
    if (A.cambio) {
      const n1 = document.getElementById('lN1').value.trim(), n2 = document.getElementById('lN2').value.trim();
      if (!/^\d{6}$/.test(n1)) return msg('La contraseña debe tener 6 dígitos.');
      if (n1 === GEN) return msg('No puedes usar la contraseña genérica 000000.');
      if (n1 !== n2) { document.getElementById('lN2').value = ''; return msg('Las dos contraseñas no coinciden.'); }
      if ((A.acc[k] || {}).h === await huella(k, n1)) return msg('Usa una contraseña diferente a la anterior.');
      try { await db.doc('acceso/' + k).set({ h: await huella(k, n1), mes: mesHoy(), t: new Date().toISOString(), gen: false }); await db.doc('claves/' + k).set({ c: n1, t: new Date().toISOString() }); }
      catch (x) { return msg('No se pudo guardar (' + (x.code || x.message) + ').'); }
      toast('🔑 Contraseña actualizada'); return entrarApp(k);
    }
    if (!p || p.a === false) return msg('Número de nómina no registrado o inactivo.');
    const pw = (document.getElementById('lPw') || {}).value.trim(); if (!pw) return msg('Escribe tu contraseña.');
    const a = A.acc[k], ok = a && a.h ? a.h === await huella(k, pw) : pw === GEN;
    if (!ok) { document.getElementById('lPw').value = ''; return msg('Contraseña incorrecta.'); }
    const generica = !a || a.gen || pw === GEN, vencida = !esAdm(p) && (!a || a.mes !== mesHoy());
    if (generica || vencida) return pintarCambio(k, generica ? 'Estás usando la contraseña genérica: crea la tuya.' : 'Nuevo mes: renueva tu contraseña.');
    entrarApp(k);
  }, true);
  // 🔑 contraseñas en Personal y accesos (solo jefe 4781 y gerencia 3626)
  function pintarClaves() {
    const sec = document.getElementById('v-pers'); if (!sec || !S.yo || !VEN_CLAVES.includes(String(S.yo.nomina))) { const v = document.getElementById('clvBox'); if (v) v.remove(); return; }
    let box = document.getElementById('clvBox'); if (!box) { box = document.createElement('div'); box.id = 'clvBox'; box.className = 'box'; sec.appendChild(box); }
    const P = Object.entries(S.pers || {}).filter(([, p]) => p.a !== false).sort((x, y) => String(x[1].n).localeCompare(String(y[1].n)));
    box.innerHTML = '<h3>🔑 Contraseñas de la app</h3><p class="foot">Solo las ven el jefe de mantenimiento y la gerencia. Contraseña inicial 000000; cada quien crea la suya y la renueva cada mes. Si a alguien se le olvida, aquí se ve o se regresa a 000000.</p><div class="tw" style="overflow:auto"><table class="tbl" style="width:100%"><tr><th>Nombre</th><th>Nómina</th><th>Contraseña</th><th>Último cambio</th><th></th></tr>' +
      P.map(([k, p]) => { const c = (A.claves[k] || {}).c, a = A.acc[k] || {}; const txt = !a.h ? 'genérica (000000)' : (A.ver[k] ? (c || 'sin dato') : '••••••'); return '<tr><td>' + esc(p.n) + '</td><td class="mono">' + esc(k) + '</td><td class="mono" style="font-weight:800;letter-spacing:2px">' + esc(txt) + (a.h ? ' <button type="button" data-vclave="' + esc(k) + '">👁</button>' : '') + '</td><td>' + (a.t ? new Date(a.t).toLocaleDateString('es-MX') + (a.gen ? ' · genérica' : '') : '—') + '</td><td>' + (a.h ? '<button type="button" data-rclave="' + esc(k) + '">↺ 000000</button>' : '') + '</td></tr>'; }).join('') + '</table></div>';
  }
  document.addEventListener('click', async e => {
    const v = e.target.closest('[data-vclave]'); if (v) { A.ver[v.dataset.vclave] = !A.ver[v.dataset.vclave]; pintarClaves(); return; }
    const r = e.target.closest('[data-rclave]'); if (!r) return; const k = r.dataset.rclave, p = (S.pers || {})[k] || {};
    const si = window.confirmarApp ? await confirmarApp({ titulo: 'Regresar contraseña a 000000', texto: p.n + ' tendrá que crear una nueva al entrar.', si: 'Regresar', icono: '🔑' }) : confirm('¿Regresar la contraseña de ' + p.n + ' a 000000?'); if (!si) return;
    try { await db.doc('acceso/' + k).set({ h: await huella(k, GEN), gen: true, mes: '', t: new Date().toISOString() }); await db.doc('claves/' + k).set({ c: GEN, t: new Date().toISOString(), por: (S.yo || {}).n || '' }); toast('Contraseña regresada a 000000'); } catch (x) { toast('No se pudo (' + (x.code || x.message) + ').'); }
  });
  function envolverPers() { if (typeof renderPers !== 'function' || renderPers._clave) return; const base = renderPers; window.renderPers = function () { const r = base.apply(this, arguments); try { pintarClaves(); } catch (x) {} return r; }; window.renderPers._clave = true; }
  function ajustarPantalla() { const pw = document.getElementById('lPw'); if (pw) { pw.setAttribute('inputmode', 'numeric'); pw.setAttribute('maxlength', '6'); pw.placeholder = '6 dígitos'; } const f = document.querySelector('#fLogin .foot'); if (f && !f.dataset.clv) { f.dataset.clv = '1'; f.textContent = 'Primera vez: contraseña 000000 y crea la tuya. ¿La olvidaste? Pide al jefe de mantenimiento que la revise o la regrese a 000000.'; } }
  function iniciar() {
    envolverEntrar(); envolverPers(); ajustarPantalla();
    const espera = () => { if (typeof db === 'undefined' || !db) return setTimeout(espera, 500);
      db.collection('acceso').onSnapshot(q => { A.acc = {}; q.docs.forEach(d => A.acc[d.id] = d.data()); A.listo = true; if (S.tab === 'pers') pintarClaves(); }, () => { A.listo = true; });
      db.collection('claves').onSnapshot(q => { A.claves = {}; q.docs.forEach(d => A.claves[d.id] = d.data()); if (S.tab === 'pers') pintarClaves(); }, () => {}); };
    espera();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
