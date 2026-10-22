/* Áreas generales · PRUEBA "Paros con áreas generales" · Mantenimiento Línea Italia
 * Solicitudes que NO son paro de máquina: mejoras, modificaciones, acondicionamientos y reparaciones
 * de equipos de áreas generales, oficinas y edificio. Datos en apps/parosag/ag (solicitudes) y apps/parosag/config/ag (equipos).
 * Flujo: espera (alarma rosa a mantenimiento) → proceso (técnico pone tiempo estimado) → [pendiente con fecha compromiso
 * y materiales] → terminada (solución) → cerrada (encuesta de quien solicitó: duración, área limpia, calidad).
 */
const AG_CATS_DEF = { MTC:'Maquinaria tipo C', AG:'Áreas generales', AA:'Aires acondicionados', IL:'Iluminación', EBT:'Eléctrico baja tensión', EMT:'Eléctrico media tensión', EM:'Equipo móvil', EA:'Equipo auxiliar' };
// equipos iniciales (nombre corto · categoría · ubicación). Se editan en la pestaña "⚙ Equipos".
const AG_EQ_DEF = (() => {
  const L = [
    ['Taladros de banco','MTC','Planta'], ['Taladro dúplex','MTC','Planta'], ['Sierra lenta','MTC','Planta'], ['Sierra Master 1','MTC','Planta'], ['Sierra Master 2','MTC','Planta'],
    ['Guillotina 1','MTC','Planta'], ['Roladora','MTC','Planta'], ['Punteadora','MTC','Planta'], ['Máquinas de soldar','MTC','Planta'], ['Envolvedora 1','MTC','Planta'], ['Envolvedora 2','MTC','Planta'],
    ['Oficinas administrativas','AG','Oficina'], ['Baños oficinas','AG','Oficina'], ['Baños planta','AG','Planta'], ['Comedor','AG','Planta'], ['Docks','AG','Planta'],
    ['Instalación hidráulica','AG','Planta'], ['Puertas y portones','AG','Planta'], ['Techos y láminas','AG','Planta'], ['Pisos y pintura','AG','Planta'], ['Estacionamiento','AG','Exterior'],
    ['Aires acondicionados oficinas','AA','Oficina'], ['Refrigeración','AA','Planta'],
    ['Iluminación planta','IL','Planta'], ['Iluminación oficinas','IL','Oficina'], ['Lámparas de emergencia','IL','Planta'], ['Fotocelda / control inteligente','IL','Planta'], ['Luz de docks','IL','Planta'],
    ['Tableros 220 V','EBT','Planta'], ['Tableros 440 V','EBT','Planta'], ['Contactos y clavijas','EBT','Planta'], ['Banco de capacitores 220 V','EBT','Planta'],
    ['Subestación','EMT','Exterior'], ['Banco de capacitores 440 V','EMT','Planta'],
    ['Montacargas','EM','Planta'], ['Polipasto','EM','Planta'],
    ['Compresor 100 HP','EA','Planta'], ['Compresor 50 HP','EA','Planta'], ['Colector de polvo','EA','Planta'], ['Sistema de gas','EA','Planta'], ['Banda archiveros','EA','Planta'], ['Banda muebles','EA','Planta']
  ];
  const o = {}; L.forEach(([n, cat, ubic], i) => { o['e' + String(i + 1).padStart(3, '0')] = { n, cat, ubic, a:true }; }); return o;
})();
// tipos de trabajo: solo reparaciones
const AG_TIPOS = ['Reparación eléctrica', 'Reparación hidráulica (agua / plomería)', 'Reparación estructural', 'Reparación estética', 'Reparación mecánica'];
const AG_PRIO = { urgente:'Urgente', alta:'Alta (hoy)', media:'Media (semana)', baja:'Baja (mes)' };
// ubicaciones de la falla (tablero de usuario)
const AG_UBIC = ['Planta', 'Edificio', 'Comedor', 'Baños', 'Oficina', 'Escaleras', 'Jardín', 'Estacionamiento'];
const AG_EST = { espera:'Esperando técnico', proceso:'En proceso', pendiente:'Pendiente', terminada:'Terminada · por calificar', cerrada:'Cerrada' };
const AG_MOTIVOS = ['Falta refacción / material', 'Esperando compra', 'Requiere contratista', 'Requiere paro del área', 'Requiere autorización', 'Otro'];

S.agReq = S.agReq || []; S.agCfg = S.agCfg || null; S.agt = S.agt || 'tab'; S.agQ = ''; S.agPer = S.agPer || 'dia';
const agCats = () => Object.assign({}, AG_CATS_DEF, (S.agCfg && S.agCfg.cats) || {});
const agEq = () => (S.agCfg && S.agCfg.eq && Object.keys(S.agCfg.eq).length) ? S.agCfg.eq : AG_EQ_DEF;
const agById = id => S.agReq.find(r => r.id === id);
// sugerencias de ubicación: áreas de la categoría "Áreas generales", ubicaciones de los equipos y las ya usadas
const agUbicaciones = () => {
  const E = agEq(), s = new Set();
  Object.values(E).filter(v => v.cat === 'AG' && v.a !== false).forEach(v => s.add(v.n));
  Object.values(E).forEach(v => { if (v.ubic) s.add(v.ubic); });
  S.agReq.forEach(r => { if (r.ubic) s.add(r.ubic); });
  return [...s].sort((a, b) => a.localeCompare(b, 'es'));
};
const agPrioTag = p => p === 'urgente' ? ' · <span class="tag bad">URGENTE</span>' : p === 'alta' ? ' · <span class="tag bad">prioridad alta</span>' : '';
const esGral = p => !!p && p.r === 'general';   // administrador general: puede liberar y cerrar cualquier solicitud
const esMttoAdm = p =>!!p && (esAdm(p) || p.r === 'mtto' || depDe(p) === 'mtto');
const agEsp = () => S.agReq.filter(r => r.estado === 'espera').sort((a, b) => (a.t0 || '').localeCompare(b.t0 || ''));
const agMin = r => r.tAcept && r.tFin ? ms(r.tAcept, r.tFin) : null;   // tiempo real de reparación
const agFmtEst = m => m == null ? '—' : m >= 60 ? (Math.round(m / 6) / 10) + ' h' : m + ' min';
const agEstrellas = n => n ? '★'.repeat(n) + '☆'.repeat(5 - n) : '—';

// ---------- conexión (la llama la página al conectarse a la base de datos)
function agConectar(db){
  db.collection('agLog').orderBy('t', 'desc').limit(3000).onSnapshot(s => { S.agEv = s.docs.map(d => Object.assign({ id:d.id }, d.data())); if (S.view === 'ag' && S.agt === 'hist') agHistorial(); }, () => {});
  db.doc('config/agArchivo').onSnapshot(s => { S.agArch = (s.exists && s.data().meses) || {}; if (S.view === 'ag' && S.agt === 'graf') agGraficas(); }, () => {});
  db.collection('ag').orderBy('t0', 'desc').limit(1000).onSnapshot(s => { S.agReq = s.docs.map(d => Object.assign({ id:d.id }, d.data())); render(); }, () => {});
  db.doc('config/ag').onSnapshot(s => { S.agCfg = s.exists ? s.data() : null; if (S.view === 'ag') renderAG(); }, () => {});
}

// ---------- alarma ROSA (solo a mantenimiento): sin tiempo de llegada; el técnico pone tiempo estimado
// la alarma rosa sale a mantenimiento; nunca en equipos de áreas generales ni en la pantalla de máquina
const alertaAG = () => S.view !== 'op' && devArea() !== 'ag' && (S.sesion ? ((esMttoAdm(S.sesion) || vistasDe(S.sesion).includes('agmt')) && (S.view === 'tab' || S.view === 'ag' || devArea() === 'mtto')) : devArea() === 'mtto');
const agNotif = new Set();
// Alarma de mantenimiento: si solo hay solicitudes de áreas generales → alarma rosa; si coinciden con fallas de máquina
// (o hay varias), la pantalla se DIVIDE en un panel por falla (rojo = falla de máquina, morado = prueba, rosa = áreas generales).
// Si solo hay fallas de máquina, la dibuja la página como siempre (devuelve false).
function renderAlertaAG(espMaq, showMaq){
  const el = $('alerta');
  const ag = alertaAG() && Date.now() > S.hideAlert ? agEsp() : [];
  if (!ag.length) { el.classList.remove('multi', 'ag'); return false; }
  const maq = (showMaq || alertaAG()) && Date.now() > S.hideAlert ? (espMaq || []) : [];
  const todos = [...maq, ...ag], sil = todos.every(x => silenciados.has(claveEv(x)));
  el.classList.remove('prueba'); el.hidden = false;
  if (devArea() === 'mtto') document.title = (sil ? '🔕 Alarma silenciada · ' : '⚠ FALLA · ') + (maq.length ? maq[0].maqN + ' · ' : '') + '🏢 ' + ag[0].eqN;
  const pie = '<div class="apie">' + (sil ? '<span style="font-size:18px;font-weight:700;align-self:center">🔕 Silenciada</span>' : '<button type="button" id="btnSilenciarAG" style="background:#fff;color:#7A1212;border-color:#fff">🔕 Silenciar</button>') +
    '<button type="button" id="btnOcultar" style="background:transparent;color:#fff;border-color:#fff">Ver tablero 1 min</button></div>';
  if (todos.length === 1) {
    // una sola solicitud de áreas generales: alarma rosa completa
    const r = ag[0];
    el.classList.remove('multi'); el.classList.add('ag');
    el.innerHTML = '<div class="a1">🏢 ' + (r.reab ? '🔁 LA FALLA CONTINÚA' : 'ÁREAS GENERALES') + '</div><div class="a2">' + esc(r.eqN) + '</div>' +
      (r.reab ? '<div class="a3">Sigue fallando: <b>' + esc(r.reabNota || '') + '</b> · ' + (r.reab + 1) + 'ª atención · reparó antes: ' + esc(r.reabTec || '') + '</div>' : '') +
      '<div class="a2" style="font-size:clamp(20px,3.4vw,40px)">📍 ' + esc(r.ubic || 'sin ubicación') + '</div>' +
      '<div class="a3">👤 Solicita: <b>' + esc(r.sol?.n || '') + '</b> · ' + fdt(r.t0) + '<br>' + esc(r.tipo || '') + ' · ' + esc(agCats()[r.cat] || r.cat || '') + (r.prio === 'urgente' ? ' · <b>⚠ URGENTE</b>' : r.prio === 'alta' ? ' · <b>PRIORIDAD ALTA</b>' : '') + '</div>' +
      '<div class="a3">📝 Notas: <b>' + esc(r.desc || '') + '</b></div>' +
      '<div><button type="button" data-agacc="atender" data-id="' + r.id + '" style="background:#fff;color:#AD1457;border-color:#fff;font-size:20px;padding:14px 26px">🧰 Atender · poner tiempo estimado</button></div>' + pie;
  } else {
    // varias fallas a la vez: pantalla dividida
    el.classList.remove('ag'); el.classList.add('multi');
    const panelMaq = e => '<div class="apanel ' + (e.prueba ? 'pru' : 'maq') + '"><div class="pt">' + (e.prueba ? '🧪 PRUEBA DE ALARMA' : e.reab ? '🔁 LA FALLA CONTINÚA' : '⚠ FALLA EN MÁQUINA') + '</div>' +
      '<div class="pn">' + esc(e.maqN) + '</div><div class="pti" data-since="' + esc(e.tAlerta || e.t0) + '">' + hms(ms(e.tAlerta || e.t0)) + '</div>' +
      '<div>Operador: <b>' + esc((e.reab ? e.reabOp?.n : e.op?.n) || '') + '</b></div><div>' + (e.prueba ? 'No es falla real' : 'Falla: <b>' + esc(e.reab ? e.reabNota || '' : e.falla || '') + '</b>') + '</div>' +
      '<div class="pf">🧰 El técnico registra "Técnico en sitio" en la pantalla de la máquina</div></div>';
    const panelAG = r => '<div class="apanel agp"><div class="pt">🏢 ' + (r.reab ? '🔁 CONTINÚA · ' : '') + 'ÁREAS GENERALES' + (r.prio === 'urgente' ? ' · ⚠ URGENTE' : '') + '</div>' +
      '<div class="pn">' + esc(r.eqN) + '</div><div>📍 <b>' + esc(r.ubic || '') + '</b></div><div>👤 Solicita: <b>' + esc(r.sol?.n || '') + '</b></div><div>📝 ' + esc(r.reab ? r.reabNota || r.desc || '' : r.desc || '') + '</div>' +
      '<div><button type="button" data-agacc="atender" data-id="' + r.id + '" style="background:#fff;color:#AD1457;border-color:#fff">🧰 Atender · tiempo estimado</button></div></div>';
    const lim = 6, L = todos.slice(0, lim);
    el.innerHTML = '<div class="agrid">' + L.map(x => x.eqN !== undefined && x.maqN === undefined ? panelAG(x) : panelMaq(x)).join('') + '</div>' +
      (todos.length > lim ? '<div class="a3">+ ' + (todos.length - lim) + ' falla(s) más</div>' : '') + pie;
  }
  beep(!sil);
  // aviso del sistema en equipos de mantenimiento
  if (devArea() === 'mtto' && 'Notification' in window && Notification.permission === 'granted') ag.forEach(x => {
    const c = claveEv(x); if (agNotif.has(c)) return; agNotif.add(c);
    try { mostrarAviso('⚠ FALLA · 🏢 ÁREAS GENERALES · ' + x.eqN, (x.ubic || '') + ': ' + (x.desc || ''), 'ag-' + x.id); } catch (e) {}
  });
  return true;
}
document.addEventListener('click', e => { if (e.target.id === 'btnSilenciarAG') { enEspera().concat(agEsp()).forEach(x => silenciados.add(claveEv(x))); beep(false); renderAlerta(); } });
setInterval(() => { if ($('alerta').hidden && agEsp().length && alertaAG() && Date.now() > S.hideAlert) renderAlerta(); }, 1000);

