/* Áreas generales · Control de Paros · Mantenimiento Línea Italia
 * Solicitudes que NO son paro de máquina: mejoras, modificaciones, acondicionamientos y reparaciones
 * de equipos de áreas generales, oficinas y edificio. Datos en apps/paros/ag (solicitudes) y apps/paros/config/ag (equipos).
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
const AG_UBIC = ['Planta', 'CEDIS', 'Edificio', 'Comedor', 'Baños', 'Oficina', 'Escaleras', 'Jardín', 'Estacionamiento'];
const AG_EST = { espera:'Esperando técnico', proceso:'En proceso', pendiente:'Pendiente', terminada:'Terminada · por calificar', cerrada:'Cerrada' };
const AG_MOTIVOS = ['Falta refacción / material', 'Esperando compra', 'Requiere contratista', 'Requiere paro del área', 'Requiere autorización', 'Otro'];

S.agReq = S.agReq || []; S.agCfg = S.agCfg || null; S.agt = S.agt || 'tab'; S.agQ = ''; S.agPer = S.agPer || 'dia';
const agCats = () => Object.assign({}, AG_CATS_DEF, (S.agCfg && S.agCfg.cats) || {});
const agEq = () => (S.agCfg && S.agCfg.eq && Object.keys(S.agCfg.eq).length) ? S.agCfg.eq : AG_EQ_DEF;
// dibujo QUIETO (sin animación) para listas y tarjetas: en tabletas sencillas muchas animaciones juntas saturan la pantalla
const agQ = k => ((window.ICON_R && ICON_R[k]) || '').replace(/<animate(Transform)?\b[^>]*\/>/g, '');
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
// los requerimientos (proyectos con compra de material) no son urgentes: no lanzan la alarma rosa
const agEsp = () => S.agReq.filter(r => r.estado === 'espera' && !r.req).sort((a, b) => (a.t0 || '').localeCompare(b.t0 || ''));
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
  // mantenimiento ve SOLO su tablero; el de usuario únicamente si un administrador se lo marcó en ⚙ Configuración → Personal
  const usrOk = !!p && Array.isArray(p.vis) && p.vis.includes('ag');
  return { usr: adm || !mt || usrOk, tab: mt, pend: mat, hist: mt, req: mt, graf: mt, eq: adm };
}
function renderAG(){
  const ok = agPestanas();
  if (!ok[S.agt]) S.agt = ok.usr && !(S.sesion ? esMttoAdm(S.sesion) : devArea() === 'mtto') ? 'usr' : (Object.keys(ok).find(k => ok[k]) || 'usr');
  document.querySelectorAll('#agTabs button').forEach(b => { b.setAttribute('aria-selected', b.dataset.agt === S.agt); b.hidden = !ok[b.dataset.agt]; });
  ({ usr:agUsuario, tab:agTablero, nueva:agNueva, pend:agPendientes, hist:agHistorial, req:agRequerimientos, graf:agGraficas, eq:agEquipos })[S.agt]();
}

// ---------- 👤 TABLERO DE USUARIO · PRUEBA MASTER
// dos recuadros: 🔧 Reportar una falla (rápido, avisa al momento) y 📐 Requerimiento (proyecto o mejora que necesita
// comprar material: croquis en foto, qué se tiene que realizar y fecha más amplia). Abajo: por confirmar y mis solicitudes con su avance.
const agIlu = k => '<svg viewBox="0 0 120 100" aria-hidden="true">' + agQ(k) + '</svg>';
// avance de una solicitud en 4 pasos (Enviada → Atendiendo → Terminada → Liberada)
function agAvance(r){
  const n = { espera:0, proceso:1, pendiente:1, terminada:2, cerrada:3 }[r.estado] || 0;
  const P = r.req ? ['Enviado', r.estado === 'pendiente' ? 'Comprando material' : 'En proyecto', 'Terminado', 'Liberado'] : ['Enviada', r.estado === 'pendiente' ? 'Pendiente' : 'Atendiendo', 'Terminada', 'Liberada'];
  return '<div class="agAv">' + P.map((t, i) => '<span class="' + (i < n ? 'ok' : i === n ? 'now' : '') + '"><i>' + (i < n ? '✓' : i + 1) + '</i>' + t + '</span>').join('') + '</div>';
}
function agUsuario(){
  const p = S.sesion, adm = !!p && esAdm(p);
  const mias = !p ? [] : S.agReq.filter(r => adm || r.sol?.nom === p.nomina);
  const abiertas = mias.filter(r => r.estado !== 'cerrada'), porLiberar = mias.filter(r => r.estado === 'terminada');
  S.agModo = S.agModo || 'falla';
  const tarj = r => '<button type="button" class="agMia' + (r.req ? ' req' : '') + '" data-agver="' + r.id + '">' +
    '<div class="agMiaI">' + agIlu(r.req ? 'ag' : (AG_GRUPOS.find(g => g.k === r.cat) || AG_GRUPOS.find(g => r.cat === 'MTA' || r.cat === 'MTB' ? g.k === 'maq' : g.k === 'AG') || {}).ic || 'ag') + '</div>' +
    '<div class="agMiaT"><span class="agMiaK">' + (r.req ? '📐 Requerimiento' : '🔧 Falla') + '</span><b>' + esc(r.eqN) + '</b><small>📍 ' + esc(r.ubic || '') + ' · ' + fdt(r.t0) + (adm ? ' · 👤 ' + esc(r.sol?.n || '') : '') + (r.req && r.fechaReq ? ' · 📅 para el ' + esc(r.fechaReq) : '') + (r.tec ? ' · 🧰 ' + esc(r.tec.n) : '') + '</small>' + agAvance(r) + '</div></button>';
  $('agBody').innerHTML =
    '<div class="agElige">' +
      '<button type="button" class="agOp falla' + (S.agModo === 'falla' ? ' on' : '') + '" data-agmodo="falla"><div class="agOpI">' + agIlu('mtc') + '</div><div><b>🔧 Reportar una falla</b><span>Algo se descompuso y hay que arreglarlo. <b>Mantenimiento recibe el aviso al momento.</b></span><small>4 pasos · 1 minuto</small></div></button>' +
      '<button type="button" class="agOp req' + (S.agModo === 'req' ? ' on' : '') + '" data-agmodo="req"><div class="agOpI">' + agIlu('ag') + '</div><div><b>📐 Pedir un requerimiento</b><span>Proyecto, mejora o algo nuevo que <b>necesita comprar material</b>. Lleva croquis en foto y fecha.</span><small>se planea con más tiempo</small></div></button>' +
    '</div>' +
    '<div id="agFormU"></div>' +
    (porLiberar.length ? '<div class="box agConf"><h3>✅ Trabajos terminados · confírmalos con tu nómina · ' + porLiberar.length + '</h3>' + porLiberar.map(r => '<div class="kbi" style="border-left-color:var(--ok)"><div class="h"><span><b style="color:var(--fg)">' + esc(r.eqN) + '</b> · 📍 ' + esc(r.ubic || '') + '</span></div><div>📝 ' + esc(r.desc || '') + '</div><div><b>Solución:</b> ' + esc(r.solucion || '') + ' <span class="foot">· 🧰 ' + esc((r.tecFin || r.tec)?.n || '') + '</span></div>' + (p && esMttoAdm(p) && !esGral(p) ? '<p class="foot">Lo libera quien solicitó (' + esc(r.sol?.n || '') + ') con su nómina.</p>' : '<div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="ok" data-agacc="calificar" data-id="' + r.id + '" style="font-size:17px;padding:12px 20px">✅ Quedó bien · liberar</button><button type="button" class="danger" data-agacc="continua" data-id="' + r.id + '" style="font-size:17px;padding:12px 20px">🔁 Sigue fallando</button></div>') + '</div>').join('') + '</div>' : '') +
    '<div class="box"><h3>' + (adm ? '📋 Todas las solicitudes abiertas (administrador)' : '📋 Mis solicitudes') + ' · ' + abiertas.length + '</h3>' +
    (!p ? '<p class="foot">Entra con tu nómina (👤 Entrar) para ver tus solicitudes y liberar trabajos.</p>' : abiertas.length ? '<div class="agMias">' + abiertas.map(tarj).join('') + '</div>' : '<p class="foot">No tienes solicitudes abiertas. 👍</p>') + '</div>';
  (S.agModo === 'req' ? agFormReq : agFormulario)($('agFormU'));
}
document.addEventListener('click', e => { const b = e.target.closest('[data-agmodo]'); if (b) { S.agModo = b.dataset.agmodo; agUsuario(); const f = $('agFormU'); if (f) f.scrollIntoView({ behavior:'smooth', block:'start' }); } });

// ---------- 📐 REQUERIMIENTO: proyecto o mejora con compra de material (no lanza alarma; entra al tablero de mantenimiento y al historial)
const AG_PLAZOS = [['1 semana', 7], ['2 semanas', 14], ['1 mes', 30], ['2 meses', 60], ['3 meses', 90]];
// opt.maq: requerimiento desde el TABLERO DE PRODUCCIÓN para esa máquina → va al tablero de mantenimiento de máquinas (origen 'prod')
function agFormReq(cont, opt){
  opt = opt || {};
  const MQ = opt.maq && S.maq[opt.maq] ? opt.maq : '';
  const F = { ub:MQ ? (AG_UBIC.find(u => norm(u) === norm(S.maq[MQ].area || '')) || 'Planta') : '', fotos:[] }, hoy = new Date(), iso = d => d.toISOString().slice(0, 10), en = n => { const d = new Date(hoy); d.setDate(d.getDate() + n); return iso(d); };
  cont.innerHTML = '<form class="box agW req" id="fAgReq"><div class="agWt"><span>📐</span><div><h2>Pedir un requerimiento' + (MQ ? ' · ' + esc(maqName(MQ)) : '') + '</h2><p class="foot">' + (MQ ? 'Mejoras o trabajos en esta máquina que necesitan material. Llega al tablero de mantenimiento de máquinas.' : 'Para proyectos y mejoras que necesitan material. Mantenimiento lo revisa, cotiza y te da fecha.') + '</p></div></div>' +
    '<div class="agP"><p class="agPn"><b>1</b> ¿Qué proyecto o mejora necesitas?</p><input id="agRqT" placeholder="ej. instalar repisa en almacén, cambiar puerta del baño, nueva toma de aire en ensamble"></div>' +
    '<div class="agP"><p class="agPn"><b>2</b> ¿Dónde?</p><div class="agCh">' + AG_UBIC.map(u => '<button type="button" class="agC" data-rqu="' + u + '">' + (AG_UBIC_IC[u] || '📍') + ' ' + u + '</button>').join('') + '<button type="button" class="agC" data-rqu="otro">✏️ Otro lugar</button></div><input id="agRqU" placeholder="Escribe el lugar" hidden></div>' +
    '<div class="agP"><p class="agPn"><b>3</b> ¿Qué se tiene que realizar?</p><textarea id="agRqD" placeholder="Explica el trabajo: medidas, cómo lo imaginas, para qué se necesita"></textarea>' +
      '<label class="f">Material que crees que se necesita (uno por renglón, opcional)<textarea id="agRqM" style="min-height:70px" placeholder="ej.&#10;4 · tubo PTR 2 pulgadas&#10;1 · galón de pintura gris"></textarea></label></div>' +
    '<div class="agP"><p class="agPn"><b>4</b> 📷 Foto del croquis a mano o del lugar <small class="foot">(opcional, hasta 3)</small></p>' +
      '<label class="agFoto"><input type="file" id="agRqF" accept="image/*" multiple hidden><span>📷 Tomar o elegir foto</span></label><div class="agFotos" id="agRqFs"></div></div>' +
    '<div class="agP"><p class="agPn"><b>5</b> 📅 ¿Para cuándo lo necesitas?</p><div class="agCh">' + AG_PLAZOS.map(([t, n]) => '<button type="button" class="agC" data-rqp="' + n + '">' + t + '</button>').join('') + '</div>' +
      '<label class="f" style="max-width:260px">o elige la fecha<input type="date" id="agRqFe" min="' + en(3) + '" value="' + en(30) + '"></label></div>' +
    '<p class="msg" id="agRqMsg"></p><button class="primary agEnv" type="submit">📐 Enviar requerimiento a mantenimiento</button></form>';
  const $c = s => cont.querySelector(s);
  cont.querySelector('[data-rqp="30"]').classList.add('on');
  if (F.ub) { const b = cont.querySelector('[data-rqu="' + F.ub + '"]'); if (b) b.classList.add('on'); }
  cont.addEventListener('click', e => {
    const u = e.target.closest('[data-rqu]'); if (u) { cont.querySelectorAll('[data-rqu]').forEach(b => b.classList.toggle('on', b === u)); $c('#agRqU').hidden = u.dataset.rqu !== 'otro'; F.ub = u.dataset.rqu === 'otro' ? '' : u.dataset.rqu; if (!$c('#agRqU').hidden) $c('#agRqU').focus(); return; }
    const pl = e.target.closest('[data-rqp]'); if (pl) { cont.querySelectorAll('[data-rqp]').forEach(b => b.classList.toggle('on', b === pl)); $c('#agRqFe').value = en(+pl.dataset.rqp); return; }
    const qx = e.target.closest('[data-rqfx]'); if (qx) { F.fotos.splice(+qx.dataset.rqfx, 1); pintaFotos(); }
  });
  $c('#agRqFe').addEventListener('change', () => cont.querySelectorAll('[data-rqp]').forEach(b => b.classList.remove('on')));
  const pintaFotos = () => { $c('#agRqFs').innerHTML = F.fotos.map((f, i) => '<span><img src="' + URL.createObjectURL(f) + '" alt="foto ' + (i + 1) + '"><button type="button" data-rqfx="' + i + '" title="Quitar">✕</button></span>').join(''); };
  $c('#agRqF').addEventListener('change', ev => { F.fotos = F.fotos.concat([...ev.target.files]).slice(0, 3); ev.target.value = ''; pintaFotos(); });
  $c('#fAgReq').addEventListener('submit', async e => {
    e.preventDefault();
    if (!S.sesion) { toast('🔒 Primero entra con tu nómina (botón 👤 Entrar).'); entrar(); return; }
    const t = $c('#agRqT').value.trim(), ub = F.ub || $c('#agRqU').value.trim(), desc = $c('#agRqD').value.trim(), fecha = $c('#agRqFe').value, m = $c('#agRqMsg');
    if (!t || !ub || !desc || !fecha) { m.className = 'msg err'; m.textContent = 'Falta: ' + [!t && 'qué proyecto', !ub && 'dónde', !desc && 'qué se tiene que realizar', !fecha && 'la fecha'].filter(Boolean).join(', ') + '.'; return; }
    const lineas = $c('#agRqM').value.split('\n').map(x => x.trim()).filter(Boolean), fotosSel = F.fotos.slice();
    const p = await pedirNomina('Requerimiento · ' + t, 'agsol', 'Nómina de quien solicita'); if (!p) return; cerrarModal();
    const btn = $c('.agEnv'); if (btn) btn.disabled = true; m.className = 'msg'; m.textContent = fotosSel.length ? 'Subiendo fotos…' : 'Enviando…';
    const eqN = MQ ? maqName(MQ) + ' · ' + t : t, cat = MQ ? (S.maq[MQ].cat || 'MTA') : 'AG';
    try {
      const fotos = [];
      if (fotosSel.length) { const as = await window.claude.use('assets'); for (const f of fotosSel) { const r = await as.upload(f); fotos.push(r.id); } }
      const mats = lineas.map(x => { const mm = x.match(/^(\d+(?:[.,]\d+)?)\s*[·xX\-*:]\s*(.+)$/); return { c: mm ? mm[1] : '', d: mm ? mm[2].trim() : x, est:'solicitado', t:nowIso(), por:p.n, eq:eqN }; });
      const nuevo = await db.collection('ag').add(Object.assign({ req:true, origen:MQ ? 'prod' : 'ag', cat, eq:MQ ? 'maq:' + MQ : 'req', eqN, ubic:ub, tipo:'Requerimiento / proyecto', prio:'baja', desc, fechaReq:fecha, fotos, mats, t0:nowIso(), estado:'espera', sol:{ n:p.n, nom:p.nomina }, log:[{ t:nowIso(), por:p.n, txt:'Requerimiento creado · para el ' + fecha }] }, MQ ? { maq:MQ, maqN:maqName(MQ) } : {}));
      agEvento({ id:nuevo.id, eqN, ubic:ub, cat, estado:'' }, p.n, 'Requerimiento creado · para el ' + fecha + ' · ' + desc);
      if (S.ntfy) fetch('https://ntfy.sh/', { method:'POST', body: JSON.stringify({ topic:S.ntfy, title:'📐 REQUERIMIENTO · ' + eqN + ' · ' + ub, message: ('Para el ' + fecha + ' · ' + desc).slice(0, 300), priority:3, tags:['triangular_ruler'] }) }).catch(() => {});
      toast('✅ Requerimiento enviado a mantenimiento.');
      if (opt.onOk) opt.onOk(); else { S.agModo = 'falla'; renderAG(); }
    } catch (er) { if (btn) btn.disabled = false; m.className = 'msg err'; m.textContent = 'No se pudo enviar (' + (er.code || er.message) + ').'; }
  });
}
const agTarjeta = r => {
  const col = { espera:'#D32F2F', proceso:'#1F6FD1', pendiente:'#C99700', terminada:'#2E7D32', cerrada:'#607D8B' }[r.estado];
  return '<button type="button" class="kbi" data-agver="' + r.id + '" style="border-left-color:' + col + ';text-align:left;cursor:pointer;font-weight:400;width:100%;align-items:stretch">' +
    (r.req ? '<div class="agRqTag">📐 REQUERIMIENTO · para el <b>' + esc(r.fechaReq || 'sin fecha') + '</b>' + ((r.fotos || []).length ? ' · 📷 ' + r.fotos.length + ' foto' + (r.fotos.length > 1 ? 's' : '') : '') + ((r.mats || []).length ? ' · 🧾 ' + r.mats.length + ' material' + (r.mats.length > 1 ? 'es' : '') : '') + '</div>' : '') +
    '<div class="h"><span><b style="color:var(--fg);font-size:15px">' + esc(r.eqN) + '</b>' + (r.reab ? ' <span class="tag bad">🔁 la falla continúa · ' + (r.reab + 1) + 'ª atención</span>' : '') + '</span><span class="tag">' + esc(r.tipo || '') + '</span></div>' +
    (r.reab && r.reabNota ? '<div>🔁 <b>Sigue fallando:</b> ' + esc(r.reabNota) + '</div>' : '') +
    '<div>📍 <b>' + esc(r.ubic || 'sin ubicación') + '</b> · 👤 solicita <b>' + esc(r.sol?.n || '') + '</b></div>' +
    '<div>📝 <b>Notas:</b> ' + esc(r.desc || '') + '</div>' +
    '<div class="foot">' + fdt(r.t0) + (r.tec ? ' · 🧰 ' + esc(r.tec.n) : '') + (r.est ? ' · estimado ' + agFmtEst(r.est) : '') +
    (r.estado === 'espera' ? ' · <b data-since="' + esc(r.t0) + '">' + hms(ms(r.t0)) + '</b>' : '') +
    (r.estado === 'pendiente' && r.pend ? ' · compromiso <b>' + esc(r.pend.fecha || 'sin fecha') + '</b>' : '') + agPrioTag(r.prio) + '</div></button>';
};
// ---------- 🧰 TABLERO DE MANTENIMIENTO · ÁREAS GENERALES (PRUEBA MASTER)
// portada en vivo + contadores ilustrados que filtran + buscador y categorías + columnas tipo tablero con tarjetas ilustradas
// y botones de acción directos (Atender / Terminar / Reanudar) + requerimientos con cuenta regresiva.
const AG_TCAT = { AA:['aa', 'Aires', '#1597D3'], IL:['il', 'Iluminación', '#D9A400'], EBT:['ebt', 'Eléctrico', '#D2453C'], EMT:['emt', 'Subestación', '#8E2A2A'], AG:['ag', 'Edificio', '#2E9E5B'], MTC:['mtc', 'Herramienta', '#7B4BC4'], EA:['ea', 'Auxiliar', '#0E9F96'], EM:['em', 'Móvil', '#8A5A2B'], MTA:['mta', 'Máquinas', '#1F4FBF'], MTB:['mtb', 'Máquinas', '#E07B1A'] };
const AG_TCOL = [
  { k:'espera', t:'Esperando técnico', d:'Nadie la ha tomado', ic:'🚨', c:'#D32F2F' },
  { k:'proceso', t:'En proceso', d:'Un técnico ya está trabajando', ic:'🧰', c:'#1F6FD1' },
  { k:'pendiente', t:'Pendientes', d:'Falta material, contratista o autorización', ic:'⏳', c:'#E0A100' },
  { k:'terminada', t:'Terminadas', d:'Falta que quien pidió libere', ic:'✅', c:'#1E8E5A' }
];
const AG_PRIO_C = { urgente:['#D32F2F', '🔴 Urgente'], alta:['#EF6C00', '🟠 Alta'], media:['#E0A100', '🟡 Media'], baja:['#1E8E5A', '🟢 Baja'] };
const agCatDe = r => r.req ? ['ag', 'Requerimiento', '#1F6FD1'] : (AG_TCAT[r.cat] || AG_TCAT.AG);
const agIni = n => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase();
function agTarjetaM(r, i){
  const [ic, cn, cc] = agCatDe(r), pr = AG_PRIO_C[r.prio] || AG_PRIO_C.media;
  const dias = r.req && r.fechaReq ? Math.ceil((new Date(r.fechaReq + 'T12:00') - Date.now()) / 86400000) : null;
  const mats = r.mats || [], mOk = mats.filter(m => /recib/i.test(m.est || '')).length;
  let pie = '';
  if (r.estado === 'espera') pie = '<span class="agTm vivo">⏱ <b data-since="' + esc(r.tAlerta || r.t0) + '">' + hms(ms(r.tAlerta || r.t0)) + '</b> esperando</span>';
  else if (r.estado === 'proceso') pie = '<span class="agAva" title="' + esc(r.tec?.n || '') + '">' + esc(agIni(r.tec?.n)) + '</span><span class="agTm">' + esc(r.tec?.n || '') + (r.est ? ' · estimado ' + agFmtEst(r.est) : '') + '</span>';
  else if (r.estado === 'pendiente') pie = '<span class="agTm">📅 compromiso <b>' + esc(r.pend?.fecha || 'sin fecha') + '</b>' + (r.pend?.motivo ? ' · ' + esc(r.pend.motivo) : '') + '</span>';
  else if (r.estado === 'terminada') pie = '<span class="agTm">👤 falta que <b>' + esc(r.sol?.n || 'quien pidió') + '</b> libere</span>';
  const acc = { espera:['atender', '🧰', 'Atender'], proceso:['terminar', '✅', 'Terminar'], pendiente:['reanudar', '▶', 'Reanudar'] }[r.estado];
  return '<div class="agK e-' + r.estado + (r.prio === 'urgente' ? ' urg' : '') + (r.req ? ' req' : '') + '" style="--c:' + cc + ';--i:' + (i || 0) + '">' +
    '<div class="agKc" data-agver="' + r.id + '"><div class="agKi"><svg viewBox="0 0 120 100" aria-hidden="true">' + agQ(ic) + '</svg></div>' +
      '<div class="agKt"><div class="agKch"><span class="agCh2" style="--c:' + cc + '">' + esc(r.req ? '📐 Requerimiento' : cn) + '</span><span class="agCh2 pr" style="--c:' + pr[0] + '">' + pr[1] + '</span>' + (r.reab ? '<span class="agCh2" style="--c:#D32F2F">🔁 ' + (r.reab + 1) + 'ª vez</span>' : '') + '</div>' +
        '<b>' + esc(r.eqN) + '</b><small>📍 ' + esc(r.ubic || 'sin ubicación') + ' · ' + fdt(r.t0) + '</small>' +
        '<p>' + esc(r.desc || '') + '</p>' +
        (r.req ? '<div class="agKreq">📅 para el <b>' + esc(r.fechaReq || '—') + '</b>' + (dias != null ? ' · <span class="' + (dias < 0 ? 'mal' : dias <= 7 ? 'pronto' : '') + '">' + (dias < 0 ? 'vencido hace ' + (-dias) + ' d' : dias === 0 ? 'es hoy' : 'faltan ' + dias + ' d') + '</span>' : '') + ((r.fotos || []).length ? ' · 📷 ' + r.fotos.length : '') + '</div>' : '') +
        (mats.length ? '<div class="agKmat"><span style="width:' + Math.round(mOk / mats.length * 100) + '%"></span></div><small>🧾 material ' + mOk + ' de ' + mats.length + ' recibido</small>' : '') +
      '</div></div>' +
    '<div class="agKf">' + pie + '<span class="agKsp"></span>' + (acc ? '<button type="button" class="agBt" data-agacc="' + acc[0] + '" data-id="' + r.id + '"><span>' + acc[1] + '</span>' + acc[2] + '</button>' : '') + '<button type="button" class="agBt ver" data-agver="' + r.id + '">Ver ›</button></div></div>';
}
function agTablero(){
  S.agF = S.agF || { cat:'', q:'', est:'' };
  const R = S.agReq, h0 = new Date(), q = norm(S.agF.q || ''); h0.setHours(0, 0, 0, 0);
  const pasa = r => (!S.agF.cat || (S.agF.cat === 'req' ? r.req : !r.req && (AG_TCAT[r.cat] || AG_TCAT.AG)[1] === S.agF.cat)) && (!q || norm(r.eqN + ' ' + r.ubic + ' ' + r.desc + ' ' + (r.sol?.n || '') + ' ' + (r.tec?.n || '')).includes(q));
  const A = R.filter(r => r.estado !== 'cerrada'), F = A.filter(r => !r.req && pasa(r)), Q = A.filter(r => r.req && !r.maq && pasa(r)).sort((a, b) => (a.fechaReq || '9').localeCompare(b.fechaReq || '9'));
  const n = k => A.filter(r => !r.req && r.estado === k).length, nE = n('espera'), tot = A.filter(r => !r.req).length || 1;
  const hoyN = R.filter(r => new Date(r.t0) >= h0).length, cerrHoy = R.filter(r => r.lib && new Date(r.lib.t || 0) >= h0).length;
  const cats = [...new Set(A.filter(r => !r.req).map(r => (AG_TCAT[r.cat] || AG_TCAT.AG)[1]))];
  const colsV = S.agF.est ? AG_TCOL.filter(c => c.k === S.agF.est) : AG_TCOL;
  $('agBody').innerHTML =
    '<section class="agHero"><div class="agHc"><span class="eti' + (nE ? ' mal' : '') + '"><i></i>' + (nE ? nE + ' esperando técnico' : 'Todo atendido') + '</span>' +
      '<h2>' + (nE ? '¡Hay <span>' + nE + ' solicitud' + (nE > 1 ? 'es' : '') + '</span> por atender!' : 'Áreas generales <span>al día</span> 👌') + '</h2>' +
      '<p class="sub">Hoy: ' + hoyN + ' solicitud' + (hoyN === 1 ? '' : 'es') + ' nuevas · ' + cerrHoy + ' liberadas · ' + Q.length + ' requerimiento' + (Q.length === 1 ? '' : 's') + ' en planeación</p>' +
      '<div class="barra">' + AG_TCOL.map(c => '<i style="width:' + (n(c.k) / tot * 100) + '%;background:' + c.c + '"></i>').join('') + '</div></div>' +
      '<div class="agHm" aria-hidden="true">' + ['aa', 'il', 'ebt', 'ag', 'ea', 'em'].map(k => '<div><svg viewBox="0 0 120 100">' + agQ(k) + '</svg></div>').join('') + '</div></section>' +
    '<div class="agKp">' + AG_TCOL.map(c => '<button type="button" class="agKpi' + (S.agF.est === c.k ? ' on' : '') + (c.k === 'espera' && nE ? ' hay' : '') + '" data-agfe="' + c.k + '" style="--c:' + c.c + '"><span class="ico">' + c.ic + '</span><b>' + n(c.k) + '</b><span>' + c.t + '</span></button>').join('') +
      '<button type="button" class="agKpi' + (S.agF.cat === 'req' ? ' on' : '') + '" data-agfc="req" style="--c:#0E2A47"><span class="ico">📐</span><b>' + A.filter(r => r.req && !r.maq).length + '</b><span>Requerimientos</span></button></div>' +
    '<div class="agFil"><div class="agBus"><span>🔎</span><input id="agTq" type="search" placeholder="Buscar por equipo, lugar, quién pidió o técnico" value="' + esc(S.agF.q || '') + '"></div>' +
      '<div class="agCats"><button type="button" class="agCf' + (!S.agF.cat ? ' on' : '') + '" data-agfc="">Todas</button>' + cats.map(c => { const d = Object.values(AG_TCAT).find(x => x[1] === c); return '<button type="button" class="agCf' + (S.agF.cat === c ? ' on' : '') + '" data-agfc="' + esc(c) + '" style="--c:' + d[2] + '"><svg viewBox="0 0 120 100">' + agQ(d[0]) + '</svg>' + esc(c) + '</button>'; }).join('') + '</div></div>' +
    (S.agF.cat === 'req' ? '' : '<div class="agCols">' + colsV.map(c => { const L = F.filter(r => r.estado === c.k).sort((a, b) => ({ urgente:0, alta:1, media:2, baja:3 }[a.prio] ?? 2) - ({ urgente:0, alta:1, media:2, baja:3 }[b.prio] ?? 2) || (a.t0 || '').localeCompare(b.t0 || ''));
      return '<div class="agCol" style="--c:' + c.c + '"><div class="agColH"><span class="ico">' + c.ic + '</span><div><b>' + c.t + '</b><small>' + c.d + '</small></div><span class="n">' + L.length + '</span></div>' +
        (L.length ? L.slice(0, 40).map(agTarjetaM).join('') : '<div class="agVacio">' + (c.k === 'espera' ? '🎉 Nada esperando' : 'Sin solicitudes') + '</div>') + '</div>'; }).join('') + '</div>') +
    ((S.agF.est && S.agF.cat !== 'req') ? '' : '<div class="agCol agColR" style="--c:#0E2A47"><div class="agColH"><span class="ico">📐</span><div><b>Requerimientos y proyectos</b><small>Necesitan comprar material · se planean por fecha · no suenan como alarma</small></div><span class="n">' + Q.length + '</span></div>' +
      (Q.length ? '<div class="agRqGrid">' + Q.map(agTarjetaM).join('') + '</div>' : '<div class="agVacio">Sin requerimientos abiertos</div>') + '</div>');
  const tq = $('agTq'); if (tq) tq.addEventListener('input', () => { S.agF.q = tq.value; const p = tq.selectionStart; agTablero(); const t2 = $('agTq'); t2.focus(); try { t2.setSelectionRange(p, p); } catch (e) {} });
}
document.addEventListener('click', e => {
  const fe = e.target.closest('[data-agfe]'); if (fe) { S.agF.est = S.agF.est === fe.dataset.agfe ? '' : fe.dataset.agfe; if (S.agF.cat === 'req') S.agF.cat = ''; agTablero(); return; }
  const fc = e.target.closest('[data-agfc]'); if (fc) { S.agF.cat = S.agF.cat === fc.dataset.agfc && fc.dataset.agfc ? '' : fc.dataset.agfc; if (S.agF.cat === 'req') S.agF.est = ''; agTablero(); }
});


// ---------- formulario de reporte (tablero de usuario) · PRUEBA MASTER: asistente ilustrado paso a paso
// 1 ¿qué falla? (tarjetas con dibujo; máquinas A y B salen en vivo de Paros; "Otro" para escribir) → 2 ¿cuál? → 3 ¿dónde? → 4 ¿qué pasa?
const AG_GRUPOS = [
  { k:'maq', n:'Máquinas de producción', d:'Tipo A y B (las de Paros)', ic:'mta', c:'#1F4FBF' },
  { k:'AA', n:'Aire acondicionado', d:'No enfría, gotea, hace ruido', ic:'aa', c:'#1597D3' },
  { k:'IL', n:'Iluminación', d:'Lámparas fundidas o parpadeando', ic:'il', c:'#D9A400' },
  { k:'EBT', n:'Eléctrico', d:'Contactos, tableros, apagadores', ic:'ebt', c:'#D2453C' },
  { k:'AG', n:'Edificio y áreas', d:'Baños, puertas, techos, pintura', ic:'ag', c:'#2E9E5B' },
  { k:'MTC', n:'Herramienta', d:'Taladros, pulidoras, sierras', ic:'mtc', c:'#7B4BC4' },
  { k:'EA', n:'Equipo auxiliar', d:'Compresores, extractores, gas', ic:'ea', c:'#0E9F96' },
  { k:'EM', n:'Equipo móvil', d:'Montacargas y patines', ic:'em', c:'#8A5A2B' },
  { k:'EMT', n:'Subestación', d:'Media tensión', ic:'emt', c:'#8E2A2A' },
  { k:'otro', n:'Otro', d:'No está en la lista: escríbelo', emo:'✏️', c:'#546E7A' }
];
const AG_UBIC_IC = { Planta:'🏭', CEDIS:'📦', Edificio:'🏢', Comedor:'🍽️', 'Baños':'🚻', Oficina:'💼', Escaleras:'🪜', 'Jardín':'🌳', Estacionamiento:'🅿️' };
const AG_EJEMPLOS = ['No enciende', 'Hace ruido raro', 'Gotea / fuga de agua', 'No enfría', 'Se fundió', 'Está roto', 'Huele a quemado'];
function agNueva(){ $('agBody').innerHTML = '<div id="agFormU"></div>'; agFormulario($('agFormU')); }
function agFormulario(cont){
  const E = agEq(), F = { g:'', k:'', eqN:'', cat:'', ub:'', prio:'media' };
  const ilu = (g, cls) => g.emo ? '<span class="emo">' + g.emo + '</span>' : '<svg class="' + (cls || '') + '" viewBox="0 0 120 100" aria-hidden="true">' + agQ(g.ic) + '</svg>';
  // máquinas A y B: salen en vivo de Paros (config/maquinas), así siempre están actualizadas
  const equiposDe = g => g === 'maq'
    ? lista().filter(k => ['MTA', 'MTB', ''].includes((S.maq[k].cat || '').toUpperCase())).map(k => ({ k:'maq:' + k, n:maqName(k), cat:S.maq[k].cat || 'MTA', ubic:S.maq[k].area || 'Planta' }))
    : Object.entries(E).filter(([k, v]) => v.a !== false && v.cat === g).map(([k, v]) => ({ k, n:v.n, cat:v.cat, ubic:v.ubic || '' })).sort((a, b) => a.n.localeCompare(b.n, 'es'));
  const grupos = AG_GRUPOS.filter(g => g.k === 'otro' || equiposDe(g.k).length);
  cont.innerHTML = '<form class="box agW" id="fAgNueva"><div class="agWt"><span>🛠️</span><div><h2>Reportar una falla a mantenimiento</h2><p class="foot">4 pasos rápidos: toca las opciones y solo escribe lo que está pasando.</p></div></div>' +
    '<div class="agP" id="agP1"><p class="agPn"><b>1</b> ¿Qué está fallando?</p><div class="agGr">' +
      grupos.map(g => '<button type="button" class="agG" data-agg="' + g.k + '" style="--c:' + g.c + '">' + ilu(g, 'agGi') + '<b>' + g.n + '</b><small>' + g.d + '</small></button>').join('') + '</div></div>' +
    '<div class="agP" id="agP2" hidden><p class="agPn"><b>2</b> <span id="agP2t">¿Cuál?</span></p><div id="agP2c"></div></div>' +
    '<div class="agP" id="agP3" hidden><p class="agPn"><b>3</b> ¿Dónde está?</p><div class="agCh">' +
      AG_UBIC.map(u => '<button type="button" class="agC" data-agu="' + u + '">' + (AG_UBIC_IC[u] || '📍') + ' ' + u + '</button>').join('') + '<button type="button" class="agC" data-agu="otro">✏️ Otro lugar</button></div>' +
      '<label class="f" id="agUbicL" hidden style="margin-top:8px">Escribe el lugar *<input id="agUbic" placeholder="ej. bodega de cartón"></label></div>' +
    '<div class="agP" id="agP4" hidden><p class="agPn"><b>4</b> ¿Qué está pasando?</p>' +
      '<div class="agCh" style="margin-bottom:8px">' + AG_EJEMPLOS.map(x => '<button type="button" class="agC sm" data-agej="' + x + '">' + x + '</button>').join('') + '</div>' +
      '<textarea id="agDesc" placeholder="Explica rápido: ej. el lavabo del baño de hombres gotea; se fundieron 2 lámparas del pasillo"></textarea>' +
      '<p class="agPn" style="margin-top:12px">¿Qué tan urgente es?</p><div class="agCh">' +
      [['urgente', '🔴', 'Urgente', 'ya'], ['alta', '🟠', 'Alta', 'hoy'], ['media', '🟡', 'Media', 'esta semana'], ['baja', '🟢', 'Baja', 'este mes']].map(([k, ic, n, d]) => '<button type="button" class="agC agPr' + (k === 'media' ? ' on' : '') + '" data-agpr="' + k + '">' + ic + ' <b>' + n + '</b> <small>' + d + '</small></button>').join('') + '</div>' +
      '<details class="agMas"><summary>Más detalles (opcional)</summary><label class="f">Tipo de trabajo<select id="agTipo">' + AG_TIPOS.map(t => '<option>' + t + '</option>').join('') + '</select></label></details>' +
      '<div id="agRes" class="agRes"></div>' +
      '<p class="msg" id="agMsg"></p><button class="primary agEnv" type="submit">🏢 Enviar a mantenimiento</button></div></form>';
  const $c = s => cont.querySelector(s);
  const resumen = () => { $c('#agRes').innerHTML = '🧾 <b>' + esc(F.eqN || '…') + '</b> · 📍 ' + esc(F.ub || '…') + ' · prioridad <b>' + esc(AG_PRIO[F.prio]) + '</b>'; };
  const mostrar = n => { for (let i = 2; i <= n; i++) $c('#agP' + i).hidden = false; $c('#agP' + n).scrollIntoView({ behavior:'smooth', block:'nearest' }); resumen(); };
  const elegirEq = (k, n, cat, ubic) => {
    F.k = k; F.eqN = n; F.cat = cat;
    cont.querySelectorAll('[data-age]').forEach(b => b.classList.toggle('on', b.dataset.age === k));
    const u = AG_UBIC.find(x => norm(x) === norm(ubic || '')) || (k.startsWith('maq:') ? 'Planta' : '');
    if (u && !F.ub) { F.ub = u; cont.querySelectorAll('[data-agu]').forEach(b => b.classList.toggle('on', b.dataset.agu === u)); }
    mostrar(F.ub ? 4 : 3);
  };
  cont.addEventListener('click', e => {
    const g = e.target.closest('[data-agg]');
    if (g) {
      F.g = g.dataset.agg; F.k = F.eqN = '';
      cont.querySelectorAll('.agG').forEach(b => b.classList.toggle('on', b.dataset.agg === F.g));
      const def = AG_GRUPOS.find(x => x.k === F.g);
      if (F.g === 'otro') {
        $c('#agP2t').textContent = 'Escribe qué equipo o área está fallando';
        $c('#agP2c').innerHTML = '<input id="agOtro" placeholder="ej. portón de embarques, bebedero, cortina del comedor">';
        $c('#agOtro').addEventListener('input', ev => { F.k = 'otro'; F.eqN = ev.target.value.trim(); F.cat = 'AG'; resumen(); if (F.eqN) $c('#agP3').hidden = false; });
        mostrar(2); $c('#agOtro').focus(); return;
      }
      const L = equiposDe(F.g);
      $c('#agP2t').textContent = '¿Cuál ' + (F.g === 'maq' ? 'máquina' : 'equipo') + '? · ' + def.n;
      $c('#agP2c').innerHTML = (L.length > 8 ? '<input id="agBus" type="search" placeholder="🔎 Escribe para buscar…" style="margin-bottom:8px">' : '') +
        '<div class="agCh" id="agEqs">' + L.map(x => '<button type="button" class="agC agEqB" data-age="' + esc(x.k) + '" data-n="' + esc(x.n) + '" data-cat="' + esc(x.cat) + '" data-ub="' + esc(x.ubic) + '" style="--c:' + def.c + '">' + ilu(def, 'agCi') + esc(x.n) + '</button>').join('') +
        '<button type="button" class="agC" data-agg="otro">✏️ No está aquí · escribirlo</button></div>';
      const bus = $c('#agBus'); if (bus) bus.addEventListener('input', () => { const q = norm(bus.value); cont.querySelectorAll('.agEqB').forEach(b => { b.hidden = !!q && !norm(b.dataset.n).includes(q); }); });
      mostrar(2); return;
    }
    const q = e.target.closest('[data-age]'); if (q) { elegirEq(q.dataset.age, q.dataset.n, q.dataset.cat, q.dataset.ub); return; }
    const u = e.target.closest('[data-agu]');
    if (u) { cont.querySelectorAll('[data-agu]').forEach(b => b.classList.toggle('on', b === u)); $c('#agUbicL').hidden = u.dataset.agu !== 'otro'; F.ub = u.dataset.agu === 'otro' ? $c('#agUbic').value.trim() : u.dataset.agu; if (u.dataset.agu === 'otro') $c('#agUbic').focus(); mostrar(4); return; }
    const ej = e.target.closest('[data-agej]'); if (ej) { const t = $c('#agDesc'); t.value = (t.value ? t.value.replace(/\s*$/, '. ') : '') + ej.dataset.agej; t.focus(); return; }
    const pr = e.target.closest('[data-agpr]'); if (pr) { F.prio = pr.dataset.agpr; cont.querySelectorAll('[data-agpr]').forEach(b => b.classList.toggle('on', b === pr)); resumen(); }
  });
  $c('#agUbic').addEventListener('input', ev => { F.ub = ev.target.value.trim(); resumen(); });
  $c('#fAgNueva').addEventListener('submit', async e => {
    e.preventDefault();
    if (!S.sesion) { toast('🔒 Primero entra con tu nómina (botón 👤 Entrar).'); entrar(); return; }
    const desc = $c('#agDesc').value.trim(), m = $c('#agMsg'), eqN = F.eqN, ub = F.ub, k = F.k;
    if (!eqN || !ub || !desc) { m.className = 'msg err'; m.textContent = 'Falta: ' + [!eqN && 'qué está fallando', !ub && 'dónde está', !desc && 'qué está pasando'].filter(Boolean).join(', ') + '.'; return; }
    const p = await pedirNomina('Reporte · ' + eqN, 'agsol', 'Nómina de quien solicita'); if (!p) return; cerrarModal();
    const cat = F.cat || 'AG', tipo = $c('#agTipo').value;
    try {
      const nuevo = await db.collection('ag').add({ cat, eq:k, eqN, ubic:ub, tipo, prio:F.prio, desc, t0:nowIso(), estado:'espera', sol:{ n:p.n, nom:p.nomina }, log:[{ t:nowIso(), por:p.n, txt:'Solicitud creada' }] });
      agEvento({ id:nuevo.id, eqN, ubic:ub, cat, estado:'' }, p.n, 'Solicitud creada · ' + F.prio + ' · ' + desc);
      if (S.ntfy) fetch('https://ntfy.sh/', { method:'POST', body: JSON.stringify({ topic:S.ntfy, title:'🏢 ÁREAS GENERALES · ' + eqN + ' · ' + ub, message: desc.slice(0, 300), priority:4, tags:['office'] }) }).catch(() => {});
      toast('✅ Enviado a mantenimiento. Lo verás en "Mis solicitudes".'); renderAG();
    } catch (er) { m.className = 'msg err'; m.textContent = 'No se pudo enviar (' + (er.code || er.message) + ').'; }
  });
}

// ---------- visor de fotos (lightbox): ver en grande y descargar, sin depender de /_blob (que la tablet no abría)
(function(){ if (document.getElementById('agLbCss')) return; const s = document.createElement('style'); s.id = 'agLbCss';
  s.textContent = '.agLb{position:fixed;inset:0;z-index:80;background:rgba(6,14,24,.92);display:grid;place-items:center;padding:12px}'
    + '.agLb img{max-width:96vw;max-height:82vh;border-radius:10px;box-shadow:0 10px 40px rgba(0,0,0,.6);object-fit:contain}'
    + '.agLbBar{position:absolute;top:0;left:0;right:0;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 14px;padding-top:calc(10px + env(safe-area-inset-top,0px));color:#fff;font-weight:700}'
    + '.agLbBar button{background:#ffffff26;border:1px solid #ffffff40;color:#fff;border-radius:10px;padding:9px 14px;font:inherit;font-weight:700;cursor:pointer}'
    + '.agLbBar button[data-lbdesc]{background:#1F6FD1;border-color:#1F6FD1}'
    + '.agLbNav{position:absolute;top:50%;transform:translateY(-50%);width:50px;height:50px;border-radius:50%;background:#ffffff26;border:1px solid #ffffff40;color:#fff;font-size:28px;line-height:1;cursor:pointer}'
    + '.agLbNav.izq{left:10px}.agLbNav.der{right:10px}';
  document.head.appendChild(s);
})();
function agVerFoto(imgs, i){
  i = Math.max(0, Math.min(imgs.length - 1, i));
  const lb = document.createElement('div'); lb.className = 'agLb';
  const draw = () => {
    const src = imgs[i].getAttribute('src') || '';
    lb.innerHTML = '<div class="agLbBar"><span>' + (imgs.length > 1 ? (i + 1) + ' / ' + imgs.length : '') + '</span>'
      + '<span style="display:flex;gap:8px"><button type="button" data-lbdesc>⬇ Descargar</button><button type="button" data-lbcls>✕ Cerrar</button></span></div>'
      + (imgs.length > 1 ? '<button type="button" class="agLbNav izq" data-lbprev>‹</button><button type="button" class="agLbNav der" data-lbnext>›</button>' : '')
      + '<img src="' + src + '" alt="foto ' + (i + 1) + '">';
  };
  draw();
  lb.addEventListener('click', ev => {
    if (ev.target.closest('[data-lbcls]') || ev.target === lb) { lb.remove(); return; }
    if (ev.target.closest('[data-lbprev]')) { i = (i - 1 + imgs.length) % imgs.length; draw(); return; }
    if (ev.target.closest('[data-lbnext]')) { i = (i + 1) % imgs.length; draw(); return; }
    if (ev.target.closest('[data-lbdesc]')) agDescargaFoto(imgs[i].getAttribute('src'), i);
  });
  document.body.appendChild(lb);
}
async function agDescargaFoto(src, i){
  if (!src) { toast('La foto todavía se está cargando, espera un momento.'); return; }
  const nombre = 'requerimiento-foto-' + (i + 1) + '.jpg';
  try {
    const blob = await (await fetch(src)).blob();
    const dl = await window.claude.use('downloads');
    if (dl) await dl.save({ filename:nombre, data:blob });
    else { const a = document.createElement('a'); a.href = src; a.download = nombre; document.body.appendChild(a); a.click(); a.remove(); }
    toast('Foto descargada: ' + nombre);
  } catch(e) { if (e && e.code !== 'declined') toast('No se pudo descargar la foto.'); }
}
// ---------- detalle y acciones
document.addEventListener('click', e => {
  const f = e.target.closest('[data-agfoto]'); if (f) { const cont = f.closest('[data-agfotos]'); if (cont) { const imgs = [...cont.querySelectorAll('[data-agfoto]')]; agVerFoto(imgs, imgs.indexOf(f)); return; } }
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
  abrirModal('<div class="mhead"><div><h2>🏢 ' + esc(r.eqN) + '</h2><p>' + esc(AG_EST[r.estado] || r.estado) + ' · ' + esc(r.tipo || '') + ' · ' + esc(agCats()[r.cat] || '') + ' · ' + esc(r.ubic || '') + '</p></div><button type="button" data-close>✕</button></div>' +
    '<div class="box"><p style="margin:0"><b>' + esc(r.desc || '') + '</b></p><p class="foot">Solicitó: ' + esc(r.sol?.n || '') + ' · ' + fdt(r.t0) + (r.prio ? ' · prioridad ' + esc(r.prio) : '') + '</p>' +
    '<div class="times"><div><b>' + agFmtEst(r.est) + '</b><span>tiempo estimado</span></div><div><b>' + (agMin(r) != null ? dur(agMin(r)) : r.tAcept ? '<span data-since="' + esc(r.tAcept) + '">' + hms(ms(r.tAcept)) + '</span>' : '—') + '</b><span>tiempo real</span></div><div><b>' + esc(r.tec?.n?.split(' ').slice(0, 2).join(' ') || '—') + '</b><span>técnico</span></div><div><b>' + (r.enc ? agEstrellas(r.enc.cal) : '—') + '</b><span>calidad</span></div></div>' +
    (r.req ? '<div class="agRqTag">📐 REQUERIMIENTO · lo necesitan para el <b>' + esc(r.fechaReq || 'sin fecha') + '</b></div>' +
      ((r.fotos || []).length ? '<div class="agFotos grande" data-agfotos>' + r.fotos.map((id, i) => '<img src="/_blob/' + id + '" alt="croquis ' + (i + 1) + '" data-agfoto="' + i + '" style="cursor:zoom-in">').join('') + '</div><p class="foot" style="margin:2px 0 0">Toca una foto para verla en grande o descargarla.</p>' : '') : '') +
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
  abrirModal('<div class="mhead"><div><h2>🧰 Atender · ' + esc(r.eqN) + '</h2><p>' + esc(p.n) + ' · ' + esc(r.desc || '') + '</p></div><button type="button" data-close>✕</button></div>' +
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
  abrirModal('<div class="mhead" style="background:#2E7D32;color:#fff"><div><h2>✅ Terminada · ' + esc(r.eqN) + '</h2><p>' + esc(p.n) + ' · ' + esc(r.desc || '') + '</p></div><button type="button" data-close>✕</button></div>' +
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
  abrirModal('<div class="mhead" style="background:#37474F;color:#fff"><div><h2>🔒 Cerrar solicitud · ' + esc(r.eqN) + '</h2><p>' + esc(p.n) + ' · estatus actual: ' + esc(AG_EST[r.estado] || r.estado) + ' · solicitó ' + esc(r.sol?.n || '') + '</p></div><button type="button" data-close>✕</button></div>' +
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
  abrirModal('<div class="mhead"><div><h2>✅ Liberar trabajo · ' + esc(r.eqN) + '</h2><p>' + esc(p.n) + ' · solución: ' + esc(r.solucion || '') + '</p></div><button type="button" data-close>✕</button></div>' +
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
  $('agBody').innerHTML = '<div class="box" id="agImp" hidden></div><div class="box" id="agBd"></div><form class="box" id="fAgEq"><h3>Agregar o actualizar equipo / área</h3><p class="foot">Nombre corto y su ubicación en planta u oficina. Para cambiar uno existente, toca "Editar".</p>' +
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
  agBdCaja(); agImpCaja();
}
// ---------- 📦 una sola vez: traer los equipos y categorías que se configuraron en la PRUEBA (apps/parosag/config/ag).
// Solo aparece mientras la página oficial no tiene equipos guardados y solo para administradores. Las solicitudes de prueba NO se pasan.
function agImpCaja(){
  const el = $('agImp'); if (!el) return;
  if (S.agCfg || !(S.sesion && esAdm(S.sesion))) { el.hidden = true; return; }
  el.hidden = false;
  el.innerHTML = '<h3>📦 Traer los equipos de la prueba</h3><p class="foot">Copia los equipos, áreas y categorías que configuraste en la prueba "Paros con áreas generales". Las solicitudes de prueba no se pasan.</p>' +
    '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><button type="button" class="primary" id="agImpOk">📦 Traer equipos de la prueba</button><p class="msg" id="agImpMsg"></p></div>';
}
document.addEventListener('click', async e => {
  if (e.target.id !== 'agImpOk') return;
  e.target.disabled = true; const m = $('agImpMsg');
  try {
    const s = await firebase.firestore().doc('apps/parosag/config/ag').get();
    if (!s.exists || !s.data().eq) { m.textContent = 'La prueba no tiene equipos guardados. Usa la lista de la base de datos de abajo.'; e.target.disabled = false; return; }
    if (await agGuardarCfg(s.data())) { m.className = 'msg okm'; m.textContent = 'Listo: ' + Object.keys(s.data().eq).length + ' equipos copiados.'; }
  } catch (er) { m.textContent = 'No se pudo leer la prueba (' + (er.code || er.message) + ').'; e.target.disabled = false; }
});
// ---------- 📥 equipos de la Base de Datos de Planta (equipos-bd.js): da de alta los que falten.
// Máquinas tipo A y B → Paros de máquina (config/maquinas); lo demás → Áreas generales (config/ag)
const AG_BD_PAROS = ['MTA', 'MTB'];
const agNorm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
function agBdFaltantes(){
  if (typeof LI_EQUIPOS_BD === 'undefined') return [];
  const M = S.maq || {}, eqAG = Object.values(agEq()), nomMaq = Object.keys(M).map(k => M[k].n || k), codMaq = Object.keys(M).map(k => agNorm(M[k].cod || k));
  return LI_EQUIPOS_BD.map((e, i) => {
    const paros = AG_BD_PAROS.includes(e.cat), x = agNorm(e.n);
    if ((paros ? nomMaq : eqAG.map(v => v.n)).some(y => agNorm(y) === x) || (paros && e.cod && codMaq.includes(agNorm(e.cod)))) return null;
    // parecido: misma categoría y un nombre contiene al otro (ej. "Selexx" y "Selexx 1") → sin palomita para no duplicar
    const ya = paros ? nomMaq : eqAG.filter(v => v.cat === e.cat).map(v => v.n);
    const par = ya.find(y => { const z = agNorm(y); return z.length >= 4 && x.length >= 4 && (z.includes(x) || x.includes(z)); });
    return Object.assign({ i, paros, parecido: par || '' }, e);
  }).filter(Boolean);
}
function agBdCaja(){
  const el = $('agBd'); if (!el) return;
  if (typeof LI_EQUIPOS_BD === 'undefined') { el.remove(); return; }
  const F = agBdFaltantes();
  if (!F.length) { el.innerHTML = '<h3>📥 Base de datos de planta</h3><p class="foot">Los ' + LI_EQUIPOS_BD.length + ' equipos de la base de datos ya están dados de alta.</p>'; return; }
  const C = Object.assign({ MTA:'Maquinaria tipo A', MTB:'Maquinaria tipo B' }, agCats()), nP = F.filter(f => f.paros).length;
  el.innerHTML = '<h3>📥 Base de datos de planta · faltan ' + F.length + ' de ' + LI_EQUIPOS_BD.length + '</h3><p class="foot">' + (nP ? 'Las máquinas tipo A y B se dan de alta en <b>Paros de máquina</b> (' + nP + '); lo demás en <b>Áreas generales</b> (' + (F.length - nP) + ').' : 'Todo se da de alta en <b>Áreas generales</b>. Las máquinas tipo A y B ya están listas en <b>Paros de máquina</b> y no vienen en esta lista.') + ' Los que se parecen a uno ya registrado vienen sin palomita para no duplicarlos.</p>' +
    '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:8px 0"><button type="button" class="primary" id="agBdOk">📥 Dar de alta los seleccionados</button><button type="button" id="agBdTodos">Marcar todos</button><button type="button" id="agBdNinguno">Quitar todos</button><p class="msg" id="agBdMsg"></p></div>' +
    '<div class="scroll" style="max-height:360px"><table class="tbl"><tr><th></th><th>Equipo</th><th>Categoría</th><th>Ubicación</th><th>Se da de alta en</th><th>Aviso</th></tr>' +
    F.map(f => '<tr><td><input type="checkbox" data-agbd="' + f.i + '"' + (f.parecido ? '' : ' checked') + '></td><td>' + esc(f.n) + '</td><td>' + esc(C[f.cat] || f.cat) + '</td><td>' + esc(f.ubic || '') + '</td><td>' + (f.paros ? 'Paros de máquina' : 'Áreas generales') + '</td><td>' + (f.parecido ? '<span class="tag">Parecido a: ' + esc(f.parecido) + '</span>' : '') + '</td></tr>').join('') + '</table></div>';
}
document.addEventListener('click', async e => {
  const id = e.target.id;
  if (id === 'agBdTodos' || id === 'agBdNinguno') { document.querySelectorAll('[data-agbd]').forEach(c => { c.checked = id === 'agBdTodos'; }); return; }
  if (id !== 'agBdOk') return;
  const sel = [...document.querySelectorAll('[data-agbd]:checked')].map(c => LI_EQUIPOS_BD[+c.dataset.agbd]);
  if (!sel.length) { $('agBdMsg').textContent = 'No hay equipos seleccionados.'; return; }
  e.target.disabled = true;
  const eq = Object.assign({}, agEq()), M = S.maq || {}, maq = {}; let nA = 0, nM = 0, ok = true;
  sel.forEach(x => {
    if (AG_BD_PAROS.includes(x.cat)) {
      let k = (x.cod || x.n).toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '');
      while (M[k] || maq[k]) k += 'X';
      maq[k] = { n:x.n, cod:k, cat:x.cat, area:x.ubic || '', a:true }; nM++;
    } else {
      let k = 'bd' + String(x.no).padStart(3, '0'); while (eq[k]) k += 'x';
      eq[k] = { n:x.n, cat:x.cat, ubic:x.ubic || '', a:true, bd:x.no }; nA++;
    }
  });
  if (nA) ok = await agGuardarCfg({ cats:agCats(), eq });
  if (ok && nM) { try { await db.doc('config/maquinas').set({ m:maq }, { merge:true }); } catch (er) { ok = false; toast('No se pudieron guardar las máquinas (' + (er.code || er.message) + ').'); } }
  if (ok) { toast('Dados de alta: ' + nA + ' en Áreas generales y ' + nM + ' en Paros de máquina.'); agEvento({ id:'', eqN:'(base de datos)', ubic:'', cat:'' }, S.sesion ? S.sesion.n : '', 'Alta desde la base de datos: ' + nA + ' equipos de áreas generales y ' + nM + ' máquinas'); }
  else e.target.disabled = false;
});
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


// =====================================================================
// 📐 REQUERIMIENTOS · PRUEBA MASTER
// - desde el tablero de producción (origen 'prod', con máquina) → recuadro en el tablero de mantenimiento de máquinas
// - desde Áreas generales (origen 'ag') → tablero de mantenimiento de Áreas generales
// - pestaña "📐 Historial de requerimientos" con todos, filtros y Excel por mes (atrasados, realizados, falta de material)
// =====================================================================
const agFinReq = r => r.tFin || r.lib?.t || r.cierreAdm?.t || '';
// estado de un requerimiento para el historial y el Excel
function agReqInfo(r){
  const hoy = new Date().toISOString().slice(0, 10), fin = agFinReq(r), hecho = r.estado === 'terminada' || r.estado === 'cerrada';
  const lim = r.fechaReq || '', finD = fin ? fin.slice(0, 10) : '';
  const atrasado = !!lim && (hecho ? (finD && finD > lim) : hoy > lim);
  const dias = lim ? Math.round((new Date((hecho && finD ? finD : hoy) + 'T12:00') - new Date(lim + 'T12:00')) / 86400000) : 0;
  const matsF = (r.mats || []).filter(m => !/recib/i.test(m.est || ''));
  const faltaMat = !hecho && ((r.estado === 'pendiente' && /material|compra|refacci/i.test(r.pend?.motivo || '')) || matsF.length > 0);
  return { hecho, fin, atrasado, dias, faltaMat, matsF };
}
// recuadro de requerimientos de máquinas para el tablero de mantenimiento (lo pinta tema-master.js)
function agReqMaqHTML(){
  const Q = S.agReq.filter(r => r.req && r.maq && r.estado !== 'cerrada').sort((a, b) => (a.fechaReq || '9').localeCompare(b.fechaReq || '9'));
  return '<div class="agCol agColR mReqMaq" style="--c:#0E2A47"><div class="agColH"><span class="ico">📐</span><div><b>Requerimientos de máquinas</b><small>Pedidos desde el tablero de producción · necesitan material · se planean por fecha</small></div><span class="n">' + Q.length + '</span></div>' +
    (Q.length ? '<div class="agRqGrid">' + Q.map(agTarjetaM).join('') + '</div>' : '<div class="agVacio">Sin requerimientos de máquinas abiertos</div>') +
    '<button type="button" class="agBt ver" data-irreq style="align-self:flex-start">📐 Ver historial de requerimientos ›</button></div>';
}
document.addEventListener('click', e => { if (e.target.closest('[data-irreq]')) { S.agt = 'req'; if (typeof setView === 'function') setView('ag'); renderAG(); } });

function agRequerimientos(){
  S.agRF = S.agRF || { mes:'', f:'abiertos', o:'', q:'' };
  const F = S.agRF, Rq = S.agReq.filter(r => r.req), q = norm(F.q || '');
  const meses = [...new Set(Rq.map(r => (r.t0 || '').slice(0, 7)).filter(Boolean))].sort().reverse();
  const L = Rq.map(r => Object.assign({ r }, agReqInfo(r))).filter(x => (!F.mes || (x.r.t0 || '').slice(0, 7) === F.mes || (x.fin || '').slice(0, 7) === F.mes) && (!F.o || (x.r.origen || (x.r.maq ? 'prod' : 'ag')) === F.o) &&
    (!q || norm(x.r.eqN + ' ' + x.r.desc + ' ' + (x.r.sol?.n || '') + ' ' + (x.r.ubic || '')).includes(q)));
  const cnt = { abiertos:L.filter(x => !x.hecho).length, atrasados:L.filter(x => x.atrasado).length, material:L.filter(x => x.faltaMat).length, realizados:L.filter(x => x.hecho).length, todos:L.length };
  const V = L.filter(x => F.f === 'todos' || (F.f === 'abiertos' && !x.hecho) || (F.f === 'atrasados' && x.atrasado) || (F.f === 'material' && x.faltaMat) || (F.f === 'realizados' && x.hecho))
    .sort((a, b) => (a.r.fechaReq || '9').localeCompare(b.r.fechaReq || '9'));
  const hechos = L.filter(x => x.hecho), aTiempo = hechos.filter(x => !x.atrasado).length;
  const KP = [['abiertos', '📂', 'Abiertos', '#1F6FD1'], ['atrasados', '⏰', 'Atrasados', '#D32F2F'], ['material', '🧾', 'Falta material', '#E0A100'], ['realizados', '✅', 'Realizados', '#1E8E5A'], ['todos', '📐', 'Todos', '#0E2A47']];
  $('agBody').innerHTML =
    '<section class="agHero"><div class="agHc"><span class="eti' + (cnt.atrasados ? ' mal' : '') + '"><i></i>' + (cnt.atrasados ? cnt.atrasados + ' atrasado' + (cnt.atrasados > 1 ? 's' : '') : 'Sin atrasos') + '</span>' +
      '<h2>Historial de <span>requerimientos</span></h2><p class="sub">' + (F.mes ? agNomMes(F.mes) : 'Todos los meses') + ' · ' + hechos.length + ' realizados · ' + (hechos.length ? Math.round(aTiempo / hechos.length * 100) + ' % a tiempo' : 'sin realizados aún') + '</p></div>' +
      '<div class="agHm" aria-hidden="true">' + ['mta', 'ag', 'mtb', 'ebt', 'ea', 'il'].map(k => '<div><svg viewBox="0 0 120 100">' + agQ(k) + '</svg></div>').join('') + '</div></section>' +
    '<div class="agKp">' + KP.map(([k, ic, t, c]) => '<button type="button" class="agKpi' + (F.f === k ? ' on' : '') + (k === 'atrasados' && cnt.atrasados ? ' hay' : '') + '" data-rqf="' + k + '" style="--c:' + c + '"><span class="ico">' + ic + '</span><b>' + cnt[k] + '</b><span>' + t + '</span></button>').join('') + '</div>' +
    '<div class="box" style="flex-direction:row;flex-wrap:wrap;gap:12px;align-items:end">' +
      '<label class="f" style="min-width:180px">Mes<select id="rqMes"><option value="">Todos los meses</option>' + meses.map(m => '<option value="' + m + '"' + (F.mes === m ? ' selected' : '') + '>' + agNomMes(m) + '</option>').join('') + '</select></label>' +
      '<label class="f" style="min-width:200px">De dónde viene<select id="rqOri"><option value="">Todos</option><option value="prod"' + (F.o === 'prod' ? ' selected' : '') + '>🏭 Máquinas (producción)</option><option value="ag"' + (F.o === 'ag' ? ' selected' : '') + '>🏢 Áreas generales</option></select></label>' +
      '<label class="f" style="flex:1;min-width:200px">Buscar<input id="rqQ" type="search" placeholder="proyecto, máquina, quién pidió…" value="' + esc(F.q || '') + '"></label>' +
      '<button type="button" class="primary" id="rqXls">📊 Excel ' + (F.mes ? 'de ' + agNomMes(F.mes) : 'del mes actual') + '</button></div>' +
    (V.length ? '<div class="agRqGrid rqHist">' + V.map(x => {
      const r = x.r, est = x.hecho ? (x.atrasado ? ['#D32F2F', '✅ Realizado con ' + x.dias + ' d de atraso'] : ['#1E8E5A', '✅ Realizado a tiempo']) : x.atrasado ? ['#D32F2F', '⏰ Atrasado ' + x.dias + ' d'] : x.faltaMat ? ['#E0A100', '🧾 Falta material'] : ['#1F6FD1', '📂 Abierto'];
      return '<div class="rqI" style="--c:' + est[0] + '"><div class="rqIh" data-agver="' + r.id + '"><span class="rqE">' + est[1] + '</span><span class="agCh2" style="--c:#0E2A47">' + (r.maq ? '🏭 Máquina' : '🏢 Áreas generales') + '</span></div>' +
        '<b data-agver="' + r.id + '">' + esc(r.eqN) + '</b><small>📍 ' + esc(r.ubic || '') + ' · 👤 ' + esc(r.sol?.n || '') + '</small>' + agAvance(r) +
        '<div class="rqF"><span>📝 pedido <b>' + fdt(r.t0) + '</b></span><span>📅 para <b>' + esc(r.fechaReq || '—') + '</b></span><span>🏁 terminado <b>' + (x.fin ? fdt(x.fin) : '—') + '</b></span></div>' +
        (x.matsF.length ? '<div class="rqM">🧾 Falta: ' + x.matsF.map(m => esc((m.c ? m.c + ' · ' : '') + m.d)).join(', ') + '</div>' : '') + '</div>';
    }).join('') + '</div>' : '<div class="agVacio">No hay requerimientos con ese filtro.</div>');
  $('rqMes').onchange = e => { F.mes = e.target.value; agRequerimientos(); };
  $('rqOri').onchange = e => { F.o = e.target.value; agRequerimientos(); };
  $('rqQ').oninput = e => { F.q = e.target.value; const p = e.target.selectionStart; agRequerimientos(); const t = $('rqQ'); t.focus(); try { t.setSelectionRange(p, p); } catch (er) {} };
  $('rqXls').onclick = () => agExcelReq(F.mes || new Date().toISOString().slice(0, 7));
}
document.addEventListener('click', e => { const b = e.target.closest('[data-rqf]'); if (b) { S.agRF.f = b.dataset.rqf; agRequerimientos(); } });


// Excel de requerimientos. mes 'AAAA-MM' → reporte del mes (pedidos o terminados en el mes + abiertos de antes);
// mes '' → RESPALDO COMPLETO (botón en Reportes): concentrado por mes + producción y Áreas generales en hojas separadas + cerrados.
async function agExcelReq(mes){
  if (!window.ExcelJS) { toast('No se pudo cargar el generador de Excel. Revisa la conexión.'); return; }
  toast('Generando Excel de requerimientos…');
  const todos = S.agReq.filter(r => r.req).map(r => Object.assign({ r }, agReqInfo(r)));
  const L = !mes ? todos : todos.filter(x => (x.r.t0 || '').slice(0, 7) === mes || (x.fin || '').slice(0, 7) === mes || (!x.hecho && (x.r.t0 || '').slice(0, 10) <= mes + '-31'));
  const etq = mes ? agNomMes(mes) : 'Respaldo completo';
  const wb = new ExcelJS.Workbook(); wb.creator = 'Mantenimiento Línea Italia · Requerimientos';
  const AZUL = 'FF0E2A47', GRIS = 'FFF1F4F8', VERDE = 'FFE1F4EA';
  const hoja = (name, titulo, headers, rows, widths, marcaCerrado) => {
    const ws = wb.addWorksheet(name, { views:[{ state:'frozen', ySplit:3 }] });
    ws.getCell('A1').value = titulo; ws.getCell('A1').font = { bold:true, size:14, color:{ argb:AZUL } };
    ws.getCell('A2').value = 'Línea Italia · Mantenimiento · ' + etq + ' · generado ' + fdt(nowIso());
    const hr = ws.getRow(3); headers.forEach((h, i) => { const c = hr.getCell(i + 1); c.value = h; c.font = { bold:true, color:{ argb:'FFFFFFFF' } }; c.fill = { type:'pattern', pattern:'solid', fgColor:{ argb:AZUL } }; c.alignment = { vertical:'middle', wrapText:true }; });
    rows.forEach((r, j) => { const row = ws.getRow(4 + j), cerr = marcaCerrado && marcaCerrado(j);
      r.forEach((v, i) => { const c = row.getCell(i + 1); c.value = v; c.alignment = { vertical:'top', wrapText:true }; if (cerr) c.fill = { type:'pattern', pattern:'solid', fgColor:{ argb:VERDE } }; else if (j % 2) c.fill = { type:'pattern', pattern:'solid', fgColor:{ argb:GRIS } }; }); });
    widths.forEach((w, i) => ws.getColumn(i + 1).width = w);
    if (rows.length) ws.autoFilter = { from:{ row:3, column:1 }, to:{ row:3, column:headers.length } };
  };
  const ori = r => r.maq ? 'Máquina (producción)' : 'Áreas generales';
  const H = ['Pedido', 'Origen', 'Máquina', 'Requerimiento', 'Lugar', 'Pidió', 'Para (fecha)', 'Estatus', '¿Cerrado?', 'Terminado', 'Días de atraso', 'Material faltante', 'Qué se tiene que realizar'];
  const W = [16, 18, 20, 32, 16, 20, 13, 20, 10, 16, 12, 30, 50];
  const fila = x => [fdt(x.r.t0), ori(x.r), x.r.maqN || '', x.r.eqN, x.r.ubic || '', x.r.sol?.n || '', x.r.fechaReq || '', AG_EST[x.r.estado] || x.r.estado, x.hecho ? 'SÍ' : 'No', x.fin ? fdt(x.fin) : '', x.atrasado ? x.dias : '', x.matsF.map(m => (m.c ? m.c + ' · ' : '') + m.d).join(', '), x.r.desc || ''];
  const lista = (name, titulo, X) => { const S2 = X.slice().sort((a, b) => (a.r.t0 || '').localeCompare(b.r.t0 || '')); hoja(name, titulo, H, S2.map(fila), W, j => S2[j].hecho); };

  // CONCENTRADO POR MES (todas las fechas que tenga el reporte)
  const meses = [...new Set(L.flatMap(x => [(x.r.t0 || '').slice(0, 7), (x.fin || '').slice(0, 7)]).filter(Boolean))].sort();
  const C = meses.map(m => {
    const ped = L.filter(x => (x.r.t0 || '').slice(0, 7) === m), hec = L.filter(x => x.hecho && (x.fin || '').slice(0, 7) === m);
    return [agNomMes(m), ped.filter(x => x.r.maq).length, ped.filter(x => !x.r.maq).length, ped.length, hec.filter(x => x.r.maq).length, hec.filter(x => !x.r.maq).length, hec.length,
      hec.filter(x => !x.atrasado).length, hec.filter(x => x.atrasado).length, hec.length ? Math.round(hec.filter(x => !x.atrasado).length / hec.length * 100) + ' %' : '—',
      ped.filter(x => !x.hecho).length, ped.filter(x => x.faltaMat).length];
  });
  hoja('Concentrado por mes', 'CONCENTRADO DE REQUERIMIENTOS POR MES', ['Mes', 'Pedidos · máquinas', 'Pedidos · áreas generales', 'Pedidos · total', 'Cerrados · máquinas', 'Cerrados · áreas generales', 'Cerrados · total', 'Cerrados a tiempo', 'Cerrados con atraso', '% a tiempo', 'Siguen abiertos', 'Con falta de material'], C, [16, 14, 16, 12, 14, 16, 12, 12, 12, 11, 12, 14]);

  // RESUMEN
  const hechos = L.filter(x => x.hecho), atr = L.filter(x => x.atrasado), mat = L.filter(x => x.faltaMat);
  hoja('Resumen', 'REQUERIMIENTOS · ' + etq.toUpperCase(), ['Indicador', 'Máquinas (producción)', 'Áreas generales', 'Total'], [
    ['Requerimientos en el reporte', L.filter(x => x.r.maq).length, L.filter(x => !x.r.maq).length, L.length],
    ['Cerrados (realizados)', hechos.filter(x => x.r.maq).length, hechos.filter(x => !x.r.maq).length, hechos.length],
    ['Cerrados a tiempo', hechos.filter(x => x.r.maq && !x.atrasado).length, hechos.filter(x => !x.r.maq && !x.atrasado).length, hechos.filter(x => !x.atrasado).length],
    ['Abiertos', L.filter(x => x.r.maq && !x.hecho).length, L.filter(x => !x.r.maq && !x.hecho).length, L.filter(x => !x.hecho).length],
    ['Atrasados (abiertos y cerrados tarde)', atr.filter(x => x.r.maq).length, atr.filter(x => !x.r.maq).length, atr.length],
    ['Abiertos con falta de material', mat.filter(x => x.r.maq).length, mat.filter(x => !x.r.maq).length, mat.length]], [40, 20, 18, 10]);

  // DETALLE separado por origen (cerrados en verde) + cerrados + atrasados + falta de material
  lista('Producción (máquinas)', 'REQUERIMIENTOS DE PRODUCCIÓN (MÁQUINAS) · cerrados en verde', L.filter(x => x.r.maq));
  lista('Áreas generales', 'REQUERIMIENTOS DE ÁREAS GENERALES · cerrados en verde', L.filter(x => !x.r.maq));
  lista('Cerrados', 'REQUERIMIENTOS CERRADOS (REALIZADOS)', hechos);
  hoja('Atrasados', 'REQUERIMIENTOS ATRASADOS', H, atr.sort((a, b) => b.dias - a.dias).map(fila), W);
  const M = []; mat.forEach(x => (x.matsF.length ? x.matsF : [{ d:x.r.pend?.motivo || 'Material por definir', est:'' }]).forEach(m => M.push([ori(x.r), x.r.eqN, x.r.maqN || '', x.r.ubic || '', m.c || '', m.d, m.est || '', x.r.fechaReq || '', x.r.pend?.fecha || '', x.r.pend?.coment || ''])));
  hoja('Falta de material', 'REQUERIMIENTOS CON FALTA DE MATERIAL', ['Origen', 'Requerimiento', 'Máquina', 'Lugar', 'Cantidad', 'Material', 'Estado', 'Para (fecha)', 'Compromiso', 'Comentario'], M, [18, 32, 20, 16, 10, 36, 14, 13, 13, 36]);

  const buf = await wb.xlsx.writeBuffer(), nombre = 'Requerimientos ' + (mes || 'respaldo ' + fday(new Date())) + '.xlsx';
  try { const dl = await window.claude.use('downloads'); if (!dl) { toast('La descarga no está disponible.'); return; } await dl.save({ filename:nombre, data:new Blob([buf]) }); toast('Excel guardado: ' + nombre); }
  catch (er) { if (er && er.code !== 'declined') toast('No se pudo descargar (' + (er.code || er.message) + ').'); }
}
