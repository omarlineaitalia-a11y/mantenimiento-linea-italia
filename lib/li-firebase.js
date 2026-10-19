/* Conexión de las aplicaciones de mantenimiento Línea Italia con Firebase.
 * Ofrece la misma interfaz que usaban las páginas (window.claude.use('db' | 'user' | 'assets' | 'downloads'))
 * pero guardando en Cloud Firestore y con inicio de sesión por número de nómina + contraseña.
 * Requiere antes: firebase-app-compat, firebase-auth-compat, firebase-firestore-compat, firebase-config.js
 * y window.LI_APP = 'almacen' | 'paros'.
 */
(function () {
  'use strict';
  var APP = window.LI_APP || 'general';
  var DOMINIO = 'mtto-lineaitalia.app';           // correo interno: <nómina>@mtto-lineaitalia.app
  var PFX = 'apps/' + APP + '/';
  firebase.initializeApp(window.FIREBASE_CONFIG);
  var auth = firebase.auth();
  var fs = firebase.firestore();
  try { fs.settings({ ignoreUndefinedProperties: true }); } catch (e) {}
  var FP = firebase.firestore.FieldPath, FV = firebase.firestore.FieldValue;

  var estado = { nomina: null, nombre: '', rol: null, personal: {} };

  // ---------- contraseñas restablecidas por un administrador
  // Firebase no deja cambiar la contraseña de otra persona desde la página: al restablecer se crea una cuenta
  // nueva <nómina>.<versión>@... y las reglas solo aceptan la versión vigente (acceso/privado, por nómina).
  // Para entrar sin sesión se consulta acceso/publico, guardado por huella (no muestra las nóminas).
  function correoV(n, v) { n = String(n).trim(); return (v ? n + '.' + v : n) + '@' + DOMINIO; }
  function huella(n) {
    var b = new TextEncoder().encode('li-mtto:' + String(n).trim());
    return crypto.subtle.digest('SHA-256', b).then(function (h) { return Array.from(new Uint8Array(h)).map(function (x) { return x.toString(16).padStart(2, '0'); }).join('').slice(0, 24); });
  }
  function versionDe(n) {
    return huella(n).then(function (h) { return fs.doc('acceso/publico').get().then(function (s) { return Number((s.exists && (s.data().m || {})[h]) || 0); }); }).catch(function () { return 0; });
  }
  function correoActual(n) { return versionDe(n).then(function (v) { return correoV(n, v); }); }
  var resolverListo; var listo = new Promise(function (r) { resolverListo = r; });
  var fotos = {};

  // ---------- utilidades
  function esPlano(o) { return o !== null && typeof o === 'object' && !Array.isArray(o) && Object.getPrototypeOf(o) === Object.prototype; }
  function aplanar(obj, pre, out) {
    Object.keys(obj).forEach(function (k) {
      var v = obj[k], ruta = pre.concat(k);
      if (v && typeof v === 'object' && v.__delete__ === true) out.push([ruta, FV.delete()]);
      else if (esPlano(v) && Object.keys(v).length) aplanar(v, ruta, out);
      else out.push([ruta, v]);
    });
    return out;
  }
  // Firestore no acepta listas dentro de listas: al guardar, la lista interna va como {__a:[...]}; al leer se regresa a lista
  function cod(v, enLista) {
    if (Array.isArray(v)) { var a = v.map(function (x) { return cod(x, true); }); return enLista ? { __a: a } : a; }
    if (esPlano(v)) { var o = {}; Object.keys(v).forEach(function (k) { o[k] = cod(v[k], false); }); return o; }
    return v;
  }
  function dec(v) {
    if (Array.isArray(v)) return v.map(dec);
    if (esPlano(v)) { var k = Object.keys(v); if (k.length === 1 && k[0] === '__a' && Array.isArray(v.__a)) return v.__a.map(dec); var o = {}; k.forEach(function (x) { o[x] = dec(v[x]); }); return o; }
    return v;
  }
  function codigo(err) {
    var c = (err && err.code) || '';
    if (c === 'permission-denied' || c === 'not-found' || c === 'invalid-argument' || c === 'failed-precondition') return 'invalid_argument';
    if (c === 'resource-exhausted') return 'resource_exhausted';
    if (c === 'unauthenticated') return 'revoked';
    return 'unavailable';
  }
  function err(e) { return { code: codigo(e), message: (e && e.message) || String(e) }; }
  function envolverDoc(s) {
    return { id: s.id, exists: s.exists, data: function () { return s.exists ? dec(s.data()) : undefined; },
      metadata: { fromCache: s.metadata.fromCache, hasPendingWrites: s.metadata.hasPendingWrites } };
  }
  function envolverQuery(q) {
    var docs = q.docs.map(envolverDoc);
    return { docs: docs, size: q.size, empty: q.empty,
      docChanges: function () { return q.docChanges().map(function (c) { return { type: c.type, doc: envolverDoc(c.doc), oldIndex: c.oldIndex, newIndex: c.newIndex }; }); },
      metadata: { fromCache: q.metadata.fromCache, hasPendingWrites: q.metadata.hasPendingWrites } };
  }

  // ---------- base de datos (misma forma que la que usaban las páginas)
  function refDoc(ruta) {
    var r = fs.doc(PFX + ruta);
    return {
      id: r.id, path: ruta,
      get: function () { return r.get().then(envolverDoc).catch(function (e) { throw err(e); }); },
      set: function (d) { return r.set(cod(d, false)).catch(function (e) { throw err(e); }); },
      update: function (d) {
        var pares = aplanar(d || {}, [], []).map(function (p) { return [p[0], cod(p[1], false)]; });
        if (!pares.length) return Promise.resolve();
        var args = [];
        pares.forEach(function (p) { args.push(new FP(...p[0]), p[1]); });
        return r.update.apply(r, args).catch(function (e) { throw err(e); });
      },
      delete: function () { return r.delete().catch(function (e) { throw err(e); }); },
      onSnapshot: function (n, e) { return r.onSnapshot(function (s) { n(envolverDoc(s)); }, function (x) { if (e) e(err(x)); }); },
      collection: function (sub) { return refCol(ruta + '/' + sub); },
      acquire: function () { return Promise.resolve({ acquired: true }); }
    };
  }
  function refQuery(q, ruta) {
    return {
      where: function (f, op, v) { return refQuery(q.where(f, op, v), ruta); },
      orderBy: function (f, d) { return refQuery(q.orderBy(f, d || 'asc'), ruta); },
      limit: function (n) { return refQuery(q.limit(n), ruta); },
      get: function () { return q.get().then(envolverQuery).catch(function (e) { throw err(e); }); },
      onSnapshot: function (n, e) { return q.onSnapshot(function (s) { n(envolverQuery(s)); }, function (x) { if (e) e(err(x)); }); }
    };
  }
  function refCol(ruta) {
    var c = fs.collection(PFX + ruta), base = refQuery(c, ruta);
    base.path = ruta;
    base.doc = function (id) { return refDoc(ruta + '/' + (id || c.doc().id)); };
    base.add = function (d) { return c.add(cod(d, false)).then(function (r) { return refDoc(ruta + '/' + r.id); }).catch(function (e) { throw err(e); }); };
    return base;
  }
  var db = { doc: refDoc, collection: refCol };

  // ---------- fotos (se guardan comprimidas en Firestore: apps/<app>/fotos/<id>)
  function nuevoId() { var a = new Uint8Array(16); crypto.getRandomValues(a); return Array.from(a, function (b) { return b.toString(16).padStart(2, '0'); }).join(''); }
  function comprimir(blob) {
    return new Promise(function (ok, mal) {
      if (blob.type === 'image/svg+xml') { var fr = new FileReader(); fr.onload = function () { ok(fr.result); }; fr.onerror = mal; fr.readAsDataURL(blob); return; }
      var url = URL.createObjectURL(blob), img = new Image();
      img.onload = function () {
        var lado = 1200, sc = Math.min(1, lado / Math.max(img.width, img.height)), cv = document.createElement('canvas');
        cv.width = Math.round(img.width * sc); cv.height = Math.round(img.height * sc);
        var g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url);
        var q = 0.8, d = cv.toDataURL('image/jpeg', q);
        while (d.length > 700000 && q > 0.35) { q -= 0.1; d = cv.toDataURL('image/jpeg', q); }
        ok(d);
      };
      img.onerror = function () { URL.revokeObjectURL(url); mal(new Error('imagen no válida')); };
      img.src = url;
    });
  }
  var assets = {
    upload: function (blob) {
      return comprimir(blob).then(function (d) {
        var id = nuevoId();
        return fs.doc(PFX + 'fotos/' + id).set({ data: d, t: new Date().toISOString(), por: estado.nomina || '' }).then(function () {
          fotos[id] = d; return { id: id, url: d, sizeBytes: d.length, contentType: 'image/jpeg' };
        });
      }).catch(function (e) { throw { code: e && e.code === 'permission-denied' ? 'not_granted' : 'upstream_error', message: e.message || String(e) }; });
    },
    list: function () { return Promise.resolve({ assets: [], usage: { files: 0, bytes: 0, maxFiles: 0, maxBytes: 0 } }); },
    delete: function (id) { return fs.doc(PFX + 'fotos/' + id).delete().then(function () { delete fotos[id]; return { deleted: true }; }); }
  };
  // las páginas muestran fotos con "/_blob/<id>": aquí se reemplaza por la foto guardada en Firestore
  function cargarFoto(id) {
    if (fotos[id]) return Promise.resolve(fotos[id]);
    if (fotos['_p' + id]) return fotos['_p' + id];
    var p = fs.doc(PFX + 'fotos/' + id).get().then(function (s) { var d = s.exists ? s.data().data : ''; fotos[id] = d; return d; }).catch(function () { return ''; });
    fotos['_p' + id] = p; return p;
  }
  var RX = /\/_blob\/([0-9a-f]{32})/;
  function arreglar(el) {
    if (!el || el.nodeType !== 1) return;
    var src = el.getAttribute && el.getAttribute('src');
    if (src && RX.test(src)) { var id = src.match(RX)[1]; el.setAttribute('data-foto-id', id); el.removeAttribute('src'); cargarFoto(id).then(function (d) { if (d) el.setAttribute('src', d); }); }
    ['data-lb'].forEach(function (a) { var v = el.getAttribute && el.getAttribute(a); if (v && RX.test(v)) { var id2 = v.match(RX)[1]; cargarFoto(id2).then(function (d) { if (d) el.setAttribute(a, d); }); } });
    var st = el.getAttribute && el.getAttribute('style');
    if (st && RX.test(st)) { var id3 = st.match(RX)[1]; cargarFoto(id3).then(function (d) { if (d) el.setAttribute('style', el.getAttribute('style').replace(/\/_blob\/[0-9a-f]{32}/g, d)); }); }
  }
  function arreglarArbol(n) { if (n.nodeType !== 1) return; arreglar(n); n.querySelectorAll && n.querySelectorAll('[src*="/_blob/"],[style*="/_blob/"],[data-lb*="/_blob/"]').forEach(arreglar); }
  new MutationObserver(function (ms) {
    ms.forEach(function (m) {
      if (m.type === 'attributes') arreglar(m.target);
      else m.addedNodes.forEach(arreglarArbol);
    });
  }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['src', 'style', 'data-lb'] });

  // ---------- descargas: deja elegir la carpeta cuando el navegador lo permite
  var downloads = {
    save: function (o) {
      var blob = o.data instanceof Blob ? o.data : new Blob([o.data]);
      if (window.showSaveFilePicker && window.self === window.top) {
        return window.showSaveFilePicker({ suggestedName: o.filename }).then(function (h) {
          return h.createWritable().then(function (w) { return w.write(blob).then(function () { return w.close(); }); });
        }).then(function () { return { status: 'saved' }; }).catch(function (e) {
          if (e && e.name === 'AbortError') throw { code: 'declined', message: 'cancelado' };
          return descargaSimple(blob, o.filename);
        });
      }
      return Promise.resolve(descargaSimple(blob, o.filename));
    }
  };
  function descargaSimple(blob, nombre) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nombre;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 3000);
    return { status: 'saved' };
  }

  // ---------- usuario
  function esAdmin() { return estado.rol === 'admin' || estado.rol === 'general'; }
  var user = {
    isOwner: function () { return Promise.resolve(estado.rol === 'general'); },
    canEdit: function () { return Promise.resolve(esAdmin()); },
    can: function () { return Promise.resolve(null); },
    id: function () { return Promise.resolve(auth.currentUser ? auth.currentUser.uid : null); },
    me: function () { return Promise.resolve({ id: auth.currentUser ? auth.currentUser.uid : null, name: estado.nombre, avatarUrl: '', color: '#2E7D32', email: null, isOwner: estado.rol === 'general', canEdit: esAdmin() }); },
    name: function () { return Promise.resolve(estado.nombre); },
    avatarUrl: function () { return Promise.resolve(null); },
    email: function () { return Promise.resolve(null); },
    profiles: function (ids) { var o = {}; [].concat(ids || []).forEach(function (i) { o[i] = { id: i, name: '', avatarUrl: '', color: '#888', email: null, isMe: false }; }); return Promise.resolve(o); },
    search: function () { return Promise.resolve([]); }
  };

  window.claude = { use: function (n) { return listo.then(function () { return ({ db: db, user: user, assets: assets, downloads: downloads })[n] || null; }); } };

  // ---------- funciones para las páginas
  window.LI = {
    app: APP,
    correo: function (nomina) { return String(nomina).trim() + '@' + DOMINIO; },
    nomina: function () { return estado.nomina; },
    rol: function () { return estado.rol; },
    crearCuenta: function (nomina, pass) {
      var otra = appAltas();
      return correoActual(nomina).then(function (c) { return otra.auth().createUserWithEmailAndPassword(c, pass); }).then(function () { return otra.auth().signOut(); }).then(function () { return 'creada'; })
        .catch(function (e) { if (e.code === 'auth/email-already-in-use') return 'existe'; throw new Error(traducir(e)); });
    },
    // un administrador pone contraseña nueva a otra persona (cuenta nueva; la anterior deja de servir)
    restablecer: function (nomina, pass) {
      nomina = String(nomina).trim(); var otra = appAltas();
      if (String(pass || '').length < 6) return Promise.reject(new Error('La contraseña debe tener al menos 6 caracteres.'));
      return versionDe(nomina).then(function (v0) {
        var intento = function (v, n) {
          return otra.auth().createUserWithEmailAndPassword(correoV(nomina, v), pass).then(function () { return v; })
            .catch(function (e) { if (e.code === 'auth/email-already-in-use' && n < 5) return intento(v + 1, n + 1); throw new Error(traducir(e)); });
        };
        return intento(v0 + 1, 0);
      }).then(function (v) {
        return otra.auth().signOut().then(function () { return huella(nomina); }).then(function (h) {
          var b = fs.batch(), pub = {}, priv = {}; pub[h] = v; priv[nomina] = v;
          b.set(fs.doc('acceso/publico'), { m: pub }, { merge: true });
          b.set(fs.doc('acceso/privado'), { m: priv }, { merge: true });
          return b.commit();
        }).then(function () { return v; });
      });
    },
    // ventana para que el administrador escriba la contraseña nueva
    dialogoRestablecer: function (nomina, nombre) {
      var d = document.createElement('div'); d.id = 'li-reset';
      d.innerHTML = '<div class="c"><div class="h"><div><p>Restablecer contraseña</p><h2>' + esc(nombre || ('Nómina ' + nomina)) + '</h2></div></div>' +
        '<form><p class="f">Nómina <b>' + esc(nomina) + '</b>. La contraseña anterior deja de funcionar. Entrégale la nueva y pídele que la cambie en "👤 cuenta".</p>' +
        '<label>Contraseña nueva (mín. 6)<input name="p" type="password" autocomplete="new-password" required minlength="6"></label>' +
        '<label>Repite la contraseña<input name="p2" type="password" autocomplete="new-password" required minlength="6"></label>' +
        '<p class="m"></p><button type="submit">Guardar contraseña nueva</button><button type="button" class="x">Cancelar</button></form></div>';
      document.body.appendChild(d);
      d.querySelector('.x').onclick = function () { d.remove(); };
      d.addEventListener('click', function (e) { if (e.target === d) d.remove(); });
      d.querySelector('form').addEventListener('submit', function (ev) {
        ev.preventDefault();
        var f = ev.target, m = f.querySelector('.m'), b = f.querySelector('button[type=submit]');
        if (f.p.value !== f.p2.value) { m.style.color = '#C62828'; m.textContent = 'Las contraseñas no coinciden.'; return; }
        b.disabled = true; m.style.color = '#4F5A54'; m.textContent = 'Guardando…';
        window.LI.restablecer(nomina, f.p.value).then(function () {
          m.style.color = '#2E7D32'; m.textContent = '✔ Listo. ' + (nombre || nomina) + ' ya puede entrar con la contraseña nueva.';
          b.hidden = true; d.querySelector('.x').textContent = 'Cerrar';
        }).catch(function (e) { m.style.color = '#C62828'; m.textContent = e.message; b.disabled = false; });
      });
      setTimeout(function () { d.querySelector('input').focus(); }, 50);
    },
    cambiarPassword: function (actual, nueva) {
      var u = auth.currentUser; var cred = firebase.auth.EmailAuthProvider.credential(u.email, actual);
      return u.reauthenticateWithCredential(cred).then(function () { return u.updatePassword(nueva); }).catch(function (e) { throw new Error(traducir(e)); });
    },
    salir: function () { return auth.signOut().then(function () { location.reload(); }); },
    // entrar en este mismo equipo con otra nómina (cambia la cuenta y recarga la página)
    entrarComo: function (nomina, pass) {
      return correoActual(nomina).then(function (c) { return auth.signInWithEmailAndPassword(c, pass); }).then(function () {
        if (APP === 'almacen') { try { localStorage.setItem('alm_nomina', String(nomina).trim()); localStorage.setItem('alm_last', String(Date.now())); } catch (e) {} }
        location.reload();
      }).catch(function (e) {
        if (e.code === 'auth/invalid-credential' || e.code === 'auth/user-not-found') throw new Error('Nómina o contraseña incorrecta. Si todavía no tienes cuenta, pide tu acceso a un administrador.');
        throw new Error(traducir(e));
      });
    }
  };
  function appAltas() { return firebase.apps.find(function (a) { return a.name === 'altas'; }) || firebase.initializeApp(window.FIREBASE_CONFIG, 'altas'); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function traducir(e) {
    var m = { 'auth/invalid-credential': 'Nómina o contraseña incorrecta.', 'auth/wrong-password': 'Contraseña incorrecta.', 'auth/user-not-found': 'Esa nómina no tiene cuenta. Pide a un administrador que te dé de alta.',
      'auth/invalid-email': 'Número de nómina no válido.', 'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.', 'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos.',
      'auth/network-request-failed': 'Sin conexión a internet.', 'auth/requires-recent-login': 'Vuelve a escribir tu contraseña actual.' };
    return m[e && e.code] || (e && e.message) || 'Error';
  }

  // ---------- pantalla de acceso
  var LOGO = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 300"><rect width="340" height="300" fill="#0F2B3D"/><rect x="113" y="52" width="114" height="114" fill="none" stroke="#fff" stroke-width="7"/><text x="170" y="138" text-anchor="middle" font-family="Century Gothic, Arial, sans-serif" font-size="74" font-weight="300" fill="#fff">LI</text><text x="164" y="232" text-anchor="middle" font-family="Century Gothic, Arial, sans-serif" font-size="42" font-weight="300" fill="#fff">línea italia</text><text x="170" y="268" text-anchor="middle" font-family="Century Gothic, Arial, sans-serif" font-size="14.5" letter-spacing="4.6" fill="#fff">ECCELLENZA IN MOBILE</text></svg>');
  var TITULO = { almacen: 'Almacén de refacciones', paros: 'Control de tiempos de paro' }[APP] || 'Mantenimiento';
  var css = document.createElement('style');
  css.textContent = '#li-acceso{position:fixed;inset:0;z-index:100000;background:#C9CDCB;display:grid;place-items:center;padding:16px;font-family:"IBM Plex Sans",system-ui,"Segoe UI",Arial,sans-serif}' +
    '#li-acceso .c{width:min(420px,100%);background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,.2)}' +
    '#li-acceso .h{background:#1E4A2A;color:#F2F6F2;padding:20px 24px;display:flex;gap:14px;align-items:center}#li-acceso .h img{height:58px;border-radius:6px}' +
    '#li-acceso .h p{margin:0;font-size:11px;letter-spacing:.12em;text-transform:uppercase;opacity:.75;font-weight:700}#li-acceso .h h2{margin:4px 0 0;font-size:21px}' +
    '#li-acceso form{padding:20px 24px;display:flex;flex-direction:column;gap:12px}#li-acceso label{display:flex;flex-direction:column;gap:4px;font-size:13px;color:#4F5A54;font-weight:600}' +
    '#li-acceso input{font:inherit;font-size:20px;padding:10px 12px;border:1px solid #C2C7C4;border-radius:8px;letter-spacing:.08em}#li-acceso input:focus{outline:2px solid #2E7D32}' +
    '#li-acceso button{font:inherit;font-weight:700;font-size:16px;padding:12px;border-radius:8px;border:0;background:#2E7D32;color:#fff;cursor:pointer}#li-acceso button:disabled{opacity:.6}' +
    '#li-acceso .m{margin:0;min-height:1.2em;font-size:14px;color:#C62828}#li-acceso .f{margin:0;font-size:12.5px;color:#5C6A62}' +
    '#li-cuenta{position:fixed;left:10px;bottom:calc(env(safe-area-inset-bottom,0px) + 10px);z-index:99999;font-family:system-ui,"Segoe UI",Arial,sans-serif}' +
    '#li-cuenta>button{font:inherit;font-size:12px;font-weight:600;border:1px solid rgba(0,0,0,.15);background:rgba(255,255,255,.92);color:#1C2620;border-radius:99px;padding:5px 11px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.15)}' +
    '#li-menu{position:absolute;left:0;bottom:36px;background:#fff;border:1px solid #C2C7C4;border-radius:10px;padding:10px;display:flex;flex-direction:column;gap:8px;width:250px;box-shadow:0 6px 20px rgba(0,0,0,.2);color:#1C2620;font-size:13px}' +
    '#li-menu input{font:inherit;padding:7px 9px;border:1px solid #C2C7C4;border-radius:6px}#li-menu button{font:inherit;font-weight:600;padding:7px;border-radius:6px;border:1px solid #C2C7C4;background:#F3F5F3;cursor:pointer}' +
    '#li-menu .p{background:#2E7D32;color:#fff;border-color:#2E7D32}#li-menu .m{margin:0;font-size:12px}' +
    '#li-reset{position:fixed;inset:0;z-index:100001;background:rgba(8,16,10,.6);display:grid;place-items:center;padding:16px;font-family:"IBM Plex Sans",system-ui,"Segoe UI",Arial,sans-serif}' +
    '#li-reset .c{width:min(420px,100%);background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,.3);color:#1C2620}' +
    '#li-reset .h{background:#1E4A2A;color:#F2F6F2;padding:16px 22px}#li-reset .h p{margin:0;font-size:11px;letter-spacing:.12em;text-transform:uppercase;opacity:.75;font-weight:700}#li-reset .h h2{margin:4px 0 0;font-size:19px}' +
    '#li-reset form{padding:18px 22px;display:flex;flex-direction:column;gap:10px}#li-reset label{display:flex;flex-direction:column;gap:4px;font-size:13px;color:#4F5A54;font-weight:600}' +
    '#li-reset input{font:inherit;font-size:18px;padding:9px 11px;border:1px solid #C2C7C4;border-radius:8px}#li-reset button{font:inherit;font-weight:700;font-size:15px;padding:11px;border-radius:8px;border:0;background:#2E7D32;color:#fff;cursor:pointer}' +
    '#li-reset button.x{background:#EEF0EF;color:#1C2620}#li-reset button:disabled{opacity:.6}#li-reset .m{margin:0;min-height:1.2em;font-size:14px}#li-reset .f{margin:0;font-size:13px;color:#4F5A54}';
  document.head.appendChild(css);

  function mostrarAcceso(msg) {
    var d = document.getElementById('li-acceso');
    if (!d) {
      d = document.createElement('div'); d.id = 'li-acceso';
      d.innerHTML = '<div class="c"><div class="h"><img alt="Línea Italia" src="' + LOGO + '"><div><p>Línea Italia · Mantenimiento</p><h2>' + TITULO + '</h2></div></div>' +
        '<form autocomplete="on"><label>Número de nómina<input name="u" inputmode="numeric" autocomplete="username" required></label>' +
        '<label>Contraseña<input name="p" type="password" autocomplete="current-password" required></label>' +
        '<p class="m"></p><button type="submit">Entrar</button><p class="f">¿No tienes cuenta o la olvidaste? Pídela a un administrador de mantenimiento.</p></form></div>';
      (document.body || document.documentElement).appendChild(d);
      d.querySelector('form').addEventListener('submit', function (ev) {
        ev.preventDefault();
        var f = ev.target, b = f.querySelector('button'), m = f.querySelector('.m');
        b.disabled = true; m.textContent = 'Entrando…'; m.style.color = '#4F5A54';
        correoActual(f.u.value).then(function (c) { return auth.signInWithEmailAndPassword(c, f.p.value); }).catch(function (e) { m.style.color = '#C62828'; m.textContent = traducir(e); b.disabled = false; });
      });
    }
    d.style.display = 'grid';
    if (msg) { var mm = d.querySelector('.m'); mm.style.color = '#C62828'; mm.textContent = msg; }
    setTimeout(function () { var i = d.querySelector('input[name=u]'); if (i) i.focus(); }, 50);
  }
  function ocultarAcceso() { var d = document.getElementById('li-acceso'); if (d) d.remove(); }

  function botonCuenta() {
    if (document.getElementById('li-cuenta')) return;
    var w = document.createElement('div'); w.id = 'li-cuenta';
    w.innerHTML = '<button type="button">👤 ' + estado.nomina + ' · cuenta</button>';
    document.body.appendChild(w);
    w.firstChild.addEventListener('click', function () {
      var m = document.getElementById('li-menu');
      if (m) { m.remove(); return; }
      m = document.createElement('div'); m.id = 'li-menu';
      m.innerHTML = '<b>' + (estado.nombre || ('Nómina ' + estado.nomina)) + '</b><span style="color:#5C6A62">Cuenta de Firebase · ' + (estado.rol || 'sin rol') + '</span>' +
        '<input type="password" id="li-pa" placeholder="Contraseña actual" autocomplete="current-password"><input type="password" id="li-pn" placeholder="Nueva contraseña (mín. 6)" autocomplete="new-password">' +
        '<button type="button" class="p" id="li-cp">Cambiar mi contraseña</button><p class="m" id="li-mm"></p><button type="button" id="li-out">Cerrar sesión de este equipo</button>';
      w.appendChild(m);
      document.getElementById('li-cp').onclick = function () {
        var mm = document.getElementById('li-mm'); mm.style.color = '#4F5A54'; mm.textContent = 'Guardando…';
        window.LI.cambiarPassword(document.getElementById('li-pa').value, document.getElementById('li-pn').value)
          .then(function () { mm.style.color = '#2E7D32'; mm.textContent = 'Contraseña cambiada.'; document.getElementById('li-pa').value = ''; document.getElementById('li-pn').value = ''; })
          .catch(function (e) { mm.style.color = '#C62828'; mm.textContent = e.message; });
      };
      document.getElementById('li-out').onclick = function () { window.LI.salir(); };
    });
  }

  var primeraVez = true;
  auth.onAuthStateChanged(function (u) {
    if (!u) { if (primeraVez || estado.nomina) { if (document.body) mostrarAcceso(); else document.addEventListener('DOMContentLoaded', function () { mostrarAcceso(); }); } return; }
    estado.nomina = (u.email || '').split('@')[0].split('.')[0];
    fs.doc(PFX + 'config/personal').get().then(function (s) {
      var p = (s.exists && s.data().p) || {}; estado.personal = p;
      var yo = p[estado.nomina];
      estado.rol = yo ? yo.r : null; estado.nombre = yo ? yo.n : '';
      if (yo && yo.a === false) { auth.signOut(); mostrarAcceso('Tu acceso a esta aplicación está desactivado.'); return; }
      if (APP === 'almacen') { try { localStorage.setItem('alm_nomina', estado.nomina); localStorage.setItem('alm_last', String(Date.now())); } catch (e) {} }
      ocultarAcceso();
      var go = function () { botonCuenta(); };
      if (document.body) go(); else document.addEventListener('DOMContentLoaded', go);
      if (primeraVez) { primeraVez = false; resolverListo(); }
    }).catch(function (e) {
      var msg = e.code === 'permission-denied' ? 'La nómina ' + estado.nomina + ' no está dada de alta (o está desactivada) en esta aplicación. Pide a un administrador que te agregue en Personal.' : 'No se pudo leer la base de datos: ' + e.message;
      auth.signOut(); estado.nomina = null; mostrarAcceso(msg);
    });
  });
})();