// ---------- pestañas del módulo
document.addEventListener('click', e => {
  const b = e.target.closest('[data-agt]'); if (b) { S.agt = b.dataset.agt; renderAG(); return; }
  if (e.target.closest('[data-agnueva]')) agNueva();
});
// quién ve qué: usuario → su tablero; mantenimiento → tablero de mantenimiento, pendientes, historial y gráficas;
// administradores → todo; "lista de materiales" también a quien tenga ese permiso (ej. compras / almacén)
function agPestanas(){
  const p = S.sesion, adm = !!p && esAdm(p);
  // equipo marcado como ÁREAS GENERALES: solo el tablero de usuario (el administrador general ve todo)
  if (devArea() === 'ag' && !adm) return { usr:true, tab:false, pend:false, hist:false, graf:false, eq:false };
  const v = p ? vistasDe(p) : [];
  const mt = p ? (esMttoAdm(p) || v.includes('agmt')) : devArea() === 'mtto';
  const mat = mt || v.includes('agmat');
  return { usr: adm || !mt || v.includes('ag'), tab: mt, pend: mat, hist: mt, graf: mt, eq: adm };
}
function renderAG(){
  const ok = agPestanas();
  if (!ok[S.agt]) S.agt = ok.usr && !(S.sesion ? esMttoAdm(S.sesion) : devArea() === 'mtto') ? 'usr' : (Object.keys(ok).find(k => ok[k]) || 'usr');
  document.querySelectorAll('#agTabs button').forEach(b => { b.setAttribute('aria-selected', b.dataset.agt === S.agt); b.hidden = !ok[b.dataset.agt]; });
  ({ usr:agUsuario, tab:agTablero, nueva:agNueva, pend:agPendientes, hist:agHistorial, graf:agGraficas, eq:agEquipos })[S.agt]();
}

// ---------- 👤 TABLERO DE USUARIO: reportar (qué falla, dónde, nota rápida) y liberar con su nómina
function agUsuario(){
  const p = S.sesion, adm = !!p && esAdm(p);
  const mias = !p ? [] : S.agReq.filter(r => adm || r.sol?.nom === p.nomina);
  const abiertas = mias.filter(r => r.estado !== 'cerrada'), porLiberar = mias.filter(r => r.estado === 'terminada');
  const chip = r => '<span class="tag ' + ({ espera:'bad', proceso:'', pendiente:'warn', terminada:'ok', cerrada:'' }[r.estado]) + '">' + esc(AG_EST[r.estado] || r.estado) + '</span>';
  $('agBody').innerHTML = '<div id="agFormU"></div>' +
    (porLiberar.length ? '<div class="box" style="border:2px solid var(--ok)"><h3>✅ Trabajos terminados · confírmalos con tu nómina</h3>' + porLiberar.map(r => '<div class="kbi" style="border-left-color:var(--ok)"><div class="h"><span><b style="color:var(--fg)">' + esc(r.eqN) + '</b> · 📍 ' + esc(r.ubic || '') + '</span><span>' + chip(r) + '</span></div><div>📝 ' + esc(r.desc || '') + '</div><div><b>Solución:</b> ' + esc(r.solucion || '') + ' <span class="foot">· 🧰 ' + esc((r.tecFin || r.tec)?.n || '') + '</span></div>' + (p && esMttoAdm(p) && !esGral(p) ? '<p class="foot">Lo libera quien solicitó (' + esc(r.sol?.n || '') + ') con su nómina.</p>' : '<div><button type="button" class="ok" data-agacc="calificar" data-id="' + r.id + '" style="font-size:17px;padding:12px 20px">✅ Liberar trabajo realizado</button> <button type="button" class="danger" data-agacc="continua" data-id="' + r.id + '" style="font-size:17px;padding:12px 20px">🔁 Continúa la falla</button></div>') + '</div>').join('') + '</div>' : '') +
    '<div class="box"><h3>' + (adm ? '📋 Todas las solicitudes abiertas (administrador)' : '📋 Mis solicitudes') + ' · ' + abiertas.length + '</h3>' +
    (!p ? '<p class="foot">Entra con tu nómina (👤 Entrar) para ver tus solicitudes y liberar trabajos.</p>' : abiertas.length ? '<div class="kb">' + abiertas.map(r => '<button type="button" class="kbi" data-agver="' + r.id + '" style="text-align:left;cursor:pointer;font-weight:400;width:100%;align-items:stretch;border-left-color:#AD1457"><div class="h"><span><b style="color:var(--fg)">' + esc(r.eqN) + '</b> · 📍 ' + esc(r.ubic || '') + '</span><span>' + chip(r) + '</span></div><div>📝 ' + esc(r.desc || '') + '</div><div class="foot">' + fdt(r.t0) + (adm ? ' · 👤 ' + esc(r.sol?.n || '') : '') + (r.tec ? ' · 🧰 ' + esc(r.tec.n) : '') + (r.est ? ' · estimado ' + agFmtEst(r.est) : '') + (r.estado === 'pendiente' && r.pend ? ' · compromiso ' + esc(r.pend.fecha || 'sin fecha') + ' · ' + esc(r.pend.coment || '') : '') + '</div></button>').join('') + '</div>' : '<p class="foot">No tienes solicitudes abiertas.</p>') + '</div>';
  agFormulario($('agFormU'));
}
const agTarjeta = r => {
  const col = { espera:'#D81B60', proceso:'#1565C0', pendiente:'#C99700', terminada:'#2E7D32', cerrada:'#607D8B' }[r.estado];
  return '<button type="button" class="kbi" data-agver="' + r.id + '" style="border-left-color:' + col + ';text-align:left;cursor:pointer;font-weight:400;width:100%;align-items:stretch">' +
    '<div class="h"><span><b style="color:var(--fg);font-size:15px">' + esc(r.eqN) + '</b>' + (r.reab ? ' <span class="tag bad">🔁 la falla continúa · ' + (r.reab + 1) + 'ª atención</span>' : '') + '</span><span class="tag">' + esc(r.tipo || '') + '</span></div>' +
    (r.reab && r.reabNota ? '<div>🔁 <b>Sigue fallando:</b> ' + esc(r.reabNota) + '</div>' : '') +
    '<div>📍 <b>' + esc(r.ubic || 'sin ubicación') + '</b> · 👤 solicita <b>' + esc(r.sol?.n || '') + '</b></div>' +
    '<div>📝 <b>Notas:</b> ' + esc(r.desc || '') + '</div>' +
    '<div class="foot">' + fdt(r.t0) + (r.tec ? ' · 🧰 ' + esc(r.tec.n) : '') + (r.est ? ' · estimado ' + agFmtEst(r.est) : '') +
    (r.estado === 'espera' ? ' · <b data-since="' + esc(r.t0) + '">' + hms(ms(r.t0)) + '</b>' : '') +
    (r.estado === 'pendiente' && r.pend ? ' · compromiso <b>' + esc(r.pend.fecha || 'sin fecha') + '</b>' : '') + agPrioTag(r.prio) + '</div></button>';
};
function agTablero(){
  const R = S.agReq, h0 = new Date(); h0.setHours(0, 0, 0, 0);
  const n = k => R.filter(r => r.estado === k).length;
  const col = (k, t) => { const L = R.filter(r => r.estado === k); return '<div class="box" style="min-width:0"><h3>' + t + ' · ' + L.length + '</h3>' + (L.length ? '<div class="kb">' + L.slice(0, 40).map(agTarjeta).join('') + '</div>' : '<p class="foot">Sin solicitudes.</p>') + '</div>'; };
  $('agBody').innerHTML =
    '<div class="kpis"><div class="kpi bad"><b>' + n('espera') + '</b><span>esperando técnico</span></div><div class="kpi"><b>' + n('proceso') + '</b><span>en proceso</span></div><div class="kpi warn"><b>' + n('pendiente') + '</b><span>pendientes</span></div><div class="kpi ok"><b>' + n('terminada') + '</b><span>por calificar</span></div><div class="kpi"><b>' + R.filter(r => new Date(r.t0) >= h0).length + '</b><span>solicitudes hoy</span></div></div>' +
    '<div style="display:flex;gap:10px;flex-wrap:wrap"><p class="foot" style="align-self:center">Para mejoras, modificaciones o reparaciones que NO son paro de máquina. Los paros de máquina van en "🛠 Paros de máquina".</p></div>' +
    '<div class="charts">' + col('espera', '🔴 Esperando técnico') + col('proceso', '🧰 En proceso') + col('pendiente', '⏳ Pendientes') + col('terminada', '✅ Terminadas · falta que el usuario libere') + '</div>';
}


// ---------- formulario de reporte (tablero de usuario): qué equipo falla, dónde está y una nota rápida
function agNueva(){ $('agBody').innerHTML = '<div id="agFormU"></div>'; agFormulario($('agFormU')); }
function agFormulario(cont){
  const C = agCats(), E = agEq();
  const grupos = Object.keys(C).map(c => { const L = Object.entries(E).filter(([k, v]) => v.cat === c && v.a !== false).sort((a, b) => a[1].n.localeCompare(b[1].n, 'es')); return L.length ? '<optgroup label="' + esc(C[c]) + '">' + L.map(([k, v]) => '<option value="' + k + '">' + esc(v.n) + '</option>').join('') + '</optgroup>' : ''; }).join('');
  cont.innerHTML = '<form class="box" id="fAgNueva" style="border:2px solid #AD1457"><h3 style="color:#AD1457">➕ Reportar una falla o pedir un trabajo a mantenimiento</h3>' +
    '<div class="g3"><label class="f">1 · ¿Qué equipo o área está fallando? *<select id="agEq"><option value="">— elige —</option>' + grupos + '<option value="otro">Otro (escribir)</option></select></label>' +
    '<label class="f" id="agOtroL" hidden>Nombre del equipo o área *<input id="agOtro" placeholder="ej. bodega de cartón"></label>' +
    '<label class="f">2 · ¿Dónde se ubica la falla? *<select id="agUbicSel"><option value="">— elige —</option>' + AG_UBIC.map(u => '<option>' + u + '</option>').join('') + '<option value="otro">Otro (escribir)</option></select></label>' +
    '<label class="f" id="agUbicL" hidden>Escribe la ubicación *<input id="agUbic" placeholder="ej. bodega de cartón"></label>' +
    '<label class="f">Tipo de trabajo<select id="agTipo">' + AG_TIPOS.map(t => '<option>' + t + '</option>').join('') + '</select></label>' +
    '<label class="f">Prioridad<select id="agPrio">' + Object.keys(AG_PRIO).map(k => '<option value="' + k + '"' + (k === 'media' ? ' selected' : '') + '>' + AG_PRIO[k] + '</option>').join('') + '</select></label></div>' +
    '<label class="f">3 · Notas: explica rápido qué está pasando *<textarea id="agDesc" required placeholder="ej. fuga de agua en el lavabo del baño de hombres; se fundieron 2 lámparas del pasillo; el aire no enfría"></textarea></label>' +
    '<p class="msg" id="agMsg"></p><button class="primary" type="submit" style="padding:14px;font-size:17px;background:#AD1457;border-color:#AD1457">🏢 Enviar a mantenimiento</button></form>';
  const ubic = () => { const k = $('agEq').value; $('agOtroL').hidden = k !== 'otro'; const u = k && k !== 'otro' && E[k] ? AG_UBIC.find(x => norm(x) === norm(E[k].ubic || '')) : ''; if (u && !$('agUbicSel').value) $('agUbicSel').value = u; };
  $('agUbicSel').addEventListener('change', () => { $('agUbicL').hidden = $('agUbicSel').value !== 'otro'; });
  $('agEq').addEventListener('change', ubic);
  $('fAgNueva').addEventListener('submit', async e => {
    e.preventDefault();
    if (!S.sesion) { toast('🔒 Primero entra con tu nómina (botón 👤 Entrar).'); entrar(); return; }
    const k = $('agEq').value, desc = $('agDesc').value.trim(), m = $('agMsg');
    const ub = $('agUbicSel').value === 'otro' ? $('agUbic').value.trim() : $('agUbicSel').value;
    const eqN = k === 'otro' ? $('agOtro').value.trim() : (E[k] && E[k].n);
    if (!eqN || !ub || !desc) { m.className = 'msg err'; m.textContent = 'Falta qué equipo falla, dónde está o la nota.'; return; }
    const p = await pedirNomina('Reporte · ' + eqN, 'agsol', 'Nómina de quien solicita'); if (!p) return; cerrarModal();
    try {
      const nuevo = await db.collection('ag').add({ cat: k !== 'otro' && E[k] ? E[k].cat : 'AG', eq:k, eqN, ubic:ub, tipo:$('agTipo').value, prio:$('agPrio').value, desc, t0:nowIso(), estado:'espera', sol:{ n:p.n, nom:p.nomina }, log:[{ t:nowIso(), por:p.n, txt:'Solicitud creada' }] });
      agEvento({ id:nuevo.id, eqN, ubic:ub, cat:(k !== 'otro' && E[k] ? E[k].cat : 'AG'), estado:'' }, p.n, 'Solicitud creada · ' + $('agPrio').value + ' · ' + desc);
      if (S.ntfy) fetch('https://ntfy.sh/', { method:'POST', body: JSON.stringify({ topic:S.ntfy, title:'🏢 ÁREAS GENERALES · ' + eqN + ' · ' + ub, message: desc.slice(0, 300), priority:4, tags:['office'] }) }).catch(() => {});
      toast('Enviado a mantenimiento. Lo verás en "Mis solicitudes".'); renderAG();
    } catch (er) { m.className = 'msg err'; m.textContent = 'No se pudo enviar (' + (er.code || er.message) + ').'; }
  });
}

// ---------- detalle y acciones
document.addEventListener('click', e => {
  const v = e.target.closest('[data-agver]'); if (v) { const r = agById(v.dataset.agver); if (r) agDetalle(r); return; }
  const a = e.target.closest('[data-agacc]'); if (!a) return;
  if (!S.sesion) { toast('🔒 Primero entra con tu nómina (botón 👤 Entrar).'); entrar(); return; }
  const r = agById(a.dataset.id); if (!r && a.dataset.agacc !== 'mat') return;
  ({ atender:agAtender, pendiente:agPendiente, reanudar:agReanudar, terminar:agTerminar, calificar:agCalificar, continua:agContinua, cerrar:agCerrarAdm, mat:() => agMaterial(a.dataset.id, +a.dataset.i, a.dataset.est) })[a.dataset.agacc]?.(r);
});
// historial: cada acción queda en la solicitud (log) y además como evento aparte en la bitácora (agLog), que no se borra
function agEvento(r, por, txt){ try { db.collection('agLog').add({ t:nowIso(), sol:r.id || '', eqN:r.eqN || '', ubic:r.ubic || '', cat:r.cat || '', antes:r.estado || '', por:por || '', txt }).catch(() => {}); } catch (e) {} }
const agLog = (r, por, txt) => { agEvento(r, por, txt); return [...(r.log || []), { t:nowIso(), por, txt }]; };
function agDetalle(r){
  // botones de mantenimiento (Atender, Terminada, Dejar pendiente, Reanudar): solo mantenimiento y quien tenga el tablero de mantenimiento AG
  const tecOk = S.sesion ? (esMttoAdm(S.sesion) || vistasDe(S.sesion).includes('agmt')) : devArea() === 'mtto', b = [];
  if (tecOk && r.estado === 'espera') b.push('<button class="primary" data-agacc="atender" data-id="' + r.id + '">🧰 Atender · tiempo estimado</button>');
  if (tecOk && r.estado === 'proceso') { b.push('<button class="ok" data-agacc="terminar" data-id="' + r.id + '">✅ Terminada</button>'); b.push('<button class="warn" data-agacc="pendiente" data-id="' + r.id + '">⏳ Dejar pendiente</button>'); }
  if (tecOk && r.estado === 'pendiente') { b.push('<button class="primary" data-agacc="reanudar" data-id="' + r.id + '">▶ Reanudar</button>'); b.push('<button class="warn" data-agacc="pendiente" data-id="' + r.id + '">✏ Actualizar pendiente / materiales</button>'); b.push('<button class="ok" data-agacc="terminar" data-id="' + r.id + '">✅ Terminada</button>'); }
  // liberar: solo quien solicitó; mantenimiento (y administradores) no ven este botón
  if (r.estado === 'terminada' && (!(S.sesion && esMttoAdm(S.sesion)) || esGral(S.sesion))) { b.push('<button class="ok" data-agacc="calificar" data-id="' + r.id + '">✅ Liberar trabajo realizado (quien solicitó o admin. general)</button>'); b.push('<button class="danger" data-agacc="continua" data-id="' + r.id + '">🔁 Continúa la falla</button>'); }
  // el administrador general puede cerrar cualquier solicitud abierta (con motivo)
  if (esGral(S.sesion) && r.estado !== 'cerrada') b.push('<button type="button" data-agacc="cerrar" data-id="' + r.id + '" style="background:#37474F;border-color:#37474F;color:#fff">🔒 Cerrar solicitud (admin. general)</button>');
  const mats = (r.mats || []);
  abrirModal('<div class="mhead" style="background:#AD1457;color:#fff"><div><h2>🏢 ' + esc(r.eqN) + '</h2><p style="color:#fff;opacity:.85">' + esc(AG_EST[r.estado] || r.estado) + ' · ' + esc(r.tipo || '') + ' · ' + esc(agCats()[r.cat] || '') + ' · ' + esc(r.ubic || '') + '</p></div><button type="button" data-close>✕</button></div>' +
    '<div class="box"><p style="margin:0"><b>' + esc(r.desc || '') + '</b></p><p class="foot">Solicitó: ' + esc(r.sol?.n || '') + ' · ' + fdt(r.t0) + (r.prio ? ' · prioridad ' + esc(r.prio) : '') + '</p>' +
    '<div class="times"><div><b>' + agFmtEst(r.est) + '</b><span>tiempo estimado</span></div><div><b>' + (agMin(r) != null ? dur(agMin(r)) : r.tAcept ? '<span data-since="' + esc(r.tAcept) + '">' + hms(ms(r.tAcept)) + '</span>' : '—') + '</b><span>tiempo real</span></div><div><b>' + esc(r.tec?.n?.split(' ').slice(0, 2).join(' ') || '—') + '</b><span>técnico</span></div><div><b>' + (r.enc ? agEstrellas(r.enc.cal) : '—') + '</b><span>calidad</span></div></div>' +
    (r.pend && r.estado === 'pendiente' ? '<div class="banner"><b>Pendiente:</b> ' + esc(r.pend.motivo || '') + ' · fecha compromiso <b>' + esc(r.pend.fecha || 'sin fecha') + '</b><br>' + esc(r.pend.coment || '') + '</div>' : '') +
    (r.solucion ? '<p style="margin:0"><b>Solución:</b> ' + esc(r.solucion) + (r.usados ? '<br><b>Materiales usados:</b> ' + esc(r.usados) : '') + '</p>' : '') +
    (r.cierreAdm ? '<p style="margin:0">🔒 <b>Cerrada por administrador general:</b> ' + esc(r.cierreAdm.n) + ' · ' + esc(r.cierreAdm.motivo) + (r.cierreAdm.com ? ' · ' + esc(r.cierreAdm.com) : '') + ' · ' + fdt(r.cierreAdm.t) + '</p>' : r.lib ? '<p style="margin:0">✅ <b>Liberó:</b> ' + esc(r.lib.n) + ' · nómina ' + esc(r.lib.nom) + ' · ' + fdt(r.lib.t) + '</p>' : '') +
    (r.enc ? '<p style="margin:0"><b>Encuesta:</b> duración ' + esc(r.enc.dur || '') + ' · área limpia: ' + (r.enc.limpia ? 'sí' : 'no') + ' · calidad ' + agEstrellas(r.enc.cal) + (r.enc.com ? ' · "' + esc(r.enc.com) + '"' : '') + '</p>' : '') +
    (mats.length ? '<div><b>Materiales solicitados</b><table class="tbl"><tr><th>Cant.</th><th>Material</th><th>Estado</th></tr>' + mats.map(x => '<tr><td>' + esc(x.c || '') + '</td><td>' + esc(x.d) + '</td><td>' + esc(x.est) + '</td></tr>').join('') + '</table></div>' : '') +
    (b.length ? '<div style="display:flex;flex-wrap:wrap;gap:8px">' + b.join('') + '</div>' + (!tecOk && r.estado !== 'terminada' ? '<p class="foot">Las acciones del técnico piden nómina de mantenimiento.</p>' : '') : '') +
    '<details><summary class="foot">Historial de la solicitud</summary>' + (r.log || []).map(l => '<div class="foot">' + fdt(l.t) + ' · ' + esc(l.por || '') + ' · ' + esc(l.txt) + '</div>').join('') + '</details></div>');
}
async function agAtender(r){
  const p = await pedirNomina('Atender · ' + r.eqN, 'agtec', 'Nómina del técnico'); if (!p) return;
  abrirModal('<div class="mhead" style="background:#AD1457;color:#fff"><div><h2>🧰 Atender · ' + esc(r.eqN) + '</h2><p style="color:#fff;opacity:.85">' + esc(p.n) + ' · ' + esc(r.desc || '') + '</p></div><button type="button" data-close>✕</button></div>' +
    '<form id="fAgAt" class="box"><div class="g2"><label class="f">Tiempo estimado de reparación *<input id="agEstN" type="number" min="1" step="1" required placeholder="ej. 2"></label><label class="f">Unidad<select id="agEstU"><option value="60">horas</option><option value="1">minutos</option><option value="480">días (8 h)</option></select></label></div>' +
    '<label class="f">Comentario (opcional)<input id="agAtCom" placeholder="ej. voy después de la ronda de preventivo"></label><p class="msg" id="agAtMsg"></p><button class="primary" type="submit">Confirmar · empiezo a atender</button></form>');
  $('fAgAt').addEventListener('submit', async e => {
    e.preventDefault(); const est = Math.round((+$('agEstN').value || 0) * (+$('agEstU').value)); if (!est) return;
    try { await db.doc('ag/' + r.id).update({ estado:'proceso', tAcept:r.tAcept || nowIso(), tec:{ n:p.n, nom:p.nomina }, est, log:agLog(r, p.n, 'Atiende · estimado ' + agFmtEst(est) + ($('agAtCom').value.trim() ? ' · ' + $('agAtCom').value.trim() : '')) }); cerrarModal(); toast('Solicitud en proceso · estimado ' + agFmtEst(est) + '.'); }
    catch (er) { $('agAtMsg').className = 'msg err'; $('agAtMsg').textContent = 'No se pudo guardar (' + (er.code || er.message) + ').'; }
  });
}
async function agPendiente(r){
  const p = await pedirNomina('Pendiente · ' + r.eqN, 'agtec', 'Nómina del técnico'); if (!p) return;
  const pe = r.pend || {};
  abrirModal('<div class="mhead" style="background:#C99700;color:#1a1400"><div><h2>⏳ Pendiente · ' + esc(r.eqN) + '</h2><p style="color:#1a1400;opacity:.8">' + esc(p.n) + ' · explica por qué no se termina y qué se necesita</p></div><button type="button" data-close>✕</button></div>' +
    '<form id="fAgPe" class="box"><div class="g2"><label class="f">Motivo *<select id="agPeMot">' + AG_MOTIVOS.map(m => '<option' + (m === pe.motivo ? ' selected' : '') + '>' + m + '</option>').join('') + '</select></label>' +
    '<label class="f">Fecha compromiso de terminado<input id="agPeFe" type="date" value="' + esc(pe.fecha || '') + '"></label></div>' +
    '<label class="f">Avance del trabajo: <b id="agPeAvV">' + (+pe.avance || 0) + ' %</b><input id="agPeAv" type="range" min="0" max="100" step="5" value="' + (+pe.avance || 0) + '"></label>' +
    '<label class="f">Refacciones necesarias para terminar<input id="agPeRef" value="' + esc(pe.refac || '') + '" placeholder="ej. rodamiento 6204 ×2 y tornillería"></label>' +
    '<label class="f">Comentarios del técnico: ¿por qué no se termina? *<textarea id="agPeCom" required>' + esc(pe.coment || '') + '</textarea></label>' +
    '<label class="f">Materiales a solicitar para compra (uno por renglón: cantidad · descripción)<textarea id="agPeMat" placeholder="4 · lámpara LED 18 W&#10;1 · contacto doble 127 V"></textarea></label>' +
    '<p class="msg" id="agPeMsg"></p><button class="warn" type="submit">Guardar pendiente</button></form>');
  $('agPeAv').addEventListener('input', () => { $('agPeAvV').textContent = $('agPeAv').value + ' %'; });
  $('fAgPe').addEventListener('submit', async e => {
    e.preventDefault(); const com = $('agPeCom').value.trim(); if (!com) return;
    const nuevos = $('agPeMat').value.split('\n').map(x => x.trim()).filter(Boolean).map(x => { const m = x.match(/^(\d+(?:[.,]\d+)?)\s*[·xX\-*:]\s*(.+)$/); return { c: m ? m[1] : '', d: m ? m[2].trim() : x, est:'solicitado', t:nowIso(), por:p.n, eq:r.eqN }; });
    try {
      await db.doc('ag/' + r.id).update({ estado:'pendiente', tec: r.tec || { n:p.n, nom:p.nomina }, tAcept: r.tAcept || nowIso(), pend:{ motivo:$('agPeMot').value, fecha:$('agPeFe').value, coment:com, avance:+$('agPeAv').value || 0, refac:$('agPeRef').value.trim(), t:(r.pend && r.pend.t) || nowIso(), tAct:nowIso(), por:p.n }, mats:[...(r.mats || []), ...nuevos], log:agLog(r, p.n, 'Pendiente: ' + $('agPeMot').value + (nuevos.length ? ' · ' + nuevos.length + ' material(es) solicitados' : '')) });
      cerrarModal(); toast('Pendiente guardado.');
    } catch (er) { $('agPeMsg').className = 'msg err'; $('agPeMsg').textContent = 'No se pudo guardar (' + (er.code || er.message) + ').'; }
  });
}
async function agReanudar(r){
  const p = await pedirNomina('Reanudar · ' + r.eqN, 'agtec', 'Nómina del técnico'); if (!p) return;
  try { await db.doc('ag/' + r.id).update({ estado:'proceso', log:agLog(r, p.n, 'Reanuda el trabajo') }); cerrarModal(); toast('Solicitud en proceso.'); } catch (er) { toast('No se pudo guardar (' + (er.code || er.message) + ').'); }
}
async function agTerminar(r){
  const p = await pedirNomina('Terminada · ' + r.eqN, 'agtec', 'Nómina del técnico'); if (!p) return;
  abrirModal('<div class="mhead" style="background:#2E7D32;color:#fff"><div><h2>✅ Terminada · ' + esc(r.eqN) + '</h2><p style="color:#fff;opacity:.85">' + esc(p.n) + ' · ' + esc(r.desc || '') + '</p></div><button type="button" data-close>✕</button></div>' +
    '<form id="fAgTe" class="box"><label class="f">Solución / qué se hizo *<textarea id="agTeSol" required placeholder="ej. se cambiaron 4 lámparas por LED 18 W y se limpió el difusor"></textarea></label>' +
    '<label class="f">Materiales usados<input id="agTeUs" placeholder="ej. 4 lámparas LED 18 W"></label><p class="msg" id="agTeMsg"></p><button class="ok" type="submit">Terminada · avisar a quien solicitó</button></form>');
  $('fAgTe').addEventListener('submit', async e => {
    e.preventDefault(); const sol = $('agTeSol').value.trim(); if (!sol) return;
    try { await db.doc('ag/' + r.id).update({ estado:'terminada', tFin:nowIso(), tAcept: r.tAcept || r.t0, tec: r.tec || { n:p.n, nom:p.nomina }, solucion:sol, usados:$('agTeUs').value.trim(), tecFin:{ n:p.n, nom:p.nomina }, log:agLog(r, p.n, 'Terminada') }); cerrarModal(); toast('Terminada. Falta que quien solicitó califique.'); }
    catch (er) { $('agTeMsg').className = 'msg err'; $('agTeMsg').textContent = 'No se pudo guardar (' + (er.code || er.message) + ').'; }
  });
}
// 🔁 Continúa la falla: quien solicitó (con su nómina) regresa el trabajo a mantenimiento antes de liberarlo;
// vuelve a "esperando técnico" con alarma rosa nueva; lo anterior queda guardado en "ciclos"
// 🔒 cierre directo por el administrador general (cualquier estatus): queda registrado quién, cuándo y por qué
async function agCerrarAdm(r){
  const p = await pedirNomina('Cerrar solicitud · ' + r.eqN, 'config', 'Nómina del administrador general'); if (!p) return;
  if (p.r !== 'general') { cerrarModal(); toast('Solo el administrador general puede cerrar solicitudes.'); return; }
  abrirModal('<div class="mhead" style="background:#37474F;color:#fff"><div><h2>🔒 Cerrar solicitud · ' + esc(r.eqN) + '</h2><p style="color:#fff;opacity:.85">' + esc(p.n) + ' · estatus actual: ' + esc(AG_EST[r.estado] || r.estado) + ' · solicitó ' + esc(r.sol?.n || '') + '</p></div><button type="button" data-close>✕</button></div>' +
    '<form id="fAgCe" class="box"><label class="f">Motivo del cierre *<select id="agCeMot"><option>Trabajo terminado y revisado</option><option>Quien solicitó no está disponible</option><option>Solicitud duplicada</option><option>Ya no aplica / cancelada</option><option>Otro</option></select></label>' +
    '<label class="f">Comentario<input id="agCeCom" placeholder="opcional"></label><p class="msg" id="agCeMsg"></p><button type="submit" style="padding:14px;background:#37474F;border-color:#37474F;color:#fff">🔒 Cerrar solicitud</button></form>');
  $('fAgCe').addEventListener('submit', async e => {
    e.preventDefault(); const mot = $('agCeMot').value, com = $('agCeCom').value.trim();
    try { await db.doc('ag/' + r.id).update({ estado:'cerrada', tCierre:nowIso(), cierreAdm:{ n:p.n, nom:p.nomina, motivo:mot, com, t:nowIso() }, lib:{ n:p.n, nom:p.nomina, t:nowIso(), adm:true }, log:agLog(r, p.n, 'Cerrada por administrador general: ' + mot + (com ? ' · ' + com : '')) }); cerrarModal(); toast('Solicitud cerrada.'); }
    catch (er) { $('agCeMsg').className = 'msg err'; $('agCeMsg').textContent = 'No se pudo cerrar (' + (er.code || er.message) + ').'; }
  });
}
async function agContinua(r){
  const p = await pedirNomina('Continúa la falla · ' + r.eqN, 'agcal', 'Escribe TU nómina (quien solicitó: ' + (r.sol?.n || '') + ', o administrador general)'); if (!p) return;
  if (p.nomina !== r.sol?.nom && p.r !== 'general') { cerrarModal(); toast('Solo quien solicitó (' + (r.sol?.n || '') + ') o el administrador general puede regresar este trabajo.'); return; }
  abrirModal('<div class="mhead bad"><div><h2>🔁 Continúa la falla · ' + esc(r.eqN) + '</h2><p>' + esc(p.n) + ' · solución anterior: ' + esc(r.solucion || '') + '</p></div><button type="button" data-close>✕</button></div>' +
    '<form id="fAgCo" class="box"><label class="f">¿Qué sigue fallando? *<textarea id="agCoNota" required placeholder="ej. sigue goteando el lavabo; una lámpara sigue parpadeando"></textarea></label>' +
    '<p class="msg" id="agCoMsg"></p><button class="danger" type="submit" style="padding:14px;font-size:17px">🔁 Regresar a mantenimiento</button></form>');
  $('agCoNota').focus();
  $('fAgCo').addEventListener('submit', async e => {
    e.preventDefault(); const nota = $('agCoNota').value.trim(); if (!nota) return;
    const ant = { tAcept:r.tAcept || null, tFin:r.tFin || null, est:r.est || null, tec:r.tec || null, tecFin:r.tecFin || null, solucion:r.solucion || '', usados:r.usados || '', nota, por:{ n:p.n, nom:p.nomina }, t:nowIso() };
    try {
      await db.doc('ag/' + r.id).update({ ciclos:[...(r.ciclos || []), ant], estado:'espera', tAlerta:nowIso(), reab:(r.reab || 0) + 1, reabNota:nota, reabTec:(r.tecFin || r.tec)?.n || '', tAcept:null, tFin:null, est:null, tec:null, tecFin:null, solucion:'', usados:'', log:agLog(r, p.n, 'Continúa la falla: ' + nota) });
      cerrarModal(); toast('Se regresó a mantenimiento: la falla continúa.');
    } catch (er) { $('agCoMsg').className = 'msg err'; $('agCoMsg').textContent = 'No se pudo enviar (' + (er.code || er.message) + ').'; }
  });
}
async function agCalificar(r){
  // liberar SOLO lo hace quien solicitó, escribiendo siempre su nómina (mantenimiento no tiene este botón)
  const p = await pedirNomina('Liberar trabajo · ' + r.eqN, 'agcal', 'Escribe TU nómina (quien solicitó: ' + (r.sol?.n || '') + ', o administrador general)'); if (!p) return;
  if (p.nomina !== r.sol?.nom && p.r !== 'general') { cerrarModal(); toast('Solo quien solicitó (' + (r.sol?.n || '') + ') o el administrador general puede liberar este trabajo.'); return; }
  let cal = 0;
  abrirModal('<div class="mhead" style="background:#AD1457;color:#fff"><div><h2>✅ Liberar trabajo · ' + esc(r.eqN) + '</h2><p style="color:#fff;opacity:.85">' + esc(p.n) + ' · solución: ' + esc(r.solucion || '') + '</p></div><button type="button" data-close>✕</button></div>' +
    '<form id="fAgCa" class="box"><label class="f">¿Cuánto tardó la reparación?<select id="agCaDur"><option>Menos de lo estimado</option><option selected>Lo estimado</option><option>Más de lo estimado</option><option>Mucho más de lo estimado</option></select></label>' +
    '<label class="f">¿Se dejó limpia el área?<select id="agCaLim"><option value="1">Sí, quedó limpia</option><option value="0">No, quedó sucia</option></select></label>' +
    '<div class="f"><span style="font-size:13px;color:var(--muted)">Calidad del trabajo *</span><div id="agCaEst" style="font-size:34px;cursor:pointer;color:#C99700">' + [1, 2, 3, 4, 5].map(i => '<span data-cal="' + i + '">☆</span>').join('') + '</div></div>' +
    '<label class="f">Comentario (opcional)<input id="agCaCom"></label><p class="msg" id="agCaMsg"></p>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="ok" type="submit">✅ Liberar · quedó bien</button></div></form>');
  $('agCaEst').addEventListener('click', e => { const s = e.target.closest('[data-cal]'); if (!s) return; cal = +s.dataset.cal; $('agCaEst').querySelectorAll('[data-cal]').forEach(x => x.textContent = +x.dataset.cal <= cal ? '★' : '☆'); });
  $('fAgCa').addEventListener('submit', async e => {
    e.preventDefault(); if (!cal) { $('agCaMsg').className = 'msg err'; $('agCaMsg').textContent = 'Marca la calidad (estrellas).'; return; }
    try { await db.doc('ag/' + r.id).update({ estado:'cerrada', tCierre:nowIso(), lib:{ n:p.n, nom:p.nomina, t:nowIso() }, enc:{ dur:$('agCaDur').value, limpia:$('agCaLim').value === '1', cal, com:$('agCaCom').value.trim(), por:{ n:p.n, nom:p.nomina } }, log:agLog(r, p.n, 'Liberada por ' + p.n + ' (nómina ' + p.nomina + ') · calidad ' + cal + '/5') }); cerrarModal(); toast('Gracias. Solicitud cerrada.'); }
    catch (er) { $('agCaMsg').className = 'msg err'; $('agCaMsg').textContent = 'No se pudo guardar (' + (er.code || er.message) + ').'; }
  });
}
async function agMaterial(id, i, est){
  const r = agById(id); if (!r || !r.mats || !r.mats[i]) return;
  const p = await pedirNomina('Material · ' + r.mats[i].d, 'agmat', 'Nómina de quien actualiza'); if (!p) return; cerrarModal();
  const mats = r.mats.map((x, j) => j === i ? Object.assign({}, x, { est, ['t_' + est]: nowIso(), ['por_' + est]: p.n }) : x);
  try { await db.doc('ag/' + id).update({ mats, log:agLog(r, p.n, 'Material "' + r.mats[i].d + '" → ' + est) }); toast('Material: ' + est + '.'); } catch (er) { toast('No se pudo guardar (' + (er.code || er.message) + ').'); }
}

// ---------- ⏳ PENDIENTES: un renglón por pendiente con barra de avance, equipo, refacciones necesarias y fecha compromiso.
// "OK" = ya quedó corregido → pasa a terminada (con la solución) y sale de la lista.
function agPendientes(){
  const P = S.agReq.filter(r => r.estado === 'pendiente').sort((a, b) => String(a.pend?.fecha || '9999').localeCompare(String(b.pend?.fecha || '9999')));
  const hoy = fday(new Date());
  const M = []; S.agReq.forEach(r => (r.mats || []).forEach((x, i) => { if (x.est !== 'recibido' || r.estado !== 'cerrada') M.push({ r, x, i }); }));
  const porEq = {}; M.forEach(o => { (porEq[o.r.eqN] = porEq[o.r.eqN] || []).push(o); });
  const puedeMat = S.sesion && PUEDE.agmat.includes(S.sesion.r);
  const barra = v => '<div style="display:flex;align-items:center;gap:8px;min-width:150px"><div style="flex:1;height:14px;background:var(--panel2);border-radius:7px;overflow:hidden"><i style="display:block;height:100%;width:' + v + '%;background:' + (v >= 80 ? 'var(--ok)' : v >= 40 ? 'var(--warn)' : 'var(--bad)') + '"></i></div><b class="mono">' + v + ' %</b></div>';
  $('agBody').innerHTML = '<div class="box"><h3>⏳ Pendientes · ' + P.length + '</h3>' + (P.length ? '<div class="scroll"><table class="tbl"><tr><th>Avance</th><th>Equipo · ubicación</th><th>Refacciones necesarias para terminar</th><th>Comentario del técnico</th><th>Fecha compromiso</th><th>Técnico</th><th></th></tr>' +
      P.map(r => { const f = r.pend?.fecha || '', venc = f && f < hoy, v = Math.max(0, Math.min(100, +r.pend?.avance || 0));
        return '<tr><td>' + barra(v) + '</td><td><b>' + esc(r.eqN) + '</b><br><span class="foot">📍 ' + esc(r.ubic || '') + '</span></td><td>' + esc(r.pend?.refac || (r.mats || []).filter(x => x.est !== 'recibido').map(x => (x.c ? x.c + ' · ' : '') + x.d).join(', ') || '—') + '</td><td>' + esc(r.pend?.coment || '') + '</td>' +
          '<td>' + (f ? '<span class="tag ' + (venc ? 'bad' : 'warn') + '">' + esc(f) + (venc ? ' · vencida' : '') + '</span>' : '<span class="tag">sin fecha</span>') + '</td><td>' + esc(r.tec?.n || '') + '</td>' +
          '<td style="white-space:nowrap"><button type="button" data-agacc="pendiente" data-id="' + r.id + '">✏ Actualizar</button> <button type="button" class="ok" data-agacc="terminar" data-id="' + r.id + '">✅ OK</button></td></tr>'; }).join('') + '</table></div>' : '<p class="foot">Sin pendientes. 👍</p>') + '</div>' +
    '<div class="box"><h3>🛒 Materiales solicitados para compra (por equipo)</h3><p class="foot">El técnico los pide al dejar un pendiente; compras / almacén marca cuando se compran y cuando llegan.</p>' +
    (Object.keys(porEq).length ? Object.entries(porEq).map(([eq, L]) => '<div style="margin-top:8px"><b>' + esc(eq) + '</b><div class="scroll"><table class="tbl"><tr><th>Cant.</th><th>Material</th><th>Solicitó (técnico)</th><th>Fecha</th><th>Estado</th><th></th></tr>' +
      L.map(o => '<tr><td>' + esc(o.x.c || '') + '</td><td>' + esc(o.x.d) + '</td><td>' + esc(o.x.por || '') + '</td><td>' + fdt(o.x.t) + '</td><td><span class="tag ' + (o.x.est === 'recibido' ? 'ok' : o.x.est === 'comprado' ? 'warn' : 'bad') + '">' + esc(o.x.est) + '</span></td><td style="white-space:nowrap">' +
        (puedeMat && o.x.est === 'solicitado' ? '<button type="button" data-agacc="mat" data-id="' + o.r.id + '" data-i="' + o.i + '" data-est="comprado">Comprado</button> ' : '') + (puedeMat && o.x.est !== 'recibido' ? '<button type="button" data-agacc="mat" data-id="' + o.r.id + '" data-i="' + o.i + '" data-est="recibido">Recibido</button>' : '') + '</td></tr>').join('') + '</table></div></div>').join('') : '<p class="foot">No hay materiales solicitados.</p>') + '</div>';
}

// ---------- 📚 SOLUCIONES: un renglón por trabajo, ordenado por equipo, con la falla y la solución escrita por el técnico
function agHistorial(){
  const q = norm(S.agQ || '');
  const L = S.agReq.filter(r => r.solucion && (!q || norm(r.eqN + ' ' + r.ubic + ' ' + r.desc + ' ' + r.solucion + ' ' + (r.tec?.n || '') + ' ' + (r.usados || '')).includes(q)))
    .sort((a, b) => a.eqN.localeCompare(b.eqN, 'es') || String(b.tFin || '').localeCompare(String(a.tFin || '')));
  const cuenta = {}; L.forEach(r => { cuenta[r.eqN] = (cuenta[r.eqN] || 0) + 1; });
  $('agBody').innerHTML = '<div class="box" style="flex-direction:row;flex-wrap:wrap;align-items:end"><label class="f" style="flex:1;min-width:240px">Buscar (equipo, falla o solución)<input id="agQ" type="search" value="' + esc(S.agQ || '') + '" placeholder="ej. baños, lámpara, contacto, portón"></label><p class="foot">' + L.length + ' solución(es)</p></div>' +
    '<div class="box"><div class="scroll">' + (L.length ? '<table class="tbl"><tr><th>Equipo</th><th>Ubicación</th><th>Falla (notas del usuario)</th><th>Solución del técnico</th><th>Técnico</th><th>Terminada</th><th>Tiempo real</th><th>Calidad</th></tr>' +
      L.map((r, i) => '<tr data-agver="' + r.id + '" style="cursor:pointer"><td>' + (i === 0 || L[i - 1].eqN !== r.eqN ? '<b>' + esc(r.eqN) + '</b>' + (cuenta[r.eqN] > 1 ? ' <span class="tag warn">' + cuenta[r.eqN] + ' veces</span>' : '') : '<span class="foot">〃</span>') + '</td><td>' + esc(r.ubic || '') + '</td><td>' + esc(r.desc || '') + '</td><td>' + esc(r.solucion) + (r.usados ? '<br><span class="foot">Materiales: ' + esc(r.usados) + '</span>' : '') + '</td><td>' + esc((r.tecFin || r.tec)?.n || '') + '</td><td>' + fdt(r.tFin) + '</td><td class="num">' + (agMin(r) != null ? dur(agMin(r)) : '—') + '</td><td>' + (r.enc ? agEstrellas(r.enc.cal) : '<span class="tag warn">sin liberar</span>') + '</td></tr>').join('') + '</table>' : '<p class="foot">Todavía no hay soluciones registradas.</p>') + '</div></div>' +
    // 📜 bitácora: TODOS los eventos (se graban aparte y no se borran)
    (() => { const EV = (S.agEv || []).filter(x => !q || norm(x.eqN + ' ' + x.ubic + ' ' + x.por + ' ' + x.txt).includes(q));
      return '<div class="box"><h3>📜 Bitácora de eventos · ' + EV.length + '</h3><p class="foot">Cada acción queda grabada: solicitud, atención, pendientes, materiales, terminada, liberada, continúa la falla y cierres.</p><div class="scroll" style="max-height:480px;overflow-y:auto">' +
        (EV.length ? '<table class="tbl"><tr><th>Fecha y hora</th><th>Equipo</th><th>Ubicación</th><th>Evento</th><th>Quién</th></tr>' + EV.slice(0, 500).map(x => '<tr' + (x.sol ? ' data-agver="' + x.sol + '" style="cursor:pointer"' : '') + '><td class="mono">' + fdt(x.t) + '</td><td>' + esc(x.eqN) + '</td><td>' + esc(x.ubic) + '</td><td>' + esc(x.txt) + '</td><td>' + esc(x.por) + '</td></tr>').join('') + '</table>' + (EV.length > 500 ? '<p class="foot">Se muestran los 500 más recientes; el Excel trae todos.</p>' : '') : '<p class="foot">Sin eventos todavía.</p>') + '</div></div>'; })();
  $('agQ').addEventListener('input', e => { S.agQ = e.target.value; const pos = e.target.selectionStart; agHistorial(); const i = $('agQ'); i.focus(); i.setSelectionRange(pos, pos); });
}

// ---------- 📊 GRÁFICAS por día, semana, mes y año
function agGraficas(){
  const R = S.agReq, per = S.agPer || 'dia', h0 = new Date(); h0.setHours(0, 0, 0, 0);
  const fin = R.filter(r => r.tFin), cer = R.filter(r => r.enc);
  const avg = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : null;
  const tProm = avg(fin.map(agMin).filter(x => x != null)), calProm = avg(cer.map(r => r.enc.cal));
  const enEst = fin.filter(r => r.est && agMin(r) != null);
  const pctEst = enEst.length ? enEst.filter(r => agMin(r) <= r.est * 60000).length / enEst.length * 100 : null;
  const nom = { dia:'por día (30 días)', sem:'por semana (12 semanas)', mes:'por mes (12 meses)', anio:'por año' }[per];
  $('agBody').innerHTML = '<div class="box" style="flex-direction:row;flex-wrap:wrap;align-items:center;gap:12px"><div class="seg" id="agPerSeg">' + [['dia', 'Por día'], ['sem', 'Por semana'], ['mes', 'Por mes'], ['anio', 'Por año']].map(([k, t]) => '<button type="button" data-agper="' + k + '" aria-pressed="' + (k === per) + '">' + t + '</button>').join('') + '</div><button type="button" class="primary" data-agxls style="margin-left:auto">⬇ Descargar Excel (gráficas y estadísticas)</button></div>' +
    agCajaArchivo() +
    '<div class="kpis"><div class="kpi"><b>' + R.filter(r => r.tFin && new Date(r.tFin) >= h0).length + '</b><span>reparaciones terminadas hoy</span></div><div class="kpi"><b>' + dur(tProm) + '</b><span>tiempo promedio de reparación</span></div><div class="kpi ok"><b>' + (pctEst == null ? '—' : Math.round(pctEst) + ' %') + '</b><span>terminadas dentro del tiempo estimado</span></div><div class="kpi warn"><b>' + (calProm == null ? '—' : calProm.toFixed(1) + ' / 5') + '</b><span>calidad promedio (encuesta)</span></div><div class="kpi"><b>' + (cer.length ? Math.round(cer.filter(r => r.enc.limpia).length / cer.length * 100) + ' %' : '—') + '</b><span>áreas que quedaron limpias</span></div></div>' +
    '<div class="charts"><div class="box"><h3>Reparaciones terminadas ' + nom + '</h3><div id="agG1"></div></div><div class="box"><h3>Solicitudes recibidas ' + nom + '</h3><div id="agG0"></div></div>' +
    '<div class="box"><h3>Tiempo promedio de reparación ' + nom + ' (min)</h3><div id="agG2"></div></div><div class="box"><h3>Estatus de las solicitudes</h3><div id="agG3"></div></div>' +
    '<div class="box"><h3>Solicitudes por categoría</h3><div id="agG4"></div></div><div class="box"><h3>Rendimiento por técnico · reparaciones terminadas</h3><div id="agG5"></div></div>' +
    '<div class="box"><h3>Rendimiento por técnico · tiempo promedio</h3><div id="agG6"></div></div><div class="box"><h3>Rendimiento por técnico · calidad promedio (1 a 5)</h3><div id="agG7"></div></div>' +
    '<div class="box" style="grid-column:1 / -1"><h3>Rendimiento por técnico · % dentro del estimado</h3><div id="agG8"></div></div></div>';
  const C0 = cubetas(per), en = (r, f, c) => r[f] && new Date(r[f]) >= c.a && new Date(r[f]) < c.b;
  vchart('agG1', C0.map(c => ({ l:c.l, v:fin.filter(r => en(r, 'tFin', c)).length, t:c.k })), v => v + ' rep.');
  vchart('agG0', C0.map(c => ({ l:c.l, v:R.filter(r => en(r, 't0', c)).length, t:c.k })), v => v + ' sol.');
  vchart('agG2', C0.map(c => { const L = fin.filter(r => en(r, 'tFin', c)).map(agMin).filter(x => x != null); return { l:c.l, v:L.length ? Math.round(avg(L) / 60000) : 0, t:L.length + ' reparaciones' }; }), v => v + ' min');
  barras('agG3', Object.keys(AG_EST).map(k => ({ l:AG_EST[k], v:R.filter(r => r.estado === k).length })), v => v + '');
  const C = agCats(); barras('agG4', Object.keys(C).map(k => ({ l:C[k], v:R.filter(r => r.cat === k).length })).filter(x => x.v).sort((a, b) => b.v - a.v), v => v + '');
  const T = {}; fin.forEach(r => { const n = (r.tecFin || r.tec)?.n; if (!n) return; const o = T[n] = T[n] || { n:0, t:[], cal:[], ok:0, conEst:0 }; o.n++; const m = agMin(r); if (m != null) o.t.push(m); if (r.enc) o.cal.push(r.enc.cal); if (r.est && m != null) { o.conEst++; if (m <= r.est * 60000) o.ok++; } });
  const E = Object.entries(T);
  barras('agG5', E.map(([l, o]) => ({ l, v:o.n })).sort((a, b) => b.v - a.v), v => v + ' rep.');
  barras('agG6', E.filter(([l, o]) => o.t.length).map(([l, o]) => ({ l, v:avg(o.t) })).sort((a, b) => a.v - b.v), dur);
  barras('agG7', E.filter(([l, o]) => o.cal.length).map(([l, o]) => ({ l, v:avg(o.cal) })).sort((a, b) => b.v - a.v), v => v.toFixed(1), '#C99700');
  barras('agG8', E.filter(([l, o]) => o.conEst).map(([l, o]) => ({ l, v:o.ok / o.conEst * 100, t:o.conEst + ' con estimado' })).sort((a, b) => b.v - a.v), v => Math.round(v) + ' %', 'var(--ok)');
}
document.addEventListener('click', e => { const b = e.target.closest('[data-agper]'); if (b) { S.agPer = b.dataset.agper; agGraficas(); } });

// ---------- ⚙ EQUIPOS (solo administradores): un renglón por equipo; "Dar de baja" lo quita de la lista para nuevos
// reportes, pero sus trabajos se quedan en el historial
function agEquipos(){
  const C = agCats(), E = agEq();
  const usos = {}; S.agReq.forEach(r => { usos[r.eq] = (usos[r.eq] || 0) + 1; });
  $('agBody').innerHTML = '<form class="box" id="fAgEq"><h3>Agregar o actualizar equipo / área</h3><p class="foot">Nombre corto y su ubicación en planta u oficina. Para cambiar uno existente, toca "Editar".</p>' +
    '<div class="g3"><label class="f">Nombre corto *<input id="agEqN" required placeholder="ej. Aire acondicionado compras"></label><label class="f">Categoría<select id="agEqC">' + Object.keys(C).map(k => '<option value="' + k + '">' + esc(C[k]) + '</option>').join('') + '</select></label><label class="f">Ubicación<input id="agEqU" list="agUbicList2" placeholder="ej. Oficina · 2º piso"><datalist id="agUbicList2">' + agUbicaciones().map(u => '<option value="' + esc(u) + '">').join('') + '</datalist></label></div>' +
    '<input type="hidden" id="agEqId"><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><button class="primary" type="submit">Guardar equipo</button><p class="msg" id="agEqMsg"></p></div></form>' +
    '<div class="box"><h3>Equipos y áreas · ' + Object.values(E).filter(v => v.a !== false).length + ' activos</h3><div class="scroll"><table class="tbl"><tr><th>Equipo</th><th>Categoría</th><th>Ubicación</th><th>Trabajos en historial</th><th>Estado</th><th></th></tr>' +
    Object.entries(E).sort((a, b) => (a[1].a === false) - (b[1].a === false) || (a[1].cat || '').localeCompare(b[1].cat || '') || a[1].n.localeCompare(b[1].n, 'es')).map(([k, v]) => '<tr' + (v.a === false ? ' style="opacity:.6"' : '') + '><td>' + esc(v.n) + '</td><td>' + esc(C[v.cat] || v.cat) + '</td><td>' + esc(v.ubic || '') + '</td><td class="num">' + (usos[k] || 0) + '</td><td>' + (v.a === false ? '<span class="tag bad">Dado de baja' + (v.baja ? ' · ' + fdt(v.baja.t) : '') + '</span>' : '<span class="tag ok">Activo</span>') + '</td><td style="white-space:nowrap"><button type="button" data-ageqed="' + k + '">Editar</button> <button type="button" ' + (v.a === false ? '' : 'class="danger" ') + 'data-ageqact="' + k + '">' + (v.a === false ? '↩ Reactivar' : '⬇ Dar de baja') + '</button></td></tr>').join('') + '</table></div><p class="foot">Un equipo dado de baja ya no aparece para nuevos reportes, pero sus trabajos y soluciones se quedan en el historial.</p></div>';
  $('fAgEq').addEventListener('submit', async e => {
    e.preventDefault(); const n = $('agEqN').value.trim(); if (!n) return;
    const id = $('agEqId').value || ('e' + Date.now().toString(36));
    const eq = Object.assign({}, agEq()); eq[id] = Object.assign({}, eq[id] || {}, { n, cat:$('agEqC').value, ubic:$('agEqU').value.trim(), a: eq[id] ? eq[id].a !== false : true });
    if (await agGuardarCfg({ cats:agCats(), eq })) { $('agEqMsg').className = 'msg okm'; $('agEqMsg').textContent = 'Guardado: ' + n; }
  });
}
async function agGuardarCfg(d){ try { await db.doc('config/ag').set(d); toast('Equipos de áreas generales guardados.'); return true; } catch (er) { toast('No se pudo guardar (' + (er.code || er.message) + ').'); return false; } }
document.addEventListener('click', async e => {
  const ed = e.target.closest('[data-ageqed]'); if (ed) { const v = agEq()[ed.dataset.ageqed]; $('agEqN').value = v.n; $('agEqC').value = v.cat; $('agEqU').value = v.ubic || ''; $('agEqId').value = ed.dataset.ageqed; $('agEqN').focus(); return; }
  const ac = e.target.closest('[data-ageqact]'); if (ac) {
    const eq = Object.assign({}, agEq()), k = ac.dataset.ageqact, baja = eq[k].a !== false;
    eq[k] = Object.assign({}, eq[k], { a: !baja, baja: baja ? { t:nowIso(), por:S.sesion ? S.sesion.n : '' } : null });
    agGuardarCfg({ cats:agCats(), eq });
  }
});

// ---------- 📦 ARCHIVO MENSUAL: descarga en Excel todo un mes para guardarlo; al marcarlo queda registrado
const agMesAnterior = () => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
const agNomMes = k => { const [a, m] = k.split('-'); return ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'][+m - 1] + ' ' + a; };
function agCajaArchivo(){
  const adm = !!S.sesion && esAdm(S.sesion), A = S.agArch || {}, meses = Object.keys(A).sort().reverse();
  return '<div class="box"><h3>📦 Archivo mensual</h3><p class="foot">Descarga en un Excel todo lo de un mes: solicitudes, soluciones, pendientes, materiales, bitácora de eventos, gráficas y promedios. Al guardar puedes elegir la carpeta (en Edge o Chrome). Los datos se quedan también en el sistema.</p>' +
    '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:end"><label class="f">Mes<input type="month" id="agArchMes" value="' + agMesAnterior() + '"></label><button type="button" data-agarch="bajar">⬇ Descargar archivo del mes</button>' +
    (adm ? '<button type="button" class="primary" data-agarch="marcar">📦 Descargar y marcar mes como archivado</button>' : '') + '</div>' +
    (meses.length ? '<div class="scroll"><table class="tbl"><tr><th>Mes archivado</th><th>Solicitudes</th><th>Archivó</th><th>Fecha</th><th></th></tr>' + meses.map(k => '<tr><td><b>' + agNomMes(k) + '</b></td><td class="num">' + (A[k].n || 0) + '</td><td>' + esc(A[k].por || '') + '</td><td>' + fdt(A[k].t) + '</td><td><button type="button" data-agarch="rebajar" data-mes="' + k + '">⬇ Volver a descargar</button></td></tr>').join('') + '</table></div>' : '<p class="foot">Todavía no hay meses archivados.</p>') + '</div>';
}
document.addEventListener('click', async e => {
  if (e.target.closest('[data-agxls]')) { agExcel(null); return; }
  const b = e.target.closest('[data-agarch]'); if (!b) return;
  const mes = b.dataset.mes || ($('agArchMes') && $('agArchMes').value); if (!mes) { toast('Elige el mes.'); return; }
  const n = S.agReq.filter(r => (r.t0 || '').slice(0, 7) === mes).length;
  const ok = await agExcel(mes);
  if (ok && b.dataset.agarch === 'marcar') {
    if (!(S.sesion && esAdm(S.sesion))) { toast('Solo administradores marcan meses archivados.'); return; }
    const A = Object.assign({}, S.agArch || {}); A[mes] = { t:nowIso(), por:S.sesion.n, n };
    try { await db.doc('config/agArchivo').set({ meses:A }); agEvento({ id:'', eqN:'(archivo)', ubic:'', cat:'' }, S.sesion.n, 'Mes archivado: ' + agNomMes(mes) + ' · ' + n + ' solicitudes'); toast(agNomMes(mes) + ' archivado.'); }
    catch (er) { toast('Se descargó, pero no se pudo marcar (' + (er.code || er.message) + ').'); }
  }
});

// ---------- ⬇ EXCEL de áreas generales: gráficas, estadísticas, promedios por categoría y por técnico,
// equipos con más fallas recurrentes, solicitudes, pendientes, materiales y bitácora. mes = 'AAAA-MM' o null (todo)
async function agExcel(mes){
  if (!window.ExcelJS) { toast('No se pudo cargar el generador de Excel. Revisa la conexión.'); return false; }
  toast('Generando Excel de áreas generales…');
  const enMes = f => !mes || (f || '').slice(0, 7) === mes;
  const R = S.agReq.filter(r => enMes(r.t0)), EV = (S.agEv || []).filter(x => enMes(x.t));
  const C = agCats(), avg = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : null, r1 = v => v == null ? '' : Math.round(v * 10) / 10;
  const minR = r => { const m = agMin(r); return m == null ? null : m / 60000; };
  const fin = R.filter(r => r.tFin), cer = R.filter(r => r.enc);
  const wb = new ExcelJS.Workbook(); wb.creator = 'Mantenimiento Línea Italia · Áreas generales';
  const ROSA = 'FFAD1457', GRIS = 'FFF6F0F3';
  const hoja = (name, headers, rows, widths, titulo) => {
    const ws = wb.addWorksheet(name, { views:[{ state:'frozen', ySplit: titulo ? 3 : 1 }] });
    const r0 = titulo ? 3 : 1;
    if (titulo) { ws.getCell('A1').value = titulo; ws.getCell('A1').font = { bold:true, size:14, color:{ argb:ROSA } }; ws.getCell('A2').value = 'Línea Italia · Mantenimiento · ' + (mes ? 'Mes: ' + agNomMes(mes) : 'Todo el historial') + ' · generado ' + new Date().toLocaleString('es-MX'); ws.getCell('A2').font = { italic:true, color:{ argb:'FF5C6A62' } }; }
    const hr = ws.getRow(r0); headers.forEach((h, i) => { const c = hr.getCell(i + 1); c.value = h; c.font = { bold:true, color:{ argb:'FFFFFFFF' } }; c.fill = { type:'pattern', pattern:'solid', fgColor:{ argb:ROSA } }; c.alignment = { vertical:'middle', wrapText:true }; }); hr.height = 30;
    rows.forEach((r, j) => { const row = ws.getRow(r0 + 1 + j); r.forEach((v, i) => { const c = row.getCell(i + 1); c.value = v; c.alignment = { vertical:'top', wrapText:true }; if (j % 2) c.fill = { type:'pattern', pattern:'solid', fgColor:{ argb:GRIS } }; }); });
    widths.forEach((w, i) => ws.getColumn(i + 1).width = w);
    if (rows.length) ws.autoFilter = { from:{ row:r0, column:1 }, to:{ row:r0, column:headers.length } };
    return ws;
  };
  const img = (ws, cfg, row, col = 0, w = 900, h = 400) => { const id = wb.addImage({ base64: chartPng(cfg), extension:'png' }); ws.addImage(id, { tl:{ col, row }, ext:{ width:w, height:h } }); };
  const estad = L => { const f = L.filter(r => r.tFin), c = L.filter(r => r.enc), e = f.filter(r => r.est && agMin(r) != null);
    return { n:L.length, fin:f.length, abiertas:L.filter(r => r.estado !== 'cerrada' && r.estado !== 'terminada').length, tprom:r1(avg(f.map(minR).filter(x => x != null))), cal:r1(avg(c.map(r => r.enc.cal))), pctEst: e.length ? Math.round(e.filter(r => agMin(r) <= r.est * 60000).length / e.length * 100) : '', limpia: c.length ? Math.round(c.filter(r => r.enc.limpia).length / c.length * 100) : '', cont:L.reduce((s, r) => s + (r.reab || 0), 0) }; };

  // RESUMEN
  const E0 = estad(R);
  let ws = hoja('Resumen', ['Indicador', 'Valor'], [
    ['Solicitudes recibidas', E0.n], ['Reparaciones terminadas', E0.fin], ['Abiertas (esperando / en proceso / pendientes)', E0.abiertas],
    ['Tiempo promedio de reparación (min)', E0.tprom], ['% terminadas dentro del tiempo estimado', E0.pctEst === '' ? '' : E0.pctEst + ' %'],
    ['Calidad promedio (encuesta, 1 a 5)', E0.cal], ['% áreas que quedaron limpias', E0.limpia === '' ? '' : E0.limpia + ' %'], ['Veces que "continúa la falla"', E0.cont],
    ...Object.keys(AG_EST).map(k => ['Estatus · ' + AG_EST[k], R.filter(r => r.estado === k).length])
  ], [46, 18], 'RESUMEN · ÁREAS GENERALES');
  img(ws, { title:'Solicitudes por estatus', labels:Object.keys(AG_EST).map(k => AG_EST[k]), series:[{ name:'Solicitudes', color:'#AD1457', values:Object.keys(AG_EST).map(k => R.filter(r => r.estado === k).length) }], horizontal:true, w:900, h:300 }, 22, 0, 760, 260);

  // POR PERIODO (día, semana, mes, año)
  const per = (p, t) => { const cs = cubetas(p); const rows = cs.map(c => { const sol = R.filter(r => r.t0 && new Date(r.t0) >= c.a && new Date(r.t0) < c.b), f = R.filter(r => r.tFin && new Date(r.tFin) >= c.a && new Date(r.tFin) < c.b); return [c.k, sol.length, f.length, r1(avg(f.map(minR).filter(x => x != null))), r1(avg(f.filter(r => r.enc).map(r => r.enc.cal)))]; });
    const w = hoja(t, ['Periodo', 'Solicitudes', 'Terminadas', 'Tiempo prom. reparación (min)', 'Calidad prom.'], rows, [26, 13, 13, 18, 13], 'ÁREAS GENERALES · ' + t.toUpperCase());
    img(w, { title:'Solicitudes y terminadas · ' + t.toLowerCase(), labels:cs.map(c => c.l), series:[{ name:'Solicitudes', color:'#AD1457', values:rows.map(r => r[1]) }, { name:'Terminadas', color:'#2E7D32', values:rows.map(r => r[2]) }] }, rows.length + 5, 0, 900, 380); };
  if (mes) per('dia', 'Por día'); else { per('dia', 'Por día'); per('sem', 'Por semana'); per('mes', 'Por mes'); per('anio', 'Por año'); }

  // PROMEDIOS POR CATEGORÍA
  const filasCat = Object.keys(C).map(k => { const s = estad(R.filter(r => r.cat === k)); return [C[k], s.n, s.fin, s.abiertas, s.tprom, s.cal, s.pctEst, s.limpia, s.cont]; });
  ws = hoja('Por categoría', ['Categoría', 'Solicitudes', 'Terminadas', 'Abiertas', 'Tiempo prom. (min)', 'Calidad prom.', '% dentro del estimado', '% área limpia', 'Continúa la falla'], filasCat, [28, 12, 12, 10, 16, 12, 16, 12, 14], 'PROMEDIOS POR CATEGORÍA');
  img(ws, { title:'Solicitudes por categoría', labels:filasCat.map(f => f[0]), series:[{ name:'Solicitudes', color:'#AD1457', values:filasCat.map(f => f[1]) }], horizontal:true, w:900, h:360 }, filasCat.length + 5, 0, 760, 320);

  // PROMEDIOS POR TÉCNICO
  const T = {}; R.forEach(r => { const n = (r.tecFin || r.tec)?.n; if (n) (T[n] = T[n] || []).push(r); (r.ciclos || []).forEach(c => { const m = (c.tecFin || c.tec)?.n; if (m) { (T[m] = T[m] || []); } }); });
  const filasTec = Object.entries(T).map(([n, L]) => { const s = estad(L); const reab = R.filter(r => (r.ciclos || []).some(c => (c.tecFin || c.tec)?.n === n)).length; return [n, s.n, s.fin, s.tprom, s.cal, s.pctEst, s.limpia, reab]; }).sort((a, b) => b[2] - a[2]);
  ws = hoja('Por técnico', ['Técnico', 'Atendidas', 'Terminadas', 'Tiempo prom. (min)', 'Calidad prom.', '% dentro del estimado', '% área limpia', 'Le regresaron (continúa la falla)'], filasTec, [30, 12, 12, 16, 12, 16, 12, 18], 'RENDIMIENTO POR TÉCNICO');
  if (filasTec.length) img(ws, { title:'Reparaciones terminadas por técnico', labels:filasTec.map(f => f[0]), series:[{ name:'Terminadas', color:'#2E7D32', values:filasTec.map(f => f[2]) }], horizontal:true, w:900, h:340 }, filasTec.length + 5, 0, 760, 300);

  // EQUIPOS CON MÁS FALLAS RECURRENTES
  const Q = {}; R.forEach(r => { const k = r.eqN + '|' + (r.ubic || ''); (Q[k] = Q[k] || []).push(r); });
  const filasEq = Object.entries(Q).map(([k, L]) => { const [eq, ub] = k.split('|'); const ult = L.slice().sort((a, b) => (b.t0 || '').localeCompare(a.t0 || ''))[0]; return [eq, ub, C[L[0].cat] || L[0].cat || '', L.length, L.reduce((s, r) => s + (r.reab || 0), 0), L.length + L.reduce((s, r) => s + (r.reab || 0), 0), fdt(ult.t0), [...new Set(L.map(r => r.solucion).filter(Boolean))].join(' | ')]; }).sort((a, b) => b[5] - a[5]);
  ws = hoja('Equipos recurrentes', ['Equipo', 'Ubicación', 'Categoría', 'Solicitudes', 'Continúa la falla', 'Total de fallas', 'Última', 'Soluciones aplicadas'], filasEq, [28, 24, 22, 12, 14, 12, 16, 60], 'EQUIPOS CON MÁS FALLAS RECURRENTES');
  const top = filasEq.slice(0, 15); if (top.length) img(ws, { title:'Equipos con más fallas (top ' + top.length + ')', labels:top.map(f => f[0] + ' · ' + f[1]), series:[{ name:'Fallas', color:'#C62828', values:top.map(f => f[5]) }], horizontal:true, w:1000, h:Math.max(260, top.length * 34 + 100) }, filasEq.length + 5, 0, 860, Math.max(240, top.length * 30 + 90));

  // DETALLE
  hoja('Solicitudes', ['Fecha', 'Equipo', 'Ubicación', 'Categoría', 'Tipo', 'Prioridad', 'Notas (falla)', 'Solicitó', 'Nómina', 'Estatus', 'Técnico', 'Estimado (min)', 'Real (min)', 'Solución', 'Materiales usados', 'Continúa la falla', 'Liberó', 'Calidad', 'Área limpia', 'Duración (encuesta)', 'Cierre admin.'],
    R.map(r => [fdt(r.t0), r.eqN, r.ubic || '', C[r.cat] || r.cat || '', r.tipo || '', r.prio || '', r.desc || '', r.sol?.n || '', r.sol?.nom || '', AG_EST[r.estado] || r.estado, (r.tecFin || r.tec)?.n || '', r.est || '', r1(minR(r)), r.solucion || '', r.usados || '', r.reab || 0, r.lib?.n || '', r.enc?.cal || '', r.enc ? (r.enc.limpia ? 'Sí' : 'No') : '', r.enc?.dur || '', r.cierreAdm ? r.cierreAdm.n + ' · ' + r.cierreAdm.motivo : '']),
    [16, 24, 20, 18, 22, 10, 40, 22, 10, 18, 22, 11, 10, 40, 24, 10, 20, 9, 9, 18, 26], 'SOLICITUDES DE ÁREAS GENERALES');
  hoja('Pendientes', ['Equipo', 'Ubicación', 'Técnico', 'Avance %', 'Motivo', 'Refacciones necesarias', 'Comentario', 'Fecha compromiso'],
    R.filter(r => r.estado === 'pendiente').map(r => [r.eqN, r.ubic || '', r.tec?.n || '', +r.pend?.avance || 0, r.pend?.motivo || '', r.pend?.refac || '', r.pend?.coment || '', r.pend?.fecha || '']), [24, 20, 22, 10, 22, 30, 40, 14], 'PENDIENTES');
  const M = []; R.forEach(r => (r.mats || []).forEach(x => M.push([r.eqN, r.ubic || '', x.c || '', x.d, x.por || '', fdt(x.t), x.est])));
  hoja('Materiales', ['Equipo', 'Ubicación', 'Cantidad', 'Material', 'Solicitó (técnico)', 'Fecha', 'Estado'], M, [24, 20, 10, 40, 22, 16, 12], 'MATERIALES SOLICITADOS PARA COMPRA');
  hoja('Bitácora de eventos', ['Fecha y hora', 'Equipo', 'Ubicación', 'Evento', 'Quién', 'Estatus antes'],
    EV.slice().sort((a, b) => (a.t || '').localeCompare(b.t || '')).map(x => [fdt(x.t), x.eqN || '', x.ubic || '', x.txt || '', x.por || '', AG_EST[x.antes] || x.antes || '']), [18, 24, 20, 60, 22, 18], 'BITÁCORA DE EVENTOS');

  const buf = await wb.xlsx.writeBuffer();
  const nombre = 'Areas generales ' + (mes ? 'archivo ' + mes : 'estadisticas ' + fday(new Date())) + '.xlsx';
  try { const dl = await window.claude.use('downloads'); if (!dl) { toast('La descarga no está disponible.'); return false; } await dl.save({ filename:nombre, data:new Blob([buf]) }); toast('Excel guardado: ' + nombre); return true; }
  catch (er) { if (er && er.code !== 'declined') toast('No se pudo descargar (' + (er.code || er.message) + ').'); return false; }
}

// estilo de la alarma rosa
(() => { const st = document.createElement('style'); st.textContent = '@keyframes parpadeoAG{0%,100%{background:#D81B60}50%{background:#880E4F}} .alerta.ag{animation:parpadeoAG 1.2s infinite}' +
  ' .alerta.multi{background:#1C1F1E;animation:none;justify-content:flex-start;overflow-y:auto;padding:16px}' +
  ' .alerta .agrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;width:100%;max-width:1500px}' +
  ' .apanel{border-radius:14px;padding:18px;display:flex;flex-direction:column;gap:8px;text-align:center;align-items:center;color:#fff;font-size:clamp(15px,1.6vw,20px)}' +
  ' .apanel .pt{font-weight:800;letter-spacing:.04em;font-size:clamp(16px,2vw,24px)} .apanel .pn{font-weight:800;font-size:clamp(22px,3vw,40px);line-height:1.1}' +
  ' .apanel .pti{font-family:"IBM Plex Mono",monospace;font-size:clamp(28px,4vw,54px);font-weight:700} .apanel .pf{font-size:13px;opacity:.9}' +
  ' .apanel.maq{animation:parpadeo 1.2s infinite} .apanel.pru{animation:parpadeoP 1.2s infinite} .apanel.agp{animation:parpadeoAG 1.2s infinite}' +
  ' .alerta .apie{display:flex;gap:12px;flex-wrap:wrap;justify-content:center}'; document.head.appendChild(st); })();
render();
